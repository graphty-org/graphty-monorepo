/**
 * @file A graph with more labels than one frame checks still reaches its final picture, with every label's
 * texture fitted to its size on screen (issue #3239).
 *
 * Labels are fitted a bounded number per frame (TEXTURE_FIT_CHECKS_PER_FRAME), and the frame is not final while a
 * walk through them is owed. The graph announces a change on every frame while anything is pending, so a walk
 * restarted on every change never finished: two file stories with a few hundred labels waited out the hang guard.
 * Read from the scene: each label's uploaded texture against the pixels its plane covers.
 */

import { Matrix, type StandardMaterial, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { TEXTURE_FIT_CHECKS_PER_FRAME } from "../../src/meshes/labelTextureFit";

/** Enough labels for three walks of one frame each. */
const COUNT = TEXTURE_FIT_CHECKS_PER_FRAME * 2 + 50;

describe("label textures fitted over several frames", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(
            Array.from({ length: COUNT }, (_, at) => ({
                id: `n${String(at)}`,
                position: { x: (at % 30) * 3, y: Math.floor(at / 30) * 3, z: 0 },
            })),
        );
        await graph.setLayout("fixed");
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("reaches the final picture, every label uploaded at about the pixels it covers", async () => {
        await graph.getSession().styles.add({
            name: "labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "XRCC2", "node.labelStyle": { location: "center" } },
        });
        await graph.waitForStableFrame();

        const { scene } = graph;
        const engine = scene.getEngine();
        const camera = scene.activeCamera;
        assert.isNotNull(camera);
        const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        let fitted = 0;
        for (const node of graph.getNodes()) {
            const plane = node.label?.labelMesh;
            assert.exists(plane);
            plane.computeWorldMatrix(true);
            const ys = plane
                .getBoundingInfo()
                .boundingBox.vectorsWorld.map(
                    (corner) =>
                        Vector3.Project(corner, Matrix.IdentityReadOnly, scene.getTransformMatrix(), viewport).y,
                );
            const uploaded = (plane.material as StandardMaterial).diffuseTexture?.getInternalTexture();
            assert.exists(uploaded);
            const ratio = uploaded.height / (Math.max(...ys) - Math.min(...ys));
            if (ratio >= 0.85 && ratio <= 1.35) {
                fitted++;
            }
        }

        assert.strictEqual(fitted, COUNT, "every label is uploaded at about the pixels it covers");
    });
});
