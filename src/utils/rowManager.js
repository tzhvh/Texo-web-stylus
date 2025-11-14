/**
 * Grid-Aware RowManager Class for Magic Canvas Row State Tracking
 *
 * Manages row metadata and element-to-row assignments using grid-aligned
 * coordinate system. Serves as the authoritative source for row state with
 * O(1) lookup performance and deterministic positioning.
 *
 * Key improvements:
 * - Grid-anchored positioning (no floating point drift)
 * - Redundant assignment guards (prevents accumulation)
 * - Smart OCR status management (only resets on actual moves)
 * - Sparse storage (only tracks rows with content)
 *
 * @class RowManager
 */

/**
 * @typedef {Object} Row
 * @property {string} id - Stable unique identifier (format: "row-{index}")
 * @property {number} index - Grid row index
 * @property {number} yStart - Top Y coordinate of the row (grid-aligned)
 * @property {number} yEnd - Bottom Y coordinate of the row (grid-aligned)
 * @property {number} yCenter - Center Y coordinate of the row (grid-aligned)
 * @property {number} height - Row height (from grid config)
 * @property {Set<string>} elementIds - IDs of Excalidraw elements in this row
 * @property {'pending'|'processing'|'completed'|'error'} ocrStatus - OCR processing status
 * @property {'pending'|'processing'|'validated'|'invalid'|'error'} validationStatus - Validation status
 * @property {string|null} transcribedLatex - LaTeX result from OCR
 * @property {Object|null} validationResult - Result from equivalence checking
 * @property {number} lastModified - Timestamp of last modification
 * @property {number} created - Timestamp of row creation
 * @property {string|null} tileHash - Hash of OCR tile for caching
 * @property {string|null} errorMessage - Error message if processing failed
 */

import Logger from "./logger.js";
import { GridCalculator, GRID_CONFIG } from "../config/gridConfig.js";

export class RowManager {
  /**
   * Create a new grid-aware RowManager instance
   *
   * @param {Object} config - Configuration options
   * @param {number} [config.rowHeight=384] - Height of each row in pixels
   * @param {number} [config.startY=0] - Starting Y position for grid origin
   */
  constructor({ rowHeight = 384, startY = 0 } = {}) {
    // Validate that rowHeight matches grid config
    if (rowHeight !== GRID_CONFIG.ROW_HEIGHT) {
      Logger.warn("RowManager", "rowHeight doesn't match GRID_CONFIG", {
        providedRowHeight: rowHeight,
        gridRowHeight: GRID_CONFIG.ROW_HEIGHT
      });
    }

    this.rowHeight = rowHeight;
    this.startY = startY;

    // Sparse storage - Map<string, Row> - Only rows with data
    this.rows = new Map();

    // Element assignment - Map<string, string> - Element ID to primary row ID
    this.elementToRow = new Map();

    Logger.debug("RowManager", "Initialized with grid-aware system", {
      rowHeight: this.rowHeight,
      startY: this.startY,
      gridRowHeight: GRID_CONFIG.ROW_HEIGHT,
      timestamp: Date.now(),
    });
  }

  /**
   * Get the row for a given Y coordinate (grid-aligned)
   *
   * @param {number} y - Y coordinate to find row for
   * @returns {Row|null} Row containing the Y coordinate, or null if invalid
   */
  getRowForY(y) {
    if (typeof y !== "number" || !isFinite(y) || isNaN(y)) {
      Logger.warn("RowManager", "Invalid Y coordinate provided to getRowForY", {
        y,
      });
      return null;
    }

    // Use grid calculator for deterministic row ID
    const rowId = GridCalculator.getRowId(y);

    // Return existing row or create new one
    if (this.rows.has(rowId)) {
      return this.rows.get(rowId);
    }

    // Create new row at grid-aligned position
    const rowIndex = GridCalculator.parseRowId(rowId);
    const newRow = this._createRowAtIndex(rowIndex);
    this.rows.set(rowId, newRow);

    Logger.debug("RowManager", "Created new grid-aligned row", {
      rowId,
      rowIndex,
      y,
      yStart: newRow.yStart,
      yEnd: newRow.yEnd,
      yCenter: newRow.yCenter,
    });

    return newRow;
  }

  /**
   * Assign an element to the appropriate row based on its position
   * Uses element center for primary row assignment
   *
   * @param {Object} element - ExcalidrawElement object
   * @param {string} element.id - Unique element identifier
   * @param {number} element.x - X coordinate (top-left)
   * @param {number} element.y - Y coordinate (top-left) or array of Y coordinates
   * @param {number} element.width - Element width
   * @param {number} element.height - Element height
   * @returns {string|null} ID of the primary row the element was assigned to
   */
  assignElement(element) {
    if (!element || !element.id) {
      Logger.error("RowManager", "Invalid element provided to assignElement", {
        element,
      });
      throw new Error("Element must have a valid id property");
    }

    // Get element bounds using grid calculator
    const bounds = GridCalculator.getElementBounds(element);

    // Validate bounds
    if (bounds.yMin === bounds.yMax && bounds.yMin === 0) {
      Logger.warn("RowManager", "Element has invalid bounds", {
        elementId: element.id,
        bounds,
      });
      return null;
    }

    // Get primary row index (row with most coverage)
    const primaryRowIndex = GridCalculator.getPrimaryRowIndex(element);
    const targetRowId = `row-${primaryRowIndex}`;

    // Guard: Check if element is already assigned to the correct row
    const currentRowId = this.elementToRow.get(element.id);
    if (currentRowId === targetRowId) {
      // Element already in correct row, skip redundant reassignment
      Logger.debug("RowManager", "Element already in correct row, skipping reassignment", {
        elementId: element.id,
        rowId: targetRowId,
      });
      return targetRowId;
    }

    // Element needs to be moved (or is new)
    const isNewElement = !currentRowId;

    // Remove element from previous row if assigned elsewhere
    if (!isNewElement) {
      this._removeElementFromPreviousRow(element.id);
    }

    // Get or create target row at grid position
    const targetRow = this.getRowForY(bounds.yMin + (bounds.yMax - bounds.yMin) / 2);
    if (!targetRow) {
      Logger.error("RowManager", "Could not determine target row for element", {
        elementId: element.id,
        bounds,
        primaryRowIndex,
      });
      return null;
    }

    // Add element to target row
    targetRow.elementIds.add(element.id);
    this.elementToRow.set(element.id, targetRow.id);

    // Update row metadata
    targetRow.lastModified = Date.now();

    // Only reset OCR status if this is a new element or cross-row move
    if (isNewElement || currentRowId) {
      targetRow.ocrStatus = "pending";
    }

    Logger.debug("RowManager", isNewElement ? "Assigned new element to row" : "Moved element to different row", {
      elementId: element.id,
      rowId: targetRow.id,
      previousRowId: currentRowId || "none",
      bounds,
      elementCount: targetRow.elementIds.size,
    });

    return targetRow.id;
  }

  /**
   * Get a row by its ID
   *
   * @param {string} rowId - ID of the row to retrieve
   * @returns {Row|undefined} Row object or undefined if not found
   */
  getRow(rowId) {
    if (typeof rowId !== "string") {
      Logger.warn("RowManager", "Invalid rowId provided to getRow", { rowId });
      return undefined;
    }

    return this.rows.get(rowId);
  }

  /**
   * Update row metadata with partial updates
   *
   * @param {string} rowId - ID of the row to update
   * @param {Partial<Row>} updates - Partial row object with properties to update
   * @returns {void}
   */
  updateRow(rowId, updates) {
    const row = this.getRow(rowId);
    if (!row) {
      Logger.warn("RowManager", "Attempted to update non-existent row", {
        rowId,
      });
      return;
    }

    // Validate updates object
    if (!updates || typeof updates !== "object") {
      Logger.warn("RowManager", "Invalid updates provided to updateRow", {
        rowId,
        updates,
      });
      return;
    }

    // Apply updates
    const previousState = { ...row };
    Object.assign(row, updates);
    row.lastModified = Date.now();

    Logger.debug("RowManager", "Updated row", {
      rowId,
      updates: Object.keys(updates),
      previousState,
      newState: row,
    });
  }

  /**
   * Get all tracked rows
   *
   * @returns {Row[]} Array of all rows
   */
  getAllRows() {
    return Array.from(this.rows.values());
  }

  /**
   * Get rows in Y coordinate range (for viewport culling)
   *
   * @param {number} yStart - Start Y coordinate
   * @param {number} yEnd - End Y coordinate
   * @returns {Row[]} Array of rows in range
   */
  getRowsInRange(yStart, yEnd) {
    const startIndex = GridCalculator.getRowIndex(yStart);
    const endIndex = GridCalculator.getRowIndex(yEnd);

    const rowsInRange = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const rowId = `row-${i}`;
      if (this.rows.has(rowId)) {
        rowsInRange.push(this.rows.get(rowId));
      }
    }

    return rowsInRange;
  }

  /**
   * Get rows that are visible within the given viewport
   *
   * @param {Object} viewport - Viewport bounds
   * @param {number} viewport.y - Y coordinate of viewport top
   * @param {number} viewport.height - Height of viewport
   * @returns {Row[]} Array of rows within viewport
   */
  getRowsInViewport(viewport) {
    if (
      !viewport ||
      typeof viewport.y !== "number" ||
      typeof viewport.height !== "number"
    ) {
      Logger.warn(
        "RowManager",
        "Invalid viewport provided to getRowsInViewport",
        { viewport },
      );
      return [];
    }

    const buffer = GRID_CONFIG.VIEWPORT_BUFFER;
    const viewportTop = viewport.y - buffer;
    const viewportBottom = viewport.y + viewport.height + buffer;

    return this.getRowsInRange(viewportTop, viewportBottom);
  }

  /**
   * Remove an element from its assigned row
   *
   * @param {string} elementId - ID of element to remove
   * @returns {void}
   */
  removeElement(elementId) {
    if (typeof elementId !== "string") {
      Logger.warn("RowManager", "Invalid elementId provided to removeElement", {
        elementId,
      });
      return;
    }

    this._removeElementFromPreviousRow(elementId);
  }

  /**
   * Serialize RowManager state for persistence
   *
   * @returns {Object} Serialized state object
   */
  serialize() {
    const serializedRows = this.getAllRows().map((row) => ({
      ...row,
      elementIds: Array.from(row.elementIds), // Convert Set to Array
    }));

    return {
      rowHeight: this.rowHeight,
      startY: this.startY,
      rows: serializedRows,
      elementToRow: Object.fromEntries(this.elementToRow), // Convert Map to Object
      version: 2, // Version 2: grid-aware system
      gridConfig: {
        ROW_HEIGHT: GRID_CONFIG.ROW_HEIGHT,
        ORIGIN_Y: GRID_CONFIG.ORIGIN_Y
      }
    };
  }

  /**
   * Deserialize and restore RowManager state from persistence
   *
   * @param {Object} state - Serialized state object
   * @returns {void}
   */
  deserialize(state) {
    if (!state || typeof state !== "object") {
      Logger.error("RowManager", "Invalid state provided to deserialize", {
        state,
      });
      return;
    }

    try {
      // Clear current state
      this.rows.clear();
      this.elementToRow.clear();

      // Restore configuration
      this.rowHeight = state.rowHeight || GRID_CONFIG.ROW_HEIGHT;
      this.startY = state.startY || 0;

      // Restore rows with grid-aligned coordinates
      if (Array.isArray(state.rows)) {
        state.rows.forEach((rowData) => {
          // Ensure grid alignment for loaded rows
          const rowIndex = GridCalculator.parseRowId(rowData.id);
          const gridBounds = GridCalculator.getRowBounds(rowIndex);

          const row = {
            ...rowData,
            ...gridBounds, // Override with grid-aligned coordinates
            elementIds: new Set(rowData.elementIds || []),
          };
          this.rows.set(row.id, row);
        });
      }

      // Restore element-to-row mapping
      if (state.elementToRow && typeof state.elementToRow === "object") {
        this.elementToRow = new Map(Object.entries(state.elementToRow));
      }

      Logger.info("RowManager", "State deserialized successfully with grid alignment", {
        rowCount: this.rows.size,
        elementMappings: this.elementToRow.size,
        rowHeight: this.rowHeight,
        startY: this.startY,
        version: state.version || 1,
      });
    } catch (error) {
      Logger.error("RowManager", "Failed to deserialize state", {
        state,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  // Private helper methods

  /**
   * Create a new row object at grid-aligned position
   *
   * @private
   * @param {number} rowIndex - Grid row index
   * @returns {Row} New row object with grid-aligned coordinates
   */
  _createRowAtIndex(rowIndex) {
    const bounds = GridCalculator.getRowBounds(rowIndex);

    return {
      id: `row-${rowIndex}`,
      index: rowIndex,
      ...bounds, // yStart, yEnd, yCenter, height
      elementIds: new Set(),
      ocrStatus: "pending",
      validationStatus: "pending",
      transcribedLatex: null,
      validationResult: null,
      created: Date.now(),
      lastModified: Date.now(),
      tileHash: null,
      errorMessage: null,
    };
  }

  /**
   * Remove element from its previous row assignment
   *
   * @private
   * @param {string} elementId - ID of element to remove
   * @returns {void}
   */
  _removeElementFromPreviousRow(elementId) {
    const previousRowId = this.elementToRow.get(elementId);
    if (previousRowId) {
      const previousRow = this.rows.get(previousRowId);
      if (previousRow) {
        previousRow.elementIds.delete(elementId);
        previousRow.lastModified = Date.now();

        Logger.debug("RowManager", "Removed element from previous row", {
          elementId,
          previousRowId,
          remainingElements: previousRow.elementIds.size,
        });
      }
      this.elementToRow.delete(elementId);
    }
  }
}

export default RowManager;
