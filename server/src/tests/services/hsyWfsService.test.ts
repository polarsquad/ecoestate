// Service functions and mocks will be imported/defined dynamically

// --- Top Level --- 
// No mocks defined globally here

// --- End Top Level ---

// Define the shape of the GeoJSON for clarity in tests
interface MockGeoJSON {
    type: string;
    features: Array<{ [key: string]: any }>;
}

// Sample GeoJSON response structure (simplified)
const mockGeoJsonResponse: MockGeoJSON = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            id: 'pks_postinumeroalueet_2024.1',
            geometry: { type: 'Polygon', coordinates: [[/* ... */]] },
            properties: { posti_alue: '00100', nimi_fi: 'Helsinki Keskusta - Etu-Töölö', nimi_se: 'Helsingfors Centrum - Främre Tölö' }
        },
    ]
};

// Define the shape of the service module for dynamic import typing
interface HsyWfsServiceModule {
    getPostcodeBoundaries: () => Promise<MockGeoJSON | null>;
    clearPostcodeCache: () => void;
}

describe('hsyWfsService', () => {
    // Variables to hold mocks and dynamically imported functions
    let mockCacheInstance: any;
    let mockedAxiosGet: jest.Mock;
    let getPostcodeBoundaries: HsyWfsServiceModule['getPostcodeBoundaries'];
    let clearPostcodeCache: HsyWfsServiceModule['clearPostcodeCache'];

    beforeEach(() => {
        // 1. Reset Jest's module cache before each test
        jest.resetModules();

        // 2. Define the mock cache instance structure
        mockCacheInstance = {
            get: jest.fn(),
            set: jest.fn(),
            clear: jest.fn(),
            delete: jest.fn(),
            size: jest.fn(),
            name: 'Mocked HSY WFS Cache'
        };

        // 3. Define the mock axios get function
        mockedAxiosGet = jest.fn();

        // 4. Use jest.doMock for BOTH dependencies *before* importing the service
        jest.doMock('../../utils/cache', () => ({
            SimpleCache: jest.fn().mockImplementation(() => mockCacheInstance)
        }));
        jest.doMock('axios', () => ({
            // Mock the default export if the service uses `import axios from 'axios'`
            default: {
                get: mockedAxiosGet
            },
            // Also mock as a named export if service uses `import { get } from 'axios'` (less common for default export like axios)
            get: mockedAxiosGet,
            isAxiosError: jest.fn((error): error is import('axios').AxiosError => 'isAxiosError' in error && error.isAxiosError === true) // Provide a basic mock for type guard
        }));

        // 5. Dynamically import the service module *after* setting up mocks
        const serviceModule = require('../../services/hsyWfsService') as HsyWfsServiceModule;
        getPostcodeBoundaries = serviceModule.getPostcodeBoundaries;
        clearPostcodeCache = serviceModule.clearPostcodeCache;
    });

    afterEach(() => {
        // Clear all mocks after each test to ensure isolation
        jest.clearAllMocks();
    });


    describe('getPostcodeBoundaries', () => {

        it('should fetch postcode boundaries from HSY WFS API if cache is empty', async () => {
            // Arrange: Set mock behaviors for this specific test
            mockCacheInstance.get.mockReturnValue(undefined);
            mockedAxiosGet.mockResolvedValueOnce({ status: 200, data: mockGeoJsonResponse });

            // Act
            const result = await getPostcodeBoundaries();

            // Assert
            expect(mockCacheInstance.get).toHaveBeenCalledWith('all_postcodes');
            expect(mockedAxiosGet).toHaveBeenCalledTimes(1);
            expect(mockedAxiosGet).toHaveBeenCalledWith(expect.stringContaining('https://kartta.hsy.fi/geoserver/wfs'), expect.objectContaining({
                params: expect.objectContaining({
                    SERVICE: 'WFS',
                    VERSION: '2.0.0',
                    REQUEST: 'GetFeature',
                    TYPENAMES: 'taustakartat_ja_aluejaot:pks_postinumeroalueet_2022',
                    OUTPUTFORMAT: 'application/json',
                    SRSNAME: 'EPSG:3879'
                })
            }));
            expect(mockCacheInstance.set).toHaveBeenCalledWith('all_postcodes', mockGeoJsonResponse);
            expect(result).toEqual(mockGeoJsonResponse);
        });

        it('should return cached postcode boundaries if available', async () => {
            // Arrange
            mockCacheInstance.get.mockReturnValue(mockGeoJsonResponse);

            // Act
            const result = await getPostcodeBoundaries();

            // Assert
            expect(mockCacheInstance.get).toHaveBeenCalledWith('all_postcodes');
            expect(mockedAxiosGet).not.toHaveBeenCalled();
            expect(mockCacheInstance.set).not.toHaveBeenCalled();
            expect(result).toEqual(mockGeoJsonResponse);
        });

        it('should handle API errors gracefully and return null', async () => {
            // Arrange
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            mockCacheInstance.get.mockReturnValue(undefined);
            const apiError = new Error('Network Error');
            // Simulate axios throwing an error that is NOT an AxiosError
            mockedAxiosGet.mockRejectedValueOnce(apiError);

            // Act
            const result = await getPostcodeBoundaries();

            // Assert
            expect(mockCacheInstance.get).toHaveBeenCalledWith('all_postcodes');
            expect(mockedAxiosGet).toHaveBeenCalledTimes(1);
            expect(mockCacheInstance.set).not.toHaveBeenCalled();
            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error fetching postcode boundaries: An unexpected error occurred'), apiError);

            consoleErrorSpy.mockRestore();
        });

        it('should handle Axios API errors gracefully and return null', async () => {
            // Arrange
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            mockCacheInstance.get.mockReturnValue(undefined);
            const axiosApiError = new Error('Request failed') as import('axios').AxiosError;
            axiosApiError.isAxiosError = true; // Mark it as an AxiosError
            axiosApiError.response = { status: 503, statusText: 'Service Unavailable' } as any;
            mockedAxiosGet.mockRejectedValueOnce(axiosApiError);

            // Act
            const result = await getPostcodeBoundaries();

            // Assert
            expect(mockCacheInstance.get).toHaveBeenCalledWith('all_postcodes');
            expect(mockedAxiosGet).toHaveBeenCalledTimes(1);
            expect(mockCacheInstance.set).not.toHaveBeenCalled();
            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error fetching postcode boundaries: API request failed with status 503 Service Unavailable'), 'Request failed');

            consoleErrorSpy.mockRestore();
        });

        it('should handle non-200 responses gracefully and return null', async () => {
            // Arrange
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            mockCacheInstance.get.mockReturnValue(undefined);
            mockedAxiosGet.mockResolvedValueOnce({ status: 404, statusText: 'Not Found', data: 'Not Found Error Page', headers: {}, config: {} as any });

            // Act
            const result = await getPostcodeBoundaries();

            // Assert
            expect(mockCacheInstance.get).toHaveBeenCalledWith('all_postcodes');
            expect(mockedAxiosGet).toHaveBeenCalledTimes(1);
            expect(mockCacheInstance.set).not.toHaveBeenCalled();
            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching postcode boundaries: Received status 404 but data is invalid or not a FeatureCollection.');

            consoleErrorSpy.mockRestore();
        });
    });

    describe('clearPostcodeCache', () => {
        it('should call cache.clear', () => {
            // Arrange (mocks are set in beforeEach)

            // Act
            clearPostcodeCache();

            // Assert
            expect(mockCacheInstance.clear).toHaveBeenCalledTimes(1);
        });
    });
}); 
