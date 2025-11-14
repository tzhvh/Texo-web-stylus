# Texo-web-stylus Project Documentation

## Project Overview

**Type:** Monolith Web Application  
**Primary Language:** JavaScript/React  
**Architecture:** Component-Based SPA with Web Workers  
**Entry Point:** src/main.jsx

## Quick Reference

### Technology Stack
- **Frontend:** React 18 + Vite 6 + Tailwind CSS
- **Mathematical Processing:** KaTeX + Algebrite + Custom CAS
- **Machine Learning:** Transformers.js (FormulaNet model)
- **Canvas:** Excalidraw with custom extensions
- **Storage:** IndexedDB + LocalStorage
- **Testing:** Vitest + Testing Library

### Key Features
- Privacy-first mathematical OCR (client-side only)
- Handwriting to LaTeX conversion
- Real-time mathematical equivalence checking
- Infinite canvas with row organization (Magic Canvas)
- Computer Algebra System with rule-based canonicalization
- Workspace management and data persistence

## Generated Documentation

### Core Architecture & Analysis
- [Technology Stack Analysis](./technology-stack.md) - Complete technology breakdown and architecture patterns
- [Comprehensive Architecture](./comprehensive-architecture.md) - System architecture and design patterns
- [Data Models](./data-models.md) - Data structures, schemas, and validation rules
- [Source Tree Analysis](./source-tree-analysis.md) - Complete annotated directory structure

### Component & API Documentation
- [UI Components Inventory](./ui-components.md) - Reusable components and usage patterns
- [API Contracts](./api-contracts.md) - Internal APIs and worker communication protocols
- [State Management](./state-management.md) - State architecture and data flow patterns

### Development & Operations
- [Development Guide](./development-guide.md) - Setup, workflow, and development practices
- [Deployment Guide](./deployment-guide.md) - Production deployment and configuration

### Project Documentation
- [Project Overview](./project-overview.md) - Executive summary and getting started guide

## Existing Documentation

### Sprint Artifacts
- [Technical Specification - Epic 1](./sprint-artifacts/tech-spec-epic-1.md)
- [User Stories](./sprint-artifacts/stories/)
  - [Render Horizontal Ruled Lines](./sprint-artifacts/stories/1-3-render-horizontal-ruled-lines-for-row-guidance.context.xml)
  - [Implement RowManager Class](./sprint-artifacts/stories/1-4-implement-rowmanager-class-for-row-state-tracking.context.xml)
  - [Automatically Assign Drawn Elements](./sprint-artifacts/stories/1-5-automatically-assign-drawn-elements-to-rows.context.xml)
  - [Display Row Status Indicators](./sprint-artifacts/stories/1-6-display-row-status-indicators-at-row-edge.context.xml)
  - [Persist Row State](./sprint-artifacts/stories/1-7-persist-row-state-and-canvas-state-across-reloads.context.xml)

### BMad Methodology Documentation
- [BMad Architecture](./bmm-architecture.md)
- [Component Inventory](./bmm-component-inventory.md)
- [Development Guide](./bmm-development-guide.md)
- [Index](./bmm-index.md)
- [Readiness Assessment](./bmm-readiness-assessment-2025-11-13.md)
- [State Management](./bmm-state-management.md)
- [UI Components](./bmm-ui-components.md)
- [Workflow Status](./bmm-workflow-status.yaml)

### Project Documentation
- [Product Requirements Document](./PRD.md)
- [Project Backlog](./backlog.md)
- [Architecture Documentation](./architecture.md) _(To be generated)_
- [Epics](./epics.md)

## Getting Started

### For Developers

1. **Prerequisites**
   - Node.js 18.0.0 or higher
   - PNPM or NPM package manager
   - Modern browser (Chrome 90+, Firefox 88+, Safari 14+)

2. **Installation**
   ```bash
   git clone https://github.com/your-org/texo-web-stylus.git
   cd texo-web-stylus
   pnpm install
   ```

3. **Development**
   ```bash
   pnpm run dev          # Start development server
   pnpm test             # Run test suite
   pnpm run build        # Create production build
   ```

### For Users

1. **Access the Application**
   - Open in modern browser
   - Works offline after initial model download
   - No registration or account required

2. **Core Features**
   - Draw mathematical equations with stylus or mouse
   - Upload images for OCR processing
   - Type LaTeX directly with real-time validation
   - Organize work in multiple workspaces

## Architecture Highlights

### Privacy-First Design
- **Client-Side Only:** All processing happens in browser
- **No Data Transmission:** Zero server communication during operation
- **Local Storage:** User data stored locally with IndexedDB
- **Offline Capable:** Full functionality without internet connection

### Performance Architecture
- **Two-Tier Processing:** Fast rule-based canonicalization (1-50ms) with Algebrite fallback (50-500ms)
- **Web Workers:** Background processing for OCR and heavy computations
- **Intelligent Caching:** Canonical forms and model results cached for performance
- **Lazy Loading:** Code splitting and on-demand feature loading

### Component Architecture
- **Modular Design:** Reusable components with comprehensive testing
- **React Patterns:** Modern hooks, context API, and error boundaries
- **Styling:** Tailwind CSS for consistent, maintainable styles
- **State Management:** Hybrid approach with React Context and local state

## Key Implementation Details

### Computer Algebra System
- **Rule Engine:** Priority-based transformation rules for canonicalization
- **KaTeX Integration:** LaTeX parsing and AST manipulation
- **Algebrite Fallback:** Symbolic computation for complex cases
- **Equivalence Checking:** Fast comparison with detailed result metadata

### OCR Pipeline
- **FormulaNet Model:** State-of-the-art mathematical OCR
- **Image Preprocessing:** Normalization and enhancement
- **Worker Pool:** Parallel processing for performance
- **Tile System:** Intelligent overlapping for wide expressions

### Canvas System
- **Excalidraw Integration:** Professional drawing canvas
- **Row Organization:** Automatic assignment of elements to logical rows
- **Real-time OCR:** Continuous processing during drawing
- **Visual Feedback:** Status indicators and validation results

## Development Workflow

### Code Organization
```
src/
├── cas/           # Computer Algebra System
├── components/    # Reusable UI Components
├── contexts/      # React Context Providers
├── hooks/         # Custom React Hooks
├── pages/         # Route-based Page Components
├── utils/         # Business Logic & Utilities
├── workers/       # Web Workers
└── App.jsx        # Main Application Component
```

### Testing Strategy
- **Unit Tests:** Component and utility function testing with Vitest
- **Integration Tests:** Workflow and component interaction testing
- **Performance Tests:** CAS operation benchmarks and timing validation
- **Manual Tests:** Algebrite integration and edge case validation

### Quality Assurance
- **Type Safety:** JSDoc documentation and PropTypes validation
- **Code Quality:** ESLint configuration and Prettier formatting
- **Error Handling:** Comprehensive error boundaries and recovery mechanisms
- **Performance:** Continuous monitoring and optimization

## Deployment & Operations

### Build Process
- **Vite Configuration:** Optimized production builds with code splitting
- **Bundle Analysis:** Automated bundle size monitoring
- **Asset Optimization:** Image compression and format optimization
- **Source Maps:** Generated for production debugging

### Deployment Targets
- **Static Hosting:** Netlify, Vercel, GitHub Pages
- **CDN Distribution:** Model files and static assets via CDN
- **PWA Support:** Service worker for offline capabilities
- **Enterprise:** Internal hosting with air-gapped support

### Monitoring & Analytics
- **Performance Monitoring:** Core Web Vitals and custom metrics
- **Error Tracking:** Comprehensive error logging and reporting
- **Usage Analytics:** Privacy-compliant usage patterns (optional)
- **Health Checks:** Automated system and dependency monitoring

## Security & Privacy

### Security Measures
- **Content Security Policy:** XSS prevention and resource control
- **Input Validation:** Comprehensive validation for all user inputs
- **HTTPS Enforcement:** Secure communication for model downloads
- **Dependency Management:** Regular updates and vulnerability scanning

### Privacy Protection
- **Data Minimization:** Only collect necessary data
- **Local Processing:** No server-side computation or storage
- **User Control:** Complete data deletion and export capabilities
- **Transparency:** Open source code with comprehensive documentation

## Contributing Guidelines

### Development Standards
- **Code Style:** Follow existing patterns and conventions
- **Testing Requirements:** Comprehensive test coverage for new features
- **Documentation:** Update relevant documentation for API changes
- **Performance:** Consider performance implications for all changes

### Contribution Process
1. Fork repository and create feature branch
2. Implement changes with tests and documentation
3. Ensure all tests pass and code quality standards met
4. Submit pull request with clear description of changes
5. Code review and integration by maintainers

## Support & Community

### Documentation
- **API Reference:** Complete API documentation with examples
- **Architecture Guides:** System design and integration patterns
- **Tutorials:** Step-by-step guides for common use cases
- **FAQ:** Common questions and troubleshooting

### Community Resources
- **GitHub Issues:** Bug reports and feature requests
- **Discussions:** Community questions and general discussion
- **Wiki:** Additional documentation and community contributions
- **Releases:** Version history and release notes

---

**Last Updated:** November 14, 2025  
**Documentation Version:** 1.0  
**Project Version:** 0.0.1

This documentation serves as the primary reference for understanding, developing, and deploying the Texo-web-stylus mathematical OCR application. For the most up-to-date information, please refer to the GitHub repository and check the latest documentation updates.