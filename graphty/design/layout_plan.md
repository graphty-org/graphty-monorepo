# Figma-Inspired Layout Plan for Graphty Application

## Overview
Create a professional graph visualization application with a layout inspired by Figma's interface. The application will feature a central canvas (graphty-element) surrounded by contextual panels for layer management and styling.

## Layout Structure

### 1. Top Menu Bar
**Location**: Fixed top of the application
**Height**: ~48px

**Components**:
- **Left**: Hamburger menu button (☰) for application settings
- **Center**: Application title/logo "Graphty"
- **Right**: User actions (save, export, share buttons)

**Inspiration**: Figma's top menu bar with file operations

---

### 2. Left Sidebar - Layer Management Panel
**Location**: Left side of the application
**Width**: ~280px (resizable, min: 240px, max: 400px)
**Collapsible**: Yes, with toggle button

#### Tab Structure:
- **Layers Tab** (primary)
- **Assets Tab** (future: templates, saved styles)

#### Layers Panel Features:
**Layer Hierarchy Display**:
- Show StyleTemplate layers in hierarchical tree
- Each layer shows:
  - Visibility toggle (👁️)
  - Layer name (editable)
  - Layer type icon
  - Selector preview

**Layer Controls**:
- Add new layer (+)
- Delete layer (🗑️)
- Duplicate layer
- Reorder layers (drag & drop)
- Lock/unlock layers (🔒)

**Layer Types**:
- Node layers (targeting nodes)
- Edge layers (targeting edges)
- Graph layers (targeting graph properties)

**Visual Indicators**:
- Active layer highlighting
- Layer type icons (circle for nodes, line for edges, graph icon for graph)
- Selector complexity indicator

---

### 3. Main Canvas Area
**Location**: Center of the application
**Responsive**: Takes remaining space after sidebars

#### Canvas Features:
- **graphty-element** takes full canvas area
- Zoom controls (bottom-right corner)
- Mini-map (top-right corner, toggleable)
- Grid/guides toggle
- Canvas background options

#### Canvas Toolbar Integration:
- Tool-specific overlays
- Selection indicators
- Context menus

---

### 4. Right Sidebar - Properties Panel
**Location**: Right side of the application
**Width**: ~320px (resizable, min: 280px, max: 450px)
**Collapsible**: Yes, with toggle button

#### Tab Structure Based on Selection:
- **Design Tab** (layer styling)
- **Data Tab** (node/edge data)
- **Layout Tab** (layout settings)

#### Design Tab Sections:
**When Node Layer Selected**:
- **Transform**: Position, size, rotation
- **Appearance**: Shape, color, border
- **Text**: Label styling, font, size
- **Effects**: Shadows, glow, filters
- **Behavior**: Hover states, interactions

**When Edge Layer Selected**:
- **Stroke**: Width, color, style (solid, dashed)
- **Arrows**: Start/end arrow styles
- **Curvature**: Bezier settings
- **Animation**: Flow effects, particles

**When Graph Layer Selected**:
- **Background**: Color, texture, environment
- **Camera**: Position, angle, movement
- **Physics**: Force settings, collision
- **Performance**: LOD, culling settings

#### Data Tab Sections:
- **Node Data**: CSV import, JSON editor
- **Edge Data**: Relationship editor
- **Data Mapping**: Field assignments
- **Validation**: Data quality checks

#### Layout Tab Sections:
- **Algorithm Selection**: Force-directed, circular, etc.
- **Algorithm Parameters**: Strength, distance, iterations
- **2D/3D Settings**: Dimension-specific options
- **Animation**: Layout transition settings

---

### 5. Bottom Toolbar
**Location**: Fixed bottom of the application
**Height**: ~56px

#### Tool Categories (Left to Right):

**Selection Tools**:
- Move/Select (default) 🖱️
- Multi-select 
- Lasso select

**Navigation Tools**:
- Hand/Pan tool 🤚
- Zoom tool 🔍
- Fit to screen

**Graph Tools**:
- Add node ⚪
- Add edge ↔️
- Delete tool 🗑️

**Layout Tools**:
- Layout algorithm selector dropdown
- Re-run layout button ⟳

**View Controls**:
- **2D/3D Toggle Button** (prominent, right side)
- Grid toggle
- Minimap toggle

**Right Side**:
- View mode selector (edit/present)
- Zoom percentage display
- Fit to screen button

---

## Technical Implementation Plan

### Phase 1: Basic Layout Structure

#### 1.1 Install Dependencies
```bash
npm install lucide-react @tailwindcss/forms clsx
npm install --save-dev @types/react @types/react-dom
```

#### 1.2 Create Layout Components

**AppLayout.tsx** - Main container with CSS Grid:
```tsx
// Location: src/components/layout/AppLayout.tsx
// Features: CSS Grid layout, panel visibility state management
// Grid areas: header, left-sidebar, canvas, right-sidebar, toolbar
// Responsive: Collapses sidebars on mobile (<768px)
// State: useContext for panel visibility
```

**TopMenuBar.tsx** - Header with menu button:
```tsx
// Location: src/components/layout/TopMenuBar.tsx  
// Height: 48px fixed
// Components: Menu button (left), Logo/title (center), Actions (right)
// Icons: Menu (☰), Save, Export, Share
// Styling: Dark theme, shadow, z-index: 50
```

**LeftSidebar.tsx** - Collapsible layer panel:
```tsx
// Location: src/components/layout/LeftSidebar.tsx
// Width: 280px default, resizable 240-400px
// Features: Resize handle, collapse button, tab navigation
// Tabs: Layers (primary), Assets (future)
// Animation: Transform translateX for collapse
// State: Panel width, collapsed state, active tab
```

**RightSidebar.tsx** - Collapsible properties panel:
```tsx
// Location: src/components/layout/RightSidebar.tsx  
// Width: 320px default, resizable 280-450px
// Features: Same as LeftSidebar but right-aligned
// Tabs: Design, Data, Layout (based on selection)
// Animation: Transform translateX for collapse
```

**BottomToolbar.tsx** - Fixed toolbar:
```tsx
// Location: src/components/layout/BottomToolbar.tsx
// Height: 56px fixed  
// Layout: Flexbox with tool groups
// Groups: Selection, Navigation, Graph, Layout, View
// Styling: Glass effect, backdrop-blur, border-top
```

**CanvasArea.tsx** - Wrapper for graphty-element:
```tsx
// Location: src/components/layout/CanvasArea.tsx
// Features: Full remaining space, overflow handling
// Contains: graphty-element, overlay controls (zoom, minimap)
// Ref: Forward ref to graphty-element for external control
// Props: All graphty-element props pass-through
```

#### 1.3 CSS Grid Layout Implementation
```css
/* In AppLayout.tsx styles */
.app-layout {
  display: grid;
  height: 100vh;
  grid-template-columns: [left-start] 280px [left-end canvas-start] 1fr [canvas-end right-start] 320px [right-end];
  grid-template-rows: [header-start] 48px [header-end content-start] 1fr [content-end toolbar-start] 56px [toolbar-end];
  grid-template-areas:
    "header header header"
    "left-sidebar canvas right-sidebar"
    "toolbar toolbar toolbar";
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .app-layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "canvas"
      "toolbar";
  }
}
```

### Phase 2: Layer Management

#### 2.1 State Management Setup
```tsx
// Location: src/context/AppContext.tsx
// Context: LayerContext, ToolContext, UIContext
// State: StyleTemplate, active layer, tool selection, panel states
// Actions: Layer CRUD, tool selection, panel toggle
```

#### 2.2 StyleTemplate Integration
```tsx
// Location: src/hooks/useStyleTemplate.ts
// Features: Connect to graphty-element StyleTemplate
// Methods: getLayers(), addLayer(), updateLayer(), deleteLayer()
// Types: Layer interface, LayerType enum
// Validation: Zod schemas for layer data
```

#### 2.3 Layer UI Components

**LayerItem.tsx** - Individual layer with controls:
```tsx
// Location: src/components/layers/LayerItem.tsx
// Features: 
// - Editable name (double-click or F2)
// - Visibility toggle (eye icon)
// - Lock toggle (lock icon)  
// - Type icon (circle/line/graph)
// - Selection highlighting
// - Context menu (right-click)
// - Drag handle for reordering
// Props: layer object, isSelected, onSelect, onUpdate, onDelete
```

**LayerList.tsx** - Hierarchical layer display:
```tsx  
// Location: src/components/layers/LayerList.tsx
// Features:
// - Virtual scrolling for performance
// - Drag & drop reordering
// - Keyboard navigation (arrow keys)
// - Multi-selection (Ctrl/Cmd+click)
// - Search/filter functionality
// - Empty state handling
```

**LayerControls.tsx** - Add/delete/duplicate:
```tsx
// Location: src/components/layers/LayerControls.tsx
// Buttons: Add Node Layer, Add Edge Layer, Add Graph Layer
// Actions: Duplicate selected, Delete selected, Clear all
// Styling: Icon buttons with tooltips
// Keyboard: Shortcuts (Ctrl+D duplicate, Delete key)
```

#### 2.4 Layer Data Types
```tsx
// Location: src/types/layer.ts
interface Layer {
  id: string;
  name: string;
  type: 'node' | 'edge' | 'graph';
  visible: boolean;
  locked: boolean;
  selector: string;
  style: NodeStyle | EdgeStyle | GraphStyle;
  order: number;
}

enum LayerType {
  NODE = 'node',
  EDGE = 'edge', 
  GRAPH = 'graph'
}
```

### Phase 3: Properties Panel

#### 3.1 Dynamic Property Forms

**NodeStylePanel.tsx** - Node styling controls:
```tsx
// Location: src/components/properties/NodeStylePanel.tsx
// Sections: Transform, Appearance, Text, Effects, Behavior
// Controls: Position (x,y,z), Size (width,height), Shape selector
// Color: Advanced color picker with presets
// Typography: Font family, size, weight, color
// Effects: Shadow, glow, opacity sliders
```

**EdgeStylePanel.tsx** - Edge styling controls:
```tsx
// Location: src/components/properties/EdgeStylePanel.tsx  
// Sections: Stroke, Arrows, Curvature, Animation
// Controls: Width slider, Color picker, Dash pattern
// Arrows: Start/end arrow styles, size
// Curvature: Bezier control points, tension
// Animation: Flow speed, particle effects
```

**GraphStylePanel.tsx** - Graph styling controls:
```tsx
// Location: src/components/properties/GraphStylePanel.tsx
// Sections: Background, Camera, Physics, Performance
// Background: Color, gradient, texture upload
// Camera: Position, FOV, movement constraints
// Physics: Force strength, collision detection
// Performance: LOD settings, culling distance
```

#### 3.2 Reusable Form Components

**ColorPicker.tsx**:
```tsx
// Location: src/components/forms/ColorPicker.tsx
// Features: HSL/RGB/HEX input, presets, eyedropper
// Library: Consider react-colorful or similar
// Props: value, onChange, presets, alpha support
```

**SliderInput.tsx**:
```tsx
// Location: src/components/forms/SliderInput.tsx
// Features: Number input + slider, units, min/max
// Styling: Custom thumb, track, value display
// Props: value, onChange, min, max, step, unit, label
```

**DropdownSelector.tsx**:
```tsx
// Location: src/components/forms/DropdownSelector.tsx
// Features: Search, icons, grouping, keyboard navigation
// Library: Consider headless UI or radix-ui
// Props: options, value, onChange, searchable, icons
```

#### 3.3 Property Panel State Management
```tsx
// Location: src/hooks/usePropertyPanel.ts
// Features: Form state management, validation, debounced updates
// Debounce: 300ms for smooth performance
// Validation: Real-time with error display
// Reset: Ability to reset to defaults
```

### Phase 4: Toolbar Integration

#### 4.1 Tool State Management
```tsx
// Location: src/context/ToolContext.tsx
// State: activeTool, toolSettings, cursorMode
// Tools: select, pan, zoom, addNode, addEdge, delete
// Settings: Tool-specific parameters
// Cursor: Dynamic cursor based on tool + hover state
```

#### 4.2 Tool Components

**ToolButton.tsx**:
```tsx
// Location: src/components/toolbar/ToolButton.tsx
// Features: Icon, label, tooltip, active state, keyboard shortcut
// Props: tool, icon, label, shortcut, isActive, onClick
// Styling: Figma-style button with hover/active states
```

**ToolGroup.tsx**:
```tsx
// Location: src/components/toolbar/ToolGroup.tsx  
// Features: Group of related tools with separator
// Layout: Horizontal flex with gaps
// Props: tools array, group label
```

#### 4.3 2D/3D Toggle Implementation
```tsx
// Location: src/components/toolbar/ViewModeToggle.tsx
// Features: Prominent toggle button, smooth transition
// Integration: Directly updates graphty-element layout2d prop
// Animation: Icon rotation, label change
// State: Synced with graphty-element's current mode
```

#### 4.4 Tool Actions Integration
```tsx
// Location: src/hooks/useToolActions.ts
// Features: Map tool selection to graphty-element interactions
// Methods: handleCanvasClick, handleCanvasDrag, handleKeyPress
// Integration: Event delegation to graphty-element
```

### Phase 5: Polish & UX

#### 5.1 Animations & Transitions
```css
/* Sidebar animations */
.sidebar-enter {
  transform: translateX(-100%);
}
.sidebar-enter-active {
  transform: translateX(0);
  transition: transform 300ms ease-out;
}

/* Panel resize */
.panel-resize {
  transition: width 150ms ease-out;
}

/* Tool selection feedback */
.tool-button {
  transition: all 150ms ease-out;
}
.tool-button:hover {
  transform: scale(1.05);
}
```

#### 5.2 Keyboard Shortcuts Implementation
```tsx
// Location: src/hooks/useKeyboardShortcuts.ts
// Shortcuts:
// - Numbers 1-9: Tool selection
// - Tab: Cycle panel focus
// - Space+drag: Pan canvas
// - Ctrl/Cmd+D: Duplicate layer
// - Delete: Delete selected
// - Escape: Cancel current action
// Features: Conflict resolution, help display
```

#### 5.3 Performance Optimizations
```tsx
// Memoization for expensive renders
const LayerList = React.memo(LayerListComponent);

// Debounced property updates
const debouncedUpdate = useMemo(
  () => debounce(updateProperty, 300),
  [updateProperty]
);

// Virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window';
```

#### 5.4 Error Boundaries & Loading States
```tsx
// Location: src/components/common/ErrorBoundary.tsx
// Features: Graceful error handling, error reporting
// Recovery: Ability to reset component state

// Location: src/components/common/LoadingSpinner.tsx
// Features: Consistent loading indicators
// Usage: During StyleTemplate operations, file loads
```

---

## State Management Strategy

### Global State Architecture (React Context)

#### AppContext.tsx - Main application state:
```tsx
// Location: src/context/AppContext.tsx
interface AppState {
  // UI State
  panels: {
    leftSidebar: { visible: boolean; width: number; activeTab: string };
    rightSidebar: { visible: boolean; width: number; activeTab: string };
    bottomToolbar: { visible: boolean };
  };
  
  // Canvas State  
  canvas: {
    zoom: number;
    pan: { x: number; y: number };
    viewMode: '2d' | '3d';
    selectedElements: string[];
  };
  
  // Graph Data
  graphData: {
    nodes: NodeData[];
    edges: EdgeData[];
    styleTemplate: StyleTemplate;
  };
  
  // Layer Management
  layers: {
    items: Layer[];
    activeLayerId: string | null;
    selectedLayerIds: string[];
  };
  
  // Tool State
  tools: {
    activeTool: ToolType;
    toolSettings: Record<string, any>;
    cursorMode: CursorMode;
  };
}
```

#### ToolContext.tsx - Tool-specific state:
```tsx
// Location: src/context/ToolContext.tsx
interface ToolState {
  activeTool: 'select' | 'pan' | 'zoom' | 'addNode' | 'addEdge' | 'delete';
  toolSettings: {
    select: { multiSelect: boolean };
    addNode: { nodeType: string; defaultStyle: NodeStyle };
    addEdge: { edgeType: string; defaultStyle: EdgeStyle };
  };
  actions: {
    setActiveTool: (tool: ToolType) => void;
    updateToolSettings: (tool: ToolType, settings: any) => void;
    handleCanvasInteraction: (event: CanvasEvent) => void;
  };
}
```

#### LayerContext.tsx - Layer management state:
```tsx
// Location: src/context/LayerContext.tsx
interface LayerState {
  layers: Layer[];
  activeLayer: Layer | null;
  selectedLayers: Layer[];
  actions: {
    addLayer: (type: LayerType, config: Partial<Layer>) => void;
    updateLayer: (id: string, updates: Partial<Layer>) => void;
    deleteLayer: (id: string) => void;
    duplicateLayer: (id: string) => void;
    reorderLayers: (fromIndex: number, toIndex: number) => void;
    setActiveLayer: (id: string) => void;
    toggleLayerVisibility: (id: string) => void;
    toggleLayerLock: (id: string) => void;
  };
}
```

### Local Component State Guidelines:
- **Form Inputs**: Use controlled components with useState
- **Panel Resizing**: Local state for drag operations, sync to global on release
- **Animations**: Local state for transition states
- **Temporary UI**: Hover states, focus, dropdown open/closed

---

## Data Flow & Integration

### Graphty-Element Integration Pattern:
```tsx
// Location: src/hooks/useGraphtyElement.ts
// Purpose: Bridge between React state and graphty-element properties
const useGraphtyElement = (graphtyRef: RefObject<HTMLElement>) => {
  const { graphData, layers, canvas } = useAppContext();
  
  // Sync React state to graphty-element props
  useEffect(() => {
    if (!graphtyRef.current) return;
    
    // Update node/edge data
    graphtyRef.current.setAttribute('node-data', JSON.stringify(graphData.nodes));
    graphtyRef.current.setAttribute('edge-data', JSON.stringify(graphData.edges));
    
    // Update style template
    graphtyRef.current.styleTemplate = layers.items;
    
    // Update layout mode
    graphtyRef.current.layout2d = canvas.viewMode === '2d';
  }, [graphData, layers, canvas]);
  
  // Listen to graphty-element events
  useEffect(() => {
    const element = graphtyRef.current;
    if (!element) return;
    
    const handleNodeClick = (event: CustomEvent) => {
      // Update React state based on graphty-element events
    };
    
    element.addEventListener('node-click', handleNodeClick);
    return () => element.removeEventListener('node-click', handleNodeClick);
  }, []);
};
```

### Layer-Style Mapping:
```tsx
// Location: src/utils/layerStyleMapping.ts
// Purpose: Convert UI layer objects to graphty-element StyleTemplate format
const convertLayersToStyleTemplate = (layers: Layer[]): StyleTemplate => {
  return {
    layers: layers.map(layer => ({
      selector: layer.selector,
      style: layer.style,
      enabled: layer.visible && !layer.locked
    })).sort((a, b) => a.order - b.order)
  };
};
```

---

## File Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx           # Main grid container
│   │   ├── TopMenuBar.tsx          # Header with menu
│   │   ├── LeftSidebar.tsx         # Layer management panel
│   │   ├── RightSidebar.tsx        # Properties panel
│   │   ├── BottomToolbar.tsx       # Tools and controls
│   │   └── CanvasArea.tsx          # Graphty-element wrapper
│   │
│   ├── layers/
│   │   ├── LayerList.tsx           # Virtual scrolled layer list
│   │   ├── LayerItem.tsx           # Individual layer row
│   │   ├── LayerControls.tsx       # Add/delete/duplicate buttons
│   │   └── LayerSearch.tsx         # Filter/search layers
│   │
│   ├── properties/
│   │   ├── PropertyTabs.tsx        # Design/Data/Layout tabs
│   │   ├── NodeStylePanel.tsx      # Node styling controls
│   │   ├── EdgeStylePanel.tsx      # Edge styling controls
│   │   ├── GraphStylePanel.tsx     # Graph styling controls
│   │   └── DataPanel.tsx           # Data import/export
│   │
│   ├── toolbar/
│   │   ├── ToolGroup.tsx           # Group of related tools
│   │   ├── ToolButton.tsx          # Individual tool button
│   │   ├── ViewModeToggle.tsx      # 2D/3D toggle
│   │   └── ZoomControls.tsx        # Zoom in/out/fit
│   │
│   ├── forms/
│   │   ├── ColorPicker.tsx         # Advanced color picker
│   │   ├── SliderInput.tsx         # Number slider combo
│   │   ├── DropdownSelector.tsx    # Searchable dropdown
│   │   ├── NumberInput.tsx         # Number with units
│   │   └── TextInput.tsx           # Text with validation
│   │
│   └── common/
│       ├── ErrorBoundary.tsx       # Error handling
│       ├── LoadingSpinner.tsx      # Loading states
│       ├── Tooltip.tsx             # Consistent tooltips
│       └── Modal.tsx               # Modal dialogs
│
├── context/
│   ├── AppContext.tsx              # Main app state
│   ├── ToolContext.tsx             # Tool selection state
│   ├── LayerContext.tsx            # Layer management state
│   └── ThemeContext.tsx            # Dark/light theme
│
├── hooks/
│   ├── useGraphtyElement.ts        # Graphty-element integration
│   ├── useStyleTemplate.ts         # Layer-style mapping
│   ├── useKeyboardShortcuts.ts     # Global shortcuts
│   ├── useResizablePanel.ts        # Panel resizing logic
│   ├── useDebounce.ts              # Debounced updates
│   └── useLocalStorage.ts          # Persist UI state
│
├── types/
│   ├── layer.ts                    # Layer interfaces
│   ├── tool.ts                     # Tool type definitions
│   ├── canvas.ts                   # Canvas interaction types
│   └── app.ts                      # Main app types
│
├── utils/
│   ├── layerStyleMapping.ts        # Layer-StyleTemplate conversion
│   ├── keyboardShortcuts.ts        # Shortcut definitions
│   ├── colorUtils.ts               # Color manipulation
│   └── validation.ts               # Form validation schemas
│
└── stories/
    ├── Layout.stories.tsx          # Layout component stories
    ├── Layers.stories.tsx          # Layer management stories
    ├── Properties.stories.tsx      # Property panel stories
    └── Toolbar.stories.tsx         # Toolbar stories
```

---

## Testing Strategy

### Unit Tests (Vitest + React Testing Library):
```tsx
// Location: src/components/layers/__tests__/LayerItem.test.tsx
// Test: Layer visibility toggle, name editing, drag handles
// Coverage: User interactions, keyboard navigation, accessibility

// Location: src/hooks/__tests__/useStyleTemplate.test.ts  
// Test: Layer-to-StyleTemplate conversion, validation
// Coverage: Edge cases, error handling, performance

// Location: src/context/__tests__/AppContext.test.tsx
// Test: State management, action dispatching, side effects
// Coverage: Context provider, reducer logic, persistence
```

### Integration Tests:
```tsx
// Location: src/__tests__/LayerManagement.integration.test.tsx
// Test: Full layer CRUD workflow with graphty-element
// Coverage: Add layer → Style layer → Apply to graph → Visual verification

// Location: src/__tests__/ToolInteraction.integration.test.tsx  
// Test: Tool selection → Canvas interaction → State updates
// Coverage: Tool switching, canvas events, property updates
```

### Storybook Visual Tests:
```tsx
// Location: src/stories/AppLayout.stories.tsx
// Test: Responsive layout, panel collapse/expand, theme switching
// Coverage: Mobile breakpoints, dark/light modes, accessibility

// Location: src/stories/PropertyPanels.stories.tsx
// Test: Different layer types, form validation, real-time updates  
// Coverage: All style property combinations, error states
```

### E2E Tests (Playwright):
```tsx
// Location: tests/e2e/complete-workflow.spec.ts
// Test: Load app → Create layers → Style graph → Export result
// Coverage: Full user journey, performance, cross-browser

// Location: tests/e2e/keyboard-navigation.spec.ts
// Test: Navigate entire app using only keyboard
// Coverage: Accessibility compliance, tab order, shortcuts
```

---

## Styling Approach

### CSS Framework Setup:
```bash
# Install Tailwind CSS with forms plugin
npm install -D tailwindcss @tailwindcss/forms autoprefixer postcss
npx tailwindcss init -p
```

### Tailwind Configuration:
```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Figma-inspired color palette
        gray: {
          50: '#f8f9fa',
          100: '#f1f3f4', 
          200: '#e8eaed',
          300: '#dadce0',
          400: '#bdc1c6',
          500: '#9aa0a6',
          600: '#80868b',
          700: '#5f6368',
          800: '#3c4043',
          900: '#202124',
        },
        primary: {
          50: '#e3f2fd',
          500: '#2196f3',
          600: '#1e88e5',
          700: '#1976d2',
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      }
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
```

### Design System:
- **Color Palette**: Professional gray scale with blue accents
- **Typography**: Inter font family, consistent hierarchy
- **Spacing**: 8px base grid (0.5rem increments)
- **Icons**: Lucide React (consistent stroke, size)
- **Shadows**: Subtle elevation system (4 levels)
- **Border Radius**: Consistent 0.375rem (6px) rounded corners

### Component CSS Architecture:
```tsx
// Pattern: Tailwind + CSS Modules for complex components
// Base classes in Tailwind, component-specific in modules

// Example: LayerItem.module.css
.layerItem {
  @apply flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800;
  transition: background-color 0.15s ease;
}

.layerItem.selected {
  @apply bg-primary-50 dark:bg-primary-900 border-l-2 border-primary-500;
}

.dragHandle {
  @apply opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing;
  transition: opacity 0.15s ease;
}
```

---

## Accessibility Considerations

- **Keyboard Navigation**: Full app navigation via keyboard
- **Screen Reader Support**: ARIA labels and roles
- **Focus Management**: Logical tab order
- **High Contrast**: Support for reduced vision
- **Reduced Motion**: Respect prefers-reduced-motion

---

## Future Enhancements

### Advanced Features:
- **Multiple canvas tabs**
- **Layer grouping and nesting**
- **Style templates and presets**
- **Collaborative editing**
- **Plugin system**
- **Advanced data connectors**

### Performance Optimizations:
- **Virtual scrolling** for large layer lists
- **Debounced property updates**
- **Canvas rendering optimizations**
- **Memory management** for large graphs

---

---

## Development Workflow

### Phase Implementation Order:
1. **Phase 1**: Basic layout structure (1-2 days)
   - Get the grid layout working with placeholder content
   - Implement panel collapse/expand
   - Set up routing and basic navigation

2. **Phase 2**: Layer management (2-3 days)  
   - Connect to graphty-element StyleTemplate
   - Build layer CRUD operations
   - Implement layer list with basic interactions

3. **Phase 3**: Properties panel (3-4 days)
   - Create dynamic property forms
   - Build reusable form components  
   - Connect property changes to layer updates

4. **Phase 4**: Toolbar integration (2-3 days)
   - Implement tool selection state
   - Add 2D/3D toggle functionality
   - Connect tools to canvas interactions

5. **Phase 5**: Polish & UX (2-3 days)
   - Add animations and transitions
   - Implement keyboard shortcuts
   - Performance optimization and testing

### Git Workflow:
```bash
# Feature branch naming
git checkout -b feature/phase-1-layout
git checkout -b feature/layer-management  
git checkout -b feature/properties-panel

# Commit message format
feat(layout): add basic grid layout with collapsible panels
fix(layers): resolve layer deletion state sync issue
docs(readme): update component architecture section
```

### Code Review Checklist:
- [ ] Component follows file structure conventions
- [ ] TypeScript interfaces defined for all props/state
- [ ] Accessibility attributes (ARIA labels, roles)
- [ ] Unit tests for complex logic
- [ ] Storybook story created for UI components
- [ ] Performance considerations (memoization, debouncing)
- [ ] Error handling and loading states
- [ ] Mobile responsiveness tested

---

## Deployment & Build

### Build Configuration:
```json
// package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build", 
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "storybook": "storybook dev -p 9035",
    "build-storybook": "storybook build",
    "lint": "eslint && tsc --noEmit",
    "type-check": "tsc --noEmit"
  }
}
```

### Environment Variables:
```bash
# .env.development
VITE_GRAPHTY_ELEMENT_PATH=/dist/graphty.js
VITE_API_BASE_URL=http://localhost:3001
VITE_ENABLE_ERUDA=true

# .env.production  
VITE_GRAPHTY_ELEMENT_PATH=/dist/graphty.js
VITE_API_BASE_URL=https://api.graphty.com
VITE_ENABLE_ERUDA=false
```

### Performance Targets:
- **Initial Load**: < 3 seconds on 3G
- **Layer Operations**: < 100ms response time  
- **Canvas Interactions**: 60 FPS smooth animations
- **Memory Usage**: < 50MB for 1000-node graphs
- **Bundle Size**: < 500KB gzipped (excluding graphty-element)

---

## Success Criteria

### Functional Requirements:
- [x] **Layout**: Responsive Figma-inspired 4-panel layout
- [x] **Layer Management**: Full CRUD operations on StyleTemplate layers
- [x] **Properties**: Dynamic forms for all style properties
- [x] **Tools**: Working toolbar with 2D/3D toggle
- [x] **Integration**: Seamless React ↔ graphty-element data flow

### User Experience Requirements:
- [x] **Performance**: Smooth 60fps interactions
- [x] **Accessibility**: Full keyboard navigation + screen reader support
- [x] **Responsive**: Works on desktop, tablet, mobile  
- [x] **Professional**: Figma-quality visual design
- [x] **Intuitive**: New users can create styled graphs in < 5 minutes

### Technical Requirements:
- [x] **Type Safety**: 100% TypeScript coverage
- [x] **Testing**: >80% code coverage with unit + integration tests
- [x] **Documentation**: Complete Storybook documentation
- [x] **Performance**: Lighthouse score >90 in all categories
- [x] **Maintainability**: Clean architecture with separation of concerns

---

This comprehensive plan provides Claude Code with all the specific implementation details needed to successfully build a professional, Figma-inspired graph visualization application. Each phase has clear deliverables, technical specifications, and success criteria to ensure consistent progress toward the final goal.