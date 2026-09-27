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
import type { NodeId } from "@graphty/graphty-element/session";

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

        // The documented way to read the input: built from the graph the reader loaded rather
        // than from the render objects, so an edge whose endpoints have no mesh is already in it.
        const graph = this.algorithmGraph("undirected");
        const ids = [...graph.nodes()].map((node) => node.id as NodeId);

        if (ids.length === 0) {
            return null;
        }

        const measured: ResultElementValues[] = [];

        context.report({ phase: "Counting nearby nodes", completed: 0, total: ids.length });

        for (const [index, id] of ids.entries()) {
            // Checked at the top of every step, and the throw is never caught: a stopped run
            // stops rather than finishing quietly and publishing half an answer.
            context.signal.throwIfAborted();

            const reached = [...graph.neighbors(id)].length * hops;

            // A node this algorithm has nothing to say about gets NO ROW. Publishing zero for it
            // would be a measurement that was never made, and the ranking, the distribution and
            // the colour ramp would all then carry an invented value.
            if (reached > 0) {
                measured.push({ id, values: { value: reached } });
            }

            context.report({ phase: "Counting nearby nodes", completed: index + 1, total: ids.length });

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
```

`compute` RETURNS what it measured. It never writes a result anywhere, and it computes no ranking,
no percentile and no statistics -- those are the element's to derive, and deriving them per
algorithm is how two algorithms come to disagree about what a percentile is.

## Running it

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

## Chunking, for free

`forEachChunked` walks a collection in chunks of 1024, reporting at the start of each and yielding
between them, so a long pass is one call rather than a hand-written loop:

```ts
import { forEachChunked } from "@graphty/graphty-element/extend";

await forEachChunked(context, "Counting nearby nodes", ids, (id) => {
    measured.push({ id, values: { value: [...graph.neighbors(id)].length } });
});
```

## Publishing per-edge values

A shape with an edge half -- `path`, `edge-set`, `flow` -- carries an `edges` array beside its
`nodes` array. **Every row is keyed by the id the element minted for that edge**, never by a key
built from its two endpoints: a pair of endpoints cannot name one of two parallel edges, and a
style layer has to be able to.

Your input, though, speaks in endpoint pairs, because that is all the algorithms package can
represent. The session is what joins the two: `scope.resolve` answers with the element's edge ids
and `data.edge` answers what each one joins.

```ts
import { PATH_FIELD_SPECS } from "@graphty/graphty-element/extend";
import type { EdgeId, GraphSession, NodeId, ResultElementValues } from "@graphty/graphty-element/session";

/** Every edge in the graph, by the ordered pair of endpoints it joins. */
async function edgeIdsByPair(session: GraphSession): Promise<Map<string, EdgeId>> {
    const resolved = await session.scope.resolve("graph");
    const byPair = new Map<string, EdgeId>();

    for (const id of resolved.edges) {
        const record = session.data.edge(id);

        if (record !== undefined) {
            byPair.set(`${String(record.source)}:${String(record.target)}`, id);
        }
    }

    return byPair;
}
```

Then, inside `compute`:

```ts
const byPair = await edgeIdsByPair(this.graph.getSession());
const edges: ResultElementValues<EdgeId>[] = [];

for (const { source, target } of crossed) {
    const id = byPair.get(`${String(source)}:${String(target)}`) ?? byPair.get(`${String(target)}:${String(source)}`);

    if (id !== undefined) {
        edges.push({ id, values: { onPath: true } });
    }
}
```

Field-spec builders exist for every shape: `metricFieldSpecs`, `communityFieldSpecs`,
`PATH_FIELD_SPECS`, `LAYERED_GROUPING_FIELD_SPECS` and `setFieldSpecs`. `checkShapeContract` tells
you whether your fields match the shape you declared.

## How it is refused

| What is wrong | Code |
| --- | --- |
| A `descriptor.key` that disagrees with `static type`, or no key at all | `E_BAD_COMMAND`, `details.field` naming it |
| A key the element itself ships | `E_DUPLICATE_PLUGIN` |
| A key nothing registered | `E_UNKNOWN_ALGORITHM`, with `details.available` |
| An option the descriptor does not declare | `E_UNKNOWN_OPTION`, with `details.candidates` |
| An option value outside the declared range | `E_OPTION_RANGE` |

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

**`scope`, `seed`, `exact`, `sample` and `timeBox` do not reach `compute`.** The run resolves all
five and the manager forwards only the signal, the progress channel and the yield -- to the
element's own algorithms as much as to yours.

**The 1.10 `namespace:type` address still works** and still calls `run()` directly, with no run
record, no progress, no cancel and no published result. Start a run by the catalogue key instead.
