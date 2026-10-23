import { Camera, Vector3 } from "@babylonjs/core";

const inView = new Vector3();

/**
 * How many screen pixels one scene unit is drawn as, at a point the camera sees: the same
 * everywhere for an orthographic camera, smaller with distance for a perspective one.
 * @param camera - The camera the frame is drawn from.
 * @param point - Where, in the scene.
 * @returns Pixels per unit, or 0 for a point at or behind the camera.
 */
export function pixelsPerUnit(camera: Camera, point: Vector3): number {
    const engine = camera.getEngine();
    const height = engine.getRenderHeight() * camera.viewport.height;
    if (camera.mode === Camera.ORTHOGRAPHIC_CAMERA) {
        // Babylon frames an unset side at half the render height, one pixel per unit.
        const top = camera.orthoTop ?? height / 2;
        const bottom = camera.orthoBottom ?? -height / 2;
        const span = top - bottom;
        return span > 0 ? height / span : 0;
    }

    Vector3.TransformCoordinatesToRef(point, camera.getViewMatrix(), inView);
    const depth = inView.z;
    return depth > 0 ? height / (2 * depth * Math.tan(camera.fov / 2)) : 0;
}
