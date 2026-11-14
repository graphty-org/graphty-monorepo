/**
 * @file graphty-element's own STL reader, binary and ASCII.
 *
 * Babylon.js's STL loader draws nothing for an unnamed `solid` line or an `endsolid` whose name
 * differs, uses a file's zero facet normals as given, and drops color. This one reads every
 * `vertex` line of every solid, takes normals from the winding, and expands both binary color
 * conventions per vertex:
 * - VisCAM / SolidView: bit 15 set means the face has a color, red in bits 10-14, blue in 0-4;
 * - Materialise Magics (the header holds `COLOR=r g b a`): bit 15 clear means the face has its
 *   own color, red in bits 0-4, blue in 10-14; set means the header's color.
 *
 * Babylon-free, so the intake scan reads the same facts the drawing does.
 */

import { type Geometry, toLeftHanded } from "./geometry";

/** How an STL is stored, and whether its faces carry colors. */
export interface StlFacts {
    readonly encoding: "ascii" | "binary";
    readonly triangles: number;
    readonly vertexColors: boolean;
}

/**
 * Whether an STL is binary: 80 header bytes, a count, 50 bytes per triangle, exactly.
 * @param bytes - The file.
 * @returns True for a binary STL.
 */
function isBinaryStlBytes(bytes: Uint8Array): boolean {
    if (bytes.length < 84) {
        return false;
    }

    const count = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true);
    return bytes.length === 84 + 50 * count;
}

/**
 * The Materialise default color in a binary STL header, if any.
 * @param bytes - The file.
 * @returns r, g, b, a (0 to 255), or undefined when the header names none.
 */
function materialiseColor(bytes: Uint8Array): number[] | undefined {
    const header = new TextDecoder("latin1").decode(bytes.subarray(0, 80));
    const at = header.indexOf("COLOR=");
    if (at < 0 || at + 10 > 80) {
        return undefined;
    }

    return [0, 1, 2, 3].map((k) => bytes[at + 6 + k]);
}

/**
 * Whether a binary STL's faces carry colors.
 * @param bytes - The file.
 * @returns True when the header names a Materialise color or any face sets bit 15.
 */
function binaryHasColors(bytes: Uint8Array): boolean {
    if (materialiseColor(bytes) !== undefined) {
        return true;
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const count = view.getUint32(80, true);
    for (let t = 0; t < count; t++) {
        if ((view.getUint16(84 + t * 50 + 48, true) & 0x8000) !== 0) {
            return true;
        }
    }

    return false;
}

/** An ASCII `vertex x y z` statement; `\S+` and spaces do not overlap, so the scan is linear. */
const VERTEX = /vertex[ \t]+(\S+)[ \t]+(\S+)[ \t]+(\S+)/g;

/**
 * The facts of an STL, without building its geometry.
 * @param bytes - The file.
 * @param text - Its text, for an ASCII file (decoded by the caller, under its text limit).
 * @returns The facts.
 */
export function stlFacts(bytes: Uint8Array, text?: string): StlFacts {
    if (isBinaryStlBytes(bytes)) {
        const triangles = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true);
        return { encoding: "binary", triangles, vertexColors: binaryHasColors(bytes) };
    }

    let vertices = 0;
    for (const _ of (text ?? new TextDecoder().decode(bytes)).matchAll(VERTEX)) {
        vertices++;
    }

    return { encoding: "ascii", triangles: Math.floor(vertices / 3), vertexColors: false };
}

/**
 * Read a binary STL's triangles and colors.
 * @param bytes - The file.
 * @returns The geometry, one vertex per triangle corner.
 */
function readBinary(bytes: Uint8Array): Geometry {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const count = view.getUint32(80, true);
    const positions = new Float32Array(count * 9);
    const fallback = materialiseColor(bytes);
    const colored = binaryHasColors(bytes);
    const colors = colored ? new Float32Array(count * 12) : undefined;
    for (let t = 0; t < count; t++) {
        const at = 84 + t * 50;
        for (let k = 0; k < 9; k++) {
            positions[t * 9 + k] = view.getFloat32(at + 12 + k * 4, true);
        }

        if (colors !== undefined) {
            const rgb = faceColor(view.getUint16(at + 48, true), fallback);
            for (let v = 0; v < 3; v++) {
                colors.set(rgb, (t * 3 + v) * 4);
            }
        }
    }

    const geometry: Geometry = { positions, indices: sequence(count * 3) };
    if (colors !== undefined) {
        geometry.colors = colors;
    }

    return geometry;
}

/**
 * One face's color, 0 to 1.
 * @param word - The face's attribute word.
 * @param fallback - The Materialise header color, when the file is a Materialise one.
 * @returns r, g, b, a.
 */
function faceColor(word: number, fallback: number[] | undefined): [number, number, number, number] {
    const five = (shift: number): number => ((word >> shift) & 31) / 31;
    if (fallback !== undefined) {
        return (word & 0x8000) === 0
            ? [five(0), five(5), five(10), 1]
            : [fallback[0] / 255, fallback[1] / 255, fallback[2] / 255, 1];
    }

    return (word & 0x8000) === 0 ? [1, 1, 1, 1] : [five(10), five(5), five(0), 1];
}

/**
 * 0, 1, 2, ... n-1.
 * @param n - How many.
 * @returns The indices.
 */
function sequence(n: number): Uint32Array {
    const out = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
        out[i] = i;
    }

    return out;
}

/**
 * Read an ASCII STL: every `vertex` line, three to a triangle, whatever the solids are named.
 * @param text - The file's text.
 * @returns The geometry.
 */
function readAscii(text: string): Geometry {
    const values: number[] = [];
    for (const match of text.matchAll(VERTEX)) {
        values.push(Number(match[1]), Number(match[2]), Number(match[3]));
    }

    const usable = values.length - (values.length % 9);
    return { positions: Float32Array.from(values.slice(0, usable)), indices: sequence(usable / 3) };
}

/**
 * Read an STL into geometry, in Babylon's left-handed space with the file's up axis kept.
 * Normals are left to be computed from the winding.
 * @param bytes - The file.
 * @returns The geometry.
 */
export function readStl(bytes: Uint8Array): Geometry {
    const geometry = isBinaryStlBytes(bytes) ? readBinary(bytes) : readAscii(new TextDecoder().decode(bytes));
    return toLeftHanded(geometry);
}
