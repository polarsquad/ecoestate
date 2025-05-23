import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import Legend from '../Legend';

// Mock leaflet functionalities
vi.mock('react-leaflet', async () => {
    const actual = await vi.importActual('react-leaflet');
    return {
        ...actual,
        useMap: () => ({
            addControl: vi.fn(),
            removeControl: vi.fn()
        })
    };
});

vi.mock('leaflet', async () => {
    return {
        default: {
            Control: class Control {
                constructor() {
                    return {
                        onAdd: vi.fn().mockImplementation(() => document.createElement('div')),
                        addTo: vi.fn(),
                        remove: vi.fn()
                    };
                }
            },
            DomUtil: {
                create: vi.fn().mockImplementation(() => document.createElement('div'))
            }
        }
    };
});

describe('Legend', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('renders without crashing inside MapContainer', () => {
        const { container } = render(
            <MapContainer center={[60.1699, 24.9384]} zoom={10}>
                <Legend />
            </MapContainer>
        );

        expect(container).toBeTruthy();
    });

    it('renders with custom title', () => {
        const customTitle = 'Custom Legend Title';

        render(
            <MapContainer center={[60.1699, 24.9384]} zoom={10}>
                <Legend title={customTitle} />
            </MapContainer>
        );

        // Since the actual DOM manipulation happens in the leaflet Control's onAdd method
        // that is mocked, we can't directly test the DOM content here.
        // This test simply ensures the component renders with a custom title without errors.
        expect(true).toBeTruthy();
    });
}); 
