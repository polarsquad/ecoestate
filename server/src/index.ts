import express, { Request, Response } from 'express';
import cors from 'cors'; // Import CORS middleware
import mapDataRouter from './routes/mapDataRoutes'; // Import the map data router
import hsyWmsRouter from './routes/hsyWmsRoutes'; // Import the HSY WMS router
import postcodeRoutes from './routes/postcodeRoutes'; // Import the postcode router
import propertyPricesAndTrendsRouter from './routes/propertyPricesRoutes'; // Renamed import for clarity
import { initializeScheduledTasks } from './scheduledTasks'; // Import the scheduler initializer

const app = express();
const port = process.env.PORT || 3001; // Use environment variable or default to 3001

// Configure CORS
const allowedOrigins: string[] = [];
if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:5173'); // Vite dev server
    const prodOriginForDev = process.env.FRONTEND_ORIGIN_PROD;
    if (prodOriginForDev) {
        allowedOrigins.push(prodOriginForDev); // Allow testing dev backend with a deployed/prod-like frontend URL
    }
} else { // Handles 'production' or any other non-development NODE_ENV
    const prodOrigin = process.env.FRONTEND_ORIGIN_PROD;
    if (prodOrigin) {
        allowedOrigins.push(prodOrigin);
    } else {
        console.error(
            'CORS Configuration Error: The FRONTEND_ORIGIN_PROD environment variable is NOT SET. ' +
            'In a production environment, this will prevent the frontend from connecting to the backend. ' +
            'Please set this variable to the full URL of your deployed frontend application (e.g., https://www.yourdomain.com).'
        );
        // If FRONTEND_ORIGIN_PROD is not set in production, allowedOrigins will be empty,
        // effectively blocking all cross-origin requests unless the request has no origin.
    }
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'development') {
            // If in prod-like env and no origins are configured (due to missing FRONTEND_ORIGIN_PROD)
            console.error(`CORS Error: Origin '${origin}' was blocked because no FRONTEND_ORIGIN_PROD is configured.`);
            return callback(new Error('Not allowed by CORS due to server misconfiguration.'));
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            console.warn(`CORS Warning: Origin '${origin}' was blocked by CORS policy. Allowed origins: ${allowedOrigins.join(', ')}`);
            return callback(new Error('Not allowed by CORS.'));
        }
    },
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
app.use((err: any, req: Request, res: Response) => {
    console.error("Unhandled error:", err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);

    // Initialize scheduled tasks after the server starts
    initializeScheduledTasks();
});
