# Pop-out Panel Component Design

## 1. Overview

This document specifies the design for a reusable Pop-out Panel component for Graphty's UI. The component follows Figma's established pattern for progressive disclosure of advanced settings, allowing complex configuration interfaces to be hidden behind simple trigger elements while remaining easily accessible.

### 1.1 Purpose

The Pop-out Panel provides a floating, draggable panel that:

- Displays advanced settings without cluttering the main sidebar
- Supports nested/recursive panels for deep configuration hierarchies
- Maintains a professional appearance consistent with industry-standard design tools

### 1.2 Primary Use Cases

Based on the progressive disclosure design document, the pop-out panel will be used for:

1. **Label Settings** (Node Properties) - Position, Style, and Advanced tabs
2. **Tooltip Settings** (Node Properties) - Same structure as Label
3. **Label Settings** (Edge Properties) - Same structure as Node Label
4. **Tooltip Settings** (Edge Properties) - Same structure as Node Tooltip
5. **Color Picker** - Custom colors and library colors with ability to create new named colors
6. **Future extensibility** - Any advanced settings that benefit from progressive disclosure

---

## 2. Requirements

The following requirements were gathered through iterative discussion and analysis of Figma's UI patterns.

### 2.1 Positioning Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R1 | **Initial Alignment**: When opened from a right-side panel, the pop-out's right edge aligns with the left edge of the triggering panel. This positions the pop-out to the left of the sidebar, not overlapping it. | User clarification |
| R2 | **Nested Stacking**: Pop-outs can open recursively from other pop-outs. Each nested pop-out aligns side-by-side with its parent, creating a horizontal chain of panels. | User clarification |
| R16 | **Screen Bounds**: Pop-outs may be dragged partially off-screen. No automatic snapping or constraint to viewport bounds. | User clarification |

### 2.2 Size Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R3 | **Variable Width**: Each pop-out instance has its own content-specific width. There is no global fixed width - the width is determined by the content and specified per-usage. | User clarification |

### 2.3 Multi-Instance Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R4 | **Multiple Open**: Multiple pop-outs can be open simultaneously. Opening one pop-out does not automatically close others (unless they are unrelated and click-outside applies). | User clarification |
| R5 | **Independent Dragging**: Each open pop-out can be dragged independently to any position on the screen. | User clarification |
| R6 | **Drag Reset on Reopen**: When a pop-out is closed and reopened, it returns to its original default position (the calculated initial alignment position), not the last dragged position. | User clarification |

### 2.4 Responsive Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R7 | **No Responsive Adaptation**: The pop-out always renders as a floating panel. It does not transform into a drawer, modal, or other component on narrow viewports. | User clarification |

### 2.5 State Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R8 | **No Tab State Persistence**: When a pop-out with tabs is closed and reopened, it always opens to the default/first tab. The previously selected tab is not remembered. | User clarification |

### 2.6 Header Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R9 | **Simple Header Variant**: Header with format: `<Title> <optional action buttons> <close X button>`. Title is left-aligned, buttons and close are right-aligned. | User clarification |
| R10 | **Tabbed Header Variant**: Header with format: `<Tab1> <Tab2> ... <optional action buttons> <close X button>`. Tabs replace the title and are left-aligned. | User clarification |

### 2.7 Trigger Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R11 | **Flexible Trigger Elements**: The trigger that opens a pop-out can be any interactive element: a gear icon, color swatch, "four circles" icon, plus button, text link, etc. The component does not prescribe a specific trigger appearance. | User clarification |

### 2.8 Content Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R12 | **Optional Tabs**: Pop-out content may or may not include tabs. Simple pop-outs may have direct content without tabbed organization. | User clarification |

### 2.9 Interaction Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R13 | **Drag Handle Area**: The entire pop-out panel acts as a drag handle, including the header, background areas, buttons, and tabs. Only text input fields are excluded from drag initiation. | User clarification |
| R14 | **Click Outside Closes**: Clicking outside a pop-out closes it. If the pop-out has nested children, all children close as well. Clicking inside a child pop-out does not count as "outside" the parent. | User clarification |
| R15 | **Z-Index on Focus**: Clicking on a pop-out that is behind another brings it to the front (highest z-index among pop-outs). | User clarification |
| R17 | **Instant Open/Close**: Pop-outs appear and disappear instantly with no animation. | User clarification |
| R18 | **No Backdrop**: No dimming, overlay, or backdrop appears behind pop-outs. The main UI remains fully visible and interactive (except for click-outside behavior). | User clarification |
| R19 | **Escape Key Behavior**: Pressing Escape closes the currently focused pop-out. If that pop-out has child pop-outs, they close as well. Parent pop-outs remain open. | User clarification |

---

## 3. Component Architecture

### 3.1 Component Hierarchy

```
PopoutManager (Context Provider)
│
├── PopoutTrigger
│   └── [trigger element - button, icon, swatch, etc.]
│
└── PopoutPanel (Portal to document.body)
    ├── PopoutHeader
    │   ├── PopoutTitle OR PopoutTabs
    │   ├── PopoutHeaderActions (optional buttons)
    │   └── PopoutCloseButton
    │
    └── PopoutContent
        └── [arbitrary content]
```

### 3.2 Component Descriptions

#### 3.2.1 PopoutManager

**Purpose**: Provides React context for coordinating multiple pop-out instances.

**Responsibilities**:
- Track all registered pop-out instances
- Manage z-index ordering (bring-to-front behavior)
- Track parent-child relationships for nested pop-outs
- Handle global click-outside detection
- Handle global Escape key detection

**Context Value**:
```typescript
interface PopoutManagerContextValue {
  // Registration
  registerPopout: (config: PopoutRegistration) => PopoutId;
  unregisterPopout: (id: PopoutId) => void;

  // Z-index management
  bringToFront: (id: PopoutId) => void;
  getZIndex: (id: PopoutId) => number;

  // Hierarchy management
  setParent: (childId: PopoutId, parentId: PopoutId) => void;
  getChildren: (id: PopoutId) => PopoutId[];
  getParent: (id: PopoutId) => PopoutId | null;

  // Close operations
  closePopout: (id: PopoutId) => void;
  closeWithDescendants: (id: PopoutId) => void;

  // Focus tracking
  focusedPopoutId: PopoutId | null;
  setFocusedPopout: (id: PopoutId | null) => void;
}
```

#### 3.2.2 PopoutTrigger

**Purpose**: Wraps the element that triggers a pop-out to open.

**Responsibilities**:
- Render the trigger element (passed as children or render prop)
- Handle click to open the associated pop-out
- Provide ref for position calculation
- Track open/closed state

**Props**:
```typescript
interface PopoutTriggerProps {
  children: ReactNode | ((props: TriggerRenderProps) => ReactNode);
  popoutId?: string;  // Optional explicit ID for reference
}

interface TriggerRenderProps {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  triggerRef: RefObject<HTMLElement>;
}
```

#### 3.2.3 PopoutPanel

**Purpose**: The floating panel container rendered via portal.

**Responsibilities**:
- Render panel at calculated position (portal to body)
- Handle dragging (position state)
- Register/unregister with PopoutManager
- Handle click events for z-index management
- Provide panel ref for nested pop-out positioning

**Props**:
```typescript
interface PopoutPanelProps {
  // Content
  children: ReactNode;

  // Sizing
  width?: number | string;  // Required - content-specific
  minHeight?: number | string;
  maxHeight?: number | string;

  // Header configuration
  header: PopoutHeaderConfig;

  // Hierarchy
  parentPopoutId?: PopoutId;  // For nested pop-outs

  // Callbacks
  onClose?: () => void;
  onOpen?: () => void;
}

type PopoutHeaderConfig =
  | { variant: 'title'; title: string; actions?: ReactNode }
  | { variant: 'tabs'; tabs: PopoutTabConfig[]; actions?: ReactNode; defaultTab?: string };

interface PopoutTabConfig {
  id: string;
  label: string;
  content: ReactNode;
}
```

#### 3.2.4 PopoutHeader

**Purpose**: Renders the header bar with title/tabs, actions, and close button.

**Responsibilities**:
- Render title OR tabs based on variant
- Render optional action buttons
- Render close button
- Handle tab selection (internal state, not persisted)

#### 3.2.5 PopoutContent

**Purpose**: Container for the pop-out body content.

**Responsibilities**:
- Render content with appropriate padding
- Handle overflow/scrolling if content exceeds maxHeight

### 3.3 Compound Component API

The components work together as a compound component pattern:

```tsx
<PopoutManager>
  <Popout>
    <Popout.Trigger>
      <ActionIcon><IconSettings /></ActionIcon>
    </Popout.Trigger>

    <Popout.Panel
      width={320}
      header={{ variant: 'title', title: 'Label Settings' }}
    >
      <Popout.Content>
        {/* Panel content */}
      </Popout.Content>
    </Popout.Panel>
  </Popout>
</PopoutManager>
```

Or with tabs:

```tsx
<Popout>
  <Popout.Trigger>
    <ActionIcon><IconSettings /></ActionIcon>
  </Popout.Trigger>

  <Popout.Panel
    width={280}
    header={{
      variant: 'tabs',
      tabs: [
        { id: 'position', label: 'Position', content: <PositionTab /> },
        { id: 'style', label: 'Style', content: <StyleTab /> },
        { id: 'advanced', label: 'Advanced', content: <AdvancedTab /> },
      ],
      actions: <ActionIcon><IconPlus /></ActionIcon>
    }}
  />
</Popout>
```

---

## 4. Detailed Design

### 4.1 Positioning System

#### 4.1.1 Initial Position Calculation

**Algorithm for right-side panel trigger**:

```
triggerRect = trigger element's bounding rect
panelWidth = pop-out panel width

initialX = triggerRect.left - panelWidth - GAP
initialY = triggerRect.top

where GAP = 8px (small spacing between panel edge and pop-out)
```

**Satisfies**: R1 (Initial Alignment)

**For nested pop-outs** (triggered from within another pop-out):

```
parentPanelRect = parent pop-out's bounding rect
childPanelWidth = child pop-out panel width

initialX = parentPanelRect.left - childPanelWidth - NESTED_GAP
initialY = triggerRect.top  // Align with trigger vertically

where NESTED_GAP = 4px (tighter spacing for nested panels)
```

**Satisfies**: R2 (Nested Stacking)

#### 4.1.2 Position State Management

Each pop-out maintains its own position state:

```typescript
interface PopoutPositionState {
  // Calculated default position (from trigger)
  defaultPosition: { x: number; y: number };

  // Current position (may differ if dragged)
  currentPosition: { x: number; y: number };

  // Whether currently being dragged
  isDragging: boolean;
}
```

**On open**: `currentPosition` is set to `defaultPosition`
**On drag**: `currentPosition` is updated
**On close + reopen**: `currentPosition` is reset to `defaultPosition`

**Satisfies**: R6 (Drag Reset on Reopen)

#### 4.1.3 No Boundary Constraints

Position updates during drag have no viewport boundary checks. The panel may be dragged partially or fully off-screen.

**Satisfies**: R16 (Screen Bounds)

### 4.2 Drag System

#### 4.2.1 Drag Initiation

Drag is initiated on `pointerdown` event with the following conditions:

```typescript
function shouldInitiateDrag(event: PointerEvent): boolean {
  const target = event.target as HTMLElement;

  // Don't drag from text inputs
  if (target.tagName === 'INPUT' && target.type === 'text') return false;
  if (target.tagName === 'TEXTAREA') return false;
  if (target.isContentEditable) return false;

  // Allow drag from everything else
  return true;
}
```

**Satisfies**: R13 (Drag Handle Area)

#### 4.2.2 Drag Implementation

```typescript
function usePanelDrag(panelRef: RefObject<HTMLElement>) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panelX: 0, panelY: 0 });

  const handlePointerDown = (e: PointerEvent) => {
    if (!shouldInitiateDrag(e)) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panelX: position.x,
      panelY: position.y,
    };

    // Capture pointer for reliable tracking
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    setPosition({
      x: dragStartRef.current.panelX + deltaX,
      y: dragStartRef.current.panelY + deltaY,
    });
  };

  const handlePointerUp = (e: PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return { position, isDragging, handlers: { handlePointerDown, handlePointerMove, handlePointerUp } };
}
```

**Satisfies**: R5 (Independent Dragging)

### 4.3 Z-Index Management

#### 4.3.1 Z-Index Strategy

Pop-outs use a dedicated z-index range to avoid conflicts with other UI elements:

```typescript
const POPOUT_Z_INDEX_BASE = 1000;
const POPOUT_Z_INDEX_MAX = 1100;
```

The PopoutManager maintains an ordered list of open pop-outs:

```typescript
interface PopoutManagerState {
  // Ordered from back to front (last item has highest z-index)
  openPopouts: PopoutId[];
}
```

Z-index calculation:

```typescript
function getZIndex(id: PopoutId, openPopouts: PopoutId[]): number {
  const index = openPopouts.indexOf(id);
  return POPOUT_Z_INDEX_BASE + index;
}
```

#### 4.3.2 Bring to Front

When a pop-out is clicked (anywhere within it):

```typescript
function bringToFront(id: PopoutId) {
  setOpenPopouts(prev => {
    const filtered = prev.filter(p => p !== id);
    return [...filtered, id];  // Move to end (highest z-index)
  });
}
```

**Satisfies**: R15 (Z-Index on Focus)

### 4.4 Hierarchy Management

#### 4.4.1 Parent-Child Tracking

The PopoutManager tracks parent-child relationships:

```typescript
interface PopoutHierarchy {
  // Map of child ID -> parent ID
  parents: Map<PopoutId, PopoutId>;
}

function setParent(childId: PopoutId, parentId: PopoutId) {
  hierarchy.parents.set(childId, parentId);
}

function getDescendants(id: PopoutId): PopoutId[] {
  const descendants: PopoutId[] = [];
  const children = getDirectChildren(id);

  for (const child of children) {
    descendants.push(child);
    descendants.push(...getDescendants(child));  // Recursive
  }

  return descendants;
}

function getDirectChildren(id: PopoutId): PopoutId[] {
  return Array.from(hierarchy.parents.entries())
    .filter(([_, parentId]) => parentId === id)
    .map(([childId]) => childId);
}
```

#### 4.4.2 Cascading Close

When a pop-out is closed, all descendants close too:

```typescript
function closeWithDescendants(id: PopoutId) {
  const descendants = getDescendants(id);

  // Close in reverse order (deepest first)
  for (const descendantId of descendants.reverse()) {
    closePopout(descendantId);
  }

  closePopout(id);
}
```

**Satisfies**: R14 (Click Outside Closes - with children), R19 (Escape Key Behavior)

### 4.5 Click Outside Detection

#### 4.5.1 Implementation

Click-outside is handled at the PopoutManager level with a global listener:

```typescript
function useClickOutside() {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // Find which pop-out (if any) was clicked
      const clickedPopoutId = findContainingPopout(target);

      if (clickedPopoutId === null) {
        // Clicked outside all pop-outs - close all
        closeAllPopouts();
      } else {
        // Clicked inside a pop-out - close any that are not ancestors of clicked
        closeUnrelatedPopouts(clickedPopoutId);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
}

function findContainingPopout(element: HTMLElement): PopoutId | null {
  let current: HTMLElement | null = element;

  while (current) {
    const popoutId = current.dataset.popoutId;
    if (popoutId) return popoutId;
    current = current.parentElement;
  }

  return null;
}

function closeUnrelatedPopouts(clickedId: PopoutId) {
  // Get the clicked pop-out and all its ancestors
  const clickedAndAncestors = new Set<PopoutId>();
  let current: PopoutId | null = clickedId;

  while (current) {
    clickedAndAncestors.add(current);
    current = getParent(current);
  }

  // Close pop-outs that are not in this ancestry chain
  for (const id of openPopouts) {
    if (!clickedAndAncestors.has(id) && !isAncestorOf(id, clickedId)) {
      closeWithDescendants(id);
    }
  }
}
```

**Key behavior**: Clicking inside a child pop-out does NOT close the parent, because the parent is an ancestor of the clicked pop-out.

**Satisfies**: R14 (Click Outside Closes)

### 4.6 Escape Key Handling

```typescript
function useEscapeKey() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && focusedPopoutId) {
        closeWithDescendants(focusedPopoutId);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedPopoutId]);
}
```

**Satisfies**: R19 (Escape Key Behavior)

### 4.7 Focus Tracking

A pop-out becomes "focused" when:
1. It is opened
2. It is clicked (bringing it to front)
3. It receives keyboard focus (tab navigation into it)

```typescript
function useFocusTracking(id: PopoutId, panelRef: RefObject<HTMLElement>) {
  const { setFocusedPopout } = usePopoutManager();

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    function handleFocus() {
      setFocusedPopout(id);
    }

    function handleClick() {
      setFocusedPopout(id);
    }

    panel.addEventListener('focusin', handleFocus);
    panel.addEventListener('mousedown', handleClick);

    return () => {
      panel.removeEventListener('focusin', handleFocus);
      panel.removeEventListener('mousedown', handleClick);
    };
  }, [id, setFocusedPopout]);
}
```

### 4.8 Header Design

#### 4.8.1 Simple Header Layout

```
┌─────────────────────────────────────────────────────┐
│ [Title text                    ] [btn] [btn] [  X ] │
│ ←─────── flex-grow ──────────→   ←── flex-end ──→  │
└─────────────────────────────────────────────────────┘
```

CSS structure:
```css
.popout-header {
  display: flex;
  align-items: center;
  padding: 8px 8px 8px 12px;
  border-bottom: 1px solid var(--border-color);
}

.popout-title {
  flex: 1;
  font-weight: 500;
  font-size: 13px;
}

.popout-header-actions {
  display: flex;
  gap: 4px;
  margin-right: 4px;
}

.popout-close-button {
  /* ActionIcon styling */
}
```

**Satisfies**: R9 (Simple Header Variant)

#### 4.8.2 Tabbed Header Layout

```
┌─────────────────────────────────────────────────────┐
│ [Tab1] [Tab2] [Tab3]             [btn] [btn] [  X ] │
│ ←─── tabs ────────→   spacer     ←── flex-end ──→  │
└─────────────────────────────────────────────────────┘
```

CSS structure:
```css
.popout-header-tabbed {
  display: flex;
  align-items: center;
  padding: 0 8px 0 0;
  border-bottom: 1px solid var(--border-color);
}

.popout-tabs {
  display: flex;
}

.popout-tab {
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 2px solid transparent;
}

.popout-tab--active {
  border-bottom-color: var(--accent-color);
}

.popout-header-spacer {
  flex: 1;
}
```

**Satisfies**: R10 (Tabbed Header Variant)

#### 4.8.3 Tab State Management

Tab state is local to the component instance and resets on close:

```typescript
function PopoutTabs({ tabs, defaultTab }: PopoutTabsProps) {
  // Local state - not persisted or lifted
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id);

  // No effect to persist - intentionally ephemeral

  return (
    <>
      <TabList tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <TabContent tabs={tabs} activeTab={activeTab} />
    </>
  );
}
```

**Satisfies**: R8 (No Tab State Persistence)

### 4.9 Styling

#### 4.9.1 Visual Appearance

```css
.popout-panel {
  background: var(--mantine-color-body);
  border: 1px solid var(--mantine-color-default-border);
  border-radius: 8px;
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1);

  /* No animation - instant appearance */
  /* Satisfies R17 */
}
```

**Satisfies**: R17 (Instant Open/Close), R18 (No Backdrop)

#### 4.9.2 Content Area

```css
.popout-content {
  padding: 12px;
  overflow-y: auto;
}
```

### 4.10 Portal Rendering

Pop-outs render via React Portal to `document.body` to ensure:
- Proper stacking context (z-index works correctly)
- No clipping by parent overflow
- Independent positioning from DOM hierarchy

```tsx
function PopoutPanel({ children, ...props }: PopoutPanelProps) {
  const portalContainer = document.body;

  return createPortal(
    <div
      className="popout-panel"
      data-popout-id={id}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: getZIndex(id),
      }}
    >
      {children}
    </div>,
    portalContainer
  );
}
```

---

## 5. Requirement Traceability Matrix

| Requirement | Design Section | Implementation Notes |
|-------------|----------------|---------------------|
| R1: Initial Alignment | 4.1.1 | Position calc uses trigger rect and panel width |
| R2: Nested Stacking | 4.1.1 | Nested panels offset from parent's left edge |
| R3: Variable Width | 3.2.3 | Width is a required prop, content-specific |
| R4: Multiple Open | 4.3.1 | PopoutManager tracks array of open popouts |
| R5: Independent Dragging | 4.2.2 | Each panel has own position state |
| R6: Drag Reset on Reopen | 4.1.2 | currentPosition resets to defaultPosition on open |
| R7: No Responsive Adaptation | - | No responsive code; always renders as popover |
| R8: No Tab State Persistence | 4.8.3 | Tab state is local useState, no persistence |
| R9: Simple Header Variant | 4.8.1 | Title + actions + close layout |
| R10: Tabbed Header Variant | 4.8.2 | Tabs + actions + close layout |
| R11: Flexible Trigger Elements | 3.2.2 | Trigger accepts any ReactNode via children |
| R12: Optional Tabs | 3.2.3 | header.variant determines tabs vs title |
| R13: Drag Handle Area | 4.2.1 | shouldInitiateDrag excludes only text inputs |
| R14: Click Outside Closes | 4.5.1 | Global listener with hierarchy-aware closing |
| R15: Z-Index on Focus | 4.3.2 | bringToFront moves to end of ordered array |
| R16: Screen Bounds | 4.1.3 | No boundary constraints in drag |
| R17: Instant Open/Close | 4.9.1 | No CSS transitions on panel |
| R18: No Backdrop | 4.9.1 | No overlay element rendered |
| R19: Escape Key Behavior | 4.6 | Closes focused popout and descendants |

---

## 6. Library Research and Recommendations

### 6.1 Research Summary

A comprehensive evaluation of existing libraries was conducted to determine which could reduce implementation and maintenance effort. Libraries were evaluated against our 19 requirements.

### 6.2 Libraries Evaluated

#### 6.2.1 Purpose-Built Floating Panel Solutions

| Library | Downloads/Week | GitHub Stars | Last Updated | Verdict |
|---------|---------------|--------------|--------------|---------|
| `@zag-js/floating-panel` | ~868 | 4.9k (monorepo) | Active (days) | **Best match** |
| `@ark-ui/react` | Higher | 3.5k | Active | Good alternative |

**Zag.js Floating Panel** is explicitly designed to match Figma's floating panel pattern. It provides:
- ✅ Draggable panels with pointer capture
- ✅ Optional resize (can be disabled)
- ✅ Minimize/maximize/restore states
- ✅ Escape key to close
- ✅ Position/size controlled or uncontrolled modes
- ✅ Grid snapping support
- ✅ `data-topmost`/`data-behind` attributes for z-index tracking
- ✅ Framework agnostic (state machine based)
- ✅ Headless (no styling opinions)

**Gaps vs our requirements:**
- ❌ No built-in nested panel hierarchy management
- ❌ No built-in click-outside with hierarchy awareness
- ❌ No built-in parent-child relationship tracking

**Ark UI** is a higher-level component library built on Zag.js. It provides pre-built React components with nested popover support (`data-nested`, `data-has-nested` attributes, `--nested-layer-count` CSS variable). However, it has known issues with nested dialogs on touch screens.

#### 6.2.2 Drag-Focused Libraries

| Library | Downloads/Week | GitHub Stars | Last Updated | Best For |
|---------|---------------|--------------|--------------|----------|
| `react-draggable` | ~1.86M | 9,264 | 6 months | Simple drag |
| `react-rnd` | ~286K | 4,269 | 10 months | Drag + resize |
| `dnd-kit` | High | Very active | Active | Drag-and-drop lists |

**react-draggable** is the most popular draggable library but only provides drag functionality—no popover, z-index, or hierarchy logic. It also has reported issues with React 19.

**react-rnd** combines drag and resize in one package with bounds constraints and grid snapping, but lacks popover/positioning logic.

**dnd-kit** is modern and performant but designed for drag-and-drop lists, not floating panels. It would be overkill for our use case.

#### 6.2.3 Positioning Libraries

| Library | Purpose | Notes |
|---------|---------|-------|
| `@floating-ui/react` | Anchored positioning with collision detection | Not needed—our requirements allow off-screen positioning (R16) |

**@floating-ui/react** excels at calculating initial positions with collision detection, but since our requirements explicitly allow panels to be dragged off-screen (R16) and we don't need flip/shift behavior, our positioning logic is simple enough to implement directly:

```typescript
// Simple position calculation - no library needed
const triggerRect = triggerRef.current.getBoundingClientRect();
const initialX = triggerRect.left - panelWidth - GAP;
const initialY = triggerRect.top;
```

#### 6.2.4 Component Libraries with Known Issues

| Library | Issue |
|---------|-------|
| Radix UI Primitives | Known issues with nested Popover in Dialog ([#2121](https://github.com/radix-ui/primitives/issues/2121)), z-index conflicts ([#1317](https://github.com/radix-ui/primitives/issues/1317)) |
| Mantine Popover/Modal | No native draggable support; nested popovers require `withinPortal: false`; workarounds don't work in React 19 |

### 6.3 Requirement Coverage Analysis

| Requirement | Zag.js | react-draggable | Custom Only |
|-------------|--------|-----------------|-------------|
| R1: Initial alignment | ❌ Manual | ❌ | ✅ (simple calc) |
| R2: Nested stacking | ❌ | ❌ | ✅ |
| R5: Independent drag | ✅ | ✅ | ✅ |
| R6: Drag reset | ✅ | ❌ Manual | ✅ |
| R13: Drag handle area | ✅ | ✅ | ✅ |
| R14: Click outside + hierarchy | ❌ | ❌ | ✅ |
| R15: Z-index on focus | Partial | ❌ | ✅ |
| R19: Escape + children | Partial | ❌ | ✅ |

**Key insight**: No library fully handles our hierarchy-aware requirements (R2, R14, R19). These must be built custom regardless of library choice. Initial positioning (R1) is simple enough to implement without a library since we don't need collision detection.

### 6.4 Recommended Approach

**Use `@zag-js/floating-panel` + `@zag-js/react` for individual panel behavior, with a custom `PopoutManager` context for multi-panel coordination.**

#### 6.4.1 Rationale

1. **Figma-inspired design**: Zag.js explicitly models their floating panel after Figma's pattern—the exact behavior we're replicating.

2. **State machine robustness**: Zag uses XState-style state machines, reducing edge-case bugs in complex drag/resize interactions.

3. **Active maintenance**: Updated within days, backed by the Chakra UI team with long-term support.

4. **Headless architecture**: Works with Mantine styling without conflicts or wrapper components.

5. **Effort reduction**: The ~70% of requirements that Zag handles (drag, resize disable, escape, position management) would take significant effort to build and maintain ourselves.

6. **Custom layer is necessary anyway**: The ~30% we must build (hierarchy tracking, click-outside with ancestry, z-index coordination) is not provided by any library—this is novel to our requirements.

#### 6.4.2 Alternative Approaches Considered

**Option B: react-draggable + Custom**
- More popular library for drag functionality
- More integration work required
- react-draggable has React 19 compatibility issues
- No built-in state management
- Would need custom position calculation (same as recommended approach)

**Option C: Fully Custom**
- Complete control
- Most development effort
- Must maintain drag logic and edge cases ourselves

### 6.5 Architecture with Zag.js

The recommended architecture layers our custom coordination on top of Zag.js:

```
┌─────────────────────────────────────────────────────────┐
│                    PopoutManager                         │
│  (Custom React Context)                                  │
│  - Parent-child hierarchy tracking                       │
│  - Click-outside with ancestry awareness                 │
│  - Z-index coordination across panels                    │
│  - Escape key with descendant closing                    │
│  - Focus tracking                                        │
│  - Initial position calculation (simple getBoundingClientRect) │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              @zag-js/floating-panel                      │
│  (Per-panel behavior)                                    │
│  - Drag with pointer capture                             │
│  - Position state management                             │
│  - Escape key (single panel)                             │
│  - data-topmost/data-behind attributes                   │
└─────────────────────────────────────────────────────────┘
```

**Note**: Initial position calculation uses simple `getBoundingClientRect()` math rather than a positioning library, since our requirements allow off-screen positioning (R16) and we don't need collision detection or flip/shift behavior.

### 6.6 Security Note

A prototype pollution vulnerability (CVE-2024-57079) affecting `@zag-js/core` versions below 0.82.2 was fixed in February 2025. Ensure the project uses version 0.82.2 or later.

### 6.7 References

- [Zag.js Floating Panel Documentation](https://zagjs.com/components/react/floating-panel)
- [Zag.js GitHub Repository](https://github.com/chakra-ui/zag)
- [Ark UI Popover Documentation](https://ark-ui.com/docs/components/popover)
- [react-draggable npm](https://www.npmjs.com/package/react-draggable)
- [npm trends: react-dnd vs react-draggable vs react-rnd](https://npmtrends.com/react-dnd-vs-react-draggable-vs-react-resizable-vs-react-rnd)
- [Radix UI Popover/Dialog Nesting Issue #2121](https://github.com/radix-ui/primitives/issues/2121)
- [Mantine Draggable Modal Discussion #6952](https://github.com/orgs/mantinedev/discussions/6952)
- [Mantine Nested Popover Help](https://help.mantine.dev/q/nested-popover-closes)

---

## 7. Implementation Dependencies

### 7.1 External Libraries

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@zag-js/floating-panel` | ≥0.82.2 | Individual panel behavior | Drag, position management, escape key |
| `@zag-js/react` | ≥0.82.2 | React bindings for Zag | Required for floating-panel |
| `@mantine/core` | Existing | UI primitives | ActionIcon, Tabs, styling |
| React | Existing | Core framework | Portal, hooks, context |

**Note**: `@floating-ui/react` is not required. Initial positioning uses simple `getBoundingClientRect()` calculations since we allow off-screen positioning (R16) and don't need collision detection.

### 7.2 Internal Dependencies

| Dependency | Purpose |
|------------|---------|
| Mantine theme | Color variables, spacing, typography |
| Existing icon set | Close icon, action icons |

### 7.3 Custom Implementation Required

The following must be implemented as custom code (not provided by any library):

| Component | Purpose |
|-----------|---------|
| `PopoutManager` | React context for multi-panel coordination |
| Hierarchy tracking | Parent-child relationship management |
| Click-outside handler | Ancestry-aware closing logic |
| Z-index coordinator | Bring-to-front across all panels |
| Escape key handler | Close focused panel and descendants |
| Position calculator | Initial position from trigger element using `getBoundingClientRect()` |

---

## 8. Usage Examples

### 8.1 Simple Settings Pop-out

```tsx
<Popout>
  <Popout.Trigger>
    <ActionIcon variant="subtle" size="sm">
      <IconSettings size={16} />
    </ActionIcon>
  </Popout.Trigger>

  <Popout.Panel
    width={280}
    header={{ variant: 'title', title: 'Label Settings' }}
  >
    <Popout.Content>
      <Stack gap="sm">
        <Select label="Position" data={['Above', 'Below', 'Left', 'Right']} />
        <NumberInput label="Offset" />
        <Switch label="Billboard" />
      </Stack>
    </Popout.Content>
  </Popout.Panel>
</Popout>
```

### 8.2 Tabbed Pop-out with Actions

```tsx
<Popout>
  <Popout.Trigger>
    <ActionIcon variant="subtle" size="sm">
      <IconSettings size={16} />
    </ActionIcon>
  </Popout.Trigger>

  <Popout.Panel
    width={320}
    header={{
      variant: 'tabs',
      tabs: [
        { id: 'position', label: 'Position', content: <PositionSettings /> },
        { id: 'style', label: 'Style', content: <StyleSettings /> },
        { id: 'advanced', label: 'Advanced', content: <AdvancedSettings /> },
      ],
      actions: (
        <Tooltip label="Reset to defaults">
          <ActionIcon variant="subtle" size="sm">
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      ),
    }}
  />
</Popout>
```

### 8.3 Color Picker Pop-out (Nested)

```tsx
<Popout>
  <Popout.Trigger>
    <ColorSwatch color={selectedColor} size={24} />
  </Popout.Trigger>

  <Popout.Panel
    width={240}
    header={{
      variant: 'tabs',
      tabs: [
        { id: 'custom', label: 'Custom', content: <ColorPicker /> },
        { id: 'library', label: 'Library', content: <ColorLibrary /> },
      ],
      actions: (
        // This triggers a nested pop-out
        <Popout>
          <Popout.Trigger>
            <ActionIcon variant="subtle" size="sm">
              <IconPlus size={16} />
            </ActionIcon>
          </Popout.Trigger>

          <Popout.Panel
            width={200}
            header={{ variant: 'title', title: 'New Color' }}
          >
            <Popout.Content>
              <TextInput label="Color name" />
              <Button fullWidth mt="sm">Save to Library</Button>
            </Popout.Content>
          </Popout.Panel>
        </Popout>
      ),
    }}
  />
</Popout>
```

### 8.4 Pop-out Without Tabs

```tsx
<Popout>
  <Popout.Trigger>
    <ActionIcon variant="subtle" size="sm">
      <IconPlus size={16} />
    </ActionIcon>
  </Popout.Trigger>

  <Popout.Panel
    width={200}
    header={{
      variant: 'title',
      title: 'Add Effect',
    }}
  >
    <Popout.Content>
      <Stack gap="xs">
        <Button variant="subtle" fullWidth leftSection={<IconSparkles />}>
          Glow
        </Button>
        <Button variant="subtle" fullWidth leftSection={<IconBorderOuter />}>
          Outline
        </Button>
        <Button variant="subtle" fullWidth leftSection={<IconGrid3x3 />}>
          Wireframe
        </Button>
      </Stack>
    </Popout.Content>
  </Popout.Panel>
</Popout>
```

---

## 9. Accessibility Considerations

### 9.1 Keyboard Navigation

- **Tab**: Moves focus between interactive elements within the pop-out
- **Escape**: Closes the focused pop-out (and descendants)
- **Arrow keys**: Navigate within tab lists (if using tabbed header)

### 9.2 ARIA Attributes

```tsx
<div
  role="dialog"
  aria-modal="false"  // Not modal - other UI remains interactive
  aria-labelledby={titleId}
  data-popout-id={id}
>
  <header>
    <h2 id={titleId}>{title}</h2>
    <button aria-label="Close panel">×</button>
  </header>
  {/* content */}
</div>
```

### 9.3 Focus Management

- On open: Focus moves to the pop-out panel (or first focusable element within)
- On close: Focus returns to the trigger element
- Focus trap is NOT used (pop-outs are non-modal)

---

## 10. Performance Considerations

### 10.1 Render Optimization

- Pop-out content should use `React.memo` for complex children
- Position updates during drag use CSS transforms (GPU-accelerated)
- Z-index updates are batched to avoid layout thrashing

### 10.2 Event Listener Management

- Global listeners (click outside, escape) are registered once at PopoutManager level
- Individual pop-outs do not register global listeners
- Listeners are cleaned up on unmount

### 10.3 Portal Considerations

- All pop-outs share the same portal container (`document.body`)
- No additional wrapper divs created per pop-out

---

## 11. Future Considerations

### 11.1 Potential Enhancements

1. **Resize handles**: Allow users to resize pop-out panels
2. **Snap to edges**: Optional snapping behavior when dragging near viewport edges
3. **Remember position**: Optional persistence of dragged position per pop-out type
4. **Minimize/collapse**: Ability to minimize pop-out to title bar only
5. **Pin/dock**: Pin pop-out to prevent click-outside closing

### 11.2 Out of Scope

The following are explicitly NOT part of this design:

- Mobile/responsive adaptations (R7)
- Animation/transitions (R17)
- Backdrop/overlay (R18)
- Tab state persistence (R8)

---

## 12. References

### 12.1 Design References

- [Progressive Disclosure Design Document](./progressive-disclosure-design.md)
- [Figma UI3 Design Philosophy](https://www.figma.com/blog/our-approach-to-designing-ui3/)
- [Figma Text Properties](https://help.figma.com/hc/en-us/articles/360039956634-Explore-text-properties)

### 12.2 Library Documentation

- [Zag.js Floating Panel Documentation](https://zagjs.com/components/react/floating-panel)
- [Zag.js GitHub Repository](https://github.com/chakra-ui/zag)
- [Ark UI Popover Documentation](https://ark-ui.com/docs/components/popover)
- [Mantine Components](https://mantine.dev/core/getting-started/)
- [react-draggable npm](https://www.npmjs.com/package/react-draggable)

### 12.3 Library Comparison and Issues

- [npm trends: react-dnd vs react-draggable vs react-rnd](https://npmtrends.com/react-dnd-vs-react-draggable-vs-react-resizable-vs-react-rnd)
- [Radix UI Popover/Dialog Nesting Issue #2121](https://github.com/radix-ui/primitives/issues/2121)
- [Radix UI Z-Index Issue #1317](https://github.com/radix-ui/primitives/issues/1317)
- [Mantine Draggable Modal Discussion #6952](https://github.com/orgs/mantinedev/discussions/6952)
- [Mantine Nested Popover Help](https://help.mantine.dev/q/nested-popover-closes)
