# Feature Design: Interactive Style Layers Management

## Overview

- **User Value**: Users can organize and control graph visualization styles through named layers, providing intuitive control over how different groups of nodes and edges are displayed. This enables users to build complex visualizations incrementally, with the ability to toggle visibility, adjust properties, and reorder layer precedence.

- **Technical Value**: Leverages the existing graphty-element `StyleLayerType` system, providing a React UI that directly maps to the underlying style engine. This creates a maintainable, type-safe bridge between user interactions and the graph rendering system without requiring changes to the core Web Component.

## Requirements

### Core Functionality
1. **Layer Creation**
   - When a new layer is added, the default name is "New Layer 1", where "1" is incremented for each new layer
   - Each new layer is a JavaScript object conforming to the `StyleLayerType` interface from graphty-element
   - Changes to layers update the array and trigger re-rendering in graphty-element

2. **Layer Naming**
   - Double-clicking on a layer name turns it into editable text
   - Hitting "Enter" or clicking away from the layer ends text editing
   - The layer name in the JavaScript object and on screen are updated to the new name

3. **Layer Selection**
   - Clicking on a layer selects it and opens its properties in the right-hand properties bar
   - Only one layer can be selected at a time
   - Visual feedback shows which layer is currently selected

4. **Properties Panel Integration**
   - The top of the right-hand properties bar displays the layer name
   - Properties are dynamically loaded based on the selected layer's configuration
   - Changes to properties immediately update the layer object and trigger graph re-render

## Proposed Solution

### User Interface/API

#### Left Sidebar - Layers Panel
```
┌─────────────────────────────────┐
│ Layers                    [+]   │
├─────────────────────────────────┤
│ ○ [👁] Community Colors        │
│ ● [👁] High Degree Nodes   [⋮] │  ← Selected
│ ○ [👁] Default Style       [⋮] │
└─────────────────────────────────┘
```

**Components:**
- **Header**: "Layers" title + "Add Layer" button
- **Layer List**: Scrollable, drag-sortable list of layers
- **Layer Item**:
  - Radio button (selection indicator)
  - Eye icon (visibility toggle)
  - Editable name field (double-click to edit)
  - Drag handle (reorder layers)

#### Right Sidebar - Layer Properties
```
┌─────────────────────────────────┐
│ High Degree Nodes               │  ← Layer name
├─────────────────────────────────┤
│ Selector                        │
│ [degree > 5                  ]  │
│                                 │
│ Node Styling                    │
│ ☑ Enabled                       │
│ Shape: Sphere        [▼]        │
│ Size:  [====•====] 2.5          │
│ Color: [🎨] #FF6B6B              │
│                                 │
│ Edge Styling                    │
│ ☐ Enabled                       │
└─────────────────────────────────┘
```

**Sections:**
- **Layer Name**: Editable header
- **Selector**: JMESPath expression input
- **Node Styling**: Collapsible section with shape, size, color, effects
- **Edge Styling**: Collapsible section with line style, arrows, colors
- **Advanced**: Calculated styles, tooltips, labels

### Technical Architecture

#### Components Structure

```
src/components/
├── layers/
│   ├── LayersPanel.tsx          # Main left sidebar container
│   ├── LayersList.tsx            # Scrollable list with drag-and-drop
│   ├── LayerItem.tsx             # Individual layer row
│   ├── LayerProperties.tsx       # Right sidebar properties panel
│   └── property-editors/
│       ├── SelectorEditor.tsx    # JMESPath selector input
│       ├── NodeStyleEditor.tsx   # Node style controls
│       ├── EdgeStyleEditor.tsx   # Edge style controls
│       ├── ShapeSelector.tsx     # Shape dropdown
│       ├── ColorPicker.tsx       # Color input with picker
│       └── EffectsEditor.tsx     # Glow, outline, etc.
├── layout/
│   ├── AppLayout.tsx             # Modified to include LayersPanel
│   └── RightSidebar.tsx          # Modified to show LayerProperties
└── Graphty.tsx                   # Modified to pass styles to graphty-element
```

#### Data Model

**Layer Interface** (extends graphty-element's `StyleLayerType`):
```typescript
interface Layer {
  id: string;                    // UUID for React keys
  name: string;                  // User-facing display name
  visible: boolean;              // UI-only visibility toggle
  node?: AppliedNodeStyleConfig; // graphty-element node style
  edge?: AppliedEdgeStyleConfig; // graphty-element edge style
}
```

**State Management**:
```typescript
// In AppLayout or new context
const [layers, setLayers] = useState<Layer[]>([
  {
    id: 'default',
    name: 'Default Style',
    visible: true,
    node: {
      selector: '',
      style: defaultNodeStyle
    },
    edge: {
      selector: '',
      style: defaultEdgeStyle
    }
  }
]);

const [selectedLayerId, setSelectedLayerId] = useState<string>('default');
```

**Conversion to graphty-element format**:
```typescript
// Convert UI layers to graphty-element StyleLayerType[]
const visibleLayers = layers
  .filter(layer => layer.visible)
  .map(({ node, edge }) => ({ node, edge }));

// Pass to graphty-element as JSON
const stylesJson = JSON.stringify({
  graphtyTemplate: true,
  majorVersion: "1",
  layers: visibleLayers
});
```

#### Integration Points

**1. AppLayout.tsx** (src/components/layout/AppLayout.tsx):
- Add `layers` and `selectedLayerId` state
- Pass layer management functions to LayersPanel
- Pass selected layer to RightSidebar/LayerProperties
- Manage layer array updates

**2. Graphty.tsx** (src/components/Graphty.tsx):
- Accept `layers` prop from AppLayout
- Convert layers to `StyleSchemaV1` format
- Use `setAttribute('node-path-styles', ...)` or custom attribute
- **Note**: May need to extend graphty-element type definitions to support styles attribute

**3. graphty-element** (Web Component):
- Already has `Styles` class and `StyleManager`
- Currently no exposed attribute for passing full style configuration
- **Options**:
  - Use existing `style-template` attribute (currently unused)
  - Add layers to Graph instance imperatively: `graphtyRef.current.graph.styleManager.updateStyles()`
  - Extend Web Component with new `styles` attribute

### Implementation Approach

#### Phase 1: Data Model & Basic UI (2-3 days)
1. Create `Layer` interface extending `StyleLayerType`
2. Add layers state to AppLayout
3. Build LayersPanel with static list display
4. Implement "Add Layer" functionality with auto-incrementing names
5. Wire up layer data to console.log for verification

#### Phase 2: Layer Interactions (2-3 days)
1. Implement layer selection (radio button + highlight)
2. Add double-click to edit layer name
3. Implement name editing with Enter/blur to save
4. Add visibility toggle (eye icon)
5. Verify state updates correctly

#### Phase 3: Drag & Drop Reordering (1-2 days)
1. Integrate @dnd-kit (already in dependencies)
2. Implement drag-and-drop reordering
3. Update layer array order on drop
4. Add visual feedback during drag

#### Phase 4: Properties Panel (3-4 days)
1. Create LayerProperties component in RightSidebar
2. Build SelectorEditor for JMESPath input
3. Create NodeStyleEditor with:
   - Shape dropdown (using NodeShapes enum)
   - Size slider
   - Color picker
   - Enable/disable checkbox
4. Create EdgeStyleEditor with:
   - Line type dropdown
   - Width slider
   - Color picker
   - Arrow head/tail selectors
5. Wire property changes to update layer object

#### Phase 5: graphty-element Integration (2-3 days)
1. Research best attribute for passing styles to graphty-element
   - Option A: Use `style-template` attribute (currently unused)
   - Option B: Extend with custom `styles` attribute
   - Option C: Use imperative API via ref
2. Convert layers array to `StyleSchemaV1` format
3. Pass to graphty-element on every layer change
4. Listen for `style-changed` events
5. Verify graph updates correctly

#### Phase 6: Advanced Features (2-3 days)
1. Add layer deletion
2. Add layer duplication
3. Implement collapsible property sections
4. Add tooltips and help text
5. Add keyboard shortcuts (Delete key, Escape to deselect)

#### Phase 7: Polish & Testing (2-3 days)
1. Add loading states
2. Add error handling for invalid selectors
3. Add validation for style values
4. Implement undo/redo (optional)
5. Test on mobile with Eruda
6. Write unit tests for layer management logic
7. Write integration tests for graphty-element communication

## Acceptance Criteria

- [ ] Users can add new layers with auto-incrementing default names
- [ ] Double-clicking a layer name enables editing
- [ ] Enter or click-away saves the edited layer name
- [ ] Clicking a layer selects it and shows its properties in the right sidebar
- [ ] The right sidebar header displays the selected layer's name
- [ ] Layer visibility can be toggled with eye icon
- [ ] Layers can be reordered via drag-and-drop
- [ ] Layer order affects rendering precedence in graphty-element
- [ ] Selector changes update the layer and trigger graph re-render
- [ ] Node style changes (shape, size, color) update the graph
- [ ] Edge style changes (line, arrows, color) update the graph
- [ ] Only visible layers affect graph rendering
- [ ] Changes are reflected in real-time on the graph
- [ ] Mobile debugging works with Eruda console

## Technical Considerations

### Performance
- **Impact**: Updating layers on every change could cause performance issues with large graphs
- **Mitigation**:
  - Debounce style updates (300ms delay)
  - Use React.memo() for LayerItem components
  - Only serialize visible layers for graphty-element
  - Cache StyleLayerType conversions when layer hasn't changed

### Security
- **Considerations**:
  - JMESPath selector input could be malicious
  - User-provided URLs for textures/images
- **Measures**:
  - Validate JMESPath expressions before passing to graphty-element
  - Sanitize layer names to prevent XSS
  - Use URL validation for texture/image paths
  - graphty-element already has Zod validation for style objects

### Compatibility
- **Backward Compatibility**:
  - Existing graphs without layer data should continue to work
  - Default layer should replicate current default styling behavior
  - No breaking changes to graphty-element API
- **Forward Compatibility**:
  - Layer format should align with future graphty-element updates
  - Use graphty-element's StyleLayerType as source of truth
  - Avoid custom extensions that diverge from spec

### Testing
- **Unit Tests**:
  - Layer CRUD operations
  - Layer reordering logic
  - Layer to StyleLayerType conversion
  - Selector validation
- **Integration Tests**:
  - Layer changes trigger graph updates
  - Visibility toggle affects rendering
  - Drag-and-drop updates layer order
- **Visual Tests**:
  - Storybook stories for LayerItem, LayersPanel, LayerProperties
  - Test different layer configurations
  - Test edge cases (empty layers, many layers, long names)

## Risks and Mitigation

### Risk: graphty-element doesn't expose full styles API via attributes
- **Likelihood**: High (based on type definitions showing limited style attributes)
- **Impact**: High (would require changes to Web Component or workarounds)
- **Mitigation**:
  - Research graphty-element codebase first (already done - `style-template` exists)
  - Use imperative API via ref as fallback: `graphtyRef.current.graph.styleManager.updateStyles()`
  - Document approach for future maintainers

### Risk: JMESPath selector syntax too complex for users
- **Likelihood**: Medium
- **Impact**: Medium (users may struggle to create layer filters)
- **Mitigation**:
  - Add helper UI for common selectors (e.g., "degree > X", "label = Y")
  - Provide selector examples in tooltips
  - Add syntax validation with helpful error messages
  - Consider visual query builder in future

### Risk: Layer precedence order confuses users
- **Likelihood**: Medium
- **Impact**: Low (visual ordering makes it relatively clear)
- **Mitigation**:
  - Add tooltip explaining "layers at top override layers below"
  - Use visual cues (dimming lower layers when overlap occurs)
  - Add "preview" mode to see layer effects in isolation

### Risk: Performance degradation with many layers
- **Likelihood**: Medium
- **Impact**: Medium (could slow down UI and graph rendering)
- **Mitigation**:
  - Implement layer limits (e.g., max 50 layers)
  - Use virtualized list for layers panel
  - Optimize style recalculation in graphty-element
  - Add performance warning when approaching limits

### Risk: State management becomes complex
- **Likelihood**: High (managing nested layer objects with complex editing)
- **Impact**: Medium (could lead to bugs and difficult maintenance)
- **Mitigation**:
  - Consider using Zustand or Context API for layer state
  - Keep layer state management in single location
  - Use Immer for immutable updates
  - Document state flow clearly

## Future Enhancements

### Near-term (Next 1-2 releases)
- **Layer Groups**: Organize layers into collapsible groups
- **Layer Templates**: Save/load layer configurations as presets
- **Visual Query Builder**: GUI for building JMESPath selectors
- **Layer Preview**: Isolate single layer to see its effect
- **Bulk Operations**: Enable/disable multiple layers at once

### Mid-term (3-6 months)
- **Layer Animations**: Animate layer property changes
- **Conditional Layers**: Show/hide layers based on graph properties
- **Layer Blending**: Blend modes for overlapping layer effects
- **Collaborative Layers**: Real-time multi-user layer editing
- **Layer History**: Timeline of layer changes with revert

### Long-term (6+ months)
- **AI-Assisted Layer Creation**: Suggest layers based on graph data
- **Layer Expressions**: Mathematical expressions for calculated styles
- **Layer Performance Metrics**: Show render cost per layer
- **Layer Export/Import**: Share layer configurations across projects

## Implementation Estimate

### Development Time
- Phase 1 (Data Model & Basic UI): 2-3 days
- Phase 2 (Layer Interactions): 2-3 days
- Phase 3 (Drag & Drop): 1-2 days
- Phase 4 (Properties Panel): 3-4 days
- Phase 5 (graphty-element Integration): 2-3 days
- Phase 6 (Advanced Features): 2-3 days
- Phase 7 (Polish & Testing): 2-3 days

**Total Development**: 14-21 days (3-4 weeks)

### Testing Time
- Unit tests: 2 days
- Integration tests: 2 days
- Visual regression tests: 1 day
- Manual testing: 1 day

**Total Testing**: 6 days

### Documentation Time
- API documentation: 1 day
- User guide: 1 day
- Architecture docs: 1 day

**Total Documentation**: 3 days

**Grand Total**: 23-30 days (4.5-6 weeks)

## Architecture Diagrams

### Component Hierarchy
```
AppLayout
├── TopMenuBar
├── Graphty (receives layers array)
│   └── <graphty-element> (receives StyleSchemaV1)
├── LeftSidebar (LayersPanel)
│   └── LayersList
│       └── LayerItem (x N)
│           ├── Radio button (selection)
│           ├── Eye icon (visibility)
│           ├── Name (editable)
│           └── Drag handle
├── RightSidebar (LayerProperties)
│   ├── Layer name header
│   ├── SelectorEditor
│   ├── NodeStyleEditor
│   │   ├── ShapeSelector
│   │   ├── ColorPicker
│   │   └── Size slider
│   └── EdgeStyleEditor
│       ├── LineStyleSelector
│       ├── ColorPicker
│       └── ArrowSelectors
└── BottomToolbar
```

### Data Flow
```
User Action (e.g., change layer name)
    ↓
LayerItem.onNameChange()
    ↓
AppLayout.updateLayer(id, { name: newName })
    ↓
setLayers([...updated array])
    ↓
Graphty receives new layers prop
    ↓
Convert to StyleSchemaV1
    ↓
graphty-element.setAttribute('style-template', JSON.stringify(...))
    ↓
StyleManager.updateStyles()
    ↓
Graph re-renders with new styles
```

### State Management
```
AppLayout State:
├── layers: Layer[]
├── selectedLayerId: string | null
├── leftSidebarVisible: boolean
└── rightSidebarVisible: boolean

Layer Object:
├── id: string (UUID)
├── name: string
├── visible: boolean
├── node?: AppliedNodeStyleConfig
│   ├── selector: string (JMESPath)
│   ├── style: NodeStyleConfig
│   └── calculatedStyle?: CalculatedStyleConfig
└── edge?: AppliedEdgeStyleConfig
    ├── selector: string (JMESPath)
    ├── style: EdgeStyleConfig
    └── calculatedStyle?: CalculatedStyleConfig
```

## Key Design Decisions

### Decision 1: Imperative vs Declarative graphty-element Integration
**Chosen**: Hybrid approach - declarative when possible, imperative as fallback
**Rationale**:
- graphty-element has limited style attributes currently
- Imperative API (via ref) provides full access to StyleManager
- Keeps Web Component API clean while React has full control
- Aligns with existing GraphtyEnhanced.tsx pattern

### Decision 2: Layer State Location
**Chosen**: AppLayout component state (useState)
**Rationale**:
- Matches existing sidebar visibility state pattern
- Simple for MVP, can refactor to Context/Zustand later if needed
- Keeps state close to where it's consumed
- Easier to test and debug

### Decision 3: Reuse LeftSidebar Component vs New Component
**Chosen**: Replace LeftSidebar content with LayersPanel
**Rationale**:
- LeftSidebar.tsx:80-92 shows it's already a "Layers" panel
- Existing drag-and-drop implementation can be adapted
- Maintains consistent UI structure
- Avoids duplicate sidebar components

### Decision 4: Property Editor Granularity
**Chosen**: Start with essential properties (shape, size, color), add advanced later
**Rationale**:
- NodeStyleConfig has many optional fields (glow, outline, wireframe, etc.)
- Focus on most common use cases first (80/20 rule)
- Can add collapsible "Advanced" section for additional properties
- Keeps initial implementation manageable

### Decision 5: Layer Visibility Implementation
**Chosen**: UI-only filtering (visible layers passed to graphty-element)
**Rationale**:
- Simple to implement (filter layers before conversion)
- No changes needed to graphty-element
- Clear separation of UI state vs rendering state
- Better performance (fewer layers to process)

## Open Questions

1. **Style Attribute Name**: Should we use `style-template`, `styles`, or imperative API?
   - **Recommendation**: Test `style-template` first, fall back to imperative if needed

2. **Default Layer Behavior**: Should default layer be editable or locked?
   - **Recommendation**: Make it editable but undeletable (always at least 1 layer)

3. **Selector Syntax**: JMESPath or custom syntax?
   - **Recommendation**: Stick with JMESPath (graphty-element already uses it)

4. **Layer Limits**: Should we enforce maximum layer count?
   - **Recommendation**: Yes, soft limit at 20 layers with warning, hard limit at 50

5. **Persistence**: Should layers be saved to localStorage or URL?
   - **Recommendation**: Yes, add in Phase 6 (Advanced Features)

## Success Metrics

### User Experience
- Users can create and configure a layer in < 30 seconds
- Layer name editing is intuitive (< 5 seconds to figure out)
- Layer reordering is smooth (< 1 second to complete drag)
- Property changes reflect in graph within 300ms

### Technical
- Layer CRUD operations complete in < 10ms
- Style updates trigger re-render in < 100ms
- Component re-renders minimized (< 5 per user action)
- No memory leaks with layer add/remove cycles
- Works on mobile (tested with Eruda console)

### Code Quality
- 80%+ test coverage for layer management logic
- All public APIs have JSDoc comments
- TypeScript strict mode passes with no errors
- ESLint/Prettier passes with no warnings
- Storybook stories for all layer components

## Conclusion

This feature design leverages the existing graphty-element style layer system to provide users with an intuitive, powerful interface for managing graph visualizations. By carefully aligning the React UI with the underlying Web Component architecture, we ensure a maintainable, type-safe implementation that can evolve with the platform.

The phased implementation approach allows for incremental delivery and testing, reducing risk while providing value early. The design is extensible, with clear paths for future enhancements like layer templates, visual query builders, and collaborative editing.

Key to success will be:
1. Thorough research of graphty-element style API (completed)
2. Careful state management to avoid bugs
3. Robust testing at each phase
4. Clear documentation for future maintainers
5. User feedback during development to refine UX
