/**
 * @file Quarter turns of a model node's orientation, as values of `node.modelSourceUp` and
 * `node.modelTurn`, with no 3D engine: a rotate button writes the result into a layer and does no
 * rotation math of its own.
 */

/** An axis of the model's file, as `node.modelSourceUp` names it once "detected" is settled. */
export type ModelUpAxis = "y" | "z" | "-y" | "-z" | "x" | "-x";

/** A model's orientation: the file's up axis, and the turn about it in degrees. */
export interface ModelOrientation {
    /** `node.modelSourceUp`; "detected" is settled with the third argument of {@link turnModelOrientation}. */
    readonly up: ModelUpAxis | "detected";
    /** `node.modelTurn`, in degrees. */
    readonly turn: number;
}

/** One quarter turn: the front swung to the screen's left or right, or the top tipped toward or away from the viewer. */
export type ModelTurnStep = "left" | "right" | "forward" | "back";

/** A 3 x 3 rotation, row by row, applied to a row vector (v times M), as the element applies it. */
type Rotation = readonly number[];

const AXES: readonly ModelUpAxis[] = ["y", "z", "-y", "-z", "x", "-x"];

/**
 * A rotation by a whole number of quarter turns about one axis.
 * @param axis - The axis.
 * @param quarters - The quarter turns, counterclockwise looking down the axis toward the origin.
 * @returns The rotation.
 */
function about(axis: "x" | "y" | "z", quarters: number): Rotation {
    const k = ((quarters % 4) + 4) % 4;
    const c = [1, 0, -1, 0][k];
    const s = [0, 1, 0, -1][k];
    if (axis === "x") {
        return [1, 0, 0, 0, c, s, 0, -s, c];
    }

    return axis === "y" ? [c, 0, -s, 0, 1, 0, s, 0, c] : [c, s, 0, -s, c, 0, 0, 0, 1];
}

/**
 * Two rotations one after the other.
 * @param a - The first.
 * @param b - The second.
 * @returns a then b.
 */
function then(a: Rotation, b: Rotation): Rotation {
    const out: number[] = [];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            out.push(a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]);
        }
    }

    return out;
}

/** The tilt that turns each file axis to +Y, as the element's template builder applies it. */
const TILT: Readonly<Record<ModelUpAxis, Rotation>> = {
    y: about("x", 0),
    "-y": about("x", 2),
    z: about("x", -1),
    "-z": about("x", 1),
    x: about("z", 1),
    "-x": about("z", -1),
};

/**
 * The orientation a model is drawn in: its up axis tilted to +Y, then turned about +Y, half a turn
 * more than `node.modelTurn` so a turn of 0 shows its front.
 * @param up - The file's up axis.
 * @param quarters - The turn, in quarter turns.
 * @returns The rotation.
 */
function drawn(up: ModelUpAxis, quarters: number): Rotation {
    return then(TILT[up], about("y", quarters + 2));
}

/**
 * A turn in degrees, between -180 (left out) and 180.
 * @param degrees - Any turn.
 * @returns The same turn in that range.
 */
function normalized(degrees: number): number {
    const turn = ((((degrees + 180) % 360) + 360) % 360) - 180;
    return turn === -180 ? 180 : turn;
}

/**
 * The orientation one quarter turn on from another: write the result's `up` to
 * `node.modelSourceUp` and its `turn` to `node.modelTurn`. A turn left or right keeps the up axis;
 * a tip forward or back finds the file axis that now points up, and rounds the turn to a quarter.
 * @param current - The orientation now.
 * @param step - The quarter turn.
 * @param detected - The axis a "detected" up settles to: the model summary's `upAxis`. Default "y".
 * @returns The next orientation.
 * @example
 * ```ts
 * const next = turnModelOrientation({ up: "y", turn: 0 }, "forward"); // { up: "-z", turn: 0 }
 * ```
 */
export function turnModelOrientation(
    current: ModelOrientation,
    step: ModelTurnStep,
    detected: ModelUpAxis = "y",
): { readonly up: ModelUpAxis; readonly turn: number } {
    const up = current.up === "detected" ? detected : current.up;
    if (step === "left" || step === "right") {
        return { up, turn: normalized(current.turn + (step === "left" ? 90 : -90)) };
    }

    const quarters = Math.round(current.turn / 90);
    // Tipping forward brings the top toward the viewer, who stands at -Z.
    const target = then(drawn(up, quarters), about("x", step === "forward" ? -1 : 1));
    for (const axis of AXES) {
        for (let q = -1; q <= 2; q++) {
            if (drawn(axis, q).every((value, i) => value === target[i])) {
                return { up: axis, turn: normalized(q * 90) };
            }
        }
    }

    // Every product of quarter turns is one of the 24 above.
    return { up, turn: normalized(quarters * 90) };
}
