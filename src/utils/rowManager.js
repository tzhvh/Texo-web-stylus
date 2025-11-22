/**
 * RowManager Class for Magic Canvas Row State Tracking
 * 
 * Serves as the authoritative source for row state in Magic Canvas.
 * Provides O(1) lookup performance for row operations and maintains
 * stable identifiers across pan/zoom/reload operations.
 * 
 * @class RowManager
 * @description Manages row metadata and element-to-row assignments for Magic Canvas
 */

/**
 * @typedef {Object} Row
 * @property {string} id - Stable unique identifier (format: "row-{index}")
 * @property {number} yStart - Top Y coordinate of the row
 * @property {number} yEnd - Bottom Y coordinate of the row (yStart + rowHeight)
 * @property {Set<string>} elementIds - IDs of Excalidraw elements in this row
 * @property {'pending'|'processing'|'completed'|'error'} ocrStatus - OCR processing status
 * @property {'pending'|'processing'|'validated'|'invalid'|'error'} validationStatus - Validation status
 * @property {string|null} transcribedLatex - LaTeX result from OCR
 * @property {Object|null} validationResult - Result from equivalence checking
 * @property {number} lastModified - Timestamp of last modification
 * @property {string|null} tileHash - Hash of OCR tile for caching
 * @property {string|null} errorMessage - Error message if processing failed
 */

/**
 * @typedef {Object} Viewport
 * @property {number} y - Y coordinate of viewport top
 * @property {number} height - Height of viewport
 * @property {number} [width] - Width of viewport (optional)
 * @property {number} [x] - X coordinate of viewport left (optional)
 */

/**
 * @typedef {Object} SerializedState
 * @property {number} rowHeight - Row height configuration
 * @property {number} startY - Starting Y position
 * @property {Array<Row>} rows - Array of serialized row objects
 * @property {Object} elementToRow - Element ID to row ID mapping
 */

import Logger from './logger.js';

export class RowManager {
  /**
   * Create a new RowManager instance
   * 
   * @param {Object} config - Configuration options
   * @param {number} [config.rowHeight=384] - Height of each row in pixels (matches OCR tile height)
   * @param {number} [config.startY=0] - Starting Y position for first row
   */
  constructor({ rowHeight = 384, startY = 0 } = {}) {
    this.rowHeight = rowHeight;
    this.startY = startY;
    
    // Map<string, Row> - All rows by ID for O(1) lookup
    this.rows = new Map();
    
    // Map<string, string> - Element ID to row ID mapping for O(1) element lookup
    this.elementToRow = new Map();
    
    // Single active row management (Story 1.2: single-active-row model)
    this.activeRowId = null;
    
    Logger.debug('RowManager', 'Initialized', {
      rowHeight,
      startY,
      timestamp: Date.now()
    });
  }

  /**
   * Get the row for a given Y coordinate
   * 
   * @param {number} y - Y coordinate to find row for
   * @returns {Row|null} Row containing the Y coordinate, or null if invalid
   */
  getRowForY(y) {
    if (typeof y !== 'number' || !isFinite(y)) {
      Logger.warn('RowManager', 'Invalid Y coordinate provided to getRowForY', { y });
      return null;
    }

    // Calculate row index based on Y position
    // Ensure negative Y coordinates map to row 0
    let rowIndex = Math.floor((y - this.startY) / this.rowHeight);
    rowIndex = Math.max(0, rowIndex);
    
    // Generate deterministic row ID
    const rowId = `row-${rowIndex}`;
    
    // Return existing row or create new one
    if (this.rows.has(rowId)) {
      return this.rows.get(rowId);
    }
    
    // Create new row if it doesn't exist
    const newRow = this._createRow(rowIndex);
    this.rows.set(rowId, newRow);
    
    Logger.debug('RowManager', 'Created new row', {
      rowId,
      rowIndex,
      y,
      yStart: newRow.yStart,
      yEnd: newRow.yEnd
    });
    
    return newRow;
  }

  /**
   * Assign an element to appropriate row based on its position
   * Enforces single-active-row drawing constraints (Story 1.2, Task 2)
   *
   * @param {Object} element - ExcalidrawElement object
   * @param {string} element.id - Unique element identifier
   * @param {number} element.x - X coordinate (top-left)
   * @param {number} element.y - Y coordinate (top-left)
   * @param {number} element.width - Element width
   * @param {number} element.height - Element height
   * @returns {string|null} ID of row element was assigned to, or null if constrained
   */
  assignElement(element) {
    if (!element || !element.id) {
      Logger.error('RowManager', 'Invalid element provided to assignElement', { element });
      throw new Error('Element must have a valid id property');
    }

    // Extract element center Y coordinate from bounding box
    // Excalidraw elements have: x, y (top-left), width, height
    if (typeof element.y !== 'number') {
      Logger.warn('RowManager', 'Element has invalid Y coordinate', {
        elementId: element.id,
        y: element.y
      });
      return null;
    }

    // Story 1.2, Task 2: Enforce drawing constraints within active row bounds
    if (!this.isElementInActiveRow(element)) {
      const activeRow = this.getActiveRow();
      Logger.debug('RowManager', 'Element constrained outside active row bounds', {
        elementId: element.id,
        elementY: element.y,
        elementHeight: element.height,
        activeRowId: this.activeRowId,
        activeRowBounds: activeRow ? { yStart: activeRow.yStart, yEnd: activeRow.yEnd } : null
      });
      return null; // Reject element assignment (constraint enforcement)
    }

    // Calculate center Y coordinate from element bounds
    const minY = element.y;
    const maxY = element.y + (element.height || 0);
    const centerY = (minY + maxY) / 2;

    // Remove element from previous row if assigned elsewhere
    this._removeElementFromPreviousRow(element.id);

    // Get target row for center Y coordinate
    const targetRow = this.getRowForY(centerY);
    if (!targetRow) {
      Logger.error('RowManager', 'Could not determine target row for element', {
        elementId: element.id,
        centerY
      });
      return null;
    }

    // Add element to target row
    targetRow.elementIds.add(element.id);
    this.elementToRow.set(element.id, targetRow.id);
    
    // Update row metadata
    targetRow.lastModified = Date.now();
    targetRow.ocrStatus = 'pending'; // Reset OCR status when elements change

    Logger.debug('RowManager', 'Assigned element to row', {
      elementId: element.id,
      rowId: targetRow.id,
      centerY,
      elementCount: targetRow.elementIds.size
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
    if (typeof rowId !== 'string') {
      Logger.warn('RowManager', 'Invalid rowId provided to getRow', { rowId });
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
      Logger.warn('RowManager', 'Attempted to update non-existent row', { rowId });
      return;
    }

    // Validate updates object
    if (!updates || typeof updates !== 'object') {
      Logger.warn('RowManager', 'Invalid updates provided to updateRow', { rowId, updates });
      return;
    }

    // Apply updates
    const previousState = { ...row };
    Object.assign(row, updates);
    row.lastModified = Date.now();

    Logger.debug('RowManager', 'Updated row', {
      rowId,
      updates: Object.keys(updates),
      previousState,
      newState: row
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
   * Set the active row (single-active-row model)
   * 
   * @param {string} rowId - ID of row to activate
   * @returns {boolean} True if row was activated successfully
   */
  setActiveRow(rowId) {
    if (!rowId || typeof rowId !== 'string') {
      Logger.warn('RowManager', 'Invalid rowId provided to setActiveRow', { rowId });
      return false;
    }

    const row = this.getRow(rowId);
    if (!row) {
      Logger.warn('RowManager', 'Attempted to activate non-existent row', { rowId });
      return false;
    }

    const previousActiveRowId = this.activeRowId;
    this.activeRowId = rowId;

    Logger.debug('RowManager', 'Active row changed', {
      previousActiveRowId,
      newActiveRowId: rowId,
      rowBounds: { yStart: row.yStart, yEnd: row.yEnd }
    });

    return true;
  }

  /**
   * Get the currently active row
   * 
   * @returns {Row|null} Active row object or null if no active row
   */
  getActiveRow() {
    if (!this.activeRowId) {
      return null;
    }

    return this.getRow(this.activeRowId);
  }

  /**
   * Check if a specific row is currently active
   * 
   * @param {string} rowId - ID of row to check
   * @returns {boolean} True if row is currently active
   */
  isRowActive(rowId) {
    return this.activeRowId === rowId;
  }

  /**
   * Check if an element's position is within active row bounds
   * 
   * @param {Object} element - Excalidraw element with y, height properties
   * @returns {boolean} True if element is within active row bounds
   */
  isElementInActiveRow(element) {
    const activeRow = this.getActiveRow();
    if (!activeRow) {
      // No active row, allow drawing anywhere
      return true;
    }

    if (!element || typeof element.y !== 'number') {
      return false;
    }

    const elementTop = element.y;
    const elementBottom = element.y + (element.height || 0);

    // Element is within active row if it overlaps with row bounds
    return elementBottom > activeRow.yStart && elementTop < activeRow.yEnd;
  }

  /**
   * Get rows that are visible within the given viewport
   * 
   * @param {Viewport} viewport - Viewport bounds
   * @returns {Row[]} Array of rows within viewport
   */
  getRowsInViewport(viewport) {
    if (!viewport || typeof viewport.y !== 'number' || typeof viewport.height !== 'number') {
      Logger.warn('RowManager', 'Invalid viewport provided to getRowsInViewport', { viewport });
      return [];
    }

    const viewportTop = viewport.y;
    const viewportBottom = viewport.y + viewport.height;

    return this.getAllRows().filter(row => {
      // Row is visible if any part overlaps with viewport
      return row.yStart < viewportBottom && row.yEnd > viewportTop;
    });
  }

  /**
   * Remove an element from its assigned row
   * 
   * @param {string} elementId - ID of element to remove
   * @returns {void}
   */
  removeElement(elementId) {
    if (typeof elementId !== 'string') {
      Logger.warn('RowManager', 'Invalid elementId provided to removeElement', { elementId });
      return;
    }

    this._removeElementFromPreviousRow(elementId);
  }

  /**
   * Serialize RowManager state for persistence
   * 
   * @returns {SerializedState} Serialized state object
   */
  serialize() {
    const serializedRows = this.getAllRows().map(row => ({
      ...row,
      elementIds: Array.from(row.elementIds) // Convert Set to Array for JSON serialization
    }));

    return {
      rowHeight: this.rowHeight,
      startY: this.startY,
      rows: serializedRows,
      elementToRow: Object.fromEntries(this.elementToRow) // Convert Map to Object
    };
  }

  /**
   * Deserialize and restore RowManager state from persistence
   * 
   * @param {SerializedState} state - Serialized state object
   * @returns {void}
   */
  deserialize(state) {
    if (!state || typeof state !== 'object') {
      Logger.error('RowManager', 'Invalid state provided to deserialize', { state });
      return;
    }

    try {
      // Clear current state
      this.rows.clear();
      this.elementToRow.clear();

      // Restore configuration
      this.rowHeight = state.rowHeight || 384;
      this.startY = state.startY || 0;

      // Restore rows
      if (Array.isArray(state.rows)) {
        state.rows.forEach(rowData => {
          const row = {
            ...rowData,
            elementIds: new Set(rowData.elementIds || []) // Convert Array back to Set
          };
          this.rows.set(row.id, row);
        });
      }

      // Restore element-to-row mapping
      if (state.elementToRow && typeof state.elementToRow === 'object') {
        this.elementToRow = new Map(Object.entries(state.elementToRow));
      }

      Logger.info('RowManager', 'State deserialized successfully', {
        rowCount: this.rows.size,
        elementMappings: this.elementToRow.size,
        rowHeight: this.rowHeight,
        startY: this.startY
      });
    } catch (error) {
      Logger.error('RowManager', 'Failed to deserialize state', { 
        state, 
        error: error.message,
        stack: error.stack
      });
    }
  }

  // Private helper methods

  /**
   * Create a new row object with default values
   * 
   * @private
   * @param {number} rowIndex - Index of the row
   * @returns {Row} New row object
   */
  _createRow(rowIndex) {
    const yStart = this.startY + (rowIndex * this.rowHeight);
    const yEnd = yStart + this.rowHeight;

    return {
      id: `row-${rowIndex}`,
      yStart,
      yEnd,
      elementIds: new Set(),
      ocrStatus: 'pending',
      validationStatus: 'pending',
      transcribedLatex: null,
      validationResult: null,
      lastModified: Date.now(),
      tileHash: null,
      errorMessage: null
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
        
        Logger.debug('RowManager', 'Removed element from previous row', {
          elementId,
          previousRowId,
          remainingElements: previousRow.elementIds.size
        });
      }
      this.elementToRow.delete(elementId);
    }
  }
}

export default RowManager;