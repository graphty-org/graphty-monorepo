/**
 * @file A centered node label is drawn over its node's center anywhere in the view, and every label is drawn
 * from a texture about as many pixels tall as it covers on screen (issue #3239).
 *
 * A center label hangs in front of its node, and its depth offset used to follow the camera's own axis rather
 * than the line to the eye, so on a node off the middle of the view it slid away from the middle: below center
 * low in the view, above it high. And its texture was sized for the font, not the screen, so a label drawn
 * small was a texture eight to twelve times its size shrunk by mipmaps, which blurred its letters. Both are
 * read from the scene: where the plane is drawn and how many texture pixels it has, never pixels on screen.
 */

import { Matrix, type Mesh, type StandardMaterial, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { RichTextLabel } from "../../src/meshes/RichTextLabel";
import type { Node } from "../../src/Node";

/** Four nodes far from the middle of the view, one near each corner, and one in the middle. */
const NODES = [
    { id: "middle", position: { x: 0, y: 0, z: 0 } },
    { id: "top-left", position: { x: -12, y: 9, z: 0 } },
    { id: "top-right", position: { x: 12, y: 9, z: 4 } },
    { id: "bottom-left", position: { x: -12, y: -9, z: -4 } },
    { id: "bottom-right", position: { x: 12, y: -9, z: 0 } },
];

describe("a center label on its node's line of sight, from a texture matched to the screen", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(NODES);
        await graph.setLayout("fixed");
        await operationQueueOf(graph).waitForCompletion();
        await graph.getSession().styles.add({
            name: "centered labels",
            target: "node",
            selector: { match: "everything" },
            set: {
                "node.shape": "sphere",
                "node.size": 4,
                "node.label": "XRCC2",
                "node.labelStyle": { location: "center" },
            },
        });
        await graph.waitForStableFrame();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Where a point is drawn, in pixels of the drawn frame.
     * @param point - The point, in the world.
     * @returns Its x and y on the frame.
     */
    function drawnAt(point: Vector3): { x: number; y: number } {
        const { scene } = graph;
        const engine = scene.getEngine();
        const camera = scene.activeCamera;
        assert.isNotNull(camera);
        const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        const at = Vector3.Project(point, Matrix.IdentityReadOnly, scene.getTransformMatrix(), viewport);
        return { x: at.x, y: at.y };
    }

    /**
     * A node's label plane, with its world matrix up to date.
     * @param node - The node.
     * @returns The plane.
     */
    function planeOf(node: Node): Mesh {
        const plane = node.label?.labelMesh;
        assert.exists(plane, `node ${node.id} draws a label`);
        plane.computeWorldMatrix(true);
        return plane;
    }

    /**
     * How far each label is drawn from its node's center, in pixels of the drawn frame.
     * @returns The largest distance of any node's.
     */
    function worstOffCentre(): number {
        let worst = 0;
        for (const { id } of NODES) {
            const node = graph.getNode(id);
            assert.isDefined(node);
            node.mesh.computeWorldMatrix(true);
            const center = drawnAt(node.mesh.getAbsolutePosition());
            const label = drawnAt(planeOf(node).getAbsolutePosition());
            worst = Math.max(worst, Math.hypot(label.x - center.x, label.y - center.y));
        }

        return worst;
    }

    /**
     * How many pixels of the drawn frame a node's label plane covers, top to bottom.
     * @param node - The node.
     * @returns The height in pixels.
     */
    function drawnHeightOf(node: Node): number {
        const corners = planeOf(node)
            .getBoundingInfo()
            .boundingBox.vectorsWorld.map((corner) => drawnAt(corner).y);
        return Math.max(...corners) - Math.min(...corners);
    }

    /**
     * Uploaded texture pixels per drawn pixel down each label's plane.
     * @returns One ratio per node.
     */
    function texelsPerPixel(): number[] {
        return NODES.map(({ id }) => {
            const node = graph.getNode(id);
            assert.isDefined(node);
            const plane = planeOf(node);
            const drawnHeight = drawnHeightOf(node);
            // What the GPU samples: the texture as uploaded, not the canvas it was drawn on.
            const uploaded = (plane.material as StandardMaterial).diffuseTexture?.getInternalTexture();
            assert.exists(uploaded, `node ${id}'s label has a texture`);
            return uploaded.height / drawnHeight;
        });
    }

    it("draws each center label over its node's center, in the corners of the view too", () => {
        // Before, the corner nodes' labels were drawn several pixels off toward the edges of the view.
        assert.isBelow(worstOffCentre(), 0.5);
    });

    it("keeps them there after the camera moves", async () => {
        await graph.setCameraPosition({ x: 20, y: 12, z: -40 });
        await graph.waitForStableFrame();
        assert.isBelow(worstOffCentre(), 0.5);
    });

    it("draws each label from about one texture pixel per pixel it covers", () => {
        for (const ratio of texelsPerPixel()) {
            assert.isAtLeast(ratio, 0.85, "the texture is not magnified");
            assert.isAtMost(ratio, 1.35, "the texture is not shrunk");
        }
    });

    it("redraws the textures for their new size after the camera comes closer", async () => {
        const before = texelsPerPixel();
        const camera = graph.scene.activeCamera;
        assert.isNotNull(camera);
        const eye = camera.getWorldMatrix().getTranslation();
        // Half again as close: the letters grow, still well under the most texture pixels a label is given per em.
        await graph.setCameraPosition({ x: eye.x / 1.5, y: eye.y / 1.5, z: eye.z / 1.5 });
        await graph.waitForStableFrame();

        const after = texelsPerPixel();
        for (const ratio of after) {
            assert.isAtLeast(ratio, 0.85, "the texture is not magnified");
            assert.isAtMost(ratio, 1.35, "the texture is not shrunk");
        }
        assert.notDeepEqual(after, before, "the move changed what the labels cover");
    });

    it("uploads as many texels as a capture larger than the canvas shows, and goes back after it", () => {
        // A 4x screenshot draws each label four times as large: its texture, fitted to the screen, would be
        // magnified four times. While the capture runs, each is uploaded at the capture's size (up to its
        // whole canvas, which is all there is).
        RichTextLabel.setCaptureScale(graph.scene, 4);
        try {
            for (const [at, ratio] of texelsPerPixel().entries()) {
                const node = graph.getNode(NODES[at].id);
                assert.isDefined(node);
                const canvas = (planeOf(node).material as StandardMaterial).diffuseTexture?.getSize().height ?? 0;
                const uploaded = ratio * drawnHeightOf(node);
                assert.isAtLeast(
                    uploaded,
                    Math.min(canvas, 4 * drawnHeightOf(node) * 0.85),
                    `node ${node.id}'s label is uploaded at the capture's size`,
                );
            }
        } finally {
            RichTextLabel.setCaptureScale(graph.scene, 1);
        }

        for (const ratio of texelsPerPixel()) {
            assert.isAtMost(ratio, 1.35, "back at its size on screen");
        }
    });

    it("draws a center label over its node's center in the 2D view", async () => {
        await graph.setViewMode("2d");
        await graph.waitForStableFrame();
        assert.isBelow(worstOffCentre(), 0.5);
    });
});
