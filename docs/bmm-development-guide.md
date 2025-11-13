# Development Guide

**Project**: Texo-web-stylus
**Generated**: 2025-11-13
**Target Audience**: Developers working on or extending the project

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Testing](#testing)
5. [Adding New Features](#adding-new-features)
6. [Code Conventions](#code-conventions)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)
9. [Performance Considerations](#performance-considerations)
10. [Deployment](#deployment)

---

## Quick Start

### Prerequisites

- **Node.js**: v18+ (v20+ recommended)
- **Package Manager**: npm or pnpm (pnpm recommended for speed)
- **Git**: For version control
- **Modern Browser**: Chrome, Firefox, Edge, or Safari (for IndexedDB and Web Workers)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Texo-web-stylus

# Install dependencies
npm install
# or
pnpm install

# Start development server
npm run dev
# or
pnpm dev
```

The app will be available at `http://localhost:5173`

---

## Project Structure

```
Texo-web-stylus/
├── src/
│   ├── main.jsx                 # Application entry point
│   ├── App.jsx                  # Root component with routing
│   ├── index.css                # Global Tailwind styles
│   ├── pages/                   # Page components
│   │   ├── SketchPage.jsx       # Stylus drawing → LaTeX OCR
│   │   ├── OCRPage.jsx          # Image upload → LaTeX OCR
│   │   ├── ComposePage.jsx      # Math editor with equivalence checking
│   │   └── DatabasePage.jsx     # IndexedDB management UI
│   ├── contexts/                # React contexts
│   │   └── DebugContext.jsx     # Global debug mode state
│   ├── cas/                     # Computer Algebra System
│   │   ├── equivalenceChecker.js # Main CAS entry point
│   │   ├── katexParser.js       # LaTeX → AST parser
│   │   └── rules/               # Canonicalization rules
│   │       ├── ruleEngine.js    # Rule application engine
│   │       ├── algebraRules.js  # Algebraic simplification rules
│   │       └── trigRules.js     # Trigonometric identity rules
│   ├── utils/                   # Utility modules
│   │   ├── workspaceDB.js       # IndexedDB workspace manager
│   │   ├── indexedDBCache.js    # CAS cache wrapper
│   │   ├── spatialMapping.js    # AST → visual position mapping
│   │   ├── logger.js            # Centralized logging
│   │   └── __tests__/           # Utility tests
│   └── workers/                 # Web Workers
│       ├── ocrWorker.js         # Transformers.js OCR inference
│       ├── imageProcessor.js    # Image preprocessing
│       └── loggingWorker.js     # Async log aggregation
├── public/
│   └── test_img/                # Example images for testing
├── docs/                        # Documentation
│   ├── bmm-component-inventory.md
│   ├── bmm-ui-components.md
│   ├── bmm-state-management.md
│   ├── bmm-development-guide.md (this file)
│   ├── bmm-architecture.md
│   └── CANONICALIZATION_GUIDE.md
├── package.json                 # Dependencies and scripts
├── vite.config.js               # Vite build configuration
├── vitest.config.js             # Vitest test configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
├── CLAUDE.md                    # Project instructions for Claude Code
└── README.md                    # User-facing quick start
```

---

## Development Workflow

### 1. Starting the Dev Server

```bash
npm run dev
```

Features:
- Hot Module Replacement (HMR) - instant updates without page refresh
- Error overlay in browser
- Source maps for debugging
- Fast refresh for React components

**Dev Server Ports**:
- Main: `http://localhost:5173`
- If port in use, Vite auto-increments: 5174, 5175, etc.

### 2. Building for Production

```bash
npm run build
```

Output: `dist/` directory

Features:
- Minification
- Tree-shaking
- Code splitting
- Asset optimization

### 3. Previewing Production Build

```bash
npm run preview
```

Serves the `dist/` directory at `http://localhost:4173`

---

## Testing

### Test Structure

```
src/utils/__tests__/
├── equivalenceChecker.test.js    # Vitest unit tests
└── ruleEngine.test.js            # Rule engine tests

src/cas/__tests__/
└── equivalence.test.manual.js    # Node.js manual tests (not auto-run)
```

### Running Tests

```bash
# Run all Vitest tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run only equivalence checker tests
npm run test:equivalence

# Run manual tests (Node.js, not Vitest)
npm run test:manual

# Run all tests (equivalence + manual)
npm run test:all

# Run all tests with unified output
npm run test:unified
```

### Test Environment

- **Framework**: Vitest
- **Environment**: jsdom (for React component tests)
- **Timeout**: 10s (for CAS-heavy tests)
- **Coverage**: Not configured (can be added)

### Writing Tests

#### Example: Testing a CAS Rule

```javascript
import { describe, test, expect } from 'vitest';
import { checkEquivalence } from '../cas/equivalenceChecker.js';

describe('Algebraic simplification', () => {
  test('should recognize equivalent factored forms', () => {
    const result = checkEquivalence('x^2 + 4x + 4', '(x + 2)^2');

    expect(result.equivalent).toBe(true);
    expect(result.method).toBe('canonicalization'); // Not 'algebrite-*'
    expect(result.time).toBeLessThan(100); // Should be fast
  });
});
```

#### Example: Manual Test (Node.js)

```javascript
// src/cas/__tests__/my-test.manual.test.js
import { checkEquivalence } from '../equivalenceChecker.js';

console.log('Testing equivalence...');
const result = checkEquivalence('2x + 3x', '5x');
console.log(result);
```

Run with: `node src/cas/__tests__/my-test.manual.test.js`

### Test Exclusions

Files matching `*.manual.test.js` are excluded from Vitest (see `vitest.config.js`).

**Why?**
- Manual tests use Node.js APIs not available in jsdom
- Manual tests may be slow or require user interaction
- Vitest can't directly test Web Workers

---

## Adding New Features

### 1. Adding a New Page

**Step-by-step**:

1. **Create page component**:
   ```bash
   touch src/pages/MyNewPage.jsx
   ```

2. **Implement component**:
   ```jsx
   import React from 'react';

   export default function MyNewPage() {
     return (
       <div className="p-6 max-w-7xl mx-auto">
         <h1 className="text-3xl font-bold text-gray-800">My New Page</h1>
         <p className="text-gray-600 mt-2">Page description</p>
         {/* Your content */}
       </div>
     );
   }
   ```

3. **Add route** in `src/App.jsx`:
   ```jsx
   import MyNewPage from './pages/MyNewPage';

   // Inside <Routes>:
   <Route path="/my-new-page" element={<MyNewPage />} />
   ```

4. **Add navigation link** in `src/App.jsx` header:
   ```jsx
   <Link to="/my-new-page" className="text-gray-700 hover:text-blue-600 font-medium transition">
     My Page
   </Link>
   ```

5. **Test**: Navigate to `http://localhost:5173/my-new-page`

---

### 2. Adding a New Worker

**Step-by-step**:

1. **Create worker file**:
   ```bash
   touch src/workers/myWorker.js
   ```

2. **Implement worker**:
   ```javascript
   // src/workers/myWorker.js
   self.onmessage = async (e) => {
     const { type, ...data } = e.data;

     try {
       switch (type) {
         case 'init':
           // Initialize resources
           self.postMessage({ type: 'ready' });
           break;

         case 'process':
           // Do heavy computation
           const result = await doWork(data);
           self.postMessage({ type: 'result', output: result });
           break;

         default:
           throw new Error(`Unknown message type: ${type}`);
       }
     } catch (error) {
       self.postMessage({ type: 'error', error: error.message });
     }
   };

   async function doWork(data) {
     // Your logic here
     return { processed: true };
   }
   ```

3. **Use worker in component**:
   ```jsx
   import { useEffect, useRef } from 'react';
   import MyWorker from '../workers/myWorker?worker'; // Note: ?worker suffix

   export default function MyComponent() {
     const workerRef = useRef(null);

     useEffect(() => {
       const worker = new MyWorker();
       workerRef.current = worker;

       worker.onmessage = (e) => {
         const { type, ...data } = e.data;
         if (type === 'ready') console.log('Worker ready');
         if (type === 'result') console.log('Result:', data.output);
         if (type === 'error') console.error('Worker error:', data.error);
       };

       worker.postMessage({ type: 'init' });

       return () => worker.terminate();
     }, []);

     const runWorker = () => {
       workerRef.current?.postMessage({ type: 'process', data: { foo: 'bar' } });
     };

     return <button onClick={runWorker}>Run Worker</button>;
   }
   ```

**Important**:
- Worker files must use `?worker` suffix in import
- Workers run in isolated scope (no access to DOM or React)
- Use `postMessage` for communication
- Always terminate workers on component unmount

---

### 3. Adding a New CAS Rule

**Step-by-step**:

1. **Determine priority** (see `CANONICALIZATION_GUIDE.md`):
   - 90-100: Structural normalization (flatten, hoist)
   - 80-89: Algebraic simplification (combine terms)
   - 70-79: Ordering/sorting
   - 60-69: Expansion rules

2. **Add rule** to `src/cas/rules/algebraRules.js` or `trigRules.js`:
   ```javascript
   {
     name: 'combine-fractions',
     description: 'Combine fractions with common denominator',
     priority: 85,
     region: ['US', 'UK', 'EU'],
     match: (ast) => {
       // Return true if rule applies
       return ast.type === 'ordgroup' && ast.body.some(node => isFraction(node));
     },
     transform: (ast) => {
       // Return transformed AST
       const fractions = ast.body.filter(isFraction);
       // ... combine logic ...
       return transformedAst;
     }
   }
   ```

3. **Write test** in `src/utils/__tests__/equivalenceChecker.test.js`:
   ```javascript
   test('should combine fractions', () => {
     const result = checkEquivalence('1/2 + 1/2', '1');
     expect(result.equivalent).toBe(true);
     expect(result.method).toBe('canonicalization'); // Not 'algebrite-*'
   });
   ```

4. **Run tests**:
   ```bash
   npm run test:equivalence
   ```

5. **Document rule** in `CANONICALIZATION_GUIDE.md` if significant

**Helper Functions** (available in `algebraRules.js`):
- `clone(ast)`: Deep clone AST
- `isOrdGroup(node)`: Check if node is ordgroup
- `isMathOp(node, op)`: Check if node is specific operator
- `flattenOrdGroup(ast)`: Flatten nested ordgroups
- `sortOrdGroup(ast)`: Sort ordgroup children

---

### 4. Adding a Context Provider

**Step-by-step**:

1. **Create context file**:
   ```bash
   touch src/contexts/MyContext.jsx
   ```

2. **Implement context**:
   ```jsx
   import React, { createContext, useContext, useState } from 'react';

   const MyContext = createContext();

   export function MyProvider({ children }) {
     const [myState, setMyState] = useState('initial');

     return (
       <MyContext.Provider value={{ myState, setMyState }}>
         {children}
       </MyContext.Provider>
     );
   }

   export function useMyContext() {
     const context = useContext(MyContext);
     if (!context) {
       throw new Error('useMyContext must be used within MyProvider');
     }
     return context;
   }
   ```

3. **Wrap app** in `src/App.jsx`:
   ```jsx
   import { MyProvider } from './contexts/MyContext';

   export default function App() {
     return (
       <BrowserRouter>
         <DebugProvider>
           <MyProvider>
             <AppContent />
           </MyProvider>
         </DebugProvider>
       </BrowserRouter>
     );
   }
   ```

4. **Use in components**:
   ```jsx
   import { useMyContext } from '../contexts/MyContext';

   function MyComponent() {
     const { myState, setMyState } = useMyContext();
     return <div>{myState}</div>;
   }
   ```

---

## Code Conventions

### 1. File Naming

- **Components**: PascalCase, `.jsx` extension (`SketchPage.jsx`)
- **Utilities**: camelCase, `.js` extension (`workspaceDB.js`)
- **Workers**: camelCase, `.js` extension (`ocrWorker.js`)
- **Tests**: `*.test.js` or `*.manual.test.js`

### 2. Component Structure

```jsx
// Imports: external dependencies first, internal second
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useDebug } from '../contexts/DebugContext';
import { myUtility } from '../utils/myUtility.js';

// Constants (uppercase with underscores)
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 2000;

// Main component (default export)
export default function MyComponent({ propA, propB }) {
  // Hooks (useState, useEffect, useContext, etc.)
  const { debugMode } = useDebug();
  const [state, setState] = useState(initialValue);

  // Effects
  useEffect(() => {
    // Side effects
    return () => {
      // Cleanup
    };
  }, [dependencies]);

  // Event handlers
  const handleClick = () => {
    // Logic
  };

  // Helper functions (can be extracted if reused)
  const helperFunction = () => {
    // Logic
  };

  // Render
  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}

// Named exports (if any)
export function HelperComponent() {
  // ...
}
```

### 3. Styling

- **Only use TailwindCSS utility classes**
- **No custom CSS files** (except `index.css` for Tailwind imports)
- **No inline styles** (except for dynamic values like `width: ${percent}%`)
- **Consistent spacing**: Use Tailwind spacing scale (p-4, gap-6, etc.)

**Good**:
```jsx
<div className="p-6 max-w-7xl mx-auto">
  <h1 className="text-3xl font-bold text-gray-800">Title</h1>
</div>
```

**Bad**:
```jsx
<div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
  <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#1f2937' }}>Title</h1>
</div>
```

### 4. State Management

- **Local state**: Use `useState` for component-specific state
- **Global state**: Use Context API (e.g., DebugContext)
- **Persistent state**: Use IndexedDB via `workspaceDB.js`
- **Preferences**: Use localStorage for simple key-value pairs

**Don't**:
- Don't prop drill deeply (use Context instead)
- Don't store large objects in useState (use IndexedDB)
- Don't store sensitive data in localStorage (use IndexedDB)

### 5. Error Handling

```javascript
// Async functions: try-catch
const fetchData = async () => {
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    // Log to IndexedDB
    await logDiagnostic('error', 'api', `Fetch failed: ${error.message}`, { error });
    // Show user-facing error
    alert('Failed to fetch data. Please try again.');
    return null;
  }
};

// Event handlers: early return
const handleClick = () => {
  if (!isReady) {
    alert('Please wait for initialization');
    return;
  }
  // Continue...
};
```

### 6. Comments

- **Use JSDoc** for public APIs:
  ```javascript
  /**
   * Check if two LaTeX expressions are mathematically equivalent
   * @param {string} latex1 - First LaTeX expression
   * @param {string} latex2 - Second LaTeX expression
   * @param {Object} config - Configuration options
   * @returns {Object} - { equivalent, method, time, canonical1, canonical2, error }
   */
  export function checkEquivalence(latex1, latex2, config = {}) {
    // ...
  }
  ```

- **Inline comments** for complex logic:
  ```javascript
  // Extract elements within the OCR bounding box (exclude the box itself)
  const elementsInBox = allElements.filter((el) => {
    if (el.id === boundingBoxRef.current.id) return false; // Skip the box
    // ...
  });
  ```

- **Avoid obvious comments**:
  ```javascript
  // Bad: setState(true); // Set state to true
  // Good: setState(true); // Mark validation as complete
  ```

### 7. Imports

- **Use `.js` extension** for utility imports:
  ```javascript
  import { workspaceDB } from '../utils/workspaceDB.js';
  ```

- **Omit `.jsx` for React components**:
  ```javascript
  import SketchPage from './pages/SketchPage';
  ```

- **Group imports**:
  ```javascript
  // 1. External dependencies
  import React, { useState } from 'react';
  import { Link } from 'react-router-dom';

  // 2. Internal dependencies
  import { useDebug } from '../contexts/DebugContext';
  import { myUtil } from '../utils/myUtil.js';

  // 3. Styles (if any)
  import './styles.css';
  ```

---

## Common Tasks

### Task 1: Clear All IndexedDB Data

**Via UI**:
1. Navigate to Database page
2. Switch to "Overview" tab
3. Click "Clear CAS Cache", "Clear Transformers Cache", "Clear Diagnostic Logs"

**Via Browser DevTools**:
1. Open DevTools (F12)
2. Go to "Application" tab (Chrome) or "Storage" tab (Firefox)
3. Expand "IndexedDB" in left sidebar
4. Right-click `texo-workspace-db` → Delete Database

### Task 2: Reset Debug Mode

**Via UI**:
- Click debug toggle in header

**Via Console**:
```javascript
localStorage.setItem('texo-debug-mode', 'true');
location.reload();
```

### Task 3: Export All Workspaces

```javascript
// Run in browser console
const { exportWorkspace, listWorkspaces } = await import('./src/utils/workspaceDB.js');
const workspaces = await listWorkspaces();

for (const ws of workspaces) {
  const data = await exportWorkspace(ws.id);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workspace-${ws.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Task 4: Inspect OCR Model Cache

**Via Browser DevTools**:
1. Open DevTools (F12)
2. Go to "Application" tab (Chrome) or "Storage" tab (Firefox)
3. Expand "Cache Storage" in left sidebar
4. Look for `transformers-cache` or similar

**Size**: Model is ~150 MB

### Task 5: Force Re-download OCR Model

**Via Cache API**:
```javascript
// Run in browser console
const cacheNames = await caches.keys();
for (const name of cacheNames) {
  if (name.includes('transformers')) {
    await caches.delete(name);
    console.log(`Deleted cache: ${name}`);
  }
}
location.reload();
```

### Task 6: Add a Custom Diagnostic Log

```javascript
import { logDiagnostic } from '../utils/workspaceDB.js';

await logDiagnostic('info', 'my-category', 'Custom message', {
  foo: 'bar',
  timestamp: Date.now()
});
```

**Levels**: `debug`, `info`, `warn`, `error`
**Categories**: `cache`, `cas`, `ocr`, `workspace`, `export`, `import`, or custom

---

## Troubleshooting

### Problem: "Model loading takes forever"

**Cause**: Slow network connection or HuggingFace unavailable

**Solution**:
1. Check network tab in DevTools for `alephpi/FormulaNet` downloads
2. If stuck, refresh page to trigger CN mirror fallback
3. Use CN mirror directly (edit `RemoteSource` in SketchPage/OCRPage)

---

### Problem: "Vitest tests fail in watch mode"

**Cause**: IndexedDB not cleaned up between test runs

**Solution**:
```javascript
// Add to test file
import { afterEach } from 'vitest';

afterEach(async () => {
  // Clean up IndexedDB
  const dbs = await window.indexedDB.databases();
  for (const db of dbs) {
    window.indexedDB.deleteDatabase(db.name);
  }
});
```

---

### Problem: "ProseMirror editor not rendering"

**Cause**: Plugin order or schema mismatch

**Solution**:
1. Check that `mathPlugin` is loaded before `validationPlugin`
2. Verify schema includes `math_inline` and `math_display` nodes
3. Check console for ProseMirror errors

---

### Problem: "Cache not working / results slow"

**Cause**: Cache disabled or force Algebrite mode active

**Solution**:
1. Check ComposePage: Orange "Force Algebrite" toggle should be OFF
2. Check Database page: Verify cache entries exist
3. Clear cache and rebuild: Database page → Clear CAS Cache

---

### Problem: "IndexedDB quota exceeded"

**Cause**: Too many logs or cache entries

**Solution**:
1. Database page → Clear Diagnostic Logs
2. Database page → Clear CAS Cache
3. Delete old workspaces
4. Check quota: Run in console:
   ```javascript
   const estimate = await navigator.storage.estimate();
   console.log(`Used: ${estimate.usage}, Quota: ${estimate.quota}`);
   ```

---

### Problem: "Worker not responding"

**Cause**: Worker crashed or blocked by browser

**Solution**:
1. Check console for worker errors
2. Terminate and restart worker:
   ```javascript
   workerRef.current?.terminate();
   workerRef.current = new MyWorker();
   ```
3. Check browser worker limits (some browsers limit concurrent workers)

---

## Performance Considerations

### 1. Canonicalization Performance

**Target**: <50ms per expression

**Optimization Tips**:
- Minimize rule count (fewer rules = faster)
- Use `match()` to skip expensive `transform()`
- Avoid deep cloning unless necessary
- Cache results in IndexedDB

**Profiling**:
```javascript
const start = performance.now();
const result = checkEquivalence(latex1, latex2);
console.log(`Equivalence check took ${performance.now() - start}ms`);
```

### 2. OCR Inference Performance

**Target**: 1-3s after model load

**Optimization Tips**:
- Preprocess image in separate worker (`imageProcessor.js`)
- Use fixed 384×384 size (no dynamic resizing)
- Crop to bounding box before sending to worker

**Cannot Optimize**:
- Model size (~150 MB) - determined by Transformers.js
- Inference time - determined by browser's WASM/WebGL performance

### 3. IndexedDB Performance

**Tips**:
- Use transactions for bulk operations
- Create compound indexes for common queries
- Implement TTL for automatic cleanup
- Batch writes when possible

**Example (Batch Write)**:
```javascript
const tx = db.transaction(['cas-cache'], 'readwrite');
const store = tx.objectStore('cas-cache');

for (const entry of entries) {
  store.put(entry);
}

await tx.complete;
```

### 4. React Re-rendering

**Tips**:
- Use `React.memo()` for expensive components
- Use `useCallback()` for event handlers passed as props
- Use `useMemo()` for expensive computations
- Debounce frequent updates (e.g., 500ms for validation)

**Example (Debouncing)**:
```javascript
const debounceTimerRef = useRef(null);

const debouncedValidation = (lines) => {
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
  }
  debounceTimerRef.current = setTimeout(() => {
    validateMathLines(lines);
  }, 500);
};
```

---

## Deployment

### GitHub Pages Deployment

1. **Uncomment `base` in `vite.config.js`**:
   ```javascript
   export default defineConfig({
     base: '/texo-web-stylus/', // Uncomment this
     // ...
   });
   ```

2. **Build**:
   ```bash
   npm run build
   ```

3. **Deploy `dist/` to GitHub Pages**:
   - Option A: Use GitHub Actions (create `.github/workflows/deploy.yml`)
   - Option B: Manually push `dist/` to `gh-pages` branch
   - Option C: Use `gh-pages` package:
     ```bash
     npm install --save-dev gh-pages
     npm run build
     npx gh-pages -d dist
     ```

4. **Configure GitHub repository**:
   - Settings → Pages → Source: `gh-pages` branch

5. **Access**:
   `https://<username>.github.io/texo-web-stylus/`

### Static Hosting (Netlify, Vercel, Cloudflare Pages)

1. **Build**:
   ```bash
   npm run build
   ```

2. **Deploy `dist/` directory**

**No server required** - all processing client-side!

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
docker build -t texo-web-stylus .
docker run -p 8080:80 texo-web-stylus
```

Access at `http://localhost:8080`

---

## Development Tips

### 1. Use React DevTools
- Install browser extension
- Inspect component state and props
- Track re-renders with Profiler

### 2. Use Browser DevTools
- **Console**: Check logs, run diagnostics
- **Network**: Monitor OCR model downloads
- **Application**: Inspect IndexedDB, localStorage, Cache
- **Performance**: Profile rendering and JavaScript execution

### 3. Hot Reload Limitations
- Worker changes require manual page refresh
- Context changes may not trigger re-render (refresh if needed)
- IndexedDB schema changes require database deletion

### 4. Testing Equivalence Locally
```javascript
// Quick test in browser console
import { checkEquivalence } from './src/cas/equivalenceChecker.js';

const result = checkEquivalence('x^2 + 4x + 4', '(x + 2)^2', { debug: true });
console.log(result);
```

### 5. Debugging ProseMirror
```javascript
// Log editor state
console.log(viewRef.current.state.doc.toJSON());

// Log selection
console.log(viewRef.current.state.selection);
```

### 6. Debugging Workers
```javascript
// Add in worker file
self.postMessage({ type: 'debug', message: 'Worker state', data: {...} });

// Listen in component
worker.onmessage = (e) => {
  if (e.data.type === 'debug') console.log('[Worker]', e.data.message, e.data.data);
};
```

---

## Resources

### Official Documentation
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Vitest](https://vitest.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- [ProseMirror](https://prosemirror.net/)
- [KaTeX](https://katex.org/)
- [Transformers.js](https://huggingface.co/docs/transformers.js)

### Project Documentation
- `CLAUDE.md`: Project overview and architecture for AI assistants
- `CANONICALIZATION_GUIDE.md`: CAS rule system documentation
- `README.md`: User-facing quick start
- `docs/`: BMM documentation (component inventory, UI, state, architecture)

### Community
- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: Q&A and community chat

---

## Getting Help

1. **Check existing documentation** (this file, CLAUDE.md, CANONICALIZATION_GUIDE.md)
2. **Search GitHub Issues** for similar problems
3. **Enable debug mode** and check console logs
4. **Check Database page** for diagnostic logs
5. **Open a GitHub Issue** with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors
   - Browser and OS info
   - Screenshots (if applicable)

---

## Contributing

### Before Submitting a PR

1. **Run tests**: `npm test`
2. **Build successfully**: `npm run build`
3. **Check console for errors**: No warnings or errors in browser console
4. **Follow code conventions**: Match existing code style
5. **Update documentation**: If adding features, update relevant docs
6. **Test in multiple browsers**: Chrome, Firefox, Edge

### PR Guidelines

- **One feature per PR** - easier to review
- **Include tests** - for new CAS rules or utilities
- **Update CHANGELOG** - if adding user-facing features
- **Screenshots** - for UI changes
- **Performance data** - for CAS optimizations (before/after timings)

---

## License

AGPL-3.0 (inherited from original Texo project by Sicheng Mao)

Key implications:
- Source code must be made available to users
- Modifications must use same license
- Network use counts as distribution
