import React, { useState, useRef, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  Excalidraw,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useDebug } from "../contexts/DebugContext";

// Infinite canvas configuration
const CANVAS_CONFIG = {
  MIN_Y: -50000,
  MAX_Y: 50000,
  MAX_WIDTH: 2000,
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

export default function MagicCanvas() {
  const { debugMode } = useDebug();
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [canvasState, setCanvasState] = useState({
    zoomLevel: 1,
    scrollX: 0,
    scrollY: 0,
  });
  const [elementCount, setElementCount] = useState(0);
  const [guideLineSpacing] = useState(384); // Story 1.3: 384px spacing for OCR alignment
  const guideLineRef = useRef(initialGuideLines);
  const viewportGuideLinesRef = useRef(null); // Cache for viewport-culled lines

  // Safeguard: Track render count to detect infinite loops
  const renderCountRef = useRef(0);
  const lastOnChangeTimeRef = useRef(0);

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

      // Get existing user elements (exclude guide lines)
      const allElements = excalidrawAPI.getSceneElements();
      const userElements = allElements.filter(
        (el) => !el.id?.startsWith("guide-") && !el.isDeleted,
      );

      // Update scene with user elements + viewport guide lines
      excalidrawAPI.updateScene({
        elements: [...userElements, ...viewportGuideLines],
      });

      // Cache for performance comparison
      viewportGuideLinesRef.current = viewportGuideLines;

      // Performance measurement (Story 1.3, Task 4.3)
      const duration = performance.now() - startTime;

      if (debugMode) {
        console.log(
          `Guide lines: Generated ${viewportGuideLines.length} for viewport Y=${Math.round(viewportY)}, height=${viewportHeight} in ${duration.toFixed(2)}ms`,
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
  }, [excalidrawAPI, guideLineSpacing, debugMode]);

  // Initialize canvas with guide lines (Story 1.3, Task 3.1, 3.2)
  useEffect(() => {
    if (!excalidrawAPI) return;

    try {
      // Initialize scene with guide lines using viewport culling for performance
      updateViewportGuideLines();

      if (debugMode) {
        console.log(
          "MagicCanvas: Initialized with guide lines at 384px spacing",
        );
      }
    } catch (error) {
      console.error("Failed to initialize Excalidraw scene:", error);
      if (debugMode) {
        alert("Canvas initialization failed. Please refresh the page.");
      }
    }
    // Remove debugMode from dependencies to prevent re-initialization
  }, [excalidrawAPI, updateViewportGuideLines]); // Include updateViewportGuideLines

  // Debounced version to prevent excessive updates during rapid pan/zoom
  const debouncedUpdateGuideLines = useMemo(
    () => debounce(updateViewportGuideLines, 100), // 100ms debounce per Story 1.3, Task 4.2
    [updateViewportGuideLines],
  );

  // Update guide lines when viewport changes significantly (Story 1.3, Task 5.1, 5.2, 5.3)
  useEffect(() => {
    if (!excalidrawAPI) return;

    // Update guide lines when scroll position or zoom changes
    // Zoom-invariant spacing: guide lines maintain 384px spacing in canvas coordinates
    debouncedUpdateGuideLines();

    if (debugMode) {
      console.log(
        `Viewport changed: zoom=${Math.round(canvasState.zoomLevel * 100)}%, scrollY=${Math.round(canvasState.scrollY)}`,
      );
    }
  }, [
    canvasState.scrollY,
    canvasState.zoomLevel,
    excalidrawAPI,
    debouncedUpdateGuideLines,
    debugMode,
  ]);

  // Handle canvas state changes (track zoom, pan, elements)
  // Throttle updates to prevent excessive re-renders
  const handleCanvasChange = useCallback((elements, appState, files) => {
    const now = Date.now();

    // Throttle: only process if at least 50ms have passed since last update
    if (now - lastOnChangeTimeRef.current < 50) {
      return;
    }

    // Update the last call time
    lastOnChangeTimeRef.current = now;

    // Log warning for debug mode if calls are too frequent
    if (debugMode) {
      console.log("MagicCanvas: onChange processed (", now, "ms)");
    }

    // Update zoom level and pan position
    setCanvasState({
      zoomLevel: appState.zoom?.value || 1,
      scrollX: appState.scrollX || 0,
      scrollY: appState.scrollY || 0,
    });

    // Count user-drawn elements (exclude guide lines)
    const userElements = elements.filter(
      (el) => !el.id?.startsWith("guide-") && !el.isDeleted,
    );
    setElementCount(userElements.length);
  }, []); // Empty dependency array to prevent re-creation

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
    }
  }, [excalidrawAPI]);

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

        {/* Canvas Container */}
        <div className="flex-1 relative overflow-hidden">
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
            style={{ maxHeight: "200px", overflowY: "auto" }}
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
            </div>
          </div>
        )}
      </div>
    </>
  );
}
