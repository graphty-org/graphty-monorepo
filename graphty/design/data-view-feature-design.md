# Feature Design: Data View

## Overview

- **User Value**: Users can inspect the raw data behind their graph visualizations, understand node properties, debug data issues, and navigate between visual elements and their underlying data.
- **Technical Value**: Provides a foundation for data-driven interactions, enables copy/export of data paths (JMESPath), and creates a consistent pattern for displaying structured data throughout the application.

---

## Research Findings

### Competitor Analysis

#### Cytoscape (Desktop & Cytoscape.js)
- **Data Laboratory/Table Panel**: Displays node and edge attributes in a tabular format with columns for each property
- **Key Features**:
  - Switchable between nodes, edges, and network tables via tabs
  - Editable cells (double-click to edit values)
  - Column visibility controls (show/hide columns)
  - Filter to show only selected elements
  - Export to CSV
- **Takeaway**: Tabular format works well for homogeneous data; our JSON tree approach is better for heterogeneous/nested data

Sources: [Cytoscape User Manual - Node and Edge Column Data](https://manual.cytoscape.org/en/stable/Node_and_Edge_Column_Data.html)

#### Gephi (Data Laboratory)
- **Data Laboratory Mode**: Dedicated workspace for data manipulation
- **Key Features**:
  - Separate tabs for nodes and edges tables
  - Add/remove/duplicate columns
  - Merge columns with custom rules
  - Statistics automatically added as node attributes
  - Mass editing capabilities via scripts
- **Takeaway**: Powerful data manipulation, but we're focused on viewing (not editing) initially

Sources: [Introducing Data Laboratory - Gephi Blog](https://gephi.wordpress.com/2010/08/13/introducing-data-laboratory/)

#### Tableau (View Data)
- **View Data Window**: Tabular display with Summary and Full Data tabs
- **Key Features**:
  - Scoped to current selection or entire view
  - Summary tab shows aggregated dimensions/measures
  - Full Data tab shows raw underlying records
  - Customizable column order before export
  - CSV export capability
  - Row limits (10,000 in Desktop, 200 in Cloud)
- **Takeaway**: Scoping data view to selection is valuable UX pattern

Sources: [Tableau - View Underlying Data](https://help.tableau.com/current/pro/desktop/en-us/inspectdata_viewdata.htm)

#### Figma (Dev Mode Inspect Panel)
- **Inspect Panel**: Shows design specs and properties for selected elements
- **Key Features**:
  - Properties displayed as key-value pairs
  - Click to copy values to clipboard
  - Code generation (CSS, iOS, Android)
  - Plugin extensibility for custom code generation
  - Clean, minimal property list view
- **Takeaway**: Simple list view with copy-to-clipboard is excellent UX for developers

Sources: [Figma - Guide to inspecting](https://help.figma.com/hc/en-us/articles/22012921621015-Guide-to-inspecting)

### Recommended Features for Our Design

Based on competitor research, we should prioritize:

1. **Collapsible tree view** for nested JSON data (better than tables for heterogeneous data)
2. **Selection scoping** - show all data in modal, selected node data in sidebar
3. **Copy to clipboard** - both values and paths (JMESPath)
4. **Search/filter** capability for large datasets
5. **Compact display** with expand/collapse controls
6. **Dark theme** matching existing UI

---

## JSON Viewer Library Evaluation

### Comprehensive Library Research

We evaluated 12+ React JSON viewer libraries against our requirements:

| Requirement | Priority |
|-------------|----------|
| Compact, readable display | Must |
| Dark theme (Mantine-compatible) | Must |
| Collapsible/expandable nested structures | Must |
| Copy value to clipboard | Must |
| Copy path (JMESPath format) | Must |
| Search with highlighting | Must |
| Click handler with path info | Must |
| Works in 300px sidebar | Must |
| Theming extensibility | Should |
| Zero/minimal dependencies | Nice |
| Active maintenance (2024+) | Should |
| TypeScript support | Should |

### Libraries Evaluated

| Library | Collapse | Copy | Path Callback | Search | 300px Sidebar | Theming | Maintained | TypeScript | Deps |
|---------|----------|------|---------------|--------|---------------|---------|------------|------------|------|
| **@redheadphone/react-json-grid** | ✅ | ❌* | ✅ `onSelect(keyPath)` | ✅ Built-in | ✅ **Table format** | ✅ 23 themes | ✅ 2025 | ✅ | 0 |
| @uiw/react-json-view | ✅ | ✅ | ✅ `onCopied` | ❌ | ⚠️ Tree indent | ✅ CSS vars | ✅ 2024 | ✅ | 0 |
| react-json-view-lite | ✅ | ❌ | ❌ | ❌ | ⚠️ Tree indent | ⚠️ Limited | ✅ 2024 | ✅ | 0 |
| @textea/json-viewer | ✅ | ✅ | ✅ | ✅ | ⚠️ Tree indent | ✅ MUI | ✅ 2024 | ✅ | MUI (~40KB) |
| react-json-tree | ✅ | ❌ | ⚠️ keyPath in render | ❌ | ⚠️ Tree indent | ✅ Base16 | ✅ 2024 | ✅ | ~2 |
| @microlink/react-json-view | ✅ | ✅ | ⚠️ Limited | ❌ | ⚠️ Tree indent | ✅ Base16 | ✅ 2024 | ❌ | ~5 |
| react18-json-view | ✅ | ✅ | ⚠️ Edit only | ❌ | ⚠️ Tree indent | ✅ CSS vars | ✅ 2024 | ✅ | 0 |
| react-json-inspector | ✅ | ❌ | ✅ `onClick(path)` | ✅ | ⚠️ Tree indent | ⚠️ CSS file | ❌ 5 years | ❌ | ~3 |
| react-json-view (mac-s-g) | ✅ | ✅ | ⚠️ | ❌ | ⚠️ Tree indent | ✅ Base16 | ❌ 5 years | ❌ | ~5 |
| AG Grid | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ~300KB |

*Copy functionality must be implemented custom (library provides path via `onSelect`)

### Libraries That Don't Meet Requirements

| Library | Why It Fails |
|---------|--------------|
| **react-json-view-lite** | No copy, no search, no click handlers |
| **react-json-pretty/prettify** | No collapse/expand - just syntax highlighting |
| **react-json-view (mac-s-g)** | Unmaintained for 5 years |
| **AG Grid** | Overkill (~300KB), Enterprise features cost $999/dev/year |
| **@textea/json-viewer** | Requires MUI (~40KB extra), wrong UI framework |

### Winner: @redheadphone/react-json-grid ⭐

**Why this library:**

1. **Table format solves the 300px sidebar problem** - Unlike tree views that waste space with indentation, the table format uses two columns (key | value) efficiently
2. **Built-in search with highlighting** - `searchText` prop with automatic match highlighting
3. **Path callback for JMESPath** - `onSelect(keyPath)` provides the full path array
4. **23 built-in themes** - Including dark themes: dracula, monokai, nord, tokyoNight, gruvbox
5. **Zero dependencies** - Lightweight, no external requirements
6. **Active maintenance** - Last release May 2025
7. **TypeScript native** - Full type definitions included
8. **Consistent UI** - Same component works for both modal and sidebar

**What we need to implement:**
- Custom copy button (library provides path via `onSelect`, we add the copy action)
- Mantine theme mapping (create custom theme object matching our dark palette)

### How react-json-grid Works

Unlike traditional tree views, react-json-grid displays JSON as nested tables:

```
┌─────────────────────────────────────────────────┐
│ platformName     │ E-Shop                       │
│ location         │ Global                       │
│ established      │ 2023                         │
│ admin            │ [-] admin {}                 │
│                  │ ┌─────────────────────────┐  │
│                  │ │ name    │ Sarah Williams│  │
│                  │ │ role    │ COO           │  │
│                  │ │ contact │ null          │  │
│                  │ └─────────────────────────┘  │
│ users            │ [+] users [4]                │  ← collapsed array
└─────────────────────────────────────────────────┘
```

**Key behaviors:**
- `[+]` / `[-]` toggles for nested objects/arrays
- Arrays of objects with consistent structure render as proper data tables with column headers
- Cell selection with `highlightSelected` prop
- Search highlights matching cells

### Library Props

```typescript
interface JSONGridProps {
  data: object;                    // JSON to display
  defaultExpandDepth?: number;     // Initial expand depth (default: 0)
  defaultExpandKeyTree?: object;   // Specific keys to expand
  onSelect?: (keyPath: string[]) => void;  // Cell selection callback
  highlightSelected?: boolean;     // Highlight selected cell (default: true)
  searchText?: string;             // Text to search and highlight
  theme?: string;                  // Theme name (23 options)
  customTheme?: ThemeObject;       // Custom color overrides
}
```

### Custom Theme for Mantine Integration

```typescript
const mantineTheme = {
  bgColor: "var(--mantine-color-dark-7)",
  borderColor: "var(--mantine-color-dark-5)",
  cellBorderColor: "var(--mantine-color-dark-6)",
  keyColor: "var(--mantine-color-gray-1)",
  indexColor: "var(--mantine-color-gray-5)",
  numberColor: "var(--mantine-color-blue-4)",
  booleanColor: "var(--mantine-color-cyan-4)",
  stringColor: "var(--mantine-color-green-4)",
  objectColor: "var(--mantine-color-gray-3)",
  tableHeaderBgColor: "var(--mantine-color-dark-6)",
  tableIconColor: "var(--mantine-color-gray-3)",
  selectHighlightBgColor: "var(--mantine-color-blue-9)",
  searchHighlightBgColor: "var(--mantine-color-yellow-9)",
}
```

---

## Requirements

### Functional Requirements

1. **Hamburger Menu: "View Data..." Item**
   - Add menu item under "View" section
   - Opens modal dialog displaying all currently loaded graph data
   - Data displayed as scrollable JSON tree view

2. **View Data Modal**
   - Shows both `nodeData` and `edgeData` from graphty-element
   - Collapsible tree structure for nested properties
   - Search/filter capability for finding specific data
   - Copy functionality (value and JMESPath path)
   - Dark themed to match application

3. **Right Sidebar: Node Data Accordion**
   - When a node is selected (future feature), show data in accordion
   - Same JSON viewer component as modal
   - Titled "Data" in accordion header
   - Shows only the selected node's data object

4. **Extensibility Requirements**
   - Right-click context menu with "Copy JMESPath" option
   - Click on element to highlight corresponding node in graph (future)

---

## Proposed Solution

### User Interface

#### Hamburger Menu Addition
```
File
  └─ Load Data...
  └─ Export
  └─ View Data...  <-- NEW
─────────────────
View
  └─ Toggle Layers Panel
  └─ Toggle Properties Panel
  └─ Toggle Toolbar
```

#### View Data Modal (Table Format)
```
┌──────────────────────────────────────────────────────────────────────┐
│  View Data                                                      [×]  │
├──────────────────────────────────────────────────────────────────────┤
│  [Nodes] [Edges]                              [🔍 Search...]        │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ [0]          │ [-] {3}                                         │  │
│  │              │ ┌──────────────────────────────────────────────┐│  │
│  │              │ │ id       │ "node-1"                    [📋] ││  │
│  │              │ │ label    │ "Start"                     [📋] ││  │
│  │              │ │ metadata │ [+] {2}                          ││  │
│  │              │ └──────────────────────────────────────────────┘│  │
│  │ [1]          │ [+] {4}                                         │  │
│  │ [2]          │ [+] {3}                                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ... (scrollable)                                                    │
├──────────────────────────────────────────────────────────────────────┤
│  Showing 150 nodes                                       [Close]     │
└──────────────────────────────────────────────────────────────────────┘
```

#### Right Sidebar Data Accordion (when node selected)

The table format works well in the 300px sidebar - keys stay left-aligned, values on the right:

```
┌─────────────────────────────────┐
│ ⚙ Node Properties              │
├─────────────────────────────────┤
│                                 │
│ ▼ Data                    [📋] │  <-- Copy all button
│ ┌─────────────────────────────┐ │
│ │ id       │ "node-1"   [📋] │ │
│ │ label    │ "Start"    [📋] │ │
│ │ metadata │ [-] {2}         │ │
│ │          │ ┌─────────────┐ │ │
│ │          │ │created│2024│ │ │
│ │          │ │author │user│ │ │
│ │          │ └─────────────┘ │ │
│ │ weight   │ 1.5        [📋] │ │
│ └─────────────────────────────┘ │
│                                 │
│ ▶ Style                         │
│                                 │
└─────────────────────────────────┘
```

#### Edge Data Display (when edge selected)
```
┌─────────────────────────────────┐
│ ⚙ Edge Properties              │
├─────────────────────────────────┤
│                                 │
│ ▼ Data                    [📋] │
│ ┌─────────────────────────────┐ │
│ │ src      │ "node-1"   [📋] │ │
│ │ dst      │ "node-2"   [📋] │ │
│ │ weight   │ 0.75       [📋] │ │
│ │ label    │ "connects" [📋] │ │
│ └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

### Technical Architecture

#### New Components

1. **`DataGrid.tsx`** - Wrapper component for @redheadphone/react-json-grid
   - Configures custom theme to match Mantine dark palette
   - Wraps `onSelect` to generate JMESPath and trigger copy
   - Adds custom copy button overlay on cell hover/selection
   - Provides consistent styling across modal and sidebar

2. **`ViewDataModal.tsx`** - Modal dialog for viewing all data
   - Tabs for switching between nodes and edges
   - Search input connected to `searchText` prop
   - Status bar showing count
   - Uses DataGrid component

3. **`DataAccordion.tsx`** - Accordion section for selected node/edge
   - Wraps DataGrid for single element display
   - Shows node data when node selected, edge data when edge selected
   - Integrates with existing RightSidebar component

4. **`CopyButton.tsx`** - Custom copy button component
   - Appears on cell hover or when cell is selected
   - Copies value (or JMESPath path on shift+click)
   - Shows "Copied!" feedback

#### Modified Components

1. **`TopMenuBar.tsx`** - Add "View Data..." menu item
   - New prop: `onViewData?: () => void`

2. **`AppLayout.tsx`** - State management for modal
   - New state: `viewDataModalOpen: boolean`
   - Pass graphty-element ref or data to modal

3. **`RightSidebar.tsx`** - Add data accordion
   - New prop: `selectedNodeData?: Record<string, unknown>`
   - Render NodeDataAccordion when node is selected

4. **`Graphty.tsx`** - Expose node/edge data
   - Need to access `nodeData` and `edgeData` from graphty-element
   - Add event handlers for node/edge selection (when available)

#### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         AppLayout                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ State:                                                       ││
│  │  - viewDataModalOpen: boolean                                ││
│  │  - graphData: { nodes: [], edges: [] }                       ││
│  │  - selectedElement: { type: 'node'|'edge', data: {} } | null ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│         ┌────────────────────┼────────────────────┐              │
│         ▼                    ▼                    ▼              │
│  ┌─────────────┐    ┌───────────────┐    ┌──────────────┐       │
│  │ TopMenuBar  │    │    Graphty    │    │ RightSidebar │       │
│  │             │    │               │    │              │       │
│  │ onViewData()│    │ graphtyRef    │──▶│selectedElement│      │
│  └─────────────┘    │ .nodeData     │    └──────────────┘       │
│         │           │ .edgeData     │            │               │
│         │           └───────────────┘            ▼               │
│         │                    │         ┌────────────────┐        │
│         │                    │         │ DataAccordion  │        │
│         │                    │         │  <DataGrid>    │        │
│         │                    │         └────────────────┘        │
│         ▼                    ▼                                   │
│  ┌───────────────────────────────────────┐                       │
│  │          ViewDataModal                │                       │
│  │  ┌─────────────────────────────────┐  │                       │
│  │  │          <DataGrid>             │  │                       │
│  │  │  data={graphData.nodes/edges}   │  │                       │
│  │  │  searchText={searchQuery}       │  │                       │
│  │  │  onSelect={handleCellSelect}    │  │                       │
│  │  └─────────────────────────────────┘  │                       │
│  └───────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

#### GraphtyElement Type Extension

```typescript
interface GraphtyElementType extends HTMLElement {
    nodeData?: {id: number | string, [key: string]: unknown}[];
    edgeData?: {src: number | string, dst: number | string, [key: string]: unknown}[];
    // ... existing properties

    // New: Event for node selection
    addEventListener(type: 'node-select', listener: (event: CustomEvent<NodeData>) => void): void;
}
```

### Implementation Approach

#### Phase 1: Core DataGrid Component
1. Install `@redheadphone/react-json-grid` package
2. Create `DataGrid.tsx` wrapper component
3. Create custom Mantine theme object for the grid
4. Implement `CopyButton.tsx` component for clipboard functionality
5. Wire up `onSelect` callback to capture JMESPath paths

#### Phase 2: View Data Modal
1. Create `ViewDataModal.tsx` component
2. Add tabs for nodes/edges switching using Mantine SegmentedControl
3. Add search input connected to `searchText` prop
4. Add status bar showing item count
5. Add menu item to TopMenuBar
6. Wire up state in AppLayout

#### Phase 3: Right Sidebar Integration
1. Create `DataAccordion.tsx` component
2. Add to RightSidebar layout
3. Handle both node and edge selection (mutually exclusive)
4. Connect to selected element state (placeholder until selection exists in graphty-element)

#### Phase 4: Copy Functionality
1. Implement copy value on button click
2. Implement copy JMESPath on shift+click or context menu
3. Add "Copied!" toast/feedback
4. Ensure path format matches style selector input format

#### Phase 5: Polish & Testing
1. Test with various JSON structures (flat, nested, arrays of objects)
2. Performance testing with large datasets (1000+ nodes)
3. Visual regression tests
4. Accessibility review (keyboard navigation, screen readers)

---

## Acceptance Criteria

### View Data Menu Item
- [ ] "View Data..." appears in hamburger menu under File section
- [ ] Menu item opens View Data modal when clicked
- [ ] Menu item is disabled when no data is loaded

### View Data Modal
- [ ] Modal displays with dark theme matching application
- [ ] Tabs allow switching between Nodes and Edges view
- [ ] Data displays in table/grid format (key | value columns)
- [ ] Nested objects/arrays show `[+]`/`[-]` expand/collapse toggles
- [ ] Arrays of objects with consistent structure show as data tables with column headers
- [ ] Search input highlights matching cells in real-time
- [ ] Status bar shows total count of items
- [ ] Modal closes with X button or clicking outside
- [ ] Large datasets (1000+ nodes) render without lag

### DataGrid Component
- [ ] Nested objects/arrays are collapsible via `[+]`/`[-]` toggles
- [ ] Default expand depth is 1 (top-level expanded, nested collapsed)
- [ ] Syntax highlighting for different data types (strings, numbers, booleans, null)
- [ ] Cell selection highlights the selected cell
- [ ] `onSelect` callback provides full keyPath array
- [ ] Theme matches Mantine dark color scheme using custom theme object

### Copy Functionality
- [ ] Copy button appears on cell hover or selection
- [ ] Click copies the cell value to clipboard
- [ ] Shift+click (or context menu) copies JMESPath path
- [ ] JMESPath format matches style selector input (e.g., `metadata.created`)
- [ ] "Copied!" feedback shown after copy action
- [ ] Objects/arrays are copied as JSON.stringify output

### Right Sidebar Data Accordion
- [ ] "Data" accordion section appears when node OR edge is selected
- [ ] Shows node data when node selected, edge data when edge selected
- [ ] Accordion is collapsible (default: expanded)
- [ ] Uses same DataGrid component as modal
- [ ] Placeholder message when no element selected
- [ ] Table format works well in 300px width (no horizontal scroll needed)

### Search Functionality
- [ ] Search input in modal header
- [ ] Searches across both keys and values
- [ ] Matching cells are highlighted
- [ ] Search is case-insensitive
- [ ] Search is debounced (300ms) for performance

---

## Technical Considerations

### Performance
- **Large Datasets**: react-json-grid handles nested structures well, but we should:
  - Use `defaultExpandDepth={1}` to keep initial render fast
  - Consider virtualization for arrays with 1000+ items (may need custom implementation)
  - Memoize DataGrid component to prevent unnecessary re-renders
- **Search Performance**: Debounce search input (300ms) to avoid re-renders on every keystroke

### Security
- **XSS Prevention**: React's JSX escaping handles this automatically
- **Sensitive Data**: Consider adding option to hide/mask certain keys (e.g., `password`, `token`)
- **Copy to Clipboard**: Use secure Clipboard API (navigator.clipboard.writeText)

### Compatibility
- **React 18+**: react-json-grid works with React 18
- **Browser Support**: Clipboard API requires HTTPS in production (or localhost)
- **graphty-element**: Need to verify nodeData/edgeData are exposed and accessible

### Testing Strategy
- **Unit Tests**: DataGrid component with various JSON structures
- **Integration Tests**: Modal open/close, tab switching, search, copy functionality
- **Visual Tests**: Snapshot tests for theme consistency, table rendering
- **Performance Tests**: Render time with 1000+ nodes, search responsiveness

---

## Risks and Mitigation

### Risk: Library Abandonment
**Mitigation**: @redheadphone/react-json-grid is actively maintained (May 2025 release). If abandoned, the table-based approach is simpler to replicate than tree views. Fallback options include @uiw/react-json-view or a custom implementation.

### Risk: Performance with Large Graphs
**Mitigation**:
- Default collapsed depth of 1
- Consider virtualization for arrays with 1000+ items
- Pagination option in modal if needed

### Risk: Node/Edge Selection Not Yet Implemented
**Mitigation**: Design sidebar accordion with placeholder state. The component will be ready when node/edge selection is added to graphty-element.

### Risk: Copy Button Implementation
**Mitigation**: The library doesn't have built-in copy. We'll implement a custom `CopyButton` component that:
- Overlays on cell hover/selection
- Uses `onSelect` callback to get the current path
- Integrates with the Clipboard API

### Risk: Theme Mismatch
**Mitigation**: Create a custom theme object that maps Mantine CSS variables to react-json-grid theme properties. Test across modal and sidebar contexts.

---

## Future Enhancements

1. **JMESPath Context Menu**
   - Right-click on any property to copy its JMESPath
   - Example: Right-click on `nodes[0].metadata.created` → copies `[0].metadata.created`

2. **Click-to-Highlight**
   - Click on a node in the data view → highlight it in the graph
   - Requires bidirectional communication with graphty-element

3. **Data Editing**
   - @uiw/react-json-view supports editing mode
   - Could enable in-place value editing for power users

4. **Export Options**
   - Export filtered data as JSON file
   - Export selected node data
   - Copy entire dataset to clipboard

5. **Data Comparison**
   - Compare two nodes side-by-side
   - Show diff between original and current data

6. **Schema View**
   - Show inferred schema of the data
   - Useful for understanding data structure without scrolling through values

---

## Dependencies

### New Dependencies
```json
{
  "@redheadphone/react-json-grid": "^0.9.4"
}
```

### Peer Dependencies (already satisfied)
- React 18+
- React DOM 18+

### No Additional Dependencies Required
- Zero dependencies in react-json-grid
- Uses existing Mantine components for modal, accordion, search input, etc.

---

## Clarified Requirements

Based on discussion with stakeholders:

1. **Node Selection**: Coming soon to graphty-element - design should support it
2. **Edge vs Node**: Sidebar shows node data when node selected, edge data when edge selected (mutually exclusive)
3. **Editing**: Read-only initially
4. **JMESPath Format**: Must match the format used in style selector input (e.g., `metadata.created` for pasting into node selector fields)
5. **Search**: Search across keys and values, highlight matches

---

## Why Table Format Solves the Narrow Sidebar Problem

Traditional tree views use 12-20px indentation per level. At 10 levels deep, you'd lose 120-200px to indentation in a 300px sidebar, leaving only 100-180px for actual content.

**The table format used by react-json-grid solves this elegantly:**

- Keys stay left-aligned in column 1
- Values appear in column 2
- Nested objects expand inline as nested tables (no horizontal indentation waste)
- Deep nesting is handled by nested tables within cells, not horizontal indentation

This was a key factor in choosing react-json-grid over tree-based alternatives.

### Research Sources (for reference)
- [Retool - Designing UI for Tree Data](https://retool.com/blog/designing-a-ui-for-tree-data)
- [GitHub Primer - Tree View Component](https://primer.style/components/tree-view/)
- [Wikipedia - Miller Columns](https://en.wikipedia.org/wiki/Miller_columns)
- [VS Code Issue #15539 - Horizontal Scrolling](https://github.com/microsoft/vscode/issues/15539)
