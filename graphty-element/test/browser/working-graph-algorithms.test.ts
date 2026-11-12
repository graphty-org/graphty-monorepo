/**
 * @file Algorithms over the working graph (design/working-graph/design.md section 6), on a real
 * `<graphty-element>`. With the session's `workingGraph` option on, a run over what is shown computes
 * over the view whatever the algorithm declares: a `defineAlgorithm` plugin's values are the shown
 * graph's, a hidden node gets no value, a re-run after the filter changes reads the new view and
 * keeps its scope, and the run's name does not change. With the option off, a plugin computes over
 * the whole graph and only its values are kept for what is shown, as before.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeAll, describe, it } from "vitest";

import { defineAlgorithm } from "../../extend";
import type { Graphty } from "../../index";
import { operationQueueOf } from "../../src/Graph";

/** A triangle a-b-c with a tail c-d-e. */
const NODES = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
const EDGES = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
    { source: "c", target: "a" },
    { source: "c", target: "d" },
    { source: "d", target: "e" },
];

/** The plugin: each node's number of edges, read through the simple tier's graph view. */
const PLUGIN = "acme-working-degree";

const mounted: Graphty[] = [];

beforeAll(() => {
    defineAlgorithm({ id: PLUGIN, node: (node) => node.degree });
});

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * Put the graph on the page with some nodes shown.
 * @param working - Whether the session reads the working graph.
 * @param shown - The nodes the filter keeps.
 * @returns The element.
 */
async function mount(working: boolean, shown: readonly string[]): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;
    element.workingGraph = working;
    element.nodeData = NODES;
    element.edgeData = EDGES;
    await operationQueueOf(element.graph).waitForCompletion();
    await show(element, shown);
    return element;
}

/**
 * Show only some nodes.
 * @param element - The element.
 * @param shown - The nodes the filter keeps.
 */
async function show(element: Graphty, shown: readonly string[]): Promise<void> {
    await element.graph.getSession().visibility.set({ kind: "member", of: { nodes: [...shown] } });
    await element.graph.waitForSettled();
}

/**
 * Each node's published value under a run.
 * @param element - The element.
 * @param runId - The run.
 * @returns The values, by node id, undefined where the run published none.
 */
function valuesOf(element: Graphty, runId: string): Record<string, unknown> {
    const result = element.graph.getSession().results.get(runId);
    return Object.fromEntries(NODES.map(({ id }) => [id, result?.node(id)?.value]));
}

describe("a defineAlgorithm plugin over the working graph", () => {
    it("computes over what is shown with the option on: a hidden neighbour does not count", async () => {
        const element = await mount(true, ["a", "b", "c"]);

        const run = element.run(PLUGIN);
        await run;

        assert.strictEqual(run.status, "succeeded");
        assert.deepStrictEqual(valuesOf(element, run.id), { a: 2, b: 2, c: 2, d: undefined, e: undefined });
    });

    it("computes over the whole graph with the option off, keeping the shown nodes' values", async () => {
        const element = await mount(false, ["a", "b", "c"]);

        const run = element.run(PLUGIN);
        await run;

        assert.deepStrictEqual(valuesOf(element, run.id), { a: 2, b: 2, c: 3, d: undefined, e: undefined });
    });

    it("re-runs over the new view after the filter changes, keeping its scope", async () => {
        const element = await mount(true, ["a", "b", "c"]);
        const run = element.run(PLUGIN);
        await run;

        await show(element, ["a", "b", "c", "d"]);
        assert.strictEqual(run.stale?.reason, "scope-changed");
        await run.rerun();

        assert.strictEqual(run.status, "succeeded");
        assert.strictEqual(run.scope.spec, "visible");
        assert.deepStrictEqual(valuesOf(element, run.id), { a: 2, b: 2, c: 3, d: 1, e: undefined });
    });

    it("keeps the run's name whether the option is on or off", async () => {
        const on = await mount(true, ["a", "b", "c"]);
        const off = await mount(false, ["a", "b", "c"]);

        const named = [on.run(PLUGIN), off.run(PLUGIN), on.run("degree"), off.run("degree")];
        await Promise.all(named);

        assert.strictEqual(named[0].id, named[1].id);
        assert.strictEqual(named[2].id, named[3].id);
    });
});

describe("a built-in over the working graph", () => {
    it("computes over what is shown, as it declares", async () => {
        const element = await mount(true, ["a", "b", "c"]);

        const run = element.run("degree");
        await run;

        assert.deepStrictEqual(valuesOf(element, run.id), { a: 2, b: 2, c: 2, d: undefined, e: undefined });
    });
});
