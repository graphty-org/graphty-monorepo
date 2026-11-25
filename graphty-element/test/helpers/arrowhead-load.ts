/**
 * @file Load a seeded random graph with plain edges, then give every edge an arrowhead (issue #10027).
 * Shared by the counted test (`test/browser/arrowhead-memory.test.ts`) and the heap benchmark
 * (`test/browser/arrowhead-memory.bench.test.ts`).
 */
import "../../src/graphty-element";

import { erdosRenyiGnmGraph } from "@graphty/graph-samples/generators";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { arrowCapBuffers } from "../../src/meshes/ArrowCapBatch";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { DEFAULT_LIMITS } from "../../src/session/limits";

/**
 * Add one layer that sets every edge's arrowhead.
 * @param element - The element.
 * @param name - The layer's name.
 * @param type - The arrowhead.
 */
async function arrowheads(element: Graphty, name: string, type: "none" | "normal"): Promise<void> {
    await element.session.styles.add({
        name,
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": type },
    });
}

/**
 * Wait until everything asked of the element is drawn.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * What every arrowhead cap batch holds in its buffers, which live outside the JS heap.
 * @param element - The element.
 * @returns The bytes, and how many caps are drawn.
 */
export function capBuffers(element: Graphty): { bytes: number; caps: number } {
    return arrowCapBuffers(element.graph.scene);
}

/**
 * Load a seeded random graph with plain edges, sample, give every edge an arrowhead, sample again.
 * @param path - The render path.
 * @param nodes - How many nodes.
 * @param edges - How many edges.
 * @param sample - What to read before and after the arrowheads.
 * @returns Both samples, and the element.
 */
export async function arrowCost<S>(
    path: RenderPath,
    nodes: number,
    edges: number,
    sample: (element: Graphty) => Promise<S> | S,
): Promise<{ before: S; after: S; element: Graphty }> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = path;
    element.layout = "fixed";
    element.style.cssText = "display:block;width:640px;height:480px";
    if (path === "batched") {
        element.limits = { renderCeiling: Math.max(nodes, DEFAULT_LIMITS.renderCeiling) };
    }

    document.body.appendChild(element);
    await element.updateComplete;
    await settled(element);
    await arrowheads(element, "plain edges", "none");

    const graph = erdosRenyiGnmGraph({ n: nodes, m: edges, seed: 42 });
    const side = 4 * Math.sqrt(nodes);
    const positions = new Float32Array(3 * nodes);
    for (let row = 0; row < nodes; row++) {
        // a fixed scatter, so no layout runs
        positions[3 * row] = ((row * 0.618_034) % 1) * side;
        positions[3 * row + 1] = ((row * 0.414_214) % 1) * side;
    }

    await element.session.data.importColumns({
        nodeCount: nodes,
        sources: graph.src,
        targets: graph.dst,
        positions,
    });
    await settled(element);
    const before = await sample(element);

    await arrowheads(element, "arrows", "normal");
    await settled(element);
    const after = await sample(element);
    return { before, after, element };
}
