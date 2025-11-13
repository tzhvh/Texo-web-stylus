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

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

// Extracted components
import { CanvasContainer } from "../components/MagicCanvas/CanvasContainer";
import { CanvasToolbar } from "../components/MagicCanvas/CanvasToolbar";
import { StatusBar } from "../components/MagicCanvas/StatusBar";
import { RowOverlayMemo } from "../components/MagicCanvas/RowOverlay";

import "./MagicCanvas.css";

const ROW_HEIGHT = 384; // Match model input size

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
  const previousElementsRef = useRef([]);

  // Model config
  const modelConfig = getActiveModelConfig();

  // Cleanup on unmount and initialize element tracking
  useEffect(() => {
    Logger.info("MagicCanvas", "Initializing document-driven canvas");

    // Initialize previous elements tracking from store
    previousElementsRef.current = [...store.getDocument().elements];

    return () => {
      cancelProcessing();
    };
  }, [cancelProcessing, store]);

  /**
   * Check if elements have actually changed using a stable comparison
   */
  const elementsChanged = useCallback((newElements) => {
    const prevElements = previousElementsRef.current;

    // Quick length check
    if (newElements.length !== prevElements.length) {
      return true;
    }

    // Deep comparison of element IDs and versions
    for (let i = 0; i < newElements.length; i++) {
      const newEl = newElements[i];
      const prevEl = prevElements[i];

      if (
        newEl.id !== prevEl.id ||
        newEl.version !== prevEl.version ||
        newEl.isDeleted !== prevEl.isDeleted
      ) {
        return true;
      }
    }

    return false;
  }, []);

  /**
   * Handle scene change - update element assignments and canvas state
   */
  const handleSceneChange = useCallback(
    (elements, appState) => {
      if (!elements) return;

      // Filter out row dividers
      const contentElements = elements.filter((el) => !el.isRowDivider);

      // Only update if elements actually changed
      if (elementsChanged(contentElements)) {
        // Update document with new elements and assignments
        ops.assignElements(contentElements);

        // Update previous elements ref
        previousElementsRef.current = contentElements;
      }
    },
    [ops, elementsChanged],
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
   * Uses useMemo to avoid re-renders when document changes
   * Only depends on specific document properties that affect rendering
   */
  const rowOverlays = useMemo(() => {
    if (!excalidrawAPI) return null;

    const appState = excalidrawAPI.getAppState();
    const viewport = {
      x: appState.scrollX || 0,
      y: appState.scrollY || 0,
      width: appState.width || window.innerWidth,
      height: appState.height || window.innerHeight,
    };

    // Get rows using the store directly to avoid full document re-renders
    const allRows = store.getDocument().getAllRows();
    const visibleRows = allRows.filter((row) => {
      const rowTop = row.y;
      const rowBottom = row.y + row.height;
      return rowBottom >= viewport.y && rowTop <= viewport.y + viewport.height;
    });

    const zoom = appState.zoom?.value || 1;

    return (
      <div className="row-overlays">
        {visibleRows.map((row) => (
          <RowOverlayMemo
            key={row.id}
            row={row}
            viewport={viewport}
            zoom={zoom}
            selected={selectedRow === row.id}
            onClick={handleRowClick}
            debugMode={debugMode}
          />
        ))}
      </div>
    );
  }, [excalidrawAPI, store, selectedRow, handleRowClick, debugMode]);

  return (
    <div className="unified-canvas">
      {/* Canvas with Excalidraw and row dividers */}
      <CanvasContainer
        rowHeight={ROW_HEIGHT}
        onExcalidrawReady={setExcalidrawAPI}
        onSceneChange={handleSceneChange}
      />

      {/* Row overlays */}
      {rowOverlays}

      {/* Toolbar */}
      <CanvasToolbar
        isProcessing={isProcessing}
        selectedRow={selectedRow}
        onProcessAll={handleProcessAllRows}
        onProcessRow={handleProcessRow}
        onValidateAll={validateAllRows}
        onClearValidations={clearAllValidations}
        canValidate={stats.rowCount >= 2}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
        onExport={handleExport}
        debugMode={debugMode}
        onToggleDebug={() => setDebugMode(!debugMode)}
        stats={stats}
      />

      {/* Status bar */}
      <StatusBar
        rowHeight={ROW_HEIGHT}
        modelName={modelConfig.name}
        documentId={document.id}
        selectedRow={selectedRow}
        lastSaved={lastSaved}
        hasUnsavedChanges={hasUnsavedChanges}
        historySize={stats.historySize}
      />
    </div>
  );
}

export default MagicCanvas;
