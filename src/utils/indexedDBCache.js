/**
 * IndexedDB Cache for Canonical Forms
 * Stores canonicalized expressions for fast lookup
 */

const DB_NAME = 'texo-cas-cache';
const DB_VERSION = 1;
const STORE_NAME = 'canonical-forms';

/**
 * Initialize IndexedDB
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'latex' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('canonical', 'canonical', { unique: false });
      }
    };
  });
}

/**
 * Store canonical form in cache
 * @param {string} latex - Original LaTeX expression
 * @param {string} canonical - Canonical form
 * @param {Object} metadata - Additional metadata
 */
export async function cacheCanonicalForm(latex, canonical, metadata = {}) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

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

/**
 * Retrieve canonical form from cache
 * @param {string} latex - LaTeX expression to lookup
 * @returns {Object|null} - Cached data or null if not found
 */
export async function getCachedCanonicalForm(latex) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(latex);

    request.onsuccess = () => {
      if (request.result) {
        // Check if cache is stale (older than 7 days)
        const age = Date.now() - request.result.timestamp;
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        if (age < maxAge) {
          resolve(request.result);
        } else {
          // Stale cache, delete it
          deleteFromCache(latex).then(() => resolve(null));
        }
      } else {
        resolve(null);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete entry from cache
 * @param {string} latex - LaTeX expression to delete
 */
export async function deleteFromCache(latex) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(latex);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear entire cache
 */
export async function clearCache() {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
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
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      resolve({
        count: countRequest.result,
        dbName: DB_NAME,
        version: DB_VERSION
      });
    };

    countRequest.onerror = () => reject(countRequest.error);
  });
}
