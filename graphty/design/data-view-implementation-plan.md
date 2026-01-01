# Implementation Plan for Data View Feature

## Overview

This plan implements a Data View feature that allows users to inspect raw graph data in a structured, searchable format. The feature includes:

1. A "View Data..." menu item that opens a modal displaying all loaded nodes and edges
2. A right sidebar accordion showing data for selected nodes/edges
3. Copy functionality for values and JMESPath paths

The implementation uses `@redheadphone/react-json-grid` for efficient table-based JSON display that works well in narrow sidebars.

## Phase Breakdown

### Phase 1: DataGrid Component with Storybook

**Objective**: Create the core DataGrid wrapper component and verify it works via Storybook.

**Tests to Write First**:

- `src/components/data-view/__tests__/DataGrid.test.tsx`:

    ```typescript
    describe("DataGrid", () => {
      it("renders JSON data in a grid format", () => {
        render(<DataGrid data={{ name: "test", value: 123 }} />);
        expect(screen.getByText("name")).toBeInTheDocument();
      });

      it("calls onSelect with keyPath when cell is clicked", async () => {
        const onSelect = vi.fn();
        render(<DataGrid data={{ key: "value" }} onSelect={onSelect} />);
        await userEvent.click(screen.getByText("value"));
        expect(onSelect).toHaveBeenCalled();
      });

      it("highlights cells matching searchText", () => {
        render(<DataGrid data={{ name: "searchme" }} searchText="search" />);
        // Verify highlight class is applied
      });
    });
    ```

- `src/components/data-view/__tests__/mantineTheme.test.ts`:
    ```typescript
    describe("mantineJsonGridTheme", () => {
        it("uses Mantine CSS variables for all color properties", () => {
            expect(mantineJsonGridTheme.bgColor).toContain("--mantine-color");
        });
    });
    ```

**Implementation**:

- `src/components/data-view/mantineTheme.ts`: Custom theme mapping

    ```typescript
    export const mantineJsonGridTheme = {
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
    };
    ```

- `src/components/data-view/DataGrid.tsx`: Wrapper component

    ```typescript
    export interface DataGridProps {
        data: object;
        defaultExpandDepth?: number;
        searchText?: string;
        onSelect?: (keyPath: string[]) => void;
    }
    ```

- `src/components/data-view/DataGrid.stories.tsx`: Storybook stories

    ```typescript
    export const FlatObject: Story = {
        args: { data: { name: "Test", count: 42, active: true } },
    };
    export const NestedObject: Story = {
        args: { data: { user: { name: "John", profile: { age: 30 } } } },
    };
    export const ArrayOfObjects: Story = {
        args: {
            data: [
                { id: 1, name: "A" },
                { id: 2, name: "B" },
            ],
        },
    };
    export const WithSearch: Story = {
        args: { data: { name: "searchable" }, searchText: "search" },
    };
    ```

- `src/components/data-view/index.ts`: Module exports

**Dependencies**:

- External: `@redheadphone/react-json-grid` (npm install required)

**Browser Verification**:

1. Run: `npm run storybook`
2. Navigate to DataGrid stories
3. Verify: Grid renders with dark theme, cells are clickable, search highlights work
4. Check: Nested objects expand/collapse with `[+]`/`[-]` toggles

---

### Phase 2: View Data Modal with Storybook

**Objective**: Create the modal component with tabs and search, verifiable in Storybook.

**Tests to Write First**:

- `src/components/data-view/__tests__/ViewDataModal.test.tsx`:

    ```typescript
    describe("ViewDataModal", () => {
      const mockData = {
        nodes: [{ id: "1", label: "Node 1" }],
        edges: [{ src: "1", dst: "2" }],
      };

      it("renders when opened is true", () => {
        render(<ViewDataModal opened={true} onClose={vi.fn()} data={mockData} />);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      it("shows Nodes tab by default", () => {
        render(<ViewDataModal opened={true} onClose={vi.fn()} data={mockData} />);
        expect(screen.getByText("Node 1")).toBeInTheDocument();
      });

      it("switches to Edges when tab clicked", async () => {
        render(<ViewDataModal opened={true} onClose={vi.fn()} data={mockData} />);
        await userEvent.click(screen.getByRole("tab", { name: /edges/i }));
        // Verify edges are shown
      });

      it("shows item count in footer", () => {
        render(<ViewDataModal opened={true} onClose={vi.fn()} data={mockData} />);
        expect(screen.getByText(/1 node/i)).toBeInTheDocument();
      });

      it("calls onClose when close button clicked", async () => {
        const onClose = vi.fn();
        render(<ViewDataModal opened={true} onClose={onClose} data={mockData} />);
        await userEvent.click(screen.getByLabelText(/close/i));
        expect(onClose).toHaveBeenCalled();
      });
    });
    ```

**Implementation**:

- `src/components/data-view/ViewDataModal.tsx`:

    ```typescript
    export interface ViewDataModalProps {
        opened: boolean;
        onClose: () => void;
        data: {
            nodes: Record<string, unknown>[];
            edges: Record<string, unknown>[];
        };
    }
    ```

    - Mantine Modal with dark styling
    - SegmentedControl for Nodes/Edges tabs
    - TextInput for search (debounced 300ms)
    - DataGrid component for display
    - Footer with item count

- `src/components/data-view/ViewDataModal.stories.tsx`:
    ```typescript
    export const WithSampleData: Story = {
        args: {
            opened: true,
            data: {
                nodes: [
                    { id: "1", label: "Start", metadata: { x: 0, y: 0 } },
                    { id: "2", label: "End", metadata: { x: 100, y: 100 } },
                ],
                edges: [{ src: "1", dst: "2", weight: 1.5 }],
            },
        },
    };
    export const EmptyData: Story = {
        args: { opened: true, data: { nodes: [], edges: [] } },
    };
    export const LargeDataset: Story = {
        args: {
            opened: true,
            data: {
                nodes: Array.from({ length: 100 }, (_, i) => ({ id: `${i}`, label: `Node ${i}` })),
                edges: [],
            },
        },
    };
    ```

**Dependencies**:

- Internal: `DataGrid` from Phase 1
- External: Mantine hooks (`useDebouncedValue` if available, else custom)

**Browser Verification**:

1. Run: `npm run storybook`
2. Navigate to ViewDataModal stories
3. Verify: Modal renders with dark theme, tabs switch content, search filters
4. Check: Scrolling works for large datasets, close button works

---

### Phase 3: App Integration

**Objective**: Wire the modal into the app so users can open it from the hamburger menu.

**Tests to Write First**:

- `src/components/layout/__tests__/TopMenuBar.test.tsx` (add to existing):

    ```typescript
    describe("TopMenuBar - View Data", () => {
      it("renders View Data menu item", async () => {
        render(<TopMenuBar {...defaultProps} />);
        await userEvent.click(screen.getByLabelText(/menu/i));
        expect(screen.getByText("View Data...")).toBeInTheDocument();
      });

      it("calls onViewData when clicked", async () => {
        const onViewData = vi.fn();
        render(<TopMenuBar {...defaultProps} onViewData={onViewData} />);
        await userEvent.click(screen.getByLabelText(/menu/i));
        await userEvent.click(screen.getByText("View Data..."));
        expect(onViewData).toHaveBeenCalled();
      });

      it("disables View Data when hasData is false", async () => {
        render(<TopMenuBar {...defaultProps} hasData={false} />);
        await userEvent.click(screen.getByLabelText(/menu/i));
        const item = screen.getByText("View Data...").closest("[role='menuitem']");
        expect(item).toHaveAttribute("data-disabled", "true");
      });
    });
    ```

**Implementation**:

- Modify `src/components/layout/TopMenuBar.tsx`:
    - Add props: `onViewData?: () => void`, `hasData?: boolean`
    - Add menu item under File section after "Load Data..."

- Modify `src/components/layout/AppLayout.tsx`:
    - Add state: `const [viewDataModalOpen, setViewDataModalOpen] = useState(false)`
    - Extract data: Access `nodeData` and `edgeData` from graphty-element ref
    - Render: `<ViewDataModal opened={viewDataModalOpen} onClose={...} data={...} />`
    - Pass handlers to TopMenuBar

**Dependencies**:

- Internal: `ViewDataModal` from Phase 2

**Browser Verification**:

1. Run: `npm run dev`
2. Load a graph dataset (use existing Load Data feature)
3. Click hamburger menu → "View Data..."
4. Verify: Modal opens showing the loaded nodes and edges
5. Check: Tabs work, search works, close works
6. Check: Menu item is disabled when no data is loaded

---

### Phase 4: Copy Functionality

**Objective**: Add copy buttons so users can copy values and JMESPath paths to clipboard.

**Tests to Write First**:

- `src/components/data-view/__tests__/pathUtils.test.ts`:

    ```typescript
    describe("keyPathToJMESPath", () => {
        it("converts array index paths", () => {
            expect(keyPathToJMESPath(["0", "name"])).toBe("[0].name");
        });
        it("converts object key paths", () => {
            expect(keyPathToJMESPath(["metadata", "created"])).toBe("metadata.created");
        });
        it("handles mixed paths", () => {
            expect(keyPathToJMESPath(["users", "0", "profile"])).toBe("users[0].profile");
        });
    });
    ```

- `src/components/data-view/__tests__/CopyButton.test.tsx`:

    ```typescript
    describe("CopyButton", () => {
      beforeEach(() => {
        Object.assign(navigator, {
          clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
        });
      });

      it("copies value on click", async () => {
        render(<CopyButton value="test" />);
        await userEvent.click(screen.getByRole("button"));
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("test");
      });

      it("shows Copied feedback", async () => {
        render(<CopyButton value="test" />);
        await userEvent.click(screen.getByRole("button"));
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });

      it("copies path on shift+click", async () => {
        render(<CopyButton value="test" path="nodes[0].name" />);
        await userEvent.click(screen.getByRole("button"), { shiftKey: true });
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("nodes[0].name");
      });
    });
    ```

**Implementation**:

- `src/components/data-view/pathUtils.ts`:

    ```typescript
    export function keyPathToJMESPath(keyPath: string[]): string;
    export function getValueAtPath(data: object, keyPath: string[]): unknown;
    ```

- `src/components/data-view/CopyButton.tsx`:

    ```typescript
    export interface CopyButtonProps {
        value: unknown;
        path?: string;
    }
    ```

    - Small icon button (clipboard icon)
    - Shows tooltip "Copied!" on success
    - Shift+click copies path instead of value

- Modify `src/components/data-view/DataGrid.tsx`:
    - Track selected cell via `onSelect`
    - Show CopyButton overlay on selected cell
    - Compute JMESPath from keyPath

**Dependencies**:

- Internal: `DataGrid` from Phase 1

**Browser Verification**:

1. Run: `npm run dev`
2. Open View Data modal
3. Click on a cell → copy button appears
4. Click copy button → paste in another app to verify value copied
5. Shift+click copy button → verify JMESPath is copied (e.g., `[0].metadata.x`)
6. Verify "Copied!" feedback appears briefly

---

### Phase 5: Right Sidebar Data Accordion

**Objective**: Add a Data accordion to the right sidebar for viewing selected element data.

**Tests to Write First**:

- `src/components/data-view/__tests__/DataAccordion.test.tsx`:

    ```typescript
    describe("DataAccordion", () => {
      const mockData = { id: "1", label: "Test", metadata: { x: 10 } };

      it("renders Data section header", () => {
        render(<DataAccordion data={mockData} />);
        expect(screen.getByText("Data")).toBeInTheDocument();
      });

      it("shows data when expanded", () => {
        render(<DataAccordion data={mockData} />);
        expect(screen.getByText("Test")).toBeInTheDocument();
      });

      it("collapses when header clicked", async () => {
        render(<DataAccordion data={mockData} />);
        await userEvent.click(screen.getByText("Data"));
        expect(screen.queryByText("Test")).not.toBeInTheDocument();
      });

      it("shows placeholder when data is null", () => {
        render(<DataAccordion data={null} />);
        expect(screen.getByText(/no element selected/i)).toBeInTheDocument();
      });

      it("has copy all button", () => {
        render(<DataAccordion data={mockData} />);
        expect(screen.getByLabelText(/copy all/i)).toBeInTheDocument();
      });
    });
    ```

**Implementation**:

- `src/components/data-view/DataAccordion.tsx`:

    ```typescript
    export interface DataAccordionProps {
        data: Record<string, unknown> | null;
        title?: string;
    }
    ```

    - Uses existing `ControlSection` pattern from sidebar
    - "Copy All" button in header copies entire JSON
    - Shows DataGrid when data provided
    - Shows placeholder text when null

- `src/components/data-view/DataAccordion.stories.tsx`:

    ```typescript
    export const WithNodeData: Story = {
      args: { data: { id: "1", label: "Node", x: 100, y: 200 } },
    };
    export const NoSelection: Story = {
      args: { data: null },
    };
    export const NarrowWidth: Story = {
      decorators: [(Story) => <div style={{ width: 300 }}><Story /></div>],
      args: { data: { nested: { deeply: { value: "test" } } } },
    };
    ```

- Modify `src/components/sidebar/RightSidebar.tsx`:
    - Add optional prop: `selectedElementData?: Record<string, unknown> | null`
    - Render DataAccordion at bottom of sidebar

- Modify `src/components/layout/AppLayout.tsx`:
    - Add placeholder state for future selection feature
    - Pass to RightSidebar

**Dependencies**:

- Internal: `DataGrid`, `CopyButton` from earlier phases

**Browser Verification**:

1. Run: `npm run storybook`
2. View DataAccordion stories at 300px width
3. Verify: Accordion expands/collapses, data displays without horizontal scroll
4. Run: `npm run dev`
5. Verify: Accordion appears in right sidebar (with placeholder since selection isn't implemented yet)

---

### Phase 6: Polish and Visual Testing

**Objective**: Add visual regression tests, performance tests, and accessibility improvements.

**Tests to Write**:

- `src/components/data-view/__tests__/DataGrid.visual.test.tsx`:

    ```typescript
    describe("DataGrid Visual", () => {
        it("flat object", async ({ page }) => {
            await page.goto("/storybook/iframe.html?id=datagrid--flat-object");
            await expect(page).toHaveScreenshot("datagrid-flat.png");
        });
        it("nested object", async ({ page }) => {
            await page.goto("/storybook/iframe.html?id=datagrid--nested-object");
            await expect(page).toHaveScreenshot("datagrid-nested.png");
        });
        it("search highlight", async ({ page }) => {
            await page.goto("/storybook/iframe.html?id=datagrid--with-search");
            await expect(page).toHaveScreenshot("datagrid-search.png");
        });
    });
    ```

- `src/components/data-view/__tests__/performance.test.tsx`:
    ```typescript
    describe("Performance", () => {
      it("renders 1000 items in under 1 second", () => {
        const data = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
        const start = performance.now();
        render(<DataGrid data={data} />);
        expect(performance.now() - start).toBeLessThan(1000);
      });
    });
    ```

**Implementation**:

- Add accessibility attributes:
    - `aria-label` on all buttons
    - Keyboard navigation for DataGrid (if not provided by library)

- Add `React.memo()` to expensive components

- Ensure all Storybook stories are complete and documented

- Update `src/components/data-view/index.ts` with all exports

**Dependencies**:

- Internal: All previous phases

**Browser Verification**:

1. Run: `npm run test:visual`
2. Verify: All visual snapshots pass
3. Run: `npm run storybook`
4. Navigate through all stories, verify no visual issues
5. Test keyboard navigation (Tab, Enter, Escape)
6. Run Lighthouse accessibility audit on Storybook pages

---

## Common Utilities

| Utility                | Purpose                                  | Location                                   |
| ---------------------- | ---------------------------------------- | ------------------------------------------ |
| `keyPathToJMESPath`    | Convert keyPath array to JMESPath string | `src/components/data-view/pathUtils.ts`    |
| `getValueAtPath`       | Extract value from object at keyPath     | `src/components/data-view/pathUtils.ts`    |
| `mantineJsonGridTheme` | Theme object for react-json-grid         | `src/components/data-view/mantineTheme.ts` |

## External Libraries

| Library                         | Purpose                 | Install                                     |
| ------------------------------- | ----------------------- | ------------------------------------------- |
| `@redheadphone/react-json-grid` | Table-based JSON viewer | `npm install @redheadphone/react-json-grid` |

Mantine's `useDebouncedValue` hook will be used for search debouncing (already available).

## Risk Mitigation

| Risk                      | Mitigation                                            |
| ------------------------- | ----------------------------------------------------- |
| Library API changes       | Pin version, wrap in DataGrid component               |
| Large dataset performance | Default `defaultExpandDepth={1}`, collapse by default |
| Theme mismatch            | Visual tests, test in both modal and sidebar          |
| Copy button positioning   | Test in narrow sidebar (300px)                        |

## File Structure

```
src/components/data-view/
├── __tests__/
│   ├── DataGrid.test.tsx
│   ├── DataGrid.visual.test.tsx
│   ├── ViewDataModal.test.tsx
│   ├── DataAccordion.test.tsx
│   ├── CopyButton.test.tsx
│   ├── pathUtils.test.ts
│   └── performance.test.tsx
├── DataGrid.tsx
├── DataGrid.stories.tsx
├── ViewDataModal.tsx
├── ViewDataModal.stories.tsx
├── DataAccordion.tsx
├── DataAccordion.stories.tsx
├── CopyButton.tsx
├── mantineTheme.ts
├── pathUtils.ts
└── index.ts
```

## Definition of Done (per phase)

1. All unit tests pass: `npm test`
2. No TypeScript errors: `npm run typecheck`
3. No lint errors: `npm run lint`
4. Browser verification steps pass (Storybook or app)
5. Storybook stories render correctly (where applicable)
