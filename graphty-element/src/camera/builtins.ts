/**
 * @file The five camera views the element ships, written the way a third party writes one.
 *
 * Each of these used to be a function taking the `Graph` and a Babylon `Camera`, measuring the
 * node bounding box itself and reading the field of view off the camera -- which is why a view
 * could not be written by anybody outside this package, and why the element's own five were
 * reached by a five-case `switch` rather than by a lookup. They are now plain
 * registration objects: a descriptor from the catalog, and one pure function
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

import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";

import { isPointBox, measuredOf } from "./bounds";
import { freeArea } from "./insets";
import { FLAT_HALF_WIDTH_AT_ZOOM_ONE } from "./orbit";
import { orientationOf } from "./orientation";
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
 * How much room a framing from the current angle (`fitToGraph`'s `keepAngle`) leaves: 5 percent,
 * so what is framed fills the canvas. Only that framing; the diagonal keeps its 10 percent.
 */
const KEPT_ANGLE_PADDING = 1.05;

/** How many halvings find the offset that centers a kept-angle framing on screen. */
const CENTERING_STEPS = 48;

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
 * Frame everything from the direction the camera looks from now (`fitToGraph`'s `keepAngle`): a
 * zoom and a pan, never a turn. The screen's right and up axes come from the camera's own
 * orientation, roll included, so each point the box was measured over is held to the horizontal
 * field of view across and the vertical one up and down, at its own depth, padded 5 percent; and
 * the target moves along those axes so the projected picture is centered on screen, not the 3D
 * box's middle. The pivot rotation is carried over as it is.
 * @param input - The box to frame and where the camera is now.
 * @param fov - The vertical field of view in radians.
 * @returns The state, or undefined when the current state names no orientation.
 */
function fromCurrentAngle(input: CameraViewInput, fov: number): CameraState | undefined {
    const { current, bounds, aspect } = input;
    const turn = orientationOf(current);
    if (turn === undefined) {
        return undefined;
    }

    // The orbit camera sits on the pivot's -z axis, looking along its +z.
    const axis = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z).applyRotationQuaternion(turn);
    const toViewer = axis(0, 0, -1);
    const right = axis(1, 0, 0);
    const up = axis(0, 1, 0);
    const { center } = bounds;
    const place = (x: number, y: number, z: number): { along: number; x: number; y: number } => {
        const c = new Vector3(x - center.x, y - center.y, z - center.z);
        return { along: Vector3.Dot(c, toViewer), x: Vector3.Dot(c, right), y: Vector3.Dot(c, up) };
    };
    // Each drawn box as the cube about its middle that faces the camera, as wide as the box's
    // widest half: from a turned view the box's own corners stand outside a round node by up to
    // three quarters of its radius, and framed it short of the canvas.
    const measured = measuredOf(bounds);
    const points =
        measured === undefined
            ? (bounds.points ?? boxCorners(bounds)).map((point) => place(point.x, point.y, point.z))
            : [
                  ...measured.points.map((point) => place(point.x, point.y, point.z)),
                  ...measured.boxes.flatMap(({ min, max }) => {
                      const middle = place((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
                      const half = Math.max(max.x - min.x, max.y - min.y, max.z - min.z) / 2;
                      return [-1, 1].flatMap((a) =>
                          [-1, 1].flatMap((sx) =>
                              [-1, 1].map((sy) => ({
                                  along: middle.along + a * half,
                                  x: middle.x + sx * half,
                                  y: middle.y + sy * half,
                              })),
                          ),
                      );
                  }),
              ];
    const tanY = Math.tan(fov / 2) / KEPT_ANGLE_PADDING;
    const tanX = aspect > 0 ? tanY * aspect : tanY;

    // A box around a single point is centered on the point itself, not on the picture of its
    // corners: the nearer corners project larger, and centering them put a lone node off center.
    const onPoint = isPointBox(bounds);

    // A point `along` toward the viewer and `s` across stands `distance - along` in front of the
    // camera; it is in frame when |s - offset| <= (distance - along) * tan. The nearest distance
    // that holds every point on one axis, whatever the offset, is the closed form below; with the
    // offset held at zero it is the farthest point's own.
    const nearest = (key: "x" | "y", tan: number): number => {
        let high = -Infinity;
        let low = Infinity;
        for (const point of points) {
            high = Math.max(high, point[key] + point.along * tan);
            low = Math.min(low, point[key] - point.along * tan);
        }

        return onPoint ? Math.max(high, -low) / tan : (high - low) / (2 * tan);
    };
    const distance = Math.max(0, nearest("x", tanX), nearest("y", tanY));
    const offsetX = onPoint ? 0 : centeredOffset(points, "x", distance);
    const offsetY = onPoint ? 0 : centeredOffset(points, "y", distance);
    const target = {
        x: center.x + right.x * offsetX + up.x * offsetY,
        y: center.y + right.y * offsetX + up.y * offsetY,
        z: center.z + right.z * offsetX + up.z * offsetY,
    };

    return {
        type: "arcRotate",
        position: {
            x: target.x + toViewer.x * distance,
            y: target.y + toViewer.y * distance,
            z: target.z + toViewer.z * distance,
        },
        target,
        ...(current.pivotRotation === undefined ? {} : { pivotRotation: current.pivotRotation }),
        cameraDistance: distance,
    };
}

/**
 * The offset along one screen axis that puts the projected picture's two edges equally far from
 * the screen's middle, for a camera `distance` from the box: found by halving, since moving the
 * offset one way only ever brings one edge in and pushes the other out.
 * @param points - Each point's depth toward the viewer and its place on the screen's axes.
 * @param key - Which screen axis.
 * @param distance - How far the camera stands from the target.
 * @returns The offset from the box's center along that axis.
 * @internal
 */
export function centeredOffset(
    points: readonly { along: number; x: number; y: number }[],
    key: "x" | "y",
    distance: number,
): number {
    let low = Infinity;
    let high = -Infinity;
    for (const point of points) {
        low = Math.min(low, point[key]);
        high = Math.max(high, point[key]);
    }

    // Each point is a line in the offset: (s - m) / depth for the edge above, (m - s) / depth for
    // the one below. A line whose best value over [low, high] is below another line's worst there
    // can never set that edge again, since halving only narrows the interval, so each pass drops
    // it: a pass costs the points still in the running, not all of them.
    const depthOf = (point: { along: number }): number => Math.max(distance - point.along, Number.EPSILON);
    let candidates = points;
    for (let step = 0; step < CENTERING_STEPS && high > low; step++) {
        let aboveFloor = -Infinity;
        let belowFloor = -Infinity;
        for (const point of candidates) {
            const s = point[key];
            const depth = depthOf(point);
            aboveFloor = Math.max(aboveFloor, (s - high) / depth);
            belowFloor = Math.max(belowFloor, (low - s) / depth);
        }

        const middle = (low + high) / 2;
        let above = -Infinity;
        let below = -Infinity;
        const kept: (typeof points)[number][] = [];
        for (const point of candidates) {
            const s = point[key];
            const depth = depthOf(point);
            if ((s - low) / depth < aboveFloor && (high - s) / depth < belowFloor) {
                continue;
            }

            kept.push(point);
            above = Math.max(above, (s - middle) / depth);
            below = Math.max(below, (middle - s) / depth);
        }

        candidates = kept;
        if (above > below) {
            low = middle;
        } else {
            high = middle;
        }
    }

    return Number.isFinite(low) ? (low + high) / 2 : 0;
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
 * The eight corners of a box, for bounds that carry no points (the default box, or one handed in
 * by a caller that measured no points).
 * @param bounds - The box.
 * @returns Its corners.
 */
function boxCorners(bounds: CameraViewInput["bounds"]): Direction[] {
    const corners: Direction[] = [];
    for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
            for (const z of [bounds.min.z, bounds.max.z]) {
                corners.push({ x, y, z });
            }
        }
    }

    return corners;
}

/**
 * Frame everything from one direction: every point the box was measured over (or, with none, every
 * corner of the box), padded 10 percent, inside the view. The screen's axes are known, so each
 * point is held to the horizontal field of view across and the vertical one up and down, at its
 * own depth. Any turn the reader gave the drawing is dropped.
 * @param input - The box to frame and where the camera is now.
 * @param fov - The vertical field of view in radians.
 * @param direction - From the box's center toward the viewer; any length but zero.
 * @returns The state, or undefined when the direction has no length.
 */
function fromDirection(input: CameraViewInput, fov: number, direction: Direction): CameraState | undefined {
    const { bounds, aspect } = input;
    const length = Math.hypot(direction.x, direction.y, direction.z);
    if (length === 0 || !Number.isFinite(length)) {
        return undefined;
    }

    const u = { x: direction.x / length, y: direction.y / length, z: direction.z / length };
    const tanY = Math.tan(fov / 2);
    const tanX = aspect > 0 ? tanY * aspect : tanY;
    const axes = screenAxes(u);
    const { center } = bounds;
    const dot = (a: Direction, b: Direction): number => a.x * b.x + a.y * b.y + a.z * b.z;

    // A point `along` units toward the viewer stands `distance - along` in front of the camera,
    // where the frame's half-width is `tanX` and its half-height `tanY` times that. The points
    // themselves, not the box's corners: seen from the diagonal, the box's nearest corner stands
    // far in front of a round graph and out to the side of it, and fitting the corners drew the
    // graph about half the height of the view (#6644).
    let distance = 0;
    for (const point of bounds.points ?? boxCorners(bounds)) {
        const c = { x: point.x - center.x, y: point.y - center.y, z: point.z - center.z };
        const along = dot(c, u);
        const reach =
            axes === undefined
                ? Math.hypot(c.x - along * u.x, c.y - along * u.y, c.z - along * u.z) / Math.min(tanX, tanY)
                : Math.max(Math.abs(dot(c, axes.right)) / tanX, Math.abs(dot(c, axes.up)) / tanY);
        distance = Math.max(distance, along + reach * PERSPECTIVE_PADDING);
    }

    return {
        type: "arcRotate",
        position: {
            x: center.x + u.x * distance,
            y: center.y + u.y * distance,
            z: center.z + u.z * distance,
        },
        target: center,
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
        // A turned view (`rotation`, counterclockwise) is measured along the screen's turned axes,
        // over the points themselves: the turned box's extent over-sizes any graph that does not
        // fill its box's corners, and drew it well short of the canvas.
        const turn = input.current.rotation ?? 0;
        const cos = Math.cos(turn);
        const sin = Math.sin(turn);
        let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
        const measured = bounds.points !== undefined && bounds.points.length > 0 ? bounds.points : boxCorners(bounds);
        for (const point of measured) {
            const dx = point.x - center.x;
            const dy = point.y - center.y;
            const sx = dx * cos - dy * sin;
            const sy = dx * sin + dy * cos;
            [minX, maxX, minY, maxY] = [Math.min(minX, sx), Math.max(maxX, sx), Math.min(minY, sy), Math.max(maxY, sy)];
        }

        const [sizeX, sizeY] = [maxX - minX, maxY - minY];
        // Where the points' middle sits from the box's center, along the screen's axes.
        const [midX, midY] = [(minX + maxX) / 2, (minY + maxY) / 2];
        const extent = Math.max(sizeX / free.width, (sizeY * input.aspect) / free.height);
        const halfWidth = (extent * FLAT_PADDING) / 2;
        const halfHeight = input.aspect > 0 ? halfWidth / input.aspect : halfWidth;
        // Centered on the free area, not on the canvas: its offset is along the screen's axes.
        const [offsetX, offsetY] = [free.x * halfWidth - midX, free.y * halfHeight - midY];

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
    const faced = input.facing === undefined ? undefined : fromDirection(input, fov, input.facing);
    if (faced !== undefined) {
        return farther(faced, room);
    }

    // Otherwise from the diagonal, every point held inside both fields of view at its own depth
    // (#5349, #6644): the old distance, the longest side over the field of view times a tuned 0.65,
    // stood too close for a box that is not a cube, and cut a framed node off.
    const diagonal = fromDirection(input, fov, { x: 1, y: 1, z: 1 });
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
    const state = fromDirection(input, input.fov ?? DEFAULT_FOV, facedDirection(input.facing, view));
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
        // A flat drawing already looks straight down: Top frames all of it, upright (no turn).
        return { ...fitToGraph({ ...input, current: { ...input.current, rotation: 0 } }), rotation: 0 };
    }

    const distance = input.bounds.maxDimension * STRAIGHT_ON_DISTANCE;

    return {
        type: "arcRotate",
        position: { x: center.x, y: center.y + distance, z: center.z },
        target: center,
    };
}

/**
 * Look straight up at the graph from below: the mirror of `topView`, in 3D only.
 * @param input - The box to frame.
 * @returns The state that looks up the y axis.
 */
function bottomView(input: CameraViewInput): CameraState {
    const { center } = input.bounds;
    const distance = input.bounds.maxDimension * STRAIGHT_ON_DISTANCE;

    return {
        type: "arcRotate",
        position: { x: center.x, y: center.y - distance, z: center.z },
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
    bottomView,
});

/**
 * The function one built-in view computes with.
 * @param id - The view name, such as "isometric".
 * @returns The function, or undefined when the element ships no view by that name.
 */
export function builtInCameraView(id: string): ((input: CameraViewInput) => CameraState) | undefined {
    return Object.hasOwn(BUILT_IN_CAMERA_VIEWS, id) ? BUILT_IN_CAMERA_VIEWS[id] : undefined;
}
