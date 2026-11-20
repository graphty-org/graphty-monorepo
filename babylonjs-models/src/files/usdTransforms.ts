/**
 * @file A USD prim's transform from its `xformOp`s, and the box around what it draws, for a USD
 * stage's size as drawn (each use where its references, instances and transforms put it).
 *
 * A transform is an affine map as 12 numbers, three rows of `[a, b, c, t]` (column vectors:
 * `p' = A p + t`). USD applies a prim's ops last first: `xformOpOrder = [translate, rotateXYZ, scale]`
 * scales, then rotates, then translates.
 *
 * Babylon-free and DOM-free.
 */

/** An affine transform: three rows of `[a, b, c, t]`. */
export type Affine = readonly number[];

/** A box; `min[0]` is Infinity for an empty one. */
export interface Box {
    readonly min: [number, number, number];
    readonly max: [number, number, number];
}

/** The transform that moves nothing. */
export const IDENTITY: Affine = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);

/**
 * An empty box.
 * @returns The box.
 */
export function emptyBox(): Box {
    return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
}

/**
 * Grow a box by a point; a point with a part that is not finite is left out.
 * @param box - The box.
 * @param x - The point's x.
 * @param y - Its y.
 * @param z - Its z.
 */
export function growBox(box: Box, x: number, y: number, z: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return;
    }
    const p = [x, y, z];
    for (let a = 0; a < 3; a++) {
        box.min[a] = Math.min(box.min[a], p[a]);
        box.max[a] = Math.max(box.max[a], p[a]);
    }
}

/**
 * Grow a box by another.
 * @param box - The box.
 * @param other - The other box.
 */
export function joinBox(box: Box, other: Box): void {
    if (other.min[0] !== Infinity) {
        growBox(box, ...other.min);
        growBox(box, ...other.max);
    }
}

/**
 * The box around a box moved by a transform.
 * @param box - The box.
 * @param m - The transform.
 * @returns The box around its eight corners, moved.
 */
export function placeBox(box: Box, m: Affine): Box {
    const out = emptyBox();
    if (box.min[0] === Infinity) {
        return out;
    }
    for (let corner = 0; corner < 8; corner++) {
        const x = corner & 1 ? box.max[0] : box.min[0];
        const y = corner & 2 ? box.max[1] : box.min[1];
        const z = corner & 4 ? box.max[2] : box.min[2];
        growBox(
            out,
            m[0] * x + m[1] * y + m[2] * z + m[3],
            m[4] * x + m[5] * y + m[6] * z + m[7],
            m[8] * x + m[9] * y + m[10] * z + m[11],
        );
    }
    return out;
}

/**
 * Two transforms, one after the other: `a` applied to what `b` gives.
 * @param a - The outer transform.
 * @param b - The inner transform.
 * @returns `a * b`.
 */
export function compose(a: Affine, b: Affine): Affine {
    const out: number[] = [];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
            out.push(
                a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c] + (c === 3 ? a[r * 4 + 3] : 0),
            );
        }
    }
    return out;
}

/**
 * A transform's inverse; a transform that flattens space has none, and moves nothing instead.
 * @param m - The transform.
 * @returns Its inverse.
 */
function invert(m: Affine): Affine {
    const [a, b, c, , d, e, f, , g, h, i] = m;
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    if (det === 0 || !Number.isFinite(det)) {
        return IDENTITY;
    }
    const r = [
        (e * i - f * h) / det,
        (c * h - b * i) / det,
        (b * f - c * e) / det,
        (f * g - d * i) / det,
        (a * i - c * g) / det,
        (c * d - a * f) / det,
        (d * h - e * g) / det,
        (b * g - a * h) / det,
        (a * e - b * d) / det,
    ];
    const t = [m[3], m[7], m[11]];
    return [
        r[0],
        r[1],
        r[2],
        -(r[0] * t[0] + r[1] * t[1] + r[2] * t[2]),
        r[3],
        r[4],
        r[5],
        -(r[3] * t[0] + r[4] * t[1] + r[5] * t[2]),
        r[6],
        r[7],
        r[8],
        -(r[6] * t[0] + r[7] * t[1] + r[8] * t[2]),
    ];
}

/**
 * A turn about one axis.
 * @param axis - 0, 1 or 2 for x, y or z.
 * @param degrees - The angle.
 * @returns The transform.
 */
function turn(axis: number, degrees: number): Affine {
    const rad = (degrees * Math.PI) / 180;
    const [cos, sin] = [Math.cos(rad), Math.sin(rad)];
    const [u, v] = [(axis + 1) % 3, (axis + 2) % 3];
    const m = [...IDENTITY];
    m[u * 4 + u] = cos;
    m[u * 4 + v] = -sin;
    m[v * 4 + u] = sin;
    m[v * 4 + v] = cos;
    return m;
}

/**
 * A rotate op's transform: `rotateX` (one angle) or `rotateXYZ` and its orders (three).
 * @param kind - The op's kind.
 * @param value - Its angles in degrees.
 * @returns The transform, or undefined for another kind.
 */
function rotationOf(kind: string, value: readonly number[]): Affine | undefined {
    const axes = /^rotate([XYZ]|[XYZ]{3})$/.exec(kind)?.[1];
    if (axes?.length !== value.length) {
        return undefined;
    }
    // rotateXYZ turns about x first, then y, then z.
    let m = IDENTITY;
    for (let i = 0; i < value.length; i++) {
        m = compose(turn("XYZ".indexOf(axes.charAt(i)), value[i]), m);
    }
    return m;
}

/**
 * One `xformOp`'s transform, from its kind (`translate`, `scale`, `rotateX`, `rotateXYZ`, `orient`,
 * `transform`) and its value; undefined for a kind or a value this does not read.
 * @param kind - The op's kind, the part of its name after `xformOp:`.
 * @param value - Its value: a vector, angles in degrees, a quaternion (real last, as a binary
 *     layer stores it; `realFirst` for a text layer's `(w, x, y, z)`) or a 4x4 matrix row by row.
 * @param realFirst - The quaternion's real part comes first.
 * @returns The transform.
 */
export function opTransform(kind: string, value: readonly number[], realFirst = false): Affine | undefined {
    if ((kind === "translate" || kind === "scale") && value.length === 3) {
        const [x, y, z] = value;
        return kind === "translate" ? [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z] : [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0];
    }
    const rotation = rotationOf(kind, value);
    if (rotation !== undefined) {
        return rotation;
    }
    if (kind === "orient" && value.length === 4) {
        const [w, x, y, z] = realFirst ? value : [value[3], value[0], value[1], value[2]];
        const n = Math.hypot(w, x, y, z) || 1;
        const [qw, qx, qy, qz] = [w / n, x / n, y / n, z / n];
        return [
            1 - 2 * (qy * qy + qz * qz),
            2 * (qx * qy - qz * qw),
            2 * (qx * qz + qy * qw),
            0,
            2 * (qx * qy + qz * qw),
            1 - 2 * (qx * qx + qz * qz),
            2 * (qy * qz - qx * qw),
            0,
            2 * (qx * qz - qy * qw),
            2 * (qy * qz + qx * qw),
            1 - 2 * (qx * qx + qy * qy),
            0,
        ];
    }
    if (kind === "transform" && value.length === 16) {
        // USD's matrices act on row vectors: the translation is the last row.
        const m = value;
        return [m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13], m[2], m[6], m[10], m[14]];
    }
    return undefined;
}

/**
 * A prim's transform from its ops, in its `xformOpOrder`: an op named `!invert!xformOp:...` is
 * that op undone, and an op the order names that is not written, or not read, moves nothing.
 * @param order - The `xformOpOrder`.
 * @param ops - Each op's transform, by its full name (`xformOp:translate:pivot`).
 * @returns The transform.
 */
export function placement(order: readonly string[], ops: ReadonlyMap<string, Affine>): Affine {
    let m = IDENTITY;
    for (const name of order) {
        const inverted = name.startsWith("!invert!");
        const op = ops.get(inverted ? name.slice("!invert!".length) : name);
        if (op !== undefined) {
            m = compose(m, inverted ? invert(op) : op);
        }
    }
    return m;
}
