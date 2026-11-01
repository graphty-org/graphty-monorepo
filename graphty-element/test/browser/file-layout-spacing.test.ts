/**
 * @file A styled file with no positions, laid out by the element's force layout with `lengths: "spacing"`: its nodes
 * are as large beside the gaps between them as the file's own program draws them (issues #3168, #3103).
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";

/** vis-network's spring length, the spacing it lays out a file with no positions at. */
const VIS_SPRING = 95;

/** A vis-network file with no positions: a ring of twelve 40 px dots with three chords. */
const DOC = JSON.stringify({
    nodes: Array.from({ length: 12 }, (_unused, i) => ({ id: `n${String(i)}` })),
    edges: [
        ...Array.from({ length: 12 }, (_unused, i) => ({ from: `n${String(i)}`, to: `n${String((i + 1) % 12)}` })),
        { from: "n0", to: "n6" },
        { from: "n3", to: "n9" },
        { from: "n2", to: "n7" },
    ],
    options: { nodes: { shape: "dot", size: 20 } },
});

/**
 * The median of some numbers.
 * @param values - The numbers.
 * @returns The median.
 */
function median(values: readonly number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
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
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Load the file with these lengths and let the recommended layout settle.
     * @param lengths - How the file's lengths are scaled.
     * @returns The median drawn node diameter and the median length of a drawn edge, in scene units.
     */
    async function drawn(lengths: "file" | "spacing"): Promise<{ node: number; edge: number }> {
        const session = graph.getSession();
        await session.data.import(
            { type: "json", config: { data: DOC } },
            { styles: "file", layout: "recommended", styleOptions: { lengths } },
        );
        await operationQueueOf(graph).waitForCompletion();
        const manager = graph.getLayoutManager();
        while (!(manager.layoutEngine?.isSettled ?? false) || manager.running) {
            await drawnFrames(graph.getScene(), 1);
        }
        assert.strictEqual(session.layout.id, "force");

        const at = (id: string): { x: number; y: number; z: number } => {
            const position = graph.getNode(id)?.getPosition();
            assert.isDefined(position, id);
            return position ?? { x: Number.NaN, y: Number.NaN, z: Number.NaN };
        };
        const nodes = session.data.nodes().map((n) => 2 * (graph.getNode(n.id)?.drawnRadius ?? Number.NaN));
        const edges = session.data.edges().map(({ source, target }) => {
            const [a, b] = [at(String(source)), at(String(target))];
            return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        });
        return { node: median(nodes), edge: median(edges) };
    }

    it("draws a node beside its edges in the program's proportion", async () => {
        // with lengths: "file" one file unit is one scene unit, so this is the program's node size
        const { node: fileNode } = await drawn("file");
        const { node, edge } = await drawn("spacing");

        const program = VIS_SPRING / fileNode;
        const ratio = edge / node / program;
        // the band any two unrelated layouts are judged in (the fidelity comparator's node.sizeToSpacing)
        assert.isAtLeast(ratio, 0.5, `edges ${String(edge)} long beside ${String(node)} wide nodes`);
        assert.isAtMost(ratio, 2, `edges ${String(edge)} long beside ${String(node)} wide nodes`);
    });
});
