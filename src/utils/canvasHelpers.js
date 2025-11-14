/**
 * Canvas helper utilities for MagicCanvas
 * Provides reusable functions for element filtering and manipulation
 */

/**
 * Filter out guide lines from Excalidraw elements, returning only user-drawn elements
 * @param {Array} elements - Excalidraw elements array
 * @returns {Array} User-drawn elements only (excludes guide lines and deleted elements)
 */
export const getUserElements = (elements) => {
  if (!Array.isArray(elements)) return [];
  return elements.filter(
    (el) => !el.id?.startsWith("guide-") && !el.isDeleted
  );
};

/**
 * Filter elements to keep only guide lines
 * @param {Array} elements - Excalidraw elements array
 * @returns {Array} Guide line elements only
 */
export const getGuideLineElements = (elements) => {
  if (!Array.isArray(elements)) return [];
  return elements.filter(
    (el) => el.id?.startsWith("guide-") && !el.isDeleted
  );
};

/**
 * Count user-drawn elements in a scene
 * @param {Array} elements - Excalidraw elements array
 * @returns {number} Count of user elements
 */
export const countUserElements = (elements) => {
  return getUserElements(elements).length;
};

/**
 * Check if an element is a guide line
 * @param {Object} element - Excalidraw element
 * @returns {boolean} True if element is a guide line
 */
export const isGuideLine = (element) => {
  return element?.id?.startsWith("guide-");
};
