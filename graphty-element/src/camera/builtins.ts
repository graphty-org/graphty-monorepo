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
 * THE NUMBERS ARE MOSTLY UNCHANGED, deliberately. Padding of 5 percent in 2D, 10 percent in 3D,
 * a straight-on distance of one and a half times the longest side: each is what the element
 * computed before, so those pictures do not move. They disagree with each other -- the orbit controller's own framing pads 5 percent and
 * the 2D controller's pads 10 percent -- and this file does not average them, because averaging
 * them would change what a saved screenshot looks like. A plugin picks its own. Three exceptions:
 * the isometric `beta` was 0.615, the elevation above the horizon, in a field measured down from
 * the pole, and no picture depended on it because nothing applied it; and the 2D `fitToGraph`
 * zoom was pixels per unit with the aspect upside down, which framed a single edge; and the 3D
 * `fitToGraph` distance was the longest side over the field of view times a tuned 0.65, which
 * stood too close for any box but a cube and cut a framed node off (#5349); it now holds every
 * corner inside both fields of view.
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
    const { current } = input;
    if (current.position === undefined || current.target === undefined) {
        return undefined;
    }

    return fromDirection(
        input,
        fov,
        {
            x: current.position.x - current.target.x,
            y: current.position.y - current.target.y,
            z: current.position.z - current.target.z,
        },
        true,
    );
}

/** A direction in world space. */
interface Direction {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

/**
 * The screen's right and up axes for a camera looking back along `toViewer` with no roll, the
 * way an orbit state with a position and a target is applied: yaw about +y, then pitch, so right
 * is level and up leans toward +y. Undefined when the camera looks straight up or down, where
 * yaw has no meaning.
 * @param toViewer - Unit vector from the box toward the viewer.
 * @returns Both unit axes, or undefined.
 */
function screenAxes(toViewer: Direction): { right: Direction; up: Direction } | undefined {
    const level = Math.hypot(toViewer.x, toViewer.z);
    if (level < 1e-9) {
        return undefined;
    }

    const right = { x: toViewer.z / level, y: 0, z: -toViewer.x / level };
    const up = {
        x: toViewer.y * right.z,
        y: toViewer.z * right.x - toViewer.x * right.z,
        z: -toViewer.y * right.x,
    };
    return { right, up };
}

/**
 * Frame everything from one direction: every corner of the box, padded 10 percent, inside the
 * view. With no turn to keep, the screen's axes are known, so each corner is held to the
 * horizontal field of view across and the vertical one up and down, at its own depth. A kept
 * turn (`keepTurn`) may roll the screen, so each corner's distance off the view axis is held to
 * the narrower field instead, which fits whatever the roll. The current pivot rotation is carried
 * over only when `keepTurn` is set.
 * @param input - The box to frame and where the camera is now.
 * @param fov - The vertical field of view in radians.
 * @param direction - From the box's center toward the viewer; any length but zero.
 * @param keepTurn - Whether to carry the current pivot rotation over.
 * @returns The state, or undefined when the direction has no length.
 */
function fromDirection(
    input: CameraViewInput,
    fov: number,
    direction: Direction,
    keepTurn: boolean,
): CameraState | undefined {
    const { current, bounds, aspect } = input;
    const length = Math.hypot(direction.x, direction.y, direction.z);
    if (length === 0 || !Number.isFinite(length)) {
        return undefined;
    }

    const u = { x: direction.x / length, y: direction.y / length, z: direction.z / length };
    const tanY = Math.tan(fov / 2);
    const tanX = aspect > 0 ? tanY * aspect : tanY;
    const turn = keepTurn ? current.pivotRotation : undefined;
    const axes = turn === undefined ? screenAxes(u) : undefined;
    const { center } = bounds;
    const dot = (a: Direction, b: Direction): number => a.x * b.x + a.y * b.y + a.z * b.z;

    // A corner `along` units toward the viewer stands `distance - along` in front of the camera,
    // where the frame's half-width is `tanX` and its half-height `tanY` times that.
    let distance = 0;
    for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
            for (const z of [bounds.min.z, bounds.max.z]) {
                const c = { x: x - center.x, y: y - center.y, z: z - center.z };
                const along = dot(c, u);
                const reach =
                    axes === undefined
                        ? Math.hypot(c.x - along * u.x, c.y - along * u.y, c.z - along * u.z) / Math.min(tanX, tanY)
                        : Math.max(Math.abs(dot(c, axes.right)) / tanX, Math.abs(dot(c, axes.up)) / tanY);
                distance = Math.max(distance, along + reach * PERSPECTIVE_PADDING);
            }
        }
    }

    return {
        type: "arcRotate",
        position: {
            x: center.x + u.x * distance,
            y: center.y + u.y * distance,
            z: center.z + u.z * distance,
        },
        target: center,
        ...(turn === undefined ? {} : { pivotRotation: turn }),
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
    // The part of the viewport the view insets leave free; all of it when there are none.
    const free = freeArea(input.insets, input.viewport.width, input.viewport.height);

    if (input.mode === "2d") {
        // The width that shows the whole box: its own width, or the width a frame of this aspect
        // (width over height) needs to show its height, whichever is more -- each over the share
        // of that side the insets leave free. The zoom is the half-width at zoom 1 over half of
        // that. NOT pixels per unit: the camera never reads a zoom that way, and on a graph tens
        // of units wide that number put a single edge across the whole screen.
        // A turned view (`rotation`, counterclockwise) shows the box's extent along its own axes.
        const turn = input.current.rotation ?? 0;
        const cos = Math.cos(turn);
        const sin = Math.sin(turn);
        const sizeX = Math.abs(cos) * bounds.size.x + Math.abs(sin) * bounds.size.y;
        const sizeY = Math.abs(sin) * bounds.size.x + Math.abs(cos) * bounds.size.y;
        const extent = Math.max(sizeX / free.width, (sizeY * input.aspect) / free.height);
        const halfWidth = (extent * FLAT_PADDING) / 2;
        const halfHeight = input.aspect > 0 ? halfWidth / input.aspect : halfWidth;
        // Centered on the free area, not on the canvas: its offset is along the screen's axes.
        const [offsetX, offsetY] = [free.x * halfWidth, free.y * halfHeight];

        return {
            type: "orthographic",
            zoom: FLAT_HALF_WIDTH_AT_ZOOM_ONE / halfWidth,
            pan: {
                x: center.x - (offsetX * cos + offsetY * sin),
                y: center.y - (-offsetX * sin + offsetY * cos),
            },
        };
    }

    // In 3D the camera already centers what it looks at on the free area; the box only has to be
    // small enough for it, so the distance grows by the narrower free share.
    const room = Math.min(free.width, free.height);
    const fov = input.fov ?? DEFAULT_FOV;
    const keptAngle = input.options.keepAngle === true ? fromCurrentAngle(input, fov) : undefined;
    // A kept angle that sees a one-sided drawing (a map) from behind is not kept.
    if (keptAngle !== undefined && !seenFromBehind(input)) {
        return farther(keptAngle, room);
    }

    // A drawing meant to be seen from one side (a map, a globe) is framed from that side: from the
    // diagonal it would be seen from behind, or from inside the globe.
    // Like the diagonal, it drops any turn the reader gave the drawing.
    const faced = input.facing === undefined ? undefined : fromDirection(input, fov, input.facing, false);
    if (faced !== undefined) {
        return farther(faced, room);
    }

    // Otherwise from the diagonal, every corner held inside both fields of view at its own depth
    // (#5349): the old distance, the longest side over the field of view times a tuned 0.65,
    // stood too close for a box that is not a cube, and cut a framed node off.
    const diagonal = fromDirection(input, fov, { x: 1, y: 1, z: 1 }, false);
    return diagonal === undefined ? { type: "arcRotate", target: center } : farther(diagonal, room);
}

/**
 * Whether the camera now sees a one-sided drawing from its back: the camera stands on the other
 * side of the drawing from the side it faces.
 * @param input - Where the camera is, and the drawing's facing.
 * @returns True when it does; false with no facing or no current position.
 */
function seenFromBehind(input: CameraViewInput): boolean {
    const { facing, current, bounds } = input;
    if (facing === undefined || current.position === undefined) {
        return false;
    }

    const { center } = bounds;
    const toCamera =
        (current.position.x - center.x) * facing.x +
        (current.position.y - center.y) * facing.y +
        (current.position.z - center.z) * facing.z;
    return toCamera < 0;
}

/**
 * The directions the preset views take on a one-sided drawing (a map or a globe), from the
 * drawing toward the viewer, given the side it faces (`facing`) and north up (+y): Top looks
 * straight at its face, Side is a low view from the south, Isometric an oblique view from the
 * front, a little east and south.
 * @param facing - The side the drawing faces.
 * @param view - Which view.
 * @returns The direction.
 */
function facedDirection(
    facing: NonNullable<CameraViewInput["facing"]>,
    view: "top" | "side" | "isometric",
): { x: number; y: number; z: number } {
    const [east, south, out] = { top: [0, 0, 1], side: [0, 0.906, 0.423], isometric: [0.4, 0.55, 0.73] }[view];
    return { x: facing.x * out + east, y: facing.y * out - south, z: facing.z * out };
}

/**
 * A preset view of a one-sided drawing, framing all of it from its direction.
 * @param input - The box, the facing and the camera.
 * @param view - Which view.
 * @returns The state, or undefined in 2D or for a drawing that looks the same from every side.
 */
function facedView(input: CameraViewInput, view: "top" | "side" | "isometric"): CameraState | undefined {
    if (input.mode === "2d" || input.facing === undefined) {
        return undefined;
    }

    const free = freeArea(input.insets, input.viewport.width, input.viewport.height);
    const state = fromDirection(input, input.fov ?? DEFAULT_FOV, facedDirection(input.facing, view), false);
    if (state === undefined) {
        return undefined;
    }

    return farther(state, Math.min(free.width, free.height));
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

/**
 * Look straight down at the graph, which is the natural view for a flat arrangement. On a map
 * or a globe in 3D, straight at its face.
 * @param input - The box to frame and the drawing mode.
 * @returns The state that looks down the y axis.
 */
function topView(input: CameraViewInput): CameraState {
    const { center } = input.bounds;
    const faced = facedView(input, "top");
    if (faced !== undefined) {
        return faced;
    }

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
 * Look along the x axis, which shows how deep an arrangement is. On a map or a globe in 3D, a low
 * view from the south.
 * @param input - The box to frame.
 * @returns The state that looks along the x axis.
 */
function sideView(input: CameraViewInput): CameraState {
    const { center } = input.bounds;
    const faced = facedView(input, "side");
    if (faced !== undefined) {
        return faced;
    }

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
    // A drawing meant to be seen from one side (a map, a globe) has its face on that side.
    const { x, y, z } = input.facing ?? { x: 0, y: 0, z: 1 };

    return {
        type: "arcRotate",
        position: { x: center.x + x * distance, y: center.y + y * distance, z: center.z + z * distance },
        target: center,
    };
}

/**
 * The classic three-quarter view: 45 degrees around and about 35 degrees up. On a map or a globe in
 * 3D, an oblique view from its front.
 * @param input - The box to frame.
 * @returns The state, expressed as orbit angles rather than as a position.
 */
function isometric(input: CameraViewInput): CameraState {
    const faced = facedView(input, "isometric");
    if (faced !== undefined) {
        return faced;
    }

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
