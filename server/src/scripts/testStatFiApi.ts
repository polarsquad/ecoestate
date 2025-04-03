import axios from 'axios';

// Base URL for the StatFin PX-Web API
const STATFI_API_BASE_URL = 'https://pxdata.stat.fi:443/PxWeb/api/v1/fi/StatFin/ashi/';

// The specific table ID for property prices
const TABLE_ID = 'statfin_ashi_pxt_13mu.px';

// Parse command-line arguments
const args = process.argv.slice(2);
const yearArg = args.find(arg => /^\d{4}$/.test(arg)); // Look for a 4-digit year
const year = yearArg || "2023"; // Default to 2023 if no year is provided

// Create the query payload
const queryPayload = {
    query: [
        {
            code: "Vuosi",
            selection: {
                filter: "item",
                values: [year]
            }
        },
        {
            code: "Tiedot",
            selection: {
                filter: "item",
                values: [
                    "keskihinta_aritm_nw"
                ]
            }
        }
    ],
    response: {
        format: 'json-stat2'
    }
};

// Define types for the JSON-stat response structure
interface Category {
    index: { [key: string]: number };
    label: { [key: string]: string };
}

interface Dimension {
    label: string;
    category: Category;
}

interface JsonStatResponse {
    id: string[];
    size: number[];
    dimension: { [key: string]: Dimension };
    value: (number | string)[];
}

// Define types for our processed data
interface BuildingPrices {
    [buildingType: string]: number | string;
}

interface PostalCodeData {
    postalCode: string;
    district: string;
    municipality: string;
    fullLabel: string;
    prices: BuildingPrices;
}

interface TableRow {
    'Postal Code': string;
    'District': string;
    'Municipality': string;
    'Studio Apt (€/m²)': number | string;
    'One-bedroom Apt (€/m²)': number | string;
    'Two+ bedroom Apt (€/m²)': number | string;
    'Row House (€/m²)': number | string;
}

async function fetchPropertyData() {
    try {
        console.log(`Fetching property price data for year: ${year}`);
        const apiUrl = `${STATFI_API_BASE_URL}${TABLE_ID}`;
        console.log(`Querying API: ${apiUrl}`);

        const response = await axios.post(apiUrl, queryPayload, {
            headers: { 'Content-Type': 'application/json' }
        });

        const data = response.data as JsonStatResponse;

        // Validate that the response contains the expected data structure
        if (!data.id || !data.dimension || !data.value) {
            console.error("Error: Response data is missing expected properties.");
            return;
        }

        // Get info about the response dimensions
        const dimensions = data.id;  // ['Vuosi', 'Postinumero', 'Talotyyppi', 'Tiedot']
        console.log(`\nData dimensions: ${dimensions.join(', ')}`);

        // Get the year being displayed
        const yearLabel = Object.values(data.dimension.Vuosi.category.label)[0];
        console.log(`Year: ${yearLabel}`);

        // Get the building types dimension
        const buildingTypes = data.dimension.Talotyyppi.category.label;
        console.log(`Building types: ${Object.values(buildingTypes).join(', ')}`);

        // Get all postal code areas
        const postalCodes = data.dimension.Postinumero.category.label;
        const postalCodeIndexes = data.dimension.Postinumero.category.index;

        // Create a structure to hold data by building type
        const pricesByPostalCode: PostalCodeData[] = [];

        // Go through each postal code
        for (const postalCodeKey in postalCodeIndexes) {
            const postalCodeLabel = postalCodes[postalCodeKey];
            const postalCodeIndex = postalCodeIndexes[postalCodeKey];

            // Extract just the postal code from the full label (e.g., "00100" from "00100 Helsinki centrum...")
            const postalCodeNumber = postalCodeKey.trim();

            // Extract the district and municipality from the full label
            const fullLabel = postalCodeLabel;
            const districtMatch = fullLabel.match(/^\d+\s+(.+?)\s*\((.+?)\)$/);

            let district = '', municipality = '';
            if (districtMatch && districtMatch.length >= 3) {
                district = districtMatch[1].trim();
                municipality = districtMatch[2].trim();
            }

            // The structure is: data.value[yearIdx * postcodeSize * btypeSize * dataTypeSize + 
            //                           postcodeIdx * btypeSize * dataTypeSize + 
            //                           btypeIdx * dataTypeSize + 
            //                           dataTypeIdx]
            // With yearSize=1, dataTypeSize=1 and fixed at 0, we simplify to:
            // data.value[postcodeIdx * btypeSize + btypeIdx]

            const buildingTypeSize = Object.keys(buildingTypes).length;
            const buildingTypePrices: BuildingPrices = {};

            // Get price values for different building types
            for (let btypeIdx = 0; btypeIdx < buildingTypeSize; btypeIdx++) {
                const valueIndex = postalCodeIndex * buildingTypeSize + btypeIdx;

                // Check if the index is valid in the data array
                if (valueIndex < data.value.length) {
                    const price = data.value[valueIndex];

                    // Get the building type key based on its index
                    const buildingTypeKey = Object.keys(buildingTypes).find(
                        key => data.dimension.Talotyyppi.category.index[key] === btypeIdx
                    );

                    if (buildingTypeKey) {
                        const buildingTypeLabel = buildingTypes[buildingTypeKey];

                        // Add to the building type prices object
                        if (price !== '.' && price !== '...') {
                            buildingTypePrices[buildingTypeLabel] = isNaN(Number(price)) ? price : Number(price);
                        }
                    }
                }
            }

            // Only add areas that have at least one price
            if (Object.keys(buildingTypePrices).length > 0) {
                pricesByPostalCode.push({
                    postalCode: postalCodeNumber,
                    district,
                    municipality,
                    fullLabel,
                    prices: buildingTypePrices
                });
            }
        }

        // Display statistics about the data
        const totalAreas = Object.keys(postalCodeIndexes).length;
        const areasWithData = pricesByPostalCode.length;
        const dataCompleteness = (areasWithData / totalAreas * 100).toFixed(1);

        console.log(`\nData Statistics:`);
        console.log(`- Total postal code areas in Finland: ${totalAreas}`);
        console.log(`- Areas with at least one price: ${areasWithData} (${dataCompleteness}%)`);

        // Sort the results by postal code
        pricesByPostalCode.sort((a, b) => a.postalCode.localeCompare(b.postalCode));

        // Create a flat table for display with the proper columns
        const tableData: TableRow[] = pricesByPostalCode.map(item => {
            const studioAptPrice = item.prices['Kerrostalo yksiöt'] || 'N/A';
            const oneBedroomAptPrice = item.prices['Kerrostalo kaksiot'] || 'N/A';
            const twoPlusBedroomAptPrice = item.prices['Kerrostalo kolmiot+'] || 'N/A';
            const rowHousePrice = item.prices['Rivitalot yhteensä'] || 'N/A';

            return {
                'Postal Code': item.postalCode,
                'District': item.district,
                'Municipality': item.municipality,
                'Studio Apt (€/m²)': studioAptPrice,
                'One-bedroom Apt (€/m²)': oneBedroomAptPrice,
                'Two+ bedroom Apt (€/m²)': twoPlusBedroomAptPrice,
                'Row House (€/m²)': rowHousePrice
            };
        });

        // Print the table with the first 30 rows
        console.log(`\n--- Property Prices by Postal Code (${yearLabel}) ---`);
        console.table(tableData.slice(0, 30));
        console.log(`\nShowing 30 of ${tableData.length} areas with price data.`);

        // Show specific examples mentioned in the requirements
        console.log('\n--- Specific Examples ---');

        // Example 1: "00100 Helsinki keskusta - Etu-Töölö (Helsinki)"
        const helsinki = pricesByPostalCode.find(item => item.postalCode === '00100');
        if (helsinki) {
            console.log('00100 Helsinki keskusta - Etu-Töölö:');
            console.log(`  Studio Apartments: ${helsinki.prices['Kerrostalo yksiöt'] || 'N/A'} €/m²`);
            console.log(`  One-bedroom Apartments: ${helsinki.prices['Kerrostalo kaksiot'] || 'N/A'} €/m²`);
            console.log(`  Two+ bedroom Apartments: ${helsinki.prices['Kerrostalo kolmiot+'] || 'N/A'} €/m²`);
            console.log(`  Row Houses: ${helsinki.prices['Rivitalot yhteensä'] || 'N/A'} €/m²`);
        } else {
            console.log('00100 Helsinki keskusta - Etu-Töölö: No data available');
        }

        // Example 2: "01670 Vantaanlaakso (Vantaa)"
        const vantaa = pricesByPostalCode.find(item => item.postalCode === '01670');
        if (vantaa) {
            console.log('\n01670 Vantaanlaakso:');
            console.log(`  Studio Apartments: ${vantaa.prices['Kerrostalo yksiöt'] || 'N/A'} €/m²`);
            console.log(`  One-bedroom Apartments: ${vantaa.prices['Kerrostalo kaksiot'] || 'N/A'} €/m²`);
            console.log(`  Two+ bedroom Apartments: ${vantaa.prices['Kerrostalo kolmiot+'] || 'N/A'} €/m²`);
            console.log(`  Row Houses: ${vantaa.prices['Rivitalot yhteensä'] || 'N/A'} €/m²`);
        } else {
            console.log('\n01670 Vantaanlaakso: No data available');
        }

        // Example 3: "01800 Klaukkala Keskus (Nurmijärvi)"
        const nurmijarvi = pricesByPostalCode.find(item => item.postalCode === '01800');
        if (nurmijarvi) {
            console.log('\n01800 Klaukkala Keskus:');
            console.log(`  Studio Apartments: ${nurmijarvi.prices['Kerrostalo yksiöt'] || 'N/A'} €/m²`);
            console.log(`  One-bedroom Apartments: ${nurmijarvi.prices['Kerrostalo kaksiot'] || 'N/A'} €/m²`);
            console.log(`  Two+ bedroom Apartments: ${nurmijarvi.prices['Kerrostalo kolmiot+'] || 'N/A'} €/m²`);
            console.log(`  Row Houses: ${nurmijarvi.prices['Rivitalot yhteensä'] || 'N/A'} €/m²`);
        } else {
            console.log('\n01800 Klaukkala Keskus: No data available');
        }

        console.log('\n--- Usage Instructions ---');
        console.log('To specify a different year, run the script with a year argument:');
        console.log('  npm run test:statfi -- 2022');

    } catch (error) {
        console.error('\n--- Error fetching or processing data from StatFin API ---');
        if (axios.isAxiosError(error)) {
            console.error('Status:', error.response?.status);
            console.error('API Error Message:', error.message);

            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    console.error('API Error Data:', error.response.data);
                } else {
                    console.error('API Error Data:', JSON.stringify(error.response.data, null, 2));
                }
            }
        } else {
            console.error('Error:', error);
        }
        console.error('\n--- End of Error ---');
    }
}

fetchPropertyData(); 
