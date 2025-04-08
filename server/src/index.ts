import express, { Request, Response } from 'express';
import propertyPricesRouter from './routes/propertyPrices'; // Import the new router

const app = express();
const port = process.env.PORT || 3001; // Use environment variable or default to 3001

// Middleware to parse JSON bodies (optional but good practice for future POST/PUT requests)
app.use(express.json());

// Basic root route
app.get('/', (req: Request, res: Response) => {
    res.send('Hello from the EcoEstate Backend!');
});

// Mount the property prices router
app.use('/api/property-prices', propertyPricesRouter);

// Global error handler (optional basic example)
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
