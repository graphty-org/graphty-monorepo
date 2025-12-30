# Implementation Plan for Run Layouts Modal

## Overview

This implementation plan covers the creation of a "Run Layouts" modal dialog that allows users to select from all 16 available graph layout algorithms, configure their parameters via dynamically-generated forms based on Zod schemas, and apply layouts to the graph visualization. The modal integrates with graphty-element as the source of truth for layout state.

## Architecture Summary

```
TopMenuBar (onRunLayouts callback)
    ↓
AppLayout (modal state management)
    ↓
RunLayoutsModal (layout selection + config form)
    ↓
Graphty (React wrapper)
    ↓
graphty-element (web component - source of truth)
```

## Phase Breakdown

### Phase 1: Menu Integration and Basic Modal Shell

**Objective**: Add "Run Layouts..." menu item and create a basic modal component with layout selection dropdown.

**Tests to Write First**:
- `src/components/__tests__/RunLayoutsModal.test.tsx`: Basic modal rendering and interactions
  ```typescript
  // Test modal opens and closes
  it('should render when opened', () => {
    render(<RunLayoutsModal opened={true} onClose={() => {}} onApply={() => {}} is2DMode={false} />);
    expect(screen.getByText('Run Layout')).toBeInTheDocument();
  });

  it('should call onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<RunLayoutsModal opened={true} onClose={onClose} onApply={() => {}} is2DMode={false} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should display all 16 layout options in dropdown', () => {
    render(<RunLayoutsModal opened={true} onClose={() => {}} onApply={() => {}} is2DMode={false} />);
    // Open dropdown and verify all layouts are present
  });
  ```

**Implementation**:
- `src/components/layout/TopMenuBar.tsx`: Add `onRunLayouts` prop and menu item
  ```typescript
  interface TopMenuBarProps {
    // ... existing props
    onRunLayouts?: () => void;
  }
  // Add menu item with Sparkles icon after "Load Data..."
  ```

- `src/components/RunLayoutsModal.tsx`: Create modal shell
  ```typescript
  interface RunLayoutsModalProps {
    opened: boolean;
    onClose: () => void;
    onApply: (layoutType: string, config: Record<string, unknown>) => void;
    is2DMode: boolean;
    currentLayout?: string;
    currentLayoutConfig?: Record<string, unknown>;
  }
  ```

- `src/components/layout/AppLayout.tsx`: Add modal state and wiring
  ```typescript
  const [runLayoutsModalOpen, setRunLayoutsModalOpen] = useState(false);
  // Wire up onRunLayouts callback to TopMenuBar
  // Wire up RunLayoutsModal with onApply callback
  ```

- `src/data/layoutMetadata.ts`: Define layout metadata structure
  ```typescript
  interface LayoutMetadata {
    type: string;
    label: string;
    description: string;
    maxDimensions: 2 | 3;
    category: 'force' | 'geometric' | 'hierarchical' | 'special';
  }

  export const LAYOUT_METADATA: LayoutMetadata[] = [
    { type: 'd3', label: 'D3 Force', description: 'D3 force-directed simulation', maxDimensions: 3, category: 'force' },
    // ... all 16 layouts
  ];
  ```

**Dependencies**:
- External: None new (uses existing Mantine components)
- Internal: None

**Verification**:
1. Run: `npm run dev` and navigate to the app
2. Click hamburger menu → "File" section should show "Run Layouts..."
3. Clicking "Run Layouts..." opens modal with layout dropdown
4. Dropdown shows all 16 layout options
5. Cancel button closes modal

---

### Phase 2: Dynamic Layout Options Form Generator

**Objective**: Create a component that dynamically generates form fields based on Zod schemas, supporting number inputs, boolean checkboxes, and enum selects.

**Tests to Write First**:
- `src/components/layout-options/__tests__/LayoutOptionsForm.test.tsx`: Form generation tests
  ```typescript
  it('should render number input for z.number() schema field', () => {
    const schema = z.object({ iterations: z.number().positive().default(50) });
    render(<LayoutOptionsForm schema={schema} values={{}} onChange={() => {}} />);
    expect(screen.getByLabelText('Iterations')).toBeInTheDocument();
  });

  it('should render checkbox for z.boolean() schema field', () => {
    const schema = z.object({ strongGravity: z.boolean().default(false) });
    render(<LayoutOptionsForm schema={schema} values={{}} onChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('should render select for z.enum() schema field', () => {
    const schema = z.object({ align: z.enum(['vertical', 'horizontal']).default('vertical') });
    render(<LayoutOptionsForm schema={schema} values={{}} onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should pre-fill default values from schema', () => {
    const schema = z.object({ iterations: z.number().default(50) });
    render(<LayoutOptionsForm schema={schema} values={{}} onChange={() => {}} />);
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('should hide fields marked as hidden in metadata', () => {
    // scalingFactor, pos, center, nodeMass, etc. should not render
  });
  ```

- `src/utils/__tests__/zodSchemaParser.test.ts`: Schema introspection tests
  ```typescript
  it('should extract field type from z.number()', () => {
    const result = parseZodSchema(z.object({ x: z.number() }));
    expect(result.x.type).toBe('number');
  });

  it('should extract default value from schema', () => {
    const result = parseZodSchema(z.object({ x: z.number().default(10) }));
    expect(result.x.default).toBe(10);
  });

  it('should extract min/max constraints', () => {
    const result = parseZodSchema(z.object({ x: z.number().min(0).max(100) }));
    expect(result.x.min).toBe(0);
    expect(result.x.max).toBe(100);
  });
  ```

**Implementation**:
- `src/utils/zodSchemaParser.ts`: Zod schema introspection utilities
  ```typescript
  interface ParsedField {
    type: 'number' | 'boolean' | 'enum' | 'string' | 'complex';
    default?: unknown;
    min?: number;
    max?: number;
    enumValues?: string[];
    isOptional: boolean;
    isNullable: boolean;
  }

  export function parseZodSchema(schema: z.ZodObject<any>): Record<string, ParsedField>;
  export function getDefaultValues(schema: z.ZodObject<any>): Record<string, unknown>;
  ```

- `src/components/layout-options/LayoutOptionsForm.tsx`: Dynamic form generator
  ```typescript
  interface LayoutOptionsFormProps {
    layoutType: string;
    values: Record<string, unknown>;
    onChange: (values: Record<string, unknown>) => void;
    hiddenFields?: string[];
  }
  // Generates NumberInput, Checkbox, Select based on schema field types
  ```

- `src/data/layoutSchemas.ts`: Re-export/define Zod schemas for all layouts
  ```typescript
  // Re-export schemas from graphty-element or define parallel schemas
  export { D3LayoutConfig } from '@graphty/graphty-element/layout/D3GraphLayoutEngine';
  // ... or define inline if not exported
  ```

- `src/data/layoutMetadata.ts`: Add configSchema and hiddenFields per layout
  ```typescript
  interface LayoutMetadata {
    // ... existing fields
    configSchema: z.ZodObject<any>;
    hiddenFields: string[]; // e.g., ['scalingFactor', 'pos', 'center', 'nodeMass']
  }
  ```

**Dependencies**:
- External: `zod` (already installed)
- Internal: Phase 1 components

**Verification**:
1. Run: `npm run dev`
2. Open "Run Layouts..." modal
3. Select "D3 Force" layout → see alphaMin, alphaTarget, alphaDecay, velocityDecay inputs
4. Select "ForceAtlas2" layout → see maxIter, jitterTolerance, scalingRatio, gravity, etc.
5. Verify hidden fields (scalingFactor, pos, center) are not displayed
6. Form fields show default values
7. Changing values updates form state

---

### Phase 3: Dimension Radio and 2D/3D Mode Integration

**Objective**: Implement the 2D/3D dimension radio button behavior, correctly constraining options based on render mode and layout support.

**Tests to Write First**:
- `src/components/__tests__/RunLayoutsModal.dimension.test.tsx`: Dimension radio tests
  ```typescript
  it('should show dimension radio for layouts with maxDimensions=3', () => {
    render(<RunLayoutsModal opened={true} is2DMode={false} onClose={() => {}} onApply={() => {}} />);
    // Select a 3D-capable layout
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'd3' } });
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('should hide dimension radio for layouts with maxDimensions=2', () => {
    render(<RunLayoutsModal opened={true} is2DMode={false} onClose={() => {}} onApply={() => {}} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'spiral' } });
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('should disable 3D radio when is2DMode=true', () => {
    render(<RunLayoutsModal opened={true} is2DMode={true} onClose={() => {}} onApply={() => {}} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'd3' } });
    expect(screen.getByLabelText('3D')).toBeDisabled();
  });

  it('should allow both 2D and 3D when is2DMode=false', () => {
    render(<RunLayoutsModal opened={true} is2DMode={false} onClose={() => {}} onApply={() => {}} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'd3' } });
    expect(screen.getByLabelText('2D')).not.toBeDisabled();
    expect(screen.getByLabelText('3D')).not.toBeDisabled();
  });

  it('should include dim in config based on radio selection', () => {
    const onApply = vi.fn();
    render(<RunLayoutsModal opened={true} is2DMode={false} onClose={() => {}} onApply={onApply} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'circular' } });
    fireEvent.click(screen.getByLabelText('3D'));
    fireEvent.click(screen.getByText('Apply Layout'));
    expect(onApply).toHaveBeenCalledWith('circular', expect.objectContaining({ dim: 3 }));
  });
  ```

**Implementation**:
- `src/components/RunLayoutsModal.tsx`: Add dimension radio group
  ```typescript
  // Add Radio.Group for dimension selection
  // Conditionally render based on selectedLayout.maxDimensions
  // Disable 3D option when is2DMode=true
  // Merge dim into config on apply
  ```

- Update dimension handling logic:
  ```typescript
  const showDimensionRadio = selectedLayout?.maxDimensions === 3;
  const can3D = !is2DMode && selectedLayout?.maxDimensions === 3;
  const [selectedDim, setSelectedDim] = useState<2 | 3>(is2DMode ? 2 : 3);

  // When layout changes, reset dim based on layout's default
  useEffect(() => {
    if (selectedLayout) {
      setSelectedDim(is2DMode ? 2 : (selectedLayout.maxDimensions === 3 ? 3 : 2));
    }
  }, [selectedLayout, is2DMode]);
  ```

**Dependencies**:
- External: None
- Internal: Phase 1-2 components

**Verification**:
1. Run: `npm run dev`
2. Toggle view mode to 3D (bottom toolbar)
3. Open "Run Layouts..." → select "Circular" (supports 3D) → see 2D/3D radio, both enabled
4. Toggle view mode to 2D
5. Open "Run Layouts..." → select "Circular" → 3D radio is disabled/greyed
6. Select "Spiral" (2D only) → dimension radio hidden
7. Apply layout and verify correct `dim` value is passed

---

### Phase 4: Apply Layout and Read Current State

**Objective**: Wire up the Apply button to update graphty-element, and read current layout state when modal opens.

**Tests to Write First**:
- `src/components/__tests__/RunLayoutsModal.apply.test.tsx`: Apply and state tests
  ```typescript
  it('should call onApply with layout type and config', () => {
    const onApply = vi.fn();
    render(<RunLayoutsModal opened={true} onClose={() => {}} onApply={onApply} is2DMode={false} />);
    // Select layout and modify config
    fireEvent.click(screen.getByText('Apply Layout'));
    expect(onApply).toHaveBeenCalledWith('d3', expect.any(Object));
  });

  it('should pre-select current layout when opened', () => {
    render(
      <RunLayoutsModal
        opened={true}
        currentLayout="circular"
        onClose={() => {}}
        onApply={() => {}}
        is2DMode={false}
      />
    );
    expect(screen.getByRole('combobox')).toHaveValue('circular');
  });

  it('should pre-fill current config values', () => {
    render(
      <RunLayoutsModal
        opened={true}
        currentLayout="circular"
        currentLayoutConfig={{ scale: 2 }}
        onClose={() => {}}
        onApply={() => {}}
        is2DMode={false}
      />
    );
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });

  it('should close modal after applying layout', () => {
    const onClose = vi.fn();
    render(<RunLayoutsModal opened={true} onClose={onClose} onApply={() => {}} is2DMode={false} />);
    fireEvent.click(screen.getByText('Apply Layout'));
    expect(onClose).toHaveBeenCalled();
  });
  ```

- `src/components/__tests__/Graphty.layout.test.tsx`: Integration with graphty-element
  ```typescript
  it('should set layout property on graphty-element when layout prop changes', () => {
    const { rerender } = render(<Graphty layers={[]} layout="d3" />);
    // Verify graphty-element.layout was set
    rerender(<Graphty layers={[]} layout="circular" />);
    // Verify graphty-element.layout updated
  });

  it('should set layoutConfig when layoutConfig prop changes', () => {
    render(<Graphty layers={[]} layout="d3" layoutConfig={{ alphaMin: 0.05 }} />);
    // Verify graphty-element.layoutConfig was set
  });
  ```

**Implementation**:
- `src/components/Graphty.tsx`: Add layout and layoutConfig props
  ```typescript
  interface GraphtyProps {
    // ... existing props
    layout?: string;
    layoutConfig?: Record<string, unknown>;
  }

  // Add useEffect to sync layout/layoutConfig to graphty-element
  useEffect(() => {
    if (graphtyRef.current && layout) {
      graphtyRef.current.layout = layout;
      if (layoutConfig) {
        graphtyRef.current.layoutConfig = layoutConfig;
      }
    }
  }, [layout, layoutConfig]);

  // Expose method to get current layout state
  useImperativeHandle(ref, () => ({
    getCurrentLayout: () => ({
      type: graphtyRef.current?.layout,
      config: graphtyRef.current?.layoutConfig,
    }),
  }));
  ```

- `src/components/layout/AppLayout.tsx`: Add layout state and pass to Graphty
  ```typescript
  const [currentLayout, setCurrentLayout] = useState<string>('d3');
  const [currentLayoutConfig, setCurrentLayoutConfig] = useState<Record<string, unknown>>({});
  const graphtyRef = useRef<GraphtyRef>(null);

  const handleApplyLayout = (layoutType: string, config: Record<string, unknown>) => {
    setCurrentLayout(layoutType);
    setCurrentLayoutConfig(config);
    setRunLayoutsModalOpen(false);
  };

  // When modal opens, read current state from Graphty ref
  const handleOpenRunLayouts = () => {
    if (graphtyRef.current) {
      const current = graphtyRef.current.getCurrentLayout();
      // Pre-populate modal with current values
    }
    setRunLayoutsModalOpen(true);
  };
  ```

- `src/components/RunLayoutsModal.tsx`: Use current state for initialization
  ```typescript
  // Initialize selectedLayout and config from props
  useEffect(() => {
    if (opened && currentLayout) {
      setSelectedLayoutType(currentLayout);
      setConfigValues(currentLayoutConfig ?? {});
    }
  }, [opened, currentLayout, currentLayoutConfig]);
  ```

**Dependencies**:
- External: None
- Internal: Phases 1-3

**Verification**:
1. Run: `npm run dev`
2. Load some graph data
3. Open "Run Layouts..." modal
4. Select a different layout and modify options
5. Click "Apply Layout"
6. Verify graph re-renders with new layout
7. Re-open modal → verify it shows the layout you just applied
8. Verify options show the values you set

---

### Phase 5: Reset to Defaults and Category Grouping

**Objective**: Add "Reset to Defaults" button functionality and group layouts by category in the dropdown for better UX.

**Tests to Write First**:
- `src/components/__tests__/RunLayoutsModal.reset.test.tsx`: Reset functionality tests
  ```typescript
  it('should reset form values to defaults when Reset clicked', () => {
    render(<RunLayoutsModal opened={true} onClose={() => {}} onApply={() => {}} is2DMode={false} />);
    // Modify some values
    const input = screen.getByLabelText('Alpha Min');
    fireEvent.change(input, { target: { value: '0.5' } });
    expect(input).toHaveValue(0.5);

    // Click reset
    fireEvent.click(screen.getByText('Reset to Defaults'));
    expect(input).toHaveValue(0.1); // Default value
  });

  it('should show layouts grouped by category', () => {
    render(<RunLayoutsModal opened={true} onClose={() => {}} onApply={() => {}} is2DMode={false} />);
    // Open dropdown and verify category groups exist
    expect(screen.getByText('Force-Directed')).toBeInTheDocument();
    expect(screen.getByText('Geometric')).toBeInTheDocument();
    expect(screen.getByText('Hierarchical')).toBeInTheDocument();
    expect(screen.getByText('Special')).toBeInTheDocument();
  });
  ```

**Implementation**:
- `src/components/RunLayoutsModal.tsx`: Add Reset button
  ```typescript
  const handleResetToDefaults = () => {
    const defaults = getDefaultValues(selectedLayoutMetadata.configSchema);
    setConfigValues(defaults);
  };

  <Button variant="subtle" onClick={handleResetToDefaults}>
    Reset to Defaults
  </Button>
  ```

- Update layout dropdown to use grouped Select:
  ```typescript
  const groupedLayoutOptions = [
    {
      group: 'Force-Directed',
      items: LAYOUT_METADATA.filter(l => l.category === 'force').map(l => ({
        value: l.type,
        label: l.label,
      })),
    },
    {
      group: 'Geometric',
      items: LAYOUT_METADATA.filter(l => l.category === 'geometric').map(...),
    },
    // ... hierarchical, special
  ];

  <Select data={groupedLayoutOptions} />
  ```

- Add layout descriptions under dropdown:
  ```typescript
  {selectedLayoutMetadata && (
    <Text size="xs" c="gray.5" mt="xs">
      {selectedLayoutMetadata.description}
    </Text>
  )}
  ```

**Dependencies**:
- External: None
- Internal: Phases 1-4

**Verification**:
1. Run: `npm run dev`
2. Open "Run Layouts..." modal
3. Open dropdown → verify layouts grouped by category (Force, Geometric, etc.)
4. Select a layout → verify description appears below dropdown
5. Modify some options
6. Click "Reset to Defaults" → verify values reset to schema defaults
7. Apply layout → verify it works correctly

---

### Phase 6: Polish, Edge Cases, and Accessibility

**Objective**: Handle edge cases (required fields, validation), add loading states, improve accessibility, and ensure consistent dark theme styling.

**Tests to Write First**:
- `src/components/__tests__/RunLayoutsModal.edge.test.tsx`: Edge case tests
  ```typescript
  it('should disable Apply when required fields missing', () => {
    render(<RunLayoutsModal opened={true} onClose={() => {}} onApply={() => {}} is2DMode={false} />);
    // Select bipartite (requires 'nodes' array)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bipartite' } });
    expect(screen.getByText('Apply Layout')).toBeDisabled();
    expect(screen.getByText(/requires node selection/i)).toBeInTheDocument();
  });

  it('should show validation error for invalid number input', () => {
    render(<RunLayoutsModal opened={true} onClose={() => {}} onApply={() => {}} is2DMode={false} />);
    const input = screen.getByLabelText('Alpha Min');
    fireEvent.change(input, { target: { value: '-1' } });
    expect(screen.getByText(/must be positive/i)).toBeInTheDocument();
  });

  it('should have proper aria labels for accessibility', () => {
    render(<RunLayoutsModal opened={true} onClose={() => {}} onApply={() => {}} is2DMode={false} />);
    expect(screen.getByLabelText('Select layout algorithm')).toBeInTheDocument();
    expect(screen.getByLabelText('Layout dimensions')).toBeInTheDocument();
  });

  it('should focus layout dropdown when modal opens', () => {
    render(<RunLayoutsModal opened={true} onClose={() => {}} onApply={() => {}} is2DMode={false} />);
    expect(screen.getByRole('combobox')).toHaveFocus();
  });
  ```

- `src/components/__tests__/RunLayoutsModal.visual.test.tsx`: Visual regression tests
  ```typescript
  it('should match snapshot with dark theme', async () => {
    const { container } = render(<RunLayoutsModal opened={true} onClose={() => {}} onApply={() => {}} is2DMode={false} />);
    expect(container).toMatchSnapshot();
  });
  ```

**Implementation**:
- Add validation to form fields:
  ```typescript
  // Show error state on NumberInput when value violates constraints
  <NumberInput
    error={value < 0 ? 'Must be positive' : undefined}
  />
  ```

- Handle layouts with required fields:
  ```typescript
  const LAYOUTS_WITH_REQUIRED = {
    bipartite: ['nodes'],
    bfs: ['start'],
    multipartite: ['subsetKey'],
  };

  // Show warning message for these layouts
  // Disable Apply button if required fields not provided
  ```

- Add accessibility improvements:
  ```typescript
  <Select
    aria-label="Select layout algorithm"
  />
  <Radio.Group aria-label="Layout dimensions">
  ```

- Ensure consistent dark theme styling (match LoadDataModal):
  ```typescript
  <Modal
    styles={{
      header: { backgroundColor: 'var(--mantine-color-dark-7)' },
      body: { backgroundColor: 'var(--mantine-color-dark-7)', padding: '20px' },
      content: { backgroundColor: 'var(--mantine-color-dark-7)' },
    }}
  />
  ```

- Add auto-focus on modal open:
  ```typescript
  <Select
    autoFocus
  />
  ```

**Dependencies**:
- External: None
- Internal: Phases 1-5

**Verification**:
1. Run: `npm run test:visual` - verify no visual regressions
2. Run: `npm run dev`
3. Open "Run Layouts..." → verify dropdown is focused
4. Select "Bipartite" → see warning about required nodes field
5. Enter invalid number (negative) → see error message
6. Keyboard navigation works (Tab, Enter, Escape)
7. Screen reader announces modal correctly
8. Modal styling matches LoadDataModal (dark theme)

---

## Common Utilities Needed

| Utility | Purpose | Used In |
|---------|---------|---------|
| `zodSchemaParser.ts` | Introspect Zod schemas to extract field types, defaults, constraints | LayoutOptionsForm |
| `getDefaultValues()` | Extract default values from Zod schema | Reset to Defaults, initial form state |
| `camelToTitle()` | Convert camelCase field names to Title Case for labels | LayoutOptionsForm |
| `layoutMetadata.ts` | Central definition of all layout metadata | RunLayoutsModal, category grouping |

## External Libraries Assessment

| Task | Library | Recommendation |
|------|---------|----------------|
| Form field generation | None needed | Mantine components + custom introspection sufficient |
| Schema introspection | zod internal APIs | Use `z.ZodObject._def.shape()` and type checking |
| Dropdown with groups | Mantine Select | Already supports grouped options |

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| **Zod schemas not exported from graphty-element** | Define parallel schemas in `layoutSchemas.ts` that mirror graphty-element's. Keep in sync manually or add export to graphty-element. |
| **graphty-element doesn't expose current layout state** | The web component already has `layout` and `layoutConfig` getters. If needed, access via `element.graph?.layoutManager?.layoutType`. |
| **Complex required fields (bipartite nodes, multipartite subsetKey)** | Show informational message that these layouts require advanced configuration. Disable Apply button. Future: add node picker UI. |
| **Zod v4 API differences** | graphty-element uses `zod/v4`. Ensure same version used in graphty. Test schema introspection thoroughly. |
| **Performance with many form fields** | ForceAtlas2 has ~12 options. Use React.memo on LayoutOptionsForm, debounce onChange. |
| **NGraph has no Zod schema** | NGraph config is plain object. Define a Zod schema in layoutSchemas.ts to match expected config structure. |

## Files Summary

### New Files
- `src/components/RunLayoutsModal.tsx` - Main modal component
- `src/components/layout-options/LayoutOptionsForm.tsx` - Dynamic form generator
- `src/data/layoutMetadata.ts` - Layout metadata definitions
- `src/data/layoutSchemas.ts` - Zod schemas for all layouts
- `src/utils/zodSchemaParser.ts` - Schema introspection utilities
- `src/components/__tests__/RunLayoutsModal.test.tsx` - Unit tests
- `src/components/__tests__/RunLayoutsModal.dimension.test.tsx` - Dimension tests
- `src/components/__tests__/RunLayoutsModal.apply.test.tsx` - Apply tests
- `src/components/__tests__/RunLayoutsModal.reset.test.tsx` - Reset tests
- `src/components/__tests__/RunLayoutsModal.edge.test.tsx` - Edge case tests
- `src/components/layout-options/__tests__/LayoutOptionsForm.test.tsx` - Form tests
- `src/utils/__tests__/zodSchemaParser.test.ts` - Parser tests

### Modified Files
- `src/components/layout/TopMenuBar.tsx` - Add onRunLayouts prop and menu item
- `src/components/layout/AppLayout.tsx` - Add modal state, layout state
- `src/components/Graphty.tsx` - Add layout/layoutConfig props, ref methods

## Success Criteria Checklist

- [ ] "Run Layouts..." menu item appears under File section
- [ ] Modal matches dark theme of existing UI
- [ ] All 16 layouts available in dropdown (grouped by category)
- [ ] Modal reads current layout from graphty-element on open
- [ ] Dimension radio shown for 3D-capable layouts
- [ ] 3D option disabled in 2D render mode
- [ ] Form fields generated from Zod schemas
- [ ] Hidden fields (scalingFactor, pos, center, etc.) not shown
- [ ] Default values pre-filled
- [ ] Reset to Defaults works
- [ ] Apply Layout updates graphty-element
- [ ] Graph re-renders with new layout
- [ ] Re-opening modal shows current state
- [ ] Cancel closes without changes
- [ ] Required field warnings for bipartite/bfs/multipartite
- [ ] Keyboard accessible (focus, Tab, Enter, Escape)
- [ ] All tests passing
