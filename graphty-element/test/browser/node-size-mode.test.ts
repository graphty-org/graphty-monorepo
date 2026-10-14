/**
 * @file `node.sizeMode` draws every shape at one extent (issue #2495).
 *
 * A node's size used to be handed to each shape's mesh builder as its own scale, so shapes of one
 * size were drawn at different extents: a size-1 octahedron is 2.83 across where a size-1 sphere
 * is 1. `node.sizeMode: "diameter"` makes the size the largest width, height or depth of the
 * drawn shape, the same for every shape. "scale", the default, keeps the old drawing.
 *
 * The extent is read on screen: every vertex of a node's mesh is projected through the camera,
 * which gives the drawn width and height in pixels. The view is 2D, so the camera is orthographic
 * and every unit of depth is the same number of pixels as a unit across; the depth is converted at
 * that rate, because several shapes (the dodecahedron, the icosahedron) are deepest front to back
 * and "diameter" promises the largest of the three.
 */
import { Matrix, Vector3, VertexBuffer } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { NodeShapes } from "../../src/config/NodeStyle";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { Node } from "../../src/Node";

/** Space between two nodes, in scene units. */
const SPACING = 4;

/** Nodes per row of the grid. */
const COLUMNS = 6;

describe("node.sizeMode", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "600px";
        container.style.height = "450px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("2d");

        // Three nodes per shape: the default mode, "scale" written out, and "diameter".
        const modes = ["default", "scale", "diameter"] as const;
        await graph.addNodes(
            modes.flatMap((mode, m) =>
                NodeShapes.options.map((shape, i) => ({
                    id: `${mode}:${shape}`,
                    mode,
                    shape,
                    position: {
                        x: (i % COLUMNS) * SPACING,
                        y: (Math.floor(i / COLUMNS) + m * 5) * SPACING,
                        z: 0,
                    },
                })),
            ),
        );
        await graph.setLayout("fixed", { dim: 2 });

        for (const shape of NodeShapes.options) {
            await graph.getSession().styles.add({
                name: `Shape - ${shape}`,
                target: "node",
                selector: { match: "expression", where: `data.shape == '${shape}'` },
                set: { "node.shape": shape, "node.size": 3 },
            });
        }

        for (const mode of ["scale", "diameter"] as const) {
            await graph.getSession().styles.add({
                name: `Size mode - ${mode}`,
                target: "node",
                selector: { match: "expression", where: `data.mode == '${mode}'` },
                set: { "node.sizeMode": mode },
            });
        }

        await operationQueueOf(graph).waitForCompletion();
        graph.zoomToFit();
        await graph.waitForStableFrame();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * How large a node is drawn: the largest of its width and height on screen and its depth at
     * the camera's pixels per unit.
     * @param id - The node.
     * @returns The drawn extent, in pixels.
     */
    function drawnExtent(id: string): number {
        const node: Node | undefined = graph.getDataManager().getNode(id);
        assert.isDefined(node, `node ${id} exists`);
        const { engine, scene } = graph;
        const camera = scene.activeCamera;
        assert(camera, "the scene has a camera");
        const { mesh } = node;
        const source = "sourceMesh" in mesh ? (mesh.sourceMesh as typeof mesh) : mesh;
        const positions = source.getVerticesData(VertexBuffer.PositionKind);
        assert.isNotNull(positions, `${id} has vertices`);
        const world = mesh.computeWorldMatrix(true);
        const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        const transform = scene.getTransformMatrix();
        const low = new Vector3(Infinity, Infinity, Infinity);
        const high = new Vector3(-Infinity, -Infinity, -Infinity);
        const lowWorld = low.clone();
        const highWorld = high.clone();

        for (let at = 0; at < positions.length; at += 3) {
            const local = new Vector3(positions[at], positions[at + 1], positions[at + 2]);
            const onScreen = Vector3.Project(local, world, transform, viewport);
            low.minimizeInPlace(onScreen);
            high.maximizeInPlace(onScreen);
            const inWorld = Vector3.TransformCoordinates(local, world);
            lowWorld.minimizeInPlace(inWorld);
            highWorld.maximizeInPlace(inWorld);
        }

        // One world unit across, on screen: the rate the depth is converted at.
        const centre = world.getTranslation();
        const pixelsPerUnit = Vector3.Project(centre.add(Vector3.Right()), Matrix.Identity(), transform, viewport)
            .subtract(Vector3.Project(centre, Matrix.Identity(), transform, viewport))
            .length();
        const depth = (highWorld.z - lowWorld.z) * pixelsPerUnit;

        return Math.max(high.x - low.x, high.y - low.y, depth);
    }

    it('draws every shape at the same extent under "diameter"', () => {
        const sphere = drawnExtent("diameter:sphere");
        assert.isAbove(sphere, 10, "a size-3 sphere is drawn large enough to measure");
        const off = NodeShapes.options
            .map((shape) => ({ shape, extent: drawnExtent(`diameter:${shape}`) }))
            .filter(({ extent }) => Math.abs(extent - sphere) > 1)
            .map(({ shape, extent }) => `${shape} ${extent.toFixed(1)} px`);

        assert.deepEqual(off, [], `every shape should be ${sphere.toFixed(1)} px across, like the sphere`);
    });

    it('draws "scale" exactly as a node with no mode', () => {
        const changed = NodeShapes.options.filter(
            (shape) => Math.abs(drawnExtent(`scale:${shape}`) - drawnExtent(`default:${shape}`)) > 1e-3,
        );

        assert.deepEqual(changed, [], "writing the default mode out draws the same picture");
    });
});
