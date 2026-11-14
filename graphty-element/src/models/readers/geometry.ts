/**
 * @file The plain geometry graphty-element's own model readers produce, and the two helpers they
 * share: turning a file's right-handed coordinates into Babylon.js's left-handed ones, and drawing
 * points or Gaussian splats as small solids.
 *
 * Babylon-free and DOM-free, so the intake scans and the unit tests read the same code the model
 * chunk draws with (src/models/readers/container.ts turns a {@link Geometry} into a mesh).
 */

/**
 * A file a reader could not read: the `rule` of the `E_MODEL_STRUCTURE` it is reported as
 * (`header`, `ply`, `splat`, `babylon`, `delayLoad`, `json`).
 */
export class ModelReadError extends Error {
    /**
     * Name the rule.
     * @param rule - The rule broken.
     */
    constructor(readonly rule: string) {
        super(`graphty-element: the model file is damaged (${rule})`);
    }
}

/** One drawable part: triangles, with optional per-vertex colors and texture coordinates. */
export interface Geometry {
    /** x, y, z per vertex. */
    positions: Float32Array;
    /** Three per triangle. */
    indices: Uint32Array;
    /** r, g, b, a per vertex, 0 to 1. */
    colors?: Float32Array;
    /** u, v per vertex. */
    uvs?: Float32Array;
    /** x, y, z per vertex; computed from the triangles when absent. */
    normals?: Float32Array;
}

/**
 * The most points or splats drawn for one model. Each is 8 triangles, so a model draws at most
 * 400,000 of them. ponytail: a fixed cap; read it from `maxTriangles` when a reader needs more.
 */
export const MAX_POINTS_DRAWN = 50_000;

/** Triangles per point drawn: an octahedron. */
export const TRIANGLES_PER_POINT = 8;

/** A splat whose opacity is under this (of 255) is not drawn. */
const MIN_SPLAT_ALPHA = 26;

/** Bytes per splat row: position f32 x3, scale f32 x3, rgba u8 x4, rotation u8 x4. */
export const SPLAT_ROW_BYTES = 32;

/**
 * How many of `count` points are drawn.
 * @param count - The points in the file.
 * @returns At most {@link MAX_POINTS_DRAWN}.
 */
export function pointsDrawn(count: number): number {
    return Math.min(count, MAX_POINTS_DRAWN);
}

/**
 * Mirror geometry on X and reverse its winding: a right-handed file (STL, PLY, the glTF 1.0 and
 * OBJ conventions) into Babylon's left-handed space, keeping its up axis and its front faces.
 * @param geometry - Changed in place.
 * @returns The same geometry.
 */
export function toLeftHanded(geometry: Geometry): Geometry {
    const { positions, indices, normals } = geometry;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i] = -positions[i];
    }

    if (normals !== undefined) {
        for (let i = 0; i < normals.length; i += 3) {
            normals[i] = -normals[i];
        }
    }

    for (let i = 0; i + 2 < indices.length; i += 3) {
        const second = indices[i + 1];
        indices[i + 1] = indices[i + 2];
        indices[i + 2] = second;
    }

    return geometry;
}

/** The six corners of a unit octahedron, and its eight faces. */
const OCTA_CORNERS = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1];
const OCTA_FACES = [0, 2, 4, 2, 1, 4, 1, 3, 4, 3, 0, 4, 2, 0, 5, 1, 2, 5, 3, 1, 5, 0, 3, 5];

/**
 * A size for points with no size of their own: about half the spacing they would have if they
 * filled their box evenly.
 * @param positions - x, y, z per point.
 * @param count - How many points.
 * @returns The octahedron's radius.
 */
function spacing(positions: Float32Array, count: number): number {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < count * 3; i++) {
        const v = positions[i];
        if (Number.isFinite(v)) {
            min[i % 3] = Math.min(min[i % 3], v);
            max[i % 3] = Math.max(max[i % 3], v);
        }
    }

    const diagonal = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    const size = Number.isFinite(diagonal) && diagonal > 0 ? diagonal / Math.cbrt(Math.max(count, 1)) : 1;
    return size * 0.35;
}

/**
 * Draw points as small octahedra, each in its point's color, thinned by stride to
 * {@link MAX_POINTS_DRAWN}.
 * @param positions - x, y, z per point.
 * @param colors - r, g, b, a per point (0 to 255), or undefined.
 * @param sizes - A radius per point, or undefined for one size from the points' spacing.
 * @returns The solids, and how many points they draw.
 */
export function pointsToSolids(
    positions: Float32Array,
    colors?: Uint8Array | Uint8ClampedArray,
    sizes?: Float32Array,
): { geometry: Geometry; drawn: number } {
    const count = Math.floor(positions.length / 3);
    const drawn = pointsDrawn(count);
    const stride = count / Math.max(drawn, 1);
    const fallback = spacing(positions, count);
    const out = {
        positions: new Float32Array(drawn * 18),
        indices: new Uint32Array(drawn * 24),
        colors: colors === undefined ? undefined : new Float32Array(drawn * 24),
    };

    for (let p = 0; p < drawn; p++) {
        const i = Math.floor(p * stride);
        const r = sizes === undefined ? fallback : Math.min(Math.max(sizes[i], fallback * 0.25), fallback * 3);
        for (let c = 0; c < 6; c++) {
            for (let k = 0; k < 3; k++) {
                out.positions[(p * 6 + c) * 3 + k] = positions[i * 3 + k] + OCTA_CORNERS[c * 3 + k] * r;
            }

            if (out.colors !== undefined && colors !== undefined) {
                for (let k = 0; k < 4; k++) {
                    out.colors[(p * 6 + c) * 4 + k] = colors[i * 4 + k] / 255;
                }
            }
        }

        for (let f = 0; f < 24; f++) {
            out.indices[p * 24 + f] = p * 6 + OCTA_FACES[f];
        }
    }

    const geometry: Geometry = { positions: out.positions, indices: out.indices };
    if (out.colors !== undefined) {
        // Every point opaque: a solid has no use for a splat's fading edge.
        for (let i = 3; i < out.colors.length; i += 4) {
            out.colors[i] = 1;
        }
        geometry.colors = out.colors;
    }

    return { geometry, drawn };
}

/**
 * Draw Gaussian splat rows (the 32-byte rows Babylon's splat parsers and `.splat` files hold) as
 * small solids: each splat whose opacity is at least 0.1 becomes an octahedron the size of its
 * mean scale, in its color. Rotation is not drawn.
 * @param rows - The rows.
 * @returns The solids, and how many splats they draw.
 */
export function splatRowsToSolids(rows: ArrayBuffer): { geometry: Geometry; drawn: number } {
    const count = Math.floor(rows.byteLength / SPLAT_ROW_BYTES);
    const floats = new Float32Array(rows, 0, count * 8);
    const bytes = new Uint8Array(rows, 0, count * SPLAT_ROW_BYTES);
    const kept: number[] = [];
    for (let i = 0; i < count; i++) {
        if (bytes[i * SPLAT_ROW_BYTES + 27] >= MIN_SPLAT_ALPHA) {
            kept.push(i);
        }
    }

    const positions = new Float32Array(kept.length * 3);
    const colors = new Uint8Array(kept.length * 4);
    const sizes = new Float32Array(kept.length);
    kept.forEach((i, n) => {
        positions.set(floats.subarray(i * 8, i * 8 + 3), n * 3);
        colors.set(bytes.subarray(i * SPLAT_ROW_BYTES + 24, i * SPLAT_ROW_BYTES + 28), n * 4);
        // About two standard deviations across: where a splat looks solid.
        sizes[n] = ((floats[i * 8 + 3] + floats[i * 8 + 4] + floats[i * 8 + 5]) / 3) * 2;
    });

    return pointsToSolids(positions, colors, sizes);
}
