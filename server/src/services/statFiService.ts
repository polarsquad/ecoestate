import axios from 'axios';
import {
    JsonStatResponse,
    PostalCodeData,
    BuildingPrices,
    PriceTrendData
} from '../types/statfi.types'; // Import types
import { SimpleCache } from '../utils/cache'; // Import the generic cache

// Define the specific type for this cache's values
type StatFiValue = PostalCodeData[];

// Cache configuration
const STATFI_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const statFiCache = new SimpleCache<StatFiValue>('StatFi Property Prices', STATFI_CACHE_TTL);

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

    // Check cache first
    const cachedValue = statFiCache.get(cacheKey);
    if (cachedValue !== undefined) {
        return cachedValue;
    }

    console.log(`Cache miss for key "${cacheKey}" in [StatFi Property Prices]. Fetching from StatFin API...`);

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
        statFiCache.set(cacheKey, pricesByPostalCode);

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
    // Log message handled by SimpleCache
}

/**
 * Calculates price trends based on yearly data.
 * @param yearlyData An array of PostalCodeData arrays, one for each year in the period.
 * @param startYear The first year of the period.
 * @param endYear The last year of the period.
 * @returns An array of objects containing postal code info and calculated trends.
 */
export function calculatePriceTrends(yearlyData: PostalCodeData[][], startYear: number, endYear: number): PriceTrendData[] {
    const postalCodeMap = new Map<string, PriceTrendData>();

    // First, gather all postal codes across all years and initialize map entries
    for (const yearData of yearlyData) {
        for (const item of yearData) {
            if (!postalCodeMap.has(item.postalCode)) {
                postalCodeMap.set(item.postalCode, {
                    postalCode: item.postalCode,
                    district: item.district,
                    municipality: item.municipality,
                    fullLabel: item.fullLabel,
                    trends: {}
                });
            }
        }
    }

    // Building types to analyze
    const buildingTypes = [
        "Kerrostalo yksiöt",
        "Kerrostalo kaksiot",
        "Kerrostalo kolmiot+",
        "Rivitalot yhteensä"
    ];

    // For each postal code, calculate trend for each building type
    postalCodeMap.forEach((postalCodeTrendData) => {
        for (const buildingType of buildingTypes) {
            const yearlyPrices: (number | null)[] = [];

            // Extract prices for this building type across the years
            for (let i = 0; i < yearlyData.length; i++) {
                const yearData = yearlyData[i];
                const postalCodeYearData = yearData.find(item => item.postalCode === postalCodeTrendData.postalCode);
                const price = postalCodeYearData?.prices[buildingType];

                if (price && price !== 'N/A' && !isNaN(Number(price))) {
                    yearlyPrices.push(Number(price));
                } else {
                    yearlyPrices.push(null);
                }
            }

            // Calculate trend if we have at least two valid prices
            const validPrices = yearlyPrices.filter(p => p !== null) as number[];
            const firstValidPriceIndex = yearlyPrices.findIndex(p => p !== null);

            // Replace findLastIndex with a loop for broader compatibility
            let lastValidPriceIndex = -1;
            for (let i = yearlyPrices.length - 1; i >= 0; i--) {
                if (yearlyPrices[i] !== null) {
                    lastValidPriceIndex = i;
                    break;
                }
            }

            if (validPrices.length >= 2 && lastValidPriceIndex > firstValidPriceIndex) {
                const startPrice = yearlyPrices[firstValidPriceIndex];
                const endPrice = yearlyPrices[lastValidPriceIndex];
                const duration = Math.max(1, lastValidPriceIndex - firstValidPriceIndex); // Years between first/last data points

                // Ensure start and end prices are valid and startPrice is not zero
                if (startPrice !== null && startPrice !== 0 && endPrice !== null) {
                    const percentChange = ((endPrice - startPrice) / startPrice) * 100;
                    const direction = percentChange > 1 ? 'up' : percentChange < -1 ? 'down' : 'stable';
                    const yearlyChange = percentChange / duration;

                    postalCodeTrendData.trends[buildingType] = {
                        percentChange: parseFloat(percentChange.toFixed(2)),
                        direction,
                        startPrice,
                        endPrice,
                        averageYearlyChange: parseFloat(yearlyChange.toFixed(2))
                    };
                } else {
                    postalCodeTrendData.trends[buildingType] = null; // Handle cases with insufficient spread or zero start price
                }
            } else {
                postalCodeTrendData.trends[buildingType] = null; // Not enough data points
            }
        }
    });

    // Convert map to array for response
    return Array.from(postalCodeMap.values());
} 
