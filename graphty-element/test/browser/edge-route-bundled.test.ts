/**
 * @file `edge.route` "bundled" draws force-directed edge bundling, in the 2D and the 3D view: on twenty near-parallel
 * edges the mean distance between the edges' drawn middles falls to under half of what it is drawn straight, and
 * `edge.bundleStrength` 0 draws them straight.
 */
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

/** Twenty near-parallel edges: sources down the left, targets down the right, each a little lower. */
const NODES = Array.from({ length: 20 }, (_, i) => [
    { id: `s${String(i)}`, position: { x: 0, y: i * 2, z: 0 } },
    { id: `t${String(i)}`, position: { x: 40, y: i * 2 + 1, z: 0 } },
]).flat();
const EDGES = Array.from({ length: 20 }, (_, i) => ({ src: `s${String(i)}`, dst: `t${String(i)}` }));

for (const view of ["2d", "3d"] as const) {
    describe(`edge.route "bundled" in ${view}`, () => {
        let container: HTMLElement;
        let graph: Graph;

        beforeEach(async () => {
            container = document.createElement("div");
            container.style.width = "640px";
            container.style.height = "480px";
            document.body.appendChild(container);
            graph = new Graph(container);
            await graph.init();
            await graph.setViewMode(view);
            await graph.addNodes(NODES);
            await graph.addEdges(EDGES);
            await graph.setLayout("fixed", { dim: 3 });
        });

        afterEach(() => {
            graph.dispose();
            container.remove();
        });

        /**
         * Paints every edge, waits for the drawing, and measures how close the edges' middles are.
         * @param set - The channels to write.
         * @returns The mean distance between every two edges' drawn middles.
         */
        async function spread(set: Record<string, unknown>): Promise<number> {
            await graph
                .getSession()
                .styles.add({ name: "route", target: "edge", selector: { match: "everything" }, set });
            await operationQueueOf(graph).waitForCompletion();
            await graph.waitForStableFrame();
            const middles = [...graph.getDataManager().edges.values()].map((edge) => {
                const points = edge.drawnCurve;
                if (points === null || points.length < 2) {
                    const { src, dst } = { src: edge.srcNode.mesh.position, dst: edge.dstNode.mesh.position };
                    return { x: (src.x + dst.x) / 2, y: (src.y + dst.y) / 2 };
                }
                const mid = points[Math.floor(points.length / 2)];
                return { x: mid.x, y: mid.y };
            });
            let sum = 0;
            let pairs = 0;
            for (let a = 0; a < middles.length; a++) {
                for (let b = a + 1; b < middles.length; b++) {
                    sum += Math.hypot(middles[a].x - middles[b].x, middles[a].y - middles[b].y);
                    pairs++;
                }
            }
            return sum / pairs;
        }

        it("gathers the edges: their middles end at least twice as close as drawn straight", async () => {
            const straight = await spread({ "edge.route": "straight" });
            const bundled = await spread({ "edge.route": "bundled" });
            assert.isBelow(bundled, straight / 2);
        });

        it("strength 0 draws them straight", async () => {
            const straight = await spread({ "edge.route": "straight" });
            const none = await spread({ "edge.route": "bundled", "edge.bundleStrength": 0 });
            assert.closeTo(none, straight, straight * 0.01);
        });
    });
}
