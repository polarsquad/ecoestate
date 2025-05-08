/**
 * Utility function to escape HTML characters.
 * @param str The string, number, null, or undefined value to escape.
 * @returns The escaped string, or an empty string if input is null or undefined.
 */
export const escapeHTML = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}; 
