import axios from 'axios';
import {
    JsonStatResponse,
    PostalCodeData,
    BuildingPrices
} from '../types/statfi.types'; // Import types

// Simple in-memory cache for StatFi data
interface StatFiCacheEntry {
    value: PostalCodeData[];
    timestamp: number;
}
const statFiCache = new Map<string, StatFiCacheEntry>(); // Cache key is the year (string)
const STATFI_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

// Base URL for the StatFin PX-Web API
const STATFI_API_BASE_URL = 'https://pxdata.stat.fi:443/PxWeb/api/v1/fi/StatFin/ashi/';

// The specific table ID for property prices
const TABLE_ID = 'statfin_ashi_pxt_13mu.px';

// --- Remove Re-used Types ---
// interface Category { ... } - REMOVED
// interface Dimension { ... } - REMOVED
// interface JsonStatResponse { ... } - REMOVED
// export interface BuildingPrices { ... } - REMOVED (now imported)
// export interface PostalCodeData { ... } - REMOVED (now imported)
// --- End of Removed Types ---


/**
 * Fetches and processes property price data from Statistics Finland for a given year.
 * @param year The year for which to fetch data (e.g., "2023"). Defaults to "2023".
 * @returns {Promise<PostalCodeData[]>} A promise that resolves to an array of processed postal code data.
 */
export async function fetchStatFiPropertyData(year: string = "2023"): Promise<PostalCodeData[]> {
    const cacheKey = year;
    const now = Date.now();

    // Check cache first
    const cachedEntry = statFiCache.get(cacheKey);
    if (cachedEntry && (now - cachedEntry.timestamp < STATFI_CACHE_TTL)) {
        console.log(`Cache hit for StatFi data (year ${year}).`);
        return cachedEntry.value;
    }

    console.log(`Cache miss or expired for StatFi data (year ${year}). Fetching StatFin property price data for year: ${year}`);

    const queryPayload = {
        query: [
            {
                code: "Vuosi",
                selection: {
                    filter: "item",
                    values: [year]
                }
            },
            {
                code: "Tiedot",
                selection: {
                    filter: "item",
                    values: [
                        "keskihinta_aritm_nw" // Average price per square meter
                    ]
                }
            }
        ],
        response: {
            format: 'json-stat2'
        }
    };

    try {
        console.log(`Fetching StatFin property price data for year: ${year}`);
        const apiUrl = `${STATFI_API_BASE_URL}${TABLE_ID}`;

        const response = await axios.post<JsonStatResponse>(apiUrl, queryPayload, {
            headers: { 'Content-Type': 'application/json' }
        });

        const data = response.data;

        // Basic validation
        if (!data || !data.id || !data.dimension || !data.value) {
            throw new Error("StatFin API response is missing expected properties.");
        }

        // Get dimension info
        const buildingTypes = data.dimension.Talotyyppi.category.label;
        const postalCodes = data.dimension.Postinumero.category.label;
        const postalCodeIndexes = data.dimension.Postinumero.category.index;

        const pricesByPostalCode: PostalCodeData[] = [];
        const buildingTypeSize = data.size[data.id.indexOf('Talotyyppi')]; // Get size dynamically

        // Process each postal code
        for (const postalCodeKey in postalCodeIndexes) {
            const postalCodeLabel = postalCodes[postalCodeKey];
            const postalCodeIndex = postalCodeIndexes[postalCodeKey];
            const postalCodeNumber = postalCodeKey.trim();

            // Extract district and municipality
            const districtMatch = postalCodeLabel.match(/^\d+\s+(.+?)\s*\((.+?)\)$/);
            let district = 'N/A', municipality = 'N/A';
            if (districtMatch && districtMatch.length >= 3) {
                district = districtMatch[1].trim();
                municipality = districtMatch[2].trim();
            }

            const buildingTypePrices: BuildingPrices = {};

            // Get price for each building type at this postal code
            for (let btypeIdx = 0; btypeIdx < buildingTypeSize; btypeIdx++) {
                // Simplified index calculation assuming Year and Tiedot dimensions have size 1
                const valueIndex = postalCodeIndex * buildingTypeSize + btypeIdx;

                if (valueIndex < data.value.length) {
                    const price = data.value[valueIndex];
                    const buildingTypeKey = Object.keys(buildingTypes).find(
                        key => data.dimension.Talotyyppi.category.index[key] === btypeIdx
                    );

                    if (buildingTypeKey) {
                        const buildingTypeLabel = buildingTypes[buildingTypeKey];
                        // Use 'N/A' for missing/invalid data, otherwise convert valid numbers
                        buildingTypePrices[buildingTypeLabel] = (price === '.' || price === '...')
                            ? 'N/A'
                            : (isNaN(Number(price)) ? 'N/A' : Number(price));
                    }
                }
            }

            // Only include areas with some price data
            if (Object.values(buildingTypePrices).some(p => p !== 'N/A')) {
                pricesByPostalCode.push({
                    postalCode: postalCodeNumber,
                    district,
                    municipality,
                    fullLabel: postalCodeLabel,
                    prices: buildingTypePrices
                });
            }
        }

        // Sort results by postal code
        pricesByPostalCode.sort((a, b) => a.postalCode.localeCompare(b.postalCode));

        console.log(`Successfully processed ${pricesByPostalCode.length} postal code areas with StatFin data for ${year}.`);

        // Cache the successful result
        statFiCache.set(cacheKey, { value: pricesByPostalCode, timestamp: now });

        return pricesByPostalCode;

    } catch (error: any) {
        console.error(`Error fetching or processing StatFin data for year ${year}:`);
        if (axios.isAxiosError(error)) {
            console.error('Axios Error:', error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }
        } else {
            console.error('Unexpected Error:', error.message);
        }
        // Re-throw the error to be handled by the caller (e.g., the route handler)
        throw new Error(`Failed to fetch property data for year ${year}.`);
    }
}

/**
 * Clears the StatFi property data cache.
 */
export function clearStatFiCache() {
    statFiCache.clear();
    console.log('StatFi property data cache cleared.');
} 
