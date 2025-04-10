import React, { useEffect, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import axios from 'axios';
import proj4 from 'proj4';
import { FeatureCollection } from 'geojson';
import L from 'leaflet';

// Define the coordinate systems
// EPSG:3879 - Helsinki local coordinate system (used by HSY)
// EPSG:4326 - WGS84 (used by Leaflet)
proj4.defs('EPSG:3879', '+proj=tmerc +lat_0=0 +lon_0=25 +k=1 +x_0=25500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs +type=crs');

const PostcodeBoundaries: React.FC = () => {
    const [boundariesGeoJSON, setBoundariesGeoJSON] = useState<FeatureCollection | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const map = useMap();

    // Transform coordinates from EPSG:3879 to EPSG:4326
    const transformCoordinates = (geoJSON: FeatureCollection): FeatureCollection => {
        // Create a deep copy to avoid mutating the original object
        const transformed = JSON.parse(JSON.stringify(geoJSON));

        // Process each feature
        transformed.features.forEach((feature: any) => {
            if (feature.geometry.type === 'Polygon') {
                // Transform each coordinate in each ring of the polygon
                feature.geometry.coordinates.forEach((ring: number[][]) => {
                    for (let i = 0; i < ring.length; i++) {
                        // Coordinates in GeoJSON are [x, y] or [longitude, latitude]
                        // But in EPSG:3879 they are [easting, northing]
                        const [x, y] = ring[i];
                        // Transform to [longitude, latitude] for WGS84
                        const [lon, lat] = proj4('EPSG:3879', 'EPSG:4326', [x, y]);
                        ring[i] = [lon, lat];
                    }
                });
            }
            else if (feature.geometry.type === 'MultiPolygon') {
                // Handle MultiPolygon (array of Polygons)
                // Each polygon in a MultiPolygon is an array of rings
                feature.geometry.coordinates.forEach((polygon: number[][][]) => {
                    polygon.forEach((ring: number[][]) => {
                        for (let i = 0; i < ring.length; i++) {
                            const [x, y] = ring[i];
                            const [lon, lat] = proj4('EPSG:3879', 'EPSG:4326', [x, y]);
                            ring[i] = [lon, lat];
                        }
                    });
                });
            }
        });

        return transformed;
    };

    useEffect(() => {
        const fetchBoundaries = async () => {
            try {
                setIsLoading(true);
                const response = await axios.get<FeatureCollection>('http://localhost:3001/api/postcodes');

                // Transform coordinates from EPSG:3879 to EPSG:4326
                const transformedGeoJSON = transformCoordinates(response.data);

                setBoundariesGeoJSON(transformedGeoJSON);
                setIsLoading(false);

                // Remove the automatic bounds fitting that was causing the map to zoom out
                // Instead, let the map maintain its initial center and zoom set in MapComponent
            } catch (error) {
                console.error('Error fetching postcode boundaries:', error);
                setError('Failed to load postcode boundaries');
                setIsLoading(false);
            }
        };

        fetchBoundaries();
    }, [map]);

    // Style function for the GeoJSON layer
    const style = () => {
        return {
            fillColor: '#3388ff',
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.2
        };
    };

    // Handle for each feature
    const onEachFeature = (feature: any, layer: L.Layer) => {
        // Add popups with postcode information if available
        if (feature.properties && feature.properties.posnro) {
            layer.bindPopup(`Postcode: ${feature.properties.posnro}`);
        } else if (feature.properties && feature.properties.posti_alue) {
            layer.bindPopup(`Postcode: ${feature.properties.posti_alue}`);
        }
    };

    if (isLoading) {
        return null; // or return a loading indicator
    }

    if (error) {
        console.error(error);
        return null; // or display an error message
    }

    return boundariesGeoJSON ? (
        <GeoJSON
            data={boundariesGeoJSON}
            style={style}
            onEachFeature={onEachFeature}
        />
    ) : null;
};

export default PostcodeBoundaries; 
