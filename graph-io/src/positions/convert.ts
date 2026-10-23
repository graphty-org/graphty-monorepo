/**
 * The coordinate conversions between a file's spelling and the neutral convention (center, y up):
 * the y flip, the top-left anchor shift, and `toFilePositions()`, the inverse a writer uses. Format
 * modules import from here, so they never pull in the reader.
 */

import type { PositionColumnExtra } from "./types.js";

/**
 * A y that grows downward as one that grows upward, and back: a negation that never yields -0.
 * @param y - the coordinate
 * @returns the flipped coordinate
 * @category Positions
 */
export function flipY(y: number): number {
    return y === 0 ? 0 : -y;
}

/**
 * How much longer a unit of y is than a unit of x, for a program that stretches its axes apart.
 * @param extra - how the file spells its coordinates
 * @returns `pxPerUnitY / pxPerUnit`, 1 when either is absent
 */
function yStretch(extra: PositionColumnExtra): number {
    return extra.pxPerUnit === undefined || extra.pxPerUnitY === undefined ? 1 : extra.pxPerUnitY / extra.pxPerUnit;
}

/**
 * One coordinate from a file's spelling into the neutral convention, in place.
 * @param p - x, y, z as the file wrote them; becomes the node's center, y up
 * @param extra - how the file spells it
 * @param size - the node's width and height, for a top-left anchor; null when unknown
 * @param realZ - whether the file has a z that differs between nodes
 */
export function toNeutral(
    p: [number, number, number],
    extra: PositionColumnExtra,
    size: readonly [number, number] | null,
    realZ: boolean,
): void {
    p[1] *= yStretch(extra);
    if (extra.anchor === "top-left" && size !== null) {
        p[0] += size[0] / 2;
        p[1] += extra.yAxis === "down" ? size[1] / 2 : -size[1] / 2;
    }
    p[2] = realZ ? p[2] - (extra.zOrigin ?? 0) : 0;
    if (extra.yAxis === "down") {
        // with a real z this turns the drawing 180 degrees about x, so a 3D shape is never mirrored
        p[1] = flipY(p[1]);
        p[2] = flipY(p[2]);
    }
}

/**
 * Neutral coordinates (center, y up, as `extractPositions()` returns them) back into a column
 * spelled as `extra` declares, for a writer: the y flip, Pajek's z origin and yEd's top-left corner
 * are undone. Rows that are NaN stay NaN.
 * @param coords - x, y, z per node
 * @param extra - the spelling of the column to write
 * @param sizes - each node's width and height, needed for a top-left anchor
 * @param sizes.width - widths by node index
 * @param sizes.height - heights by node index
 * @returns a new array, x, y, z per node in the file's spelling
 * @category Positions
 */
export function toFilePositions(
    coords: Float64Array,
    extra: PositionColumnExtra,
    sizes?: { width: Float64Array; height: Float64Array },
): Float64Array {
    const out = new Float64Array(coords.length);
    const down = extra.yAxis === "down";
    const stretch = yStretch(extra);
    for (let i = 0; i < coords.length; i += 3) {
        let y = coords[i + 1] / stretch;
        let z = coords[i + 2];
        if (down) {
            y = flipY(y);
            z = flipY(z);
        }
        out[i] = coords[i];
        out[i + 1] = y;
        out[i + 2] = z === 0 && extra.sourceDims !== 3 ? 0 : z + (extra.zOrigin ?? 0);
        const row = i / 3;
        if (extra.anchor === "top-left" && sizes !== undefined) {
            out[i] -= sizes.width[row] / 2;
            out[i + 1] -= down ? sizes.height[row] / 2 : -sizes.height[row] / 2;
        }
    }
    return out;
}

/**
 * The median of some numbers.
 * @param values - the numbers, reordered in place
 * @returns the median, or null for none
 * @category Positions
 */
export function median(values: number[]): number | null {
    if (values.length === 0) {
        return null;
    }
    values.sort((a, b) => a - b);
    const mid = values.length >> 1;
    return values.length % 2 === 1 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

/**
 * How each built-in writer that writes the position column as it stands spells a coordinate:
 * GML (y down, as yEd draws it) and Pajek (y down, z centered on 0.5). Every other built-in writer
 * either converts the neutral form itself (JSON, XGMML, CX, CX2, Cytoscape sessions, yEd graphics
 * in a styled GraphML) or writes a y-up format (GEXF, DOT).
 */
const WRITTEN_SPELLING: Readonly<Record<string, PositionColumnExtra>> = {
    gml: { yAxis: "down" },
    pajek: { yAxis: "down", zOrigin: 0.5 },
};

/**
 * Neutral coordinates (center, y up) as a built-in format's writer expects its position column, so
 * a graph whose positions are in the neutral form is written the way up its program draws it.
 * @example
 * ```ts
 * const column = writtenPositions("gml", coords); // y flipped for GML
 * ```
 * @param format - the format being written
 * @param coords - x, y, z per node; NaN for a node with no position
 * @returns the coordinates to write (the same array when the format needs no conversion)
 * @category Positions
 */
export function writtenPositions(format: string, coords: Float64Array): Float64Array {
    const spelling = WRITTEN_SPELLING[format];
    return spelling === undefined ? coords : toFilePositions(coords, spelling);
}
