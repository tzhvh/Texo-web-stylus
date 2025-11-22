/**
 * Calculate hash of row content for change detection
 * Uses simple string hash for performance
 * @param {Array} elements - Elements in the row
 * @returns {string} Hash string
 */
export function calculateRowContentHash(elements) {
    if (!elements || elements.length === 0) {
        return '';
    }

    // Create hash from element IDs and coordinates
    // This detects additions, deletions, and movements
    // We use Math.round to avoid floating point jitter issues
    const hashInput = elements
        .map(el => `${el.id}:${Math.round(el.x)}:${Math.round(el.y)}`)
        .sort()
        .join('|');

    // Simple string hash (djb2 algorithm)
    let hash = 5381;
    for (let i = 0; i < hashInput.length; i++) {
        hash = (hash * 33) ^ hashInput.charCodeAt(i);
    }
    // Force unsigned 32-bit integer
    hash = hash >>> 0;
    return hash.toString(36);
}
