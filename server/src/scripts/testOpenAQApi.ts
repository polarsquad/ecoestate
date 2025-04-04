import axios from 'axios';

// Base URL for the OpenAQ API v3 (updated from v2)
const OPENAQ_API_BASE_URL = 'https://api.openaq.org/v3';

// Parse command-line arguments
const args = process.argv.slice(2);

// Look for country argument, default to Finland (fi)
const countryArg = args.find(arg => /^[a-z]{2}$/i.test(arg));
const country = countryArg?.toLowerCase() || 'fi';

// Look for API key argument (format: key=your-api-key)
const apiKeyArg = args.find(arg => arg.startsWith('key='));
const apiKey = apiKeyArg ? apiKeyArg.split('=')[1] : process.env.OPENAQ_API_KEY;

// If no API key was provided, show information about how to get one
if (!apiKey) {
    console.log('\n=== OpenAQ API Key Required ===');
    console.log('The OpenAQ API v3 requires an API key for authentication.');
    console.log('You can get a free API key by signing up at: https://explore.openaq.org/register');
    console.log('\nThen, you can use it in one of two ways:');
    console.log('1. Set the OPENAQ_API_KEY environment variable');
    console.log('   export OPENAQ_API_KEY=your-api-key-here');
    console.log('2. Pass it as a command line argument:');
    console.log('   npm run test:openaq -- key=your-api-key-here');
    console.log('\nFor this experimental script, we will proceed with mocked data to demonstrate the functionality.');
    console.log('=================================\n');

    // Run the main function with mocked data for demonstration
    mockDemoRun();
    process.exit(0);
}

// Define types for the OpenAQ API responses
interface OpenAQLocation {
    id: number;
    name: string;
    city?: string;
    country: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    sensors: Array<{
        id: number;
        parameter: string;
    }>;
    timezone?: string;
}

interface OpenAQSensor {
    id: number;
    name?: string;
    parameter: {
        id: number;
        name: string;
        displayName: string;
        description?: string;
        preferredUnit: string;
    };
    manufacturer?: string;
    sensor_type?: string;
    location_id: number;
}

interface OpenAQMeasurement {
    parameter: string;
    value: number;
    unit: string;
    location_id: number;
    country: string;
    city?: string;
    sensor_id: number;
    date: {
        utc: string;
        local: string;
    };
}

interface LocationsResponse {
    meta: {
        name: string;
        website: string;
        page: number;
        limit: number;
        found: number;
    };
    results: OpenAQLocation[];
}

interface SensorsResponse {
    meta: {
        name: string;
        website: string;
        page: number;
        limit: number;
        found: number;
    };
    results: OpenAQSensor[];
}

interface MeasurementsResponse {
    meta: {
        name: string;
        website: string;
        page: number;
        limit: number;
        found: number;
    };
    results: OpenAQMeasurement[];
}

interface LocationMeasurementData {
    locationId: number;
    name: string;
    city?: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    measurements: {
        [parameter: string]: {
            value: number;
            unit: string;
            lastUpdated: string;
            sensorId: number;
        };
    };
}

/**
 * Fetches monitoring locations in the specified country 
 */
async function fetchLocations(country: string, limit: number = 100): Promise<OpenAQLocation[]> {
    try {
        console.log(`Fetching monitoring locations in ${country.toUpperCase()}...`);
        const response = await axios.get(`${OPENAQ_API_BASE_URL}/locations`, {
            params: {
                country,
                limit,
                page: 1,
                sort: 'desc',
                order_by: 'lastUpdated'
            },
            headers: {
                'X-API-Key': apiKey
            }
        });

        const data = response.data as LocationsResponse;
        console.log(`Found ${data.results.length} monitoring locations (out of ${data.meta.found} total)`);
        return data.results;
    } catch (error) {
        handleApiError(error, 'Error fetching locations');
        return [];
    }
}

/**
 * Fetches sensors for a specific location
 */
async function fetchLocationSensors(locationId: number): Promise<OpenAQSensor[]> {
    try {
        const response = await axios.get(`${OPENAQ_API_BASE_URL}/locations/${locationId}/sensors`, {
            params: {
                limit: 100
            },
            headers: {
                'X-API-Key': apiKey
            }
        });

        const data = response.data as SensorsResponse;
        return data.results;
    } catch (error) {
        handleApiError(error, `Error fetching sensors for location ${locationId}`);
        return [];
    }
}

/**
 * Fetches the latest measurements for a specific sensor
 */
async function fetchLatestMeasurements(sensorId: number): Promise<OpenAQMeasurement[]> {
    try {
        const response = await axios.get(`${OPENAQ_API_BASE_URL}/sensors/${sensorId}/measurements`, {
            params: {
                limit: 1, // We only need the latest measurement
                sort: 'desc', // Most recent first
                order_by: 'date'
            },
            headers: {
                'X-API-Key': apiKey
            }
        });

        const data = response.data as MeasurementsResponse;
        return data.results;
    } catch (error) {
        handleApiError(error, `Error fetching measurements for sensor ${sensorId}`);
        return [];
    }
}

/**
 * Combines location data with its latest measurements
 */
async function getLocationWithMeasurements(location: OpenAQLocation): Promise<LocationMeasurementData | null> {
    try {
        // Fetch all sensors for this location
        const sensors = await fetchLocationSensors(location.id);

        if (sensors.length === 0) {
            console.log(`No sensors found for location ${location.name}`);
            return null;
        }

        console.log(`Found ${sensors.length} sensors for ${location.name}`);

        const measurementData: {
            [parameter: string]: {
                value: number;
                unit: string;
                lastUpdated: string;
                sensorId: number;
            };
        } = {};

        // For each sensor, get the latest measurement
        const measurementPromises = sensors.map(async (sensor) => {
            const measurements = await fetchLatestMeasurements(sensor.id);
            if (measurements.length > 0) {
                const latestMeasurement = measurements[0];
                measurementData[sensor.parameter.name] = {
                    value: latestMeasurement.value,
                    unit: latestMeasurement.unit,
                    lastUpdated: latestMeasurement.date.utc,
                    sensorId: sensor.id
                };
            }
        });

        await Promise.all(measurementPromises);

        // If we didn't get any measurements, return null
        if (Object.keys(measurementData).length === 0) {
            return null;
        }

        return {
            locationId: location.id,
            name: location.name,
            city: location.city,
            coordinates: location.coordinates,
            measurements: measurementData
        };
    } catch (error) {
        console.error(`Error processing location ${location.name}:`, error);
        return null;
    }
}

/**
 * Handles API errors and extracts meaningful messages
 */
function handleApiError(error: any, context: string): void {
    console.error(`\n--- ${context} ---`);
    if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);

        if (error.response?.data) {
            if (typeof error.response.data === 'string') {
                console.error('API Error Data:', error.response.data);
            } else {
                console.error('API Error Data:', JSON.stringify(error.response.data, null, 2));
            }
        } else {
            console.error('Error Message:', error.message);
        }
    } else {
        console.error('Error:', error);
    }
    console.error(`--- End of Error ---\n`);
}

/**
 * Format air quality value with appropriate color based on level
 * This is a simplified approach - actual AQI calculations are more complex
 */
function formatAQValue(parameter: string, value: number): string {
    // Very simplified air quality thresholds - should be replaced with proper calculations
    // These are just rough guidelines and will vary by parameter and country standards
    const thresholds: { [key: string]: number[] } = {
        'pm25': [10, 25, 50, 75, 100], // PM2.5 thresholds in µg/m³
        'pm10': [20, 50, 100, 200, 300], // PM10 thresholds in µg/m³
        'no2': [40, 90, 120, 230, 340],  // NO2 thresholds in µg/m³
        'so2': [20, 80, 250, 350, 500],  // SO2 thresholds in µg/m³
        'o3': [60, 120, 180, 240, 300],  // O3 thresholds in µg/m³
        'co': [4400, 9400, 12400, 15400, 30400], // CO thresholds in µg/m³
    };

    const paramKey = parameter.toLowerCase();
    const levels = thresholds[paramKey] || [50, 100, 150, 200, 300]; // Default thresholds

    let color: string;
    if (value <= levels[0]) color = '\x1b[32m'; // Green - Good
    else if (value <= levels[1]) color = '\x1b[92m'; // Light Green - Moderate
    else if (value <= levels[2]) color = '\x1b[33m'; // Yellow - Unhealthy for Sensitive Groups
    else if (value <= levels[3]) color = '\x1b[31m'; // Red - Unhealthy
    else if (value <= levels[4]) color = '\x1b[35m'; // Purple - Very Unhealthy
    else color = '\x1b[30m\x1b[41m'; // Black on Red Background - Hazardous

    return `${color}${value}\x1b[0m`;
}

async function main() {
    try {
        // 1. Fetch monitoring locations in Finland
        const locations = await fetchLocations(country);

        if (locations.length === 0) {
            console.error(`No monitoring locations found in ${country.toUpperCase()}`);
            return;
        }

        // Display basic location info
        console.log('\n--- Monitoring Locations ---');
        locations.slice(0, 10).forEach((loc, index) => {
            console.log(`${index + 1}. ${loc.name}${loc.city ? ` (${loc.city})` : ''} - Sensors: ${loc.sensors?.length || 0}`);
        });

        if (locations.length > 10) {
            console.log(`... and ${locations.length - 10} more locations`);
        }

        // 2. Fetch latest measurements for each location (limited to first 5 for performance)
        console.log('\n--- Fetching latest air quality measurements ---');
        const locationPromises = locations.slice(0, 5).map(location => getLocationWithMeasurements(location));
        const locationsWithData = (await Promise.all(locationPromises)).filter(loc => loc !== null) as LocationMeasurementData[];

        if (locationsWithData.length === 0) {
            console.error(`No locations with air quality data found in ${country.toUpperCase()}`);
            return;
        }

        // 3. Display air quality data in a structured format
        console.log('\n--- Air Quality Data in Finland ---');

        // Find all unique parameters across all locations
        const allParameters = new Set<string>();
        locationsWithData.forEach(loc => {
            Object.keys(loc.measurements).forEach(param => {
                allParameters.add(param);
            });
        });

        // Convert to array and sort alphabetically
        const parametersList = Array.from(allParameters).sort();

        // Create a table structure
        const tableData: any[] = locationsWithData.map(loc => {
            const row: any = {
                'Location': loc.name,
                'City': loc.city || 'N/A',
                'Latitude': loc.coordinates.latitude,
                'Longitude': loc.coordinates.longitude
            };

            // Add each parameter as a column
            parametersList.forEach(param => {
                if (loc.measurements[param]) {
                    row[`${param} (${loc.measurements[param].unit})`] = loc.measurements[param].value;
                } else {
                    row[`${param}`] = 'N/A';
                }
            });

            return row;
        });

        console.table(tableData);

        // 4. Provide a more detailed view of the data
        console.log('\n--- Detailed Air Quality Information ---');
        locationsWithData.forEach(loc => {
            console.log(`\n${loc.name}${loc.city ? ` (${loc.city})` : ''}`);
            console.log(`Coordinates: ${loc.coordinates.latitude}, ${loc.coordinates.longitude}`);
            console.log('Measurements:');

            Object.entries(loc.measurements).forEach(([parameter, data]) => {
                console.log(`  - ${parameter}: ${formatAQValue(parameter, data.value)} ${data.unit} (Updated: ${new Date(data.lastUpdated).toLocaleString()})`);
            });
        });

        // 5. Provide summary statistics
        console.log('\n--- Summary Statistics ---');
        console.log(`Total locations checked: ${locations.length}`);
        console.log(`Locations with data: ${locationsWithData.length}`);
        console.log(`Parameters measured: ${parametersList.join(', ')}`);

        // 6. Usage instructions
        console.log('\n--- Usage Instructions ---');
        console.log('To check air quality in a different country, run:');
        console.log('  npm run test:openaq -- [country_code]');
        console.log('Example: npm run test:openaq -- se  (for Sweden)');

    } catch (error) {
        console.error('An unexpected error occurred:', error);
    }
}

/**
 * Runs a demo with mocked data to show how the script would work with a valid API key
 */
function mockDemoRun() {
    console.log('=== DEMO MODE: USING MOCKED DATA ===');
    console.log('Fetching monitoring locations in FI...');

    // Mock location data that matches our OpenAQLocation interface
    const mockLocations: OpenAQLocation[] = [
        {
            id: 1001,
            name: 'Helsinki City Center',
            city: 'Helsinki',
            country: 'FI',
            coordinates: {
                latitude: 60.1699,
                longitude: 24.9384
            },
            sensors: [
                { id: 2001, parameter: 'pm25' },
                { id: 2002, parameter: 'pm10' },
                { id: 2003, parameter: 'no2' }
            ]
        },
        {
            id: 1002,
            name: 'Tampere',
            city: 'Tampere',
            country: 'FI',
            coordinates: {
                latitude: 61.4978,
                longitude: 23.7610
            },
            sensors: [
                { id: 2004, parameter: 'pm25' },
                { id: 2005, parameter: 'o3' }
            ]
        },
        {
            id: 1003,
            name: 'Turku',
            city: 'Turku',
            country: 'FI',
            coordinates: {
                latitude: 60.4518,
                longitude: 22.2666
            },
            sensors: [
                { id: 2006, parameter: 'pm10' },
                { id: 2007, parameter: 'no2' },
                { id: 2008, parameter: 'so2' }
            ]
        }
    ];

    console.log(`Found ${mockLocations.length} monitoring locations`);

    // Display basic location info
    console.log('\n--- Monitoring Locations ---');
    mockLocations.forEach((loc, index) => {
        console.log(`${index + 1}. ${loc.name} (${loc.city}) - Sensors: ${loc.sensors.length}`);
    });

    console.log('\n--- Fetching latest air quality measurements ---');

    // Mock measurement data that matches our LocationMeasurementData interface
    const mockLocationsWithData: LocationMeasurementData[] = [
        {
            locationId: 1001,
            name: 'Helsinki City Center',
            city: 'Helsinki',
            coordinates: {
                latitude: 60.1699,
                longitude: 24.9384
            },
            measurements: {
                'pm25': {
                    value: 8.2,
                    unit: 'µg/m³',
                    lastUpdated: '2023-11-15T10:00:00Z',
                    sensorId: 2001
                },
                'pm10': {
                    value: 15.3,
                    unit: 'µg/m³',
                    lastUpdated: '2023-11-15T10:00:00Z',
                    sensorId: 2002
                },
                'no2': {
                    value: 18.7,
                    unit: 'ppb',
                    lastUpdated: '2023-11-15T10:00:00Z',
                    sensorId: 2003
                }
            }
        },
        {
            locationId: 1002,
            name: 'Tampere',
            city: 'Tampere',
            coordinates: {
                latitude: 61.4978,
                longitude: 23.7610
            },
            measurements: {
                'pm25': {
                    value: 5.1,
                    unit: 'µg/m³',
                    lastUpdated: '2023-11-15T09:45:00Z',
                    sensorId: 2004
                },
                'o3': {
                    value: 32.4,
                    unit: 'ppb',
                    lastUpdated: '2023-11-15T09:45:00Z',
                    sensorId: 2005
                }
            }
        }
    ];

    // Find all unique parameters across all locations
    const allParameters = new Set<string>();
    mockLocationsWithData.forEach(loc => {
        Object.keys(loc.measurements).forEach(param => {
            allParameters.add(param);
        });
    });

    // Convert to array and sort alphabetically
    const parametersList = Array.from(allParameters).sort();

    // Display air quality data in a structured format
    console.log('\n--- Air Quality Data in Finland (MOCKED DATA) ---');

    // Create a table structure
    const tableData: any[] = mockLocationsWithData.map(loc => {
        const row: any = {
            'Location': loc.name,
            'City': loc.city || 'N/A',
            'Latitude': loc.coordinates.latitude,
            'Longitude': loc.coordinates.longitude
        };

        // Add each parameter as a column
        parametersList.forEach(param => {
            if (loc.measurements[param]) {
                row[`${param} (${loc.measurements[param].unit})`] = loc.measurements[param].value;
            } else {
                row[`${param}`] = 'N/A';
            }
        });

        return row;
    });

    console.table(tableData);

    // Provide a more detailed view of the data
    console.log('\n--- Detailed Air Quality Information (MOCKED DATA) ---');
    mockLocationsWithData.forEach(loc => {
        console.log(`\n${loc.name} (${loc.city})`);
        console.log(`Coordinates: ${loc.coordinates.latitude}, ${loc.coordinates.longitude}`);
        console.log('Measurements:');

        Object.entries(loc.measurements).forEach(([parameter, data]) => {
            console.log(`  - ${parameter}: ${formatAQValue(parameter, data.value)} ${data.unit} (Updated: ${new Date(data.lastUpdated).toLocaleString()})`);
        });
    });

    // Provide summary statistics
    console.log('\n--- Summary Statistics ---');
    console.log(`Total locations checked: ${mockLocations.length}`);
    console.log(`Locations with data: ${mockLocationsWithData.length}`);
    console.log(`Parameters measured: ${parametersList.join(', ')}`);

    console.log('\n=== END OF DEMO MODE ===');

    // Usage instructions for when the user gets an API key
    console.log('\n--- Usage Instructions ---');
    console.log('To check actual air quality with your API key:');
    console.log('  npm run test:openaq -- key=YOUR_API_KEY [country_code]');
    console.log('Example: npm run test:openaq -- key=abc123def456 se  (for Sweden)');
}

// Run the main function
main(); 
