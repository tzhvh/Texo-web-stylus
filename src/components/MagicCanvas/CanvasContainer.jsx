/**
 * CanvasContainer Component
 *
 * Wraps Excalidraw and handles row divider generation.
 * Provides a clean interface for the canvas without cluttering the main component.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Excalidraw } from "@excalidraw/excalidraw";
import Logger from "../../utils/logger";

const ROW_COLOR = "#e5e7eb"; // gray-200
const ROW_DIVIDER_OPACITY = 30;

export function CanvasContainer({
  rowHeight,
  onExcalidrawReady,
  onSceneChange,
}) {
  const dividersInitializedRef = useRef(false);
  const excalidrawAPIRef = useRef(null);

  /**
   * Generate ruled lines for rows
   */
  const generateRowDividers = useCallback((viewport, rowHeight) => {
    if (!viewport) return [];

    const dividers = [];
    const startRow = Math.floor(viewport.y / rowHeight);
    const endRow = Math.ceil((viewport.y + viewport.height) / rowHeight);

    for (let i = startRow; i <= endRow + 1; i++) {
      const y = i * rowHeight;
      const lineWidth = viewport.width + 1000;

      dividers.push({
        id: `row-divider-${i}`,
        type: "line",
        x: viewport.x - 500, // Extend beyond viewport
        y,
        width: lineWidth,
        height: 0,
        // Required for Excalidraw line elements
        points: [
          [0, 0],
          [lineWidth, 0],
        ], // Horizontal line
        strokeColor: ROW_COLOR,
        backgroundColor: "transparent",
        strokeWidth: 1,
        strokeStyle: "solid",
        opacity: ROW_DIVIDER_OPACITY,
        locked: true,
        isRowDivider: true,
        isDeleted: false,
        roughness: 0,
        roundness: null,
        seed: i,
        version: 1,
        versionNonce: i,
        groupIds: [],
        boundElements: null,
        updated: Date.now(),
        link: null,
      });
    }

    return dividers;
  }, []);

  /**
   * Handle Excalidraw API ready
   */
  const handleExcalidrawReady = useCallback((api) => {
    excalidrawAPIRef.current = api;
    onExcalidrawReady(api);
  }, [onExcalidrawReady]);

  /**
   * Generate and inject row dividers when API is ready
   * Only runs once on mount to avoid infinite loops
   */
  useEffect(() => {
    const api = excalidrawAPIRef.current;
    if (!api || dividersInitializedRef.current) return;

    // Wait a tick for Excalidraw to fully initialize
    const timer = setTimeout(() => {
      const appState = api.getAppState();
      if (!appState) return;

      const viewport = {
        x: appState.scrollX || 0,
        y: appState.scrollY || 0,
        width: appState.width || window.innerWidth,
        height: appState.height || window.innerHeight,
      };

      const dividers = generateRowDividers(viewport, rowHeight);

      Logger.debug(
        "CanvasContainer",
        `Initializing ${dividers.length} row dividers`,
      );
      api.updateScene({
        elements: dividers,
      });

      dividersInitializedRef.current = true;
    }, 100);

    return () => clearTimeout(timer);
  }, [generateRowDividers, rowHeight]);

  return (
    <div className="canvas-container">
      <Excalidraw
        excalidrawAPI={handleExcalidrawReady}
        onChange={onSceneChange}
        initialData={{
          appState: {
            viewBackgroundColor: "#ffffff",
            currentItemStrokeColor: "#000000",
            currentItemStrokeWidth: 2,
            currentItemRoughness: 0, // Smooth lines for better OCR
            gridSize: null,
            zoom: { value: 1 },
          },
          elements: [],
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveAsImage: false,
            export: false,
            clearCanvas: false,
          },
        }}
      />
    </div>
  );
}
