/**
 * ARF draws in the same box as every other one-pass layout: the farthest node is `scale` layout
 * units from the center, `scale * scalingFactor` scene units (50 by default, as Kamada-Kawai),
 * whatever size the forces settled at.
 *
 * Unscaled, ARF's result grows with the graph: the 77-node story graph came out about 14 layout
 * units across, 1,400 scene units, and once the camera fitted that the nodes (1 scene unit) were
 * too small to see and the edges were faint lines.
 */
import { assert, describe, it } from "vitest";

import { ElementPositions } from "../../src/data/positions";
import type { Edge } from "../../src/Edge";
import { ArfLayout } from "../../src/layout/ArfLayoutEngine";
import { layoutEngineInternals } from "../../src/layout/LayoutEngine";
import type { Node } from "../../src/Node";

/**
 * Lay out a ring with a chord from every node to the one a third of the way round.
 * @param n - the node count
 * @param opts - the ARF options
 * @returns the farthest any node is from the origin, in scene units
 */
function farthest(n: number, opts: Record<string, unknown>): number {
    const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${String(i)}`, index: i }) as unknown as Node);
    const edges: Edge[] = [];
    for (let i = 0; i < n; i++) {
        for (const j of [(i + 1) % n, (i + Math.floor(n / 3)) % n]) {
            edges.push({
                srcId: nodes[i].id,
                dstId: nodes[j].id,
                srcNode: nodes[i],
                dstNode: nodes[j],
            } as unknown as Edge);
        }
    }

    const layout = new ArfLayout({ seed: 12, ...opts });
    layoutEngineInternals.attachPositions(layout, new ElementPositions(n));
    layoutEngineInternals.addNodes(layout, nodes);
    layoutEngineInternals.addEdges(layout, edges);

    let max = 0;
    for (const node of nodes) {
        const { x, y } = layout.getNodePosition(node);
        max = Math.max(max, Math.hypot(x, y));
    }

    return max;
}

describe("ARF layout scale", () => {
    it("puts the farthest node 50 scene units from the center by default, at any graph size", () => {
        for (const n of [10, 77, 200]) {
            assert.closeTo(farthest(n, {}), 50, 1e-3, `${String(n)} nodes`);
        }
    });

    it("puts the farthest node `scale` layout units from the center", () => {
        assert.closeTo(farthest(77, { scale: 2.5 }), 125, 1e-3);
        assert.closeTo(farthest(77, { scale: 2.5, scalingFactor: 100 }), 250, 1e-3);
    });
});
