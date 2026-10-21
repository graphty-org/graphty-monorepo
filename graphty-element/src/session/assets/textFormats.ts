/**
 * @file Cheap scans of OBJ, STL and PLY before anything parses them for drawing.
 *
 * - OBJ: every `f` line's vertex indices are in range (no zero, no index past the vertices, no
 *   negative index reaching before the first), triangles are counted against the limit, and the
 *   `mtllib` files and the `map_*` files inside them pass the reference allowlist.
 * - STL: a binary file's declared triangle count matches its length; an ASCII file's facets are
 *   counted.
 * - PLY: the header's vertex and face counts fit the file's length.
 *
 * Text formats parse on the main thread, so they also have the lower text byte limit.
 */

import type { CodedFact } from "../shared";
import type { ModelLimits, ModelSummary } from "./AssetsApi";
import { cut, refuse, resolveReference, textureBytesOf } from "./references";

/** What a scan returns. */
export interface Scanned {
    readonly summary: ModelSummary;
    readonly warnings: readonly CodedFact[];
}

/** The MTL statements that name a texture file. */
const MAP_STATEMENT = /^(?:map_\w+|bump|disp|decal|refl|norm)$/i;

/** MTL texture options and how many values each takes (`-o` takes up to three numbers). */
const OPTION_ARGS: Readonly<Record<string, number>> = {
    "-blendu": 1,
    "-blendv": 1,
    "-boost": 1,
    "-cc": 1,
    "-clamp": 1,
    "-imfchan": 1,
    "-texres": 1,
    "-type": 1,
    "-bm": 1,
    "-mm": 2,
    "-o": 3,
    "-s": 3,
    "-t": 3,
};

/**
 * The file name in an MTL texture statement, after its option flags.
 * @param tokens - The statement's tokens after the keyword.
 * @returns The file name (which may contain spaces).
 */
export function mapFileName(tokens: readonly string[]): string {
    let i = 0;
    while (i < tokens.length && tokens[i].startsWith("-") && tokens[i].toLowerCase() in OPTION_ARGS) {
        const most = OPTION_ARGS[tokens[i].toLowerCase()];
        i++;
        // Numeric options take up to `most` numbers; the others exactly one value.
        let taken = 0;
        while (
            taken < most &&
            i < tokens.length - 1 &&
            (most === 1 || /^-?\d*\.?\d+(?:e[-+]?\d+)?$/i.test(tokens[i]))
        ) {
            i++;
            taken++;
        }
    }

    return tokens.slice(i).join(" ");
}

/**
 * Decode text, refusing a file over the text limit.
 * @param bytes - The file.
 * @param limits - The limits in force.
 * @returns The text.
 */
function textOf(bytes: Uint8Array, limits: ModelLimits): string {
    if (bytes.length > limits.maxTextBytes) {
        refuse("E_MODEL_TOO_LARGE", { what: "bytes", found: bytes.length, limit: limits.maxTextBytes });
    }

    return new TextDecoder("utf-8").decode(bytes);
}

/**
 * The fields of a summary that a text format has nothing to say about.
 * @param format - The format.
 * @param upAxis - The axis assumed up.
 * @returns The fields.
 */
function baseSummary(
    format: string,
    upAxis: "y" | "z",
): Omit<ModelSummary, "triangles" | "meshes" | "materials" | "textures" | "textureBytes"> {
    return {
        format,
        upAxis,
        animations: Object.freeze([]),
        skinned: false,
        morphTargets: 0,
        transparent: false,
        extensionsRequired: Object.freeze([]),
    };
}

/** A running min/max box. */
class Box {
    readonly min: [number, number, number] = [Infinity, Infinity, Infinity];
    readonly max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

    add(x: number, y: number, z: number): void {
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
            this.min[0] = Math.min(this.min[0], x);
            this.min[1] = Math.min(this.min[1], y);
            this.min[2] = Math.min(this.min[2], z);
            this.max[0] = Math.max(this.max[0], x);
            this.max[1] = Math.max(this.max[1], y);
            this.max[2] = Math.max(this.max[2], z);
        }
    }

    get value(): ModelSummary["bounds"] {
        return this.min[0] === Infinity ? undefined : Object.freeze({ min: this.min, max: this.max });
    }
}

/**
 * Scan an OBJ and the MTL files it names.
 * @param path - The OBJ's path in the set.
 * @param files - The set.
 * @param limits - The limits in force.
 * @returns The summary.
 */
export function scanObj(path: string, files: ReadonlyMap<string, Uint8Array>, limits: ModelLimits): Scanned {
    const text = textOf(files.get(path) as Uint8Array, limits);
    let vertices = 0;
    let triangles = 0;
    let groups = 0;
    const mtlFiles: string[] = [];
    const box = new Box();

    for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (line.startsWith("v ") || line.startsWith("v\t")) {
            vertices++;
            const [, x, y, z] = line.split(/\s+/);
            box.add(Number(x), Number(y), Number(z));
        } else if (line.startsWith("f ") || line.startsWith("f\t")) {
            const corners = line.split(/\s+/).slice(1);
            for (const corner of corners) {
                const v = Number(corner.split("/")[0]);
                const valid = Number.isInteger(v) && v !== 0 && (v > 0 ? v <= Number.MAX_SAFE_INTEGER : -v <= vertices);
                if (!valid) {
                    refuse("E_MODEL_STRUCTURE", { rule: "index", where: "obj.f" });
                }
            }

            triangles += Math.max(0, corners.length - 2);
            if (triangles > limits.maxTriangles) {
                refuse("E_MODEL_TOO_LARGE", { what: "triangles", found: triangles, limit: limits.maxTriangles });
            }
        } else if (line.startsWith("o ") || line.startsWith("g ")) {
            groups++;
        } else if (line.startsWith("mtllib")) {
            mtlFiles.push(line.slice(6).trim());
        }
    }

    // A positive index may only name a vertex the file has.
    for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (line.startsWith("f ") || line.startsWith("f\t")) {
            for (const corner of line.split(/\s+/).slice(1)) {
                if (Number(corner.split("/")[0]) > vertices) {
                    refuse("E_MODEL_STRUCTURE", { rule: "index", where: "obj.f" });
                }
            }
        }
    }

    const materials: string[] = [];
    const textures = new Set<string>();
    let textureBytes = 0;
    let transparent = false;
    for (const name of mtlFiles) {
        const mtl = resolveReference(name, path, files);
        for (const raw of textOf(mtl.bytes, limits).split("\n")) {
            const tokens = raw.trim().split(/\s+/);
            const keyword = tokens[0] ?? "";
            if (keyword === "newmtl") {
                materials.push(cut(tokens.slice(1).join(" ")));
            } else if ((keyword === "d" && Number(tokens[1]) < 1) || (keyword === "Tr" && Number(tokens[1]) > 0)) {
                transparent = true;
            } else if (MAP_STATEMENT.test(keyword)) {
                const image = resolveReference(mapFileName(tokens.slice(1)), mtl.path, files);
                if (!textures.has(image.path)) {
                    textures.add(image.path);
                    textureBytes += textureBytesOf(image.bytes, image.path);
                    if (textureBytes > limits.maxTextureBytes) {
                        refuse("E_MODEL_TOO_LARGE", {
                            what: "textureBytes",
                            found: textureBytes,
                            limit: limits.maxTextureBytes,
                        });
                    }
                }
            }
        }
    }

    const bounds = box.value;
    return {
        summary: Object.freeze({
            ...baseSummary("obj", "y"),
            triangles,
            meshes: Math.max(groups, 1),
            materials: Object.freeze(materials),
            textures: textures.size,
            textureBytes,
            transparent,
            ...(bounds === undefined ? {} : { bounds }),
        }),
        warnings: [],
    };
}

/**
 * Scan an STL, binary or ASCII.
 * @param bytes - The file.
 * @param limits - The limits in force.
 * @returns The summary.
 */
export function scanStl(bytes: Uint8Array, limits: ModelLimits): Scanned {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const box = new Box();
    let triangles: number;
    const isBinary = bytes.length >= 84 && bytes.length === 84 + 50 * view.getUint32(80, true);
    if (isBinary) {
        triangles = view.getUint32(80, true);
        if (triangles > limits.maxTriangles) {
            refuse("E_MODEL_TOO_LARGE", { what: "triangles", found: triangles, limit: limits.maxTriangles });
        }

        for (let t = 0; t < triangles; t++) {
            for (let v = 0; v < 3; v++) {
                const at = 84 + t * 50 + 12 + v * 12;
                box.add(view.getFloat32(at, true), view.getFloat32(at + 4, true), view.getFloat32(at + 8, true));
            }
        }
    } else {
        const head = new TextDecoder("latin1").decode(bytes.subarray(0, 5));
        if (head !== "solid") {
            // Neither ASCII nor a binary file whose length matches its triangle count.
            refuse("E_MODEL_STRUCTURE", { rule: "length" });
        }

        const text = textOf(bytes, limits);
        triangles = 0;
        for (const match of text.matchAll(/^\s*(facet|vertex)\s+(\S+)\s+(\S+)\s+(\S+)/gm)) {
            if (match[1] === "facet") {
                triangles++;
            } else {
                box.add(Number(match[2]), Number(match[3]), Number(match[4]));
            }
        }

        if (triangles > limits.maxTriangles) {
            refuse("E_MODEL_TOO_LARGE", { what: "triangles", found: triangles, limit: limits.maxTriangles });
        }
    }

    const bounds = box.value;
    return {
        summary: Object.freeze({
            ...baseSummary("stl", "z"),
            triangles,
            meshes: 1,
            materials: Object.freeze([]),
            textures: 0,
            textureBytes: 0,
            ...(bounds === undefined ? {} : { bounds }),
        }),
        warnings: [{ code: "W_MODEL_UP_GUESSED", params: { format: "stl", up: "z" } }],
    };
}

/** Bytes per PLY scalar type. */
const PLY_TYPES: Readonly<Record<string, number>> = {
    char: 1,
    uchar: 1,
    int8: 1,
    uint8: 1,
    short: 2,
    ushort: 2,
    int16: 2,
    uint16: 2,
    int: 4,
    uint: 4,
    int32: 4,
    uint32: 4,
    float: 4,
    float32: 4,
    double: 8,
    float64: 8,
};

/**
 * Scan a PLY header against the file's length.
 * @param bytes - The file.
 * @param limits - The limits in force.
 * @returns The summary.
 */
export function scanPly(bytes: Uint8Array, limits: ModelLimits): Scanned {
    const headText = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 65536)));
    const end = headText.indexOf("end_header");
    if (end < 0) {
        refuse("E_MODEL_STRUCTURE", { rule: "header" });
    }

    const headerLength = headText.indexOf("\n", end) + 1;
    if (headerLength === 0) {
        refuse("E_MODEL_STRUCTURE", { rule: "header" });
    }

    let format = "";
    const elements: { name: string; count: number; size: number; listMin: number; properties: string[] }[] = [];
    for (const line of headText.slice(0, end).split(/\r?\n/)) {
        const tokens = line.trim().split(/\s+/);
        if (tokens[0] === "format") {
            format = tokens[1] ?? "";
        } else if (tokens[0] === "element") {
            const count = Number(tokens[2]);
            if (!Number.isSafeInteger(count) || count < 0) {
                refuse("E_MODEL_STRUCTURE", { rule: "header" });
            }

            elements.push({ name: tokens[1] ?? "", count, size: 0, listMin: 0, properties: [] });
        } else if (tokens[0] === "property" && elements.length > 0) {
            const element = elements[elements.length - 1];
            if (tokens[1] === "list") {
                // A list holds its length, then at least three entries for a face.
                element.listMin += (PLY_TYPES[tokens[2]] ?? 1) + 3 * (PLY_TYPES[tokens[3]] ?? 1);
            } else {
                element.size += PLY_TYPES[tokens[1]] ?? 4;
            }

            element.properties.push(tokens.at(-1) ?? "");
        }
    }

    const vertex = elements.find((e) => e.name === "vertex");
    const face = elements.find((e) => e.name === "face");
    if (vertex?.properties.some((p) => p.startsWith("f_dc_") || p.startsWith("scale_")) === true) {
        refuse("E_MODEL_FORMAT_UNSUPPORTED", { format: "splat" });
    }

    if (face === undefined || face.count === 0) {
        refuse("E_MODEL_FORMAT_UNSUPPORTED", { format: "points" });
    }

    const body = bytes.length - headerLength;
    if (format === "ascii") {
        textOf(bytes, limits);
        let lines = 0;
        for (let i = headerLength; i < bytes.length; i++) {
            if (bytes[i] === 0x0a) {
                lines++;
            }
        }

        const needed = elements.reduce((sum, e) => sum + e.count, 0);
        if (needed > lines + 1) {
            refuse("E_MODEL_STRUCTURE", { rule: "length" });
        }
    } else if (format === "binary_little_endian" || format === "binary_big_endian") {
        const needed = elements.reduce((sum, e) => sum + e.count * (e.size + e.listMin), 0);
        if (needed > body) {
            refuse("E_MODEL_STRUCTURE", { rule: "length" });
        }
    } else {
        refuse("E_MODEL_STRUCTURE", { rule: "header" });
    }

    if (face.count > limits.maxTriangles) {
        refuse("E_MODEL_TOO_LARGE", { what: "triangles", found: face.count, limit: limits.maxTriangles });
    }

    return {
        summary: Object.freeze({
            ...baseSummary("ply", "y"),
            triangles: face.count,
            meshes: 1,
            materials: Object.freeze([]),
            textures: 0,
            textureBytes: 0,
        }),
        warnings: [{ code: "W_MODEL_UP_GUESSED", params: { format: "ply", up: "y" } }],
    };
}
