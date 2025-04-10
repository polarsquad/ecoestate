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
    } catch (error: any) {
        // Catch unexpected errors during the request handling itself
        console.error('Error in /api/postcodes route handler:', error.message);
        res.status(500).json({ error: 'Internal server error while retrieving postcode boundaries.' });
    }
});

export default router; 
