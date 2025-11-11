/**
 * OCR Worker Pool
 * Manages multiple OCR workers for parallel tile processing
 * with progress tracking, caching, and retry logic
 */

import Logger from '../utils/logger';

export class OCRWorkerPool {
  constructor(poolSize = 2) {
    this.poolSize = poolSize;
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.activeTaskCount = 0;
    this.isInitialized = false;
    this.initPromise = null;

    this.progressCallbacks = new Map(); // taskId → callback
    this.results = new Map(); // taskId → result

    Logger.info('OCRWorkerPool', `Creating pool with ${poolSize} workers`);
  }

  /**
   * Initialize all workers in the pool
   */
  async initialize(modelConfig) {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      Logger.info('OCRWorkerPool', 'Initializing worker pool...');

      const initPromises = [];

      for (let i = 0; i < this.poolSize; i++) {
        const workerPromise = this.createWorker(i, modelConfig);
        initPromises.push(workerPromise);
      }

      this.workers = await Promise.all(initPromises);
      this.availableWorkers = [...this.workers];
      this.isInitialized = true;

      Logger.info('OCRWorkerPool', `Worker pool initialized with ${this.workers.length} workers`);
    })();

    return this.initPromise;
  }

  /**
   * Create and initialize a single worker
   */
  async createWorker(index, modelConfig) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./ocrWorker.js', import.meta.url), {
        type: 'module'
      });

      worker.id = `worker-${index}`;
      worker.busy = false;
      worker.currentTask = null;

      // Setup message handler
      worker.onmessage = (e) => {
        const { type, key } = e.data;

        if (type === 'ready') {
          Logger.info('OCRWorkerPool', `Worker ${worker.id} ready`);
          resolve(worker);
        } else if (type === 'result') {
          this.handleResult(worker, e.data);
        } else if (type === 'error') {
          this.handleError(worker, e.data);
        } else if (type === 'progress') {
          this.handleProgress(worker, e.data);
        }
      };

      worker.onerror = (error) => {
        Logger.error('OCRWorkerPool', `Worker ${worker.id} error`, error);
        reject(error);
      };

      // Initialize worker
      worker.postMessage({
        action: 'init',
        modelConfig: {
          modelName: modelConfig.huggingFaceId,
          env_config: {
            remoteHost: modelConfig.remoteHost,
            remotePathTemplate: modelConfig.remotePathTemplate
          }
        }
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        if (!this.isInitialized) {
          reject(new Error('Worker initialization timeout'));
        }
      }, 60000);
    });
  }

  /**
   * Process multiple tiles
   * Returns a promise that resolves when all tiles are processed
   */
  async processTiles(tiles, progressCallback = null) {
    if (!this.isInitialized) {
      throw new Error('Worker pool not initialized');
    }

    Logger.info('OCRWorkerPool', `Processing ${tiles.length} tiles`);

    const results = [];
    const totalTiles = tiles.length;
    let completedTiles = 0;

    // Create tasks for each tile
    const tasks = tiles.map((tile, index) => ({
      id: `tile-${tile.rowId}-${tile.index}-${Date.now()}`,
      tile,
      tileIndex: index,
      retries: 0,
      maxRetries: 2
    }));

    // Process tasks
    const taskPromises = tasks.map(task =>
      this.processTask(task, (progress) => {
        // Individual tile progress
        if (progressCallback) {
          const overallProgress = {
            completed: completedTiles,
            total: totalTiles,
            currentTile: task.tileIndex,
            tileProgress: progress,
            percentage: ((completedTiles + progress) / totalTiles) * 100
          };
          progressCallback(overallProgress);
        }
      }).then(result => {
        completedTiles++;
        if (progressCallback) {
          progressCallback({
            completed: completedTiles,
            total: totalTiles,
            percentage: (completedTiles / totalTiles) * 100
          });
        }
        return result;
      })
    );

    results.push(...await Promise.all(taskPromises));

    Logger.info('OCRWorkerPool', `Completed processing ${results.length} tiles`);

    return results;
  }

  /**
   * Process a single task (with retry logic)
   */
  async processTask(task, progressCallback = null) {
    const { tile } = task;

    // Check cache first
    // TODO: Implement tile cache lookup

    // Queue the task
    return new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
      task.progressCallback = progressCallback;

      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  /**
   * Process queued tasks
   */
  processQueue() {
    while (this.availableWorkers.length > 0 && this.taskQueue.length > 0) {
      const worker = this.availableWorkers.shift();
      const task = this.taskQueue.shift();

      this.assignTaskToWorker(worker, task);
    }
  }

  /**
   * Assign a task to a worker
   */
  async assignTaskToWorker(worker, task) {
    worker.busy = true;
    worker.currentTask = task;
    this.activeTaskCount++;

    const { tile } = task;

    Logger.debug('OCRWorkerPool', `Assigning tile ${tile.index} to ${worker.id}`);

    try {
      // Render tile to blob
      const blob = await this.renderTileToBlob(tile);

      // Send to worker
      worker.postMessage({
        action: 'predict',
        image: blob,
        key: task.id
      });

      // Store callback
      if (task.progressCallback) {
        this.progressCallbacks.set(task.id, task.progressCallback);
      }

    } catch (error) {
      Logger.error('OCRWorkerPool', `Failed to render tile ${tile.index}`, error);
      this.handleTaskError(worker, task, error);
    }
  }

  /**
   * Render tile to blob for OCR
   * This is a placeholder - actual implementation will use Excalidraw's exportToBlob
   */
  async renderTileToBlob(tile) {
    // For now, create a simple canvas
    // In actual implementation, this will use Excalidraw's export API
    const canvas = new OffscreenCanvas(tile.outputWidth, tile.outputHeight);
    const ctx = canvas.getContext('2d');

    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, tile.outputWidth, tile.outputHeight);

    // TODO: Actual rendering with Excalidraw elements
    // This will be done in the main thread and passed to the pool

    return canvas.convertToBlob();
  }

  /**
   * Handle worker result
   */
  handleResult(worker, data) {
    const { output, time, key } = data;

    if (!worker.currentTask || worker.currentTask.id !== key) {
      Logger.warn('OCRWorkerPool', `Received result for unknown task ${key}`);
      return;
    }

    const task = worker.currentTask;
    const { tile } = task;

    Logger.info('OCRWorkerPool', `Tile ${tile.index} completed in ${time}s`, {
      latex: output.substring(0, 50) + (output.length > 50 ? '...' : '')
    });

    // Update tile with result
    tile.latex = output;
    tile.ocrTime = parseFloat(time);

    // Resolve task
    task.resolve(tile);

    // Cleanup
    this.progressCallbacks.delete(key);
    this.releaseWorker(worker);
  }

  /**
   * Handle worker error
   */
  handleError(worker, data) {
    const { error, key } = data;

    if (!worker.currentTask || worker.currentTask.id !== key) {
      Logger.warn('OCRWorkerPool', `Received error for unknown task ${key}`);
      return;
    }

    const task = worker.currentTask;

    Logger.error('OCRWorkerPool', `Tile ${task.tile.index} error`, { error });

    this.handleTaskError(worker, task, new Error(error));
  }

  /**
   * Handle task error with retry logic
   */
  handleTaskError(worker, task, error) {
    task.retries++;

    if (task.retries <= task.maxRetries) {
      Logger.warn('OCRWorkerPool', `Retrying tile ${task.tile.index} (attempt ${task.retries}/${task.maxRetries})`);

      // Re-queue the task
      this.taskQueue.push(task);
      this.releaseWorker(worker);
      this.processQueue();
    } else {
      Logger.error('OCRWorkerPool', `Tile ${task.tile.index} failed after ${task.maxRetries} retries`);

      // Mark tile with error
      task.tile.ocrError = error.message;

      // Reject task (or resolve with error?)
      task.reject(error);

      // Cleanup
      this.progressCallbacks.delete(task.id);
      this.releaseWorker(worker);
    }
  }

  /**
   * Handle progress updates
   */
  handleProgress(worker, data) {
    const { file, loaded, total, key } = data;

    if (!worker.currentTask) return;

    const task = worker.currentTask;
    const progressCallback = this.progressCallbacks.get(key);

    if (progressCallback) {
      const progress = total > 0 ? loaded / total : 0;
      progressCallback(progress);
    }
  }

  /**
   * Release worker back to pool
   */
  releaseWorker(worker) {
    worker.busy = false;
    worker.currentTask = null;
    this.activeTaskCount--;

    this.availableWorkers.push(worker);

    // Process next task if available
    this.processQueue();
  }

  /**
   * Get pool status
   */
  getStatus() {
    return {
      poolSize: this.poolSize,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.poolSize - this.availableWorkers.length,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTaskCount,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Terminate all workers
   */
  terminate() {
    Logger.info('OCRWorkerPool', 'Terminating worker pool');

    this.workers.forEach(worker => {
      worker.terminate();
    });

    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.isInitialized = false;
    this.initPromise = null;

    Logger.info('OCRWorkerPool', 'Worker pool terminated');
  }
}

/**
 * Singleton instance for global use
 */
let globalPool = null;

export function getGlobalWorkerPool(poolSize = 2) {
  if (!globalPool) {
    globalPool = new OCRWorkerPool(poolSize);
  }
  return globalPool;
}

export function terminateGlobalWorkerPool() {
  if (globalPool) {
    globalPool.terminate();
    globalPool = null;
  }
}
