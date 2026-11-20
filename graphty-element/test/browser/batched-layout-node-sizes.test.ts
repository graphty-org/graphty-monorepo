/**
 * @file A layout that reads the nodes' drawn sizes (Graphviz routing the fixed layout's edges, `nodeGap`) reads the
 * same size for a node under `renderPath: "batched"` whether or not the node has its `Node` when the layout starts,
 * and the size the `"objects"` path reads: the node's surface and its border.
 *
 * A row with no `Node` was read from the row table without its border, and a `Node` from its own measure in doubles,
 * so which rows had a `Node` when the layout started -- no fixed point in a load -- decided the sizes Graphviz routed
 * round, and a story drew one of two pictures from capture to capture.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

afterEach(() => {
    document.body.replaceChildren();
});

const NODES = Array.from({ length: 8 }, (_, i) => ({
    id: `n${String(i)}`,
    position: { x: 40 * (i % 4), y: 40 * Math.floor(i / 4), z: 0 },
}));
const EDGES = [
    { src: "n0", dst: "n1" },
    { src: "n0", dst: "n1" },
    { src: "n1", dst: "n2" },
    { src: "n2", dst: "n6" },
    { src: "n4", dst: "n5" },
    { src: "n5", dst: "n7" },
];

/**
 * The node sizes the fixed layout hands Graphviz to route a load's edges round: each node's `width` in the DOT text of
 * the first request, made as the load arrives.
 * @param path - The render path.
 * @returns The width of each node, by its DOT name.
 */
async function routedSizes(path: "objects" | "batched"): Promise<Map<string, number>> {
    document.body.replaceChildren();
    // The DOT text each Graphviz request carries.
    const sent: string[] = [];
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, ...args: unknown[]) {
        const { dot } = (args[0] ?? {}) as { dot?: unknown };
        if (typeof dot === "string") {
            sent.push(dot);
        }

        Reflect.apply(original, this, args);
    };

    try {
        const element: Graphty = document.createElement("graphty-element");
        element.renderer = "webgl";
        element.renderPath = path;
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        document.body.appendChild(element);
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        await element.graph.setLayout("fixed", { edgeRoutes: "graphviz" });
        await element.session.styles.add({
            name: "bordered",
            target: "node",
            selector: { match: "everything" },
            set: { "node.borderWidth": 3, "node.borderColor": "#202020" },
        } as never);
        await element.session.data.addNodes(NODES);
        await element.session.data.addEdges(EDGES);
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
    } finally {
        Worker.prototype.postMessage = original;
    }

    const [dot] = sent;
    assert.isDefined(dot, "the layout asked Graphviz for routes");
    return new Map([...dot.matchAll(/(n\d+) \[width=([\d.e-]+)/g)].map(([, name, width]) => [name, Number(width)]));
}

describe("the node sizes a layout reads under batched", () => {
    it("are the drawn sizes, border included, as the objects path reads them", async () => {
        const objects = await routedSizes("objects");
        assert.equal(objects.size, NODES.length);
        const batched = await routedSizes("batched");
        assert.equal(batched.size, objects.size);
        for (const [name, width] of objects) {
            // The batched sizes are read from a float table, the objects path's in doubles.
            assert.closeTo(batched.get(name) ?? Number.NaN, width, 1e-5, name);
        }
    });
});
