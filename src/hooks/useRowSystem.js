/**
 * Row System Hook
 * Manages rows on the infinite canvas with element assignment and state tracking
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import Logger from '../utils/logger';

/**
 * Row Manager Class
 * Handles row creation, element assignment, and state management
 */
class RowManager {
  constructor(rowHeight = 384) {
    this.rows = new Map(); // rowId → RowData
    this.rowHeight = rowHeight;
    this.nextId = 0;
  }

  /**
   * Get row ID for Y coordinate
   */
  getRowForY(y) {
    return Math.floor(y / this.rowHeight);
  }

  /**
   * Get row by ID, create if doesn't exist
   */
  getRow(rowId) {
    if (!this.rows.has(rowId)) {
      this.createRow(rowId);
    }
    return this.rows.get(rowId);
  }

  /**
   * Create a new row
   */
  createRow(rowId) {
    const row = {
      id: rowId,
      y: rowId * this.rowHeight,
      height: this.rowHeight,
      elements: new Set(),
      elementIds: new Set(),

      // OCR state
      latex: null,
      tiles: [],
      ocrStatus: 'pending', // 'pending' | 'processing' | 'complete' | 'error'
      ocrError: null,
      ocrProgress: 0,

      // Validation state
      validationStatus: 'unchecked', // 'unchecked' | 'validating' | 'valid' | 'invalid' | 'error'
      validationResult: null,
      validationError: null,

      // Metadata
      locked: false,
      lastModified: Date.now(),
      version: 0,

      // Timestamps
      createdAt: Date.now(),
      ocrCompletedAt: null,
      validatedAt: null
    };

    this.rows.set(rowId, row);
    Logger.debug('RowManager', `Created row ${rowId}`, { y: row.y });

    return row;
  }

  /**
   * Assign element to appropriate row
   */
  assignElement(element) {
    if (!element || element.type === 'line' && element.isRowDivider) {
      return null; // Skip row dividers
    }

    // Use center Y coordinate
    const centerY = (element.y || 0) + ((element.height || 0) / 2);
    const rowId = this.getRowForY(centerY);

    const row = this.getRow(rowId);

    // Add to row
    if (!row.elementIds.has(element.id)) {
      row.elementIds.add(element.id);
      row.elements.add(element);
      row.lastModified = Date.now();
      row.version++;
    }

    return rowId;
  }

  /**
   * Update row assignments for all elements
   */
  updateAssignments(elements) {
    // Clear existing assignments
    this.rows.forEach(row => {
      row.elements.clear();
      row.elementIds.clear();
    });

    // Reassign all elements
    const assignments = new Map(); // elementId → rowId

    elements.forEach(el => {
      const rowId = this.assignElement(el);
      if (rowId !== null) {
        assignments.set(el.id, rowId);
      }
    });

    Logger.debug('RowManager', `Updated assignments: ${assignments.size} elements across ${this.rows.size} rows`);

    return assignments;
  }

  /**
   * Get all elements in a row
   */
  getRowElements(rowId, allElements = []) {
    const row = this.rows.get(rowId);
    if (!row) return [];

    // Filter by element IDs
    return allElements.filter(el => row.elementIds.has(el.id));
  }

  /**
   * Get rows in viewport
   */
  getRowsInView(viewport) {
    const startRow = Math.floor(viewport.y / this.rowHeight);
    const endRow = Math.ceil((viewport.y + viewport.height) / this.rowHeight);

    const rows = [];
    for (let i = startRow; i <= endRow; i++) {
      if (this.rows.has(i)) {
        rows.push(this.rows.get(i));
      }
    }

    return rows;
  }

  /**
   * Clear row content (keep structure)
   */
  clearRow(rowId, keepStructure = true) {
    const row = this.rows.get(rowId);
    if (!row) return;

    row.elements.clear();
    row.elementIds.clear();
    row.latex = null;
    row.tiles = [];
    row.ocrStatus = 'pending';
    row.ocrError = null;
    row.validationStatus = 'unchecked';
    row.validationResult = null;
    row.version++;
    row.lastModified = Date.now();

    if (!keepStructure) {
      this.rows.delete(rowId);
    }

    Logger.debug('RowManager', `Cleared row ${rowId}`, { keepStructure });
  }

  /**
   * Lock row (prevent editing)
   */
  lockRow(rowId) {
    const row = this.rows.get(rowId);
    if (row) {
      row.locked = true;
      Logger.debug('RowManager', `Locked row ${rowId}`);
    }
  }

  /**
   * Unlock row
   */
  unlockRow(rowId) {
    const row = this.rows.get(rowId);
    if (row) {
      row.locked = false;
      Logger.debug('RowManager', `Unlocked row ${rowId}`);
    }
  }

  /**
   * Duplicate row to new position
   */
  duplicateRow(sourceRowId, targetRowId) {
    const source = this.rows.get(sourceRowId);
    if (!source) return null;

    const duplicate = {
      ...source,
      id: targetRowId,
      y: targetRowId * this.rowHeight,
      elements: new Set(),
      elementIds: new Set(),
      validationStatus: 'unchecked',
      locked: false,
      version: 0,
      createdAt: Date.now(),
      ocrCompletedAt: source.ocrCompletedAt,
      validatedAt: null
    };

    this.rows.set(targetRowId, duplicate);
    Logger.debug('RowManager', `Duplicated row ${sourceRowId} → ${targetRowId}`);

    return duplicate;
  }

  /**
   * Update row OCR status
   */
  updateOCRStatus(rowId, status, data = {}) {
    const row = this.rows.get(rowId);
    if (!row) return;

    row.ocrStatus = status;

    if (data.latex) row.latex = data.latex;
    if (data.tiles) row.tiles = data.tiles;
    if (data.error) row.ocrError = data.error;
    if (data.progress !== undefined) row.ocrProgress = data.progress;

    if (status === 'complete') {
      row.ocrCompletedAt = Date.now();
    }

    row.version++;

    Logger.debug('RowManager', `Row ${rowId} OCR status: ${status}`, data);
  }

  /**
   * Update row validation status
   */
  updateValidationStatus(rowId, status, result = null, error = null) {
    const row = this.rows.get(rowId);
    if (!row) return;

    row.validationStatus = status;
    row.validationResult = result;
    row.validationError = error;

    if (status === 'valid' || status === 'invalid') {
      row.validatedAt = Date.now();
    }

    row.version++;

    Logger.debug('RowManager', `Row ${rowId} validation: ${status}`, { result });
  }

  /**
   * Get all rows sorted by position
   */
  getAllRows() {
    return Array.from(this.rows.values()).sort((a, b) => a.id - b.id);
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      rowHeight: this.rowHeight,
      rows: Array.from(this.rows.entries()).map(([id, row]) => ({
        ...row,
        elements: [], // Don't serialize elements (managed by Excalidraw)
        elementIds: Array.from(row.elementIds)
      }))
    };
  }

  /**
   * Deserialize from JSON
   */
  fromJSON(data) {
    this.rowHeight = data.rowHeight;
    this.rows.clear();

    data.rows.forEach(rowData => {
      const row = {
        ...rowData,
        elements: new Set(),
        elementIds: new Set(rowData.elementIds)
      };
      this.rows.set(row.id, row);
    });

    Logger.info('RowManager', `Loaded ${this.rows.size} rows from storage`);
  }
}

/**
 * React Hook for Row System
 */
export function useRowSystem(rowHeight = 384) {
  const rowManagerRef = useRef(null);
  const [rows, setRows] = useState(new Map());
  const [selectedRow, setSelectedRow] = useState(null);
  const [assignments, setAssignments] = useState(new Map());

  // Initialize row manager
  useEffect(() => {
    if (!rowManagerRef.current) {
      rowManagerRef.current = new RowManager(rowHeight);
      Logger.info('useRowSystem', 'Row system initialized', { rowHeight });
    }
  }, [rowHeight]);

  /**
   * Update row assignments based on current elements
   */
  const updateRows = useCallback((elements) => {
    if (!rowManagerRef.current) return;

    const newAssignments = rowManagerRef.current.updateAssignments(elements);

    setAssignments(newAssignments);
    setRows(new Map(rowManagerRef.current.rows));

  }, []);

  /**
   * Get elements in a specific row
   */
  const getRowElements = useCallback((rowId, allElements) => {
    if (!rowManagerRef.current) return [];
    return rowManagerRef.current.getRowElements(rowId, allElements);
  }, []);

  /**
   * Get rows visible in viewport
   */
  const getRowsInView = useCallback((viewport) => {
    if (!rowManagerRef.current) return [];
    return rowManagerRef.current.getRowsInView(viewport);
  }, []);

  /**
   * Clear row
   */
  const clearRow = useCallback((rowId, keepStructure = true) => {
    if (!rowManagerRef.current) return;

    rowManagerRef.current.clearRow(rowId, keepStructure);
    setRows(new Map(rowManagerRef.current.rows));
  }, []);

  /**
   * Lock/unlock row
   */
  const lockRow = useCallback((rowId) => {
    if (!rowManagerRef.current) return;
    rowManagerRef.current.lockRow(rowId);
    setRows(new Map(rowManagerRef.current.rows));
  }, []);

  const unlockRow = useCallback((rowId) => {
    if (!rowManagerRef.current) return;
    rowManagerRef.current.unlockRow(rowId);
    setRows(new Map(rowManagerRef.current.rows));
  }, []);

  /**
   * Duplicate row
   */
  const duplicateRow = useCallback((sourceRowId, targetRowId) => {
    if (!rowManagerRef.current) return null;

    const duplicate = rowManagerRef.current.duplicateRow(sourceRowId, targetRowId);
    setRows(new Map(rowManagerRef.current.rows));

    return duplicate;
  }, []);

  /**
   * Select row
   */
  const selectRow = useCallback((rowId) => {
    setSelectedRow(rowId);
  }, []);

  /**
   * Update OCR status
   */
  const updateOCRStatus = useCallback((rowId, status, data = {}) => {
    if (!rowManagerRef.current) return;

    rowManagerRef.current.updateOCRStatus(rowId, status, data);
    setRows(new Map(rowManagerRef.current.rows));
  }, []);

  /**
   * Update validation status
   */
  const updateValidationStatus = useCallback((rowId, status, result = null, error = null) => {
    if (!rowManagerRef.current) return;

    rowManagerRef.current.updateValidationStatus(rowId, status, result, error);
    setRows(new Map(rowManagerRef.current.rows));
  }, []);

  /**
   * Get row by ID
   */
  const getRow = useCallback((rowId) => {
    if (!rowManagerRef.current) return null;
    return rowManagerRef.current.rows.get(rowId);
  }, []);

  /**
   * Get all rows
   */
  const getAllRows = useCallback(() => {
    if (!rowManagerRef.current) return [];
    return rowManagerRef.current.getAllRows();
  }, []);

  /**
   * Save to storage
   */
  const saveToStorage = useCallback(async () => {
    if (!rowManagerRef.current) return;

    const data = rowManagerRef.current.toJSON();
    // TODO: Integrate with workspaceDB
    Logger.debug('useRowSystem', 'Saved row data', { rowCount: data.rows.length });

    return data;
  }, []);

  /**
   * Load from storage
   */
  const loadFromStorage = useCallback(async (data) => {
    if (!rowManagerRef.current || !data) return;

    rowManagerRef.current.fromJSON(data);
    setRows(new Map(rowManagerRef.current.rows));
  }, []);

  return {
    // State
    rows,
    selectedRow,
    assignments,
    rowManager: rowManagerRef.current,

    // Actions
    updateRows,
    getRowElements,
    getRowsInView,
    getRow,
    getAllRows,
    clearRow,
    lockRow,
    unlockRow,
    duplicateRow,
    selectRow,
    updateOCRStatus,
    updateValidationStatus,

    // Persistence
    saveToStorage,
    loadFromStorage
  };
}
