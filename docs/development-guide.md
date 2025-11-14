# Development Guide

## Overview

Texo-web-stylus is a modern React 18 application built with Vite 6, featuring comprehensive tooling for development, testing, and deployment. This guide covers everything needed to set up a productive development environment.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **Package Manager**: PNPM (recommended) or NPM
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+ for development
- **Memory**: 8GB+ RAM recommended (for ML model processing)
- **Storage**: 2GB+ free space (for model downloads and build artifacts)

### Development Tools
- **IDE**: VS Code (recommended) with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint - JavaScript linting
  - Auto Rename Tag
  - Bracket Pair Colorizer
- **Browser**: Chrome DevTools for debugging
- **Git**: Version control (any modern version)

## Installation and Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/texo-web-stylus.git
cd texo-web-stylus
```

### 2. Install Dependencies
```bash
# Using PNPM (recommended)
pnpm install

# Or using NPM
npm install
```

### 3. Environment Configuration
```bash
# Copy environment template (if exists)
cp .env.example .env

# Edit environment variables
nano .env
```

### 4. Verify Installation
```bash
# Check Node version
node --version  # Should be 18.0.0+

# Check package manager
pnpm --version  # or npm --version

# Verify installation
pnpm run test:manual  # Should run without errors
```

## Development Commands

### Start Development Server
```bash
# Start development server with hot reload
pnpm run dev

# Server starts at http://localhost:5173
# Hot Module Replacement (HMR) enabled
# Source maps available for debugging
```

### Build for Production
```bash
# Create optimized production build
pnpm run build

# Output directory: dist/
# Optimized and minified assets
# Source maps generated for debugging
```

### Preview Production Build
```bash
# Preview production build locally
pnpm run preview

# Serves dist/ directory
# Useful for testing production builds locally
```

## Testing Commands

### Run All Tests
```bash
# Run complete test suite
pnpm test

# Vitest unit tests with jsdom environment
# Fast execution with watch mode
# Coverage reporting available
```

### Watch Mode Development
```bash
# Run tests in watch mode for development
pnpm run test:watch

# Auto-rerun on file changes
# Interactive test selection
# Failed tests focus mode
```

### Specialized Test Suites
```bash
# CAS equivalence checker tests
pnpm run test:equivalence

# Manual Algebrite integration tests
pnpm run test:manual

# Run equivalence + manual tests
pnpm run test:all

# Unified test output with detailed reporting
pnpm run test:unified
```

### Test Configuration
- **Framework**: Vitest with jsdom environment
- **Timeout**: 10 seconds for CAS-heavy tests
- **Coverage**: Available via `--coverage` flag
- **Manual Tests**: Excluded from automatic runs

## Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/math-equation-enhancement

# Start development server
pnpm run dev

# Make changes with hot reload
# Run tests frequently
pnpm run test:watch

# Commit changes with conventional commits
git add .
git commit -m "feat: add equation validation UI"
```

### 2. Code Quality Checks
```bash
# Run linting (if configured)
pnpm run lint  # or npm run lint

# Run type checking (if TypeScript)
pnpm run type-check  # or npm run type-check

# Format code with Prettier
pnpm run format  # or npm run format
```

### 3. Testing Workflow
```bash
# Run unit tests during development
pnpm run test:watch

# Run specific test file
pnpm test RowHeader.test.jsx

# Run tests matching pattern
pnpm test --grep "RowHeader"

# Generate coverage report
pnpm test --coverage
```

## Project Structure for Development

### Source Code Organization
```
src/
├── cas/           # Computer Algebra System - modify with care
├── components/    # UI components - add new components here
├── contexts/      # React contexts - global state management
├── hooks/         # Custom hooks - reusable logic
├── pages/         # Route components - application pages
├── utils/         # Utilities - shared business logic
├── workers/       # Web Workers - background processing
├── App.jsx        # Main app component - routing and providers
├── index.css      # Global styles - Tailwind imports
└── main.jsx       # Entry point - bootstrap code
```

### Adding New Components
```bash
# 1. Create component file
touch src/components/NewComponent.jsx

# 2. Create test file
touch src/components/__tests__/NewComponent.test.jsx

# 3. Export from index (if using barrel exports)
# Add to src/components/index.js
```

### Adding New Pages
```bash
# 1. Create page component
touch src/pages/NewPage.jsx

# 2. Add route in App.jsx
<Route path="/new-page" element={<NewPage />} />

# 3. Add navigation link
# Update header navigation in App.jsx
```

## Development Tools and Features

### Hot Module Replacement (HMR)
- **Fast Updates**: Component changes reflect instantly
- **State Preservation**: Form state maintained during HMR
- **Error Recovery**: Automatic recovery from syntax errors

### Source Maps
- **Development**: Full source maps for debugging
- **Production**: Compressed source maps available
- **Worker Debugging**: Source maps available for Web Workers

### Browser DevTools Integration
- **React DevTools**: Component tree inspection
- **Redux DevTools**: (if using Redux in future)
- **Network Tab**: Monitor model downloads and API calls
- **Console**: Comprehensive logging with debug mode

### Debug Mode
```javascript
// Enable debug mode via UI or localStorage
localStorage.setItem('texo-debug-mode', 'true')

// Debug features available:
// - Detailed console logging
// - Performance metrics
// - Component state inspection
// - Error boundary details
```

## Working with CAS (Computer Algebra System)

### Understanding the CAS Architecture
```javascript
// Two-tier equivalence checking
// 1. Fast Path: Rule-based canonicalization (1-50ms)
// 2. Slow Path: Algebrite fallback (50-500ms)

// Example usage in development
import { checkEquivalence } from './cas/equivalenceChecker.js'

const result = await checkEquivalence('x^2', 'x*x')
console.log(result.equivalent) // true
console.log(result.method)     // 'canonicalization'
```

### Adding New Canonicalization Rules
```javascript
// File: src/cas/rules/algebraRules.js
export const newRule = {
  name: 'my-rule',
  description: 'What the rule does',
  priority: 85,  // 60-100 range
  region: ['US', 'UK', 'EU'],
  match: (ast) => {
    // Return true if rule applies
  },
  transform: (ast) => {
    // Return transformed AST
  }
}

// Add to rules array in ruleEngine.js
```

### Testing CAS Rules
```bash
# Run specific CAS tests
pnpm run test:equivalence

# Manual testing with Node.js
node src/cas/__tests__/equivalence.test.manual.js

# Performance testing
pnpm run test:performance
```

## Working with Web Workers

### OCR Worker Development
```javascript
// File: src/workers/ocrWorker.js
// Worker message handling pattern
self.onmessage = async (e) => {
  const { action, data } = e.data
  
  switch (action) {
    case 'predict':
      const result = await predict(data.image)
      self.postMessage({ type: 'result', output: result })
      break
    case 'init':
      await init(data.modelConfig)
      self.postMessage({ type: 'ready' })
      break
  }
}
```

### Worker Debugging
```javascript
// Debug worker in main thread
worker.addEventListener('message', (e) => {
  console.log('Worker message:', e.data)
})

// Use Chrome DevTools -> Sources -> Page workers
// Set breakpoints in worker code
```

## Performance Development

### Monitoring Performance
```javascript
// Use performance API for monitoring
const startTime = performance.now()
// ... operation ...
const endTime = performance.now()
console.log(`Operation took ${endTime - startTime}ms`)
```

### Memory Management
```javascript
// Monitor memory usage in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    if (performance.memory) {
      console.log('Memory:', {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
      })
    }
  }, 10000)
}
```

### Optimizing Renders
```javascript
// Use React.memo for expensive components
export default React.memo(MyComponent, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.id === nextProps.id
})

// Use useMemo for expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data)
}, [data])
```

## Debugging Common Issues

### OCR Model Loading Issues
```javascript
// Check model loading status
worker.postMessage({ action: 'status' })

// Common solutions:
// 1. Clear browser cache
// 2. Check network connection
// 3. Verify model URL configuration
// 4. Check browser console for CORS issues
```

### IndexedDB Issues
```javascript
// Clear IndexedDB if corrupted
indexedDB.deleteDatabase('texo-workspace-db')

// Check quota usage
navigator.storage.estimate().then(estimate => {
  console.log('Storage usage:', estimate.usage)
  console.log('Storage quota:', estimate.quota)
})
```

### CAS Performance Issues
```javascript
// Enable debug mode for detailed timing
localStorage.setItem('texo-debug-mode', 'true')

// Check rule engine iterations
// Look for "Rule engine iterations" in console
```

## Environment Variables

### Development Environment
```bash
# .env.development
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
VITE_MODEL_CACHE=true
```

### Production Environment
```bash
# .env.production
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error
VITE_MODEL_CACHE=true
```

### Custom Configuration
```javascript
// vite.config.js
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  }
})
```

## Git Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature development
- `hotfix/*` - Critical fixes

### Commit Convention
```bash
# Format: type(scope): description
feat(ui): add equation validation button
fix(cas): resolve fraction simplification bug
docs(readme): update installation instructions
test(equivalence): add trigonometric test cases
```

### Pre-commit Hooks (if configured)
```bash
# Run tests before commit
pnpm test

# Run linting
pnpm run lint

# Format code
pnpm run format
```

## Deployment Preparation

### Build Process
```bash
# Clean previous build
rm -rf dist/

# Create production build
pnpm run build

# Analyze bundle size (optional)
pnpm run build:analyze
```

### Build Verification
```bash
# Test production build locally
pnpm run preview

# Run tests against production build
pnpm run test:prod

# Check build output
ls -la dist/
```

This development guide provides a comprehensive foundation for productive development of Texo-web-stylus, covering setup, workflow, debugging, and best practices.