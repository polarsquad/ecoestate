import express, { Request, Response, Router } from 'express';
import { fetchGreenSpaces } from '../services/overpassService';
import { FeatureCollection } from 'geojson';

const router: Router = express.Router();

/**
 * @route GET /api/map-data/green-spaces
 * @description Get green space data (parks, forests etc.) for the Helsinki Metropolitan Area.
 * @returns {Object} GeoJSON FeatureCollection representing green spaces.
 */
router.get('/green-spaces', async (req: Request, res: Response) => {
    // Remove bbox validation - no longer needed
    /*
    const bbox = req.query.bbox as string;
    // Validate bbox format (simple check: south,west,north,east)
    if (!bbox || !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(bbox)) {
        res.status(400).json({ error: 'Invalid or missing bbox query parameter. Format: south,west,north,east' });
        return;
    }
    */

    try {
        // Call service without bbox
        const greenSpaceGeoJson: FeatureCollection = await fetchGreenSpaces();

        // Return the GeoJSON FeatureCollection directly
        res.json(greenSpaceGeoJson); // Send the GeoJSON data

    } catch (error: any) {
        // The service function now handles logging and returns empty GeoJSON on error,
        // but we still need to catch potential unexpected errors here.
        console.error('Unexpected error in /green-spaces route:', error.message);
        res.status(500).json({
            error: 'Internal server error while processing green space data.',
            message: error.message
        });
    }
});

export default router; 
