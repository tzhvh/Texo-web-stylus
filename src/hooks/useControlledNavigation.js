/**
 * useControlledNavigation Hook
 *
 * Manages structured navigation state for d-pad controlled canvas.
 * Replaces free-form Excalidraw pan/zoom with grid-aligned, row-based navigation.
 *
 * Features:
 * - Grid-aligned viewport positioning
 * - Row-based navigation
 * - Fixed zoom levels
 * - Keyboard shortcut support
 * - Drawing mode constraints
 *
 * @hook useControlledNavigation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { GRID_CONFIG, GridCalculator } from '../config/gridConfig.js';
import Logger from '../utils/logger.js';

/**
 * @typedef {Object} NavigationState
 * @property {number} currentRowIndex - Current focused row index
 * @property {number} xOffset - Horizontal scroll offset in pixels
 * @property {number} zoomLevel - Current zoom level (0.5, 1, 1.5, 2)
 * @property {boolean} drawingEnabled - Whether drawing mode is active
 * @property {Function} navigateToRow - Navigate to specific row
 * @property {Function} setZoom - Set zoom level
 * @property {Function} toggleDrawing - Toggle drawing mode
 * @property {Function} getViewportBounds - Get current viewport bounds
 */

export default function useControlledNavigation({ excalidrawAPI, debugMode = false }) {
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [xOffset, setXOffset] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [drawingEnabled, setDrawingEnabled] = useState(false);

  const keydownHandlerRef = useRef(null);

  /**
   * Navigate to specific row with optional horizontal offset
   * Viewport is centered on the row
   */
  const navigateToRow = useCallback((rowIndex, newXOffset = null) => {
    if (!excalidrawAPI) return;

    const clampedRowIndex = Math.max(0, rowIndex);
    const rowBounds = GridCalculator.getRowBounds(clampedRowIndex);

    // Calculate viewport to center on row
    const viewportHeight = window.innerHeight;
    const scrollY = rowBounds.yCenter - (viewportHeight / 2);
    const scrollX = newXOffset !== null ? newXOffset : xOffset;

    // Update Excalidraw viewport
    try {
      excalidrawAPI.updateScene({
        appState: {
          scrollY,
          scrollX,
          zoom: { value: zoomLevel }
        }
      });

      setCurrentRowIndex(clampedRowIndex);
      if (newXOffset !== null) {
        setXOffset(newXOffset);
      }

      if (debugMode) {
        Logger.debug('ControlledNavigation', 'Navigated to row', {
          rowIndex: clampedRowIndex,
          rowId: `row-${clampedRowIndex}`,
          scrollY,
          scrollX,
          yCenter: rowBounds.yCenter
        });
      }
    } catch (error) {
      Logger.error('ControlledNavigation', 'Navigation failed', {
        error: error.message,
        rowIndex: clampedRowIndex
      });
    }
  }, [excalidrawAPI, xOffset, zoomLevel, debugMode]);

  /**
   * Set zoom level (restricted to fixed levels)
   */
  const setZoom = useCallback((newZoom) => {
    if (!excalidrawAPI) return;

    const allowedZooms = [0.5, 1, 1.5, 2];
    const clampedZoom = allowedZooms.reduce((prev, curr) =>
      Math.abs(curr - newZoom) < Math.abs(prev - newZoom) ? curr : prev
    );

    try {
      excalidrawAPI.updateScene({
        appState: {
          zoom: { value: clampedZoom }
        }
      });

      setZoomLevel(clampedZoom);

      if (debugMode) {
        Logger.debug('ControlledNavigation', 'Zoom changed', {
          requestedZoom: newZoom,
          appliedZoom: clampedZoom
        });
      }
    } catch (error) {
      Logger.error('ControlledNavigation', 'Zoom change failed', {
        error: error.message
      });
    }
  }, [excalidrawAPI, debugMode]);

  /**
   * Toggle drawing mode
   * When drawing is enabled, only strokes in current row are allowed
   */
  const toggleDrawing = useCallback(() => {
    setDrawingEnabled(prev => !prev);

    if (debugMode) {
      Logger.debug('ControlledNavigation', 'Drawing mode toggled', {
        enabled: !drawingEnabled,
        currentRow: `row-${currentRowIndex}`
      });
    }
  }, [drawingEnabled, currentRowIndex, debugMode]);

  /**
   * Get current viewport bounds
   */
  const getViewportBounds = useCallback(() => {
    if (!excalidrawAPI) return null;

    const appState = excalidrawAPI.getAppState();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    return {
      scrollX: appState.scrollX || 0,
      scrollY: appState.scrollY || 0,
      zoom: appState.zoom?.value || 1,
      viewportHeight,
      viewportWidth,
      currentRowIndex,
      currentRowId: `row-${currentRowIndex}`
    };
  }, [excalidrawAPI, currentRowIndex]);

  /**
   * Get constraints for drawing in current row
   */
  const getDrawingConstraints = useCallback(() => {
    const rowBounds = GridCalculator.getRowBounds(currentRowIndex);

    return {
      rowId: `row-${currentRowIndex}`,
      yMin: rowBounds.yStart,
      yMax: rowBounds.yEnd,
      yCenter: rowBounds.yCenter,
      xMin: 0,
      xMax: GRID_CONFIG.CANVAS_WIDTH,
      drawingEnabled
    };
  }, [currentRowIndex, drawingEnabled]);

  /**
   * Keyboard shortcuts for navigation
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          navigateToRow(currentRowIndex - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigateToRow(currentRowIndex + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setXOffset(prev => {
            const newOffset = Math.max(0, prev - 200);
            navigateToRow(currentRowIndex, newOffset);
            return newOffset;
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setXOffset(prev => {
            const newOffset = Math.min(GRID_CONFIG.CANVAS_WIDTH - 600, prev + 200);
            navigateToRow(currentRowIndex, newOffset);
            return newOffset;
          });
          break;
        case ' ':
          e.preventDefault();
          toggleDrawing();
          break;
        case 'Home':
          e.preventDefault();
          navigateToRow(0, 0);
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom(zoomLevel * 1.5);
          break;
        case '-':
        case '_':
          e.preventDefault();
          setZoom(zoomLevel / 1.5);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    keydownHandlerRef.current = handleKeyDown;

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentRowIndex, navigateToRow, toggleDrawing, zoomLevel, setZoom]);

  /**
   * Disable Excalidraw's native pan/zoom gestures
   */
  useEffect(() => {
    if (!excalidrawAPI) return;

    // Disable wheel zoom
    const canvas = document.querySelector('.excalidraw');
    if (canvas) {
      const preventWheel = (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      canvas.addEventListener('wheel', preventWheel, { passive: false });

      return () => {
        canvas.removeEventListener('wheel', preventWheel);
      };
    }
  }, [excalidrawAPI]);

  return {
    // State
    currentRowIndex,
    xOffset,
    zoomLevel,
    drawingEnabled,

    // Actions
    navigateToRow,
    setZoom,
    toggleDrawing,

    // Queries
    getViewportBounds,
    getDrawingConstraints
  };
}
