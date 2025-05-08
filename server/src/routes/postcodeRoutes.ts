import express, { Request, Response } from 'express';
import { getPostcodeBoundaries } from '../services/hsyWfsService';

const router = express.Router();

// Route to get all postcode boundaries as GeoJSON
router.get('/', async (_req: Request, res: Response) => {
    try {
        console.log('Received request for /api/postcodes');
        const boundaries = await getPostcodeBoundaries();

        if (boundaries) {
            // Set appropriate content type for GeoJSON
            res.setHeader('Content-Type', 'application/geo+json');
            res.json(boundaries);
        } else {
            // Service layer would have logged the specific error
            res.status(500).json({ error: 'Failed to retrieve postcode boundaries.' });
        }
    } catch (error) {
        // The service function (getPostcodeBoundaries) handles its own logging for API errors.
        // This catch is for unexpected errors within this handler or if the service re-throws.
        let errorMessage = 'Failed to get postcode boundaries.';
        if (error instanceof Error) {
            errorMessage = error.message;
            console.error('Error in /postcodes route handler:', error.message);
        } else {
            console.error('Unknown error in /postcodes route handler:', error);
        }
        res.status(500).json({ error: errorMessage });
    }
});

export default router; 
