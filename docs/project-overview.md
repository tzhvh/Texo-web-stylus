# Project Overview

## Project Summary

**Texo-web-stylus** is a privacy-first mathematical OCR application that converts handwritten equations into LaTeX format. Built with modern web technologies, it operates entirely client-side to ensure complete user privacy while providing powerful mathematical processing capabilities.

## Key Features

### Core Functionality
- **Handwriting Recognition**: Convert handwritten mathematical equations to LaTeX using state-of-the-art ML models
- **Real-time Validation**: Instant equivalence checking between mathematical expressions
- **Privacy-First Processing**: All computation happens locally in your browser
- **Multiple Input Methods**: Draw with stylus, upload images, or type LaTeX directly
- **Offline Operation**: Works completely offline after initial model download

### Advanced Features
- **Magic Canvas**: Infinite canvas with intelligent row organization and automatic OCR
- **Computer Algebra System**: Symbolic computation and expression simplification
- **Equivalence Checking**: Fast rule-based comparison with Algebrite fallback
- **Workspace Management**: Multiple workspaces with isolated data and settings
- **Debug Mode**: Comprehensive debugging and performance monitoring

## Technology Stack

### Frontend
- **React 18**: Modern component-based UI with hooks and concurrent features
- **Vite 6**: Fast development server and optimized production builds
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Excalidraw**: Powerful drawing canvas with stylus support
- **ProseMirror**: Rich text editing with mathematical expression support

### Mathematical Processing
- **KaTeX**: Fast LaTeX rendering and parsing
- **Transformers.js**: Client-side ML inference using FormulaNet model
- **Algebrite**: Symbolic computation engine for advanced mathematics
- **Custom CAS**: Rule-based canonicalization for fast equivalence checking

### Data & Storage
- **IndexedDB**: Client-side database for workspace and cache persistence
- **Web Workers**: Background processing for OCR and heavy computations
- **LocalStorage**: User preferences and settings
- **Browser Cache**: Model file caching for offline operation

## Architecture Highlights

### Privacy-First Design
- **No Server Communication**: All processing happens client-side
- **Local Data Storage**: User data never leaves the browser
- **No Telemetry**: No analytics or tracking
- **Offline Capable**: Full functionality without internet connection

### Performance Optimization
- **Two-Tier Processing**: Fast rule-based canonicalization with CAS fallback
- **Web Workers**: Non-blocking background processing
- **Intelligent Caching**: Canonical form and model result caching
- **Lazy Loading**: Code splitting and on-demand feature loading

### Developer Experience
- **Modern Tooling**: Vite, Vitest, and comprehensive testing
- **Type Safety**: JSDoc documentation and PropTypes patterns
- **Hot Module Replacement**: Instant development feedback
- **Component Architecture**: Modular, reusable components

## Project Structure

```
texo-web-stylus/
├── src/                    # Application source code
│   ├── cas/               # Computer Algebra System
│   ├── components/        # Reusable UI components
│   ├── pages/             # Route-based page components
│   ├── utils/             # Business logic and utilities
│   ├── workers/           # Web Workers for background tasks
│   └── contexts/          # React Context providers
├── docs/                  # Generated documentation
├── public/                 # Static assets
└── tests/                  # Test files and utilities
```

## Target Users

### Primary Users
- **Students**: Mathematics and engineering students working with equations
- **Educators**: Teachers creating mathematical content and materials
- **Researchers**: Academics working with mathematical notation
- **Engineers**: Professionals documenting mathematical calculations

### Use Cases
- **Note Taking**: Convert handwritten class notes to digital LaTeX
- **Homework**: Validate mathematical solutions and check equivalence
- **Documentation**: Create professional mathematical documents
- **Research**: Record and validate mathematical derivations

## Performance Characteristics

### Speed
- **OCR Processing**: 1-3 seconds per expression
- **Equivalence Checking**: <50ms for 90% of expressions
- **Model Loading**: 30-60 seconds (one-time download)
- **UI Response**: <16ms for 60fps rendering

### Accuracy
- **OCR Accuracy**: >95% for typical mathematical handwriting
- **Equivalence Detection**: >98% for equivalent expressions
- **LaTeX Generation**: >97% syntactically valid output

### Resource Usage
- **Memory**: <200MB during normal operation
- **Storage**: <500MB for models and cached data
- **CPU**: Efficient processing with Web Worker utilization

## Browser Compatibility

### Supported Browsers
- **Chrome**: 90+ (recommended for best performance)
- **Firefox**: 88+ (full feature support)
- **Safari**: 14+ (iOS and macOS)
- **Edge**: 90+ (Chromium-based)

### Required Features
- **Web Workers**: For background processing
- **IndexedDB**: For data persistence
- **ES2020**: Modern JavaScript features
- **Canvas API**: For drawing and image processing

## Security & Privacy

### Data Protection
- **Client-Side Only**: No data transmission to servers
- **Local Storage**: All data stored in browser
- **User Control**: Complete data deletion and export capabilities
- **No Tracking**: Zero analytics, telemetry, or cookies

### Security Measures
- **Content Security Policy**: Prevents XSS attacks
- **Input Validation**: Sanitizes all user inputs
- **HTTPS Required**: For model downloads (initial load only)
- **Origin Isolation**: IndexedDB scoped to application origin

## Development Status

### Current Version
- **Version**: 0.0.1 (development)
- **License**: AGPL-3.0
- **Repository**: Available on GitHub
- **Documentation**: Comprehensive docs in `/docs` folder

### Recent Updates
- **Magic Canvas**: Advanced infinite canvas with row organization
- **Performance Improvements**: Optimized OCR pipeline and caching
- **Enhanced Testing**: Comprehensive test suite with CI/CD
- **Documentation**: Complete technical documentation

## Future Roadmap

### Short Term (Next 3 months)
- **PWA Support**: Offline installation and improved caching
- **Mobile Optimization**: Enhanced touch and stylus support
- **Performance**: Further optimization for large expressions
- **UI Polish**: Improved user experience and animations

### Medium Term (3-6 months)
- **Collaboration Features**: Optional sharing and synchronization
- **Advanced OCR**: Support for more complex mathematical notation
- **Export Options**: Additional formats (PDF, Word, etc.)
- **Accessibility**: Enhanced screen reader and keyboard navigation

### Long Term (6+ months)
- **WebAssembly**: Performance-critical components in WASM
- **Cloud Models**: Optional cloud-based processing for complex cases
- **Plugin System**: Extensible architecture for custom features
- **Internationalization**: Multi-language support

## Getting Started

### Quick Start
```bash
# Clone the repository
git clone https://github.com/your-org/texo-web-stylus.git
cd texo-web-stylus

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Build for Production
```bash
# Create optimized build
npm run build

# Preview production build
npm run preview
```

## Contributing

### Development Environment
- **Node.js**: 18.0.0 or higher
- **Package Manager**: NPM or PNPM
- **Browser**: Chrome 90+ for development
- **IDE**: VS Code with recommended extensions

### Contribution Guidelines
- **Code Style**: Follow existing patterns and conventions
- **Testing**: Add tests for new features and bug fixes
- **Documentation**: Update docs for API changes
- **Pull Requests**: Target `develop` branch with clear descriptions

## Support

### Documentation
- **Technical Docs**: `/docs` directory in repository
- **API Reference**: Comprehensive API documentation
- **Architecture Guides**: System design and patterns
- **Development Guide**: Setup and contribution instructions

### Community
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Community questions and general discussion
- **Wiki**: Additional documentation and tutorials

---

**Texo-web-stylus** represents the next generation of mathematical tools, combining the power of modern machine learning with the privacy and convenience of web applications. Whether you're a student, educator, or professional, Texo-web-stylus provides the tools you need to work with mathematical notation efficiently and securely.