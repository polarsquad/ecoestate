import axios from 'axios';
import querystring from 'querystring';

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
    } catch (error: any) {
        console.error(`Error querying HSY WMS layer ${layerName}:`, error.message);
        // Optionally log more details based on error type (AxiosError vs other)
        if (axios.isAxiosError(error)) {
            console.error('HSY WMS Error Status:', error.response?.status);
            // Avoid logging potentially large response data in production errors
            // console.error('HSY WMS Error Data:', error.response?.data);
        }
        throw error; // Re-throw the error to be handled by the caller
    }
}

/**
 * Checks HSY WMS layers to determine the shortest walking distance zone (5, 10, or 15 minutes)
 * to public transport stops for a given point.
 * 
 * @param x The X coordinate in EPSG:3879.
 * @param y The Y coordinate in EPSG:3879.
 * @returns A promise resolving to '5min', '10min', '15min', or null if outside all zones or on error.
 */
export async function getWalkingDistance(x: number, y: number): Promise<'5min' | '10min' | '15min' | null> {
    console.log(`Checking walking distance for coordinates: (${x}, ${y})`);
    // Check layers in order: 5min, 10min, 15min
    for (const [duration, layerName] of Object.entries(walkTimeLayers)) {
        try {
            const isInZone = await checkWmsLayer(layerName, x, y);
            if (isInZone) {
                console.log(`Point found within ${duration} zone.`);
                return duration as '5min' | '10min' | '15min'; // Return the first zone found
            }
        } catch (error) {
            // Errors are handled within checkWmsLayer, but catch here just in case
            console.error(`Unexpected error during layer check for ${duration}:`, error);
            return null; // Treat unexpected errors as point not found
        }
    }

    console.log('Point is outside all walking distance zones.');
    return null; // Not found in any layer
} 
