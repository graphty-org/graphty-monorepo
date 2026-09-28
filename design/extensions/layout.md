# Layout extension point

Status: draft specification against graphty-element 2.6.1. Shared rules are in `README.md`.

Normative files: `layout.d.ts`, `descriptors.schema.json#/$defs/LayoutDescriptor` and
`#/$defs/AuthoredLayoutDescriptor`, and this document.

## 1. What a layout is

A layout decides where nodes sit. It comes in two kinds:

- **live**: a simulation the element steps frame by frame until it reports itself settled (a
  force-directed layout, a constraint solver). Extends `LayoutEngine`.
- **batch**: an arrangement computed in one pass (a circular, tiered, radial or geographic
  placement). Extends `SimpleLayoutEngine` and implements only `doLayout()`.

Grounding: owner's list of official points (2026-09-21) and his parity test requirement
("layouts should place nodes"); `design/graphty-element/extension-points.md` section "Layout"
(kept); design-studio needs for hierarchical tiers, radial, per-cluster and geographic layouts
(`design/designloom/workflows/W11.yaml`, `W17.yaml`, `W21.yaml`, `W24.yaml`).

## 2. Data model

| Type | Kind |
| --- | --- |
| `AuthoredLayoutDescriptor`, the statics (`type`, `maxDimensions`, `honoursWeights`, `scoped`, `descriptor`), the abstract members of `LayoutEngine`, `SimpleLayoutEngine.doLayout` | implemented by extensions |
| `Node`, `Edge` (type-only), `Position`, `EdgePosition`, the protected helpers (`isHeld`, `writeNodePosition`), `holdMask`, `SimpleLayoutEngine.positions`, `_nodes`, `_edges`, `scalingFactor` | called by extensions |

`Node` and `Edge` are published as type-only re-exports so that a plugin can type its members
without importing the renderer. A layout MUST read only `Node.id`, `Node.index`, `Node.data`,
`Edge.id`, `Edge.srcId`, `Edge.dstId` and `Edge.data` (the built-in fixed layout reads
coordinates from `Node.data`, so attribute access is at parity), and MUST NOT construct, mutate or retain a `Node` or `Edge` beyond
its own lifetime. Every other member of those classes is renderer state and is not part of this
contract; reading it is unsupported and will break when the layout contract moves onto the
snapshot (section 7). `Node.data` holds the attributes as LOADED; an algorithm's results live under
result paths and are not in it, so a layout cannot today place nodes by a computed value (a tier
computed as a distance, a ring by betweenness). Resolving an `"attribute"` option that names a
result path is open decision 17.

`AuthoredLayoutDescriptor` rules:

| Member | Rule |
| --- | --- |
| `id` | Non-empty; MUST equal `static type`; not a built-in arrangement id (`KNOWN_LAYOUT_IDS`) or built-in engine name |
| `plainName`, `technicalName`, `description`, `family` | Strings; `plainName` non-empty |
| `kind` | `"live"` or `"batch"`; MUST match the base class (`SimpleLayoutEngine` is batch) (not yet enforced at registration) |
| `maxDimensions` | 2 or 3; MUST equal `static maxDimensions` (not yet enforced at registration) |
| `sizeRating` | `"any"`, 10000, 2000 or 500: the largest node count the author considers comfortable |
| `structuralInputs` | Which of `"node"`, `"partition"`, `"ordering"` its options read |
| `options` | README section 7 |
| `engine` | For a plugin, its own `type` |

`honoursWeights` and `scoped` are declared ONCE, as statics, and `register` copies them into the
published descriptor. An author MUST NOT write them in the descriptor.

## 3. Lifecycle

The element drives an engine in this order. An engine MAY rely on it.

1. **Construct**: `new Engine(options)` where `options` are the consumer's layout options, resolved
   against `descriptor.options` (defaults filled, unknown names and bad values refused before
   construction), plus `dim` when the element needs a specific dimension count
   (`getOptionsForDimension`).
2. **Load**: `addNodes(...)`/`addNode(...)` for every node, then `addEdges(...)`/`addEdge(...)`.
3. **Initialise**: `await init()`. The element draws no frame with this layout before `init`
   settles. A throw from `init` fails the `setLayout` call and leaves the previous layout running.
4. **Scope** (only when `static scoped` is true and the consumer passed a scope):
   `setHoldMask(mask, rows)` after `init`, and again after every renumbering.
5. **Run**: for a live engine, `step()` repeatedly (in batches per frame) until `isSettled` is
   true, then the element stops stepping and announces the layout settled. For a batch engine the
   first read computes everything.
6. **Publish**: after each step batch the element publishes coordinates into its position array
   (calling `publishPositions()`); an engine MAY also call it itself. The default implementation
   walks `getNodePosition`; an engine that can write without allocating overrides it.
7. **Change**: `addNode`/`addEdge` for elements that arrive later; `removeNode`/`removeEdge` for
   elements taken out; `pin`/`unpin` when the reader pins; `setNodePosition` when the reader drops a
   dragged node.
8. **Replace**: when the consumer chooses another layout, `dispose()` is called on this engine and
   it is never called again.

In graphty-element 3.0 (README section 14) the membership methods of step 2 and 7 (`addNode`,
`addEdge`, `addNodes`, `addEdges`, `removeNode`, `removeEdge`) become protected: the element still
calls them and a plugin still overrides them, but no consumer can. An engine is not told the
current coordinates of nodes before `init` (so it cannot warm-start from the previous layout of a
changing graph), cannot read a held node's coordinates (so a scoped layout cannot place its scope
next to them), and is not told when a node's attributes change (so a batch layout keyed on an
attribute stays stale after an edit). All three are open decision 27.

Obligations:

1. A pinned node MUST NOT move until `unpin`. A node passed to `setNodePosition` MUST stay at that
   position (until the next drag or a new layout).
2. A held row (scoped layouts) MUST NOT move, and a scoped engine MUST treat held nodes as fixed in
   its own state (fixed bodies, `fx`/`fy`), including nodes added after the hold was set.
   `writeNodePosition` refuses a write onto a held row that has a coordinate, so a held node never
   visibly moves under any engine, but an engine that keeps integrating a held body computes every
   other force against a position that is never drawn.
3. An engine that keeps per-node or per-edge state MUST override `removeNode` and `removeEdge`;
   the defaults do nothing, and a removed node left in an engine's lists is a leak.
4. `getNodePosition` MUST return finite numbers for every node the engine was given; z MUST be 0 or
   absent when laying out in two dimensions.
5. `step()` MUST return promptly (the element calls it inside a frame); a step that needs more time
   SHOULD do less per call.
6. `dispose()` MUST release every timer, worker and listener the engine created.

## 4. What the built-in layouts do, and parity

"Pinned by" names the test in `graphty-element/test/browser/extensions/layout-extension.test.ts`.

| Capability | Route | Pinned by |
| --- | --- | --- |
| Chosen by name | `graph.setLayout("<id>", options)` | "is the engine the element lays the graph out with..." |
| Places every node; the element draws each where the engine put it | position array | "places every node..." |
| Coordinates reach the element's position array | `publishPositions` | "publishes its coordinates into the element's own position array" |
| Edges drawn between the reported ends | `getEdgePosition` | "draws every edge between the two ends..." |
| Built with the consumer's options; defaults applied; unknown and out-of-range refused | `descriptor.options` | "the options a consumer configures it with" block |
| Stepping stops and the consumer is told when settled | `isSettled`, settled event | "stops the element stepping, and is announced..." |
| Given nodes and edges that arrive later; told about removals | `addNode`, `removeNode`, ... | "is given nodes and edges that arrive after..." and the two "is told when..." tests |
| Pinned nodes stay; released nodes move again | `pin`, `unpin` | "leaves a pinned node exactly where it is..." |
| Dragged nodes stay where dropped | `setNodePosition` | "is told where the reader dropped a node..." |
| Disposed on switch | `dispose` | "is disposed when the consumer switches..." |
| Told 2D or 3D; options kept across a switch | `dim`, `getOptionsForDimension` | "is told whether the element is drawing in two dimensions or three", "keeps the consumer's options..." |
| Batch placement in one pass, scaled | `SimpleLayoutEngine`, `scalingFactor` | "a static engine built on SimpleLayoutEngine" block |
| Listed in the catalogue, found by name, answers which arrangement it is | `session.catalog.layouts()`, `layoutIdForEngine` | "being offerable, and not only reachable" block |
| Says whether it reads weights | `static honoursWeights` | "has the catalogue answer whether it reads weights..." |
| Lays out a scope, holding everything else still | `static scoped`, `setLayout(id, opts, { scope })` | "a scope" block |
| Coded failures from construction and `init`; previous layout kept | `setLayout` rejection | "how a failure reaches the consumer" block |

### 4.1 Parity statements

1. A registered layout MUST be reachable by every route in the table.
2. **Progress is vacuous.** No layout, built-in or plugin, reports progress. If progress is added
   it MUST be added to `LayoutEngine` so every engine can use it.
3. **Cancellation** is switching to another layout (`dispose`), for built-ins and plugins alike.
4. **Acceleration is NOT at parity, deliberately.** A registered layout runs on the CPU even when
   an accelerator is attached; only the element's built-in simulation layouts run on one. The
   accelerator seam is internal (`candidates.md`). This is a stated limit of the point, not a
   defect, until accelerators are promoted.
5. **Saved documents: parity is vacuous.** A saved `graph.layout` is read back by nothing in 2.6.1,
   for built-ins and plugins alike (README open decision 8). The 3.0 pull request persists a
   `LayoutChoice { id, engine, options, dimension, scope }` with no extension version, which
   pre-empts that decision.
6. A plugin cannot add an engine behind an existing arrangement id (for example a faster engine
   for `force`); the arrangement table is the element's own. It registers its own id instead.

## 5. Options

1. Options are `descriptor.options` (README section 7). The element validates them before
   construction; the constructor receives plain, validated values.
2. A layout reading a structural input (a root node, a partition attribute, an ordering) MUST
   declare it with the matching option type (`"node-id"`, `"partition"`, `"ordering"`) and list it
   in `structuralInputs`, so a picker can render the right control.
3. A stochastic layout SHOULD declare a `"seed"` option and MUST produce identical positions for
   an identical graph, options and seed. Reproducibility of figures depends on it
   (`design/designloom/workflows/W25.yaml`).
4. The deprecated Zod-based `zodOptionsSchema` statics MUST NOT be used by a new engine.
5. An attribute a layout reads MUST be declared as an `"attribute"` option (with `attributeType`),
   not hard-coded, so a reader whose column has another name can use the layout.
6. A layout has no channel for caveats: one that cannot place a node (a geographic layout and a
   node with no coordinates) must still return a finite position, and cannot tell the reader it
   guessed. Until the layout report of open decision 27 exists, such a layout SHOULD place those
   nodes in a documented area apart from the placed ones and say so in its `description`.

## 6. Errors

| Code | When |
| --- | --- |
| `E_BAD_COMMAND` | registration without `static type` (`field: "type"`), without a descriptor (`"descriptor"`), or with `descriptor.id !== type` (`"descriptor.id"`) |
| `E_DUPLICATE_PLUGIN` | a built-in arrangement id or engine name |
| `E_UNKNOWN_LAYOUT` | `setLayout` names nothing registered; `details.available` lists the names |
| `E_UNKNOWN_OPTION`, `E_OPTION_RANGE` | option validation |
| `E_UNSUPPORTED` | a scope passed to an engine without `static scoped` |

A `GraphtyError` thrown from the constructor or `init` MUST reach the consumer with its code
unchanged; anything else MUST be wrapped as `E_INTERNAL`, `source: "layout"`, with the original as
`cause`. A throw from `step`, `getNodePosition` or `publishPositions` MUST stop the element
stepping that engine and MUST be reported the same way, once; nodes keep their last published
positions. **(not yet met)** `LayoutManager.step()` calls `step()` and `publishPositions()`
unguarded; the throw is caught by the render loop, which skips drawing that frame, emits an
uncoded error in category `"other"` and keeps stepping, so the failure repeats every frame. The
parity suite covers construction and `init` only.

## 7. Versioning and compatibility

1. The abstract members of `LayoutEngine` are implemented by extensions. Adding an abstract member
   is a major release; adding a member with a default implementation is a minor release.
2. `Node` and `Edge` are type-only and their contract surface is the seven members in section 2.
3. **The snapshot migration will change this contract.** The element's own layouts are moving onto
   graph-format snapshots (branch `feat/graph-format-migration`, the layout-indexed items).
   Publishing `Node` and `Edge` froze render classes into the plugin contract; a snapshot-based
   successor is sketched in the "Proposed" section of `layout.d.ts` (`SnapshotLayoutRegistration`:
   a batch layout as an async function from a snapshot, options, fixed rows, a signal and a
   progress channel to a coordinate array). It would give layouts progress and cancellation, make
   them testable in Node, and let the element accelerate or move them to a worker. It is README
   open decision 14. If adopted, `LayoutEngine` stays supported for the rest of that major and is
   deprecated with its replacement named.
4. **The migration must not break `SimpleLayoutEngine` in a minor release.** The migration's
   static-layout work item makes `SimpleLayoutEngine` load the snapshot and the position array and
   removes the per-call node and edge objects. A plugin extends `SimpleLayoutEngine` and reads
   `_nodes`, `_edges`, `positions` and `Node.data`, as the worked example does. The migration MUST
   keep those working for plugins (an adapter) until the next major, or ship the snapshot contract
   first (README section 10 item 2).
5. New capabilities (progress, a warm start, a held node's position) SHOULD reach an engine as
   arguments to `init` or the constructor rather than as new inherited members, which could
   collide with a plugin's own (README section 6.2 item 1).

## 8. Security

A layout runs with the page's privileges. It receives node and edge ids (which may be meaningful
data, such as names), so a layout MUST NOT send them anywhere. A layout that uses a worker MUST
create it from its own bundled code, not from a URL built at run time.

## 9. Conformance checks

Run by `checkLayout(EngineClass, { graphs })` in the proposed kit. The kit ships standard graphs
(a path, a star, a 500-node random graph, a graph with an isolated node, a graph with a self-loop
and parallel edges). `LayoutEngine` imports no Babylon.js and the `Node` a layout sees is
structural (`{ id, index, data }`), so a headless driver needs no snapshot migration: the proposed
`runLayoutHeadless` (`layout.d.ts`) feeds plain objects through the lifecycle of section 3 and
returns positions. With it, every check except "disposes cleanly" and the settled-event half of
"settles" runs in Node, so an author can unit-test placement, pins, holds and determinism under
Vitest without a browser. Until it ships, the checks after the first four need the browser
configuration.

| Check | Passes when |
| --- | --- |
| registers | `LayoutEngine.register` accepts it; `session.catalog.layouts()` lists it with `honoursWeights` and `scoped` equal to the statics |
| descriptor is valid | validates against `#/$defs/AuthoredLayoutDescriptor`; `kind` matches the base class; `maxDimensions` matches the static |
| id is not reserved | not a built-in arrangement id or engine name |
| is plain data | the published descriptor survives `structuredClone` |
| places every node | on every standard graph, every node has a finite position; in 2D every z is 0 |
| settles | a live engine reports `isSettled` within the step budget the kit allows (a warning, with the step count, when not) |
| makes no network request | with `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `sendBeacon` trapped, a full lifecycle makes no call |
| is deterministic with a seed | when a `"seed"` option is declared, two runs with the same seed give identical positions |
| honours pins and drags | a pinned node does not move across 100 steps; a node set with `setNodePosition` stays there |
| honours a hold | when `scoped`, no held row moves and the scoped rows do |
| forgets removed elements | after `removeNode`, `nodes` no longer yields it |
| disposes cleanly | after `dispose`, no timer, animation frame or worker created by the engine is alive |
| failures are coded | a throw from the constructor or `init` reaches `setLayout`'s rejection as a `GraphtyError` |

## 10. Worked example

A batch "tiers" layout that places nodes in horizontal rows by a numeric attribute the reader
names, tier 0 (the customers) at the bottom and each higher tier above it -- the hierarchical
supply-chain view of `design/designloom/workflows/W11.yaml`:

```ts
import { LayoutEngine, SimpleLayoutEngine, type AuthoredLayoutDescriptor, type SimpleLayoutOpts }
    from "@graphty/graphty-element/extend";

interface TiersOpts extends SimpleLayoutOpts { spacing?: number; tierAttribute?: string }

class TiersLayout extends SimpleLayoutEngine {
    static override type = "acmechain-tiers";
    static override maxDimensions = 2;
    static override descriptor: AuthoredLayoutDescriptor = {
        id: "acmechain-tiers",
        plainName: "Supply tiers",
        technicalName: "Layered placement by tier",
        description: "Suppliers in rows by tier, customers at the bottom.",
        family: "hierarchical",
        kind: "batch",
        maxDimensions: 2,
        sizeRating: 10000,
        structuralInputs: [],
        options: [
            { name: "tierAttribute", plainName: "Tier column", type: "attribute", attributeType: "integer", default: "tier" },
            { name: "spacing", plainName: "Spacing", type: "number", default: 1, min: 0.1, max: 10 },
        ],
        engine: "acmechain-tiers",
    };

    readonly #spacing: number;
    readonly #tierAttribute: string;
    constructor(opts: TiersOpts = {}) {                 // options arrive validated and defaulted
        super(opts);
        this.#spacing = opts.spacing ?? 1;
        this.#tierAttribute = opts.tierAttribute ?? "tier";
    }

    doLayout(): void {
        const rows = new Map<number, number>();         // tier -> next column
        for (const node of this._nodes) {
            const value = node.data[this.#tierAttribute];
            const tier = typeof value === "number" ? value : 0;
            const column = rows.get(tier) ?? 0;
            rows.set(tier, column + 1);
            // tier 0 at the bottom; y grows upward in this example (no convention is published yet)
            this.positions[node.id] = [column * this.#spacing, tier * this.#spacing];
        }
        this.stale = false;
    }
}

LayoutEngine.register(TiersLayout);
await graph.setLayout("acmechain-tiers", { tierAttribute: "supplier_tier", spacing: 2 });
```

## 11. Known gaps

- No progress and no cancellation other than switching layouts (section 4.1).
- Registered layouts are never accelerated.
- A saved `graph.layout` is read back by nothing.
- `LayoutEngine.register` takes no `RegisterOptions` (README open decision 6).
- The contract names render classes (`Node`, `Edge`); a snapshot-based successor is open
  decision 14.
- A layout cannot be unit-tested in Node against real element code today; the kit's Node checks
  would need `LayoutEngine` to be constructible without the renderer, which it is (it imports no
  Babylon.js), but no published helper feeds it nodes.
- A throw after `init` repeats every frame instead of stopping the engine (section 6).
- `SimpleLayoutEngine.positions` is keyed by node id as an object key, so a numeric id `1001` and a
  string id `"1001"` -- two distinct nodes to the element -- share one position. A batch layout
  over a graph that mixes the two cannot place both.
- A layout cannot read an algorithm's results, warm-start, read a held node's position, learn of
  an attribute change or report a node it could not place (sections 2, 3 and 5; open decisions
  17 and 27).
- No scene coordinate convention is published (open decision 27).

## 12. Who this serves

| Need | Source |
| --- | --- |
| Hierarchical tiers and what-if views of a supply chain | `design/designloom/workflows/W11.yaml`, `design/designloom/personas/supply-chain-analyst.yaml` |
| Radial layout around a hub | `design/designloom/workflows/W17.yaml` |
| Layout per cluster, instead of by hand | `design/designloom/workflows/W21.yaml` |
| The same layout across two conditions | `design/designloom/workflows/W24.yaml` |
| Geographic placement | `design/designloom/personas/supply-chain-analyst.yaml`, `design/designloom/personas/intelligence-analyst.yaml` |
| Seeded, reproducible figures | `design/designloom/workflows/W25.yaml` |
