import React from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import './Legend.css';

interface LegendProps {
    title?: string;
}

const Legend: React.FC<LegendProps> = ({ title = 'Property Prices (€/m²)' }) => {
    const map = useMap();

    React.useEffect(() => {
        // Create a Leaflet control for the legend
        const legend = new L.Control({ position: 'bottomright' });

        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'info legend');

            // Different legend content based on the title (determines if it's price or trend)
            if (title.includes('Price Trend')) {
                div.innerHTML = `
                <div class="legend-title">${title}</div>
                <div class="legend-item"><i style="background:#d73027"></i> ≤ -15%</div>
                <div class="legend-item"><i style="background:#fc8d59"></i> -15% to -5%</div>
                <div class="legend-item"><i style="background:#fee08b"></i> -5% to 0%</div>
                <div class="legend-item"><i style="background:#d9ef8b"></i> 0% to 5%</div>
                <div class="legend-item"><i style="background:#91cf60"></i> 5% to 15%</div>
                <div class="legend-item"><i style="background:#1a9850"></i> ≥ 15%</div>
                <div class="legend-item"><i style="background:#cccccc"></i> No data</div>
                `;
            } else {
                div.innerHTML = `
                <div class="legend-title">${title}</div>
                <div class="legend-item"><i style="background:#1a9850"></i> < 2000</div>
                <div class="legend-item"><i style="background:#91cf60"></i> 2000 - 3000</div>
                <div class="legend-item"><i style="background:#d9ef8b"></i> 3000 - 4000</div>
                <div class="legend-item"><i style="background:#fee08b"></i> 4000 - 5000</div>
                <div class="legend-item"><i style="background:#fc8d59"></i> 5000 - 6000</div>
                <div class="legend-item"><i style="background:#d73027"></i> > 6000</div>
                <div class="legend-item"><i style="background:#cccccc"></i> No data</div>
                `;
            }

            return div;
        };

        // Add legend to map
        legend.addTo(map);

        // Clean up on unmount
        return () => {
            legend.remove();
        };
    }, [map, title]);

    return null; // The component doesn't render anything directly
};

export default Legend; 
