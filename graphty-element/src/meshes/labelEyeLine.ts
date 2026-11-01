import { Camera, type Scene, type TransformNode, Vector3 } from "@babylonjs/core";

import { FrameRoster } from "./FrameRoster";

/** The labels drawn in front of their node, each kept on the line from its node to the eye; see {@link keepOnEyeLine}. */
export const eyeLineFrames = new FrameRoster();

/**
 * Keep a label drawn in front of its node on the line from the node's center to the eye, before every frame.
 *
 * The label hangs from a pivot at the node's center that is turned like the camera (Babylon's billboard), so
 * its depth offset points along the camera's own axis, not at the eye. Seen off the middle of the view, a
 * point moved along that axis toward the camera is drawn further from the middle than the node: a centered
 * label slid down on a node low in the view, and up on one high in it. `shift`, a node between the pivot and
 * the label, moves the label sideways in the pivot's frame by what puts it back on the node's line of sight.
 * An orthographic camera draws no such slide, so there the shift is zero.
 * @param scene - The scene whose frames drive it.
 * @param pivot - The point at the node's center, turned like the camera.
 * @param shift - The pivot's child the label hangs from; its position is set here.
 * @param depth - How far in front of the pivot the label is, in the pivot's units (negative, toward the camera).
 * @returns Stops it.
 */
export function keepOnEyeLine(
    scene: Scene,
    pivot: TransformNode,
    shift: TransformNode,
    depth: () => number,
): () => void {
    const inView = new Vector3();
    return eyeLineFrames.join(scene, () => {
        const camera = scene.activeCamera;
        if (!camera || pivot.isDisposed()) {
            return;
        }

        if (camera.mode === Camera.ORTHOGRAPHIC_CAMERA) {
            shift.position.setAll(0);
            return;
        }

        // The node's center in the camera's frame, whose axes the pivot's are (scaled alike on all three).
        Vector3.TransformCoordinatesToRef(pivot.getAbsolutePosition(), camera.getViewMatrix(), inView);
        if (inView.z <= 0) {
            shift.position.setAll(0);
            return;
        }

        // A point `depth` nearer along the view axis is drawn where the center is when it also moves by the
        // center's sideways offset times depth / distance: similar triangles through the eye.
        const k = depth() / inView.z;
        shift.position.set(inView.x * k, inView.y * k, 0);
    });
}
