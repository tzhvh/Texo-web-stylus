/**
 * Centralized Logging Utility
 * Provides structured logging with IndexedDB persistence via web worker
 * Replaces direct console.log calls throughout the application
 */

import { getCurrentWorkspace } from './workspaceDB.js';

// Logging worker instance
let loggingWorker = null;
let workerReady = false;
let messageId = 0;
let pendingMessages = new Map();

// Performance timestamp base
const perfStartTime = performance.now();

// Debug mode state (loaded from session)
let debugEnabled = true;

/**
 * Initialize logging worker
 */
function initLoggingWorker() {
  if (loggingWorker) return loggingWorker;

  loggingWorker = new Worker(
    new URL('../workers/loggingWorker.js', import.meta.url),
    { type: 'module' }
  );

  loggingWorker.onmessage = (event) => {
    const { id, success, result, error } = event.data;

    if (id === 'init') {
      workerReady = true;
      return;
    }

    const pending = pendingMessages.get(id);
    if (pending) {
      if (success) {
        pending.resolve(result);
      } else {
        pending.reject(new Error(error));
      }
      pendingMessages.delete(id);
    }
  };

  loggingWorker.onerror = (error) => {
    console.error('[Logger] Worker error:', error);
  };

  // Initialize worker
  loggingWorker.postMessage({ action: 'init', id: 'init' });

  return loggingWorker;
}

/**
 * Send message to worker with promise
 */
function sendToWorker(action, data) {
  const worker = initLoggingWorker();
  const id = `msg-${messageId++}`;

  return new Promise((resolve, reject) => {
    pendingMessages.set(id, { resolve, reject });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (pendingMessages.has(id)) {
        pendingMessages.delete(id);
        reject(new Error('Worker message timeout'));
      }
    }, 5000);

    worker.postMessage({ action, data, id });
  });
}

/**
 * Get truncated performance timestamp
 */
function getTruncatedTimestamp() {
  return Math.floor(performance.now() - perfStartTime);
}

/**
 * Get stack trace for debugging
 */
function getStackTrace() {
  const stack = new Error().stack;
  if (!stack) return null;

  // Remove first 3 lines (Error, getStackTrace, log function)
  const lines = stack.split('\n').slice(3);
  return lines.slice(0, 5).join('\n'); // Top 5 frames
}

/**
 * Core logging function
 */
async function log(level, source, message, metadata = {}, tags = []) {
  const timestamp = Date.now();
  const perfTimestamp = getTruncatedTimestamp();
  const workspaceId = getCurrentWorkspace();

  const logEntry = {
    workspaceId,
    level,
    source,
    category: metadata.category || source,
    message,
    metadata,
    tags: Array.isArray(tags) ? tags : [tags],
    timestamp,
    perfTimestamp,
    stackTrace: level === 'error' ? getStackTrace() : null
  };

  // Always write to IndexedDB via worker (async, non-blocking)
  try {
    await sendToWorker('log', logEntry);
  } catch (error) {
    // Fallback to console if worker fails
    console.error('[Logger] Failed to write to worker:', error);
  }

  // Also output to console if debug enabled
  if (debugEnabled) {
    const prefix = `[${perfTimestamp}ms] [${source}] [${level.toUpperCase()}]`;
    const consoleMethod = console[level] || console.log;

    if (Object.keys(metadata).length > 0) {
      consoleMethod(prefix, message, metadata);
    } else {
      consoleMethod(prefix, message);
    }
  }
}

/**
 * Public API - Log levels
 */
export const Logger = {
  /**
   * Debug level - detailed diagnostic information
   */
  debug: (source, message, metadata = {}, tags = []) =>
    log('debug', source, message, metadata, tags),

  /**
   * Info level - general informational messages
   */
  info: (source, message, metadata = {}, tags = []) =>
    log('info', source, message, metadata, tags),

  /**
   * Warn level - warning messages
   */
  warn: (source, message, metadata = {}, tags = []) =>
    log('warn', source, message, metadata, tags),

  /**
   * Error level - error messages
   */
  error: (source, message, metadata = {}, tags = []) =>
    log('error', source, message, metadata, tags),

  /**
   * Set debug mode (controls console output)
   */
  setDebugMode: (enabled) => {
    const wasEnabled = debugEnabled;
    debugEnabled = enabled;

    if (enabled !== wasEnabled) {
      log('info', 'Logger', `Debug mode ${enabled ? 'enabled' : 'disabled'}`, {
        previousState: wasEnabled,
        newState: enabled
      }, ['config']);
    }
  },

  /**
   * Get debug mode state
   */
  isDebugEnabled: () => debugEnabled,

  /**
   * Query logs from worker
   */
  queryLogs: async (filters) => {
    return sendToWorker('query', filters);
  },

  /**
   * Initialize logger (call on app startup)
   */
  init: () => {
    initLoggingWorker();
  },

  /**
   * Shutdown logger
   */
  shutdown: () => {
    if (loggingWorker) {
      loggingWorker.terminate();
      loggingWorker = null;
      workerReady = false;
    }
  }
};

// Auto-initialize on module load
Logger.init();

export default Logger;
