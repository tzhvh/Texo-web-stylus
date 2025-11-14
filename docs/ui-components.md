# UI Components Inventory

## Component Architecture Overview

Texo-web-stylus follows a modular component architecture with React 18, utilizing functional components, hooks, and modern patterns. The UI is built with Tailwind CSS for styling and emphasizes accessibility, performance, and user experience.

## Component Hierarchy

```
App (Root)
├── DebugProvider (Context)
├── HelmetProvider (SEO)
├── BrowserRouter (Routing)
└── AppContent
    ├── Header (Navigation)
    │   ├── Logo/Brand
    │   ├── Navigation Links
    │   └── Debug Toggle
    ├── Main Content Area
    │   ├── Routes
    │   │   ├── SketchPage
    │   │   ├── OCRPage
    │   │   ├── ComposePage
    │   │   ├── DatabasePage
    │   │   └── MagicCanvas (Lazy Loaded)
    │   └── ErrorBoundary
    └── Footer
```

## Core UI Components

### 1. Application Shell Components

#### App.jsx
**Purpose**: Root application component with routing and global providers
**Key Features**:
- React Router configuration
- Lazy loading for performance
- Error boundary integration
- Global context providers
- Responsive layout structure

**Props**: None (uses context for configuration)

**State Management**:
- Uses DebugContext for global debug state
- HelmetProvider for meta tag management
- BrowserRouter for navigation state

**Performance Features**:
- Lazy loading of MagicCanvas component
- Suspense with loading fallbacks
- Error boundaries for graceful degradation

#### ErrorBoundary.jsx
**Purpose**: Error boundary component for graceful error handling
**Key Features**:
- Catches React component errors
- Displays user-friendly error messages
- Provides error recovery options
- Debug information in development mode

**Props**:
- `children`: React nodes to wrap
- `fallback?: ReactNode`: Custom error fallback

**Error Handling**:
- Error logging and reporting
- User-friendly error display
- Recovery suggestions
- Debug details in development mode

### 2. Navigation Components

#### Header Navigation
**Location**: App.jsx header section
**Purpose**: Main application navigation
**Components**:
- Logo/Brand link to home
- Navigation links (Sketch, Recognize, Compose, Database, Magic Canvas)
- Debug mode toggle switch

**Styling**: Tailwind CSS with responsive design
**Features**:
- Active route highlighting
- Hover states and transitions
- Mobile-responsive layout
- Accessibility (ARIA labels, keyboard navigation)

#### Navigation Links
**Routes**:
- `/` - Sketch (main drawing page)
- `/ocr` - Recognize (image OCR)
- `/compose` - Compose (math editor)
- `/database` - Database (workspace management)
- `/magic-canvas` - Magic Canvas (advanced features)

**Link Styling**:
- Active state: blue text, medium font weight
- Inactive state: gray text, hover to blue
- Smooth transitions (200ms)
- Focus states for accessibility

### 3. Page Components

#### SketchPage.jsx
**Purpose**: Main drawing canvas for handwritten equations
**Key Features**:
- Excalidraw canvas integration
- Stylus input support
- Real-time drawing
- Export/import functionality

**State Management**:
- Canvas state via Excalidraw
- Drawing tools configuration
- Export settings

#### OCRPage.jsx
**Purpose**: Image upload and OCR processing interface
**Key Features**:
- Drag-and-drop image upload
- Image preprocessing
- OCR progress tracking
- Results display and editing

**UI Elements**:
- File upload area
- Image preview
- Progress indicators
- Results display

#### ComposePage.jsx
**Purpose**: Mathematical expression editor with validation
**Key Features**:
- ProseMirror math editor
- Real-time equivalence checking
- LaTeX rendering with KaTeX
- Error highlighting and feedback

**Components Used**:
- ProseMirror editor with math plugin
- KaTeX rendering
- Validation feedback system
- Debug controls

#### DatabasePage.jsx
**Purpose**: Workspace and data management interface
**Key Features**:
- Workspace management
- Cache statistics
- Data export/import
- Diagnostic log viewing

**UI Sections**:
- Workspace selector and manager
- Cache statistics display
- Export/import controls
- Log viewer with filtering

#### MagicCanvas.jsx (Lazy Loaded)
**Purpose**: Advanced canvas with row management and OCR integration
**Key Features**:
- Row-based organization
- Automatic OCR processing
- Visual status indicators
- Persistent state management

**Performance Features**:
- Lazy loading for code splitting
- Optimized rendering for large canvases
- Web Worker integration

### 4. Specialized Components

#### RowHeader.jsx
**Purpose**: Visual status indicators for canvas rows
**Key Features**:
- Status icon display (✓, ✗, ⟳, ⚠️, ○, ∅)
- Color-coded status backgrounds
- Animated processing indicators
- Debug information overlay
- Interactive click handlers

**Props**:
```javascript
{
  row: {
    id: string,
    ocrStatus: 'pending'|'processing'|'completed'|'error',
    validationStatus: 'pending'|'processing'|'validated'|'invalid'|'error',
    errorMessage?: string,
    elementIds: Set<string>,
    lastModified?: number
  },
  y: number,                    // Y coordinate for positioning
  canvasWidth: number,          // Canvas width for positioning
  debugMode?: boolean           // Enable debug overlay
}
```

**Status Icons**:
- ✓ (green): OCR completed and validated
- ✗ (red): Error occurred
- ⟳ (orange, spinning): Processing in progress
- ⚠️ (yellow): OCR completed but validation failed
- ○ (blue): OCR completed, awaiting validation
- ∅ (gray): Pending processing

**Styling**:
- 48x48px circular icons
- Positioned at canvas right edge (60px from right)
- Centered on row Y coordinate
- Z-index: 1000 for separate layer
- Hover effects (scale 110%)
- Smooth transitions

**Accessibility**:
- Semantic button role
- Title tooltips for status descriptions
- Keyboard navigation support
- High contrast colors

**Performance**:
- Memoized version (MemoizedRowHeader)
- Selective re-rendering based on prop changes
- Optimized event handlers

#### Notification.jsx
**Purpose**: Application-wide notification system
**Key Features**:
- Toast-style notifications
- Auto-dismissal
- Multiple notification types
- Stacking support

**Notification Types**:
- Success (green)
- Error (red)
- Warning (yellow)
- Info (blue)

**Props**:
```javascript
{
  message: string,
  type: 'success'|'error'|'warning'|'info',
  duration?: number,    // Auto-dismiss time
  persistent?: boolean  // Don't auto-dismiss
}
```

### 5. Context Providers

#### DebugContext.jsx
**Purpose**: Global debug state management
**Features**:
- Debug mode toggle
- Logger integration
- LocalStorage persistence
- Component subscription

**API**:
```javascript
const {
  debugMode: boolean,
  setDebugMode: function,
  toggleDebug: function
} = useDebug()
```

**Persistence**:
- LocalStorage integration
- Automatic logger configuration
- Default debug mode: true

## Component Patterns

### 1. Functional Components with Hooks
- All components use functional syntax
- React hooks for state and effects
- Custom hooks for complex logic
- Memoization for performance

### 2. Props Interface Documentation
- Comprehensive JSDoc comments
- TypeScript-style prop definitions
- Default value specifications
- Usage examples

### 3. Accessibility Features
- ARIA labels and roles
- Keyboard navigation support
- High contrast color schemes
- Screen reader compatibility
- Focus management

### 4. Performance Optimizations
- React.memo for expensive components
- Lazy loading for code splitting
- Debounced user interactions
- Optimized re-rendering

## Styling Architecture

### 1. Tailwind CSS Integration
- Utility-first CSS approach
- Responsive design patterns
- Custom animation definitions
- Component-specific styling

### 2. Custom Animations
```css
/* Custom animations in tailwind.config.js */
'slide-in': 'slideIn 0.3s ease-out'
@keyframes slideIn {
  '0%': { transform: 'translateX(100%)', opacity: '0' }
  '100%': { transform: 'translateX(0)', opacity: '1' }
}
```

### 3. Responsive Design
- Mobile-first approach
- Breakpoint-specific layouts
- Touch-friendly interaction areas
- Adaptive navigation

### 4. Theme Support
- Light theme as default
- CSS custom properties for theming
- Dark theme preparation
- User preference detection

## Component Testing

### 1. Unit Tests
- Vitest testing framework
- React Testing Library
- Component rendering tests
- User interaction simulations

### 2. Integration Tests
- Component interaction testing
- Context provider testing
- Routing behavior validation
- Error boundary testing

### 3. Performance Testing
- Render performance benchmarks
- Memory usage monitoring
- Large dataset handling
- Lazy loading verification

## Component Library Usage

### 1. External Libraries
- **Excalidraw**: Drawing canvas functionality
- **ProseMirror**: Rich text editing with math support
- **KaTeX**: Mathematical expression rendering
- **React Router**: Client-side routing

### 2. Internal Component Library
- Reusable UI components
- Consistent design system
- Shared utility functions
- Custom hooks library

### 3. Icon System
- Unicode symbols for status indicators
- CSS-based icon animations
- Consistent sizing and positioning
- Accessibility-friendly alternatives

## Future Component Plans

### 1. Design System Expansion
- Component variant system
- Design token management
- Storybook integration
- Component documentation site

### 2. Enhanced Accessibility
- Screen reader optimization
- Keyboard navigation improvements
- High contrast mode support
- Reduced motion preferences

### 3. Performance Enhancements
- Virtual scrolling for large lists
- Component-level code splitting
- Service worker caching
- Bundle size optimization