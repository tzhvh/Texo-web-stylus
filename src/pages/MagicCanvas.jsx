/**
 * Unified Canvas Page
 * Full-screen sketching surface with ruled lines, OCR tiles, and sequential CAS validation
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import { useRowSystem } from "../hooks/useRowSystem";
import { useAutoValidation } from "../hooks/useAutoValidation";
import { useCanvasPersistence } from "../hooks/useCanvasPersistence";
import { TilingEngine } from "../utils/ocrTiling";
import { RestorativeLatexAssembler } from "../utils/latexAssembly";
import { OCRWorkerPool } from "../workers/ocrWorkerPool";
import { getActiveModelConfig } from "../config/ocrModels";
import Logger from "../utils/logger";
import "./MagicCanvas.css";

const ROW_HEIGHT = 384; // Match model input size
const ROW_COLOR = "#e5e7eb"; // gray-200
const ROW_DIVIDER_OPACITY = 30;

function MagicCanvas() {
  // Excalidraw API
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  // Row system
  const {
    rows,
    selectedRow,
    updateRows,
    getRowElements,
    selectRow,
    updateOCRStatus,
    updateValidationStatus,
    getAllRows,
  } = useRowSystem(ROW_HEIGHT);

  // OCR & Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingRowId, setProcessingRowId] = useState(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  // Engines
  const tilingEngineRef = useRef(null);
  const latexAssemblerRef = useRef(null);
  const workerPoolRef = useRef(null);
  const dividersInitializedRef = useRef(false);

  // Model config
  const modelConfig = getActiveModelConfig();

  // Debug mode
  const [debugMode, setDebugMode] = useState(false);

  // Auto-validation
  const [autoValidationEnabled, setAutoValidationEnabled] = useState(true);
  const { validateAll, validateSingleRow, isValidating } = useAutoValidation({
    rows,
    updateValidationStatus,
    enabled: autoValidationEnabled,
    config: {
      region: "US",
      useAlgebrite: true,
      debug: debugMode,
    },
  });

  // Canvas persistence
  const {
    saveCanvas,
    loadCanvas,
    exportCanvas,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    markDirty,
  } = useCanvasPersistence("unified-canvas-doc");

  Logger.debug("MagicCanvas", "Component beginning to mount");

  // Initialize engines
  useEffect(() => {
    Logger.info("MagicCanvas", "Initializing");

    try {
      tilingEngineRef.current = new TilingEngine(ROW_HEIGHT);
      latexAssemblerRef.current = new RestorativeLatexAssembler();
      workerPoolRef.current = new OCRWorkerPool(2);

      Logger.debug("MagicCanvas", "Engines created successfully", {
        modelConfig: modelConfig.name
      });

      // Initialize worker pool
      workerPoolRef.current.initialize(modelConfig).catch((err) => {
        Logger.error("MagicCanvas", "Worker pool initialization failed", err);
      });
    } catch (error) {
      Logger.error("MagicCanvas", "Error initializing engines", error);
    }

    return () => {
      Logger.debug("MagicCanvas", "Cleaning up engines");
      if (workerPoolRef.current) {
        workerPoolRef.current.terminate();
      }
    };
  }, [modelConfig]);

  /**
   * Generate ruled lines for rows
   */
  const generateRowDividers = useCallback((viewport) => {
    if (!viewport) return [];

    const dividers = [];
    const startRow = Math.floor(viewport.y / ROW_HEIGHT);
    const endRow = Math.ceil((viewport.y + viewport.height) / ROW_HEIGHT);

    for (let i = startRow; i <= endRow + 1; i++) {
      const y = i * ROW_HEIGHT;
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
   * Handle scene change - update row assignments
   */
  const handleSceneChange = useCallback(
    (elements, appState) => {
      if (!elements) return;

      try {
        // Filter out row dividers
        const contentElements = elements.filter((el) => !el.isRowDivider);

        // Update row assignments
        updateRows(contentElements);
      } catch (error) {
        Logger.error("MagicCanvas", "Error handling scene change", error);
      }
    },
    [updateRows],
  );

  /**
   * Process a specific row with OCR
   */
  const processRow = useCallback(
    async (rowId) => {
      if (
        !excalidrawAPI ||
        !tilingEngineRef.current ||
        !workerPoolRef.current
      ) {
        Logger.warn("MagicCanvas", "Not ready to process row", { rowId });
        return;
      }

      setIsProcessing(true);
      setProcessingRowId(rowId);

      try {
        Logger.info("MagicCanvas", `Processing row ${rowId}`);

        // Update status
        updateOCRStatus(rowId, "processing", { progress: 0 });

        // Get row elements
        let allElements;
        try {
          allElements = excalidrawAPI.getSceneElements();
        } catch (error) {
          Logger.error("MagicCanvas", "Error getting scene elements", error);
          updateOCRStatus(rowId, "error", { error: "Could not retrieve elements" });
          return;
        }
        
        const rowElements = getRowElements(rowId, allElements);

        if (rowElements.length === 0) {
          Logger.warn("MagicCanvas", `Row ${rowId} is empty`);
          updateOCRStatus(rowId, "complete", { latex: "", tiles: [] });
          return;
        }

        // Generate tiles
        const tiles = await tilingEngineRef.current.generateRowTiles(
          rowId,
          rowElements,
          10000, // Canvas width
        );

        Logger.info(
          "MagicCanvas",
          `Generated ${tiles.length} tiles for row ${rowId}`,
        );

        if (tiles.length === 0) {
          updateOCRStatus(rowId, "complete", { latex: "", tiles: [] });
          return;
        }

        // Render tiles to blobs
        setProgress({ completed: 0, total: tiles.length });

        for (let i = 0; i < tiles.length; i++) {
          const tile = tiles[i];

          // Render tile to blob
          let blob;
          try {
            blob = await renderTile(tile, excalidrawAPI);
          } catch (error) {
            Logger.error("MagicCanvas", `Error rendering tile ${i} for row ${rowId}`, error);
            updateOCRStatus(rowId, "error", { error: `Tile rendering failed: ${error.message}` });
            return;
          }
          tile.blob = blob;

          setProgress({
            completed: i + 1,
            total: tiles.length,
            phase: "rendering",
          });
        }

        // Process tiles with OCR worker pool
        updateOCRStatus(rowId, "processing", { progress: 0.3, tiles });

        try {
          await workerPoolRef.current.processTiles(tiles, (progress) => {
            updateOCRStatus(rowId, "processing", {
              progress: 0.3 + (progress.percentage * 0.5) / 100,
              tiles,
            });
            setProgress({
              completed: progress.completed,
              total: progress.total,
              phase: "ocr",
            });
          });
        } catch (error) {
          Logger.error("MagicCanvas", `Error processing tiles for row ${rowId}`, error);
          updateOCRStatus(rowId, "error", { error: `OCR processing failed: ${error.message}` });
          return;
        }

        Logger.info("MagicCanvas", `OCR complete for row ${rowId}`);

        // Assemble LaTeX from tiles
        updateOCRStatus(rowId, "processing", { progress: 0.8 });

        const assemblyResult = latexAssemblerRef.current.assembleTiles(tiles);

        Logger.info("MagicCanvas", `Assembly complete for row ${rowId}`, {
          latex: assemblyResult.latex,
          confidence: assemblyResult.confidence,
          repairs: assemblyResult.repairs.length,
        });

        // Update row with results
        updateOCRStatus(rowId, "complete", {
          latex: assemblyResult.latex,
          tiles,
          confidence: assemblyResult.confidence,
          repairs: assemblyResult.repairs,
          progress: 1.0,
        });
      } catch (error) {
        Logger.error("MagicCanvas", `Error processing row ${rowId}`, error);
        updateOCRStatus(rowId, "error", { error: error.message });
      } finally {
        setIsProcessing(false);
        setProcessingRowId(null);
        setProgress({ completed: 0, total: 0 });
      }
    },
    [excalidrawAPI, getRowElements, updateOCRStatus],
  );

  /**
   * Render tile to blob using Excalidraw's export
   */
  const renderTile = async (tile, api) => {
    Logger.debug("MagicCanvas", "Starting tile render", {
      tileId: tile.id,
      elementCount: tile.elements ? tile.elements.length : 0,
      scale: tile.scale,
      outputWidth: tile.outputWidth,
      outputHeight: tile.outputHeight
    });
    
    try {
      if (!tile || !tile.elements) {
        Logger.error("MagicCanvas", "Invalid tile data for rendering", { tile });
        throw new Error("Invalid tile data");
      }

      // Transform elements to tile coordinate system
      const transformedElements = tile.elements.map((el, index) => {
        try {
          Logger.debug("MagicCanvas", `Transforming element ${index}`, {
            originalX: el.x,
            originalY: el.y,
            boundsMinX: tile.bounds.minX,
            boundsMinY: tile.bounds.minY,
            scale: tile.scale,
            paddingX: tile.padding.x,
            paddingY: tile.padding.y
          });
          
          return {
            ...el,
            x: (el.x - tile.bounds.minX) * tile.scale + tile.padding.x,
            y: (el.y - tile.bounds.minY) * tile.scale + tile.padding.y,
            width: (el.width || 0) * tile.scale,
            height: (el.height || 0) * tile.scale,
            strokeWidth: (el.strokeWidth || 2) * tile.scale,
            points: el.points
              ? el.points.map((p) => [p[0] * tile.scale, p[1] * tile.scale])
              : undefined,
          };
        } catch (error) {
          Logger.error("MagicCanvas", `Error transforming element ${index} for tile`, error, { element: el });
          throw error;
        }
      });

      Logger.debug("MagicCanvas", "Elements transformed successfully", {
        originalElementCount: tile.elements.length,
        transformedElementCount: transformedElements.length
      });

      let files;
      try {
        files = api.getFiles();
        Logger.debug("MagicCanvas", "Successfully retrieved files from API", {
          fileCount: Object.keys(files).length
        });
      } catch (error) {
        Logger.error("MagicCanvas", "Error getting files from API for export", error);
        files = {};
      }

      Logger.debug("MagicCanvas", "About to export to blob", {
        elementCount: transformedElements.length,
        backgroundColor: modelConfig.paddingColor || "#FFFFFF",
        outputWidth: tile.outputWidth,
        outputHeight: tile.outputHeight
      });

      const blob = await exportToBlob({
        elements: transformedElements,
        appState: {
          exportBackground: true,
          viewBackgroundColor: modelConfig.paddingColor || "#FFFFFF",
        },
        files,
        getDimensions: () => ({
          width: tile.outputWidth,
          height: tile.outputHeight,
        }),
        exportPadding: 0,
      });

      Logger.debug("MagicCanvas", "Successfully rendered tile to blob", {
        tileSize: blob.size,
        tileType: blob.type
      });

      return blob;
    } catch (error) {
      Logger.error("MagicCanvas", "Error rendering tile", error, {
        tileId: tile?.id,
        elementCount: tile?.elements ? tile.elements.length : 0
      });
      throw error;
    }
  };

  /**
   * Process all rows with content
   */
  const processAllRows = useCallback(async () => {
    const allRows = getAllRows();
    const rowsWithContent = allRows.filter((row) => row.elementIds.size > 0);

    Logger.info("MagicCanvas", `Processing ${rowsWithContent.length} rows`);

    for (const row of rowsWithContent) {
      await processRow(row.id);
    }

    Logger.info("MagicCanvas", "All rows processed");
  }, [getAllRows, processRow]);

  /**
   * Save canvas
   */
  const handleSave = useCallback(async () => {
    if (!excalidrawAPI) return;

    try {
      let elements, appState, files;
      
      try {
        elements = excalidrawAPI.getSceneElements();
        appState = excalidrawAPI.getAppState();
        files = excalidrawAPI.getFiles();
      } catch (apiError) {
        Logger.error("MagicCanvas", "Error accessing Excalidraw API for save", apiError);
        return;
      }
      
      const rowData = getAllRows().reduce((acc, row) => {
        acc[row.id] = row;
        return acc;
      }, {});

      await saveCanvas({
        elements,
        appState,
        files,
        rowData,
      });
    } catch (error) {
      Logger.error("MagicCanvas", "Error saving canvas", error);
    }
  }, [excalidrawAPI, getAllRows, saveCanvas]);

  /**
   * Load canvas
   */
  const handleLoad = useCallback(async () => {
    try {
      const data = await loadCanvas();

      if (data && excalidrawAPI) {
        try {
          excalidrawAPI.updateScene({
            elements: data.elements,
            appState: data.appState,
          });

          // TODO: Load row data

          Logger.info("MagicCanvas", "Canvas loaded");
        } catch (error) {
          Logger.error("MagicCanvas", "Error updating scene from loaded data", error);
        }
      }
    } catch (error) {
      Logger.error("MagicCanvas", "Error loading canvas", error);
    }
  }, [excalidrawAPI, loadCanvas]);

  /**
   * Export canvas
   */
  const handleExport = useCallback(async () => {
    if (!excalidrawAPI) return;

    try {
      let elements, appState, files;
      
      try {
        elements = excalidrawAPI.getSceneElements();
        appState = excalidrawAPI.getAppState();
        files = excalidrawAPI.getFiles();
      } catch (apiError) {
        Logger.error("MagicCanvas", "Error accessing Excalidraw API for export", apiError);
        return;
      }
      
      const rowData = getAllRows().reduce((acc, row) => {
        acc[row.id] = row;
        return acc;
      }, {});

      await exportCanvas({
        elements,
        appState,
        files,
        rowData,
      });
    } catch (error) {
      Logger.error("MagicCanvas", "Error exporting canvas", error);
    }
  }, [excalidrawAPI, getAllRows, exportCanvas]);

  /**
   * Handle row click (selection)
   */
  const handleRowClick = useCallback(
    (rowId) => {
      selectRow(rowId);
      Logger.debug("MagicCanvas", `Selected row ${rowId}`);
    },
    [selectRow],
  );

  /**
   * Generate and inject row dividers when API is ready
   * Only runs once on mount to avoid infinite loops
   */
  useEffect(() => {
    Logger.debug("MagicCanvas", "Divider initialization effect triggered", {
      hasAPI: !!excalidrawAPI,
      dividersInitialized: dividersInitializedRef.current
    });
    
    if (!excalidrawAPI || dividersInitializedRef.current) return;

    // Wait longer for Excalidraw to fully initialize
    const timer = setTimeout(async () => {
      Logger.debug("MagicCanvas", "Attempting to initialize row dividers after delay");
      
      // Try to get appState with retry mechanism
      let appState = null;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        try {
          appState = excalidrawAPI.getAppState();
          if (appState) {
            Logger.debug("MagicCanvas", `Successfully got appState on attempt ${attempts + 1}`);
            break;
          } else {
            Logger.warn("MagicCanvas", `Attempt ${attempts + 1}: AppState is null`);
          }
        } catch (error) {
          Logger.warn("MagicCanvas", `Attempt ${attempts + 1} to get appState failed`, error);
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!appState) {
        Logger.error("MagicCanvas", "Could not get appState after multiple attempts");
        return;
      }

      const viewport = {
        x: appState.scrollX || 0,
        y: appState.scrollY || 0,
        width: appState.width || window.innerWidth,
        height: appState.height || window.innerHeight,
      };

      Logger.debug("MagicCanvas", "Generating row dividers with viewport", viewport);

      const dividers = generateRowDividers(viewport);

      Logger.debug(
        "MagicCanvas",
        `Generated ${dividers.length} row dividers`,
      );
      
      if (dividers.length === 0) {
        Logger.warn("MagicCanvas", "No row dividers were generated, skipping scene update");
        dividersInitializedRef.current = true;
        return;
      }
      
      try {
        Logger.debug("MagicCanvas", "Updating scene with row dividers");
        excalidrawAPI.updateScene({
          elements: dividers,
        });
        Logger.info("MagicCanvas", "Successfully updated scene with row dividers");
        dividersInitializedRef.current = true;
      } catch (error) {
        Logger.error("MagicCanvas", "Failed to update scene with dividers", error);
      }
    }, 500); // Wait longer initially

    return () => clearTimeout(timer);
  }, [excalidrawAPI, generateRowDividers]);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Enter: Process selected row or all rows
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        if (selectedRow !== null) {
          processRow(selectedRow);
        } else {
          processAllRows();
        }
      }

      // D key: Toggle debug mode
      if (e.key === "d" && !e.ctrlKey && !e.altKey) {
        setDebugMode((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRow, processRow, processAllRows]);

  /**
   * Render row overlays (LaTeX, status icons, etc.)
   */
  const renderRowOverlays = useCallback(() => {
    Logger.debug("MagicCanvas", "Rendering row overlays", {
      hasExcalidrawAPI: !!excalidrawAPI,
      rowSize: rows.size,
      selectedRow: selectedRow
    });
    
    if (!excalidrawAPI) {
      Logger.warn("MagicCanvas", "No Excalidraw API available for overlays");
      return null;
    }

    let appState;
    try {
      appState = excalidrawAPI.getAppState();
      if (!appState) {
        Logger.warn("MagicCanvas", "No appState available for overlays");
        return null;
      }
    } catch (error) {
      Logger.warn("MagicCanvas", "Could not get appState for overlays", error);
      return null;
    }

    Logger.debug("MagicCanvas", "Got appState for overlays", {
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
      width: appState.width,
      height: appState.height,
      zoomValue: appState.zoom?.value
    });

    const viewport = {
      x: appState.scrollX || 0,
      y: appState.scrollY || 0,
      width: appState.width || window.innerWidth,
      height: appState.height || window.innerHeight,
    };

    Logger.debug("MagicCanvas", "Calculating visible rows", {
      viewport,
      totalRows: rows.size
    });

    const visibleRows = Array.from(rows.values()).filter((row) => {
      const rowTop = row.y;
      const rowBottom = row.y + row.height;
      const isVisible = rowBottom >= viewport.y && rowTop <= viewport.y + viewport.height;
      
      Logger.debug("MagicCanvas", "Row visibility check", {
        rowId: row.id,
        rowTop,
        rowBottom,
        viewportY: viewport.y,
        viewportHeight: viewport.height,
        isVisible
      });
      
      return isVisible;
    });

    Logger.debug("MagicCanvas", "Found visible rows", {
      visibleRowCount: visibleRows.length,
      visibleRowIds: visibleRows.map(row => row.id)
    });

    if (visibleRows.length === 0) {
      return <div className="row-overlays" />; // Return empty container
    }

    return (
      <div className="row-overlays">
        {visibleRows.map((row) => {
          Logger.debug("MagicCanvas", "Rendering RowOverlay", {
            rowId: row.id,
            zoom: appState.zoom.value || 1,
            isSelected: selectedRow === row.id
          });
          
          return (
            <RowOverlay
              key={row.id}
              row={row}
              viewport={viewport}
              zoom={appState.zoom.value || 1}
              selected={selectedRow === row.id}
              onClick={() => handleRowClick(row.id)}
              debugMode={debugMode}
            />
          );
        })}
      </div>
    );
  }, [excalidrawAPI, rows, selectedRow, handleRowClick, debugMode]);

  // Effect to log component renders
  useEffect(() => {
    Logger.debug("MagicCanvas", "Component rendered", {
      hasExcalidrawAPI: !!excalidrawAPI,
      rowsSize: rows.size,
      isProcessing,
      dividersInitialized: dividersInitializedRef.current
    });
  }); // No dependencies to log on every render

  return (
    <div className="unified-canvas">
      {/* Excalidraw Canvas */}
      <div className="canvas-container">
        <Excalidraw
          excalidrawAPI={(api) => {
            Logger.debug("MagicCanvas", "Excalidraw API callback triggered", { hasAPI: !!api });
            setExcalidrawAPI(api);
          }}
          onChange={handleSceneChange}
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

      {/* Row dividers are injected once on mount via useEffect (see line 385) */}

      {/* Row overlays */}
      {renderRowOverlays()}

      {/* Toolbar */}
      <div className="unified-toolbar">
        <button
          onClick={processAllRows}
          disabled={isProcessing}
          className="btn btn-primary"
        >
          {isProcessing ? "Processing..." : "Process All Rows"}
        </button>

        {selectedRow !== null && (
          <button
            onClick={() => processRow(selectedRow)}
            disabled={isProcessing}
            className="btn btn-secondary"
          >
            Process Row {selectedRow}
          </button>
        )}

        <button
          onClick={() => setDebugMode(!debugMode)}
          className="btn btn-outline"
        >
          Debug: {debugMode ? "ON" : "OFF"}
        </button>

        <button
          onClick={validateAll}
          disabled={isValidating || rows.size < 2}
          className="btn btn-success"
        >
          {isValidating ? "Validating..." : "Validate All"}
        </button>

        <button
          onClick={() => setAutoValidationEnabled(!autoValidationEnabled)}
          className="btn btn-outline"
        >
          Auto-Validate: {autoValidationEnabled ? "ON" : "OFF"}
        </button>

        <div
          style={{
            borderLeft: "1px solid #e5e7eb",
            height: "24px",
            margin: "0 4px",
          }}
        />

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-outline"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>

        <button onClick={handleLoad} className="btn btn-outline">
          Load
        </button>

        <button onClick={handleExport} className="btn btn-outline">
          Export
        </button>

        <div className="toolbar-info">
          <span>{rows.size} rows</span>
          {isProcessing && (
            <span>
              Processing row {processingRowId}
              {progress.total > 0 && (
                <>
                  {" "}
                  ({progress.completed}/{progress.total}{" "}
                  {progress.phase || "tiles"})
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="status-bar">
        <span>Row height: {ROW_HEIGHT}px</span>
        <span>Model: {modelConfig.name}</span>
        {selectedRow !== null && <span>Selected: Row {selectedRow}</span>}
        {lastSaved && (
          <span>Last saved: {new Date(lastSaved).toLocaleTimeString()}</span>
        )}
        {hasUnsavedChanges && (
          <span style={{ color: "#f59e0b" }}>● Unsaved changes</span>
        )}
      </div>
    </div>
  );
}

/**
 * Row Overlay Component
 * Displays row status, LaTeX, and debug info
 */
function RowOverlay({ row, viewport, zoom, selected, onClick, debugMode }) {
  const canvasY = row.y * zoom + viewport.y;
  const canvasHeight = row.height * zoom;

  // Position overlay at row
  const style = {
    position: "absolute",
    top: `${canvasY}px`,
    left: `${viewport.x}px`,
    width: `${viewport.width}px`,
    height: `${canvasHeight}px`,
    pointerEvents: "none",
  };

  // Add validation class
  const validationClass =
    row.validationStatus !== "unchecked"
      ? `validation-${row.validationStatus}`
      : "";

  return (
    <div
      className={`row-overlay ${selected ? "selected" : ""} ${validationClass}`}
      style={style}
    >
      {/* Row number */}
      <div className="row-number">{row.id}</div>

      {/* OCR Status */}
      {row.ocrStatus !== "pending" && (
        <div className={`ocr-status status-${row.ocrStatus}`}>
          {row.ocrStatus === "processing" &&
            `Processing... ${(row.ocrProgress * 100).toFixed(0)}%`}
          {row.ocrStatus === "complete" && "✓ OCR Complete"}
          {row.ocrStatus === "error" && "✗ OCR Error"}
        </div>
      )}

      {/* LaTeX output */}
      {row.latex && (
        <div className="row-latex">
          {row.latex.substring(0, 100)}
          {row.latex.length > 100 ? "..." : ""}
        </div>
      )}

      {/* Validation status */}
      {row.validationStatus !== "unchecked" && (
        <div className={`validation-status status-${row.validationStatus}`}>
          {row.validationStatus === "valid" && "✓"}
          {row.validationStatus === "invalid" && "✗"}
          {row.validationStatus === "error" && "⚠️"}
        </div>
      )}

      {/* Debug info */}
      {debugMode && (
        <div className="row-debug">
          <div>Elements: {row.elementIds.size}</div>
          <div>Tiles: {row.tiles?.length || 0}</div>
          {row.tiles && row.tiles.length > 0 && (
            <div>
              Tile dims:{" "}
              {row.tiles
                .map((t) => `${t.logicalWidth}x${t.logicalHeight}`)
                .join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Click handler */}
      <div
        className="row-clickable"
        style={{ pointerEvents: "all", cursor: "pointer" }}
        onClick={onClick}
      />
    </div>
  );
}

export default MagicCanvas;
