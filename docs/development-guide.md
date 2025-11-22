# Development Guide

**Generated:** 2025-11-22  
**Project:** Texo-web-stylus  
**Type:** Web Application (React + Vite)  

---

## Prerequisites

### **System Requirements**
- **Node.js:** 18+ (recommended: LTS)
- **Package Manager:** npm or pnpm
- **Browser:** Modern browser with Web Workers and IndexedDB support
- **Memory:** 4GB+ RAM recommended (for ML model loading)

### **Development Environment**
- **OS:** Windows, macOS, or Linux
- **IDE:** VS Code (recommended) with React and JavaScript extensions
- **Git:** For version control
- **Terminal:** For running commands and scripts

---

## Installation and Setup

### **1. Clone Repository**
```bash
git clone https://github.com/your-username/texo-web-stylus.git
cd texo-web-stylus
```

### **2. Install Dependencies**
```bash
# Using npm (default)
npm install

# Using pnpm (faster, recommended)
pnpm install
```

### **3. Environment Configuration**
```bash
# Copy environment template if available
cp .env.example .env

# Edit environment variables as needed
# Note: This project works entirely client-side, minimal config needed
```

### **4. Start Development Server**
```bash
npm run dev
```
**Server starts at:** http://localhost:5173

---

## Development Commands

### **Basic Development**
```bash
npm run dev           # Start dev server with HMR
npm run build         # Production build to dist/
npm run preview       # Test production build locally
```

### **Testing Commands**
```bash
npm test                      # Run all Vitest tests
npm run test:watch            # Watch mode for test development
npm run test:equivalence      # Run only equivalence checker tests
npm run test:manual           # Run manual CAS tests (Node.js based)
npm run test:all              # Run equivalence + manual tests
npm run test:unified          # Run all tests with unified output
```

### **Specialized Commands**
```bash
npm run lint                  # Run code linting (if configured)
npm run type-check            # Run type checking (if configured)
```

---

## Project Structure Overview

### **Key Directories**
```
src/
├── cas/                    # Computer Algebra System (core math engine)
├── components/             # Reusable React components
├── contexts/               # React Context providers
├── hooks/                  # Custom React hooks
├── pages/                  # Main application pages (routes)
├── utils/                  # Utility functions and services
├── workers/                # Web Workers for background processing
├── App.jsx                 # Main application router
├── main.jsx                # Application entry point
└── index.css               # Global styles
```

### **Configuration Files**
- `vite.config.js` - Vite build tool configuration
- `vitest.config.js` - Test framework configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `package.json` - Dependencies and scripts

---

## Development Workflow

### **1. Feature Development**
1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement Changes**
   - Follow existing code patterns and conventions
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Changes**
   ```bash
   npm run test:watch    # Run tests in watch mode
   npm run dev           # Start dev server
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

### **2. Testing Strategy**

#### **Unit Tests**
- **Framework:** Vitest with jsdom environment
- **Location:** `src/**/__tests__/` directories
- **Naming:** `*.test.js` or `*.test.jsx`
- **Run:** `npm test` or `npm run test:watch`

#### **Manual Tests**
- **Purpose:** CAS validation and complex scenarios
- **Location:** `src/cas/__tests__/` with `*.manual.test.js`
- **Run:** `npm run test:manual` (Node.js execution)
- **Note:** Excluded from Vitest auto-run

#### **Integration Tests**
- **Coverage:** Component interactions and workflows
- **Tools:** React Testing Library
- **Environment:** jsdom for DOM simulation

### **3. Code Quality**

#### **Code Conventions**
- **Components:** Functional components with hooks
- **Naming:** PascalCase for components, camelCase for utilities
- **Exports:** Named exports for utilities, default for components
- **Documentation:** JSDoc comments for all public APIs

#### **Styling Guidelines**
- **Framework:** Tailwind CSS utility-first
- **Approach:** Responsive design with mobile-first
- **Customization:** Use Tailwind's extend feature for custom styles
- **Consistency:** Follow existing design patterns

#### **Error Handling**
- **Components:** Wrap with ErrorBoundary for graceful failures
- **Async:** Use try-catch with proper error logging
- **User Feedback:** Display meaningful error messages
- **Recovery:** Provide retry mechanisms where appropriate

---

## Working with Specific Features

### **Computer Algebra System (CAS)**
- **Location:** `src/cas/`
- **Core Files:**
  - `equivalenceChecker.js` - Main equivalence checking API
  - `katexParser.js` - LaTeX to AST conversion
  - `rules/` - Canonicalization rule sets
- **Testing:** `npm run test:equivalence`
- **Documentation:** `src/cas/README.md`

#### **Adding New CAS Rules**
1. Create rule in `src/cas/rules/algebraRules.js` or `trigRules.js`
2. Follow rule structure: `{ name, description, priority, match, transform }`
3. Add tests in `src/utils/__tests__/equivalenceChecker.test.js`
4. Run `npm run test:equivalence` to verify

### **OCR and Image Processing**
- **Workers:** `src/workers/ocrWorker.js`, `imageProcessor.js`
- **Model:** FormulaNet (~150MB, cached after first download)
- **Workflow:** Image → Preprocess → Inference → LaTeX output
- **Debugging:** Check Network tab for model download progress

### **React Components**
- **Base Components:** ErrorBoundary, StatusIcon, RowHeader
- **Page Components:** SketchPage, OCRPage, ComposePage, DatabasePage
- **Testing:** React Testing Library with jsdom
- **Patterns:** Functional components with comprehensive props documentation

### **State Management**
- **Global State:** React Context (DebugContext)
- **Local State:** useState and useReducer hooks
- **Persistence:** IndexedDB via workspaceDB.js
- **Caching:** Canonical forms cached in IndexedDB

---

## Build and Deployment

### **Development Build**
```bash
npm run dev
```
- **Server:** Vite dev server with HMR
- **Port:** 5173 (default)
- **Features:** Source maps, fast refresh, worker reloading

### **Production Build**
```bash
npm run build
```
- **Output:** `dist/` directory
- **Optimization:** Code splitting, minification, tree shaking
- **Assets:** Static files with hash-based filenames
- **Workers:** Properly bundled for production

### **Local Production Testing**
```bash
npm run preview
```
- **Server:** Static file server
- **Purpose:** Test production build locally
- **URL:** http://localhost:4173 (default)

### **Deployment**
- **Platform:** GitHub Pages (configured)
- **Workflow:** `.github/workflows/deploy.yml`
- **Trigger:** Push to main branch
- **Process:** Build → Upload → Deploy to GitHub Pages

---

## Performance Considerations

### **Web Workers**
- **Purpose:** Offload heavy computation from main thread
- **Workers:** OCR inference, image processing, logging
- **Communication:** PostMessage API with structured messages
- **Debugging:** Chrome DevTools → Sources → Workers

### **Memory Management**
- **ML Model:** ~150MB FormulaNet model (cached)
- **IndexedDB:** Workspace data with quota management
- **Caching:** Canonical forms with 7-day TTL
- **Cleanup:** Regular cache clearing and workspace management

### **Optimization Targets**
| Operation | Target | Notes |
|-----------|--------|-------|
| OCR inference | 1-3s | After model load |
| Canonicalization | <50ms | Fast path |
| Algebrite fallback | 50-500ms | Slow path |
| Cache lookup | <1ms | IndexedDB hit |
| UI re-render | <16ms | 60fps target |

---

## Troubleshooting

### **Common Development Issues**

#### **Installation Issues**
- **Node Version:** Ensure Node.js 18+ installed
- **Permissions:** Try `sudo npm install` if permission errors
- **Cache:** Clear npm cache with `npm cache clean --force`

#### **Development Server Issues**
- **Port Conflict:** Change port in `vite.config.js`
- **HMR Not Working:** Check file permissions and antivirus software
- **Worker Errors:** Open DevTools Console for worker loading issues

#### **Test Failures**
- **Vitest Tests:** Check jsdom environment setup
- **Manual Tests:** Run with Node.js directly, not Vitest
- **CAS Tests:** Verify Algebrite dependency installation

### **Debugging Tools**

#### **Browser DevTools**
- **Console:** Application logs and errors
- **Network:** Model download progress
- **Sources:** Worker debugging and source maps
- **Application:** IndexedDB storage and service workers

#### **VS Code Extensions**
- **ES7+ React/Redux/React-Native snippets** - React code snippets
- **Tailwind CSS IntelliSense** - Tailwind class autocomplete
- **JSDoc Generator** - Documentation assistance
- **Thunder Client** - API testing (if needed)

#### **Built-in Debugging**
- **Debug Mode:** Toggle in ComposePage (green switch)
- **Force Algebrite:** Orange checkbox in ComposePage
- **Database Page:** View cache stats, logs, and workspace data

---

## Contributing Guidelines

### **Before Contributing**
1. **Read Documentation:** Review this guide and `CLAUDE.md`
2. **Understand Architecture:** Check `src/cas/README.md` for CAS details
3. **Run Tests:** Ensure `npm test` passes locally
4. **Code Style:** Follow existing patterns and conventions

### **Pull Request Process**
1. **Create Branch:** `feature/your-feature` or `fix/your-fix`
2. **Implement Changes:** With tests and documentation
3. **Test Thoroughly:** All tests must pass
4. **Submit PR:** With clear description and testing notes

### **Code Review Criteria**
- **Functionality:** Works as intended without breaking existing features
- **Performance:** No significant performance regressions
- **Testing:** Adequate test coverage for new code
- **Documentation:** Updated for any API changes
- **Style:** Follows project conventions and patterns

---

## Additional Resources

### **Internal Documentation**
- **[CLAUDE.md](../CLAUDE.md)** - AI assistant guidance
- **[CANONICALIZATION_GUIDE.md](../CANONICALIZATION_GUIDE.md)** - CAS implementation details
- **[src/cas/README.md](../src/cas/README.md)** - CAS architecture and API

### **External Dependencies**
- **[React Documentation](https://react.dev/)** - React framework
- **[Vite Documentation](https://vitejs.dev/)** - Build tool
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling framework
- **[KaTeX](https://katex.org/)** - Math rendering
- **[Excalidraw](https://excalidraw.com/)** - Drawing library
- **[ProseMirror](https://prosemirror.net/)** - Editor framework

### **Community and Support**
- **GitHub Issues:** Report bugs and request features
- **Discussions:** Ask questions and share ideas
- **Documentation:** Contribute improvements and examples

---

**Last Updated:** 2025-11-22  
**Development Environment:** Vite 7.2.4 + React 19.2.0  
**Test Framework:** Vitest 4.0.13 + jsdom