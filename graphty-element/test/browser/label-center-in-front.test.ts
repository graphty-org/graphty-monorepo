/**
 * @file A node label placed at the node's center, and a label's `size`, read from the scene.
 *
 * A "center" label sat at its node's center, inside the node's mesh, so the mesh hid it. It now
 * sits in front of the node on the line to the camera, from wherever the camera looks. And a
 * label's `size` sets how tall one line is in the units of a node's `size`, so a label can be
 * sized against the node it belongs to. Both are checked through the scene: where the label's
 * plane is and how big it is, never pixels.
 */

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { Node } from "../../src/Node";
import type { GraphSession } from "../../src/session";

/** The node's size: a sphere this wide. */
const NODE_SIZE = 2;

describe("a node label at the center, and a label's size", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;
    let layerId: string | undefined;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();
        await graph.addNodes([{ id: "a" }]);
        await graph.setLayout("fixed");
        layerId = undefined;
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Style the node and wait until it is drawn.
     * @param labelStyle - The label style to draw it with.
     * @returns The node.
     */
    async function drawn(labelStyle: Record<string, unknown>): Promise<Node> {
        const set = {
            "node.shape": "sphere",
            "node.size": NODE_SIZE,
            "node.label": "HELLO",
            "node.labelStyle": labelStyle,
        } as const;
        if (layerId === undefined) {
            layerId = (
                await session.styles.add({
                    name: "label under test",
                    target: "node",
                    selector: { match: "everything" },
                    set,
                })
            ).id;
        } else {
            await session.styles.update(layerId, { set });
        }
        await graph.waitForStableFrame();
        const node = graph.getNode("a");
        assert.isDefined(node);
        return node;
    }

    /**
     * Where the camera is in the world.
     * @returns Its world position.
     */
    function cameraAt(): Vector3 {
        const camera = graph.scene.activeCamera;
        assert.isNotNull(camera);
        return camera.getWorldMatrix().getTranslation();
    }

    /**
     * The label's plane, with its world matrix up to date.
     * @param node - The node it belongs to.
     * @returns The plane.
     */
    function planeOf(node: Node): NonNullable<NonNullable<Node["label"]>["labelMesh"]> {
        const plane = node.label?.labelMesh;
        assert.exists(plane, "the node draws a label");
        plane.computeWorldMatrix(true);
        return plane;
    }

    /**
     * How tall the plane is in the world.
     * @param node - The node it belongs to.
     * @returns The height in world units.
     */
    function worldHeight(node: Node): number {
        const plane = planeOf(node);
        const { minimum, maximum } = plane.getBoundingInfo().boundingBox;
        const scaling = new Vector3();
        plane.getWorldMatrix().decompose(scaling);
        return (maximum.y - minimum.y) * Math.abs(scaling.y);
    }

    /**
     * Check that the label sits between the camera and the node, on the line between them,
     * outside the node's sphere.
     * @param node - The node.
     */
    function assertInFront(node: Node): void {
        const camera = cameraAt();
        const center = node.mesh.getAbsolutePosition();
        const label = planeOf(node).getAbsolutePosition();
        const toCamera = camera.subtract(center).normalize();
        const toLabel = label.subtract(center);

        assert.isAbove(toLabel.length(), NODE_SIZE / 2, "the label is outside the node's sphere");
        assert.isBelow(
            Vector3.Distance(camera, label),
            Vector3.Distance(camera, center),
            "the label is nearer the camera than the node",
        );
        assert.isAbove(Vector3.Dot(toLabel.normalize(), toCamera), 0.999, "the label is on the line to the camera");
    }

    it("draws a center label in front of the node, toward the camera", async () => {
        const node = await drawn({ location: "center" });
        assertInFront(node);
    });

    it("keeps a center label in front of the node after the camera moves", async () => {
        const node = await drawn({ location: "center" });
        await graph.setCameraPosition({ x: 30, y: 20, z: 10 });
        await graph.waitForStableFrame();
        graph.scene.render();
        assertInFront(node);
    });

    it("still draws a top label above the node", async () => {
        const node = await drawn({ location: "top" });
        const label = planeOf(node).getAbsolutePosition();
        assert.isAbove(label.y, node.mesh.getAbsolutePosition().y + NODE_SIZE / 2, "above the node's top");
    });

    it("draws one line as tall as `size`, in the units of the node's size", async () => {
        const node = await drawn({ location: "center", size: NODE_SIZE });
        const height = worldHeight(node);
        // One line at the default line height is one `size` tall, a little more for the
        // label's padding: never smaller than the node, never twice it.
        assert.isAtLeast(height, NODE_SIZE * 0.99);
        assert.isBelow(height, NODE_SIZE * 1.5);
    });

    it("scales a label with its size, and leaves the letters' size to sizePx", async () => {
        const small = worldHeight(await drawn({ location: "top", size: 1, sizePx: 48 }));
        const sharp = worldHeight(await drawn({ location: "top", size: 1, sizePx: 96 }));
        const big = worldHeight(await drawn({ location: "top", size: 3, sizePx: 48 }));
        assert.closeTo(big / small, 3, 0.01, "three times the size, three times as tall");
        assert.closeTo(sharp / small, 1, 0.01, "sizePx alone does not change the size in the scene");
    });

    it("keeps the old size when `size` is unset: sizePx / 48 world units a line", async () => {
        const one = worldHeight(await drawn({ location: "top", sizePx: 48 }));
        const two = worldHeight(await drawn({ location: "top", sizePx: 96 }));
        assert.closeTo(two / one, 2, 0.01);
        assert.isAtLeast(one, 0.99);
        assert.isBelow(one, 1.5);
    });
});
