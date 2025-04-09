import axios from 'axios';
import { fetchStatFiPropertyData, clearStatFiCache } from '../../services/statFiService';
import { PostalCodeData, JsonStatResponse, BuildingPrices, Dimension } from '../../types/statfi.types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Simplified Mock Response - We only need *some* valid structure for cache tests
const createMinimalMockStatFiResponse = (year: string = "2023"): JsonStatResponse => {
    return {
        dimension: {
            Postinumero: { label: "Postinumero", category: { label: { "00100": "00100 Helsinki" }, index: { "00100": 0 } } },
            Talotyyppi: { label: "Talotyyppi", category: { label: { "btype1": "Type 1" }, index: { "btype1": 0 } } },
            Vuosi: { label: "Vuosi", category: { label: { [year]: year }, index: { [year]: 0 } } },
            Tiedot: { label: "Tiedot", category: { label: { "price": "Price" }, index: { "price": 0 } } }
        },
        id: ["Vuosi", "Postinumero", "Talotyyppi", "Tiedot"],
        size: [1, 1, 1, 1],
        value: [1000] // Just need one value
    };
};

describe('statFiService', () => {
    describe('fetchStatFiPropertyData Caching', () => {

        beforeEach(() => {
            mockedAxios.post.mockClear();
            clearStatFiCache();
        });

        it('should cache the result after the first call for a specific year', async () => {
            const mockResponse = createMinimalMockStatFiResponse("2022");
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            // First call for 2022 - API should be called
            await fetchStatFiPropertyData("2022");
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);

            // Second call for 2022 - should use cache
            await fetchStatFiPropertyData("2022");
            expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Still 1 call
        });

        it('should cache results for different years separately', async () => {
            const mockResponse2022 = createMinimalMockStatFiResponse("2022");
            const mockResponse2023 = createMinimalMockStatFiResponse("2023");

            // Call for 2022
            mockedAxios.post.mockResolvedValueOnce({ data: mockResponse2022 });
            await fetchStatFiPropertyData("2022");
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);

            // Call for 2023 - should be a new API call
            mockedAxios.post.mockResolvedValueOnce({ data: mockResponse2023 });
            await fetchStatFiPropertyData("2023");
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);

            // Call for 2022 again - should use cache
            await fetchStatFiPropertyData("2022");
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        });

        it('should not cache API errors', async () => {
            // Suppress console.error for this specific test case
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            const apiError = new Error('API Failed');
            mockedAxios.post.mockRejectedValueOnce(apiError); // First call fails

            // First call - should get an error (re-thrown by the service)
            await expect(fetchStatFiPropertyData('2023')).rejects.toThrow('Failed to fetch property data for year 2023.');
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);

            // Restore console.error early if needed, or after the second call
            // consoleErrorSpy.mockRestore(); 

            // Mock a successful response for the second attempt
            const mockResponse = createMinimalMockStatFiResponse("2023");
            mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

            // Second call - should re-attempt the API call, not use a cached error
            const result2 = await fetchStatFiPropertyData('2023');
            expect(result2).toEqual(expect.any(Array));
            expect(result2.length).toBe(1); // Based on mock data
            expect(mockedAxios.post).toHaveBeenCalledTimes(2); // 1 for failed, 1 for success

            // Restore console.error if not done earlier
            consoleErrorSpy.mockRestore();
        });
    });

    // Keep original tests for basic functionality if they passed before
    // describe('fetchStatFiPropertyData Functionality', () => { ... });
}); 
