/**
 * Document-driven OCR processing hook
 *
 * This hook integrates OCR processing with the document model,
 * replacing the imperative approach with document operations.
 */

import { useCallback, useRef } from 'react';
import { useDocument, useDocumentOperations } from './useDocument';
import { TilingEngine } from '../utils/ocrTiling';
import { OCRWorkerPool } from '../workers/ocrWorkerPool';
import { RestorativeLatexAssembler } from '../utils/latexAssembly';

export function useDocumentOCR() {
  const { document } = useDocument();
  const ops = useDocumentOperations();

  // Keep worker pool instance across renders
  const workerPoolRef = useRef(null);
  
  // Track currently processing rows to prevent concurrent processing
  const processingRowsRef = useRef(new Set());

  // Initialize worker pool lazily
  const getWorkerPool = useCallback(() => {
    if (!workerPoolRef.current) {
      workerPoolRef.current = new OCRWorkerPool();
    }
    return workerPoolRef.current;
  }, []);

  /**
   * Process a single row with OCR
   */
  const processRow = useCallback(
    async (rowId, excalidrawAPI) => {
      // Check if already processing this row
      if (processingRowsRef.current.has(rowId)) {
        console.warn(`Row ${rowId} is already being processed, skipping duplicate request`);
        return null;
      }

      // Add to processing set
      processingRowsRef.current.add(rowId);

      try {
        const row = document.getRow(rowId);
        if (!row) {
          throw new Error(`Row ${rowId} not found`);
        }

        // Mark as processing
        ops.updateOCRStatus(rowId, 'processing', { progress: 0 });

        // Phase 1: Generate tiles (10% progress)
        const elements = document.getRowElements(rowId);
        const canvasWidth = excalidrawAPI.getAppState()?.width || 2000;

        const tilingEngine = new TilingEngine({
          rowHeight: document.rowConfig.height,
          modelInputSize: 384,
          tileOverlap: 134,
        });

        const tiles = tilingEngine.generateRowTiles(rowId, elements, canvasWidth);
        
        // Defensive check: ensure tiles is an array
        if (!Array.isArray(tiles)) {
          throw new Error(`TilingEngine returned non-array tiles: ${typeof tiles}`);
        }

        ops.updateOCRStatus(rowId, 'processing', {
          progress: 0.1,
          tiles,
        });

        // Phase 2: Render tiles (10-30% progress)
        const renderPromises = tiles.map(async (tile, index) => {
          const tileElements = elements.filter(el =>
            tile.elementIds.includes(el.id)
          );

          // Transform elements to tile coordinate system
          const transformedElements = tileElements.map(el => ({
            ...el,
            x: (el.x - tile.bounds.minX) * tile.scale + tile.padding.x,
            y: (el.y - tile.bounds.minY) * tile.scale + tile.padding.y,
            width: el.width ? el.width * tile.scale : undefined,
            height: el.height ? el.height * tile.scale : undefined,
            strokeWidth: el.strokeWidth * tile.scale,
          }));

          // Export to blob
          const blob = await excalidrawAPI.exportToBlob({
            elements: transformedElements,
            mimeType: 'image/png',
            files: null,
            exportPadding: 0,
          });

          tile.blob = blob;

          // Update progress
          const renderProgress = 0.1 + ((index + 1) / tiles.length) * 0.2;
          ops.updateOCRStatus(rowId, 'processing', {
            progress: renderProgress,
            tiles: [...tiles], // Create a copy to ensure it stays as an array
          });

          return tile;
        });

        await Promise.all(renderPromises);

        // Phase 3: OCR processing (30-80% progress)
        const workerPool = getWorkerPool();

        const progressCallback = (completed, total) => {
          const ocrProgress = 0.3 + (completed / total) * 0.5;
          ops.updateOCRStatus(rowId, 'processing', {
            progress: ocrProgress,
            tiles: [...tiles], // Create a copy to ensure it stays as an array
          });
        };

        const processedTiles = await workerPool.processTiles(
          tiles,
          progressCallback
        );
        
        // Defensive check: ensure processedTiles is an array
        if (!Array.isArray(processedTiles)) {
          throw new Error(`Worker pool returned non-array processedTiles: ${typeof processedTiles}`);
        }

        // Phase 4: Assemble LaTeX (80-100% progress)
        ops.updateOCRStatus(rowId, 'processing', {
          progress: 0.8,
          tiles: [...processedTiles], // Create a copy to ensure it stays as an array
        });

        const assembler = new RestorativeLatexAssembler();
        const result = assembler.assembleTiles(processedTiles);

        // Complete
        ops.updateOCRResult(rowId, {
          latex: result.latex,
          confidence: result.confidence,
          tiles: [...processedTiles], // Create a copy to ensure it stays as an array
        });

        return result;
      } catch (error) {
        console.error(`Error processing row ${rowId}:`, error);
        ops.updateOCRStatus(rowId, 'error', {
          error: error.message,
          progress: 0,
        });
        throw error;
      } finally {
        // Remove from processing set
        processingRowsRef.current.delete(rowId);
      }
    },
    [document, ops, getWorkerPool]
  );

  /**
   * Process all rows that need OCR
   */
  const processAllRows = useCallback(
    async (excalidrawAPI) => {
      const rowsNeedingOCR = document.getRowsNeedingOCR();

      for (const row of rowsNeedingOCR) {
        // Skip if already processing this row (safety check)
        if (!processingRowsRef.current.has(row.id)) {
          await processRow(row.id, excalidrawAPI);
        }
      }
    },
    [document, processRow]
  );

  /**
   * Retry OCR for a failed row
   */
  const retryRow = useCallback(
    async (rowId, excalidrawAPI) => {
      // Skip if already processing this row
      if (processingRowsRef.current.has(rowId)) {
        console.warn(`Row ${rowId} is already being processed, skipping retry`);
        return null;
      }
      
      // Reset status to pending
      ops.updateOCRStatus(rowId, 'pending', { progress: 0, error: null });

      // Process again
      return processRow(rowId, excalidrawAPI);
    },
    [ops, processRow]
  );

  /**
   * Cancel processing (cleanup)
   */
  const cancelProcessing = useCallback(() => {
    if (workerPoolRef.current) {
      workerPoolRef.current.terminate();
      workerPoolRef.current = null;
    }
    
    // Clear processing set
    processingRowsRef.current.clear();
  }, []);

  return {
    processRow,
    processAllRows,
    retryRow,
    cancelProcessing,
  };
}
