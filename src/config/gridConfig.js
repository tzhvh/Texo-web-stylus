/**
 * Grid Configuration for Row-Aligned Canvas System
 *
 * Provides immutable grid geometry calculations as the single source of truth
 * for row positioning, visual alignment, and OCR tile boundaries.
 *
 * All coordinate calculations are pure functions with no side effects,
 * ensuring consistent positioning across visual and data layers.
 *
 * @module gridConfig
 */

/**
 * Core grid configuration constants
 */
export const GRID_CONFIG = {
  // Grid geometry
  ROW_HEIGHT: 384,        // Height of each row (matches OCR tile height)
  ORIGIN_Y: 0,            // Grid origin point
  CANVAS_WIDTH: 2000,     // Maximum canvas width

  // Visual styling
  SEPARATOR_COLOR: '#cbd5e1',     // Tailwind slate-300
  SEPARATOR_THICKNESS: 2,          // Separator line height in pixels
  SEPARATOR_OPACITY: 0.6,          // Visual opacity for separators

  GUIDE_LINE_COLOR: '#d3d3d3',     // Guide line color
  GUIDE_LINE_OPACITY: 30,          // Guide line opacity (percentage)
  GUIDE_LINE_STROKE_WIDTH: 1,      // Guide line thickness

  // Indicator positioning
  INDICATOR_OFFSET_X: 60,          // Distance from right edge
  INDICATOR_SIZE: 48,              // Indicator icon size (48x48px)

  // Viewport culling
  VIEWPORT_BUFFER: 500,            // Buffer for smooth scrolling (px)
};

/**
 * Pure grid calculation functions (stateless, no side effects)
 */
export const GridCalculator = {
  /**
   * Get row index from Y coordinate
   *
   * @param {number} y - Y coordinate
   * @returns {number} Row index (0-based)
   */
  getRowIndex(y) {
    return Math.floor(y / GRID_CONFIG.ROW_HEIGHT);
  },

  /**
   * Get row ID from Y coordinate
   *
   * @param {number} y - Y coordinate
   * @returns {string} Row ID (format: "row-{index}")
   */
  getRowId(y) {
    const index = this.getRowIndex(y);
    return `row-${index}`;
  },

  /**
   * Get grid-aligned bounds for a row index
   *
   * @param {number} rowIndex - Row index
   * @returns {Object} Row bounds {yStart, yEnd, yCenter, height}
   */
  getRowBounds(rowIndex) {
    const yStart = GRID_CONFIG.ORIGIN_Y + (rowIndex * GRID_CONFIG.ROW_HEIGHT);
    const yEnd = yStart + GRID_CONFIG.ROW_HEIGHT;
    const yCenter = yStart + (GRID_CONFIG.ROW_HEIGHT / 2);

    return {
      yStart,
      yEnd,
      yCenter,
      height: GRID_CONFIG.ROW_HEIGHT
    };
  },

  /**
   * Parse row ID to get row index
   *
   * @param {string} rowId - Row ID (format: "row-{index}")
   * @returns {number} Row index
   */
  parseRowId(rowId) {
    const match = rowId.match(/^row-(-?\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  },

  /**
   * Get row coordinates from row ID
   *
   * @param {string} rowId - Row ID
   * @returns {Object} Row bounds {yStart, yEnd, yCenter, height}
   */
  getRowCoordinates(rowId) {
    const index = this.parseRowId(rowId);
    return this.getRowBounds(index);
  },

  /**
   * Get visible row indices for viewport
   *
   * @param {number} viewportY - Viewport top Y coordinate
   * @param {number} viewportHeight - Viewport height
   * @param {number} [buffer] - Optional buffer (defaults to GRID_CONFIG.VIEWPORT_BUFFER)
   * @returns {Object} {startIndex, endIndex}
   */
  getVisibleRowIndices(viewportY, viewportHeight, buffer = GRID_CONFIG.VIEWPORT_BUFFER) {
    const startY = viewportY - buffer;
    const endY = viewportY + viewportHeight + buffer;

    const startIndex = this.getRowIndex(startY);
    const endIndex = this.getRowIndex(endY);

    return { startIndex, endIndex };
  },

  /**
   * Generate row IDs for visible viewport range
   *
   * @param {number} viewportY - Viewport top Y coordinate
   * @param {number} viewportHeight - Viewport height
   * @param {number} [buffer] - Optional buffer
   * @returns {string[]} Array of row IDs
   */
  getVisibleRowIds(viewportY, viewportHeight, buffer) {
    const { startIndex, endIndex } = this.getVisibleRowIndices(viewportY, viewportHeight, buffer);

    const rowIds = [];
    for (let i = startIndex; i <= endIndex; i++) {
      rowIds.push(`row-${i}`);
    }
    return rowIds;
  },

  /**
   * Check if two Y coordinates are in the same row
   *
   * @param {number} y1 - First Y coordinate
   * @param {number} y2 - Second Y coordinate
   * @returns {boolean} True if in same row
   */
  isSameRow(y1, y2) {
    return this.getRowIndex(y1) === this.getRowIndex(y2);
  },

  /**
   * Get element bounds from Excalidraw element
   *
   * @param {Object} element - Excalidraw element
   * @returns {Object} {yMin, yMax}
   */
  getElementBounds(element) {
    if (Array.isArray(element.y)) {
      // Stroke element with point array
      if (element.y.length === 0) return { yMin: 0, yMax: 0 };
      return {
        yMin: Math.min(...element.y),
        yMax: Math.max(...element.y)
      };
    }
    // Standard element with y + height
    return {
      yMin: element.y,
      yMax: element.y + (element.height || 0)
    };
  },

  /**
   * Get all row indices that an element intersects
   *
   * @param {Object} element - Excalidraw element
   * @returns {number[]} Array of row indices
   */
  getIntersectingRowIndices(element) {
    const bounds = this.getElementBounds(element);
    const startIndex = this.getRowIndex(bounds.yMin);
    const endIndex = this.getRowIndex(bounds.yMax);

    const indices = [];
    for (let i = startIndex; i <= endIndex; i++) {
      indices.push(i);
    }
    return indices;
  },

  /**
   * Get primary row index for element (row with most coverage)
   *
   * @param {Object} element - Excalidraw element
   * @returns {number} Primary row index
   */
  getPrimaryRowIndex(element) {
    const bounds = this.getElementBounds(element);
    const centerY = (bounds.yMin + bounds.yMax) / 2;
    return this.getRowIndex(centerY);
  },

  /**
   * Snap Y coordinate to nearest grid line
   *
   * @param {number} y - Y coordinate
   * @param {number} threshold - Snap threshold in pixels
   * @returns {number} Snapped Y coordinate
   */
  snapToGrid(y, threshold = 20) {
    const rowIndex = this.getRowIndex(y);
    const bounds = this.getRowBounds(rowIndex);

    // Snap to top boundary if close
    if (Math.abs(y - bounds.yStart) < threshold) {
      return bounds.yStart;
    }
    // Snap to bottom boundary if close
    if (Math.abs(y - bounds.yEnd) < threshold) {
      return bounds.yEnd;
    }
    return y;
  }
};

/**
 * Grid-aligned position generator for visual elements
 */
export const GridVisuals = {
  /**
   * Generate separator positions for viewport
   *
   * @param {number} viewportY - Viewport top Y
   * @param {number} viewportHeight - Viewport height
   * @returns {Array} Array of separator configs
   */
  getSeparators(viewportY, viewportHeight) {
    const { startIndex, endIndex } = GridCalculator.getVisibleRowIndices(
      viewportY,
      viewportHeight
    );

    const separators = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const bounds = GridCalculator.getRowBounds(i);
      separators.push({
        rowId: `row-${i}`,
        rowIndex: i,
        y: bounds.yStart,
        width: GRID_CONFIG.CANVAS_WIDTH,
        thickness: GRID_CONFIG.SEPARATOR_THICKNESS,
        color: GRID_CONFIG.SEPARATOR_COLOR,
        opacity: GRID_CONFIG.SEPARATOR_OPACITY
      });
    }
    return separators;
  },

  /**
   * Generate indicator positions for viewport
   *
   * @param {number} viewportY - Viewport top Y
   * @param {number} viewportHeight - Viewport height
   * @returns {Array} Array of indicator position configs
   */
  getIndicatorPositions(viewportY, viewportHeight) {
    const { startIndex, endIndex } = GridCalculator.getVisibleRowIndices(
      viewportY,
      viewportHeight
    );

    const positions = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const bounds = GridCalculator.getRowBounds(i);
      positions.push({
        rowId: `row-${i}`,
        rowIndex: i,
        x: GRID_CONFIG.CANVAS_WIDTH - GRID_CONFIG.INDICATOR_OFFSET_X,
        y: bounds.yCenter,
        size: GRID_CONFIG.INDICATOR_SIZE,
        ...bounds
      });
    }
    return positions;
  },

  /**
   * Generate guide line elements for Excalidraw
   *
   * @param {number} viewportY - Viewport top Y
   * @param {number} viewportHeight - Viewport height
   * @returns {Array} Array of guide line configs for convertToExcalidrawElements
   */
  getGuideLines(viewportY, viewportHeight) {
    const { startIndex, endIndex } = GridCalculator.getVisibleRowIndices(
      viewportY,
      viewportHeight
    );

    const guideLines = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const bounds = GridCalculator.getRowBounds(i);
      guideLines.push({
        type: "line",
        x: 0,
        y: bounds.yStart,
        width: GRID_CONFIG.CANVAS_WIDTH,
        height: 0,
        strokeColor: GRID_CONFIG.GUIDE_LINE_COLOR,
        backgroundColor: "transparent",
        strokeWidth: GRID_CONFIG.GUIDE_LINE_STROKE_WIDTH,
        strokeStyle: "solid",
        roughness: 0,
        opacity: GRID_CONFIG.GUIDE_LINE_OPACITY,
        locked: true,
        isDeleted: false,
        id: `guide-row-${i}`
      });
    }
    return guideLines;
  }
};

export default {
  GRID_CONFIG,
  GridCalculator,
  GridVisuals
};
