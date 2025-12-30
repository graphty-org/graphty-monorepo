# Feature Design: Run Layouts Modal

## Overview
- **User Value**: Users can easily switch between different graph layout algorithms and configure their parameters through an intuitive UI, enabling them to find the best visualization for their data without writing code.
- **Technical Value**: Provides a consistent interface for accessing all 16 layout algorithms with their full configuration options, while keeping graphty-element as the source of truth for layout state.

## Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| 1 | Add "Run Layouts..." menu item to hamburger menu | Must Have |
| 2 | Modal dialog displays ALL layouts from graphty-element | Must Have |
| 3 | Dimension radio constrains 3D option in 2D render mode | Must Have |
| 4 | Each layout shows configurable options from zod schemas | Must Have |
| 5 | Self-descriptive, user-friendly interface | Must Have |
| 6 | graphty-element is the source of truth for layout/rendering state | Must Have |
| 7 | Applying a layout updates graphty-element accordingly | Must Have |
| 8 | Modal reads current layout and config from graphty-element on open | Must Have |

## Proposed Solution

### User Interface/API

**Menu Integration:**
```
Hamburger Menu
├── File
│   ├── Load Data...
│   ├── Run Layouts...  ← NEW
│   └── Export
└── View
    └── ...
```

**Modal Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Run Layout                                              [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Layout                                              │   │
│  │ [▼ D3 Force                                       ] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Dimensions                                                 │
│  (●) 2D   (○) 3D  ← greyed out if rendering in 2D mode     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Layout Options                                      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Alpha Min          [0.1        ]                   │   │
│  │  Alpha Target       [0          ]                   │   │
│  │  Alpha Decay        [0.0228     ]                   │   │
│  │  Velocity Decay     [0.4        ]                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Reset to Defaults]                                        │
│                                                             │
│                              [Cancel]  [Apply Layout]       │
└─────────────────────────────────────────────────────────────┘
```

**Dimension Radio Behavior:**
- In **2D render mode**: 3D radio is disabled, only 2D can be selected
- In **3D render mode**: Both options available (user can choose 2D layout in 3D space)
- For layouts with `maxDimensions=2`: Radio group hidden (always 2D)

### Technical Architecture

#### Components

**New Files:**
1. `src/components/RunLayoutsModal.tsx` - Main modal component
2. `src/components/layout-options/LayoutOptionsForm.tsx` - Dynamic form generator
3. `src/hooks/useLayoutMetadata.ts` - Hook to get layout metadata from graphty-element

**Modified Files:**
1. `src/components/layout/TopMenuBar.tsx` - Add "Run Layouts..." menu item
2. `src/components/layout/AppLayout.tsx` - Add modal state management and layout state
3. `src/components/Graphty.tsx` - Add layout and layoutConfig props

#### Data Model

**Layout Metadata (from graphty-element):**
```typescript
interface LayoutMetadata {
  type: string;              // e.g., "d3", "circular"
  label: string;             // e.g., "D3 Force", "Circular"
  description: string;       // Brief description of the layout
  maxDimensions: 2 | 3;      // Max supported dimensions
  category: "force" | "geometric" | "hierarchical" | "special";
  configSchema: ZodSchema;   // Zod schema for options
  defaultConfig: object;     // Parsed defaults from schema
}
```

**Layout State Flow:**
- graphty-element holds the source of truth for current layout
- Modal reads current state from graphty-element on open
- Modal writes new state to graphty-element on apply
- No layout state stored in React components (avoids sync issues)

#### Available Layouts

| Layout | Type | Max Dim | Category | User-Facing Options |
|--------|------|---------|----------|---------------------|
| D3 Force | `d3` | 3D | Force | alphaMin, alphaTarget, alphaDecay, velocityDecay |
| NGraph | `ngraph` | 3D | Force | springLength, springCoefficient, gravity, theta, dragCoefficient, timeStep, seed |
| ForceAtlas2 | `forceatlas2` | 3D | Force | maxIter, jitterTolerance, scalingRatio, gravity, strongGravity, linlog, seed |
| Spring | `spring` | 3D | Force | k, iterations, scale, seed |
| ARF | `arf` | 2D | Force | scaling, a, maxIter, seed |
| Kamada-Kawai | `kamada-kawai` | 3D | Force | scale, weightProperty |
| Circular | `circular` | 3D | Geometric | scale |
| Spiral | `spiral` | 2D | Geometric | scale, resolution, equidistant |
| Shell | `shell` | 2D | Geometric | scale |
| Random | `random` | 3D | Geometric | seed |
| Planar | `planar` | 2D | Geometric | scale, seed |
| Spectral | `spectral` | 2D | Geometric | scale |
| BFS | `bfs` | 2D | Hierarchical | start, align, scale |
| Bipartite | `bipartite` | 2D | Hierarchical | nodes (required), align, scale, aspectRatio |
| Multipartite | `multipartite` | 2D | Hierarchical | subsetKey (required), align, scale |
| Fixed | `fixed` | 3D | Special | (uses node data positions) |

**Note:** The `pos`, `center`, `scalingFactor`, `nodeMass`, `nodeSize`, `weightPath`, `dist`, `fixed`, `nlist` options are hidden from the UI as they require complex data structures or are advanced internal options.

**Dimension Selection (`dim`):**
- Shown as a radio button group: `[2D] [3D]`
- When rendering mode is **2D**: 3D option is disabled/greyed out (cannot compute 3D layout in 2D render)
- When rendering mode is **3D**: both 2D and 3D are available (can render a 2D layout in 3D space)
- Default selection based on current rendering mode
- Only shown for layouts that support both dimensions (maxDimensions=3)

#### Integration Points

1. **TopMenuBar → AppLayout**: `onRunLayouts` callback triggers modal open
2. **AppLayout → RunLayoutsModal**: Pass `opened`, `onClose`, `onApply`, `is2DMode`
3. **AppLayout → Graphty**: Pass `layout`, `layoutConfig` props; receive current state via ref
4. **Graphty ↔ graphty-element**: Bidirectional communication:
   - **Write**: Set `layout` and `layoutConfig` properties on web component
   - **Read**: Expose method to get current layout state from graphty-element (for modal initialization)

#### Reading Current Layout State

When the modal opens, it must read the current layout state from graphty-element:

```typescript
// In Graphty component - expose method via ref
interface GraphtyRef {
  getCurrentLayout(): { type: string; config: Record<string, unknown> } | null;
  setLayout(type: string, config: Record<string, unknown>): void;
}

// graphty-element properties to read
interface GraphtyElementType extends HTMLElement {
  // ... existing properties ...
  readonly currentLayout?: string;        // Current layout type
  readonly currentLayoutConfig?: Record<string, unknown>;  // Current config
}
```

**Note**: This may require adding read-only properties to graphty-element to expose the current layout state, or accessing it via the `graph` property.

### Implementation Approach

#### Phase 1: Basic Modal Structure
1. Add `onRunLayouts` prop to `TopMenuBar`
2. Add "Run Layouts..." menu item with `Sparkles` icon
3. Create `RunLayoutsModal` component with:
   - Layout selection dropdown (hardcoded list initially)
   - Basic apply/cancel buttons
4. Add modal state to `AppLayout`
5. Wire up layout prop to `Graphty` component

#### Phase 2: Layout Options Form
1. Create layout metadata definitions with:
   - Human-readable labels and descriptions
   - Zod schemas (imported from graphty-element or redefined)
   - Category classification
   - maxDimensions info
2. Create `LayoutOptionsForm` component that:
   - Introspects zod schema to generate form fields
   - Supports number inputs (with min/max from schema)
   - Supports boolean checkboxes
   - Supports enum select dropdowns
   - Shows default values from schema
3. Add "Reset to Defaults" functionality

#### Phase 3: 2D/3D Mode Integration
1. Implement dimension radio button behavior based on `viewMode`
2. Disable 3D option when in 2D render mode
3. Default dimension selection based on current render mode

#### Phase 4: Polish & UX
1. Group layouts by category in dropdown
2. Add brief descriptions for each layout
3. Add loading state while layout computes
4. Persist last-used layout config (optional)

## Acceptance Criteria

- [ ] "Run Layouts..." menu item appears in hamburger menu under "File" section
- [ ] Clicking menu item opens modal dialog with dark theme matching existing UI
- [ ] Modal displays dropdown with all 16 layouts from graphty-element
- [ ] All layouts available in both 2D and 3D render modes (no filtering)
- [ ] On open, modal reads current layout type from graphty-element and selects it
- [ ] On open, modal reads current layout config from graphty-element and populates form fields
- [ ] Dimension radio buttons (2D/3D) shown for layouts supporting both dimensions
- [ ] In 2D render mode, 3D radio option is disabled/greyed out
- [ ] In 3D render mode, both 2D and 3D radio options are selectable
- [ ] For 2D-only layouts (maxDimensions=2), dimension radio is hidden
- [ ] Selecting a layout shows its configurable options as form fields
- [ ] Form fields match zod schema types (number → NumberInput, boolean → Checkbox, enum → Select)
- [ ] Default values from zod schema are pre-filled
- [ ] "Reset to Defaults" button restores default values
- [ ] "Apply Layout" button updates graphty-element via `layout` and `layoutConfig` properties
- [ ] Modal closes after applying layout
- [ ] Graph re-renders with new layout
- [ ] Cancel button closes modal without changes
- [ ] Re-opening modal shows current layout state from graphty-element (source of truth)

## Technical Considerations

### Performance
- **Impact**: Some layouts (e.g., ForceAtlas2 with high iterations) can take time to compute
- **Mitigation**:
  - Consider adding loading indicator
  - Layout computation happens in graphty-element (already handles this)
  - Could add "Preview" functionality in future

### Security
- No external data input; all values validated by zod schemas
- Form inputs are typed and constrained

### Compatibility
- **Backward compatibility**: No breaking changes to existing functionality
- **graphty-element version**: Must use version that exports layout metadata (may need to add exports)

### Testing
- Unit tests for `LayoutOptionsForm` component
- Integration tests for modal open/close/apply flow
- Visual regression tests for modal styling
- E2E tests for layout changes

## Risks and Mitigation

- **Risk**: Zod schemas not exported from graphty-element
  **Mitigation**: Either add exports to graphty-element, or define a parallel metadata structure in graphty that mirrors the schemas

- **Risk**: graphty-element doesn't expose current layout state for reading
  **Mitigation**: Add read-only properties (`currentLayout`, `currentLayoutConfig`) to graphty-element, or access via the existing `graph` property

- **Risk**: Complex options (like `nodes` array for bipartite) are difficult to express in a form
  **Mitigation**: Hide advanced options initially; mark layouts like bipartite/multipartite as "advanced" requiring manual configuration

- **Risk**: User confusion about which layout to choose
  **Mitigation**: Add brief descriptions and consider grouping by use case (e.g., "Best for large graphs", "Best for hierarchical data")

- **Risk**: Layout computation blocking UI
  **Mitigation**: graphty-element already handles async layout computation; ensure modal provides feedback

## Future Enhancements

1. **Layout Preview**: Show small preview of layout pattern before applying
2. **Layout Comparison**: Side-by-side comparison of different layouts
3. **Saved Presets**: Save favorite layout configurations
4. **Layout Animation**: Options for transition animation between layouts
5. **Auto-Layout Selection**: Recommend layouts based on graph structure
6. **Layout History**: Undo/redo layout changes
7. **Batch Layouts**: Apply same layout to multiple graphs

## Implementation Estimate

This section intentionally left blank per project guidelines - no time estimates provided.

## Appendix: Zod Schema Reference

### SimpleLayoutConfig (Base)
```typescript
z.looseObject({
  scalingFactor: z.number().default(100), // Hidden from UI
})
```

### D3LayoutConfig
```typescript
z.strictObject({
  alphaMin: z.number().positive().default(0.1),
  alphaTarget: z.number().min(0).default(0),
  alphaDecay: z.number().positive().default(0.0228),
  velocityDecay: z.number().positive().default(0.4),
})
```

### ForceAtlas2LayoutConfig
```typescript
z.strictObject({
  ...SimpleLayoutConfig.shape,
  pos: z.record(...).or(z.null()).default(null),           // Hidden
  maxIter: z.number().positive().default(100),
  jitterTolerance: z.number().positive().default(1.0),
  scalingRatio: z.number().positive().default(2.0),
  gravity: z.number().positive().default(1.0),
  distributedAction: z.boolean().default(false),           // Hidden (advanced)
  strongGravity: z.boolean().default(false),
  nodeMass: z.record(...).or(z.null()).default(null),      // Hidden
  nodeSize: z.record(...).or(z.null()).default(null),      // Hidden
  weightPath: z.string().or(z.null()).default(null),       // Hidden
  dissuadeHubs: z.boolean().default(false),                // Hidden (advanced)
  linlog: z.boolean().default(false),
  seed: z.number().or(z.null()).default(null),
  dim: z.number().default(2),                              // Radio: 2D/3D
})
```

### CircularLayoutConfig
```typescript
z.strictObject({
  ...SimpleLayoutConfig.shape,
  scale: z.number().positive().default(1),
  center: z.array(z.number()).min(2).max(3).or(z.null()).default(null),  // Hidden
  dim: z.number().default(2),                                             // Radio: 2D/3D
})
```

### SpringLayoutConfig
```typescript
z.strictObject({
  ...SimpleLayoutConfig.shape,
  k: z.number().or(z.null()).default(null),
  pos: z.record(...).or(z.null()).default(null),           // Hidden
  fixed: z.array(z.number()).or(z.null()).default(null),   // Hidden
  iterations: z.number().positive().default(50),
  scale: z.number().positive().default(1),
  center: z.array(z.number()).min(2).max(3).or(z.null()).default(null),  // Hidden
  dim: z.number().default(3),                                             // Radio: 2D/3D
  seed: z.number().positive().or(z.null()).default(null),
})
```

### Additional schemas follow similar patterns - see source files for complete definitions.
