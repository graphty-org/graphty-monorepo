/**
 * Regression test for the meshes a dataset left behind (plan unit U3, task C).
 *
 * THE DEFECT: neither `Node` nor `Edge` had a `dispose()`, and `DataManager.clear()` emptied its
 * maps and called `meshCache.clear()` and nothing else. `MeshCache.clear()` disposes the cached
 * SOURCE meshes, and Babylon disposes a source's instances with it -- which is exactly why node
 * spheres and 3D solid edge lines vanished on a clear while roughly sixty grey ARROWHEADS stayed
 * on the canvas, in rosettes where the previous dataset's edges had converged. Arrowheads are
 * deliberately built per edge, bare against the scene (`EdgeMesh.createArrowHead` carries a
 * "PERFORMANCE FIX" note), and parented to the `graph-root` TransformNode, which outlives every
 * dataset. Patterned lines (dot/dash/star/...) and labels leak the same way.
 *
 * THIS TEST HAS TO BE A BROWSER TEST. The whole defect lives in the Babylon scene graph: the maps
 * a unit test can inspect were always emptied correctly. `scene.meshes.length` returning to its
 * pre-load baseline is the only statement of "nothing was left behind" that would have failed
 * before the fix.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";

/** How long the element needs to connect and finish its first update. */
const ELEMENT_READY_MS = 300;

/** How long a data-source assignment needs to reach the data manager. */
const LOAD_SETTLE_MS = 500;

/** How long a clear needs to reach the scene graph. */
const CLEAR_SETTLE_MS = 200;

/**
 * Six nodes in a star, so several edges converge on one node -- the shape the stray arrowheads
 * formed in the reported screenshot.
 */
const STAR_GRAPH = JSON.stringify({
    nodes: [{ id: "hub" }, { id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }],
    edges: [
        { src: "hub", dst: "a" },
        { src: "hub", dst: "b" },
        { src: "hub", dst: "c" },
        { src: "hub", dst: "d" },
        { src: "hub", dst: "e" },
    ],
});

let mounted: Graphty | null = null;

/**
 * Mounts a graphty-element and waits for it to initialise.
 * @returns The mounted element
 */
async function createGraphtyElement(): Promise<Graphty> {
    const container = document.createElement("div");

    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);

    const element = document.createElement("graphty-element");

    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";
    container.appendChild(element);

    await new Promise((resolve) => setTimeout(resolve, ELEMENT_READY_MS));

    mounted = element;

    return element;
}

/**
 * Give every edge an arrowhead and the given line type.
 *
 * Both halves matter: the arrowhead is the mesh that survived the clear, and a patterned line
 * type ("dot") routes the line itself through `PatternedLineRenderer`, which is also uncached and
 * leaked identically.
 * @param element - The element to style
 * @param lineType - The edge line type to use
 */
async function styleEdges(element: Graphty, lineType: "solid" | "dot"): Promise<void> {
    await element.session.styles.add({
        name: "edges with arrowheads",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.style": lineType, "edge.color": "#AAAAAA", "edge.arrowHead": "normal" },
    });
}

/**
 * Sets the data-source pair the way a host does, and waits for the load to land.
 * @param element - The mounted element
 * @param data - The inline JSON to load
 */
async function loadInline(element: Graphty, data: string): Promise<void> {
    element.dataSource = "json";
    element.dataSourceConfig = { data };

    await new Promise((resolve) => setTimeout(resolve, LOAD_SETTLE_MS));
}

afterEach(() => {
    mounted?.parentElement?.remove();
    mounted = null;
});

describe("scene teardown on clearData", () => {
    for (const lineType of ["solid", "dot"] as const) {
        test(`returns scene.meshes to its pre-load baseline (${lineType} edges)`, async () => {
            const element = await createGraphtyElement();
            await styleEdges(element, lineType);

            const scene = element.graph.getScene();
            const baseline = scene.meshes.length;

            await loadInline(element, STAR_GRAPH);

            assert.strictEqual(element.graph.getDataManager().nodes.size, 6, "the dataset must actually load");
            assert.isAbove(scene.meshes.length, baseline, "loading must add meshes, or the test proves nothing");

            element.clearData();
            await new Promise((resolve) => setTimeout(resolve, CLEAR_SETTLE_MS));

            assert.strictEqual(
                scene.meshes.length,
                baseline,
                `clearData left ${scene.meshes.length - baseline} mesh(es) in the scene; ` +
                    "before Node.dispose/Edge.dispose existed these were the arrowheads, patterned line " +
                    "segments and labels that no cache ever owned",
            );
        });
    }
});
