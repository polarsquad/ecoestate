import request from 'supertest';
import express from 'express';
import postcodeRoutes from '../../routes/postcodeRoutes';
import * as hsyWfsService from '../../services/hsyWfsService';

// Mock the service layer
jest.mock('../../services/hsyWfsService');
const mockedHsyWfsService = hsyWfsService as jest.Mocked<typeof hsyWfsService>;

// Create a minimal express app to test the router
const app = express();
app.use('/api/postcodes', postcodeRoutes);

// Sample GeoJSON response structure (can reuse from service test)
const mockGeoJsonResponse = {
    type: 'FeatureCollection',
    features: [
        { type: 'Feature', properties: { posti_alue: '00100' } }
    ]
};

describe('Postcode Routes API (/api/postcodes)', () => {

    beforeEach(() => {
        // Reset mocks before each test
        jest.resetAllMocks();
    });

    it('should return 200 and GeoJSON data on successful fetch', async () => {
        mockedHsyWfsService.getPostcodeBoundaries.mockResolvedValue(mockGeoJsonResponse as any); // Cast as service uses more specific types

        const response = await request(app).get('/api/postcodes');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.body).toEqual(mockGeoJsonResponse);
        expect(mockedHsyWfsService.getPostcodeBoundaries).toHaveBeenCalledTimes(1);
    });

    it('should return 500 if the service layer returns null (error)', async () => {
        mockedHsyWfsService.getPostcodeBoundaries.mockResolvedValue(null);

        const response = await request(app).get('/api/postcodes');

        expect(response.status).toBe(500);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.body).toEqual({ error: 'Failed to retrieve postcode boundaries.' });
        expect(mockedHsyWfsService.getPostcodeBoundaries).toHaveBeenCalledTimes(1);
    });

    it('should return 500 if the service layer throws an unexpected error', async () => {
        const unexpectedError = new Error('Something unexpected happened!');
        mockedHsyWfsService.getPostcodeBoundaries.mockRejectedValue(unexpectedError);

        // Suppress console.error output during this test
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        const response = await request(app).get('/api/postcodes');

        expect(response.status).toBe(500);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.body).toEqual({ error: unexpectedError.message });
        expect(mockedHsyWfsService.getPostcodeBoundaries).toHaveBeenCalledTimes(1);

        consoleErrorSpy.mockRestore(); // Restore console.error
    });

}); 
