# The graphty-element 2.0 Public API

Status: draft, for owner review
Date: 2026-09-19
Scope: the public API of `@graphty/graphty-element`, which ships today as 1.10.0
(`graphty-element/package.json:3`). Version 2.0 breaks compatibility in many places. Every
break is named where it is introduced and collected in one table in section 9.

Every claim about how the code behaves today carries a `path:line`, read on 2026-09-19 at repo
root `/home/apowers/Projects/graphty-monorepo`.

---

## 0. Contents

1. What this is, who it is for, and the three principles it serves
2. The first graph (CDN and npm)
3. The core model: the nouns, the diagram, the two placement laws
4. The API surface, area by area, with real signatures and a worked example each
5. Worked examples: the index
6. Packaging: the exports map, siblings, framework interop, TypeScript, documentation
7. The graph logic the application stops having to write
8. The element bugs, made structurally impossible
9. What the API supports, what it breaks, and what it defers
10. Open questions for the owner
11. What this design refuses to do, and what that costs
12. Type reference: everything else, defined

---

## 1. What this is, who it is for, and the three principles it serves

### 1.1 What this is

This document specifies a new public API for graphty-element: the names, the types, the
behaviour, and the reasons. It is a design for review, not an implementation plan. It is
concrete enough that an engineer can build from it and a stranger can learn from it.

graphty-element is a web component that puts a graph on a page and lets a person or a program
work with it: load data, measure it, colour it, filter it, arrange it, select things, export
what they found. It is one `<script>` tag away from a working graph and one `import` away from
a full analysis surface. It runs with or without a GPU, with or without a framework, and -- for
the analysis half -- with or without a screen.

### 1.2 Who it is for

Four consumers, in the order their needs decide arguments in this document.

1. **A stranger with an afternoon.** They found the package on npm. They will read one page,
   paste one example, and change three things. If they cannot put 50,000 nodes on a page,
   colour them by a centrality metric, handle a click and export a PNG with a legend from that
   one page, the API failed.
2. **A coding agent.** It has the docs and no ability to read this repository. It needs names
   that are guessable, a machine-readable catalogue of everything the element can do, and one
   serialisation for every operation so that "do this" and "record that you did this" are the
   same artifact.
3. **An application.** Today that is the graphty app; tomorrow it is a third party's. It needs
   every fact the element already knows to be readable rather than recomputable, and every
   long operation to report progress and be cancellable.
4. **A plugin author.** They want to add an algorithm, a layout, a format, a palette, a scale
   or an accelerator without depending on a 4,147-line renderer class
   (`graphty-element/src/Graph.ts` is 4,147 lines).

### 1.3 The three principles it serves

These are the root `CLAUDE.md` Architectural Principles, restated as tests this design must
pass.

**Principle 1 -- the element contains all graph functionality.** Rendering, configuration,
styling, algorithms, layout, acceleration, and anything else about making and using a graph.
The test: if using a capability requires the consumer to write detection, construction,
lifecycle or error-handling code, that code belongs inside the element. Shipping that work to
the consumer is the defect.

The measured failure today: the graphty app carries roughly 7,500 lines of graph logic it had
to write because the element did not offer it, including an 80-line union-find
(`graphty/src/components/shell/analysis/graphShape.ts`), a 449-line performance model of the
element's own algorithms (`.../analysis/metricCost.ts`), and a 923-line result-statistics
module (`.../analysis/nodeMetrics.ts`). Every third party would write the same three files.

**Principle 2 -- the app is only HTML around the element.** Reading a property and rendering it
is consuming. Deciding, probing, constructing or recovering is not. The test: delete the app
and the capability still exists, reachable from the element's documented surface.

**Principle 3 -- the API and its docs are learnable by humans and by coding agents from the
docs alone.** The test: a third party reaches a working graph without reading this repository.

The measured failure today: the shipped quickstart is wrong three ways at once. It documents
`source`/`target` while `graphty-element/src/config/DataConfig.ts:7-8` defaults
`edgeSrcIdPath` to `"src"` and `edgeDstIdPath` to `"dst"`, so the quickstart renders two nodes
and no edge and reports no error; it lists two layout names that are not registered; and it
sets `style-template="dark"`, which is not a value the property accepts. Every documentation
link in the published README points at `graphty.app/docs/graphty/`, which is a 404.

### 1.4 The one sentence that decides arguments

Where two placements are defensible -- does this belong to the renderer on the page, or to the
model behind it? -- one rule decides, and it decides for capabilities nobody has invented yet:

> **If two synchronised views of one dataset would disagree about it, it belongs to the view.
> Otherwise it belongs to the session.**

Two views disagree about the camera, the pointer, the hovered element, the view mode, the
viewport, the screenshot and the XR session. They must agree about the data, the runs, the
selection, the filter, the layers and the positions. Note where that puts positions: on the
session. "Copy positions A to B" and "Same positions" are meaningless if each view computes its
own arrangement, and a headless `settle()` in a CI job has no view to put them on.

---

## 2. The first graph

Two copies of the same program. Neither is longer than 20 lines. Both are executable and both
are doc-tested in CI (section 6.5).

### 2.1 From a CDN, no build step

```html
<script type="module"
        src="https://cdn.jsdelivr.net/npm/@graphty/graphty-element@2/dist/graphty.bundle.js"></script>

<graphty-element id="g" sample="karate"
               layout="force" style="display:block; height:480px"></graphty-element>

<script type="module">
  const g = document.getElementById("g");
  await g.ready;                                    // engine up, data loaded, first layout done
  const run = g.run("betweenness");                 // a Run; awaiting it gives the result
  await run;                                        // pass the RUN to encode, not the result
  g.encode({ run, channel: "node.color", palette: "viridis", scale: "sqrt" });
  g.addEventListener("graphty-node-click", (e) => console.log(e.detail.node.id));
  const png = await g.capture({ format: "png", scale: 2, legend: true });
</script>
```

Three things in those nine lines are load-bearing and are stated once here so no example has
to repeat them. `sample="karate"` is a built-in dataset (4.3.2), so the first graph needs no
file and no network fetch -- `src` takes a URL and is the next page. **`g.run()` returns a
`Run`; awaiting it gives the `RunResult`. Every encoding helper takes the `Run`**, which is
why the example binds `run` and then awaits it rather than writing
`const run = await g.run(...)`; `EncodingSpec.run` also accepts a `RunResult` or a bare
`RunId`, so the other spelling is not a silent failure either (4.6.2). And betweenness on a
graph above `config.exactComputationCap` switches to its sampled method and says so in
`caveats` rather than locking the frame (4.4.2) -- the un-gated line is safe, and
`session.estimate()` is there when a UI wants to gate a button on it.

`dist/graphty.bundle.js` is a self-contained build with Babylon and Lit inlined. The npm entry
keeps them as bundled implementation detail rather than peers; the CDN entry exists because
today's build externalises `@babylonjs/core` and `lit` (`graphty-element/vite.config.ts`
`rollupOptions.external`), which is why the package's own example page has to hand-write an
import map (`graphty-element/examples/basic.html:24-30`). A stranger must never hand-write an
import map. **Breaking: a self-contained `./bundle` entry is added; the default entry stops
requiring the consumer to supply Babylon and Lit.**

### 2.2 From npm, with data in memory

```js
import "@graphty/graphty-element";                  // defines <graphty-element>

const g = document.querySelector("graphty-element");
g.data = {
  nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
  edges: [{ source: "a", target: "b" }, { source: "b", target: "c" }],
};
await g.ready;
const run = g.run("degree");
await run;
g.encode({ run, channel: "node.size", scale: "sqrt" });
```

Note `source` / `target`. **Breaking: `source`/`target` are the canonical edge endpoint names.**
`src`/`dst` and `from`/`to` are accepted on input and never emitted; when endpoint columns are
not declared the element tries `source`/`target`, then `src`/`dst`, then `from`/`to`, and
**reports which pair it used** in the import report and on `graphty-load-change`
(`detail.endpoints`, at `phase: "end"`). If a file
contains none of them the import fails with `E_EDGE_ENDPOINTS_UNRESOLVED` carrying the column
list. Never a silent edgeless graph. This single defect is the most common first-afternoon
failure the package has, and it is currently invisible: the JSDoc path yields a graph with
nodes, no edges and no error.

Nothing above is a session. `g.ready`, `g.run`, `g.encode`, `g.select`, `g.load`, `g.get`,
`g.data` and `g.on` are element methods that forward to `g.session`; `g.capture` is a view
verb of the element's own (1.4 puts the screenshot on the view). **The word "session" does not
appear in the documentation before the Compare page and the Node/testing page.** That promise
is load-bearing: the model/view split is the structural bet of this design, and a stranger who
has to learn it before their first graph pays for a capability they do not have yet.

---

## 3. The core model

### 3.1 The nouns, in the order a stranger learns them

A stranger learns nouns 1 and 2 to get a graph, 3 through 7 to do analysis, and 8 through 13
only when they need them.

| # | Noun | What it is | Where it lives |
|---|---|---|---|
| 1 | `<graphty-element>` | the custom element: a view with a session of its own | `.` |
| 2 | `Run` | one execution of one algorithm with one parameter set, addressable by id | `session.runs` |
| 3 | `Layer` | one declarative styling rule; the stack paints the graph | `session.styles` |
| 4 | `Scope` | where work happens: visible, selection, a saved set, a predicate | a parameter |
| 5 | `Selection` | the two selected sets (nodes, edges), shared by every surface | `session.selection` |
| 6 | `Filter` | the visibility mask; the time window is the same mask | `session.visibility` |
| 7 | `Command` | the plain-JSON form of any operation; what serialises and replays | `./commands` |
| 8 | `session` | the headless model: everything about the graph that needs no screen | `./session`, `el.session` |
| 9 | `session.layout` + `session.positions` | the arrangement and its transport | session |
| 10 | `view.camera` | where this renderer is looking | view |
| 11 | `session.capabilities` | what this machine can do, measured, never probed by you | session |
| 12 | `session.journal` | the record, with inverses, coalescing and replay | session |
| 13 | `registry` | plugins: algorithms, layouts, formats, scales, palettes, accelerators, commands, mappers, providers | `./extend` |

### 3.2 The shape, in ASCII

```
                      +---------------------------------------------+
   your page          |            <graphty-element>  (a VIEW)        |
   +-------------+    |  camera   viewMode   hover   rendered       |
   | DOM events  |<---|  capture()  worldToScreen()  dispose()      |
   | properties  |--->|                                             |
   +-------------+    |  forwarders: ready run encode select load   |
                      |              capture on data                |
                      +----------------------+----------------------+
                                             | .session
                                             v
   +---------------------------------------------------------------------------+
   |                          GraphSession  (the MODEL)                         |
   |                                                                            |
   |  data ........ nodes, edges, attributes, neighbors, statistics, find,       |
   |                inspect/import, mutate (every mutation returns an inverse),  |
   |                compute, expand, export, fingerprint                         |
   |  runs ........ start, get, list, remove, bindings, estimate, plan, batch    |
   |  scope ....... resolve(spec) -> ResolvedScope (ids + digest)               |
   |  selection ... two sets, five set verbs, gestures, cap, statistics          |
   |  visibility .. one id-set mask; filters AND the time window produce it      |
   |  styles ...... ordered Layer stack, encode(), highlight(), legend(),        |
   |                explain(), applyTemplate()                                   |
   |  layout ...... engine + transport (play/pause/step/settle/stop), recommend  |
   |  positions ... the arrangement, pinning, snapshot/restore                   |
   |  catalog ..... every algorithm, layout, format, palette, scale, with        |
   |                plain + technical names, options, cost class, applicability   |
   |  capabilities  measured limits, acceleration state, XR, config document      |
   |  journal ..... every state change, with a Command and its inverse           |
   |  run(command)  the universal executor; every method above has a command form |
   +---------------------------------------------------------------------------+
                          ^                                   ^
                          |                                   |
         +----------------+                                   +----------------+
         |                                                                     |
  +------+------+                                                      +-------+-----+
  | view A      |   two views, ONE session: synchronised Compare.     | view B      |
  | camera A    |   one data copy, one selection, one filter,          | camera B    |
  +-------------+   one layer stack, one set of positions.             +-------------+
                    Two views that must DIFFER -- different runs,
                    different time windows, different layers -- are
                    two sessions over ONE shared data core:
                    createGraphSession({shareDataWith: sessionA}).
```

### 3.3 Why the split exists

Three requirements make it structural rather than stylistic.

1. **Compare.** Putting two pictures of one network side by side, with synchronised pan and
   zoom, a "same positions" button and a "copy the left view's positions to the right one"
   button, is a thing people do constantly and the thing the product asks for first. Two views
   of one dataset is one model and two renderers. Today `Graph`'s constructor takes an element
   and wipes it (`graphty-element/src/Graph.ts:182`, `this.element.innerHTML = ""`), and the
   custom element
   builds a canvas and a Babylon engine before it is in the DOM
   (`graphty-element/src/graphty-element.ts:27-35`). Two views of one dataset is not
   expressible.

   Compare has two modes and the split serves both. **Synchronised** Compare -- the same
   picture from two camera angles -- is two views assigned the same session. **Divergent**
   Compare -- the same network with a different time slice, or a different algorithm result, on
   each side -- is two sessions over one shared immutable data core
   (`createGraphSession({shareDataWith})`, 4.2), joined by `createComparison` (4.2.4). It is
   deliberately **not** per-view overrides on one session: a view-owned filter, layer stack or
   run binding would break the placement rule in section 1.4 and the refusal it drives in
   section 11, and would make
   "which picture is this?" unanswerable from the session. Two sessions over one data core
   costs one extra model and zero extra data copies, and it is why per-side result naming
   (`[degree.A]` against `[degree.B]` in a formula) falls out for free: each session has its own
   `results.*` root.
2. **Several named graphs open at once.** That is not in 2.0, but it is the next thing asked
   for. If graph identity is "the element", a collection of named graphs is a rewrite. If graph
   identity is "a session", it is `Map<string, GraphSession>` and nothing in this API changes.
3. **Testing and headless use.** `settle()` with no view is a CI job that computes an
   arrangement and asserts on it without a GPU. The element's current test story is five vitest
   projects, five browser shards and four storybook shards precisely because no layer runs
   without one.

A fourth reason is packaging. The element has no entry point that carries pure data: the one
entry point drags in Babylon, so the app copies the element's ten viridis colour anchors
verbatim (`graphty/src/components/shell/defaults/nodeMetricStyle.ts:176`) and imports element
source by relative path in a test
(`graphty/src/constants/__tests__/style-options.test.ts:8`). A session entry point that carries
no 3D engine answers that and Compare at the same time.

### 3.4 Two things that are data, not objects

**Commands.** Every operation that changes state or costs more than O(1) has a plain-JSON
command form on a discriminated union keyed by `op`. The methods in section 4 are typed sugar
that build and execute those commands; `session.run(command)` executes one directly.

> **Every method is a command, and every command is a method.**

The rule buys one serialiser with five consumers -- a console transcript, an AI tool layer,
"Copy as command", recipe export and journal export -- and it invents no serialisation format
at all to get there. The union
is emitted at build as `dist/graphty-commands.json` plus a JSON Schema, so an agent can read the
whole surface without parsing TypeScript.

**Descriptors.** Every algorithm, layout, format, palette, scale and option is a plain-JSON
descriptor in `session.catalog`, carrying a plain name, a technical name, a description, a
category, a cost class, an option schema and declared result fields. **Breaking: option schemas cross
the package boundary as plain JSON, never as Zod objects.** Today they cross as Zod, and the one
consumer reads Zod's private `_def` in two modules to recover type, default, min and max
(`graphty/src/utils/zodSchemaParser.ts:22-28`, and again in
`graphty/src/components/options/OptionsForm.tsx:65-115` with a v3/v4 branch, because the element
imports `zod/v4` while depending on `zod ^3.25.28`). Shipping Zod across a boundary makes the
consumer's Zod version part of the element's API.

### 3.5 Law of costs

> **What is O(1) is a property. What costs more is a command, and therefore has an estimate
> before you pay for it.**

Node count is a property. Betweenness is a command. This rule is what makes the cost surface
complete without a per-verb estimate method, and it is what makes worker hosting possible
later: the synchronous half of the session is exactly the set of facts a worker proxy can
mirror on the main thread (section 4.2.3).

---

## 4. The API surface, area by area

Every signature below is real TypeScript that compiles. Each area ends with a worked example a
stranger could paste.

Shared scalar types, defined once:

```ts
type NodeId = string | number;
type EdgeId = string;
type RunId = string;
type LayerId = string;
type NoteId = string;
type ScopeId = string;
type JournalId = string;
type Path = string;            // a JMESPath expression over the result root (section 4.15.1)
type Query = string;           // a JMESPath predicate; the same dialect everywhere

type KnownAlgorithm = "degree" | "betweenness" | "closeness" | "pagerank" | "eigenvector"
                    | "katz" | "hits" | "louvain" | "leiden" | "label-propagation"
                    | "components" | "shortest-path" | "all-paths" | "max-flow" | "min-cut"
                    | "k-core" | "clustering-coefficient" | "girvan-newman" | "bfs" | "dfs"
                    | "kruskal" | "prim" | "bipartite-matching" | "link-prediction";
// KnownAlgorithm is generated from the built-in catalogue at build time; the list above is
// the 2.0 built-in set. A plugin name type-checks through the (string & {}) arm below.
// Four members are NOT registered in 1.10.0 and are implementation work for 2.0, not API
// work: all-paths and clustering-coefficient are new algorithms; k-core and link-prediction
// are wrappers over @graphty/algorithms, which already implements both. They are listed
// because the catalogue is generated from what actually ships: if one slips it leaves the
// union, and catalog.algorithms() stays honest either way.
type AlgorithmKey = KnownAlgorithm | (string & {});
type LayoutId = "force" | "force-2d" | "circular" | "radial" | "hierarchical" | "grid"
              | "shell" | "spectral" | "bipartite" | "layers" | "fixed" | "random"
              | "planar" | "spiral"
              | (string & {});
type FormatId = "json" | "csv" | "graphml" | "gexf" | "gml" | "dot" | "pajek" | "sif" | "cx2"
              | (string & {});
type PaletteId = "viridis" | "plasma" | "okabe-ito" | "blue-orange" | (string & {});
```

`(string & {})` keeps the autocomplete list alive while accepting a plugin's name. `NodeId` is
declared once; today `NodeIdType` is declared twice in the element's own source
(`graphty-element/src/Node.ts:16` and `graphty-element/src/config/GraphBehavior.ts:29`), and a
public API cannot have two sources of truth for its id type.

**Breaking: the built-in algorithm keys are renamed, and five of today's twenty-three fold into
two.** Eighteen of the twenty-three are unchanged. The 1.10.0 registry keys (`graphty-element/src/algorithms/index.ts:36-72`, each
class's `static type`) do not survive unchanged, and a rename with no table is the same
silent break as a removal:

| 1.10.0 key | 2.0 key | Note |
|---|---|---|
| `degree`, `betweenness`, `closeness`, `pagerank`, `eigenvector`, `katz`, `hits` | unchanged | the keys; the result **field names** change for all of them under the uniform per-shape rule (4.4.3) |
| `louvain`, `leiden`, `label-propagation`, `girvan-newman` | unchanged | |
| `bfs`, `dfs`, `kruskal`, `prim`, `bipartite-matching`, `max-flow`, `min-cut` | unchanged | |
| `dijkstra` (`DijkstraAlgorithm.ts:57`) | `shortest-path` | the engine is a parameter: `{ method: "dijkstra" \| "bellman-ford" \| "floyd-warshall" }`, defaulting by weight sign, exactly as layout names became semantic |
| `bellman-ford` (`BellmanFordAlgorithm.ts:46`) | `shortest-path` with `{ method: "bellman-ford" }` | negative weights |
| `floyd-warshall` (`FloydWarshallAlgorithm.ts:13`) | `shortest-path` with `{ method: "floyd-warshall", allPairs: true }` | cost class `cubic`; the all-pairs result is a `fact` |
| `connected-components` (`ConnectedComponentsAlgorithm.ts:12`) | `components` | |
| `scc` (`StronglyConnectedComponentsAlgorithm.ts:12`) | `components` with `{ strength: "strong" }` | `"weak"` is the default and is today's `connected-components` |

Nothing loses a capability; three keys become a parameter on two keys, and the parameter is
reported back in the result's `caveats.method`. The migration document carries the same table.

**Breaking: layout names become semantic.** `force`, `radial`, `hierarchical` -- not `ngraph`,
`d3`, `forceatlas2`. Which engine implements `force` is `catalog.layouts` data. The element
registers sixteen engines today whose public names are their implementations
(`graphty-element/src/layout/NGraphLayoutEngine.ts:86` `static type = "ngraph"`,
`ForceAtlas2LayoutEngine.ts:123` `static type = "forceatlas2"`, and fourteen more), which
freezes the implementation into the API: swapping ngraph for GPU ForceAtlas2 would be a rename
a consumer can see. Under semantic names it is a catalog edit and a minor version.

---

### 4.1 The element

```ts
interface GraphtyGraphElement extends HTMLElement {
  // --- the model ---
  session: GraphSession;                      // assignable; defaults to one of its own (see below)
  readonly ready: Promise<void>;              // resolves once, after first paint

  // --- view state: the things two views disagree about ---
  readonly camera: CameraApi;
  viewMode: "2d" | "3d" | "vr" | "ar";
  readonly hover: { node: NodeId | null; edge: EdgeId | null };
  setHover(target: { node: NodeId } | { edge: EdgeId } | null): void;   // programmatic hover
  readonly rendered: {
    nodes: number; edges: number;
    performanceMode: { active: boolean; reasons: readonly string[];
                       mode: "auto" | "on" | "off" };   // set via config.performanceMode
  };
  interactive: boolean;
  hoverMode: "off" | "nodes" | "neighbors";

  // --- view verbs ---
  capture(options?: CaptureOptions): Promise<CaptureResult>;
  recordVideo(options: VideoOptions): Run<VideoResult>;
  report(options: ReportOptions): Run<Blob>;                       // section 4.9
  evidenceBundle(options?: EvidenceBundleOptions): Run<Blob>;      // section 4.9
  worldToScreen(p: Position): { x: number; y: number };
  screenToWorld(p: { x: number; y: number }): Position | null;
  dispose(): void;

  // --- convenience forwarders, so the first graph needs no session ---
  run(algorithm: AlgorithmKey, params?: Record<string, unknown>, options?: StartOptions): Run;
  run<C extends Command>(command: C, options?: RunOptions): Run<ResultOf<C>>;
  encode(spec: EncodingSpec): Run<Layer>;     // awaiting it gives the Layer
  select(target: SelectionTarget, op?: SetOp): Promise<SelectionDelta>;
  load(source: Source, plan?: ImportPlan, options?: ImportOptions): Promise<ImportReport>;
  get(id: NodeId | EdgeId): ElementView | undefined;
  on<K extends keyof GraphtyEventMap>(type: K, handler: (e: GraphtyEventMap[K]) => void,
     options?: ListenOptions): () => void;
  data: GraphData;                            // setter REPLACES; getter returns records

  // --- the one unsupported door ---
  readonly unstable_internals: unknown;       // the Babylon Scene and the managers behind it.
                                              // Not semver-protected, will change without a
                                              // major. If you need it, file an issue: that is
                                              // a missing API.
}

interface ElementView {
  readonly id: NodeId | EdgeId;
  readonly kind: "node" | "edge";
  readonly data: Readonly<Record<string, unknown>>;
  readonly results: Readonly<Record<RunId, Readonly<Record<string, unknown>>>>;
  readonly position: Position | null;
  readonly screenPosition: { x: number; y: number } | null;
  readonly visible: boolean;
  readonly selected: boolean;
  readonly style: ResolvedStyle;
}

interface Position { x: number; y: number; z: number }
```

The element forwards eight things -- `ready`, `run`, `encode`, `select`, `load`, `get`, `on`
and `data` -- plus its own view verbs. It forwards 98 today, including ten manager getters
(`graphty-element/src/graphty-element.ts:1495`, `:1836`, `:1845`, `:1854`, `:1868`, `:1877`,
`:1886`, `:1971`, `:2057`, `:2084`), a raw
Babylon `Scene`, a raw `AbstractMesh`, and a `setRenderSettings` whose whole body is a `return`
with an unused parameter (`graphty-element/src/Graph.ts:1455`, `_settings`).

`setHover()` exists because "hover a row in a table, highlight the matching node in the graph"
is something every consumer wants and a readonly `hover` property cannot serve.
`config.performanceMode` (`"auto" | "on" | "off"`) lets a person force reduced detail on or off
instead of leaving it to the element; `rendered.performanceMode.mode` reports which one is in
force and `.reasons` says why.

**Breaking: `element.graph` and the eleven exported manager classes are removed.** `graphty-element/index.ts`
is 343 lines of exports including the manager block; `Graph` is 4,147 lines with roughly 100
public methods. A god object documented "for debugging" that is also the only consumer's main
road is not an API. There is exactly one unsupported door, `unstable_internals`, and its
one-line documentation says it is not semver-protected.

**Breaking: `dispose()` is honest and the element is re-attachable.** Today `disconnectedCallback`
(`graphty-element/src/graphty-element.ts:133-143`) disconnects a resize observer, calls
`this.#graph.shutdown()` and then `super.disconnectedCallback()`. `Graph.dispose()`
(`Graph.ts:4134-4146`) is the superset: it disposes the voice adapter, the AI manager, the XR UI
and the XR session, and then calls `shutdown()` itself. The element never calls `dispose()`, so
those four leak when the element leaves the DOM. In 2.0 the view releases renderer
resources on disconnect and recreates them on connect; teardown is deferred one frame so a
React StrictMode double-mount does not destroy the engine; the session outlives both and is
disposed only when you dispose it.

**Who disposes the session.** The element disposes a session it created; it never disposes one you
assigned. A view with no assignment creates its own on first use and releases it on `dispose()`, so
the common case -- one graph on a page -- leaks nothing and needs no lifecycle code. Assigning
`el.session` disposes the implicit session it replaces, and from then on the session is yours:
`dispose()` on the element leaves it alive, because the other view sharing it still needs it.

The rule exists because the alternative leaks in silence. If the element never released the session
it made, every mounted and unmounted graph would strand a data core, a run history and a position
array, and the consumer would have to dispose a thing they never created and were told they did not
need to know about. If instead the element disposed whatever session it held, the first Compare
teardown would destroy the session the other view is still rendering. Ownership follows creation,
which is the only rule that answers both.

**Breaking: the element stops reading `window.location.search`.** `graphty-element/src/graphty-element.ts:58`
constructs `new URLSearchParams(window.location.search)` at startup and configures itself from
the host page's query string. An embedded component that reconfigures itself from its host's URL
is a surprise a third-party host cannot anticipate and cannot diagnose. It becomes opt-in:
`<graphty-element url-params="profiling logging">`.

#### 4.1.1 Attributes: eleven, strings and booleans only

| attribute | type | default | reflects | notes |
|---|---|---|---|---|
| `src` | URL | -- | yes | loads on set; format sniffed unless `format` is given |
| `sample` | SampleDatasetId | -- | yes | a built-in dataset; the first graph needs no file. Names from `catalog`/`data.samples()` |
| `format` | FormatId | auto | yes | names from `catalog.formats` |
| `layout` | LayoutId | `force` | yes | names from `catalog.layouts` |
| `view-mode` | `2d`/`3d`/`vr`/`ar` | `3d` | yes | replaces `view-mode` **and** `layout-2d` |
| `theme` | theme name | `default` | yes | names from `catalog.themes` |
| `filter` | `Query` | -- | yes | the visibility mask, as a predicate |
| `acceleration` | `auto`/`off`/`required` | `auto` | yes | `required` turns absence into `E_NO_ACCELERATOR` |
| `interactive` | boolean | present | yes | pointer input on or off |
| `hover` | `off`/`nodes`/`neighbors` | `nodes` | yes | hover costs; it is opt-out |
| `url-params` | space-separated flag list | -- | yes | opt in to reading the host page's query string. Absent means the element never reads `window.location` |

Eleven, and every one of them is a string or a boolean. `src` and `sample` are mutually
exclusive; setting both is `E_BAD_COMMAND` naming the pair.

**`acceleration` is a session setting, and the element never persists it.** It is an attribute
and a property, it lives as long as the session does, and it is not a `ConfigValues` key, so
`config.toDocument()` does not carry it and `applyDocument()` cannot set it. Storing what a
reader chose, and restoring it on the next visit, is the host application's job: the app keeps
its own storage key and writes the attribute when it mounts the element. The element persists
nothing on a reader's behalf, because a component that writes to a host page's storage without
being asked is a surprise the host cannot anticipate -- and a reader preference restored by the
element would fight the attribute the host page wrote in its own markup.

Two slots, and only two: `<script type="application/json" slot="data">` and `slot="theme">`.
Both appear in the Custom Elements Manifest.

**Breaking: the five object-valued attributes are removed, and thirteen of the fifteen attributes
go in total.** The element declares fifteen today
(`graphty-element/src/graphty-element.ts:187`, `:233`, `:257`, `:279`, `:344`, `:368`, `:392`,
`:435`, `:461`, `:501`, `:527`, `:580`, `:604`, `:631`, `:669`). The five object-valued ones are
`node-data`, `edge-data`, `data-source-config`, `layout-config` and `style-template` (`:187`,
`:233`, `:279`, `:461`, `:580`); `layout` and `view-mode` are the two that survive. They are not fixed, they are
deleted; the migration document carries the per-attribute table. They are silently
non-functional today: `grep -n converter graphty-element/src/graphty-element.ts`
returns nothing, so no Lit converter is declared on any of them, which means
`node-data='[{"id":1}]'` hands the setter a string, `Array.isArray` is false, and the rows are
dropped with no error. No test or story in the repo exercises the attribute path. Rich data is
property-only, or a JSON slot, or `src`.

**Breaking: `data-source` and `data-source-config` are removed for a second reason.** They occupy
the HTML `data-*` custom-data namespace, so `el.dataset.source` aliases the API and any tool
that assumes `data-*` is author data collides with it.

#### 4.1.2 The React upgrade-timing hazard, defended rather than documented

React decides property-versus-attribute with `name in element` and does not retry after
`whenDefined`. A lazily-defined element therefore receives `data="[object Object]"` as an
attribute in production and is never corrected. The element runs the `_upgradeProperty` dance
in `connectedCallback` for every public rich property, and emits one loud `console.error`
naming the property and linking to the docs when it upgrades and finds an attribute whose value
is literally `"[object Object]"`. That converts the worst silent interop failure in this space
into a ten-second fix.

#### 4.1.3 Worked example: a status bar with no session

```html
<graphty-element id="g" src="/data/network.graphml" layout="force"
               style="display:block;height:70vh"></graphty-element>
<p id="bar"></p>
<script type="module">
  import "@graphty/graphty-element";
  const g = document.getElementById("g");
  const bar = document.getElementById("bar");
  g.on("graphty-load-change", (e) => { bar.textContent = e.detail.summary; });
  g.on("graphty-run-change", (e) => {
    const r = e.detail.run;
    bar.textContent = r.progress.fraction === null
      ? `${r.label}: working`
      : `${r.label}: ${Math.round(r.progress.fraction * 100)}%`;
  });
  await g.ready;
  await g.run("components");
</script>
```

---

### 4.2 The session

```ts
import { createGraphSession } from "@graphty/graphty-element/session";

interface GraphSession {
  readonly data: DataApi;
  readonly runs: RunsApi;
  readonly results: ResultsApi;                  // run-result addressing (4.4.2)
  readonly scope: ScopeApi;
  readonly selection: SelectionApi;
  readonly visibility: VisibilityApi;
  readonly styles: StylesApi;
  readonly layout: LayoutApi;
  readonly positions: PositionsApi;
  readonly notes: NotesApi;                      // notes, and the AnnotationSet document (4.15.3)
  readonly catalog: CatalogApi;
  readonly capabilities: Capabilities;
  readonly config: ConfigDocument;
  readonly journal: JournalApi;
  readonly status: Status;                       // O(1) facts, always current

  snapshot(): GraphSnapshot;                     // the typed-array form; `./format` reads it
  run<C extends Command>(command: C, options?: RunOptions): Run<ResultOf<C>>;
  plan<C extends Command>(command: C): Promise<Plan>;     // dryRun, exact where it can be
  estimate<C extends Command>(command: C): CostEstimate;  // SYNCHRONOUS; gates a button
  on<K extends keyof SessionEventMap>(event: K,
     handler: (detail: SessionEventMap[K]) => void): () => void;
  acceleration: "auto" | "off" | "required";
  setAccelerator(acc: GraphAccelerator | null): void;
  calibrate(options?: RunOptions): Run<Limits>;
  fingerprint(): string;
  dispose(): void;
}

function createGraphSession(options?: {
  registry?: Registry;
  config?: Partial<ConfigValues>;
  host?: "main" | "worker";
  shareDataWith?: GraphSession;   // one immutable data core, two independent models (3.3)
}): GraphSession;
```

`shareDataWith` is the same-dataset half of Compare, and it is the one place two sessions are
deliberately cheap. The new session shares the data **core** -- the imported node and edge
tables, their attribute columns, the adjacency index and the import report -- by reference, and
owns everything else: its own runs and results root, computed columns, styles, selection,
visibility and time window, positions, notes and journal. Three rules make that safe:

1. **Structural mutation belongs to the owner.** `data.import`, `data.expand`, `data.collapse`
   and a `data.apply` that adds, removes, merges or clears are refused on a sharing session
   with `E_READONLY`, whose `details` name the owning session. Applied through the owner they
   succeed and emit `data:changed` on **every** sharer, so no sharer can be looking at a core
   that has moved under it.
2. **Computed columns are per-session.** `data.compute` writes into the calling session's own
   overlay, never into the shared core, which is what lets `createComparison().delta()` write
   a difference on both sides at once.
3. **Disposing the owner is refused while a sharer is live** (`E_READONLY`), and
   `session.dispose()` on a sharer releases only the overlay.

This keeps the placement rule of section 1.4 intact -- no view owns graph state -- while making "two
views of one dataset showing different algorithm results or different temporal snapshots"
expressible, which is exactly what somebody comparing two time slices or two community
resolutions is asking for. Section 4.2.4 shows it.

#### 4.2.1 `plan` and `estimate`: one flag, one synchronous answer

`session.plan(command)` is the universal look-before-you-leap door. One call answers every
question of the form "what would this do, and what would it cost?": the seconds a run would
take, "38 of 318 nodes would match" beside a filter being built, "matches 41,200 nodes" beside
a layer's selector, the node and edge counts a merge would produce, the group count of a batch
merge, the per-type counts an expansion would add, what an auto-fix would change, the pixel
size and byte size of an image export and what would be in its frame, how many hits a search
would return without selecting them, whether an algorithm can run on this graph at all, and
whether it is cheap enough to start while data is still loading or while the user is standing
in a headset.

```ts
interface Plan {
  readonly ok: boolean;
  readonly blocked?: { code: GraphtyErrorCode; reason: string };
  readonly cost: CostEstimate;
  readonly effect: PlanEffect;         // the command's own preview shape
  readonly caveats: Caveats;
}

interface CostEstimate {
  readonly seconds: number;
  readonly confidence: "measured" | "calibrated" | "modelled" | "unknown";
  readonly costClass: "instant" | "iterative" | "heavy" | "cubic" | "unbounded";
  readonly blocksFrame: boolean;
  readonly cancellable: boolean;
  readonly available: boolean;
  readonly reason?: string;            // why not available on this graph
  readonly basis: string;              // "n=34,m=78, calibrated 2026-09-19 on this device"
}

type PlanEffect =
  | { kind: "match"; nodes: number; edges: number; exact: boolean; sampled?: number }
  | { kind: "mutate"; nodesAdded: number; nodesRemoved: number; edgesAdded: number;
      edgesRemoved: number; attributesChanged: number; byType?: Record<string, number> }
  | { kind: "write"; fields: readonly FieldDescriptor[] }
  | { kind: "bytes"; bytes: number; elements: number; exact: boolean;
      loss: readonly LossNote[] }
  | { kind: "image"; width: number; height: number; nodesInFrame: number;
      legendChannels: number; bytes: number }
  | { kind: "none" };
```

`estimate()` is **synchronous** and returns only the cost half, because a UI has to decide how
a button behaves before the click happens: under a couple of seconds a Run button simply runs,
past that it warns, past a higher limit it asks for confirmation, and in a headset a long run is
refused in place with "About 40 s -- run this at the desk". A promise cannot gate a click. It is
O(1) because the element maintains the graph statistics incrementally and owns the calibrated
cost model.

Both are the element's job, not the consumer's. `graphty/src/components/shell/analysis/metricCost.ts`
is 449 lines of a performance model of the element's own internals, calibrated against a built
bundle, containing `PAGERANK_ITERATION_BOUND = 100` (metricCost.ts:166) which is a copy of a
default declared in the element's own schema. Its own history records that the model was wrong
in production by 6.9x at n=200,000: a 70,000-node graph estimated 2.10 s, so the button showed
no confirm, and the frame then locked for 10.4 s. No consumer should ever be able to compute a
better estimate than the element can.

#### 4.2.2 `Status`: the O(1) half

```ts
interface Status {
  readonly phase: "idle" | "loading" | "laying-out" | "running";
  readonly ready: boolean;
  readonly counts: { nodes: number; edges: number; visibleNodes: number; visibleEdges: number };
  readonly loading: { active: boolean; fraction: number | null; loadedNodes: number;
                      partial: boolean; runnableCostClasses: readonly CostClass[] };
  readonly graph: GraphStatistics;
  readonly layout: { id: LayoutId; kind: "live" | "batch";
                     state: "idle" | "running" | "settled" | "stopped"; step: number };
  readonly dataset: { fingerprint: string; source?: string; loadedAt?: string };
  readonly runs: { running: number; queued: number; stale: number };
}
```

`status.loading.runnableCostClasses` is what lets a UI disable the expensive cards with
"Available when loading finishes" while the instant ones stay live under "Partial data (24%
loaded)". The element publishes which cost classes are runnable right now; the consumer renders
the sentence.

#### 4.2.3 Worker hosting, and the promise this design will keep

`createGraphSession({ host: "worker" })` returns a session with the **same interface**. That is
only honest if the synchronous half of the interface is a set of facts a proxy can mirror, which
is why section 3.5's law exists. The synchronous members are exactly these, and the list is
derived from the interfaces in section 4 rather than chosen:

- **maintained structs**: `status`, `capabilities`, `config.values`, `config.keys`,
  `catalog.*` (every descriptor list), `data.statistics()`, `data.attributes()`,
  `data.fingerprint()`, `fingerprint()`, `journal.entries`.
- **O(1) lookups**: `data.node(id)`, `data.edge(id)`, `positions.get(id)`, `runs.get(id)`,
  `styles.get(id)`, `journal.get(id)`, `results.get(run)`/`.path(run, field)`/`.has(...)`,
  `notes.count(id)`.
- **bounded readonly views**: `selection.nodes`/`.edges`/`.size`/`.cap`/`.truncated`,
  `visibility.summary`/`.filter`/`.window`, `positions.complete`, and the MASK accessors
  `selection.nodeMask()`/`.edgeMask()`, `visibility.nodeMask()`/`.edgeMask()`,
  `positions.pinnedMask()` (a `Uint8Array` is bounded and transferable; a set of every visible
  id is neither, which is why the id-array forms are lazy materialisations and not the
  boundary types),
  `runs.list()`/`.bindings(id)`/`.queue`, `styles.list()`, `scope.list()`,
  `layout.id`/`.kind`/`.state`/`.step`/`.dimensions`.
- **pure computations over the above**: `estimate(command)`, `styles.validate(spec)`,
  `catalog.validate(query)`, `styles.explain(target)`.
- **bounded writes to metadata the worker does not own**: `scope.save`/`scope.remove`,
  `positions.pin`/`unpin`, `notes.setCounts`, `selection.clear()`, the layout transport
  (`play`/`pause`/`tick`/`stop`, which post and report on `layout:changed`), `config.set`
  and `config.reset`.

Each is O(1), maintained incrementally, or bounded by the selection cap, so the worker mirrors
a small struct and a position buffer over `SharedArrayBuffer` where available and a coalesced
postMessage otherwise.

Everything that walks the graph is asynchronous by construction: `data.nodeIds(scope)`,
`data.neighbors()`, `data.find()`, `data.match()`, `selection.apply()`, `visibility.set()`,
every style write verb (`styles.add`/`update`/`remove`/`move`/`encode`/`highlight`, which
validate **and** repaint, an O(n) pass -- 4.6.1), `layout.set()`, `scope.resolve()`,
`scope.count()`, and every run.

**One synchronous member is deliberately not O(1), and it is named rather than hidden:**
`session.snapshot()`. It hands back the session's own maintained frozen `GraphSnapshot` by
reference, so on the main thread it copies nothing; across a worker boundary it would have to
transfer typed arrays, which no proxy can do synchronously. A worker-hosted session therefore
throws `E_UNSUPPORTED` from `snapshot()` with that reason, the same way
`createGraphSession({host: "worker"})` throws it until the host exists (Q9). A member that
refuses with a stated reason keeps the interface honest; a member that silently copies a
hundred megabytes does not.

The discipline is what prevents a second major version. A synchronous accessor that walks the
graph -- `data.nodeIds(scope)` returning an array rather than a promise, say -- cannot be
answered by a worker without shipping the whole id space to the main thread, so adding worker
hosting afterwards would force that accessor to become asynchronous, and that is a breaking
change.

#### 4.2.4 Worked example: Compare, and a session in Node

```js
// Synchronised Compare: two views of one dataset, one picture, two cameras.
import { createGraphSession } from "@graphty/graphty-element/session";
const session = createGraphSession();
await session.data.import({ url: "network.json" });
viewA.session = session;
viewB.session = session;
viewB.camera.linkTo(viewA.camera, { pan: true, zoom: true, rotate: false });
```

```js
// Divergent Compare: ONE dataset, two DIFFERENT pictures. One data copy.
import { createGraphSession, createComparison } from "@graphty/graphty-element/session";

const a = createGraphSession();
await a.data.import({ url: "network.json" });
const b = createGraphSession({ shareDataWith: a });   // shares the data core, nothing else

viewA.session = a;  viewB.session = b;
viewB.camera.linkTo(viewA.camera, { pan: true, zoom: true });

await a.runs.start("louvain", { resolution: 1.0 }, { as: "groups" });
await b.runs.start("louvain", { resolution: 2.5 }, { as: "groups" });  // same id, other side
await b.visibility.setWindow({ attribute: "data.ts", from: "2026-01", to: "2026-06" });

const cmp = createComparison({ a, b, match: { on: "id" } });
cmp.onlyIn("a");                       // ids the other side does not show
await cmp.delta("degree");             // the difference as a computed attribute on both

// Swap views is an assignment, because nothing about the picture lives on the view:
[viewA.session, viewB.session] = [viewB.session, viewA.session];
```

```js
// A CI job with no GPU and no DOM.
import { createGraphSession } from "@graphty/graphty-element/session";
const s = createGraphSession();
await s.data.import({ url: new URL("./fixture.graphml", import.meta.url) });
await s.layout.set("force");
const settled = await s.layout.settle({ maxSteps: 2000 });
assert.equal(settled.reason, "converged");
const run = await s.runs.start("betweenness");
assert.ok(run.result.summary().top[0].value > 0);
```

Two datasets side by side (Compare over a second file) is the same join over two
**independent** sessions -- the only difference is that the second one loaded its own file
instead of sharing a core:

```js
import { createComparison } from "@graphty/graphty-element/session";
const cmp = createComparison({ a: sessionA, b: sessionB, match: { on: "id" } });
cmp.copyPositions("a", "b");     // matched nodes take A's positions
cmp.settleUnmatched("b");        // a short force pass pinned to matched neighbours
await cmp.delta("degree");       // writes the difference as a computed attribute on both
cmp.onlyIn("a");                 // ids present on one side only
```

Result namespacing falls out free in **both** cases: each session has its own `results.*` root,
so `[name.A]` in a formula is session A resolving `name`, and a layer bound to a run in A
carries the side in its source. When Compare exits, a layer whose source names a session that
is no longer bound is **disabled with its reason**, never silently repainted.

`createComparison` is declared in section 12 and lives in `./session`, so the whole of Compare
-- shared or independent -- runs in a Node test with no view at all.

---

### 4.3 Data

#### 4.3.1 The record shapes, fixed and documented

```ts
interface NodeRecord { id: NodeId; [attribute: string]: unknown }
interface EdgeRecord { id?: EdgeId; source: NodeId; target: NodeId; [attribute: string]: unknown }
interface GraphData { nodes: readonly NodeRecord[]; edges: readonly EdgeRecord[] }
```

`source`/`target` are canonical. **Breaking: `Edge.id` becomes an element-assigned counter
rather than `${src}:${dst}`, and the default edge-weight field becomes `weight` rather than
`value`.** These two, plus the changed raw centrality values for adapters that currently mirror
a directed graph, are behaviour changes the move onto the shared `@graphty/graph-format`
snapshot already commits the element to. They are named here as breaking changes because they
are observable through public events and results; letting them arrive later as "a minor" is
exactly the second major version this design exists to avoid.

#### 4.3.2 Two-phase load

```ts
type Source = string | URL | File | Blob | ReadableStream<Uint8Array> | GraphData
            | { url: string; headers?: Record<string, string> };

interface DataApi {
  inspect(source: Source, o?: { format?: FormatId; signal?: AbortSignal }): Promise<Inspection>;
  import(source: Source, plan?: ImportPlan, o?: ImportOptions): Promise<ImportReport>;
  sample(name: SampleDatasetId): Promise<ImportReport>;
  samples(): readonly SampleDatasetDescriptor[];
}

interface ImportOptions extends RunOptions {
  mode?: "replace" | "merge";
  encoding?: string;                  // override the detected text encoding
  subset?: { fraction?: number; nodes?: number; seed?: number };  // load a random subset
  resume?: { from: number };          // byte offset; a ranged request where the server allows
  memoryBudgetBytes?: number;         // defaults to config/Limits.memoryBudgetBytes
}

interface Inspection {
  readonly format: FormatId;
  readonly encoding: { name: "utf-8" | "utf-16le" | "utf-16be" | "iso-8859-1" | (string & {});
                       confidence: number; bom: boolean };   // detected, never guessed silently
  readonly confidence: number;                          // 0..1
  readonly alternatives: readonly { format: FormatId; confidence: number }[];
  readonly columns: readonly ColumnInfo[];
  readonly endpoints: { resolvedFrom: "declared" | "source/target" | "src/dst" | "from/to" | "none" };
  readonly plan: ImportPlan;                            // the PROPOSED mapping; edit and return it
  readonly estimate: { nodes: number; edges: number; exact: boolean; basis: string };
  readonly sample: { nodes: readonly NodeRecord[]; edges: readonly EdgeRecord[] };
  readonly issues: readonly ImportIssue[];
  readonly quality: number;                             // 0..100
}

interface ColumnInfo {
  name: string; inferredType: AttributeType; completeness: number;
  uniqueCount?: number; min?: number; max?: number;
  sampleValues: readonly unknown[];
  suggestedRole: ColumnRole;
}
type ColumnRole = "nodeId" | "source" | "target" | "weight" | "time" | "label"
                | "attribute" | "ignore";
type AttributeType = "string" | "number" | "integer" | "boolean" | "time" | "category" | "mixed";

interface ImportPlan {
  nodeId: string; edgeSource: string; edgeTarget: string;
  directed: boolean | "detect";
  roles: { weight?: string; time?: string; label?: string };
  columns: Record<string, { include: boolean; type: AttributeType; rename?: string }>;
  policies: {
    repeatedEdges: "keep-all" | "keep-first" | "sum-weights" | "drop";
    unknownEndpoints: "report" | "create" | "drop";
    selfLoops: "keep" | "drop";
  };
  identifierMapper?: string;                            // a registered mapper, section 4.14
}

interface ImportIssue {
  severity: "error" | "warning" | "info";
  code: string; message: string;
  line?: number; column?: string; count: number;
  fix?: { label: string; command: Command };            // Auto-fix is an undoable Command
}

interface ImportReport {
  readonly counts: { nodes: number; edges: number; selfLoops: number;
                     repeatedEdges: number; isolatedNodes: number; unresolvedEndpoints: number };
  readonly issues: readonly ImportIssue[];
  readonly quality: number;
  readonly appliedPlan: ImportPlan;
  readonly partial: boolean;
  readonly mutation: MutationReceipt;                   // undoable
}
```

`import()` streams: it reports progress by node count, yields to the render loop between
chunks, honours `signal`, and the graph is interactive with the loaded prefix. The whole import
is one journal entry with one inverse. **Breaking: edges whose endpoints do not resolve are
reported, not buffered in silence** -- today they are buffered silently and nothing says so.

Format detection lives here, not in the consumer. `graphty/src/components/Graphty.tsx:150-225`
reimplements `graphty-element/src/data/format-detection.ts` because the latter is not exported,
and the two have already drifted (the app defaults unknown XML to GraphML; the element resolves
`.xml` by content).

**Sample datasets.** `data.samples()` returns built-in graphs with precomputed basic metrics, a
description, a license and a source credit, each loadable in under a second. Every consumer
needs a first graph to show; today the only sample lives in the app
(`graphty/src/data/sampleGraphs.ts`), which is exactly the misplacement Principle 1 forbids.

```ts
interface SampleDatasetDescriptor {
  id: SampleDatasetId; plainName: string; technicalName: string;
  description: string; nodes: number; edges: number; directed: boolean;
  license: string; source: string; tags: readonly string[];
}
type SampleDatasetId = "karate" | "les-miserables" | "football" | "dolphins"
                     | "power-grid" | "cat-social" | (string & {});
```

#### 4.3.3 Mutation, and inverses that serialise

```ts
type Mutation =
  | { kind: "add-nodes"; rows: readonly NodeRecord[] }
  | { kind: "add-edges"; rows: readonly EdgeRecord[] }
  | { kind: "set-attributes"; scope: Scope; values: Record<string, unknown>;
      target: "node" | "edge" }
  | { kind: "remove-nodes"; nodes: readonly NodeId[] }        // removes incident edges
  | { kind: "remove-edges"; edges: readonly EdgeId[] }
  | { kind: "merge-nodes"; groups: readonly (readonly NodeId[])[]; into?: "first" | NodeId;
      policy?: MergePolicy }
  | { kind: "add-column"; name: string; formula: string }
  | { kind: "drop-column"; name: string }
  | { kind: "rename-column"; from: string; to: string }
  | { kind: "clear" };

interface MergePolicy {
  attributes: "keep-first" | "keep-last" | "concatenate" | "sum";
  edges: "keep-all" | "keep-first" | "sum-weights" | "remove-duplicates";
  dropSelfLoops: boolean;
}

interface MutationReceipt {
  readonly id: JournalId;
  readonly at: string;                          // ISO 8601
  readonly mutation: Mutation;
  readonly inverse: Command;                    // a Command, not a closure
  readonly affected: { nodes: number; edges: number; attributes: number };
  readonly retargeted: readonly (readonly [NodeId, NodeId])[];   // merge survivor map
  readonly summary: string;                     // one line, ready to render
}

interface DataApi {
  apply(m: Mutation): Promise<MutationReceipt>;
  expand(seeds: readonly NodeId[], o?: ExpandOptions): Promise<ExpansionReceipt>;
  collapse(expansionId: string): Promise<MutationReceipt>;
  compute(name: string, formula: string, target?: "node" | "edge"): Promise<MutationReceipt>;
}
```

**The inverse is a `Command`, not an `undo()` closure.** A closure cannot be exported, replayed
on another dataset, put in a recipe, or shown in a "Copy as command" menu. Under this rule,
undo is `session.run(receipt.inverse)`, and it is itself journalled. **The element owns
inverses; the consumer owns the undo stack** -- the depth, the redo-clearing rule, the keyboard
binding and the two filtered views are product policy. That division holds for every undoable
category, not only for data: the per-op inverse table is in 4.11.2, and the universal door is
`session.journal.get(run.journalId).inverse`. The coalescing hint that makes a
fifty-deep stack survive a dragged slider is not product policy and is the element's
(section 4.12).

Preview is `session.plan({op: "data.apply", mutation})`, whose `effect` is the `mutate` shape:
the node and edge counts a merge would produce, the group count of a batch merge, the per-type
counts of an expansion. One flag covers every preview, so there is no `previewMerge`,
`previewExpansion` or `previewAutoFix` to discover and remember.

**Expansion is a first-class verb.** Growing a graph outward from a few interesting nodes --
show me what this account touched, then what those touched -- is among the most common things
anyone does with a graph, and every consumer would otherwise write the traversal itself:

```ts
interface ExpandOptions {
  depth?: 1 | 2 | 3 | 4 | 5;
  direction?: "in" | "out" | "all";
  nodeTypes?: readonly string[];
  edgeTypes?: readonly string[];
  limit?: number;                    // hard stop; defaults to config.expansionBlock (2000)
  signal?: AbortSignal;
}
interface ExpansionReceipt extends MutationReceipt {
  readonly expansionId: string;      // pass to collapse()
  readonly byType: Record<string, number>;
  readonly truncated: boolean;
}
```

Every expanded element records its `expansionId` as provenance, so `collapse()` is selective
and the expansion history is a stack. `plan()` on the same command returns per-type counts
("process (11,900), user (80)") from a traversal bounded at `limit + 1`, which is what makes the
warn-above-500 and block-above-2,000 rules the consumer's to render rather than to compute.

#### 4.3.4 The computed-attribute formula language

People need to derive new numbers from the ones they already have -- a ratio of two
attributes, a centrality divided by degree, a value compared against the neighbourhood average
-- and then filter, colour and export by the result as if it had been in the file. The grammar
is written out in full here, because an undefined grammar is an unimplementable one.

```
formula    := expr
expr       := term (("+" | "-") term)*
term       := factor (("*" | "/" | "%") factor)*
factor     := unary (("^") unary)*
unary      := ("-" | "!")? primary
primary    := number | string | "true" | "false" | ref | call | "(" expr ")"
ref        := "[" name ("." side)? "]"          // side is "A" or "B" in Compare
call       := fname "(" (expr ("," expr)*)? ")"
compare    := expr (("==" | "!=" | "<" | "<=" | ">" | ">=") expr)?
logical    := compare (("&&" | "||") compare)*
```

Function set, closed and enumerable from `catalog.functions`:
`min max abs sqrt log log10 exp round floor ceil pow clamp`;
`if(condition, a, b)`; `normalize(x)` (min-max over the current scope);
`percentile(x)`; `rank(x)`;
and the neighbour aggregates `neighborSum(x)`, `neighborAvg(x)`, `neighborCount()`,
`neighborMin(x)`, `neighborMax(x)`, `neighborStddev(x)`, each taking an optional second
argument `"in" | "out" | "all"`.

`[name]` resolves first to `data.<name>`, then to the result field whose technical name
matches, and in that order. A parse failure is `E_BAD_FORMULA` with a character
offset and the token that failed; an unknown name is `E_UNKNOWN_ATTRIBUTE` with the nearest
three candidates. A computed attribute records its formula and its source attributes, and is
recomputed automatically when any source changes -- which is why it is a mutation with an
inverse rather than a one-shot write.

This is deliberately **not** JMESPath. JMESPath has no arithmetic. The honest statement, which
both docs pages must carry in their first paragraph: **one language selects (JMESPath,
boolean), one language computes (the `[name]` formula grammar, numeric).** Two languages in an
API is a cost; pretending there is one is worse.

#### 4.3.5 Reading the graph

```ts
interface DataApi {
  node(id: NodeId): NodeRecord | undefined;                       // O(1)
  edge(id: EdgeId): EdgeRecord | undefined;                       // O(1)
  statistics(): GraphStatistics;                                  // O(1), maintained
  nodeIds(scope?: Scope): Promise<readonly NodeId[]>;
  edgeIds(scope?: Scope): Promise<readonly EdgeId[]>;
  neighbors(id: NodeId, o?: NeighborOptions): Promise<NeighborPage>;
  /** The synchronous, allocation-free form an interaction needs: neighbour highlighting on
   *  hover cannot await a page of 100. Indices into the session's node order. */
  neighborIndices(id: NodeId, o?: { direction?: "in" | "out" | "both" }): Uint32Array;
  attributes(): readonly AttributeDescriptor[];
  find(query: string, o?: FindOptions): Promise<SearchPage>;
  match(pattern: Pattern | string, o?: MatchOptions): Run<MatchResult>;
  fingerprint(): string;
}

interface GraphStatistics {
  nodeCount: number; edgeCount: number; density: number;
  directedness: "directed" | "undirected" | "mixed" | "unknown";
  weighted: boolean; selfLoopCount: number; repeatedEdgeCount: number;
  degreeRange: [number, number];
  components: { count: number; sizes: readonly number[];        // descending, capped at 1000
                largestSize: number; isolatedCount: number;
                truncatedSizes: boolean;
                componentOf(id: NodeId): number | undefined };
}

interface NeighborOptions {
  direction?: "in" | "out" | "all";
  edgeTypes?: readonly string[];
  sort?: "degree" | "weight" | "recency" | "label";
  limit?: number; offset?: number;                                // paged at 100 by default
}
interface NeighborPage {
  rows: readonly NeighborRow[];
  total: number;
  countsByEdgeType: Record<string, number>;
}
interface NeighborRow {
  node: NodeId; label: string; edge: EdgeId; edgeType: string | null;
  direction: "in" | "out"; weight: number | null;
}

interface FindOptions {
  mode?: "substring" | "exact" | "regex" | "attribute";
  scope?: Scope; limit?: number; attributes?: readonly string[];
}
interface SearchPage {
  hits: readonly { id: NodeId; kind: "node" | "edge"; label: string;
                   field: string; score: number }[];
  total: number; truncated: boolean;
}
```

`components.sizes` is the size distribution, descending, and it is there because without it a
consumer must still walk `componentOf` over every node to answer "are the small parts mostly
single nodes?" -- which is exactly what `graphty/src/components/shell/analysis/graphShape.ts`
does today. It is capped at 1,000 entries with
`truncatedSizes` saying so, because a graph can have a million components and this is an O(1)
maintained struct.

`statistics()` and `neighbors()` are here because the app wrote 353 + 196 lines to compute them
(`graphty/src/components/shell/analysis/graphShape.ts` and `.../elementBridge.ts`), including a
hand-written union-find, and the shell holds a flattened second copy of the entire graph in
React state purely to count things (`graphty/src/components/Graphty.tsx:306-329` materialises
both maps on every call). `graphShape.ts:13-15` states the reason plainly: "graphty-element has
no graph-level directed flag". `directedness` is a real tri-state because on most formats the
element genuinely cannot know.

`find()` is here because finding a node by name or id is the first thing anyone does with a
graph they did not draw themselves, and because a consumer that builds its own index over the
element's nodes is maintaining a second copy of the graph. The index is built at load over id
and label; all-attribute search is opt-in; an exact id match always sorts first.

**Pattern search** is `match()`: find every place in the graph where a given shape occurs -- a
user who signed in to two different hosts, a payment that went out and came back. It takes node
and edge type and attribute constraints, ranks the matches by score, matches approximately down
to a 0.8 similarity, time-boxes itself at 30 seconds and returns what it found, and records the
fraction of the graph it managed to scan so a timed-out hunt is never read as a negative
result.

```ts
interface Pattern {
  nodes: readonly { key: string; where?: Query; type?: string }[];
  edges: readonly { from: string; to: string; where?: Query; type?: string;
                    directed?: boolean; minHops?: number; maxHops?: number }[];
  where?: Query;                       // cross-binding constraints, e.g. host != host2
}
interface MatchOptions extends RunOptions {
  scope?: Scope; limit?: number;
  similarity?: number;                 // 0.8..1.0; 1.0 is exact
  timeBoxMs?: number;                  // default from config.patternTimeBoxMs (30000)
}
interface MatchResult {
  matches: readonly { bindings: Record<string, NodeId>; score: number }[];
  total: number;
  scannedFraction: number;             // 1.0 means the search completed
  partial: boolean;
}
```

`data.match()` also accepts a one-line text form, parsed by the element: `(user)-[logon]->(host)-[logon]->(host2) where host != host2`. `parsePattern(text)` is
exported from `./commands` so a consumer can validate before running.

`./commands` also exports `formatCommand(command, options?): string`, the inverse of the
builders: it renders any `Command` as the JavaScript line that would produce it
(`g.run("betweenness", { scope: "visible" })`). That is the one primitive behind "Copy as
command", "Export as script" and the console transcript, all three of which must emit *the
same* script text. Without it each consumer writes its own serialiser and the three drift.

#### 4.3.6 Export

```ts
interface DataApi {
  export(format: FormatId, o?: ExportOptions): Promise<ExportResult>;
  exportStream(format: FormatId, o?: ExportOptions): ReadableStream<Uint8Array>;
}

interface ExportOptions extends RunOptions {
  scope?: Scope;                                   // default "visible"
  include?: { positions?: boolean; results?: readonly RunId[] | "all";
              columns?: readonly string[]; notes?: boolean };
  precision?: number;                              // decimal places, default 6
  bom?: boolean;
}
interface ExportResult {
  readonly blob: Blob;
  stream(): ReadableStream<Uint8Array>;
  readonly manifest: readonly RunRecord[];         // what produced the columns
  readonly loss: readonly LossNote[];
  readonly bytes: number;
}
interface LossNote { code: string; message: string; count: number }
```

Streaming is the primitive and `blob` is the convenience; export never returns one string.
Every export carries a run manifest, because a result without its parameters is not evidence.
There is **no export path at all** in the element today: `graphty-element/src/data/` holds seven
importers and zero exporters, while `@graphty/graph-io` exports eight exporters and
`exportGraph`. **Breaking: export exists, and it goes through the format registry** -- which is also
how a third party adds a format.

#### 4.3.7 Worked example: inspect, correct the mapping, import, then look at a node

```js
const g = document.querySelector("graphty-element");
const file = input.files[0];

const look = await g.session.data.inspect(file);
console.log(look.format, look.confidence, look.endpoints.resolvedFrom);
// "csv" 0.94 "none"  -> the element could not guess; fix the plan and hand it back

const plan = { ...look.plan, edgeSource: "from_account", edgeTarget: "to_account",
               roles: { ...look.plan.roles, weight: "amount", time: "ts" } };

const report = await g.session.data.import(file, plan, {
  onProgress: (p) => bar.set(p.fraction),
  signal: AbortSignal.timeout(60_000),
});
if (report.issues.some((i) => i.severity === "error")) { show(report.issues); }

const n = g.get("acct:17");
const around = await g.session.data.neighbors("acct:17",
  { direction: "in", sort: "weight", limit: 100 });
console.log(n.data.display_name, around.total, around.countsByEdgeType);
```

---

### 4.4 Runs and results

#### 4.4.1 A run is an object with an identity

```ts
type RunStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";
type CostClass = CostEstimate["costClass"];

interface Run<T = RunResult> extends PromiseLike<T> {
  readonly id: RunId;                    // stable, selector-safe, author-assignable
  readonly label: string;                // "Groups", then "Groups (resolution 1.2)"
  readonly command: Readonly<Command>;
  readonly algorithm: AlgorithmKey;
  readonly params: Readonly<Record<string, unknown>>;
  readonly scope: ResolvedScope;
  readonly status: RunStatus;
  readonly progress: Progress;
  readonly determinate: boolean;
  readonly cancellable: boolean;         // distinct from "has been canceled"
  readonly queuePosition: number | null; // "Queued (2 of 3)" -> 1
  readonly startedAt: string | null;
  readonly durationMs: number | null;
  readonly partial: boolean;             // time-boxed and stopped early; NOT a failure
  readonly stale: StaleNote | null;
  readonly engine: { element: string; algorithms: string; layout: string };
  readonly fields: readonly FieldDescriptor[];
  readonly shape: ResultShape;
  readonly caveats: Caveats;
  readonly result?: T;
  readonly error?: GraphtyError;
  readonly record: RunRecord;            // frozen, structured-cloneable snapshot
  readonly journalId: JournalId | null;  // the entry this command wrote; null until it lands
  cancel(reason?: string): void;
  rerun(): Run<T>;                       // SAME id; every bound layer survives
  suggestEncodings(): readonly EncodingSpec[];
}

interface Progress {
  readonly phase: string;
  readonly determinate: boolean;
  readonly completed: number;
  readonly total: number | null;
  readonly fraction: number | null;      // null when indeterminate. Never fabricate a percentage.
  readonly etaMs: number | null;
  readonly message?: string;
}

interface StaleNote { ranOn: number; nowVisible: number; scopeSpec: Scope }

interface Caveats {
  exact: boolean; sampleSize?: number; seed?: number | null;
  converged?: boolean; iterations?: number;
  componentScope?: "all" | "largest";
  filterScope?: boolean; windowScope?: boolean;
  direction: "directed" | "undirected" | "as-loaded";
  weight?: { attribute: string; meaning: "distance" | "strength" } | null;
  precision: "f32" | "f64";              // the arithmetic that produced these numbers
  method: string; partialReason?: string; notes: readonly string[];
}
```

**`precision` says which arithmetic produced the numbers, and it lives on the run.** A run on an
accelerator that computes in single precision reports `"f32"`; a run on the CPU path reports
`"f64"`. It belongs to the result, next to `exact`, `converged` and `method`, because two runs of
the same algorithm on the same graph can differ in it -- so a graph-level bag of facts could not
answer "why does this number disagree with the one I had a minute ago" for the run in front of
you, and a consumer comparing a value against a saved one, or ranking two nodes whose scores are
within a rounding error, reads it from the same object that carries the value.

**Breaking: `runAlgorithm(namespace, type, options?): Promise<void>` is replaced by
`runs.start(): Run`.** Today the result is unreachable from the call
(`graphty-element/src/Graph.ts:1207`): a consumer must walk `node.algorithmResults` or reach
`graph.getDataManager().graphResults` through an escape hatch. There is no progress, no
`AbortSignal` and no cancellation on it, and an analysis that cannot be watched or stopped is
unusable on a graph big enough to be interesting.

**`Run` is a `PromiseLike`, not a `Promise` subclass**, and the element attaches a no-op
rejection handler internally. So `g.run("betweenness")` fired from a click handler and never
awaited cannot produce an unhandled rejection, while `await g.run("betweenness")` still throws.
An element driven by clicks, a console and an agent is fire-and-forget most of the time; this
makes that safe. Cancellation rejects with a `DOMException` named `AbortError`, which is what
every consumer already knows how to test; `AbortSignal.timeout()` gives `TimeoutError`, so a
timeout is distinguishable from a user cancel. A time-boxed run that hits its box **resolves**
with `partial: true` and `caveats.partialReason` -- a stopped-early result is data, not a
failure.

#### 4.4.2 Starting, addressing, removing

```ts
interface StartOptions extends RunOptions {
  scope?: Scope; seed?: number; timeBoxMs?: number;
  as?: RunId;                    // author-assigned id; REQUIRED for anything persisted
  style?: boolean;               // opt out of the auto-applied derived layer
  exact?: boolean;               // refuse to approximate; above the cap this throws
  sample?: number;               // sample size for an approximable algorithm
}

interface RunsApi {
  start(algorithm: AlgorithmKey, params?: Record<string, unknown>, o?: StartOptions): Run;
  batch(specs: readonly RunSpec[], o?: { label?: string } & RunOptions): Run<BatchResult>;
  get(id: RunId): Run | undefined;
  list(): readonly Run[];
  remove(id: RunId): { removedLayers: number; layerIds: readonly LayerId[] };
  bindings(id: RunId): readonly LayerId[];      // run-to-layer is many-to-many
  readonly queue: readonly { runId: RunId; index: number; of: number }[];
}
```

**What an ungated `run()` does on a graph that is too big.** A stranger's first line is
`g.run("betweenness")` with nothing in front of it, on whatever graph they happened to load, so
this behaviour has to be defined rather than left to luck. The failure it prevents is on
record: the one consumer's cost model was wrong by 6.9x at n = 200,000, so a 70,000-node graph
was estimated at 2.10 s, the button showed no confirmation, and the frame then locked for 10.4 s
(`graphty/src/components/shell/analysis/metricCost.ts`, its own history at :120-148). The
default policy, in order:

1. The element estimates before it starts (`estimate()` is O(1), 4.2.1).
2. If the estimate is at or below `config.exactComputationCap`, it runs exactly.
3. Above the cap, if the algorithm declares an approximate method
   (`AlgorithmDescriptor.approximable`), the element **switches to it**, records
   `caveats.exact = false`, `caveats.sampleSize`, `caveats.seed` and `caveats.method`, and
   says so in `result.reading()`. The run succeeds; the number is honest about what it is.
4. Above the cap with no approximate method, or with `{ exact: true }` set, the run **fails**
   with `E_CAP_EXCEEDED`, whose `details` carry the estimate, the cap, the graph size and the
   scopes that would fit (`"largest-component"`, a smaller filter). "This computation is too
   expensive, and here is how big your graph is" arrives as a code the consumer switches on,
   not as a string it has to invent.
5. `{ sample: k, seed }` asks for the approximate method by name at a chosen size.

`E_TOO_LARGE` is the different case: the graph exceeds a hard structural limit of the
accelerator or of an index (`Limits.memoryBudgetBytes`, the GPU peer's own
`E_TOO_LARGE`), and no scope or sample makes it runnable.

Nothing expensive runs silently, and nothing expensive locks the frame: a run yields to the
render loop between chunks (`AlgorithmContext.yieldNow`, 4.14.1) whatever its size.

**Run identity.** An id is either author-assigned via `as:` or derived deterministically from
`(algorithmKey, canonical params, scope digest)` -- never from an execution counter. An
auto-numbered slot such as `louvain_2` would mean a saved recipe, layer or template resolves
differently depending on the order runs happened to execute, and making ids deterministic
afterwards is a behavioural break in anything that was persisted. A run id is documented as
opaque but stable, matches `/^[a-z][a-z0-9_-]*$/`, and `as:` is **required** the moment an
artifact naming it is persisted: the element refuses to serialise a document that references a
derived id, with `E_UNSTABLE_RUN_ID`.

Starting the same triple twice returns the existing `Run` and re-executes it in place if the
data changed under it. That is exactly what "re-run from a layer" needs, and it means a layer
binding never dangles after a re-run.

**Two delete verbs, because "remove the picture" and "remove the result" are different
requests.** `styles.remove(layerId)`
deletes the picture and keeps the run. `runs.remove(runId)` deletes the run and every layer
reading it, returning the count and the ids so the consumer can say "Removes 1 style layer"
**before** confirming. `runs.bindings(id)` enumerates the edges, so a layer that reads two runs
survives the removal of one.

**Breaking: the result path changes from `algorithmResults.<ns>.<type>.<field>` to
`results.<runId>.<field>`.** The old path is the named defect: it carries no parameters, so MCL
at granularity 2.5 and MCL at 3.0 are the same path and a style layer cannot say which one it
draws. Nobody types a run id by hand: `session.results.path(run, "value")` returns the string,
and every encoding helper takes a `Run`.

```ts
interface ResultsApi {
  path(run: Run | RunResult | RunId, field?: string): Path;   // "results.<runId>.<field>"
  get(run: Run | RunResult | RunId): RunResult | undefined;
  has(run: Run | RunResult | RunId, field?: string): boolean;
  readonly roots: readonly { runId: RunId; label: string;
                             fields: readonly FieldDescriptor[] }[];
}
```

`results.roots` is what an expression editor's autocomplete reads, and it is why an unknown
`results.*` path can be reported with the nearest candidates rather than matching nothing
(4.15.2). `field` defaults to the shape's primary field, so `results.path(run)` is the common
call.

**A path going into an expression is quoted first, and the element publishes the quoting.** A
run id carries its algorithm's name and ten of the twenty-four catalogue algorithms are
hyphenated -- `shortest-path`, `min-cut`, `bipartite-matching` -- while the selector grammar
reads a bare hyphen as subtraction. So `` `${results.path(run)} >= \`3\`` `` is not a comparison
at all on those runs: it parses as one column minus another and the layer is refused outright.
`quotePath`, exported from `./session` alongside `resultPath`, writes any segment that is not a
bare identifier as a quoted name, and is what every expression built outside the element goes
through:

```ts
import { quotePath, resultPath } from "@graphty/graphty-element/session";

selector: { match: "expression", where: `${quotePath(resultPath(run.id, "value"))} >= \`3\`` }
```

It applies to attribute paths on the same terms -- `data.node-type` is refused for the same
reason -- so it is published as a path-to-expression conversion rather than as a result helper.
The selector `encode()` writes for itself needs none of this: it takes the `path` form, where a
hyphen is just a character.

`run.label` is computed by the element, not the consumer: the algorithm's plain name alone while
it is the only run of that algorithm, gaining the differing parameter in parentheses the moment
a sibling exists. One string, computed once, used by the layer row, the legend, the journal row
and every export.

#### 4.4.3 Result shapes: ten, declared

```ts
type ResultShape =
  | "node-metric"       // a value per node              -> encoding layer
  | "edge-metric"       // a value per edge              -> encoding layer
  | "community"         // a group per node              -> encoding layer
  | "layered-grouping"  // a level per node              -> encoding layer
  | "category-table"    // a category + score per node   -> encoding layer + a table
  | "path"              // an ordered node set           -> highlight layer (exclusive)
  | "node-set"          // a node set                    -> highlight layer (exclusive)
  | "edge-set"          // an edge set                   -> highlight layer (exclusive)
  | "pair-list"         // scored pairs                  -> no layer
  | "temporal"          // per-step series               -> no layer
  | "fact";             // scalars and tables            -> no layer
```

Ten, rather than a shorter list, because each shape declares its required fields and its
primary action, and folding two shapes together discards declared behaviour to save an enum
member. Two folds are safe and are taken: an anomaly score is a `node-metric`, and a set of
scenarios is a batch of `node-set`s. A removal-impact result is a `node-set` carrying a
per-scenario `graph` table, which is what keeps that fold from losing the per-scenario
numbers.

**Uniform field names per shape.** A result path is guessable without opening the catalogue,
for every algorithm, forever.

| shape | per-element fields | graph fields |
|---|---|---|
| `node-metric` / `edge-metric` | `value`, `rank`, `percentile` | `min`, `max`, `median`, `mean`, `measured`, `normalization`, `tiedAtMin` |
| `community` | `group`, `groupSize` | `groupCount`, `modularity`, `sizes` |
| `layered-grouping` | `level`, `levelSize` | `levelCount`, `sizes` |
| `category-table` | `category`, `score`, `rank` | `categories` (a table) |
| `path` | `onPath`, `order` | `length`, `cost`, `hops` |
| `node-set` / `edge-set` | `in` | `count` plus one headline scalar |
| `pair-list` | -- | `pairs` |
| `temporal` | -- | `steps`, `series`, `rates`, `changeThreshold` (a `TemporalResult`, 4.5.3) |
| `fact` | -- | the declared scalars |

**Breaking: betweenness and closeness publish graph-level `min`/`max` like every other
centrality.** They publish none today, which is the defect
`graphty/src/components/shell/analysis/nodeMetrics.ts:52-58` works around by scanning the data
manager. Uniform fields are a lie unless every algorithm fills them.

#### 4.4.4 Reading a result

```ts
interface RunResult {
  readonly runId: RunId;
  readonly shape: ResultShape;
  readonly fields: readonly FieldDescriptor[];
  readonly measured: { nodes: number; edges: number };
  readonly graph: Readonly<Record<string, unknown>>;      // modularity, groupCount, maxFlow...
  node(id: NodeId): Readonly<Record<string, unknown>> | undefined;
  edge(id: EdgeId): Readonly<Record<string, unknown>> | undefined;
  column(field: string): NumericColumnView;
  ranking(field: string, limit?: number):
    readonly { id: NodeId; value: number; rank: number; percentile: number }[];
  histogram(field: string, o?: { bins?: number; scale?: "linear" | "log" }):
    readonly { from: number; to: number; count: number }[];
  summary(): ResultSummary;
  reading(o?: { locale?: string; audience?: "plain" | "technical" }): string;
}

interface NumericColumnView {
  readonly length: number;
  get(i: number): number;
  readonly min: number; readonly max: number; readonly mean: number; readonly median: number;
}

interface ResultSummary {
  count: number; measured: number;
  min: number | null; max: number | null; median: number | null; mean: number | null;
  tiedAtMin: number; normalization: "max" | "min-max" | "none";
  top: readonly { id: NodeId; label: string; value: number; rank: number; percentile: number }[];
  groups?: readonly { group: string | number; size: number }[];
  caveats: Caveats; durationMs: number;
}

interface FieldDescriptor {
  name: string; plainName: string; technicalName: string;
  kind: "node" | "edge" | "graph";
  type: "number" | "integer" | "boolean" | "string" | "table";
  unit?: string; normalization?: string; path: Path;
}
```

`ranking`, `histogram`, `column` and `summary` on one object are what delete
`graphty/src/components/shell/analysis/nodeMetrics.ts` -- 923 lines including
`rankingFromDegreeResults`, `metricDistribution`, `linearBandPlan`, `logBandPlan` and
`METRIC_DISTRIBUTION_MAX_BINS = 20`. `summary()` is the bounded, token-cheap form a result card
reads, an AI tool returns and the reading generator consumes. The rule behind it: a tool result
is a summary, never a list with one entry per node.

**`reading()` is the plain-language generator**: one sentence saying what a result means, in
words. Two rules keep it honest. Readings are generated from result statistics by templates,
never by a language model, and a template never asserts a structural outcome it has not
computed or schedules a computation above O(n+m) to fill in a clause. It
belongs in the element by Principle 1 -- every consumer needs the sentence and it depends on
statistics only the element has -- and it is the single best documentation feature the API can
have, because it makes a result self-explaining to a stranger. Each result shape declares the
statistics its reading needs; banding is data in `catalog.readings` so a consumer can override
the bands without rewriting the sentence, and the locale is a parameter.

#### 4.4.5 Auto-apply: one policy, every route

On a run's **first** completion the element applies the derived encoding layer, never again;
suppressed when a user-authored layer already drives that channel; once per batch, so six runs
never paint six times. `{ style: false }` opts out.

**An explicit `encode()` replaces the derived layer for the same `(runId, channel)` pair**, it
does not stack on it, and it returns that layer's id. This is the case the suppression rule
cannot catch, because the stranger's `encode()` call comes *after* the run completed and
therefore after auto-apply already fired: without the replacement rule the quickstart in 2.1
would produce two layers and two legend blocks on `node.color`. The derived layer carries
`source.by === "element"` with `reason: "default"` and is marked replaceable; the first
`styles.encode()` naming the same run and the same channel takes it over, keeps its position in
the stack, and sets `source.by = "user"`. Any other write to the channel is an ordinary
additional layer. It lives in the element because the rule
"one capability must not produce two pictures depending on which route the user took" is only
enforceable where all routes converge, and that is the session: the Insights card, the panel
Run, the palette, the console, an AI tool call and the attribute-list route all become one
call.

**Highlight layers are exclusive**: a second `path`, `node-set` or `edge-set` result replaces
the first, enforced by the session because `run.shape` says which layers are highlights.

#### 4.4.6 Worked example: a sweep with a cost gate, a queue and a cancel

```js
const s = document.querySelector("graphty-element").session;

const wanted = ["degree", "betweenness", "closeness", "pagerank"];
const affordable = wanted.filter((a) => {
  const e = s.estimate({ op: "algo.run", algorithm: a, scope: "largest-component" });
  return e.available && e.seconds < 10;           // synchronous: this gates the button
});

const sweep = s.runs.batch(affordable.map((a) => ({ algorithm: a, as: a,
                                                    scope: "largest-component" })),
                           { label: "Node rankings",
                             onProgress: (p) => bar.set(p.fraction) });
cancelButton.onclick = () => sweep.cancel("user");   // completed members are KEPT

const result = await sweep;
for (const run of s.runs.list()) {
  console.log(run.label, run.result.summary().top.slice(0, 3), run.result.reading());
}
```

---

### 4.5 Scope, selection, visibility

#### 4.5.1 Scope is a parameter, and a noun only when saved

```ts
type Scope =
  | "visible"                                   // the default for every run, layout and export
  | "graph"
  | "selection"
  | "largest-component"
  | { set: ScopeId }                            // a saved set
  | { where: Query }                            // a predicate
  | { nodes: readonly NodeId[] };

interface ResolvedScope {
  readonly nodes: ReadonlySet<NodeId>;
  readonly edges: ReadonlySet<EdgeId>;
  readonly nodeCount: number; readonly edgeCount: number;
  readonly digest: string;                      // equal digests mean equal scopes
  readonly spec: Scope;
  readonly resolvedAt: string;
}

interface ScopeApi {
  resolve(spec: Scope): Promise<ResolvedScope>;
  count(spec: Scope, o?: { approximate?: boolean; sample?: number }):
    Promise<{ nodes: number; edges: number; exact: boolean; sampled?: number }>;
  save(name: string, spec: Scope): ScopeId;
  list(): readonly { id: ScopeId; name: string; spec: Scope; bound: boolean }[];
  remove(id: ScopeId): void;
}
```

One sentence the docs must carry: **"visible" means the data scope -- filters and the time
window -- never the render set**, which above the render ceiling is smaller. The distinction is
in the types: `session.visibility.nodes` is the data scope; `view.rendered.nodes` is the render
set. "Analyze runs on the visible graph" must not silently mean "the 50,000 nodes we happened
to draw".

`run.stale` is **derived**, not tracked: the element compares the run's recorded
`scope.digest` against the current resolution of the same spec. That is what makes "Scope
changed: computed on 200 of 200, now showing 120" possible with the consumer tracking nothing.

#### 4.5.2 Selection: two sets, five verbs, one owner

```ts
type SetOp = "replace" | "add" | "remove" | "toggle" | "intersect";

type SelectionTarget =
  | { nodes?: readonly NodeId[]; edges?: readonly EdgeId[] }
  | { where: Query }
  | { text: string; mode?: FindOptions["mode"] }
  | { ids: readonly string[] }                              // paste a list
  | { scope: Scope }
  | { neighborsOf?: readonly NodeId[]; depth?: 1 | 2 | 3; direction?: "in" | "out" | "all" }
  | { top: { run: Run | RunResult | RunId; field: string; n: number } }
  | { above: { run: Run | RunResult | RunId; field: string; threshold: number } }
  | { edgesBetween: true }
  | { invert: true };

interface SelectionApi {
  /** Frozen and IDENTITY-STABLE: the same array object until the contents change, so
   *  `prev === next` is a valid staleness test and a read costs nothing. Materialised lazily
   *  from the mask below; a consumer that only needs membership should not touch it. */
  readonly nodes: readonly NodeId[];
  readonly edges: readonly EdgeId[];
  readonly size: number;
  readonly cap: number;                                     // config.selectionCap, default 5000
  readonly truncated: boolean;
  /** The backing representation: O(1) membership, transferable, no allocation per test. */
  has(id: NodeId | EdgeId): boolean;
  nodeMask(): Uint8Array;
  edgeMask(): Uint8Array;
  apply(target: SelectionTarget, op?: SetOp): Promise<SelectionDelta>;
  clear(): SelectionDelta;
  promote(name: string): ScopeId;                           // ephemeral set -> saved Scope
  statistics(): Promise<SelectionStatistics>;
}

interface SelectionDelta {
  readonly added: readonly NodeId[]; readonly removed: readonly NodeId[];
  readonly nodes: number; readonly edges: number;
  readonly truncated: boolean;
  readonly unmatched?: readonly string[];                   // from { ids: [...] }
  readonly unresolvedPaths: readonly Path[];                // see 4.5.4 and 4.15.2
  readonly cause: "user" | "api" | "command";
}

interface SelectionStatistics {
  nodes: number; edges: number; inducedEdges: number; cutEdges: number;
  attributes: readonly { path: Path; plainName: string;
                         mean?: number; median?: number; min?: number; max?: number;
                         distribution?: readonly { value: string; count: number }[];
                         graphMean?: number; direction?: "above" | "below" | "equal" }[];
}
```

Gesture semantics are the element's: click replaces, Shift adds, Cmd/Ctrl toggles, Alt removes,
Shift+Alt intersects, Shift+drag marquee (in 3D too, in screen space), Cmd/Ctrl+A selects all
visible, Escape clears, click on empty clears. They emit `graphty-selection-change` with
`cause: "user"`. **Breaking: selection becomes two sets with set algebra.** Today
`SelectionManager` holds `private selectedNode: Node | null` (`graphty-element/src/managers/SelectionManager.ts:46`):
one node, nodes only.

One selection per session. Every view, the data table, the inspector and a headset read and
write the same set. None of that is expressible if selection lives on a view.

#### 4.5.3 Visibility: one mask, three producers

Hiding everything except what you are looking at, without destroying the data, is the single
most frequently needed capability in the product. It does not exist in the element at all.

```ts
interface VisibilityApi {
  /** The mask IS the visibility model: one byte per element, O(1) to test, transferable to a
   *  worker, and bounded at the node count however many elements are visible. Hiding 40,000 of
   *  50,000 nodes writes 50,000 bytes and re-layouts nothing. */
  nodeMask(): Uint8Array;
  edgeMask(): Uint8Array;
  isVisible(id: NodeId | EdgeId): boolean;
  /** Lazy materialisations of the masks, for a consumer that wants to iterate ids. Frozen and
   *  identity-stable; not the boundary type, because a set of every visible id is unbounded. */
  readonly nodes: ReadonlySet<NodeId>;
  readonly edges: ReadonlySet<EdgeId>;
  readonly summary: { visibleNodes: number; totalNodes: number;
                      visibleEdges: number; totalEdges: number };
  readonly filter: Filter | null;
  readonly window: TimeWindow | null;
  set(filter: Filter | null, o?: RunOptions): Run<FilterResult>;
  setWindow(w: TimeWindow | null, o?: RunOptions): Run<FilterResult>;
  showContext: boolean;                          // low-alpha point layer for hidden nodes
}

type Filter =
  | { kind: "expression"; where: Query }
  | { kind: "range"; attribute: Path; min?: number; max?: number }
  | { kind: "categories"; attribute: Path; values: readonly string[] }
  | { kind: "degree"; min?: number; max?: number; direction?: "in" | "out" | "all" }
  | { kind: "component"; id: number }
  | { kind: "neighborhood"; seeds: readonly NodeId[]; depth: number }
  | { kind: "edges"; where: Query }               // filter edges independently of nodes
  | { kind: "all"; of: readonly Filter[] }
  | { kind: "any"; of: readonly Filter[] }
  | { kind: "not"; of: Filter };

interface TimeWindow {
  attribute: Path;
  from: number | string; to: number | string;
  step?: number | "hour" | "day" | "week" | "month" | "quarter" | "year";
}
```

Applying a filter is a `Run`: cancellable, with progress ("Applying filter... 40%"), and
`graphty-visibility-change` carries "showing X of Y". **Filters never re-layout**, because
visibility is an id-set mask over the session and positions are separate session state. The time
window is the same mask with a different producer, which is why "moving the time window never
re-layouts, rebuilds or removes data" is a structural fact here rather than a promise.

**Temporal depth.** Watching a network change over time needs three things beyond the mask:

```ts
interface VisibilityApi {
  steps(w: TimeWindow, o?: RunOptions & { track?: readonly AlgorithmKey[] }):
    Run<TemporalResult>;                                                   // precomputed
  playback: { play(o?: { speed?: 0.5 | 1 | 2 | 4 }): void; pause(): void;
              step(n?: number): void; readonly index: number; readonly count: number };
}
interface TimeStepSummary {
  from: number | string; to: number | string;
  nodes: number; edges: number; density: number; averageDegree: number;
  byType: Record<string, number>;
  top: readonly { id: NodeId; label: string; degree: number }[];
  largestPartShare: number;
  tracked: Readonly<Record<AlgorithmKey, number>>;   // one scalar per tracked algorithm
  arrivals: number; departures: number;              // nodes, against the previous step
  created: number; dissolved: number;                // edges, against the previous step
}
interface TemporalSeries {                           // one per tracked quantity
  field: string; plainName: string;
  values: readonly (number | null)[];                // one per step, aligned to steps[]
  trend: { direction: "rising" | "falling" | "flat"; slope: number; r2: number };
  changes: readonly { index: number; from: number; to: number; fraction: number }[];
}
interface TemporalResult {                           // the `temporal` result shape (4.4.3)
  steps: readonly TimeStepSummary[];
  series: readonly TemporalSeries[];
  rates: { arrivalsPerStep: number; departuresPerStep: number;
           creationsPerStep: number; dissolutionsPerStep: number };
  changeThreshold: number;                           // config.temporalChangeThreshold, 0.2
}
```

`steps()` is the **producer** of the `temporal` result shape, and it is the analysis half of
the temporal capability rather than only the navigation half: `track` names the metrics to
compute per window (modularity from `louvain`, an average centrality, a component count from
`components`), each arriving as a `TemporalSeries` with its trend direction and an R-squared,
and with every step whose value moved by more than `changeThreshold` listed in `changes`. A
tracked
`steps()` is internally `runs.batch` over the window list -- one cancellable unit, one queue
entry, one progress bar -- so its cost class is the tracked estimate times the window count and
`estimate()` answers for it before the click.

`steps()` is a background `Run` with determinate progress ("Preparing 26 time steps... 12 of
26"), so scrubbing is instant. Playback advances only when the previous step has rendered.
Time-attribute detection is the element's: `data.attributes()` marks an attribute
`type: "time"` and `catalog.timeAttributes()` lists the candidates in confidence order. A
windowed run's cost class is the tracked-metric estimate times the window count, and the windows
go through the queue as one cancellable unit -- which is just `runs.batch`.

#### 4.5.4 Worked example: filter, count first, then select the survivors

```js
const s = el.session;

const f = { kind: "all", of: [
  { kind: "categories", attribute: "data.type", values: ["host", "service"] },
  { kind: "degree", min: 3 },
] };

const preview = await s.plan({ op: "visibility.set", filter: f });
status.textContent = `${preview.effect.nodes} of ${s.status.counts.nodes} would match`;

await s.visibility.set(f, { onProgress: (p) => bar.set(p.fraction) });

// A run id is opaque unless you name it, so name it, then build the path from the Run.
const run = s.runs.start("betweenness", {}, { as: "betweenness" });
await run;
const p = s.results.path(run, "percentile");        // "results.betweenness.percentile"
const delta = await s.selection.apply({ where: `${p} > \`95\`` }, "replace");
if (delta.unresolvedPaths.length) { warn(delta.unresolvedPaths); }   // never a silent zero
console.log(await s.selection.statistics());
```

---

### 4.6 Style layers

#### 4.6.1 The layer

```ts
interface Layer {
  readonly id: LayerId;                 // element-minted, stable. NEVER an array index.
  readonly name: string;
  readonly kind: "base" | "encoding" | "highlight" | "custom";
  readonly source: LayerSource;         // REQUIRED. every layer names its source.
  readonly locked: boolean;             // element-owned layers cannot be removed by a consumer
  readonly enabled: boolean;
  readonly disabledReason?: string;
  readonly target: "node" | "edge";
  readonly selector: Selector;
  readonly set?: StaticStyle;           // literal values
  readonly encode?: Encoding;           // declarative attribute -> channel bindings
  readonly legend?: Legend;             // DERIVED on read, never written
  userData?: Record<string, unknown>;   // a documented consumer bag that round-trips untouched
}

type LayerSource =
  | { by: "element"; reason: "default" | "selection" | "hover" | "notes" }
  | { by: "run"; runId: RunId; algorithm: AlgorithmKey; params: Record<string, unknown> }
  | { by: "user" }
  | { by: "template"; templateId: string }
  | { by: "plugin"; name: string };

type Selector =
  | { match: "expression"; where: Query }    // where must be non-empty; parsed at add time
  | { match: "has"; path: Path }             // the common case, generated by encode()
  | { match: "ids"; nodes?: readonly NodeId[]; edges?: readonly EdgeId[] }
  | { match: "everything" };                 // spelled out, greppable, lintable

interface StylesApi {
  list(): readonly Layer[];                  // index 0 is the BOTTOM. Stated once, everywhere.
  get(id: LayerId): Layer | undefined;
  validate(spec: LayerSpec): ValidationResult;    // SYNCHRONOUS; gates a form
  add(spec: LayerSpec, at?: { above?: LayerId; below?: LayerId }): Run<Layer>;
  update(id: LayerId, patch: Partial<LayerSpec>): Run<Layer>;
  remove(id: LayerId): Run<void>;
  move(id: LayerId, before: LayerId | null): Run<void>;
  removeBySource(pred: (s: LayerSource) => boolean): Run<readonly LayerId[]>;
  encode(spec: EncodingSpec): Run<Layer>;    // the ONE path an analysis layer takes
  highlight(spec: HighlightSpec): Run<Layer>;   // exclusive; replaces the previous highlight
  explain(target: { node: NodeId } | { edge: EdgeId }): StyleExplanation;   // SYNCHRONOUS
  legend(): readonly LegendBlock[];                                         // SYNCHRONOUS
  applyTemplate(doc: StyleDocument): Run<{ applied: readonly LayerId[];
                                           unbound: readonly UnboundLayer[] }>;
  toDocument(): StyleDocument;                                              // SYNCHRONOUS
  resolveToStatic(id: LayerId, channel: Channel): Run<Layer>;  // "convert the rule to a value"
}

interface ValidationResult {
  ok: boolean;
  errors: readonly { code: GraphtyErrorCode; message: string; path?: string;
                     position?: number; candidates?: readonly string[] }[];
  unresolvedPaths: readonly Path[];          // parsed, but nothing in the session answers them
  // No match count here: counting is O(n) and therefore session.plan()'s job (3.5, 4.2.1).
}
```

#### 4.6.1a The cost of a repaint

This subsection is contract, not advice. A design that states a complexity class and no mechanism
is how an accidentally quadratic loop gets built: the current code has three of them, and all
three sit under a sentence very like "a repaint is an O(n) pass".

**The budget.** A single-layer edit on 50,000 nodes completes in **under 16 ms** of main-thread
work -- one frame. This is asserted by a CI benchmark, not by review. The design already writes
CI tests into itself for the event catalogue and for scoped selectors; performance is the one
place it would otherwise assert a cost that nothing checks.

For scale, measured against the dependencies pinned today: the same edit currently costs
0.9-1.6 s of selector evaluation plus 2-6 s of style interning.

**Six rules that make the budget reachable.**

1. **Selectors are compiled once**, at `add` and `update`, into a predicate closure held on the
   layer. They are never re-parsed per element. This requires a JMESPath implementation that
   exposes an AST evaluator; `jmespath@0.16.0` does not -- its `search()` constructs a new
   `Parser`, `Runtime` and `TreeInterpreter` on every call, which measures 1,145-2,050 ns against
   roughly 2 ns for a compiled predicate. Selecting the dependency is part of implementing this
   section, and a `search()`-per-element implementation does not satisfy it.
2. **Only `{match:"expression"}` reaches the evaluator.** `{match:"has"}` is a column presence
   test, `{match:"ids"}` is a set membership test, and `{match:"everything"}` is no test at all.
   This is why `encode()` generates `{match:"has"}` rather than an expression: it is roughly a
   thousandfold cheaper per element, which makes the generated-selector path a performance
   mechanism and not only an ergonomic one.
3. **A run-bound layer iterates the run's measured column, not the node list.** A run that
   measured 300 nodes of 50,000 repaints 300 elements. The column is the iteration source; the
   selector is not consulted for elements the run never measured.
4. **A layer edit repaints a dirty set**, not the graph: the elements the edited layer matches,
   unioned with those the previous version of that layer matched, and only the layers at or above
   the edit in the stack. A layer that matches nothing repaints nothing.
5. **The repaint's internal representation is columnar.** `ResolvedStyle` is a 23-key object and
   materialising one per element costs 46.7 ms at 50,000 nodes, so it is materialised only where
   a caller asks for one element: `styles.explain()` and `ElementView`. The repaint merges
   channel columns.
6. **Style identity is a structural hash, not a scan.** Interning by linear `isEqual` over every
   style ever seen is O(S), and a continuous colour encoding makes S equal to the element count:
   measured at 515 ms for 500 distinct styles and 2.1 s for 1,000. Colour and opacity are
   per-instance GPU state and must not key a source mesh; shape and size may.

**What this costs the API.** Rule 6 is why `ChannelValue` carries a numeric RGBA alongside the
string form for `node.color` and `edge.color`: a repaint that parses a hex string per element is
paying for a conversion the encoding already knows how to produce.

**The write verbs are asynchronous, and that is the law of costs (3.5) applied to styling.**
Making every style mutation validate **and repaint**, and a repaint is an O(n) pass over
the nodes and edges the layer matches -- a command, not a property. So `add`, `update`,
`remove`, `move`, `encode`, `highlight`, `applyTemplate`, `removeBySource` and
`resolveToStatic` return a `Run`, which means they report progress on a large graph, take an
`AbortSignal`, and can be fired and forgotten from a click handler without an unhandled
rejection (4.4.1). Awaiting one gives the `Layer`. The two things a form needs before the
user commits -- "is this spec valid" and "how many would it match" -- are
`styles.validate(spec)`, which is synchronous and writes nothing, and `session.plan()`.
Reading is synchronous throughout: `list`, `get`, `legend`, `explain` and `toDocument` are
maintained structs (4.2.3).

**Breaking: layers are addressed by `LayerId`, not by array index.** `removeLayerByIndex`,
`updateLayerByIndex`, `insertLayer(position)` and `reorderLayers(from, to)` are removed. Index
addressing forced the one consumer to write an index-reconciliation module
(`graphty/src/utils/layerConversion.ts`) and to delete highest-index-first; one off-by-one took
the element's own `default` layer with it and the next load died in mesh building.

**Breaking: layer mutations validate and repaint, or reject.** Today `Styles.addLayer` is two
statements -- `this.#layers.push(layer);` and the comment `// TODO: recalculate`
(`graphty-element/src/Styles.ts:130-133`) -- and the `style-changed` handler that is supposed to
compensate diverges from the correct path in three load-bearing ways
(`graphty-element/src/Graph.ts:382-400` versus `src/managers/DataManager.ts:85-101`): it calls
`getStyleForNode(n.data)` **without** `algorithmResults`, so an `algorithmResults.*` selector
cannot match; it calls `loadCalculatedValues(...)` **without** the `runImmediately` argument, so
calculated values are registered and never run; and it never calls `n.update()`, so even a value
that did run is not merged into a style id. The documented public door for adding a layer does
not apply the layer. That defect is the entire reason
`graphty/src/components/shell/analysis/elementBridge.ts` exists.

**Element-owned drawing is not in the layer list.** The selection highlight and its neighbour
outlines, the hover highlight, the marquee, the drag ghost and the canvas clear colour are drawn
by construction. The base and selection layers that *are* listed carry
`source.by === "element"` and `locked: true`; removing one is `E_PROTECTED`. Today the app
identifies them **by name** (`graphty/src/components/shell/defaults/nodeMetricStyle.ts:347,358`)
and its own comment admits that a person who renames their own layer to "default" loses the
suppression.

#### 4.6.2 Encoding, and the death of `calculatedStyle`

```ts
type Channel =
  | "node.color" | "node.size" | "node.shape" | "node.label" | "node.labelStyle"
  | "node.tooltip" | "node.opacity" | "node.outline" | "node.glow" | "node.wireframe"
  | "node.flat" | "node.marker"
  | "edge.color" | "edge.width" | "edge.opacity" | "edge.style" | "edge.curvature"
  | "edge.arrowHead" | "edge.arrowTail" | "edge.animationSpeed"
  | "edge.label" | "edge.labelStyle" | "edge.tooltip";

type EdgeLinePattern = "solid" | "dashed" | "dotted" | "dash-dot" | "dash-dot-dot"
                     | "long-dash" | "short-dash" | "double" | "wave";   // edge.style values

type Binding =
  | { value: ChannelValue }
  | { by: Path;
      scale?: "linear" | "log" | "neglog10" | "sqrt" | "pow" | "bins" | "quantile"
            | "ordinal" | "passthrough" | (string & {});   // (string & {}) = a registered scale
      palette?: PaletteId;
      domain?: [number, number] | "auto";
      clamp?: [number, number];                            // percentiles, e.g. [2, 98]
      range?: [number, number];
      map?: Record<string, string | number>;               // per-value overrides
      other?: { threshold: number; value: string | number };
      missing?: "skip" | { value: string | number };       // DEFAULT: "skip"
      reverse?: boolean; midpoint?: number; bins?: number; exponent?: number };

type Encoding = Partial<Record<Channel, Binding>>;

interface EncodingSpec {
  run: Run | RunResult | RunId;         // the Run, the awaited result, or the bare id
  field?: string;                       // defaults to the shape's primary field
  channel: Channel;
  scale?: Binding["scale"]; palette?: PaletteId;
  domain?: Binding["domain"]; clamp?: Binding["clamp"];
  missing?: Binding["missing"]; reverse?: boolean;
  name?: string;
}
```

**Breaking: `calculatedStyle` and its `expr` are deleted, not sandboxed.** `expr` is a JavaScript
source string evaluated at `graphty-element/src/CalculatedValue.ts:77-87`
(`this.exprFn(StyleHelpers, ...args)`). Three reasons to delete rather than guard, in order of
severity:

1. **CSP.** A third party embedding the element under `script-src` without `unsafe-eval` loses
   every calculated style, and therefore every algorithm's suggested styles, in silence. A
   declarative encoding has no eval. No amount of try/catch buys this.
2. **It is the bug.** `CalculatedValue.run` has no try/catch, and neither does
   `ChangeManager.runAllCalculatedValues`, so one throw aborts the repaint loop part way through
   and every node after the offender keeps its old style. Section 8 traces the throw.
3. **It does not serialise meaningfully.** A string of JavaScript cannot be diffed, validated,
   legend-derived or retargeted at another dataset.

Anything genuinely beyond the closed grammar is a **registered scale**, which is code shipped by
a plugin: `use({ kind: "scale", name: "my-ramp", map(value, ctx) { ... } })`. Code stays code;
layers stay data. The alternative -- arbitrary function accessors as the primary styling
mechanism -- forces a deck.gl-shaped `updateTriggers` invalidation API that every user must
learn or hit silent staleness.

**The channel set is closed, and it is closed over what the element can draw today.** Closing it
deletes the only escape hatch, so a channel that is not in the enum is unreachable by any
means -- a registered scale maps a value onto an existing channel and cannot invent one. The
set above is therefore drawn from the capability the element ships rather than from what fits
on a line: the arrow head and tail are separate bindings because
`graphty/src/utils/styleBridge.ts` (918 lines) and `richTextStyleBridge.ts` (325) convert an
`ArrowConfig`, an `EdgeLineConfig`, a `NodeEffectsConfig` and a `RichTextStyle` today;
`edge.style` takes one of the nine `EdgeLinePattern` values, enumerated rather than left as "a
line style"; `node.wireframe` and `node.flat` are the two node effects beside glow and outline;
and animated edges and per-element tooltips are things people ask a graph for often enough that
`edge.animationSpeed` and the two tooltip channels are channels rather than escape hatches.
Rich label typography is `node.labelStyle` / `edge.labelStyle`, whose value is a `LabelStyle`
object (section 12) rather than a scalar --
which is why `StaticStyle` is a per-channel value type and not
`Partial<Record<Channel, string | number | boolean>>`. **A channel that is not in this list and
is not reachable through a registered scale is a missing API, to be added in a minor with a
catalogue entry; it is never a reason to reopen an expression evaluator.**

**Two encoding behaviours a quickstart hits on its first real dataset, defined rather than
left to the implementation.** A value that is zero or negative under `log` or `neglog10` takes
the `missing` branch -- by default `"skip"`, so it is not painted -- and is counted in
`LegendBlock.departures` as "N not plottable on a log scale"; it is never `NaN`, never clamped
to the domain floor, and never silently reassigned. Betweenness has zeros on every real graph,
so this is the common case, not the edge case. And a categorical or ordinal encoding with more
distinct values than `PaletteDescriptor.capacity` takes `Binding.other` when one is declared;
when none is, the layer is **disabled** with `E_CAP_EXCEEDED` in `disabledReason` naming the
value count and the capacity. The palette never wraps. Silent wrapping -- group 8 colliding
with group 0 -- is why the one consumer refuses the element's Louvain layer today.

`encode()` **writes the selector itself**: the resulting layer's selector is
`{ match: "has", path: "results.<runId>.<field>" }`, scoped to exactly the elements the run
measured. The consumer never writes it and therefore cannot get it wrong. `missing` defaults to
`"skip"`: an element the algorithm has nothing to say about is not painted, not even to a muted
grey. Painting the unmeasured is a reader's choice; it must be asked for by name, and asking is
recorded in the layer document so an export explains itself.

#### 4.6.3 Legend, explain, template

```ts
interface LegendBlock {
  channel: Channel; layerId: LayerId; runId?: RunId;
  kind: "sequential" | "diverging" | "categorical" | "highlight" | "literal";
  field: { plainName: string; technicalName: string; path: Path };
  scale: { kind: string; label: string };              // "Square root", in words
  domain?: { min: number; max: number; midpoint?: number;
             clamped?: { from: string; to: string } };
  palette?: { name: PaletteId; reversed: boolean };
  swatches: readonly { label: string; value: unknown; color?: string; size?: number;
                       count?: number }[];             // capped at 12
  overflow?: { hidden: number };                       // "and 14 more"
  departures: readonly string[];                       // "clamped at p2/p98",
                                                       // "not measured (312 nodes)"
}

interface StyleExplanation {
  merged: ResolvedStyle;
  contributions: readonly { layerId: LayerId; name: string;
                            properties: readonly string[]; values: Record<string, unknown> }[];
  channels: readonly { channel: Channel; layerId: LayerId; mode: "static" | "encoded";
                       editable: boolean; reason?: string }[];
}

interface UnboundLayer { layerId: LayerId; reason: string; needs: readonly Path[] }
```

`explain()` answers "why is node-5 red?" in one call. It also answers "which channel does this
layer drive, and can a user edit it here", with `editable` and a `reason` -- the thing
`graphty/src/components/shell/inspector/calculatedChannels.ts` spends 311 lines reconstructing
by prefix-matching output-path strings, and whose header documents the element's internal
lodash `defaultsDeep` merge order as the reason a calculated channel cannot be an editable
control. `resolveToStatic(id, channel)` is the paired verb: convert the rule to a fixed value so
it *becomes* editable.

The legend is derived from the encoding model, never from the canvas, so it exists headlessly,
in a Node test, and at any export scale. `view.capture({ legend: true })` composes the same
blocks into the image at export scale (section 4.9), which is physically impossible today
because the export path is `CreateScreenshotAsync` over the Babylon scene
(`graphty-element/src/screenshot/ScreenshotCapture.ts`) and the legend is a DOM overlay outside
that scene.

**Breaking: `StyleTemplate` splits five ways.** One Zod document holds appearance, column roles
(`DataConfig.knownFields`), run-on-load (`DataConfig.algorithms`), view mode and an inline
skybox image, so importing "a style" can silently rewrite column roles, spend compute, change
the view mode and ship a multi-megabyte image. It becomes five independently importable,
versioned documents: `StyleDocument` (layers and encodings), `DataPlan` (column roles and
policies), `ViewPreset` (mode, camera, presets), `Recipe` (a batch command) and `AnnotationSet`
(notes, 4.15.3). A consumer then has no reason to define its own private subset of the document,
which is the shape the app is otherwise forced into.

Each is a separate file because each has a different lifetime and a different owner. A style
outlives the dataset it was authored against and is meant to be applied to the next one. A
recipe is the point: a domain expert's order of operations, replayed against a graph that has
never been analysed. Column roles belong to a data source, not to an appearance. Notes belong to
a reader. Bundling them is what makes "import a style" able to spend compute and rewrite column
roles, which is the defect this splits apart.

#### 4.6.3a The envelope: one file that carries any subset

The five documents compose into one container, so a consumer can hand a colleague a single file
and the receiving element knows what to do with every part of it:

```ts
interface GraphtyDocument {
  readonly kind: "graphty-document";
  readonly version: 1;
  readonly createdAt: string;                        // ISO 8601
  readonly generator?: { name: string; version: string };
  /** The dataset these members were authored against, when one is known. */
  readonly fingerprint?: string;
  readonly data?: { format: FormatId; inline?: string; url?: string };
  readonly dataPlan?: DataPlan;
  readonly style?: StyleDocument;
  readonly recipe?: Recipe;
  readonly view?: ViewPreset;
  readonly annotations?: AnnotationSet;
}

interface DataApi {
  openDocument(src: File | Blob | URL | string | GraphtyDocument,
               o?: RunOptions & { members?: readonly DocumentMember[] }): Run<DocumentReport>;
  saveDocument(o?: { members?: readonly DocumentMember[]; scope?: Scope;
                     inlineData?: boolean }): Promise<GraphtyDocument>;
}

type DocumentMember = "data" | "dataPlan" | "style" | "recipe" | "view" | "annotations";

interface DocumentReport {
  readonly applied: readonly DocumentMember[];
  /** Per member, what bound and what did not. A member never fails the whole open. */
  readonly members: Readonly<Record<DocumentMember, BindingReport | undefined>>;
  readonly skipped: readonly { member: DocumentMember; reason: string;
                               code: GraphtyErrorCode }[];
}
```

**Every member is optional and every member binds independently.** A document carrying only a
style is a style file; one carrying a recipe and a view is a workspace; one carrying all six is
a project. There is no separate project format to invent later, because the envelope is the
project format and 2.0 simply does not have to write every member.

**One member failing never fails the open.** A style whose layers reference columns this dataset
does not have applies the layers that bind, disables the rest with a stated reason, and reports
both -- the same three outcomes `applyTemplate()` already defines. A recipe that cannot run
because an algorithm is unregistered is reported and skipped; the notes and the view still land.
The alternative, an all-or-nothing open, means one unbindable layer costs a reader their camera
and their annotations, which is how people learn not to use a feature.

**The fingerprint is advisory, never a gate.** `GraphtyDocument.fingerprint` records the dataset
the members were authored against so a consumer can say "this style was made for a different
file" before applying it. It never refuses the open: applying a style to new data is the entire
reason styles are separate files.

`applyTemplate()` reports what did not bind: "Applied Publication style. 2 of 5 layers matched
nothing: they need logFC and padj." Three defined outcomes per layer -- bind, import with a
re-run gate and an estimate, or import disabled with the reason -- because a silently missing
layer is worse than a disabled one.

#### 4.6.4 Worked example: colour by a metric, then ask why one node is that colour

```js
const run = el.run("betweenness");        // a Run. Awaiting it gives the RunResult;
await run;                                // encode() takes the Run.
await el.encode({ run, channel: "node.color", palette: "viridis",
                  scale: "sqrt", clamp: [2, 98] });
await el.encode({ run, channel: "node.size", scale: "sqrt" });

for (const block of el.session.styles.legend()) {
  console.log(block.field.plainName, block.scale.label, block.departures);
}

const why = el.session.styles.explain({ node: "n17" });
console.log(why.merged["node.color"], why.contributions.map((c) => `${c.name}: ${c.properties}`));
```

---

### 4.7 Layout and positions

```ts
interface LayoutApi {
  set(id: LayoutId, params?: Record<string, unknown>,
      o?: { scope?: Scope; start?: "current" | "fresh" | "positions" }): Promise<void>;
  readonly id: LayoutId;
  readonly kind: "live" | "batch";
  readonly state: "idle" | "running" | "paused" | "settled" | "stopped";
  readonly step: number;
  readonly dimensions: 2 | 3;                   // session state, NOT the camera projection
  play(): void; pause(): void; tick(n?: number): void; stop(): void;
  settle(o?: RunOptions & { maxSteps?: number }): Run<SettleResult>;
  recommend(): { id: LayoutId; params: Record<string, unknown>; reason: string };
}
interface SettleResult { settled: boolean; steps: number;
                         reason: "converged" | "max-steps" | "canceled" }

interface PositionsApi {
  get(id: NodeId): Position | undefined;                        // O(1)
  set(entries: Iterable<[NodeId, Position]>): Promise<MutationReceipt>;
  pin(ids: readonly NodeId[]): void;
  unpin(ids: readonly NodeId[] | "all"): void;
  /** A mask, not a Set: bounded, transferable, and O(1) to test. */
  pinnedMask(): Uint8Array;
  isPinned(id: NodeId): boolean;
  snapshot(): { order: readonly NodeId[]; xyz: Float32Array };  // stride 3
  restore(s: { order: readonly NodeId[]; xyz: Float32Array }): Promise<MutationReceipt>;
  readonly complete: boolean;                                   // every node had a position

  /** THE PER-FRAME CHANNEL. Read by reference; never copied per frame. `version` increments
   *  whenever the contents change, so a renderer can skip a frame with one integer compare.
   *  The array is owned by the session and is replaced (not mutated in place) when the node
   *  count changes, which is the only time `order` changes too. */
  readonly buffer: { readonly order: readonly NodeId[];
                     readonly xyz: Float32Array;        // stride 3
                     readonly version: number };
  /** Typed-array writes for a layout engine or an accelerator. No per-node object allocation. */
  setRange(startIndex: number, xyz: Float32Array): void;
  setPacked(indices: Uint32Array, xyz: Float32Array): void;
}
```

**The per-frame boundary is the buffer, and its cost is measured.** A view reads
`positions.buffer` by reference and uploads it; it never allocates a `Position` per node per
frame. When the session is worker-hosted the same buffer crosses the boundary as a structured
clone, which for a 50,000-node graph costs **37.6 us** -- about a fifth of a millisecond at
60 Hz, and therefore not the reason to avoid worker hosting. Stating the number is the point:
silence here is what makes `host: "worker"` look undecidable.

`get()` stays for the single-element question, which is an interaction, not a frame.

Positions are session state, and that one placement is what makes "Copy positions A to B",
"Same positions", warm start, `settle()` in Node and worker hosting all fall out of one
decision. `dimensions` (whether z is meaningful) and the view's `viewMode` (how a renderer draws
it) are deliberately different concepts; a 2D-only layout in a 3D view is **flattened and says
so** rather than disappearing from the list, because a capability that silently vanishes is
worse than one that works with a note.

Pinning is first-class because automatic layout that respects the positions a person placed by
hand is the thing graph tools most often get wrong: dragging pins when `config.pinOnDrag` is
set, pinned state is part of `data.export` and of a recipe, and `{ scope: "selection" }` lays
out the selection while the rest of the graph keeps its positions.

**Breaking: an unknown layout name fails loudly** with `E_UNKNOWN_LAYOUT` and `details.available`.
Today `LayoutEngine.get()` returns `null` and the failure surfaces inside the queue; the shipped
JSDoc for `layout` lists three engines that do not exist and omits twelve that do
(`graphty-element/src/graphty-element.ts:414-420` lists seven names, of which `ngraph`,
`circular`, `random` and `fixed` are among the sixteen registered at
`graphty-element/src/layout/index.ts:19-34`). There is also
exactly one setter now: today a layout can be named in three places with different defaults
(`graph.layout`, `graph.layoutOptions`, `behavior.layout.type`).

`recommend()` retires `graphty/src/components/shell/defaults/loadDefaults.ts:466-494`, which
picks a layout by node count in the app and whose own doc block lists the element's registered
layout ids from memory and notes that the spec's first choice does not exist.

**Worked example.**

```js
const s = el.session;
const { id, params, reason } = s.layout.recommend();
console.log(reason);                         // "94,120 nodes: a live force layout above 50,000"
await s.layout.set(id, params, { start: "current" });
const settled = await s.layout.settle({ maxSteps: 1000,
                                        onProgress: (p) => bar.set(p.fraction) });
if (!settled.settled) { note(`Stopped after ${settled.steps} steps`); }
s.positions.pin(s.selection.nodes);
```

---

### 4.8 Camera and view

```ts
interface CameraApi {
  readonly position: Position; readonly target: Position;
  readonly zoomPercent: number;
  readonly preset: "current" | "top" | "side" | "front" | "isometric" | (string & {});
  moveTo(spec: { position?: Position; target?: Position; preset?: CameraApi["preset"] },
         o?: { animate?: boolean; durationMs?: number }): Promise<void>;
  fit(scope?: Scope, o?: { padding?: number; animate?: boolean }): Promise<void>;
  zoomToNodes(ids: readonly NodeId[], o?: { padding?: number; animate?: boolean }): Promise<void>;
  followNode(id: NodeId | null): void;
  linkTo(other: CameraApi | null,
         o?: { pan?: boolean; zoom?: boolean; rotate?: boolean }): () => void;
  bookmark(): ViewPreset;
  apply(preset: ViewPreset): Promise<void>;
}
```

`zoomToNodes`, `followNode` and a readable zoom percentage are here because a consumer cannot
derive any of the three from a camera position; `linkTo` is what keeps two Compare views
together, and it returns its own unlink function. A `ViewPreset` is bound to its dataset (it
names ids and a camera), which is why `session.fingerprint()` exists: a consumer can tell
whether a bound artifact applies. The app invents a fingerprint for notes today -- file name,
node and edge counts, a hash of the first 100 ids -- which is a consumer computing something
about a graph.

**XR** is a view mode, not a second API: `viewMode = "vr" | "ar"` enters a session,
`graphty-xr-session-change` reports entry, exit and unexpected end, and the same selection set,
the same commands and the same scope rules apply inside the headset. What 2.0 ships is the
session lifecycle, the shared selection set that an in-headset selection will feed, and the
report of whatever detail the renderer dropped to hold frame rate, on
`view.rendered.performanceMode.reasons`. Everything else about working inside a headset --
panels floating in world space, anchoring them to a forearm, sizing text in arcminutes,
grabbing and scaling the whole graph, selecting by ray, pinch or gaze, snap turning behind a
comfort vignette, and framing passthrough in an AR capture -- is deferred to 2.1 and listed in
section 9.

---

### 4.9 Export: data, image, video, report

Data export is section 4.3.6. This section is the view's half.

```ts
interface CaptureOptions {
  format?: "png" | "jpeg" | "webp" | "svg" | "pdf";
  scale?: 1 | 2 | 4 | number;
  maxSide?: number;                          // default config.exportMaxSide (4096)
  scope?: "viewport" | "graph" | Scope;
  camera?: CameraApi["preset"];
  background?: string | "transparent";
  legend?: boolean;                          // default true
  markers?: boolean;                         // note markers, in-scene
  labels?: "as-shown" | "pinned-only" | "none";
  quality?: number;                          // jpeg/webp, 60..100
  to?: "blob" | "clipboard";                 // "clipboard" needs capabilities.capture.clipboard
  signal?: AbortSignal;
}
interface CaptureResult { blob: Blob; width: number; height: number;
                          format: string; bytes: number; legendBlocks: number }

interface VideoOptions extends RunOptions {
  durationMs: number;
  camera: "hold" | "orbit" | { path: readonly ViewPreset[] };
  format?: "webm" | "mp4";
  fps?: 30 | 60; scale?: 1 | 2;
}
interface VideoResult { blob: Blob; durationMs: number; frames: number; format: string }

interface ReportOptions {
  format: "html" | "markdown" | "pdf";
  title?: string; description?: string; methodology?: string; findings?: string;
  sections?: readonly ("statistics" | "degree-distribution" | "rankings" | "communities"
                     | "image" | "legend" | "methods" | "notes")[];
  runs?: readonly RunId[] | "all";
  image?: CaptureOptions;
  template?: "plain" | "publication" | "brief" | (string & {});
  css?: string; logo?: Blob;
}
interface EvidenceBundleOptions {
  runs?: readonly RunId[] | "all";
  include?: readonly ("csv" | "image" | "journal" | "recipe")[];
}
```

`report()` and `evidenceBundle()` are declared on `GraphtyGraphElement` in 4.1, beside
`capture()` and `recordVideo()`; they are view verbs because both compose an image.

`session.plan({op: "view.capture", ...})` returns the `image` effect before rendering: pixel
dimensions, node count in frame, legend channel count and estimated bytes. One call answers
both "what will be in the frame" and "how big is the file going to be".

Video, report generation and the evidence bundle exist because the last thing anyone does with
an analysis is show it to somebody else: a short clip of a layout settling or a time window
playing, a document carrying the picture with its statistics and a methods paragraph, and a ZIP
of the CSVs, the image and the journal that lets a reader reproduce the work. All three are
element surface by Principle 1: each needs the run records, the legend model, the result
summaries and the camera, and every one of those is the element's. The report's methods
paragraph is generated from the run records with the reading generator (4.4.4), because only
the element has the parameter names, the units and the plain names.

**Worked example.**

```js
const est = await el.session.plan({ op: "view.capture", format: "png", scale: 4 });
if (est.effect.bytes > 20e6) { warn(`${(est.effect.bytes/1e6).toFixed(0)} MB`); }
const shot = await el.capture({ format: "png", scale: 4, legend: true, camera: "isometric" });
const pdf = await el.report({ format: "pdf", title: "Backbone of the payment network",
                              runs: "all", sections: ["statistics", "rankings", "image",
                                                      "legend", "methods"] });
```

---

### 4.10 Events

Two catalogues and one rule between them:

> **Session events fire for every change, whatever caused it. View DOM events fire for user
> interaction in that view, plus `ready` and `error`, plus four documented mirrors.**

That rule prevents the React binding loop (set property -> event -> binding -> set property)
while still letting a model be observable without polling. If you hold the session, listen to
the session. A public DOM event never fires as a direct consequence of the host setting a
property.

**Every event declares its delivery rate, and no event is delivered per frame.** Each row in the
two tables below carries a coalescing value, and these three are the ones that would otherwise
arrive at frame or pointer rate:

| Event | Coalescing | Why |
| --- | --- | --- |
| `graphty-camera-change` | one per animation frame, trailing | an orbit emits per frame otherwise; `camera.linkTo` drives the far camera directly and does not re-emit, so two linked views cannot ping-pong |
| `layout:changed` | one per animation frame, trailing | a live layout ticks every frame; a consumer drawing a progress bar needs the latest value, not every value |
| `graphty-node-hover` | one per pointer move, and `detail` carries ids, not records | the full attribute record at pointer rate is a copy per move; `data.node(id)` is O(1) for a consumer that wants it |

Run progress is coalesced before it reaches a listener at all: `onProgress` and
`graphty-run-progress` are capped at ten per second, which is the rate the progress requirement
asks for and well under a frame.

**Every readable struct is frozen and identity-stable.** `element.hover`, `view.rendered`,
`status.*`, `selection.nodes`/`.edges`, `visibility.summary`, `runs.queue`, `styles.list()` and
`catalog.*` return the same object until their contents change, and a new object when they do.
Two consequences a consumer depends on: `prev === next` is a valid staleness test, so a React
`useMemo` or a Svelte `$derived` over one of these does not re-run every render; and reading one
costs nothing, so a read in a render function is safe. A struct that returns a fresh array per
read reopens on the property path exactly the re-render loop the event rule above closes on the
event path.

**Breaking: the event catalogue is replaced.** Twenty-three prefixed, typed, declared DOM events;
thirteen session events; the counts are the two tables in 4.10.1 and 4.10.2 and the CI test of
8.5 asserts against them, so this sentence cannot drift from them; `on()` returns its own unsubscribe so there is no `off` to learn; `detail`
carries no engine reference. Today the element blanket-forwards roughly fifty unprefixed
internal event names to the DOM with `detail` set to the whole internal event object
(`graphty-element/src/graphty-element.ts:96-104`), which hands a `Graph` -- and therefore the
Babylon engine -- to any listener on `document`, and includes `stats-update` once per frame.
Four *documented* events (`node-click`, `node-hover`, `node-drag-start`, `node-drag-end`) throw
on subscribe, because `EventManager.addListener`'s switch has no case for them and ends in
`throw new TypeError` (`graphty-element/src/managers/EventManager.ts:450`); `edge-click` and all
eleven `ai-*` events are declared and never emitted; and `Graph.on()` returns `void`, discarding
the symbol `EventManager.addListener` returns (`graphty-element/src/Graph.ts:1518-1520`), so a
listener can never be removed through the documented API -- while the shipped docs advertise a
`graph.off()` that does not exist.

The contract sentence, which must appear in the docs verbatim: **every declared event is
emitted, and every emitted event is subscribable.**

#### 4.10.1 DOM events (view)

All `graphty-` prefixed, kebab-case, `bubbles: true`, `composed: true`, `detail` serialisable.
The `detail` of each is spelled out in the reference table rather than named as a type defined
elsewhere.

| event | detail |
|---|---|
| `graphty-ready` | `{}` |
| `graphty-error` | `{ code, message, source, recoverable, details? }` |
| `graphty-node-click` | `{ node: NodeRecord; id: NodeId; modifiers: Modifiers; pointer: {x,y}; world: Position \| null; results: Record<RunId, Record<string, unknown>> }` (`NodeClickDetail`, section 12) |
| `graphty-node-dblclick` | same as node-click |
| `graphty-node-contextmenu` | same as node-click; the browser menu is suppressed |
| `graphty-edge-click` / `-dblclick` / `-contextmenu` | `{ edge: EdgeRecord; id: EdgeId; source: NodeId; target: NodeId; modifiers; pointer }` |
| `graphty-canvas-click` / `-contextmenu` | `{ modifiers; pointer; world: Position \| null }` |
| `graphty-node-hover` / `graphty-edge-hover` | `{ id: NodeId \| EdgeId \| null; data: Record<string, unknown> \| null }` |
| `graphty-node-drag-start` / `-drag-end` | `{ id: NodeId; position: Position; pinned: boolean }` |
| `graphty-marquee-end` | `{ nodes: readonly NodeId[]; edges: readonly EdgeId[] }` |
| `graphty-camera-change` | `{ position; target; zoomPercent; preset }` |
| `graphty-view-mode-change` | `{ mode: "2d"\|"3d"\|"vr"\|"ar" }` |
| `graphty-xr-session-change` | `{ state: "entered"\|"exited"\|"unexpected-end"; mode: "vr"\|"ar" }` |
| `graphty-performance-change` | `{ active: boolean; reasons: readonly string[] }` |
| `graphty-selection-change` (mirror) | `SelectionDelta` |
| `graphty-run-change` (mirror) | `{ run: RunRecord; phase: "queued"\|"start"\|"progress"\|"end" }` |
| `graphty-load-change` (mirror) | `{ phase; fraction; summary: string; endpoints?: Inspection["endpoints"]; report?: ImportReport }` -- `endpoints` and `report` are present at `phase: "end"`, which is where the report of which endpoint spelling was used lands |
| `graphty-capabilities-change` (mirror) | `{ capabilities: Capabilities }` -- the same detail as the session's `capabilities:changed` |

The four mirrors -- `graphty-selection-change`, `graphty-run-change`, `graphty-load-change` and
`graphty-capabilities-change` -- exist so an HTML-only consumer can build a status bar without
touching the session. They are documented as mirrors and coalesced.
`graphty-capabilities-change` is what an acceleration status chip listens to: a page with a
`<graphty-element>` tag and six lines of script can show whether the GPU is in use, say why it
is not, and update itself when a device is lost, without importing the session module or naming
a single GPU type.

#### 4.10.2 Session events

`session.on(name, handler)` returns an unsubscribe function.

| event | detail |
|---|---|
| `ready` / `error` | as above |
| `data:loading` | `Progress & { phase: "fetch"\|"parse"\|"index" }` |
| `data:changed` | `MutationReceipt` |
| `selection:changed` | `SelectionDelta` |
| `visibility:changed` | `{ visible; total; unresolvedPaths; durationMs; filterKind }` (`FilterResult & { filterKind: string }`, section 12) |
| `run:changed` | `{ run: RunRecord; phase: "queued"\|"start"\|"progress"\|"end" }` (rate-limited to 10/s) |
| `styles:changed` | `{ layers: readonly Layer[]; changed: readonly LayerId[] }` -- carries the state |
| `style:error` | `{ layerId; elementId; code; message }` (deduped per layer per repaint) |
| `layout:changed` | `{ id; kind; state; step; progress? }` |
| `journal:appended` | `{ entry: JournalEntry }` |
| `capabilities:changed` | `{ capabilities: Capabilities }` |
| `catalog:changed` | `{ kind; added: readonly string[]; removed: readonly string[] }` |

`styles:changed` carries the layer list because today it is a bare notification and the one
consumer re-reads `element.graph.getLayers()` on every fire
(`graphty/src/components/Graphty.tsx:514`).

#### 4.10.3 Delegated listeners

`on()` takes an options object the DOM listener cannot:

```ts
interface ListenOptions { where?: Query; once?: boolean; signal?: AbortSignal }

const off = el.on("graphty-node-click", (e) => inspect(e.detail.id),
                  { where: "data.type == `host`" });
```

One selector dialect across styles, filters, scopes, selection and events is a coherence win,
and it means the common case never hand-writes a predicate inside a handler.

---

### 4.11 Commands, the journal, recipes

#### 4.11.1 The command union

```ts
type Command =
  | { op: "data.inspect"; source: Source; format?: FormatId }
  | { op: "data.import"; source: Source; plan?: ImportPlan; mode?: "replace" | "merge" }
  | { op: "data.apply"; mutation: Mutation }
  | { op: "data.expand"; seeds: readonly NodeId[]; depth?: number; direction?: Direction;
      nodeTypes?: readonly string[]; edgeTypes?: readonly string[]; limit?: number }
  | { op: "data.collapse"; expansionId: string }
  | { op: "data.compute"; name: string; formula: string; target?: "node" | "edge" }
  | { op: "data.export"; format: FormatId; scope?: Scope; include?: ExportOptions["include"] }
  | { op: "data.sample"; name: SampleDatasetId }
  | { op: "data.match"; pattern: Pattern | string; similarity?: number; limit?: number }
  | { op: "algo.run"; algorithm: AlgorithmKey; params?: Record<string, unknown>;
      scope?: Scope; seed?: number; as?: RunId; style?: boolean }
  | { op: "algo.remove"; runId: RunId }
  | { op: "style.patch"; add?: readonly LayerSpec[]; update?: Record<LayerId, Partial<LayerSpec>>;
      remove?: readonly LayerId[]; order?: readonly LayerId[] }
  | { op: "style.encode"; spec: EncodingSpec }
  | { op: "style.template"; document: StyleDocument }
  | { op: "select"; target: SelectionTarget; mode?: SetOp }
  | { op: "visibility.set"; filter: Filter | null }
  | { op: "visibility.window"; window: TimeWindow | null }
  | { op: "visibility.steps"; window: TimeWindow }
  | { op: "layout.set"; id: LayoutId; params?: Record<string, unknown>; scope?: Scope;
      start?: "current" | "fresh" | "positions" }
  | { op: "layout.transport"; action: "play" | "pause" | "step" | "settle" | "stop";
      steps?: number }
  | { op: "positions.set"; entries: readonly (readonly [NodeId, Position])[] }
  | { op: "view.camera"; position?: Position; target?: Position; preset?: string;
      fit?: Scope; follow?: NodeId | null; animate?: boolean }
  | { op: "view.mode"; mode: "2d" | "3d" | "vr" | "ar" }
  | { op: "view.capture"; format?: CaptureOptions["format"]; scale?: number; legend?: boolean;
      scope?: CaptureOptions["scope"]; camera?: string }
  | { op: "view.record"; durationMs: number; camera: VideoOptions["camera"] }
  | { op: "report"; format: ReportOptions["format"]; sections?: ReportOptions["sections"] }
  | { op: "calibrate" }
  | { op: "config.set"; values: Partial<ConfigValues> }
  | { op: "batch"; steps: readonly Command[]; atomic?: boolean; label?: string };

interface RunOptions {
  signal?: AbortSignal;
  onProgress?: (p: Progress) => void;
  queue?: "append" | "replace" | "now";      // default "append"
  dryRun?: boolean;                          // resolves to a Plan; performs nothing
  transitionMs?: number;                     // overrides config.transitionMs for this call
}
```

Dotted op names mean `{ op: "data.` lists the data commands and `{ op: "algo.` lists the rest.
`ResultOf<C>` is a mapped type, so `await session.run({op: "algo.run", algorithm: "degree"})` is
typed. The whole union plus a JSON Schema is emitted at build to
`dist/graphty-commands.json` and published, so an agent reads the surface as data.

**Concurrency is documented, not emergent.** `queue: "append"` is the default and
`queuePosition` is readable; `queue: "replace"` aborts the in-flight run of the same op and
target, rejecting the previous promise with `AbortError`; `queue: "now"` runs beside the queue
and is refused with `E_UNSUPPORTED` for anything that mutates.

#### 4.11.2 The journal

```ts
interface JournalEntry {
  readonly id: JournalId;
  readonly at: string;                        // ISO 8601
  readonly kind: "data" | "run" | "style" | "filter" | "window" | "layout" | "view"
               | "selection" | "config" | "note";
  readonly command: Command;                  // the canonical, replayable form
  /** LAZY. Formatting a summary eagerly costs a string per entry, and the entries that arrive
   *  fastest are the ones nobody reads. Computed on first access and cached. */
  readonly summary: string;
  readonly inverse?: Command;                 // absent means not undoable
  readonly coalesceKey?: string;              // consecutive entries with an equal key merge
  readonly bytes: number;                     // retained size, including any snapshot inverse
  readonly durationMs: number;
  readonly runId?: RunId;
  readonly engine: { element: string; algorithms: string; layout: string };
}

interface JournalApi {
  readonly entries: readonly JournalEntry[];
  get(id: JournalId): JournalEntry | undefined;
  subscribe(fn: (e: JournalEntry) => void): () => void;
  replay(entries: readonly JournalEntry[] | readonly Command[],
         o?: RunOptions & { onData?: (step: Command) => Promise<Source> }):
    Run<ReplayReport>;
  export(o?: { kind?: readonly JournalEntry["kind"][] }): Recipe;
  clear(): void;
  cap: number;                                // default 1000, auto-pruned oldest-first
}

interface ReplayReport {
  steps: readonly { index: number; ok: boolean; reason?: string; command: Command }[];
  bound: number; unbound: number; partial: boolean;
}
type Recipe = { version: 1; steps: readonly Command[]; engine: JournalEntry["engine"] };
```

**Every undoable category has a stated inverse, and the table is the contract.** Section 4.3.3
says "the element owns inverses; the consumer owns the undo stack", but a consumer can only
build that stack if it can find the inverse of every operation, not only of a data mutation.
The universal door is the journal: every command that changes state writes one `JournalEntry`,
the `Run` that executed it carries its `journalId`, and `journal.get(id).inverse` is the
inverse. `MutationReceipt.inverse` (4.3.3) is the same `Command`, surfaced on the receipt
because the data verbs are the ones a consumer reaches for first.

| Command op | Inverse | Note |
|---|---|---|
| `data.import` | `data.apply {kind:"clear"}`, or the pre-import snapshot for `mode:"merge"` | one entry for the whole import |
| `data.apply` | the paired mutation (`add-nodes` <-> `remove-nodes`, `set-attributes` -> the prior values, `merge-nodes` -> a split carrying `retargeted`, `drop-column` -> `add-column` with the stored values) | on `MutationReceipt.inverse` |
| `data.expand` | `data.collapse {expansionId}` | on `ExpansionReceipt.inverse` |
| `data.collapse` | `data.expand` with the recorded seeds and options | |
| `data.compute` | `data.apply {kind:"drop-column"}` | |
| `data.sample` | as `data.import` | |
| `algo.run` | `algo.remove {runId}`, plus removal of any layer auto-apply added | the run's own layers come back with `rerun()` |
| `algo.remove` | `algo.run` with the recorded command, plus `style.patch` restoring the removed layers | `runs.remove` returns the layer ids for exactly this |
| `style.patch` | `style.patch` carrying the prior specs and the prior order | one op inverts add, update, remove and reorder together |
| `style.encode` | `style.patch {remove:[layerId]}`, or the prior spec when it replaced a layer (4.4.5) | |
| `style.template` | `style.patch` restoring the prior stack from `styles.toDocument()` | |
| `select` | `select` with the prior two sets | bounded by `config.selectionCap` |
| `visibility.set` | `visibility.set` with the prior `Filter \| null` | the mask itself is not stored; the filter is |
| `visibility.window` | `visibility.window` with the prior `TimeWindow \| null` | dragging a slider coalesces (below) |
| `layout.set` | `layout.set` with the prior id and params, plus `positions.set` restoring the prior arrangement | the positions are the expensive half, so the entry stores a `positions.snapshot()` |
| `layout.transport` | none | transport is not state; the arrangement it produced is, and that lands as `positions.set` |
| `positions.set` | `positions.set` with the prior coordinates of exactly the moved nodes | |
| `config.set` | `config.set` with the prior values | on `MutationReceipt.inverse` |
| `view.camera`, `view.mode` | the prior camera / mode | view state, journalled as `kind: "view"`, and most consumers exclude it from undo |
| `data.inspect`, `data.export`, `data.match`, `visibility.steps`, `view.capture`, `view.record`, `report`, `calibrate` | none, and none is needed | they read; they change no state |
| `batch` | a `batch` of the members' inverses in reverse order | atomic in, atomic out |

`coalesceKey` is how a dragged slider stays out of undo's way: consecutive re-runs of the same
parameter on the same layer coalesce into one history entry while that layer stays selected and
nothing else intervenes, so turning a slider through five values does not evict a data mutation
from a fifty-deep store. The element must supply the key because only the element knows that
five `style.patch` commands touched the same binding of the same layer. The stack, its depth
and its keybinding stay with the consumer.

**Every continuous gesture carries a mandatory coalesce key, and the key is the gesture.** A key
is opened at the gesture's start and closed at its end, so one drag, one orbit or one slider
sweep is exactly one journal entry regardless of how many commands it emitted. These are
mandatory rather than advisory:

| Command | Key | Opened / closed |
| --- | --- | --- |
| `view.camera` | `camera:<viewId>:<gestureId>` | pointerdown / pointerup, or one entry per programmatic call |
| `positions.set` | `positions:<gestureId>` | drag start / drag end |
| `select` | `selection:<gestureId>` | marquee or shift-click run |
| `visibility.set`, `window.set` | `<kind>:<controlId>` | while the same control keeps focus |
| `style.patch` | `style:<layerId>:<channel>` | while that binding stays the edit target |

Without this the camera alone writes an entry per frame: an orbit drag at 60 Hz fills a
1,000-entry journal in under 17 seconds, and every real edit a reader wanted to undo is gone.

**The journal is bounded in bytes, not only in entries.** `layout.set`'s inverse stores a
position snapshot, so a thousand-entry journal over a 50,000-node graph can retain 600 MB with
every entry individually reasonable. `ConfigValues.journalBytesCap` (default 64 MB) bounds the
retained total; `JournalEntry.bytes` reports each entry's contribution. When the cap is reached,
the oldest entries whose inverses are snapshots are demoted first -- the entry stays, its
`inverse` becomes absent, and `undoable` turns false -- before any entry is evicted outright. A
reader loses the ability to undo a layout before they lose the record that it happened.

`replay(entries, { onData })` runs a recipe on the **same or a different dataset**, calling
`onData` when a step needs a source, and reports per step what did not bind. That is the
artifact behind "do all of that again on next month's file", and it is the same shape as
`{op: "batch"}`, so a recipe is a
command and "Export as script", "Copy as command", the AI tool call and the journal row are all
`JSON.stringify`. **One serialiser, five consumers, achieved by inventing no serialisation
format.**

**Worked example: undo, and a recipe replayed on another file.**

```js
const receipt = await s.data.apply({ kind: "merge-nodes",
  groups: [["acct:18", "acct:19"]], into: "acct:17",
  policy: { attributes: "keep-first", edges: "sum-weights", dropSelfLoops: true } });
undoStack.push(receipt.inverse);            // a Command; serialises, replays, exports
// later in the session
await s.run(undoStack.pop());

const recipe = s.journal.export({ kind: ["data", "run", "style", "filter"] });
await otherSession.journal.replay(recipe.steps, { onData: () => otherFile });
```

---

### 4.12 Capabilities, limits and the configuration document

```ts
interface Capabilities {
  readonly acceleration: {
    state: "probing" | "active" | "idle" | "unavailable" | "error" | "off";
    backend?: "webgpu";
    vendor?: string; architecture?: string; device?: string;
    reason?: string;                 // "requires a secure context (https or localhost)"
    code?: "E_NO_WEBGPU" | "E_NO_ADAPTER" | "E_SOFTWARE_ONLY" | "E_DEVICE_LOST" | "E_TOO_LARGE";
  };
  readonly workers: { state: "active" | "unavailable"; count: number };
  readonly xr: { vr: boolean; ar: boolean };
  readonly capture: { png: boolean; jpeg: boolean; webp: boolean; svg: boolean; pdf: boolean;
                      video: boolean; clipboard: boolean };
  readonly calibration: { at: string; machine: string;
                          basis: "probe" | "defaults" } | null;
  readonly limits: Readonly<Limits>;
}

interface Limits {
  largeGraphThreshold: number; renderCeiling: number; memoryBudgetBytes: number;
  exactComputationCap: number; selectionCap: number; edgesDrawn: number;
}
```

**The six acceleration states, each in one line:**

- **`"probing"`** -- the element is looking for an accelerator and the answer is not known yet.
  A consumer shows nothing definitive while this is the state: not "GPU on", not "GPU
  unavailable", just whatever it shows for a pending answer. Without this state the only honest
  reading of an unfinished probe is one of the failure states, which flickers a false "no GPU"
  onto every page that then gets one.
- **`"active"`** -- an accelerator is attached and work is on it right now.
- **`"idle"`** -- an accelerator is attached and usable, and nothing is currently using it. This
  is the resting state of a working accelerator, not a degraded one: a graph below
  `acceleration.minNodes`, or a page where nothing has been run yet, sits here.
- **`"unavailable"`** -- no accelerator could be attached. `reason` says why in a sentence a
  person can read and `code` says why in a string a `switch` can take.
- **`"error"`** -- an accelerator was attached and then failed, device loss being the usual
  cause. `code` carries which failure; the element continues on the CPU path having said so.
- **`"off"`** -- acceleration is switched off by the consumer, so the element never looked.

Every transition between them emits `capabilities:changed` on the session and
`graphty-capabilities-change` on every bound view, so a status chip is written once and is
correct from the first frame through a device loss.

The consumer reads state; the consumer never probes. `session.calibrate()` is the element's
own first-run probe -- device memory, hardware concurrency, the renderer string, DPR, then a
512x512 instanced render at 1,000, 8,000 and 64,000 nodes, hard-capped at 2.5 s in total and
abandoned the moment a file opens. If it fails, built-in defaults apply silently: never a modal,
never a blocked start. Benchmarking the host is exactly the detection code Principle 1 forbids
shipping to a consumer, and the one record serves both the render ceiling and the run estimate.

**The typed configuration document.** More than twenty-five numbers govern how the element
behaves: render ceilings, caps, thresholds, timings, the limits above which it asks before
running something. A product needs every one of them readable, settable, describable in a
settings screen and carried in an exported settings file. Here they are one document, each key
with a plain name, a technical name, a unit and a range:

```ts
interface ConfigDocument {
  readonly values: Readonly<ConfigValues>;
  readonly keys: readonly ConfigKeyDescriptor[];    // plain name, technical name, unit, range
  set(patch: Partial<ConfigValues>): MutationReceipt;
  reset(keys?: readonly (keyof ConfigValues)[]): MutationReceipt;
  toDocument(): { version: 1; values: Partial<ConfigValues> };
  applyDocument(doc: { version: 1; values: Partial<ConfigValues> }):
    { applied: readonly string[]; rejected: readonly { key: string; reason: string }[] };
}

interface ConfigValues {
  largeGraphThreshold: number; renderCeiling: number; exactComputationCap: number;
  selectionCap: number; edgesDrawn: number; effectsCap: number;
  labelCap: number; labelCapZoomedOut: number; labelCapHover: number;
  expansionWarn: number; expansionBlock: number;
  askLimitSeconds: number; warnLimitSeconds: number;
  progressiveChunkSize: number; progressiveErrorLimit: number;
  layoutPreSteps: number; layoutStepMultiplier: number; layoutSettleThreshold: number;
  patternTimeBoxMs: number; searchDebounceMs: number; searchResultCap: number;
  hoverEnabled: boolean; tooltipsEnabled: boolean; pinOnDrag: boolean;
  performanceMode: "auto" | "on" | "off";
  "acceleration.minNodes": number;      // default 0; see below
  transitionMs: number; temporalChangeThreshold: number;
  exportMaxSide: number; journalCap: number; journalBytesCap: number;   // default 64 MB
  xrTextArcmin: number; xrPanelDistanceM: number; xrSnapTurnDegrees: number;
  xrFrameFloorHz: number;
}
```

Every key round-trips, so "export my settings" and "apply this profile" are two calls. A
rejected key comes back with a reason rather than being dropped.

**`acceleration.minNodes` is the node count at which acceleration starts paying for itself.** At
or above it, a run or a layout that has an accelerated implementation uses the accelerator;
below it the element takes the CPU path even though an accelerator is attached, and
`acceleration.state` reads `"idle"`. The default is `0`, which means "use the accelerator
whenever one is attached"; raise it when a graph is small enough that uploading it costs more
than computing it. It is the only threshold that governs acceleration, and it is a different
number from `largeGraphThreshold`, which decides how much visual detail to draw and has nothing
to say about where a computation runs.

**The reader's acceleration preference is not in this document.** `acceleration` is an attribute
and a session property, it is not a `ConfigValues` key, and `toDocument()` therefore does not
carry it -- an exported settings file moved to another machine would otherwise demand a GPU that
machine may not have. The element persists nothing on a reader's behalf: remembering that this
person chose to turn acceleration off, and restoring that choice on the next visit, is storage
the host application owns and the element must not reach into. The app keeps its own key and
writes the attribute when it mounts the element.

`transitionMs` is the default animation duration for the three things that animate --
applying a preset or a template, stepping the time window, and moving the camera to focus
something -- and every
operation that can animate takes a per-call `transitionMs` on its `RunOptions` to override it.
`0` disables animation, and the element honours `prefers-reduced-motion` by treating the
default as `0` unless a call names a duration. `performanceMode` is the manual toggle: `"auto"`
is today's behaviour, `"on"` forces reduced detail, `"off"` refuses it, and
`view.rendered.performanceMode` reports the resulting `mode` and `reasons` either way.

**WebGPU activation is one import, and that is the consumer's entire integration:**

```js
import "@graphty/graphty-element";
import "@graphty/graphty-element/webgpu";   // the optional peer; this is all of it
```

After that line the element probes for an adapter, requests a context, constructs the
accelerator, attaches it, handles `ctx.lost`, applies `acceleration.minNodes` and reports.
Three rules the design commits to:

- **No GPU type crosses the boundary.** `GpuContext`, `GpuCaps`, `ProbeResult` and every
  `GPU*`-referencing type stay in the peer; re-exporting one would make `@webgpu/types` a hard
  type dependency of every consumer. The element publishes its own `Capabilities`.
- **GPU errors arrive as codes on a `GraphtyError`**, never as a class. A consumer who did not
  install the peer cannot name `WebGpuGraphError`.
- **`acceleration = "required"` makes a missing accelerator a loud rejection**
  (`E_NO_ACCELERATOR`), never a silent CPU fallback, and there is no fallback *inside* a run: if
  an accelerated path fails mid-run the run fails with the code. Device loss sets
  `acceleration.state = "error"` with a code, emits `capabilities:changed`, and continues on the
  CPU path **having said so**.

`session.setAccelerator(acc)` stays public: it is how tests inject a fake and how a third party
supplies their own.

---

### 4.13 Errors

```ts
class GraphtyError extends Error {
  readonly code: GraphtyErrorCode;
  readonly source: "data" | "run" | "layout" | "style" | "view" | "acceleration"
                 | "registry" | "config";
  readonly recoverable: boolean;
  readonly details: Readonly<Record<string, unknown>>;
  readonly target?: { kind: "layer"; id: LayerId } | { kind: "run"; id: RunId }
                  | { kind: "scope"; id: ScopeId };
  readonly cause?: unknown;
}

type GraphtyErrorCode =
  | "E_BAD_COMMAND" | "E_BAD_QUERY" | "E_BAD_LAYER" | "E_BAD_SELECTOR" | "E_BAD_FORMULA"
  | "E_SELECTOR_EMPTY" | "E_UNSCOPED_RUN_ENCODING" | "E_UNKNOWN_SCALE" | "E_UNKNOWN_CHANNEL"
  | "E_UNKNOWN_OPTION" | "E_OPTION_RANGE" | "E_UNKNOWN_ATTRIBUTE"
  | "E_UNKNOWN_ALGORITHM" | "E_UNKNOWN_LAYOUT" | "E_UNKNOWN_FORMAT"
  | "E_UNKNOWN_PALETTE" | "E_UNKNOWN_CAMERA" | "E_UNKNOWN_SINK" | "E_UNKNOWN_RUN"
  | "E_UNSTABLE_RUN_ID" | "E_DUPLICATE_ID" | "E_DUPLICATE_EDGE" | "E_DUPLICATE_PLUGIN" | "E_PROTECTED"
  | "E_FETCH_FAILED" | "E_PARSE_FAILED" | "E_EDGE_ENDPOINTS_UNRESOLVED" | "E_ID_MISSING"
  | "E_TOO_LARGE" | "E_OUT_OF_MEMORY" | "E_CAP_EXCEEDED" | "E_SCOPE_EMPTY"
  | "E_NO_ACCELERATOR" | "E_NO_WEBGPU" | "E_NO_ADAPTER" | "E_SOFTWARE_ONLY" | "E_DEVICE_LOST"
  | "E_NO_WEBGL"
  | "E_UNSUPPORTED" | "E_READONLY" | "E_DISPOSED" | "E_INTERNAL";
```

Five rules.

1. **Codes are the contract; messages are not.** A consumer's error UI switches on `code`, which
   matches the convention the siblings already use (`E_NO_WEBGPU`, `E_NO_ADAPTER`,
   `E_TOO_LARGE`).
2. **Codes cross the boundary; classes do not.** A sibling's error -- graph-io's `ImportError`,
   graph-format's `GraphFormatError`, the GPU peer's `WebGpuGraphError` -- is wrapped in a
   `GraphtyError` carrying the sibling's code string and the original as `cause`.
3. **Cancellation is not an error code.** Aborting rejects with a `DOMException` named
   `AbortError`; `AbortSignal.timeout()` gives `TimeoutError`.
4. **An error lands on the thing that caused it.** A run's failure lands on the run
   (`run.status = "failed"`, `run.error`, `run:changed`); a layer's failure lands on the layer
   (`layer.enabled = false`, `layer.disabledReason`, `style:error`); everything else fires
   `error` on the session and `graphty-error` on every bound view. A single global firehose
   makes the consumer route failures the element already knows the origin of. There is no
   `console.warn`-and-continue path.
5. **There is no `E_NOT_READY`.** Every method is safe to call before the element is ready;
   work queues and resolves when it runs. A stranger will call `run()` in the same tick they set
   `data`, and the app's four-method duck-typing probe
   (`graphty/src/components/shell/analysis/elementBridge.ts:76,108`) exists only because
   readiness is unobservable today.

An unknown option returns the valid names in `details`; an out-of-range value returns
`E_OPTION_RANGE` with the range. A misspelled parameter must never be a silent no-op.

---

### 4.14 Extension

One registry, one verb, instance-scopable, plus a markup door.

```ts
import { use, createRegistry, defineAlgorithm, defineLayout, defineFormat, defineScale }
  from "@graphty/graphty-element/extend";

type Plugin =
  | { kind: "algorithm"; descriptor: AlgorithmDescriptor; run: AlgorithmRun }
  | { kind: "layout"; descriptor: LayoutDescriptor; create: LayoutFactory }
  | { kind: "format"; descriptor: FormatDescriptor; importer?: Importer; exporter?: Exporter }
  | { kind: "scale"; name: string; map: ScaleFn }
  | { kind: "palette"; descriptor: PaletteDescriptor }
  | { kind: "accelerator"; factory: AcceleratorFactory }
  | { kind: "command"; commands: readonly CommandDescriptor[] }
  | { kind: "identifier-mapper"; descriptor: MapperDescriptor; map: MapperFn }
  | { kind: "enrichment"; descriptor: ProviderDescriptor; fetch: EnrichmentFn }
  | { kind: "data-source"; descriptor: SourceDescriptor;
      fetchNodes?: FetchNodes; fetchEdges?: FetchEdges };

interface Registry {
  use(...plugins: Plugin[]): void;
  use(plugin: Plugin, o: { strict?: boolean }): void;
  remove(kind: Plugin["kind"], name: string): boolean;
  has(kind: Plugin["kind"], name: string): boolean;
  list(kind?: Plugin["kind"]):
    readonly { kind: Plugin["kind"]; name: string; version?: string; enabled: boolean }[];
  enable(kind: Plugin["kind"], name: string, on: boolean): void;
  load(url: string | URL): Promise<readonly { kind: string; name: string }[]>;
}
```

Ten plugin kinds. Six are things a third party wants to bring to a graph tool: an algorithm, a
layout, an accelerator, a data source, an identifier mapper (turning one id vocabulary into
another at import time, gene symbols into database accessions for instance) and an enrichment
provider (fetching extra attributes for nodes the graph already has). The other four --
formats, scales, palettes and commands -- are things that would otherwise have to live in the
element's own source to exist at all. The async `data-source` hooks (`fetchNodes`,
`fetchEdges`) are declared even though lazy fetching itself is deferred, because retrofitting a
hook later changes the contract for everyone who already wrote a plugin against it.

**The accelerator factory is called with the ceiling it must respect.**

```ts
type AcceleratorFactory = (options?: { exactMaxNodes?: number })
  => Promise<GraphAccelerator | null>;
```

`exactMaxNodes` is the largest graph the element will ask this accelerator to compute exactly,
and the element passes it when it calls the factory. A backend that must size buffers, choose an
index width or decide it cannot serve a graph this large needs that number before it builds
anything, and asking for it at construction time means a factory answers `null` once instead of
failing on the first run. The parameter is optional so a factory that does not care writes
`() => create()` and ignores it.

`registry.load(url)` is the markup door's engine: `<graphty-plugin src="...">` imports an ES
module by URL and registers its default export, reporting what it registered. That is what
makes a plugin usable from a page with no build step at all.

**Breaking: double registration is defined.** An identical implementation is a no-op (HMR fires this
constantly); a different one warns once and wins; `{strict: true}` throws
`E_DUPLICATE_PLUGIN`. Today three module-global singleton `Map`s silently overwrite and read
`type` off the class with an `any` cast, so a class missing its statics registers under
`"undefined:undefined"` -- and root `CLAUDE.md` advertises `LayoutRegistry`,
`DataSourceRegistry` and `AlgorithmRegistry`, none of which exist under those names.

#### 4.14.1 An algorithm plugin

```ts
export const triangles = defineAlgorithm({
  key: "acme:triangles",
  plainName: "Triangle count", technicalName: "triangles",
  description: "Counts triangles through each node.",
  category: "structure",
  shape: "node-metric",
  costClass: "iterative",
  complexity: "O(n * d^2)",
  cost: (n, m) => (n + m) / 2e7,
  requires: { directed: false },
  fields: [{ name: "value", kind: "node", type: "number",
             plainName: "Triangles", technicalName: "triangles", path: "results.$.value" }],
  options: [
    { name: "minDegree", type: "integer", default: 2, min: 0,
      plainName: "Minimum degree", group: "basic", advanced: false },
    { name: "chunk", plainName: "Chunk size", type: "integer", default: 4096,
      internal: true },
  ],
  async run({ graph, scope, options, signal, report, yieldNow }): Promise<AlgorithmOutput> {
    const out = new Float64Array(graph.nodeCount);
    for (let i = 0; i < graph.nodeCount; i++) {
      signal.throwIfAborted();
      out[i] = countTriangles(graph, i);
      if (i % 1000 === 0) { report({ completed: i, total: graph.nodeCount }); await yieldNow(); }
    }
    return { nodes: { value: out } };
  },
});

type AlgorithmOutput = {
  nodes?: Record<string, ArrayLike<number> | readonly string[]>;
  edges?: Record<string, ArrayLike<number> | readonly string[]>;
  graph?: Record<string, number | string | boolean | readonly unknown[]>;
};
```

**Breaking: the algorithm contract is defined over the data, not over render objects.** Today
`abstract run(g: Graph)` forces a plugin author onto the 4,147-line `Graph` and on `Node`/`Edge`
objects that carry Babylon meshes; `AlgorithmStatics` is not in the barrel,
`LayoutEngineStatics` is not exported at all, and `toAlgorithmGraph` -- the only way to get a
runnable graph -- is not exported either. The extension point is unusable as shipped.

`graph` is a `ReadonlyGraphData`: id arrays, CSR adjacency and attribute columns, expressed in
the graph-format vocabulary and reachable from `./format` (section 6). **Results are returned,
not written through side effects**, so a run is pure, cancellable and structured-cloneable by
construction. That is the difference between "we can move this to a worker later" and "we
cannot", and it is why it is stated in the contract rather than implied.

`defineLayout` takes the same descriptor plus `kind: "live" | "batch"`, `maxDimensions`,
`sizeRating` and `structuralInputs` -- which is what lets a consumer's option form render a node
picker, a partition picker or an ordering picker instead of a raw text field.

---

### 4.15 Catalogue, attributes, metrics

#### 4.15.1 One expression root, published

```
{
  data:    { <attribute>: value, ... },        // imported, joined and computed attributes
  results: { <runId>: { <field>: value, ... } } // every run's fields
}
```

That root is public API: it is the same for style selectors, filters, select-by-expression,
pattern constraints, delegated listeners and the palette's `=` prefix. `algorithmResults.*` is
removed.

#### 4.15.2 Attribute and metric descriptors

```ts
interface AttributeDescriptor {
  path: Path;                       // "data.betweenness_centrality"
  token: string;                    // "[betweenness_centrality]" for a formula
  name: string; plainName: string; technicalName: string;
  kind: "node" | "edge";
  type: AttributeType;
  origin: "imported" | "joined" | "computed" | "result";
  completeness: number;             // 0..1
  uniqueCount?: number; min?: number; max?: number;
  sampleValues: readonly unknown[];
  runId?: RunId;                    // when origin is "result"
}

interface CatalogApi {
  algorithms(): readonly AlgorithmDescriptor[];
  layouts(): readonly LayoutDescriptor[];
  formats(): readonly FormatDescriptor[];
  palettes(): readonly PaletteDescriptor[];
  scales(): readonly ScaleDescriptor[];
  themes(): readonly ThemeDescriptor[];
  functions(): readonly FunctionDescriptor[];
  timeAttributes(): readonly AttributeDescriptor[];
  metrics(): readonly MetricAvailability[];
  applicable(): readonly MetricAvailability[];        // alias, scoped to this graph
  validate(query: Query, o?: { kind?: "selector" | "filter" | "formula" }):
    QueryValidation;
  optionsFor(key: AlgorithmKey | LayoutId, scope?: Scope):
    Promise<readonly OptionDescriptor[]>;      // bounds resolved against THIS graph
}

interface QueryValidation {
  ok: boolean;
  error?: { code: GraphtyErrorCode; message: string; position: number };
  unresolvedPaths: readonly { path: Path; reason: "unknown-run" | "unknown-attribute";
                              candidates: readonly string[] }[];
}

interface MetricAvailability {
  key: AlgorithmKey; plainName: string; technicalName: string;
  available: boolean; reason?: string;
  costClass: CostClass; estimateSeconds: number;
  hasRun: boolean; runIds: readonly RunId[];
}
```

`catalog.metrics()` includes **metrics that have not been run**, which is what fills a "not
computed yet" group in a metrics panel and what makes the catalogue self-describing: a stranger
can see everything the element could compute, with a cost and an availability reason beside
each entry, before computing anything. `applicable()` is a runtime query, not a static list, because
availability depends on the accelerator and on the graph's shape. It is the one call that
replaces the eligibility half of `graphty/src/components/shell/insights/insightsRules.ts` (489
lines) and the whole of `graphty/src/components/algorithmCatalog.ts` (279 lines),
`graphty/src/data/layoutSchemas.ts` (282) and `graphty/src/data/layoutMetadata.ts` (167).

`catalog.validate(query)` returns an inline error position, because any form that accepts an
expression has to report the mistake where it was typed, and because a selector that never
parses currently never matches and never says so.

**Validation covers references, not only syntax**, and this is the inverted half of the
empty-selector defect (8.1): an expression that parses perfectly and names a run id or an
attribute that does not exist matches *nothing*, silently, which reads exactly like a correct
answer of zero. So every place a `Query` or a `Selector` enters the session, the referenced
paths are resolved against the current run list and `data.attributes()`:

- `styles.add` / `update` / `encode` and `styles.validate`: an unknown `results.<runId>` is
  `E_UNKNOWN_RUN` and an unknown `data.<attribute>` is `E_UNKNOWN_ATTRIBUTE`, each with the
  nearest three candidates, exactly as the formula grammar already does (4.3.4). A layer is not
  added against a path nothing can answer.
- `selection.apply` and `visibility.set`, where matching nothing is a **legitimate** answer and
  a throw would be wrong: the paths that resolved to nothing come back on
  `SelectionDelta.unresolvedPaths` and `FilterResult.unresolvedPaths`, beside the counts, so a
  consumer can say "0 matched -- `results.betweeness.value` is not a path on this session" with
  no work of its own.
- `catalog.validate(query)` returns the same list without running anything, which is what an
  inline form field calls on every keystroke.

`optionsFor(key, scope)` is the same idea for option **bounds**: `OptionDescriptor.min`/`max`
may be a literal or a reference (`{ from: "graph.maxCore" }`, `{ from: "graph.nodeCount" }`),
and `optionsFor` returns the descriptors with those references resolved against this graph, so
a k-core slider bounded by "up to the largest core in this graph" renders correctly instead of
guessing. The static descriptor is still plain JSON and still ships in the catalogue.

**Every descriptor carries a plain name and a technical name.** Both are always renderable and
which is primary is the consumer's preference. Names are data on the descriptor, never strings
in an app.

#### 4.15.3 Notes: the primitives, and the model

People annotate graphs: a comment pinned to a node, a flag on an edge, a marker they can find
again. The element owns the notes themselves, the things a note system cannot compute for
itself, and the one rule that is graph semantics rather than product policy:

It hangs off the session as `session.notes` (4.2), beside the other model APIs, because a note
is a fact about the graph rather than about a renderer.

```ts
interface Note {
  readonly id: NoteId;
  readonly target: { node: NodeId } | { edge: EdgeId } | { point: [number, number, number] };
  text: string;
  tags: readonly string[];
  author?: string;
  readonly createdAt: string;                // ISO 8601
  readonly updatedAt: string;
  /** Set when the target left the graph. The note is kept and still listed. */
  readonly orphaned?: { since: string; lastTarget: string };
  userData?: Record<string, unknown>;        // round-trips untouched
}

interface NotesApi {
  readonly markerChannel: "node.marker";     // a reserved, locked element layer drives it
  list(o?: { target?: NodeId | EdgeId; tag?: string; orphaned?: boolean }): readonly Note[];
  get(id: NoteId): Note | undefined;
  add(spec: Omit<Note, "id" | "createdAt" | "updatedAt">): Run<Note>;
  update(id: NoteId, patch: Partial<Pick<Note, "text" | "tags" | "author" | "userData">>): Run<Note>;
  remove(id: NoteId): Run<void>;
  count(id: NodeId | EdgeId): number;        // the synthetic per-element note count
  clusterMarkers(o?: { gridPx?: number; above?: number }):
    readonly { x: number; y: number; count: number; ids: readonly (NodeId | EdgeId)[] }[];
  toDocument(): AnnotationSet;                                     // SYNCHRONOUS
  applyDocument(doc: AnnotationSet): Run<BindingReport>;
}
```

Plus `view.worldToScreen()` for the DOM hover card and `MutationReceipt.retargeted` so a merge
retargets notes to the survivor. The rule that is graph semantics and therefore the element's:
**a note whose target is no longer in the graph is kept and reported, never dropped.** It gains
an `orphaned` stamp and still appears in `list()`; `data.apply` returns `retargeted`, so a
consumer that walks it cannot lose a note by accident.

**The element owns note storage, and notes are a document.** The alternative -- primitives here,
storage and text with the consumer -- was the first shape of this design, and it fails the same
test the rest of the API is built on: every consumer would write the same store, and no note
would be portable between two of them. It also undoes the reason annotations exist. A note is
how a reader records a judgement about a graph WITHOUT editing the graph, so the data can stay
immutable; that property is worth nothing if the notes are trapped in one application's local
storage while the data travels. Marker clustering above 200 markers on a 64 px screen-space grid
stays the element's for a different reason: it needs screen positions every frame.

What stays with the consumer is presentation: the hover card, the editor, the tag picker, the
author identity. `Note.userData` round-trips untouched for whatever else a product needs.

#### 4.15.4 Worked example: build an options form with no hard-coded list

```js
const s = el.session;
for (const m of s.catalog.metrics()) {
  const row = document.createElement("option");
  row.value = m.key;
  row.textContent = m.hasRun ? `${m.plainName} (run)` : m.plainName;
  row.disabled = !m.available;
  row.title = m.reason ?? `about ${m.estimateSeconds.toFixed(1)} s`;
  picker.append(row);
}
const algo = s.catalog.algorithms().find((a) => a.key === picker.value);
for (const opt of algo.options.filter((o) => !o.internal && !o.advanced)) {
  form.append(controlFor(opt));       // opt is plain JSON: type, default, min, max, values
}
```

---

## 5. Worked examples

Every area of section 4 ends with a runnable example, because an example separated from its
signatures is an example that goes stale. The index:

| Example | Where |
|---|---|
| A status bar with no session | 4.1.3 |
| Compare (two views, one session) and a session in a Node test | 4.2.4 |
| Inspect, correct the mapping, import, inspect one node's neighbours | 4.3.7 |
| A cost-gated sweep with a queue and a cancel | 4.4.6 |
| Filter, count before applying, select the survivors | 4.5.4 |
| Colour by a metric, then ask why one node is that colour | 4.6.4 |
| Recommend a layout, settle it, pin the selection | 4.7 |
| Estimate an export, capture a PNG with a legend, build a report | 4.9 |
| Undo from a serialisable inverse; replay a recipe on another file | 4.11.2 |
| Build an options form with no hard-coded list | 4.15.4 |
| The first graph, from a CDN and from npm | 2.1, 2.2 |

## 6. Packaging

### 6.1 The exports map, entry by entry

```jsonc
{
  "name": "@graphty/graphty-element",
  "version": "2.0.0",
  "type": "module",
  "customElements": "./dist/custom-elements.json",
  "exports": {
    ".":          { "types": "./dist/index.d.ts",    "import": "./dist/graphty.js" },
    "./session":  { "types": "./dist/session.d.ts",  "import": "./dist/session.js" },
    "./schema":   { "types": "./dist/schema.d.ts",   "import": "./dist/schema.js" },
    "./catalog":  { "types": "./dist/catalog.d.ts",  "import": "./dist/catalog.js" },
    "./commands": { "types": "./dist/commands.d.ts", "import": "./dist/commands.js" },
    "./extend":   { "types": "./dist/extend.d.ts",   "import": "./dist/extend.js" },
    "./format":   { "types": "./dist/format.d.ts",   "import": "./dist/format.js" },
    "./react":    { "types": "./dist/react.d.ts",    "import": "./dist/react.js" },
    "./webgpu":   { "types": "./dist/webgpu.d.ts",   "import": "./dist/webgpu.js" },
    "./io/*":     { "types": "./dist/io/*.d.ts",     "import": "./dist/io/*.js" },
    "./ai":       { "types": "./dist/ai.d.ts",       "import": "./dist/ai.js" },
    "./bundle":   "./dist/graphty.bundle.js",
    "./custom-elements.json": "./dist/custom-elements.json"
  },
  "sideEffects": ["./dist/graphty.js", "./dist/graphty.bundle.js", "./dist/webgpu.js",
                  "./dist/io/*.js", "./dist/compat.js"]
}
```

| Entry | Babylon | DOM | Node-safe | Side effects | What it is |
|---|---|---|---|---|---|
| `.` | yes | yes | no | defines `<graphty-element>`, registers built-ins | the ordinary consumer |
| `./session` | **no** | **no** | **yes** | none | `createGraphSession`, `createComparison`, the whole model API |
| `./schema` | **no** | **no** | **yes** | none | `Layer`/`Encoding`/`Theme` types and validators, palettes, `NodeShapes`, `ResultShape`, `defaultNodeStyle` |
| `./catalog` | **no** | **no** | **yes** | none | descriptors for an options UI without a 3D engine |
| `./commands` | **no** | **no** | **yes** | none | the `Command` union, typed builders, `parsePattern`, `formatCommand`, the JSON Schema |
| `./extend` | **no** | **no** | **yes** | none | `use`, `createRegistry`, the ten plugin contracts |
| `./format` | **no** | **no** | **yes** | none | the narrow graph-format decode vocabulary (section 6.2) |
| `./react` | yes | yes | no | none | `@lit/react` wrappers, real prop names, typed payloads |
| `./webgpu` | no | yes | no | registers the accelerator | the entire GPU integration |
| `./io/*` | **no** | **no** | **yes** | registers one format | lazy per-format registration |
| `./ai` | no | yes | partial | none | the AI stack, behind optional peers |
| `./bundle` | inlined | yes | no | defines the tags | the CDN script tag |

`.` deliberately keeps its side effect: every web component package defines its tag on the
default import, and a stranger's CDN one-liner depends on it. Splitting that into `/define`
buys tree-shaking for a bundle dominated by a 3D engine anyway. The real pain is elsewhere --
the app cannot import a colour ramp without pulling in Babylon, and works around it three
ways: a copied `VIRIDIS_RAMP`
(`graphty/src/components/shell/defaults/nodeMetricStyle.ts:176`), a relative-path import of
element source in a test (`graphty/src/constants/__tests__/style-options.test.ts:8`), and a
73-line `declare module` shim that shadows the real types
(`graphty/src/types/graphty-element.d.ts`). `./schema`, `./catalog` and `./session` are the fix,
and they are the Compare and Node-test entry points at the same time.

**Breaking: the exports map becomes a map.** Today it is one entry (`"."` with `types`, `import` and
`require`), `main` is a UMD `.cjs`, there is no `customElements` field, and `sideEffects` lists
three `src/` paths that are not even published (`files` is `["dist/","README.md","LICENSE"]`).

**Breaking: sourcemaps leave the tarball.** 41 MB unpacked today, 26 MB of it `.map`. "Install
graphty-element" must not be a 41 MB download for someone evaluating the library.

### 6.2 Siblings: narrow re-export, quarantined

Three rules, each with a failure mode.

1. **Every `@graphty/*` sibling is externalised in the build**, and `@graphty/graph-format` is
   declared in **both** `dependencies` (`workspace:^`) and `peerDependencies` (`^1.0.0`), as
   graph-io and webgpu-graph-algorithms already do. Today `graphty-element/vite.config.ts`
   externalises only Babylon, web-llm and Lit, so `@graphty/algorithms` and `@graphty/layout`
   are inlined into a 2.5 MB `dist/graphty.js`; a consumer who also installs
   `@graphty/algorithms` gets two copies. *Silent failure:* "delegate to a peer" is a fiction
   until this changes, and a duplicated graph-format means two `.d.ts` identities that do not
   assign to each other.
2. **The graph-format decode vocabulary lives behind `./format`, and nothing sibling-typed is in
   the root barrel.** `./format` re-exports exactly what is needed to READ what the element
   returns: the `GraphSnapshot` type, `isGraphSnapshot`, `INVALID_INDEX`, `NodeMask`/`EdgeMask`
   and the four mask helpers, `expandEdges`, `foldArcs`, `gatherArray`/`scatterArray`/
   `remapArray`, `DerivedGraph`, `AdjacencyView` and the scalar aliases. It re-exports **nothing**
   of the construction or wire halves. *Silent failure avoided:* re-exporting format types from
   the root barrel means a graph-format major forces a graphty-element major, forever.
3. **`SNAPSHOT_BRAND` and `FORMAT_VERSION` are never re-exported.** The supported check is
   `isGraphSnapshot`. *Silent failure:* a consumer stamps the brand on a hand-made object and
   produces a snapshot that passes the check and violates the format's invariants.

Nothing named `Node`, `Edge`, `Graph`, `Position` or `NodeId` is ever flat-re-exported from a
sibling: `@graphty/algorithms` and `@graphty/layout` export incompatible `Node`/`Edge` pairs
(`algorithms/src/types/index.ts:9,18` versus `layout/src/types/graph.ts:5,7`) and the element
exports classes with those names. Three incompatible pairs cannot coexist in one barrel.

**Breaking: the AI surface (~45 exports) moves to `./ai`, and the three `@ai-sdk/*` packages, `ai`
and `encrypt-storage` become optional peers.** Three LLM provider SDKs and an encrypted key
store are not runtime dependencies of a graph renderer. What an agent actually needs -- the
command union and the catalogue -- is published as data by `./commands` and `./catalog`.

### 6.3 Framework interop

| Framework | What you write |
|---|---|
| Plain HTML / CDN | one `<script type="module" src=".../bundle">`, then the markup in section 2.1 |
| React 19 | `import "@graphty/graphty-element"`, then JSX; props matching a property are assigned as properties |
| React 18 | `import { GraphtyGraph } from "@graphty/graphty-element/react"` for typed `onNodeClick` props |
| Vue 3 | `app.config.compilerOptions.isCustomElement = (t) => t.startsWith("graphty-")`; `.prop` for rich values |
| Svelte | nothing |
| Angular | `CUSTOM_ELEMENTS_SCHEMA` |
| Solid | nothing |

SSR: `./session` runs in Node; `.` does not. An SSR consumer gets a correctly sized placeholder
and hydrates client-side, and the frameworks page says so.

### 6.4 TypeScript

```ts
import "@graphty/graphty-element";
import type { GraphtyGraphElement, Run, Layer, NodeRecord, Command }
  from "@graphty/graphty-element";
import { createGraphSession } from "@graphty/graphty-element/session";
import { NodeShapes, palettes, defaultNodeStyle } from "@graphty/graphty-element/schema";

declare global {
  interface HTMLElementTagNameMap { "graphty-element": GraphtyGraphElement }
  interface GraphtyEventMap {
    "graphty-ready": CustomEvent<Record<string, never>>;
    "graphty-node-click": CustomEvent<NodeClickDetail>;
    "graphty-selection-change": CustomEvent<SelectionDelta>;
    // The remaining eighteen follow the same pattern; each detail type is spelled out in
    // the reference table of 4.10.1 and generated into custom-elements.json at build.
    "graphty-edge-click": CustomEvent<EdgeClickDetail>;
    "graphty-run-change": CustomEvent<{ run: RunRecord; phase: string }>;
  }
  interface HTMLElementEventMap extends GraphtyEventMap {}
}
```

The augmentations ship from `.`, where the side effect lives, so the tag and its types travel
together. `document.querySelector("graphty-element")` is typed with no cast, and
`el.addEventListener("graphty-node-click", (e) => e.detail.node.id)` type-checks in a file that
imports nothing. Today there is no augmentation anywhere in the package, which is why the one
consumer hand-wrote the tag map and a React JSX augmentation in a 73-line shim that shadows the
real types and declares five properties that do not exist.

One spelling rule, because a typo'd property read has no runtime error: **identifiers are US
English** -- `color`, `license`, `normalization`, `canceled`, `neighbors`, `colorblindSafe` --
matching the DOM and the wider ecosystem, and matching the channel names, which cannot change.
The prose in this document is British; the API is not, and the two are never mixed inside a
name.

Other rules: no generics at the element boundary (a custom element class cannot be generic and
`querySelector` cannot recover a type argument); `readonly` on everything handed out; callbacks
return `void` and take non-optional parameters; discriminated unions for `Filter`, `Scope`,
`Selector`, `LayerSource`, `Mutation`, `Command` and `Plugin`, so a `switch` narrows.

### 6.5 Documentation, generated from one declaration

- `custom-elements.json` is complete and discoverable: the `customElements` field points at it;
  every attribute with its default, every property, every method, all twenty-three DOM events with
  their `detail` types, both slots, no `#private` members. Today it is generated from one file,
  ships without the field so no tool can find it, records 18 `#private` fields among its 34
  `field` members (19 `#`-prefixed members in all; measured against
  `graphty-element/dist/custom-elements.json` on 2026-09-19), and lists
  `events: [{ type: { text: "CustomEvent" } }]` -- one nameless entry.
- One hand-written `API.md` carrying the whole surface, which is the first thing a coding agent
  is pointed at.
- `/llms.txt` plus per-page `.md` twins at `graphty.app/docs/graphty-element/`, so an agent
  fetches 5-20 KB rather than parsing 195 KB of VitePress HTML.
- `dist/graphty-commands.json` and its JSON Schema, emitted at build from the command union.
- **Every code block in the docs is a test.** The current quickstart is wrong in three
  independent ways at once, which is the signature of prose written once and never run.
- The published README's ten links move from `graphty.app/docs/graphty/` (a 404) to
  `/docs/graphty-element/`, with a redirect kept at the old path for the historical 1.x READMEs.

---

## 7. The graph logic the application stops having to write

Six files in the graphty app, 2,665 lines between them, exist only because the element does not
offer something. Each row names the file, what it does, the API that makes it unnecessary, and
what survives.

| File (lines) | What it does | The API that deletes it | Residue |
|---|---|---|---|
| `graphty/src/components/shell/analysis/nodeMetrics.ts` (923) | result statistics, ranking, normalization reconstruction, `linearBandPlan`, `logBandPlan`, `METRIC_DISTRIBUTION_MAX_BINS` | `RunResult.summary()`, `.ranking()`, `.histogram()`, `.column()`, `.reading()`, plus uniform `value`/`rank`/`percentile` fields (4.4.3, 4.4.4) and the newly published min/max that betweenness and closeness withheld | none |
| `graphty/src/components/shell/defaults/nodeMetricStyle.ts` (671) | builds style layers, copies `VIRIDIS_RAMP` (line 176), reimplements `viridisAt` (250), hardcodes `"default"`/`"selection"` layer names (347, 358), writes `handBound` into element metadata (411), parses output paths to find the driven channel | `styles.encode()` writes the layer and the selector; `./schema` exports the palettes without Babylon; `layer.source.by === "element"` and `locked` replace the name match; `layer.userData` is the documented consumer bag; `styles.explain().channels` answers which channel a layer drives | none |
| `graphty/src/components/shell/analysis/metricCost.ts` (449) | a performance model of the element's own algorithms, with `PAGERANK_ITERATION_BOUND = 100` copied from an element default | `session.estimate()` (synchronous), `session.plan()`, `session.calibrate()`, `catalog.metrics()` carrying `costClass` and `estimateSeconds` | `askLimitSeconds`/`warnLimitSeconds` stay a reader preference, now in `config` |
| `graphty/src/components/shell/analysis/graphShape.ts` (353) | `edgeEndpoints` two-spelling coercion, an 80-line union-find, a tri-state directedness vote, one O(n+m) shape pass | `data.statistics()` including `components` with its `sizes` distribution (4.3.5); canonical `source`/`target` fixes the endpoint spellings; `data.neighbors()` retires `edgeEndpoints` from the shell | none |
| `graphty/src/components/shell/analysis/elementBridge.ts` (196) | `REQUIRED_GRAPH_METHODS` duck-typing, five structural mirror interfaces, `readResultPath`, a mandatory `repaintStyles` | `element.ready`; typed `Run.result`/`ElementView.results`; `styles.add()` now repaints, so a forced repaint has no reason to exist; `styles.removeBySource()` | none |
| `graphty/src/types/graphty-element.d.ts` (73) | re-declares the module because the real types are unreachable | the new exports map, shipped `HTMLElementTagNameMap` and `GraphtyEventMap`, a typed element class | none |

The wider sweep, briefly: `zodSchemaParser.ts` (249) and `OptionsForm.tsx`'s copy die with the switch to plain JSON option descriptors;
`algorithmCatalog.ts` (279), `layoutSchemas.ts` (282) and `layoutMetadata.ts` (167) die with
`catalog.*`; `layerConversion.ts` (84) dies with the new layer model; `calculatedChannels.ts` (311) dies with
`styles.explain().channels` and `resolveToStatic()`; the format sniffing in `Graphty.tsx`
(150-225) dies with `data.inspect()`; `legendChannels.ts` (263) dies with `styles.legend()`;
`useGraphInfo.ts`'s density arithmetic dies with `data.statistics()`; `loadDefaults.ts:466-494`
dies with `layout.recommend()`; `types/ai.ts` (~200) dies with `./ai`. Roughly half of
`styleBridge.ts` (918) dies with **Breaking: units and spellings are settled once in the element** --
opacity is `0..1` everywhere, shape names have one spelling, `effect` is not sometimes
`effects`. The other half dies with `./schema` exporting the canonicalisers
`normalizeNodeStyle` / `normalizeEdgeStyle`, so a consumer cannot mint a duplicate interned
style id by writing a non-canonical shape.

What the app **keeps**, so the design does not over-correct: all user-visible copy and card
templates; cap and priority policy; persistence of reader preferences; the undo stack, the
panel layout, the keyboard bindings and the layer list UI; and dimming what an algorithm did not
select, which is a reader's choice and must never ship in a suggested layer.

---

## 8. The element bugs, made structurally impossible

"Fixed" means the defect can still be written and is caught. "Structural" means the defect
cannot be expressed in the API at all. Five bugs; five structural answers.

### 8.1 `selector: ""` paints the whole graph

**Today.** `graphty-element/src/Styles.ts:452` is `let nodeMatch = node.selector.length === 0;`
and `Styles.ts:323` and `:355` are `let edgeMatch = edge?.selector === "";` -- an empty selector
matches every node and every edge. Ten layer halves across seven shipped algorithm files use it:
`DegreeAlgorithm.ts:16`, `BetweennessCentralityAlgorithm.ts:26`,
`ClosenessCentralityAlgorithm.ts:26`, `EigenvectorCentralityAlgorithm.ts:142`,
`KatzCentralityAlgorithm.ts:179`, `HITSAlgorithm.ts:143` and `:160`, `PageRankAlgorithm.ts:165`,
`MaxFlowAlgorithm.ts:85` and `:100`. Twenty other suggested layers in the same directory are
correctly scoped, so the pattern is already the majority and these seven are the outliers.

**Six mechanisms, any one of which would help and all of which ship.**

1. **`Selector` is a tagged union.** There is no empty string to type. `{ match: "everything" }`
   is the universal, spelled out, greppable and lintable.
2. **`styles.add()` validates and rejects.** An unparseable expression is `E_BAD_SELECTOR` with
   a character offset; an empty `where` is `E_SELECTOR_EMPTY`; a `results.<runId>` or
   `data.<attribute>` that nothing in the session answers is `E_UNKNOWN_RUN` /
   `E_UNKNOWN_ATTRIBUTE` with the nearest three candidates (4.15.2) -- because a selector that
   parses and names a run that does not exist is the same defect inverted: it matches nothing,
   silently, and reads like a correct zero. `styles.validate(spec)` answers all of that
   synchronously, so a form can say it before the user commits. Today `addLayer` does no
   validation whatsoever, so a malformed layer is accepted in silence and simply never matches.
3. **`encode()` generates the selector**, so the easy path is the scoped path and nobody
   hand-writes a selector to colour by a metric.
4. **`missing` defaults to `"skip"`**, so even a hand-written over-broad selector does not paint
   an unmeasured element -- not to a default, not to grey, not to full opacity.
5. **`E_UNSCOPED_RUN_ENCODING`**: a universal selector combined with a run-bound encoding is a
   validation error. There is no accepted spelling of "paint the whole graph from one run's
   values". This is the mechanism that closes the case the other four leave open, a deliberately
   hand-written broad selector over run values.
6. **Suggested layers are derived, not authored.** An algorithm declares its shape and fields;
   the element derives the layer. There is no per-algorithm styling code to get wrong, so the
   seven non-compliant files disappear as a class rather than one at a time. A CI test asserts
   that every catalogue entry's derived layer has a scoped selector and `missing: "skip"` -- the
   rule is in root `CLAUDE.md` today and is enforced by nothing.

**Breaking: the seven algorithms' pictures change, and PageRank stops writing `style.shape.size`**,
which collides with the element's own tuned node defaults.

### 8.2 `viridis(undefined)` throws and aborts the repaint

**Today**, with an empty selector the calculated value runs on a node the algorithm never
measured, so `arguments[0]` is `undefined`. The trace:
`utils/styleHelpers/color/sequential.ts:26` calls `interpolatePalette`;
`color/interpolation.ts:64` computes `Math.max(0, Math.min(1, undefined))` = `NaN`, so
`index1 = Math.floor(NaN) = NaN` and `colors[NaN]` is `undefined`; `interpolation.ts:45` calls
`hexToRgb(undefined)`, which at `interpolation.ts:11-14` runs a regex and throws
`Invalid hex color: undefined`. `CalculatedValue.run` has no try/catch
(`graphty-element/src/CalculatedValue.ts:77-87`) and neither does
`ChangeManager.runAllCalculatedValues`, so the throw escapes into
`DataManager.applyStylesToExistingNodes` (`src/managers/DataManager.ts:85-101`) and aborts the
repaint loop part way through: **every node after the offender keeps its old style.**

**Structural, not fixed.** The expression evaluator is deleted. A `Binding` is data, the
scale set is closed, and `missing: "skip"` means an element with no value for `by` is never
written -- so `viridis(undefined)` cannot be constructed. A registered scale's `map` is still
consumer code, so it is guarded per element: a throw disables the layer with a reason and emits
one deduped `style:error`, never once per node, and never aborting a frame. The class dies with
the evaluator; the remainder is bounded.

### 8.3 `addLayer` does not apply the layer

**Today.** `Styles.addLayer` is `this.#layers.push(layer); // TODO: recalculate`
(`graphty-element/src/Styles.ts:130-133`). The compensating `style-changed` handler
(`src/Graph.ts:382-400`) diverges from the correct path (`src/managers/DataManager.ts:85-101`)
in three load-bearing ways: no `algorithmResults` passed to `getStyleForNode`, so an
`algorithmResults.*` selector cannot match; no `runImmediately` on `loadCalculatedValues`, so
calculated values are registered and never run; and no `n.update()`, so a value that did run is
never merged into a style id. The element's own algorithm path does the right thing
(`src/managers/AlgorithmManager.ts:103-104`), which is why the defect only shows for layers
added afterwards -- and why the one consumer wrote a module whose whole purpose is to force a
repaint.

**Fixed, and enforced.** This one is a contract rather than an impossibility: an
implementation can still push a layer and skip the repaint. What changes is that nothing can
*hide* it. There
is exactly one write door, `styles.add/update/remove/move/encode/highlight`, and each is a
`Run` that resolves only when the repaint has completed -- a repaint that did not happen is an
unresolved command, not a silently skipped one. There is no public
`applyStylesToExistingNodes` to compensate with. The enforcement is three post-conditions in
CI: every write verb's test asserts that the returned `Layer.enabled` is true **and** that the
affected elements carry the layer's resolved style id; a test adds a layer with a `results.*`
selector *after* a run has completed and asserts it matches (the exact divergence at
`graphty-element/src/Graph.ts:382-400` versus `src/managers/DataManager.ts:85-101`); and a test
adds a layer with a calculated-free encoding and asserts the node style id changed. The class
of defect survives only as a test failure.

### 8.4 A `calculatedStyle` nested inside `style` is dropped in silence

**Today** `Styles.getCalculatedStylesForNode` reads only the sibling, so a nested one is dropped
with no error, no encoding and nothing to debug from -- and
`graphty/src/components/RunAlgorithmModal.tsx:236-247` does exactly that nesting, which means
the modal's "apply suggested styles" checkbox applies the static half of each suggested layer
and silently discards the calculated half, i.e. for the seven gradient layers the entire
encoding.

**Structural.** The shape no longer exists: a layer has `set` (literals) and `encode`
(bindings), and there is no nesting to get wrong. An unknown key in a `LayerSpec` is
`E_BAD_LAYER` with the path, because **silent acceptance of a wrong shape is banned** -- the
same rule that closes the two other members of this defect class, unresolved edge endpoints and a selector that never parses (8.1 mechanism 2).

### 8.5 Documented events that throw on subscribe

**Today** four documented events throw on subscribe because `EventManager.addListener`'s switch
has no case and ends in `throw new TypeError` (`src/managers/EventManager.ts:450`);
`edge-click` and eleven `ai-*` events are declared and never emitted; `Graph.on()` returns
`void`, so a listener can never be removed; and the element forwards roughly fifty unprefixed
internal names to the DOM.

**Structural.** The catalogue is closed and declared in one place: the twenty-three DOM events of
the table in 4.10.1, each with `@fires`, and the thirteen session events of 4.10.2, all in
`custom-elements.json` and in `GraphtyEventMap`. A CI test asserts the three lists agree, and
asserts them against the two tables in this document rather than against a number written in
prose -- the declaration, the emitter table and the type map -- so an
event that is declared and never emitted fails the build, and an event that is emitted and not
declared fails it too. `on()` returns its own unsubscribe, so there is no `off` to forget and no
symbol to keep.

---

## 9. What the API supports, what it breaks, and what it defers

### 9.1 What the API supports

Each entry names something a person or a program wants to do with a graph, then the API that
does it. Everything named here is specified in section 4.

**Getting data in**

- *See what is inside a file before committing to it.* `data.inspect()` reports the detected
  format and text encoding with a confidence and the alternatives it considered, every column
  with an inferred type, a completeness fraction and sample values, a proposed import plan, a
  size estimate and a quality score.
- *Correct a mapping the element guessed wrong.* Edit the returned `ImportPlan` -- the id
  column, the endpoint columns, the weight, time and label roles, per-column include, type and
  rename, and the policies for repeated edges, unknown endpoints and self-loops -- and hand it
  to `data.import()`.
- *Load something large without freezing the page.* `import()` streams, reports progress by
  node count, yields to the render loop between chunks, honours an `AbortSignal`, and leaves
  the graph interactive with the prefix that has arrived. `ImportOptions` adds a random subset,
  a byte-offset resume and a memory budget.
- *Find out what the import could not do.* `ImportReport` counts self-loops, repeated edges,
  isolated nodes and unresolved endpoints, lists issues with severity, line and column, and
  attaches an undoable `Command` to each issue that has an automatic fix. Edges whose endpoints
  do not resolve are reported rather than dropped, and the element says which pair of endpoint
  column names it ended up using.
- *Have a graph without having a file.* `data.sample()`, over the built-in datasets listed by
  `data.samples()`.
- *Write the graph back out.* `data.export()` and `exportStream()` cover the interchange
  formats through the format registry -- which is also how a plugin adds one -- carrying a
  manifest of the runs that produced each column and a list of what the format could not
  represent.

**Understanding the graph you have**

- *Read the shape of the graph without computing it.* `data.statistics()` is maintained and
  O(1): node and edge counts, density, a genuine tri-state directedness, whether it is
  weighted, self-loop and repeated-edge counts, the degree range, and the connected components
  with their size distribution and a per-node lookup.
- *Look at one node's neighbourhood.* `data.neighbors()` pages, filters by edge type, sorts by
  degree, weight, recency or label, and returns counts per edge type.
- *Find a node by name or id.* `data.find()`, over an index the element builds at load.
- *Find every place a shape occurs.* `data.match()`, over a subgraph pattern or its one-line
  text form, with ranked and approximate matches and a scanned fraction.
- *Grow the graph outward.* `data.expand()` with depth, direction, type filters and a hard
  limit; per-type counts in advance from `plan()`; provenance on everything it added; and
  `data.collapse()` to take it back.
- *Derive a new number and treat it like any other attribute.* `data.compute(name, formula)`.
- *Edit the graph and undo the edit.* Every mutation returns a receipt whose `inverse` is
  itself a command.

**Running algorithms**

- *Run an algorithm and get the answer back from the call.* `runs.start()` returns a `Run`;
  awaiting it gives a `RunResult`.
- *Watch a long computation, queue it, time-box it, cancel it.* `run.progress` with a phase and
  an honest null fraction when it is indeterminate, `run.queuePosition`,
  `StartOptions.timeBoxMs`, `run.cancel()` and `RunOptions.signal`. A run that hits its time box
  resolves with `partial: true` and a reason, because a stopped-early result is data rather than
  a failure.
- *Know what a computation will cost before starting it.* `session.estimate()` synchronously,
  `session.plan()` for the fuller answer, `catalog.metrics()` for a cost class and a predicted
  duration per algorithm, and `session.calibrate()` to measure this machine rather than guess.
- *Set weight and direction on every algorithm, and see what was used.* `StartOptions` takes
  them; `Caveats.weight` and `Caveats.direction` report them back.
- *Run the analysis somewhere other than the main thread.*
  `createGraphSession({ host: "worker" })`, whose interface is identical.
- *Run several algorithms as one cancellable unit.* `runs.batch()`.
- *Tell two runs of the same algorithm apart.* Every run has an id and a `label` that gains the
  differing parameter as soon as a sibling exists, and its fields live under `results.<runId>`.
- *Delete a picture without deleting the result, and delete a result along with everything
  reading it.* `styles.remove()` and `runs.remove()`, with `runs.bindings()` naming the layers
  that would go, so a consumer can say "removes 1 style layer" before confirming.
- *Read a result without writing statistics code.* `summary()`, `ranking()`, `histogram()` and
  `column()`, over uniform per-shape field names, so `value`, `rank` and `percentile` mean the
  same thing for every metric.
- *Get a sentence in plain language about what a result means.* `result.reading()`.
- *Know when a result no longer describes what is on screen.* `run.stale`, derived by comparing
  scope digests, tracked by nobody.
- *Run it again without breaking whatever is bound to it.* `run.rerun()` keeps the same id, so
  every layer reading it survives.

**Choosing what is on screen**

- *Hide things without destroying them, and without rearranging the graph.* `visibility.set()`
  applies a filter as a cancellable run with progress, and filters never trigger a layout.
- *Look at a time window and move through it.* `visibility.setWindow()` is the same mask;
  `visibility.playback` plays, pauses and steps; and `visibility.steps()` precomputes the
  windows so scrubbing is instant. Given `track`, it also computes a metric per window and
  returns each as a series with a trend direction, an R-squared and the steps where the value
  moved sharply, beside arrival, departure, creation and dissolution rates.
- *Keep the hidden part visible as context.* `visibility.showContext`.
- *Select more than one thing, including edges.* Two sets with five set operations, the usual
  gestures (click, shift, ctrl or cmd, alt, marquee, select all visible, escape), a cap that
  says when it truncated, statistics over the selection and its cut edges, and `promote()` to
  turn a selection into a saved set.
- *Say where an operation applies.* `Scope` is a parameter on runs, layouts, exports and
  counts: the visible graph, the whole graph, the selection, the largest component, a saved
  set, a predicate, or a list of ids.

**Making it look like something**

- *Colour or size by a result in one call.* `styles.encode()` writes the layer and its selector
  itself, scoped to exactly the elements the run measured.
- *Get a legend that matches the picture.* `styles.legend()` derives it from the encoding
  model, so it exists with no canvas, in a Node test, and at any export scale.
- *Ask why one element looks the way it does.* `styles.explain()` returns the merged style, the
  layer that contributed each property, and, per channel, whether a person can edit it here and
  why not. `styles.resolveToStatic()` converts a rule into a fixed value so it becomes editable.
- *Address a layer reliably.* Layers carry a stable `LayerId`, never an array index; every
  layer names its source; and `styles.removeBySource()` removes a whole category at once.
- *Carry your own data on a layer.* `layer.userData` round-trips untouched.
- *Save an appearance and apply it somewhere else.* `styles.toDocument()` and
  `applyTemplate()`, which reports per layer whether it bound, needs a re-run, or is disabled
  and why. Appearance, column roles, view presets and batch commands are four separate
  documents, so importing a style cannot silently rewrite a column mapping or spend compute.

**Arranging it**

- *Ask for an arrangement by what it does, not by which library implements it.* `force`,
  `radial`, `hierarchical` and the rest; which engine runs underneath is catalogue data.
- *Drive a live layout.* `play`, `pause`, `tick`, `stop`, and `settle()`, which resolves with
  whether it converged -- including with no view at all, in a Node test.
- *Keep positions a person chose.* `positions.pin()`, pin-on-drag, and layout scoped to the
  selection so the rest of the graph keeps its coordinates.
- *Move an arrangement between graphs, or keep one across a reload.* `positions.snapshot()` and
  `restore()`, a warm start from current positions, and pinned state carried in exports and
  recipes.
- *Be told when a layout name is wrong.* An unknown name fails with `E_UNKNOWN_LAYOUT` and the
  list of available names, rather than returning null somewhere inside a queue.
- *Be told which layout suits this graph.* `layout.recommend()`, with its reason.

**Looking at it**

- *Move the camera meaningfully.* Presets, `fit(scope)`, `zoomToNodes()`, `followNode()`, a
  readable zoom percentage, and `bookmark()` / `apply()` for a saved viewpoint.
- *Keep two views together.* `camera.linkTo()`, with independent pan, zoom and rotate flags.
- *Know what is actually being drawn.* `view.rendered` gives the drawn node and edge counts and
  reports every detail reduction with its reason, so nothing degrades silently.
- *Put a graph in a headset.* `viewMode = "vr" | "ar"`, with one event covering entry, exit and
  an unexpected end.
- *Place DOM on top of the scene.* `worldToScreen()` and `screenToWorld()`.
- *Take a picture with its legend in it.* `capture()` at a chosen scale, camera preset,
  background and label policy, composing the same legend blocks into the image; `plan()` first
  gives the pixel size, the byte size and what would be in frame.
- *Record a clip, write a report, hand over the evidence.* `recordVideo()`; `report()` in HTML,
  Markdown or PDF with a generated methods paragraph; and `evidenceBundle()`, a ZIP of the
  CSVs, the image, the journal and the recipe.

**Comparing**

- *Two angles on one picture.* Two views, one session.
- *Two different pictures of one dataset.* Two sessions over one shared data core, joined by
  `createComparison()`, which reports what is only on one side, copies positions across matched
  nodes, settles the unmatched ones, and writes a per-node difference as a computed attribute.
- *Two datasets side by side.* The same join over two independent sessions.

**Automating, recording and replaying**

- *Do anything as plain JSON.* Every operation has a command form on one discriminated union;
  `session.run(command)` executes it; and the union plus a JSON Schema ships as
  `dist/graphty-commands.json`.
- *Turn what just happened into something you can keep.* Every state change writes a journal
  entry carrying its command, a one-line summary and its inverse, with a coalescing key so a
  dragged slider does not flood a history stack.
- *Do it again on another file.* `journal.export()` gives a recipe; `journal.replay()` runs it
  against the same or a different dataset, asking for a source when a step needs one and
  reporting per step what did not bind.
- *Print the code for what you just did.* `formatCommand()` renders any command as the
  JavaScript line that would produce it, so "copy as command", "export as script" and the
  console transcript all emit the same text.
- *Build a UI with no hard-coded lists.* `catalog.*` returns plain-JSON descriptors for every
  algorithm, layout, format, palette, scale, theme, formula function and configuration key,
  each with a plain name, a technical name and an option schema; `catalog.optionsFor()`
  resolves data-dependent bounds against this graph.
- *Validate an expression before running it.* `catalog.validate()` and `styles.validate()` are
  synchronous, return a character position for a syntax error, and resolve every referenced run
  id and attribute, so "matched nothing" and "named something that does not exist" stop looking
  identical.

**Extending it**

- *Add an algorithm, a layout, a format, a scale, a palette, a command, an accelerator, an
  identifier mapper, an enrichment provider or a data source.* One `use()` verb over ten plugin
  contracts, scopable to a single session, with `list`, `has`, `enable` and `remove`, a defined
  answer for double registration, and `<graphty-plugin src>` plus `registry.load(url)` for
  loading a plugin module by URL at runtime.

**Knowing what this machine can do**

- *Read what is available instead of probing for it.* `session.capabilities` reports
  acceleration state with a vendor, a device and an error code when it is unavailable, worker
  availability, VR and AR support, which capture formats work, and the measured limits with the
  date and basis of the calibration that produced them.
- *Tune the element and carry the settings.* The configuration document reads, sets, resets and
  round-trips more than twenty-five keys, reporting any key it rejected and why.
- *Turn the GPU on.* One import. No GPU type crosses the package boundary, and a missing
  accelerator when acceleration is required is a loud error, never a silent CPU fallback.

**When something goes wrong**

- *Switch on the failure rather than parse it.* Every error carries a stable code, a source, a
  recoverable flag and structured details; a sibling package's error is wrapped, never
  re-exported as a class.
- *Find the failure where it happened.* A run's failure lands on the run, a layer's on the
  layer, and only genuinely global failures reach a session-wide handler.
- *Call anything before the element is ready.* There is no not-ready error; work queues.

Two capabilities in this list are mostly renderer work, and the API is how they become visible:
bulk style application and mesh instancing surface as `view.rendered`, and the adjacency index
the element maintains surfaces as `data.neighbors()`.

One removal belongs here rather than buried in a table: the element stops binding W, A, S, D, Q
and E and stops grabbing keyboard focus for its canvas, because an embedded component must not
steal a host page's keyboard.

### 9.2 What stays with the consumer, by decision rather than by omission

- **All user-visible copy**, including result cards and their templates.
- **Policy about caps and priorities.** Which limit warns and which refuses is a product
  decision; the numbers themselves are in the configuration document.
- **Persisted reader preferences.**
- **The undo stack** -- its depth, its redo rule and its keyboard binding. The element supplies
  the inverses, the journal and the coalescing key.
- **Note content**: the text, the author, the tags, the storage and the hover card. The element
  supplies the marker channel, the per-element count, screen positions, marker clustering, a
  dataset fingerprint to key storage on, and the rule that a note whose target has left the
  graph is reported rather than dropped.
- **Panel layout, keyboard bindings and the layer list UI.**
- **Dimming or hiding whatever an algorithm did not select.** That is a reader's choice, and it
  must never ship inside a suggested layer.

### 9.3 What is deferred, and until when

| Deferred | Until | Why it is safe to defer |
|---|---|---|
| Several named graphs open at once | 2.1 | graph identity is already a session, so a collection is `Map<string, GraphSession>` and no signature changes |
| Working inside a headset: world-space panels, forearm anchoring, grab-and-scale, ray, pinch and gaze selection, snap turn behind a comfort vignette, AR passthrough framing | 2.1 | no current product workflow depends on it, and the parts that would be expensive to retrofit -- one shared selection set, the session lifecycle and the degradation report -- ship in 2.0, so the rest is additive |
| Fetching neighbours lazily from a server | 2.1 | the `data-source` plugin kind and its two hooks are declared in 2.0, so the contract does not move |
| Loading what is in the viewport first | 2.1 | the subset, resume and memory-budget options ship in 2.0, so the progressive-load surface already exists; prioritising by viewport needs the camera, which makes it view work rather than session work, and no signature moves when it lands |
| Ego-radial and Sugiyama layout engines | 2.0, as implementation rather than API | `defineLayout` already expresses both |
| Named layer groups and per-group opacity | 2.1 | additive on `Layer`; nothing in the stack model changes |
| Algorithms beyond the twenty-three wired today | rolling minor releases | `@graphty/algorithms` exports about 130 symbols; `defineAlgorithm` plus a catalogue entry makes each one mechanical, and `catalog.algorithms()` stays honest about what exists |
| Hosting the model in a worker | whenever the host is ready | the interface is identical either way, and until the host exists asking for one throws with a stated reason |
| Note content, and the undo stack | not the element's at all | the reasoning is in section 9.2 |

### 9.4 Breaking changes, in one place

Every change is explained where it is introduced; this is the index. The migration document
carries the old-to-new mapping, the codemod column, and the recommended upgrade path: a
documentation-only 1.10.1 release, then 2.0. The tag name does not change, so no aliasing shim
is needed.

See design/element-api/element-api-migration.md

| # | Change | Introduced in |
|---|---|---|
| A self-contained `./bundle` entry; Babylon and Lit stop being required peers | 2.1 |
| `source`/`target` canonical; aliases resolved and reported; `E_EDGE_ENDPOINTS_UNRESOLVED` | 2.2 |
| Option schemas cross as plain JSON descriptors, not Zod objects | 3.4 |
| Layout names become semantic; the engine is catalogue data | 4 preamble |
| `element.graph`, the eleven manager classes and the ten manager getters are removed | 4.1 |
| `dispose()` releases everything; the element is re-attachable | 4.1 |
| The element stops reading `window.location.search` | 4.1 |
| The five object-valued attributes removed; thirteen of the fifteen attributes go | 4.1.1 |
| `data-source`/`data-source-config` leave the reserved `data-*` namespace | 4.1.1 |
| `Edge.id` becomes an element-assigned counter; default edge weight field becomes `weight` | 4.3.1 |
| Unresolved edge endpoints are reported, never buffered silently | 4.3.2 |
| Export exists, streams, and goes through the format registry | 4.3.6 |
| `runAlgorithm(): Promise<void>` -> `runs.start(): Run` | 4.4.1 |
| `algorithmResults.<ns>.<type>.<field>` -> `results.<runId>.<field>` | 4.4.2 |
| Betweenness and closeness publish graph-level min/max | 4.4.3 |
| Selection becomes two sets with set algebra | 4.5.2 |
| Layers addressed by `LayerId`, not array index | 4.6.1 |
| Layer mutations validate and repaint, or reject; the write verbs return a `Run` | 4.6.1 |
| `calculatedStyle` and its `expr` are deleted; encodings are declarative | 4.6.2 |
| `StyleTemplate` splits into `StyleDocument`, `DataPlan`, `ViewPreset`, `Recipe`, `AnnotationSet` | 4.6.3 |
| Notes become element-owned and a document; `GraphtyDocument` carries any subset | 4.6.3a |
| An unknown layout name fails loudly; one layout setter | 4.7 |
| The event catalogue is replaced: 22 DOM and 13 session events, typed, declared, unsubscribable | 4.10 |
| Double registration is defined | 4.14 |
| The algorithm contract takes data and returns results; no render objects, no side effects | 4.14.1 |
| The exports map becomes a map; `customElements` is declared | 6.1 |
| Sourcemaps leave the tarball | 6.1 |
| The AI surface moves to `./ai`; the LLM SDKs become optional peers | 6.2 |
| Units and spellings settled once (opacity `0..1`, one shape spelling, `effect` singular) | 7 |
| The seven algorithms' pictures change; PageRank stops writing `style.shape.size` | 8.1 |
| The built-in W/A/S/D and Q/E bindings and the canvas focus grab are removed | 9.1 |
| Built-in algorithm keys are renamed; `dijkstra`/`bellman-ford`/`floyd-warshall` fold into `shortest-path` and `scc` into `components` | 4 preamble |

### 9.5 Decisions that could reasonably have gone the other way

| Decision | Why it went this way |
|---|---|
| Graph state lives on a model, and only camera-like state lives on the view | It is the only structure in which two synchronised views, several named graphs, worker hosting and headless testing all fall out of one choice rather than four. The cost is a second object a single-view consumer does not need, which is why the element forwards the eight verbs a first graph uses. |
| Every method is also a command, and every command is also a method | Autocomplete is how a stranger and an agent both discover an API; serialisation is what recipes, history, a console and tool calls need. Generating one from the other costs a build step and buys both. |
| The JavaScript expression evaluator is deleted rather than sandboxed | Sandboxing would fix the repaint abort but would still leave the element dead under a strict content security policy, and would still leave encodings impossible to diff, derive a legend from, or retarget at another dataset. |
| Ten result shapes rather than a folded-down handful | Each shape declares its required fields and its primary action, so folding one away deletes declared behaviour to save an enum member. |
| One `plan()` for previews, plus a separate synchronous `estimate()` | A promise cannot gate a button click, and five different spellings of look-before-you-leap is five things to remember. |
| Run ids are author-assigned or deterministically derived, never auto-numbered | An id whose value depends on execution order makes a saved recipe or layer bind to something different on replay, and fixing that afterwards breaks everything already persisted. |
| `Run` is awaitable itself rather than exposing a separate `done` promise | An element driven by clicks, a console and an agent is fire-and-forget most of the time; an awaitable run with an internal no-op rejection handler makes that safe without taking `await` away. |
| Worker hosting keeps the same interface, with the synchronous half pinned to facts a proxy can mirror | Promising a transparent proxy over synchronous accessors that walk the graph would buy a second major version later. |
| Sibling package types are quarantined behind `./format` rather than re-exported from the barrel | Re-exporting them ties the element's major version cadence to `@graphty/graph-format`'s, permanently. |
| No family of configuration elements beyond `<graphty-plugin src>` and the two JSON slots | A tag family would make the reserved-attribute namespace and the parameter namespace of 130 algorithms the same namespace, so the API could only grow by stealing names. |

---

## 10. Open questions for the owner

Only decisions a human has to make. Each carries a recommendation.

**Q1. Does the AI stack leave the package, or move to `./ai`?** It is roughly a third of
`graphty-element/index.ts` today and brings three `@ai-sdk/*` packages, `ai` and
`encrypt-storage` as hard runtime dependencies.
*Recommendation: `./ai`, with those five as optional peers.* It keeps a real product surface
reachable while removing an LLM toolchain from the install weight of a graph renderer. What an
agent actually needs -- `dist/graphty-commands.json` and the catalogue -- ships from
`./commands` and `./catalog` regardless, so the decision does not gate agent support. A separate
package is the alternative and can be taken later without another element major.

**Q2. Does a run paint by default?** This design says the element applies a derived encoding
layer on a run's first completion, suppressed when a user layer drives the channel, once per
batch, with `{ style: false }` to opt out (4.4.5).
*Recommendation: yes, by default.* It changes today's behaviour, where the one consumer always
passes `applySuggestedStyles: false` -- but it passes it because the element's own suggested
layers are the broken ones (8.1), and this design removes the reason for the refusal. A stranger
who runs betweenness and sees nothing happen will conclude the run failed.

**Q3. Does the element ship an undo stack, or only inverses?** The product requirements pull
both ways: undo is described as the application's job, the list of things a user expects to
undo is almost entirely graph state, and only the element can produce an inverse for any of
it.
*Recommendation: inverses, the journal and the `coalesceKey` in the element; the stack, its
depth, its redo rule and its keybinding in the consumer.* The line is drawn where the knowledge
is: only the element can know that five style patches touched the same binding; only the product
can know that the stack is fifty deep and that a new action clears redo. The cost is honest --
roughly thirty lines of reducer per consumer.

**Q4. Opacity units.** The design settles on `0..1` everywhere, matching the element's current
internal representation.
*Recommendation: `0..1`.* Every wrapper UI that has touched this has used `0..100`, so whichever
wins, half of `graphty/src/utils/styleBridge.ts` (918 lines) exists to translate; picking the
element's own representation means the translation is deleted rather than moved, and a UI that
wants percent multiplies by 100 in one place.

**Q5. The read shape of `element.data`.** The setter takes records. Should the getter return
records, or the underlying `GraphSnapshot`?
*Recommendation: records both ways, with `session.snapshot(): GraphSnapshot` -- declared on
`GraphSession` in 4.2 -- as the separate, documented door to the snapshot.* An asymmetric property is a surprise; a second method is a sentence in the
docs. This also keeps `./format` genuinely optional for a consumer who never touches typed
arrays.

**Q6. Does 2.0 land the graph-format behaviour changes?** `Edge.id` becoming an
element-assigned counter, the default edge weight field becoming `weight`, and the changed raw
centrality values for adapters that currently mirror a directed graph are decided work,
currently scheduled to land after 2.0.
*Recommendation: land them in this major and name them now.* They are observable through public
events and results, so letting them arrive as "a minor" is exactly the second major version
this design exists to avoid.

**Q7. Is worker hosting a 2.0 deliverable or a 2.0.x one?** The API is designed so it is not a
break either way (4.2.3).
*Recommendation: ship the API in 2.0 and the host when it is ready.* `createGraphSession({host:
"worker"})` should throw `E_UNSUPPORTED` with a clear reason until the host exists, rather than
silently running on the main thread -- a silent fallback here is the same defect class as a
silent CPU fallback in a GPU run.

**Q8. Bundled Babylon, or a peer?** The design bundles it and adds a self-contained CDN entry.
*Recommendation: bundle it.* "Install three packages and match versions" is friction a
self-sufficient element should not impose, and the CDN reader cannot install anything at all.
The known cost is a consumer who already uses Babylon getting two copies; the mitigation is that
`@babylonjs/core` stays an **optional** peer, so a consumer who declares it gets the externalised
build. That mitigation needs an owner's blessing because it means shipping two artifacts.

---

## 11. What this design refuses to do, and what that costs

Stated plainly, because a design that hides its gaps is worse than one that names them.

1. **It refuses to let the view own graph state.** No per-view selection, filter or layer stack.
   Two views that must show different things are two sessions over one shared data core
   (`shareDataWith`, 4.2), never one session with per-view overrides.
   *Cost:* a consumer with one view pays for a level of indirection they do not need; every
   docs page carries one more sentence; and divergent Compare costs a second model object and a
   `createComparison` join rather than a flag. This is the central bet, and section 2's promise
   -- that the word "session" does not appear before the Compare page -- is how the bet is paid
   for.
2. **It refuses an `element.graph` escape hatch.** One unsupported door, `unstable_internals`.
   *Cost:* anything reachable only through a manager must become first-class or be dropped, and
   someone will miss `getMeshCache`, `getNodeMesh`, `needsRayUpdate` or `startInputRecording`.
3. **It refuses arbitrary JS accessors in styling.** *Cost:* some encodings are awkward, and a
   consumer who wanted a lambda writes a registered scale. The alternative is deck.gl's
   `updateTriggers`, which is incidental complexity every user must learn or hit silent
   staleness.
4. **It refuses to re-export sibling types from the barrel.** *Cost:* a consumer who wants to
   build a snapshot by hand imports `./format` or installs `@graphty/graph-format`.
5. **It refuses a "make it fast" toggle that degrades silently.** Every degradation is reported
   with a reason. *Cost:* more state to render, and a consumer who ignores it sees no
   difference.
6. **It refuses to render on the server.** `./session` runs in Node; `.` does not. *Cost:* SSR
   consumers get a sized placeholder and hydrate client-side, and the frameworks page says so.
7. **It refuses silent success anywhere a shape is wrong.** *Cost:* code that "worked" against
   1.x because its mistake was swallowed now fails loudly on upgrade. That is the intent, and it
   will still generate migration friction.

---

## 12. Type reference: everything else, defined

A type that is named and not defined is a type a stranger learns by crashing. Every remaining
name used above is defined here -- including every exported **function**, because a factory
named in an example and never signed is the same defect as an unnamed type. The two names this
section deliberately does not define are `GraphSnapshot` and `GraphAccelerator`'s device
shapes: the first is re-exported from `./format` and owned by `@graphty/graph-format`
(section 6.2), the second is the peer's (4.12).

```ts
// --- the exported functions, one per entry point ---------------------------------
// "./session" also exports createGraphSession, declared once in 4.2 and not repeated here.
declare function createComparison(o: {
  a: GraphSession; b: GraphSession;
  match: { on: "id" } | { on: "attribute"; attribute: string }
       | { on: "pairs"; pairs: readonly (readonly [NodeId, NodeId])[] };
}): Comparison;

interface Comparison {
  readonly a: GraphSession; readonly b: GraphSession;
  readonly matched: number; readonly unmatchedA: number; readonly unmatchedB: number;
  onlyIn(side: "a" | "b"): readonly NodeId[];
  copyPositions(from: "a" | "b", to: "a" | "b"): Promise<MutationReceipt>;
  settleUnmatched(side: "a" | "b", o?: RunOptions & { maxSteps?: number }): Run<SettleResult>;
  delta(field: Path | AlgorithmKey, o?: { as?: string }): Run<MutationReceipt>;
  statistics(id: NodeId): { a?: Readonly<Record<string, unknown>>;
                            b?: Readonly<Record<string, unknown>> };
  dispose(): void;
}

// "./commands"
declare function parsePattern(text: string): Pattern;             // throws E_BAD_QUERY
declare function formatCommand(command: Command,
                               o?: { style?: "js" | "json"; indent?: number }): string;

// "./extend"
declare function use(...plugins: readonly Plugin[]): void;        // the default registry
declare function use(plugin: Plugin, o: { strict?: boolean }): void;
declare function createRegistry(o?: { inherit?: boolean }): Registry;
declare function defineAlgorithm(
  spec: AlgorithmDescriptor & { run: AlgorithmRun }): Plugin & { kind: "algorithm" };
declare function defineLayout(
  spec: LayoutDescriptor & { create: LayoutFactory }): Plugin & { kind: "layout" };
declare function defineFormat(
  spec: FormatDescriptor & { importer?: Importer; exporter?: Exporter }):
  Plugin & { kind: "format" };
declare function defineScale(
  spec: ScaleDescriptor & { map: ScaleFn }): Plugin & { kind: "scale" };
// Each define* validates its descriptor eagerly and throws E_BAD_COMMAND naming the missing
// field, so a plugin author learns at import time rather than at first use.

// --- pointer and event payloads -------------------------------------------------
interface Modifiers { shift: boolean; ctrl: boolean; meta: boolean; alt: boolean;
                      button: 0 | 1 | 2 }
interface NodeClickDetail {
  id: NodeId; node: NodeRecord; modifiers: Modifiers;
  pointer: { x: number; y: number }; world: Position | null;
  results: Readonly<Record<RunId, Readonly<Record<string, unknown>>>>;
}
interface EdgeClickDetail {
  id: EdgeId; edge: EdgeRecord; source: NodeId; target: NodeId; modifiers: Modifiers;
  pointer: { x: number; y: number };
  results: Readonly<Record<RunId, Readonly<Record<string, unknown>>>>;
}
type Direction = "in" | "out" | "all";

// --- runs ------------------------------------------------------------------------
interface RunSpec { algorithm: AlgorithmKey; params?: Record<string, unknown>;
                    scope?: Scope; seed?: number; as?: RunId; style?: boolean }
interface BatchResult { label: string; total: number; completed: number; partial: boolean;
                        steps: readonly { index: number; runId?: RunId; ok: boolean;
                                          reason?: string }[] }
interface RunRecord {                       // frozen, structured-cloneable
  id: RunId; label: string; command: Command; algorithm: AlgorithmKey;
  params: Readonly<Record<string, unknown>>; seed: number | null;
  scope: { spec: Scope; nodes: number; edges: number; digest: string };
  status: RunStatus; startedAt: string | null; durationMs: number | null;
  partial: boolean; stale: StaleNote | null;
  engine: { element: string; algorithms: string; layout: string };
  fields: readonly FieldDescriptor[]; shape: ResultShape; caveats: Caveats;
  summary?: ResultSummary;
}
type ResultOf<C extends Command> =
  C extends { op: "algo.run" } ? RunResult :
  C extends { op: "algo.remove" } ? { removedLayers: number; layerIds: readonly LayerId[] } :
  C extends { op: "data.inspect" } ? Inspection :
  C extends { op: "data.import" } ? ImportReport :
  C extends { op: "data.sample" } ? ImportReport :
  C extends { op: "data.export" } ? ExportResult :
  C extends { op: "data.apply" | "data.collapse" | "data.compute" } ? MutationReceipt :
  C extends { op: "data.expand" } ? ExpansionReceipt :
  C extends { op: "data.match" } ? MatchResult :
  C extends { op: "style.encode" } ? Layer :
  C extends { op: "style.patch" } ? readonly LayerId[] :
  C extends { op: "style.template" } ? { applied: readonly LayerId[];
                                         unbound: readonly UnboundLayer[] } :
  C extends { op: "select" } ? SelectionDelta :
  C extends { op: "visibility.set" | "visibility.window" } ? FilterResult :
  C extends { op: "visibility.steps" } ? TemporalResult :
  C extends { op: "layout.set" } ? void :
  C extends { op: "layout.transport" } ? SettleResult :
  C extends { op: "positions.set" } ? MutationReceipt :
  C extends { op: "view.camera" | "view.mode" } ? void :
  C extends { op: "view.capture" } ? CaptureResult :
  C extends { op: "view.record" } ? VideoResult :
  C extends { op: "report" } ? Blob :
  C extends { op: "calibrate" } ? Limits :
  C extends { op: "config.set" } ? MutationReceipt :
  C extends { op: "batch" } ? BatchResult : never;
// Every arm of the Command union has a result type. `never` as the fallback rather than
// `unknown` is deliberate: an op added without an arm here fails to type-check at the one
// call site that matters, `session.run(command)`, instead of silently degrading to `unknown`.
// The command form is therefore exactly as well typed as the method form, which is what
// "every method is a command, and every command is a method" (3.4) has to mean to be worth
// anything.
interface FilterResult { visible: { nodes: number; edges: number };
                         total: { nodes: number; edges: number };
                         unresolvedPaths: readonly Path[]; durationMs: number }

// --- styles ----------------------------------------------------------------------
interface LayerSpec {
  name: string; target?: "node" | "edge"; kind?: Layer["kind"];
  selector: Selector; set?: StaticStyle; encode?: Encoding;
  source?: LayerSource; enabled?: boolean; userData?: Record<string, unknown>;
}
interface HighlightSpec { run: Run | RunResult | RunId; field?: string; name?: string;
                          set?: StaticStyle }
type ChannelValue = string | number | boolean | LabelStyle | Rgba;
/** Pre-parsed colour. The repaint reads this; the string form is for authoring and export.
 *  Components are 0..255, alpha 0..1. Parsing a hex string per element is a repaint cost the
 *  encoding already knows how to avoid (4.6.1a rule 6). */
type Rgba = { r: number; g: number; b: number; a: number };
interface LabelStyle {                      // node.labelStyle / edge.labelStyle
  font?: string; sizePx?: number; weight?: number | "normal" | "bold";
  color?: string; background?: string; outline?: string;
  padding?: number; maxWidth?: number; wrap?: boolean;
}
type StaticStyle = Partial<Record<Channel, ChannelValue>>;
type ResolvedStyle = Readonly<Record<Channel, ChannelValue | undefined>>;
type Legend = LegendBlock;
interface StyleDocument { version: 1; layers: readonly LayerSpec[];
                          palettes?: readonly PaletteDescriptor[] }
interface ViewPreset { version: 1; mode: "2d" | "3d" | "vr" | "ar";
                       camera: { position: Position; target: Position; zoomPercent: number };
                       name?: string; fingerprint?: string }
interface DataPlan { version: 1;
                     knownFields: Partial<Record<"nodeId" | "edgeSource" | "edgeTarget"
                                                 | "nodeLabel" | "edgeWeight" | "time", string>>;
                     directed?: boolean | "auto"; idCoercion?: "canonical" | "keep";
                     runOnLoad?: readonly { algorithm: AlgorithmKey;
                                            params?: Record<string, unknown> }[];
                     name?: string; fingerprint?: string }
interface AnnotationSet { version: 1; notes: readonly Note[];
                          name?: string; fingerprint?: string }

/** What an importable document bound to, per member. Never throws on a partial bind. */
interface BindingReport {
  readonly bound: number;
  readonly disabled: readonly { what: string; reason: string; code: GraphtyErrorCode }[];
  readonly unresolvedPaths: readonly Path[];
  /** Present when applying would cost compute the caller has not agreed to yet. */
  readonly needsRerun?: readonly { what: string; estimateSeconds: number }[];
}

// --- catalogue descriptors (all plain JSON) --------------------------------------
interface OptionDescriptor {
  name: string; plainName: string; technicalName?: string;
  type: "number" | "integer" | "boolean" | "string" | "enum" | "seed"
      | "node-id" | "node-set" | "attribute" | "partition" | "ordering";
  default?: unknown;
  min?: number | string | OptionBound; max?: number | string | OptionBound; step?: number;
  values?: readonly { value: string; label: string }[];
  attributeType?: AttributeType; group?: string;
  advanced?: boolean; internal?: boolean; description?: string;
}
// A bound that depends on the data, resolved by catalog.optionsFor(key, scope) (4.15.2).
// The static descriptor stays plain JSON; the reference is a documented string.
type OptionBound = { from: "graph.nodeCount" | "graph.edgeCount" | "graph.maxDegree"
                         | "graph.maxCore" | "graph.componentCount" | (string & {}) };

interface AlgorithmDescriptor {
  key: AlgorithmKey; plainName: string; technicalName: string; description: string;
  category: "centrality" | "community" | "path" | "flow" | "structure" | "prediction"
          | (string & {});
  shape: ResultShape; fields: readonly FieldDescriptor[];
  options: readonly OptionDescriptor[];
  costClass: CostClass; complexity: string;
  cost?: (n: number, m: number) => number;
  approximable?: { method: string; plainName: string;   // used above exactComputationCap
                   defaultSample: number; seeded: boolean };
  requires?: { directed?: boolean; weighted?: boolean; accelerator?: boolean;
               connected?: boolean };
}
interface LayoutDescriptor {
  id: LayoutId; plainName: string; technicalName: string; description: string;
  family: string; kind: "live" | "batch"; maxDimensions: 2 | 3;
  sizeRating: "any" | 10000 | 2000 | 500;
  structuralInputs: readonly ("node" | "partition" | "ordering")[];
  options: readonly OptionDescriptor[]; engine: string;   // the implementation name
}
interface FormatDescriptor { id: FormatId; plainName: string; extensions: readonly string[];
                             mimeTypes: readonly string[]; canImport: boolean;
                             canExport: boolean; options: readonly OptionDescriptor[] }
interface PaletteDescriptor { id: PaletteId; plainName: string;
                              kind: "sequential" | "diverging" | "categorical";
                              colors: readonly string[]; capacity: number | null;
                              colorblindSafe: readonly ("deuteranopia" | "protanopia"
                                                      | "tritanopia")[] }
interface ScaleDescriptor { name: string; plainName: string;
                            domainKind: "numeric" | "categorical" | "boolean";
                            options: readonly OptionDescriptor[] }
interface ThemeDescriptor { name: string; plainName: string; document: StyleDocument }
interface FunctionDescriptor { name: string; arity: [number, number]; description: string;
                               returns: "number" | "boolean" | "string" }
interface ConfigKeyDescriptor { key: keyof ConfigValues; plainName: string;
                                technicalName: string; unit?: string;
                                min?: number; max?: number; default: unknown;
                                description: string }
interface CommandDescriptor { op: string; description: string;
                              parameters: readonly OptionDescriptor[];
                              examples: readonly Command[] }
interface MapperDescriptor { name: string; plainName: string; from: string; to: string }
interface ProviderDescriptor { name: string; plainName: string;
                               provides: readonly string[] }
interface SourceDescriptor { name: string; plainName: string; lazy: boolean }

// --- plugin function shapes -------------------------------------------------------
interface ReadonlyGraphData {                 // the graph-format vocabulary, read-only
  readonly nodeCount: number; readonly edgeCount: number; readonly directed: boolean;
  readonly rowPtr: Uint32Array; readonly colIdx: Uint32Array;
  readonly weights: Float32Array | null;
  idOf(index: number): NodeId;
  indexOf(id: NodeId): number;               // INVALID_INDEX when absent
  column(name: string): ArrayLike<number> | readonly string[] | undefined;
}
interface AlgorithmContext {
  readonly graph: ReadonlyGraphData;
  readonly scope: { nodes: Uint32Array; edges: Uint32Array };
  readonly options: Readonly<Record<string, unknown>>;
  readonly signal: AbortSignal;
  report(p: { completed: number; total?: number; phase?: string }): void;
  yieldNow(): Promise<void>;                 // scheduler.yield() where available
}
type AlgorithmRun = (ctx: AlgorithmContext) => Promise<AlgorithmOutput>;
type LayoutFactory = (ctx: AlgorithmContext & { positions: Float32Array }) =>
  { step(n: number): void; readonly settled: boolean; stop(): void };
type ScaleFn = (value: unknown, ctx: { domain: [number, number]; palette?: PaletteDescriptor })
  => string | number;
type Importer = (input: ReadableStream<Uint8Array> | string,
                 o: { plan: ImportPlan; signal: AbortSignal }) => AsyncIterable<GraphData>;
type Exporter = (graph: ReadonlyGraphData, o: ExportOptions) => ReadableStream<Uint8Array>;
type MapperFn = (ids: readonly string[]) => Promise<Record<string, string>>;
type EnrichmentFn = (ids: readonly NodeId[]) => Promise<readonly NodeRecord[]>;
type FetchNodes = (ids: readonly NodeId[]) => Promise<readonly NodeRecord[]>;
type FetchEdges = (id: NodeId, o: { direction: Direction; limit: number; offset: number })
  => Promise<{ rows: readonly EdgeRecord[]; total: number }>;
type AcceleratorFactory = (options?: { exactMaxNodes?: number })
  => Promise<GraphAccelerator | null>;

// --- accelerator ------------------------------------------------------------------
// Named from the CPU packages, never from the GPU package. Every member is optional, so a
// third party can implement one method; the dispatcher stays internal, so a new accelerated
// algorithm in a sibling MINOR does not break an implementor.
interface GraphAccelerator {
  readonly name: string;
  readonly backend: "webgpu" | (string & {});
  readonly device?: { vendor: string; architecture: string; description: string };
  readonly lost?: Promise<{ reason: string }>;
  dispose?(): void;
  [algorithmOrLayout: string]: unknown;
}

// --- events -----------------------------------------------------------------------
interface SessionEventMap {
  "ready": Record<string, never>;
  "error": GraphtyError;
  "data:loading": Progress & { phase: "fetch" | "parse" | "index" };
  "data:changed": MutationReceipt;
  "selection:changed": SelectionDelta;
  "visibility:changed": FilterResult & { filterKind: string };
  "run:changed": { run: RunRecord; phase: "queued" | "start" | "progress" | "end" };
  "styles:changed": { layers: readonly Layer[]; changed: readonly LayerId[] };
  "style:error": { layerId: LayerId; elementId: NodeId | EdgeId; code: GraphtyErrorCode;
                   message: string };
  "layout:changed": { id: LayoutId; kind: "live" | "batch"; state: string; step: number;
                      progress?: Progress };
  "journal:appended": { entry: JournalEntry };
  "capabilities:changed": { capabilities: Capabilities };
  "catalog:changed": { kind: string; added: readonly string[]; removed: readonly string[] };
}
```

`GraphAccelerator`'s index signature is deliberate and is the one place this design accepts a
loose type: the accelerated-algorithm list grows with each sibling port, and a closed interface
that a third party might implement would break on every such minor. The element's dispatcher
feature-tests a member before using it and reports the fallback on `capabilities`.
