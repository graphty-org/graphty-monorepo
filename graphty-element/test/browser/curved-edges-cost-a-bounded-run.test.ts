/**
 * @file A curved edge costs a bounded run of segments, however far apart its ends are (issue #2249).
 *
 * A curve is drawn as a run of straight segments, one thin-instance slot each, and the run's
 * length came from the curve's length in world units. A circular layout of a few hundred nodes
 * puts edges about a hundred units long, so 359 curves took about 430,000 slots and over ten
 * seconds to settle, where the same edges drawn straight took 359 slots.
 */
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { EDGE_CONSTANTS } from "../../src/constants/meshConstants";
import { Graph, operationQueueOf } from "../../src/Graph";

/** The node and edge counts of the Cytoscape session the issue measured. */
const NODE_COUNT = 330;
const EDGE_COUNT = 359;

describe("curved edges cost a bounded run of segments", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("draws every curve of a large circular layout in at most the ceiling's segments", async () => {
        const nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({ id: `n${String(i)}` }));
        const edges = Array.from({ length: EDGE_COUNT }, (_, i) => ({
            src: `n${String(i % NODE_COUNT)}`,
            dst: `n${String((i * 7 + 3) % NODE_COUNT)}`,
        }));
        await graph.addNodes(nodes);
        await graph.addEdges(edges);
        await graph.setLayout("circular", {});
        await graph.getSession().styles.add({
            name: "curved",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.curvature": true },
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();

        let longest = 0;
        let total = 0;

        for (const edge of graph.getDataManager().edges.values()) {
            const curve = edge.drawnCurve;
            assert.isNotNull(curve, "every edge is drawn as a curve");
            const segments = (curve ?? []).length - 1;
            longest = Math.max(longest, segments);
            total += segments;
        }

        assert.isAtMost(longest, EDGE_CONSTANTS.BEZIER_MAX_SEGMENTS);
        assert.isAtMost(total, EDGE_COUNT * EDGE_CONSTANTS.BEZIER_MAX_SEGMENTS);
    });
});
