// Types for Digitransit GraphQL API responses

export interface DigitransitRoute {
    shortName?: string;
}

export interface DigitransitPattern {
    code?: string;
    route?: DigitransitRoute;
}

export interface DigitransitStop {
    gtfsId: string;
    name: string;
    code?: string;
    lat: number;
    lon: number;
    patterns?: DigitransitPattern[];
}

// Structure based on the simplified query result
export interface DigitransitStopsQueryResult {
    stops: DigitransitStop[];
} 
