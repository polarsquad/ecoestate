import express, { Request, Response, Router, RequestHandler } from 'express';
import { fetchStatFiPropertyData, calculatePriceTrends } from '../services/statFiService';

const router: Router = express.Router();

// Handler for getting property prices for a specific year
const pricesForYearHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const year = req.query.year as string;
        if (!year || !/^\d{4}$/.test(year)) {
            res.status(400).json({ error: 'Invalid or missing year query parameter. Please provide a 4-digit year.' });
            return;
        }

        // Basic check for reasonable year range (optional)
        const numericYear = parseInt(year);
        if (numericYear < 2010 || numericYear > new Date().getFullYear()) {
            res.status(400).json({ error: `Year ${year} is out of the reasonable range (2010-${new Date().getFullYear()}).` });
            return;
        }

        const priceData = await fetchStatFiPropertyData(year);
        res.json({ data: priceData });
    } catch (error: any) {
        console.error(`Error in / route handler for year ${req.query.year}:`, error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error while retrieving property prices for the specified year.' });
        }
    }
};

// Explicitly type the handler with void return for async
const trendsHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const endYear = parseInt(req.query.endYear as string) || (new Date().getFullYear() - 1);
        const periodLength = 5; // Fixed at 5 years
        const startYear = endYear - (periodLength - 1);

        if (startYear < 2010) {
            // Explicitly return to satisfy Promise<void>
            res.status(400).json({
                error: `Invalid period. Start year (${startYear}) must be 2010 or later.`
            });
            return;
        }

        // Fetch data for each year in the period
        const yearPromises = [];
        for (let year = startYear; year <= endYear; year++) {
            yearPromises.push(fetchStatFiPropertyData(year.toString()));
        }

        const yearlyData = await Promise.all(yearPromises);

        // Calculate trends using the imported service function
        const trends = calculatePriceTrends(yearlyData, startYear, endYear);

        // No return needed here, res.json handles the response
        res.json({
            data: trends,
            metadata: {
                startYear,
                endYear,
                periodLength
            }
        });
    } catch (error: any) {
        console.error('Error in /trends route handler:', error.message);
        // Ensure response is sent even on error and satisfy Promise<void>
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error while retrieving property price trends.' });
        }
    }
};

// Route to get property price data for a specific year
router.get('/', pricesForYearHandler);

// Route to get property price trend data over a specified period
router.get('/trends', trendsHandler); // Use the typed handler

export default router; 
