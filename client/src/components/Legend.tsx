import React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import './Legend.css';
import { escapeHTML } from '../utils/stringUtils';

interface LegendProps {
    title?: string;
}

const Legend: React.FC<LegendProps> = ({ title = 'Property Prices (€/m²)' }) => {
    const map = useMap();
    const safeTitle = escapeHTML(title);

    React.useEffect(() => {
        // Create a Leaflet control for the legend
        const legend = new L.Control({ position: 'bottomright' });

        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'info legend');

            // Create and add title
            const titleDiv = document.createElement('div');
            titleDiv.className = 'legend-title';
            titleDiv.textContent = safeTitle;
            div.appendChild(titleDiv);

            // Define legend items based on type
            let items: { color: string; label: string }[] = [];
            if (safeTitle.includes('Price Trend')) {
                items = [
                    { color: '#d73027', label: ' ≤ -15%' },
                    { color: '#fc8d59', label: ' -15% to -5%' },
                    { color: '#fee08b', label: ' -5% to 0%' },
                    { color: '#d9ef8b', label: ' 0% to 5%' },
                    { color: '#91cf60', label: ' 5% to 15%' },
                    { color: '#1a9850', label: ' ≥ 15%' },
                    { color: '#cccccc', label: ' No data' },
                ];
            } else {
                items = [
                    { color: '#1a9850', label: ' < 2000' },
                    { color: '#91cf60', label: ' 2000 - 3000' },
                    { color: '#d9ef8b', label: ' 3000 - 4000' },
                    { color: '#fee08b', label: ' 4000 - 5000' },
                    { color: '#fc8d59', label: ' 5000 - 6000' },
                    { color: '#d73027', label: ' > 6000' },
                    { color: '#cccccc', label: ' No data' },
                ];
            }

            // Create and add legend items
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'legend-item';

                const colorBox = document.createElement('i');
                colorBox.style.background = item.color;
                itemDiv.appendChild(colorBox);

                itemDiv.appendChild(document.createTextNode(item.label));
                div.appendChild(itemDiv);
            });

            return div;
        };

        // Add legend to map
        legend.addTo(map);

        // Clean up on unmount
        return () => {
            legend.remove();
        };
    }, [map, safeTitle]);

    return null; // The component doesn't render anything directly
};

export default Legend; 
