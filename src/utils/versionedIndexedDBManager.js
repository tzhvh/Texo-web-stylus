/**
 * Versioned IndexedDB Manager
 * Handles schema versioning, migrations, workspaces, import/export, and cache management
 */

const DB_NAME = 'texo-db';
const WORKSPACE_STORE = 'workspaces';
const CACHE_STORE = 'canonical-forms';
const METADATA_STORE = 'metadata';

// Schema versions and their migrations
const SCHEMA_VERSIONS = {
  1: {
    version: 1,
    stores: {
      [CACHE_STORE]: { keyPath: 'latex', indexes: ['timestamp', 'canonical'] },
      [METADATA_STORE]: { keyPath: 'key' }
    },
    migrate: null // First version, no migration needed
  },
  2: {
    version: 2,
    stores: {
      [CACHE_STORE]: { keyPath: 'latex', indexes: ['timestamp', 'canonical'] },
      [WORKSPACE_STORE]: { keyPath: 'id', indexes: ['createdAt'] },
      [METADATA_STORE]: { keyPath: 'key' }
    },
    migrate: async (db, oldVersion) => {
      // Migration from v1 to v2: Add workspace support
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(WORKSPACE_STORE)) {
          db.createObjectStore(WORKSPACE_STORE, { keyPath: 'id' });
        }
      }
    }
  }
};

const CURRENT_VERSION = 2;

/**
 * Initialize or get database connection with versioning
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, CURRENT_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      // Create or update stores based on schema
      const schemaVersion = SCHEMA_VERSIONS[CURRENT_VERSION];

      for (const [storeName, config] of Object.entries(schemaVersion.stores)) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: config.keyPath });

          if (config.indexes) {
            config.indexes.forEach(indexName => {
              store.createIndex(indexName, indexName, { unique: false });
            });
          }
        }
      }

      // Run migration if needed
      if (schemaVersion.migrate && oldVersion < CURRENT_VERSION) {
        schemaVersion.migrate(db, oldVersion);
      }
    };
  });
}

/**
 * Cache management functions
 */

export async function cacheCanonicalForm(latex, canonical, metadata = {}) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE);

    const data = {
      latex,
      canonical,
      timestamp: Date.now(),
      ...metadata
    };

    const request = store.put(data);

    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedCanonicalForm(latex) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE], 'readonly');
    const store = transaction.objectStore(CACHE_STORE);
    const request = store.get(latex);

    request.onsuccess = () => {
      if (request.result) {
        const age = Date.now() - request.result.timestamp;
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        if (age < maxAge) {
          resolve(request.result);
        } else {
          deleteFromCache(latex).then(() => resolve(null));
        }
      } else {
        resolve(null);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deleteFromCache(latex) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE);
    const request = store.delete(latex);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearCache() {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE], 'readonly');
    const store = transaction.objectStore(CACHE_STORE);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      resolve({
        count: countRequest.result,
        dbName: DB_NAME,
        version: CURRENT_VERSION
      });
    };

    countRequest.onerror = () => reject(countRequest.error);
  });
}

/**
 * Workspace management functions
 */

export async function createWorkspace(name, description = '') {
  const db = await initDB();
  const id = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKSPACE_STORE], 'readwrite');
    const store = transaction.objectStore(WORKSPACE_STORE);

    const workspace = {
      id,
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cacheSnapshot: null
    };

    const request = store.add(workspace);

    request.onsuccess = () => resolve(workspace);
    request.onerror = () => reject(request.error);
  });
}

export async function listWorkspaces() {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKSPACE_STORE], 'readonly');
    const store = transaction.objectStore(WORKSPACE_STORE);
    const index = store.index('createdAt');
    const request = index.getAll();

    request.onsuccess = () => {
      // Sort by creation date descending
      resolve(request.result.reverse());
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getWorkspace(id) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKSPACE_STORE], 'readonly');
    const store = transaction.objectStore(WORKSPACE_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function updateWorkspace(id, updates) {
  const db = await initDB();

  return new Promise(async (resolve, reject) => {
    const transaction = db.transaction([WORKSPACE_STORE], 'readwrite');
    const store = transaction.objectStore(WORKSPACE_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const workspace = getRequest.result;
      if (workspace) {
        const updated = {
          ...workspace,
          ...updates,
          updatedAt: Date.now()
        };

        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error(`Workspace ${id} not found`));
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deleteWorkspace(id) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKSPACE_STORE], 'readwrite');
    const store = transaction.objectStore(WORKSPACE_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveWorkspaceSnapshot(workspaceId) {
  const db = await initDB();

  // Get all cache entries
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE, WORKSPACE_STORE], 'readwrite');
    const cacheStore = transaction.objectStore(CACHE_STORE);
    const workspaceStore = transaction.objectStore(WORKSPACE_STORE);

    const getAllRequest = cacheStore.getAll();

    getAllRequest.onsuccess = () => {
      const cacheData = getAllRequest.result;
      const snapshot = {
        timestamp: Date.now(),
        cacheEntries: cacheData
      };

      const updateRequest = workspaceStore.get(workspaceId);

      updateRequest.onsuccess = () => {
        const workspace = updateRequest.result;
        if (workspace) {
          workspace.cacheSnapshot = snapshot;
          workspace.updatedAt = Date.now();

          const putRequest = workspaceStore.put(workspace);
          putRequest.onsuccess = () => resolve(snapshot);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error(`Workspace ${workspaceId} not found`));
        }
      };

      updateRequest.onerror = () => reject(updateRequest.error);
    };

    getAllRequest.onerror = () => reject(getAllRequest.error);
  });
}

export async function restoreWorkspaceSnapshot(workspaceId) {
  const db = await initDB();

  return new Promise(async (resolve, reject) => {
    const transaction = db.transaction([WORKSPACE_STORE, CACHE_STORE], 'readwrite');
    const workspaceStore = transaction.objectStore(WORKSPACE_STORE);
    const cacheStore = transaction.objectStore(CACHE_STORE);

    const getRequest = workspaceStore.get(workspaceId);

    getRequest.onsuccess = () => {
      const workspace = getRequest.result;
      if (!workspace || !workspace.cacheSnapshot) {
        reject(new Error(`Workspace ${workspaceId} or snapshot not found`));
        return;
      }

      // Clear cache and restore
      const clearRequest = cacheStore.clear();

      clearRequest.onsuccess = () => {
        const entries = workspace.cacheSnapshot.cacheEntries;
        let restored = 0;

        if (entries.length === 0) {
          resolve({ restored: 0, timestamp: workspace.cacheSnapshot.timestamp });
          return;
        }

        entries.forEach((entry, index) => {
          const putRequest = cacheStore.put(entry);

          putRequest.onsuccess = () => {
            restored++;
            if (restored === entries.length) {
              resolve({ restored, timestamp: workspace.cacheSnapshot.timestamp });
            }
          };

          putRequest.onerror = () => {
            rejected++;
            if (restored + rejected === entries.length) {
              reject(new Error(`Failed to restore some entries`));
            }
          };
        });
      };

      clearRequest.onerror = () => reject(clearRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Import/Export functions
 */

export async function exportDatabase() {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE, WORKSPACE_STORE, METADATA_STORE], 'readonly');

    const cacheStore = transaction.objectStore(CACHE_STORE);
    const workspaceStore = transaction.objectStore(WORKSPACE_STORE);
    const metadataStore = transaction.objectStore(METADATA_STORE);

    const cacheRequest = cacheStore.getAll();
    const workspaceRequest = workspaceStore.getAll();
    const metadataRequest = metadataStore.getAll();

    let completed = 0;
    let cacheData, workspaceData, metadataData;

    const tryResolve = () => {
      completed++;
      if (completed === 3) {
        resolve({
          version: CURRENT_VERSION,
          exportedAt: Date.now(),
          [CACHE_STORE]: cacheData || [],
          [WORKSPACE_STORE]: workspaceData || [],
          [METADATA_STORE]: metadataData || []
        });
      }
    };

    cacheRequest.onsuccess = () => {
      cacheData = cacheRequest.result;
      tryResolve();
    };
    cacheRequest.onerror = () => reject(cacheRequest.error);

    workspaceRequest.onsuccess = () => {
      workspaceData = workspaceRequest.result;
      tryResolve();
    };
    workspaceRequest.onerror = () => reject(workspaceRequest.error);

    metadataRequest.onsuccess = () => {
      metadataData = metadataRequest.result;
      tryResolve();
    };
    metadataRequest.onerror = () => reject(metadataRequest.error);
  });
}

export async function importDatabase(data, options = {}) {
  const { clearExisting = false, mergeMode = false } = options;
  const db = await initDB();

  return new Promise((resolve, reject) => {
    if (!data.version || data.version > CURRENT_VERSION) {
      reject(new Error(`Incompatible schema version: ${data.version}`));
      return;
    }

    const transaction = db.transaction([CACHE_STORE, WORKSPACE_STORE, METADATA_STORE], 'readwrite');

    const cacheStore = transaction.objectStore(CACHE_STORE);
    const workspaceStore = transaction.objectStore(WORKSPACE_STORE);
    const metadataStore = transaction.objectStore(METADATA_STORE);

    let imported = {
      cache: 0,
      workspaces: 0,
      metadata: 0
    };
    let errors = [];

    const tryResolve = () => {
      if (imported.cache >= 0 && imported.workspaces >= 0 && imported.metadata >= 0) {
        resolve({ imported, errors });
      }
    };

    // Handle cache import
    if (clearExisting && !mergeMode) {
      const clearRequest = cacheStore.clear();
      clearRequest.onsuccess = () => {
        if (data[CACHE_STORE] && data[CACHE_STORE].length > 0) {
          let count = 0;
          data[CACHE_STORE].forEach(entry => {
            const putRequest = cacheStore.put(entry);
            putRequest.onsuccess = () => {
              count++;
              imported.cache = count;
              if (count === data[CACHE_STORE].length) {
                tryResolve();
              }
            };
            putRequest.onerror = () => {
              errors.push(`Failed to import cache entry: ${entry.latex}`);
              count++;
              if (count === data[CACHE_STORE].length) {
                tryResolve();
              }
            };
          });
        } else {
          imported.cache = 0;
          tryResolve();
        }
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    } else {
      if (data[CACHE_STORE] && data[CACHE_STORE].length > 0) {
        let count = 0;
        data[CACHE_STORE].forEach(entry => {
          const putRequest = cacheStore.put(entry);
          putRequest.onsuccess = () => {
            count++;
            imported.cache = count;
            if (count === data[CACHE_STORE].length) {
              tryResolve();
            }
          };
          putRequest.onerror = () => {
            errors.push(`Failed to import cache entry: ${entry.latex}`);
            count++;
            if (count === data[CACHE_STORE].length) {
              tryResolve();
            }
          };
        });
      } else {
        imported.cache = 0;
        tryResolve();
      }
    }

    // Handle workspaces import
    if (data[WORKSPACE_STORE] && data[WORKSPACE_STORE].length > 0) {
      let count = 0;
      data[WORKSPACE_STORE].forEach(workspace => {
        const putRequest = workspaceStore.put(workspace);
        putRequest.onsuccess = () => {
          count++;
          imported.workspaces = count;
          if (count === data[WORKSPACE_STORE].length) {
            tryResolve();
          }
        };
        putRequest.onerror = () => {
          errors.push(`Failed to import workspace: ${workspace.name}`);
          count++;
          if (count === data[WORKSPACE_STORE].length) {
            tryResolve();
          }
        };
      });
    } else {
      imported.workspaces = 0;
      tryResolve();
    }

    // Handle metadata import
    if (data[METADATA_STORE] && data[METADATA_STORE].length > 0) {
      let count = 0;
      data[METADATA_STORE].forEach(item => {
        const putRequest = metadataStore.put(item);
        putRequest.onsuccess = () => {
          count++;
          imported.metadata = count;
          if (count === data[METADATA_STORE].length) {
            tryResolve();
          }
        };
        putRequest.onerror = () => {
          errors.push(`Failed to import metadata: ${item.key}`);
          count++;
          if (count === data[METADATA_STORE].length) {
            tryResolve();
          }
        };
      });
    } else {
      imported.metadata = 0;
      tryResolve();
    }
  });
}

/**
 * Get comprehensive database statistics
 */
export async function getDatabaseStats() {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE, WORKSPACE_STORE, METADATA_STORE], 'readonly');

    const cacheStore = transaction.objectStore(CACHE_STORE);
    const workspaceStore = transaction.objectStore(WORKSPACE_STORE);
    const metadataStore = transaction.objectStore(METADATA_STORE);

    const cacheCountRequest = cacheStore.count();
    const workspaceCountRequest = workspaceStore.count();
    const metadataCountRequest = metadataStore.count();

    let completed = 0;
    let cacheCount, workspaceCount, metadataCount;

    const tryResolve = () => {
      completed++;
      if (completed === 3) {
        resolve({
          version: CURRENT_VERSION,
          dbName: DB_NAME,
          cache: {
            count: cacheCount,
            estimatedSize: estimateSize(cacheCount)
          },
          workspaces: {
            count: workspaceCount
          },
          metadata: {
            count: metadataCount
          },
          totalEntries: cacheCount + workspaceCount + metadataCount
        });
      }
    };

    cacheCountRequest.onsuccess = () => {
      cacheCount = cacheCountRequest.result;
      tryResolve();
    };
    cacheCountRequest.onerror = () => reject(cacheCountRequest.error);

    workspaceCountRequest.onsuccess = () => {
      workspaceCount = workspaceCountRequest.result;
      tryResolve();
    };
    workspaceCountRequest.onerror = () => reject(workspaceCountRequest.error);

    metadataCountRequest.onsuccess = () => {
      metadataCount = metadataCountRequest.result;
      tryResolve();
    };
    metadataCountRequest.onerror = () => reject(metadataCountRequest.error);
  });
}

function estimateSize(count) {
  // Rough estimate: ~500 bytes per cache entry (LaTeX string + canonical form + metadata)
  return count * 500;
}

/**
 * Clear all caches used by the system
 */
export async function clearAllCaches() {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE);
    const request = store.clear();

    request.onsuccess = () => {
      // Also try to clear browser caches
      clearBrowserCaches().then(() => {
        resolve();
      }).catch((err) => {
        console.warn('Failed to clear browser caches:', err);
        resolve(); // Still resolve even if browser cache clearing fails
      });
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear browser-level caches (if available)
 */
async function clearBrowserCaches() {
  const promises = [];

  // Clear service worker caches if available
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    cacheNames.forEach(cacheName => {
      promises.push(caches.delete(cacheName));
    });
  }

  // Clear localStorage items related to caching
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes('cache') || key.includes('transformers')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  return Promise.all(promises);
}
