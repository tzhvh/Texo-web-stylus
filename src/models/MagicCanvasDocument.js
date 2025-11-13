/**
 * MagicCanvasDocument - Immutable document model for the Magic Canvas
 *
 * This is the single source of truth for all canvas state, including:
 * - Excalidraw elements, appState, and files
 * - Row data (elements, OCR results, validation results)
 * - Document metadata and versioning
 *
 * All state changes create new document instances (immutable updates).
 */

import CryptoJS from 'crypto-js';

/**
 * Generate a unique ID for documents
 */
function generateId() {
  return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
}

/**
 * Row data structure
 */
class RowData {
  constructor(data = {}) {
    // Identity
    this.id = data.id ?? 0;
    this.y = data.y ?? 0;
    this.height = data.height ?? 384;

    // Elements
    this.elementIds = new Set(data.elementIds || []);

    // OCR State
    this.latex = data.latex || null;
    this.tiles = data.tiles || [];
    this.ocrStatus = data.ocrStatus || 'pending'; // 'pending' | 'processing' | 'complete' | 'error'
    this.ocrProgress = data.ocrProgress ?? 0;
    this.ocrError = data.ocrError || null;
    this.ocrCompletedAt = data.ocrCompletedAt || null;
    this.ocrConfidence = data.ocrConfidence ?? null;

    // Validation State
    this.validationStatus = data.validationStatus || 'unchecked'; // 'unchecked' | 'validating' | 'valid' | 'invalid' | 'error'
    this.validationResult = data.validationResult || null;
    this.validationError = data.validationError || null;
    this.validatedAt = data.validatedAt || null;

    // Metadata
    this.locked = data.locked ?? false;
    this.lastModified = data.lastModified || Date.now();
    this.version = data.version ?? 1;
    this.createdAt = data.createdAt || Date.now();
  }

  /**
   * Create a new RowData with updated properties
   */
  update(updates) {
    return new RowData({
      ...this,
      ...updates,
      lastModified: Date.now(),
      version: this.version + 1,
    });
  }

  /**
   * Serialize to plain object
   */
  toJSON() {
    return {
      id: this.id,
      y: this.y,
      height: this.height,
      elementIds: Array.from(this.elementIds),
      latex: this.latex,
      tiles: this.tiles,
      ocrStatus: this.ocrStatus,
      ocrProgress: this.ocrProgress,
      ocrError: this.ocrError,
      ocrCompletedAt: this.ocrCompletedAt,
      ocrConfidence: this.ocrConfidence,
      validationStatus: this.validationStatus,
      validationResult: this.validationResult,
      validationError: this.validationError,
      validatedAt: this.validatedAt,
      locked: this.locked,
      lastModified: this.lastModified,
      version: this.version,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Main document class - immutable state container
 */
export class MagicCanvasDocument {
  constructor(data = {}) {
    // Document identity
    this.id = data.id || generateId();
    this.version = data.version ?? 0;
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();

    // Canvas state (Excalidraw)
    this.elements = data.elements || [];
    this.appState = data.appState || {};
    this.files = data.files || {};

    // Row configuration
    this.rowConfig = {
      height: 384,
      ...data.rowConfig,
    };

    // Row state (Map<rowId, RowData>)
    this.rows = new Map();
    if (data.rows) {
      if (data.rows instanceof Map) {
        data.rows.forEach((row, id) => {
          this.rows.set(id, row instanceof RowData ? row : new RowData(row));
        });
      } else {
        // Handle plain object from JSON
        Object.entries(data.rows).forEach(([id, row]) => {
          this.rows.set(Number(id), new RowData(row));
        });
      }
    }

    // Document metadata
    this.metadata = {
      title: 'Untitled Canvas',
      author: null,
      tags: [],
      ...data.metadata,
    };
  }

  /**
   * Create a new document with updated properties
   * This is the base method for all immutable updates
   */
  _update(updates) {
    return new MagicCanvasDocument({
      ...this,
      ...updates,
      updatedAt: Date.now(),
      version: this.version + 1,
    });
  }

  // ===== Canvas State Updates =====

  /**
   * Update Excalidraw elements
   */
  withElements(elements) {
    return this._update({ elements });
  }

  /**
   * Update Excalidraw app state
   */
  withAppState(appState) {
    return this._update({ appState });
  }

  /**
   * Update Excalidraw files
   */
  withFiles(files) {
    return this._update({ files });
  }

  /**
   * Update entire canvas state at once
   */
  withCanvasState({ elements, appState, files }) {
    return this._update({
      elements: elements !== undefined ? elements : this.elements,
      appState: appState !== undefined ? appState : this.appState,
      files: files !== undefined ? files : this.files,
    });
  }

  // ===== Row Management =====

  /**
   * Get row by ID
   */
  getRow(rowId) {
    return this.rows.get(rowId);
  }

  /**
   * Get all rows as array, sorted by ID
   */
  getAllRows() {
    return Array.from(this.rows.entries())
      .sort(([a], [b]) => a - b)
      .map(([, row]) => row);
  }

  /**
   * Get row IDs sorted
   */
  getRowIds() {
    return Array.from(this.rows.keys()).sort((a, b) => a - b);
  }

  /**
   * Calculate row ID from Y coordinate
   */
  getRowIdFromY(y) {
    return Math.floor(y / this.rowConfig.height);
  }

  /**
   * Get Y coordinate from row ID
   */
  getYFromRowId(rowId) {
    return rowId * this.rowConfig.height;
  }

  /**
   * Create or update a row
   */
  withRow(rowId, rowUpdates) {
    const existingRow = this.rows.get(rowId);
    const newRow = existingRow
      ? existingRow.update(rowUpdates)
      : new RowData({
          id: rowId,
          y: this.getYFromRowId(rowId),
          height: this.rowConfig.height,
          ...rowUpdates,
        });

    const newRows = new Map(this.rows);
    newRows.set(rowId, newRow);

    return this._update({ rows: newRows });
  }

  /**
   * Update multiple rows at once
   */
  withRows(rowUpdatesMap) {
    let doc = this;
    for (const [rowId, updates] of rowUpdatesMap.entries()) {
      doc = doc.withRow(rowId, updates);
    }
    return doc;
  }

  /**
   * Remove a row
   */
  withoutRow(rowId) {
    const newRows = new Map(this.rows);
    newRows.delete(rowId);
    return this._update({ rows: newRows });
  }

  // ===== Element Assignment =====

  /**
   * Update element assignments to rows based on their Y coordinates
   */
  withElementAssignments(elements) {
    // Build a map of rowId -> Set<elementId>
    const rowAssignments = new Map();

    elements.forEach(element => {
      if (element.isDeleted) return;

      // Calculate element's center Y
      const centerY = element.y + (element.height || 0) / 2;
      const rowId = this.getRowIdFromY(centerY);

      if (!rowAssignments.has(rowId)) {
        rowAssignments.set(rowId, new Set());
      }
      rowAssignments.get(rowId).add(element.id);
    });

    // Update all affected rows
    const rowUpdatesMap = new Map();

    // Update rows with new assignments
    rowAssignments.forEach((elementIds, rowId) => {
      rowUpdatesMap.set(rowId, { elementIds });
    });

    // Clear rows that no longer have elements
    this.rows.forEach((row, rowId) => {
      if (!rowAssignments.has(rowId) && row.elementIds.size > 0) {
        rowUpdatesMap.set(rowId, { elementIds: new Set() });
      }
    });

    return this.withElements(elements).withRows(rowUpdatesMap);
  }

  // ===== OCR State Updates =====

  /**
   * Update OCR status for a row
   */
  withOCRStatus(rowId, status, data = {}) {
    return this.withRow(rowId, {
      ocrStatus: status,
      ocrProgress: data.progress ?? this.getRow(rowId)?.ocrProgress ?? 0,
      ocrError: data.error || null,
      tiles: data.tiles || this.getRow(rowId)?.tiles || [],
      ...(status === 'complete' && {
        ocrCompletedAt: Date.now(),
      }),
    });
  }

  /**
   * Update OCR result for a row
   */
  withOCRResult(rowId, result) {
    return this.withRow(rowId, {
      latex: result.latex,
      ocrStatus: 'complete',
      ocrProgress: 1,
      ocrError: null,
      ocrCompletedAt: Date.now(),
      ocrConfidence: result.confidence,
      tiles: result.tiles || this.getRow(rowId)?.tiles || [],
    });
  }

  // ===== Validation State Updates =====

  /**
   * Update validation status for a row
   */
  withValidationStatus(rowId, status, data = {}) {
    return this.withRow(rowId, {
      validationStatus: status,
      validationResult: data.result || null,
      validationError: data.error || null,
      ...(status !== 'validating' && {
        validatedAt: Date.now(),
      }),
    });
  }

  /**
   * Update validation result for a row
   */
  withValidationResult(rowId, result) {
    const status = result.equivalent ? 'valid' : 'invalid';
    return this.withRow(rowId, {
      validationStatus: status,
      validationResult: result,
      validationError: null,
      validatedAt: Date.now(),
    });
  }

  // ===== Metadata =====

  /**
   * Update document metadata
   */
  withMetadata(metadata) {
    return this._update({
      metadata: { ...this.metadata, ...metadata },
    });
  }

  /**
   * Update row configuration
   */
  withRowConfig(config) {
    return this._update({
      rowConfig: { ...this.rowConfig, ...config },
    });
  }

  // ===== Queries =====

  /**
   * Get rows that need OCR processing
   */
  getRowsNeedingOCR() {
    return this.getAllRows().filter(
      row => row.elementIds.size > 0 &&
             row.ocrStatus === 'pending'
    );
  }

  /**
   * Get rows that need validation
   */
  getRowsNeedingValidation() {
    return this.getAllRows().filter(
      row => row.ocrStatus === 'complete' &&
             row.validationStatus === 'unchecked'
    );
  }

  /**
   * Get elements for a specific row
   */
  getRowElements(rowId) {
    const row = this.getRow(rowId);
    if (!row) return [];

    return this.elements.filter(el => row.elementIds.has(el.id));
  }

  /**
   * Check if document has unsaved changes
   * (compare against a saved version number)
   */
  hasUnsavedChanges(savedVersion) {
    return this.version > savedVersion;
  }

  // ===== Serialization =====

  /**
   * Serialize to JSON-compatible object
   */
  toJSON() {
    const rowsObj = {};
    this.rows.forEach((row, id) => {
      rowsObj[id] = row.toJSON();
    });

    return {
      id: this.id,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      elements: this.elements,
      appState: this.appState,
      files: this.files,
      rowConfig: this.rowConfig,
      rows: rowsObj,
      metadata: this.metadata,
    };
  }

  /**
   * Create document from JSON
   */
  static fromJSON(json) {
    return new MagicCanvasDocument(json);
  }

  /**
   * Clone the document
   */
  clone() {
    return new MagicCanvasDocument(this.toJSON());
  }
}

export { RowData };
