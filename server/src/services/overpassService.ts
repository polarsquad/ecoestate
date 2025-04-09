import axios from 'axios';
import { OverpassResponse, OverpassElement } from '../types/overpass.types';

// Simple in-memory cache for Overpass API results
interface OverpassCacheEntry {
    value: OverpassElement[];
    timestamp: number;
}
const overpassCache = new Map<string, OverpassCacheEntry>(); // Key: "lat,lon,radius"
const OVERPASS_CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Base URL for the Overpass API
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Tags identifying green spaces in OpenStreetMap
// Ref: https://wiki.openstreetmap.org/wiki/Tag:leisure%3Dpark
// Ref: https://wiki.openstreetmap.org/wiki/Tag:landuse%3Dgrass
// Ref: https://wiki.openstreetmap.org/wiki/Tag:natural%3Dwood
const greenSpaceTags = [
    'leisure=park',
    'leisure=garden',
    'leisure=dog_park',
    'landuse=grass',
    'landuse=forest',
    'landuse=meadow',
    'natural=wood',
    'natural=tree_row',
    'natural=grassland'
];

/**
 * Helper function to handle API errors consistently.
 */
function handleApiError(error: any, context: string): void {
    console.error(`\n--- Error in ${context} ---`);
    if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        // Avoid logging potentially huge XML/text data for Overpass errors
        if (error.response?.data && typeof error.response.data === 'object') {
            console.error('API Error Data Snippet:', JSON.stringify(error.response.data).substring(0, 500));
        } else if (error.response?.data) {
            console.error('API Error Data Snippet:', String(error.response.data).substring(0, 500));
        } else {
            console.error('Axios Error Message:', error.message);
        }
    } else {
        console.error('Non-Axios Error:', error.message);
    }
    console.error(`--- End of Error ---\n`);
}

/**
 * Fetches green space elements (parks, forests, etc.) around a given coordinate
 * from the Overpass API. Uses an in-memory cache.
 *
 * @param lat Latitude of the center point.
 * @param lon Longitude of the center point.
 * @param radius Search radius in meters.
 * @returns A promise resolving to an array of OverpassElement objects representing green spaces.
 */
export async function fetchGreenSpaces(lat: number, lon: number, radius: number): Promise<OverpassElement[]> {
    const cacheKey = `${lat},${lon},${radius}`;
    const now = Date.now();

    // Check cache
    const cachedEntry = overpassCache.get(cacheKey);
    if (cachedEntry && (now - cachedEntry.timestamp < OVERPASS_CACHE_TTL)) {
        console.log(`Cache hit for Overpass query (${cacheKey}).`);
        return cachedEntry.value;
    }

    console.log(`Cache miss or expired for Overpass query (${cacheKey}). Querying Overpass API for green spaces around (${lat}, ${lon}), radius ${radius}m.`);

    // Construct the Overpass QL query
    // Find nodes, ways, and relations matching the green space tags within the radius
    const tagsQueryPart = greenSpaceTags.map(tag => {
        const [key, value] = tag.split('=');
        return `
      node["${key}"="${value}"](around:${radius},${lat},${lon});
      way["${key}"="${value}"](around:${radius},${lat},${lon});
      relation["${key}"="${value}"](around:${radius},${lat},${lon});`;
    }).join('');

    const overpassQuery = `
        [out:json][timeout:25];
        (
          ${tagsQueryPart}
        );
        out body;
        >;
        out skel qt;
    `;

    try {
        const response = await axios.post<OverpassResponse>(
            OVERPASS_API_URL,
            overpassQuery,
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );

        if (response.data && response.data.elements) {
            console.log(`Successfully received ${response.data.elements.length} green space elements from Overpass API.`);
            // Cache the result
            overpassCache.set(cacheKey, { value: response.data.elements, timestamp: now });
            return response.data.elements;
        } else {
            console.warn('No elements found in Overpass API response or unexpected format.');
            console.log('Raw Response Snippet:', JSON.stringify(response.data).substring(0, 500));
            // Cache the empty result
            overpassCache.set(cacheKey, { value: [], timestamp: now });
            return []; // Return empty array if no elements
        }
    } catch (error: any) {
        handleApiError(error, 'fetchGreenSpaces');
        // Do not cache errors
        // Depending on requirements, could return empty array or re-throw
        // Returning empty for now to avoid breaking potential consumers
        return [];
    }
}

/**
 * Clears the Overpass API cache.
 */
export function clearOverpassCache() {
    overpassCache.clear();
    console.log('Overpass API cache cleared.');
} 
