import React, { useRef, useEffect } from 'react';
import L from 'leaflet';
import './PeriodSlider.css'; // Use dedicated CSS file

interface PeriodSliderProps {
    minYear: number;
    maxYear: number;
    endYear: number;
    onChange: (endYear: number) => void;
    periodLength?: number;
}

const PeriodSlider: React.FC<PeriodSliderProps> = ({
    minYear,
    maxYear,
    endYear,
    onChange,
    periodLength = 5
}) => {
    const sliderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Disable click propagation on the slider container to prevent map dragging
        if (sliderRef.current) {
            L.DomEvent.disableClickPropagation(sliderRef.current);
            // Optional: disable scroll propagation if needed
            // L.DomEvent.disableScrollPropagation(sliderRef.current);
        }
    }, []); // Run only once on mount

    // Calculate the valid range for the end year
    // The earliest end year must be minYear + (periodLength - 1) to ensure the period doesn't go below minYear
    const earliestEndYear = minYear + (periodLength - 1);
    const adjustedMinYear = Math.max(minYear, earliestEndYear);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEndYear = parseInt(e.target.value);
        onChange(newEndYear);
    };

    // Calculate the start year based on the current end year
    const startYear = endYear - (periodLength - 1);

    return (
        <div ref={sliderRef} className="year-slider">
            <div className="year-slider-label">
                Price Trend Period: {startYear}-{endYear} ({periodLength} years)
            </div>
            <input
                type="range"
                min={adjustedMinYear}
                max={maxYear}
                value={endYear}
                onChange={handleChange}
                className="year-slider-input"
            />
            <div className="year-slider-values">
                <span>{adjustedMinYear}</span>
                <span>{maxYear}</span>
            </div>
        </div>
    );
};

export default PeriodSlider; 
