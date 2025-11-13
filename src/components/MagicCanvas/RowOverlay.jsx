/**
 * RowOverlay Component
 *
 * Displays row status, LaTeX output, validation results, and debug info.
 * Positioned absolutely over the canvas at the row's location.
 */

import React, { useCallback } from 'react';

export function RowOverlay({ row, viewport, zoom, selected, onClick, debugMode }) {
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

  const handleClick = useCallback(() => {
    onClick(row.id);
  }, [onClick, row.id]);

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
        onClick={handleClick}
      />
    </div>
  );
}

// Memoized version to prevent unnecessary re-renders
export const RowOverlayMemo = React.memo(RowOverlay);
