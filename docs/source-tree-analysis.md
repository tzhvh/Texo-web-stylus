# Source Tree Analysis

## Project Structure Overview

Texo-web-stylus is organized as a monolithic React application with clear separation of concerns. The project follows modern JavaScript/React conventions with a focus on modularity, testability, and maintainability.

## Complete Directory Tree

```
texo-web-stylus/
├── .bmad/                           # BMad methodology and workflow files
│   ├── bmm/                         # BMad Module Manager
│   │   ├── workflows/                 # Workflow definitions
│   │   │   ├── document-project/      # Documentation workflow
│   │   │   └── workflow-status/       # Status tracking
│   │   ├── config.yaml               # BMad configuration
│   │   └── readiness-assessment.md   # Project readiness
│   └── core/                        # Core BMad framework
│       └── tasks/                    # Task definitions
│
├── .github/                         # GitHub configuration
│   └── workflows/                   # CI/CD pipelines
│       └── deploy.yml               # Deployment workflow
│
├── docs/                            # Generated documentation
│   ├── sprint-artifacts/            # Sprint documentation
│   │   ├── stories/                # User stories
│   │   └── tech-spec-epic-1.md    # Technical specifications
│   ├── bmm-index.md               # Generated project index
│   ├── technology-stack.md         # Technology analysis
│   ├── data-models.md             # Data models documentation
│   ├── ui-components.md           # UI components inventory
│   ├── api-contracts.md           # API contracts
│   ├── state-management.md        # State management documentation
│   └── project-scan-report.json  # Workflow state
│
├── public/                         # Static assets
│   ├── test_img/                  # Test images
│   │   ├── README.md
│   │   └── test.png
│   ├── vite.svg                   # Vite logo
│   └── index.html                 # HTML entry point
│
├── src/                            # Application source code
│   ├── cas/                       # Computer Algebra System
│   │   ├── rules/                  # Canonicalization rules
│   │   │   ├── algebraRules.js     # Algebraic simplification
│   │   │   ├── ruleEngine.js     # Rule processing engine
│   │   │   └── trigRules.js      # Trigonometric rules
│   │   ├── README.md               # CAS documentation
│   │   ├── equivalenceChecker.js  # Equivalence checking logic
│   │   └── katexParser.js        # LaTeX parsing utilities
│   │
│   ├── components/                # Reusable UI components
│   │   ├── __tests__/            # Component tests
│   │   │   ├── RowHeader.integration.test.jsx
│   │   │   └── RowHeader.test.jsx
│   │   ├── ErrorBoundary.jsx     # Error handling component
│   │   ├── Notification.jsx      # Notification system
│   │   └── RowHeader.jsx        # Canvas row status indicators
│   │
│   ├── contexts/                  # React Context providers
│   │   └── DebugContext.jsx      # Global debug state
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── useRowSystem.js        # Row management logic
│   │   └── useSafeExcalidraw.js # Safe Excalidraw integration
│   │
│   ├── pages/                      # Route-based page components
│   │   ├── ComposePage.jsx       # Math editor page
│   │   ├── DatabasePage.jsx       # Workspace management
│   │   ├── MagicCanvas.jsx       # Advanced canvas features
│   │   ├── OCRPage.jsx           # Image OCR interface
│   │   └── SketchPage.jsx        # Main drawing canvas
│   │
│   ├── utils/                      # Utility functions and helpers
│   │   ├── __tests__/            # Utility tests
│   │   │   ├── equivalenceChecker.test.js
│   │   │   ├── guideLines.test.js
│   │   │   ├── magicCanvas.integration.test.js
│   │   │   ├── rowManager.test.js
│   │   │   ├── ruleEngine.test.js
│   │   │   ├── useRowSystem.integration.test.js
│   │   │   ├── useRowSystem.performance.test.js
│   │   │   ├── useRowSystem.test.js.disabled
│   │   │   └── workspaceDB.test.js
│   │   ├── canvasHelpers.js      # Canvas utility functions
│   │   ├── indexedDBCache.js     # IndexedDB caching layer
│   │   ├── logger.js             # Logging system
│   │   ├── rowManager.js         # Row management logic
│   │   ├── spatialMapping.js     # AST to visual mapping
│   │   └── workspaceDB.js       # Database operations
│   │
│   ├── workers/                   # Web Workers for background processing
│   │   ├── imageProcessor.js     # Image preprocessing
│   │   ├── loggingWorker.js      # Asynchronous logging
│   │   └── ocrWorker.js         # OCR model inference
│   │
│   ├── App.jsx                    # Main application component
│   ├── index.css                  # Global styles
│   └── main.jsx                   # Application entry point
│
├── .gitignore                      # Git ignore rules
├── .roomodes                      # Room configuration
├── CANONICALIZATION_GUIDE.md      # CAS rules guide
├── index.html                     # Development HTML template
├── LICENSE                        # AGPL-3.0 license
├── package-lock.json              # NPM lock file
├── package.json                  # Project dependencies and scripts
├── pnpm-lock.yaml              # PNPM lock file
├── pnpm-workspace.yaml          # PNPM workspace configuration
├── postcss.config.js            # PostCSS configuration
├── README.md                    # Project documentation
├── tailwind.config.js           # Tailwind CSS configuration
├── vite.config.js               # Vite build configuration
├── vitest.config.js             # Vitest testing configuration
└── vitest.setup.js              # Vitest setup file
```

## Critical Directories Analysis

### `/src/cas/` - Computer Algebra System
**Purpose**: Mathematical expression processing and equivalence checking
**Key Files**:
- `equivalenceChecker.js` - Main equivalence checking logic
- `katexParser.js` - LaTeX to AST conversion
- `rules/ruleEngine.js` - Rule-based canonicalization engine
- `rules/algebraRules.js` - Algebraic simplification rules
- `rules/trigRules.js` - Trigonometric identity rules

**Architecture**: Two-tier system with fast rule-based canonicalization and Algebrite fallback

### `/src/components/` - UI Components
**Purpose**: Reusable React components with comprehensive testing
**Key Components**:
- `RowHeader.jsx` - Visual status indicators for canvas rows
- `ErrorBoundary.jsx` - Graceful error handling
- `Notification.jsx` - Application-wide notifications

**Testing**: Full test coverage with unit and integration tests

### `/src/pages/` - Application Routes
**Purpose**: Page-level components for different application features
**Pages**:
- `SketchPage.jsx` - Main drawing interface
- `OCRPage.jsx` - Image upload and processing
- `ComposePage.jsx` - Mathematical expression editor
- `DatabasePage.jsx` - Workspace management
- `MagicCanvas.jsx` - Advanced canvas with row management

### `/src/utils/` - Core Utilities
**Purpose**: Shared business logic and data management
**Key Modules**:
- `workspaceDB.js` - IndexedDB operations and state persistence
- `rowManager.js` - Canvas row organization
- `spatialMapping.js` - AST to visual position mapping
- `logger.js` - Application logging system

### `/src/workers/` - Background Processing
**Purpose**: Web Workers for CPU-intensive tasks
**Workers**:
- `ocrWorker.js` - FormulaNet model inference
- `imageProcessor.js` - Image preprocessing pipeline
- `loggingWorker.js` - Asynchronous logging

### `/docs/` - Generated Documentation
**Purpose**: Auto-generated project documentation
**Contents**:
- Technical specifications and architecture docs
- API documentation and data models
- User stories and sprint artifacts
- Project analysis reports

## Entry Points and Bootstrap

### Application Entry Point
**File**: `src/main.jsx`
**Purpose**: React application bootstrap
**Key Responsibilities**:
- Mount React application to DOM
- Initialize global providers
- Set up error boundaries

### Main Component
**File**: `src/App.jsx`
**Purpose**: Root component with routing and global state
**Features**:
- React Router configuration
- Debug context provider
- Lazy loading for performance
- Responsive layout structure

### Build Entry Point
**File**: `index.html`
**Purpose**: HTML template for development and production
**Features**:
- Vite mounting point
- Meta tags and SEO
- Progressive enhancement support

## Configuration Files

### Build Configuration
- `vite.config.js` - Vite build tool configuration
- `vitest.config.js` - Testing framework setup
- `postcss.config.js` - CSS processing configuration

### Package Management
- `package.json` - Dependencies and scripts
- `pnpm-workspace.yaml` - Workspace configuration
- `package-lock.json` / `pnpm-lock.yaml` - Dependency locks

### Styling Configuration
- `tailwind.config.js` - Tailwind CSS customization
- `src/index.css` - Global styles and Tailwind imports

## Testing Architecture

### Test Structure
```
src/
├── components/__tests__/          # Component tests
├── utils/__tests__/             # Utility tests
├── cas/__tests__/               # CAS tests (manual)
└── workers/                    # Workers (tested via integration)
```

### Test Types
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: Component interaction and workflow testing
- **Performance Tests**: CAS operation benchmarks
- **Manual Tests**: Algebrite integration testing

### Test Configuration
- `vitest.setup.js` - Test environment setup
- `jsdom` environment for DOM testing
- 10s timeout for CAS-heavy tests

## Development Workflow Integration

### BMad Methodology Integration
- `.bmad/` directory contains methodology workflows
- Automated documentation generation
- Status tracking and progress monitoring
- Quality gates and validation

### Version Control
- `.gitignore` optimized for Node.js and build artifacts
- GitHub Actions for CI/CD
- Branch-based development workflow

### Package Management
- PNPM for efficient dependency management
- Workspace support for monorepo structure
- Lock files for reproducible builds

## Performance Considerations

### Code Splitting
- Lazy loading of MagicCanvas component
- Dynamic imports for large dependencies
- Worker isolation for heavy computations

### Build Optimization
- Vite for fast development and optimized builds
- Tree shaking for unused code elimination
- Asset optimization and compression

### Caching Strategy
- IndexedDB for persistent state
- Browser cache for static assets
- ML model caching for offline operation

## Security Architecture

### Client-Side Security
- Input validation for LaTeX expressions
- File type validation for uploads
- XSS prevention via React's built-in protection

### Privacy Protection
- No external API calls for data processing
- Local-only computation guarantee
- User-controlled data deletion

### Content Security
- CSP-ready structure for production
- Secure file upload handling
- Sanitized user inputs

## Deployment Structure

### Build Output
- `dist/` directory for production builds
- Static asset optimization
- Service worker preparation (future)

### Environment Configuration
- Environment-specific builds via Vite
- Configuration externalization
- Runtime environment detection

This source tree analysis reveals a well-structured, modern React application with clear separation of concerns, comprehensive testing, and privacy-first architecture.