# Algorithm extension point

Status: draft specification against graphty-element 2.6.1. Shared rules are in `README.md`.

Normative files: `algorithm.d.ts`, `descriptors.schema.json#/$defs/AlgorithmDescriptor`, and this
document.

## 1. What an algorithm is

An algorithm computes something over the graph and publishes a result the element can rank,
summarise, read aloud, style and save: a centrality, a clustering, a path, a set, a list of scored
pairs. A third party brings one when the element does not ship it -- MCL or MCODE clustering, a
hub score in the style of cytoHubba, a link predictor, a domain risk score. An embedding (a vector
per node) cannot be published in this version: no result shape and no field type carries a vector
(open decision 18).

A third-party algorithm extends `DeclaredAlgorithm`, declares a `static descriptor`, and implements
`compute(context)`, which RETURNS an `AlgorithmOutput`. It never writes a result anywhere; the
element derives rankings, distributions, summaries, readings and style layers from what it returns,
so no two algorithms can disagree about what a percentile is.

Grounding: the owner's rejection of second-class plugin algorithms (2026-09-21: "what's the point of
a plugin algorithm that can't publish a result?"); the owner's list of official points
(2026-09-21); the owner's decision to deprecate `algorithmGraph()` in favour of a snapshot accessor
(2026-09-28); `design/graphty-element/extension-points.md` section "Algorithm" (kept, with the
changes in section 7 below); the design studio's gap workflows (`design/designloom/workflows/W21.yaml`,
`W22.yaml`, `W23.yaml`, `W16.yaml`, `W11.yaml`).

## 2. Data model

| Type | Kind |
| --- | --- |
| `AlgorithmDescriptor`, the statics (`type`, `namespace`, `descriptor`, `scopeInput`, `parallelEdges`, `version`, `cost`, `costUnits`), `compute`, `AlgorithmOutput` (as a return value) | implemented by extensions |
| `AlgorithmRunContext`, `ScopedInput`, `RunProgressReport`, `Caveats`, the helpers (`metricField`, `nodeMetricFields`, the field-spec builders, `declaredCaveats`, `forEachChunked`, `checkShapeContract`), `schemaOptions`, `nodeIndex` | called by extensions |
| `GraphSnapshot`, `NodeMask`, `EdgeMask` | graph-format types, re-exported by `./extend` |

### 2.1 Descriptor rules

| Member | Rule |
| --- | --- |
| `key` | Non-empty; MUST equal `static type`; not a built-in key; permanent (it is recorded in run records and result paths) |
| `plainName`, `technicalName`, `description` | `plainName` non-empty |
| `category` | One of the published categories, or a new string (open union) |
| `shape` | One of the published result shapes |
| `fields` | MUST satisfy `checkShapeContract(shape, fields)`; no field named `runs`; SHOULD be built with the helpers so `path` is derived |
| `options` | README section 7 |
| `costClass` | One of the five cost classes |
| `complexity` | A big-O string for a reader |
| `approximable`, `requires` | Optional; `requires` states preconditions the element checks before a run (directed, weighted, accelerator, connected). It is NOT the proposed host-compatibility range, which is `requiresApi` on every point (README section 6.4) |
| `scopeInput` | MUST be omitted; derived from the static. A descriptor that states one different from the static is refused |
| `cost` | MUST be omitted; a function is not plain JSON. Declare `static cost` or `static costUnits` instead |

### 2.2 The result

`compute` returns `AlgorithmOutput` or `null` (nothing to compute, for example an empty scope).

1. `shape` MUST equal `descriptor.shape`.
2. `fields` lists the fields this run filled; it MAY be fewer than the descriptor declares when a
   parameter changed what there was to publish, and MUST NOT include a field the descriptor does
   not declare.
3. `nodes` holds one entry per node the algorithm MEASURED, keyed by node id. A node the algorithm
   has nothing to say about MUST get no entry: publishing zero for it invents a measurement, and
   the ranking, distribution and colour ramp would then carry it.
4. `edges` holds one entry per edge measured, keyed by the element's `Edge.id` (not a
   source-target pair, which cannot name one of two parallel edges).
5. `graph` holds graph-level values.
6. Fields the element can derive (group sizes, level counts, a set's count, a metric's ranking and
   range) MUST NOT be published by the algorithm.
7. `caveats` MUST state at least `method` and `direction`; build it with `declaredCaveats`, which
   fills `exact: true`, `precision: "f64"` and `notes: []`. An approximate, sampled, seeded,
   iterative or partial run MUST say so in the matching caveat member.
8. Every value MUST be JSON-compatible. A result is a value: it can be posted to a worker, saved and
   compared. (A columnar form over snapshot rows, for results of tens of millions of elements, is
   open decision 18.)
9. **Partial results.** A run that fails (throws) publishes nothing. A run that stops early because
   a limit the CALLER set was reached (a time box or an iteration cap, once forwarded; section
   5.1) MAY publish what it has, and then MUST set `caveats.exact` to `false` and
   `caveats.partialReason`; the element records the run as partial. A run that stops early for
   its own reason (an iterative method that did not converge) fails with `E_NOT_CONVERGED`. README
   section 9.3 states the same rule.

### 2.2.1 What each shape declares

`checkShapeContract(shape, fields)` refuses a descriptor whose `fields` lack a shape's required
fields. The table is `RESULT_SHAPE_CONTRACTS` in `graphty-element/src/session/results/types.ts`,
which is normative for it; field types are as there (`integer`, `number`, `boolean`, `string`,
`table`). A descriptor declares every listed field; a run's `nodes`, `edges` and `graph` carry only
the values the element cannot derive (item 6: rankings, percentiles, ranges, group and level
sizes, counts are derived).

| Shape | Node fields | Edge fields | Graph fields | Style layer |
| --- | --- | --- | --- | --- |
| `node-metric` | `value`, `rank`, `percentile` | -- | `min`, `max`, `median`, `mean`, `measured`, `normalization`, `tiedAtMin` | encoding |
| `edge-metric` | -- | `value`, `rank`, `percentile` | as `node-metric` | encoding |
| `community` | `group` (integer or string), `groupSize` | -- | `groupCount`, `sizes`; optional `modularity` | encoding |
| `layered-grouping` | `level`, `levelSize` | -- | `levelCount`, `sizes` | encoding |
| `category-table` | `category`, `score`, `rank` | -- | `categories` (table) | encoding |
| `path` | `onPath`, `order` | `onPath` | `length`, `cost`, `hops` | highlight |
| `node-set` | `in` | -- | `count`, plus one graph scalar of the algorithm's own | highlight |
| `edge-set` | -- | `in` | `count`, plus one graph scalar of the algorithm's own | highlight |
| `pair-list` | -- | -- | `pairs` (table) | none |
| `temporal` | -- | -- | `steps`, `series`, `rates` (tables), `changeThreshold` | none |
| `fact` | -- | -- | the algorithm's own scalars | none |

`nodeMetricFields` builds the `node-metric` set; for every other shape an author writes the
fields with `metricField`. A field-builder per shape is a convenience the element SHOULD add
(additive). A community result has no place for a per-group NAME (for example a cluster's top
annotation term); that is part of open decision 18.

### 2.2.2 The `pair-list` table

`pair-list` publishes no node or edge values: the whole result is the graph field `pairs`, of
type `table`. The element's own link predictor emits rows `{ source, target, score }`, and a
plugin MUST emit the same:

1. `source` and `target` MUST be node ids of the input graph. For an undirected method the pair is
   unordered and each pair MUST appear once; for a directed method `source` is the tail.
2. `score` is a finite number, higher meaning more likely or more similar. Rows SHOULD be sorted
   by `score`, descending; ties keep the algorithm's order.
3. Extra members MAY be added per row; they are plain JSON.
4. Whether a pair already joined by an edge is allowed is the algorithm's to state in its
   description; the element does not check it.

A pair-list result is read as a table; nothing turns it into drawn edges or into a new network
(a derived network, open decision 18).

### 2.3 Style

An algorithm MUST NOT ship styling of its own. The element derives a style layer from the result's
shape, scoped to the elements that carry a row, so a node the algorithm did not measure keeps
whatever the layers below painted. This is the element's rule for every algorithm (root
`CLAUDE.md`, "Algorithm Styles"): dimming or greying what an algorithm did not select is the
reader's choice, never the algorithm's.

## 3. Reading the graph

### 3.1 The contract: `context.input`

`context.input(orientation, { simplify })` returns a `ScopedInput`:

- `graph`: the full graph as a graph-format `GraphSnapshot`, in its declared orientation.
- `nodes`, `edges`: the run's scope as bit masks over `graph`.
- `subgraph()`: the scope as its own compact snapshot, in the orientation asked
  (`"undirected"` collapses a reciprocal pair into one edge), with parallel edges merged by
  `simplify` (`"sum"` by default, or the class's `static parallelEdges`).
- `whole`, `nodeCount`, `edgeCount`.

`simplify: "none"` keeps every parallel edge as its own row, so an event-level algorithm on a
multigraph sees each one.

Rules:

1. An algorithm MUST read the graph only through `context.input` (or through `schemaOptions` for
   its parameters). It MUST NOT read the render objects (`this.graph`, a `Node`, an `Edge`).
2. An algorithm MUST publish by id, never by row: rows of `subgraph()` are not rows of `graph`.
   Node ids come from `snapshot.ids.idOf(row)`.
3. A class declaring `static scopeInput = "subgraph"` is handed its scope and is estimated over it.
   Any other class is handed the whole graph; the element keeps only the scope's values and adds
   the caveat "Computed on the whole graph; values kept for the scope only.", and the run is
   estimated -- and refused above the cost cap -- as a whole-graph run. A scope therefore means
   "report for these", not "compute without the rest": a what-if run that removes a node cannot be
   expressed by scoping a whole-graph algorithm, and gets the baseline numbers back with only a
   caveat. Separating the two roles is open decision 23.
4. **Edge identity (not yet met).** There is no public way to turn an edge row into the element's
   `Edge.id`: the mapping is internal. A plugin that reads only the snapshot cannot therefore
   publish an edge-shaped result. The proposed fix is `ScopedInputEdgeIdentity` in
   `algorithm.d.ts` (`edgeId(row)` on `graph`, `subgraphEdgeIds(row)` on the subgraph), README open
   decision 5. The migration plan specifies the same accessor differently -- "the scoped input's
   snapshot plus the edge remap", a map from declared edge rows to view edge rows, which the
   element's accelerated route already builds -- and open decision 5 must pick one of the two and
   update the other document. Until it lands:
   - an edge-shaped plugin is an EXCEPTION to section 3.2: it MAY read edge ids through the
     deprecated `algorithmGraph()` route;
   - it MUST NOT use the guide's `edgeIdsByPair` helper on a graph with parallel edges, because a
     source-target pair cannot name one of two parallel edges and the value would be published to
     the wrong edge or collapse two edges into one;
   - the `@deprecated` tag on `algorithmGraph` MUST NOT ship before the accessor does: without it,
     an edge-shaped plugin has no conforming route once 4.0 removes the old one.
5. **What the snapshot carries beyond topology (not yet specified).** The specification does not
   yet say whether `graph` carries the loaded node and edge attributes as columns, which attribute
   (if any) fills a weights array and whether it means a distance or a strength, or whether the
   values of earlier runs are readable. The migration plan's element builder carries no attribute
   columns. A declared `"attribute"` or `"partition"` option therefore resolves to a NAME with no
   route to its values, and `subgraph()` states no policy for columns when parallel edges merge.
   Until open decision 17 is taken a plugin MUST NOT rely on attribute columns, weights or other
   runs' results being present in its input, and `caveats.weight` cannot be filled truthfully by a
   plugin. The proposal (`ScopedInputColumns` in `algorithm.d.ts`): `input.column(optionName)`
   resolves a declared `"attribute"` or `"partition"` option to a typed column over the rows of
   `graph`; `ScopedInputOptions.weight` names the weight attribute and its meaning, the element
   fills the weights from it and fills `caveats.weight` itself; `subgraph()` keeps the weight and
   every column the algorithm named, merging them by the `simplify` policy; published result
   fields are readable as columns under their result paths, and the run record lists them as
   inputs.

### 3.2 Deprecated: `algorithmGraph()`

`Algorithm.algorithmGraph(mode)` returns a legacy `Graph` object from `@graphty/algorithms`, and
`./extend` exports its type as `AlgorithmGraphView`. The owner decided on 2026-09-28 to deprecate
both in a 3.x minor and remove them in graphty-element 4.0, together with `@graphty/algorithms`
3.0. A new algorithm MUST NOT use them, except to read edge ids for an edge-shaped result while
open decision 5 is open (section 3.1 item 4). Until 4.0 they keep working, and a class that uses
them is still conforming.

**Inconsistency to fix:** the published guide's main example
(`graphty-element/docs/guide/extending/custom-algorithms.md`) still reads its input through
`this.algorithmGraph("undirected")`, and 2.6.1 carries no `@deprecated` tag on either. Both must
change when the deprecation ships; the example in section 12 below is the replacement.

### 3.3 Type identity of the snapshot

graph-format is a regular dependency of the element (owner decision, 2026-09-28), so a plugin's
own copy of graph-format may differ from the one that built the snapshot it is handed.
`GraphSnapshot` is a CLASS with a private member (`graph-format/src/snapshot/graph-snapshot.ts`),
and TypeScript compares such classes by declaration, not by shape: a `GraphSnapshot` from one copy
is not assignable to one from another. Therefore:

1. A plugin MUST take `GraphSnapshot`, `NodeMask` and `EdgeMask` from
   `@graphty/graphty-element/extend`, never from its own graph-format, and MUST NOT use
   `instanceof` against graph-format classes.
2. It MUST use only members published by the graph-format major the element depends on.
3. An element signature that accepts a snapshot from a plugin (the proposed `runAlgorithmHeadless`)
   SHOULD accept a structural interface rather than the class. graph-format declares one,
   `GraphSnapshotContract`, but does not export it today; exporting it is part of open decision
   9.
4. The re-exported snapshot types are "called by extensions" (README section 6.2): an element
   release that moves to a new graph-format major is an element major.

## 4. Registration

`DeclaredAlgorithm.register(Class)` (the static is inherited from `Algorithm`).

1. `static type` and `static namespace` MUST be non-empty strings **(not yet met:** 2.6.1 calls
   `String()` on both and files a class with no namespace under `"undefined:<type>"`).
2. With a descriptor: `descriptor.key` MUST equal `type` (`E_BAD_COMMAND`, `field: "descriptor.key"`); no field
   may be named `runs`; `descriptor.scopeInput`, when present, MUST equal the static; a built-in key
   is `E_DUPLICATE_PLUGIN`. The descriptor is published to the catalogue and the class is filed
   under both the key and the legacy address `namespace:type`.
3. **(not yet met)** A descriptor with no `fields` array fails with a plain `TypeError` instead of
   `E_BAD_COMMAND`, and `shape`, `costClass` and `options` are not validated at registration. A
   conforming element MUST validate the descriptor against `#/$defs/AlgorithmDescriptor` and
   `checkShapeContract` at registration.
4. **(not yet met)** Without a descriptor, 2.6.1 files the class under `namespace:type` with no
   check, so a descriptor-less class declaring namespace `graphty` and type `degree` silently
   replaces the built-in implementation. A conforming element MUST refuse a built-in
   `namespace:type` with `E_DUPLICATE_PLUGIN` in every case. Whether a missing descriptor is
   refused outright is README open decision 7. A third-party algorithm MUST declare a descriptor:
   without one it is invisible to the catalogue and reachable only by the legacy address, which is
   not parity.
5. The `namespace` SHOULD be the vendor prefix of README section 4.3.
6. Sameness is decided by the class (README section 4.2 item 4) **(not yet met:** 2.6.1 compares
   the descriptor object, so `class B extends A {}`, which inherits A's descriptor, is treated as a
   re-import and silently files B over A even under `strict`).

## 5. What the built-in algorithms do, and parity

"Pinned by" names the test in `graphty-element/test/browser/extensions/algorithm-extension.test.ts`.

| Capability | Route | Pinned by |
| --- | --- | --- |
| Listed in the catalogue | `session.catalog.algorithms()` | "is listed in the catalogue..." |
| Offered as a metric for this graph with a cost | `session.catalog.metrics()` | "is offered as a metric for this graph..." |
| Estimated before running | `session.estimate(...)` from `costUnits`, `cost` or `costClass` | "can be asked what it would cost..." |
| Run by name | `graph.run(key, params)`, `session.runs.start(key, params, { as, onProgress })` | "runs when the element is asked for it by name..." |
| Run by the legacy address | `namespace:type` | "runs through the element's older namespace and type address..." |
| Progress | `context.report`, `forEachChunked` | "reports progress while it works", "walks its elements in the element's own chunks..." |
| Cancellation | `context.signal` | "stops when the run is cancelled" |
| One member of a batch with one progress stream and one cancel | batch runs | "can be one member of a batch..." |
| Parameters declared once, validated before work, refused when undeclared | `descriptor.options`, `schemaOptions` | the four parameter tests |
| Coded failures, and uncoded throws given a code | run rejection | "has a failure of its own reported...", "has an uncoded mistake inside it given a code..." |
| Ranking, distribution, summary and plain-language reading derived | `session.results` | "gets the ranking, distribution and summary...", "gets a plain-language reading..." |
| Readings name nodes by the reader's label attribute | results reading | "names nodes by the label attribute..." |
| Caveats carried to the reader | run record | "carries its own caveats through..." |
| A style layer derived from the shape, painting only measured elements | styles | "paints the graph from its result...", "paints only the nodes it measured" |
| Values selectable by a reader's own layer | result paths | "publishes its values where a reader's own style layer can select on them" |
| Re-runnable in place, keeping layers and references | re-run | "is re-runnable in place..." |
| Edge results by `Edge.id`, with a derived picture | `edges` | the three edge tests |
| Computes over the scope when declared, or whole-graph with a caveat | `static scopeInput` | the two scope tests |
| Runs on an attached accelerator, on the CPU port otherwise, and fails early when acceleration is required and impossible | protected `accelerated(...)` | "an algorithm written outside this package, on an accelerator" block |
| Plain catalogue, safe to post to a worker | descriptor | "leaves the catalogue plain enough to post to a worker" |

### 5.1 Parity statements

1. A registered algorithm MUST be reachable by every route in the table.
2. **Progress and cancellation are at parity and REQUIRED.** `compute` MUST check
   `context.signal` at least once per chunk of work and MUST let the abort propagate (never catch
   and swallow it). A cancelled run MUST NOT publish anything. `compute` SHOULD report progress at
   least once per second of work and MUST await `context.yieldNow()` (or use `forEachChunked`)
   between chunks, so the page stays responsive.
3. **What does not reach `compute`.** The run's scope does (section 3.1). The run options `seed`,
   `exact`, `sample` and `timeBox` are resolved by the run and NOT forwarded, to a plugin or a
   built-in. A stochastic plugin therefore cannot be reproduced by the run's seed today; it SHOULD
   declare its own `"seed"` option and record the seed in `caveats.seed`. Reproducible stochastic
   methods (MCL, Node2Vec) need forwarding (`design/designloom/workflows/W25.yaml`). The run option
   `scopeAs` is reserved and refused with `E_BAD_COMMAND`.
   - **(not yet met)** A run MUST NOT record a run option that did not reach `compute`: until
     forwarding lands, the element MUST refuse `seed`, `exact`, `sample` and `timeBox` with
     `E_UNSUPPORTED` for an algorithm that does not receive them, rather than accept them, drop
     them and write them into the run record, where a methods section would cite a seed that had
     no effect.
   - The forwarding proposal (open decision 16): `AlgorithmRunContext.parameters`
     (`AlgorithmRunParameters` in `algorithm.d.ts`). One rule for the seed: the run's `seed` fills
     the algorithm's declared `"seed"` option, and passing both is `E_BAD_COMMAND`. When the
     algorithm declares a `"seed"` option and the caller passes none, the element draws a seed and
     records it in the run record and in `caveats.seed`, so no stochastic run is ever unseeded.
     The same proposal passes the resolved options to the cost model
     (`cost(n, m, options)`), so an option that multiplies the work (iterations, samples, depth)
     cannot slip under the cost cap, and requires every such numeric option to declare `max`.
4. **Acceleration is not at parity.** The protected `accelerated(capability, mode)` route is used by
   built-ins and pinned for plugins by a test, but `algorithm.d.ts` does not declare it: its return
   type is internal, its dispatcher type comes from `@graphty/algorithms`, and no list of
   capability names is published. A plugin therefore cannot call it without a cast, which breaks
   parity clause 6. Until the element declares `accelerated`, its result type and its capability
   names on `./extend`, a plugin MUST NOT use it. When it is declared, the element SHOULD fill
   `caveats.precision` from the accelerator's verdict rather than trust the plugin to copy it.
5. **Headless testing is NOT at parity.** `Algorithm`'s constructor takes the renderer-backed
   graph, so a plugin cannot be unit-tested in Node against real element code. Section 10 proposes
   a headless host.
6. **Workers.** A plugin MAY run its work in a worker it creates and terminates within the run,
   honouring `context.signal`. Whether the element may run a plugin's `compute` in a worker, and
   whether a `ScopedInput` snapshot is transferable, is not specified (open decision 9).

## 6. Options

1. `descriptor.options` is the only declaration. `DeclaredAlgorithm` resolves the caller's values
   against it (`resolveOptionValues`) before `compute` runs; `this.schemaOptions` holds the result.
2. An undeclared name is `E_UNKNOWN_OPTION` and a bad value `E_OPTION_RANGE`, whichever route the
   caller used, before any work starts.
3. A node parameter MUST be declared with type `"node-id"` and resolved to a row with
   `this.nodeIndex(snapshot, optionName, id)`, which fails with `E_OPTION_RANGE` naming the option.
4. The older `static optionsSchema` / `defineOptionsSchema` MUST NOT be used by a new algorithm.
5. The class's `TOptions` generic is an unchecked assertion: nothing ties it to
   `descriptor.options`, so a mismatch compiles and reads `undefined` at run time. The proposed
   `OptionValues<typeof options>` helper (`common.d.ts`) derives the type from a `const` option
   array; an author SHOULD use it once published.

## 7. Errors

| Code | When |
| --- | --- |
| `E_BAD_COMMAND` | malformed registration; the reserved run option `scopeAs` |
| `E_DUPLICATE_PLUGIN` | a built-in key |
| `E_UNKNOWN_ALGORITHM` | a run names nothing registered |
| `E_UNKNOWN_OPTION`, `E_OPTION_RANGE` | parameter validation |
| `E_SCOPE_EMPTY` | the scope resolves to nothing |
| `E_CAP_EXCEEDED` | the estimate is over the cost cap (a smaller scope or an approximate method may pass) |
| `E_TOO_LARGE` | the graph is beyond what the algorithm can ever handle |
| `E_NOT_CONVERGED` | an iterative algorithm did not converge within its own limits (a caller-set time box or cap is section 2.2 item 9 instead) |
| `E_NO_ACCELERATOR` | acceleration was required and is unavailable |
| `E_SUPERSEDED` | the run was replaced by a newer run of the same name |

1. `compute` SHOULD throw a `GraphtyError` with `source: "run"` and one of the codes above.
2. A non-`GraphtyError` throw is wrapped by the element (`E_INTERNAL`, `source: "run"`, original as
   `cause`) before it reaches the caller.
3. The abort reason from `context.signal` MUST propagate unchanged.
4. A failed run publishes nothing and leaves previous results of other runs untouched.

## 8. Versioning and compatibility

1. `AlgorithmDescriptor`, the statics and `compute` are implemented by extensions;
   `AlgorithmRunContext` and `ScopedInput` are called by extensions and MAY gain members in a minor
   release (the edge identity accessor would be one).
2. `ResultShape` is open for readers and closed for writers: a plugin MUST use a shape the element
   publishes. A new shape is an element release, not a plugin decision.
3. `static version` SHOULD be declared and SHOULD follow semantic versioning; it is recorded on
   every run so a saved result says what produced it. Without it the run record cannot tell two
   releases of a plugin apart. Making it REQUIRED for plugins at the next major, the shape of the
   run record (`RunRecord` in `algorithm.d.ts`) and what happens when a recorded version differs
   from the installed one are open decision 26.
4. Result paths are derived from the key; renaming a key breaks every saved style that selects on
   its results.
5. `algorithmGraph`/`AlgorithmGraphView`: deprecated in 3.x, removed in 4.0 (section 3.2).

## 9. Security

An algorithm runs with the page's privileges and can reach the whole graph. It MUST NOT send graph
data anywhere; an algorithm that needs a remote service (an enrichment API, a model server) is a
data source, not an algorithm (`candidates.md`), because a reader must confirm a host before
anything leaves the page. The element cannot enforce this; the enforceable boundary is the page's
Content-Security-Policy (README section 9.4), and the conformance check "makes no network request"
reports a plugin that tries.

## 10. Testing without a browser (proposed)

`runAlgorithmHeadless(Class, snapshot, options)` in the "Proposed" section of `algorithm.d.ts`
runs a `DeclaredAlgorithm` over a graph-format snapshot with no renderer, in Node or a worker. It
performs the element's own steps -- option resolution, scope handling, shape-contract check, caveat
defaults, abort propagation -- and returns what `compute` returned. It would make the Node checks
of the conformance kit possible and give plugins the unit-testability the design studio's
expert reviewers expect (`design/designloom/personas/expert-emma.yaml`). It needs the algorithm
base class to stop requiring the renderer-backed graph, which the snapshot migration makes
possible. Its name and signature are part of README open decision 9, which also covers a
Node-safe session (load through readers, run registered algorithms, export through writers) for
batch pipelines. The host MUST NOT invent edge ids: a snapshot whose algorithm publishes edges
MUST come with the element's `Edge.id` per row, or the plugin's headless ids would never occur in
the live element.

## 11. Conformance checks

Run by `checkAlgorithm(Class, { graphs, params })` in the proposed kit. The Node checks need the
headless host (section 10); until it exists they run in the browser configuration.

| Check | Passes when |
| --- | --- |
| registers | `DeclaredAlgorithm.register` accepts it; the catalogue and `session.catalog.metrics()` list it |
| descriptor is valid | validates against `#/$defs/AlgorithmDescriptor`; `checkShapeContract` returns nothing |
| key is not reserved | not a built-in key, and `namespace:type` is not a built-in address |
| is plain data | the published descriptor survives `structuredClone` |
| output matches the shape | on every standard graph, `shape` equals the descriptor's, every `fields` entry is declared, every value is JSON |
| publishes by id | every `nodes[].id` is a node id of the input graph; every `edges[].id` is an element edge id; every `pairs` row names two node ids of the input graph |
| pair-list rows validate | for a `pair-list` algorithm, every row has `source`, `target` and a finite `score` (section 2.2.2) |
| measures only what it measured | on a graph with an isolated node, the node is absent from `nodes` unless the algorithm defines a value for it (a warning, with the node, for an author to confirm) |
| caveats are complete | `method` and `direction` are set; a declared `approximable` or `"seed"` option is reflected in `exact`, `sampleSize` and `seed` |
| options validate | an undeclared parameter raises `E_UNKNOWN_OPTION` and an out-of-range one `E_OPTION_RANGE` before `compute` is called |
| reports progress | on the 500-node graph, `report` is called at least once with `completed` and `total` |
| cancels | aborting after the first progress report rejects the run with the abort reason and publishes nothing |
| yields | on the 500-node graph, `yieldNow` (or `forEachChunked`) is awaited at least once per 1,000 nodes or edges processed, counted by the kit; the longest uninterrupted stretch is reported as a measurement, never as a failure, because it depends on the machine |
| makes no network request | with `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `navigator.sendBeacon` trapped, a run makes no call |
| is deterministic with a seed | with a declared `"seed"` option, two runs with the same seed give identical output |
| scope is honoured | with `scopeInput = "subgraph"`, every published id is inside the scope |
| failures are coded | an invalid input the author supplies fails with a `GraphtyError` |

## 12. Worked example

A hub score written only against the snapshot: the share of possible links among a node's
neighbours, damped by neighbourhood size. It resembles cytoHubba's DMNC but is NOT it (DMNC
measures the largest connected component of the neighbourhood), so it does not borrow that name:

```ts
import {
    DeclaredAlgorithm, declaredCaveats, forEachChunked, metricFieldSpecs, nodeMetricFields,
    type AlgorithmDescriptor, type AlgorithmOutput, type AlgorithmRunContext, type ResultElementValues,
} from "@graphty/graphty-element/extend";

const DESCRIPTOR: AlgorithmDescriptor = {
    key: "acmehub-neighbourhood-density",
    plainName: "Neighbourhood density",
    technicalName: "Neighbourhood link density",
    description: "How tightly a node's neighbours are linked to each other.",
    category: "centrality",
    shape: "node-metric",
    fields: nodeMetricFields({ plainName: "Density", technicalName: "Neighbourhood link density" }),
    options: [{ name: "epsilon", plainName: "Exponent", type: "number", default: 1.7, min: 1, max: 2 }],
    costClass: "instant",
    complexity: "O(sum of degree squared)",
};

class NeighbourhoodDensity extends DeclaredAlgorithm<{ epsilon: number }> {
    static override namespace = "acmehub";
    static override type = "acmehub-neighbourhood-density";
    static override descriptor = DESCRIPTOR;
    static override scopeInput = "subgraph" as const;
    static version = "1.0.0";
    static costUnits = (n: number, m: number): number => n + 2 * m;

    override async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const { epsilon } = this.schemaOptions;
        const g = context.input("undirected", { simplify: "max" }).subgraph();
        if (g.nodeCount === 0) return null;

        // graph-format CSR: the neighbours of row r are colIdx[rowPtr[r] .. rowPtr[r + 1])
        const neighboursOf = (r: number): Uint32Array => g.colIdx.subarray(g.rowPtr[r], g.rowPtr[r + 1]);
        const rows = Array.from({ length: g.nodeCount }, (_, row) => row);
        const measured: ResultElementValues[] = [];
        await forEachChunked(context, "Measuring neighbourhoods", rows, (row) => {
            const neighbours = new Set(neighboursOf(row));
            neighbours.delete(row);                             // a self-loop is not a neighbour
            if (neighbours.size < 2) return;                    // nothing to say: no row
            let inner = 0;
            for (const u of neighbours) for (const v of neighboursOf(u)) if (v !== u && neighbours.has(v)) inner++;
            const links = inner / 2;
            measured.push({ id: g.ids.idOf(row), values: { value: links / Math.pow(neighbours.size, epsilon) } });
        });

        return {
            shape: "node-metric",
            fields: metricFieldSpecs("node", "number"),
            nodes: measured,
            graph: { normalization: "none" },
            caveats: declaredCaveats({
                direction: "undirected",
                method: `neighbourhood link density, epsilon ${epsilon}`,
                notes: ["Nodes with fewer than two neighbours are left unmeasured."],
            }),
        };
    }
}

DeclaredAlgorithm.register(NeighbourhoodDensity);
const run = session.runs.start("acmehub-neighbourhood-density", { epsilon: 1.7 }, { as: "dmnc" });
```

`rowPtr`, `colIdx`, `nodeCount` and `ids` are graph-format 1.x's published snapshot members
(`graph-format/src/types/snapshot.ts`, `AdjacencyView`).

## 13. Known gaps

- No public edge identity accessor (section 3.1 item 4; open decision 5).
- `algorithmGraph` is not yet tagged deprecated and the guide still teaches it (section 3.2).
- `seed`, `exact`, `sample` and `timeBox` do not reach `compute` (section 5.1).
- No headless host; plugins cannot be unit-tested in Node (section 10).
- Registration validation is thin, and a descriptor-less class can replace a built-in
  implementation (section 4; open decision 7).
- `Algorithm.register` takes no `RegisterOptions` (open decision 6).
- `MetricAlgorithm`, the base of the element's seven centralities, is not published; a plugin
  metric uses `DeclaredAlgorithm` and `nodeMetricFields`, which produce the same field set.
- The snapshot's attribute columns, weights and other runs' results are not specified as input
  (section 3.1 item 5; open decision 17).
- Run options are accepted and recorded but not forwarded (section 5.1 item 3).
- `accelerated` is not declared on `./extend` (section 5.1 item 4).
- No shape carries a vector, a list of matched subgraphs, per-group names or a derived network
  (open decision 18).
- A scope cannot remove elements from the computation (section 3.1 item 3; open decision 23).
- No option type names an edge set, a list of node pairs, a file or a table (open decision 22).

## 14. Who this serves

| Need | Source |
| --- | --- |
Rows marked "not yet" name a need the contract cannot meet until the named open decision is
taken.

| Need | Source | Served |
| --- | --- | --- |
| MCL and MCODE clustering | `design/designloom/workflows/W21.yaml` | yes, unweighted; weighted needs open decision 17 |
| Per-cluster profiles (mean of a data column, dominant annotation) | `design/designloom/workflows/W21.yaml` | not yet: decision 17 |
| Building an enrichment map from gene-set overlap | `design/designloom/workflows/W22.yaml` | not yet: gene sets have no route in (decision 22), and a derived network has no shape (decision 18) |
| Hub rankings (MCC, DMNC) | `design/designloom/workflows/W23.yaml` | yes |
| Combined hub scores from several runs | `design/designloom/workflows/W23.yaml` | not yet: decision 17 |
| Link prediction as scored pair lists | `design/designloom/workflows/W16.yaml`, `design/designloom/personas/ml-engineer-recsys.yaml` | yes (section 2.2.2) |
| Embeddings | same | not yet: decision 18 |
| Risk scoring | `design/designloom/workflows/W06.yaml` | yes, over topology; attribute-driven needs decision 17 |
| What-if removal | `design/designloom/workflows/W11.yaml` | not yet: decision 23 |
| Pattern search for threat hunting | `design/designloom/workflows/W07.yaml` | not yet: a list of matched subgraphs has no shape (decision 18) |
| Parameters and seeds recorded for a methods section | `design/designloom/workflows/W25.yaml` | not yet: decisions 16 and 26 |
