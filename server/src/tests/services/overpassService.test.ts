import axios from 'axios';
import { fetchGreenSpaces } from '../../services/overpassService';
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

describe('overpassService', () => {
    describe('fetchGreenSpaces', () => {
        const testLat = 60.1;
        const testLon = 24.9;
        const testRadius = 500;

        beforeEach(() => {
            mockedAxios.post.mockClear();
        });

        it('should fetch green spaces successfully and return elements', async () => {
            const mockElements: OverpassElement[] = [
                { type: "node", id: 1, lat: 60.101, lon: 24.901, tags: { leisure: 'park', name: 'Park A' } },
                {
                    type: "way",
                    id: 2,
                    tags: { landuse: 'forest' },
                    bounds: { minlat: 60.0, minlon: 24.8, maxlat: 60.2, maxlon: 25.0 },
                    geometry: [
                        { type: "Point", coordinates: [24.9, 60.1] }
                    ]
                }
            ];
            const mockResponse = createMockOverpassResponse(mockElements);
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            const result = await fetchGreenSpaces(testLat, testLon, testRadius);

            expect(mockedAxios.post).toHaveBeenCalledTimes(1);

            // Get the actual arguments passed to axios.post
            const actualUrl = mockedAxios.post.mock.calls[0][0];
            const actualDataString = mockedAxios.post.mock.calls[0][1] as string; // Explicitly cast to string
            const actualHeaders = mockedAxios.post.mock.calls[0][2];

            // Verify URL and headers
            expect(actualUrl).toBe('https://overpass-api.de/api/interpreter');
            expect(actualHeaders).toEqual({ headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' } });

            // Decode the actual data string and check its content
            const decodedData = querystring.parse(actualDataString);
            if (typeof decodedData.data !== 'string') {
                throw new Error('Parsed query data is not a string');
            }
            const actualQuery = decodedData.data;

            expect(actualQuery).toContain(`around:${testRadius},${testLat},${testLon}`);
            expect(actualQuery).toContain('nwr["leisure"="park"]');
            expect(actualQuery).toContain('nwr["landuse"="forest"]');
            expect(actualQuery).toContain('out geom;');

            expect(result).toEqual(mockElements);
            expect(result.length).toBe(2);
        });

        it('should return an empty array if API response has no elements', async () => {
            const mockResponse = createMockOverpassResponse([]); // Empty elements
            mockedAxios.post.mockResolvedValue({ data: mockResponse });

            const result = await fetchGreenSpaces(testLat, testLon, testRadius);

            expect(result).toEqual([]);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        it('should return an empty array if API response format is unexpected (missing elements)', async () => {
            const unexpectedResponse = { version: 0.6, /* missing elements */ };
            mockedAxios.post.mockResolvedValue({ data: unexpectedResponse });

            const result = await fetchGreenSpaces(testLat, testLon, testRadius);

            expect(result).toEqual([]);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        it('should handle Overpass API errors gracefully and throw a specific error', async () => {
            const apiErrorMessage = 'Overpass API error: Query timeout';
            const mockApiError = { response: { status: 504, statusText: 'Gateway Timeout', data: apiErrorMessage } };
            mockedAxios.post.mockRejectedValue(Object.assign(new Error('Axios error'), mockApiError, { isAxiosError: true }));

            await expect(fetchGreenSpaces(testLat, testLon, testRadius)).rejects.toThrow(
                `Failed to fetch green space data from Overpass API for coordinates (${testLat}, ${testLon}).`
            );
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        it('should handle network or other non-API errors', async () => {
            const networkError = new Error('Network connection failed');
            mockedAxios.post.mockRejectedValue(networkError);

            await expect(fetchGreenSpaces(testLat, testLon, testRadius)).rejects.toThrow(
                `Failed to fetch green space data from Overpass API for coordinates (${testLat}, ${testLon}).`
            );
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });
    });
}); 
