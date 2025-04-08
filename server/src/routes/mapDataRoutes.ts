import express, { Request, Response, Router } from 'express';
import { fetchGreenSpaces } from '../services/overpassService';
import { OverpassElement } from '../types/overpass.types';

const router: Router = express.Router();

/**
 * @route GET /api/map-data/green-spaces
 * @description Get green space data (parks, forests etc.) around a coordinate point.
 * @query {number} lat - Latitude of the center point.
 * @query {number} lon - Longitude of the center point.
 * @query {number} radius - Search radius in meters.
 * @returns {Object} GeoJSON-like features representing green spaces.
 */
router.get('/green-spaces', async (req: Request, res: Response) => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const radius = parseInt(req.query.radius as string, 10);

    // Basic validation
    if (isNaN(lat) || isNaN(lon) || isNaN(radius)) {
        res.status(400).json({
            error: 'Missing or invalid query parameters. Required: lat (number), lon (number), radius (number).'
        });
        return;
    }

    if (radius <= 0 || radius > 5000) { // Example radius limits
        res.status(400).json({
            error: 'Invalid radius. Must be between 1 and 5000 meters.'
        });
        return;
    }

    try {
        const greenSpaceElements: OverpassElement[] = await fetchGreenSpaces(lat, lon, radius);

        // Optional: Convert Overpass elements to GeoJSON or a simpler format if needed
        // For now, returning the raw elements
        res.json({
            success: true,
            count: greenSpaceElements.length,
            query: { lat, lon, radius },
            data: greenSpaceElements
        });

    } catch (error: any) {
        console.error('Error in green-spaces route:', error.message);
        // Use the error message thrown by the service
        res.status(500).json({
            success: false,
            error: 'Failed to fetch green space data from Overpass API.',
            message: error.message // Pass service error message along
        });
    }
});

export default router; 
