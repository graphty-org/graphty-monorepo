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
 * them would change what a saved screenshot looks like. A plugin picks its own. Two exceptions:
 * the isometric `beta` was 0.615, the elevation above the horizon, in a field measured down from
 * the pole, and no picture depended on it because nothing applied it; and the 2D `fitToGraph`
 * zoom was pixels per unit with the aspect upside down, which framed a single edge.
 *
 * THESE ARE NOT REGISTERED. A built-in id is reserved and `registerCameraView` refuses one, so
 * the table below is looked up first and the registry second, which is what keeps a registration
 * from changing what an existing name means.
 */

import { freeArea } from "./insets";
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

/**
 * How many world units the 2D camera shows either side of its centre, across, at a zoom of 1.
 *
 * An orthographic `zoom` is relative to this: zoom 2 shows half as much, so it reads half-width
 * over this many units, and a view that wants a half-width of `h` asks for `5 / h`.
 */
export const FLAT_HALF_WIDTH_AT_ZOOM_ONE = 5;

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

/**
 * The polar angle of a classic isometric view, in radians: acos(1/sqrt(3)), about 54.736 degrees
 * down from +y, which puts the viewer 35.264 degrees above the horizon on the cube's diagonal.
 * `beta` follows the ArcRotate convention (see `CameraState`), so it is measured from the pole,
 * not from the horizon.
 */
const ISOMETRIC_BETA = Math.acos(1 / Math.sqrt(3));

/**
 * Frame everything from the direction the camera looks from now (`fitToGraph`'s `keepAngle`).
 *
 * The distance puts every corner of the box, padded 10 percent off the view axis, inside the
 * narrower of the two fields of view, so every node is in shot from any angle. The pivot
 * rotation is carried over, so a turn the reader gave the drawing (roll included) is kept.
 * @param input - The box to frame and where the camera is now.
 * @param fov - The vertical field of view in radians.
 * @returns The state, or undefined when the current state has no direction to keep.
 */
function fromCurrentAngle(input: CameraViewInput, fov: number): CameraState | undefined {
    const { current, bounds, aspect } = input;
    if (current.position === undefined || current.target === undefined) {
        return undefined;
    }

    const dx = current.position.x - current.target.x;
    const dy = current.position.y - current.target.y;
    const dz = current.position.z - current.target.z;
    const length = Math.hypot(dx, dy, dz);
    if (length === 0 || !Number.isFinite(length)) {
        return undefined;
    }

    const ux = dx / length;
    const uy = dy / length;
    const uz = dz / length;
    const halfFov = aspect > 0 ? Math.min(fov / 2, Math.atan(Math.tan(fov / 2) * aspect)) : fov / 2;
    const tanHalf = Math.tan(halfFov);
    const { center } = bounds;

    // The nearest distance from the center that keeps each corner of the box, padded off the
    // view axis, inside the narrower field of view; the farthest of those keeps them all.
    let distance = 0;
    for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
            for (const z of [bounds.min.z, bounds.max.z]) {
                const cx = x - center.x;
                const cy = y - center.y;
                const cz = z - center.z;
                const along = cx * ux + cy * uy + cz * uz;
                const off = Math.hypot(cx - along * ux, cy - along * uy, cz - along * uz);
                distance = Math.max(distance, along + (off * PERSPECTIVE_PADDING) / tanHalf);
            }
        }
    }

    return {
        type: "arcRotate",
        position: {
            x: center.x + ux * distance,
            y: center.y + uy * distance,
            z: center.z + uz * distance,
        },
        target: center,
        ...(current.pivotRotation === undefined ? {} : { pivotRotation: current.pivotRotation }),
        cameraDistance: distance,
    };
}

/**
 * Frame everything: an angled view in three dimensions, straight on in two.
 * @param input - The box to frame, the drawing mode, the viewport and the field of view.
 * @returns The state that puts the whole box in shot.
 */
function fitToGraph(input: CameraViewInput): CameraState {
    const { bounds } = input;
    const { center } = bounds;

    if (input.mode === "2d") {
        // The width that shows the whole box: its own width, or the width a frame of this aspect
        // (width over height) needs to show its height, whichever is more -- each over the share
        // of that side the insets leave free. The zoom is the half-width at zoom 1 over half of
        // that. NOT pixels per unit: the camera never reads a zoom that way, and on a graph tens
        // of units wide that number put a single edge across the whole screen.
        const extent = Math.max(bounds.size.x / free.width, (bounds.size.y * input.aspect) / free.height);
        const halfWidth = (extent * FLAT_PADDING) / 2;
        const halfHeight = input.aspect > 0 ? halfWidth / input.aspect : halfWidth;

        return {
            type: "orthographic",
            zoom: FLAT_HALF_WIDTH_AT_ZOOM_ONE / halfWidth,
            // Centered on the free area, not on the canvas.
            pan: { x: center.x - free.x * halfWidth, y: center.y - free.y * halfHeight },
        };
    }

    const fov = input.fov ?? DEFAULT_FOV;
    const keptAngle = input.options.keepAngle === true ? fromCurrentAngle(input, fov) : undefined;
    // The part of the viewport the view insets leave free; all of it when there are none.
    const free = freeArea(input.insets, input.viewport.width, input.viewport.height);
    if (keptAngle !== undefined) {
        return farther(keptAngle, room);
    }

    const straightOn = (bounds.maxDimension / Math.tan(fov / 2)) * PERSPECTIVE_PADDING;
    const distance = (straightOn * ISOMETRIC_FACTOR) / room;

    return {
        type: "arcRotate",
        position: {
            x: center.x + distance * DIAGONAL_OFFSET,
            y: center.y + distance * DIAGONAL_OFFSET,
            z: center.z + distance * DIAGONAL_OFFSET,
        },
        target: center,
    };
    // In 3D the camera already centers what it looks at on the free area; the box only has to be
    // small enough for it, so the distance grows by the narrower free share.
    const room = Math.min(free.width, free.height);
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
/**
 * Move an orbit state back along its line of sight, so the box fits a smaller free area.
 * @param state - A state with a position and a target.
 * @param room - The free share of the viewport, 1 for all of it.
 * @returns The state, its distance divided by `room`.
 */
function farther(state: CameraState, room: number): CameraState {
    const { position, target } = state;
    if (room === 1 || position === undefined || target === undefined) {
        return state;
    }

    return {
        ...state,
        position: {
            x: target.x + (position.x - target.x) / room,
            y: target.y + (position.y - target.y) / room,
            z: target.z + (position.z - target.z) / room,
        },
        ...(state.cameraDistance === undefined ? {} : { cameraDistance: state.cameraDistance / room }),
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

/**
 * Turn an orbit state given as angles into the position the element's cameras are placed from.
 *
 * `alpha`, `beta` and `radius` follow Babylon's ArcRotate convention: the viewer stands at
 * target + radius * (cos(alpha) sin(beta), cos(beta), sin(alpha) sin(beta)). A state that already
 * carries a position or a pivot rotation, or lacks an angle or a distance (`radius`, or
 * `cameraDistance`), is returned unchanged.
 * @param state - The state a caller or a camera view asked for.
 * @returns The same state, with `position` (and `cameraDistance` from `radius`) filled in.
 */
export function orbitAnglesToPosition(state: CameraState): CameraState {
    const { alpha, beta } = state;
    const radius = state.radius ?? state.cameraDistance;
    if (alpha === undefined || beta === undefined || radius === undefined || state.position || state.pivotRotation) {
        return state;
    }

    const target = state.target ?? { x: 0, y: 0, z: 0 };

    return {
        ...state,
        target,
        position: {
            x: target.x + radius * Math.cos(alpha) * Math.sin(beta),
            y: target.y + radius * Math.cos(beta),
            z: target.z + radius * Math.sin(alpha) * Math.sin(beta),
        },
        cameraDistance: state.cameraDistance ?? radius,
    };
}
