/**
 * React hooks for document-driven state management
 *
 * These hooks provide a clean interface to the DocumentStore,
 * enabling reactive updates and operations on the MagicCanvasDocument.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getDefaultStore } from '../models/DocumentStore';

/**
 * Main hook for accessing the document and store
 *
 * Usage:
 *   const { document, store } = useDocument();
 *   const row = document.getRow(0);
 */
export function useDocument() {
  const store = useMemo(() => getDefaultStore(), []);
  const [document, setDocument] = useState(() => store.getDocument());
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    // Subscribe to document changes
    const unsubscribe = store.subscribe(event => {
      if (
        event.type === 'document:updated' ||
        event.type === 'document:created' ||
        event.type === 'document:imported' ||
        event.type === 'history:undo' ||
        event.type === 'history:redo'
      ) {
        setDocument(event.document);
      }

      // Force re-render for other events (like save)
      if (event.type === 'document:saved' || event.type === 'document:save-failed') {
        forceUpdate(n => n + 1);
      }
    });

    return unsubscribe;
  }, [store]);

  return {
    document,
    store,
  };
}

/**
 * Hook for performing document operations
 *
 * Usage:
 *   const ops = useDocumentOperations();
 *   ops.updateElements(newElements);
 *   ops.processRow(0);
 */
export function useDocumentOperations() {
  const { store } = useDocument();

  const operations = useMemo(
    () => ({
      // Canvas operations
      updateElements: (elements) => {
        return store.applyOperation('canvas:update-elements', { elements });
      },

      updateAppState: (appState) => {
        return store.applyOperation('canvas:update-appstate', { appState });
      },

      updateFiles: (files) => {
        return store.applyOperation('canvas:update-files', { files });
      },

      updateCanvasState: ({ elements, appState, files }) => {
        return store.applyOperation('canvas:update-all', {
          elements,
          appState,
          files,
        });
      },

      // Element assignment
      assignElements: (elements) => {
        return store.applyOperation('elements:assign', { elements });
      },

      // Row operations
      updateRow: (rowId, updates) => {
        return store.applyOperation('row:update', { rowId, updates });
      },

      updateRows: (rowUpdates) => {
        return store.applyOperation('row:update-multiple', { rowUpdates });
      },

      removeRow: (rowId) => {
        return store.applyOperation('row:remove', { rowId });
      },

      // OCR operations
      updateOCRStatus: (rowId, status, data = {}) => {
        return store.applyOperation('ocr:update-status', {
          rowId,
          status,
          data,
        });
      },

      updateOCRResult: (rowId, result) => {
        return store.applyOperation('ocr:update-result', { rowId, result });
      },

      // Validation operations
      updateValidationStatus: (rowId, status, data = {}) => {
        return store.applyOperation('validation:update-status', {
          rowId,
          status,
          data,
        });
      },

      updateValidationResult: (rowId, result) => {
        return store.applyOperation('validation:update-result', {
          rowId,
          result,
        });
      },

      // Metadata operations
      updateMetadata: (metadata) => {
        return store.applyOperation('metadata:update', { metadata });
      },

      updateRowConfig: (config) => {
        return store.applyOperation('config:update-rows', { config });
      },
    }),
    [store]
  );

  return operations;
}

/**
 * Hook for document history (undo/redo)
 *
 * Usage:
 *   const { canUndo, canRedo, undo, redo } = useDocumentHistory();
 */
export function useDocumentHistory() {
  const { store } = useDocument();
  const [canUndo, setCanUndo] = useState(store.canUndo());
  const [canRedo, setCanRedo] = useState(store.canRedo());

  useEffect(() => {
    const unsubscribe = store.subscribe(event => {
      if (
        event.type === 'document:updated' ||
        event.type === 'history:undo' ||
        event.type === 'history:redo'
      ) {
        setCanUndo(store.canUndo());
        setCanRedo(store.canRedo());
      }
    });

    return unsubscribe;
  }, [store]);

  const undo = useCallback(() => {
    return store.undo();
  }, [store]);

  const redo = useCallback(() => {
    return store.redo();
  }, [store]);

  const clearHistory = useCallback(() => {
    return store.clearHistory();
  }, [store]);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    clearHistory,
  };
}

/**
 * Hook for document persistence
 *
 * Usage:
 *   const { save, hasUnsavedChanges, lastSaved } = useDocumentPersistence();
 */
export function useDocumentPersistence() {
  const { store } = useDocument();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(
    store.hasUnsavedChanges()
  );
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    const unsubscribe = store.subscribe(event => {
      if (event.type === 'document:updated') {
        setHasUnsavedChanges(store.hasUnsavedChanges());
      }

      if (event.type === 'document:saved') {
        setHasUnsavedChanges(false);
        setLastSaved(Date.now());
      }
    });

    return unsubscribe;
  }, [store]);

  const save = useCallback(() => {
    return store.save();
  }, [store]);

  const exportJSON = useCallback(() => {
    return store.exportJSON();
  }, [store]);

  const importJSON = useCallback(
    (jsonString) => {
      return store.importJSON(jsonString);
    },
    [store]
  );

  const createNew = useCallback(() => {
    return store.createNew();
  }, [store]);

  return {
    save,
    hasUnsavedChanges,
    lastSaved,
    exportJSON,
    importJSON,
    createNew,
  };
}

/**
 * Hook to get specific row with reactive updates
 *
 * Usage:
 *   const row = useRow(0);
 */
export function useRow(rowId) {
  const { document } = useDocument();
  const row = document.getRow(rowId);
  return row;
}

/**
 * Hook to get all rows with reactive updates
 *
 * Usage:
 *   const rows = useAllRows();
 */
export function useAllRows() {
  const { document } = useDocument();
  const rows = document.getAllRows();
  return rows;
}

/**
 * Hook to get document statistics
 *
 * Usage:
 *   const stats = useDocumentStats();
 */
export function useDocumentStats() {
  const { store } = useDocument();
  const [stats, setStats] = useState(() => store.getStats());

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setStats(store.getStats());
    });

    return unsubscribe;
  }, [store]);

  return stats;
}
