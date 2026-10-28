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
import {
    baseName,
    cut,
    dirOf,
    type Findings,
    findReference,
    normalizePath,
    refuse,
    resolveReference,
    roleOfName,
    textureBytesOf,
} from "./references";

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

/** A number an MTL option takes; the same matches as `^-?\d*\.?\d+(e[-+]?\d+)?$`, without backtracking. */
const NUMBER = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[-+]?\d+)?$/i;

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
        while (taken < most && i < tokens.length - 1 && (most === 1 || NUMBER.test(tokens[i]))) {
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
 * The `mtllib` file names an OBJ's text holds.
 * @param text - The OBJ.
 * @returns The names, in order.
 */
function mtlNames(text: string): string[] {
    return text
        .split("\n")
        .map((raw) => raw.trim())
        .filter((line) => line.startsWith("mtllib"))
        .map((line) => line.slice(6).trim());
}

/**
 * The picture file names an MTL's text holds.
 * @param text - The MTL.
 * @returns The names, in order.
 */
function mapNames(text: string): string[] {
    const names: string[] = [];
    for (const raw of text.split("\n")) {
        const tokens = raw.trim().split(/\s+/);
        if (MAP_STATEMENT.test(tokens[0] ?? "")) {
            names.push(mapFileName(tokens.slice(1)));
        }
    }

    return names;
}

/**
 * Look up every file an OBJ names -- its `.mtl` files and the pictures they name -- before the
 * scan, so every missing or ambiguous part is found at once (design 12.4). The pictures of an
 * `.mtl` that is missing are found once it is in.
 * @param path - The OBJ's path in the set.
 * @param files - The set.
 * @param limits - The limits in force.
 * @param findings - Where missing parts and substitutions go.
 */
export function findObjParts(
    path: string,
    files: ReadonlyMap<string, Uint8Array>,
    limits: ModelLimits,
    findings: Findings,
): void {
    for (const name of mtlNames(textOf(files.get(path) as Uint8Array, limits))) {
        const mtl = findReference(name, path, files, "materials", findings);
        if (mtl !== undefined) {
            for (const image of mapNames(textOf(mtl.bytes, limits))) {
                findReference(image, mtl.path, files, "texture", findings);
            }
        }
    }
}

/**
 * Whether an OBJ face corner's vertex index can name a vertex: not zero, and a negative one no
 * further back than the vertices read so far.
 * @param v - The index.
 * @param vertices - The vertices read so far.
 * @returns True when it can.
 */
function isValidCorner(v: number, vertices: number): boolean {
    if (!Number.isInteger(v) || v === 0) {
        return false;
    }

    return v > 0 ? v <= Number.MAX_SAFE_INTEGER : -v <= vertices;
}

/**
 * Whether a trimmed OBJ line starts with a keyword followed by a space or a tab.
 * @param line - The line.
 * @param keyword - The keyword.
 * @returns True on a match.
 */
function isStatement(line: string, keyword: string): boolean {
    return line.startsWith(`${keyword} `) || line.startsWith(`${keyword}\t`);
}

/**
 * Check an OBJ `f` line's corners and add its triangles to the running count.
 * @param line - The trimmed line.
 * @param vertices - The vertices read so far.
 * @param triangles - The triangles counted so far.
 * @param limits - The limits in force.
 * @returns The new triangle count.
 */
function addFace(line: string, vertices: number, triangles: number, limits: ModelLimits): number {
    const corners = line.split(/\s+/).slice(1);
    for (const corner of corners) {
        if (!isValidCorner(Number(corner.split("/")[0]), vertices)) {
            refuse("E_MODEL_STRUCTURE", { rule: "index", where: "obj.f" });
        }
    }

    const total = triangles + Math.max(0, corners.length - 2);
    if (total > limits.maxTriangles) {
        refuse("E_MODEL_TOO_LARGE", { what: "triangles", found: total, limit: limits.maxTriangles });
    }

    return total;
}

/** What one pass over an OBJ's lines finds. */
interface ObjGeometry {
    vertices: number;
    triangles: number;
    groups: number;
    readonly mtlFiles: string[];
    readonly box: Box;
}

/**
 * Read an OBJ's vertices, faces, groups and `mtllib` names, checking each face as it comes.
 * @param text - The OBJ.
 * @param limits - The limits in force.
 * @returns What it holds.
 */
function readObjGeometry(text: string, limits: ModelLimits): ObjGeometry {
    const found: ObjGeometry = { vertices: 0, triangles: 0, groups: 0, mtlFiles: [], box: new Box() };
    for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (isStatement(line, "v")) {
            found.vertices++;
            const [, x, y, z] = line.split(/\s+/);
            found.box.add(Number(x), Number(y), Number(z));
        } else if (isStatement(line, "f")) {
            found.triangles = addFace(line, found.vertices, found.triangles, limits);
        } else if (line.startsWith("o ") || line.startsWith("g ")) {
            found.groups++;
        } else if (line.startsWith("mtllib")) {
            found.mtlFiles.push(line.slice(6).trim());
        }
    }

    return found;
}

/**
 * Refuse a positive face index past the last vertex the file has.
 * @param text - The OBJ.
 * @param vertices - How many vertices it has.
 */
function checkPositiveIndices(text: string, vertices: number): void {
    for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (!isStatement(line, "f")) {
            continue;
        }

        for (const corner of line.split(/\s+/).slice(1)) {
            if (Number(corner.split("/")[0]) > vertices) {
                refuse("E_MODEL_STRUCTURE", { rule: "index", where: "obj.f" });
            }
        }
    }
}

/** What the MTL files of an OBJ hold. */
interface MtlTally {
    readonly materials: string[];
    readonly textures: Set<string>;
    textureBytes: number;
    transparent: boolean;
}

/**
 * Whether an MTL statement makes its material see-through (`d` under 1, `Tr` over 0).
 * @param tokens - The statement's tokens.
 * @returns True when it does.
 */
function isTransparency(tokens: readonly string[]): boolean {
    return (tokens[0] === "d" && Number(tokens[1]) < 1) || (tokens[0] === "Tr" && Number(tokens[1]) > 0);
}

/**
 * Count a picture an MTL names, once per file, against the texture byte limit.
 * @param name - The name in the statement.
 * @param mtlPath - The MTL's path in the set.
 * @param files - The set.
 * @param limits - The limits in force.
 * @param tally - Where it is counted.
 */
function addTexture(
    name: string,
    mtlPath: string,
    files: ReadonlyMap<string, Uint8Array>,
    limits: ModelLimits,
    tally: MtlTally,
): void {
    const image = resolveReference(name, mtlPath, files);
    if (tally.textures.has(image.path)) {
        return;
    }

    tally.textures.add(image.path);
    tally.textureBytes += textureBytesOf(image.bytes, image.path);
    if (tally.textureBytes > limits.maxTextureBytes) {
        refuse("E_MODEL_TOO_LARGE", {
            what: "textureBytes",
            found: tally.textureBytes,
            limit: limits.maxTextureBytes,
        });
    }
}

/**
 * Read the materials, transparency and pictures of every MTL an OBJ names.
 * @param mtlFiles - The `mtllib` names, in order.
 * @param path - The OBJ's path in the set.
 * @param files - The set.
 * @param limits - The limits in force.
 * @returns What they hold.
 */
function readMtls(
    mtlFiles: readonly string[],
    path: string,
    files: ReadonlyMap<string, Uint8Array>,
    limits: ModelLimits,
): MtlTally {
    const tally: MtlTally = { materials: [], textures: new Set(), textureBytes: 0, transparent: false };
    for (const name of mtlFiles) {
        const mtl = resolveReference(name, path, files);
        for (const raw of textOf(mtl.bytes, limits).split("\n")) {
            const tokens = raw.trim().split(/\s+/);
            const keyword = tokens[0] ?? "";
            if (keyword === "newmtl") {
                tally.materials.push(cut(tokens.slice(1).join(" ")));
            } else if (isTransparency(tokens)) {
                tally.transparent = true;
            } else if (MAP_STATEMENT.test(keyword)) {
                addTexture(mapFileName(tokens.slice(1)), mtl.path, files, limits, tally);
            }
        }
    }

    return tally;
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
    const { vertices, triangles, groups, mtlFiles, box } = readObjGeometry(text, limits);

    // A positive index may only name a vertex the file has.
    checkPositiveIndices(text, vertices);

    const { materials, textures, textureBytes, transparent } = readMtls(mtlFiles, path, files, limits);
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
 * An ASCII STL `facet` or `vertex` statement at a line start. Only spaces and tabs (never a line
 * end) before the keyword, so no two line starts share a whitespace run and the scan stays linear;
 * the matches are those of `^\s*(facet|vertex)...`.
 */
const STL_STATEMENT = /^[^\S\n\r\u2028\u2029]*(facet|vertex)\s+(\S+)\s+(\S+)\s+(\S+)/gm; // NOSONAR(S5869): \S and the line ends do not overlap

/**
 * Refuse an STL with more triangles than the limit.
 * @param triangles - Its triangles.
 * @param limits - The limits in force.
 */
function checkStlTriangles(triangles: number, limits: ModelLimits): void {
    if (triangles > limits.maxTriangles) {
        refuse("E_MODEL_TOO_LARGE", { what: "triangles", found: triangles, limit: limits.maxTriangles });
    }
}

/**
 * Count a binary STL's triangles and bound its vertices.
 * @param view - The file.
 * @param limits - The limits in force.
 * @param box - Where the vertices go.
 * @returns The triangles.
 */
function readBinaryStl(view: DataView, limits: ModelLimits, box: Box): number {
    const triangles = view.getUint32(80, true);
    checkStlTriangles(triangles, limits);
    for (let t = 0; t < triangles; t++) {
        for (let v = 0; v < 3; v++) {
            const at = 84 + t * 50 + 12 + v * 12;
            box.add(view.getFloat32(at, true), view.getFloat32(at + 4, true), view.getFloat32(at + 8, true));
        }
    }

    return triangles;
}

/**
 * Count an ASCII STL's facets and bound its vertices.
 * @param bytes - The file.
 * @param limits - The limits in force.
 * @param box - Where the vertices go.
 * @returns The triangles.
 */
function readAsciiStl(bytes: Uint8Array, limits: ModelLimits, box: Box): number {
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, 5));
    if (head !== "solid") {
        // Neither ASCII nor a binary file whose length matches its triangle count.
        refuse("E_MODEL_STRUCTURE", { rule: "length" });
    }

    const text = textOf(bytes, limits);
    let triangles = 0;
    for (const match of text.matchAll(STL_STATEMENT)) {
        if (match[1] === "facet") {
            triangles++;
        } else {
            box.add(Number(match[2]), Number(match[3]), Number(match[4]));
        }
    }

    checkStlTriangles(triangles, limits);
    return triangles;
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
    const isBinary = bytes.length >= 84 && bytes.length === 84 + 50 * view.getUint32(80, true);
    const triangles = isBinary ? readBinaryStl(view, limits, box) : readAsciiStl(bytes, limits, box);

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

/** One `element` of a PLY header. */
interface PlyElement {
    readonly name: string;
    readonly count: number;
    size: number;
    listMin: number;
    readonly properties: string[];
}

/**
 * Add a `property` line to its element: a scalar's bytes, or a list's least bytes.
 * @param element - The element it belongs to.
 * @param tokens - The line's tokens.
 */
function addPlyProperty(element: PlyElement, tokens: readonly string[]): void {
    if (tokens[1] === "list") {
        // A list holds its length, then at least three entries for a face.
        element.listMin += (PLY_TYPES[tokens[2]] ?? 1) + 3 * (PLY_TYPES[tokens[3]] ?? 1);
    } else {
        element.size += PLY_TYPES[tokens[1]] ?? 4;
    }

    element.properties.push(tokens.at(-1) ?? "");
}

/**
 * Read a PLY header's format and elements.
 * @param header - The header text before `end_header`.
 * @returns The format and the elements, in order.
 */
function readPlyHeader(header: string): { format: string; elements: PlyElement[] } {
    let format = "";
    const elements: PlyElement[] = [];
    for (const line of header.split(/\r?\n/)) {
        const tokens = line.trim().split(/\s+/);
        if (tokens[0] === "format") {
            format = tokens[1] ?? "";
        } else if (tokens[0] === "element") {
            const count = Number(tokens[2]);
            if (!Number.isSafeInteger(count) || count < 0) {
                refuse("E_MODEL_STRUCTURE", { rule: "header" });
            }

            elements.push({ name: tokens[1] ?? "", count, size: 0, listMin: 0, properties: [] });
        } else if (tokens[0] === "property") {
            const element = elements.at(-1);
            if (element !== undefined) {
                addPlyProperty(element, tokens);
            }
        }
    }

    return { format, elements };
}

/**
 * Refuse a PLY body too short for the elements its header declares.
 * @param bytes - The file.
 * @param headerLength - Where the body starts.
 * @param format - The header's format.
 * @param elements - The header's elements.
 * @param limits - The limits in force.
 */
function checkPlyBody(
    bytes: Uint8Array,
    headerLength: number,
    format: string,
    elements: readonly PlyElement[],
    limits: ModelLimits,
): void {
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
        if (needed > bytes.length - headerLength) {
            refuse("E_MODEL_STRUCTURE", { rule: "length" });
        }
    } else {
        refuse("E_MODEL_STRUCTURE", { rule: "header" });
    }
}

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

    const { format, elements } = readPlyHeader(headText.slice(0, end));
    const vertex = elements.find((e) => e.name === "vertex");
    const face = elements.find((e) => e.name === "face");
    if (vertex?.properties.some((p) => p.startsWith("f_dc_") || p.startsWith("scale_")) === true) {
        refuse("E_MODEL_FORMAT_UNSUPPORTED", { format: "splat" });
    }

    if (face === undefined || face.count === 0) {
        refuse("E_MODEL_FORMAT_UNSUPPORTED", { format: "points" });
    }

    checkPlyBody(bytes, headerLength, format, elements, limits);
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

/** A 1 x 1 white PNG: what a skipped picture is drawn as, so a material's own color still applies. */
export const WHITE_PNG = Uint8Array.from(
    atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg=="),
    (c) => c.codePointAt(0) ?? 0,
);

/**
 * A file set with its skipped parts filled in (design 12.4): a skipped picture is a 1 x 1 white
 * PNG, a skipped `.mtl` an empty one (the OBJ draws with the default material), and for drawing an
 * OBJ (`dropMaps`) every MTL line naming a skipped picture is removed. A skipped name the set
 * holds is left as it is.
 * @param files - The set as given.
 * @param skipped - The parts drawn without.
 * @param dropMaps - Also remove the MTL lines naming a skipped picture.
 * @returns The set to check or draw.
 */
export function withSkips(
    files: ReadonlyMap<string, Uint8Array>,
    skipped: readonly string[],
    dropMaps = false,
): ReadonlyMap<string, Uint8Array> {
    if (skipped.length === 0) {
        return files;
    }

    const out = new Map(files);
    for (const name of skipped) {
        if (!out.has(name)) {
            out.set(name, roleOfName(name) === "materials" ? new Uint8Array(0) : WHITE_PNG);
        }
    }

    if (dropMaps) {
        const gone = new Set(skipped.map((name) => name.toLowerCase()));
        for (const [path, bytes] of out) {
            if (!/\.mtl$/i.test(path) || bytes.length === 0) {
                continue;
            }

            const kept = new TextDecoder()
                .decode(bytes)
                .split("\n")
                .filter((raw) => {
                    const tokens = raw.trim().split(/\s+/);
                    if (!MAP_STATEMENT.test(tokens[0] ?? "")) {
                        return true;
                    }

                    const name = mapFileName(tokens.slice(1)).replaceAll("\\", "/");
                    const resolved = (normalizePath(dirOf(path) + name) ?? name).toLowerCase();
                    return !gone.has(resolved) && !gone.has(baseName(name).toLowerCase());
                });
            out.set(path, new TextEncoder().encode(kept.join("\n")));
        }
    }

    return out;
}
