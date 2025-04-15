import express, { Request, Response } from 'express';
import cors from 'cors'; // Import CORS middleware
import mapDataRouter from './routes/mapDataRoutes'; // Import the map data router
import hsyWmsRouter from './routes/hsyWmsRoutes'; // Import the HSY WMS router
import postcodeRoutes from './routes/postcodeRoutes'; // Import the postcode router
import propertyPricesAndTrendsRouter from './routes/propertyPricesRoutes'; // Renamed import for clarity
import { initializeScheduledTasks } from './scheduledTasks'; // Import the scheduler initializer

const app = express();
const port = process.env.PORT || 3001; // Use environment variable or default to 3001

// Enable CORS for all routes
app.use(cors({
    origin: 'http://localhost:5173', // Frontend development server address
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON bodies (optional but good practice for future POST/PUT requests)
app.use(express.json());

// Basic root route
app.get('/', (req: Request, res: Response) => {
    res.send('Hello from the EcoEstate Backend!');
});

// Mount routers
app.use('/api/property-prices', propertyPricesAndTrendsRouter);
app.use('/api/map-data', mapDataRouter); // Mount the new router
app.use('/api/walking-distance', hsyWmsRouter); // Mount the HSY WMS router
app.use('/api/postcodes', postcodeRoutes); // Mount the postcode router

// Global error handler (optional basic example)
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);

    // Initialize scheduled tasks after the server starts
    initializeScheduledTasks();
});
