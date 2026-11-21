/**
 * @file A filter change frames the graph with one walk over the nodes it shows, on both render
 * paths, however large the graph (#7966: at 50,000 nodes each extra walk cost about 0.6 s). What is
 * asserted is counted work: the framings measured per filter change, and the nodes each measured.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { UpdateManager } from "../../src/managers/UpdateManager";
import { Node } from "../../src/Node";

/** The update loop's framing measure, reached by name to count it. */
type Measured = Record<"measure", (...args: unknown[]) => unknown>;

const mounted: Graphty[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * Mount an element holding a grid of nodes, each with a `step` equal to its id.
 * @param path - The render path.
 * @param count - How many nodes.
 * @returns The element, drawn.
 */
async function loaded(path: "objects" | "batched", count: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = path;
    element.edgeSrcIdPath = "src";
    element.edgeDstIdPath = "dst";
    element.layout = "fixed";
    element.style.display = "block";
    element.style.width = "300px";
    element.style.height = "200px";
    document.body.appendChild(element);
    mounted.push(element);
    element.nodeData = Array.from({ length: count }, (_, id) => ({
        id,
        step: id,
        position: { x: id % 50, y: Math.floor(id / 50), z: 0 },
    }));
    element.edgeData = Array.from({ length: count }, (_, at) => ({ src: at, dst: (at * 7 + 1) % count }));
    await vi.waitFor(() => {
        assert.strictEqual(element.graph.getNodeCount(), count);
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * The framings measured, and the nodes measured, while a filter keeps half the graph.
 * @param path - The render path.
 * @param count - How many nodes.
 * @returns The counts.
 */
async function filterOnce(path: "objects" | "batched", count: number): Promise<{ walks: number; nodes: number }> {
    const element = await loaded(path, count);
    const proto = UpdateManager.prototype as unknown as Measured;
    const { measure } = proto;
    const { framingBounds } = Node.prototype;
    const counts = { walks: 0, nodes: 0 };
    proto.measure = function (this: unknown, ...args: unknown[]): unknown {
        counts.walks++;
        return measure.apply(this, args);
    };
    Node.prototype.framingBounds = function (this: Node): ReturnType<typeof framingBounds> {
        counts.nodes++;
        return framingBounds.call(this);
    };
    try {
        await element.session.visibility.set({ kind: "range", attribute: "step", max: count / 2 - 1 });
        await element.session.styles.settled();
        await element.waitForStableFrame();
    } finally {
        proto.measure = measure;
        Node.prototype.framingBounds = framingBounds;
    }

    return counts;
}

describe("a filter change's framing", () => {
    for (const path of ["objects", "batched"] as const) {
        it(`walks the shown nodes once on renderPath "${path}"`, async () => {
            for (const count of [400, 2000]) {
                const { walks, nodes } = await filterOnce(path, count);
                assert.strictEqual(walks, 1, `${String(count)} nodes: framings measured`);
                // The batched path frames its rows from the row table, with no `Node`.
                assert.isAtMost(nodes, path === "objects" ? count / 2 : 0, `${String(count)} nodes: nodes measured`);
            }
        });
    }
});
