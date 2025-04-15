import React from 'react';
import './VisualizationSelector.css';

export type VisualizationType = 'heatmap' | 'trend';

interface VisualizationSelectorProps {
    currentType: VisualizationType;
    onChange: (type: VisualizationType) => void;
}

const VisualizationSelector: React.FC<VisualizationSelectorProps> = ({
    currentType,
    onChange
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value as VisualizationType);
    };

    return (
        <div className="visualization-selector">
            <div className="visualization-selector-title">Visualization Type</div>
            <label>
                <input
                    type="radio"
                    name="visualizationType"
                    value="heatmap"
                    checked={currentType === 'heatmap'}
                    onChange={handleChange}
                />
                Price Heatmap
            </label>
            <label>
                <input
                    type="radio"
                    name="visualizationType"
                    value="trend"
                    checked={currentType === 'trend'}
                    onChange={handleChange}
                />
                Price Trend
            </label>
        </div>
    );
};

export default VisualizationSelector; 
