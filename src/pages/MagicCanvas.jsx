/**
 * Unified Canvas Page (Document-Driven Architecture)
 * Full-screen sketching surface with ruled lines, OCR tiles, and sequential CAS validation
 *
 * This component now uses a document-driven architecture where:
 * - All state is stored in an immutable MagicCanvasDocument
 * - Changes are applied through document operations
 * - History is automatically tracked for undo/redo
 * - Persistence is handled by DocumentStore
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import {
  useDocument,
  useDocumentOperations,
  useDocumentHistory,
  useDocumentPersistence,
  useDocumentStats,
} from "../hooks/useDocument";
import { useDocumentOCR } from "../hooks/useDocumentOCR";
import { useDocumentValidation } from "../hooks/useDocumentValidation";
import { getActiveModelConfig } from "../config/ocrModels";
import Logger from "../utils/logger";
import "./MagicCanvas.css";

const ROW_HEIGHT = 384; // Match model input size
const ROW_COLOR = "#e5e7eb"; // gray-200
const ROW_DIVIDER_OPACITY = 30;

function MagicCanvas() {
  // Excalidraw API
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  // Document-driven state
  const { document, store } = useDocument();
  const ops = useDocumentOperations();
  const { canUndo, canRedo, undo, redo } = useDocumentHistory();
  const { save, hasUnsavedChanges, lastSaved } = useDocumentPersistence();
  const stats = useDocumentStats();

  // Document operations
  const { processRow, processAllRows, cancelProcessing } = useDocumentOCR();
  const { validateAllRows, clearAllValidations } = useDocumentValidation({
    autoValidate: true,
    debounceMs: 500,
  });

  // UI state (not part of document)
  const [selectedRow, setSelectedRow] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs
  const dividersInitializedRef = useRef(false);

  // Model config
  const modelConfig = getActiveModelConfig();

  // Cleanup on unmount
  useEffect(() => {
    Logger.info("MagicCanvas", "Initializing document-driven canvas");

    return () => {
      cancelProcessing();
    };
  }, [cancelProcessing]);

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
   * Handle scene change - update element assignments and canvas state
   */
  const handleSceneChange = useCallback(
    (elements, appState) => {
      if (!elements) return;

      // Filter out row dividers
      const contentElements = elements.filter((el) => !el.isRowDivider);

      // Update document with new elements and assignments
      ops.assignElements(contentElements);
    },
    [ops],
  );

  /**
   * Handle processing a single row
   */
  const handleProcessRow = useCallback(
    async (rowId) => {
      if (!excalidrawAPI) {
        Logger.warn("MagicCanvas", "Excalidraw API not ready");
        return;
      }

      setIsProcessing(true);
      try {
        await processRow(rowId, excalidrawAPI);
        Logger.info("MagicCanvas", `Row ${rowId} processed successfully`);
      } catch (error) {
        Logger.error("MagicCanvas", `Failed to process row ${rowId}`, error);
      } finally {
        setIsProcessing(false);
      }
    },
    [excalidrawAPI, processRow]
  );

  /**
   * Handle processing all rows
   */
  const handleProcessAllRows = useCallback(async () => {
    if (!excalidrawAPI) {
      Logger.warn("MagicCanvas", "Excalidraw API not ready");
      return;
    }

    setIsProcessing(true);
    try {
      await processAllRows(excalidrawAPI);
      Logger.info("MagicCanvas", "All rows processed successfully");
    } catch (error) {
      Logger.error("MagicCanvas", "Failed to process all rows", error);
    } finally {
      setIsProcessing(false);
    }
  }, [excalidrawAPI, processAllRows]);

  /**
   * Save canvas - now handled by DocumentStore auto-save
   * Manual save just triggers immediate save
   */
  const handleSave = useCallback(() => {
    if (!excalidrawAPI) return;

    // Sync current Excalidraw state to document before saving
    const elements = excalidrawAPI.getSceneElements().filter(el => !el.isRowDivider);
    const appState = excalidrawAPI.getAppState();
    const files = excalidrawAPI.getFiles();

    ops.updateCanvasState({ elements, appState, files });

    // Save will happen automatically via DocumentStore
    save();

    Logger.info("MagicCanvas", "Canvas saved");
  }, [excalidrawAPI, ops, save]);

  /**
   * Export canvas as JSON
   */
  const handleExport = useCallback(() => {
    if (!excalidrawAPI) return;

    // Sync current state
    const elements = excalidrawAPI.getSceneElements().filter(el => !el.isRowDivider);
    const appState = excalidrawAPI.getAppState();
    const files = excalidrawAPI.getFiles();

    ops.updateCanvasState({ elements, appState, files });

    // Export document as JSON
    const json = store.exportJSON();

    // Download as file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `magic-canvas-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    Logger.info("MagicCanvas", "Canvas exported");
  }, [excalidrawAPI, ops, store]);

  /**
   * Handle row click (selection)
   */
  const handleRowClick = useCallback(
    (rowId) => {
      setSelectedRow(rowId);
      Logger.debug("MagicCanvas", `Selected row ${rowId}`);
    },
    [],
  );

  /**
   * Generate and inject row dividers when API is ready
   * Only runs once on mount to avoid infinite loops
   */
  useEffect(() => {
    if (!excalidrawAPI || dividersInitializedRef.current) return;

    // Wait a tick for Excalidraw to fully initialize
    const timer = setTimeout(() => {
      const appState = excalidrawAPI.getAppState();
      if (!appState) return;

      const viewport = {
        x: appState.scrollX || 0,
        y: appState.scrollY || 0,
        width: appState.width || window.innerWidth,
        height: appState.height || window.innerHeight,
      };

      const dividers = generateRowDividers(viewport);

      Logger.debug(
        "MagicCanvas",
        `Initializing ${dividers.length} row dividers`,
      );
      excalidrawAPI.updateScene({
        elements: dividers,
      });

      dividersInitializedRef.current = true;
    }, 100);

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
          handleProcessRow(selectedRow);
        } else {
          handleProcessAllRows();
        }
      }

      // Ctrl+Z: Undo
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
          Logger.info("MagicCanvas", "Undo");
        }
      }

      // Ctrl+Shift+Z or Ctrl+Y: Redo
      if ((e.ctrlKey && e.shiftKey && e.key === "Z") || (e.ctrlKey && e.key === "y")) {
        e.preventDefault();
        if (canRedo) {
          redo();
          Logger.info("MagicCanvas", "Redo");
        }
      }

      // Ctrl+S: Save
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }

      // D key: Toggle debug mode
      if (e.key === "d" && !e.ctrlKey && !e.altKey) {
        setDebugMode((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRow, handleProcessRow, handleProcessAllRows, canUndo, canRedo, undo, redo, handleSave]);

  /**
   * Render row overlays (LaTeX, status icons, etc.)
   */
  const renderRowOverlays = useCallback(() => {
    if (!excalidrawAPI) return null;

    const appState = excalidrawAPI.getAppState();
    const viewport = {
      x: appState.scrollX,
      y: appState.scrollY,
      width: appState.width,
      height: appState.height,
    };

    const allRows = document.getAllRows();
    const visibleRows = allRows.filter((row) => {
      const rowTop = row.y;
      const rowBottom = row.y + row.height;
      return rowBottom >= viewport.y && rowTop <= viewport.y + viewport.height;
    });

    return (
      <div className="row-overlays">
        {visibleRows.map((row) => (
          <RowOverlay
            key={row.id}
            row={row}
            viewport={viewport}
            zoom={appState.zoom.value || 1}
            selected={selectedRow === row.id}
            onClick={() => handleRowClick(row.id)}
            debugMode={debugMode}
          />
        ))}
      </div>
    );
  }, [excalidrawAPI, document, selectedRow, handleRowClick, debugMode]);

  return (
    <div className="unified-canvas">
      {/* Excalidraw Canvas */}
      <div className="canvas-container">
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
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
        {/* Processing controls */}
        <button
          onClick={handleProcessAllRows}
          disabled={isProcessing}
          className="btn btn-primary"
        >
          {isProcessing ? "Processing..." : "Process All Rows"}
        </button>

        {selectedRow !== null && (
          <button
            onClick={() => handleProcessRow(selectedRow)}
            disabled={isProcessing}
            className="btn btn-secondary"
          >
            Process Row {selectedRow}
          </button>
        )}

        <div
          style={{
            borderLeft: "1px solid #e5e7eb",
            height: "24px",
            margin: "0 8px",
          }}
        />

        {/* Validation controls */}
        <button
          onClick={validateAllRows}
          disabled={isProcessing || stats.rowCount < 2}
          className="btn btn-success"
        >
          Validate All
        </button>

        <button
          onClick={clearAllValidations}
          disabled={isProcessing}
          className="btn btn-outline"
        >
          Clear Validations
        </button>

        <div
          style={{
            borderLeft: "1px solid #e5e7eb",
            height: "24px",
            margin: "0 8px",
          }}
        />

        {/* History controls */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className="btn btn-outline"
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>

        <button
          onClick={redo}
          disabled={!canRedo}
          className="btn btn-outline"
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷ Redo
        </button>

        <div
          style={{
            borderLeft: "1px solid #e5e7eb",
            height: "24px",
            margin: "0 8px",
          }}
        />

        {/* File controls */}
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
          className="btn btn-outline"
          title="Save (Ctrl+S)"
        >
          Save
        </button>

        <button onClick={handleExport} className="btn btn-outline">
          Export
        </button>

        <div
          style={{
            borderLeft: "1px solid #e5e7eb",
            height: "24px",
            margin: "0 8px",
          }}
        />

        {/* Debug mode */}
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="btn btn-outline"
        >
          Debug: {debugMode ? "ON" : "OFF"}
        </button>

        {/* Info */}
        <div className="toolbar-info">
          <span>{stats.rowCount} rows</span>
          <span>Version: {stats.version}</span>
          {stats.ocrCompleteCount > 0 && (
            <span>OCR: {stats.ocrCompleteCount}/{stats.rowCount}</span>
          )}
          {stats.validationCompleteCount > 0 && (
            <span>Valid: {stats.validationCompleteCount}</span>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="status-bar">
        <span>Row height: {ROW_HEIGHT}px</span>
        <span>Model: {modelConfig.name}</span>
        <span>Document: {document.id.substring(0, 8)}...</span>
        {selectedRow !== null && <span>Selected: Row {selectedRow}</span>}
        {lastSaved && (
          <span>Saved: {new Date(lastSaved).toLocaleTimeString()}</span>
        )}
        {hasUnsavedChanges && (
          <span style={{ color: "#f59e0b" }}>● Unsaved</span>
        )}
        {stats.historySize > 1 && (
          <span>History: {stats.historySize}</span>
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
