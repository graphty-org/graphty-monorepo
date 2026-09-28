# Algorithm extension point

Status: draft specification against graphty-element 2.6.1. Shared rules are in `README.md`.

Normative files: `algorithm.d.ts`, `descriptors.schema.json#/$defs/AlgorithmDescriptor`, and this
document.

## 1. What an algorithm is

An algorithm computes something over the graph and publishes a result the element can rank,
summarise, read aloud, style and save: a centrality, a clustering, a path, a set, a list of scored
pairs. A third party brings one when the element does not ship it -- MCL or MCODE clustering, a
hub score in the style of cytoHubba, an embedding, a link predictor, a domain risk score.

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
| `approximable`, `requires` | Optional; `requires` states preconditions the element checks before a run |
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
   compared.

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

Rules:

1. An algorithm MUST read the graph only through `context.input` (or through `schemaOptions` for
   its parameters). It MUST NOT read the render objects (`this.graph`, a `Node`, an `Edge`).
2. An algorithm MUST publish by id, never by row: rows of `subgraph()` are not rows of `graph`.
   Node ids come from `snapshot.ids.idOf(row)`.
3. A class declaring `static scopeInput = "subgraph"` is handed its scope and is estimated over it.
   Any other class is handed the whole graph; the element keeps only the scope's values and adds
   the caveat "Computed on the whole graph; values kept for the scope only.", and the run is
   estimated -- and refused above the cost cap -- as a whole-graph run.
4. **Edge identity (not yet met).** There is no public way to turn an edge row into the element's
   `Edge.id`: the mapping is internal. A plugin that reads only the snapshot cannot therefore
   publish an edge-shaped result. The proposed fix is `ScopedInputEdgeIdentity` in
   `algorithm.d.ts` (`edgeId(row)` on `graph`, `subgraphEdgeIds(row)` on the subgraph), README open
   decision 5. Until it lands, an edge-shaped plugin reads edge ids through the deprecated route
   below, and the guide's `edgeIdsByPair` helper.

### 3.2 Deprecated: `algorithmGraph()`

`Algorithm.algorithmGraph(mode)` returns a legacy `Graph` object from `@graphty/algorithms`, and
`./extend` exports its type as `AlgorithmGraphView`. The owner decided on 2026-09-28 to deprecate
both in a 3.x minor and remove them in graphty-element 4.0, together with `@graphty/algorithms`
3.0. A new algorithm MUST NOT use them. Until 4.0 they keep working, and a class that uses them is
still conforming.

**Inconsistency to fix:** the published guide's main example
(`graphty-element/docs/guide/extending/custom-algorithms.md`) still reads its input through
`this.algorithmGraph("undirected")`, and 2.6.1 carries no `@deprecated` tag on either. Both must
change when the deprecation ships; the example in section 12 below is the replacement.

### 3.3 Type identity of the snapshot

graph-format is a regular dependency of the element (owner decision, 2026-09-28), so a plugin's
`GraphSnapshot` type may come from a different installed copy than the snapshot it is handed.
A plugin MUST use only members published by graph-format 1.x, MUST NOT use `instanceof` against
graph-format classes, and SHOULD import the types from `@graphty/graphty-element/extend` rather
than from graph-format directly, so the types match the element that runs it.

## 4. Registration

`DeclaredAlgorithm.register(Class)` (the static is inherited from `Algorithm`).

1. `static type` and `static namespace` MUST be non-empty strings.
2. With a descriptor: `descriptor.key` MUST equal `type` (`E_BAD_COMMAND`, `field: "key"`); no field
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
   declare its own `"seed"` option and record the seed in `caveats.seed`. Forwarding them is the
   proposed `AlgorithmRunParameters` in `algorithm.d.ts`. Reproducible stochastic methods (MCL,
   Node2Vec) need it (`design/designloom/workflows/W25.yaml`). The run option `scopeAs` is reserved
   and refused with `E_BAD_COMMAND`.
4. **Acceleration.** The protected `accelerated(capability, mode)` route is used by built-ins and
   pinned for plugins, but the accelerator interface itself is internal (`candidates.md`). A
   plugin MAY use `accelerated` only with capabilities the element documents; it is not a promise
   that a plugin can add a GPU kernel.
5. **Headless testing is NOT at parity.** `Algorithm`'s constructor takes the renderer-backed
   graph, so a plugin cannot be unit-tested in Node against real element code. Section 10 proposes
   a headless host.

## 6. Options

1. `descriptor.options` is the only declaration. `DeclaredAlgorithm` resolves the caller's values
   against it (`resolveOptionValues`) before `compute` runs; `this.schemaOptions` holds the result.
2. An undeclared name is `E_UNKNOWN_OPTION` and a bad value `E_OPTION_RANGE`, whichever route the
   caller used, before any work starts.
3. A node parameter MUST be declared with type `"node-id"` and resolved to a row with
   `this.nodeIndex(snapshot, optionName, id)`, which fails with `E_OPTION_RANGE` naming the option.
4. The older `static optionsSchema` / `defineOptionsSchema` MUST NOT be used by a new algorithm.

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
| `E_NOT_CONVERGED` | an iterative algorithm did not converge and cannot publish a partial result |
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
   every run so a saved result says what produced it.
4. Result paths are derived from the key; renaming a key breaks every saved style that selects on
   its results.
5. `algorithmGraph`/`AlgorithmGraphView`: deprecated in 3.x, removed in 4.0 (section 3.2).

## 9. Security

An algorithm runs with the page's privileges and sees the whole graph, attributes included. It
MUST NOT send graph data anywhere; an algorithm that needs a remote service (an enrichment API, a
model server) is a data source, not an algorithm (`candidates.md`), because a reader must confirm a
host before anything leaves the page.

## 10. Testing without a browser (proposed)

`runAlgorithmHeadless(Class, snapshot, options)` in the "Proposed" section of `algorithm.d.ts`
runs a `DeclaredAlgorithm` over a graph-format snapshot with no renderer, in Node or a worker. It
performs the element's own steps -- option resolution, scope handling, shape-contract check, caveat
defaults, abort propagation -- and returns what `compute` returned. It would make the Node checks
of the conformance kit possible and give plugins the unit-testability the design studio's
expert reviewers expect (`design/designloom/personas/expert-emma.yaml`). It needs the algorithm
base class to stop requiring the renderer-backed graph, which the snapshot migration makes
possible. Its name and signature are part of README open decision 9.

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
| publishes by id | every `nodes[].id` is a node id of the input graph; every `edges[].id` is an element edge id |
| measures only what it measured | on a graph with an isolated node, the node is absent from `nodes` unless the algorithm defines a value for it (a warning, with the node, for an author to confirm) |
| caveats are complete | `method` and `direction` are set; a declared `approximable` or `"seed"` option is reflected in `exact`, `sampleSize` and `seed` |
| options validate | an undeclared parameter raises `E_UNKNOWN_OPTION` and an out-of-range one `E_OPTION_RANGE` before `compute` is called |
| reports progress | on the 500-node graph, `report` is called at least once with `completed` and `total` |
| cancels | aborting after the first progress report rejects the run with the abort reason and publishes nothing |
| yields | on the 500-node graph, no single uninterrupted stretch of `compute` exceeds 50 ms |
| is deterministic with a seed | with a declared `"seed"` option, two runs with the same seed give identical output |
| scope is honoured | with `scopeInput = "subgraph"`, every published id is inside the scope |
| failures are coded | an invalid input the author supplies fails with a `GraphtyError` |

## 12. Worked example

A hub score written only against the snapshot, in the style of the cytoHubba "degree" method used
in `design/designloom/workflows/W23.yaml`:

```ts
import {
    DeclaredAlgorithm, declaredCaveats, forEachChunked, metricFieldSpecs, nodeMetricFields,
    type AlgorithmDescriptor, type AlgorithmOutput, type AlgorithmRunContext, type ResultElementValues,
} from "@graphty/graphty-element/extend";

const DESCRIPTOR: AlgorithmDescriptor = {
    key: "acmehub-neighbourhood-density",
    plainName: "Neighbourhood density",
    technicalName: "Density of maximum neighbourhood component (DMNC)",
    description: "How tightly a node's neighbours are linked to each other.",
    category: "centrality",
    shape: "node-metric",
    fields: nodeMetricFields({ plainName: "Density", technicalName: "DMNC" }),
    options: [{ name: "epsilon", plainName: "Exponent", type: "number", default: 1.7, min: 1, max: 2 }],
    costClass: "iterative",
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
            if (neighbours.size < 2) return;                    // nothing to say: no row
            let inner = 0;
            for (const u of neighbours) for (const v of neighboursOf(u)) if (neighbours.has(v)) inner++;
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
                method: `dmnc, epsilon ${epsilon}`,
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

## 14. Who this serves

| Need | Source |
| --- | --- |
| MCL and MCODE clustering with per-cluster profiles | `design/designloom/workflows/W21.yaml` |
| Building an enrichment map from gene-set overlap | `design/designloom/workflows/W22.yaml` |
| Hub rankings (MCC, DMNC, combined scores) | `design/designloom/workflows/W23.yaml` |
| Embeddings and link prediction as scored pair lists | `design/designloom/workflows/W16.yaml`, `design/designloom/personas/ml-engineer-recsys.yaml` |
| Risk scoring, what-if removal | `design/designloom/workflows/W06.yaml`, `W11.yaml` |
| Pattern search for threat hunting | `design/designloom/workflows/W07.yaml` |
| Parameters and seeds recorded for a methods section | `design/designloom/workflows/W25.yaml` |
