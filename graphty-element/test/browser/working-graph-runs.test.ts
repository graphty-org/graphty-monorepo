/**
 * Runs that read the working graph on a real `<graphty-element>` (design/working-graph/design.md
 * section 6): a `defineAlgorithm` extension and a legacy plugin read what is shown while the
 * session reads the working graph and the whole graph otherwise, and an accelerated run is handed
 * the shown graph.
 *
 * The graph: hub `a` with five leaves `l1..l5` (degree 1) and a triangle `b c d` that `a` touches
 * through `b`. A degree-2 filter keeps `a b c d`.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { defineAlgorithm } from "../../extend";
import { Algorithm, type Graph, type Graphty } from "../../index";
import { acceleratorRegistry, registerAccelerator } from "../../src/acceleration";
import { operationQueueOf } from "../../src/Graph";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";

const NODES = ["a", "b", "c", "d", "l1", "l2", "l3", "l4", "l5"].map((id) => ({ id }));
const EDGES = [
    ["a", "l1"],
    ["a", "l2"],
    ["a", "l3"],
    ["a", "l4"],
    ["a", "l5"],
    ["a", "b"],
    ["b", "c"],
    ["c", "d"],
    ["d", "b"],
].map(([source, target]) => ({ source, target }));

/** Elements a test mounted, removed after it. */
const mounted: HTMLElement[] = [];

/**
 * An element holding the graph, filtered to degree 2 and up, in a working-graph mode.
 * @param mode - The mode.
 * @returns The element.
 */
async function filtered(mode: "documented" | "visible"): Promise<Graphty> {
    const element = document.createElement("graphty-element") as unknown as Graphty & HTMLElement;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    element.workingGraph = mode;
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;
    element.nodeData = NODES;
    element.edgeData = EDGES;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.visibility.set({ kind: "degree", min: 2 });
    assert.strictEqual(element.session.data.working().nodeCount, 4);
    return element;
}

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

describe("a defineAlgorithm extension", () => {
    defineAlgorithm({ id: "acme-neighbour-count", node: (node) => node.neighbors().length });

    it("counts over what is shown while the session reads the working graph", async () => {
        const element = await filtered("visible");

        const run = element.session.runs.start("acme-neighbour-count", undefined, { style: false });
        await run;

        assert.strictEqual(run.result?.node("a")?.value, 1, "a's one shown neighbour, b");
        assert.strictEqual(run.result?.node("b")?.value, 3);
        assert.isUndefined(run.result?.node("l1"), "a hidden leaf has no value");
        assert.include(
            run.caveats.facts.map((fact) => fact.code),
            "scope.subgraph",
        );
    });

    it("counts over the whole graph, values kept for the scope, when the session does not", async () => {
        const element = await filtered("documented");

        const run = element.session.runs.start("acme-neighbour-count", undefined, { style: false });
        await run;

        assert.strictEqual(run.result?.node("a")?.value, 6, "every neighbour of a, hidden leaves too");
        assert.include(
            run.caveats.facts.map((fact) => fact.code),
            "scope.whole-graph",
        );
    });

    it("sees the hidden nodes when the run names the whole graph", async () => {
        const element = await filtered("visible");

        const run = element.session.runs.start("acme-neighbour-count", undefined, { scope: "graph", style: false });
        await run;

        assert.strictEqual(run.result?.node("a")?.value, 6);
        assert.strictEqual(run.result?.node("l1")?.value, 1);
    });
});

describe("a legacy plugin", () => {
    let seen = -1;
    let seenEdges = -1;
    /** A plugin that counts the nodes and edges it is handed. */
    class CountWhatIsThere extends Algorithm {
        static override type = "count-what-is-there";
        static override namespace = "acme";
        override run(graph: Graph): Promise<void> {
            seen = graph.getDataManager().nodes.size;
            seenEdges = graph.getDataManager().edges.size;
            return Promise.resolve();
        }
    }
    Algorithm.register(CountWhatIsThere);

    for (const [mode, nodes, edges] of [
        ["visible", 4, 4],
        ["documented", 9, 9],
    ] as const) {
        it(`is handed ${String(nodes)} nodes and ${String(edges)} edges in "${mode}" mode`, async () => {
            const element = await filtered(mode);
            seen = -1;
            seenEdges = -1;

            await element.graph.runAlgorithm("acme", "count-what-is-there");

            assert.strictEqual(seen, nodes);
            assert.strictEqual(seenEdges, edges);
        });
    }
});

describe("an accelerated run", () => {
    const FAKE = "working-graph-runs-fake";

    afterEach(() => {
        if (acceleratorRegistry.has(FAKE)) {
            acceleratorRegistry.remove(FAKE);
        }
    });

    it("hands the accelerator the shown graph", async () => {
        const fake = createFakeAccelerator();
        registerAccelerator({ name: FAKE, backend: "webgpu", factory: () => Promise.resolve(fake) });
        const element = await filtered("visible");
        element.graph.acceleration.setMinNodes(0);

        const run = element.session.runs.start("pagerank", undefined, { style: false });
        await run;

        assert.strictEqual(fake.calls.pageRank, 1, "the accelerator did the work");
        assert.strictEqual(fake.calls.uploaded.at(-1)?.nodeCount, 4, "over the four shown nodes");
        assert.strictEqual(run.caveats.precision, "f32");
    });
});
