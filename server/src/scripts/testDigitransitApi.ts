import axios from 'axios';

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

/**
 * Handles API errors and extracts meaningful messages
 */
function handleApiError(error: any, context: string): void {
    console.error(`\n--- ${context} ---`);
    if (axios.isAxiosError(error)) {
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);

        if (error.response?.data) {
            // GraphQL errors might be nested in response.data.errors
            if (error.response.data.errors) {
                console.error('GraphQL Errors:', JSON.stringify(error.response.data.errors, null, 2));
            } else if (typeof error.response.data === 'string') {
                console.error('API Error Data:', error.response.data);
            } else {
                console.error('API Error Data:', JSON.stringify(error.response.data, null, 2));
            }
        } else {
            console.error('Error Message:', error.message);
        }
    } else {
        console.error('Error:', error);
    }
    console.error(`--- End of Error ---\n`);
}


/**
 * Executes a GraphQL query against the Digitransit API
 */
async function queryDigitransitApi(query: string): Promise<any> {
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
            return response.data.data;
        } else {
            console.error('No data received from Digitransit API, or response format unexpected.');
            console.log('Raw Response:', response.data);
            return null;
        }

    } catch (error) {
        handleApiError(error, 'Error querying Digitransit API');
        return null;
    }
}

/**
 * Main function to run the test query
 */
async function main() {
    console.log(`--- Testing Digitransit GraphQL API ---`);

    const data = await queryDigitransitApi(graphqlQuery);

    // Adjust data access based on the simplified query
    if (data && data.stops && Array.isArray(data.stops)) {
        console.log(`\nFound ${data.stops.length} stops (Note: Query fetches all stops, limited display to 10):`);
        data.stops.slice(0, 10).forEach((stop: any, index: number) => { // Display only first 10
            const routes = stop.patterns?.map((p: any) => p.route?.shortName || '?').join(', ') || 'N/A';
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
