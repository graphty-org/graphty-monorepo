/**
 * @file How many rows each style property, layout and reader action leaves on renderPath "batched"'s fast path.
 *
 * The deterministic half of the performance matrix (benchmarks/compare/perf-matrix.mjs times the same axes).
 * A node drawn as an object of its own costs a Babylon.js mesh, its own draw and its own pick; an edge drawn
 * as an object the same. So the number of object rows a style, a layout or an action leaves behind is a
 * counted proxy for its restyle time, its frame time and its heap, and it does not depend on the machine.
 *
 * Each case loads one small graph with plain edges (no arrowheads) on the batched path, applies one thing,
 * waits for the picture to be final and reads `rowCounts`. The budgets below are what master did when this
 * file was written: a count above its budget is a regression of the fast path and fails. A count below it is
 * an improvement; lower the budget in the same change, so it keeps guarding.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const N = 60;
const NODES = Array.from({ length: N }, (_, id) => ({
    id,
    group: id % 4,
    position: { x: (id % 10) - 5, y: Math.floor(id / 10) - 3, z: 0 },
}));
/** A ring plus a chord from every third node: 80 edges. */
const EDGES = [
    ...NODES.map(({ id }) => ({ source: id, target: (id + 1) % N })),
    ...NODES.filter(({ id }) => id % 3 === 0).map(({ id }) => ({ source: id, target: (id + 7) % N })),
];
const M = EDGES.length;

/** A picture the browser decodes without a network: 20 x 10, red and blue. */
const PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="10" height="10" fill="red"/>' +
        '<rect x="10" width="10" height="10" fill="blue"/></svg>',
)}`;

interface Budget {
    /** The most nodes that may be drawn as objects. */
    readonly objectNodes: number;
    /** The most edges that may be drawn as objects. */
    readonly objectEdges: number;
}

interface Case {
    readonly name: string;
    /** What the case does to the loaded graph. */
    readonly apply: (element: Graphty) => PromiseLike<unknown>;
    /** The most object rows it may leave, measured on master when this file was written. */
    readonly budget: Budget;
}

const everything = { match: "everything" } as const;
const nodeLayer =
    (set: Record<string, unknown>) =>
    (element: Graphty): PromiseLike<unknown> =>
        element.session.styles.add({ name: "case", target: "node", selector: everything, set } as never);
const edgeLayer =
    (set: Record<string, unknown>) =>
    (element: Graphty): PromiseLike<unknown> =>
        element.session.styles.add({ name: "case", target: "edge", selector: everything, set } as never);
const layout =
    (name: string, options: Record<string, unknown> = {}) =>
    (element: Graphty): PromiseLike<unknown> =>
        element.graph.setLayout(name, { seed: 7, ...options });

/** Everything on the fast path. */
const NONE: Budget = { objectNodes: 0, objectEdges: 0 };
/** Every node an object, every edge still pulled. */
const ALL_NODES: Budget = { objectNodes: N, objectEdges: 0 };

const STYLE_CASES: readonly Case[] = [
    { name: "nothing more (plain edges)", apply: async () => {}, budget: NONE },
    { name: "node.color", apply: nodeLayer({ "node.color": "#e15759" }), budget: NONE },
    { name: "node.size", apply: nodeLayer({ "node.size": 2 }), budget: NONE },
    { name: "node.shape", apply: nodeLayer({ "node.shape": "box" }), budget: NONE },
    {
        name: "node.borderWidth and borderColor",
        apply: nodeLayer({ "node.borderWidth": 0.12, "node.borderColor": "#202020" }),
        budget: ALL_NODES,
    },
    { name: "node.opacity", apply: nodeLayer({ "node.opacity": 0.5 }), budget: NONE },
    {
        name: "node.label",
        apply: (element) =>
            element.session.styles.add({
                name: "case",
                target: "node",
                selector: everything,
                encode: { "node.label": { by: "data.id", scale: "passthrough" } },
            } as never),
        budget: NONE,
    },
    { name: "node.image", apply: nodeLayer({ "node.image": PICTURE }), budget: ALL_NODES },
    { name: "edge.color", apply: edgeLayer({ "edge.color": "#4e79a7" }), budget: NONE },
    { name: "edge.width", apply: edgeLayer({ "edge.width": 3 }), budget: NONE },
    { name: "edge.opacity", apply: edgeLayer({ "edge.opacity": 0.5 }), budget: NONE },
    { name: "edge.arrowHead", apply: edgeLayer({ "edge.arrowHead": "normal" }), budget: NONE },
    { name: "edge.style dash", apply: edgeLayer({ "edge.style": "dash" }), budget: NONE },
    { name: "edge.curvature", apply: edgeLayer({ "edge.curvature": true }), budget: NONE },
];

const ACTION_CASES: readonly Case[] = [
    {
        name: "a hover layer, with a node hovered",
        apply: async (element) => {
            await element.session.styles.add({
                name: "case",
                target: "node",
                selector: { match: "hover", reach: "neighbors", invert: true },
                set: { "node.opacity": 0.25 },
            } as never);
            element.session.selection.hover(5);
        },
        budget: NONE,
    },
    { name: "one node selected", apply: (element) => element.session.selection.apply({ ids: [5] }), budget: NONE },
    { name: "one node pinned", apply: (element) => element.session.positions.pin([5]), budget: NONE },
    {
        name: "one node's values edited",
        apply: (element) => element.session.data.updateNodes([{ id: 5, values: { group: 9 } }]),
        budget: NONE,
    },
];

const LAYOUT_CASES: readonly Case[] = [
    { name: "ngraph force, 3D", apply: layout("ngraph", { dim: 3 }), budget: NONE },
    { name: "ngraph force, 2D", apply: layout("ngraph", { dim: 2 }), budget: NONE },
    { name: "d3 force", apply: layout("d3", { dim: 3 }), budget: NONE },
    { name: "forceatlas2", apply: layout("forceatlas2", { dim: 3 }), budget: NONE },
    { name: "circular", apply: layout("circular", { dim: 3 }), budget: NONE },
    { name: "grid", apply: layout("grid"), budget: NONE },
    { name: "random", apply: layout("random", { dim: 3 }), budget: NONE },
    {
        name: "circular through the glide transition",
        apply: async (element) => {
            await element.session.config.set({ layoutTransition: { transition: "glide", seconds: 0.2 } });
            await element.graph.setLayout("circular", { dim: 3 });
        },
        budget: NONE,
    },
];

const mounted: Graphty[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * Mount a batched element and load the graph with plain edges on fixed positions.
 * @returns The element, its picture final.
 */
async function loaded(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    element.renderPath = "batched";
    element.layout = "fixed";
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;
    await element.session.styles.add({
        name: "plain edges",
        target: "edge",
        selector: everything,
        set: { "edge.arrowHead": "none" },
    } as never);
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.waitForStableFrame();
    return element;
}

/**
 * Apply one case and check the rows it leaves against its budget.
 * @param c - The case.
 */
async function check(c: Case): Promise<void> {
    const element = await loaded();
    await c.apply(element);
    await element.waitForStableFrame();
    const counts = element.rowCounts;
    assert.strictEqual(counts.batchedNodes + counts.objectNodes, N, "every node is drawn one way or the other");
    assert.strictEqual(counts.pulledEdges + counts.objectEdges, M, "every edge is drawn one way or the other");
    assert.isAtMost(
        counts.objectNodes,
        c.budget.objectNodes,
        `${c.name}: ${counts.objectNodes} of ${N} nodes left the batch (budget ${c.budget.objectNodes})`,
    );
    assert.isAtMost(
        counts.objectEdges,
        c.budget.objectEdges,
        `${c.name}: ${counts.objectEdges} of ${M} edges are objects (budget ${c.budget.objectEdges})`,
    );
}

describe("rows left on the batched fast path", () => {
    describe("by one style property", () => {
        for (const c of STYLE_CASES) {
            it(c.name, () => check(c));
        }
    });
    describe("by a reader action", () => {
        for (const c of ACTION_CASES) {
            it(c.name, () => check(c));
        }
    });
    describe("by a layout", () => {
        for (const c of LAYOUT_CASES) {
            it(c.name, () => check(c));
        }
    });
});
