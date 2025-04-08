import axios from 'axios';
import { fetchStatFiPropertyData } from '../../services/statFiService';
import { PostalCodeData, JsonStatResponse } from '../../types/statfi.types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Helper function to create a mock StatFi API response
const createMockApiResponse = (postalCodeData: { [key: string]: any } = {}, year: string = "2023"): JsonStatResponse => {
    const defaultPostalCodes = {
        "00100": 0,
        "00120": 1,
        "00130": 2 // Example: No price data
    };
    const postalCodeKeys = Object.keys(postalCodeData).length > 0 ? Object.keys(postalCodeData) : Object.keys(defaultPostalCodes);
    const postalCodeIndices = postalCodeKeys.reduce((acc, key, index) => {
        acc[key] = index;
        return acc;
    }, {} as { [key: string]: number });

    const defaultBuildingTypes = {
        "type1": 0, // Kerrostalo yksiöt
        "type2": 1, // Kerrostalo kaksiot
        "type3": 2  // Rivitalot yhteensä
    };
    const buildingTypeKeys = Object.keys(defaultBuildingTypes);

    // Example structure - adjust values based on test case
    const values: (number | string)[] = [];
    postalCodeKeys.forEach((pcKey, pcIndex) => {
        buildingTypeKeys.forEach((btKey, btIndex) => {
            const price = postalCodeData[pcKey]?.[btKey] ?? '.'; // Use provided or default missing
            values[pcIndex * buildingTypeKeys.length + btIndex] = price;
        });
    });

    return {
        id: ["Vuosi", "Postinumero", "Talotyyppi", "Tiedot"],
        size: [1, postalCodeKeys.length, buildingTypeKeys.length, 1],
        dimension: {
            Vuosi: {
                label: "Vuosi",
                category: { index: { [year]: 0 }, label: { [year]: year } }
            },
            Postinumero: {
                label: "Postinumero",
                category: {
                    index: postalCodeIndices,
                    label: postalCodeKeys.reduce((acc, key) => {
                        acc[key] = `${key} Test District (Test Municipality)`; // Simplified label
                        return acc;
                    }, {} as { [key: string]: string })
                }
            },
            Talotyyppi: {
                label: "Talotyyppi",
                category: {
                    index: defaultBuildingTypes,
                    label: {
                        "type1": "Kerrostalo yksiöt",
                        "type2": "Kerrostalo kaksiot",
                        "type3": "Rivitalot yhteensä"
                    }
                }
            },
            Tiedot: {
                label: "Tiedot",
                category: {
                    index: { "keskihinta_aritm_nw": 0 },
                    label: { "keskihinta_aritm_nw": "Keskihinta (€/m²)" }
                }
            }
        },
        value: values
    };
};

describe('statFiService', () => {
    describe('fetchStatFiPropertyData', () => {

        beforeEach(() => {
            mockedAxios.post.mockClear();
        });

        it('should fetch and process property data correctly for a given year', async () => {
            const mockYear = "2022";
            const mockData = {
                "00100": { "type1": 3000, "type2": 2500 },
                "00120": { "type2": 2600, "type3": 2000 },
                "00130": {} // No valid prices
            };
            const mockResponse = createMockApiResponse(mockData, mockYear);
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            const expectedPayload = {
                query: [
                    { code: "Vuosi", selection: { filter: "item", values: [mockYear] } },
                    { code: "Tiedot", selection: { filter: "item", values: ["keskihinta_aritm_nw"] } }
                ],
                response: { format: 'json-stat2' }
            };
            const expectedUrl = expect.stringContaining('statfin_ashi_pxt_13mu.px');
            const expectedHeaders = { headers: { 'Content-Type': 'application/json' } };

            const result = await fetchStatFiPropertyData(mockYear);

            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(expectedUrl, expectedPayload, expectedHeaders);

            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBe(2); // 00130 should be filtered out

            // Check sorting
            expect(result[0].postalCode).toBe("00100");
            expect(result[1].postalCode).toBe("00120");

            // Check data structure and parsing for the first result
            const firstResult = result[0];
            expect(firstResult.postalCode).toBe("00100");
            expect(firstResult.district).toBe("Test District");
            expect(firstResult.municipality).toBe("Test Municipality");
            expect(firstResult.prices).toEqual({
                "Kerrostalo yksiöt": 3000,
                "Kerrostalo kaksiot": 2500,
                "Rivitalot yhteensä": "N/A" // Should be N/A if missing
            });

            // Check the second result
            const secondResult = result[1];
            expect(secondResult.postalCode).toBe("00120");
            expect(secondResult.prices).toEqual({
                "Kerrostalo yksiöt": "N/A",
                "Kerrostalo kaksiot": 2600,
                "Rivitalot yhteensä": 2000
            });
        });

        it('should use the default year (2023) if no year is provided', async () => {
            const defaultYear = "2023";
            const mockResponse = createMockApiResponse({}, defaultYear);
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            const expectedPayload = {
                query: [
                    { code: "Vuosi", selection: { filter: "item", values: [defaultYear] } },
                    { code: "Tiedot", selection: { filter: "item", values: ["keskihinta_aritm_nw"] } }
                ],
                response: { format: 'json-stat2' }
            };
            const expectedUrl = expect.stringContaining('statfin_ashi_pxt_13mu.px');
            const expectedHeaders = { headers: { 'Content-Type': 'application/json' } };

            await fetchStatFiPropertyData(); // No year argument

            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(expectedUrl, expectedPayload, expectedHeaders);
        });

        it('should handle API errors gracefully', async () => {
            const errorMessage = "Network Error";
            mockedAxios.post.mockRejectedValue(new Error(errorMessage));

            await expect(fetchStatFiPropertyData("2023")).rejects.toThrow(
                `Failed to fetch property data for year 2023.`
            );
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        it('should throw an error for invalid API response structure', async () => {
            const invalidResponse = { message: "This is not the expected structure" };
            mockedAxios.post.mockResolvedValue({ data: invalidResponse });

            await expect(fetchStatFiPropertyData("2023")).rejects.toThrow(
                `Failed to fetch property data for year 2023.`
            );
        });

        it('should correctly handle missing prices (\'.\' or \'...\') as N/A', async () => {
            const mockData = {
                "00100": { "type1": 1000, "type2": ".", "type3": "..." }
            };
            const mockResponse = createMockApiResponse(mockData);
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            const result = await fetchStatFiPropertyData();
            expect(result.length).toBe(1);
            expect(result[0].prices).toEqual({
                "Kerrostalo yksiöt": 1000,
                "Kerrostalo kaksiot": "N/A",
                "Rivitalot yhteensä": "N/A"
            });
        });

        it('should correctly parse district and municipality from labels', async () => {
            const mockPostalCodeLabels = {
                "00100": "00100 Eira (Helsinki)",
                "00150": "00150 Ullanlinna / Eira (Helsinki)", // With slash
                "00200": "00200 Lauttasaari (Helsinki)" // Standard
            };
            const mockResponse = createMockApiResponse({}, "2023");
            // Override the generated labels with specific test cases
            mockResponse.dimension.Postinumero.category.label = mockPostalCodeLabels;
            mockResponse.dimension.Postinumero.category.index = { "00100": 0, "00150": 1, "00200": 2 };
            mockResponse.value = [1000, '.', '.', 2000, '.', '.', 3000, '.', '.']; // Ensure some data exists
            mockResponse.size = [1, 3, 3, 1]; // Update size

            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            const result = await fetchStatFiPropertyData();
            expect(result.length).toBe(3);

            expect(result.find(p => p.postalCode === "00100")?.district).toBe("Eira");
            expect(result.find(p => p.postalCode === "00100")?.municipality).toBe("Helsinki");

            // Handle names with slashes - currently takes the first part
            expect(result.find(p => p.postalCode === "00150")?.district).toBe("Ullanlinna / Eira");
            expect(result.find(p => p.postalCode === "00150")?.municipality).toBe("Helsinki");

            expect(result.find(p => p.postalCode === "00200")?.district).toBe("Lauttasaari");
            expect(result.find(p => p.postalCode === "00200")?.municipality).toBe("Helsinki");
        });

        it('should filter out postal codes with no valid numeric prices', async () => {
            const mockData = {
                "00100": { "type1": ".", "type2": "...", "type3": "N/A" }, // All non-numeric
                "00120": { "type1": 2000, "type2": "." } // Contains one numeric
            };
            const mockResponse = createMockApiResponse(mockData);
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            const result = await fetchStatFiPropertyData();
            expect(result.length).toBe(1);
            expect(result[0].postalCode).toBe("00120");
        });

    });
}); 
