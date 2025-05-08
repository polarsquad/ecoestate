/// <reference types="jest" />
import axios from 'axios';
import { fetchStatFiPropertyData, clearStatFiCache } from '../../services/statFiService';
import { JsonStatResponse } from '../../types/statfi.types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Helper to create simplified mock response
function createMockResponse(year: string = "2023"): JsonStatResponse {
    return {
        dimension: {
            Postinumero: {
                label: "Postinumero",
                category: {
                    label: { "00100": "00100 Helsinki" },
                    index: { "00100": 0 }
                }
            },
            Talotyyppi: {
                label: "Talotyyppi",
                category: {
                    label: { "1": "Kerrostalo" },
                    index: { "1": 0 }
                }
            },
            Vuosi: {
                label: "Vuosi",
                category: {
                    label: { [year]: year },
                    index: { [year]: 0 }
                }
            },
            Tiedot: {
                label: "Tiedot",
                category: {
                    label: { "price": "Price" },
                    index: { "price": 0 }
                }
            }
        },
        id: ["Vuosi", "Postinumero", "Talotyyppi", "Tiedot"],
        size: [1, 1, 1, 1],
        value: [1000] // Just a sample value
    };
}

describe('statFiService', () => {
    beforeEach(() => {
        // Clear mocks and cache before each test
        jest.clearAllMocks();
        clearStatFiCache();
    });

    describe('fetchStatFiPropertyData', () => {
        it('should cache successful API responses', async () => {
            // Setup mock response
            const mockResponse = createMockResponse("2022");
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            // First call - should trigger API request
            await fetchStatFiPropertyData("2022");
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);

            // Reset the mock call counter
            mockedAxios.post.mockClear();

            // Second call with same year - should use cache (no API call)
            await fetchStatFiPropertyData("2022");
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it('should request different years separately', async () => {
            // Setup mock responses for different years
            const mockResponse2022 = createMockResponse("2022");
            const mockResponse2023 = createMockResponse("2023");

            mockedAxios.post.mockResolvedValueOnce({ data: mockResponse2022 });
            mockedAxios.post.mockResolvedValueOnce({ data: mockResponse2023 });

            // First call for 2022
            await fetchStatFiPropertyData("2022");
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);

            // Call for 2023 - should make a new API call
            await fetchStatFiPropertyData("2023");
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);

            // Reset mock
            mockedAxios.post.mockClear();

            // Call both years again - should use cache
            await fetchStatFiPropertyData("2022");
            await fetchStatFiPropertyData("2023");
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it('should not cache API errors', async () => {
            // Suppress console.error
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            // Setup mock to throw error on first call
            const apiError = new Error('API Failed');
            mockedAxios.post.mockRejectedValueOnce(apiError);

            // First call - should fail
            await expect(fetchStatFiPropertyData("2023")).rejects.toThrow();
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);

            // Setup mock to succeed on second call
            mockedAxios.post.mockResolvedValueOnce({ data: createMockResponse("2023") });

            // Second call - should make a new API call (not use cache)
            await fetchStatFiPropertyData("2023");
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);

            // Restore console.error
            consoleErrorSpy.mockRestore();
        });
    });
}); 
