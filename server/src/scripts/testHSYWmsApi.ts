import axios from 'axios';
import querystring from 'querystring';

// Base URL for the HSY WMS service
const HSY_WMS_BASE_URL = 'https://kartta.hsy.fi/geoserver/wms';

// Target layers for walking distances
const walkTimeLayers = {
    '5min': 'asuminen_ja_maankaytto:kavely_5min',
    '10min': 'asuminen_ja_maankaytto:kavely_10min',
    '15min': 'asuminen_ja_maankaytto:kavely_15min',
};

// Coordinate Reference System used by the HSY service
const CRS = 'EPSG:3879';

// Sample point: Helsinki Central Railway Station (approximate coordinates in EPSG:3879)
const samplePoint = {
    x: 25496600,
    y: 6672900,
    description: 'Helsinki Central Railway Station (approx.)'
};

/**
 * Queries the HSY WMS service to get feature information for a specific point and layer.
 * WMS GetFeatureInfo requires simulating a map request context (BBOX, WIDTH, HEIGHT)
 * and specifying the pixel coordinates (X, Y) within that context to query.
 */
async function queryWmsFeatureInfo(layerName: string, point: { x: number, y: number }): Promise<any> {
    // Define a small bounding box around the point for the simulated map request
    const buffer = 10; // Small buffer in meters
    const bbox = `${point.x - buffer},${point.y - buffer},${point.x + buffer},${point.y + buffer}`;

    // Define the dimensions of the simulated map request (small is fine)
    const width = 10;
    const height = 10;

    // Define the pixel coordinates to query within the simulated map (center)
    const queryX = Math.floor(width / 2);
    const queryY = Math.floor(height / 2);

    const params = {
        SERVICE: 'WMS',
        VERSION: '1.1.1', // Common WMS version
        REQUEST: 'GetFeatureInfo',
        LAYERS: layerName,
        QUERY_LAYERS: layerName,
        STYLES: '',
        SRS: CRS,
        BBOX: bbox,
        WIDTH: width,
        HEIGHT: height,
        X: queryX, // Pixel column
        Y: queryY, // Pixel row
        INFO_FORMAT: 'application/json', // Request JSON format (easier to parse)
        FEATURE_COUNT: 1 // Limit to one feature
    };

    const url = `${HSY_WMS_BASE_URL}?${querystring.stringify(params)}`;
    console.log(`\nQuerying layer '${layerName}' at X=${point.x}, Y=${point.y}`);
    console.log(`Request URL: ${url}`); // Log the URL for debugging

    try {
        const response = await axios.get(url);
        // WMS GetFeatureInfo might return empty if no feature is found at the point
        // Successful responses with features usually return a GeoJSON FeatureCollection
        if (response.data && response.data.features && response.data.features.length > 0) {
            console.log(`Feature found in layer '${layerName}'!`);
            return response.data; // Return the GeoJSON FeatureCollection
        } else {
            console.log(`No feature found in layer '${layerName}' at this point.`);
            // Log the raw response if it's not the expected GeoJSON
            if (response.data && typeof response.data !== 'object') {
                console.log('Raw Response:', response.data);
            }
            return null;
        }
    } catch (error) {
        console.error(`Error querying layer ${layerName}:`);
        if (axios.isAxiosError(error)) {
            console.error('Status:', error.response?.status);
            console.error('Data:', error.response?.data);
        } else if (error instanceof Error) {
            console.error('Error:', error.message);
        } else {
            console.error('Unknown error structure:', error);
        }
        return null;
    }
}

/**
 * Main function to run the test queries
 */
async function main() {
    console.log(`--- Testing HSY WMS Walking Distance Layers ---`);
    console.log(`Querying point: ${samplePoint.description} (${samplePoint.x}, ${samplePoint.y} in ${CRS})`);

    let foundInAnyLayer = false;

    for (const [duration, layerName] of Object.entries(walkTimeLayers)) {
        const result = await queryWmsFeatureInfo(layerName, samplePoint);
        if (result && result.features && result.features.length > 0) {
            console.log(`---> Point IS within the ${duration} walking distance zone.`);
            // You could potentially extract properties from result.features[0].properties here if needed
            // console.log('Feature Properties:', result.features[0].properties);
            foundInAnyLayer = true;
        } else {
            console.log(`---> Point is NOT within the ${duration} walking distance zone.`);
        }
    }

    if (!foundInAnyLayer) {
        console.log(`\nResult: The sample point does not fall within any of the queried walking distance zones.`);
    } else {
        console.log(`\nResult: The sample point falls within one or more walking distance zones.`);
    }
    console.log(`--- Test Complete ---`);
}

// Run the main function
main().catch(error => {
    console.error("Unexpected error in main function:");
    if (error instanceof Error) {
        console.error(error.message);
    } else {
        console.error('Unknown error structure:', error);
    }
    process.exit(1);
});
