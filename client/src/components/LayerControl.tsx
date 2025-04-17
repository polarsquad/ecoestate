import React from 'react';
import './LayerControl.css';

interface LayerControlProps {
    showGreenSpaces: boolean;
    onToggleGreenSpaces: () => void;
    // Add props for other layers (e.g., public transport) later
}

const LayerControl: React.FC<LayerControlProps> = ({
    showGreenSpaces,
    onToggleGreenSpaces
}) => {
    return (
        <div className="layer-control">
            <div className="layer-control-title">Map Layers</div>
            <label>
                <input
                    type="checkbox"
                    checked={showGreenSpaces}
                    onChange={onToggleGreenSpaces}
                />
                Green Spaces
            </label>
            {/* Add checkboxes for other layers here later */}
        </div>
    );
};

export default LayerControl; 
