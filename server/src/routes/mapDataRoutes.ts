import express, { Request, Response, Router } from 'express';
import { fetchGreenSpaces } from '../services/overpassService';

const router: Router = express.Router();

/**
 * @route GET /api/map-data/green-spaces
 * @description Get green space data (parks, forests etc.) for the Helsinki Metropolitan Area.
 * @returns {Object} GeoJSON FeatureCollection representing green spaces.
 */
router.get('/green-spaces', async (req: Request, res: Response) => {
    try {
        // Call service without bbox
        const greenSpaceGeoJson = await fetchGreenSpaces();

        // Return the GeoJSON FeatureCollection directly
        res.json(greenSpaceGeoJson); // Send the GeoJSON data

    } catch (error) {
        // The service function now handles logging and returns empty GeoJSON on error,
        // but we still need to catch potential unexpected errors here.
        const userMessage = 'Internal server error while processing green space data.';
        let logMessage = 'Unexpected error in /green-spaces route:';
        let errorDetails: string | unknown = error; // Type more specifically

        if (error instanceof Error) {
            logMessage = `Unexpected error in /green-spaces route: ${error.message}`;
            errorDetails = error.message;
        } else {
            // errorDetails remains the original error object for logging if not an Error instance
        }
        console.error(logMessage, error instanceof Error ? '' : error);

        res.status(500).json({
            error: userMessage,
            // Ensure message is a string for the response
            message: typeof errorDetails === 'string' ? errorDetails : 'Details of the error could not be determined or are not a string.'
        });
    }
});

export default router; 
