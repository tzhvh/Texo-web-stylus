/**
 * DocumentStore - Manages document persistence, history, and subscriptions
 *
 * Features:
 * - Immutable document history for undo/redo
 * - Event sourcing with operation tracking
 * - LocalStorage/IndexedDB persistence
 * - Pub/sub for reactive updates
 * - Auto-save with debouncing
 */

import { MagicCanvasDocument } from './MagicCanvasDocument';

/**
 * Operation record for event sourcing
 */
class DocumentOperation {
  constructor(type, data, timestamp = Date.now()) {
    this.id = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.data = data;
    this.timestamp = timestamp;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      data: this.data,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Main document store
 */
export class DocumentStore {
  constructor(options = {}) {
    this.options = {
      storageKey: 'magic-canvas-document',
      historyLimit: 50, // Number of versions to keep in history
      autoSaveDelay: 2000, // Auto-save debounce delay (ms)
      enableHistory: true,
      enableAutoSave: true,
      ...options,
    };

    // Current document
    this.document = null;

    // History for undo/redo
    this.history = []; // Array of documents
    this.historyIndex = -1; // Current position in history

    // Operation log for event sourcing
    this.operations = [];

    // Subscribers for reactive updates
    this.subscribers = new Set();

    // Auto-save state
    this.autoSaveTimer = null;
    this.lastSavedVersion = -1;

    // Initialize with new or loaded document
    this.loadOrCreate();
  }

  // ===== Document Access =====

  /**
   * Get current document
   */
  getDocument() {
    return this.document;
  }

  /**
   * Get document version
   */
  getVersion() {
    return this.document?.version ?? 0;
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges() {
    return this.document?.version > this.lastSavedVersion;
  }

  // ===== Document Updates =====

  /**
   * Update document and record in history
   */
  updateDocument(newDocument, operation = null) {
    const prevDocument = this.document;
    this.document = newDocument;

    // Record operation if provided
    if (operation) {
      this.operations.push(operation);
    }

    // Add to history if enabled
    if (this.options.enableHistory) {
      this._addToHistory(newDocument);
    }

    // Notify subscribers
    this._notifySubscribers({
      type: 'document:updated',
      document: newDocument,
      prevDocument,
      operation,
    });

    // Trigger auto-save
    if (this.options.enableAutoSave) {
      this._scheduleAutoSave();
    }

    return newDocument;
  }

  /**
   * Apply an operation to the document
   */
  applyOperation(type, data) {
    const operation = new DocumentOperation(type, data);

    // Apply the operation based on type
    let newDocument;

    switch (type) {
      case 'canvas:update-elements':
        newDocument = this.document.withElements(data.elements);
        break;

      case 'canvas:update-appstate':
        newDocument = this.document.withAppState(data.appState);
        break;

      case 'canvas:update-files':
        newDocument = this.document.withFiles(data.files);
        break;

      case 'canvas:update-all':
        newDocument = this.document.withCanvasState(data);
        break;

      case 'elements:assign':
        newDocument = this.document.withElementAssignments(data.elements);
        break;

      case 'row:update':
        newDocument = this.document.withRow(data.rowId, data.updates);
        break;

      case 'row:update-multiple':
        newDocument = this.document.withRows(data.rowUpdates);
        break;

      case 'row:remove':
        newDocument = this.document.withoutRow(data.rowId);
        break;

      case 'ocr:update-status':
        newDocument = this.document.withOCRStatus(
          data.rowId,
          data.status,
          data.data
        );
        break;

      case 'ocr:update-result':
        newDocument = this.document.withOCRResult(data.rowId, data.result);
        break;

      case 'validation:update-status':
        newDocument = this.document.withValidationStatus(
          data.rowId,
          data.status,
          data.data
        );
        break;

      case 'validation:update-result':
        newDocument = this.document.withValidationResult(
          data.rowId,
          data.result
        );
        break;

      case 'metadata:update':
        newDocument = this.document.withMetadata(data.metadata);
        break;

      case 'config:update-rows':
        newDocument = this.document.withRowConfig(data.config);
        break;

      default:
        console.warn(`Unknown operation type: ${type}`);
        return this.document;
    }

    return this.updateDocument(newDocument, operation);
  }

  // ===== History Management =====

  /**
   * Add document to history
   */
  _addToHistory(document) {
    // Remove any history after current index (on new branch)
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Add new document
    this.history.push(document);

    // Enforce history limit
    if (this.history.length > this.options.historyLimit) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }

    // Ensure index is within bounds
    this.historyIndex = Math.min(this.historyIndex, this.history.length - 1);
  }

  /**
   * Can undo?
   */
  canUndo() {
    return this.historyIndex > 0;
  }

  /**
   * Can redo?
   */
  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Undo to previous version
   */
  undo() {
    if (!this.canUndo()) {
      return this.document;
    }

    this.historyIndex--;
    this.document = this.history[this.historyIndex];

    this._notifySubscribers({
      type: 'history:undo',
      document: this.document,
    });

    return this.document;
  }

  /**
   * Redo to next version
   */
  redo() {
    if (!this.canRedo()) {
      return this.document;
    }

    this.historyIndex++;
    this.document = this.history[this.historyIndex];

    this._notifySubscribers({
      type: 'history:redo',
      document: this.document,
    });

    return this.document;
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [this.document];
    this.historyIndex = 0;
    this.operations = [];
  }

  // ===== Persistence =====

  /**
   * Load document from storage or create new
   */
  loadOrCreate() {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.document = MagicCanvasDocument.fromJSON(data.document);
        this.lastSavedVersion = this.document.version;

        // Initialize history with loaded document
        this.history = [this.document];
        this.historyIndex = 0;

        console.log('Loaded document:', this.document.id);
      } else {
        this.createNew();
      }
    } catch (error) {
      console.error('Failed to load document:', error);
      this.createNew();
    }
  }

  /**
   * Create new document
   */
  createNew() {
    this.document = new MagicCanvasDocument();
    this.history = [this.document];
    this.historyIndex = 0;
    this.operations = [];
    this.lastSavedVersion = -1;

    this._notifySubscribers({
      type: 'document:created',
      document: this.document,
    });

    console.log('Created new document:', this.document.id);
  }

  /**
   * Save document to storage
   */
  save() {
    try {
      const data = {
        document: this.document.toJSON(),
        savedAt: Date.now(),
        version: this.document.version,
      };

      localStorage.setItem(this.options.storageKey, JSON.stringify(data));
      this.lastSavedVersion = this.document.version;

      this._notifySubscribers({
        type: 'document:saved',
        document: this.document,
      });

      console.log('Saved document:', this.document.id, 'version:', this.document.version);
      return true;
    } catch (error) {
      console.error('Failed to save document:', error);
      this._notifySubscribers({
        type: 'document:save-failed',
        error,
      });
      return false;
    }
  }

  /**
   * Schedule auto-save (debounced)
   */
  _scheduleAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      if (this.hasUnsavedChanges()) {
        this.save();
      }
    }, this.options.autoSaveDelay);
  }

  /**
   * Export document as JSON string
   */
  exportJSON() {
    return JSON.stringify(this.document.toJSON(), null, 2);
  }

  /**
   * Import document from JSON string
   */
  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const newDocument = MagicCanvasDocument.fromJSON(data);

      this.document = newDocument;
      this.clearHistory();
      this.history = [newDocument];
      this.historyIndex = 0;
      this.lastSavedVersion = -1;

      this._notifySubscribers({
        type: 'document:imported',
        document: newDocument,
      });

      return newDocument;
    } catch (error) {
      console.error('Failed to import document:', error);
      throw error;
    }
  }

  // ===== Subscriptions =====

  /**
   * Subscribe to document changes
   * Returns unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers
   */
  _notifySubscribers(event) {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in subscriber:', error);
      }
    });
  }

  // ===== Queries =====

  /**
   * Get operation history
   */
  getOperations(limit = 100) {
    return this.operations.slice(-limit);
  }

  /**
   * Get statistics about the document
   */
  getStats() {
    const doc = this.document;
    return {
      version: doc.version,
      elementCount: doc.elements.length,
      rowCount: doc.rows.size,
      ocrCompleteCount: doc.getAllRows().filter(r => r.ocrStatus === 'complete').length,
      validationCompleteCount: doc.getAllRows().filter(r => r.validationStatus !== 'unchecked').length,
      hasUnsavedChanges: this.hasUnsavedChanges(),
      historySize: this.history.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    };
  }
}

/**
 * Create a singleton instance for the app
 */
let defaultStore = null;

export function getDefaultStore() {
  if (!defaultStore) {
    defaultStore = new DocumentStore();
  }
  return defaultStore;
}

export function resetDefaultStore() {
  defaultStore = null;
}
