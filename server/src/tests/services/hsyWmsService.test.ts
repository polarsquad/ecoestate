import axios from 'axios';
import { getWalkingDistance, clearWalkingDistanceCache } from '../../services/hsyWmsService'; // Import clear cache function

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Sample coordinates (EPSG:3879)
const sampleCoords = { x: 25496600, y: 6672900 };

// Mock WMS responses (original mock structures)
const mockGeoJsonFeature = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            id: 'test.1',
            geometry: null,
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
            // Clear the service's internal cache before each test
            clearWalkingDistanceCache();
        });

        it("should return '5min' if point is within the 5min layer", async () => {
            mockedAxios.get
                .mockResolvedValueOnce({ data: mockGeoJsonFeature }) // 5min layer
                .mockResolvedValue({ data: mockEmptyGeoJson });

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBe('5min');
            expect(mockedAxios.get).toHaveBeenCalledTimes(1);
            expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('kavely_5min'));
        });

        it("should return '10min' if point is only within the 10min layer", async () => {
            mockedAxios.get
                .mockResolvedValueOnce({ data: mockEmptyGeoJson })   // 5min layer
                .mockResolvedValueOnce({ data: mockGeoJsonFeature }) // 10min layer
                .mockResolvedValue({ data: mockEmptyGeoJson });

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBe('10min');
            expect(mockedAxios.get).toHaveBeenCalledTimes(2);
            expect(mockedAxios.get).toHaveBeenNthCalledWith(1, expect.stringContaining('kavely_5min'));
            expect(mockedAxios.get).toHaveBeenNthCalledWith(2, expect.stringContaining('kavely_10min'));
        });

        it("should return '15min' if point is only within the 15min layer", async () => {
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
            mockedAxios.get.mockResolvedValue({ data: mockEmptyGeoJson });

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBeNull();
            expect(mockedAxios.get).toHaveBeenCalledTimes(3);
            expect(mockedAxios.get).toHaveBeenNthCalledWith(1, expect.stringContaining('kavely_5min'));
            expect(mockedAxios.get).toHaveBeenNthCalledWith(2, expect.stringContaining('kavely_10min'));
            expect(mockedAxios.get).toHaveBeenNthCalledWith(3, expect.stringContaining('kavely_15min'));
        });

        it('should handle API errors gracefully and return null', async () => {
            const apiError = new Error('Network failure');
            mockedAxios.get.mockRejectedValueOnce(apiError);

            // Suppress console.error output during this test
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            const result = await getWalkingDistance(sampleCoords.x, sampleCoords.y);
            expect(result).toBeNull();
            expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Expect 3 calls as it tries all layers

            // Restore console.error
            consoleErrorSpy.mockRestore();
        });
    });
}); 
