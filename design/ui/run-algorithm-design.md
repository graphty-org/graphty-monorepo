# Feature Design: Run Algorithm Modal

## Overview
- **User Value**: Enables users to run graph algorithms directly from the UI without code, visualizing results like centrality, communities, and shortest paths through automatically applied styles
- **Technical Value**: Provides a consistent, discoverable interface for algorithm execution that leverages the existing suggested styles system and integrates with the style layers sidebar

## Requirements
1. Add "Run Algorithm..." menu item to the hamburger menu (similar to "Load Data...")
2. Pop open a modal window for algorithm selection and configuration
3. Each algorithm should have its own specific options UI
4. Running an algorithm should create the suggested style layer(s), which appear in the style layers sidebar
5. Support algorithms that require node selection (Dijkstra, BFS, DFS, etc.)

## Proposed Solution

### User Interface

#### Menu Integration
- Add "Run Algorithm..." item to File section of hamburger menu
- Use `Zap` icon from lucide-react (suggesting computation/execution)
- Positioned after "Load Data..." menu item

#### Modal Layout
```
┌────────────────────────────────────────────────────┐
│ Run Algorithm                                   ✕  │
├────────────────────────────────────────────────────┤
│ Category: [Centrality ▼]                           │
│                                                    │
│ Algorithm: [PageRank ▼]                            │
│                                                    │
│ ┌────────────────────────────────────────────────┐ │
│ │ PageRank measures node importance based on     │ │
│ │ incoming connections from important nodes.     │ │
│ └────────────────────────────────────────────────┘ │
│                                                    │
│ ─── Options ───────────────────────────────────── │
│                                                    │
│ (Algorithm-specific options appear here)           │
│                                                    │
│ ☑ Apply suggested styles                           │
│                                                    │
│                         [Cancel]  [Run Algorithm]  │
└────────────────────────────────────────────────────┘
```

#### Algorithm Categories
| Category | Algorithms |
|----------|------------|
| Centrality | Degree, PageRank, Betweenness, Closeness, Eigenvector, Katz, HITS |
| Community Detection | Louvain, Girvan-Newman, Label Propagation, Leiden |
| Shortest Path | Dijkstra, Bellman-Ford, Floyd-Warshall |
| Traversal | BFS, DFS |
| Components | Connected Components, Strongly Connected Components |
| Minimum Spanning Tree | Kruskal, Prim |
| Flow | Max Flow, Min Cut, Bipartite Matching |

#### Algorithm Options UI

**Simple Algorithms (no options)**:
- Degree, Louvain, Connected Components, etc.
- Just show the description

**Algorithms with Node Selection** (Dijkstra, BFS, DFS, Bellman-Ford, Prim, Max Flow, Min Cut):
```
Source Node: [Select or enter node ID ▼]
Target Node: [Select or enter node ID ▼]  (optional for some)
```

Options for node selection:
1. Dropdown populated with current graph nodes
2. Type-ahead search for large graphs
3. "First node" / "Last node" quick options

**Future Enhancement**: Click-to-select nodes directly on the graph visualization

### Technical Architecture

#### Key Architectural Decision: graphty-element as Source of Truth

**graphty-element owns the style layers.** The React app syncs its sidebar state by listening for `"style-changed"` events and querying the current layers from graphty-element.

This means:
- `runAlgorithm(..., { applySuggestedStyles: true })` adds layers to graphty-element's `StyleManager`
- React listens for changes and updates its sidebar state accordingly
- The sidebar reflects the actual state of layers in graphty-element
- User edits to layers in the sidebar are pushed back to graphty-element

#### Components

**New Files:**
1. `src/components/RunAlgorithmModal.tsx` - Main modal component
2. `src/hooks/useGraphLayers.ts` - Hook to sync layers from graphty-element

**Modified Files:**
1. `src/components/layout/TopMenuBar.tsx` - Add menu item and callback prop
2. `src/components/layout/AppLayout.tsx` - Add modal state, use layer sync hook
3. `src/components/Graphty.tsx` - Expose graph ref and event subscription

#### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        GRAPHTY-ELEMENT                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ StyleManager                                             │    │
│  │  - layers[] (source of truth)                            │    │
│  │  - emits "style-changed" event on any layer change       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              │ "style-changed" event             │
│                              ▼                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         REACT APP                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ useGraphLayers hook                                      │    │
│  │  - subscribes to "style-changed" events                  │    │
│  │  - queries graph.styleManager.getStyles().layers         │    │
│  │  - converts to LayerItem[] for sidebar                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ LeftSidebar                                              │    │
│  │  - displays layers from hook                             │    │
│  │  - user edits → push changes back to graphty-element     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

#### Algorithm Execution Flow

```
User clicks "Run Algorithm..."
    │
    ▼
RunAlgorithmModal opens
    │
    ▼
User selects algorithm + options, clicks "Run"
    │
    ▼
Modal calls: graphtyRef.current.graph.runAlgorithm(
    namespace, type, { applySuggestedStyles: true }
)
    │
    ▼
graphty-element executes algorithm
    │
    ▼
graphty-element's applySuggestedStyles() adds layers to StyleManager
    │
    ▼
StyleManager emits "style-changed" event
    │
    ▼
useGraphLayers hook receives event
    │
    ▼
Hook queries layers, updates React state
    │
    ▼
LeftSidebar re-renders with new layers
```

#### Event System

graphty-element uses two event mechanisms:

1. **Internal events** via BabylonJS `Observable` in `EventManager` - typed events for internal communication
2. **DOM CustomEvents** forwarded from the web component - standard browser events

The `EventManager` exposes `onGraphEvent` Observable. A single observer forwards ALL graph events as DOM CustomEvents:

```typescript
// In graphty-element.ts asyncFirstUpdated()
// Universal event forwarder - all internal events become DOM CustomEvents
this.#graph.eventManager.onGraphEvent.add((event) => {
    this.dispatchEvent(new CustomEvent(event.type, {
        detail: event,
        bubbles: true,
        composed: true,
    }));
});
```

**Benefits:**
- One line of setup instead of 6+ lines per event
- Automatically includes new events (like `"style-changed"`) without code changes
- Uses the existing Observable pattern

**React usage with standard DOM events:**

```typescript
useEffect(() => {
    const element = graphtyRef.current;
    if (!element) return;

    const handleStyleChanged = () => {
        // Sync layers from graphty-element
    };

    element.addEventListener("style-changed", handleStyleChanged);
    return () => element.removeEventListener("style-changed", handleStyleChanged);
}, []);
```

#### GraphtyElementType Extension

```typescript
interface GraphtyElementType extends HTMLElement {
    // ... existing properties ...
    graph?: {
        dataManager: {
            clear: () => void;
            nodes: Map<string | number, NodeData>;
        };
        styleManager: {
            getStyles: () => {
                layers: readonly StyleLayerType[];
            };
        };
        runAlgorithm: (
            namespace: string,
            type: string,
            options?: { applySuggestedStyles?: boolean }
        ) => Promise<void>;
    };
}
```

#### useGraphLayers Hook

```typescript
interface LayerItem {
    id: string;
    name: string;
    styleLayer: {
        node?: { selector: string; style: Record<string, unknown> };
        edge?: { selector: string; style: Record<string, unknown> };
    };
}

function useGraphLayers(graphtyRef: RefObject<GraphtyElementType>): {
    layers: LayerItem[];
    updateLayer: (id: string, updates: Partial<LayerItem>) => void;
    deleteLayer: (id: string) => void;
    reorderLayers: (fromIndex: number, toIndex: number) => void;
} {
    const [layers, setLayers] = useState<LayerItem[]>([]);

    useEffect(() => {
        const element = graphtyRef.current;
        const graph = element?.graph;
        if (!element || !graph) return;

        const syncLayers = () => {
            const styleLayers = graph.styleManager.getStyles().layers;
            const converted: LayerItem[] = styleLayers.map((layer, idx) => ({
                id: layer.metadata?.id ?? `layer-${idx}`,
                name: layer.metadata?.name ?? `Layer ${idx + 1}`,
                styleLayer: {
                    node: layer.node ? {
                        selector: layer.node.selector,
                        style: layer.node.style,
                    } : undefined,
                    edge: layer.edge ? {
                        selector: layer.edge.selector,
                        style: layer.edge.style,
                    } : undefined,
                },
            }));
            setLayers(converted);
        };

        // Initial sync
        syncLayers();

        // Listen for style-changed DOM events
        const handleStyleChanged = () => syncLayers();
        element.addEventListener("style-changed", handleStyleChanged);

        return () => {
            element.removeEventListener("style-changed", handleStyleChanged);
        };
    }, [graphtyRef]);

    // ... updateLayer, deleteLayer, reorderLayers implementations
    // These would call StyleManager methods and trigger "style-changed" events
}
```

#### Layer Naming

When algorithms add suggested styles, the layer name should be simple:
- Use algorithm display name: "PageRank", "Louvain", "Dijkstra"
- NOT the internal metadata name like "PageRank - Node Size"

This requires either:
1. **Option A**: Modify how `applySuggestedStyles` sets the layer name (in graphty-element)
2. **Option B**: Post-process layer names in the React hook based on `algorithmSource` metadata

**Recommendation**: Option A - update graphty-element to use simpler names. The `algorithmSource` metadata already tracks which algorithm created the layer.

#### Algorithm Metadata Catalog

Since the algorithm registry doesn't expose a list of available algorithms, we define the catalog in the React app:

```typescript
type AlgorithmCategory =
    | "centrality"
    | "community"
    | "shortest-path"
    | "traversal"
    | "components"
    | "mst"
    | "flow";

interface AlgorithmInfo {
    namespace: string;
    type: string;
    displayName: string;
    category: AlgorithmCategory;
    description: string;
    requiresOptions: boolean;
}

const ALGORITHM_CATALOG: AlgorithmInfo[] = [
    {
        namespace: "graphty",
        type: "pagerank",
        displayName: "PageRank",
        category: "centrality",
        description: "Measures node importance based on incoming connections from other important nodes",
        requiresOptions: false,
    },
    {
        namespace: "graphty",
        type: "dijkstra",
        displayName: "Dijkstra",
        category: "shortest-path",
        description: "Finds the shortest path between two nodes",
        requiresOptions: true,
    },
    // ... all 23 algorithms
];
```

### Implementation Approach

#### Phase 1: Layer Sync Infrastructure
1. Replace manual event forwarding in `graphty-element.ts` with universal forwarder (one line)
2. Create `useGraphLayers` hook with DOM event listener for `"style-changed"`
3. Refactor `AppLayout` to use hook instead of local state
4. Verify sidebar updates when layers change in graphty-element

#### Phase 2: Run Algorithm Modal (MVP)
1. Create `RunAlgorithmModal.tsx` with category/algorithm selection
2. Add menu item to `TopMenuBar.tsx`
3. Add modal state to `AppLayout.tsx`
4. Implement algorithm execution with `applySuggestedStyles: true`
5. Verify layers appear in sidebar after execution

#### Phase 3: Algorithm Options
1. Implement node selection UI for path-finding algorithms
2. Create dropdown populated with graph nodes
3. Wire options through to algorithm execution

#### Phase 4: Polish
1. Loading state during algorithm execution
2. Error display for algorithm failures
3. Success feedback

## Acceptance Criteria

### Must Have
- [ ] "Run Algorithm..." menu item appears in hamburger menu
- [ ] Modal opens with algorithm category and selection dropdowns
- [ ] All 23 algorithms are selectable
- [ ] Algorithms execute successfully when "Run" is clicked
- [ ] Suggested style layers appear in the Layers sidebar after execution
- [ ] "Apply suggested styles" checkbox controls layer creation
- [ ] Modal closes after successful execution
- [ ] Error display for algorithm execution failures
- [ ] Sidebar reflects actual layer state from graphty-element (event-based sync)

### Should Have
- [ ] Algorithm descriptions shown in modal
- [ ] Category filtering works correctly
- [ ] Dijkstra/BFS/DFS allow source/target node selection
- [ ] Loading indicator during algorithm execution
- [ ] Disabled "Run" button when algorithm is executing

### Nice to Have
- [ ] Node selector has search/filter capability
- [ ] Recently run algorithms section
- [ ] Keyboard navigation in modal

## Technical Considerations

### Performance
- **Impact**: Algorithm execution can be CPU-intensive for large graphs
- **Mitigation**:
  - Show loading state during execution
  - The existing queue system in graphty-element handles execution ordering
  - Event-based layer sync is efficient (only syncs on actual changes)

### Security
- No external data fetching, algorithms run on loaded graph data only
- Node selection inputs should be sanitized (handled by graphty-element)

### Compatibility
- Follows existing modal patterns (LoadDataModal)
- Uses same Mantine components
- No breaking changes to existing functionality
- Event subscription pattern aligns with graphty-element's EventManager

### Testing
- Unit tests for `useGraphLayers` hook
- Unit tests for RunAlgorithmModal component
- Integration tests for algorithm execution flow
- Integration tests for layer sync behavior
- Visual regression tests for modal UI states

## Risks and Mitigation

### Risk: `"style-changed"` event not exposed as DOM event
**Mitigation**: Replace manual event forwarding in graphty-element with a universal forwarder using `eventManager.onGraphEvent.add()`. This is a one-line change that automatically exposes ALL internal events (including `"style-changed"`) as DOM CustomEvents.

### Risk: Algorithm registry not accessible
**Mitigation**: Define algorithm catalog statically in React app. While less dynamic, this provides better UX with descriptions and categorization.

### Risk: Layer identity across syncs
**Mitigation**: Use stable IDs on layers. If graphty-element layers don't have IDs, generate them based on index + metadata hash, or add ID support to StyleManager.

### Risk: Duplicate layers from multiple algorithm runs
**Mitigation**: This is intended behavior - each algorithm run adds new layers. Users can manually delete unwanted layers from the sidebar. Layer names are simple (e.g., "PageRank") so users can distinguish runs by position in the list.

### Risk: Bidirectional sync complexity
**Mitigation**: Keep it simple for MVP:
- graphty-element → React: event-based, read layers on change
- React → graphty-element: direct StyleManager calls for edits/deletes/reorder
- Both directions trigger "style-changed", but the hook can debounce/dedupe

## Future Enhancements

1. **Interactive Node Selection**: Click on nodes in the graph to set source/target
2. **Algorithm Comparison**: Run multiple algorithms and compare results side-by-side
3. **Result Inspection**: Panel showing algorithm output values per node/edge
4. **Custom Options UI**: Full Zod schema-driven form generation for algorithm options
5. **Algorithm Presets**: Save favorite algorithm configurations
6. **Batch Execution**: Run multiple algorithms in sequence
7. **Export Results**: Export algorithm results to CSV/JSON
8. **Undo/Redo**: Layer changes tracked in undo stack
