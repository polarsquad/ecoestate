import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS
import PostcodeBoundaries from './PostcodeBoundaries'; // Import the PostcodeBoundaries component

// Define Helsinki coordinates for the initial center
const HELSINKI_COORDINATES: [number, number] = [60.1699, 24.9384];
const INITIAL_ZOOM = 11;

// This internal component ensures the map properly handles size changes
const MapResizer: React.FC = () => {
    const map = useMap();

    useEffect(() => {
        // This handles any container size changes to ensure the map renders correctly
        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
        });

        const container = map.getContainer();
        resizeObserver.observe(container);

        // Cleanup function
        return () => {
            resizeObserver.disconnect();
        };
    }, [map]);

    return null;
};

const MapComponent: React.FC = () => {
    return (
        <div className="map-wrapper">
            <MapContainer
                center={HELSINKI_COORDINATES}
                zoom={INITIAL_ZOOM}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                className="map-container"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapResizer />
                <PostcodeBoundaries />
                {/* Markers, GeoJSON layers, etc., will be added here later */}
            </MapContainer>
        </div>
    );
};

export default MapComponent; 
