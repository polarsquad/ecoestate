import axios from 'axios';
import querystring from 'querystring';
import { OverpassResponse, OverpassElement } from '../types/overpass.types';

// Public Overpass API endpoint
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Handles API errors and extracts meaningful messages
 */
function handleApiError(error: any, context: string): void {
    console.error(`\n--- Error in ${context} ---`);
    if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        // Avoid logging potentially large query data in errors
        // console.error('Data:', JSON.stringify(error.response?.data, null, 2));
        if (error.response?.data) {
            console.error('API Error Message:', JSON.stringify(error.response.data).substring(0, 500)); // Log first 500 chars
        }
    } else {
        console.error('Non-Axios Error:', error.message);
    }
    console.error(`--- End of Error ---\n`);
}

/**
 * Builds an Overpass QL query to find green spaces around a point.
 * @param lat Latitude of the center point.
 * @param lon Longitude of the center point.
 * @param radius Search radius in meters.
 * @returns The Overpass QL query string.
 */
function buildGreenSpaceQuery(lat: number, lon: number, radius: number): string {
    // Tags commonly associated with green spaces
    const greenSpaceTags = [
        'leisure=park',
        'landuse=forest',
        'natural=wood',
        'leisure=nature_reserve',
        'landuse=meadow',
        'landuse=grass',
        'natural=grassland',
        'natural=scrub',
        'leisure=garden'
    ];

    // Build query parts for nodes, ways, and relations
    const queryParts = greenSpaceTags.map(tag => `nwr[\"${tag.split('=')[0]}\"=\"${tag.split('=')[1]}\"](around:${radius},${lat},${lon});`);

    // Combine query parts into the final query
    // [out:json] specifies JSON output
    // [timeout:25] sets a 25-second timeout
    // out geom; includes geometry information for ways/relations
    const query = `
[out:json][timeout:25];
(
  ${queryParts.join('\n  ')}
);
out geom;
`;
    return query;
}

/**
 * Fetches green space data (parks, forests, etc.) from the Overpass API.
 * @param lat Latitude of the center point.
 * @param lon Longitude of the center point.
 * @param radius Search radius in meters.
 * @returns A promise resolving to an array of Overpass elements representing green spaces.
 */
export async function fetchGreenSpaces(lat: number, lon: number, radius: number): Promise<OverpassElement[]> {
    const query = buildGreenSpaceQuery(lat, lon, radius);
    console.log(`Querying Overpass API for green spaces around (${lat}, ${lon}), radius ${radius}m.`);
    // console.log(`Overpass Query:\n${query}`); // Optional: log the full query

    try {
        const postData = querystring.stringify({ data: query });
        const response = await axios.post<OverpassResponse>(OVERPASS_API_URL, postData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
        });

        if (response.data && response.data.elements) {
            console.log(`Successfully received ${response.data.elements.length} green space elements from Overpass API.`);
            return response.data.elements;
        } else {
            console.warn('No elements found in Overpass API response or unexpected format.');
            console.log('Raw Response Snippet:', JSON.stringify(response.data).substring(0, 500));
            return []; // Return empty array if no elements
        }
    } catch (error) {
        handleApiError(error, 'fetchGreenSpaces');
        // Re-throw a more specific error for the caller
        throw new Error(`Failed to fetch green space data from Overpass API for coordinates (${lat}, ${lon}).`);
    }
} 
