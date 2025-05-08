import axios from 'axios';
import { DigitransitStopsQueryResult } from '../types/digitransit.types'; // Import types

// --- Added Type Definitions for Error Handling ---
interface DigitransitErrorDetail {
    message: string;
    // Add other fields if known/needed
}

interface DigitransitErrorResponse {
    errors: DigitransitErrorDetail[];
}

// Type guard function to check for the specific error structure
function isDigitransitErrorResponse(data: unknown): data is DigitransitErrorResponse {
    if (!data || typeof data !== 'object') return false;
    // Check if 'errors' property exists and is an array
    if (!('errors' in data) || !Array.isArray((data as { errors: unknown }).errors)) return false;
    // Check if every element in the 'errors' array has the required structure
    return (data as { errors: unknown[] }).errors.every(
        (err: unknown): err is DigitransitErrorDetail =>
            typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string'
    );
}
// --- End of Added Types ---

// Base URL for the Digitransit Routing API (GraphQL endpoint)
// Using HSL (Helsinki Region) router as an example
const DIGITRANSIT_API_URL = 'https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';

// Retrieve API key from environment variables
const apiKey = process.env.DIGITRANSIT_API_KEY;

// GraphQL query to fetch the first 10 public transport stops - Corrected structure
const graphqlQuery = `
query GetStops {
  stops {
    gtfsId
    name
    code
    lat
    lon
    patterns {
      code
      route {
        shortName
      }
    }
  }
}
`;

// --- Added Type for Successful Response ---
interface DigitransitStop {
    gtfsId: string;
    name: string;
    lat: number;
    lon: number;
    patterns: {
        code: string;
        route: {
            shortName: string;
        }
    }[];
}

interface DigitransitSuccessResponse {
    data: {
        stops: DigitransitStop[];
    };
}
// --- End of Added Types ---

/**
 * Executes a GraphQL query against the Digitransit API
 */
async function queryDigitransitApi(query: string): Promise<DigitransitStopsQueryResult | null> {
    if (!apiKey) {
        console.error(`
=== ERROR: No Digitransit API Key ===
Please provide your Digitransit subscription key as an environment variable:
1. Register for an API key at https://digitransit.fi/en/developers/api-portal-and-registration/
2. Add the key to your .env file in the server directory: DIGITRANSIT_API_KEY=your_subscription_key
3. Or run directly with: DIGITRANSIT_API_KEY=your_subscription_key npm run test:digitransit

The Digitransit API requires a subscription key for access.
        `);
        process.exit(1);
    }

    console.log(`Querying Digitransit API: ${DIGITRANSIT_API_URL}`);
    try {
        const response = await axios.post(
            DIGITRANSIT_API_URL,
            {
                query: query
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'digitransit-subscription-key': apiKey, // API key header
                },
            }
        );

        // Check for GraphQL errors in the response body
        if (response.data && response.data.errors) {
            console.error('GraphQL Errors returned:', JSON.stringify(response.data.errors, null, 2));
            return null;
        }

        // Check if data is present
        if (response.data && response.data.data) {
            console.log('Successfully received data from Digitransit API.');
            return response.data.data as DigitransitStopsQueryResult; // Cast to imported type
        } else {
            console.error('No data received from Digitransit API, or response format unexpected.');
            console.log('Raw Response:', response.data);
            return null;
        }

    } catch (error) {
        console.error('\n--- Error fetching data from Digitransit API ---');
        if (axios.isAxiosError(error)) {
            console.error('Status:', error.response?.status);
            console.error('API Error Message:', error.message);

            // Use the type guard
            const responseData = error.response?.data;
            if (isDigitransitErrorResponse(responseData)) {
                // TypeScript now knows responseData has the shape DigitransitErrorResponse
                console.error('API Errors:', responseData.errors.map(e => e.message).join(', '));
            } else {
                console.error('API Response Data (Raw or Unexpected Structure):', responseData);
            }
        } else if (error instanceof Error) {
            console.error('Error:', error.message);
        } else {
            console.error('Unknown error structure:', error);
        }
        console.error('--- End of Error ---');
        return null; // Return null on error
    }
}

/**
 * Main function to run the test query
 */
async function main() {
    console.log(`--- Testing Digitransit GraphQL API ---`);

    const data = await queryDigitransitApi(graphqlQuery);

    if (data && data.stops && Array.isArray(data.stops)) {
        console.log(`\nFound ${data.stops.length} stops (Note: Query fetches all stops, limited display to 10):`);
        data.stops.slice(0, 10).forEach((stop: import('../types/digitransit.types').DigitransitStop, index: number) => {
            const routes = stop.patterns?.map((p) => p.route?.shortName || '?').join(', ') || 'N/A';
            console.log(
                `${index + 1}. ${stop.name} (${stop.code || 'No Code'}) - ID: ${stop.gtfsId} ` +
                `[Lat: ${stop.lat.toFixed(5)}, Lon: ${stop.lon.toFixed(5)}] Routes: ${routes}`
            );
        });
    } else {
        console.log('\nCould not retrieve stop data or response format was unexpected.');
    }

    console.log(`\n--- Test Complete ---`);
}

// Run the main function
main().catch(error => {
    console.error("Unexpected error in main function:", error);
    process.exit(1);
}); 
