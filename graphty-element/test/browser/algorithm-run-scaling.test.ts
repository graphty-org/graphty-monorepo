/**
 * @file Counted-work scaling of running algorithms and publishing their results: every public way
 * to start a run (on the `<graphty-element>` element, on `Graph`, on the session and through the
 * 1.10 `runAlgorithm` address), the algorithm classes' own `run` and `publishResult`, applying a
 * run's suggested styles, re-running a run, removing one and running a batch, on a graph of n and
 * of 4n nodes. The elements each call visits (Map, Set and Array iterator steps and array scans,
 * see `visitsDuring`) may grow no faster than the graph. Counted, never timed (issue #1643).
 *
 * The algorithms are linear ones, so a linear count is the element's whole cost, algorithm
 * included: degree (a `MetricAlgorithm`, standing for `Algorithm`), connected components (a
 * `DeclaredAlgorithm`) and, for the 1.10 plugin path, a plugin that writes a result onto every
 * node and edge (`test/helpers/legacyPlugins.ts`). Every case also checks that the call published
 * what it computed, so a count of work that never happened cannot pass.
 *
 * The render loop is stopped, so no frame runs while a call is counted, and strict state is off,
 * as it is for a consumer (see `data-path-scaling.test.ts`).
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { Algorithm } from "../../src/algorithms/Algorithm";
import type { MetricAlgorithm } from "../../src/algorithms/metrics/MetricAlgorithm";
import type { DeclaredAlgorithm } from "../../src/algorithms/results/DeclaredAlgorithm";
import { operationQueueOf } from "../../src/Graph";
import type { AlgorithmManager } from "../../src/managers/AlgorithmManager";
import { dispatcherOf } from "../../src/session/GraphSession";
import type { RunResult } from "../../src/session/results/types";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";
import { LEGACY_NAMESPACE, WriteEverywhere } from "../helpers/legacyPlugins";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [100, 400] as const;

type Graph = Graphty["graph"];

/** What a direct call to an algorithm class hands `publishResult`: no signal fires, no progress. */
const CONTROLS = {
    signal: new AbortController().signal,
    report: (): void => undefined,
    yieldNow: (): Promise<void> => Promise.resolve(),
};

/**
 * Mount a graphty-element with `size` nodes on a path, its render loop stopped and a static layout.
 * @param size - The node count.
 * @returns The element.
 */
async function mount(size: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    const { graph } = element;
    graph.engine.stopRenderLoop();
    await graph.setLayout("random");
    const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
    await graph.addNodes(ids.map((id) => ({ id })));
    await graph.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
    await settled(graph);
    return element;
}

/**
 * Wait until every queued operation has run, every style edit has landed and the pass that
 * derives them has drawn them.
 * @param graph - The graph.
 */
async function settled(graph: Graph): Promise<void> {
    await graph.waitForSettled();
    await operationQueueOf(graph).waitForCompletion();
    await dispatcherOf(graph.getSession()).lane.settled();
}

/**
 * The graph's algorithm manager, which the graph keeps private and the 1.10 plugin path runs through.
 * @param graph - The graph.
 * @returns Its manager.
 */
function managerOf(graph: Graph): AlgorithmManager {
    return (graph as unknown as { algorithmManager: AlgorithmManager }).algorithmManager;
}

/**
 * Assert a published result measured every node of the graph.
 * @param result - The result.
 * @param size - The node count.
 */
function assertMeasuredAll(result: RunResult | undefined, size: number): void {
    assert.isDefined(result, "a result was published");
    assert.strictEqual(result?.measured.nodes, size, "the result measured every node");
}

/**
 * Assert the session holds a finished run of `algorithm` that measured every node.
 * @param graph - The graph.
 * @param algorithm - The catalogue key.
 * @param size - The node count.
 */
function assertRunPublished(graph: Graph, algorithm: string, size: number): void {
    const run = graph
        .getSession()
        .runs.list()
        .find((each) => each.algorithm === algorithm && each.result !== undefined);
    assertMeasuredAll(run?.result, size);
}

/**
 * Assert the 1.10 plugin wrote its result onto every node.
 * @param graph - The graph.
 */
function assertPluginWrote(graph: Graph): void {
    for (const node of graph.getNodes()) {
        const results = (node.data as { algorithmResults?: Record<string, Record<string, { seen?: boolean }>> })
            .algorithmResults;
        assert.isTrue(results?.[LEGACY_NAMESPACE][WriteEverywhere.type].seen, `the plugin marked ${node.id}`);
    }
}

/**
 * Run degree to completion with no picture, so there is a finished run to act on.
 * @param graph - The graph.
 * @returns The run's id.
 */
async function finishedDegree(graph: Graph): Promise<string> {
    const run = graph.run("degree", undefined, { style: false });
    await run;
    await settled(graph);
    return run.id;
}

/** One call under test. */
interface Case {
    /** Every public method (`Owner.method`, as the cost-coverage registry spells it) the call covers. */
    readonly methods: readonly string[];
    /**
     * Build the state the call needs and return the call, which asserts it did its work.
     * @param element - A mounted element.
     * @param size - Its node count.
     * @returns The call to count, and the check run after it.
     */
    prepare(element: Graphty, size: number): Promise<{ call: () => Promise<unknown>; check: () => void }>;
}

const CASES: readonly Case[] = [
    {
        methods: ["Graph.run"],
        prepare: (element, size) =>
            Promise.resolve({
                call: async () => {
                    await element.graph.run("degree");
                },
                check: () => {
                    assertRunPublished(element.graph, "degree", size);
                },
            }),
    },
    {
        methods: ["Graphty.run"],
        prepare: (element, size) =>
            Promise.resolve({
                call: async () => {
                    await element.run("degree");
                },
                check: () => {
                    assertRunPublished(element.graph, "degree", size);
                },
            }),
    },
    {
        methods: ["GraphSession.run"],
        prepare: (element, size) =>
            Promise.resolve({
                call: async () => {
                    await element.graph.getSession().run({ op: "algo.run", algorithm: "degree" });
                },
                check: () => {
                    assertRunPublished(element.graph, "degree", size);
                },
            }),
    },
    {
        methods: ["Graph.runAlgorithm"],
        prepare: (element, size) =>
            Promise.resolve({
                call: () => element.graph.runAlgorithm("graphty", "degree"),
                check: () => {
                    assertRunPublished(element.graph, "degree", size);
                },
            }),
    },
    {
        methods: ["Graphty.runAlgorithm"],
        prepare: (element, size) =>
            Promise.resolve({
                call: () => element.runAlgorithm("graphty", "degree"),
                check: () => {
                    assertRunPublished(element.graph, "degree", size);
                },
            }),
    },
    {
        methods: ["Graph.runAlgorithmsFromTemplate"],
        prepare: async (element, size) => {
            await element.graph
                .getSession()
                .config.set({ runAlgorithmsOnLoad: true, data: { algorithms: ["degree"] } });
            await settled(element.graph);
            return {
                call: () => element.graph.runAlgorithmsFromTemplate(),
                check: () => {
                    assertRunPublished(element.graph, "degree", size);
                },
            };
        },
    },
    {
        methods: ["AlgorithmManager.runAlgorithm"],
        prepare: (element) =>
            Promise.resolve({
                call: () => managerOf(element.graph).runAlgorithm(LEGACY_NAMESPACE, WriteEverywhere.type),
                check: () => {
                    assertPluginWrote(element.graph);
                },
            }),
    },
    {
        methods: ["AlgorithmManager.runAlgorithmsFromTemplate"],
        prepare: (element) =>
            Promise.resolve({
                call: () =>
                    managerOf(element.graph).runAlgorithmsFromTemplate([`${LEGACY_NAMESPACE}:${WriteEverywhere.type}`]),
                check: () => {
                    assertPluginWrote(element.graph);
                },
            }),
    },
    {
        methods: ["Algorithm.run"],
        prepare: (element, size) => {
            const algorithm = Algorithm.get(element.graph, "graphty", "degree") as MetricAlgorithm;
            return Promise.resolve({
                call: () => algorithm.run(),
                check: () => {
                    assertMeasuredAll(algorithm.result, size);
                },
            });
        },
    },
    {
        methods: ["Algorithm.publishResult"],
        prepare: (element, size) => {
            const algorithm = Algorithm.get(element.graph, "graphty", "degree") as Algorithm;
            let result: RunResult | undefined;
            return Promise.resolve({
                call: async () => {
                    result = await algorithm.publishResult(CONTROLS, "degree-direct");
                },
                check: () => {
                    assertMeasuredAll(result, size);
                },
            });
        },
    },
    {
        methods: ["DeclaredAlgorithm.run"],
        prepare: (element, size) => {
            const algorithm = Algorithm.get(element.graph, "graphty", "connected-components") as DeclaredAlgorithm;
            return Promise.resolve({
                call: () => algorithm.run(),
                check: () => {
                    assertMeasuredAll(algorithm.result, size);
                },
            });
        },
    },
    {
        methods: ["DeclaredAlgorithm.publishResult"],
        prepare: (element, size) => {
            const algorithm = Algorithm.get(element.graph, "graphty", "connected-components") as DeclaredAlgorithm;
            let result: RunResult | undefined;
            return Promise.resolve({
                call: async () => {
                    result = await algorithm.publishResult(CONTROLS, "components-direct");
                },
                check: () => {
                    assertMeasuredAll(result, size);
                },
            });
        },
    },
    {
        methods: ["Graph.applySuggestedStyles"],
        prepare: async (element) => {
            const runId = await finishedDegree(element.graph);
            let applied = false;
            return {
                call: async () => {
                    applied = element.graph.applySuggestedStyles("degree");
                    await settled(element.graph);
                },
                check: () => {
                    assertPainted(element.graph, runId, applied);
                },
            };
        },
    },
    {
        methods: ["Graphty.applySuggestedStyles"],
        prepare: async (element) => {
            const runId = await finishedDegree(element.graph);
            let applied = false;
            return {
                call: async () => {
                    applied = element.applySuggestedStyles("degree");
                    await settled(element.graph);
                },
                check: () => {
                    assertPainted(element.graph, runId, applied);
                },
            };
        },
    },
    {
        methods: ["Run.rerun"],
        prepare: async (element, size) => {
            const first = element.graph.run("degree");
            await first;
            await settled(element.graph);
            let result: RunResult | undefined;
            return {
                call: async () => {
                    result = await first.rerun();
                },
                check: () => {
                    assertMeasuredAll(result, size);
                },
            };
        },
    },
    {
        methods: ["RunsApi.remove"],
        prepare: async (element) => {
            const run = element.graph.run("degree");
            await run;
            await settled(element.graph);
            const { runs } = element.graph.getSession();
            assert.isDefined(runs.get(run.id), "the run is there to remove");
            return {
                call: async () => {
                    runs.remove(run.id);
                    await settled(element.graph);
                },
                check: () => {
                    assert.isUndefined(runs.get(run.id), "the run was removed");
                },
            };
        },
    },
    {
        methods: ["RunsApi.batch"],
        prepare: (element, size) =>
            Promise.resolve({
                call: async () => {
                    const batch = await element.graph
                        .getSession()
                        .runs.batch([{ algorithm: "degree" }, { algorithm: "components" }]);
                    assert.strictEqual(batch.completed, 2, "both members finished");
                },
                check: () => {
                    assertRunPublished(element.graph, "degree", size);
                    assertRunPublished(element.graph, "components", size);
                },
            }),
    },
];

/**
 * Assert a suggested-style call painted the run it named.
 * @param graph - The graph.
 * @param runId - The run.
 * @param applied - What the call returned.
 */
function assertPainted(graph: Graph, runId: string, applied: boolean): void {
    assert.isTrue(applied, "a suggestion was applied");
    const layers = graph.getSession().styles.list();
    assert.isTrue(
        layers.some((layer) => layer.source.by === "run" && layer.source.runId === runId),
        "a layer paints the run",
    );
}

describe("running algorithms and publishing their results does work in proportion to the graph", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const { methods, prepare } of CASES) {
        it(`${methods.join(", ")}: no more than linear in the graph`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const element = await mount(size);
                    try {
                        const { call, check } = await prepare(element, size);
                        const visits = await visitsDuring(async () => {
                            await call();
                            await settled(element.graph);
                        });
                        check();
                        return visits;
                    } finally {
                        element.remove();
                    }
                },
                { sizes: SIZES, growth: "linear", counter: `elements visited by ${methods.join(", ")}` },
            );
        });
    }
});
