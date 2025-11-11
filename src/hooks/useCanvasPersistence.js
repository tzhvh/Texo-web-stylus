/**
 * Canvas Persistence Hook
 * Saves and loads canvas state (elements + row data) to localStorage
 * Future: migrate to IndexedDB workspace system
 */

import { useState, useEffect, useCallback } from 'react';
import Logger from '../utils/logger';

const STORAGE_KEY_PREFIX = 'unified-canvas-';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export function useCanvasPersistence(documentId = 'default') {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const storageKey = `${STORAGE_KEY_PREFIX}${documentId}`;

  /**
   * Save canvas state
   */
  const saveCanvas = useCallback(async (canvasData) => {
    if (!canvasData) return;

    setIsSaving(true);

    try {
      const data = {
        version: 1,
        documentId,
        timestamp: Date.now(),
        canvasData: {
          elements: canvasData.elements || [],
          appState: canvasData.appState || {},
          files: canvasData.files || {}
        },
        rowData: canvasData.rowData || {},
        metadata: {
          elementCount: canvasData.elements?.length || 0,
          rowCount: Object.keys(canvasData.rowData || {}).length
        }
      };

      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify(data));

      setLastSaved(Date.now());
      setHasUnsavedChanges(false);

      Logger.info('CanvasPersistence', `Saved canvas "${documentId}"`, {
        elements: data.metadata.elementCount,
        rows: data.metadata.rowCount
      });

      return true;

    } catch (error) {
      Logger.error('CanvasPersistence', 'Failed to save canvas', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [documentId, storageKey]);

  /**
   * Load canvas state
   */
  const loadCanvas = useCallback(async () => {
    try {
      const stored = localStorage.getItem(storageKey);

      if (!stored) {
        Logger.debug('CanvasPersistence', `No saved data for "${documentId}"`);
        return null;
      }

      const data = JSON.parse(stored);

      Logger.info('CanvasPersistence', `Loaded canvas "${documentId}"`, {
        elements: data.metadata?.elementCount || 0,
        rows: data.metadata?.rowCount || 0,
        savedAt: new Date(data.timestamp).toLocaleString()
      });

      setLastSaved(data.timestamp);

      return {
        elements: data.canvasData.elements,
        appState: data.canvasData.appState,
        files: data.canvasData.files,
        rowData: data.rowData
      };

    } catch (error) {
      Logger.error('CanvasPersistence', 'Failed to load canvas', error);
      return null;
    }
  }, [documentId, storageKey]);

  /**
   * Clear saved canvas
   */
  const clearCanvas = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setLastSaved(null);
      setHasUnsavedChanges(false);

      Logger.info('CanvasPersistence', `Cleared canvas "${documentId}"`);
      return true;

    } catch (error) {
      Logger.error('CanvasPersistence', 'Failed to clear canvas', error);
      return false;
    }
  }, [documentId, storageKey]);

  /**
   * Export canvas to JSON
   */
  const exportCanvas = useCallback(async (canvasData, filename = null) => {
    if (!canvasData) return;

    try {
      const data = {
        version: 1,
        documentId,
        exportedAt: Date.now(),
        canvasData: {
          elements: canvasData.elements || [],
          appState: canvasData.appState || {},
          files: canvasData.files || {}
        },
        rowData: canvasData.rowData || {}
      };

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `canvas-${documentId}-${Date.now()}.json`;
      link.click();

      URL.revokeObjectURL(url);

      Logger.info('CanvasPersistence', `Exported canvas "${documentId}"`);
      return true;

    } catch (error) {
      Logger.error('CanvasPersistence', 'Failed to export canvas', error);
      return false;
    }
  }, [documentId]);

  /**
   * Import canvas from JSON
   */
  const importCanvas = useCallback(async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.canvasData) {
        throw new Error('Invalid canvas file format');
      }

      Logger.info('CanvasPersistence', 'Imported canvas', {
        elements: data.canvasData.elements?.length || 0,
        rows: Object.keys(data.rowData || {}).length
      });

      return {
        elements: data.canvasData.elements,
        appState: data.canvasData.appState,
        files: data.canvasData.files,
        rowData: data.rowData
      };

    } catch (error) {
      Logger.error('CanvasPersistence', 'Failed to import canvas', error);
      return null;
    }
  }, []);

  /**
   * List all saved canvases
   */
  const listCanvases = useCallback(() => {
    const canvases = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          canvases.push({
            id: data.documentId,
            timestamp: data.timestamp,
            elementCount: data.metadata?.elementCount || 0,
            rowCount: data.metadata?.rowCount || 0
          });
        } catch (error) {
          // Skip invalid data
        }
      }
    }

    return canvases.sort((a, b) => b.timestamp - a.timestamp);
  }, []);

  /**
   * Mark as having unsaved changes
   */
  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  return {
    saveCanvas,
    loadCanvas,
    clearCanvas,
    exportCanvas,
    importCanvas,
    listCanvases,
    markDirty,
    isSaving,
    lastSaved,
    hasUnsavedChanges
  };
}
