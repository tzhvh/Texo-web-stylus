/**
 * Logging Web Worker
 * Handles diagnostic logging operations asynchronously to avoid blocking the main thread
 */

let db = null;
const DB_NAME = 'texo-workspace-db';
const STORES = {
  DIAGNOSTIC_LOGS: 'diagnostic-logs',
};

// Performance timestamp base
const startTime = performance.now();

/**
 * Initialize IndexedDB connection in worker
 */
async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
  });
}

/**
 * Get truncated performance timestamp
 */
function getTruncatedTimestamp() {
  return Math.floor(performance.now() - startTime);
}

/**
 * Write log entry to IndexedDB
 */
async function writeLog(logEntry) {
  await initDB();

  const entry = {
    workspaceId: logEntry.workspaceId || 'default',
    level: logEntry.level,
    category: logEntry.category,
    source: logEntry.source,
    message: logEntry.message,
    metadata: logEntry.metadata || {},
    tags: logEntry.tags || [],
    timestamp: Date.now(),
    perfTimestamp: getTruncatedTimestamp(),
    stackTrace: logEntry.stackTrace || null
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.DIAGNOSTIC_LOGS], 'readwrite');
    const store = tx.objectStore(STORES.DIAGNOSTIC_LOGS);
    const request = store.add(entry);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Batch write multiple log entries
 */
async function batchWriteLogs(logEntries) {
  await initDB();

  const results = [];

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.DIAGNOSTIC_LOGS], 'readwrite');
    const store = tx.objectStore(STORES.DIAGNOSTIC_LOGS);

    for (const logEntry of logEntries) {
      const entry = {
        workspaceId: logEntry.workspaceId || 'default',
        level: logEntry.level,
        category: logEntry.category,
        source: logEntry.source,
        message: logEntry.message,
        metadata: logEntry.metadata || {},
        tags: logEntry.tags || [],
        timestamp: Date.now(),
        perfTimestamp: getTruncatedTimestamp(),
        stackTrace: logEntry.stackTrace || null
      };

      const request = store.add(entry);
      request.onsuccess = () => results.push(request.result);
    }

    tx.oncomplete = () => resolve(results);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Query logs with filters
 */
async function queryLogs(filters) {
  await initDB();

  const {
    workspaceId = 'default',
    level = null,
    category = null,
    source = null,
    tags = null,
    limit = 100,
    offset = 0
  } = filters;

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.DIAGNOSTIC_LOGS], 'readonly');
    const store = tx.objectStore(STORES.DIAGNOSTIC_LOGS);
    const index = store.index('workspaceId');
    const request = index.openCursor(IDBKeyRange.only(workspaceId), 'prev');

    const logs = [];
    let skipCount = 0;

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && logs.length < limit) {
        const log = cursor.value;

        // Apply filters
        const levelMatch = !level || log.level === level;
        const categoryMatch = !category || log.category === category;
        const sourceMatch = !source || log.source === source;
        const tagsMatch = !tags || (log.tags && tags.some(tag => log.tags.includes(tag)));

        if (levelMatch && categoryMatch && sourceMatch && tagsMatch) {
          if (skipCount >= offset) {
            logs.push(log);
          } else {
            skipCount++;
          }
        }

        cursor.continue();
      } else {
        resolve(logs);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Message handler
 */
self.onmessage = async (event) => {
  const { action, data, id } = event.data;

  try {
    let result;

    switch (action) {
      case 'init':
        await initDB();
        result = { success: true };
        break;

      case 'log':
        result = await writeLog(data);
        break;

      case 'batchLog':
        result = await batchWriteLogs(data);
        break;

      case 'query':
        result = await queryLogs(data);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    self.postMessage({ id, success: true, result });
  } catch (error) {
    self.postMessage({ id, success: false, error: error.message });
  }
};
