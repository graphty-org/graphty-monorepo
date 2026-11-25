/**
 * @file On `renderPath: "batched"`, a directed graph of 10,000 nodes keeps every edge on the fast path: its default
 * look (an arrowhead on every edge), an arrowhead restyle and a dash restyle leave no edge drawn as an object of its
 * own, in 3D and in 2D. An object edge costs a Babylon.js mesh, its own draw and its own pick, so `rowCounts` is a
 * counted proxy for the restyle time, the first frame and the heap, and it does not depend on the machine.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const N = 10_000;
const M = 30_000;
/** A seeded spread of positions, so no two nodes overlap and every edge has two round ends. */
const NODES = Array.from({ length: N }, (_, id) => ({
    id,
    position: { x: (id % 100) * 3, y: Math.floor(id / 100) * 3, z: 0 },
}));
/** Each node to the next three nodes along, wrapping round. */
const EDGES = Array.from({ length: M }, (_, at) => ({ src: at % N, dst: (at % N) + 1 + (Math.floor(at / N) % 3) })).map(
    ({ src, dst }) => ({ src, dst: dst % N }),
);

const everything = { match: "everything" } as const;

afterEach(() => {
    document.body.replaceChildren();
});

/**
 * Mount a batched element and load the graph in its default, directed look, on fixed positions.
 * @param view - The view.
 * @returns The element, its picture final.
 */
async function loaded(view: "3d" | "2d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = "batched";
    element.viewMode = view;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: view === "2d" ? 2 : 3 });
    await element.session.data.addEdges(EDGES);
    await settled(element);
    return element;
}

/**
 * Wait for queued work and a stable frame.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * Check that every edge is pulled.
 * @param element - The element.
 * @param what - What was done.
 */
function allPulled(element: Graphty, what: string): void {
    const { pulledEdges, objectEdges } = element.rowCounts;
    assert.deepEqual({ pulledEdges, objectEdges }, { pulledEdges: M, objectEdges: 0 }, what);
}

describe.each(["3d", "2d"] as const)("a directed 10,000-node graph on the batched path in %s", (view) => {
    it("keeps every edge pulled in its default look", async () => {
        allPulled(await loaded(view), "default look");
    });

    for (const [name, set] of [
        ["an arrowhead restyle", { "edge.arrowHead": "diamond", "edge.arrowHeadColor": "#e6194b" }],
        ["a dash restyle", { "edge.style": "dash" }],
    ] as const) {
        it(`keeps every edge pulled through ${name}`, async () => {
            const element = await loaded(view);
            await element.session.styles.add({ name: "case", target: "edge", selector: everything, set } as never);
            await settled(element);
            allPulled(element, name);
        });
    }
});
