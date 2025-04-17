import axios from 'axios';
import { fetchGreenSpaces, clearOverpassCache } from '../../services/overpassService';
import { FeatureCollection, Feature } from 'geojson';
import querystring from 'querystring';
import osmtogeojson from 'osmtogeojson';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock osmtogeojson module
jest.mock('osmtogeojson');

// Helper to create a mock Overpass API response structure (needed by the mocked osmtogeojson)
const createMockOverpassApiResponse = (elements: any[] = []): any => {
    return {
        version: 0.6,
        generator: "test-overpass-api",
        osm3s: { timestamp_osm_base: "2023-01-01T00:00:00Z", copyright: "test copyright" },
        elements: elements
    };
};

// Sample Overpass elements (used to construct mock API response)
const mockElement1Data = { type: 'node', id: 1, lat: 60.101, lon: 24.901, tags: { leisure: 'park', name: 'Park 1' } };
const mockElement2Data = { type: 'way', id: 2, tags: { landuse: 'forest' }, nodes: [10, 11] };

// Corresponding expected GeoJSON features (based on the simplified mock osmtogeojson)
const mockFeature1: Feature = { type: 'Feature', properties: { leisure: 'park', name: 'Park 1' }, geometry: { type: 'Point', coordinates: [24.901, 60.101] } };
const mockFeature2: Feature = { type: 'Feature', properties: { landuse: 'forest' }, geometry: { type: 'Point', coordinates: [0, 0] } }; // Mock geometry

describe('overpassService', () => {
    // Define the mock implementation here so it can be cleared easily
    const mockOsmtogeojsonImplementation = jest.fn(data => {
        const features: Feature[] = (data.elements || []).map((el: any) => ({
            type: 'Feature',
            properties: el.tags || {},
            geometry: { type: 'Point', coordinates: [el.lon || 0, el.lat || 0] }
        }));
        return { type: 'FeatureCollection', features };
    });

    beforeAll(() => {
        // Assign the mock implementation to the mocked default export
        (osmtogeojson as jest.Mock).mockImplementation(mockOsmtogeojsonImplementation);
    });

    describe('fetchGreenSpaces', () => {
        beforeEach(() => {
            mockedAxios.post.mockClear();
            mockOsmtogeojsonImplementation.mockClear(); // Clear the specific mock function
            clearOverpassCache();
        });

        it('should fetch green spaces, convert to GeoJSON, and return FeatureCollection', async () => {
            const mockApiResponse = createMockOverpassApiResponse([mockElement1Data, mockElement2Data]);
            mockedAxios.post.mockResolvedValue({ data: mockApiResponse });

            const result = await fetchGreenSpaces();

            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post.mock.calls[0][1]).toContain('bbox:59.9,24.4,60.5,25.4');
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledWith(mockApiResponse); // Check the specific mock
            expect(result.type).toBe('FeatureCollection');
            expect(result.features.length).toBe(2);
            expect(result.features).toEqual(expect.arrayContaining([mockFeature1, mockFeature2]));
        });

        it('should return an empty FeatureCollection if API response has no elements', async () => {
            const mockApiResponse = createMockOverpassApiResponse([]);
            mockedAxios.post.mockResolvedValue({ data: mockApiResponse });

            const result = await fetchGreenSpaces();
            expect(result).toEqual({ type: 'FeatureCollection', features: [] });
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledWith(mockApiResponse); // Check the specific mock
        });

        it('should return an empty FeatureCollection if API response format is unexpected (missing elements)', async () => {
            const badResponse = { version: 0.6 };
            mockedAxios.post.mockResolvedValue({ data: badResponse });

            const result = await fetchGreenSpaces();
            expect(result).toEqual({ type: 'FeatureCollection', features: [] });
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).not.toHaveBeenCalled(); // Check the specific mock
        });

        it('should handle Overpass API errors gracefully and return empty FeatureCollection', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            const apiError = new Error('Overpass API error');
            mockedAxios.post.mockRejectedValue(apiError);

            const result = await fetchGreenSpaces();
            expect(result).toEqual({ type: 'FeatureCollection', features: [] });
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).not.toHaveBeenCalled(); // Check the specific mock
            consoleErrorSpy.mockRestore();
        });

        it('should handle network or other non-API errors and return empty FeatureCollection', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            const networkError = new Error('Network connection failed');
            mockedAxios.post.mockRejectedValue(networkError);

            const result = await fetchGreenSpaces();
            expect(result).toEqual({ type: 'FeatureCollection', features: [] });
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).not.toHaveBeenCalled(); // Check the specific mock
            consoleErrorSpy.mockRestore();
        });

        // --- Cache Testing --- 
        it('should cache the GeoJSON result after the first call', async () => {
            const mockApiResponse = createMockOverpassApiResponse([mockElement1Data]);
            const expectedGeoJson: FeatureCollection = { type: 'FeatureCollection', features: [mockFeature1] };
            mockedAxios.post.mockResolvedValue({ data: mockApiResponse });

            const result1 = await fetchGreenSpaces();
            expect(result1).toEqual(expectedGeoJson);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledTimes(1); // Check the specific mock

            const result2 = await fetchGreenSpaces();
            expect(result2).toEqual(expectedGeoJson);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledTimes(1);
        });

        it('should cache an empty GeoJSON result', async () => {
            const mockApiResponse = createMockOverpassApiResponse([]);
            const expectedGeoJson: FeatureCollection = { type: 'FeatureCollection', features: [] };
            mockedAxios.post.mockResolvedValue({ data: mockApiResponse });

            const result1 = await fetchGreenSpaces();
            expect(result1).toEqual(expectedGeoJson);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledTimes(1); // Check the specific mock

            const result2 = await fetchGreenSpaces();
            expect(result2).toEqual(expectedGeoJson);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledTimes(1);
        });

        it('should not cache API errors (should return empty GeoJSON but re-query on next call)', async () => {
            const apiError = new Error('API Failure');
            mockedAxios.post.mockRejectedValueOnce(apiError);

            const result1 = await fetchGreenSpaces();
            expect(result1).toEqual({ type: 'FeatureCollection', features: [] });
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).not.toHaveBeenCalled(); // Check the specific mock

            const mockApiResponse = createMockOverpassApiResponse([mockElement2Data]);
            const expectedGeoJson: FeatureCollection = { type: 'FeatureCollection', features: [mockFeature2] };
            mockedAxios.post.mockResolvedValueOnce({ data: mockApiResponse });

            const result2 = await fetchGreenSpaces();
            expect(result2).toEqual(expectedGeoJson);
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledTimes(1); // Check the specific mock
        });
    });
}); 
