/**
 * useRowInfoSync Hook
 *
 * Synchronizes row information with Excalidraw canvas elements.
 * Updates row info elements whenever row state changes.
 */

import { useEffect, useRef, useCallback } from 'react';
import { generateAllRowInfoElements, removeRowInfoElements } from '../utils/rowElements';

export function useRowInfoSync({
  excalidrawAPI,
  document,
  selectedRow,
  debugMode,
  enabled = true,
}) {
  const lastUpdateRef = useRef(0);
  const updateTimeoutRef = useRef(null);

  /**
   * Update row info elements on the canvas
   */
  const updateRowInfo = useCallback(() => {
    if (!excalidrawAPI || !enabled) return;

    try {
      const appState = excalidrawAPI.getAppState();
      if (!appState) return;

      const viewport = {
        x: appState.scrollX || 0,
        y: appState.scrollY || 0,
        width: appState.width || window.innerWidth,
        height: appState.height || window.innerHeight,
      };

      // Get current scene elements
      const currentElements = excalidrawAPI.getSceneElements();

      // Remove old row info elements
      const cleanElements = removeRowInfoElements(currentElements);

      // Get all rows
      const allRows = document.getAllRows();

      // Generate new row info elements
      const rowInfoElements = generateAllRowInfoElements(
        allRows,
        viewport,
        selectedRow,
        debugMode
      );

      // Combine with existing elements
      const newElements = [...cleanElements, ...rowInfoElements];

      // Update scene
      excalidrawAPI.updateScene({
        elements: newElements,
      });

      lastUpdateRef.current = Date.now();
    } catch (error) {
      console.error('Error updating row info:', error);
    }
  }, [excalidrawAPI, document, selectedRow, debugMode, enabled]);

  /**
   * Debounced update to avoid too frequent updates
   */
  const scheduleUpdate = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce updates by 100ms
    updateTimeoutRef.current = setTimeout(() => {
      updateRowInfo();
    }, 100);
  }, [updateRowInfo]);

  /**
   * Update when document changes
   */
  useEffect(() => {
    if (!enabled) return;

    // Don't update too frequently (max once per 100ms)
    const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
    if (timeSinceLastUpdate < 100) {
      scheduleUpdate();
    } else {
      updateRowInfo();
    }
  }, [document.version, selectedRow, debugMode, enabled, updateRowInfo, scheduleUpdate]);

  /**
   * Update when viewport changes (scroll/zoom)
   */
  useEffect(() => {
    if (!excalidrawAPI || !enabled) return;

    const handleViewportChange = () => {
      scheduleUpdate();
    };

    // Listen for scroll/zoom changes
    // Note: Excalidraw doesn't have direct viewport change events,
    // so we'll rely on document updates to trigger redraws

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [excalidrawAPI, enabled, scheduleUpdate]);

  return {
    updateRowInfo,
    scheduleUpdate,
  };
}
