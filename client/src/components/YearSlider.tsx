import React, { useRef, useEffect } from 'react';
import L from 'leaflet'; // Import Leaflet
import './YearSlider.css'; // We'll create this CSS file

interface YearSliderProps {
    minYear: number;
    maxYear: number;
    selectedYear: number;
    onChange: (year: number) => void;
}

const YearSlider: React.FC<YearSliderProps> = ({
    minYear,
    maxYear,
    selectedYear,
    onChange
}) => {
    const sliderRef = useRef<HTMLDivElement>(null); // Create a ref for the container

    useEffect(() => {
        // Disable click propagation on the slider container to prevent map dragging
        if (sliderRef.current) {
            L.DomEvent.disableClickPropagation(sliderRef.current);
            // Optional: disable scroll propagation if needed, though usually not required for sliders
            // L.DomEvent.disableScrollPropagation(sliderRef.current);
        }
    }, []); // Run only once on mount

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(parseInt(event.target.value, 10));
    };

    return (
        // Attach the ref to the container div
        <div ref={sliderRef} className="year-slider">
            <div className="year-slider-label">Year: {selectedYear}</div>
            <input
                type="range"
                min={minYear}
                max={maxYear}
                step="1"
                value={selectedYear}
                onChange={handleChange}
                className="year-slider-input"
            />
            <div className="year-slider-values">
                <span>{minYear}</span>
                <span>{maxYear}</span>
            </div>
        </div>
    );
};

export default YearSlider; 
