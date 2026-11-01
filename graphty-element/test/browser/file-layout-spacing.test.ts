/**
 * @file A styled file with no positions, laid out by the element's force layout with `lengths: "spacing"`: its nodes
 * are as large beside the spacing the layout settles at as the file's own program draws them (issues #3168, #3103,
 * #5514).
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import boxesUrl from "../../../graph-io/test/corpus/styles/cx/fidelity/repro-unplaced-boxes.cx?url";
import { Graph, operationQueueOf } from "../../src/Graph";
import { NODE_EXTENT_PER_SIZE } from "../../src/meshes/NodeMesh";
import { drawnFrames } from "../helpers/drawn-frames";

/**
 * Cytoscape desktop's median nearest-node spacing in its own layout of the file, in the file's px: the fidelity oracle
 * `cx-repro-unplaced-boxes` (Cytoscape 3.10.5) draws it 125.831 px apart at zoom 1.15293.
 */
const CYTOSCAPE_SPACING = 125.831 / 1.1529290860749886;

/**
 * The median of some numbers.
 * @param values - The numbers.
 * @returns The median.
 */
function median(values: readonly number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

/**
 * The median distance from a point to its nearest neighbor.
 * @param points - The points.
 * @returns The median spacing.
 */
function medianSpacing(points: readonly { x: number; y: number }[]): number {
    return median(
        points.map((p, i) =>
            Math.min(...points.filter((_q, k) => k !== i).map((q) => Math.hypot(p.x - q.x, p.y - q.y))),
        ),
    );
}

describe("a styled file with no positions, spaced as its program spaces it", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.getSession().layout.setDimension("2d");
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Load the file with these lengths and let the recommended layout settle.
     * @param lengths - How the file's lengths are scaled.
     * @returns The median drawn node diameter and the median nearest-node spacing, in scene units.
     */
    async function drawn(lengths: "file" | "spacing"): Promise<{ node: number; spacing: number }> {
        const session = graph.getSession();
        await session.data.import(
            { type: "cx", config: { url: boxesUrl } },
            { styles: "file", layout: "recommended", styleOptions: { lengths } },
        );
        await operationQueueOf(graph).waitForCompletion();
        const manager = graph.getLayoutManager();
        while (!(manager.layoutEngine?.isSettled ?? false) || manager.running) {
            await drawnFrames(graph.getScene(), 1);
        }
        assert.strictEqual(session.layout.id, "force");

        const ids = session.data.nodes().map((n) => n.id);
        const nodes = ids.map((id) => 2 * (graph.getNode(id)?.drawnRadius ?? Number.NaN));
        const points = ids.map((id) => graph.getNode(id)?.getPosition() ?? { x: Number.NaN, y: Number.NaN });
        return { node: median(nodes), spacing: medianSpacing(points) };
    }

    it("draws a node beside the settled spacing in the program's proportion", async () => {
        // with lengths: "file" a node of size s is drawn NODE_EXTENT_PER_SIZE s across, so this is the program's node,
        // in the file's units and in the same measure
        const fileNode = (await drawn("file")).node / NODE_EXTENT_PER_SIZE;
        const { node, spacing } = await drawn("spacing");

        const ratio = node / spacing / (fileNode / CYTOSCAPE_SPACING);
        // the band any two unrelated layouts are judged in (the fidelity comparator's node.sizeToSpacing)
        const told = `nodes ${String(node)} wide ${String(spacing)} apart, Cytoscape's ${String(fileNode)} wide ${String(CYTOSCAPE_SPACING)} apart`;
        assert.isAtLeast(ratio, 0.5, told);
        assert.isAtMost(ratio, 2, told);
    });
});
