import "../../src/algorithms/index";

import type { DerivedGraph, GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { AccelerationController, AcceleratorRegistry } from "../../src/acceleration";
import { algorithmByKey } from "../../src/catalog/algorithms";
import { GraphStore } from "../../src/data/GraphStore";
import { isGraphtyError } from "../../src/errors";
import type { Graph } from "../../src/Graph";
import { AlgorithmManager } from "../../src/managers/AlgorithmManager";
import type { EventManager } from "../../src/managers/EventManager";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { createScopeApi } from "../../src/session/scope";
import { ingestEdge, ingestNode } from "../helpers/rawIngest";

/** A graph the executor can run against with no renderer behind it. */
interface MockGraph {
    /** The manager under test. */
    manager: AlgorithmManager;
    /** Every member of the graph or its data manager the executor read that a run has no use for. */
    strayReads: () => readonly string[];
    /** The snapshot the run's scope is resolved against. */
    snapshot: () => GraphSnapshot;
}

/**
 * Wrap a mock so every member read is checked against the members a run is allowed to read.
 * @param target - The mock.
 * @param name - What it is, for the record.
 * @param allowed - The members a run reads.
 * @param stray - Where a read of any other member is recorded.
 * @returns The wrapped mock.
 */
function watched<T extends object>(target: T, name: string, allowed: ReadonlySet<PropertyKey>, stray: string[]): T {
    return new Proxy(target, {
        get(object, key, receiver) {
            // `then` is read by `await` on anything a promise resolves with; it is not the executor.
            if (!allowed.has(key) && key !== "then") {
                stray.push(`${name}.${String(key)}`);
            }

            return Reflect.get(object, key, receiver) as unknown;
        },
    });
}

/**
 * Build a graph with only the members the executor and the algorithms read: the snapshot, the
 * undirected view, the last import's weights, the style config's known fields and the
 * acceleration controller.
 *
 * Deliberately not the renderer's `Graph`: the point of the run executor is that everything below
 * it reads a snapshot and returns a result. Every member it reads is recorded, so a run that
 * reaches for anything else -- a style manager, the node and edge records, a repaint through an
 * optional call that a narrow mock would otherwise let pass silently -- is caught.
 * @param nodeIds - The nodes, in the order they arrive.
 * @param edges - The edges, as endpoint pairs.
 * @returns The mock.
 */
function mockGraph(nodeIds: readonly string[], edges: readonly (readonly [string, string])[]): MockGraph {
    const store = new GraphStore({
        directed: "auto",
        positionScale: () => 1,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
        onReplaced: () => undefined,
    });
    const stray: string[] = [];

    for (const id of nodeIds) {
        ingestNode(store, id, { id });
    }

    for (const [source, target] of edges) {
        ingestEdge(store, source, target, 1);
    }

    const dataManager = watched(
        {
            getSnapshot: (): GraphSnapshot => store.getSnapshot(),
            undirected: (snapshot: GraphSnapshot): DerivedGraph => store.undirected(snapshot),
            lastImport: undefined,
        },
        "dataManager",
        new Set<PropertyKey>(["getSnapshot", "undirected", "lastImport"]),
        stray,
    );
    const graph = watched(
        {
            getDataManager: () => dataManager,
            // The controller an algorithm with an accelerated implementation asks before it runs.
            // Its own registry, so nothing another test registered reaches this one.
            acceleration: new AccelerationController({
                policy: "auto",
                minNodes: 0,
                registry: new AcceleratorRegistry(),
            }),
            // Read for the label path and the weight's meaning, and for nothing else: a repaint
            // through the style manager reads some other member and is recorded.
            styles: watched(
                { config: { data: { knownFields: {} } } },
                "graph.styles",
                new Set<PropertyKey>(["config"]),
                stray,
            ),
            // A bare graph has no session, so the weight is read off the last import.
            getSession: undefined,
        },
        "graph",
        new Set<PropertyKey>(["getDataManager", "acceleration", "styles", "getSession"]),
        stray,
    ) as unknown as Graph;
    const events = { emitGraphError: () => undefined, emit: () => undefined } as unknown as EventManager;

    return {
        manager: new AlgorithmManager(events, graph),
        strayReads: () => stray,
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
    it("returns a result and reaches nothing but the snapshot to make it", async () => {
        const graph = mockGraph(
            ["a", "b", "c"],
            [
                ["a", "b"],
                ["b", "c"],
            ],
        );

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
        // that the picture really does catch up. A repaint here would have to reach past the
        // snapshot -- for the style manager, or the node and edge records -- and that read is
        // recorded.
        assert.deepStrictEqual(graph.strayReads(), [], "a run publishes a result; drawing it is the style stack's job");
    });

    it("fills the ranking, the range and the summary nobody computed by hand", async () => {
        const graph = mockGraph(
            ["a", "b", "c"],
            [
                ["a", "b"],
                ["b", "c"],
            ],
        );

        const outcome = await graph.manager.execute(context(graph, "degree"), algorithmByKey("degree"));
        const summary = outcome.result.summary();

        assert.strictEqual(summary.top[0].id, "b");
        assert.strictEqual(summary.max, 2);
        assert.strictEqual(summary.min, 1);
        assert.strictEqual(outcome.result.node("b")?.rank, 1, "the highest value ranks first");
        assert.isDefined(outcome.summary, "the run's record carries the bounded form");
    });

    it("runs a declared algorithm too, publishing its own shape", async () => {
        const graph = mockGraph(
            ["a", "b", "c"],
            [
                ["a", "b"],
                ["b", "c"],
            ],
        );

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
