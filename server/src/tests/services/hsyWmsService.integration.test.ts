import axios from 'axios';
import { getWalkingDistance, clearWalkingDistanceCache } from '../../services/hsyWmsService';

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Sample coordinates (EPSG:3879) - Helsinki Central Railway Station (approx.)
const sampleCoords = { x: 25496600, y: 6672900 };

// Mock GeoJSON Feature Collection for a valid positive response
const mockFeatureCollectionWithFeatures = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: { /* Some properties */ },
            geometry: { /* Some geometry */ }
        }
    ]
};

// Mock empty GeoJSON Feature Collection (no features found)
const mockEmptyFeatureCollection = {
    type: 'FeatureCollection',
    features: []
};

describe('hsyWmsService Integration', () => {
    describe('getWalkingDistance', () => {

        beforeEach(() => {
            // Reset mocks and clear cache before each test
            mockedAxios.get.mockClear();
            clearWalkingDistanceCache(); // Ensure cache is clean for each test
        });

        it('should return "5min" when point is within a 5min walking zone', async () => {
            // Mock axios to return a successful response with features found
            mockedAxios.get.mockResolvedValueOnce({ data: mockFeatureCollectionWithFeatures }); // 5min zone

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBe('5min');
            expect(mockedAxios.get).toHaveBeenCalledTimes(1);
            expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('kavely_5min'));
        });

        it('should return "10min" when point is only within a 10min walking zone', async () => {
            // Mock axios to return no features for 5min, but features for 10min
            mockedAxios.get
                .mockResolvedValueOnce({ data: mockEmptyFeatureCollection })     // 5min zone (no feature)
                .mockResolvedValueOnce({ data: mockFeatureCollectionWithFeatures }); // 10min zone (found)

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBe('10min');
            expect(mockedAxios.get).toHaveBeenCalledTimes(2);
            expect(mockedAxios.get).toHaveBeenNthCalledWith(1, expect.stringContaining('kavely_5min'));
            expect(mockedAxios.get).toHaveBeenNthCalledWith(2, expect.stringContaining('kavely_10min'));
        });

        it('should return "15min" when point is only within a 15min walking zone', async () => {
            // Mock axios to return no features for 5min and 10min, but features for 15min
            mockedAxios.get
                .mockResolvedValueOnce({ data: mockEmptyFeatureCollection })     // 5min zone (no feature)
                .mockResolvedValueOnce({ data: mockEmptyFeatureCollection })     // 10min zone (no feature)
                .mockResolvedValueOnce({ data: mockFeatureCollectionWithFeatures }); // 15min zone (found)

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBe('15min');
            expect(mockedAxios.get).toHaveBeenCalledTimes(3);
            expect(mockedAxios.get).toHaveBeenNthCalledWith(3, expect.stringContaining('kavely_15min'));
        });

        it('should return null when point is outside all walking zones', async () => {
            // Mock axios to return no features for any zone
            mockedAxios.get.mockResolvedValue({ data: mockEmptyFeatureCollection });

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBeNull();
            expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Should check all 3 layers
        });

        it('should return null if there is an API error', async () => {
            const apiError = new Error('Network Error');
            mockedAxios.get.mockRejectedValueOnce(apiError);

            // Suppress console.error output during this test
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBeNull();
            expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Expect 3 calls as it tries all layers

            // Restore console.error
            consoleErrorSpy.mockRestore();
        });

        it('should handle invalid or unexpected API response formats', async () => {
            // Mock axios to return invalid data (not a FeatureCollection)
            mockedAxios.get.mockResolvedValue({ data: { invalid: 'response' } });

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBeNull();
            expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Should try all zones
        });

        // --- New Cache Testing --- 
        it('should cache the result after the first call', async () => {
            // Mock the 5min zone response
            mockedAxios.get.mockResolvedValueOnce({ data: mockFeatureCollectionWithFeatures });

            // First call - should hit the API
            const result1 = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result1).toBe('5min');
            expect(mockedAxios.get).toHaveBeenCalledTimes(1);

            // Second call - should use the cache, not call API again
            const result2 = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result2).toBe('5min');
            expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Still 1 call
        });

        it('should cache a null result (point outside zones)', async () => {
            // Mock response indicating outside all zones
            mockedAxios.get.mockResolvedValue({ data: mockEmptyFeatureCollection });

            // First call - should hit the API 3 times
            const result1 = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result1).toBeNull();
            expect(mockedAxios.get).toHaveBeenCalledTimes(3);

            // Second call - should use the cache
            const result2 = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result2).toBeNull();
            expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Still 3 calls
        });

        it('should not cache API errors', async () => {
            // First, clear cache to ensure clean state
            clearWalkingDistanceCache();

            // Create a proper error that axios would throw
            const apiError = new Error('Simulated API Failure');

            // Mock first attempt to fail for the first layer check
            mockedAxios.get.mockRejectedValueOnce(apiError);

            // Make subsequent calls for other layers fail too to ensure nothing gets cached
            mockedAxios.get.mockRejectedValue(apiError);

            // Suppress console.error
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            // First call - should encounter error and return null
            const result1 = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result1).toBeNull();

            // Reset mocks for the second attempt and prepare success responses
            mockedAxios.get.mockReset();

            // Clear cache again to make sure we have a clean state
            clearWalkingDistanceCache();

            // Mock a successful response for the second attempt's first check (5min zone)
            mockedAxios.get.mockImplementationOnce(() => {
                return Promise.resolve({
                    data: mockFeatureCollectionWithFeatures
                });
            });

            // Second call - should now succeed and hit API again (not cached)
            const result2 = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result2).toBe('5min');

            // Should have called the API again for the 5min layer
            expect(mockedAxios.get).toHaveBeenCalledTimes(1);
            expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('kavely_5min'));

            consoleErrorSpy.mockRestore();
        });
    });
}); 
