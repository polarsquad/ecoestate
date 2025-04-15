import request from 'supertest';
import express from 'express';
import propertyPricesAndTrendsRouter from '../../routes/propertyPricesRoutes';
import * as statFiService from '../../services/statFiService';
import { PostalCodeData, PriceTrendData } from '../../types/statfi.types';

// Mock the entire service module
jest.mock('../../services/statFiService');

// Type assertion for the mocked module
const mockedStatFiService = statFiService as jest.Mocked<typeof statFiService>;

const app = express();
app.use('/api/property-prices', propertyPricesAndTrendsRouter);

describe('Property Prices and Trends Routes', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('GET /api/property-prices/trends', () => {
        it('should return 200 and calculated trends for a valid period', async () => {
            // Mock data for fetchStatFiPropertyData for each year (2018-2022)
            const mockData2018: PostalCodeData[] = [
                { postalCode: '00100', district: 'A', municipality: 'Hki', fullLabel: '00100 A (Hki)', prices: { 'Kerrostalo yksiöt': 3000 } },
                { postalCode: '00200', district: 'B', municipality: 'Hki', fullLabel: '00200 B (Hki)', prices: { 'Kerrostalo yksiöt': 2000 } },
            ];
            const mockData2019: PostalCodeData[] = [
                { postalCode: '00100', district: 'A', municipality: 'Hki', fullLabel: '00100 A (Hki)', prices: { 'Kerrostalo yksiöt': 3100 } },
                // 00200 missing
            ];
            const mockData2020: PostalCodeData[] = [
                { postalCode: '00100', district: 'A', municipality: 'Hki', fullLabel: '00100 A (Hki)', prices: { 'Kerrostalo yksiöt': 3200 } },
                { postalCode: '00200', district: 'B', municipality: 'Hki', fullLabel: '00200 B (Hki)', prices: { 'Kerrostalo yksiöt': 2100 } },
            ];
            const mockData2021: PostalCodeData[] = [
                { postalCode: '00100', district: 'A', municipality: 'Hki', fullLabel: '00100 A (Hki)', prices: { 'Kerrostalo yksiöt': 3300 } },
                { postalCode: '00200', district: 'B', municipality: 'Hki', fullLabel: '00200 B (Hki)', prices: { 'Kerrostalo yksiöt': 2150 } },
            ];
            const mockData2022: PostalCodeData[] = [
                { postalCode: '00100', district: 'A', municipality: 'Hki', fullLabel: '00100 A (Hki)', prices: { 'Kerrostalo yksiöt': 3600 } },
                { postalCode: '00200', district: 'B', municipality: 'Hki', fullLabel: '00200 B (Hki)', prices: { 'Kerrostalo yksiöt': 1900 } },
            ];

            // Setup mock implementations for fetchStatFiPropertyData
            mockedStatFiService.fetchStatFiPropertyData
                .mockResolvedValueOnce(mockData2018) // 2018
                .mockResolvedValueOnce(mockData2019) // 2019
                .mockResolvedValueOnce(mockData2020) // 2020
                .mockResolvedValueOnce(mockData2021) // 2021
                .mockResolvedValueOnce(mockData2022); // 2022

            // Define the *expected output* from calculatePriceTrends based on the above yearly data
            const mockTrendResult: PriceTrendData[] = [
                {
                    postalCode: '00100', district: 'A', municipality: 'Hki', fullLabel: '00100 A (Hki)',
                    trends: { 'Kerrostalo yksiöt': { percentChange: 20.00, direction: 'up', startPrice: 3000, endPrice: 3600, averageYearlyChange: 5.00 } }
                },
                {
                    postalCode: '00200', district: 'B', municipality: 'Hki', fullLabel: '00200 B (Hki)',
                    // Trend calculated from first (2018) to last (2022) available data point
                    trends: { 'Kerrostalo yksiöt': { percentChange: -5.00, direction: 'down', startPrice: 2000, endPrice: 1900, averageYearlyChange: -1.25 } }
                },
            ];
            // Explicitly mock calculatePriceTrends implementation to return the expected result
            mockedStatFiService.calculatePriceTrends.mockReturnValue(mockTrendResult);

            const endYear = 2022;
            const response = await request(app).get(`/api/property-prices/trends?endYear=${endYear}`);

            // --- Assertions --- 
            expect(response.status).toBe(200);
            expect(response.body.metadata.startYear).toBe(2018);
            expect(response.body.metadata.endYear).toBe(2022);
            // Check if the body.data matches the mocked trend result
            expect(response.body.data).toEqual(mockTrendResult);
            expect(response.body.data).toHaveLength(2);

            // Verify fetchStatFiPropertyData was called 5 times
            expect(mockedStatFiService.fetchStatFiPropertyData).toHaveBeenCalledTimes(5);
            expect(mockedStatFiService.fetchStatFiPropertyData).toHaveBeenCalledWith('2018');
            expect(mockedStatFiService.fetchStatFiPropertyData).toHaveBeenCalledWith('2022');

            // Verify calculatePriceTrends was called once with the aggregated data
            expect(mockedStatFiService.calculatePriceTrends).toHaveBeenCalledTimes(1);
            // Check the arguments passed to calculatePriceTrends
            expect(mockedStatFiService.calculatePriceTrends).toHaveBeenCalledWith(
                [mockData2018, mockData2019, mockData2020, mockData2021, mockData2022], // Ensure it gets the array of arrays
                2018,
                2022
            );
        });

        it('should return 400 if the start year is before 2010', async () => {
            const endYear = 2013;
            const response = await request(app).get(`/api/property-prices/trends?endYear=${endYear}`);
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Start year (2009) must be 2010 or later');
            expect(mockedStatFiService.fetchStatFiPropertyData).not.toHaveBeenCalled();
            expect(mockedStatFiService.calculatePriceTrends).not.toHaveBeenCalled();
        });

        it('should return 500 if fetchStatFiPropertyData throws an error', async () => {
            mockedStatFiService.fetchStatFiPropertyData.mockRejectedValue(new Error('StatFin API unavailable'));
            const endYear = 2022;
            const response = await request(app).get(`/api/property-prices/trends?endYear=${endYear}`);
            expect(response.status).toBe(500);
            expect(response.body.error).toContain('Internal server error');
            expect(mockedStatFiService.calculatePriceTrends).not.toHaveBeenCalled();
        });

        // This test now relies on the explicit mock of calculatePriceTrends
        it('should handle cases where calculatePriceTrends returns specific nulls', async () => {
            const mockPriceData: PostalCodeData[] = [
                { postalCode: '00300', district: 'C', municipality: 'Hki', fullLabel: '00300 C (Hki)', prices: { 'Kerrostalo yksiöt': 5000 } },
            ];
            mockedStatFiService.fetchStatFiPropertyData.mockResolvedValue(mockPriceData);

            // Mock calculatePriceTrends to return specific results for this case
            const specificTrendResult: PriceTrendData[] = [
                {
                    postalCode: '00300', district: 'C', municipality: 'Hki', fullLabel: '00300 C (Hki)',
                    trends: {
                        'Kerrostalo yksiöt': { percentChange: 0.00, direction: 'stable', startPrice: 5000, endPrice: 5000, averageYearlyChange: 0.00 },
                        'Rivitalot yhteensä': null // Explicitly null
                    }
                },
            ];
            mockedStatFiService.calculatePriceTrends.mockReturnValue(specificTrendResult);

            const endYear = 2022;
            const response = await request(app).get(`/api/property-prices/trends?endYear=${endYear}`);
            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(specificTrendResult);
            const trend00300 = response.body.data.find((d: any) => d.postalCode === '00300');
            expect(trend00300).toBeDefined();
            expect(trend00300.trends['Kerrostalo yksiöt']).toBeDefined();
            expect(trend00300?.trends['Rivitalot yhteensä']).toBeNull();
        });
    });

    describe('GET /api/property-prices', () => {
        it('should return 200 and property price data for a valid year', async () => {
            const mockYear = '2022';
            const mockPriceData: PostalCodeData[] = [
                { postalCode: '00100', district: 'A', municipality: 'Hki', fullLabel: '00100 A (Hki)', prices: { 'Kerrostalo yksiöt': 3600 } },
                { postalCode: '00200', district: 'B', municipality: 'Hki', fullLabel: '00200 B (Hki)', prices: { 'Kerrostalo yksiöt': 1900 } },
            ];
            mockedStatFiService.fetchStatFiPropertyData.mockResolvedValue(mockPriceData);

            const response = await request(app).get(`/api/property-prices?year=${mockYear}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual(mockPriceData);
            expect(mockedStatFiService.fetchStatFiPropertyData).toHaveBeenCalledTimes(1);
            expect(mockedStatFiService.fetchStatFiPropertyData).toHaveBeenCalledWith(mockYear);
        });

        it('should return 400 if year is missing', async () => {
            const response = await request(app).get('/api/property-prices');
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid or missing year query parameter');
            expect(mockedStatFiService.fetchStatFiPropertyData).not.toHaveBeenCalled();
        });

        it('should return 400 if year is not a 4-digit number', async () => {
            const response = await request(app).get('/api/property-prices?year=abc');
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid or missing year query parameter');
            expect(mockedStatFiService.fetchStatFiPropertyData).not.toHaveBeenCalled();
        });

        it('should return 400 if year is outside the reasonable range (e.g., < 2010)', async () => {
            const response = await request(app).get('/api/property-prices?year=2009');
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Year 2009 is out of the reasonable range');
            expect(mockedStatFiService.fetchStatFiPropertyData).not.toHaveBeenCalled();
        });

        it('should return 500 if fetchStatFiPropertyData throws an error', async () => {
            const mockYear = '2021';
            mockedStatFiService.fetchStatFiPropertyData.mockRejectedValue(new Error('API Error'));
            const response = await request(app).get(`/api/property-prices?year=${mockYear}`);
            expect(response.status).toBe(500);
            expect(response.body.error).toContain('Internal server error while retrieving property prices');
            expect(mockedStatFiService.fetchStatFiPropertyData).toHaveBeenCalledWith(mockYear);
        });
    });

    // --- TODO: Add tests for GET /api/property-prices and GET /api/property-prices/:postalCode --- 
    // These would be similar, mocking fetchStatFiPropertyData and asserting the response

}); 
