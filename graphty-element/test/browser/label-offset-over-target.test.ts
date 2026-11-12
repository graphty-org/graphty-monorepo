import { MeshBuilder, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import { RichTextLabel } from "../../src/meshes/RichTextLabel";

/**
 * A label its offset moves over its own node (vis-network's `font.vadjust`, which draws a label below a dot up into
 * it) is drawn in front of the node, as vis-network draws every label over its own node. Beside the node, in the
 * node's own frame, the label sat in the node's middle plane, and the node's mesh hid it.
 */
describe("a label moved over its own node", () => {
    let scene: Scene | null = null;
    afterEach(() => {
        scene?.getEngine().dispose();
        scene = null;
    });

    /**
     * A label below a sphere of radius 1, moved up by `offsetY` (negative is up).
     * @param offsetY - how far down the label is moved
     * @returns the label's world position and the sphere
     */
    function below(offsetY: number): { at: Vector3; front: number; label: RichTextLabel } {
        scene = new Scene(new NullEngine());
        const node = MeshBuilder.CreateSphere("node", { diameter: 2 }, scene);
        const label = new RichTextLabel(scene, {
            text: "Up",
            fontSize: 12,
            attachTo: node,
            attachPosition: "bottom",
            attachOffset: 0,
            offsetY,
        });
        const mesh = label.labelMesh;
        assert.exists(mesh);
        const at = Vector3.TransformCoordinates(Vector3.Zero(), mesh.computeWorldMatrix(true));
        return { at, front: node.getBoundingInfo().boundingBox.minimumWorld.z, label };
    }

    test("is drawn in front of the node it overlaps", () => {
        const { at, front, label } = below(-0.5);
        // the camera looks down +z: in front is nearer, smaller z
        assert.isBelow(at.z, front, "the label sits in front of the node's front face");
        // still where its offset put it: up into the node, below its middle
        assert.isBelow(at.y, 0);
        assert.isAbove(at.y, -1);
        label.dispose();
    });

    test("stays beside the node, in its middle plane, where its offset keeps it clear of the node", () => {
        const { at, label } = below(0.5);
        assert.closeTo(at.z, 0, 1e-9);
        assert.isBelow(at.y, -1);
        label.dispose();
    });
});
