import axios from 'axios';
import {
    JsonStatResponse,
    PostalCodeData,
    BuildingPrices,
    PriceTrend
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

interface ParsedPostalCode {
    district: string;
    municipality: string;
}

function parsePostalCodeLabel(postalCodeLabel: string): ParsedPostalCode {
    // eslint-disable-next-line sonarjs/slow-regex
    const districtMatch = postalCodeLabel.match(/^(\d+)\s+([^()]+?)\s*\(([^()]+?)\)$/);
    let district = 'N/A', municipality = 'N/A';
    if (districtMatch && districtMatch.length >= 3) { // Should be >= 4 due to 3 capture groups + full match
        district = districtMatch[2].trim();
        municipality = districtMatch[3].trim();
    }
    return { district, municipality };
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function processBuildingTypePrices(
    data: JsonStatResponse,
    postalCodeIndex: number,
    buildingTypeSize: number,
    buildingTypes: Record<string, string>
): BuildingPrices {
    const buildingTypePrices: BuildingPrices = {};
    for (let btypeIdx = 0; btypeIdx < buildingTypeSize; btypeIdx++) {
        const valueIndex = postalCodeIndex * buildingTypeSize + btypeIdx;

        if (valueIndex < data.value.length) {
            // eslint-disable-next-line security/detect-object-injection
            const price = data.value[valueIndex];
            const buildingTypeKey = Object.keys(buildingTypes).find(
                // eslint-disable-next-line security/detect-object-injection
                key => data.dimension.Talotyyppi.category.index[key] === btypeIdx
            );

            if (buildingTypeKey) {
                // eslint-disable-next-line security/detect-object-injection
                const buildingTypeLabel = buildingTypes[buildingTypeKey];
                let finalPrice: number | 'N/A';
                if (price === '.' || price === '...') {
                    finalPrice = 'N/A';
                } else {
                    const numPrice = Number(price);
                    if (isNaN(numPrice)) {
                        finalPrice = 'N/A';
                    } else {
                        finalPrice = numPrice;
                    }
                }
                if (Object.prototype.hasOwnProperty.call(buildingTypes, buildingTypeKey) &&
                    typeof buildingTypeLabel === 'string' &&
                    buildingTypeLabel !== '__proto__' &&
                    buildingTypeLabel !== 'constructor' &&
                    buildingTypeLabel !== 'prototype') {
                    // eslint-disable-next-line security/detect-object-injection
                    buildingTypePrices[buildingTypeLabel] = finalPrice;
                }
            }
        }
    }
    return buildingTypePrices;
}

function transformStatFiData(
    data: JsonStatResponse,
    postalCodes: Record<string, string>,
    postalCodeIndexes: Record<string, number>,
    buildingTypes: Record<string, string>,
    buildingTypeSize: number
): PostalCodeData[] {
    const pricesByPostalCode: PostalCodeData[] = [];

    for (const postalCodeKey in postalCodeIndexes) {
        // eslint-disable-next-line security/detect-object-injection
        const postalCodeLabel = postalCodes[postalCodeKey];
        // eslint-disable-next-line security/detect-object-injection
        const postalCodeIndex = postalCodeIndexes[postalCodeKey];
        const postalCodeNumber = postalCodeKey.trim();

        const { district, municipality } = parsePostalCodeLabel(postalCodeLabel);

        const buildingTypePrices = processBuildingTypePrices(
            data,
            postalCodeIndex,
            buildingTypeSize,
            buildingTypes
        );

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
    pricesByPostalCode.sort((a, b) => a.postalCode.localeCompare(b.postalCode));
    return pricesByPostalCode;
}

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

        const buildingTypeSize = data.size[data.id.indexOf('Talotyyppi')]; // Get size dynamically

        // Process each postal code
        const pricesByPostalCode = transformStatFiData(
            data,
            postalCodes,
            postalCodeIndexes,
            buildingTypes,
            buildingTypeSize
        );

        console.log(`Successfully processed ${pricesByPostalCode.length} postal code areas with StatFin data for ${year}.`);

        // Cache the successful result
        statFiCache.set(cacheKey, pricesByPostalCode);

        return pricesByPostalCode;

    } catch (error) {
        console.error(`Error fetching or processing StatFin data for year ${year}:`);
        let errorMessage = `Failed to fetch property data for year ${year}.`;
        if (axios.isAxiosError(error)) {
            // Keep logging Axios-specific details if available
            console.error('Axios Error:', error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }
            errorMessage = `StatFin API request failed: ${error.message}`; // More specific message
        } else if (error instanceof Error) {
            console.error('Unexpected Error:', error.message);
            errorMessage = error.message; // Use the specific error message
        } else {
            console.error('Unknown error structure:', error);
        }
        // Re-throw a new error with a potentially more specific message
        throw new Error(errorMessage);
    }
}

/**
 * Clears the StatFi property data cache.
 */
export function clearStatFiCache() {
    statFiCache.clear();
    // Log message handled by SimpleCache
}

// --------- Price Trend Calculation ---------

/**
 * Helper function to safely get a numeric price for a specific building type.
 */
const getNumericPrice = (data: PostalCodeData, buildingType: string): number | null => {
    if (!Object.prototype.hasOwnProperty.call(data.prices, buildingType)) {
        return null; // Or handle as an error/warning
    }
    // eslint-disable-next-line security/detect-object-injection
    const price = data.prices[buildingType];
    if (price !== 'N/A' && !isNaN(Number(price)) && Number(price) > 0) {
        return Number(price);
    }
    return null;
};

/**
 * Calculates aggregate trend metrics for a single postal code across years.
 */
const calculateAggregateMetrics = (
    yearlyDataForPostalCode: (PostalCodeData | undefined)[]
): PriceTrend['trends'] => {
    const trends: PriceTrend['trends'] = {};
    const buildingTypes = ["Kerrostalo yksiöt", "Kerrostalo kaksiot", "Kerrostalo kolmiot+", "Rivitalot yhteensä"];
    const periodLength = yearlyDataForPostalCode.length;
    if (periodLength < 2) return trends; // Need at least 2 years for a trend

    buildingTypes.forEach(type => {
        const startData = yearlyDataForPostalCode[0];
        const endData = yearlyDataForPostalCode[periodLength - 1];

        const startPrice = startData ? getNumericPrice(startData, type) : null;
        const endPrice = endData ? getNumericPrice(endData, type) : null;

        if (startPrice !== null && endPrice !== null && startPrice > 0) {
            const percentChange = ((endPrice - startPrice) / startPrice) * 100;

            let direction: 'up' | 'down' | 'stable';
            if (percentChange > 1) {
                direction = 'up';
            } else if (percentChange < -1) {
                direction = 'down';
            } else {
                direction = 'stable';
            }

            const averageYearlyChange = (endPrice - startPrice) / (periodLength - 1);

            // eslint-disable-next-line security/detect-object-injection
            trends[type] = {
                percentChange,
                direction,
                startPrice,
                endPrice,
                averageYearlyChange,
            };
        } else {
            // eslint-disable-next-line security/detect-object-injection
            trends[type] = null; // Not enough data for this type
        }
    });

    return trends;
};

/**
 * Calculates price trends over a period for all postal codes.
 */
export function calculatePriceTrends(
    yearlyData: PostalCodeData[][],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _startYear: number, // Prefixed with underscore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _endYear: number    // Prefixed with underscore
): PriceTrend[] {
    const trendsByPostalCode: { [postalCode: string]: (PostalCodeData | undefined)[] } = {};
    const allPostalCodes = new Set<string>();

    // Organize data by postal code
    yearlyData.forEach(yearDataSet => {
        yearDataSet.forEach(postalData => {
            const pc = postalData.postalCode;
            if (typeof pc === 'string' && pc !== '__proto__' && pc !== 'constructor' && pc !== 'prototype') {
                allPostalCodes.add(pc);
                // eslint-disable-next-line security/detect-object-injection
                if (!trendsByPostalCode[pc]) {
                    // eslint-disable-next-line security/detect-object-injection,@typescript-eslint/no-unsafe-assignment
                    trendsByPostalCode[pc] = new Array(yearlyData.length).fill(undefined);
                }
            }
        });
    });

    // Fill the trendsByPostalCode structure
    yearlyData.forEach((yearDataSet, yearIndex) => {
        yearDataSet.forEach(pData => {
            const postalData = pData;
            const pc = postalData.postalCode;
            // eslint-disable-next-line security/detect-object-injection
            if (typeof pc === 'string' && pc !== '__proto__' && pc !== 'constructor' && pc !== 'prototype' && trendsByPostalCode[pc]) {
                // eslint-disable-next-line security/detect-object-injection
                const targetArray = trendsByPostalCode[pc];
                if (targetArray) {
                    // eslint-disable-next-line security/detect-object-injection
                    targetArray[yearIndex] = postalData;
                }
            }
        });
    });

    // Calculate trends for each postal code
    const finalTrends: PriceTrend[] = [];
    allPostalCodes.forEach(pc => {
        // pc is already validated from when it was added to allPostalCodes
        // eslint-disable-next-line security/detect-object-injection
        const postalCodeYearlyData = trendsByPostalCode[pc];
        const trends = calculateAggregateMetrics(postalCodeYearlyData);

        // Find the first valid entry to get district/municipality/label
        const representativeData = postalCodeYearlyData.find(d => d !== undefined);

        if (representativeData && Object.values(trends).some(t => t !== null)) {
            finalTrends.push({
                postalCode: pc,
                district: representativeData.district,
                municipality: representativeData.municipality,
                fullLabel: representativeData.fullLabel,
                trends: trends
            });
        }
    });

    return finalTrends;
}
