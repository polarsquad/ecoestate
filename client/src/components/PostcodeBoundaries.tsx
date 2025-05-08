import React, { useEffect, useState, useCallback } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import axios, { AxiosResponse } from 'axios';
import proj4 from 'proj4';
import L from 'leaflet';
import { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import Legend from './Legend';
import YearSlider from './YearSlider';
import PeriodSlider from './PeriodSlider';
import VisualizationSelector, { VisualizationType } from './VisualizationSelector';
import LayerControl from './LayerControl';
import { escapeHTML } from '../utils/stringUtils';

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

// Define interface for price trend data
interface PriceTrend {
    postalCode: string;
    district: string;
    municipality: string;
    fullLabel: string;
    trends: {
        [buildingType: string]: {
            percentChange: number;
            direction: 'up' | 'down' | 'stable';
            startPrice: number | null;
            endPrice: number | null;
            averageYearlyChange: number;
        } | null;
    };
}

// Green Space specific type
// Use intersection type instead of extends
type GreenSpaceProperties = GeoJsonProperties & {
    name?: string;
    // Add other potential properties from OSM if needed
};

const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = 2010;
const DEFAULT_YEAR = 2024;

const GREEN_SPACE_PANE = 'greenSpacePane';

// Flag to completely disable green spaces functionality
const GREEN_SPACES_ENABLED = false;

const PostcodeBoundaries: React.FC = () => {
    const [boundariesGeoJSON, setBoundariesGeoJSON] = useState<FeatureCollection | null>(null);
    const [propertyPrices, setPropertyPrices] = useState<PropertyPrice[]>([]);
    const [priceTrends, setPriceTrends] = useState<PriceTrend[]>([]);
    const [greenSpacesGeoJSON, setGreenSpacesGeoJSON] = useState<FeatureCollection<Geometry, GreenSpaceProperties> | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<number>(DEFAULT_YEAR);
    const [selectedEndYear, setSelectedEndYear] = useState<number>(DEFAULT_YEAR);
    const [visualizationType, setVisualizationType] = useState<VisualizationType>('heatmap');

    const [boundariesLoaded, setBoundariesLoaded] = useState<boolean>(false);
    const [dataLoadedForMode, setDataLoadedForMode] = useState<boolean>(false);
    const [greenSpacesLoading, setGreenSpacesLoading] = useState<boolean>(false);
    const [showGreenSpaces, setShowGreenSpaces] = useState<boolean>(false); // Default to false since disabled

    // Kept for future - show UI controls for map layers (currently disabled)
    const [showLayerControls] = useState<boolean>(false);

    const map = useMap(); // Get map instance

    const handleYearChange = useCallback((year: number) => {
        setSelectedYear(year);
    }, []);

    const handlePeriodChange = useCallback((endYear: number) => {
        setSelectedEndYear(endYear);
    }, []);

    const handleVisualizationChange = useCallback((type: VisualizationType) => {
        setVisualizationType(type);
        setDataLoadedForMode(false);
    }, []);

    const handleToggleGreenSpaces = useCallback(() => {
        setShowGreenSpaces(prev => !prev);
    }, []);

    const transformCoordinates = useCallback((geoJSON: FeatureCollection): FeatureCollection => {
        const transformed = JSON.parse(JSON.stringify(geoJSON));

        transformed.features.forEach((feature: Feature) => {
            if (feature.geometry.type === 'Polygon') {
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

    const fetchPropertyPrices = useCallback(async (year: number) => {
        const yearString = year.toString();
        try {
            const response = await axios.get<{ data: PropertyPrice[] }>(`/api/property-prices?year=${yearString}`);
            return response.data.data;
        } catch (error) {
            console.error(`Error fetching property prices for year ${yearString}:`, error);
            throw new Error(`Failed to fetch property prices for ${yearString}.`);
        }
    }, []);

    const fetchPriceTrends = useCallback(async (endYear: number) => {
        try {
            const response = await axios.get<{ data: PriceTrend[] }>(`/api/property-prices/trends?endYear=${endYear}`);
            return response.data.data;
        } catch (error) {
            console.error(`Error fetching price trends ending at ${endYear}:`, error);
            throw new Error(`Failed to fetch price trends ending at ${endYear}.`);
        }
    }, []);

    const fetchGreenSpacesData = useCallback(async () => {
        // Skip if green spaces are disabled
        if (!GREEN_SPACES_ENABLED) {
            console.log('Green spaces functionality is disabled');
            return;
        }

        setGreenSpacesLoading(true);
        try {
            console.log(`Fetching green spaces for Helsinki region...`)
            const response = await axios.get<FeatureCollection<Geometry, GreenSpaceProperties>>(`/api/map-data/green-spaces`);

            if (response.data?.type === 'FeatureCollection') {
                setGreenSpacesGeoJSON(response.data);
                console.log(`Green spaces loaded: ${response.data.features.length} features`);
            } else {
                console.warn('Received invalid green space data structure:', response.data);
                setGreenSpacesGeoJSON(null);
            }
        } catch (error) {
            console.error(`Error fetching green spaces:`, error);
            // Optionally set an error state specific to green spaces
            // setGreenSpacesError('Failed to load green spaces.');
        } finally {
            setGreenSpacesLoading(false);
        }
    }, []);

    const getPriceColor = useCallback((postalCode: string): string => {
        if (!propertyPrices.length) {
            return '#cccccc';
        }
        const priceData = propertyPrices.find(p => p.postalCode === postalCode);
        if (!priceData) {
            return '#cccccc';
        }
        const apartmentTypes = [
            "Kerrostalo yksiöt", "Kerrostalo kaksiot", "Kerrostalo kolmiot+", "Rivitalot yhteensä"
        ];
        let price: number | null = null;
        for (const type of apartmentTypes) {
            // Use Object.hasOwn for safer check
            // Reverted to hasOwnProperty due to TS target version
            // eslint-disable-next-line no-prototype-builtins
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

    const getTrendColor = useCallback((postalCode: string): string => {
        if (!priceTrends.length) {
            return '#cccccc';
        }

        const trendData = priceTrends.find(p => p.postalCode === postalCode);
        if (!trendData) {
            return '#cccccc';
        }

        const apartmentTypes = [
            "Kerrostalo yksiöt", "Kerrostalo kaksiot", "Kerrostalo kolmiot+", "Rivitalot yhteensä"
        ];

        const changes: number[] = [];
        for (const type of apartmentTypes) {
            if (trendData.trends[type] && trendData.trends[type]?.percentChange !== undefined) {
                changes.push(trendData.trends[type]!.percentChange);
            }
        }

        if (changes.length === 0) return '#cccccc';
        const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;

        if (avgChange <= -15) return '#d73027';
        if (avgChange < -5) return '#fc8d59';
        if (avgChange < 0) return '#fee08b';
        if (avgChange < 5) return '#d9ef8b';
        if (avgChange < 15) return '#91cf60';
        return '#1a9850';
    }, [priceTrends]);

    const getFeatureColor = useCallback((postalCode: string): string => {
        switch (visualizationType) {
            case 'trend':
                return getTrendColor(postalCode);
            case 'heatmap':
            default:
                return getPriceColor(postalCode);
        }
    }, [getPriceColor, getTrendColor, visualizationType]);

    const styleBoundaries = useCallback((feature?: Feature) => {
        const postalCode = feature?.properties?.postalCode;
        const defaultStyle = { weight: 1, opacity: 1, color: 'white', dashArray: '3', fillOpacity: 0.7, fillColor: '#cccccc' };

        if (!postalCode || !dataLoadedForMode) {
            return defaultStyle;
        }

        return {
            ...defaultStyle,
            fillColor: getFeatureColor(postalCode),
        };
    }, [getFeatureColor, dataLoadedForMode]);

    const styleGreenSpaces = () => {
        return {
            fillColor: '#228B22', // ForestGreen
            fillOpacity: 0.5,
            color: '#1A681A', // Darker green border
            weight: 1,
        };
    };

    const onEachBoundaryFeature = useCallback((feature: Feature, layer: L.Layer) => {
        if (!feature || !feature.properties) return;
        const postalCode = feature.properties.postalCode;
        if (!postalCode) return;

        const getTooltipContent = () => {
            let content = `<b>Postcode: ${escapeHTML(postalCode)}</b>`;
            if (!dataLoadedForMode) {
                content += `<br/><i>Loading data...</i>`;
                return content;
            }

            if (visualizationType === 'heatmap') {
                const priceData = propertyPrices.find(p => p.postalCode === postalCode);
                if (priceData) {
                    content += `<br/><b>${escapeHTML(priceData.district)}, ${escapeHTML(priceData.municipality)}</b><br/><hr/>`;
                    const priceInfo = Object.entries(priceData.prices)
                        .filter(([, price]) => price !== 'N/A' && !isNaN(Number(price)) && Number(price) > 0)
                        .map(([type, price]) => `${escapeHTML(type)}: ${escapeHTML(price)} €/m²`);
                    if (priceInfo.length > 0) {
                        content += '<b>Avg. Prices (€/m²):</b><br/>' + priceInfo.join('<br/>');
                    } else {
                        content += 'No valid price data available for this year';
                    }
                } else {
                    content += '<br/>No property price data found for this year';
                }
            } else if (visualizationType === 'trend') {
                const trendData = priceTrends.find(p => p.postalCode === postalCode);
                if (trendData) {
                    content += `<br/><b>${escapeHTML(trendData.district)}, ${escapeHTML(trendData.municipality)}</b><br/><hr/>`;
                    content += `<b>Price Trends (${escapeHTML(selectedEndYear - 4)}-${escapeHTML(selectedEndYear)}):</b><br/>`;
                    const trendInfo = Object.entries(trendData.trends)
                        .filter(([, data]) => data !== null)
                        .map(([type, data]) => {
                            if (!data) return '';
                            const directionArrow = data.direction === 'up' ? '↑' : data.direction === 'down' ? '↓' : '→';
                            // Ensure all parts are escaped, especially type and potentially prices if they could be strings
                            const startPriceStr = data.startPrice !== null ? escapeHTML(data.startPrice) : 'N/A';
                            const endPriceStr = data.endPrice !== null ? escapeHTML(data.endPrice) : 'N/A';
                            return `${escapeHTML(type)}: ${escapeHTML(data.percentChange.toFixed(1))}% ${directionArrow} (${startPriceStr} → ${endPriceStr} €/m²)`;
                        })
                        .filter(info => info !== '');
                    if (trendInfo.length > 0) {
                        content += trendInfo.join('<br/>');
                    } else {
                        content += 'No valid trend data available for this period';
                    }
                } else {
                    content += '<br/>No price trend data found for this period';
                }
            }
            return content;
        };

        layer.bindTooltip(getTooltipContent, {
            sticky: true,
            className: 'custom-tooltip'
        });

        layer.off();
        layer.on({
            mouseover: (e) => {
                const targetLayer = e.target;
                targetLayer.setTooltipContent(getTooltipContent());
                targetLayer.setStyle({ weight: 3, color: '#666', dashArray: '', fillOpacity: 0.8 });
                targetLayer.openTooltip();
            },
            mouseout: (e) => {
                const targetLayer = e.target;
                const baseStyle = styleBoundaries(feature);
                targetLayer.setStyle(baseStyle);
                targetLayer.closeTooltip();
            }
        });
    }, [propertyPrices, priceTrends, visualizationType, styleBoundaries, selectedEndYear, dataLoadedForMode]);

    const onEachGreenSpaceFeature = (feature: Feature<Geometry, GreenSpaceProperties>, layer: L.Layer) => {
        if (feature.properties?.name) {
            layer.bindTooltip(escapeHTML(feature.properties.name));
        }
    };

    // Effect to create custom map pane for green spaces
    useEffect(() => {
        if (map && GREEN_SPACES_ENABLED) {
            map.createPane(GREEN_SPACE_PANE);
            const pane = map.getPane(GREEN_SPACE_PANE);
            if (pane) {
                pane.style.zIndex = '410'; // Above default overlay pane (400)
            }
        }
    }, [map]); // Run when map instance is available

    // Effect to load boundaries and green spaces
    useEffect(() => {
        let isMounted = true;
        const fetchBoundariesAndGreenSpaces = async () => {
            if (boundariesGeoJSON) return;
            console.log("Attempting to fetch boundaries...");
            setIsLoading(true);
            setError(null);
            try {
                // Explicitly type the FeatureCollection generics
                const boundariesResponse: AxiosResponse<FeatureCollection<Geometry, GeoJsonProperties>> = await axios.get<FeatureCollection>('/api/postcodes');

                // Robust check for valid FeatureCollection structure
                if (!boundariesResponse.data ||
                    !boundariesResponse.data.features ||
                    !Array.isArray(boundariesResponse.data.features) ||
                    boundariesResponse.data.features.length === 0) {
                    console.error("Invalid boundary data received:", boundariesResponse.data);
                    throw new Error('Failed to fetch boundary data (invalid, empty, or missing features array).');
                }

                const transformedBoundaries = transformCoordinates(boundariesResponse.data);
                transformedBoundaries.features.forEach((feature: any) => {
                    const props = feature.properties;
                    if (props && props.posno) {
                        feature.properties.postalCode = props.posno;
                    } else {
                        // Log if a feature is missing the postcode property
                        // console.warn('Feature missing posno property:', feature.properties);
                    }
                });
                if (isMounted) {
                    console.log("Boundaries fetched and transformed successfully.");
                    setBoundariesGeoJSON(transformedBoundaries);
                    setBoundariesLoaded(true);

                    // Only fetch green spaces if enabled
                    if (GREEN_SPACES_ENABLED) {
                        fetchGreenSpacesData();
                    }
                }
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.error('Error fetching boundaries:', err);
                if (isMounted) {
                    setError(`Failed to load boundary data: ${errorMessage}`);
                    setIsLoading(false);
                    setBoundariesLoaded(false);
                }
            }
        };
        fetchBoundariesAndGreenSpaces();
        return () => { isMounted = false; };
    }, [transformCoordinates, fetchGreenSpacesData, boundariesGeoJSON]);

    useEffect(() => {
        if (!boundariesLoaded) {
            console.log("Skipping mode data fetch: Boundaries not loaded yet.");
            return;
        }

        let isMounted = true;
        const loadModeData = async () => {
            console.log(`Fetching data for mode: ${visualizationType}, year/period: ${visualizationType === 'heatmap' ? selectedYear : selectedEndYear}`);
            setDataLoadedForMode(false);
            setIsLoading(true);
            setError(null);

            try {
                if (visualizationType === 'heatmap') {
                    const pricesData = await fetchPropertyPrices(selectedYear);
                    if (isMounted) {
                        setPropertyPrices(pricesData);
                        setPriceTrends([]);
                        setDataLoadedForMode(true);
                        console.log(`Heatmap data loaded for ${selectedYear}`);
                    }
                } else if (visualizationType === 'trend') {
                    const trendsData = await fetchPriceTrends(selectedEndYear);
                    if (isMounted) {
                        setPriceTrends(trendsData);
                        setPropertyPrices([]);
                        setDataLoadedForMode(true);
                        console.log(`Trend data loaded for period ending ${selectedEndYear}`);
                    }
                }
                if (isMounted) {
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.error(`Error loading ${visualizationType} data:`, err);
                if (isMounted) {
                    setError(errorMessage || `Failed to load ${visualizationType} data`);
                    setIsLoading(false);
                    setPropertyPrices([]);
                    setPriceTrends([]);
                    setDataLoadedForMode(false);
                }
            }
        };

        loadModeData();
        return () => { isMounted = false; };
    }, [visualizationType, selectedYear, selectedEndYear, boundariesLoaded, fetchPropertyPrices, fetchPriceTrends]);

    if (!boundariesLoaded && isLoading) {
        return <div style={{ textAlign: 'center', padding: '20px' }}>Loading map data...</div>;
    }
    if (error) {
        return <div style={{ color: 'red', textAlign: 'center', padding: '20px' }}>Error: {error}</div>;
    }
    if (boundariesLoaded && (!boundariesGeoJSON || boundariesGeoJSON.features.length === 0)) {
        return <div style={{ textAlign: 'center', padding: '20px' }}>No postcode boundary data available.</div>;
    }

    const modeDataIsLoading = isLoading && boundariesLoaded;
    const showGeoJson = boundariesLoaded && dataLoadedForMode;

    const legendTitle = visualizationType === 'heatmap'
        ? `Property Prices (€/m²)`
        : `Price Trend ${selectedEndYear - 4}-${selectedEndYear}`;

    return (
        <>
            {modeDataIsLoading && (
                <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '5px 10px', borderRadius: '3px', zIndex: 1100 }}>
                    Loading {visualizationType} data...
                </div>
            )}

            {showGeoJson && boundariesGeoJSON && boundariesGeoJSON.features.length > 0 ? (
                <GeoJSON
                    key={`${visualizationType}-${selectedYear}-${selectedEndYear}`}
                    data={boundariesGeoJSON}
                    style={styleBoundaries}
                    onEachFeature={onEachBoundaryFeature}
                />
            ) : (
                boundariesLoaded && !showGeoJson && !modeDataIsLoading && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>Select a visualization type.</div>
                )
            )}

            <div className="top-right-controls">
                <VisualizationSelector currentType={visualizationType} onChange={handleVisualizationChange} />

                {/* Only show layer controls if enabled */}
                {showLayerControls && (
                    <LayerControl
                        showGreenSpaces={showGreenSpaces}
                        onToggleGreenSpaces={handleToggleGreenSpaces}
                    />
                )}
            </div>

            {/* Only render green spaces if enabled and loaded */}
            {GREEN_SPACES_ENABLED && showGreenSpaces && greenSpacesGeoJSON && (
                <GeoJSON
                    key="green-spaces"
                    data={greenSpacesGeoJSON}
                    style={styleGreenSpaces}
                    onEachFeature={onEachGreenSpaceFeature}
                    pane={GREEN_SPACE_PANE}
                />
            )}

            {GREEN_SPACES_ENABLED && greenSpacesLoading && (
                <div className="loading-indicator-small">Loading Green Spaces...</div>
            )}

            {boundariesLoaded && (
                <>
                    <Legend title={legendTitle} />
                    {visualizationType === 'heatmap' ? (
                        <YearSlider
                            key="year-slider"
                            minYear={START_YEAR}
                            maxYear={CURRENT_YEAR - 1}
                            selectedYear={selectedYear}
                            onChange={handleYearChange}
                        />
                    ) : (
                        <PeriodSlider
                            key="period-slider"
                            minYear={START_YEAR}
                            maxYear={CURRENT_YEAR - 1}
                            endYear={selectedEndYear}
                            onChange={handlePeriodChange}
                        />
                    )}
                </>
            )}
        </>
    );
};

export default PostcodeBoundaries; 
