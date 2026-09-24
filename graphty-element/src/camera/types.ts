/**
 * @file What a camera view is told and what it answers with, as plain data.
 *
 * A camera view is one of the six extension points: a named way of deciding where the viewer
 * stands and what they are looking at. The element measures the box around the elements being
 * framed, reads the viewport and the field of view, and hands the view everything it needs; the
 * view returns a camera state and never touches a scene.
 *
 * NOTHING HERE NAMES A BABYLON TYPE, and that is the whole reason the module exists. A view has
 * to be writable in TypeScript against a published entry point, and `./extend` and `./catalog`
 * must resolve in Node with no renderer in their import graph. A `Vector3` in this file would
 * make the extension point unusable by the third parties it exists for.
 *
 * {@link CameraState} is declared here rather than in `src/screenshot/types.ts`, where it used
 * to live, for the same reason: a view returns one, so the type has to be reachable from a
 * Node-safe entry point. `src/screenshot/types.ts` re-exports it, so every existing importer and
 * the root entry point are unaffected.
 */

import type { CameraDescriptor } from "../catalog/types";

/** A point or a size in world units. */
export interface Vec3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

/** Which way the element is drawing: flat, or in three dimensions. */
export type DrawingMode = "2d" | "3d";

/** An axis-aligned box around the elements a view is being asked to frame, in world units. */
export interface GraphBounds {
    readonly min: Vec3;
    readonly max: Vec3;
    readonly center: Vec3;
    readonly size: Vec3;
    /** The largest of the three sides. */
    readonly maxDimension: number;
    /**
     * How many elements the box was measured over. Zero means it is the element's default box,
     * which is what an empty graph and an unmeasured one both produce -- a view that wants to
     * behave differently for "nothing to frame" checks this rather than inspecting the numbers.
     */
    readonly measured: number;
}

/**
 * Where the camera is now, and where a view asks it to go.
 *
 * Every member is optional because the element draws with three different cameras and a state
 * describes whichever one is current: an orbit camera reads `alpha`, `beta` and `radius`, a free
 * camera reads `position` and `target`, and the 2D camera reads `zoom` and `pan`. A view fills in
 * the members its `type` calls for and leaves the rest alone.
 */
export interface CameraState {
    type?: "arcRotate" | "free" | "universal" | "orthographic";

    // 3D Camera Properties
    position?: { x: number; y: number; z: number };
    target?: { x: number; y: number; z: number };
    alpha?: number;
    beta?: number;
    radius?: number;
    fov?: number;

    // 2D Camera Properties
    zoom?: number;
    pan?: { x: number; y: number };
    rotation?: number;

    // Orthographic frustum (advanced)
    orthoLeft?: number;
    orthoRight?: number;
    orthoTop?: number;
    orthoBottom?: number;

    // OrbitCameraController-specific fields
    pivotRotation?: { x: number; y: number; z: number };
    cameraDistance?: number;
}

/** Everything a view is told before it decides where the viewer stands. */
export interface CameraViewInput {
    /**
     * The box to frame.
     *
     * An INPUT rather than something the view measures, which is what lets a view frame a subset:
     * `applyCameraView(id, { scope })` measures over the scope and hands the smaller box in. A
     * view that always framed everything could not be asked to do anything else.
     */
    readonly bounds: GraphBounds;
    readonly mode: DrawingMode;
    /** The viewport's width divided by its height. */
    readonly aspect: number;
    /**
     * How big the drawing surface is, in device pixels.
     *
     * A flat view needs the pixel width and not only the aspect ratio, because an orthographic
     * zoom is a ratio of pixels to world units: the element's own `fitToGraph` computes its 2D
     * zoom as the render width divided by the padded extent of the box. Withholding this would
     * leave a plugin unable to compute what a built-in computes, which is the defect this
     * extension point exists to prevent.
     */
    readonly viewport: { readonly width: number; readonly height: number };
    /** The vertical field of view in radians. Absent in 2D, which has no perspective. */
    readonly fov?: number;
    /** Where the camera is right now, so a view can be relative to it. */
    readonly current: CameraState;
    /** The view's own options, resolved against the defaults its descriptor declares. */
    readonly options: Readonly<Record<string, unknown>>;
}

/**
 * A camera view as it is registered: what the catalogue publishes about it, and the one pure
 * function that decides where the viewer stands.
 *
 * `compute` is synchronous and total. The element calls it inside an operation it may animate,
 * queue or cancel, and all of that belongs to the apply rather than to the view -- so a view that
 * wanted to be asynchronous would be asking for a second animation model beside the one the
 * element already has.
 */
export interface CameraViewRegistration {
    readonly descriptor: CameraDescriptor;
    readonly compute: (input: CameraViewInput) => CameraState;
}
