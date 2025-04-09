import axios from 'axios';
import { fetchGreenSpaces, clearOverpassCache } from '../../services/overpassService';
import { OverpassResponse, OverpassElement } from '../../types/overpass.types';
import querystring from 'querystring';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Helper to create a mock Overpass API response
const createMockOverpassResponse = (elements: OverpassElement[] = []): OverpassResponse => {
    return {
        version: 0.6,
        generator: "test-overpass-api",
        osm3s: {
            timestamp_osm_base: "2023-01-01T00:00:00Z",
            copyright: "test copyright"
        },
        elements: elements
    };
};

// Sample coordinates and radius for testing
const sampleLat = 60.1;
const sampleLon = 24.9;
const sampleRadius = 500;

// Sample Overpass elements
const mockElement1: OverpassElement = { type: 'node', id: 1, lat: 60.101, lon: 24.901, tags: { leisure: 'park' } };
const mockElement2: OverpassElement = { type: 'way', id: 2, tags: { landuse: 'forest' }, nodes: [10, 11] };

describe('overpassService', () => {
    describe('fetchGreenSpaces', () => {
        beforeEach(() => {
            mockedAxios.post.mockClear();
            clearOverpassCache();
        });

        it('should fetch green spaces successfully and return elements', async () => {
            const mockResponse = createMockOverpassResponse([mockElement1, mockElement2]);
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            const result = await fetchGreenSpaces(sampleLat, sampleLon, sampleRadius);

            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post.mock.calls[0][1]).toContain('\"leisure\"=\"park\"');
            expect(result).toEqual([mockElement1, mockElement2]);
            expect(result.length).toBe(2);
        });

        it('should return an empty array if API response has no elements', async () => {
            const mockResponse = createMockOverpassResponse([]); // Empty elements
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            const result = await fetchGreenSpaces(sampleLat, sampleLon, sampleRadius);
            expect(result).toEqual([]);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        it('should return an empty array if API response format is unexpected (missing elements)', async () => {
            const badResponse = { version: 0.6 /* missing elements */ };
            mockedAxios.post.mockResolvedValue({ data: badResponse });

            const result = await fetchGreenSpaces(sampleLat, sampleLon, sampleRadius);
            expect(result).toEqual([]);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        it('should handle Overpass API errors gracefully and return empty array', async () => {
            // Suppress console.error for this specific test case
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            const apiError = new Error('Overpass API error');
            mockedAxios.post.mockRejectedValue(apiError);

            const result = await fetchGreenSpaces(sampleLat, sampleLon, sampleRadius);
            expect(result).toEqual([]);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);

            // Restore console.error
            consoleErrorSpy.mockRestore();
        });

        it('should handle network or other non-API errors and return empty array', async () => {
            // Suppress console.error for this specific test case
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            const networkError = new Error('Network connection failed');
            mockedAxios.post.mockRejectedValue(networkError);

            const result = await fetchGreenSpaces(sampleLat, sampleLon, sampleRadius);
            expect(result).toEqual([]);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);

            // Restore console.error
            consoleErrorSpy.mockRestore();
        });

        // --- New Cache Testing --- 
        it('should cache the result after the first call', async () => {
            const mockResponse = createMockOverpassResponse([mockElement1]);
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            // First call - should hit API
            const result1 = await fetchGreenSpaces(sampleLat, sampleLon, sampleRadius);
            expect(result1).toEqual([mockElement1]);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);

            // Second call - should use cache
            const result2 = await fetchGreenSpaces(sampleLat, sampleLon, sampleRadius);
            expect(result2).toEqual([mockElement1]);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Still 1 call
        });

        it('should cache an empty result', async () => {
            const mockResponse = createMockOverpassResponse([]); // Empty result
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            // First call - API hit
            const result1 = await fetchGreenSpaces(sampleLat, sampleLon, sampleRadius);
            expect(result1).toEqual([]);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);

            // Second call - Cache hit
            const result2 = await fetchGreenSpaces(sampleLat, sampleLon, sampleRadius);
            expect(result2).toEqual([]);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Still 1 call
        });

        it('should not cache API errors', async () => {
            const apiError = new Error('API Failure');
            mockedAxios.post.mockRejectedValueOnce(apiError); // First call fails

            // First call - should get empty array due to error handling
            const result1 = await fetchGreenSpaces(sampleLat, sampleLon, sampleRadius);
            expect(result1).toEqual([]);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);

            // Mock a successful response for the second attempt
            const mockResponse = createMockOverpassResponse([mockElement2]);
            mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

            // Second call - should re-attempt the API call
            const result2 = await fetchGreenSpaces(sampleLat, sampleLon, sampleRadius);
            expect(result2).toEqual([mockElement2]);
            expect(mockedAxios.post).toHaveBeenCalledTimes(2); // 1 for failed, 1 for success
        });
    });
}); 
