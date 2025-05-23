import { describe, it, expect } from 'vitest';
import { escapeHTML } from '../stringUtils';

describe('stringUtils', () => {
    describe('escapeHTML', () => {
        it('escapes HTML special characters', () => {
            const input = '<script>alert("XSS & danger");</script>';
            const expected = '&lt;script&gt;alert(&quot;XSS &amp; danger&quot;);&lt;/script&gt;';

            expect(escapeHTML(input)).toBe(expected);
        });

        it('converts numbers to strings', () => {
            expect(escapeHTML(123)).toBe('123');
        });

        it('returns empty string for null or undefined inputs', () => {
            expect(escapeHTML(null)).toBe('');
            expect(escapeHTML(undefined)).toBe('');
        });
    });
}); 
