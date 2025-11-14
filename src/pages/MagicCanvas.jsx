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
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useDebug } from "../contexts/DebugContext";
import useRowSystem from "../hooks/useRowSystem.js";
import RowManager from "../utils/rowManager.js";
import { saveMagicCanvasState, loadMagicCanvasState } from "../utils/workspaceDB.js";
import { MemoizedRowHeader } from "../components/RowHeader.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import Notification from "../components/Notification.jsx";
import { getUserElements } from "../utils/canvasHelpers.js";

// Infinite canvas configuration
const CANVAS_CONFIG = {
  MIN_Y: -50000,
  MAX_Y: 50000,
  MAX_WIDTH: 2000,
  BACKGROUND_COLOR: "#f5f5f5", // Light gray per design

  // Performance timing (ms)
  THROTTLE_MS: 50, // Canvas onChange throttle
  DEBOUNCE_MS: 100, // Guide line update debounce
  AUTO_SAVE_DELAY_MS: 2000, // Auto-save debounce

  // Viewport calculations
  VIEWPORT_HEIGHT_RATIO: 0.6, // Approximate canvas viewport as % of window height
  VIEWPORT_BUFFER_PX: 500, // Buffer for smooth scrolling

  // Performance targets (ms)
  GUIDE_LINE_UPDATE_TARGET_MS: 16, // 60fps target
  STATE_RESTORE_TARGET_MS: 1000, // Story 1.7 AC6 requirement

  // Guide lines
  GUIDE_LINE_SPACING_PX: 384, // OCR tile alignment
  GUIDE_LINE_COLOR: "#d3d3d3",
  GUIDE_LINE_OPACITY: 30,
  GUIDE_LINE_STROKE_WIDTH: 1,
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
      strokeColor: CANVAS_CONFIG.GUIDE_LINE_COLOR,
      backgroundColor: "transparent",
      strokeWidth: CANVAS_CONFIG.GUIDE_LINE_STROKE_WIDTH,
      strokeStyle: "solid",
      roughness: 0,
      opacity: CANVAS_CONFIG.GUIDE_LINE_OPACITY,
      locked: true, // Prevent user interaction per Story 1.3, Task 2.3
      isDeleted: false,
      id: id || `guide-${y}`,
    },
  ]);
  return guideLine[0];
};

// Generate guide lines with correct spacing for OCR alignment (Story 1.3)
const generateGuideLines = (spacing = CANVAS_CONFIG.GUIDE_LINE_SPACING_PX) => {
  const guideLines = [];
  for (let y = CANVAS_CONFIG.MIN_Y; y <= CANVAS_CONFIG.MAX_Y; y += spacing) {
    guideLines.push(createGuideLine(y));
  }
  return guideLines;
};

const initialGuideLines = generateGuideLines(CANVAS_CONFIG.GUIDE_LINE_SPACING_PX);

// Viewport culling: Only generate guide lines visible in current view + buffer (Story 1.3, Task 4.1)
const generateViewportGuideLines = (
  viewportY,
  viewportHeight,
  spacing = CANVAS_CONFIG.GUIDE_LINE_SPACING_PX,
  buffer = CANVAS_CONFIG.VIEWPORT_BUFFER_PX,
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

// Throttle utility for limiting function execution rate
const throttle = (func, limit) => {
  let inThrottle;
  let lastArgs;
  let lastContext;

  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func.apply(lastContext, lastArgs);
          lastArgs = lastContext = null;
        }
      }, limit);
    } else {
      lastArgs = args;
      lastContext = context;
    }
  };
};

function MagicCanvasComponent({ workspaceId = 'magic-canvas-default' }) {
  const { debugMode } = useDebug();
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [canvasState, setCanvasState] = useState({
    zoomLevel: 1,
    scrollX: 0,
    scrollY: 0,
  });

  // Element count tracked in state for efficient UI updates
  // Alternative: derive from excalidrawAPI.getSceneElements() on-demand, but that's
  // more expensive and requires additional re-render triggers
  const [elementCount, setElementCount] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [notification, setNotification] = useState(null);

  // Track viewport for RowHeader rendering
  const [viewport, setViewport] = useState({
    y: 0,
    height: 600, // Default viewport height
    width: CANVAS_CONFIG.MAX_WIDTH
  });
  const [guideLineSpacing] = useState(CANVAS_CONFIG.GUIDE_LINE_SPACING_PX);
  const guideLineRef = useRef(initialGuideLines);
  const viewportGuideLinesRef = useRef(null); // Cache for viewport-culled lines

  // Initialize RowManager for element-to-row assignments (Story 1.5)
  const [rowManager] = useState(() => new RowManager({
    rowHeight: CANVAS_CONFIG.GUIDE_LINE_SPACING_PX,
    startY: 0
  }));

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
    isLoading
  } = useRowSystem({
    excalidrawAPI,
    rowManager,
    debounceMs: CANVAS_CONFIG.THROTTLE_MS,
    debugMode,
    workspaceId,
    autoSaveMs: CANVAS_CONFIG.AUTO_SAVE_DELAY_MS
  });

  // Safeguard: Track render count to detect infinite loops
  const renderCountRef = useRef(0);
  const canvasSaveTimeoutRef = useRef(null);

  // Track last viewport position to prevent unnecessary guide line updates
  const lastViewportRef = useRef({ scrollY: 0, zoomLevel: 1 });

  // Track current canvas state for change detection
  const canvasStateRef = useRef(canvasState);

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

  // Keep canvasStateRef in sync with canvasState
  useEffect(() => {
    canvasStateRef.current = canvasState;
  }, [canvasState]);

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

    // Performance monitoring (Story 1.3, Task 4.3) - only when debug mode enabled
    const startTime = debugMode ? performance.now() : 0;

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

      // Get existing user elements (exclude guide lines)
      const allElements = excalidrawAPI.getSceneElements();
      const userElements = getUserElements(allElements);

      // Update scene with user elements + viewport guide lines
      // Use storeAction: 'none' to prevent onChange callbacks and infinite render loops
      excalidrawAPI.updateScene({
        elements: [...userElements, ...viewportGuideLines],
        storeAction: 'none', // Prevent history updates and onChange triggers
      });

      // Cache for performance comparison
      viewportGuideLinesRef.current = viewportGuideLines;

      // Performance measurement (Story 1.3, Task 4.3)
      const duration = performance.now() - startTime;

      if (debugMode) {
        console.log(
          `Guide lines: Generated ${viewportGuideLines.length} for viewport Y=${Math.round(viewportY)}, height=${viewportHeight} in ${duration.toFixed(2)}ms`,
        );

        // Performance warning if exceeds 60fps target
        if (duration > CANVAS_CONFIG.GUIDE_LINE_UPDATE_TARGET_MS) {
          console.warn(
            `Guide line update took ${duration.toFixed(2)}ms (>${CANVAS_CONFIG.GUIDE_LINE_UPDATE_TARGET_MS}ms target for 60fps)`,
          );
        }
      }
    } catch (error) {
      console.error("Failed to update viewport guide lines:", error);
    }
  }, [excalidrawAPI, guideLineSpacing, debugMode]);

  // Save canvas state to IndexedDB
  const saveCanvasState = useCallback(async () => {
    if (!excalidrawAPI) return;

    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      
      // Get RowManager state for unified persistence
      const rowManagerState = rowManager.serialize();

      await saveMagicCanvasState(
        'current', // Key for current canvas state
        elements,  // Canvas elements
        appState, // Excalidraw app state (zoom, pan, etc.)
        rowManagerState, // RowManager state
        1 // Version
      );

      if (debugMode) {
        console.log('MagicCanvas: Unified canvas state saved to IndexedDB', {
          elementCount: elements.length,
          rowCount: rowManagerState.rows.length,
          elementMappings: Object.keys(rowManagerState.elementToRow).length,
          zoom: appState.zoom?.value,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY
        });
      }
    } catch (error) {
      console.error('MagicCanvas: Failed to save unified canvas state', error);
    }
  }, [excalidrawAPI, rowManager, debugMode]);

  // Load canvas state from IndexedDB
  const loadCanvasState = useCallback(async () => {
    if (!excalidrawAPI) return false;

    setIsRestoring(true);
    const startTime = debugMode ? performance.now() : 0;

    try {
      const savedState = await loadMagicCanvasState('current', 1);

      if (savedState) {
        // Restore Excalidraw canvas
        excalidrawAPI.updateScene({
          elements: savedState.canvasState,
          appState: savedState.appState
        });

        // Restore RowManager state
        rowManager.deserialize(savedState.rowManagerState);

        if (debugMode) {
          const loadTime = performance.now() - startTime;
          console.log('MagicCanvas: Unified canvas state loaded from IndexedDB', {
            elementCount: savedState.canvasState.length,
            rowCount: savedState.rowManagerState.rows.length,
            elementMappings: Object.keys(savedState.rowManagerState.elementToRow).length,
            zoom: savedState.appState.zoom?.value,
            scrollX: savedState.appState.scrollX,
            scrollY: savedState.appState.scrollY,
            version: savedState.version,
            savedTimestamp: new Date(savedState.timestamp).toISOString(),
            loadTime: `${loadTime.toFixed(2)}ms`
          });

          // Performance warning if exceeds target (AC6 requirement)
          if (loadTime > CANVAS_CONFIG.STATE_RESTORE_TARGET_MS) {
            console.warn(`MagicCanvas: State restoration took ${loadTime.toFixed(2)}ms (>${CANVAS_CONFIG.STATE_RESTORE_TARGET_MS}ms target for <500 elements)`);
          }
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('MagicCanvas: Failed to load unified canvas state', error);
      return false;
    } finally {
      setIsRestoring(false);
    }
  }, [excalidrawAPI, rowManager, debugMode]);

  // Initialize canvas with guide lines and load saved state (Story 1.3, Task 3.1, 3.2)
  // Stabilized with minimal dependencies to prevent re-initialization loops
  useEffect(() => {
    const initialize = async () => {
      if (!excalidrawAPI) return;

      try {
        // Try to load unified canvas state first
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
          // Unified state loaded, update guide lines for current viewport
          updateViewportGuideLines();

          if (debugMode) {
            console.log(
              "MagicCanvas: Initialized from unified saved state with guide lines",
            );
          }
        }
      } catch (error) {
        console.error("Failed to initialize Excalidraw scene with unified state:", error);

        // Log error to diagnostic system
        if (window.logDiagnostic) {
          window.logDiagnostic('error', 'canvas', 'Magic Canvas initialization failed', {
            error: error.message,
            stack: error.stack
          });
        }

        // Fallback to basic initialization
        try {
          updateViewportGuideLines();

          if (debugMode) {
            console.log("MagicCanvas: Fallback initialization successful - starting with empty canvas");
          }
        } catch (fallbackError) {
          console.error("Fallback initialization also failed:", fallbackError);

          setNotification({
            type: 'error',
            message: 'Canvas initialization failed. Please refresh the page.',
          });
        }
      }
    };

    initialize();
    // Only depend on excalidrawAPI - functions are stable via useCallback memoization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excalidrawAPI]);

  // Debounced version to prevent excessive updates during rapid pan/zoom
  const debouncedUpdateGuideLines = useMemo(
    () => debounce(updateViewportGuideLines, CANVAS_CONFIG.DEBOUNCE_MS),
    [updateViewportGuideLines],
  );

  // Update guide lines when viewport changes significantly (Story 1.3, Task 5.1, 5.2, 5.3)
  useEffect(() => {
    if (!excalidrawAPI) return;

    // Only update if viewport has changed significantly (>100px or >10% zoom)
    const scrollYDiff = Math.abs(canvasState.scrollY - lastViewportRef.current.scrollY);
    const zoomDiff = Math.abs(canvasState.zoomLevel - lastViewportRef.current.zoomLevel);

    const shouldUpdate = scrollYDiff > 100 || zoomDiff > 0.1;

    if (shouldUpdate) {
      // Update guide lines when scroll position or zoom changes significantly
      lastViewportRef.current = {
        scrollY: canvasState.scrollY,
        zoomLevel: canvasState.zoomLevel,
      };

      debouncedUpdateGuideLines();

      if (debugMode) {
        console.log(
          `Viewport changed significantly: zoom=${Math.round(canvasState.zoomLevel * 100)}%, scrollY=${Math.round(canvasState.scrollY)}`,
        );
      }
    }
  }, [
    canvasState.scrollY,
    canvasState.zoomLevel,
    excalidrawAPI,
    debouncedUpdateGuideLines,
    debugMode,
  ]);

  // Handle canvas state changes (track zoom, pan, elements)
  // Integrates with useRowSystem for element-to-row assignments (Story 1.5)
  // Wrapped in useMemo to create a stable throttled function
  const handleCanvasChange = useMemo(
    () =>
      throttle((elements, appState, files) => {
        const now = Date.now();

        // Update zoom level and pan position only if changed
        const newCanvasState = {
          zoomLevel: appState.zoom?.value || 1,
          scrollX: appState.scrollX || 0,
          scrollY: appState.scrollY || 0,
        };

        // Only update state if values actually changed (prevent unnecessary re-renders)
        const currentState = canvasStateRef.current;
        const hasChanged =
          newCanvasState.zoomLevel !== currentState.zoomLevel ||
          newCanvasState.scrollX !== currentState.scrollX ||
          newCanvasState.scrollY !== currentState.scrollY;

        if (hasChanged) {
          setCanvasState(newCanvasState);
        }

        // Log for debug mode
        if (debugMode) {
          console.log("MagicCanvas: onChange processed", {
            timestamp: now,
            hasStateChange: hasChanged,
            zoom: Math.round(newCanvasState.zoomLevel * 100),
            scrollY: Math.round(newCanvasState.scrollY),
          });
        }

        // Update viewport for RowHeader rendering only if canvas state changed
        if (hasChanged) {
          const viewportHeight = window.innerHeight * CANVAS_CONFIG.VIEWPORT_HEIGHT_RATIO;
          setViewport({
            y: newCanvasState.scrollY,
            height: viewportHeight,
            width: CANVAS_CONFIG.MAX_WIDTH,
          });
        }

        // Count user-drawn elements (exclude guide lines)
        const userElements = getUserElements(elements);
        setElementCount(userElements.length);

        // Delegate element assignment to useRowSystem hook (Story 1.5)
        handleRowSystemChange(elements, appState, files);

        // Schedule unified canvas state auto-save (debounced)
        if (canvasSaveTimeoutRef.current) {
          clearTimeout(canvasSaveTimeoutRef.current);
        }

        canvasSaveTimeoutRef.current = setTimeout(() => {
          saveCanvasState();
        }, CANVAS_CONFIG.AUTO_SAVE_DELAY_MS);
      }, CANVAS_CONFIG.THROTTLE_MS),
    [handleRowSystemChange, saveCanvasState, debugMode],
  );

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
      setNotification({
        type: 'warning',
        message: 'Canvas not ready. Please wait for initialization.',
      });
      return;
    }

    try {
      // Get all user-drawn elements (exclude guide lines)
      const allElements = excalidrawAPI.getSceneElements();
      const userElements = getUserElements(allElements);

      if (userElements.length === 0) {
        setNotification({
          type: 'warning',
          message: 'Nothing to export! Draw something first.',
        });
        return;
      }

      // Create a link to export (future: send to OCR pipeline)
      const appState = excalidrawAPI.getAppState();
      setNotification({
        type: 'info',
        message: `Export ready: ${userElements.length} elements drawn.\n\nIntegration with OCR pipeline coming in Story 2.x`,
      });

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
      setNotification({
        type: 'error',
        message: 'Export failed: ' + error.message,
      });
    }
  }, [excalidrawAPI, debugMode, canvasState.zoomLevel, canvasState.scrollX, canvasState.scrollY]);

  // Open settings panel (Story 1.6 placeholder)
  const openSettings = useCallback(() => {
    setNotification({
      type: 'info',
      message: "Settings panel coming in Story 1.6\n\n" +
        "Future features:\n" +
        "- Background color preferences\n" +
        "- Guide line spacing\n" +
        "- Toolbar visibility\n" +
        "- Zoom/pan presets",
      duration: 8000, // Longer duration for more content
    });
  }, []);

  // Get visible rows based on current viewport - memoized for performance
  const visibleRows = useMemo(() => {
    if (!rowManager) return [];

    const { y: viewportY, height: viewportHeight } = viewport;
    const buffer = CANVAS_CONFIG.VIEWPORT_BUFFER_PX;
    const startY = viewportY - buffer;
    const endY = viewportY + viewportHeight + buffer;

    // Get all rows from rowManager
    const allRows = rowManager.getAllRows ? rowManager.getAllRows() : [];

    // Filter rows that:
    // 1. Intersect with viewport (including buffer)
    // 2. Have at least one element assigned
    return allRows.filter(row => {
      const inViewport = row.yEnd >= startY && row.yStart <= endY;
      const hasElements = row.elementIds && row.elementIds.size > 0;
      return inViewport && hasElements;
    });
  }, [rowManager, viewport.y, viewport.height, elementToRow]);

  // Render RowHeader components for visible rows - memoized
  const rowHeaders = useMemo(() => {
    return visibleRows.map(row => (
      <MemoizedRowHeader
        key={row.id}
        row={row}
        y={row.yStart} // Pass row start, RowHeader will calculate center
        canvasWidth={CANVAS_CONFIG.MAX_WIDTH}
        debugMode={debugMode}
      />
    ));
  }, [visibleRows, debugMode]);

  // Keyboard shortcuts for common actions
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+E or Cmd+E - Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportCanvas();
      }
      // Ctrl+Shift+C or Cmd+Shift+C - Clear Canvas
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        clearCanvas();
      }
      // Ctrl+, or Cmd+, - Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        openSettings();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exportCanvas, clearCanvas, openSettings]);

  // Cleanup on unmount and handle beforeunload for guaranteed final save
  useEffect(() => {
    // Handle page unload/refresh - synchronous save attempt
    const handleBeforeUnload = () => {
      if (!excalidrawAPI || !rowManager) return;

      try {
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        const rowManagerState = rowManager.serialize();

        // Attempt synchronous IndexedDB write
        // Note: Modern browsers may not guarantee completion, but we try
        const request = indexedDB.open('texo-workspace-db', 2);
        request.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(['magic-canvas-state'], 'readwrite');
          const store = tx.objectStore('magic-canvas-state');
          store.put({
            key: 'current',
            canvasState: elements,
            appState,
            rowManagerState,
            timestamp: Date.now(),
            version: 1
          });
        };
      } catch (error) {
        console.error('Failed to save on beforeunload:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Clear pending save timeout
      if (canvasSaveTimeoutRef.current) {
        clearTimeout(canvasSaveTimeoutRef.current);
      }
      // Remove event listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Trigger final async save (best effort)
      // Note: This may not complete if component unmounts quickly
      if (excalidrawAPI) {
        saveCanvasState();
      }
    };
    // Empty deps - setup once, cleanup uses latest refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Helmet>
        <title>Magic Canvas - Draw Infinitely</title>
      </Helmet>

      {/* Notification Toast */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          duration={notification.duration || 5000}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="h-screen w-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">Magic Canvas</h1>
          <p className="text-sm text-gray-600 mt-1">
            Draw mathematical expressions on an infinite vertical canvas. Pan,
            zoom, and draw freely.
          </p>
        </div>

        {/* Canvas Container */}
        <div className="flex-1 relative overflow-hidden">
          {/* Loading overlay for slow restores */}
          {isRestoring && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-700 font-medium">Restoring Canvas...</p>
                <p className="text-gray-500 text-sm">Please wait while we load your work</p>
              </div>
            </div>
          )}
          
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
              {rowHeaders}
            </div>
          </div>
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
                aria-label="Clear all drawings from canvas"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition font-medium text-sm focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
              >
                Clear Canvas
              </button>
              <button
                onClick={exportCanvas}
                aria-label="Export canvas to OCR pipeline (coming soon)"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition font-medium text-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Export
              </button>
              <button
                onClick={openSettings}
                aria-label="Open canvas settings"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition font-medium text-sm focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
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
                <p>Rows with elements: {getRowCount()}</p>
                <p>Element assignments: {elementToRow.size}</p>
                <p>Total assignments: {rowStats.totalAssignments}</p>
                <p>Avg assignment time: {rowStats.averageAssignmentTime.toFixed(2)}ms</p>
                <p>Last assignment: {rowStats.lastAssignmentTime > 0 ? new Date(rowStats.lastAssignmentTime).toLocaleTimeString() : 'Never'}</p>
                <p>Assignment errors: {rowStats.errorCount}</p>
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
