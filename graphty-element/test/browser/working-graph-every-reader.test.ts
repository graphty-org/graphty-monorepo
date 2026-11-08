/**
 * @file Every catalog layout and algorithm honors the working graph (design/working-graph/design.md
 * section 9, the half that needs a renderer; the session's readers are
 * test/contracts/working-graph-readers.test.ts).
 *
 * Each case is found, never listed: every layout the registry holds and every built-in algorithm,
 * so one added tomorrow is covered the day it appears. With the session's `workingGraph` option on
 * and a filter hiding one node:
 *
 * - a layout leaves the hidden node where it was and gives the engine one slot per shown node;
 * - an algorithm gives the hidden node no value;
 * - the accelerated force driver is handed only what is shown and leaves the hidden node where it was.
 */

import "../../src/algorithms";

import { afterEach, assert, describe, it } from "vitest";

import { BUILT_IN_ALGORITHMS } from "../../src/catalog/algorithms";
import { Graph, operationQueueOf } from "../../src/Graph";
import { LayoutEngine } from "../../src/layout/LayoutEngine";
import { createFakeAccelerator, type FakeAccelerator } from "../../src/testing/fakeAccelerator";
import { contextOf, released } from "../helpers/webgl-context";

/** The shown nodes: two triangles joined by a costly edge. */
const SHOWN = ["A", "B", "C", "D", "E", "F"];

/** The node the filter hides, added last and joined to both triangles. */
const HIDDEN = "X";

/** The edges: weighted, so a route has something to prefer, and two into the hidden node. */
const EDGES = [
    { src: "A", dst: "B", weight: 1 },
    { src: "B", dst: "C", weight: 1 },
    { src: "A", dst: "C", weight: 1 },
    { src: "C", dst: "D", weight: 5 },
    { src: "D", dst: "E", weight: 1 },
    { src: "E", dst: "F", weight: 1 },
    { src: "D", dst: "F", weight: 1 },
    { src: "A", dst: HIDDEN, weight: 1 },
    { src: HIDDEN, dst: "F", weight: 1 },
];

/**
 * The parameters an algorithm cannot run without: the elements it walks from or to. Everything
 * else runs on its defaults, so a catalog entry added tomorrow is covered without a line here.
 */
const PARAMS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
    "shortest-path": { source: "A", target: "F" },
    dijkstra: { source: "A", target: "F" },
    "bellman-ford": { source: "A", target: "F" },
    astar: { source: "A", target: "F" },
    bfs: { source: "A" },
    dfs: { source: "A" },
    "max-flow": { source: "A", sink: "F" },
};

/** The options a layout cannot run without: where to start, which column names the groups. */
const LAYOUT_OPTIONS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
    bfs: { start: "A" },
    bipartite: { groupBy: "part" },
    multipartite: { groupBy: "layer" },
};

/** What a layout needs from the data to lay anything out: a column it reads. */
const NODE_DATA: Readonly<Record<string, Readonly<Record<string, unknown>>>> = Object.fromEntries(
    [...SHOWN, HIDDEN].map((id, at) => [
        id,
        { part: at % 2, latitude: 10 + at, longitude: 20 + at, x: at, y: at * 2, z: 0, layer: at % 3 },
    ]),
);

const cleanups: (() => Promise<void>)[] = [];

// Each case releases its WebGL context before the next starts: Chrome keeps 16 a page.
afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) {
        await cleanup();
    }
});

/**
 * A graph with the working graph on, holding the shown nodes and, unless asked not to, the hidden one.
 * @param withHidden - Whether it holds the hidden node and its edges.
 * @returns The graph.
 */
async function begin(withHidden = true): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    graph.getSession().workingGraph = true;
    cleanups.push(async () => {
        const release = released(contextOf(graph));
        graph.dispose();
        container.remove();
        await release;
    });
    const ids = withHidden ? [...SHOWN, HIDDEN] : SHOWN;
    await graph.addNodes(ids.map((id) => ({ id, ...NODE_DATA[id] })));
    await graph.addEdges(EDGES.filter(({ src, dst }) => ids.includes(src) && ids.includes(dst)));
    await operationQueueOf(graph).waitForCompletion();
    return graph;
}

/**
 * Hide the hidden node, and wait for the re-layout that sets off.
 * @param graph - The graph.
 */
async function hide(graph: Graph): Promise<void> {
    await graph.getSession().visibility.set({ kind: "member", of: { nodes: SHOWN } });
    await graph.waitForSettled();
}

/**
 * Where a node is, from the shared array.
 * @param graph - The graph.
 * @param id - The node.
 * @returns Its x, y and z.
 */
function where(graph: Graph, id: string): [number, number, number] {
    const session = graph.getSession();
    const at = { x: 0, y: 0, z: 0 };
    session.positions.read(session.data.snapshot().ids.indexOf(id), at);
    return [at.x, at.y, at.z];
}

/**
 * How many slots a layout gave: the nodes a one-pass or incremental engine holds, or the rows a
 * simulation was loaded with (read off the accelerator that runs it, which is the only place a
 * simulation's rows are seen).
 * @param graph - The graph.
 * @param fake - The accelerator running a simulation, or null.
 * @returns The node count.
 */
function slots(graph: Graph, fake: FakeAccelerator | null): number | undefined {
    if (fake !== null) {
        return fake.simulations.at(-1)?.snapshot?.nodeCount;
    }

    return Array.from(graph.getLayoutManager().layoutEngine?.nodes ?? []).length;
}

/** Whether a registered layout is a force simulation. */
const isSimulation = (type: string): boolean => {
    const engine = LayoutEngine.getClass(type) as { simulationType?: unknown } | null;
    return engine?.simulationType !== undefined;
};

describe.each(LayoutEngine.getRegisteredTypes())("the %s layout over the working graph", (type) => {
    it("leaves the hidden node where it was and gives one slot per shown node", async () => {
        const graph = await begin();
        // A simulation runs on the fake accelerator, which shows the rows it was loaded with.
        const fake = isSimulation(type) ? createFakeAccelerator() : null;
        if (fake !== null) {
            graph.acceleration.setAccelerator(fake);
        }

        await graph.setLayout(type, LAYOUT_OPTIONS[type] ?? {});
        await graph.waitForSettled();
        const before = where(graph, HIDDEN);

        await hide(graph);
        for (let frame = 0; frame < 30; frame++) {
            graph.getUpdateManager().stepFrames(1);
        }

        await fake?.flush();
        await graph.waitForSettled();
        assert.deepStrictEqual(where(graph, HIDDEN), before, "the hidden node keeps its last position");
        assert.strictEqual(slots(graph, fake), SHOWN.length, "one slot per shown node");
    });
});

/**
 * Run an algorithm and read each shown node's values.
 * @param graph - The graph.
 * @param key - The algorithm.
 * @returns The values by node id, and the hidden node's.
 */
async function valuesOf(graph: Graph, key: string): Promise<{ shown: unknown[]; hidden: unknown }> {
    const run = graph.run(key, PARAMS[key] ?? {}, { style: false });
    await run;
    assert.strictEqual(run.status, "succeeded", `${key} finished`);
    const result = graph.getSession().results.get(run.id);
    return { shown: SHOWN.map((id) => result?.node(id)), hidden: result?.node(HIDDEN) };
}

describe.each(BUILT_IN_ALGORITHMS.map((descriptor) => descriptor.key))(
    "the %s algorithm over the working graph",
    (key) => {
        it("gives the hidden node no value, and the shown nodes the values of the graph without it", async () => {
            const graph = await begin();
            await hide(graph);
            const filtered = await valuesOf(graph, key);

            const without = await valuesOf(await begin(false), key);

            assert.isUndefined(filtered.hidden, "a hidden node has no value");
            assert.deepStrictEqual(filtered.shown, without.shown, "computed over what is shown");
        });
    },
);

describe("the accelerated force driver over the working graph", () => {
    it("is handed only the shown nodes and leaves the hidden node where it was", async () => {
        const graph = await begin();
        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);
        await graph.setLayout("forceatlas2");
        await graph.waitForSettled();
        const before = where(graph, HIDDEN);

        await hide(graph);
        for (let frame = 0; frame < 30; frame++) {
            graph.getUpdateManager().stepFrames(1);
        }

        await fake.flush();
        await graph.waitForSettled();
        assert.strictEqual(slots(graph, fake), SHOWN.length, "the device holds one row per shown node");
        assert.deepStrictEqual(where(graph, HIDDEN), before, "the hidden node keeps its last position");
    });
});
