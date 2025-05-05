import axios from 'axios';
import { fetchGreenSpaces, clearOverpassCache } from '../../services/overpassService';
import { FeatureCollection, Feature } from 'geojson';
// import querystring from 'querystring';
import osmtogeojson from 'osmtogeojson';
import simplify from '@turf/simplify';
import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { OverpassResponse } from '../../types/overpass.types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock osmtogeojson module
jest.mock('osmtogeojson');

// Mock @turf/simplify module
jest.mock('@turf/simplify');

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

// Mock return value for the simplified GeoJSON
const mockSimplifiedFeatureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        { ...mockFeature1, properties: { ...mockFeature1.properties, simplified: true } }, // Add a marker
        { ...mockFeature2, properties: { ...mockFeature2.properties, simplified: true } }  // Add a marker
    ]
};

describe('overpassService', () => {
    // Define the mock implementation here so it can be cleared easily
    const mockOsmtogeojsonImplementation = jest.fn((data: OverpassResponse) => {
        const features: Feature[] = (data.elements || []).map((el: any) => ({
            type: 'Feature',
            properties: el.tags || {},
            geometry: { type: 'Point', coordinates: [el.lon || 0, el.lat || 0] }
        }));
        return { type: 'FeatureCollection', features };
    });

    // Define mock implementation for simplify
    const simplifyLogic = (data: FeatureCollection): FeatureCollection => {
        // Return a distinct object to simulate simplification
        return JSON.parse(JSON.stringify(mockSimplifiedFeatureCollection)); // Deep copy to avoid mutation issues
    };
    const mockSimplifyImplementation = jest.fn(simplifyLogic);

    beforeAll(() => {
        // Assign the mock implementation to the mocked default export
        (osmtogeojson as jest.Mock).mockImplementation(mockOsmtogeojsonImplementation as any); // Cast to any to bypass complex type check
        // Assign mock implementation for simplify
        (simplify as jest.Mock).mockImplementation(mockSimplifyImplementation as any); // Cast to any to bypass complex type check
    });

    describe('fetchGreenSpaces', () => {
        beforeEach(() => {
            mockedAxios.post.mockClear();
            mockOsmtogeojsonImplementation.mockClear(); // Clear the specific mock function
            mockSimplifyImplementation.mockClear(); // Clear simplify mock
            clearOverpassCache();
        });

        it('should fetch, convert, simplify, cache, and return simplified FeatureCollection', async () => {
            const mockApiResponse = createMockOverpassApiResponse([mockElement1Data, mockElement2Data]);
            mockedAxios.post.mockResolvedValue({ data: mockApiResponse });

            // The original GeoJSON that osmtogeojson mock returns
            const originalGeoJson = mockOsmtogeojsonImplementation(mockApiResponse);

            const result = await fetchGreenSpaces();

            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post.mock.calls[0][1]).toContain('bbox:60.12,24.5,60.4,25.26');
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledWith(mockApiResponse);

            // Expect simplify to be called with the original GeoJSON and specific options
            expect(mockSimplifyImplementation).toHaveBeenCalledTimes(1);
            expect(mockSimplifyImplementation).toHaveBeenCalledWith(originalGeoJson, {
                tolerance: 0.0005, // Ensure the new tolerance is used
                highQuality: false
            });

            // Expect the final result to be the simplified GeoJSON
            expect(result.type).toBe('FeatureCollection');
            expect(result.features.length).toBe(2);
            // Check if the returned features have the 'simplified' marker from the mock
            expect(result.features[0]?.properties?.simplified).toBe(true);
            expect(result.features[1]?.properties?.simplified).toBe(true);
        });

        it('should return an empty FeatureCollection if API response has no elements (simplification still runs)', async () => {
            const mockApiResponse = createMockOverpassApiResponse([]);
            mockedAxios.post.mockResolvedValue({ data: mockApiResponse });
            const originalGeoJson = mockOsmtogeojsonImplementation(mockApiResponse);

            // Override simplify mock for this specific test case (when input has no features)
            mockSimplifyImplementation.mockReturnValueOnce({ type: 'FeatureCollection', features: [] });

            const result = await fetchGreenSpaces();
            expect(result).toEqual({ type: 'FeatureCollection', features: [] });
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledWith(mockApiResponse);
            expect(mockSimplifyImplementation).toHaveBeenCalledWith(originalGeoJson, expect.any(Object));
        });

        it('should return an empty FeatureCollection if API response format is unexpected (no simplification run)', async () => {
            const badResponse = { version: 0.6 };
            mockedAxios.post.mockResolvedValue({ data: badResponse });

            const result = await fetchGreenSpaces();
            expect(result).toEqual({ type: 'FeatureCollection', features: [] });
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).not.toHaveBeenCalled();
            expect(mockSimplifyImplementation).not.toHaveBeenCalled(); // Ensure simplify is not called
        });

        it('should handle Overpass API errors gracefully and return empty FeatureCollection (no simplification run)', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            const apiError = new Error('Overpass API error');
            mockedAxios.post.mockRejectedValue(apiError);

            const result = await fetchGreenSpaces();
            expect(result).toEqual({ type: 'FeatureCollection', features: [] });
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).not.toHaveBeenCalled(); // Check the specific mock
            expect(mockSimplifyImplementation).not.toHaveBeenCalled(); // Ensure simplify is not called
            consoleErrorSpy.mockRestore();
        });

        it('should handle network or other non-API errors and return empty FeatureCollection (no simplification run)', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            const networkError = new Error('Network connection failed');
            mockedAxios.post.mockRejectedValue(networkError);

            const result = await fetchGreenSpaces();
            expect(result).toEqual({ type: 'FeatureCollection', features: [] });
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).not.toHaveBeenCalled(); // Check the specific mock
            expect(mockSimplifyImplementation).not.toHaveBeenCalled(); // Ensure simplify is not called
            consoleErrorSpy.mockRestore();
        });

        // --- Cache Testing --- 
        it('should cache the *simplified* GeoJSON result after the first call', async () => {
            const mockApiResponse = createMockOverpassApiResponse([mockElement1Data]);
            mockedAxios.post.mockResolvedValue({ data: mockApiResponse });

            const result1 = await fetchGreenSpaces();
            // Check if the returned features have the 'simplified' marker from the mock
            expect(result1.features[0]?.properties?.simplified).toBe(true);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledTimes(1);
            expect(mockSimplifyImplementation).toHaveBeenCalledTimes(1);

            const result2 = await fetchGreenSpaces();
            expect(result2).toEqual(result1); // Should return the cached simplified version
            expect(mockedAxios.post).toHaveBeenCalledTimes(1); // No second API call
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledTimes(1); // No second conversion
            expect(mockSimplifyImplementation).toHaveBeenCalledTimes(1); // No second simplification
        });

        it('should cache an empty simplified GeoJSON result', async () => {
            const mockApiResponse = createMockOverpassApiResponse([]);
            mockedAxios.post.mockResolvedValue({ data: mockApiResponse });
            // Override simplify mock for this specific test case
            mockSimplifyImplementation.mockReturnValueOnce({ type: 'FeatureCollection', features: [] });

            const result1 = await fetchGreenSpaces();
            expect(result1).toEqual({ type: 'FeatureCollection', features: [] });
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledTimes(1);
            expect(mockSimplifyImplementation).toHaveBeenCalledTimes(1);

            const result2 = await fetchGreenSpaces();
            expect(result2).toEqual({ type: 'FeatureCollection', features: [] });
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledTimes(1);
            expect(mockSimplifyImplementation).toHaveBeenCalledTimes(1);
        });

        it('should not cache API errors (should return empty GeoJSON but re-query and re-simplify on next call)', async () => {
            const apiError = new Error('API Failure');
            mockedAxios.post.mockRejectedValueOnce(apiError);

            const result1 = await fetchGreenSpaces();
            expect(result1).toEqual({ type: 'FeatureCollection', features: [] });
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockOsmtogeojsonImplementation).not.toHaveBeenCalled(); // Check the specific mock
            expect(mockSimplifyImplementation).not.toHaveBeenCalled();

            const mockApiResponse = createMockOverpassApiResponse([mockElement2Data]);
            const expectedSimplifiedGeoJson = mockSimplifiedFeatureCollection.features.filter(f => f.properties?.landuse === 'forest');
            mockSimplifyImplementation.mockReturnValueOnce({ type: 'FeatureCollection', features: expectedSimplifiedGeoJson }); // Setup simplify mock for second call
            mockedAxios.post.mockResolvedValueOnce({ data: mockApiResponse });

            const result2 = await fetchGreenSpaces();
            expect(result2.features[0]?.properties?.simplified).toBe(true);
            expect(mockedAxios.post).toHaveBeenCalledTimes(2); // Second API call
            expect(mockOsmtogeojsonImplementation).toHaveBeenCalledTimes(1); // First conversion
            expect(mockSimplifyImplementation).toHaveBeenCalledTimes(1); // First simplification
        });
    });
}); 
