import axios from 'axios';
import querystring from 'querystring';
import { OverpassResponse, OverpassElement } from '../types/overpass.types'; // Import types - Added .js extension
import osm2geojson from 'osm2geojson-lite';

// Public Overpass API endpoint
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Helsinki Central Station approximate coordinates
const HELSINKI_CENTER_LAT = 60.1719;
const HELSINKI_CENTER_LON = 24.9414;

// Radius for the search in meters
const SEARCH_RADIUS = 200; // Search within 200 meters

// Overpass QL query: Find nodes tagged as 'amenity' within a radius around a point
// [out:json] specifies the output format
// [timeout:25] sets a timeout for the query
// node(around:<radius>,<lat>,<lon>) selects nodes
// [amenity] filters nodes that have an 'amenity' tag
// out center; outputs the nodes with their coordinates
const overpassQuery = `
[out:json][timeout:25];
(
  node["amenity"](around:${SEARCH_RADIUS},${HELSINKI_CENTER_LAT},${HELSINKI_CENTER_LON});
);
out center;
`;

/**
 * Executes an Overpass QL query
 */
async function queryOverpassApi(query: string): Promise<OverpassResponse | null> {
    console.log(`Querying Overpass API: ${OVERPASS_API_URL}`);
    console.log(`Query:\n${query.trim()}`);

    try {
        // Overpass API expects the query in the 'data' parameter of a POST request body
        const postData = querystring.stringify({ data: query });

        const response = await axios.post<OverpassResponse>(OVERPASS_API_URL, postData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (response.data && response.data.elements) {
            console.log('Successfully received data from Overpass API.');
            return response.data;
        } else {
            console.error('No elements found in Overpass API response or unexpected format.');
            console.log('Raw Response:', response.data);
            return null;
        }
    } catch (error) {
        console.error("\n--- Error testing Overpass fetch ---");
        if (error instanceof Error) {
            console.error('Error:', error.message);
        } else {
            console.error("Unknown error structure:", error);
        }
        console.error("--- End of Error ---");
        return null;
    }
}

/**
 * Main function to run the test query
 */
async function main() {
    console.log(`--- Testing Overpass API ---`);
    console.log(`Fetching amenities within ${SEARCH_RADIUS}m of Helsinki Central Station (${HELSINKI_CENTER_LAT}, ${HELSINKI_CENTER_LON})`);

    const data = await queryOverpassApi(overpassQuery);

    if (data && data.elements) {
        console.log(`\nFound ${data.elements.length} amenities:`);
        data.elements.forEach((element: OverpassElement, index: number) => {
            const tags = element.tags || {};
            const amenityType = tags.amenity || 'N/A';
            const name = tags.name || 'Unnamed';
            console.log(
                `${index + 1}. Type: ${amenityType}, Name: ${name} (ID: ${element.id}) ` +
                `[Lat: ${element.lat?.toFixed(5)}, Lon: ${element.lon?.toFixed(5)}]`
            );
            // Log center coordinates if available (useful for nodes from ways/relations)
            if (element.center) {
                console.log(`   Center: Lat: ${element.center.lat?.toFixed(5)}, Lon: ${element.center.lon?.toFixed(5)}`);
            }
            // Log all tags for more detail
            // console.log('   Tags:', tags);
        });
    } else {
        console.log('\nCould not retrieve amenity data from Overpass API.');
    }

    console.log(`\n--- Test Complete ---`);
}

// Run the main function
main().catch(error => {
    console.error("Unexpected error in main function:", error);
    process.exit(1);
});

/**
 * Function to fetch data from Overpass API and convert to GeoJSON
 */
async function testOverpassFetch(): Promise<void> {
    const sampleQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="cafe"](60.16,24.93,60.18,24.96);
        );
        out body;
        >;
        out skel qt;
    `;

    try {
        console.log('Testing Overpass API fetch with sample query...');
        const response = await axios.post<OverpassResponse>(
            OVERPASS_API_URL,
            sampleQuery,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (response.data && response.data.elements) {
            const geojsonData = osm2geojson(response.data, { completeFeature: true });
            console.log(`Successfully fetched and converted ${geojsonData.features.length} features (cafes in central Helsinki).`);
        } else {
            console.log('Received empty or invalid data from Overpass API.');
            console.log('Response Data:', response.data);
        }

    } catch (error) {
        console.error("\n--- Error testing Overpass fetch ---");
        if (axios.isAxiosError(error)) {
            console.error('Status:', error.response?.status);
            console.error('Status Text:', error.response?.statusText);
            console.error('Data:', error.response?.data);
        } else if (error instanceof Error) {
            console.error('Error:', error.message);
        } else {
            console.error("Unknown error structure:", error);
        }
        console.error("--- End of Error ---");
    }
}

void testOverpassFetch(); // Call the test function 
