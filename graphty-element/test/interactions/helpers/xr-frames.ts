/**
 * What each eye of an immersive session shows, and what each controller's laser landed on, read
 * after the frames that drew them.
 *
 * Shared by the XR tests that compare the render paths (`node-batch-xr.test.ts`,
 * `xr/xr-batched-rows.test.ts`). The laser is read after a counted number of drawn frames and never
 * inside `vi.waitFor`: an assertion there waits until the global hang guard when the laser lands on
 * an edge or on nothing.
 */

import { Matrix, Ray, Vector3 } from "@babylonjs/core";
import { assert } from "vitest";

import type { Graphty } from "../../../index.js";
import { drawnFrames } from "../../helpers/drawn-frames";

/** One controller. */
export type Handedness = "left" | "right";

/** One frame of the whole canvas, top line first. */
export interface XRFrame {
    pixels: Uint8ClampedArray;
    width: number;
    height: number;
}

/** A point of an eye's picture, in canvas pixels from the top left. */
export interface EyePoint {
    x: number;
    y: number;
}

/**
 * Copy the canvas as a frame finishes, inside that frame.
 * @param element - The element.
 * @returns The frame.
 */
export function frameNow(element: Graphty): XRFrame {
    const canvas = element.graph.getScene().getEngine().getRenderingCanvas();
    assert.isNotNull(canvas);
    const copy = new OffscreenCanvas(canvas.width, canvas.height);
    const context = copy.getContext("2d", { willReadFrequently: true });
    assert.isNotNull(context);
    context.drawImage(canvas, 0, 0);
    return {
        pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
        width: canvas.width,
        height: canvas.height,
    };
}

/**
 * Read the canvas after a few more frames are drawn.
 * @param element - The element.
 * @returns The frame.
 */
export async function wholeFrame(element: Graphty): Promise<XRFrame> {
    const scene = element.graph.getScene();
    await drawnFrames(scene, 4);
    return new Promise((resolve) => {
        scene.onAfterRenderObservable.addOnce(() => {
            resolve(frameNow(element));
        });
    });
}

/**
 * Count the bytes of each half of the canvas that differ by more than a level. Under IWER the
 * canvas shows the left eye's view at full size, so the halves are the two sides of that view.
 * @param first - One frame.
 * @param second - The other frame.
 * @returns The count in each eye.
 */
export function differing(first: XRFrame, second: XRFrame): { left: number; right: number } {
    const line = first.width;
    const counts = { left: 0, right: 0 };
    for (let i = 0; i < first.pixels.length; i++) {
        if (Math.abs((first.pixels[i] ?? 0) - (second.pixels[i] ?? 0)) > 1) {
            counts[(i >> 2) % line < line / 2 ? "left" : "right"]++;
        }
    }

    return counts;
}

/**
 * Where an eye's camera draws a world point on the canvas. Under IWER each eye camera's viewport is
 * the whole canvas, and the canvas shows the last eye drawn at full size (not two halves side by
 * side), so both eyes' points are looked up on the one picture; they differ by the eyes' parallax.
 * @param element - The element.
 * @param eye - 0 for the left eye, 1 for the right.
 * @param world - The point.
 * @returns The canvas point.
 */
export function inEye(element: Graphty, eye: 0 | 1, world: { x: number; y: number; z: number }): EyePoint {
    const scene = element.graph.getScene();
    const camera = scene.activeCamera?.rigCameras[eye];
    assert.exists(camera, "no eye camera");
    const engine = scene.getEngine();
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const at = Vector3.Project(
        new Vector3(world.x, world.y, world.z),
        Matrix.IdentityReadOnly,
        camera.getTransformationMatrix(),
        camera.viewport.toGlobal(width, height),
    );
    return { x: at.x, y: at.y };
}

/**
 * Whether any pixel within `reach` of a canvas point passes a test.
 * @param frame - The frame.
 * @param at - The point.
 * @param reach - How far, in canvas pixels.
 * @param ink - The test.
 * @returns True when one does.
 */
export function inkNear(
    frame: XRFrame,
    at: EyePoint,
    reach: number,
    ink: (pixel: readonly number[]) => boolean,
): boolean {
    for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
            const x = Math.round(at.x) + dx;
            const y = Math.round(at.y) + dy;
            if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) {
                continue;
            }

            const i = (y * frame.width + x) * 4;
            if (ink([frame.pixels[i] ?? 0, frame.pixels[i + 1] ?? 0, frame.pixels[i + 2] ?? 0])) {
                return true;
            }
        }
    }

    return false;
}

/** A node a laser landed on, as the mesh it landed on names it. */
export interface LaserNode {
    id: unknown;
    drawnPickMesh: unknown;
    drawnPosition: Vector3;
    drawnWorldPosition: Vector3;
}

/** What one controller's laser landed on. */
export interface LaserHit {
    /** `node:<id>`, `nothing`, or `mesh:<name>` for anything else. */
    on: string;
    /** The node, when it landed on one. */
    node: LaserNode | undefined;
}

/**
 * What a controller's laser landed on in the last frame Babylon's pointer selection ran. Read it
 * after drawn frames, not in a wait: it is an answer, not a condition.
 * @param element - The element.
 * @param handedness - Which controller.
 * @returns The hit.
 */
export function laserHit(element: Graphty, handedness: Handedness): LaserHit {
    const helper = element.graph.getXRSessionManager()?.getXRHelper();
    assert.exists(helper, "no XR session");
    const controller = helper.input.controllers.find((source) => source.inputSource.handedness === handedness);
    assert.exists(controller, `no ${handedness} controller`);
    const mesh = helper.pointerSelection.getMeshUnderPointer(controller.uniqueId);
    if (mesh === null) {
        return { on: "nothing", node: undefined };
    }

    const { graphNode } = (mesh.metadata ?? {}) as { graphNode?: LaserNode };
    return graphNode === undefined
        ? { on: `mesh:${mesh.name}`, node: undefined }
        : { on: `node:${String(graphNode.id)}`, node: graphNode };
}

/**
 * A controller's pointer ray as Babylon casts it now.
 * @param element - The element.
 * @param handedness - Which controller.
 * @returns The ray.
 */
export function laserRay(element: Graphty, handedness: Handedness): Ray {
    const controller = element.graph
        .getXRSessionManager()
        ?.getXRHelper()
        ?.input.controllers.find((source) => source.inputSource.handedness === handedness);
    assert.exists(controller, `no ${handedness} controller`);
    const ray = new Ray(Vector3.Zero(), Vector3.Forward());
    controller.getWorldPointerRayToRef(ray);
    return ray;
}

/**
 * How far a point lies from a ray's line, ahead of its origin.
 * @param ray - The ray.
 * @param point - The point.
 * @returns The distance.
 */
export function offRay(ray: Ray, point: Vector3): number {
    const to = point.subtract(ray.origin);
    const along = Math.max(0, Vector3.Dot(to, ray.direction));
    return to.subtract(ray.direction.scale(along)).length();
}
