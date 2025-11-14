# Comprehensive Architecture Documentation

## Executive Summary

Texo-web-stylus is a privacy-first mathematical OCR application built with React 18 and Vite 6. The application converts handwritten mathematical equations into LaTeX format entirely client-side, ensuring complete user privacy through local processing and no server communication.

## System Architecture Overview

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Environment                    │
├─────────────────────────────────────────────────────────────┤
│  User Interface Layer                                    │
│  ├── React Components (SPA with routing)                │
│  ├── Tailwind CSS Styling                              │
│  ├── KaTeX Mathematical Rendering                        │
│  └── Excalidraw Canvas Integration                     │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                   │
│  ├── Computer Algebra System (CAS)                      │
│  ├── LaTeX Parsing and Canonicalization                   │
│  ├── Equivalence Checking Engine                        │
│  └── Row Management System                             │
├─────────────────────────────────────────────────────────────┤
│  Processing Layer                                       │
│  ├── Web Workers (Background Processing)                 │
│  │   ├── OCR Worker (FormulaNet Inference)           │
│  │   ├── Image Processor (Preprocessing)             │
│  │   └── Logging Worker (Async Logging)              │
│  └── Transformers.js ML Inference                     │
├─────────────────────────────────────────────────────────────┤
│  Data Persistence Layer                                │
│  ├── IndexedDB (Client-side Database)                  │
│  │   ├── Workspace Management                          │
│  │   ├── CAS Cache (Canonical Forms)                 │
│  │   ├── Session State (User Preferences)             │
│  │   ├── Canvas State Persistence                     │
│  │   └── Diagnostic Logs                            │
│  ├── LocalStorage (Settings)                          │
│  └── Browser Cache (Model Files)                     │
├─────────────────────────────────────────────────────────────┤
│  External Dependencies                                 │
│  ├── Hugging Face Transformers (ML Models)            │
│  ├── KaTeX (LaTeX Rendering)                         │
│  ├── Algebrite (Symbolic Computation)               │
│  ├── Excalidraw (Canvas Framework)                  │
│  └── ProseMirror (Rich Text Editing)               │
└─────────────────────────────────────────────────────────────┘
```

## Core Architectural Patterns

### 1. Privacy-First Architecture
**Principle**: All user data processed locally, no server communication

**Implementation**:
- Client-side OCR inference using Transformers.js
- Local mathematical computation via Algebrite
- Browser-based storage (IndexedDB, LocalStorage)
- No telemetry, analytics, or data transmission

**Benefits**:
- Complete user privacy
- Offline operation capability
- No server infrastructure costs
- GDPR/CCPA compliant by design

### 2. Two-Tier Processing Architecture
**Pattern**: Fast path with slow path fallback

```javascript
// Fast Path: Rule-based canonicalization (1-50ms)
LaTeX → KaTeX Parser → AST → Rule Engine → Canonical Form → Comparison

// Slow Path: Algebrite CAS fallback (50-500ms)
LaTeX → Algebrite → Simplification → Comparison
```

**Components**:
- **Rule Engine**: Priority-based transformation rules
- **Algebrite Integration**: Symbolic computation fallback
- **Caching Layer**: IndexedDB for canonical form persistence
- **Performance Monitoring**: Automatic path selection

### 3. Web Worker Architecture
**Pattern**: CPU-intensive tasks in isolated threads

```javascript
// Main Thread ↔ Worker Communication
Main Thread → Worker: { action, data, key }
Worker → Main Thread: { type, result, key, error }
```

**Worker Responsibilities**:
- **OCR Worker**: FormulaNet model inference
- **Image Processor**: Image preprocessing pipeline
- **Logging Worker**: Asynchronous log aggregation

**Benefits**:
- Non-blocking UI during heavy computations
- Parallel processing capabilities
- Error isolation
- Better performance on multi-core devices

### 4. Component-Based SPA Architecture
**Pattern**: Single Page Application with modular components

```javascript
// Component Hierarchy
App
├── DebugProvider (Global State)
├── Router (Navigation)
├── Pages (Route Components)
│   ├── SketchPage (Canvas)
│   ├── OCRPage (Image Processing)
│   ├── ComposePage (Math Editor)
│   ├── DatabasePage (Workspace Management)
│   └── MagicCanvas (Advanced Features)
└── Shared Components
    ├── ErrorBoundary
    ├── Notification
    └── RowHeader
```

## Data Flow Architecture

### 1. Mathematical Expression Processing Flow
```
User Input (LaTeX/Handwriting)
        ↓
   KaTeX Parser
        ↓
   AST Generation
        ↓
   Rule Engine (Fast Path)
        ↓
   Canonical Form
        ↓
   Cache Check (IndexedDB)
        ↓
   Equivalence Comparison
        ↓
   Result (True/False + Metadata)
```

### 2. OCR Processing Flow
```
Image Upload/Drawing
        ↓
   Image Preprocessing
        ↓
   384x384 Normalization
        ↓
   FormulaNet Inference (Worker)
        ↓
   LaTeX Output
        ↓
   Validation (CAS)
        ↓
   User Feedback
```

### 3. State Management Flow
```
User Interaction
        ↓
   Component State
        ↓
   React Context (Global)
        ↓
   IndexedDB (Persistence)
        ↓
   Cross-Tab Sync (BroadcastChannel)
```

## Technology Stack Architecture

### Frontend Architecture
```javascript
// Core Framework
React 18 + Vite 6
├── Component Library: Custom Components + Tailwind CSS
├── State Management: React Context + Custom Hooks
├── Routing: React Router DOM v7
├── Mathematical Rendering: KaTeX
└── Rich Text Editing: ProseMirror + Math Plugin
```

### Build Architecture
```javascript
// Vite Configuration
{
  plugins: [React()],
  worker: {
    format: 'es',  // ES modules for workers
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],  // Large ML library
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'ml-lib': ['@huggingface/transformers'],
          'math-lib': ['katex', 'algebrite'],
          'editor-lib': ['prosemirror-*']
        }
      }
    }
  }
}
```

### Testing Architecture
```javascript
// Testing Stack
Vitest + jsdom + Testing Library
├── Unit Tests: Component and utility testing
├── Integration Tests: Workflow testing
├── Performance Tests: CAS benchmarks
└── Manual Tests: Algebrite integration
```

## Security Architecture

### 1. Client-Side Security
```javascript
// Input Validation
const validateLatex = (latex) => {
  try {
    katex.__parse(latex)
    return { valid: true }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

// File Upload Validation
const validateImageFile = (file) => {
  const maxSize = 10 * 1024 * 1024  // 10MB
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  
  return file.size <= maxSize && allowedTypes.includes(file.type)
}
```

### 2. Content Security Policy
```html
<!-- CSP Header -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://huggingface.co;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self' https://huggingface.co;
  worker-src 'self' blob:;
">
```

### 3. Data Privacy by Design
- **No Data Transmission**: All processing client-side
- **Local Storage Only**: IndexedDB and LocalStorage
- **No Telemetry**: No analytics or tracking
- **User Control**: Complete data deletion capability

## Performance Architecture

### 1. Rendering Performance
```javascript
// React Optimization Patterns
const MemoizedComponent = React.memo(Component, (prev, next) => {
  return prev.id === next.id && prev.data === next.data
})

const ExpensiveValue = useMemo(() => {
  return computeExpensiveValue(data)
}, [data])

const OptimizedCallback = useCallback((data) => {
  process(data)
}, [dependencies])
```

### 2. Memory Management
```javascript
// IndexedDB Memory Management
const cacheStrategy = {
  maxSize: 100 * 1024 * 1024,  // 100MB
  ttl: 7 * 24 * 60 * 60 * 1000,  // 7 days
  evictionPolicy: 'LRU'
}

// Worker Memory Management
const processInBatches = (items, batchSize = 100) => {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    processBatch(batch)
    
    // Allow garbage collection
    if (i % (batchSize * 10) === 0) {
      setTimeout(() => {}, 0)
    }
  }
}
```

### 3. Network Performance
```javascript
// Model Loading Optimization
const loadModelWithProgress = async (modelUrl) => {
  const response = await fetch(modelUrl)
  const reader = response.body.getReader()
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    // Report progress
    const progress = loaded / total
    onProgress(progress)
  }
}

// Bundle Splitting for Lazy Loading
const MagicCanvas = lazy(() => import('./pages/MagicCanvas'))
```

## Scalability Architecture

### 1. Client-Side Scaling
```javascript
// Performance Monitoring and Adaptive Behavior
class PerformanceManager {
  constructor() {
    this.deviceCapabilities = this.assessDevice()
    this.adaptiveSettings = this.getAdaptiveSettings()
  }
  
  assessDevice() {
    return {
      memory: navigator.deviceMemory || 4,
      cores: navigator.hardwareConcurrency || 4,
      connection: navigator.connection?.effectiveType || '4g'
    }
  }
  
  getAdaptiveSettings() {
    const { memory, cores } = this.deviceCapabilities
    
    return {
      maxCanvasElements: memory < 4 ? 500 : 2000,
      workerPoolSize: Math.min(cores, 4),
      cacheSize: memory < 4 ? 50 : 200,
      batchSize: memory < 4 ? 10 : 50
    }
  }
}
```

### 2. Storage Scaling
```javascript
// IndexedDB Storage Management
class StorageManager {
  async checkQuota() {
    const estimate = await navigator.storage.estimate()
    const usageRatio = estimate.usage / estimate.quota
    
    if (usageRatio > 0.9) {
      await this.cleanupOldEntries()
      this.notifyUserStorageFull()
    }
  }
  
  async cleanupOldEntries() {
    const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000) // 30 days
    await this.deleteEntriesOlderThan(cutoffDate)
  }
}
```

## Integration Architecture

### 1. External Library Integration
```javascript
// Transformers.js Integration
class MLModelManager {
  async loadModel(modelName) {
    try {
      this.model = await VisionEncoderDecoderModel.from_pretrained(modelName, {
        dtype: 'fp32',
        progress_callback: this.onProgress.bind(this)
      })
      this.isReady = true
    } catch (error) {
      this.handleError(error)
    }
  }
  
  async predict(imageData) {
    if (!this.isReady) {
      throw new Error('Model not loaded')
    }
    
    return await this.model.generate({
      inputs: imageData,
      max_length: 512
    })
  }
}
```

### 2. KaTeX Integration
```javascript
// LaTeX Rendering Pipeline
class MathRenderer {
  render(latex, options = {}) {
    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: options.displayMode || true,
        output: 'html'
      })
      
      return { success: true, html }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
  
  parse(latex) {
    try {
      const ast = katex.__parse(latex)
      return { success: true, ast }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
```

## Error Handling Architecture

### 1. Component Error Boundaries
```javascript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Log to IndexedDB for debugging
    this.logError(error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    
    return this.props.children
  }
}
```

### 2. Worker Error Handling
```javascript
// Worker Error Recovery
class WorkerManager {
  constructor(workerScript) {
    this.worker = new Worker(workerScript)
    this.setupErrorHandling()
  }
  
  setupErrorHandling() {
    this.worker.addEventListener('error', (event) => {
      console.error('Worker error:', event.error)
      this.restartWorker()
    })
    
    this.worker.addEventListener('messageerror', (event) => {
      console.error('Worker message error:', event)
      this.handleMessageError(event)
    })
  }
  
  restartWorker() {
    this.worker.terminate()
    this.worker = new Worker(this.workerScript)
    this.setupErrorHandling()
    this.notifyWorkerRestart()
  }
}
```

## Deployment Architecture

### 1. Static Site Deployment
```javascript
// Build Configuration for Static Hosting
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/texo-web-stylus/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ml: ['@huggingface/transformers'],
          math: ['katex', 'algebrite']
        }
      }
    }
  }
})
```

### 2. CDN Architecture
```javascript
// Model Distribution Strategy
const CDNConfig = {
  primary: 'https://cdn.primary.com/models/',
  fallback: 'https://cdn.fallback.com/models/',
  local: '/models/',  // Local fallback
  
  async getModel(modelName) {
    try {
      return await this.fetchFromCDN(this.primary + modelName)
    } catch (error) {
      try {
        return await this.fetchFromCDN(this.fallback + modelName)
      } catch (fallbackError) {
        return await this.fetchFromCDN(this.local + modelName)
      }
    }
  }
}
```

## Future Architecture Considerations

### 1. PWA Enhancement
```javascript
// Service Worker for Offline Capability
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('texo-offline-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/assets/index.js',
        '/assets/index.css',
        '/models/model-metadata.json'
      ])
    })
  )
})
```

### 2. WebAssembly Integration
```javascript
// Future WASM Optimization
class WASMModule {
  async load() {
    this.module = await WebAssembly.instantiateStreaming(
      fetch('/math-processor.wasm')
    )
  }
  
  processExpression(expr) {
    return this.module.exports.process_expression(expr)
  }
}
```

### 3. Multi-User Support (Optional)
```javascript
// Future Multi-Workspace Architecture
class WorkspaceManager {
  async createSharedWorkspace(inviteToken) {
    // Optional server integration for collaboration
    // Maintains privacy-first approach
  }
  
  async syncWorkspace(workspaceId, syncCode) {
    // End-to-end encrypted synchronization
    // Optional feature for users who want sync
  }
}
```

This comprehensive architecture documentation provides a complete view of the Texo-web-stylus system, emphasizing privacy-first design, performance optimization, and maintainable code structure.