import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3001; // Use environment variable or default to 3001

app.get('/', (req: Request, res: Response) => {
    res.send('Hello from the EcoEstate Backend!');
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
}); 
