import axios from 'axios';
import querystring from 'querystring';
import { SimpleCache } from '../utils/cache'; // Import the generic cache

// Define the specific type for this cache's values
type HsyWmsValue = '5min' | '10min' | '15min' | null;

// Cache configuration
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours in milliseconds
const hsyWmsCache = new SimpleCache<HsyWmsValue>('HSY WMS Walking Distance', CACHE_TTL);

// Base URL for the HSY WMS service
const HSY_WMS_BASE_URL = 'https://kartta.hsy.fi/geoserver/wms';

// Target layers for walking distances in order of preference (shortest first)
const walkTimeLayers = {
    '5min': 'asuminen_ja_maankaytto:kavely_5min',
    '10min': 'asuminen_ja_maankaytto:kavely_10min',
    '15min': 'asuminen_ja_maankaytto:kavely_15min',
};

// Coordinate Reference System used by the HSY service
const CRS = 'EPSG:3879';

/**
 * Internal function to query a single WMS layer for feature info at a point.
 * Returns true if a feature is found, false otherwise.
 */
async function checkWmsLayer(layerName: string, x: number, y: number): Promise<boolean> {
    const buffer = 10; // Small buffer in meters
    const bbox = `${x - buffer},${y - buffer},${x + buffer},${y + buffer}`;
    const width = 10;
    const height = 10;
    const queryX = Math.floor(width / 2);
    const queryY = Math.floor(height / 2);

    const params = {
        SERVICE: 'WMS',
        VERSION: '1.1.1',
        REQUEST: 'GetFeatureInfo',
        LAYERS: layerName,
        QUERY_LAYERS: layerName,
        STYLES: '',
        SRS: CRS,
        BBOX: bbox,
        WIDTH: width,
        HEIGHT: height,
        X: queryX,
        Y: queryY,
        INFO_FORMAT: 'application/json',
        FEATURE_COUNT: 1
    };

    const url = `${HSY_WMS_BASE_URL}?${querystring.stringify(params)}`;
    console.debug(`Querying HSY WMS: ${url}`); // Use debug level logging

    try {
        const response = await axios.get(url);
        // Check if the response is GeoJSON and has features
        const hasFeatures = response.data &&
            response.data.type === 'FeatureCollection' &&
            Array.isArray(response.data.features) &&
            response.data.features.length > 0;

        console.debug(`Layer ${layerName} check result: ${hasFeatures}`);
        return hasFeatures;
    } catch (error) {
        console.error(`Error checking HSY WMS layer ${layerName}:`);
        if (error instanceof Error) {
            if (axios.isAxiosError(error)) {
                console.error(`API Error: Status ${error.response?.status}`, error.message);
                // Optionally log error.response.data if needed, but be cautious of size
            } else {
                console.error(`Unexpected Error:`, error.message);
            }
        } else {
            console.error(`Unknown error:`, error);
        }
        return false; // Indicate failure to check layer
    }
}

/**
 * Checks HSY WMS layers to determine the shortest walking distance zone (5, 10, or 15 minutes)
 * to public transport stops for a given point. Uses an in-memory cache.
 * 
 * @param x The X coordinate in EPSG:3879.
 * @param y The Y coordinate in EPSG:3879.
 * @returns A promise resolving to '5min', '10min', '15min', or null if outside all zones or on error.
 */
export async function getWalkingDistance(x: number, y: number): Promise<HsyWmsValue> {
    const cacheKey = `${x},${y}`;

    // Check cache first
    const cachedValue = hsyWmsCache.get(cacheKey);
    if (cachedValue !== undefined) {
        return cachedValue; // Return cached value (including null)
    }

    console.log(`Cache miss for key "${cacheKey}" in [HSY WMS Walking Distance]. Checking HSY API...`);
    // Check layers in order: 5min, 10min, 15min
    for (const [duration, layerName] of Object.entries(walkTimeLayers)) {
        try {
            const isInZone = await checkWmsLayer(layerName, x, y);
            if (isInZone) {
                const result = duration as HsyWmsValue;
                console.log(`Point found within ${duration} zone.`);
                // Store in cache
                hsyWmsCache.set(cacheKey, result);
                return result; // Return the first zone found
            }
        } catch (error) {
            // Errors are handled within checkWmsLayer, but catch here just in case
            console.error(`Unexpected error during layer check for ${duration}:`, error);
            // Do not cache errors, just continue to the next layer instead of returning immediately
            continue;
        }
    }

    console.log('Point is outside all walking distance zones.');
    // Cache the null result (point not found in any zone)
    hsyWmsCache.set(cacheKey, null);
    return null; // Not found in any layer
}

/**
 * Clears the walking distance cache.
 * This can be called by a scheduled task.
 */
export function clearWalkingDistanceCache() {
    hsyWmsCache.clear();
    // Log message is now handled by the SimpleCache class
} 
