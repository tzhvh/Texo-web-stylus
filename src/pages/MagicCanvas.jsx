import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Helmet } from "react-helmet-async";
import {
  Excalidraw,
  convertToExcalidrawElements,
  getSceneVersion,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useDebug } from "../contexts/DebugContext";
import useRowSystem from "../hooks/useRowSystem.js";
import RowManager from "../utils/rowManager.js";
import {
  saveSessionState,
  loadSessionState,
  saveMagicCanvasState,
  loadMagicCanvasState
} from "../utils/workspaceDB.js";
import { MemoizedRowHeader } from "../components/RowHeader.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import RowNavigator from "../components/RowNavigator.jsx";
import RowAnnouncer from "../components/RowAnnouncer.jsx";
import { scrollToRow } from "../utils/scrollToRow.js";
import Logger from "../utils/logger.js";

// Infinite canvas configuration
const CANVAS_CONFIG = {
  MIN_Y: -50000,
  MAX_Y: 50000,
  MAX_WIDTH: 10000, // Increased width for better coverage on large screens/zooms (Story 1.3)
  BACKGROUND_COLOR: "#f5f5f5", // Light gray per design
};

// Create guide lines (horizontal ruled lines for row guidance - Story 1.3)
const createGuideLine = (y, id) => {
  const guideLine = convertToExcalidrawElements([
    {
      type: "line",
      x: 0,
      y: y,
      width: CANVAS_CONFIG.MAX_WIDTH,
      height: 0,
      strokeColor: "#d3d3d3", // Light gray per Story 1.3, Task 2.1
      backgroundColor: "transparent",
      strokeWidth: 1, // 1px stroke per Story 1.3, Task 2.2
      strokeStyle: "solid",
      roughness: 0,
      opacity: 30, // Subtle opacity for non-interference per Story 1.3, Task 2.1
      locked: true, // Prevent user interaction per Story 1.3, Task 2.3
      isDeleted: false,
      id: id || `guide-${y}`,
    },
  ]);
  return guideLine[0];
};

// Create active row highlight (Story 1.3, Task 3)
const createActiveRowHighlight = (row) => {
  if (!row) return null;

  const highlight = convertToExcalidrawElements([
    {
      type: "rectangle",
      x: 0,
      y: row.yStart,
      width: CANVAS_CONFIG.MAX_WIDTH,
      height: row.yEnd - row.yStart,
      strokeColor: "#3b82f6", // Blue highlight
      backgroundColor: "transparent", // Transparent background
      strokeWidth: 2, // Distinct border
      strokeStyle: "solid",
      roughness: 0,
      opacity: 100,
      locked: true, // Prevent interaction
      isDeleted: false,
      id: `highlight-${row.id}`,
    },
  ]);
  return highlight[0];
};

// Generate guide lines with correct 384px spacing for OCR alignment (Story 1.3)
const generateGuideLines = (spacing = 384) => {
  const guideLines = [];
  for (let y = CANVAS_CONFIG.MIN_Y; y <= CANVAS_CONFIG.MAX_Y; y += spacing) {
    guideLines.push(createGuideLine(y));
  }
  return guideLines;
};

const initialGuideLines = generateGuideLines(384); // Explicit 384px spacing for OCR tile alignment

// Viewport culling: Only generate guide lines visible in current view + buffer (Story 1.3, Task 4.1)
const generateViewportGuideLines = (
  viewportY,
  viewportHeight,
  spacing = 384,
  buffer = 2000,
) => {
  const startY = Math.floor((viewportY - buffer) / spacing) * spacing;
  const endY =
    Math.ceil((viewportY + viewportHeight + buffer) / spacing) * spacing;

  const guideLines = [];
  for (let y = startY; y <= endY; y += spacing) {
    guideLines.push(createGuideLine(y));
  }
  return guideLines;
};

// Debounced guide line regeneration for performance during zoom/pan (Story 1.3, Task 4.2)
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

function MagicCanvasComponent() {
  const { debugMode } = useDebug();
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [canvasState, setCanvasState] = useState({
    zoomLevel: 1,
    scrollX: 0,
    scrollY: 0,
  });
  const [elementCount, setElementCount] = useState(0);

  // Track viewport for RowHeader rendering
  const [viewport, setViewport] = useState({
    y: 0,
    height: 600, // Default viewport height
    width: CANVAS_CONFIG.MAX_WIDTH
  });
  const [guideLineSpacing] = useState(384); // Story 1.3: 384px spacing for OCR alignment
  const guideLineRef = useRef(initialGuideLines);
  const viewportGuideLinesRef = useRef(null); // Cache for viewport-culled lines

  // Story 1.9: Track total rows for RowAnnouncer accessibility
  const [totalRows, setTotalRows] = useState(0);

  // Initialize RowManager for element-to-row assignments (Story 1.5)
  const [rowManager] = useState(() => {
    const manager = new RowManager({
      rowHeight: 384,
      startY: 0
    });

    // Story 1.2: Initialize with row 0 as active (single-active-row model)
    manager.setActiveRow('row-0');

    return manager;
  });

  // Initialize useRowSystem hook for canvas-row synchronization (Story 1.5)
  const {
    elementToRow,
    handleCanvasChange: handleRowSystemChange,
    getElementRow,
    getRowCount,
    stats: rowStats,
    saveState,
    loadState,
    isSaving,
    isLoading,
    handleRowTap, // Story 1.5: Row tap activation
    getActiveRow, // Story 1.5: Get active row for highlighting
    activeRowId // Story 1.4: Reactive active row ID for UI updates
  } = useRowSystem({
    excalidrawAPI,
    rowManager,
    debounceMs: 50,
    debugMode,
    workspaceId: 'magic-canvas-default',
    autoSaveMs: 2000
  });

  // Safeguard: Track render count to detect infinite loops
  const renderCountRef = useRef(0);
  const lastOnChangeTimeRef = useRef(0);
  const updateLoopCounterRef = useRef(0);
  const lastLoopResetTimeRef = useRef(0);
  const lastSceneVersionRef = useRef(0);
  const lastAppStateRef = useRef({});
  const canvasSaveTimeoutRef = useRef(null);

  // Track render count in useEffect, not during render
  useEffect(() => {
    if (debugMode) {
      renderCountRef.current += 1;
      if (renderCountRef.current > 100) {
        console.warn(
          "MagicCanvas: High render count detected (",
          renderCountRef.current,
          ") - potential infinite loop",
        );
      }
    }
  }, [debugMode]);

  // Memoize initialData to prevent re-creation on every render
  const initialData = React.useMemo(
    () => ({
      appState: {
        viewBackgroundColor: CANVAS_CONFIG.BACKGROUND_COLOR,
        currentItemStrokeColor: "#000000",
        currentItemBackgroundColor: "transparent",
        currentItemFillStyle: "solid",
        currentItemStrokeWidth: 2,
        currentItemRoughness: 0,
        currentItemOpacity: 100,
        zoom: { value: 1 },
        scrollX: 0,
        scrollY: 0,
      },
      elements: [],
      scrollToContent: false,
    }),
    [],
  );

  // Update guide lines based on viewport for performance (Story 1.3, Task 4.1, 4.2, 4.3)
  const updateViewportGuideLines = useCallback(() => {
    if (!excalidrawAPI) return;

    // Performance monitoring (Story 1.3, Task 4.3)
    const startTime = performance.now();

    try {
      // Get current viewport bounds
      const appState = excalidrawAPI.getAppState();
      const viewportHeight = window.innerHeight;
      const viewportY = appState.scrollY || 0;

      // Generate viewport-culled guide lines (Story 1.3, Task 4.1)
      const viewportGuideLines = generateViewportGuideLines(
        viewportY,
        viewportHeight,
        guideLineSpacing,
      );

      // Generate active row highlight (Story 1.3, Task 3)
      const activeRow = rowManager.getActiveRow();
      const activeRowHighlight = createActiveRowHighlight(activeRow);

      const backgroundElements = activeRowHighlight
        ? [activeRowHighlight, ...viewportGuideLines]
        : viewportGuideLines;

      // Get existing user elements (exclude guide lines and highlights)
      const allElements = excalidrawAPI.getSceneElements();
      const userElements = allElements.filter(
        (el) => !el.id?.startsWith("guide-") && !el.id?.startsWith("highlight-") && !el.isDeleted,
      );

      // Update scene with user elements + viewport guide lines
      // Story 1.6 Fix: Put background elements FIRST so they are behind user elements
      excalidrawAPI.updateScene({
        elements: [...backgroundElements, ...userElements],
      });

      // Cache for performance comparison
      viewportGuideLinesRef.current = backgroundElements;

      // Performance measurement (Story 1.3, Task 4.3)
      const duration = performance.now() - startTime;

      if (debugMode) {
        console.log(
          `Guide lines: Generated ${viewportGuideLines.length} lines + highlight for viewport Y=${Math.round(viewportY)}, height=${viewportHeight} in ${duration.toFixed(2)}ms`,
        );

        // Performance warning if >16ms (60fps target)
        if (duration > 16) {
          console.warn(
            `Guide line update took ${duration.toFixed(2)}ms (>16ms target for 60fps)`,
          );
        }
      }
    } catch (error) {
      console.error("Failed to update viewport guide lines:", error);
    }
  }, [excalidrawAPI, guideLineSpacing, debugMode, rowManager, activeRowId]); // Include activeRowId to trigger updates on row change

  // Story 1.7: Save complete Magic Canvas state (canvas + row state) atomically to IndexedDB
  const saveCanvasState = useCallback(async () => {
    if (!excalidrawAPI || !rowManager) return;

    try {
      const startTime = performance.now();

      // Gather canvas state from Excalidraw
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const canvasState = {
        elements: elements,
        appState: appState
      };

      // Serialize RowManager state
      const rowManagerState = rowManager.serialize();

      // Atomic save of both states (Story 1.7, AC #1)
      await saveMagicCanvasState(canvasState, rowManagerState);

      const duration = performance.now() - startTime;

      if (debugMode) {
        console.log('MagicCanvas: Complete state saved to IndexedDB (Story 1.7)', {
          elementCount: elements.length,
          rowCount: rowManagerState.rows.length,
          activeRowId: rowManagerState.activeRowId,
          zoom: appState.zoom?.value,
          scrollY: appState.scrollY,
          saveTime: duration.toFixed(2) + 'ms'
        });
      }
    } catch (error) {
      console.error('MagicCanvas: Failed to save complete state (Story 1.7)', error);
    }
  }, [excalidrawAPI, rowManager, debugMode]);

  // Story 1.7: Load complete Magic Canvas state (canvas + row state) from IndexedDB
  const loadCanvasState = useCallback(async () => {
    if (!excalidrawAPI || !rowManager) return false;

    // Story 1.7, AC #7: Measure restoration time
    const startTime = performance.now();

    try {
      // Story 1.7, AC #1: Load atomic state from IndexedDB
      const savedState = await loadMagicCanvasState();

      if (savedState && savedState.canvasState && savedState.rowManagerState) {
        // Story 1.7, AC #3, #4, #5, #10: Restore RowManager state
        rowManager.deserialize(savedState.rowManagerState);

        // Story 1.7, AC #2, #6: Restore Excalidraw canvas (elements + zoom level)
        excalidrawAPI.updateScene({
          elements: savedState.canvasState.elements,
          appState: savedState.canvasState.appState
        });

        const duration = performance.now() - startTime;

        // Story 1.7, AC #7: Performance assertion (<1s for typical canvas)
        if (duration > 1000) {
          console.warn('MagicCanvas: Restoration took longer than 1s (AC #7 violation)', {
            duration: duration.toFixed(2) + 'ms',
            elementCount: savedState.canvasState.elements?.length || 0
          });
        }

        if (debugMode) {
          console.log('MagicCanvas: Complete state restored from IndexedDB (Story 1.7)', {
            elementCount: savedState.canvasState.elements?.length || 0,
            rowCount: savedState.rowManagerState.rows?.length || 0,
            activeRowId: savedState.rowManagerState.activeRowId,
            zoom: savedState.canvasState.appState?.zoom?.value,
            scrollY: savedState.canvasState.appState?.scrollY,
            restorationTime: duration.toFixed(2) + 'ms',
            performanceTarget: duration < 1000 ? 'PASS' : 'FAIL'
          });
        }

        return true;
      }

      // Story 1.7, AC #8: No saved state, will initialize with defaults
      if (debugMode) {
        console.log('MagicCanvas: No saved state found, will initialize with defaults (AC #8)');
      }

      return false;
    } catch (error) {
      // Story 1.7, AC #9: Corruption detected, fallback to empty canvas
      console.error('MagicCanvas: Failed to restore state (possible corruption - AC #9)', error);

      // Alert user about corruption recovery
      alert('Failed to restore previous canvas state. Starting with empty canvas.\n\nError: ' + error.message);

      // Initialize with default row (row-0) per AC #8
      if (rowManager) {
        const defaultRowId = 'row-0';
        if (!rowManager.getRow(defaultRowId)) {
          const newRow = rowManager.createNewRow();
          rowManager.setActiveRow(newRow);
        } else {
          rowManager.setActiveRow(defaultRowId);
        }
      }

      return false;
    }
  }, [excalidrawAPI, rowManager, debugMode]);

  // Initialize canvas with guide lines and load saved state (Story 1.3, Task 3.1, 3.2)
  useEffect(() => {
    const initialize = async () => {
      if (!excalidrawAPI) return;

      try {
        // Try to load saved canvas state first
        const stateLoaded = await loadCanvasState();

        if (!stateLoaded) {
          // No saved state, initialize with guide lines using viewport culling for performance
          updateViewportGuideLines();

          if (debugMode) {
            console.log(
              "MagicCanvas: Initialized with guide lines at 384px spacing (no saved state)",
            );
          }
        } else {
          // State loaded, update guide lines for current viewport
          updateViewportGuideLines();

          if (debugMode) {
            console.log(
              "MagicCanvas: Initialized from saved state with guide lines",
            );
          }
        }
      } catch (error) {
        console.error("Failed to initialize Excalidraw scene:", error);

        // Fallback to basic initialization
        try {
          updateViewportGuideLines();
        } catch (fallbackError) {
          console.error("Fallback initialization also failed:", fallbackError);
        }

        if (debugMode) {
          alert("Canvas initialization failed. Please refresh the page.");
        }
      }
    };

    initialize();
  }, [excalidrawAPI, loadCanvasState, updateViewportGuideLines, debugMode]);

  // Debounced version to prevent excessive updates during rapid pan/zoom
  const debouncedUpdateGuideLines = useMemo(
    () => debounce(updateViewportGuideLines, 100), // 100ms debounce per Story 1.3, Task 4.2
    [updateViewportGuideLines],
  );

  // Update guide lines when viewport changes significantly (Story 1.3, Task 5.1, 5.2, 5.3)
  // Also update when active row changes (Story 1.4)
  useEffect(() => {
    if (!excalidrawAPI) return;

    // Update guide lines when scroll position, zoom, or active row changes
    // Zoom-invariant spacing: guide lines maintain 384px spacing in canvas coordinates
    debouncedUpdateGuideLines();

    if (debugMode) {
      console.log(
        `Viewport/Row update: zoom=${Math.round(canvasState.zoomLevel * 100)}%, scrollY=${Math.round(canvasState.scrollY)}, activeRow=${activeRowId}`,
      );
    }
  }, [
    canvasState.scrollY,
    canvasState.zoomLevel,
    excalidrawAPI,
    debouncedUpdateGuideLines,
    debugMode,
    activeRowId // Trigger update when active row changes
  ]);

  // Handle canvas state changes (track zoom, pan, elements)
  // Integrates with useRowSystem for element-to-row assignments (Story 1.5)
  // Enforces drawing constraints within active row bounds (Story 1.2, Task 2)
  const handleCanvasChange = useCallback((elements, appState, files) => {
    const now = Date.now();

    // Throttle: only process if at least 50ms have passed since last update
    if (now - lastOnChangeTimeRef.current < 50) {
      return;
    }

    // Update last call time
    lastOnChangeTimeRef.current = now;

    // Loop Detection: Prevent infinite update loops
    if (now - lastLoopResetTimeRef.current > 1000) {
      // Reset counter if more than 1 second has passed
      updateLoopCounterRef.current = 0;
      lastLoopResetTimeRef.current = now;
    } else {
      updateLoopCounterRef.current += 1;
      if (updateLoopCounterRef.current > 50) {
        if (debugMode && updateLoopCounterRef.current === 51) {
          console.warn("MagicCanvas: Infinite loop detected in onChange! Throttling updates.");
        }
        return; // Stop processing to break the loop
      }
    }

    // Story 1.6 Fix: Prevent unnecessary updates on mouse move
    // Check if scene content or relevant app state has actually changed
    const sceneVersion = getSceneVersion(elements);
    const relevantAppState = {
      zoom: appState.zoom?.value,
      scrollX: appState.scrollX,
      scrollY: appState.scrollY
    };

    // Deep compare relevant app state
    const isAppStateSame =
      lastAppStateRef.current.zoom === relevantAppState.zoom &&
      lastAppStateRef.current.scrollX === relevantAppState.scrollX &&
      lastAppStateRef.current.scrollY === relevantAppState.scrollY;

    if (sceneVersion === lastSceneVersionRef.current && isAppStateSame) {
      // No meaningful change, skip update
      return;
    }

    // Update refs for next comparison
    lastSceneVersionRef.current = sceneVersion;
    lastAppStateRef.current = relevantAppState;

    // Log warning for debug mode if calls are too frequent
    if (debugMode) {
      console.log("MagicCanvas: onChange processed (", now, "ms)");
    }

    // Story 1.2, Task 2: Apply drawing constraints before processing elements
    const activeRow = rowManager.getActiveRow();
    let constrainedElements = elements;

    if (activeRow) {
      // Filter elements to only those within active row bounds
      constrainedElements = elements.filter(element => {
        // Always allow guide lines and deleted elements
        if (element.id?.startsWith("guide-") || element.isDeleted) {
          return true;
        }

        // Check if element is within active row bounds
        const elementTop = element.y;
        const elementBottom = element.y + (element.height || 0);

        const isInBounds = elementBottom > activeRow.yStart && elementTop < activeRow.yEnd;

        if (!isInBounds && debugMode) {
          console.log("MagicCanvas: Element constrained outside active row", {
            elementId: element.id,
            elementBounds: { top: elementTop, bottom: elementBottom },
            activeRowBounds: { yStart: activeRow.yStart, yEnd: activeRow.yEnd }
          });
        }

        return isInBounds;
      });

      // Update Excalidraw scene to remove constrained elements
      if (constrainedElements.length !== elements.length) {
        // Get current elements from API to avoid infinite loops
        const currentElements = excalidrawAPI.getSceneElements();
        const elementsToRemove = currentElements.filter(el =>
          !constrainedElements.some(kept => kept.id === el.id) &&
          !el.id?.startsWith("guide-") &&
          !el.isDeleted
        );

        if (elementsToRemove.length > 0) {
          // Mark constrained elements as deleted
          const updatedElements = constrainedElements.map(el =>
            elementsToRemove.some(removed => removed.id === el.id)
              ? { ...el, isDeleted: true }
              : el
          );

          excalidrawAPI.updateScene({ elements: updatedElements });

          if (debugMode) {
            console.log("MagicCanvas: Removed constrained elements", {
              constrainedCount: elementsToRemove.length,
              remainingCount: constrainedElements.length
            });
          }
        }
      }
    }

    // Update zoom level and pan position
    const newCanvasState = {
      zoomLevel: appState.zoom?.value || 1,
      scrollX: appState.scrollX || 0,
      scrollY: appState.scrollY || 0,
    };
    setCanvasState(newCanvasState);

    // Update viewport for RowHeader rendering
    const viewportHeight = window.innerHeight * 0.6; // Approximate canvas viewport height
    setViewport({
      y: newCanvasState.scrollY,
      height: viewportHeight,
      width: CANVAS_CONFIG.MAX_WIDTH
    });

    // Count user-drawn elements (exclude guide lines)
    const userElements = constrainedElements.filter(
      (el) => !el.id?.startsWith("guide-") && !el.isDeleted,
    );
    setElementCount(userElements.length);

    // Delegate element assignment to useRowSystem hook (Story 1.5)
    handleRowSystemChange(constrainedElements, appState, files);

    // Schedule canvas state auto-save (debounced)
    if (canvasSaveTimeoutRef.current) {
      clearTimeout(canvasSaveTimeoutRef.current);
    }

    canvasSaveTimeoutRef.current = setTimeout(() => {
      saveCanvasState();
    }, 2000); // 2 second debounce for canvas state
  }, [handleRowSystemChange, saveCanvasState, debugMode, rowManager]); // Include rowManager dependency

  // Clear canvas (keep guide lines)
  const clearCanvas = useCallback(() => {
    if (excalidrawAPI) {
      // Clear user elements but regenerate guide lines for current viewport
      const viewportGuideLines =
        viewportGuideLinesRef.current || initialGuideLines;
      excalidrawAPI.updateScene({
        elements: viewportGuideLines,
      });
      setElementCount(0);

      // Save cleared state
      saveCanvasState();
    }
  }, [excalidrawAPI, saveCanvasState]);

  // Export canvas as PNG (future: integrate with OCR pipeline)
  const exportCanvas = useCallback(async () => {
    if (!excalidrawAPI) {
      alert("Canvas not ready");
      return;
    }

    try {
      // Get all user-drawn elements (exclude guide lines)
      const allElements = excalidrawAPI.getSceneElements();
      const userElements = allElements.filter(
        (el) => !el.id?.startsWith("guide-") && !el.isDeleted,
      );

      if (userElements.length === 0) {
        alert("Nothing to export! Draw something first.");
        return;
      }

      // Create a link to export (future: send to OCR pipeline)
      const appState = excalidrawAPI.getAppState();
      alert(
        `Export ready: ${userElements.length} elements drawn.\n\nIntegration with OCR pipeline coming in Story 2.x`,
      );

      if (debugMode) {
        console.log("Export data:", {
          elementCount: userElements.length,
          zoomLevel: canvasState.zoomLevel,
          scrollPosition: {
            x: canvasState.scrollX,
            y: canvasState.scrollY,
          },
          elements: userElements.map((el) => ({
            type: el.type,
            x: el.x,
            y: el.y,
            id: el.id,
          })),
        });
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Export failed: " + error.message);
    }
  }, [
    excalidrawAPI,
    debugMode,
    canvasState.zoomLevel,
    canvasState.scrollX,
    canvasState.scrollY,
  ]);

  // Open settings panel (Story 1.6 placeholder)
  const openSettings = useCallback(() => {
    alert(
      "Settings panel coming in Story 1.6\n\n" +
      "Future features:\n" +
      "- Background color preferences\n" +
      "- Guide line spacing\n" +
      "- Toolbar visibility\n" +
      "- Zoom/pan presets",
    );
  }, []);

  // Story 1.2, Task 5: Row switching capabilities
  const switchToRow = useCallback((rowId) => {
    if (!rowManager || !excalidrawAPI) return;

    const success = rowManager.setActiveRow(rowId);
    if (!success) {
      if (debugMode) {
        console.warn('MagicCanvas: Failed to switch to row', { rowId });
      }
      return;
    }

    const targetRow = rowManager.getRow(rowId);
    if (targetRow) {
      // Scroll viewport to center the new active row
      const appState = excalidrawAPI.getAppState();
      const viewportHeight = window.innerHeight * 0.6; // Approximate canvas viewport height
      const targetScrollY = targetRow.yStart - (viewportHeight / 2) + (rowManager.rowHeight / 2);

      excalidrawAPI.updateScene({
        appState: {
          ...appState,
          scrollY: targetScrollY
        }
      });

      if (debugMode) {
        console.log('MagicCanvas: Switched to row', {
          rowId,
          targetScrollY,
          rowBounds: { yStart: targetRow.yStart, yEnd: targetRow.yEnd }
        });
      }
    }
  }, [rowManager, excalidrawAPI, debugMode]);

  // Handle swipe gestures for row switching (Story 1.2, Task 5.1)
  useEffect(() => {
    if (!excalidrawAPI) return;

    let touchStartY = null;
    let touchStartTime = null;
    const SWIPE_THRESHOLD = 50; // Minimum vertical distance for swipe
    const SWIPE_TIME_THRESHOLD = 300; // Maximum time for swipe gesture

    const handleTouchStart = (event) => {
      if (event.touches.length !== 1) return; // Only handle single finger touches

      touchStartY = event.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (event) => {
      if (!touchStartY || !touchStartTime) return;

      const touchEndY = event.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;
      const deltaTime = Date.now() - touchStartTime;

      // Check if this is a valid swipe gesture
      if (Math.abs(deltaY) > SWIPE_THRESHOLD && deltaTime < SWIPE_TIME_THRESHOLD) {
        const activeRow = rowManager.getActiveRow();
        if (!activeRow) return;

        let targetRowId = null;

        if (deltaY > 0) {
          // Swipe up - go to previous row
          const currentRowIndex = parseInt(activeRow.id.replace('row-', ''));
          if (currentRowIndex > 0) {
            targetRowId = `row-${currentRowIndex - 1}`;
          }
        } else {
          // Swipe down - go to next row
          const nextRowIndex = parseInt(activeRow.id.replace('row-', '')) + 1;
          targetRowId = `row-${nextRowIndex}`;

          // Ensure the target row exists – use explicit creation per Story 1.10
          if (!rowManager.getRow(targetRowId)) {
            // Create a new row via the explicit API
            const createdRowId = rowManager.createNewRow();
            // Use the newly created ID (should match targetRowId)
            targetRowId = createdRowId;
          }
        }

        if (targetRowId) {
          switchToRow(targetRowId);
        }
      }

      // Reset touch tracking
      touchStartY = null;
      touchStartTime = null;
    };

    // Add touch event listeners to the canvas container
    const canvasElement = excalidrawAPI.getContainer?.();
    if (canvasElement) {
      canvasElement.addEventListener('touchstart', handleTouchStart, { passive: true });
      canvasElement.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      if (canvasElement) {
        canvasElement.removeEventListener('touchstart', handleTouchStart);
        canvasElement.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [excalidrawAPI, rowManager, switchToRow, debugMode]);

  // Handle keyboard navigation for row switching (Story 1.2, Task 5.2)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!rowManager || !excalidrawAPI) return;

      // Only handle arrow keys when not focused on input elements
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const activeRow = rowManager.getActiveRow();
      if (!activeRow) return;

      let targetRowId = null;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          // Switch to previous row
          const currentRowIndex = parseInt(activeRow.id.replace('row-', ''));
          if (currentRowIndex > 0) {
            targetRowId = `row-${currentRowIndex - 1}`;
          }
          break;

        case 'ArrowDown':
          event.preventDefault();
          // Switch to next row (create if needed)
          const nextRowIndex = parseInt(activeRow.id.replace('row-', '')) + 1;
          targetRowId = `row-${nextRowIndex}`;

          // Ensure the target row exists
          if (!rowManager.getRow(targetRowId)) {
            // Create a new row via explicit API (Story 1.10)
            const createdRowId = rowManager.createNewRow();
            targetRowId = createdRowId;
          }
          break;

        default:
          return; // Don't prevent default for other keys
      }

      if (targetRowId) {
        switchToRow(targetRowId);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [rowManager, excalidrawAPI, switchToRow, debugMode]);

  // Story 1.5: Handle canvas click for row tap activation (AC #5)
  useEffect(() => {
    if (!excalidrawAPI || !handleRowTap) return;

    const handleCanvasClick = (event) => {
      // Only handle direct clicks on canvas (not on UI elements)
      if (event.target.closest('button') || event.target.closest('[role="button"]')) {
        return;
      }

      const canvasContainer = excalidrawAPI.getContainer?.();
      if (!canvasContainer) return;

      // Get click position relative to canvas
      const rect = canvasContainer.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Convert screen coordinates to canvas coordinates
      const appState = excalidrawAPI.getAppState();
      const zoom = appState.zoom?.value || 1;
      const scrollX = appState.scrollX || 0;
      const scrollY = appState.scrollY || 0;

      // Calculate canvas Y coordinate
      const canvasY = (clickY / zoom) - scrollY;

      // Attempt row activation
      const wasActivated = handleRowTap(canvasY);

      if (wasActivated && debugMode) {
        console.log('MagicCanvas: Row activated by click', {
          screenY: clickY,
          canvasY,
          zoom,
          scrollY
        });
      }

      // Trigger guide line refresh to show new active row highlight
      if (wasActivated) {
        updateViewportGuideLines();
      }
    };

    const canvasContainer = excalidrawAPI.getContainer?.();
    if (canvasContainer) {
      canvasContainer.addEventListener('click', handleCanvasClick);
    }

    return () => {
      if (canvasContainer) {
        canvasContainer.removeEventListener('click', handleCanvasClick);
      }
    };
  }, [excalidrawAPI, handleRowTap, updateViewportGuideLines, debugMode]);

  // Get visible rows based on current viewport
  const getVisibleRows = useCallback(() => {
    if (!rowManager) return [];

    const { y: viewportY, height: viewportHeight } = viewport;
    const buffer = 500; // Buffer for smooth scrolling
    const startY = viewportY - buffer;
    const endY = viewportY + viewportHeight + buffer;

    // Get all rows from rowManager
    const allRows = rowManager.getAllRows ? rowManager.getAllRows() : [];

    // Filter rows that intersect with viewport
    return allRows.filter(row => {
      return row.yEnd >= startY && row.yStart <= endY;
    });
  }, [rowManager, viewport]);

  // Render RowHeader components for visible rows (Story 1.5: added isActive highlighting)
  const renderRowHeaders = useCallback(() => {
    const visibleRows = getVisibleRows();
    const activeRow = rowManager.getActiveRow();

    return visibleRows.map(row => (
      <MemoizedRowHeader
        key={row.id}
        row={{
          ...row,
          isActive: activeRow?.id === row.id // Story 1.5: Pass active state
        }}
        y={row.yStart + (row.yEnd - row.yStart) / 2} // Center of row
        canvasWidth={CANVAS_CONFIG.MAX_WIDTH}
        debugMode={debugMode}
      />
    ));
  }, [getVisibleRows, debugMode, rowManager]);

  // Story 1.9: Handle row navigation changes (viewport scroll, logging, ARIA updates)
  const handleRowChange = useCallback((newRowId) => {
    // Update total rows count for RowAnnouncer
    const allRows = rowManager.getAllRows ? rowManager.getAllRows() : [];
    setTotalRows(allRows.length);

    // Auto-scroll to center active row - AC #8
    scrollToRow(newRowId, rowManager);

    // Log navigation event
    Logger.log('Row navigation', {
      newRowId,
      totalRows: allRows.length,
      timestamp: Date.now()
    });

    if (debugMode) {
      console.log('MagicCanvas: Row changed via navigation', {
        newRowId,
        totalRows: allRows.length
      });
    }

    // Trigger guide line refresh to show new active row highlight
    updateViewportGuideLines();
  }, [rowManager, updateViewportGuideLines, debugMode]);

  // Story 1.9: Update total rows when rows change
  useEffect(() => {
    const allRows = rowManager.getAllRows ? rowManager.getAllRows() : [];
    setTotalRows(allRows.length);
  }, [elementCount, rowManager]); // Update when elements change

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (canvasSaveTimeoutRef.current) {
        clearTimeout(canvasSaveTimeoutRef.current);
      }
      // Save final canvas state on unmount
      if (excalidrawAPI) {
        saveCanvasState();
      }
    };
  }, [excalidrawAPI, saveCanvasState]);

  return (
    <>
      <Helmet>
        <title>Magic Canvas - Draw Infinitely</title>
      </Helmet>

      <div className="h-screen w-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">Magic Canvas</h1>
          <p className="text-sm text-gray-600 mt-1">
            Draw mathematical expressions on an infinite vertical canvas. Pan,
            zoom, and draw freely.
          </p>
        </div>

        {/* Canvas Container - Story 1.9: Wrapped with RowNavigator for gesture and keyboard navigation */}
        <div className="flex-1 relative overflow-hidden">
          <RowNavigator
            rowManager={rowManager}
            onRowChange={handleRowChange}
          >
            <Excalidraw
              excalidrawAPI={setExcalidrawAPI}
              onChange={handleCanvasChange}
              initialData={initialData}
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                  export: false,
                  saveAsImage: false,
                },
                // Minimal toolbar (hide most actions)
                tools: {
                  image: false,
                },
              }}
            />

            {/* RowHeader Components */}
            <div className="absolute inset-0">
              <div className="relative w-full h-full pointer-events-none">
                {renderRowHeaders()}
              </div>
            </div>
          </RowNavigator>

          {/* Story 1.9: RowAnnouncer for screen reader accessibility - AC #9 */}
          <RowAnnouncer
            activeRow={rowManager.getActiveRow()}
            totalRows={totalRows}
          />
        </div>

        {/* Control Panel (Bottom) */}
        <div className="border-t border-gray-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Status Info */}
            <div className="flex items-center gap-6">
              <div className="text-sm">
                <p className="text-gray-600">Elements drawn</p>
                <p className="text-2xl font-bold text-blue-600">
                  {elementCount}
                </p>
              </div>
              <div className="text-sm">
                <p className="text-gray-600">Zoom level</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(canvasState.zoomLevel * 100)}%
                </p>
              </div>
              <div className="text-sm">
                <p className="text-gray-600">Position</p>
                <p className="font-mono text-xs text-gray-600">
                  Y: {Math.round(canvasState.scrollY)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={clearCanvas}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition font-medium text-sm"
              >
                Clear Canvas
              </button>
              <button
                onClick={exportCanvas}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition font-medium text-sm"
              >
                Export
              </button>
              <button
                onClick={openSettings}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition font-medium text-sm"
              >
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Debug Panel (when debug mode enabled) */}
        {debugMode && (
          <div
            className="fixed bottom-20 right-6 bg-white border-2 border-green-500 rounded p-4 shadow-lg max-w-sm text-xs font-mono z-50"
            style={{ maxHeight: "300px", overflowY: "auto" }}
          >
            <p className="font-bold text-green-600 mb-2">Debug Info</p>
            <div className="space-y-1 text-gray-700">
              <p>Zoom: {Math.round(canvasState.zoomLevel * 100)}%</p>
              <p>Scroll Y: {Math.round(canvasState.scrollY)}</p>
              <p>Scroll X: {Math.round(canvasState.scrollX)}</p>
              <p>Elements: {elementCount}</p>
              <p>
                Guide lines: {viewportGuideLinesRef.current?.length || 0}{" "}
                visible
              </p>
              <p>Guide spacing: {guideLineSpacing}px</p>
              <p>
                Canvas range: Y [{CANVAS_CONFIG.MIN_Y}, {CANVAS_CONFIG.MAX_Y}]
              </p>
              <p>Max width: {CANVAS_CONFIG.MAX_WIDTH}px</p>

              {/* Row System Debug Info (Story 1.5) */}
              <div className="border-t border-gray-300 pt-2 mt-2">
                <p className="font-bold text-blue-600 mb-1">Row System</p>
                <p>Active row: {rowManager.getActiveRow()?.id || 'None'}</p>
                <p>Rows with elements: {getRowCount()}</p>
                <p>Element assignments: {elementToRow.size}</p>
                <p>Total assignments: {rowStats.totalAssignments}</p>
                <p>Avg assignment time: {rowStats.averageAssignmentTime.toFixed(2)}ms</p>
                <p>Last assignment: {rowStats.lastAssignmentTime > 0 ? new Date(rowStats.lastAssignmentTime).toLocaleTimeString() : 'Never'}</p>
                <p>Assignment errors: {rowStats.errorCount}</p>

                {/* Active Row Bounds (Story 1.2, Task 2) */}
                {rowManager.getActiveRow() && (
                  <div className="border-t border-gray-300 pt-1 mt-1">
                    <p className="font-bold text-green-600 mb-1">Active Row Bounds</p>
                    <p>Y: {Math.round(rowManager.getActiveRow().yStart)} - {Math.round(rowManager.getActiveRow().yEnd)}</p>
                    <p>Height: {rowManager.getActiveRow().yEnd - rowManager.getActiveRow().yStart}px</p>
                  </div>
                )}

                {/* Row Switching Info (Story 1.2, Task 5) */}
                <div className="border-t border-gray-300 pt-1 mt-1">
                  <p className="font-bold text-purple-600 mb-1">Row Switching</p>
                  <p>Use ↑↓ arrow keys or swipe gestures</p>
                  <p>Active: {rowManager.getActiveRow()?.id || 'None'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Wrap with ErrorBoundary for graceful error handling
export default function MagicCanvas() {
  return (
    <ErrorBoundary componentName="MagicCanvas">
      <MagicCanvasComponent />
    </ErrorBoundary>
  );
}
