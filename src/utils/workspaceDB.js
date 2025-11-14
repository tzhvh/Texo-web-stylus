/**
 * Versioned IndexedDB Workspace Manager
 *
 * Manages multiple workspaces with isolated data stores for:
 * - CAS canonical form cache
 * - Session state persistence
 * - Diagnostic logs
 * - Workspace metadata
 */

const DB_NAME = 'texo-workspace-db';
const DB_VERSION = 2;
const DEFAULT_WORKSPACE = 'default';

// Store names
const STORES = {
  WORKSPACES: 'workspaces',
  CAS_CACHE: 'cas-cache',
  SESSION_STATE: 'session-state',
  DIAGNOSTIC_LOGS: 'diagnostic-logs',
  TRANSFORMERS_CACHE: 'transformers-cache',
  MAGIC_CANVAS_STATE: 'magic-canvas-state'
};

let db = null;
let currentWorkspace = DEFAULT_WORKSPACE;

/**
 * Initialize the database with versioned schema
 */
export async function initWorkspaceDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;

      // Ensure default workspace exists
      ensureDefaultWorkspace().then(() => {
        // Load saved workspace preference
        const saved = localStorage.getItem('texo-current-workspace');
        if (saved) {
          currentWorkspace = saved;
        }
        resolve(db);
      });
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      console.log(`[WorkspaceDB] Upgrading from version ${oldVersion} to ${DB_VERSION}`);

      // Version 1: Initial schema
      if (oldVersion < 1) {
        // Workspaces metadata store
        const workspaceStore = db.createObjectStore(STORES.WORKSPACES, { keyPath: 'id' });
        workspaceStore.createIndex('name', 'name', { unique: false });
        workspaceStore.createIndex('createdAt', 'createdAt', { unique: false });

        // CAS canonical forms cache (per workspace)
        const casStore = db.createObjectStore(STORES.CAS_CACHE, { keyPath: ['workspaceId', 'latex'] });
        casStore.createIndex('workspaceId', 'workspaceId', { unique: false });
        casStore.createIndex('timestamp', 'timestamp', { unique: false });
        casStore.createIndex('canonical', 'canonical', { unique: false });

        // Session state (per workspace)
        const sessionStore = db.createObjectStore(STORES.SESSION_STATE, { keyPath: ['workspaceId', 'key'] });
        sessionStore.createIndex('workspaceId', 'workspaceId', { unique: false });

        // Diagnostic logs
        const logStore = db.createObjectStore(STORES.DIAGNOSTIC_LOGS, { keyPath: 'id', autoIncrement: true });
        logStore.createIndex('workspaceId', 'workspaceId', { unique: false });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
        logStore.createIndex('level', 'level', { unique: false });
        logStore.createIndex('category', 'category', { unique: false });

        // Transformers cache metadata (per workspace)
        const transformersStore = db.createObjectStore(STORES.TRANSFORMERS_CACHE, { keyPath: ['workspaceId', 'key'] });
        transformersStore.createIndex('workspaceId', 'workspaceId', { unique: false });
        transformersStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Version 2: Add Magic Canvas state store
      if (oldVersion < 2) {
        // Magic Canvas state (per workspace)
        const magicCanvasStore = db.createObjectStore(STORES.MAGIC_CANVAS_STATE, { keyPath: ['workspaceId', 'key'] });
        magicCanvasStore.createIndex('workspaceId', 'workspaceId', { unique: false });
        magicCanvasStore.createIndex('timestamp', 'timestamp', { unique: false });
        magicCanvasStore.createIndex('version', 'version', { unique: false });
      }
    };
  });
}

/**
 * Default session state schema with preset values
 */
const DEFAULT_SESSION_STATE = {
  debugMode: true,                    // Enable debug logging by default
  showHelp: false,                    // Help panel collapsed by default
  validationEnabled: true,            // Auto-validation enabled
  cacheEnabled: true,                 // CAS cache enabled
  validationDelay: 500,               // Debounce delay in ms
  maxCanonicalizationIterations: 100, // Max iterations for rule engine
  useAlgebrite: true,                 // Enable Algebrite fallback
  algebriteTimeout: 2000,             // Algebrite timeout in ms
  forceAlgebrite: false,              // Force Algebrite usage (bypass canonicalization)
  region: 'US',                       // Math notation region
  floatTolerance: 1e-6,               // Floating point comparison tolerance
  theme: 'light',                     // UI theme
  editorFontSize: 16,                 // Editor font size in px
  validationHighlights: true,         // Show inline validation highlights
};

/**
 * Ensure default workspace exists with preset session state
 */
async function ensureDefaultWorkspace() {
  const workspace = await getWorkspace(DEFAULT_WORKSPACE);
  if (!workspace) {
    // Create default workspace
    await createWorkspace({
      id: DEFAULT_WORKSPACE,
      name: 'Default Workspace',
      description: 'Default workspace for all sessions with preset configuration',
      createdAt: Date.now(),
      metadata: {
        version: DB_VERSION,
        isDefault: true
      }
    });

    // Initialize default session state values
    console.log('[WorkspaceDB] Initializing default session state with preset values');
    for (const [key, value] of Object.entries(DEFAULT_SESSION_STATE)) {
      await saveSessionState(key, value);
    }

    // Log initialization
    await logDiagnostic('info', 'workspace', 'Default workspace created with preset session state', {
      sessionState: DEFAULT_SESSION_STATE
    });
  }
}

/**
 * Export default session state schema for reference
 */
export { DEFAULT_SESSION_STATE };

/**
 * Reset session state to default values for current workspace
 */
export async function resetSessionState() {
  console.log('[WorkspaceDB] Resetting session state to defaults');
  for (const [key, value] of Object.entries(DEFAULT_SESSION_STATE)) {
    await saveSessionState(key, value);
  }
  await logDiagnostic('info', 'workspace', 'Session state reset to defaults', {
    sessionState: DEFAULT_SESSION_STATE
  });
}

/**
 * Get current workspace ID
 */
export function getCurrentWorkspace() {
  return currentWorkspace;
}

/**
 * Switch to a different workspace
 */
export async function switchWorkspace(workspaceId) {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} not found`);
  }

  currentWorkspace = workspaceId;
  localStorage.setItem('texo-current-workspace', workspaceId);

  await logDiagnostic('info', 'workspace', `Switched to workspace: ${workspaceId}`);

  return workspace;
}

/**
 * Create a new workspace
 */
export async function createWorkspace(workspace) {
  if (!db) await initWorkspaceDB();

  const workspaceData = {
    id: workspace.id || `workspace-${Date.now()}`,
    name: workspace.name || 'Unnamed Workspace',
    description: workspace.description || '',
    createdAt: workspace.createdAt || Date.now(),
    metadata: workspace.metadata || {}
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.WORKSPACES], 'readwrite');
    const store = tx.objectStore(STORES.WORKSPACES);
    const request = store.add(workspaceData);

    request.onsuccess = () => resolve(workspaceData);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get workspace by ID
 */
export async function getWorkspace(workspaceId) {
  if (!db) await initWorkspaceDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.WORKSPACES], 'readonly');
    const store = tx.objectStore(STORES.WORKSPACES);
    const request = store.get(workspaceId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * List all workspaces
 */
export async function listWorkspaces() {
  if (!db) await initWorkspaceDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.WORKSPACES], 'readonly');
    const store = tx.objectStore(STORES.WORKSPACES);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a workspace and all its data
 */
export async function deleteWorkspace(workspaceId) {
  if (workspaceId === DEFAULT_WORKSPACE) {
    throw new Error('Cannot delete default workspace');
  }

  if (!db) await initWorkspaceDB();

  // Delete from all stores
  const tx = db.transaction([
    STORES.WORKSPACES,
    STORES.CAS_CACHE,
    STORES.SESSION_STATE,
    STORES.DIAGNOSTIC_LOGS,
    STORES.TRANSFORMERS_CACHE,
    STORES.MAGIC_CANVAS_STATE
  ], 'readwrite');

  // Delete workspace metadata
  tx.objectStore(STORES.WORKSPACES).delete(workspaceId);

  // Delete workspace data from all stores
  const stores = [STORES.CAS_CACHE, STORES.SESSION_STATE, STORES.TRANSFORMERS_CACHE, STORES.MAGIC_CANVAS_STATE];
  for (const storeName of stores) {
    const store = tx.objectStore(storeName);
    const index = store.index('workspaceId');
    const request = index.openCursor(IDBKeyRange.only(workspaceId));

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  // Delete logs
  const logStore = tx.objectStore(STORES.DIAGNOSTIC_LOGS);
  const logIndex = logStore.index('workspaceId');
  const logRequest = logIndex.openCursor(IDBKeyRange.only(workspaceId));

  logRequest.onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      cursor.delete();
      cursor.continue();
    }
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      // Switch to default if current workspace was deleted
      if (currentWorkspace === workspaceId) {
        currentWorkspace = DEFAULT_WORKSPACE;
        localStorage.setItem('texo-current-workspace', DEFAULT_WORKSPACE);
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Cache CAS canonical form (workspace-scoped)
 */
export async function cacheCanonicalForm(latex, canonical, metadata = {}) {
  if (!db) await initWorkspaceDB();

  const entry = {
    workspaceId: currentWorkspace,
    latex,
    canonical,
    timestamp: Date.now(),
    metadata
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.CAS_CACHE], 'readwrite');
    const store = tx.objectStore(STORES.CAS_CACHE);
    const request = store.put(entry);

    request.onsuccess = () => resolve(entry);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get cached canonical form (workspace-scoped with TTL)
 */
export async function getCachedCanonicalForm(latex, ttlDays = 7) {
  if (!db) await initWorkspaceDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.CAS_CACHE], 'readonly');
    const store = tx.objectStore(STORES.CAS_CACHE);
    const request = store.get([currentWorkspace, latex]);

    request.onsuccess = () => {
      const result = request.result;

      // Check TTL
      if (result) {
        const age = Date.now() - result.timestamp;
        const ttl = ttlDays * 24 * 60 * 60 * 1000;

        if (age > ttl) {
          // Expired, delete it
          const deleteTx = db.transaction([STORES.CAS_CACHE], 'readwrite');
          deleteTx.objectStore(STORES.CAS_CACHE).delete([currentWorkspace, latex]);
          resolve(null);
        } else {
          resolve(result);
        }
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all CAS cache for current workspace
 */
export async function clearCASCache() {
  if (!db) await initWorkspaceDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.CAS_CACHE], 'readwrite');
    const store = tx.objectStore(STORES.CAS_CACHE);
    const index = store.index('workspaceId');
    const request = index.openCursor(IDBKeyRange.only(currentWorkspace));

    let deleteCount = 0;
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        deleteCount++;
        cursor.continue();
      }
    };

    tx.oncomplete = () => {
      logDiagnostic('info', 'cache', `Cleared ${deleteCount} CAS cache entries`);
      resolve(deleteCount);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Clear transformers cache metadata for current workspace
 */
export async function clearTransformersCache() {
  if (!db) await initWorkspaceDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.TRANSFORMERS_CACHE], 'readwrite');
    const store = tx.objectStore(STORES.TRANSFORMERS_CACHE);
    const index = store.index('workspaceId');
    const request = index.openCursor(IDBKeyRange.only(currentWorkspace));

    let deleteCount = 0;
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        deleteCount++;
        cursor.continue();
      }
    };

    tx.oncomplete = () => {
      logDiagnostic('info', 'cache', `Cleared ${deleteCount} transformer cache entries`);
      resolve(deleteCount);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get cache statistics for current workspace
 */
export async function getCacheStats() {
  if (!db) await initWorkspaceDB();

  const stats = {
    workspaceId: currentWorkspace,
    casCache: { count: 0, oldestEntry: null, newestEntry: null },
    transformersCache: { count: 0 },
    sessionState: { count: 0 },
    diagnosticLogs: { count: 0, byLevel: {} },
    magicCanvasState: { count: 0, oldestEntry: null, newestEntry: null }
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([
      STORES.CAS_CACHE,
      STORES.TRANSFORMERS_CACHE,
      STORES.SESSION_STATE,
      STORES.DIAGNOSTIC_LOGS,
      STORES.MAGIC_CANVAS_STATE
    ], 'readonly');

    // CAS Cache stats
    const casStore = tx.objectStore(STORES.CAS_CACHE);
    const casIndex = casStore.index('workspaceId');
    const casRequest = casIndex.openCursor(IDBKeyRange.only(currentWorkspace));

    casRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        stats.casCache.count++;
        const timestamp = cursor.value.timestamp;

        if (!stats.casCache.oldestEntry || timestamp < stats.casCache.oldestEntry) {
          stats.casCache.oldestEntry = timestamp;
        }
        if (!stats.casCache.newestEntry || timestamp > stats.casCache.newestEntry) {
          stats.casCache.newestEntry = timestamp;
        }

        cursor.continue();
      }
    };

    // Transformers cache stats
    const transformersStore = tx.objectStore(STORES.TRANSFORMERS_CACHE);
    const transformersIndex = transformersStore.index('workspaceId');
    const transformersRequest = transformersIndex.count(IDBKeyRange.only(currentWorkspace));
    transformersRequest.onsuccess = () => {
      stats.transformersCache.count = transformersRequest.result;
    };

    // Session state stats
    const sessionStore = tx.objectStore(STORES.SESSION_STATE);
    const sessionIndex = sessionStore.index('workspaceId');
    const sessionRequest = sessionIndex.count(IDBKeyRange.only(currentWorkspace));
    sessionRequest.onsuccess = () => {
      stats.sessionState.count = sessionRequest.result;
    };

    // Diagnostic logs stats
    const logStore = tx.objectStore(STORES.DIAGNOSTIC_LOGS);
    const logIndex = logStore.index('workspaceId');
    const logRequest = logIndex.openCursor(IDBKeyRange.only(currentWorkspace));

    logRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        stats.diagnosticLogs.count++;
        const level = cursor.value.level;
        stats.diagnosticLogs.byLevel[level] = (stats.diagnosticLogs.byLevel[level] || 0) + 1;
        cursor.continue();
      }
    };

    // Magic Canvas state stats
    const magicCanvasStore = tx.objectStore(STORES.MAGIC_CANVAS_STATE);
    const magicCanvasIndex = magicCanvasStore.index('workspaceId');
    const magicCanvasRequest = magicCanvasIndex.openCursor(IDBKeyRange.only(currentWorkspace));

    magicCanvasRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        stats.magicCanvasState.count++;
        const timestamp = cursor.value.timestamp;

        if (!stats.magicCanvasState.oldestEntry || timestamp < stats.magicCanvasState.oldestEntry) {
          stats.magicCanvasState.oldestEntry = timestamp;
        }
        if (!stats.magicCanvasState.newestEntry || timestamp > stats.magicCanvasState.newestEntry) {
          stats.magicCanvasState.newestEntry = timestamp;
        }

        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve(stats);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Export workspace data to JSON
 */
export async function exportWorkspace(workspaceId = currentWorkspace) {
  if (!db) await initWorkspaceDB();

  const exportData = {
    version: DB_VERSION,
    exportedAt: Date.now(),
    workspace: await getWorkspace(workspaceId),
    casCache: [],
    sessionState: [],
    diagnosticLogs: [],
    transformersCache: [],
    magicCanvasState: []
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([
      STORES.CAS_CACHE,
      STORES.SESSION_STATE,
      STORES.DIAGNOSTIC_LOGS,
      STORES.TRANSFORMERS_CACHE,
      STORES.MAGIC_CANVAS_STATE
    ], 'readonly');

    // Export CAS cache
    const casStore = tx.objectStore(STORES.CAS_CACHE);
    const casIndex = casStore.index('workspaceId');
    casIndex.openCursor(IDBKeyRange.only(workspaceId)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        exportData.casCache.push(cursor.value);
        cursor.continue();
      }
    };

    // Export session state
    const sessionStore = tx.objectStore(STORES.SESSION_STATE);
    const sessionIndex = sessionStore.index('workspaceId');
    sessionIndex.openCursor(IDBKeyRange.only(workspaceId)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        exportData.sessionState.push(cursor.value);
        cursor.continue();
      }
    };

    // Export diagnostic logs
    const logStore = tx.objectStore(STORES.DIAGNOSTIC_LOGS);
    const logIndex = logStore.index('workspaceId');
    logIndex.openCursor(IDBKeyRange.only(workspaceId)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        exportData.diagnosticLogs.push(cursor.value);
        cursor.continue();
      }
    };

    // Export transformers cache
    const transformersStore = tx.objectStore(STORES.TRANSFORMERS_CACHE);
    const transformersIndex = transformersStore.index('workspaceId');
    transformersIndex.openCursor(IDBKeyRange.only(workspaceId)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        exportData.transformersCache.push(cursor.value);
        cursor.continue();
      }
    };

    // Export Magic Canvas state
    const magicCanvasStore = tx.objectStore(STORES.MAGIC_CANVAS_STATE);
    const magicCanvasIndex = magicCanvasStore.index('workspaceId');
    magicCanvasIndex.openCursor(IDBKeyRange.only(workspaceId)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        exportData.magicCanvasState.push(cursor.value);
        cursor.continue();
      }
    };

    tx.oncomplete = () => {
      logDiagnostic('info', 'export', `Exported workspace: ${workspaceId}`);
      resolve(exportData);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Import workspace data from JSON
 */
export async function importWorkspace(importData, options = {}) {
  if (!db) await initWorkspaceDB();

  const { overwrite = false, newWorkspaceId = null } = options;

  // Validate import data
  if (!importData.workspace) {
    throw new Error('Invalid import data: missing workspace metadata');
  }

  const workspaceId = newWorkspaceId || importData.workspace.id;

  // Check if workspace exists
  const existing = await getWorkspace(workspaceId);
  if (existing && !overwrite) {
    throw new Error(`Workspace ${workspaceId} already exists. Set overwrite=true to replace.`);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([
      STORES.WORKSPACES,
      STORES.CAS_CACHE,
      STORES.SESSION_STATE,
      STORES.DIAGNOSTIC_LOGS,
      STORES.TRANSFORMERS_CACHE,
      STORES.MAGIC_CANVAS_STATE
    ], 'readwrite');

    // Import workspace metadata
    const workspaceData = { ...importData.workspace, id: workspaceId };
    tx.objectStore(STORES.WORKSPACES).put(workspaceData);

    // Import CAS cache
    const casStore = tx.objectStore(STORES.CAS_CACHE);
    (importData.casCache || []).forEach(entry => {
      casStore.put({ ...entry, workspaceId });
    });

    // Import session state
    const sessionStore = tx.objectStore(STORES.SESSION_STATE);
    (importData.sessionState || []).forEach(entry => {
      sessionStore.put({ ...entry, workspaceId });
    });

    // Import diagnostic logs (skip IDs, let them auto-increment)
    const logStore = tx.objectStore(STORES.DIAGNOSTIC_LOGS);
    (importData.diagnosticLogs || []).forEach(entry => {
      const { id, ...logData } = entry;
      logStore.add({ ...logData, workspaceId });
    });

    // Import transformers cache
    const transformersStore = tx.objectStore(STORES.TRANSFORMERS_CACHE);
    (importData.transformersCache || []).forEach(entry => {
      transformersStore.put({ ...entry, workspaceId });
    });

    // Import Magic Canvas state
    const magicCanvasStore = tx.objectStore(STORES.MAGIC_CANVAS_STATE);
    (importData.magicCanvasState || []).forEach(entry => {
      magicCanvasStore.put({ ...entry, workspaceId });
    });

    tx.oncomplete = () => {
      logDiagnostic('info', 'import', `Imported workspace: ${workspaceId}`);
      resolve(workspaceData);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Save session state
 */
export async function saveSessionState(key, value) {
  if (!db) await initWorkspaceDB();

  const entry = {
    workspaceId: currentWorkspace,
    key,
    value,
    timestamp: Date.now()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SESSION_STATE], 'readwrite');
    const store = tx.objectStore(STORES.SESSION_STATE);
    const request = store.put(entry);

    request.onsuccess = () => resolve(entry);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load session state
 */
export async function loadSessionState(key) {
  if (!db) await initWorkspaceDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SESSION_STATE], 'readonly');
    const store = tx.objectStore(STORES.SESSION_STATE);
    const request = store.get([currentWorkspace, key]);

    request.onsuccess = () => resolve(request.result?.value || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save Magic Canvas state with versioning and validation
 */
export async function saveMagicCanvasState(key, canvasState, appState, rowManagerState, version = 1) {
  if (!db) await initWorkspaceDB();

  try {
    // Validate inputs before saving
    const validation = validateMagicCanvasStateInputs(canvasState, appState, rowManagerState, version);
    if (!validation.isValid) {
      throw new Error(`Invalid Magic Canvas state: ${validation.errors.join(', ')}`);
    }

    // Optimize state for large canvases (>100 elements)
    let optimizedState = { canvasState, appState, rowManagerState };
    if (canvasState.length > 100) {
      optimizedState = optimizeMagicCanvasState(canvasState, appState, rowManagerState);
    }

    const entry = {
      workspaceId: currentWorkspace,
      key,
      canvasState: optimizedState.canvasState, // Optimized Excalidraw elements
      appState: optimizedState.appState,   // Excalidraw app state (zoom, pan, etc.)
      rowManagerState: optimizedState.rowManagerState, // Optimized RowManager state
      version,
      timestamp: Date.now(),
      optimized: canvasState.length > 100 // Flag for debugging
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.MAGIC_CANVAS_STATE], 'readwrite');
      const store = tx.objectStore(STORES.MAGIC_CANVAS_STATE);
      const request = store.put(entry);

      request.onsuccess = () => {
        logDiagnostic('info', 'workspace', `Magic Canvas state saved: ${key}`, {
          elementCount: optimizedState.canvasState?.length || 0,
          originalElementCount: canvasState?.length || 0,
          rowCount: optimizedState.rowManagerState?.rows?.length || 0,
          elementMappings: Object.keys(optimizedState.rowManagerState?.elementToRow || {}).length,
          version,
          zoomLevel: optimizedState.appState?.zoom?.value,
          optimized: entry.optimized,
          optimizationTime: optimizedState.optimizationTime?.toFixed(2) + 'ms'
        });
        resolve(entry);
      };
      request.onerror = () => {
        const error = request.error;
        let errorMessage = error.message;
        let errorSeverity = 'error';
        
        // Handle specific IndexedDB errors
        if (error.name === 'QuotaExceededError') {
          errorMessage = 'Storage quota exceeded - canvas state too large to save';
          errorSeverity = 'critical';
        } else if (error.name === 'InvalidStateError') {
          errorMessage = 'Database invalid state - try refreshing the page';
          errorSeverity = 'critical';
        } else if (error.name === 'TransactionInactiveError') {
          errorMessage = 'Database transaction inactive - try again';
          errorSeverity = 'warn';
        }
        
        logDiagnostic(errorSeverity, 'workspace', `Failed to save Magic Canvas state: ${key}`, {
          error: errorMessage,
          errorName: error.name,
          elementCount: canvasState?.length || 0,
          version,
          quotaUsed: error.name === 'QuotaExceededError' ? 'exceeded' : 'unknown'
        });
        reject(new Error(errorMessage));
      };
    });
  } catch (error) {
    logDiagnostic('error', 'workspace', `Magic Canvas state save validation failed: ${key}`, {
      error: error.message,
      elementCount: canvasState?.length || 0,
      version
    });
    throw error;
  }
}

/**
 * Validate Magic Canvas state inputs before saving
 */
function validateMagicCanvasStateInputs(canvasState, appState, rowManagerState, version) {
  const errors = [];
  
  // Validate canvasState
  if (!Array.isArray(canvasState)) {
    errors.push('canvasState must be an array');
  } else if (canvasState.length > 10000) {
    errors.push('canvasState has too many elements (>10000)');
  }
  
  // Validate appState
  if (!appState || typeof appState !== 'object') {
    errors.push('appState must be an object');
  }
  
  // Validate rowManagerState
  if (!rowManagerState || typeof rowManagerState !== 'object') {
    errors.push('rowManagerState must be an object');
  } else {
    if (!Array.isArray(rowManagerState.rows)) {
      errors.push('rowManagerState.rows must be an array');
    }
    
    if (typeof rowManagerState.elementToRow !== 'object') {
      errors.push('rowManagerState.elementToRow must be an object');
    }
  }
  
  // Validate version
  if (typeof version !== 'number' || version < 1) {
    errors.push('version must be a positive number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Load Magic Canvas state with version checking and corruption detection
 */
export async function loadMagicCanvasState(key, expectedVersion = 1) {
  if (!db) await initWorkspaceDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.MAGIC_CANVAS_STATE], 'readonly');
    const store = tx.objectStore(STORES.MAGIC_CANVAS_STATE);
    const request = store.get([currentWorkspace, key]);

    request.onsuccess = () => {
      const result = request.result;
      
      if (result) {
        try {
          // Validate state structure
          const validation = validateMagicCanvasState(result);
          
          if (!validation.isValid) {
            logDiagnostic('error', 'workspace', `Magic Canvas state corruption detected`, {
              key,
              errors: validation.errors,
              timestamp: result.timestamp
            });
            resolve(null); // Return null to trigger fallback
            return;
          }

          // Version compatibility check
          if (result.version !== expectedVersion) {
            logDiagnostic('warn', 'workspace', `Magic Canvas state version mismatch`, {
              key,
              expected: expectedVersion,
              actual: result.version
            });
          }
          
          resolve({
            canvasState: result.canvasState,
            appState: result.appState,
            rowManagerState: result.rowManagerState,
            version: result.version,
            timestamp: result.timestamp
          });
        } catch (validationError) {
          logDiagnostic('error', 'workspace', `Magic Canvas state validation error`, {
            key,
            error: validationError.message,
            timestamp: result.timestamp
          });
          resolve(null); // Return null to trigger fallback
        }
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Validate Magic Canvas state structure and detect corruption
 */
function validateMagicCanvasState(state) {
  const errors = [];
  
  // Check required top-level properties
  if (!state || typeof state !== 'object') {
    errors.push('State is not an object');
    return { isValid: false, errors };
  }

  // Validate canvasState (should be array of elements)
  if (!Array.isArray(state.canvasState)) {
    errors.push('canvasState is not an array');
  } else {
    // Check element structure
    for (let i = 0; i < Math.min(state.canvasState.length, 10); i++) {
      const element = state.canvasState[i];
      if (!element || typeof element !== 'object') {
        errors.push(`Element at index ${i} is not a valid object`);
        continue;
      }
      
      if (!element.id || typeof element.id !== 'string') {
        errors.push(`Element at index ${i} missing valid id`);
      }
      
      if (typeof element.x !== 'number' || typeof element.y !== 'number') {
        errors.push(`Element at index ${i} missing valid coordinates`);
      }
    }
  }

  // Validate appState
  if (!state.appState || typeof state.appState !== 'object') {
    errors.push('appState is not a valid object');
  } else {
    // Check critical appState properties
    if (state.appState.zoom && typeof state.appState.zoom !== 'object') {
      errors.push('appState.zoom is not a valid object');
    }
    
    if (typeof state.appState.scrollX !== 'number') {
      errors.push('appState.scrollX is not a number');
    }
    
    if (typeof state.appState.scrollY !== 'number') {
      errors.push('appState.scrollY is not a number');
    }
  }

  // Validate rowManagerState
  if (!state.rowManagerState || typeof state.rowManagerState !== 'object') {
    errors.push('rowManagerState is not a valid object');
  } else {
    if (!Array.isArray(state.rowManagerState.rows)) {
      errors.push('rowManagerState.rows is not an array');
    }
    
    if (typeof state.rowManagerState.elementToRow !== 'object') {
      errors.push('rowManagerState.elementToRow is not an object');
    }
  }

  // Validate version
  if (typeof state.version !== 'number' || state.version < 1) {
    errors.push('version is not a valid positive number');
  }

  // Validate timestamp
  if (typeof state.timestamp !== 'number' || state.timestamp <= 0) {
    errors.push('timestamp is not a valid positive number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Benchmark Magic Canvas state restoration performance
 */
export async function benchmarkMagicCanvasRestoration(elementCount = 500) {
  if (!db) await initWorkspaceDB();

  const startTime = performance.now();
  
  try {
    // Create test data with specified element count
    const testCanvasState = Array.from({ length: elementCount }, (_, i) => ({
      id: `test-element-${i}`,
      type: 'rectangle',
      x: Math.random() * 1000,
      y: Math.random() * 10000,
      width: 100,
      height: 50,
      strokeColor: '#000000',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 2,
      roughness: 0,
      opacity: 100,
      isDeleted: false
    }));

    const testAppState = {
      viewBackgroundColor: '#f5f5f5',
      zoom: { value: 1 },
      scrollX: 0,
      scrollY: 0
    };

    const testRowManagerState = {
      rowHeight: 384,
      startY: 0,
      rows: Array.from({ length: Math.ceil(elementCount / 10) }, (_, i) => ({
        id: `row-${i}`,
        yStart: i * 384,
        yEnd: (i + 1) * 384,
        elementIds: new Set(Array.from({ length: 10 }, (_, j) => `test-element-${i * 10 + j}`))
      })),
      elementToRow: Object.fromEntries(
        Array.from({ length: elementCount }, (_, i) => [`test-element-${i}`, `row-${Math.floor(i / 10)}`])
      )
    };

    // Save test state
    await saveMagicCanvasState('benchmark', testCanvasState, testAppState, testRowManagerState, 1);
    
    const saveTime = performance.now() - startTime;
    const loadStartTime = performance.now();
    
    // Load test state
    const loadedState = await loadMagicCanvasState('benchmark', 1);
    
    const loadTime = performance.now() - loadStartTime;
    const totalTime = performance.now() - startTime;
    
    // Clean up benchmark data
    await clearMagicCanvasState('benchmark');
    
    const results = {
      elementCount,
      saveTime: saveTime.toFixed(2),
      loadTime: loadTime.toFixed(2),
      totalTime: totalTime.toFixed(2),
      meetsTarget: loadTime < 1000, // AC6: <1s for <500 elements
      throughput: (elementCount / (loadTime / 1000)).toFixed(0) // elements per second
    };
    
    logDiagnostic('info', 'workspace', 'Magic Canvas performance benchmark completed', results);
    
    return results;
  } catch (error) {
    logDiagnostic('error', 'workspace', 'Magic Canvas performance benchmark failed', {
      elementCount,
      error: error.message
    });
    throw error;
  }
}

/**
 * Optimize Magic Canvas state for large canvases
 */
export function optimizeMagicCanvasState(canvasState, appState, rowManagerState) {
  const startTime = performance.now();
  
  try {
    // Create optimized copies
    const optimizedCanvasState = canvasState.map(element => ({
      // Only keep essential properties for persistence
      id: element.id,
      type: element.type,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      strokeColor: element.strokeColor,
      backgroundColor: element.backgroundColor,
      fillStyle: element.fillStyle,
      strokeWidth: element.strokeWidth,
      roughness: element.roughness,
      opacity: element.opacity,
      isDeleted: element.isDeleted,
      // Trim text content if too long (potential performance issue)
      text: element.text && element.text.length > 1000 ? element.text.substring(0, 1000) + '...' : element.text,
      // Exclude non-essential properties like customData, seed, etc.
    }));

    // Optimize RowManager state
    const optimizedRowManagerState = {
      ...rowManagerState,
      // Convert Sets to Arrays for better serialization performance
      rows: rowManagerState.rows.map(row => ({
        ...row,
        elementIds: Array.from(row.elementIds)
      })),
      elementToRow: rowManagerState.elementToRow
    };

    const optimizationTime = performance.now() - startTime;
    
    logDiagnostic('debug', 'workspace', 'Magic Canvas state optimized', {
      originalElementCount: canvasState.length,
      optimizedElementCount: optimizedCanvasState.length,
      optimizationTime: `${optimizationTime.toFixed(2)}ms`,
      sizeReduction: `${((1 - JSON.stringify(optimizedCanvasState).length / JSON.stringify(canvasState).length) * 100).toFixed(1)}%`
    });

    return {
      canvasState: optimizedCanvasState,
      appState, // AppState is usually small, no optimization needed
      rowManagerState: optimizedRowManagerState,
      optimizationTime
    };
  } catch (error) {
    logDiagnostic('error', 'workspace', 'Magic Canvas state optimization failed', {
      elementCount: canvasState.length,
      error: error.message
    });
    // Return original state if optimization fails
    return { canvasState, appState, rowManagerState, optimizationTime: 0 };
  }
}

/**
 * Clear Magic Canvas state for current workspace
 */
export async function clearMagicCanvasState(key = null) {
  if (!db) await initWorkspaceDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.MAGIC_CANVAS_STATE], 'readwrite');
    const store = tx.objectStore(STORES.MAGIC_CANVAS_STATE);

    if (key) {
      // Clear specific key
      const request = store.delete([currentWorkspace, key]);
      request.onsuccess = () => {
        logDiagnostic('info', 'workspace', `Magic Canvas state cleared: ${key}`);
        resolve(1);
      };
    request.onerror = () => {
      const error = request.error;
      let errorMessage = error.message;
      let errorSeverity = 'error';
      
      // Handle specific IndexedDB errors
      if (error.name === 'InvalidStateError') {
        errorMessage = 'Database invalid state - try refreshing the page';
        errorSeverity = 'critical';
      } else if (error.name === 'TransactionInactiveError') {
        errorMessage = 'Database transaction inactive - try again';
        errorSeverity = 'warn';
      }
      
      logDiagnostic(errorSeverity, 'workspace', `Failed to load Magic Canvas state: ${key}`, {
        error: errorMessage,
        errorName: error.name
      });
      reject(new Error(errorMessage));
    };
    } else {
      // Clear all Magic Canvas state for workspace
      const index = store.index('workspaceId');
      const request = index.openCursor(IDBKeyRange.only(currentWorkspace));

      let deleteCount = 0;
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deleteCount++;
          cursor.continue();
        }
      };

      tx.oncomplete = () => {
        logDiagnostic('info', 'workspace', `Cleared ${deleteCount} Magic Canvas state entries`);
        resolve(deleteCount);
      };
      tx.onerror = () => reject(tx.error);
    }
  });
}

/**
 * Log diagnostic message
 */
export async function logDiagnostic(level, category, message, metadata = {}) {
  if (!db) await initWorkspaceDB();

  const log = {
    workspaceId: currentWorkspace,
    level, // 'debug', 'info', 'warn', 'error'
    category, // 'cache', 'cas', 'ocr', 'workspace', 'export', 'import', etc.
    message,
    metadata,
    timestamp: Date.now()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.DIAGNOSTIC_LOGS], 'readwrite');
    const store = tx.objectStore(STORES.DIAGNOSTIC_LOGS);
    const request = store.add(log);

    request.onsuccess = () => {
      console.log(`[${level.toUpperCase()}] [${category}] ${message}`, metadata);
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get diagnostic logs
 */
export async function getDiagnosticLogs(options = {}) {
  if (!db) await initWorkspaceDB();

  const {
    workspaceId = currentWorkspace,
    level = null,
    category = null,
    limit = 100,
    offset = 0
  } = options;

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.DIAGNOSTIC_LOGS], 'readonly');
    const store = tx.objectStore(STORES.DIAGNOSTIC_LOGS);
    const index = store.index('workspaceId');
    const request = index.openCursor(IDBKeyRange.only(workspaceId), 'prev'); // Newest first

    const logs = [];
    let skipCount = 0;

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && logs.length < limit) {
        const log = cursor.value;

        // Filter by level and category if specified
        const levelMatch = !level || log.level === level;
        const categoryMatch = !category || log.category === category;

        if (levelMatch && categoryMatch) {
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
 * Clear diagnostic logs for current workspace
 */
export async function clearDiagnosticLogs() {
  if (!db) await initWorkspaceDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.DIAGNOSTIC_LOGS], 'readwrite');
    const store = tx.objectStore(STORES.DIAGNOSTIC_LOGS);
    const index = store.index('workspaceId');
    const request = index.openCursor(IDBKeyRange.only(currentWorkspace));

    let deleteCount = 0;
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        deleteCount++;
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve(deleteCount);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get database storage estimate
 */
export async function getStorageEstimate() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    return await navigator.storage.estimate();
  }
  return null;
}

// Initialize on module load (but skip in test environment)
// Check if we're in a test environment before initializing
function isTestEnvironment() {
  return (
    typeof process !== 'undefined' &&
    process.env &&
    (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true')
  );
}

if (!isTestEnvironment()) {
  initWorkspaceDB().catch(err => {
    console.error('[WorkspaceDB] Failed to initialize:', err);
  });
}
