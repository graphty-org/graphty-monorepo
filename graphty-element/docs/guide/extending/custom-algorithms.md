# Custom algorithms

Available from graphty-element 2.7.

An algorithm computes something over the graph and publishes a result: a score for every node, a
score for every edge, or a group for every node. You write the part that is yours -- how to score
one node, say -- and the element does the rest: it lists your algorithm beside its own, checks the
options a reader passes, runs it with progress and cancellation, ranks and summarises what it
returns, and colours the graph from it.

## Your first algorithm

A score for every node from an edge attribute: the summed `confidence` of the edges touching the
node.

```ts
import { defineAlgorithm } from "@graphty/graphty-element/extend";

// Confidence-weighted degree: the summed confidence of the edges touching a node.
// options.confidence is the attribute's NAME; strength() reads each edge's value.
defineAlgorithm({
    id: "acme-confidence-degree",
    options: { confidence: { type: "attribute", on: "edge", default: "confidence" } },
    node: (node, { options }) => node.strength(options.confidence),
});
```

And its companion, a score for every edge: its confidence relative to the scores of its two ends.

```ts
import { defineAlgorithm } from "@graphty/graphty-element/extend";

// An edge's confidence relative to the confidence-weighted degrees of its two ends.
defineAlgorithm({
    id: "acme-confidence-share",
    options: { confidence: { type: "attribute", on: "edge", default: "confidence" } },
    edge: (edge, { options }) => {
        const c = edge.weight(options.confidence);
        const a = edge.source.strength(options.confidence);
        const b = edge.target.strength(options.confidence);
        return c === undefined || !a || !b ? undefined : c / Math.sqrt(a * b);
    },
});
```

**Use it:**

```ts
element.run("acme-confidence-degree", {}, { as: "strength" }); // colours the nodes
element.run("acme-confidence-share", {}, { as: "share" }); // colours the edges
```

`element` is the `<graphty-element>` on your page. The middle `{}` is the run's options (none
here, so each takes its default); `{ as: "strength" }` names the result. A run colours the graph
when it first completes, with no style code: a node score becomes a colour ramp over the nodes it
measured, an edge score one over the edges. Your own style layer reaches the values at
`results.strength.value` and `results.share.value` -- the path is `results.<as name>.value` -- and a
script reads them from the result the run resolves to: `(await element.run(...)).node(id)?.value`.
The colour layer is written just after the run resolves, so a script that inspects the style
layers straight after the `await` may not see it yet.

An edge score is keyed by the element's edge id. To read each one with its two ends -- to compare
with a Python result, say -- walk the result's ranking and look the edge up:

```ts
const share = await element.run("acme-confidence-share", {}, { as: "share" });
for (const { id, value } of share.ranking("value")) {
    const edge = element.session.data.edge(String(id)); // { id, source, target, ...attributes }
    console.log(edge?.source, edge?.target, value);
}
```

`strength()` counts a self-loop once. NetworkX's `G.degree(weight="confidence")` counts it twice
and reads a missing weight as 1; to match it, add `node.edgesTo(node)` once more
([the overview](./index#coming-from-networkx) has the whole comparison).

With a bundler, import `defineAlgorithm` from `@graphty/graphty-element/extend`. On a page with no
build step, import it from the bundle, as in
[the overview's whole working page](./index#two-tiers-start-simple).

### What the element does for you

- **Options.** `options` declares what a reader may change. `confidence` above is an attribute
  option: its value is the NAME of an edge attribute, the reader can point it at another
  (`element.run("acme-confidence-degree", { confidence: "score" })`), and a name no edge carries
  is refused before your code runs. `spacing: 2`, `label: "name"` and `weighted: false` declare a
  number, a text and a yes/no option with their defaults, and
  `passes: { type: "integer", default: 30, min: 1, max: 200 }` a bounded one. Your function
  receives every option already checked and defaulted.
- **The loop.** `node` is called once per node and `edge` once per edge; you never write the loop,
  the progress report or the cancellation check. Each call must return the score itself: an
  `async` `node` is refused with a message that says so.
- **"Not measured".** Returning `undefined`, `null`, `NaN` or an infinity leaves that node or edge
  out of the result, which is different from a score of 0. Only the elements you measured are
  ranked, summarised and coloured: the rest keep whatever the layers beneath painted.
- **Missing values.** `strength` and `weight` leave out an edge with no number at the attribute,
  and the run's record says how many there were (`run.caveats.notes`). You never write `?? 0`.
- **The rest.** The catalogue entry a picker offers (`session.catalog.algorithms()`, named "Acme
  confidence degree" from the id unless you give a `name`), a cost estimate before the click, the
  ranking, distribution and summary of every result, and saved documents that record the run by
  your id.

The graph your function reads is described, with its rules, in
[the overview](./index#the-graph-an-algorithm-or-a-layout-reads): `node.neighbors()`,
`node.edges()`, `edge.other(node)`, `node.strength(path)`, `node.attr(path)` and the rest.

### When something is wrong

The first line of every error names your algorithm and the part at fault, so it is the line to
search for.

| What you wrote                                           | What you see                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| No `node`, `edge`, `nodes` or `groups`, or more than one | `E_BAD_COMMAND` from `defineAlgorithm`, naming the four                                                                   |
| An id with capitals, spaces, dots or colons              | `E_BAD_COMMAND`: `"id" must be lower-case words joined by hyphens ...`                                                    |
| A function that throws                                   | the run fails with `E_EXTENSION_FAILED`: `acme-x: node() threw for node "c" (TypeError: ...)`, your error kept as `cause` |
| An attribute name no edge carries                        | the run fails with `E_OPTION_RANGE` before your code runs, listing what the edges do carry                                |
| An option the definition does not declare                | the run fails with `E_UNKNOWN_OPTION`                                                                                     |

In TypeScript, the options are typed from your declaration, so the first line of a type error
spells out the whole options type. **Read the last line**, which names the mistake:

```text
error TS2551: Property 'confidance' does not exist on type
  'OptionValuesOf<{ readonly confidence: { readonly type: "attribute"; ... } }>'.
  Did you mean 'confidence'?
```

### An optional weight

A score that should also run on a graph with no weights declares the attribute with
`default: null`. It is unbound until the reader picks one; until then every edge weighs 1. The
run's record says which weight the numbers used -- whichever edge attribute your code read through
`weight`, `strength` or `weightTo` -- and every attribute it read. An optional
`weights: { option: "weight", meaning: "distance" }` member says what a larger weight MEANS; left
out, a weight is read as a strength:

```ts
import { defineAlgorithm, type EdgeView } from "@graphty/graphty-element/extend";

// The strongest single tie of each node. With no weight attribute picked, every edge weighs 1.
// A node with no weighted edge gets -Infinity, which is "not measured".
const heaviest = (edges: readonly EdgeView[], weight: string | undefined) =>
    Math.max(...edges.map((edge) => edge.weight(weight) ?? -Infinity));

defineAlgorithm({
    id: "acme-strongest-tie",
    options: { weight: { type: "attribute", on: "edge", default: null } },
    node: (node, { options }) => heaviest(node.edges(), options.weight),
});
```

```ts
element.run("acme-strongest-tie", {}, { as: "tie" }); // every edge weighs 1
element.run("acme-strongest-tie", { weight: "confidence" }, { as: "tie" }); // the reader's weight
```

`node.weightTo(other, options.weight)` is the weight between two nodes, parallel edges added, and
`undefined` when they are not adjacent -- or when they are, but none of their edges has a number
at the attribute. A helper that takes an edge imports the `EdgeView` type, as here.

Options that name nodes are checked too. `seeds: { type: "node-set", default: [] }` takes a list of
node ids, and `start: { type: "node-id" }` one; an id the graph does not have is refused with
`E_OPTION_RANGE` before your code runs, so you need no check of your own. The ids arrive as the
reader wrote them and match only as the data spelled them: `"0"` on a graph whose ids are numbers
is refused, not silently missed. `min` and `max` are inclusive, so an option that must stay above
0 -- a convergence tolerance -- takes a small positive minimum:
`tolerance: { type: "number", default: 1e-6, min: 1e-12, max: 1 }`.

### Four kinds of function

A definition carries exactly one of these, and the function decides what is published:

| Function                 | Called               | Publishes                                                                     |
| ------------------------ | -------------------- | ----------------------------------------------------------------------------- |
| `node(node, context)`    | once per node        | a score per node, at `results.<as>.value`                                     |
| `edge(edge, context)`    | once per edge        | a score per edge, at `results.<as>.value`                                     |
| `nodes(graph, context)`  | once, may be `async` | a score per node, from a `Map` of node id to number                           |
| `groups(graph, context)` | once, may be `async` | a group per node, at `results.<as>.group`, from a `Map` of node id to a label |

`context` holds `options` and `graph` (the whole graph). Prefer `node` or `edge` whenever the
method fits: the element owns their loop, so they can never freeze the page.

A grouping walks the whole graph itself. Connected components, with each group named after its
first node:

```ts
import { defineAlgorithm } from "@graphty/graphty-element/extend";

// Connected components: each node's group is named after the first node of its component.
defineAlgorithm({
    id: "acme-components",
    groups: (graph) => {
        const group = new Map();
        for (const start of graph.nodes()) {
            if (group.has(start.id)) continue;
            group.set(start.id, start.id);
            const queue = [start];
            for (const node of queue) {
                for (const next of node.neighbors()) {
                    if (group.has(next.id)) continue;
                    group.set(next.id, start.id);
                    queue.push(next);
                }
            }
        }
        return group;
    },
});
```

A method that makes several passes over the graph uses `nodes`, and awaits `context.progress`
once per pass. That await lets the page draw a frame and stops a cancelled run; without it the
run cannot be cancelled and the page freezes until it ends. `passes` names the option that
counts the passes, so the cost estimate grows with it:

```ts
import { defineAlgorithm } from "@graphty/graphty-element/extend";

// PageRank: on every pass, each node's rank flows to its neighbours, shared out by its degree.
defineAlgorithm({
    id: "acme-rank",
    options: { passes: { type: "integer", default: 30, min: 1, max: 200 } },
    passes: "passes",
    async nodes(graph, { options, progress }) {
        const n = graph.nodeCount;
        let rank = new Map(graph.nodes().map((node) => [node.id, 1 / n]));
        for (let pass = 1; pass <= options.passes; pass++) {
            const next = new Map();
            for (const node of graph.nodes()) {
                const from = node.edges().map((edge) => edge.other(node));
                next.set(node.id, 0.15 / n + 0.85 * from.reduce((sum, m) => sum + (rank.get(m.id) ?? 0) / m.degree, 0));
            }
            rank = next;
            await progress(pass / options.passes); // lets the page draw, and stops a cancelled run
        }
        return rank;
    },
});
```

`context` also has `note(text)`, a sentence for the run's caveats, and
`converged(done, iterations)`, which records how an iterative method ended. A definition that
reads edge direction declares `direction: "directed"`; without it the directed accessors
(`outEdges()` and the rest) throw rather than guess.

### When you need more

Move to the advanced tier below when your algorithm needs a result that is not a score or a
group (a path, a set of nodes, pairs of nodes), several values per node in one result, control
over how parallel edges merge, a seed or sampling, or speed on graphs of about 100,000 nodes and
more. Keep the same id when you do: documents, saved options and style layers that name
`results.<as>.value` keep working, because the advanced version publishes under the same names.

## Advanced: full control

The advanced tier is the class the simple tier builds for you. Extend `DeclaredAlgorithm` and
register the class: you write the descriptor the catalogue shows, read the graph as graph-format
arrays, walk it yourself and build the output. That is what a class the catalogue carries needs
to be started as a run -- progress, cancellation, a cost estimate before the click, a ranking, a
summary, a reading and the derived picture all hang off a run.

### The whole of it

````ts
```ts
import {
    type AlgorithmDescriptor,
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    metricFieldSpecs,
    nodeMetricFields,
    type OptionDescriptor,
    type ResultElementValues,
} from "@graphty/graphty-element/extend";

/** The one thing a reader can configure, declared ONCE. */
const HOPS_OPTION: OptionDescriptor = {
    name: "hops",
    plainName: "Steps",
    technicalName: "hops",
    type: "integer",
    default: 1,
    min: 1,
    max: 4,
    description: "How many steps away a node still counts as reachable.",
};

/** What a caller may configure about a run. One interface, matching the one option list. */
interface HopReachOptions extends Record<string, unknown> {
    hops: number;
}

const HOP_REACH_DESCRIPTOR: AlgorithmDescriptor = {
    // `key` must equal `static type` below: an algorithm has one name.
    key: "hop-reach",
    plainName: "Nearby nodes",
    technicalName: "bounded reach",
    description: "Counts how many other nodes each linked node can get to within a few steps.",
    category: "centrality",
    // The shape fixes the FIELD NAMES, which is how any consumer reads `results.<runId>.value`
    // without opening the catalogue first.
    shape: "node-metric",
    // Ten descriptors for one measured number, built for you -- each carries a published path
    // string a plugin should never have to learn or retype.
    fields: nodeMetricFields({
        plainName: "Nodes within reach",
        technicalName: "bounded reach",
        type: "integer",
        unit: "nodes",
    }),
    options: [HOPS_OPTION],
    costClass: "instant",
    complexity: "O(n * (n + m))",
};

class HopReach extends DeclaredAlgorithm<HopReachOptions> {
    static override namespace = "acme";
    static override type = "hop-reach";
    static override descriptor = HOP_REACH_DESCRIPTOR;

    /** Optional: recorded on every run, so a saved result says what produced its numbers. */
    static version = "1.0.0";

    /**
     * Optional: the work over a graph of n nodes and m edges, for the pre-click estimate, in the
     * units of the declared costClass ("instant": elements visited). The element divides it by the
     * rate it measured on this device, so the estimate follows the machine it runs on.
     */
    static costUnits = (n: number, m: number): number => n * (n + m);

    override async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        // Options arrive already checked and with the declared default filled in, so the running
        // code never tests for a missing parameter.
        const { hops } = this.schemaOptions;

        // The one way to read the input: the graph as a graph-format snapshot, undirected, built
        // from the graph the reader loaded rather than from the render objects. Its nodes are
        // rows 0 .. nodeCount - 1, and the neighbours of row r are colIdx[rowPtr[r] .. rowPtr[r + 1]).
        const graph = context.input("undirected").subgraph();

        if (graph.nodeCount === 0) {
            return null;
        }

        const measured: ResultElementValues[] = [];
        const steps = new Int32Array(graph.nodeCount);

        context.report({ phase: "Counting nearby nodes", completed: 0, total: graph.nodeCount });

        for (let row = 0; row < graph.nodeCount; row++) {
            // Checked at the top of every step, and the throw is never caught: a stopped run
            // stops rather than finishing quietly and publishing half an answer.
            context.signal.throwIfAborted();

            // A breadth-first walk from this node, at most `hops` steps out.
            steps.fill(-1);
            steps[row] = 0;
            const queue = [row];
            for (let head = 0; head < queue.length; head++) {
                const at = queue[head];
                if (steps[at] === hops) {
                    continue;
                }

                for (let arc = graph.rowPtr[at]; arc < graph.rowPtr[at + 1]; arc++) {
                    const next = graph.colIdx[arc];
                    if (steps[next] === -1) {
                        steps[next] = steps[at] + 1;
                        queue.push(next);
                    }
                }
            }

            const reached = queue.length - 1;

            // A node this algorithm has nothing to say about gets NO ROW. Publishing zero for it
            // would be a measurement that was never made, and the ranking, the distribution and
            // the colour ramp would all then carry an invented value. Publish by id, never by row.
            if (reached > 0) {
                measured.push({ id: graph.ids.idOf(row), values: { value: reached } });
            }

            context.report({ phase: "Counting nearby nodes", completed: row + 1, total: graph.nodeCount });

            // Hands the frame back, so the page stays responsive through a long computation.
            await context.yieldNow();
        }

        return {
            shape: "node-metric",
            fields: metricFieldSpecs("node", "integer"),
            nodes: measured,
            graph: { normalization: "none" },
            // What this run does that its numbers do not admit to, printed unedited to a reader.
            caveats: declaredCaveats({
                direction: "undirected",
                weight: null,
                method: `breadth-first walk, ${hops} step(s)`,
                notes: ["Nodes with no links are left unmeasured rather than counted as zero."],
            }),
        };
    }
}

DeclaredAlgorithm.register(HopReach);
````

`compute` RETURNS what it measured. It never writes a result anywhere, and it computes no ranking,
no percentile and no statistics -- those are the element's to derive, and deriving them per
algorithm is how two algorithms come to disagree about what a percentile is.

**Read the graph through `context.input`**, never through the render objects (`this.graph`, a
`Node`, an `Edge`). Older plugins read `this.algorithmGraph("undirected")`, a graph object from
`@graphty/algorithms`; it is being retired (it goes in graphty-element 4.0), so new code does not
use it.

### Running it

```ts
// From the element
const run = graph.run("hop-reach", { hops: 2 });
await run;

// Or from the session, with a progress handler and a signal
const started = session.runs.start(
    "hop-reach",
    { hops: 2 },
    { as: "reach", onProgress: (progress) => console.log(progress.phase, progress.completed) },
);
await started;

// What it measured
session.results.get("reach")?.node("d")?.value;
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
`costUnits` is also handed the run's option values, the declared defaults filled in, so an option
that multiplies the work is priced: `(n, m, options) => (n + m) * Number(options.maxIterations)`.

### Computing over the run's scope

A run can be scoped to part of the graph -- a kept [set](../sets), the selection, a community
another run found. Declare `static scopeInput = "subgraph"` and your algorithm computes over that
part:

```ts
class HopReach extends DeclaredAlgorithm<HopReachOptions> {
    // ...as above...
    static scopeInput = "subgraph" as const;
}
```

With it declared, `context.input(...).subgraph()` above already returns the scope's subgraph, so
the example needs no other change. The input has more to it:

```ts
override async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
    const input = context.input("undirected", { simplify: "min" });

    // The compact snapshot of the scope's nodes and edges: rows are the subgraph's, not the graph's
    const sub = input.subgraph();
    for (let row = 0; row < sub.nodeCount; row++) {
        const id = sub.ids.idOf(row); // publish by id, never by row
        // ...
    }

    // Or the full graph with the scope as masks over it, for an algorithm that only skips nodes
    console.log(input.graph.nodeCount, input.nodeCount, input.whole);
    // ...
}
```

| Member                   | What it is                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `subgraph()`             | The scope as its own compact graph-format snapshot, built on first call and cached |
| `graph`                  | The full graph, as loaded                                                          |
| `nodes`, `edges`         | The scope as bit masks over `graph` (`edges` over the declared orientation)        |
| `nodeCount`, `edgeCount` | How many nodes and edges the scope holds                                           |
| `whole`                  | True when the scope is the whole graph; `subgraph()` then returns the graph itself |

`simplify` says how parallel edges merge in `subgraph()`: `"sum"` by default, `"min"` for a
shortest path, `"max"`, or `"none"` to keep them apart.

**Declare it only once every node list, edge read and count your algorithm takes comes from the
input.** An algorithm that lists its nodes some other way while reading a scoped topology would
report every node over a subgraph's edges.

**Without the declaration**, your algorithm is handed the whole graph, the element keeps only the
scope's values of what you publish, and the run says so: "Computed on the whole graph; values kept
for the scope only." The cost estimate is then the whole graph's, so a small scope cannot admit a
run the whole graph is too large for. `register` publishes the declaration as the descriptor's
`scopeInput`; leave it out of the descriptor, which is refused if it disagrees with the class.

### Chunking, for free

`forEachChunked` walks a collection in chunks of 1024, reporting at the start of each and yielding
between them, so a long pass is one call rather than a hand-written loop:

```ts
import { forEachChunked } from "@graphty/graphty-element/extend";

const rows = Array.from({ length: graph.nodeCount }, (_, row) => row);

await forEachChunked(context, "Counting links", rows, (row) => {
    measured.push({ id: graph.ids.idOf(row), values: { value: graph.rowPtr[row + 1] - graph.rowPtr[row] } });
});
```

### Per-edge values and attribute values: not yet

**No advanced algorithm can publish per-edge values correctly yet.** A result row for an edge is
keyed by the id the element minted for that edge, and the input gives a plugin no way to turn an
edge of the snapshot into that id. Building a key from the two endpoints does not work: it cannot
name one of two parallel edges, and reading the ids from the session breaks the rule above. An
accessor for edge ids is planned.

**Nor can it read an attribute's values.** The snapshot carries the topology and one weight per
edge (`graph.weights`, filled from the attribute the element is configured to read as the edge
weight, else `1`, and merged when parallel edges are merged); it does not carry the loaded node
and edge attributes, or earlier runs' results. An attribute option therefore reaches `compute` as
a name with no route to its values. Do not declare a weight or attribute option you cannot read:
a method that silently ignores its weights is worse than one that declares none.

Until both land, write an algorithm that needs either with the simple tier above: its `edge` form
publishes by the element's own edge ids, and its graph reads any attribute or result by name.
The descriptor's fields have builders for three shapes -- `nodeMetricFields`, `edgeMetricFields`
and `communityFields` -- and `metricField` for any other. Field-spec builders exist for every shape
the advanced tier can publish: `metricFieldSpecs`,
`communityFieldSpecs`, `PATH_FIELD_SPECS`, `LAYERED_GROUPING_FIELD_SPECS` and `setFieldSpecs`.
`checkShapeContract` tells you whether your fields match the shape you declared.

### How it is refused

| What is wrong                                                          | Code                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------- |
| A `descriptor.key` that disagrees with `static type`, or no key at all | `E_BAD_COMMAND`, `details.field` naming it      |
| A key the element itself ships                                         | `E_DUPLICATE_PLUGIN`                            |
| A key nothing registered                                               | `E_UNKNOWN_ALGORITHM`, with `details.available` |
| An option the descriptor does not declare                              | `E_UNKNOWN_OPTION`, with `details.candidates`   |
| An option value outside the declared range                             | `E_OPTION_RANGE`                                |

A coded failure you raise yourself reaches the caller under the code you chose:

```ts
import { GraphtyError } from "@graphty/graphty-element/extend";

throw new GraphtyError({
    code: "E_UNSUPPORTED",
    message: "this algorithm needs a weighted graph",
    source: "run",
    details: { algorithm: "hop-reach" },
});
```

In the advanced tier, a plain `Error` -- a bug in your code -- is given `E_INTERNAL` with the
original kept as `cause`, rather than escaping raw into a consumer's handler.

### The styling rule

Your result must carry a row **only** for an element the algorithm has something to say about. The
element derives a style layer whose selector matches exactly the elements that carry a value, so a
row saying `false` or `0` for an element you did not measure turns "not in my result" into a paint
instruction -- and, because layers stack, it erases whatever the layers beneath it painted.

Do not ship styling with your algorithm. There is no `suggestedStyles` field, and dimming or
greying what your algorithm did not select is a reader's choice, not yours.

### Deliberate limits

**An advanced algorithm plugin cannot be unit-tested in Node.** `Algorithm`'s constructor takes the
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
