/**
 * @file Only a layout moves nodes. A style edit, a filter step and a run that paints the graph
 * leave every node where the settled layout put it: a reader styling a drawing must never see it
 * re-laid.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";
import { drawnFrames } from "../helpers/drawn-frames";

/** Three cliques of four joined in a ring, every other node flagged. */
const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}`, flagged: i % 2 === 0 }));
const EDGES = [
    ...[0, 4, 8].flatMap((base) =>
        [
            [0, 1],
            [0, 2],
            [0, 3],
            [1, 2],
            [1, 3],
            [2, 3],
        ].map(([a, b]) => ({ src: `n${String(base + a)}`, dst: `n${String(base + b)}` })),
    ),
    { src: "n3", dst: "n4" },
    { src: "n7", dst: "n8" },
    { src: "n11", dst: "n0" },
];

const mounted: Graphty[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * Where each node is, to four decimals.
 * @param element - The element.
 * @returns Node id to coordinates.
 */
function positions(element: Graphty): Record<string, number[]> {
    const engine = element.graph.getLayoutManager().layoutEngine;
    assert.isDefined(engine);
    const out: Record<string, number[]> = {};
    for (const node of element.graph.getDataManager().nodes.values()) {
        const { x, y, z } = engine.getNodePosition(node);
        out[String(node.id)] = [x, y, z ?? 0].map((v) => Number(v.toFixed(4)));
    }

    return out;
}

/**
 * Let frames draw.
 * @param element - The element.
 * @param count - How many.
 */
async function frames(element: Graphty, count: number): Promise<void> {
    await drawnFrames(element.graph.getScene(), count);
}

/**
 * Wait until the layout has come to rest: two readings ten frames apart agree.
 * @param element - The element.
 * @returns Where it came to rest.
 */
async function rest(element: Graphty): Promise<Record<string, number[]>> {
    await element.graph.waitForSettled();
    let before = positions(element);
    for (let tries = 0; tries < 300; tries++) {
        await frames(element, 10);
        const now = positions(element);
        if (JSON.stringify(now) === JSON.stringify(before)) {
            return now;
        }
        before = now;
    }
    throw new Error("the layout never came to rest");
}

/**
 * Let the element finish what a change set off, and read where the nodes are.
 * @param element - The element.
 * @returns Node id to coordinates.
 */
async function after(element: Graphty): Promise<Record<string, number[]>> {
    await element.graph.getSession().styles.settled();
    await frames(element, 30);
    return positions(element);
}

describe("only a layout moves nodes", () => {
    test("a style layer, a filter step and a run with a filter step on leave every node in place", async () => {
        const element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        element.layoutConfig = { seed: 1 };
        element.layout = "force";
        document.body.appendChild(element);
        mounted.push(element);
        const session = element.graph.getSession();
        await session.data.addNodes(NODES);
        await session.data.addEdges(EDGES);
        const settled = await rest(element);

        const flagged = await session.styles.add({
            name: "Flagged",
            target: "node",
            selector: { match: "expression", where: "data.flagged == `true`" },
            set: { "node.color": "#ff0000" },
        });
        assert.deepEqual(await after(element), settled, "a style layer moved nodes");

        await session.visibility.set({
            kind: "member",
            of: { nodes: NODES.filter((n) => n.flagged).map((n) => n.id) },
        });
        assert.deepEqual(await after(element), settled, "a filter step moved nodes");

        await session.runs.start("louvain");
        assert.deepEqual(await after(element), settled, "a run with a filter step on moved nodes");

        await session.styles.update(flagged.id, {
            selector: { match: "expression", where: "data.flagged == `false`" },
        });
        assert.deepEqual(await after(element), settled, "a changed condition moved nodes");
    });
});
