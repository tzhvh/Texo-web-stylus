# UI Components Documentation

**Project**: Texo-web-stylus
**Generated**: 2025-11-13

---

## Overview

Texo-web-stylus is a single-page application (SPA) built with React 18 and React Router. The UI is styled exclusively with **TailwindCSS** utility classes, with no custom CSS components or styled-components. The design emphasizes simplicity, accessibility, and offline-first functionality.

---

## Layout Structure

### Application Shell

The application uses a consistent layout across all pages:

```
┌─────────────────────────────────────────────────────────┐
│  Header (Navigation + Debug Toggle)                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Main Content Area (React Router Outlet)                │
│                                                          │
│  - SketchPage                                            │
│  - OCRPage                                               │
│  - ComposePage                                           │
│  - DatabasePage                                          │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  Footer ("WIP" text)                                    │
└─────────────────────────────────────────────────────────┘
```

**Layout Classes**:
- Container: `min-h-screen flex flex-col bg-gray-50`
- Header: `bg-white shadow-sm p-4 flex justify-between items-center border-b`
- Main: `flex-grow`
- Footer: `bg-white border-t p-4 text-center text-sm text-gray-500`

---

## Header Component

**Location**: `App.jsx` (AppContent component)

### Structure

```jsx
<header className="bg-white shadow-sm p-4 flex justify-between items-center border-b">
  <Link to="/" className="text-2xl text-grey-600 hover:text-blue-700">
    Transcription
  </Link>
  <div className="flex items-center space-x-6">
    <nav className="flex items-center space-x-6">
      {/* Navigation Links */}
    </nav>
    {/* Debug Toggle */}
  </div>
</header>
```

### Navigation Links

| Link | Route | Label |
|------|-------|-------|
| Sketch | `/` | Sketch |
| Recognize | `/ocr` | Recognize |
| Compose | `/compose` | Compose |
| Database | `/database` | Database |

**Link Styling**:
- Base: `text-gray-700 hover:text-blue-600 font-medium transition`
- Active state: Not explicitly styled (relies on React Router)

### Debug Toggle

Checkbox with label, styled as:
- Checkbox: `w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2`
- Label: Dynamic color based on state
  - Active: `text-green-600`
  - Inactive: `text-gray-600`

---

## Page Components

### Common Page Layout Pattern

All pages follow a consistent structure:

```jsx
<div className="p-6 max-w-7xl mx-auto">
  {/* Page Header */}
  <div className="mb-6">
    <h1 className="text-3xl font-bold text-gray-800">Page Title</h1>
    <p className="text-gray-600 mt-2">Page description</p>
  </div>

  {/* Optional Status Banners */}
  {/* ... */}

  {/* Main Content Grid */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {/* Content Sections */}
  </div>
</div>
```

**Key Classes**:
- Page container: `p-6 max-w-7xl mx-auto`
- Page title: `text-3xl font-bold text-gray-800`
- Page description: `text-gray-600 mt-2`
- Grid layout: `grid grid-cols-1 lg:grid-cols-2 gap-8` (responsive 2-column on large screens)

---

### 1. SketchPage UI

#### Layout
- **Two-column grid** (responsive): Input (left) + Output (right)
- Input: 500px fixed height Excalidraw canvas
- Output: LaTeX preview + code editor

#### Key UI Elements

**1. Loading Banner** (appears during model load):
```jsx
<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <div className="flex items-center space-x-3">
    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
    <span className="text-blue-700">{loadingMessage}</span>
  </div>
</div>
```

**2. Excalidraw Canvas Container**:
```jsx
<div
  className="border rounded-lg overflow-hidden bg-white relative"
  style={{ height: "500px" }}
>
  <Excalidraw {...} />
</div>
```

**3. Action Buttons**:
- Convert: `px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition`
- Clear: `px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition`
- Disabled state: `disabled:opacity-50 disabled:cursor-not-allowed`

**4. Auto-Convert Toggle** (custom checkbox design):
```jsx
<button className={`
  flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition
  ${autoConvert
    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
`}>
  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ...`}>
    {autoConvert && <svg>...</svg>}
  </span>
  Auto-convert (5s)
</button>
```

**5. Timer Progress Indicator** (5-segment bar):
```jsx
<div className="flex gap-1">
  {[0, 1, 2, 3, 4].map((i) => (
    <div className={`
      flex-1 h-1 rounded transition-all duration-200
      ${timerProgress > i * 20 ? 'bg-blue-400' : 'bg-gray-400 animate-pulse'}
    `} />
  ))}
</div>
```

**6. LaTeX Output**:
- Preview area: `min-h-[100px] p-4 bg-gray-50 rounded border`
- Textarea: `w-full font-mono text-sm p-3 border rounded focus:ring-2 focus:ring-blue-500 resize-none`

**7. Debug Preview Overlay** (controlled by global debug toggle):
```jsx
<div id="ocr-debug-preview" style={{
  position: 'fixed',
  top: '10px',
  right: '10px',
  zIndex: 10000,
  display: debugMode ? 'block' : 'none'
}}>
  {/* OCR input image preview */}
</div>
```

---

### 2. OCRPage UI

#### Layout
- **Two-column grid** (responsive): Upload (left) + Output (right)

#### Key UI Elements

**1. Upload Drop Zone**:
```jsx
<div className="
  border-2 border-dashed border-gray-300 rounded-lg w-full h-80
  flex items-center justify-center cursor-pointer
  hover:border-blue-400 transition-colors bg-gray-50
">
  {/* Icon + Text or Image Preview */}
</div>
```

**2. Upload Icon** (SVG):
- Size: `h-12 w-12`
- Color: `text-gray-400`

**3. Instruction Text**:
- Primary: `mt-2 text-sm text-gray-600`
- Secondary: `mt-1 text-xs text-gray-500`

**4. Action Buttons**:
- Load Example: `px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded transition`
- Clear: Same as above

**5. Processing Indicator**:
```jsx
<div className="mt-4 flex items-center text-sm text-blue-600">
  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
  Processing image...
</div>
```

---

### 3. ComposePage UI

#### Layout
- **3-column grid** (responsive): Editor (2 cols) + Results Sidebar (1 col)

#### Key UI Elements

**1. Force Algebrite Toggle** (orange checkbox):
```jsx
<label className={`
  flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all
  ${forceAlgebrite
    ? 'bg-orange-50 border-orange-500 text-orange-700'
    : 'bg-gray-50 border-gray-300 text-gray-600'}
`}>
  <input type="checkbox" ... />
  <span className="font-medium text-sm">
    {forceAlgebrite ? '⚡ Force Algebrite' : 'Force Algebrite'}
  </span>
</label>
```

**2. Warning Banners**:
- Debug mode: `bg-green-50 border border-green-200 rounded-lg flex items-center gap-2`
- Force Algebrite: `bg-orange-50 border border-orange-300 rounded-lg flex items-center gap-2`
- Text: `text-green-700 text-sm font-medium` or `text-orange-700 ...`

**3. Help Panel** (collapsible):
```jsx
<div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded text-sm">
  <h3 className="font-semibold mb-2">Quick Guide:</h3>
  <ul className="space-y-1 text-gray-700">
    {/* Help items with inline <code> tags */}
  </ul>
</div>
```

**4. ProseMirror Editor**:
```jsx
<div
  ref={editorRef}
  className="border rounded-lg p-4 min-h-[400px] focus-within:ring-2 focus-within:ring-blue-500 prose max-w-none"
  style={{
    background: "#fafafa",
    fontFamily: "ui-monospace, monospace",
  }}
/>
```

**5. Validation Results Cards**:
```jsx
<div className={`p-3 border rounded-lg ${getStatusColorClass(result)}`}>
  {/* Green background for equivalent, red for non-equivalent */}
  <div className="flex items-center justify-between mb-2">
    <span className="font-semibold text-sm">Line {result.lineNumber}</span>
    {getStatusIcon(result)} {/* ✓ or ✗ */}
  </div>
  {/* Metadata: method, time, cached status */}
  {!result.equivalent && (
    <div className="mt-2 p-2 bg-white rounded text-xs">
      {/* LaTeX preview of current/previous expressions */}
    </div>
  )}
</div>
```

**Status Colors**:
- Equivalent: `bg-green-50 border-green-300`
- Non-equivalent: `bg-red-50 border-red-300`
- Icons: `text-green-600` (✓) or `text-red-600` (✗)

---

### 4. DatabasePage UI

#### Layout
- **Single-column** with tabbed interface
- Tabs: Overview, Logs, Import-Export

#### Key UI Elements

**1. Workspace Selector**:
```jsx
<select className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
  {workspaces.map(ws => <option>...</option>)}
</select>
```

**2. Tab Navigation**:
```jsx
<nav className="-mb-px flex space-x-8">
  <button className={`
    py-2 px-1 border-b-2 font-medium text-sm
    ${activeTab === tab
      ? 'border-blue-500 text-blue-600'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
  `}>
    {tabLabel}
  </button>
</nav>
```

**3. Statistics Cards**:
```jsx
<div className="p-4 bg-blue-50 rounded-lg">
  <div className="text-sm text-gray-600 mb-1">Label</div>
  <div className="text-2xl font-bold text-blue-600">{value}</div>
  {/* Optional metadata */}
</div>
```

**Color Scheme** (by card type):
- CAS Cache: `bg-blue-50`, `text-blue-600`
- Transformers Cache: `bg-green-50`, `text-green-600`
- Session State: `bg-purple-50`, `text-purple-600`
- Diagnostic Logs: `bg-orange-50`, `text-orange-600`

**4. Log Entries**:
```jsx
<div className={`
  border-l-4 pl-3 py-2
  ${log.level === 'error' ? 'border-red-500 bg-red-50' :
    log.level === 'warn' ? 'border-yellow-500 bg-yellow-50' :
    log.level === 'info' ? 'border-blue-500 bg-blue-50' :
    'border-gray-300 bg-gray-50'}
  ${selectedLogIds.has(log.id) ? 'ring-2 ring-blue-400' : ''}
`}>
  {/* Checkbox + log content */}
</div>
```

**5. Bulk Selection Controls**:
```jsx
<div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <div className="flex items-center justify-between flex-wrap gap-3">
    <span className="text-sm font-medium text-gray-700">
      Selection: {selectedLogIds.size} / {logs.length}
    </span>
    {/* Select All, Select None, Invert buttons */}
    <button className="px-4 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-medium">
      ✓ Apply Filters to Selection
    </button>
  </div>
</div>
```

**6. Storage Progress Bar**:
```jsx
<div className="mt-4">
  <div className="w-full bg-gray-200 rounded-full h-4">
    <div
      className="bg-blue-600 h-4 rounded-full"
      style={{ width: `${percentage}%` }}
    />
  </div>
  <div className="text-sm text-gray-600 mt-1 text-center">
    {percentage.toFixed(2)}% used
  </div>
</div>
```

---

## Common UI Patterns

### 1. Buttons

**Primary Action**:
```jsx
className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition"
```

**Secondary Action**:
```jsx
className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition"
```

**Danger Action**:
```jsx
className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
```

**Disabled State**:
```jsx
className="... disabled:opacity-50 disabled:cursor-not-allowed"
```

**Small Button**:
```jsx
className="px-3 py-1 text-sm ..."
```

---

### 2. Input Fields

**Text Input**:
```jsx
className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
```

**Textarea**:
```jsx
className="w-full font-mono text-sm p-3 border rounded focus:ring-2 focus:ring-blue-500 resize-none"
```

**Select**:
```jsx
className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
```

**Checkbox** (native):
```jsx
className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
```

---

### 3. Cards/Containers

**Standard Card**:
```jsx
className="border rounded-lg p-6 bg-white shadow-sm"
```

**Info/Status Banner**:
```jsx
className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
```

**Warning Banner**:
```jsx
className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
```

**Success Banner**:
```jsx
className="p-4 bg-green-50 border border-green-200 rounded-lg"
```

**Error Banner**:
```jsx
className="p-4 bg-red-50 border border-red-200 rounded-lg"
```

---

### 4. Loading Indicators

**Spinner** (border-based):
```jsx
<div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
```

**Inline Loading Text**:
```jsx
<div className="flex items-center text-sm text-blue-600">
  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
  Loading message...
</div>
```

---

### 5. Status Indicators

**Success (Green)**:
- Background: `bg-green-50`
- Border: `border-green-300`
- Text: `text-green-600` or `text-green-700`
- Icon: ✓

**Error (Red)**:
- Background: `bg-red-50`
- Border: `border-red-300`
- Text: `text-red-600` or `text-red-700`
- Icon: ✗

**Warning (Orange/Yellow)**:
- Background: `bg-orange-50` or `bg-yellow-50`
- Border: `border-orange-300` or `border-yellow-200`
- Text: `text-orange-700` or `text-yellow-800`
- Icon: ⚠️

**Info (Blue)**:
- Background: `bg-blue-50`
- Border: `border-blue-200`
- Text: `text-blue-600` or `text-blue-700`
- Icon: ℹ️ or spinner

---

## Responsive Design

### Breakpoints

TailwindCSS default breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Common Responsive Patterns

**Two-Column Grid** (stacks on mobile):
```jsx
className="grid grid-cols-1 lg:grid-cols-2 gap-8"
```

**Three-Column Grid** (2+1 on desktop):
```jsx
className="grid grid-cols-1 lg:grid-cols-3 gap-6"
// With span:
className="lg:col-span-2"
```

**Flexible Wrapping**:
```jsx
className="flex flex-wrap gap-3"
```

**Max Width Container**:
```jsx
className="max-w-7xl mx-auto" // Centers and constrains width
```

---

## Accessibility Considerations

### Semantic HTML
- All pages use proper heading hierarchy (`<h1>`, `<h2>`, `<h3>`)
- Navigation uses `<nav>` element
- Forms use `<form>` and `<label>` elements

### Focus Styles
- All interactive elements have `focus:ring-2` and `focus:ring-{color}-500`
- Focus outlines never removed without replacement

### ARIA
- File input hidden with `className="hidden"`, but accessible via label click
- Loading states announce visually with spinners and text

### Keyboard Navigation
- All buttons and links keyboard-accessible
- Keyboard shortcuts documented in help panels
- Tab order follows visual order

### Color Contrast
- Text colors pass WCAG AA standards:
  - `text-gray-800` on `bg-white`
  - `text-gray-600` on `bg-white`
  - Colored backgrounds use appropriate text colors

---

## Styling Conventions

### Color Palette

| Purpose | TailwindCSS Class | Hex |
|---------|-------------------|-----|
| Primary (Blue) | `bg-blue-500`, `text-blue-600` | #3B82F6, #2563EB |
| Success (Green) | `bg-green-500`, `text-green-600` | #10B981, #059669 |
| Error (Red) | `bg-red-500`, `text-red-600` | #EF4444, #DC2626 |
| Warning (Orange) | `bg-orange-500`, `text-orange-700` | #F97316, #C2410C |
| Info (Blue) | `bg-blue-50`, `text-blue-700` | #EFF6FF, #1D4ED8 |
| Neutral (Gray) | `bg-gray-50`, `text-gray-600` | #F9FAFB, #4B5563 |

### Typography

- **Page Titles**: `text-3xl font-bold text-gray-800`
- **Section Headers**: `text-xl font-semibold text-gray-700`
- **Subsection Headers**: `text-lg font-semibold`
- **Body Text**: `text-gray-600` (default size: 1rem)
- **Small Text**: `text-sm text-gray-500`
- **Extra Small Text**: `text-xs text-gray-500`
- **Monospace** (code/LaTeX): `font-mono text-sm`

### Spacing

- **Page Padding**: `p-6`
- **Card Padding**: `p-6` (large) or `p-4` (medium) or `p-3` (small)
- **Section Margin**: `mb-6` (24px)
- **Element Spacing**: `space-x-6`, `space-y-6` for flex/grid gaps
- **Gaps**: `gap-2` (0.5rem), `gap-3` (0.75rem), `gap-4` (1rem), `gap-6` (1.5rem), `gap-8` (2rem)

### Borders

- **Default**: `border border-gray-300`
- **Rounded**: `rounded` (0.25rem) or `rounded-lg` (0.5rem)
- **Dashed**: `border-dashed` (for upload zones)
- **Border Bottom**: `border-b` (for header)
- **Left Accent**: `border-l-4` (for log entries)

### Shadows

- **Subtle Shadow**: `shadow-sm`
- **Medium Shadow**: `shadow-md`
- **Focus Ring**: `focus:ring-2 focus:ring-{color}-500`

---

## Animation

### Transitions
- Most interactive elements use `transition` class (all 150ms ease)
- Hover states: `hover:bg-{color}`, `hover:text-{color}`

### Spinners
```jsx
className="animate-spin"
```

### Pulse (for progress indicators)
```jsx
className="animate-pulse"
```

### Custom Animations
Timer progress bar uses custom `transition-all duration-200` for smooth fill

---

## Layout Constraints

- **Max Width**: `max-w-7xl` (80rem / 1280px)
- **Centered**: `mx-auto`
- **Full Height**: `min-h-screen` (app container)
- **Fixed Heights**:
  - Excalidraw canvas: 500px
  - Upload zone: h-80 (20rem)
  - Editor min height: min-h-[400px]
  - Preview areas: min-h-[100px]

---

## Notes on TailwindCSS Usage

1. **No Custom CSS**: All styling via utility classes
2. **No CSS Modules**: Global Tailwind imports only
3. **No Styled Components**: Plain className props
4. **Inline Styles**: Used sparingly (e.g., fixed positioning for debug overlay)
5. **JIT Mode**: Tailwind JIT enabled via Vite config
6. **PostCSS**: Configured for Tailwind processing

---

## Future UI Considerations

1. **Dark Mode**: Not implemented, but TailwindCSS supports `dark:` prefix
2. **Themes**: Could be implemented via CSS variables + Tailwind config
3. **Component Library**: Could extract common patterns into reusable components
4. **Animation Library**: Could integrate Framer Motion for richer animations
5. **Icon Library**: Currently uses inline SVGs, could use Heroicons or similar
