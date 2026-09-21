/**
 * @file An algorithm written by somebody outside this package, put through everything the
 * element gives the twenty-five algorithms it ships.
 *
 * WHAT AN ALGORITHM EXTENSION IS FOR. `@graphty/graphty-element` renders a graph and computes
 * things about it -- degree, PageRank, communities, shortest routes -- and publishes an
 * extension point so a third party can add a computation of their own. The element is meant to
 * treat that computation exactly as it treats its own: list it among the things a reader can
 * run, start it as a watchable, cancellable piece of work, check the reader's parameters before
 * any work begins, quote what it would cost before the click, turn what it produces into a
 * ranking, a distribution, a summary and a sentence of plain language, and derive a picture from
 * it -- all without the extension author writing a line of statistics, progress or styling code.
 *
 * WHY THAT NEEDS A TEST. An extension point that exists but is less capable than the built-ins
 * is a dead end a customer only discovers after committing to it, and it fails quietly: nothing
 * throws, the capability is simply absent. That is what happened here before: a third party's
 * algorithm could be registered and called, but the machinery that starts a run resolved names
 * through a closed table, so a plugin could never BE a run -- and progress, cancellation, cost,
 * ranking, summary and the derived picture all hang off a run.
 *
 * WHAT THIS FILE PROVES. Three dummy extensions, written the way a customer would write them, are
 * built here and then driven through every capability a built-in algorithm has. Every assertion
 * reads an OUTCOME -- the numbers published, the colour a node ended up painted, the run that
 * was actually stopped, the name a summary row carries -- rather than checking that a call did
 * not throw.
 *
 * THE FIRST DUMMY. `HopReach` measures, for each node, how many other nodes sit within a
 * configurable number of steps of it. It is deliberately two lines of counting: what is being
 * tested is what the element carries it through, not its arithmetic. It leaves a node with no
 * links unmeasured rather than reporting zero for it, because "this node has nothing I can say
 * about it" and "I measured this node and got zero" are different facts -- and that difference
 * is what the "paints only the nodes it measured" test below reads back.
 *
 * THE SECOND DUMMY. `AlphabetWalk` starts at the node whose id sorts first and keeps stepping to
 * the alphabetically next neighbour it has not already visited. It exists because a metric only
 * exercises half the result: a route publishes a value for EDGES as well as nodes, addressed by
 * the pair of endpoints, and the element derives a highlight rather than a colour ramp from it.
 * It also publishes a row only for the elements it actually walked, which is the rule the
 * element holds every algorithm to -- an element an algorithm has nothing to say about is not
 * that algorithm's to paint, not even to a default.
 *
 * THE THIRD DUMMY. `FaultyCount` only fails, which is the half of the contract the other two
 * never reach. An extension fails for the same reasons a built-in does, and a consumer needs the
 * same thing back in both cases: a run marked failed and a `GraphtyError` carrying a code to
 * switch on. It fails in the two ways that must be told apart -- throwing a coded error of its
 * own, which the element has to carry through unchanged, and throwing a plain `Error` the way a
 * bug does, which the element has to give a code to rather than letting it escape raw.
 *
 * WHAT A CUSTOMER WOULD IMPORT. The imports below are the package's own published entry points
 * -- `@graphty/graphty-element`, `/extend` and `/session` -- reached here through the entry-point
 * source files at the package root rather than through the built `dist`, so the test runs
 * without a build. No deep `src/` path is used anywhere in this file, which is the point: a
 * customer has no deep paths available to them. Everything an extension AUTHOR needs now comes
 * from one entry point, `/extend`; `/session` is read only for the two id types a test's
 * assertions name, which a reader of results needs rather than a writer of algorithms.
 */

import { InstancedMesh } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import {
    Algorithm,
    type AlgorithmDescriptor,
    type AlgorithmGraphMode,
    type AlgorithmOutput,
    type AlgorithmRunContext,
    type Caveats,
    checkShapeContract,
    DeclaredAlgorithm,
    declaredCaveats,
    type FieldDescriptor,
    forEachChunked,
    GraphtyError,
    isGraphtyError,
    metricField,
    metricFieldSpecs,
    nodeMetricFields,
    type OptionDescriptor,
    PATH_FIELD_SPECS,
    type Progress,
    type ResultElementValues,
    type ResultFieldSpec,
    type RunId,
} from "../../../extend";
import { Graph } from "../../../index";
import type { EdgeId, GraphSession, NodeId } from "../../../session";

// ---------------------------------------------------------------------------------------------
// The graph every test below runs on
// ---------------------------------------------------------------------------------------------

/**
 * Eight nodes in a line, plus one with no links at all.
 *
 * The line gives the metric more than one answer -- the two ends reach fewer neighbours than the
 * middle -- so a ranking, a distribution and a colour ramp all have something to show. The
 * unconnected node is the element the extension deliberately says nothing about.
 *
 * Each node also carries a `name`, which is what a reader would see on a card. Nothing reads it
 * unless a test tells the graph that `name` is the label attribute, which is how the element's
 * own configuration works: a graph that was never told where the names are has none.
 */
const NODES = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Bravo" },
    { id: "c", name: "Charlie" },
    { id: "d", name: "Delta" },
    { id: "e", name: "Echo" },
    { id: "f", name: "Foxtrot" },
    { id: "g", name: "Golf" },
    { id: "h", name: "Hotel" },
    { id: "alone", name: "Solo" },
];

/** The line: a - b - c - d - e - f - g - h. Nothing touches "alone". */
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "d" },
    { src: "d", dst: "e" },
    { src: "e", dst: "f" },
    { src: "f", dst: "g" },
    { src: "g", dst: "h" },
];

/** The node the extension never measures, named once so no test spells it twice. */
const UNMEASURED = "alone";

/** The colour the element's own base layer paints every node before anything else runs. */
const DEFAULT_NODE_COLOR = { r: 99 / 255, g: 102 / 255, b: 241 / 255 };

/** Where a node's display name lives in the records above, for the one test that configures it. */
const LABEL_ATTRIBUTE = "name";

// ---------------------------------------------------------------------------------------------
// The first extension: what it publishes about itself
// ---------------------------------------------------------------------------------------------

/**
 * The one thing a reader can configure, declared ONCE.
 *
 * `OptionDescriptor` is plain data, so a consumer renders a form from it without knowing what
 * validation library the element uses -- and it is the same list the element validates a
 * caller's values against, on the way into a run and on the way into the constructor. An
 * extension used to have to write this twice, in two vocabularies that did not correspond, with
 * nothing cross-checking them; the test below named "declares its one option once" is what pins
 * that it no longer does.
 */
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

/**
 * The fields this extension's result publishes, built by the element's own builder.
 *
 * Ten descriptors for a metric that measures one number, because the RESULT SHAPE fixes the
 * names rather than the algorithm: every node metric publishes `value`, `rank` and `percentile`
 * per node and seven statistics for the graph, so a consumer can read `results.<run>.value` off
 * any metric without looking the algorithm up first. Only `value` is computed here -- the
 * element fills the other nine from that column.
 *
 * Calling `nodeMetricFields` rather than writing them out is the point of the line. Each
 * descriptor carries a published PATH (`results.$.value`), and a path format is exactly the kind
 * of thing an extension author should never have to learn, retype, or keep in step with a
 * release.
 */
const HOP_REACH_FIELDS: readonly FieldDescriptor[] = nodeMetricFields({
    plainName: "Nodes within reach",
    technicalName: "bounded reach",
    type: "integer",
    unit: "nodes",
});

/**
 * What the catalogue publishes about this extension.
 *
 * Declaring this is what makes a third party's algorithm a first-class one. Without it the class
 * can be registered and called and nothing more: it cannot be started as a run, and progress,
 * cancellation, the cost estimate, the ranking, the summary, the reading and the derived picture
 * all hang off a run.
 *
 * `key` matches the class's `type` below because the element now refuses a registration where
 * the two disagree. It used to accept one, and the consequence was silent: the run computed the
 * right numbers, published them under one name, and was then looked up under the other, so the
 * picture it suggested simply never appeared.
 */
const HOP_REACH_DESCRIPTOR: AlgorithmDescriptor = {
    key: "hop-reach",
    plainName: "Nearby nodes",
    technicalName: "bounded reach",
    description: "Counts how many other nodes each linked node can get to within a few steps.",
    category: "centrality",
    shape: "node-metric",
    fields: HOP_REACH_FIELDS,
    options: [HOPS_OPTION],
    costClass: "instant",
    complexity: "O(n * (n + m))",
};

/** What the extension calls the pass it makes, which is what a progress line shows a reader. */
const PROGRESS_PHASE = "Counting nearby nodes";

/**
 * The fields the run DECLARES, which is the whole node-metric set.
 *
 * It fills only `value`; the element fills `rank` and `percentile` from that column, and the
 * graph-level statistics from it too. Declaring the full set is what says "this is a node
 * metric" -- the shape fixes the names, which is how any consumer reads
 * `results.<runId>.value` without opening the catalogue first.
 */
const HOP_REACH_FILLED: readonly ResultFieldSpec[] = metricFieldSpecs("node", "integer");

// ---------------------------------------------------------------------------------------------
// What the extension tells the tests about its own run
// ---------------------------------------------------------------------------------------------

/**
 * A window into the extension's own execution, so a test can assert the element reached it.
 *
 * Cancellation is the reason this exists. "The promise rejected with an AbortError" is also what
 * a run cancelled before it ever started would produce, and that would prove nothing about
 * whether a third party's code can be stopped. So the extension says when it has begun, offers
 * to dawdle so a cancel has somewhere to land, and records whether its own abort signal is what
 * stopped it.
 */
const probe = {
    /** Called by the extension the first time it reaches a yield point. Reset per test. */
    begun: (): void => undefined,
    /** Milliseconds the extension waits at each yield point, so a cancel can arrive mid-run. */
    dawdleMs: 0,
    /** Whether the extension's own signal was aborted when it stopped. */
    stoppedBySignal: false,
};

/**
 * A promise with its resolve kept beside it.
 * @returns The promise and the function that settles it.
 */
function deferred(): { promise: Promise<void>; resolve: () => void } {
    let resolve = (): void => undefined;
    const promise = new Promise<void>((settle) => {
        resolve = settle;
    });

    return { promise, resolve };
}

// ---------------------------------------------------------------------------------------------
// The first extension itself
// ---------------------------------------------------------------------------------------------

/**
 * What a caller may configure about a run of this extension.
 *
 * One interface, matching the one option list above. The values arrive already checked and with
 * the declared default filled in, so the running code never tests for a missing parameter.
 */
interface HopReachOptions extends Record<string, unknown> {
    /** How many steps away a node still counts as reachable. */
    hops: number;
}

/**
 * A third party's node metric: how many other nodes sit within a few steps of each node.
 *
 * `DeclaredAlgorithm` is the base the element's own algorithms use. A subclass implements
 * `compute` and RETURNS what it measured; it never writes a result anywhere, and it computes no
 * ranking, no percentile and no statistics, because those are the element's to derive and
 * deriving them per algorithm is how two algorithms come to disagree about what a percentile is.
 */
class HopReach extends DeclaredAlgorithm<HopReachOptions> {
    static override namespace = "acme";

    static override type = "hop-reach";

    static override descriptor = HOP_REACH_DESCRIPTOR;

    /**
     * Count what each linked node can reach.
     * @param context - What the element gave this run: a signal to stop on, a channel to report
     *   progress down, and a way to hand the frame back between chunks.
     * @returns What was measured, or null when there was nothing to measure.
     */
    override async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const { hops } = this.schemaOptions;
        // The documented way for an algorithm to read its input. It is built from the graph the
        // reader loaded rather than from the render objects, so an edge whose endpoints have no
        // mesh yet is already in it.
        const graph = this.algorithmGraph("undirected");
        const ids = [...graph.nodes()].map((node) => node.id);

        if (ids.length === 0) {
            return null;
        }

        // Gathered once, so the walk below is over the extension's own data structure and the
        // extension never has to name the type of the element's input graph.
        const neighbours = new Map<NodeId, readonly NodeId[]>(ids.map((id) => [id, [...graph.neighbors(id)]]));
        const measured: ResultElementValues[] = [];

        context.report({ phase: PROGRESS_PHASE, completed: 0, total: ids.length });

        try {
            for (let index = 0; index < ids.length; index++) {
                // Cancellation is checked at the top of every step and the throw is never caught,
                // so a stopped run stops rather than finishing quietly and publishing half an
                // answer.
                context.signal.throwIfAborted();

                const id = ids[index];
                const reached = reachWithin(neighbours, id, hops);

                // A node nothing links to has no reach to report. Publishing zero for it would be
                // a measurement this algorithm did not make, and everything downstream -- the
                // ranking, the distribution, the colour ramp -- would then carry an invented
                // value.
                if (reached !== null) {
                    measured.push({ id, values: { value: reached } });
                }

                context.report({ phase: PROGRESS_PHASE, completed: index + 1, total: ids.length });

                if (index === 0) {
                    probe.begun();
                }

                await context.yieldNow();

                if (probe.dawdleMs > 0) {
                    await new Promise<void>((settle) => setTimeout(settle, probe.dawdleMs));
                }
            }
        } finally {
            probe.stoppedBySignal = context.signal.aborted;
        }

        return {
            shape: "node-metric",
            fields: HOP_REACH_FILLED,
            nodes: measured,
            // The one graph-level field a metric fills itself; the element computes the rest of
            // them from the column above.
            graph: { normalization: "none" },
            caveats: declaredCaveats({
                direction: "undirected",
                weight: null,
                method: `breadth-first walk, ${hops} step(s)`,
                notes: ["Nodes with no links are left unmeasured rather than counted as zero."],
            }),
        };
    }
}

/**
 * How many other nodes lie within `hops` steps of one node.
 * @param neighbours - Who each node is linked to.
 * @param from - The node to walk out from.
 * @param hops - How far to walk.
 * @returns The count, or null when the node has no links and there is nothing to measure.
 */
function reachWithin(neighbours: ReadonlyMap<NodeId, readonly NodeId[]>, from: NodeId, hops: number): number | null {
    const seen = new Set<NodeId>([from]);
    let frontier: NodeId[] = [from];

    for (let step = 0; step < hops; step++) {
        const next: NodeId[] = [];

        for (const node of frontier) {
            for (const neighbour of neighbours.get(node) ?? []) {
                if (!seen.has(neighbour)) {
                    seen.add(neighbour);
                    next.push(neighbour);
                }
            }
        }

        frontier = next;
    }

    // The node itself is in `seen`, so a node that reached nothing has a set of exactly one.
    return seen.size === 1 ? null : seen.size - 1;
}

// ---------------------------------------------------------------------------------------------
// The second extension: a route, so the edge half of a result is exercised
// ---------------------------------------------------------------------------------------------

/** How many steps the walk takes before it stops, by default and at most. */
const WALK_STEPS: OptionDescriptor = {
    name: "steps",
    plainName: "Steps",
    technicalName: "steps",
    type: "integer",
    default: 3,
    min: 1,
    max: 8,
    description: "How many links the walk follows before it stops.",
};

/**
 * What the catalogue publishes about the walk.
 *
 * A `path` shape rather than a metric, which changes three things the element does with the
 * result and none of what the extension writes: the field names it must publish, the fact that
 * the edge half is part of the contract, and the picture derived from it -- a highlight over the
 * elements the walk chose rather than a colour ramp over everything measured.
 */
const ALPHABET_WALK_DESCRIPTOR: AlgorithmDescriptor = {
    key: "alphabet-walk",
    plainName: "Alphabetical walk",
    technicalName: "greedy alphabetical walk",
    description: "Starts at the first node by name and keeps stepping to the next name it is linked to.",
    category: "path",
    shape: "path",
    // `metricField` is the element's own path builder: it fills in the published
    // `results.$.<name>` address so no extension author retypes one.
    fields: [
        metricField({ name: "onPath", plainName: "On the walk", technicalName: "onPath", kind: "node", type: "boolean" }),
        metricField({ name: "order", plainName: "Step", technicalName: "order", kind: "node", type: "integer" }),
        metricField({ name: "onPath", plainName: "On the walk", technicalName: "onPath", kind: "edge", type: "boolean" }),
        metricField({
            name: "length",
            plainName: "Nodes on the walk",
            technicalName: "length",
            kind: "graph",
            type: "integer",
        }),
        metricField({ name: "cost", plainName: "Total weight", technicalName: "cost", kind: "graph", type: "number" }),
        metricField({ name: "hops", plainName: "Steps taken", technicalName: "hops", kind: "graph", type: "integer" }),
    ],
    options: [WALK_STEPS],
    costClass: "instant",
    complexity: "O(n + m)",
};

/** What the walk calls its one pass, which is what a progress line shows a reader. */
const WALK_PHASE = "Walking the graph";

/**
 * The orientation the walk reads its input in.
 *
 * Declared as the element's own type rather than as a bare string, so a mode that stops being
 * supported is a compile error in the extension rather than a run-time surprise.
 */
const WALK_MODE: AlgorithmGraphMode = "directed";

/** What a caller may configure about a walk. */
interface AlphabetWalkOptions extends Record<string, unknown> {
    /** How many links the walk follows before it stops. */
    steps: number;
}

/**
 * A third party's route: walk to the alphabetically next neighbour, over and over.
 *
 * Chosen because it is obviously right by inspection and resembles nothing the element ships. It
 * exists to exercise the half of a result a metric cannot reach: a value per EDGE, addressed by
 * the pair of endpoints the element addresses an edge by.
 */
class AlphabetWalk extends DeclaredAlgorithm<AlphabetWalkOptions> {
    static override namespace = "acme";

    static override type = "alphabet-walk";

    static override descriptor = ALPHABET_WALK_DESCRIPTOR;

    /**
     * Walk the graph and say which nodes and edges the route ran through.
     * @param context - What the element gave this run.
     * @returns The route, or null when the graph had no nodes at all.
     */
    override async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const { steps } = this.schemaOptions;
        // Read in the declared orientation, because an edge's published id is its endpoints in
        // the order the record stated them -- not in the order the walk happened to cross it.
        const graph = this.algorithmGraph(WALK_MODE);
        const links = [...graph.edges()].map((edge) => ({ source: edge.source, target: edge.target }));
        const ids = [...graph.nodes()].map((node) => node.id);

        if (ids.length === 0) {
            return null;
        }

        const route = walkAlphabetically(ids, links, steps);

        /* THE ID PUBLISHED IS THE ELEMENT'S OWN, NOT A KEY BUILT FROM TWO ENDPOINTS. The element
           mints an id per edge, because a pair of endpoints cannot name one of two parallel
           edges and a style layer has to be able to. The map from a pair to that id is built
           here from the session -- `scope.resolve` for the ids and `data.edge` for each one's
           endpoints -- which is the only route a third party has to it. */
        const idOfPair = await elementEdgeIds(this.graph.getSession());
        const routeEdges = new Set<EdgeId>();

        for (let index = 0; index + 1 < route.length; index++) {
            const from = route[index];
            const to = route[index + 1];
            const found = idOfPair.get(pairKey(from, to)) ?? idOfPair.get(pairKey(to, from));

            if (found !== undefined) {
                routeEdges.add(found);
            }
        }

        const nodes: ResultElementValues[] = [];

        // The element's own chunk-report-yield loop, rather than one written here. Before it was
        // published an extension had to reimplement it, and the two copies the element itself
        // carried disagreed about the chunk size AND about whether yielding hands the frame back
        // -- so there was no single behaviour to copy even if an author went looking.
        await forEachChunked(context, WALK_PHASE, route, (id, index) => {
            nodes.push({ id, values: { onPath: true, order: index } });
        });

        return {
            shape: "path",
            fields: PATH_FIELD_SPECS,
            nodes,
            // A row ONLY for the elements the walk ran through. Publishing `onPath: false` for
            // everything else would turn "I have nothing to say about this edge" into a paint
            // instruction, and the derived highlight would reach the whole graph.
            edges: [...routeEdges].map((id) => ({ id, values: { onPath: true } })),
            graph: { length: route.length, cost: route.length - 1, hops: route.length - 1 },
            caveats: declaredCaveats({
                direction: "undirected",
                weight: null,
                method: "greedy alphabetical walk",
                notes: ["The walk stops when no neighbour sorts after the node it is standing on."],
            }),
        };
    }
}

/**
 * A lookup key for one ordered pair of endpoints. Never published as an edge id.
 * @param source - The id of the node the edge leaves.
 * @param target - The id of the node the edge enters.
 * @returns The key.
 */
function pairKey(source: NodeId, target: NodeId): string {
    return `${String(source)}:${String(target)}`;
}

/**
 * Every edge in the graph, by the ordered pair of endpoints it joins.
 *
 * THIS IS THE ROUTE A THIRD PARTY HAS TO THE ELEMENT'S EDGE IDS, and it is built from published
 * API only: `scope.resolve` answers with the ids, and `data.edge` answers what each one joins.
 * An algorithm that computes over endpoint pairs -- which is all `@graphty/algorithms` can speak
 * in -- needs this to publish a per-edge result, because the id a result row carries has to be
 * the id the element minted.
 * @param session - The session the algorithm is running against.
 * @returns The ids, by ordered pair.
 */
async function elementEdgeIds(session: GraphSession): Promise<Map<string, EdgeId>> {
    const resolved = await session.scope.resolve("graph");
    const byPair = new Map<string, EdgeId>();

    for (const id of resolved.edges) {
        const record = session.data.edge(id);

        if (record !== undefined) {
            byPair.set(pairKey(record.source, record.target), id);
        }
    }

    return byPair;
}

/**
 * Walk from the first node by name to the next name it is linked to, over and over.
 * @param ids - Every node in the graph.
 * @param links - Every edge, in the orientation it was declared in.
 * @param steps - How many links to follow at most.
 * @returns The nodes the walk ran through, in the order it reached them.
 */
function walkAlphabetically(
    ids: readonly NodeId[],
    links: readonly { source: NodeId; target: NodeId }[],
    steps: number,
): readonly NodeId[] {
    const neighbours = new Map<NodeId, NodeId[]>();

    for (const link of links) {
        neighbours.set(link.source, [...(neighbours.get(link.source) ?? []), link.target]);
        neighbours.set(link.target, [...(neighbours.get(link.target) ?? []), link.source]);
    }

    const sorted = [...ids].sort((left, right) => (String(left) < String(right) ? -1 : 1));
    const route: NodeId[] = [sorted[0]];
    const visited = new Set<NodeId>(route);

    while (route.length <= steps) {
        const standing = route[route.length - 1];
        const next = (neighbours.get(standing) ?? [])
            .filter((candidate) => !visited.has(candidate) && String(candidate) > String(standing))
            .sort((left, right) => (String(left) < String(right) ? -1 : 1))[0];

        if (next === undefined) {
            break;
        }

        route.push(next);
        visited.add(next);
    }

    return route;
}

// ---------------------------------------------------------------------------------------------
// The third extension: one that fails, so the failure half of the contract is exercised
// ---------------------------------------------------------------------------------------------

/**
 * What the failing extension should throw on its next run. Set by the test that reads it back.
 *
 * Two kinds, because the element promises two different things about them. A `GraphtyError` the
 * extension built carries a code it chose, and that code is what a consumer switches on, so the
 * element must carry it through rather than flattening it into a generic failure. Anything else
 * -- a `TypeError` from a mistake in the extension, a string from a library -- has no code, so
 * the element must supply one rather than letting an uncoded throw escape into a consumer's
 * error handling.
 */
const faulty = {
    /** Whether the next run throws a plain `Error` rather than a coded `GraphtyError`. */
    plain: false,
};

/** The code the failing extension chooses when it reports the failure itself. */
const CHOSEN_FAILURE_CODE = "E_UNSUPPORTED";

/**
 * A third party's algorithm that cannot finish.
 *
 * An extension fails for the same reasons a built-in does -- input it cannot handle, a
 * dependency that is not there, a bug -- and what a consumer needs back is the same thing in both
 * cases: a run marked failed, and a `GraphtyError` carrying a code they can switch on. A raw
 * throw escaping from a plugin would be the one failure a consumer's handler had to special-case.
 */
class FaultyCount extends DeclaredAlgorithm {
    static override namespace = "acme";

    static override type = "faulty-count";

    static override descriptor: AlgorithmDescriptor = {
        key: "faulty-count",
        plainName: "Always fails",
        technicalName: "faulty count",
        description: "Exists to fail, so the failure half of the run contract has something to read.",
        category: "centrality",
        shape: "node-metric",
        fields: HOP_REACH_FIELDS,
        options: [],
        costClass: "instant",
        complexity: "O(1)",
    };

    /**
     * Fail, in whichever of the two ways the test asked for.
     * @throws The extension's own coded failure, or a plain `Error` standing in for a bug.
     */
    override compute(): Promise<AlgorithmOutput | null> {
        if (faulty.plain) {
            throw new Error("the extension hit something it could not handle");
        }

        throw new GraphtyError({
            code: CHOSEN_FAILURE_CODE,
            message: "this extension refuses a graph with no weights",
            source: "run",
            details: { algorithm: "faulty-count" },
        });
    }
}

/*
 * Registration is a module side effect, exactly as it is for the element's own algorithms:
 * importing the module is what makes the algorithm available, page-wide, to every session.
 */
DeclaredAlgorithm.register(HopReach);
DeclaredAlgorithm.register(AlphabetWalk);
DeclaredAlgorithm.register(FaultyCount);

// ---------------------------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------------------------

/**
 * Wait until something becomes true, or give up.
 *
 * Several of the element's answers land asynchronously -- a run's derived picture is applied
 * without the caller awaiting it, on purpose, so that starting a run never makes a caller wait
 * for paint. Polling for the outcome is honest about that; a fixed sleep is a guess.
 * @param predicate - The condition to wait for.
 * @param what - What is being waited for, for the failure message.
 */
async function waitFor(predicate: () => boolean, what: string): Promise<void> {
    const deadline = Date.now() + 5000;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise<void>((settle) => setTimeout(settle, 10));
    }

    assert.fail(`Timed out waiting for ${what}`);
}

/**
 * The code a `GraphtyError` carries, or null when what was thrown is not one.
 * @param thrown - Whatever came back.
 * @returns The code, or null.
 */
function codeOf(thrown: unknown): string | null {
    return isGraphtyError(thrown) ? thrown.code : null;
}

describe("an algorithm written outside this package", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        probe.begun = (): void => undefined;
        probe.dawdleMs = 0;
        probe.stoppedBySignal = false;
        faulty.plain = false;

        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * The nodes this extension measures, which is every node but the unlinked one.
     * @returns The measured ids.
     */
    function measuredIds(): string[] {
        return NODES.map((node) => node.id).filter((id) => id !== UNMEASURED);
    }

    /**
     * The colour one node is currently drawn in, read off the mesh the renderer is using.
     * @param id - The node to read.
     * @returns The red, green and blue the renderer holds for it, each from 0 to 1.
     */
    function paintedColor(id: string): { r: number; g: number; b: number } {
        const node = graph.getNodes().find((candidate) => String(candidate.id) === id);

        assert.isDefined(node, `the graph holds a node "${id}"`);

        const { mesh } = node;

        assert.instanceOf(mesh, InstancedMesh, "the node is drawn from an instanced mesh");

        const color = mesh.instancedBuffers.color as { r: number; g: number; b: number } | undefined;

        assert.isDefined(color, `node "${id}" carries a colour the element painted`);

        return color;
    }

    /**
     * Whether two colours are the same to within rounding.
     * @param left - One colour.
     * @param right - The other.
     * @returns True when they match.
     */
    function sameColor(left: { r: number; g: number; b: number }, right: { r: number; g: number; b: number }): boolean {
        return (
            Math.abs(left.r - right.r) < 0.01 && Math.abs(left.g - right.g) < 0.01 && Math.abs(left.b - right.b) < 0.01
        );
    }

    /**
     * Run the extension and wait for everything the element does in response to settle.
     * @param params - The parameters to run with.
     * @returns The finished run's id and its result.
     */
    async function runHopReach(params?: Record<string, unknown>): Promise<RunId> {
        const run = graph.run("hop-reach", params);

        await run;
        await graph.operationQueue.waitForCompletion();
        graph.getUpdateManager().renderFixedFrames(2);

        return run.id;
    }

    it("is listed in the catalogue a consumer reads to know what the element can run", () => {
        const listed = graph
            .getSession()
            .catalog.algorithms()
            .find((entry) => entry.key === "hop-reach");

        assert.isDefined(listed, "a picker built from the catalogue offers it");
        assert.strictEqual(listed?.plainName, "Nearby nodes", "under the name its author chose");
        assert.strictEqual(listed?.shape, "node-metric");
        assert.deepStrictEqual(
            listed?.options.map((option) => option.name),
            ["hops"],
            "and carries the option a form would render",
        );

        const keys = graph
            .getSession()
            .catalog.algorithms()
            .map((entry) => entry.key);

        assert.include(keys, "degree", "beside the element's own, which are still there");
    });

    it("is offered as a metric for this graph, with a cost beside it", () => {
        const offered = graph
            .getSession()
            .catalog.metrics()
            .find((entry) => entry.key === "hop-reach");

        assert.isDefined(offered, "the metric listing carries it");
        assert.isTrue(offered?.available, "and says it can be run on this graph");
        assert.strictEqual(offered?.costClass, "instant");

        // A finite number, and the SAME one the gate would quote. `isNumber` alone would be
        // satisfied by the infinity the estimator returns when it has nothing to say, which is
        // exactly the answer a metric listing must not give for an algorithm it says is
        // available -- a picker would render "Infinity s" beside a button it just enabled.
        assert.isTrue(
            Number.isFinite(offered?.estimateSeconds),
            "with a real number of seconds rather than the estimator's shrug",
        );
        assert.strictEqual(
            offered?.estimateSeconds,
            graph.getSession().estimate({ op: "algo.run", algorithm: "hop-reach" }).seconds,
            "and it is the same number the cost gate would quote",
        );
    });

    it("can be asked what it would cost before anybody clicks", () => {
        const estimate = graph.getSession().estimate({ op: "algo.run", algorithm: "hop-reach" });

        assert.isTrue(estimate.available, "the control can be offered");
        assert.isNumber(estimate.seconds);
        // Finite, not merely not-NaN: the estimator says "I cannot answer" with an infinity, and
        // an infinity beside `available: true` is a control a consumer would enable and then
        // label with a cost nobody can read.
        assert.isTrue(Number.isFinite(estimate.seconds), "a real number, not a shrug");
        assert.strictEqual(estimate.costClass, "instant", "read from what the extension declared");
        assert.isNotEmpty(estimate.basis, "and a sentence saying where the number came from");
    });

    it("runs when the element is asked for it by name, and answers with its own numbers", async () => {
        const run = graph.run("hop-reach");

        assert.strictEqual(run.algorithm, "hop-reach");
        assert.strictEqual(run.shape, "node-metric");

        const result = await run;

        assert.strictEqual(run.status, "succeeded");
        // One step along a line: the two ends have one neighbour, the six in the middle have two,
        // and the unlinked node was not measured.
        assert.strictEqual(result.node("a")?.value, 1);
        assert.strictEqual(result.node("d")?.value, 2);
        assert.strictEqual(result.node("h")?.value, 1);
        assert.isUndefined(result.node(UNMEASURED), "the node it said nothing about carries nothing");
    });

    it("reports progress while it works", async () => {
        const seen: Progress[] = [];
        const run = graph.run("hop-reach", {}, { onProgress: (progress) => seen.push(progress) });

        await run;

        const mine = seen.filter((progress) => progress.phase === PROGRESS_PHASE);

        assert.isNotEmpty(mine, "the element forwarded the extension's own reports to the caller, in its own words");

        const last = mine[mine.length - 1];

        assert.strictEqual(last.total, NODES.length, "over the total the extension declared");
        assert.strictEqual(last.completed, NODES.length);
        assert.isTrue(last.determinate, "so a consumer draws a bar rather than a spinner");
        assert.strictEqual(last.fraction, 1);
    });

    it("stops when the run is cancelled", async () => {
        const started = deferred();

        probe.begun = started.resolve;
        // Enough of a pause between steps that the cancel below lands while the extension's own
        // loop is running, rather than before the work ever started.
        probe.dawdleMs = 20;

        const run = graph.run("hop-reach");

        await started.promise;
        run.cancel("the reader pressed Stop");

        let rejection: unknown;

        try {
            await run;
        } catch (error) {
            rejection = error;
        }

        assert.instanceOf(rejection, DOMException, "a cancel rejects the way every consumer already handles");
        assert.strictEqual(rejection.name, "AbortError");
        assert.strictEqual(run.status, "canceled");

        // The caller's promise rejects the moment Cancel is pressed, which is what a Cancel
        // button needs; the extension unwinds a step later. Waiting for it is what distinguishes
        // "the element stopped waiting" from "the third party's own loop was actually stopped".
        await waitFor(
            () => probe.stoppedBySignal,
            "the extension's own loop to unwind because the signal it was given was aborted",
        );
    });

    it("reads the option the caller passed and computes a different answer for it", async () => {
        const oneStep = await graph.run("hop-reach", { hops: 1 });
        const twoSteps = await graph.run("hop-reach", { hops: 2 });

        // One step from the end of a line reaches one node; two steps reach two.
        assert.strictEqual(oneStep.node("a")?.value, 1);
        assert.strictEqual(twoSteps.node("a")?.value, 2);
        // And from the middle, two steps reach four.
        assert.strictEqual(oneStep.node("d")?.value, 2);
        assert.strictEqual(twoSteps.node("d")?.value, 4);
    });

    it("declares its one option once, in the catalogue's vocabulary, and still receives it", async () => {
        const declared = graph
            .getSession()
            .catalog.algorithms()
            .find((entry) => entry.key === "hop-reach")?.options;

        assert.deepStrictEqual(
            declared?.map((option) => `${option.name}:${option.type}`),
            ["hops:integer"],
            "the catalogue publishes exactly what the extension wrote, in the catalogue's own vocabulary",
        );

        // The declared DEFAULT reaches the running code without the extension naming it a second
        // time: nothing is passed here, and the answer is the one-step answer.
        const byDefault = await graph.run("hop-reach");

        assert.strictEqual(byDefault.node("d")?.value, 2, "the declared default is what the running code received");

        // And so does a value a reader chose, through the older address, which resolves its
        // parameters through the constructor rather than through the run's own check.
        await graph.runAlgorithm("acme", "hop-reach", { algorithmOptions: { hops: 2 } });
        await graph.operationQueue.waitForCompletion();

        const viaOldAddress = graph
            .getSession()
            .runs.list()
            .filter((run) => run.algorithm === "hop-reach" && run.status === "succeeded")
            .at(-1);

        assert.strictEqual(
            viaOldAddress?.result?.node("d")?.value,
            4,
            "the value the reader chose reached the running code, from one declaration",
        );
    });

    it("has the caller's parameters checked against what it declared, before any work starts", () => {
        assert.throws(
            () => {
                graph.run("hop-reach", { steps: 2 });
            },
            /not an option/,
            "an option the extension never declared is refused by name",
        );

        let refusal: unknown;

        try {
            graph.run("hop-reach", { hops: 99 });
        } catch (error) {
            refusal = error;
        }

        assert.isTrue(isGraphtyError(refusal), "and a value outside the declared range is refused with a code");
        assert.strictEqual(codeOf(refusal), "E_OPTION_RANGE");
    });

    it("refuses a parameter it does not declare with a coded error, whichever door the caller used", async () => {
        let refusal: unknown;

        try {
            await graph.runAlgorithm("acme", "hop-reach", { algorithmOptions: { paces: 2 } });
        } catch (error) {
            refusal = error;
        }

        assert.isTrue(
            isGraphtyError(refusal),
            "the older address reports the same coded failure the run path does, rather than an uncoded Error",
        );
        assert.strictEqual(codeOf(refusal), "E_UNKNOWN_OPTION");
    });

    it("has a failure of its own reported as a coded run failure, under the code it chose", async () => {
        const run = graph.run("faulty-count");
        let rejection: unknown;

        try {
            await run;
        } catch (error) {
            rejection = error;
        }

        assert.isTrue(isGraphtyError(rejection), "what a consumer catches is the element's own error type");
        assert.strictEqual(
            codeOf(rejection),
            CHOSEN_FAILURE_CODE,
            "carrying the code the extension chose, not one the element substituted for it",
        );
        assert.strictEqual(run.status, "failed", "and the run is marked failed rather than left running");
        assert.strictEqual(run.error?.code, CHOSEN_FAILURE_CODE, "with the same error kept on the run's record");
    });

    it("has an uncoded mistake inside it given a code before it reaches the caller", async () => {
        faulty.plain = true;

        const run = graph.run("faulty-count");
        let rejection: unknown;

        try {
            await run;
        } catch (error) {
            rejection = error;
        }

        assert.isTrue(
            isGraphtyError(rejection),
            "a bug in a plugin surfaces as the element's own error type rather than escaping raw",
        );
        assert.strictEqual(codeOf(rejection), "E_INTERNAL", "under the code the element reserves for an unowned failure");
        assert.instanceOf(
            isGraphtyError(rejection) ? rejection.cause : undefined,
            Error,
            "with what the extension actually threw kept underneath, so it can still be debugged",
        );
        assert.strictEqual(run.status, "failed");
    });

    it("gets the ranking, distribution and summary the element derives for every result", async () => {
        const result = await graph.run("hop-reach");
        const ranking = result.ranking("value");

        assert.strictEqual(ranking.length, measuredIds().length, "every measured node is ranked");
        assert.strictEqual(ranking[0].value, 2, "best first");
        assert.strictEqual(ranking[ranking.length - 1].value, 1);

        const summary = result.summary();

        assert.strictEqual(summary.measured, measuredIds().length);
        assert.strictEqual(summary.min, 1);
        assert.strictEqual(summary.max, 2);
        assert.isNotEmpty(result.histogram("value").bins, "a distribution, without the extension binning anything");

        // The per-node position and percentile are the element's arithmetic over the extension's
        // one column, which is why every metric's `rank` means the same thing.
        assert.isNumber(result.node("d")?.rank);
        assert.isNumber(result.node("d")?.percentile);
    });

    it("gets a plain-language reading written from its result", async () => {
        const result = await graph.run("hop-reach");
        const reading = result.reading();

        assert.isNotEmpty(reading, "a sentence the element generated from the shape the extension declared");
        assert.include(reading, "nodes within reach", "using the field name the extension published");
        assert.include(reading, "were not measured", "and honest about the node the extension left out");
    });

    it("names nodes by the label attribute the reader configured, not by their ids", async () => {
        // What a reader's data configuration says the display name is. Without it the element has
        // not been told where the names are, which is a different answer from there being none.
        graph.styles.config.data.knownFields.nodeLabelPath = LABEL_ATTRIBUTE;

        const result = await graph.run("hop-reach");
        const { top } = result.summary();

        assert.isNotEmpty(top, "the summary carries the nodes that scored highest");

        for (const row of top) {
            const expected = NODES.find((node) => node.id === row.id)?.name;

            assert.strictEqual(row.label, expected, "each row is named the way the reader's data names it");
            assert.notStrictEqual(row.label, String(row.id), "rather than by the id the graph addresses it by");
        }

        assert.include(
            result.reading(),
            top[0].label,
            "and the sentence the element writes names the leader the same way",
        );
    });

    it("carries its own caveats through to whoever reads the run", async () => {
        const run = graph.run("hop-reach", { hops: 3 });

        await run;

        assert.strictEqual(run.caveats.method, "breadth-first walk, 3 step(s)", "which method produced the numbers");
        assert.strictEqual(run.caveats.direction, "undirected", "and how edge direction was treated");
        assert.include(
            run.caveats.notes.join(" "),
            "left unmeasured",
            "along with anything else the extension wanted a reader to know",
        );

        // Filled by the element's own helper rather than restated by the extension, so two
        // algorithms cannot come to disagree about what "exact" or "f64" mean.
        const filled: Caveats = run.caveats;

        assert.isTrue(filled.exact);
        assert.strictEqual(filled.precision, "f64");
    });

    it("paints the graph from its result without shipping any styling of its own", async () => {
        const runId = await runHopReach();
        const session = graph.getSession();

        await waitFor(
            () => session.styles.list().some((layer) => layer.source.by === "run" && layer.source.runId === runId),
            "the element to derive a layer from the extension's result",
        );

        const legend = session.styles.legend().find((block) => block.runId === runId);

        assert.isDefined(legend, "the picture explains itself in the legend");
        assert.strictEqual(legend?.channel, "node.color");
        assert.strictEqual(legend?.field?.plainName, "Nodes within reach", "named as the extension named it");

        const painted = new Set(
            measuredIds().map((id) => {
                const color = paintedColor(id);

                return `${color.r.toFixed(3)},${color.g.toFixed(3)},${color.b.toFixed(3)}`;
            }),
        );

        assert.isAbove(painted.size, 1, "the two answers this graph has are drawn differently");
        assert.isFalse(
            measuredIds().every((id) => sameColor(paintedColor(id), DEFAULT_NODE_COLOR)),
            "and the nodes it measured no longer carry the element's default colour",
        );
    });

    it("paints only the nodes it measured", async () => {
        const runId = await runHopReach();
        const session = graph.getSession();

        await waitFor(
            () => session.styles.list().some((layer) => layer.source.by === "run" && layer.source.runId === runId),
            "the element to derive a layer from the extension's result",
        );

        const contributors = session.styles
            .explain({ node: UNMEASURED })
            .contributions.map((contribution) => session.styles.get(contribution.layerId)?.source);

        assert.isFalse(
            contributors.some((source) => source?.by === "run" && source.runId === runId),
            "no layer of this run touches the node the extension said nothing about",
        );
        assert.isTrue(
            sameColor(paintedColor(UNMEASURED), DEFAULT_NODE_COLOR),
            "so it is still drawn exactly as it was before the run",
        );
    });

    it("publishes its values where a reader's own style layer can select on them", async () => {
        const runId = await runHopReach();
        const session = graph.getSession();

        const layer = await session.styles.add({
            name: "Reader - flag the well connected",
            target: "node",
            selector: { match: "has", path: session.results.path(runId, "value") },
            set: { "node.opacity": 0.5 },
        });

        await graph.operationQueue.waitForCompletion();

        const measuredChannels = session.styles
            .explain({ node: "d" })
            .contributions.filter((contribution) => contribution.layerId === layer.id);

        assert.isNotEmpty(measuredChannels, "the reader's layer reached a node the extension measured");
        assert.isEmpty(
            session.styles
                .explain({ node: UNMEASURED })
                .contributions.filter((contribution) => contribution.layerId === layer.id),
            "and did not reach the one it did not",
        );
    });

    it("runs through the element's older namespace and type address as well", async () => {
        await graph.runAlgorithm("acme", "hop-reach", { applySuggestedStyles: true });
        await graph.operationQueue.waitForCompletion();

        const suggestions = graph.getSuggestedStyles("acme:hop-reach");

        assert.isNotEmpty(suggestions, "the older address finds the run and what it suggests be drawn");
        assert.strictEqual(suggestions[0].as, "encoding");
        assert.deepStrictEqual(suggestions[0].channels, ["node.color"]);

        const finished = graph
            .getSession()
            .runs.list()
            .filter((run) => run.algorithm === "hop-reach" && run.status === "succeeded");

        assert.lengthOf(finished, 1, "and it produced an ordinary run, not a second kind of thing");
    });

    it("is re-runnable in place, keeping the layers and references bound to it", async () => {
        const runId = await runHopReach();
        const session = graph.getSession();

        await waitFor(
            () => session.styles.list().some((layer) => layer.source.by === "run" && layer.source.runId === runId),
            "the element to derive a layer from the extension's result",
        );

        const before = session.styles.list().filter((layer) => layer.source.by === "run").length;
        const again = session.runs.get(runId)?.rerun();

        assert.isDefined(again, "the run can be started again from its own id");
        await again;

        assert.strictEqual(again?.id, runId, "with the same id, so nothing bound to it dangles");
        assert.strictEqual(
            session.styles.list().filter((layer) => layer.source.by === "run").length,
            before,
            "and no second copy of its picture was stacked on the first",
        );
    });

    it("publishes the same field set the element's own node metrics do, without writing one out", () => {
        const listed = graph.getSession().catalog.algorithms();
        const mine = listed.find((entry) => entry.key === "hop-reach");
        const builtIn = listed.find((entry) => entry.key === "degree");

        assert.isDefined(mine);
        assert.isDefined(builtIn);
        assert.isEmpty(
            checkShapeContract("node-metric", mine?.fields ?? []),
            "every field the shape promises is declared, checked by the element's own contract checker",
        );

        for (const field of mine?.fields ?? []) {
            const peer: FieldDescriptor | undefined = builtIn?.fields.find(
                (candidate) => candidate.name === field.name && candidate.kind === field.kind,
            );

            assert.isDefined(peer, `the element's own metric publishes "${field.kind}.${field.name}" too`);
            assert.strictEqual(
                field.path,
                peer?.path,
                `and addresses it by the same published path, so "${field.name}" means one thing`,
            );
        }
    });

    it("can check its own declared fields against the contract its shape publishes", () => {
        assert.isEmpty(
            checkShapeContract(HOP_REACH_DESCRIPTOR.shape, HOP_REACH_DESCRIPTOR.fields),
            "the metric's own declaration keeps the contract",
        );
        assert.isEmpty(
            checkShapeContract(ALPHABET_WALK_DESCRIPTOR.shape, ALPHABET_WALK_DESCRIPTOR.fields),
            "and so does the route's, including the edge half a metric never has to declare",
        );

        // The check is only worth having if something fails when a field is missing, so the
        // failing case is asserted too rather than being assumed.
        const missingRank = HOP_REACH_DESCRIPTOR.fields.filter((field) => field.name !== "rank");
        const violations = checkShapeContract(HOP_REACH_DESCRIPTOR.shape, missingRank);

        assert.lengthOf(violations, 1, "and an extension that skipped one is told which");
        assert.strictEqual(violations[0].field, "rank");
        assert.include(violations[0].reason, "rank");
    });

    it("leaves the catalogue plain enough to post to a worker", () => {
        const listed = graph.getSession().catalog.algorithms();
        const carryingBehaviour = listed.filter((entry) =>
            Object.values(entry).some((value) => typeof value === "function"),
        );

        assert.isEmpty(
            carryingBehaviour.map((entry) => entry.key),
            "no entry carries a function, so the whole list survives JSON.stringify and a postMessage",
        );

        const posted = JSON.parse(JSON.stringify(listed)) as typeof listed;

        assert.deepStrictEqual(
            posted.find((entry) => entry.key === "hop-reach"),
            listed.find((entry) => entry.key === "hop-reach"),
            "and the extension's entry arrives on the other side unchanged",
        );
    });

    it("is refused when its catalogue key disagrees with the name its class registers under", () => {
        class MisnamedReach extends DeclaredAlgorithm {
            static override namespace = "acme-refused";

            static override type = "misnamed-reach";

            static override descriptor: AlgorithmDescriptor = { ...HOP_REACH_DESCRIPTOR, key: "something-else" };

            /**
             * Never runs: registration is refused before anything can call it.
             * @returns Nothing to compute.
             */
            override compute(): Promise<AlgorithmOutput | null> {
                return Promise.resolve(null);
            }
        }

        let refusal: unknown;

        try {
            DeclaredAlgorithm.register(MisnamedReach);
        } catch (error) {
            refusal = error;
        }

        assert.isTrue(isGraphtyError(refusal), "the mistake is reported at the line that made it");
        assert.strictEqual(codeOf(refusal), "E_BAD_COMMAND");
        assert.isUndefined(
            graph
                .getSession()
                .catalog.algorithms()
                .find((entry) => entry.key === "something-else"),
            "and nothing under the disagreeing name reached the catalogue",
        );
        assert.isNull(
            Algorithm.getClass("acme-refused", "misnamed-reach"),
            "and the class is not left callable under the address the refusal was about: filing it " +
                "first and publishing second used to leave an algorithm that could be run and that " +
                "no catalogue listed",
        );
    });

    it("is refused when it claims a name the element itself ships", () => {
        class ShadowDegree extends DeclaredAlgorithm {
            static override namespace = "acme-refused";

            static override type = "degree";

            static override descriptor: AlgorithmDescriptor = { ...HOP_REACH_DESCRIPTOR, key: "degree" };

            /**
             * Never runs: registration is refused before anything can call it.
             * @returns Nothing to compute.
             */
            override compute(): Promise<AlgorithmOutput | null> {
                return Promise.resolve(null);
            }
        }

        let refusal: unknown;

        try {
            DeclaredAlgorithm.register(ShadowDegree);
        } catch (error) {
            refusal = error;
        }

        assert.isTrue(isGraphtyError(refusal), "taking a built-in name changes what a saved document means");
        assert.strictEqual(codeOf(refusal), "E_DUPLICATE_PLUGIN");

        const named = graph
            .getSession()
            .catalog.algorithms()
            .filter((entry) => entry.key === "degree");

        assert.lengthOf(named, 1, "so a picker still shows one entry called degree");
        assert.notStrictEqual(
            named[0].plainName,
            HOP_REACH_DESCRIPTOR.plainName,
            "and it is still the element's own, not the one that tried to take the name",
        );
    });

    it("counts as one extension when its module is evaluated twice", () => {
        // What a bundler or hot module replacement does: the same class, registered again.
        DeclaredAlgorithm.register(HopReach);

        assert.lengthOf(
            graph
                .getSession()
                .catalog.algorithms()
                .filter((entry) => entry.key === "hop-reach"),
            1,
            "a re-evaluated module is still one algorithm, not two entries in every picker",
        );
    });

    it("publishes a value for each edge its route ran through, addressed by the element's own edge id", async () => {
        const result = await graph.run("alphabet-walk");
        const byPair = await elementEdgeIds(graph.getSession());

        // The walk starts at "a" -- the first id in sort order -- and takes its three steps:
        // a, b, c, d.
        assert.strictEqual(result.node("a")?.order, 0, "the node it started from");
        assert.strictEqual(result.node("d")?.order, 3, "and the node it finished on");
        assert.strictEqual(
            result.edge(byPair.get(pairKey("a", "b")) ?? "")?.onPath,
            true,
            "the first edge it crossed carries a value",
        );
        assert.strictEqual(
            result.edge(byPair.get(pairKey("c", "d")) ?? "")?.onPath,
            true,
            "and so does the last",
        );
        assert.isUndefined(
            result.edge(byPair.get(pairKey("d", "e")) ?? ""),
            "an edge the walk never crossed carries nothing at all",
        );
        assert.isUndefined(result.node("h"), "and neither does a node it never reached");

        const { graph: scalars } = result;

        assert.strictEqual(scalars.length, 4, "four nodes on the route");
        assert.strictEqual(scalars.hops, 3, "three steps to reach them");
    });

    it("has a picture derived for the edges it chose as well as the nodes", async () => {
        const run = graph.run("alphabet-walk");

        await run;
        await graph.operationQueue.waitForCompletion();

        const suggestions = graph.getSuggestedStyles("alphabet-walk");

        assert.lengthOf(suggestions, 1, "a route is one picture, however many kinds of element it runs through");
        assert.strictEqual(suggestions[0].as, "highlight", "a route highlights what it chose rather than ramping");
        assert.deepStrictEqual(
            suggestions[0].channels,
            ["node.color", "edge.color"],
            "and it covers both halves of the result the extension published",
        );
    });

    it("publishes edge values a reader's own layer can select on, and only for the edges it chose", async () => {
        const run = graph.run("alphabet-walk");

        await run;
        await graph.operationQueue.waitForCompletion();

        const session = graph.getSession();
        const layer = await session.styles.add({
            name: "Reader - trace the walk",
            target: "edge",
            selector: { match: "has", path: session.results.path(run.id, "onPath") },
            set: { "edge.opacity": 0.5 },
        });

        await graph.operationQueue.waitForCompletion();

        // Asked of the element rather than spelled out: an edge is addressed by the id the
        // element minted for it, and a literal written here would be a guess at that id.
        const byPair = await elementEdgeIds(session);
        const crossed = byPair.get(pairKey("a", "b"));
        const untouched = byPair.get(pairKey("d", "e"));

        assert.isDefined(crossed, "the graph holds the a-b edge the walk crosses");
        assert.isDefined(untouched, "and the d-e edge it does not");

        assert.isNotEmpty(
            session.styles.explain({ edge: crossed ?? "" }).contributions.filter((entry) => entry.layerId === layer.id),
            "the reader's layer reached an edge the walk crossed",
        );
        assert.isEmpty(
            session.styles.explain({ edge: untouched ?? "" }).contributions.filter((entry) => entry.layerId === layer.id),
            "and did not reach one it never did",
        );
    });

    it("walks its elements in the element's own chunks, reporting when it starts and when it ends", async () => {
        const seen: Progress[] = [];

        await graph.run("alphabet-walk", {}, { onProgress: (progress) => seen.push(progress) });

        const mine = seen.filter((progress) => progress.phase === WALK_PHASE);

        assert.isNotEmpty(mine, "the shared chunk loop reports in the extension's own words");
        assert.strictEqual(mine[0].completed, 0, "an opening report, so a bar appears before the work does");
        assert.strictEqual(mine[mine.length - 1].completed, 4, "and a closing one when every element is walked");
        assert.strictEqual(mine[mine.length - 1].fraction, 1);
    });

    it("can be one member of a batch that shares one progress stream and one cancel", async () => {
        const session = graph.getSession();
        const seen: Progress[] = [];
        const batch = session.runs.batch(
            [{ algorithm: "hop-reach" }, { algorithm: "alphabet-walk" }, { algorithm: "degree" }],
            { label: "A sweep", onProgress: (progress) => seen.push(progress) },
        );

        const outcome = await batch;

        assert.strictEqual(outcome.total, 3);
        assert.strictEqual(outcome.completed, 3, "the extension ran beside the element's own, not instead of it");
        assert.isFalse(outcome.partial);
        assert.deepStrictEqual(
            outcome.steps.map((step) => step.ok),
            [true, true, true],
        );
        assert.isNotEmpty(seen, "one progress stream covered the whole sweep");

        const started = outcome.steps.map((step) => session.runs.get(step.runId ?? "")?.algorithm);

        assert.deepStrictEqual(started, ["hop-reach", "alphabet-walk", "degree"], "each member is an ordinary run");
    });
});
