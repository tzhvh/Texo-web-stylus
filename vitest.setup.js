/**
 * Vitest Setup File
 * Provides mocks for browser APIs not available in test environment
 */

import { vi } from 'vitest';

// ============================================================================
// Mock Web Worker
// ============================================================================

class MockWorker {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.onmessage = null;
    this.onerror = null;
    this.listeners = {};
  }

  postMessage(message) {
    // Simulate async response for logging worker
    if (typeof setTimeout !== 'undefined') {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              id: message.id,
              success: true,
              result: {}
            }
          });
        }
      }, 0);
    }
  }

  terminate() {
    // Mock cleanup
  }

  addEventListener(event, handler) {
    this.listeners[event] = handler;
  }

  removeEventListener(event) {
    delete this.listeners[event];
  }
}

// ============================================================================
// Mock IndexedDB
// ============================================================================

class MockIDBRequest {
  constructor() {
    this.onsuccess = null;
    this.onerror = null;
    this.result = null;
    this.error = null;
  }
}

class MockIDBIndex {
  constructor() {}

  openCursor() {
    const request = new MockIDBRequest();
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  }

  count() {
    const request = new MockIDBRequest();
    request.result = 0;
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  }
}

class MockIDBObjectStore {
  constructor() {
    this.data = new Map();
  }

  get(key) {
    const request = new MockIDBRequest();
    request.result = this.data.get(key) || null;
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  }

  put(value) {
    const request = new MockIDBRequest();
    const key = value.id || Math.random().toString();
    this.data.set(key, value);
    request.result = key;
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  }

  add(value) {
    return this.put(value);
  }

  delete(key) {
    const request = new MockIDBRequest();
    this.data.delete(key);
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  }

  getAll() {
    const request = new MockIDBRequest();
    request.result = Array.from(this.data.values());
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  }

  index(name) {
    return new MockIDBIndex();
  }

  clear() {
    const request = new MockIDBRequest();
    this.data.clear();
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  }
}

class MockIDBTransaction {
  constructor() {
    this.oncomplete = null;
    this.onerror = null;
    this.stores = {};
  }

  objectStore(name) {
    if (!this.stores[name]) {
      this.stores[name] = new MockIDBObjectStore();
    }
    return this.stores[name];
  }
}

class MockIDBDatabase {
  constructor() {
    this.name = 'test-db';
    this.version = 1;
  }

  transaction(storeNames, mode = 'readonly') {
    return new MockIDBTransaction();
  }

  close() {
    // Mock close
  }
}

class MockIDBFactory {
  constructor() {
    this.databases = new Map();
  }

  open(name, version) {
    const request = new MockIDBRequest();
    const db = new MockIDBDatabase();

    setTimeout(() => {
      request.result = db;
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);

    return request;
  }

  deleteDatabase(name) {
    const request = new MockIDBRequest();
    this.databases.delete(name);
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    }, 0);
    return request;
  }
}

// ============================================================================
// Mock IDBKeyRange
// ============================================================================

const MockIDBKeyRange = {
  only: (value) => ({
    lower: value,
    upper: value,
    lowerOpen: false,
    upperOpen: false
  }),
  lowerBound: (value, open) => ({
    lower: value,
    upper: undefined,
    lowerOpen: open || false
  }),
  upperBound: (value, open) => ({
    lower: undefined,
    upper: value,
    upperOpen: open || false
  }),
  bound: (lower, upper, lowerOpen, upperOpen) => ({
    lower,
    upper,
    lowerOpen: lowerOpen || false,
    upperOpen: upperOpen || false
  })
};

// ============================================================================
// Assign mocks to global
// ============================================================================

Object.assign(global, {
  Worker: MockWorker,
  indexedDB: new MockIDBFactory(),
  IDBKeyRange: MockIDBKeyRange,
  IDBRequest: MockIDBRequest,
  IDBDatabase: MockIDBDatabase,
  IDBTransaction: MockIDBTransaction,
  IDBObjectStore: MockIDBObjectStore
});

// ============================================================================
// Suppress console warnings in tests (optional)
// ============================================================================

const originalWarn = console.warn;
const originalError = console.error;

global.console.warn = vi.fn((...args) => {
  // Only suppress specific warnings
  const message = args[0]?.toString() || '';
  if (message.includes('Canonicalization reached max iterations')) {
    return; // Suppress this warning in tests
  }
  originalWarn.call(console, ...args);
});

global.console.error = vi.fn((...args) => {
  // Only suppress specific errors
  const message = args[0]?.toString() || '';
  if (message.includes('WorkspaceDB') || message.includes('Worker')) {
    return; // Suppress browser API errors
  }
  originalError.call(console, ...args);
});

// ============================================================================
// Mock localStorage
// ============================================================================

const localStorageMock = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = String(value);
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

if (typeof localStorage === 'undefined') {
  global.localStorage = localStorageMock;
}

// ============================================================================
// Mock navigator.storage
// ============================================================================

if (typeof navigator === 'undefined') {
  global.navigator = {};
}

if (!navigator.storage) {
  navigator.storage = {
    estimate: async () => ({
      usage: 0,
      quota: 1024 * 1024 * 50 // 50MB
    })
  };
}
