/**
 * @file What loading edges that repeat an endpoint pair costs on each render path, at three sizes.
 *
 * Under `renderPath: "batched"` an edge is stored with no `Edge` and drawn as a row line until something needs its
 * `Edge`. Ingest used to ask for the `Edge` of the pair's first edge each time a repeat of the pair arrived, so a graph
 * whose pairs repeat built an `Edge` (a mesh slot and its bookkeeping) for every first member, drawn under the edges
 * ahead of it. It now asks the store, and builds none.
 *
 * WHAT IS ASSERTED IS COUNTED WORK: the `Edge`s the load builds under "batched" for plain lines (none). The time to
 * the first stable frame is printed as `[repeated-edges-load]` for both paths, not asserted.
 *
 * This file gates no push: it runs in the "browser-bench" project.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";

afterEach(() => {
    document.body.replaceChildren();
});

/** Edge counts: small, medium and large. Every other edge repeats the pair of the edge before it. */
const SIZES = [2_000, 20_000, 100_000];

/**
 * A graph of `edges` edges over a tenth as many nodes, each pair given twice.
 * @param edges - How many edges.
 * @returns The nodes and edges.
 */
function graphOf(edges: number): { nodes: { id: number }[]; edges: { src: number; dst: number }[] } {
    const count = Math.max(10, Math.round(edges / 10));
    const nodes = Array.from({ length: count }, (_, id) => ({ id }));
    const list = Array.from({ length: edges }, (_, i) => {
        const pair = Math.floor(i / 2);
        return { src: pair % count, dst: (pair * 7 + 1) % count };
    });
    return { nodes, edges: list };
}

/**
 * Load a graph on a path and time it to the first stable frame.
 * @param path - The render path.
 * @param edges - How many edges.
 * @returns The milliseconds taken and the `Edge`s built.
 */
async function load(path: "objects" | "batched", edges: number): Promise<{ ms: number; built: number }> {
    document.body.replaceChildren();
    const element: Graphty = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "600px";
    element.style.height = "400px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.setLayout("random", { seed: 1 });
    await element.session.styles.add({
        name: "plain",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "none" },
    } as never);
    const { nodes, edges: list } = graphOf(edges);
    const start = performance.now();
    await element.session.data.addNodes(nodes);
    await element.session.data.addEdges(list);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    const ms = performance.now() - start;
    return { ms, built: dataManagerInternals.edgesBuilt(element.graph.getDataManager()) };
}

describe("loading edges whose pairs repeat", () => {
    for (const edges of SIZES) {
        it(`at ${String(edges)} edges`, async () => {
            const objects = await load("objects", edges);
            const batched = await load("batched", edges);
            console.log(
                `[repeated-edges-load] ${String(edges)} edges: objects ${objects.ms.toFixed(0)} ms ` +
                    `(${String(objects.built)} Edges), batched ${batched.ms.toFixed(0)} ms (${String(batched.built)} Edges)`,
            );
            assert.equal(objects.built, edges, "the objects path builds every Edge");
            assert.equal(batched.built, 0, "row lines draw every plain edge; a repeat builds no Edge");
        });
    }
});
