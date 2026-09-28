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

| Type                                                                                                                                                                                           | Kind                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `AuthoredLayoutDescriptor`, the statics (`type`, `maxDimensions`, `honoursWeights`, `scoped`, `descriptor`), the abstract members of `LayoutEngine`, `SimpleLayoutEngine.doLayout`             | implemented by extensions |
| `Node`, `Edge` (type-only), `Position`, `EdgePosition`, the protected helpers (`isHeld`, `writeNodePosition`), `holdMask`, `SimpleLayoutEngine.positions`, `_nodes`, `_edges`, `scalingFactor` | called by extensions      |

`Node` and `Edge` are published as type-only re-exports so that a plugin can type its members
without importing the renderer. They are the element's FULL render classes, not a three-member
structural shape: a layout unit test cannot build a `Node` from `{ id, index, data }` without a
cast, and nothing in the type stops a layout reading `n.mesh`. The structural `LayoutNode` and
`LayoutEdge` in the "Proposed" section of `layout.d.ts` fix both, additively. A layout MUST read only `Node.id`, `Node.index`, `Node.data`,
`Edge.id`, `Edge.srcId`, `Edge.dstId` and `Edge.data`, and MUST NOT construct, mutate or retain a
`Node` or `Edge` beyond its own lifetime. Attribute access through `data` is allowed because the
owner's parity rule requires it: a built-in arrangement may place nodes by their attributes, so a
plugin must be able to. Every other member of those classes is renderer state and is not part of
this contract; reading it is unsupported and will break when the layout contract moves onto the
snapshot (section 7). The element's OWN code reads more: `SimpleLayoutEngine.getEdgePosition`
reads `Edge.srcNode` and `Edge.dstNode`, and so does the live engine in the parity suite
(`layout-extension.test.ts`, its `getEdgePosition`). The base class may; a plugin MUST NOT, and the
parity-suite engine is corrected to look endpoints up by `srcId` and `dstId` (README section 13). `Node.data` holds the attributes as LOADED; an algorithm's results live under
result paths and are not in it, so a layout cannot today place nodes by a computed value (a tier
computed as a distance, a ring by betweenness). Resolving an `"attribute"` option that names a
result path is open decision 17.

**Weights.** `static honoursWeights = true` is published in the catalogue as "arranges a weighted
graph differently", but this contract gives a plugin no declared way to read weights. The only
route today is the protected `pairWeights(edges)` helper of `LayoutEngine` (the one the built-in
Kamada-Kawai and ForceAtlas2 engines use), which `layout.d.ts` did not declare and which the
migration's static-layout work item deletes in a minor release. Until the snapshot layout contract
(open decision 14) gives weights a route, a plugin SHOULD NOT declare `honoursWeights`, and a
plugin that calls `pairWeights` relies on a helper that section 7 item 4 now requires the
migration to keep until the next major. Parsing `Edge.data.weight` by hand ignores the element's
configured weight key and its handling of parallel edges.

`AuthoredLayoutDescriptor` rules:

| Member                                                | Rule                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                  | Non-empty; MUST equal `static type`; not a built-in arrangement id (`KNOWN_LAYOUT_IDS`) or built-in engine name                                                                                                           |
| `plainName`, `technicalName`, `description`, `family` | Strings; `plainName` non-empty                                                                                                                                                                                            |
| `kind`                                                | `"live"` or `"batch"`; MUST match the base class (`SimpleLayoutEngine` is batch) (not yet enforced at registration)                                                                                                       |
| `maxDimensions`                                       | 2 or 3; MUST equal `static maxDimensions` (not yet enforced at registration)                                                                                                                                              |
| `sizeRating`                                          | `"any"`, 10000, 2000 or 500: the largest node count the author considers comfortable. Advisory: nothing refuses a larger graph (open decision 27), and the four values cannot say "comfortable at 50,000, not at 500,000" |
| `structuralInputs`                                    | Which of `"node"`, `"partition"`, `"ordering"` its options read                                                                                                                                                           |
| `options`                                             | README section 7                                                                                                                                                                                                          |
| `engine`                                              | For a plugin, its own `type`                                                                                                                                                                                              |

`honoursWeights` and `scoped` are declared ONCE, as statics, and `register` copies them into the
published descriptor. An author MUST NOT write them in the descriptor.

## 3. Lifecycle

The element drives an engine in this order. An engine MAY rely on it.

1. **Construct**: `new Engine(options)` where `options` are the consumer's layout options, resolved
   against `descriptor.options` (defaults filled, unknown names and bad values refused before
   construction), plus the keys the engine class's `static getOptionsForDimension(dimension)`
   returns for the element's current view mode. Those keys are merged AFTER validation and only
   where the consumer passed nothing, because they are the element's to add
   (`LayoutManager.ts`). This is the only route by which an engine learns whether the element
   draws in two or three dimensions: `SimpleLayoutEngine`'s implementation returns `{ dim }`, the
   `LayoutEngine` base returns `{}`, so a live engine that needs the dimension MUST override
   `getOptionsForDimension`. A descriptor-bearing engine receives ONLY its declared options plus
   those keys: `scalingFactor`, which every `SimpleLayoutEngine` understands, is refused with
   `E_UNKNOWN_OPTION` unless the plugin declares it in `descriptor.options` (section 5 item 7).
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
7. **Change**: `addNode`/`addEdge` for elements that arrive later, then `updatePositions(nodes)`
   with the nodes that arrived (its default runs up to ten steps, stopping early once settled; an
   engine that can place a newcomer without re-running overrides it); `removeNode`/`removeEdge`
   for elements taken out; `pin`/`unpin` when the reader pins; `setNodePosition` when the reader
   drops a dragged node.
8. **Replace**: when the consumer chooses another layout, `dispose()` is called on this engine and
   it is never called again.

In graphty-element 3.0 (README section 14) the membership methods of step 2 and 7 (`addNode`,
`addEdge`, `addNodes`, `addEdges`, `removeNode`, `removeEdge`) become protected: the element still
calls them and a plugin still overrides them, but no consumer can.

`LayoutEngine.readNodePosition(node, out)` is public in 2.6.1 and reads the element's published
coordinates of any placed row, held rows included; the built-in simulation engines use it. It is
therefore the one declared way to read where a node currently is, including a held node for a
scoped layout. It is not a warm start: nothing guarantees a row still carries the previous
layout's coordinates when a new engine is constructed, and nothing is handed to `init`. An engine
is also not told when a node's attributes change (so a batch layout keyed on an attribute stays
stale after an edit). A warm-start argument and attribute-change notification are open decision
27; if `heldPosition` is adopted there, `readNodePosition` is deprecated in its favour or kept
as its implementation, and the decision says which.

**When `setLayout` resolves.** The specification does not state whether the promise `setLayout`
returns settles before or after the first publish of positions, or before a live layout settles,
so `await setLayout(...)` followed by `applyCameraView(...)` may frame the previous layout's
positions. Until open decision 27 states it, a caller that must frame the new arrangement waits
for the layout-settled event.

**A carried scope.** Besides `setLayout(id, options, { scope })`, the element carries a scope
across layout switches (`graph.setLayoutScope(scope)`, and the element's layout-scope property,
since 2.5.0). Unlike the explicit route, a carried scope is NEVER refused: under an engine
without `static scoped` it is silently inactive and the whole graph is laid out
(`Graph.ts`, `setLayoutScope`). A reader who scoped a re-layout and then switches to an unscoped
plugin layout sees every held node move, with nothing reported. Open decision 27 recommends a
coded warning event when a carried scope is dropped.

Obligations:

1. A pinned node MUST NOT move until `unpin`. A node passed to `setNodePosition` MUST stay at that
   position (until the next drag or a new layout).
2. A held row (scoped layouts) MUST NOT move, and a scoped engine MUST treat held nodes as fixed in
   its own state (fixed bodies, `fx`/`fy`), including nodes added after the hold was set.
   `writeNodePosition` refuses a write onto a held row that has a coordinate, so a held node never
   visibly moves under any engine, but an engine that keeps integrating a held body computes every
   other force against a position that is never drawn.
3. An engine that keeps per-node or per-edge state MUST override `removeNode` and `removeEdge`;
   the `LayoutEngine` defaults do nothing, and a removed node left in an engine's lists is a leak.
   `SimpleLayoutEngine` overrides both to drop the element from `_nodes` and `_edges`; a batch
   engine that overrides them again MUST call `super`.
4. `getNodePosition` MUST return finite numbers for every node the engine placed; z MUST be 0 or
   absent when laying out in two dimensions. A batch engine MAY leave a node it cannot place out
   of `positions`: 2.6.1 then leaves that row UNPLACED in the position array rather than writing
   the origin (`SimpleLayoutEngine`'s private `publishRecord`). But `getNodePosition` and the
   edge ends still fall back to the origin for such a node, and nothing reports it, so today an
   unplaced node can still be drawn at (0, 0). Making "unplaced" a first-class outcome -- drawn
   one element-defined way, left out of camera bounds, reported with the settled event -- is
   recommended in open decision 27 to replace any need to invent a position.
5. `step()` MUST return promptly (the element calls it inside a frame); a step that needs more time
   SHOULD do less per call.
6. `dispose()` MUST release every timer, worker and listener the engine created.

## 4. What the built-in layouts do, and parity

"Pinned by" names the test in `graphty-element/test/browser/extensions/layout-extension.test.ts`.

| Capability                                                                            | Route                                              | Pinned by                                                                                              |
| ------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Chosen by name                                                                        | `graph.setLayout("<id>", options)`                 | "is the engine the element lays the graph out with..."                                                 |
| Places every node; the element draws each where the engine put it                     | position array                                     | "places every node..."                                                                                 |
| Coordinates reach the element's position array                                        | `publishPositions`                                 | "publishes its coordinates into the element's own position array"                                      |
| Edges drawn between the reported ends                                                 | `getEdgePosition`                                  | "draws every edge between the two ends..."                                                             |
| Built with the consumer's options; defaults applied; unknown and out-of-range refused | `descriptor.options`                               | "the options a consumer configures it with" block                                                      |
| Stepping stops and the consumer is told when settled                                  | `isSettled`, settled event                         | "stops the element stepping, and is announced..."                                                      |
| Given nodes and edges that arrive later; told about removals                          | `addNode`, `removeNode`, ...                       | "is given nodes and edges that arrive after..." and the two "is told when..." tests                    |
| Pinned nodes stay; released nodes move again                                          | `pin`, `unpin`                                     | "leaves a pinned node exactly where it is..."                                                          |
| Dragged nodes stay where dropped                                                      | `setNodePosition`                                  | "is told where the reader dropped a node..."                                                           |
| Disposed on switch                                                                    | `dispose`                                          | "is disposed when the consumer switches..."                                                            |
| Told 2D or 3D; options kept across a switch                                           | `static getOptionsForDimension` (section 3 step 1) | "is told whether the element is drawing in two dimensions or three", "keeps the consumer's options..." |
| Batch placement in one pass, scaled                                                   | `SimpleLayoutEngine`, `scalingFactor`              | "a static engine built on SimpleLayoutEngine" block                                                    |
| Listed in the catalogue, found by name, answers which arrangement it is               | `session.catalog.layouts()`, `layoutIdForEngine`   | "being offerable, and not only reachable" block                                                        |
| Says whether it reads weights                                                         | `static honoursWeights`                            | "has the catalogue answer whether it reads weights..."                                                 |
| Lays out a scope, holding everything else still                                       | `static scoped`, `setLayout(id, opts, { scope })`  | "a scope" block                                                                                        |
| Coded failures from construction and `init`; previous layout kept                     | `setLayout` rejection                              | "how a failure reaches the consumer" block                                                             |

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
7. **Animated transition from the previous positions is vacuous.** No layout animates when the
   consumer switches to it, built-in or plugin (`SimpleLayoutEngine` is static by design), so every
   node jumps at once and a reader loses the node they were following
   (`design/designloom/workflows/W02.yaml`). If a transition is added, the ELEMENT owns it, as a
   tween over published positions, so every batch plugin gets it without code; a plugin MUST NOT
   build its own tween into its engine.

## 5. Options

1. Options are `descriptor.options` (README section 7). The element validates them before
   construction; the constructor receives plain, validated values.
2. A layout reading a structural input (a root node, a partition attribute, an ordering) MUST
   declare it with the matching option type (`"node-id"`, `"partition"`, `"ordering"`) and list it
   in `structuralInputs`, so a picker can render the right control.
3. A stochastic layout MUST declare a `"seed"` option and MUST produce identical positions for
   an identical graph, options and seed. "Identical graph" means equal sets of node ids, edges
   (endpoints and ids) and attributes, whatever order the records were loaded in: a layout that
   breaks ties by row order SHOULD sort by id first, because two readers loading the same file
   sorted differently must get the same figure. Reproducibility of figures depends on it
   (`design/designloom/workflows/W25.yaml`). A plugin layout that draws on `Math.random` without
   a seed option cannot be reproduced and nothing reports it today; open decision 16 recommends
   that the element draw and record a seed for every layout with a `"seed"` option the caller
   left empty, as for algorithms, and whether each built-in stochastic layout takes a seed is
   part of open decision 27.
4. The deprecated Zod-based `zodOptionsSchema` statics MUST NOT be used by a new engine.
5. An attribute a layout reads MUST be declared as an `"attribute"` option (with `attributeType`),
   not hard-coded, so a reader whose column has another name can use the layout. **(not yet met)**
   The element validates an `"attribute"` option as a string only: a misspelt column, or a column
   loaded as text where `attributeType` says `"integer"`, is accepted and yields a wrong layout
   with no error. The element SHOULD refuse a column no node carries with `E_OPTION_RANGE`
   (naming the nearest column names) and report a type mismatch (open decision 22). A layout
   MUST NOT turn an unreadable value into a real value (reading a missing tier as tier 0).
   **(not yet met)** A style binding, a filter and a set resolve an attribute PATH (`location.lat`
   reads `data.location.lat`), but a layout is handed only the option's string and reads
   `node.data[name]` flat, and `./extend` publishes no resolver, so the same `"attribute"` value
   means one thing to a filter and another to a layout, and nested data leaves every node unplaced
   with no error. The element SHOULD publish an attribute accessor for layouts that resolves the
   path exactly as styles do (open decision 27), and a plugin MUST read attribute options through
   it once it exists.
6. A layout has no channel for caveats. One that cannot place a node from its data (a geographic
   layout and a node with no coordinates) MAY leave it out of `positions` (section 3 obligation
   4), or place it in a documented area apart from the placed ones; either way it SHOULD say so
   in its `description`, until the layout report of open decision 27 exists. It MUST NOT place
   such nodes where they read as data (at latitude and longitude zero).
7. A descriptor-bearing batch engine that wants `scalingFactor` settable MUST declare it in
   `descriptor.options`; the element does not add `SimpleLayoutOpts` to the declared set
   (section 3 step 1). Whether the element should treat those as element-owned options, as it
   does for a reader's `data`, `url` and `file`, is part of open decision 27.

## 6. Errors

| Code                                 | When                                                                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_BAD_COMMAND`                      | registration without `static type` (`field: "type"`), without a descriptor (`"descriptor"`), or with `descriptor.id !== type` (`"descriptor.id"`) |
| `E_DUPLICATE_PLUGIN`                 | a built-in arrangement id or engine name                                                                                                          |
| `E_UNKNOWN_LAYOUT`                   | `setLayout` names nothing registered; `details.available` lists the names                                                                         |
| `E_UNKNOWN_OPTION`, `E_OPTION_RANGE` | option validation                                                                                                                                 |
| `E_UNSUPPORTED`                      | a scope passed to an engine without `static scoped`                                                                                               |

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
   is a major release. Adding a member WITH a default implementation is also a contract major when
   its name is ordinary, because a plugin subclass may already declare a member of that name
   (README section 6.2 item 1); it is a minor only when delivered as an argument (an init context)
   or named with the reserved `graphty` prefix.
2. `Node` and `Edge` are type-only and their contract surface is the seven members in section 2,
   although the published types carry every render member (section 2).
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
   `_nodes`, `_edges`, `positions` and `Node.data`, as the worked example does, and a weighted
   plugin may call the protected `pairWeights(edges)` (section 2). The migration MUST keep all of
   those working for plugins (an adapter) until the next major, or ship the snapshot contract
   first (README section 10 item 2). Its plan deletes `pairWeights` and `pairWeightKey` in the
   dual-API window, which is a minor release; by README section 6.2 removing a protected helper
   is a contract major.
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
and parallel edges). `LayoutEngine` imports no Babylon.js and a layout may read only `id`, `index`
and `data` of a node, so a headless driver needs no snapshot migration: the proposed
`runLayoutHeadless` (`layout.d.ts`) feeds plain `LayoutNode` and `LayoutEdge` objects through the
lifecycle of section 3 and returns positions. It needs the structural types published first,
because the published `Node` is the full render class (section 2). With it, every check except "disposes cleanly" and the settled-event half of
"settles" runs in Node, so an author can unit-test placement, pins, holds and determinism under
Vitest without a browser. Until it ships, the checks after the first four need the browser
configuration.

| Check                           | Passes when                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| registers                       | `LayoutEngine.register` accepts it; `session.catalog.layouts()` lists it with `honoursWeights` and `scoped` equal to the statics                                                |
| descriptor is valid             | validates against `#/$defs/AuthoredLayoutDescriptor`; `kind` matches the base class; `maxDimensions` matches the static                                                         |
| id is not reserved              | not a built-in arrangement id or engine name                                                                                                                                    |
| is plain data                   | the published descriptor survives `structuredClone`                                                                                                                             |
| places every node               | on every standard graph, every node has a finite position; in 2D every z is 0                                                                                                   |
| settles                         | a live engine reports `isSettled` within the step budget the kit allows (a warning, with the step count, when not)                                                              |
| makes no network request        | with the network APIs of README section 9.4 item 2 trapped, a full lifecycle makes no call (mistake detection only)                                                             |
| is deterministic with a seed    | when a `"seed"` option is declared, two runs with the same seed give identical positions                                                                                        |
| honours pins and drags          | a pinned node does not move across 100 steps; a node set with `setNodePosition` stays there                                                                                     |
| honours a hold                  | when `scoped`, no held row moves and the scoped rows do                                                                                                                         |
| forgets removed elements        | after `removeNode`, `nodes` no longer yields it                                                                                                                                 |
| does not depend on record order | with a `"seed"` option, the same graph loaded in two record orders gives identical positions (a warning, with the moved nodes, when not)                                        |
| survives awkward ids            | on a graph whose node ids include `__proto__`, `constructor` and `toString`, every node gets its own position (README section 9.2 item 6)                                       |
| leaves unreadable nodes apart   | on a graph where the layout's `"attribute"` option names a column some nodes lack, those nodes are either unplaced or placed apart, never at a data-valued position (a warning) |
| disposes cleanly                | after `dispose`, no timer, animation frame or worker created by the engine is alive                                                                                             |
| failures are coded              | a throw from the constructor or `init` reaches `setLayout`'s rejection as a `GraphtyError`                                                                                      |

## 10. Worked example

A batch "tiers" layout that places nodes in horizontal rows by a numeric attribute the reader
names, tier 0 (the customers) at the bottom and each higher tier above it -- the hierarchical
supply-chain view of `design/designloom/workflows/W11.yaml`. A node with no readable tier goes in
its own row below the customers, not into tier 0, and the description says so (section 5 item
6). The tier must be a LOADED attribute: a tier computed by an algorithm cannot be read yet (open
decision 17).

```ts
import { LayoutEngine, SimpleLayoutEngine, type AuthoredLayoutDescriptor } from "@graphty/graphty-element/extend";

// Not `extends SimpleLayoutOpts`: that type carries an index signature, and a constructor taking
// it does not fit the `new (opts: object) => LayoutEngine` bound LayoutEngine.register publishes.
interface TiersOpts {
    spacing?: number;
    tierAttribute?: string;
    scalingFactor?: number;
}

const UNTIERED_ROW = -1; // below tier 0, apart from real customers

class TiersLayout extends SimpleLayoutEngine {
    static override type = "acmechain-tiers";
    static override maxDimensions = 2;
    static override descriptor: AuthoredLayoutDescriptor = {
        id: "acmechain-tiers",
        plainName: "Supply tiers",
        technicalName: "Layered placement by tier",
        description:
            "Suppliers in rows by tier, customers at the bottom; nodes with no tier value in a separate row beneath.",
        family: "hierarchical",
        kind: "batch",
        maxDimensions: 2,
        sizeRating: 10000,
        structuralInputs: [],
        options: [
            {
                name: "tierAttribute",
                plainName: "Tier column",
                type: "attribute",
                attributeType: "integer",
                default: "tier",
            },
            { name: "spacing", plainName: "Spacing", type: "number", default: 1, min: 0.1, max: 10 },
            // Declared so a consumer may set it (section 5 item 7).
            { name: "scalingFactor", plainName: "Scale", type: "number", default: 100, min: 1, max: 10000 },
        ],
        engine: "acmechain-tiers",
    };

    readonly #spacing: number;
    readonly #tierAttribute: string;
    constructor(opts: TiersOpts = {}) {
        // options arrive validated and defaulted
        super({ scalingFactor: opts.scalingFactor });
        this.#spacing = opts.spacing ?? 1;
        this.#tierAttribute = opts.tierAttribute ?? "tier";
    }

    doLayout(): void {
        const rows = new Map<number, number>(); // tier -> next column
        for (const node of this._nodes) {
            const value = node.data[this.#tierAttribute];
            const tier = typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : UNTIERED_ROW;
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
- `static honoursWeights` has no declared weight route; the undeclared `pairWeights` helper is
  deleted by the migration in a minor release (sections 2 and 7).
- A carried scope is silently dropped under an unscoped engine (section 3).
- An `"attribute"` option naming a missing or mistyped column is accepted (section 5 item 5).
- Nothing states when `setLayout` resolves relative to the first publish (section 3).
- `sizeRating` is advisory and too coarse for graphs past 10,000 nodes; a batch `doLayout` runs
  on the main thread with no size gate, so a project that restores a heavy layout on open can
  hang the page on every open (open decisions 8 and 27).
- `SimpleLayoutEngine.positions` is a plain object keyed by node id, so a node whose id is
  `__proto__` writes the object's prototype instead of a row (README section 9.2 item 6); the
  fix is a `Map` or a null-prototype object, which changes a published member's type and so
  waits for the snapshot contract or the next major.
- `KNOWN_LAYOUT_IDS` omits `spiral` and `planar`, two built-in arrangements the catalogue
  publishes (README section 5 item 4).
- The published `Node` and `Edge` are the full render classes, so a layout cannot be unit-tested
  without a cast (section 2).
- An `"attribute"` option is read flat, not as a path (section 5 item 5).
- Edges are always straight segments between their two ends: a layout controls only
  `EdgePosition { src, dst }`, so a geographic layout cannot route an edge along a great circle, a
  shipping lane or round a globe (in 3D a long chord cuts through the sphere). Edge geometry is
  evaluated in `candidates.md` section 20.
- No transition animates a layout switch (section 4.1 item 7).

## 12. Who this serves

| Need                                                   | Source                                                                                                         | Served                                                                                                                                                      |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hierarchical tiers from a loaded tier column           | `design/designloom/workflows/W11.yaml`, `design/designloom/personas/supply-chain-analyst.yaml`                 | yes (section 10)                                                                                                                                            |
| Tiers computed by an algorithm (hop distance upstream) | `design/designloom/workflows/W11.yaml`                                                                         | not yet: a layout cannot read results (open decision 17)                                                                                                    |
| What-if views compared at the same positions           | `design/designloom/workflows/W11.yaml`                                                                         | not yet: no warm start (open decision 27) and no "compute without" scope (open decision 23)                                                                 |
| Radial layout around a hub                             | `design/designloom/workflows/W17.yaml`                                                                         | yes, with a `"node-id"` option                                                                                                                              |
| Layout per cluster, instead of by hand                 | `design/designloom/workflows/W21.yaml`                                                                         | not yet: the clusters are a result, which a layout cannot read (open decision 17)                                                                           |
| The same positions across two conditions               | `design/designloom/workflows/W24.yaml`                                                                         | not served by this point: a seed cannot align two different graphs; needs network collections and a shared-positions rule, outside the six points           |
| Geographic placement                                   | `design/designloom/personas/supply-chain-analyst.yaml`, `design/designloom/personas/intelligence-analyst.yaml` | partly: coordinates from loaded attributes; unplaced nodes and a scene convention need open decision 27, and a joined location table needs open decision 19 |
| Seeded, reproducible figures                           | `design/designloom/workflows/W25.yaml`                                                                         | partly: only for plugins that declare a seed; a layout choice is not restored from a saved document (open decision 8)                                       |
