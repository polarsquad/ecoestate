import express, { RequestHandler } from 'express';
import { Request, Response } from 'express';
import { getWalkingDistance } from '../services/hsyWmsService';

const router = express.Router();

// Route to get the walking distance zone for a given point (EPSG:3879)
// Expects query parameters: x, y
const getWalkingDistanceHandler: RequestHandler = async (req, res) => {
    const { x, y } = req.query;

    // Basic validation
    if (!x || !y || typeof x !== 'string' || typeof y !== 'string') {
        res.status(400).json({ error: 'Missing or invalid query parameters: x and y are required.' });
        return;
    }

    const xCoord = parseFloat(x);
    const yCoord = parseFloat(y);

    if (isNaN(xCoord) || isNaN(yCoord)) {
        res.status(400).json({ error: 'Invalid coordinate values: x and y must be numbers.' });
        return;
    }

    try {
        console.log(`Received request for /api/walking-distance?x=${xCoord}&y=${yCoord}`);
        const distance = await getWalkingDistance(xCoord, yCoord);

        if (distance) {
            res.json({ walkingDistance: distance });
        } else {
            // If null, it means outside zones or an error occurred during WMS query
            // The service layer logs errors, so we can just indicate not found here.
            res.status(404).json({ message: 'Point is outside known walking distance zones or data unavailable.', walkingDistance: null });
        }
    } catch (error: any) {
        // This catch block is more for unexpected errors *within this handler*
        // Service errors during WMS calls are handled within getWalkingDistance/checkWmsLayer
        console.error('Error in /api/walking-distance route handler:', error.message);
        res.status(500).json({ error: 'Internal server error while calculating walking distance.' });
    }
};

// Use the typed handler
router.get('/', getWalkingDistanceHandler);

export default router; 
