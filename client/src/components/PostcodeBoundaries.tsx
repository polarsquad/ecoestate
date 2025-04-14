import React, { useEffect, useState, useCallback } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import axios from 'axios';
import proj4 from 'proj4';
import { FeatureCollection, Feature } from 'geojson';
import L from 'leaflet';
import Legend from './Legend';
import YearSlider from './YearSlider';

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

const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = 2010;
const DEFAULT_YEAR = 2023;

const PostcodeBoundaries: React.FC = () => {
    const [boundariesGeoJSON, setBoundariesGeoJSON] = useState<FeatureCollection | null>(null);
    const [propertyPrices, setPropertyPrices] = useState<PropertyPrice[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<number>(DEFAULT_YEAR);

    const map = useMap();

    // Handler for year change from slider
    const handleYearChange = useCallback((year: number) => {
        setSelectedYear(year);
    }, []);

    // Transform coordinates from EPSG:3879 to EPSG:4326
    const transformCoordinates = useCallback((geoJSON: FeatureCollection): FeatureCollection => {
        // Create a deep copy to avoid mutating the original object
        const transformed = JSON.parse(JSON.stringify(geoJSON));

        // Process each feature
        transformed.features.forEach((feature: any) => {
            if (feature.geometry.type === 'Polygon') {
                // Transform each coordinate in each ring of the polygon
                feature.geometry.coordinates.forEach((ring: number[][]) => {
                    for (let i = 0; i < ring.length; i++) {
                        const [x, y] = ring[i];
                        const [lon, lat] = proj4('EPSG:3879', 'EPSG:4326', [x, y]);
                        ring[i] = [lon, lat];
                    }
                });
            }
            else if (feature.geometry.type === 'MultiPolygon') {
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
    }, []);

    // Function to fetch property price data
    const fetchPropertyPrices = useCallback(async (year: number) => {
        // API expects year as string
        const yearString = year.toString();
        try {
            const response = await axios.get<{ data: PropertyPrice[] }>(`http://localhost:3001/api/property-prices?year=${yearString}`);
            return response.data.data;
        } catch (error) {
            console.error(`Error fetching property prices for year ${yearString}:`, error);
            throw new Error(`Failed to fetch property prices for ${yearString}.`);
        }
    }, []);

    // Calculate color based on property price
    const getPriceColor = useCallback((postalCode: string): string => {
        if (!propertyPrices.length) {
            return '#cccccc'; // Use grey as default during load
        }
        const priceData = propertyPrices.find(p => p.postalCode === postalCode);
        if (!priceData) {
            return '#cccccc'; // Grey for no data match
        }
        const apartmentTypes = [
            "Kerrostalo yksiöt", "Kerrostalo kaksiot", "Kerrostalo kolmiot+", "Rivitalot yhteensä"
        ];
        let price: number | null = null;
        for (const type of apartmentTypes) {
            if (priceData.prices.hasOwnProperty(type) &&
                priceData.prices[type] !== 'N/A' &&
                !isNaN(Number(priceData.prices[type])) &&
                Number(priceData.prices[type]) > 0) {
                price = Number(priceData.prices[type]);
                break;
            }
        }
        if (price === null) return '#cccccc';
        if (price < 2000) return '#1a9850';
        if (price < 3000) return '#91cf60';
        if (price < 4000) return '#d9ef8b';
        if (price < 5000) return '#fee08b';
        if (price < 6000) return '#fc8d59';
        return '#d73027';
    }, [propertyPrices]);

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            if (!isMounted) return;
            setIsLoading(true);
            setError(null);
            try {
                const pricesData = await fetchPropertyPrices(selectedYear);
                let currentBoundaries = boundariesGeoJSON;
                if (!currentBoundaries) {
                    const boundariesResponse = await axios.get<FeatureCollection>('http://localhost:3001/api/postcodes');
                    if (!boundariesResponse.data) {
                        throw new Error('Failed to fetch boundary data.');
                    }
                    currentBoundaries = transformCoordinates(boundariesResponse.data);
                    currentBoundaries.features.forEach((feature: any) => {
                        const props = feature.properties;
                        if (props && props.posno) {
                            feature.properties.postalCode = props.posno;
                        }
                    });
                }
                if (isMounted) {
                    setBoundariesGeoJSON(currentBoundaries);
                    setPropertyPrices(pricesData);
                    setIsLoading(false);
                }
            } catch (error: any) {
                console.error('Error loading data:', error);
                if (isMounted) {
                    setError(error.message || 'Failed to load data');
                    setIsLoading(false);
                    setPropertyPrices([]);
                }
            }
        };
        loadData();
        return () => { isMounted = false; };
    }, [selectedYear, boundariesGeoJSON, fetchPropertyPrices, transformCoordinates]);

    // Style function for the GeoJSON layer
    const style = useCallback((feature?: Feature) => {
        const postalCode = feature?.properties?.postalCode;
        return {
            fillColor: postalCode ? getPriceColor(postalCode) : '#cccccc',
            weight: 1, opacity: 1, color: 'white', dashArray: '3', fillOpacity: 0.7
        };
    }, [getPriceColor]);

    // Handle for each feature
    const onEachFeature = useCallback((feature: Feature, layer: L.Layer) => {
        if (!feature || !feature.properties) return;
        const postalCode = feature.properties.postalCode;
        if (!postalCode) return;

        const priceData = propertyPrices.find(p => p.postalCode === postalCode);
        let tooltipContent = `<b>Postcode: ${postalCode}</b>`; // Start with postcode
        if (priceData) {
            tooltipContent += `<br/><b>${priceData.district}, ${priceData.municipality}</b><br/><hr/>`;
            const priceInfo = Object.entries(priceData.prices)
                .filter(([key, price]) => price !== 'N/A' && !isNaN(Number(price)) && Number(price) > 0)
                .map(([type, price]) => `${type}: ${price} €/m²`);
            if (priceInfo.length > 0) {
                tooltipContent += '<b>Avg. Prices (€/m²):</b><br/>' + priceInfo.join('<br/>');
            } else {
                tooltipContent += 'No valid price data available';
            }
        } else {
            tooltipContent += '<br/>No property price data found for this area';
        }

        // Bind sticky tooltip instead of popup
        layer.bindTooltip(tooltipContent, {
            sticky: true,
            className: 'custom-tooltip' // Optional: Add a class for styling
        });

        // Remove previous listeners to prevent duplicates
        layer.off();
        layer.on({
            mouseover: (e) => {
                const targetLayer = e.target;
                targetLayer.setStyle({ weight: 3, color: '#666', dashArray: '', fillOpacity: 0.8 });
                targetLayer.bringToFront();
                // Explicitly open the tooltip on hover
                targetLayer.openTooltip();
            },
            mouseout: (e) => {
                const targetLayer = e.target;
                targetLayer.setStyle(style(feature)); // Use the style function
                // Explicitly close the tooltip on mouseout
                targetLayer.closeTooltip();
            }
        });
    }, [propertyPrices, style]);

    if (isLoading && !boundariesGeoJSON) {
        return <div style={{ textAlign: 'center', padding: '20px' }}>Loading map data...</div>;
    }
    if (error && !boundariesGeoJSON) {
        console.error('Rendering error:', error);
        return <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>Error loading map data: {error}</div>;
    }
    const priceError = error && boundariesGeoJSON ? <div style={{ position: 'absolute', top: 60, left: 10, background: 'rgba(255,0,0,0.7)', color: 'white', padding: '5px', zIndex: 1000, borderRadius: '4px' }}>Error loading price data for {selectedYear}</div> : null;

    return (
        <>
            {priceError}
            {boundariesGeoJSON && boundariesGeoJSON.features.length > 0 ? (
                <GeoJSON
                    key={selectedYear}
                    data={boundariesGeoJSON}
                    style={style as any}
                    onEachFeature={onEachFeature}
                />
            ) : (
                !isLoading && <div style={{ textAlign: 'center', padding: '20px' }}>No postcode boundary data available.</div>
            )}
            <Legend title={`Property Prices (€/m²)`} />
            <YearSlider
                minYear={START_YEAR}
                maxYear={CURRENT_YEAR - 1}
                selectedYear={selectedYear}
                onChange={handleYearChange}
            />
        </>
    );
};

export default PostcodeBoundaries; 
