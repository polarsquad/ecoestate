import axios from 'axios';
import { getWalkingDistance } from '../../services/hsyWmsService';

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
            // Reset mocks before each test
            mockedAxios.get.mockClear();
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
            // Mock axios to throw an error
            const networkError = new Error('Connection error');
            mockedAxios.get.mockRejectedValue(networkError);

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBeNull();
            expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Should stop after the first error
        });

        it('should handle invalid or unexpected API response formats', async () => {
            // Mock axios to return invalid data (not a FeatureCollection)
            mockedAxios.get.mockResolvedValue({ data: { invalid: 'response' } });

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBeNull();
            expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Should try all zones
        });
    });
}); 
