/**
 * @file Several graphs on one page each draw every node shape (issue #2257).
 *
 * The sphere and box shape creators built their mesh without passing the scene, so Babylon put
 * it in whichever scene was created last on the page. With one graph per page that is the right
 * scene; with six, every graph's spheres and boxes went into the sixth one, and each graph drew
 * only its cylinders and tori. This file mounts six graphs before any of them loads data -- the
 * order a page of elements produces -- and checks each one draws all four shapes itself.
 */
import { Matrix, Vector3 } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

/** How many graphs share the page. */
const GRAPH_COUNT = 6;

/** The shapes, one node each. */
const SHAPES = ["sphere", "box", "cylinder", "torus"] as const;

/** Space between two nodes, in scene units. */
const SPACING = 4;

/** Half the side of the square read around a node's projected centre, in pixels. */
const HALF = 4;

/** How far, summed over red, green and blue, a pixel must be from the background to be drawn. */
const DRAWN = 60;

describe("several graphs on one page", () => {
    const containers: HTMLElement[] = [];
    const graphs: Graph[] = [];

    beforeAll(async () => {
        for (let i = 0; i < GRAPH_COUNT; i++) {
            const container = document.createElement("div");
            container.style.width = "240px";
            container.style.height = "180px";
            document.body.appendChild(container);
            containers.push(container);
            graphs.push(new Graph(container));
        }

        // Every graph builds its scene before any of them builds a node mesh.
        await Promise.all(graphs.map(async (graph) => graph.init()));

        for (const graph of graphs) {
            await graph.addNodes(
                SHAPES.map((shape, i) => ({
                    id: shape,
                    shape,
                    position: { x: (i - 1.5) * SPACING, y: 0, z: 0 },
                })),
            );
            await graph.setLayout("fixed", { dim: 3 });

            for (const shape of SHAPES) {
                await graph.getSession().styles.add({
                    name: `Shape - ${shape}`,
                    target: "node",
                    selector: { match: "expression", where: `data.shape == '${shape}'` },
                    set: { "node.shape": shape, "node.size": 1.6, "node.color": "#e53935" },
                });
            }

            await operationQueueOf(graph).waitForCompletion();
        }
    });

    afterAll(() => {
        for (const graph of graphs) {
            graph.dispose();
        }

        for (const container of containers) {
            container.remove();
        }
    });

    /**
     * Render one graph's frame and say which of its nodes have pixels drawn at their centre.
     * @param graph - The graph to read.
     * @returns The ids of the nodes nothing was drawn for.
     */
    async function undrawn(graph: Graph): Promise<string[]> {
        await graph.waitForStableFrame();
        graph.scene.render();

        const { engine, scene } = graph;
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const camera = scene.activeCamera;
        assert(camera, "the scene has a camera");
        const corner = (await engine.readPixels(0, 0, 1, 1)) as unknown as Uint8Array;
        const missing: string[] = [];

        for (const node of graph.getNodes()) {
            const onScreen = Vector3.Project(
                node.mesh.getAbsolutePosition(),
                Matrix.Identity(),
                scene.getTransformMatrix(),
                camera.viewport.toGlobal(width, height),
            );
            // readPixels counts rows from the bottom; Project counts them from the top.
            const x = Math.round(onScreen.x) - HALF;
            const y = height - Math.round(onScreen.y) - HALF;
            const pixels = (await engine.readPixels(x, y, HALF * 2, HALF * 2)) as unknown as Uint8Array;
            let drawn = 0;

            for (let at = 0; at < pixels.length; at += 4) {
                const distance =
                    Math.abs(pixels[at] - corner[0]) +
                    Math.abs(pixels[at + 1] - corner[1]) +
                    Math.abs(pixels[at + 2] - corner[2]);

                if (distance > DRAWN) {
                    drawn++;
                }
            }

            if (drawn === 0) {
                missing.push(String(node.id));
            }
        }

        return missing;
    }

    it("draws every node of every graph in that graph's own scene", async () => {
        for (const [index, graph] of graphs.entries()) {
            for (const node of graph.getNodes()) {
                assert.strictEqual(
                    node.mesh.getScene(),
                    graph.scene,
                    `graph ${String(index)}: the ${String(node.id)} node's mesh is in another graph's scene`,
                );
            }

            assert.deepEqual(
                await undrawn(graph),
                [],
                `graph ${String(index)} of ${String(GRAPH_COUNT)} drew nothing where these nodes are`,
            );
        }
    });
});
