/**
 * @file A support model left at its defaults bows edges among the nodes, in 2D and 3D.
 *
 * `edge.supportModel`'s forces default to vis-network's numbers, which are in pixels. With no
 * `edge.supportUnit` and no `edge.supportScale` they used to be read as scene units, and on the
 * karate club sample the support points settled 5 to 10 graph widths away, so every curve shot off
 * the canvas. With neither set, the forces are now read at the drawing's own size.
 */
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import karateGml from "../helpers/corpus/gml/karate.gml?raw";
import { pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

const WIDTH = 480;
const HEIGHT = 360;
/** How far past the nodes' bounding box a support point may rest, in box sizes from its center. */
const REACH = 1.5;

for (const view of ["2d", "3d"] as const) {
    describe(`support model defaults (${view})`, () => {
        let container: HTMLElement;
        let graph: Graph;

        beforeAll(async () => {
            container = document.createElement("div");
            container.style.width = `${String(WIDTH)}px`;
            container.style.height = `${String(HEIGHT)}px`;
            document.body.appendChild(container);
            graph = new Graph(container);
            await graph.init();
            await graph.setViewMode(view);
            await graph.addDataFromSource("gml", { data: karateGml });
            await operationQueueOf(graph).waitForCompletion();
            await graph.waitForStableFrame();
        });

        afterAll(() => {
            graph.dispose();
            container.remove();
        });

        it("rests every support point near the nodes and draws other curves than curvature alone", async () => {
            const session = graph.getSession();
            const curved = await session.styles.add({
                name: "curved",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.curvature": true },
            });
            const plainCurves = await readCanvas(graph);

            const supported = await session.styles.add({
                name: "support",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.supportModel": "barnesHut" },
            });
            const throughSupports = await readCanvas(graph);

            const dm = graph.getDataManager();
            const nodes = [...dm.nodes.values()].map((node) => node.mesh.position);
            const box = {
                minX: Math.min(...nodes.map((p) => p.x)),
                maxX: Math.max(...nodes.map((p) => p.x)),
                minY: Math.min(...nodes.map((p) => p.y)),
                maxY: Math.max(...nodes.map((p) => p.y)),
                minZ: Math.min(...nodes.map((p) => p.z)),
                maxZ: Math.max(...nodes.map((p) => p.z)),
            };
            const cx = (box.minX + box.maxX) / 2;
            const cy = (box.minY + box.maxY) / 2;
            const halfX = ((box.maxX - box.minX) / 2) * REACH;
            const halfY = ((box.maxY - box.minY) / 2) * REACH;
            const cz = (box.minZ + box.maxZ) / 2;
            // A flat drawing in 3D still lets a point leave the plane by as much as the box is wide.
            const halfZ = Math.max(((box.maxZ - box.minZ) / 2) * REACH, halfX, halfY);
            const outsideZ = (p: { z: number }): boolean => view === "3d" && Math.abs(p.z - cz) > halfZ;
            const points = [...dm.edges.values()].map((edge) => dm.supportPoints.pointOf(edge));
            const placed = points.filter((p) => p !== null);

            await session.styles.remove(supported.id);
            await session.styles.remove(curved.id);

            assert.strictEqual(placed.length, points.length, "every curved edge has a support point");
            const outside = placed.filter(
                (p) => Math.abs(p.x - cx) > halfX || Math.abs(p.y - cy) > halfY || outsideZ(p),
            );
            assert.deepEqual(
                outside.map((p) => [p.x, p.y, p.z]),
                [],
                `every support point rests within ${String(REACH)}x the nodes' box ${JSON.stringify(box)}`,
            );
            assert.isAbove(
                pixelsOverBar(plainCurves, throughSupports),
                0,
                "curves through support points differ from curvature alone",
            );
        });
    });
}
