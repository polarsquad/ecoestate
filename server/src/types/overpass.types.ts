// Types for Overpass API JSON responses

export interface OverpassElementTags {
    [key: string]: string; // Tags are key-value pairs of strings
    // Optional specific tags removed to satisfy index signature
}

export interface OverpassElement {
    type: 'node' | 'way' | 'relation';
    id: number;
    lat?: number; // Latitude for nodes
    lon?: number; // Longitude for nodes
    timestamp?: string;
    version?: number;
    changeset?: number;
    user?: string;
    uid?: number;
    tags?: OverpassElementTags;
    // For ways:
    nodes?: number[];
    // For relations:
    members?: OverpassMember[];
    // For 'out center;' query:
    center?: {
        lat: number;
        lon: number;
    };
    // For 'out geom;' query:
    bounds?: {
        minlat: number;
        minlon: number;
        maxlat: number;
        maxlon: number;
    };
    geometry?: { // GeoJSON-like geometry
        type: string;
        coordinates: any[];
    }[];
}

export interface OverpassMember {
    type: 'node' | 'way' | 'relation';
    ref: number;
    role: string;
    // Geometry information might be included depending on query
    geometry?: {
        type: string;
        coordinates: any[];
    }[];
}


export interface OverpassOsm3s {
    timestamp_osm_base?: string;
    timestamp_areas_base?: string;
    copyright?: string;
}

export interface OverpassResponse {
    version?: number;
    generator?: string;
    osm3s?: OverpassOsm3s;
    elements: OverpassElement[];
    remark?: string; // Sometimes contains error messages
}
