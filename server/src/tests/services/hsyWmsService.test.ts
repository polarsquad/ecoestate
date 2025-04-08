import axios from 'axios';
import { getWalkingDistance } from '../../services/hsyWmsService'; // Service function (will be created)

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Sample coordinates (EPSG:3879) - Helsinki Central Railway Station (approx.)
const sampleCoords = { x: 25496600, y: 6672900 };

// Mock WMS responses
const mockGeoJsonFeature = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            id: 'test.1',
            geometry: null, // Geometry often not needed for simple check
            properties: { /* ... potential properties ... */ }
        }
    ]
};

const mockEmptyGeoJson = {
    type: 'FeatureCollection',
    features: []
};

describe('hsyWmsService', () => {
    describe('getWalkingDistance', () => {

        beforeEach(() => {
            // Reset mocks before each test
            mockedAxios.get.mockClear();
        });

        it("should return '5min' if point is within the 5min layer", async () => {
            // Mock: 5min layer returns feature, others return empty
            mockedAxios.get
                .mockResolvedValueOnce({ data: mockGeoJsonFeature }) // 5min layer
                .mockResolvedValue({ data: mockEmptyGeoJson }); // 10min, 15min layers

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBe('5min');
            expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Should stop after finding the first match
            expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('kavely_5min'));
        });

        it("should return '10min' if point is only within the 10min layer", async () => {
            // Mock: 5min empty, 10min feature, 15min irrelevant (stops after 10)
            mockedAxios.get
                .mockResolvedValueOnce({ data: mockEmptyGeoJson })   // 5min layer
                .mockResolvedValueOnce({ data: mockGeoJsonFeature }) // 10min layer
                .mockResolvedValue({ data: mockEmptyGeoJson });    // 15min layer (won't be called if logic is correct)

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBe('10min');
            expect(mockedAxios.get).toHaveBeenCalledTimes(2);
            expect(mockedAxios.get).toHaveBeenNthCalledWith(1, expect.stringContaining('kavely_5min'));
            expect(mockedAxios.get).toHaveBeenNthCalledWith(2, expect.stringContaining('kavely_10min'));
        });

        it("should return '15min' if point is only within the 15min layer", async () => {
            // Mock: 5min empty, 10min empty, 15min feature
            mockedAxios.get
                .mockResolvedValueOnce({ data: mockEmptyGeoJson })   // 5min layer
                .mockResolvedValueOnce({ data: mockEmptyGeoJson })   // 10min layer
                .mockResolvedValueOnce({ data: mockGeoJsonFeature }); // 15min layer

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBe('15min');
            expect(mockedAxios.get).toHaveBeenCalledTimes(3);
            expect(mockedAxios.get).toHaveBeenNthCalledWith(3, expect.stringContaining('kavely_15min'));
        });

        it('should return null if point is outside all layers', async () => {
            // Mock: All layers return empty
            mockedAxios.get.mockResolvedValue({ data: mockEmptyGeoJson });

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBeNull();
            expect(mockedAxios.get).toHaveBeenCalledTimes(3);
            expect(mockedAxios.get).toHaveBeenNthCalledWith(1, expect.stringContaining('kavely_5min'));
            expect(mockedAxios.get).toHaveBeenNthCalledWith(2, expect.stringContaining('kavely_10min'));
            expect(mockedAxios.get).toHaveBeenNthCalledWith(3, expect.stringContaining('kavely_15min'));
        });

        it('should handle API errors gracefully and return null', async () => {
            // Mock: API call fails
            const apiError = new Error('HSY WMS API error');
            mockedAxios.get.mockRejectedValue(apiError);

            // We expect the service function to catch the error and return null
            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBeNull();
            expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Should fail on the first layer check
        });

        // Optional: Add tests for invalid input coordinates if needed

    });
}); 
