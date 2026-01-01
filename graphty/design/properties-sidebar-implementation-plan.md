# Implementation Plan for Properties Sidebar

## Overview

This plan implements a context-sensitive properties sidebar using an **MVP-first approach**. Each phase delivers a working, user-visible feature that builds on the previous phase.

**MVP Philosophy**: After Phase 1, you have a functional sidebar. Each subsequent phase adds more capabilities while maintaining full functionality.

---

## Phase Summary

| Phase | Deliverable      | User Can...                                                     |
| ----- | ---------------- | --------------------------------------------------------------- |
| **1** | Working MVP      | Select layers, edit node color + selector, see changes in graph |
| **2** | Node styling     | Change node shape, size, and all color options                  |
| **3** | Edge styling     | Change edge line style, arrows, and colors                      |
| **4** | Effects          | Add glow, outline, wireframe effects to nodes                   |
| **5** | Labels           | Add and style labels on nodes and edges                         |
| **6** | Graph Properties | View graph statistics when no layer selected                    |
| **7** | Polish           | Reset to defaults, see visual feedback, keyboard nav            |

---

## Phase 1: MVP - Functional Layer Editing

**Objective**: Create a minimal but fully functional properties sidebar that lets users edit node color and selector, with changes immediately visible in the graph.

**What Users Can Do After This Phase**:

- Select a layer from the left sidebar
- See the StyleLayerPropertiesPanel appear on the right
- Edit the node selector (JMESPath expression)
- Pick a node color
- See the graph update in real-time

**Tests to Write First**:

- `src/components/sidebar/__tests__/RightSidebar.test.tsx`:

    ```typescript
    describe("RightSidebar", () => {
        it("renders 'Select a layer' when no layer is selected");
        it("renders StyleLayerPropertiesPanel when layer is selected");
        it("displays the selected layer's name");
    });
    ```

- `src/components/sidebar/panels/__tests__/StyleLayerPropertiesPanel.test.tsx`:
    ```typescript
    describe("StyleLayerPropertiesPanel", () => {
        it("renders layer name in header");
        it("renders node selector input");
        it("renders node color input");
        it("calls onUpdate when selector changes");
        it("calls onUpdate when color changes");
    });
    ```

**Implementation**:

- `src/types/style-layer.ts`: Basic type definitions

    ```typescript
    export interface StyleLayerState {
        id: string;
        name: string;
        node: {
            selector: string;
            style: {
                texture?: { color?: string };
            };
        };
        edge: {
            selector: string;
            style: Record<string, unknown>;
        };
    }
    ```

- `src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx`: Minimal panel with:
    - Header showing layer name
    - Node section with selector TextInput and ColorInput
    - Placeholder for Edge section

- Update `src/components/layout/RightSidebar.tsx`:
    - Show StyleLayerPropertiesPanel when layer is selected
    - Show placeholder when no layer selected

- Update `src/components/layout/AppLayout.tsx`:
    - Pass selectedLayer to RightSidebar
    - Handle layer updates and propagate to graphty-element

**Dependencies**:

- External: None (using existing Mantine TextInput, ColorInput)
- Internal: None

**Verification**:

1. Run: `npm test`
2. Run: `npm run dev` and verify:
    - Select a layer → see properties panel
    - Change node selector → graph filters nodes
    - Change node color → graph updates node colors
    - Deselect layer → see placeholder

---

## Phase 2: Complete Node Styling

**Objective**: Add shape selection and full color options (solid, gradient, radial) to nodes.

**What Users Can Do After This Phase**:

- Everything from Phase 1, plus:
- Change node shape (sphere, box, icosahedron, etc.)
- Adjust node size
- Use gradient or radial gradient colors
- Set color opacity

**Tests to Write First**:

- `src/components/sidebar/node-controls/__tests__/NodeShapeControl.test.tsx`:

    ```typescript
    describe("NodeShapeControl", () => {
        it("renders shape type dropdown with grouped options");
        it("renders size number input");
        it("calls onChange when shape type changes");
        it("calls onChange when size changes");
    });
    ```

- `src/components/sidebar/node-controls/__tests__/NodeColorControl.test.tsx`:
    ```typescript
    describe("NodeColorControl", () => {
        it("renders solid/gradient/radial toggle");
        it("shows single color picker in solid mode");
        it("shows gradient editor in gradient mode");
        it("renders opacity slider");
    });
    ```

**Implementation**:

- `src/constants/style-options.ts`: Add NODE_SHAPE_OPTIONS with grouped categories

- `src/components/sidebar/node-controls/NodeShapeControl.tsx`:
    - Select dropdown with grouped shapes (Basic, Platonic, Spherical, etc.)
    - NumberInput for size

- `src/components/sidebar/node-controls/NodeColorControl.tsx`:
    - SegmentedControl for solid/gradient/radial
    - ColorInput for solid mode
    - Slider for opacity

- `src/components/sidebar/controls/GradientEditor.tsx`:
    - Direction slider (for linear gradient)
    - List of color stops with add/remove

- `src/components/sidebar/controls/ControlGroup.tsx`: Reusable section header

- Update `src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx`:
    - Replace inline controls with NodeShapeControl and NodeColorControl
    - Organize into ControlGroup sections

- Update `src/types/style-layer.ts`: Add shape and advanced color types

**Dependencies**:

- External: None
- Internal: Phase 1

**Verification**:

1. Run: `npm test`
2. Run: `npm run dev` and verify:
    - Shape dropdown shows all shapes in categories
    - Changing shape updates graph immediately
    - Size slider works
    - Gradient mode shows color stops editor
    - Opacity changes are visible

---

## Phase 3: Edge Styling

**Objective**: Add complete edge styling controls for line appearance and arrows.

**What Users Can Do After This Phase**:

- Everything from Phases 1-2, plus:
- Set edge line type (solid, dashed, dotted, etc.)
- Adjust edge width and color
- Configure arrow heads (type, size, color)
- Configure arrow tails
- Enable bezier curves

**Tests to Write First**:

- `src/components/sidebar/edge-controls/__tests__/EdgeLineControl.test.tsx`:

    ```typescript
    describe("EdgeLineControl", () => {
        it("renders line type select");
        it("renders width input");
        it("renders color input");
        it("renders bezier checkbox");
    });
    ```

- `src/components/sidebar/edge-controls/__tests__/EdgeArrowControl.test.tsx`:
    ```typescript
    describe("EdgeArrowControl", () => {
        it("renders arrow type select");
        it("hides size/color when type is 'none'");
        it("shows size/color when type is not 'none'");
    });
    ```

**Implementation**:

- `src/constants/style-options.ts`: Add LINE_TYPE_OPTIONS, ARROW_TYPE_OPTIONS

- `src/components/sidebar/edge-controls/EdgeSelectorControl.tsx`: TextInput for edge selector

- `src/components/sidebar/edge-controls/EdgeLineControl.tsx`:
    - Line type Select
    - Width NumberInput
    - ColorInput with opacity
    - Bezier Checkbox
    - Animation speed NumberInput

- `src/components/sidebar/edge-controls/EdgeArrowControl.tsx`: Shared component for head/tail
    - Arrow type Select
    - Size NumberInput (conditional)
    - ColorInput (conditional)

- `src/components/sidebar/edge-controls/EdgeArrowHeadControl.tsx`: Wrapper using EdgeArrowControl
- `src/components/sidebar/edge-controls/EdgeArrowTailControl.tsx`: Wrapper using EdgeArrowControl

- Update `src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx`:
    - Add Edge Properties section with all edge controls

- `src/components/sidebar/controls/ControlSection.tsx`: Collapsible accordion section

- Update `src/types/style-layer.ts`: Add edge style types

**Dependencies**:

- External: None
- Internal: Phases 1-2

**Verification**:

1. Run: `npm test`
2. Run: `npm run dev` and verify:
    - Edge line type changes (dashed, dotted, etc.)
    - Arrow heads appear/disappear based on type
    - Bezier curves toggle works
    - All edge style changes update graph

---

## Phase 4: Node Effects

**Objective**: Add visual effects to nodes (glow, outline, wireframe, flat shading).

**What Users Can Do After This Phase**:

- Everything from Phases 1-3, plus:
- Add glow effect to nodes (color, strength)
- Add outline to nodes (color, width)
- Enable wireframe mode
- Enable flat shading

**Tests to Write First**:

- `src/components/sidebar/node-controls/__tests__/NodeEffectsControl.test.tsx`:

    ```typescript
    describe("NodeEffectsControl", () => {
        it("renders glow toggle");
        it("shows glow controls when enabled");
        it("renders outline toggle");
        it("shows outline controls when enabled");
        it("renders wireframe checkbox");
        it("renders flat shaded checkbox");
    });
    ```

- `src/components/sidebar/controls/__tests__/EffectToggle.test.tsx`:
    ```typescript
    describe("EffectToggle", () => {
        it("hides children when unchecked");
        it("shows children when checked");
        it("calls onChange appropriately");
    });
    ```

**Implementation**:

- `src/components/sidebar/controls/EffectToggle.tsx`:
    - Checkbox that shows/hides child controls
    - Clean visual indent for children

- `src/components/sidebar/node-controls/NodeEffectsControl.tsx`:
    - Glow: toggle + color picker + strength slider
    - Outline: toggle + color picker + width slider
    - Wireframe: simple checkbox
    - Flat Shaded: simple checkbox

- Update `src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx`:
    - Add Effects section to Node Properties

- Update `src/types/style-layer.ts`: Add effect types (GlowConfig, OutlineConfig)

**Dependencies**:

- External: None
- Internal: Phases 1-3

**Verification**:

1. Run: `npm test`
2. Run: `npm run dev` and verify:
    - Toggle glow on → see glow in graph
    - Adjust glow color/strength → see changes
    - Toggle outline → see outline
    - Wireframe/flat shaded checkboxes work

---

## Phase 5: Labels and Tooltips

**Objective**: Add text labels and tooltips to nodes and edges with comprehensive styling options.

**What Users Can Do After This Phase**:

- Everything from Phases 1-4, plus:
- Add labels to nodes and edges
- Style label text (font, size, color)
- Add label backgrounds
- Configure label position and billboard mode
- Add text effects (outline, shadow)
- Add tooltips with same styling options

**Tests to Write First**:

- `src/components/sidebar/controls/__tests__/RichTextStyleEditor.test.tsx`:
    ```typescript
    describe("RichTextStyleEditor", () => {
        it("renders enabled toggle");
        it("hides controls when disabled");
        it("shows text input when enabled");
        it("shows font controls");
        it("shows collapsible advanced sections");
    });
    ```

**Implementation**:

- `src/constants/style-options.ts`: Add FONT_OPTIONS, TEXT_LOCATION_OPTIONS, ANIMATION_OPTIONS, etc.

- `src/components/sidebar/controls/ControlSubGroup.tsx`: Collapsible sub-section for advanced options

- `src/components/sidebar/controls/RichTextStyleEditor.tsx`: Comprehensive label/tooltip editor
    - Enabled toggle
    - Text/textPath input
    - Location select
    - Font section (family, size, weight, color)
    - Background section (color, padding, radius)
    - Position section (attach position, offset, billboard)
    - Text effects (outline, shadow) - collapsible
    - Animation - collapsible
    - Advanced (resolution, depth fade) - collapsible

- `src/components/sidebar/node-controls/NodeLabelControl.tsx`: Wrapper using RichTextStyleEditor
- `src/components/sidebar/node-controls/NodeTooltipControl.tsx`: Wrapper using RichTextStyleEditor
- `src/components/sidebar/edge-controls/EdgeLabelControl.tsx`: Wrapper using RichTextStyleEditor
- `src/components/sidebar/edge-controls/EdgeTooltipControl.tsx`: Wrapper using RichTextStyleEditor

- Update `src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx`:
    - Add Label and Tooltip sections to both Node and Edge properties

- Update `src/types/style-layer.ts`: Add RichTextStyle type

**Dependencies**:

- External: None
- Internal: Phases 1-4

**Verification**:

1. Run: `npm test`
2. Run: `npm run dev` and verify:
    - Enable node label → see label in graph
    - Change font size/color → see changes
    - Add text shadow → see effect
    - Edge labels work similarly

---

## Phase 6: Graph Properties Panel

**Objective**: Show graph-level information and controls when no layer is selected.

**What Users Can Do After This Phase**:

- Everything from Phases 1-5, plus:
- See graph statistics (node count, edge count, density)
- See list of loaded data sources
- Toggle directed/undirected graph type
- Toggle weighted/self-loops options

**Tests to Write First**:

- `src/components/sidebar/panels/__tests__/GraphPropertiesPanel.test.tsx`:
    ```typescript
    describe("GraphPropertiesPanel", () => {
        it("displays node count");
        it("displays edge count");
        it("displays density formatted to 4 decimals");
        it("shows data source list");
        it("shows graph type controls");
    });
    ```

**Implementation**:

- `src/types/selection.ts`: GraphInfo and DataSourceInfo types

- `src/components/sidebar/controls/StatRow.tsx`: Label-value pair component

- `src/components/sidebar/panels/GraphPropertiesPanel.tsx`:
    - Data Sources section with file list
    - Statistics section (nodes, edges, components, density)
    - Graph Type section (directed radio, weighted checkbox, self-loops checkbox)

- `src/hooks/useGraphInfo.ts`: Extract graph info from graphty-element

- Update `src/components/layout/RightSidebar.tsx`:
    - Show GraphPropertiesPanel when no layer is selected
    - Show StyleLayerPropertiesPanel when layer is selected

- Update `src/components/layout/AppLayout.tsx`:
    - Track selection state (none vs style-layer)
    - Provide graphInfo from graphty-element

**Dependencies**:

- External: None
- Internal: Phases 1-5

**Verification**:

1. Run: `npm test`
2. Run: `npm run dev` and verify:
    - Load a graph → see accurate statistics
    - Deselect layer → see Graph Properties panel
    - Select layer → see Style Layer panel
    - Graph type controls update the graph

---

## Phase 7: Polish and UX Improvements

**Objective**: Add visual polish, reset functionality, and accessibility improvements.

**What Users Can Do After This Phase**:

- Everything from Phases 1-6, plus:
- See visual distinction between default and explicitly set values
- Reset individual properties to defaults
- See which sections have configured values (indicator dots)
- Navigate with keyboard
- Use proper ARIA labels with screen readers

**Tests to Write First**:

- `src/components/sidebar/controls/__tests__/StyleNumberInput.test.tsx`:

    ```typescript
    describe("StyleNumberInput", () => {
        it("shows muted style for default value");
        it("shows normal style for explicit value");
        it("shows reset button only for explicit values");
        it("calls onChange(undefined) when reset clicked");
    });
    ```

- `src/components/sidebar/__tests__/accessibility.test.tsx`:
    ```typescript
    describe("Sidebar Accessibility", () => {
        it("all controls have proper ARIA labels");
        it("focus order follows visual order");
        it("escape key deselects layer");
    });
    ```

**Implementation**:

- `src/constants/style-defaults.ts`: Default values for all properties

- `src/components/sidebar/controls/StyleNumberInput.tsx`:
    - Shows default value when undefined
    - Muted/italic styling for defaults
    - Reset button (×) for explicit values

- `src/components/sidebar/controls/StyleColorInput.tsx`: Same pattern for colors

- `src/components/sidebar/controls/StyleSelect.tsx`: Same pattern for selects

- Update `src/components/sidebar/controls/ControlSection.tsx`:
    - Add indicator dot when section has configured values

- Update all control components:
    - Add proper aria-labels
    - Add keyboard handling
    - Add focus indicators

- Update `src/components/layout/AppLayout.tsx`:
    - Handle Escape key to deselect
    - Add debouncing for rapid changes

**Dependencies**:

- External: None
- Internal: Phases 1-6

**Verification**:

1. Run: `npm test`
2. Run: `npm run dev` and verify:
    - Unset properties show muted default values
    - Set a property → see reset button appear
    - Click reset → property reverts to default
    - Sections with values show indicator dots
    - Tab through controls works
    - Screen reader announces controls properly

---

## Common Utilities Needed

| Utility                   | Purpose                   | When Needed |
| ------------------------- | ------------------------- | ----------- |
| `ControlGroup.tsx`        | Section header with label | Phase 2     |
| `ControlSection.tsx`      | Collapsible accordion     | Phase 3     |
| `ControlSubGroup.tsx`     | Nested collapsible        | Phase 5     |
| `EffectToggle.tsx`        | Checkbox with children    | Phase 4     |
| `GradientEditor.tsx`      | Color stops editor        | Phase 2     |
| `RichTextStyleEditor.tsx` | Label/tooltip editor      | Phase 5     |

---

## External Libraries Assessment

| Library          | Purpose             | Status                      |
| ---------------- | ------------------- | --------------------------- |
| `@mantine/core`  | UI components       | Already installed           |
| `@mantine/hooks` | useDebouncedValue   | Already installed           |
| `lodash/set`     | Deep object updates | Consider adding for Phase 7 |

---

## Risk Mitigation

| Risk                              | Mitigation                                       | Phase |
| --------------------------------- | ------------------------------------------------ | ----- |
| MVP doesn't work end-to-end       | Focus Phase 1 on minimal but complete flow       | 1     |
| Too many controls overwhelm users | Use collapsible sections, progressive disclosure | 3, 5  |
| Performance with many controls    | Add React.memo, debouncing in Phase 7            | 7     |
| Complex types become unwieldy     | Start with minimal types, expand as needed       | All   |

---

## File Structure (Final)

```
src/
├── components/
│   └── sidebar/
│       ├── __tests__/
│       ├── controls/
│       │   ├── ControlGroup.tsx        # Phase 2
│       │   ├── ControlSection.tsx      # Phase 3
│       │   ├── ControlSubGroup.tsx     # Phase 5
│       │   ├── EffectToggle.tsx        # Phase 4
│       │   ├── GradientEditor.tsx      # Phase 2
│       │   ├── RichTextStyleEditor.tsx # Phase 5
│       │   ├── StatRow.tsx             # Phase 6
│       │   ├── StyleColorInput.tsx     # Phase 7
│       │   ├── StyleNumberInput.tsx    # Phase 7
│       │   └── StyleSelect.tsx         # Phase 7
│       ├── edge-controls/
│       │   ├── EdgeArrowControl.tsx    # Phase 3
│       │   ├── EdgeLabelControl.tsx    # Phase 5
│       │   ├── EdgeLineControl.tsx     # Phase 3
│       │   └── EdgeTooltipControl.tsx  # Phase 5
│       ├── node-controls/
│       │   ├── NodeColorControl.tsx    # Phase 2
│       │   ├── NodeEffectsControl.tsx  # Phase 4
│       │   ├── NodeLabelControl.tsx    # Phase 5
│       │   ├── NodeShapeControl.tsx    # Phase 2
│       │   └── NodeTooltipControl.tsx  # Phase 5
│       └── panels/
│           ├── GraphPropertiesPanel.tsx      # Phase 6
│           └── StyleLayerPropertiesPanel.tsx # Phase 1 (expanded each phase)
├── constants/
│   ├── style-defaults.ts  # Phase 7
│   └── style-options.ts   # Phase 2 (expanded each phase)
├── hooks/
│   └── useGraphInfo.ts    # Phase 6
└── types/
    ├── selection.ts       # Phase 6
    └── style-layer.ts     # Phase 1 (expanded each phase)
```

---

## Definition of Done (Each Phase)

1. All specified tests pass
2. Manual verification steps succeed
3. Previous phase functionality still works
4. No TypeScript errors
5. Lint passes
6. Build succeeds
7. **User can perform the "What Users Can Do" actions**
