import { type AbstractMesh, Camera, type Scene, TransformNode, Vector3 } from "@babylonjs/core";

import { FrameRoster } from "./FrameRoster";

/** The labels drawn in front of their node, each kept on the line from its node to the eye; see {@link keepOnEyeLine}. */
export const eyeLineFrames = new FrameRoster();

/** The shifts {@link keepOnEyeLine} moves; see {@link withoutEyeLine}. */
const shifts = new WeakSet<TransformNode>();

/**
 * Read a label plane as it is placed before its slide onto the eye line, and put the slide back after.
 *
 * The slide depends on where the camera is, so a framing that measured the slid plane and then moved the camera
 * would have framed a plane that is no longer there. Unslid, the plane is where the camera's own axis puts it:
 * further from the view's middle than the slid one, which is always moved toward the eye, so a box that takes
 * in the unslid plane takes in what is drawn from wherever the framing puts the camera.
 * @param mesh - The label plane.
 * @param read - Reads it; whatever it keeps must be copied, since the plane moves back after.
 * @returns What `read` returns.
 */
export function withoutEyeLine<T>(mesh: AbstractMesh, read: () => T): T {
    const shift = mesh.parent;
    if (!(shift instanceof TransformNode) || !shifts.has(shift) || shift.position.equalsToFloats(0, 0, 0)) {
        mesh.computeWorldMatrix(true);
        return read();
    }

    const kept = shift.position.clone();
    shift.position.setAll(0);
    shift.computeWorldMatrix(true);
    mesh.computeWorldMatrix(true);
    try {
        return read();
    } finally {
        shift.position.copyFrom(kept);
        shift.computeWorldMatrix(true);
        mesh.computeWorldMatrix(true);
    }
}

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
    shifts.add(shift);
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
