// Define basic GeoJSON types (can be expanded or imported from a library like '@types/geojson')

export interface GeoJSONGeometry {
    type: string; // e.g., 'Polygon', 'MultiPolygon'
    coordinates: any; // Structure depends on the type
}

export interface GeoJSONProperties {
    [key: string]: any; // Allow any properties
}

export interface GeoJSONFeature {
    type: 'Feature';
    id?: string | number;
    geometry: GeoJSONGeometry | null;
    properties: GeoJSONProperties | null;
}

export interface GeoJSONFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
    // We might need bbox and crs fields depending on the API response
} 
