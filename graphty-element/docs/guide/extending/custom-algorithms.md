# Custom algorithms

An algorithm computes something over the graph and publishes a result. The element runs it beside
its own, derives a ranking, a distribution, a summary and a plain-language reading from what it
returns, and paints a picture from the SHAPE of the result rather than from styling the algorithm
supplies.

Extend `DeclaredAlgorithm` and register the class. That is what makes a third party's algorithm a
first-class one: a class the catalogue does not carry cannot be started as a run, and progress,
cancellation, a cost estimate before the click, a ranking, a summary, a reading and the derived
picture all hang off a run.

## The whole of it

A tie-strength measure over an interaction log, where two people can be linked by many recorded
interactions: for every tie, the share of the weaker person's total strength that the tie carries.
It publishes one value per EDGE, on a graph with parallel edges, and imports nothing but the
element's extension entry point.

```ts
import {
    type AlgorithmDescriptor,
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    edgeMetricFields,
    forEachChunked,
    metricFieldSpecs,
    type ResultElementValues,
} from "@graphty/graphty-element/extend";

/** What a caller may configure about a run. One interface, matching the one option list. */
interface TieStrengthOptions extends Record<string, unknown> {
    strength: string;
}

const TIE_STRENGTH_DESCRIPTOR: AlgorithmDescriptor = {
    // `key` must equal `static type` below: an algorithm has one name.
    key: "tie-strength",
    plainName: "Tie strength",
    technicalName: "share of the weaker end's strength",
    description: "How much of the weaker end's total strength one tie between two nodes carries.",
    category: "structure",
    // The shape fixes the FIELD NAMES, which is how any consumer reads `results.<runId>.value`
    // without opening the catalogue first.
    shape: "edge-metric",
    // Ten descriptors for one measured number, each carrying a published path string a plugin
    // should never have to learn or retype.
    fields: edgeMetricFields({ plainName: "Share of strength", technicalName: "tie share" }),
    // The one thing a reader can configure, declared ONCE: which edge attribute is the strength.
    options: [
        {
            name: "strength",
            plainName: "Strength",
            type: "attribute",
            default: "strength",
            description: "The edge attribute saying how strong each recorded interaction is.",
        },
    ],
    costClass: "instant",
    complexity: "O(n + m)",
};

export class TieStrength extends DeclaredAlgorithm<TieStrengthOptions> {
    static override namespace = "acme";
    static override type = "tie-strength";
    static override descriptor = TIE_STRENGTH_DESCRIPTOR;

    /** Optional: recorded on every run, so a saved result says what produced its numbers. */
    static version = "1.0.0";

    /**
     * Optional: the work over a graph of n nodes and m edges, for the pre-click estimate, in the
     * units of the declared costClass ("instant": elements visited).
     */
    static costUnits = (n: number, m: number): number => n + m;

    override async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        // Options arrive already checked and with the declared default filled in.
        const { strength } = this.schemaOptions;

        // The graph as a graph-format snapshot, undirected, with every edge between two nodes merged
        // into one tie. Parallel edges in one direction merge by SUM; a reciprocal pair (A -> B and
        // B -> A) keeps one direction's weight, not their sum. The weights come from the attribute
        // the reader chose; the element fills them and records the choice as the run's weight caveat.
        const input = context.input("undirected", {
            simplify: "sum",
            weight: { attribute: strength, meaning: "strength" },
        });
        const ties = input.subgraph();

        if (ties.edgeCount === 0) {
            return null;
        }

        // A node's strength: the summed weight of every tie it has.
        const nodeStrength = ties.weightedDegree();
        const { src, dst, weights } = ties.edgeList();
        const rows = Array.from({ length: ties.edgeCount }, (_, row) => row);
        const edges: ResultElementValues<string>[] = [];

        // Chunks of 1024, a progress report at the start of each and the frame handed back between
        // them; a cancelled run stops at the next chunk.
        await forEachChunked(context, "Measuring ties", rows, (row) => {
            const weaker = Math.min(nodeStrength[src[row]], nodeStrength[dst[row]]);

            // A tie with no strength at either end has nothing to share: no row, rather than a
            // measurement that was never made.
            if (weaker <= 0) {
                return;
            }

            const value = (weights === null ? 1 : weights[row]) / weaker;

            // Publish by the element's edge id, never by row. One tie stands for every edge
            // merged into it, so the value is each of theirs.
            for (const id of input.subgraphEdgeIds(row)) {
                edges.push({ id, values: { value } });
            }
        });

        return {
            shape: "edge-metric",
            fields: metricFieldSpecs("edge"),
            edges,
            graph: { normalization: "none" },
            // What this run does that its numbers do not admit to, printed unedited to a reader.
            caveats: declaredCaveats({
                direction: "undirected",
                method: "tie weight over the weaker end's strength",
                notes: [
                    "Every edge between the same two nodes is one tie. Parallel edges in one direction " +
                        "sum their strengths; a reciprocal pair keeps one direction's strength.",
                ],
            }),
        };
    }
}

DeclaredAlgorithm.register(TieStrength);
```

`compute` RETURNS what it measured. It never writes a result anywhere, and it computes no ranking,
no percentile and no statistics -- those are the element's to derive, and deriving them per
algorithm is how two algorithms come to disagree about what a percentile is.

## Running it

```ts
// From the element
const run = graph.run("tie-strength", { strength: "calls" });
await run;

// Or from the session, with a progress handler and a signal
const started = session.runs.start(
    "tie-strength",
    { strength: "calls" },
    { as: "ties", onProgress: (progress) => console.log(progress.phase, progress.completed) },
);
await started;

// What it measured, by the element's edge id
session.results.get("ties")?.edge(edgeId)?.value;
```

A finished run is one undoable step: `session.undo()` takes the run, its result and the style
layers it applied away together, and `session.redo()` brings them back without computing again. A
run started through a transaction's `tx.run` joins the transaction's step. Undo while the run is
still going cancels it (see [Undo and History](../undo#work-still-going)).

Everything that hangs off a run comes with it: `session.results` gives the ranking, the histogram,
the summary and a plain-language reading; `session.estimate()` answers what it would cost before
anybody clicks; `session.catalog.metrics()` lists it beside the element's own with that cost; and
the element derives a style layer from the result's shape, scoped to the elements your result
actually carries a row for.

The estimate comes from `static costUnits` when you declare it, and from your `costClass` alone
when you do not. The units are those of the class: elements for `instant` and `iterative` (count
every iteration), source-edge pairs for `heavy`, operations for `cubic`. Once the device has been
calibrated the estimate reports `"calibrated"`, like a built-in's. The older
`static cost = (n, m) => seconds` still works, but those seconds cannot be scaled to the device,
so its estimate always reports `"modelled"`; `costUnits` wins when a class declares both.

## Reading the graph

`context.input(orientation, options)` is the only way an algorithm reads the graph. It hands over
graph-format snapshots -- typed arrays in compressed sparse row form -- built from the graph the
reader loaded, never the render objects:

| Member                   | What it is                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `graph`                  | The full graph as loaded, one row per node and one per edge                                         |
| `subgraph()`             | The run's input as its own compact snapshot, in the orientation asked, with parallel edges merged   |
| `edgeId(row)`            | The element's id of edge `row` of `graph`                                                           |
| `subgraphEdgeIds(row)`   | The ids of every edge of `graph` behind edge `row` of `subgraph()`                                  |
| `column(option)`         | The values behind a declared `"attribute"` or `"partition"` option, as a column over `graph`'s rows |
| `weight`                 | The weight the input was asked for, when it was                                                     |
| `nodes`, `edges`         | The run's scope as bit masks over `graph`                                                           |
| `nodeCount`, `edgeCount` | How many nodes and edges the scope holds                                                            |
| `whole`                  | True when the scope is the whole graph                                                              |

The orientation is `"declared"` (edges as the records state them) or `"undirected"` (a reciprocal
pair `A -> B`, `B -> A` becomes one edge, which keeps the lower row's weight). The options:

- `simplify` says how parallel edges merge in `subgraph()`: `"sum"` by default, the element's
  reading of a repeated edge as more connection; `"min"` for a shortest path; `"max"`; or `"none"`
  to keep every edge its own row.
- `weight` names the edge attribute the weights come from and whether a weight is a `"distance"`
  or a `"strength"`. The element fills `graph.weights` from it (an edge with no number there
  weighs 1), merges it into `subgraph()` by `simplify`, and states it as the run's
  `caveats.weight`, so the run cannot read one weight and report another. `weight: null` reads the
  graph unweighted, and `subgraph()` stays unweighted too: merged parallel edges do not weigh as
  many as they merged. Without it the weights are the ones the graph was loaded with, whose meaning
  the run does not state.

In a snapshot the neighbours of row `r` are `colIdx[rowPtr[r] .. rowPtr[r + 1])`; `edgeList()`
gives `src`, `dst` and `weights` per edge; `ids.idOf(row)` is a node's id; and `weightedDegree()`,
`degree()` and the other members of graph-format 1.x's `GraphSnapshot` are there to use. An
undirected snapshot stores each edge as two arcs, one in each endpoint's row. Take `GraphSnapshot`,
`Column`, `NodeMask` and `EdgeMask` from `@graphty/graphty-element/extend`, never from your own
copy of graph-format.

**Publish by id, never by row.** Rows of `subgraph()` are not rows of `graph`, and neither is an
id. A node's id is `snapshot.ids.idOf(row)`; an edge's is `input.edgeId(row)` for a row of
`graph`, or each of `input.subgraphEdgeIds(row)` for a row of `subgraph()`. A row of `subgraph()`
that merged parallel edges -- or a reciprocal pair -- stands for all of them, so its value is
published under every id behind it, as the example does. Columns whose names begin with
`graphty.` are the element's own bookkeeping: do not read them.

## Attributes and earlier results

Declare an option of type `"attribute"` (on nodes or edges) or `"partition"` (a grouping of nodes),
and read what it names with `input.column(name)`. The reader picks the attribute; your code never
sees the name:

```ts
const DESCRIPTOR: AlgorithmDescriptor = {
    // ...
    options: [
        { name: "group", plainName: "Grouping", type: "partition", default: "results.communities.group" },
        { name: "confidence", plainName: "Confidence", type: "attribute", default: "confidence" },
    ],
};

override async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
    const input = context.input("undirected", { simplify: "max" });
    const group = input.column("group"); // over the rows of input.graph's nodes
    const confidence = input.column("confidence"); // over the rows of input.graph's edges

    // Ask for the columns first: subgraph() carries every column handed out so far, under the
    // column's name, merged by the same rule as the weights.
    const sub = input.subgraph();
    const merged = sub.edges.require(confidence.meta.name);

    for (let row = 0; row < input.graph.nodeCount; row++) {
        if (group.isSet(row)) {
            // group.value(row) ...
        }
    }
    // ...
}
```

The value of the option is a path. `confidence` or `data.confidence` names an attribute the
records carry; `results.<run>.<field>` names what an earlier run published, so one algorithm can
build on another's result. A row whose element carries no value is unset (`isSet(row)` is false).
An attribute that both nodes and edges carry under the same name is read on the nodes; give an
edge attribute a name no node attribute uses. A partition is always read on the nodes, and the
weight on the edges, so a result field of the other kind is refused like a missing one.
A name that nothing in the graph carries is refused with `E_OPTION_RANGE` before your loop runs,
and a column asked for an option you did not declare as an attribute or partition with
`E_UNKNOWN_OPTION`.

## Computing over the run's scope

A run can be scoped to part of the graph -- a kept [set](../sets), the selection, a community
another run found. Declare `static scopeInput = "subgraph"` and your algorithm computes over that
part:

```ts
class TieStrength extends DeclaredAlgorithm<TieStrengthOptions> {
    // ...as above...
    static scopeInput = "subgraph" as const;
}
```

With it declared, `subgraph()` is the scope's own compact snapshot, so the example needs no other
change; `graph` stays the full graph, with the scope as the `nodes` and `edges` masks over it.

**Declare it only once every node list, edge read and count your algorithm takes comes from
`subgraph()`.** An algorithm that lists its nodes from `graph` while reading a scoped topology would
report every node over a subgraph's edges.

**Without the declaration**, your algorithm is handed the whole graph, the element keeps only the
scope's values of what you publish, and the run says so: "Computed on the whole graph; values kept
for the scope only." The cost estimate is then the whole graph's, so a small scope cannot admit a
run the whole graph is too large for. `register` publishes the declaration as the descriptor's
`scopeInput`; leave it out of the descriptor, which is refused if it disagrees with the class.

## Chunking, for free

`forEachChunked` walks a collection in chunks of 1024, reporting at the start of each and yielding
between them, so a long pass is one call rather than a hand-written loop -- the example uses it.
For a loop of your own, call `context.report(...)`, check `context.signal.throwIfAborted()` and
`await context.yieldNow()` between chunks: an analysis that cannot be watched or stopped is
indistinguishable, on a big graph, from one that has hung.

Field-spec builders exist for every shape: `metricFieldSpecs`, `communityFieldSpecs`,
`PATH_FIELD_SPECS`, `LAYERED_GROUPING_FIELD_SPECS` and `setFieldSpecs`, and `nodeMetricFields` and
`edgeMetricFields` build a metric descriptor's fields. `checkShapeContract` tells you whether your
fields match the shape you declared.

## Moving from `algorithmGraph()`

graphty-element 3.0 removed `Algorithm.algorithmGraph()` and the `AlgorithmGraphView` type. They
handed over an `@graphty/algorithms` object graph that held one edge per pair of nodes, so a plugin
could not name one of two parallel edges, and the only route to an edge id went through the
session. Read `context.input(...)` instead:

| Before                                          | Now                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `this.algorithmGraph("undirected")`             | `context.input("undirected").subgraph()`                                       |
| `this.algorithmGraph("directed")`               | `context.input("declared").subgraph()`                                         |
| `[...graph.nodes()].map((node) => node.id)`     | `Array.from({ length: g.nodeCount }, (_, row) => g.ids.idOf(row))`             |
| `graph.neighbors(id)`                           | `g.colIdx.subarray(g.rowPtr[row], g.rowPtr[row + 1])`, rows mapped to ids      |
| an edge id from `scope.resolve` and `data.edge` | `input.edgeId(row)`, or `input.subgraphEdgeIds(row)` for a row of `subgraph()` |

## How it is refused

| What is wrong                                                          | Code                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------- |
| A `descriptor.key` that disagrees with `static type`, or no key at all | `E_BAD_COMMAND`, `details.field` naming it      |
| A key the element itself ships                                         | `E_DUPLICATE_PLUGIN`                            |
| A key nothing registered                                               | `E_UNKNOWN_ALGORITHM`, with `details.available` |
| An option the descriptor does not declare                              | `E_UNKNOWN_OPTION`, with `details.candidates`   |
| An option value outside the declared range                             | `E_OPTION_RANGE`                                |
| `input.column(name)` for an option not declared as attribute/partition | `E_UNKNOWN_OPTION`                              |
| `input.column(name)` or `weight` naming what nothing carries           | `E_OPTION_RANGE`                                |

A coded failure you raise yourself reaches the caller under the code you chose:

```ts
import { GraphtyError } from "@graphty/graphty-element/extend";

throw new GraphtyError({
    code: "E_UNSUPPORTED",
    message: "this algorithm needs a weighted graph",
    source: "run",
    details: { algorithm: "tie-strength" },
});
```

A plain `Error` -- a bug in your code -- is given `E_INTERNAL` with the original kept as `cause`,
rather than escaping raw into a consumer's handler.

## The styling rule

Your result must carry a row **only** for an element the algorithm has something to say about. The
element derives a style layer whose selector matches exactly the elements that carry a value, so a
row saying `false` or `0` for an element you did not measure turns "not in my result" into a paint
instruction -- and, because layers stack, it erases whatever the layers beneath it painted.

Do not ship styling with your algorithm. There is no `suggestedStyles` field, and dimming or
greying what your algorithm did not select is a reader's choice, not yours.

## Deliberate limits

**An algorithm plugin cannot be unit-tested in Node.** `Algorithm`'s constructor takes the
renderer-backed `Graph`, as it does for every one of the element's own. `@graphty/graphty-element/extend`
resolving in Node buys you type-checking rather than a headless test.

**`seed`, `exact`, `sample` and `timeBox` do not reach `compute`.** The run resolves all four and
the manager forwards only the signal, the progress channel, the yield and the input -- to the
element's own algorithms as much as to yours. The scope does reach it, through `context.input`
(see "Computing over the run's scope"). The run option `scopeAs` is reserved and refused.

**The 1.10 `namespace:type` address still works** and still calls `run()` directly, with no run
record, no progress, no cancel and no published result. Start a run by the catalogue key instead.
It is still one undoable step: the `Graph` such an algorithm is handed records what it writes onto
records and graph-level results, and every door it calls on that `Graph`, into the one step (see
[Undo and History](../undo#plugin-algorithms-without-a-descriptor)).
