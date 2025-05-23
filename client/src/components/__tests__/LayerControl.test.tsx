import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LayerControl from '../LayerControl';

describe('LayerControl', () => {
    it('renders the component with correct title', () => {
        render(
            <LayerControl
                showGreenSpaces={false}
                onToggleGreenSpaces={() => { }}
            />
        );

        expect(screen.getByText('Map Layers')).toBeInTheDocument();
        expect(screen.getByText('Green Spaces')).toBeInTheDocument();
    });

    it('displays checkbox as unchecked when showGreenSpaces is false', () => {
        render(
            <LayerControl
                showGreenSpaces={false}
                onToggleGreenSpaces={() => { }}
            />
        );

        const checkbox = screen.getByLabelText('Green Spaces') as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
    });

    it('displays checkbox as checked when showGreenSpaces is true', () => {
        render(
            <LayerControl
                showGreenSpaces={true}
                onToggleGreenSpaces={() => { }}
            />
        );

        const checkbox = screen.getByLabelText('Green Spaces') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
    });

    it('calls onToggleGreenSpaces when checkbox is clicked', () => {
        const mockToggle = vi.fn();

        render(
            <LayerControl
                showGreenSpaces={false}
                onToggleGreenSpaces={mockToggle}
            />
        );

        const checkbox = screen.getByLabelText('Green Spaces');
        fireEvent.click(checkbox);

        expect(mockToggle).toHaveBeenCalledTimes(1);
    });
}); 
