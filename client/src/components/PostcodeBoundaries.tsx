import React, { useEffect, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import axios from 'axios';
import proj4 from 'proj4';
import { FeatureCollection, Feature } from 'geojson';
import L from 'leaflet';
import Legend from './Legend';

// Define the coordinate systems
// EPSG:3879 - Helsinki local coordinate system (used by HSY)
// EPSG:4326 - WGS84 (used by Leaflet)
proj4.defs('EPSG:3879', '+proj=tmerc +lat_0=0 +lon_0=25 +k=1 +x_0=25500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs +type=crs');

// Define interface for property price data
interface PropertyPrice {
    postalCode: string;
    district: string;
    municipality: string;
    fullLabel: string;
    prices: {
        [buildingType: string]: number | string;
    };
}

const PostcodeBoundaries: React.FC = () => {
    const [boundariesGeoJSON, setBoundariesGeoJSON] = useState<FeatureCollection | null>(null);
    const [propertyPrices, setPropertyPrices] = useState<PropertyPrice[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string>("2023"); // Default to 2023

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

    // Function to fetch property price data
    const fetchPropertyPrices = async (year: string) => {
        try {
            const response = await axios.get<{ data: PropertyPrice[] }>(`http://localhost:3001/api/property-prices?year=${year}`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching property prices:', error);
            return [];
        }
    };

    // Calculate color based on property price
    const getPriceColor = (postalCode: string): string => {
        if (!propertyPrices.length) {
            return '#cccccc'; // Use grey as default during load
        }

        const priceData = propertyPrices.find(p => p.postalCode === postalCode);

        if (!priceData) {
            return '#cccccc'; // Grey for no data match
        }

        // Get apartment price using keys matching the API response
        const apartmentTypes = [
            "Kerrostalo yksiöt",    // Studio Apartments
            "Kerrostalo kaksiot",   // One-bedroom Apartments
            "Kerrostalo kolmiot+", // Two+ bedroom Apartments
            "Rivitalot yhteensä"   // Row Houses (Total)
        ];

        let price: number | null = null;
        for (const type of apartmentTypes) {
            // Check if the key exists and the value is a valid number
            if (priceData.prices.hasOwnProperty(type) &&
                priceData.prices[type] !== 'N/A' &&
                !isNaN(Number(priceData.prices[type])) &&
                Number(priceData.prices[type]) > 0) // Ensure price is positive
            {
                price = Number(priceData.prices[type]);
                break; // Use the first valid price found in the preferred order
            }
        }

        if (price === null) return '#cccccc'; // Grey if no valid price found

        // Color scale based on price per square meter
        if (price < 2000) return '#1a9850'; // Green (low price)
        if (price < 3000) return '#91cf60';
        if (price < 4000) return '#d9ef8b';
        if (price < 5000) return '#fee08b';
        if (price < 6000) return '#fc8d59';
        return '#d73027'; // Red (high price)
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                setError(null); // Reset error state

                // Fetch both boundaries and property prices
                const [boundariesResponse, pricesData] = await Promise.all([
                    axios.get<FeatureCollection>('http://localhost:3001/api/postcodes'),
                    fetchPropertyPrices(selectedYear)
                ]);

                if (!boundariesResponse.data || !pricesData) {
                    throw new Error('Failed to fetch necessary data.');
                }

                // Transform coordinates from EPSG:3879 to EPSG:4326
                const transformedGeoJSON = transformCoordinates(boundariesResponse.data);

                // Add postal code from properties to feature properties for easier access
                transformedGeoJSON.features.forEach((feature: any) => {
                    // Use the correct property name "posno"
                    const props = feature.properties;
                    if (props && props.posno) { // Correct property name is "posno"
                        feature.properties.postalCode = props.posno;
                    } else {
                        // Optionally log if posno is missing for a feature
                        // console.warn('Feature missing posno property:', feature);
                    }
                });

                setBoundariesGeoJSON(transformedGeoJSON);
                setPropertyPrices(pricesData);
                setIsLoading(false);

            } catch (error: any) {
                console.error('Error loading data:', error);
                setError(error.message || 'Failed to load data');
                setIsLoading(false);
                setBoundariesGeoJSON(null); // Clear boundaries on error
                setPropertyPrices([]);      // Clear prices on error
            }
        };

        loadData();
    }, [map, selectedYear]); // Re-run if map instance or year changes

    // Style function for the GeoJSON layer
    const style = (feature?: Feature) => {
        // Ensure feature and properties exist before accessing them
        const postalCode = feature?.properties?.postalCode;
        return {
            fillColor: postalCode ? getPriceColor(postalCode) : '#cccccc', // Use grey if no postal code
            weight: 1,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
        };
    };

    // Handle for each feature
    const onEachFeature = (feature: Feature, layer: L.Layer) => {
        // Ensure feature and properties exist
        if (!feature || !feature.properties) {
            return;
        }

        const postalCode = feature.properties.postalCode;

        if (!postalCode) {
            return; // Skip if no postalCode property
        }

        const priceData = propertyPrices.find(p => p.postalCode === postalCode);

        let popupContent = '';

        if (postalCode) {
            popupContent = `<b>Postcode: ${postalCode}</b>`;

            if (priceData) {
                popupContent += `<br/><b>${priceData.district}, ${priceData.municipality}</b><br/><hr/>`;

                // Add price information using keys matching the API response
                const priceInfo = Object.entries(priceData.prices)
                    .filter(([key, price]) =>
                        price !== 'N/A' &&
                        !isNaN(Number(price)) &&
                        Number(price) > 0
                    )
                    .map(([type, price]) => `${type}: ${price} €/m²`);

                if (priceInfo.length > 0) {
                    popupContent += '<b>Avg. Prices (€/m²):</b><br/>';
                    popupContent += priceInfo.join('<br/>');
                } else {
                    popupContent += 'No valid price data available';
                }
            } else {
                popupContent += '<br/>No property price data found for this area';
            }
        }

        // Bind the popup content but don't open it automatically
        if (popupContent) {
            layer.bindPopup(popupContent);
        }

        // Add hover effects and popup control
        layer.on({
            mouseover: (e) => {
                const targetLayer = e.target;
                // Highlight feature
                targetLayer.setStyle({
                    weight: 3,
                    color: '#666',
                    dashArray: '',
                    fillOpacity: 0.8
                });
                targetLayer.bringToFront();
                // Open popup on hover
                targetLayer.openPopup();
            },
            mouseout: (e) => {
                const targetLayer = e.target;
                // Reset style
                targetLayer.setStyle(style(feature));
                // Close popup on mouse out
                targetLayer.closePopup();
            }
        });
    };

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '20px' }}>Loading map data...</div>;
    }

    if (error) {
        console.error('Rendering error:', error);
        // Provide more user-friendly error feedback
        return <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>Error loading map data: {error}</div>;
    }

    return boundariesGeoJSON && boundariesGeoJSON.features.length > 0 ? (
        <>
            <GeoJSON
                key={selectedYear} // Add key to force re-render when year changes
                data={boundariesGeoJSON}
                style={style as any} // Type assertion might be needed depending on library versions
                onEachFeature={onEachFeature}
            />
            <Legend title={`Property Prices (${selectedYear})`} />
        </>
    ) : (
        // Handle case where boundaries loaded but have no features
        <div style={{ textAlign: 'center', padding: '20px' }}>No postcode boundary data available.</div>
    );
};

export default PostcodeBoundaries; 
