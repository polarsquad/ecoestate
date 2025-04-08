// Types related to Statistics Finland (StatFi) API responses and processed data

// --- Raw JSON-stat Response Structure ---
export interface Category {
    index: { [key: string]: number };
    label: { [key: string]: string };
}

export interface Dimension {
    label: string;
    category: Category;
}

export interface JsonStatResponse {
    id: string[];
    size: number[];
    dimension: { [key: string]: Dimension };
    value: (number | string)[];
}

// --- Processed Data Structures ---
export interface BuildingPrices {
    [buildingType: string]: number | string; // Value can be number or 'N/A'
}

export interface PostalCodeData {
    postalCode: string;
    district: string;
    municipality: string;
    fullLabel: string; // Original label from API for reference
    prices: BuildingPrices;
}

// --- Type for console.table output in testStatFiApi.ts script ---
export interface TableRow {
    'Postal Code': string;
    'District': string;
    'Municipality': string;
    'Studio Apt (€/m²)': number | string;
    'One-bedroom Apt (€/m²)': number | string;
    'Two+ bedroom Apt (€/m²)': number | string;
    'Row House (€/m²)': number | string;
} 
