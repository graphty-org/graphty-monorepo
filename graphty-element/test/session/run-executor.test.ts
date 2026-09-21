import "../../src/algorithms/index";

import type { DerivedGraph, GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { algorithmByKey } from "../../src/catalog/algorithms";
import { GraphStore } from "../../src/data/GraphStore";
import { ingestEdge, ingestNode } from "../../src/data/ingest";
import { isGraphtyError } from "../../src/errors";
import type { Graph } from "../../src/Graph";
import { AlgorithmManager } from "../../src/managers/AlgorithmManager";
import type { EventManager } from "../../src/managers/EventManager";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { createScopeApi } from "../../src/session/scope";

/** One node as the element's data manager holds it: a record the projection writes onto. */
interface MockNode {
    /** The node id. */
    id: string;
    /** Where the 1.10 projection lands. */
    algorithmResults?: Record<string, Record<string, Record<string, unknown>>>;
}

/** One edge as the element's data manager holds it. */
interface MockEdge {
    /** The source node id. */
    srcId: string;
    /** The target node id. */
    dstId: string;
    /** Where the 1.10 projection lands. */
    algorithmResults?: Record<string, Record<string, Record<string, unknown>>>;
}

/** A graph the executor can run against with no renderer behind it. */
interface MockGraph {
    /** The manager under test. */
    manager: AlgorithmManager;
    /** The node records, keyed by id. */
    nodes: Map<string, MockNode>;
    /** The edge records, keyed by "srcId:dstId". */
    edges: Map<string, MockEdge>;
    /** How many times the executor asked for a repaint. */
    repaints: () => number;
    /** The snapshot the run's scope is resolved against. */
    snapshot: () => GraphSnapshot;
}

/**
 * Build a graph with the four data-manager members the executor and the algorithms touch.
 *
 * Deliberately not the renderer's `Graph`: the point of the run executor is that everything below
 * it reads a snapshot and returns a result, so the only renderer-shaped thing it needs is somewhere
 * to ask for a repaint.
 * @param nodeIds - The nodes, in the order they arrive.
 * @param edges - The edges, as endpoint pairs.
 * @returns The mock.
 */
function mockGraph(nodeIds: readonly string[], edges: readonly (readonly [string, string])[]): MockGraph {
    const nodes = new Map<string, MockNode>();
    const edgeRecords = new Map<string, MockEdge>();
    const store = new GraphStore({
        directed: "auto",
        positionScale: () => 1,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
        onReplaced: () => undefined,
    });
    let repaints = 0;

    for (const id of nodeIds) {
        nodes.set(id, { id });
        ingestNode(store, id, { id });
    }

    for (const [source, target] of edges) {
        edgeRecords.set(`${source}:${target}`, { srcId: source, dstId: target });
        ingestEdge(store, source, target, 1);
    }

    const dataManager = {
        nodes,
        edges: edgeRecords,
        graphResults: undefined as Record<string, Record<string, Record<string, unknown>>> | undefined,
        getSnapshot: (): GraphSnapshot => store.getSnapshot(),
        undirected: (snapshot: GraphSnapshot): DerivedGraph => store.undirected(snapshot),
        // The two doors the executor used to force a whole-graph re-resolution through at the
        // end of every run. They are here so a run that reaches for one is caught; see the
        // executor test below for why nothing should.
        applyStylesToExistingNodes: (): void => {
            repaints += 1;
        },
        applyStylesToExistingEdges: (): void => {
            repaints += 1;
        },
    };
    const graph = { getDataManager: () => dataManager } as unknown as Graph;
    const events = { emitGraphError: () => undefined, emitGraphEvent: () => undefined } as unknown as EventManager;

    return {
        manager: new AlgorithmManager(events, graph),
        nodes,
        edges: edgeRecords,
        repaints: () => repaints,
        snapshot: () => store.getSnapshot(),
    };
}

/**
 * The context a run hands the executor.
 * @param graph - The mock to resolve the scope against.
 * @param algorithm - Which algorithm to run.
 * @param params - Its parameters.
 * @param runId - The id the result is published under.
 * @returns The context.
 */
function context(
    graph: MockGraph,
    algorithm: string,
    params: Readonly<Record<string, unknown>> = {},
    runId = "run",
): RunExecutionContext {
    return {
        runId,
        algorithm,
        params,
        scope: createScopeApi({ snapshot: graph.snapshot }).resolveNow("graph"),
        seed: null,
        exact: null,
        sample: null,
        timeBoxMs: null,
        signal: new AbortController().signal,
        timeBox: null,
        report: () => undefined,
    };
}

describe("the run executor", () => {
    it("returns a result, and the elements it measured are drawn again", async () => {
        // The result is the source of truth and the only place a value lives: the 1.10
        // `algorithmResults` projection beside it went with the style layers that selected on it.
        const graph = mockGraph(["a", "b", "c"], [["a", "b"], ["b", "c"]]);

        const outcome: RunOutcome = await graph.manager.execute(
            context(graph, "degree", {}, "degree"),
            algorithmByKey("degree"),
        );

        assert.strictEqual(outcome.result.node("b")?.value, 2, "b sits between a and c");
        assert.strictEqual(outcome.result.node("a")?.value, 1);
        assert.strictEqual(outcome.result.runId, "degree");
        // THE EXECUTOR DOES NOT PAINT. It used to walk every node and every edge at the end of
        // every run, because a 1.x selector read `algorithmResults.<namespace>.<type>` and only
        // re-resolving an element made a new value visible to it. A selector reads
        // `results.<runId>.<field>` now, and the repaint hangs off the run finishing -- in the
        // element's own wiring, on the `algorithm-run` queue trigger, where it can be scheduled
        // with the rest of the frame's work. `test/browser/session-style-paint.test.ts` pins
        // that the picture really does catch up.
        assert.strictEqual(graph.repaints(), 0, "a run publishes a result; drawing it is the style stack's job");
    });

    it("fills the ranking, the range and the summary nobody computed by hand", async () => {
        const graph = mockGraph(["a", "b", "c"], [["a", "b"], ["b", "c"]]);

        const outcome = await graph.manager.execute(context(graph, "degree"), algorithmByKey("degree"));
        const summary = outcome.result.summary();

        assert.strictEqual(summary.top[0].id, "b");
        assert.strictEqual(summary.max, 2);
        assert.strictEqual(summary.min, 1);
        assert.strictEqual(outcome.result.node("b")?.rank, 1, "the highest value ranks first");
        assert.isDefined(outcome.summary, "the run's record carries the bounded form");
    });

    it("runs a declared algorithm too, publishing its own shape", async () => {
        const graph = mockGraph(["a", "b", "c"], [["a", "b"], ["b", "c"]]);

        const outcome = await graph.manager.execute(
            context(graph, "components", {}, "pieces"),
            algorithmByKey("components"),
        );

        assert.strictEqual(outcome.result.shape, "community");
        assert.strictEqual(outcome.result.graph.groupCount, 1, "one connected piece");
        assert.isNumber(outcome.result.node("a")?.group, "every node was put in a group");
    });

    it("reads the catalogue to decide WHICH class a folded key means", async () => {
        // `components` is two 1.10 classes folded behind a parameter. A shim that remembered the
        // rename and forgot the parameter would quietly run the wrong one.
        const graph = mockGraph(["a", "b"], [["a", "b"]]);

        const outcome = await graph.manager.execute(
            context(graph, "components", { strength: "strong" }, "strong"),
            algorithmByKey("components"),
        );

        assert.include(
            outcome.result.summary().caveats.method,
            "strongly",
            "the strong parameter selected the strongly-connected class",
        );
    });

    it("refuses a key the catalogue does not carry, with a code rather than a crash", async () => {
        const graph = mockGraph(["a"], []);

        try {
            await graph.manager.execute(context(graph, "not-an-algorithm"), undefined);
            assert.fail("an unknown key must not run");
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            assert.strictEqual(isGraphtyError(error) ? error.code : null, "E_UNKNOWN_ALGORITHM");
        }
    });

    it("publishes an empty result for an empty graph rather than nothing at all", async () => {
        const graph = mockGraph([], []);

        const outcome = await graph.manager.execute(context(graph, "degree"), algorithmByKey("degree"));

        assert.strictEqual(outcome.result.measured.nodes, 0);
        assert.deepStrictEqual(outcome.result.ranking("value"), []);
    });
});
