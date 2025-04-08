import express, { Request, Response, Router } from 'express';
import { fetchStatFiPropertyData } from '../services/statFiService';

const router: Router = express.Router();

/**
 * @route GET /api/property-prices
 * @description Get property price data for postal codes
 * @query {string} year - The year for which to fetch data (optional, defaults to current year)
 * @returns {Object} Property price data organized by postal code
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const year = req.query.year as string || new Date().getFullYear().toString();

        // Validate year
        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 2010 || yearNum > new Date().getFullYear()) {
            res.status(400).json({
                error: 'Invalid year. Please provide a year between 2010 and the current year.'
            });
            return;
        }

        // Fetch data from StatFi service
        const data = await fetchStatFiPropertyData(year);

        // Return the processed data
        res.json({
            success: true,
            count: data.length,
            year,
            data
        });
    } catch (error: any) {
        console.error('Error in property prices route:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch property price data',
            message: error.message
        });
    }
});

/**
 * @route GET /api/property-prices/:postalCode
 * @description Get property price data for a specific postal code
 * @param {string} postalCode - The postal code to get data for
 * @query {string} year - The year for which to fetch data (optional, defaults to current year)
 * @returns {Object} Property price data for the specified postal code
 */
router.get('/:postalCode', async (req: Request, res: Response) => {
    try {
        const { postalCode } = req.params;
        const year = req.query.year as string || new Date().getFullYear().toString();

        // Validate postal code format (Finnish postal codes are 5 digits)
        if (!/^\d{5}$/.test(postalCode)) {
            res.status(400).json({
                error: 'Invalid postal code format. Finnish postal codes consist of 5 digits.'
            });
            return;
        }

        // Validate year
        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 2010 || yearNum > new Date().getFullYear()) {
            res.status(400).json({
                error: 'Invalid year. Please provide a year between 2010 and the current year.'
            });
            return;
        }

        // Fetch all data for the year
        const allData = await fetchStatFiPropertyData(year);

        // Find the specific postal code
        const postalCodeData = allData.find(item => item.postalCode === postalCode);

        if (!postalCodeData) {
            res.status(404).json({
                success: false,
                error: `No data found for postal code ${postalCode} in year ${year}`
            });
            return;
        }

        // Return the data for the specific postal code
        res.json({
            success: true,
            year,
            data: postalCodeData
        });
    } catch (error: any) {
        console.error(`Error fetching data for postal code:`, error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch property price data for postal code',
            message: error.message
        });
    }
});

export default router;

