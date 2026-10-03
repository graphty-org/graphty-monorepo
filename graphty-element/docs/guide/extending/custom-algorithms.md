# Custom algorithms

Available from graphty-element 3.0.

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

### Naming its result

A run you start without `as` is named for you, and the name is the path a style layer reads. With
nothing else declared it is your id with underscores for hyphens: an unnamed run of
`acme-confidence-degree` publishes at `results.acme_confidence_degree.value`.

When a setting makes two runs mean different things, `suggestedName` names the result after it.
It receives the run's options, with the defaults filled in, and returns an `id` -- lower-case
letters, digits and underscores, starting with a letter -- and a `label`, the words the layer list
and the legend show. Return `undefined` to keep the plain name:

```ts
import { defineAlgorithm } from "@graphty/graphty-element/extend";

// Reach: how many other nodes are within `hops` steps. The result is named after the hop count.
defineAlgorithm({
    id: "acme-reach",
    options: { hops: { type: "integer", default: 2, min: 1, max: 10 } },
    suggestedName: (options) =>
        options.hops === 2 ? undefined : { id: `acme_reach_${options.hops}`, label: `Reach in ${options.hops} hops` },
    node: (node, { options }) => {
        const seen = new Set([node.id]);
        let frontier = [node];
        for (let hop = 0; hop < options.hops; hop++) {
            frontier = frontier.flatMap((next) => next.neighbors()).filter((next) => !seen.has(next.id));
            frontier.forEach((next) => seen.add(next.id));
        }
        return seen.size - 1;
    },
});
```

```ts
element.run("acme-reach"); // results.acme_reach.value, labelled "Acme reach"
element.run("acme-reach", { hops: 3 }); // results.acme_reach_3.value, labelled "Reach in 3 hops"
```

How the element uses the name:

- **The same run again is the same result.** Starting `acme-reach` with `hops: 3` a second time
  finds `acme_reach_3` and re-runs it if the graph changed, rather than making a second result.
  A setting the name leaves out re-runs the same result in place, and its layers repaint.
- **A different run under a name that is taken gets `_2`, `_3`, ...** -- the same settings over
  another scope, say: `acme_reach_3_2`.
- **A name passed with `as` always wins**, and an id, once given, never changes.
- **A suggested id that breaks the rule is refused** with `E_BAD_COMMAND` when the run starts.

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

A class names its result the way a definition does, with an optional
`static suggestedName = (options) => ({ id, label }) | undefined` beside `static version` (see
"Naming its result"). Left out, an unnamed run of this class publishes at
`results.tie_strength.value`.

`compute` RETURNS what it measured. It never writes a result anywhere, and it computes no ranking,
no percentile and no statistics -- those are the element's to derive, and deriving them per
algorithm is how two algorithms come to disagree about what a percentile is.

### Running it

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

`costUnits` is also handed the run's option values, the declared defaults filled in, so an option
that multiplies the work is priced: `(n, m, options) => (n + m) * Number(options.maxIterations)`.

### Reading the graph

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

### Attributes and earlier results

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

### Computing over the run's scope

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

### Chunking, for free

`forEachChunked` walks a collection in chunks of 1024, reporting at the start of each and yielding
between them, so a long pass is one call rather than a hand-written loop -- the example uses it.
For a loop of your own, call `context.report(...)`, check `context.signal.throwIfAborted()` and
`await context.yieldNow()` between chunks: an analysis that cannot be watched or stopped is
indistinguishable, on a big graph, from one that has hung.

Field-spec builders exist for every shape: `metricFieldSpecs`, `communityFieldSpecs`,
`PATH_FIELD_SPECS`, `LAYERED_GROUPING_FIELD_SPECS` and `setFieldSpecs`, and `nodeMetricFields` and
`edgeMetricFields` build a metric descriptor's fields, `communityFields` a community one's, and
`metricField` any other. `checkShapeContract` tells you whether your
fields match the shape you declared.

### Moving from `algorithmGraph()`

`Algorithm.algorithmGraph()` and the `AlgorithmGraphView` type are deprecated from graphty-element
3.1 and will be removed in 4.0. A plugin that calls them keeps working on 3.x and reads the same
graph it did on 3.0: an object graph with the `@graphty/algorithms` 2.x `Graph` methods, parallel
edges merged with their weights summed. In TypeScript it is no longer the same TYPE as
`@graphty/algorithms` 2.x's `Graph` (3.0 aliased that class; 3.1 carries a copy, and TypeScript
compares classes with private fields by name), so a TypeScript plugin that passes it to its own
`@graphty/algorithms@2` functions needs a cast, `this.algorithmGraph("directed") as unknown as Graph`,
to compile; at run time nothing changed. That graph holds one edge per pair of nodes, so a plugin
cannot name one of two parallel edges, and the only route to an edge id goes through the session.
Read `context.input(...)` instead:

| Before                                          | Now                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `this.algorithmGraph("undirected")`             | `context.input("undirected").subgraph()`                                       |
| `this.algorithmGraph("directed")`               | `context.input("declared").subgraph()`                                         |
| `[...graph.nodes()].map((node) => node.id)`     | `Array.from({ length: g.nodeCount }, (_, row) => g.ids.idOf(row))`             |
| `graph.neighbors(id)`                           | `g.colIdx.subarray(g.rowPtr[row], g.rowPtr[row + 1])`, rows mapped to ids      |
| an edge id from `scope.resolve` and `data.edge` | `input.edgeId(row)`, or `input.subgraphEdgeIds(row)` for a row of `subgraph()` |

### How it is refused

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

In the advanced tier, a plain `Error` -- a bug in your code -- is given `E_INTERNAL` with the original kept as `cause`,
rather than escaping raw into a consumer's handler.

### The styling rule

Your result must carry a row **only** for an element the algorithm has something to say about. The
element derives a style layer whose selector matches exactly the elements that carry a value, so a
row saying `false` or `0` for an element you did not measure turns "not in my result" into a paint
instruction -- and, because layers stack, it erases whatever the layers beneath it painted.

Do not ship styling with your algorithm. There is no `suggestedStyles` field, and dimming or
greying what your algorithm did not select is a reader's choice, not yours. What an algorithm may
suggest is a NAME for its result, through `suggestedName` (see "Naming its result").

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
