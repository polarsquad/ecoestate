import axios from 'axios';
import osmtogeojson from 'osmtogeojson';
import { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import { SimpleCache } from '../utils/cache';
import {
    OverpassResponse
} from '../types/overpass.types';

// Define the specific type for this cache's values (now GeoJSON)
type OverpassCacheValue = FeatureCollection;

// Cache configuration
const OVERPASS_CACHE_TTL = 1000 * 60 * 60; // 1 hour
const overpassCache = new SimpleCache<OverpassCacheValue>('Overpass Green Spaces GeoJSON', OVERPASS_CACHE_TTL);

// Define the static bounding box for the Helsinki Metropolitan Area
const HELSINKI_REGION_BBOX = '59.9,24.4,60.5,25.4'; // South, West, North, East

// Define a static cache key
const CACHE_KEY = 'helsinki_region_green_spaces';

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
 * Fetches green space elements for the Helsinki Metropolitan Area
 * from the Overpass API and converts them to GeoJSON. Uses an in-memory cache.
 *
 * @returns A promise resolving to a GeoJSON FeatureCollection representing green spaces.
 */
export async function fetchGreenSpaces(): Promise<FeatureCollection> {
    // Check cache using the static key
    const cachedValue = overpassCache.get(CACHE_KEY);
    if (cachedValue !== undefined) {
        return cachedValue;
    }

    console.log(`Cache miss for key "${CACHE_KEY}" in [Overpass Green Spaces GeoJSON]. Querying Overpass API for Helsinki region...`);

    // Construct the Overpass QL query using the static bbox
    const tagsQueryPart = greenSpaceTags.map(tag => {
        const [key, value] = tag.split('=');
        return `
      node["${key}"="${value}"];
      way["${key}"="${value}"];
      relation["${key}"="${value}"];`;
    }).join('');

    const overpassQuery = `
        [out:json][timeout:60][bbox:${HELSINKI_REGION_BBOX}]; // Use static bbox, increase timeout
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

        // Check if the response data is valid Overpass JSON format
        if (!response.data || typeof response.data !== 'object' || !response.data.elements) {
            console.warn('Unexpected Overpass API response format:', response.data);
            // Return empty GeoJSON to avoid errors downstream
            const emptyGeoJson: FeatureCollection = { type: 'FeatureCollection', features: [] };
            overpassCache.set(CACHE_KEY, emptyGeoJson); // Use static key
            return emptyGeoJson;
        }

        // Convert the Overpass response data to GeoJSON
        const geojsonData = osmtogeojson(response.data);

        console.log(`Successfully received and converted ${geojsonData.features.length} green space features from Overpass API for Helsinki region.`);

        // Cache the GeoJSON result using the static key
        overpassCache.set(CACHE_KEY, geojsonData);
        return geojsonData;

    } catch (error: any) {
        handleApiError(error, 'fetchGreenSpaces');
        // Return empty GeoJSON on error to prevent breaking the frontend
        // Do not cache errors
        return { type: 'FeatureCollection', features: [] };
    }
}

/**
 * Clears the Overpass API cache.
 */
export function clearOverpassCache() {
    overpassCache.clear();
    // Log message handled by SimpleCache
} 
