/**
 * @file The five camera views the element ships, written the way a third party writes one.
 *
 * Each of these used to be a function taking the `Graph` and a Babylon `Camera`, measuring the
 * node bounding box itself and reading the field of view off the camera -- which is why a view
 * could not be written by anybody outside this package, and why the element's own five were
 * reached by a five-case `switch` rather than by a lookup. They are now plain
 * registration objects: a descriptor from the catalogue, and one pure function
 * from a bounding box to a camera state. That is exactly the shape `registerCameraView` takes,
 * so the element's own views and a plugin's are the same kind of thing and travel the same path.
 *
 * THE NUMBERS ARE UNCHANGED, deliberately and to the digit. Padding of 5 percent in 2D, 10
 * percent in 3D times an isometric correction of 0.65, a straight-on distance of one and a half
 * times the longest side: every one of those is what the element computed before, so no picture
 * moves. They disagree with each other -- the orbit controller's own framing pads 5 percent and
 * the 2D controller's pads 10 percent -- and this file does not average them, because averaging
 * them would change what a saved screenshot looks like. A plugin picks its own.
 *
 * THESE ARE NOT REGISTERED. A built-in id is reserved and `registerCameraView` refuses one, so
 * the table below is looked up first and the registry second, which is what keeps a registration
 * from changing what an existing name means.
 */

import type { CameraState, CameraViewInput } from "./types";

/**
 * The vertical field of view a perspective framing falls back on.
 *
 * Babylon's own default, in radians. A 3D input always carries the real one; this is what keeps
 * the arithmetic finite if a caller ever computes a view with no camera to read.
 */
const DEFAULT_FOV = 0.8;

/** How much room a flat framing leaves around the box: 5 percent. */
const FLAT_PADDING = 1.05;

/** How much room a perspective framing leaves around the box: 10 percent. */
const PERSPECTIVE_PADDING = 1.1;

/**
 * How much closer an angled view sits than a straight-on one.
 *
 * Seen from equal x, y and z offsets the graph is about 35 degrees off each axis, so it covers
 * less of the frame than its size suggests -- cos(35.26 degrees) is roughly 0.816. The value here
 * is the empirically tuned correction the element has always used, not the trigonometric one.
 */
const ISOMETRIC_FACTOR = 0.65;

/** One over the square root of three: the offset along each axis that puts the viewer on the diagonal. */
const DIAGONAL_OFFSET = 0.577;

/** How far a straight-on view sits from the box, as a multiple of its longest side. */
const STRAIGHT_ON_DISTANCE = 1.5;

/** The vertical angle of a classic isometric view, in radians: about 35.264 degrees. */
const ISOMETRIC_BETA = 0.615;

/**
 * Frame everything: an angled view in three dimensions, straight on in two.
 * @param input - The box to frame, the drawing mode, the viewport and the field of view.
 * @returns The state that puts the whole box in shot.
 */
function fitToGraph(input: CameraViewInput): CameraState {
    const { bounds } = input;
    const { center } = bounds;

    if (input.mode === "2d") {
        // The flat framing is a ratio of pixels to world units, so it needs the render width and
        // not only the aspect: the box is widened to whichever of its two sides fills the frame
        // first, and the zoom is however many pixels that leaves per unit.
        const extent = Math.max(bounds.size.x, bounds.size.y / input.aspect);

        return {
            type: "orthographic",
            zoom: input.viewport.width / (extent * FLAT_PADDING),
            pan: { x: center.x, y: center.y },
        };
    }

    const fov = input.fov ?? DEFAULT_FOV;
    const straightOn = (bounds.maxDimension / Math.tan(fov / 2)) * PERSPECTIVE_PADDING;
    const distance = straightOn * ISOMETRIC_FACTOR;

    return {
        type: "arcRotate",
        position: {
            x: center.x + distance * DIAGONAL_OFFSET,
            y: center.y + distance * DIAGONAL_OFFSET,
            z: center.z + distance * DIAGONAL_OFFSET,
        },
        target: center,
    };
}

/**
 * Look straight down at the graph, which is the natural view for a flat arrangement.
 * @param input - The box to frame and the drawing mode.
 * @returns The state that looks down the y axis.
 */
function topView(input: CameraViewInput): CameraState {
    const { center } = input.bounds;

    if (input.mode === "2d") {
        // Flat drawing already looks straight down, so the only thing left to decide is where the
        // centre of the frame is. The zoom stays at the element's neutral 1.0 rather than fitting,
        // which is what distinguishes this view from fitToGraph in two dimensions.
        return {
            type: "orthographic",
            zoom: 1,
            pan: { x: center.x, y: center.y },
        };
    }

    const distance = input.bounds.maxDimension * STRAIGHT_ON_DISTANCE;

    return {
        type: "arcRotate",
        position: { x: center.x, y: center.y + distance, z: center.z },
        target: center,
    };
}

/**
 * Look along the x axis, which shows how deep an arrangement is.
 * @param input - The box to frame.
 * @returns The state that looks along the x axis.
 */
function sideView(input: CameraViewInput): CameraState {
    const { center } = input.bounds;
    const distance = input.bounds.maxDimension * STRAIGHT_ON_DISTANCE;

    return {
        type: "arcRotate",
        position: { x: center.x + distance, y: center.y, z: center.z },
        target: center,
    };
}

/**
 * Look along the z axis, straight at the face of the arrangement.
 * @param input - The box to frame.
 * @returns The state that looks along the z axis.
 */
function frontView(input: CameraViewInput): CameraState {
    const { center } = input.bounds;
    const distance = input.bounds.maxDimension * STRAIGHT_ON_DISTANCE;

    return {
        type: "arcRotate",
        position: { x: center.x, y: center.y, z: center.z + distance },
        target: center,
    };
}

/**
 * The classic three-quarter view: 45 degrees around and about 35 degrees up.
 * @param input - The box to frame.
 * @returns The state, expressed as orbit angles rather than as a position.
 */
function isometric(input: CameraViewInput): CameraState {
    return {
        type: "arcRotate",
        alpha: Math.PI / 4,
        beta: ISOMETRIC_BETA,
        radius: input.bounds.maxDimension * STRAIGHT_ON_DISTANCE,
        target: input.bounds.center,
    };
}

/**
 * How each built-in view is computed, keyed by the name a consumer types.
 *
 * The descriptors themselves live in `src/catalog/cameras.ts`, which is Node-safe data a picker
 * reads with nothing else loaded; this is the half that does the arithmetic.
 */
const BUILT_IN_CAMERA_VIEWS: Readonly<Record<string, (input: CameraViewInput) => CameraState>> = Object.freeze({
    fitToGraph,
    topView,
    sideView,
    frontView,
    isometric,
});

/**
 * The function one built-in view computes with.
 * @param id - The view name, such as "isometric".
 * @returns The function, or undefined when the element ships no view by that name.
 */
export function builtInCameraView(id: string): ((input: CameraViewInput) => CameraState) | undefined {
    return Object.hasOwn(BUILT_IN_CAMERA_VIEWS, id) ? BUILT_IN_CAMERA_VIEWS[id] : undefined;
}
