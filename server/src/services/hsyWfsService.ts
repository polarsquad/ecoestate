import axios from 'axios';
import { SimpleCache } from '../utils/cache';
import { GeoJSONFeatureCollection } from '../types/geojson.types'; // Import the GeoJSON types

// Cache configuration
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours in milliseconds
const postcodeCache = new SimpleCache<GeoJSONFeatureCollection>('HSY WFS Postcodes', CACHE_TTL);

// Base URL for the HSY WFS service
const HSY_WFS_BASE_URL = 'https://kartta.hsy.fi/geoserver/wfs';
const POSTCODE_LAYER_NAME = 'taustakartat_ja_aluejaot:pks_postinumeroalueet_2022';
const WFS_VERSION = '2.0.0'; // Use WFS 2.0.0 for better compatibility and JSON output
const OUTPUT_FORMAT = 'application/json';
const CRS = 'EPSG:3879';
const CACHE_KEY = 'all_postcodes';

/**
 * Fetches postcode boundaries as GeoJSON from the HSY WFS API.
 * Uses an in-memory cache.
 *
 * @returns A promise resolving to a GeoJSON FeatureCollection or null if an error occurs.
 */
export async function getPostcodeBoundaries(): Promise<GeoJSONFeatureCollection | null> {
    // Check cache first
    const cachedValue = postcodeCache.get(CACHE_KEY);
    if (cachedValue !== undefined) {
        return cachedValue;
    }

    // console.log(`Cache miss for key "${CACHE_KEY}" in [${postcodeCache.name}]. Fetching from HSY WFS API...`);
    // The cache class logs misses internally, no need to log here.
    console.log(`Fetching postcode boundaries from HSY WFS API...`);

    const params = {
        SERVICE: 'WFS',
        VERSION: WFS_VERSION,
        REQUEST: 'GetFeature',
        TYPENAMES: POSTCODE_LAYER_NAME,
        OUTPUTFORMAT: OUTPUT_FORMAT,
        SRSNAME: CRS // Request coordinates in the desired CRS
        // We don't need BBOX if we want *all* features in the layer
    };

    const url = HSY_WFS_BASE_URL;
    console.debug(`Querying HSY WFS: ${url} with params: ${JSON.stringify(params)}`);

    try {
        const response = await axios.get<GeoJSONFeatureCollection>(url, { params });

        if (response.status === 200 && response.data && response.data.type === 'FeatureCollection') {
            console.log(`Successfully fetched postcode boundaries from HSY WFS.`);
            postcodeCache.set(CACHE_KEY, response.data);
            return response.data;
        } else {
            // Handle cases where the API returns 200 OK but the data is not as expected
            console.error(`Error fetching postcode boundaries: Received status ${response.status} but data is invalid or not a FeatureCollection.`);
            return null;
        }
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            console.error(`Error fetching postcode boundaries: API request failed with status ${error.response?.status} ${error.response?.statusText}`, error.message);
            // console.error('HSY WFS Error Response Data:', error.response?.data); // Avoid logging potentially large data
        } else {
            console.error(`Error fetching postcode boundaries: An unexpected error occurred`, error);
        }
        return null;
    }
}

/**
 * Clears the postcode boundaries cache.
 */
export function clearPostcodeCache(): void {
    postcodeCache.clear();
} 
