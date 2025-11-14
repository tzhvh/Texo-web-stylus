# Technology Stack Analysis

## Project Overview
**Texo-web-stylus** is a React-based, privacy-first mathematical OCR application that converts handwritten equations into LaTeX format with client-side processing.

## Technology Stack Table

| Category | Technology | Version | Justification |
|----------|------------|---------|--------------|
| **Frontend Framework** | React | ^18.3.1 | Modern component-based UI with hooks and concurrent features |
| **Build Tool** | Vite | ^6.0.7 | Fast development server and optimized builds for modern web apps |
| **Language** | JavaScript/JSX | ES2020+ | Modern JavaScript with JSX for React components |
| **CSS Framework** | Tailwind CSS | ^3.4.17 | Utility-first CSS for rapid UI development |
| **Routing** | React Router DOM | ^7.1.1 | Client-side routing for multi-page application |
| **State Management** | React Context API | Built-in | Lightweight state management for debug mode and app state |
| **Mathematical Rendering** | KaTeX | ^0.16.11 | Fast LaTeX rendering for mathematical expressions |
| **Math Editor** | ProseMirror + Math Plugin | ^1.7.1 | Rich text editing with inline math support |
| **Canvas/Drawing** | Excalidraw | ^0.18.0 | Interactive drawing canvas for stylus input |
| **Machine Learning** | Transformers.js | ^3.2.3 | Client-side ML inference for OCR (FormulaNet model) |
| **Computer Algebra System** | Algebrite | ^1.4.0 | Symbolic math computation and equivalence checking |
| **Image Processing** | Image-js | ^0.35.6 | Client-side image preprocessing for OCR |
| **Testing Framework** | Vitest | ^2.1.8 | Fast unit testing with Jest compatibility |
| **Testing Utilities** | Testing Library | ^16.3.0 | React component testing utilities |
| **Web Workers** | Native Browser API | - | Offload heavy computations from main thread |
| **Data Persistence** | IndexedDB | Native | Client-side storage for sessions and caching |

## Architecture Pattern

**Component-Based SPA with Service Workers**
- Single-page application with React Router for navigation
- Component hierarchy following React best practices
- Web Workers for CPU-intensive tasks (OCR, logging, image processing)
- Context API for global state management
- Error boundaries for graceful error handling

## Key Architectural Decisions

### 1. Client-Side Processing (Privacy-First)
- **Rationale**: All mathematical processing happens locally using Transformers.js
- **Benefits**: No server communication, no telemetry, works offline
- **Trade-offs**: Large initial download (~150MB model), client resource usage

### 2. Web Worker Architecture
- **OCR Worker**: Handles FormulaNet model inference
- **Image Processor**: Preprocesses images for OCR input
- **Logging Worker**: Async logging to prevent main thread blocking

### 3. Two-Tier Equivalence Checking
- **Fast Path**: Rule-based canonicalization (1-50ms)
- **Slow Path**: Algebrite CAS fallback (50-500ms)
- **Caching**: IndexedDB for canonical form persistence

### 4. Modular Component Structure
```
src/
├── cas/           # Computer Algebra System
├── components/    # Reusable UI components
├── contexts/      # React contexts
├── hooks/         # Custom React hooks
├── pages/         # Route-based page components
├── utils/         # Utility functions and helpers
└── workers/       # Web Workers
```

## Development Workflow

### Build Commands
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run preview` - Preview production build

### Testing Commands
- `npm test` - Run all Vitest tests
- `npm run test:equivalence` - Run CAS equivalence tests
- `npm run test:manual` - Run manual Algebrite tests
- `npm run test:all` - Run equivalence + manual tests

### Key Development Features
- Hot module replacement via Vite
- Component testing with Vitest + Testing Library
- Performance testing for CAS operations
- Manual testing for Algebrite integration

## Performance Considerations

### Optimization Strategies
- **Code Splitting**: Lazy loading for Magic Canvas component
- **Worker Isolation**: Heavy computations in Web Workers
- **Caching**: IndexedDB for canonical forms and session data
- **Bundle Optimization**: Excluding Transformers.js from pre-bundling

### Performance Targets
| Operation | Target | Notes |
|-----------|--------|-------|
| Canonicalization | <50ms | Fast path rule-based |
| Algebrite fallback | 50-500ms | Slow path CAS |
| OCR inference | 1-3s | After model load |
| Model download | 30-60s | One-time |
| Cache lookup | <1ms | IndexedDB hit |

## Security & Privacy

### Privacy Features
- **No Backend**: All processing client-side
- **No Telemetry**: No analytics or tracking
- **Offline Capable**: Works without internet after model download
- **Local Storage**: All data stored locally via IndexedDB

### Security Considerations
- **Content Security Policy**: Recommended for production
- **Input Validation**: LaTeX parsing with KaTeX
- **Worker Sandboxing**: Web Workers isolated from main thread

## Deployment Architecture

### Build Output
- **Static Assets**: Generated in `dist/` directory
- **Service Worker**: For PWA capabilities (future enhancement)
- **Model Caching**: FormulaNet model cached by browser

### Deployment Options
- **Static Hosting**: GitHub Pages, Netlify, Vercel
- **CDN**: For model file distribution
- **PWA**: Future enhancement for offline installation

## Integration Points

### External Dependencies
- **HuggingFace**: FormulaNet model download (one-time)
- **KaTeX**: Mathematical rendering engine
- **Algebrite**: Symbolic computation engine

### API Contracts (Internal)
- **OCR Worker**: Image → LaTeX conversion
- **CAS Engine**: Equivalence checking API
- **Row Manager**: Canvas state management
- **Workspace DB**: IndexedDB operations