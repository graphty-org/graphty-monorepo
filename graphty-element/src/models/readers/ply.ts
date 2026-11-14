/**
 * @file graphty-element's own PLY reader: ASCII, little-endian and big-endian binary, every PLY
 * scalar and list type.
 *
 * What a PLY holds decides what it draws:
 * - faces: a mesh, each face a fan of triangles, with the vertices' normals, texture coordinates
 *   (`s t`, `u v`, `texture_u texture_v`) and colors (`red green blue alpha`, uchar or float);
 * - no faces: a point cloud, each point drawn as a small solid in its color;
 * - `f_dc_0` and `opacity` on the vertices: a Gaussian splat, each splat a small solid;
 * - a `chunk` element and `packed_position` on the vertices: PlayCanvas's compressed splat.
 *
 * Babylon.js's own PLY reading decodes only little-endian binary and corrupts the faces after a
 * quad, so it is not used. Babylon-free, so the intake scan reads the same header the drawing does.
 */

import {
    type Geometry,
    ModelReadError,
    pointsToSolids,
    SPLAT_ROW_BYTES,
    splatRowsToSolids,
    toLeftHanded,
} from "./geometry";

/** Bytes per PLY scalar type. */
const SIZES: Readonly<Record<string, number>> = {
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

/** One `property` line. */
interface PlyProperty {
    readonly name: string;
    readonly type: string;
    /** For a list: the type of its length. */
    readonly countType?: string;
}

/** One `element` line and its properties, in order. */
interface PlyElement {
    readonly name: string;
    readonly count: number;
    readonly properties: PlyProperty[];
}

/** A PLY header. */
export interface PlyHeader {
    /** `ascii`, `binary_little_endian` or `binary_big_endian`. */
    readonly format: string;
    readonly elements: PlyElement[];
    /** The `comment` lines' text, for `TextureFile`. */
    readonly comments: string[];
    /** Where the body starts. */
    readonly bodyAt: number;
}

/** What a PLY holds, by the properties of its elements. */
export type PlyGeometryKind = "mesh" | "points" | "splats";

/**
 * Read a PLY header.
 * @param bytes - The file.
 * @returns The header.
 * @throws {ModelReadError} `header` for a header that does not end or names an unknown type.
 */
export function readPlyHeader(bytes: Uint8Array): PlyHeader {
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 65536)));
    const end = head.indexOf("end_header");
    const bodyAt = end < 0 ? 0 : head.indexOf("\n", end) + 1;
    if (!head.startsWith("ply") || end < 0 || bodyAt === 0) {
        throw new ModelReadError("header");
    }

    let format = "";
    const elements: PlyElement[] = [];
    const comments: string[] = [];
    for (const line of head.slice(0, end).split(/\r?\n/)) {
        const tokens = line.trim().split(/\s+/);
        if (tokens[0] === "format") {
            format = tokens[1] ?? "";
        } else if (tokens[0] === "comment" || tokens[0] === "obj_info") {
            comments.push(line.trim().slice(tokens[0].length).trim());
        } else if (tokens[0] === "element") {
            const count = Number(tokens[2]);
            if (!Number.isSafeInteger(count) || count < 0) {
                throw new ModelReadError("header");
            }

            elements.push({ name: tokens[1] ?? "", count, properties: [] });
        } else if (tokens[0] === "property") {
            elements.at(-1)?.properties.push(propertyOf(tokens));
        }
    }

    if (format !== "ascii" && format !== "binary_little_endian" && format !== "binary_big_endian") {
        throw new ModelReadError("header");
    }

    return { format, elements, comments, bodyAt };
}

/**
 * A `property` line's name and types.
 * @param tokens - The line's tokens.
 * @returns The property.
 */
function propertyOf(tokens: readonly string[]): PlyProperty {
    const list = tokens[1] === "list";
    const types = list ? [tokens[2], tokens[3]] : [tokens[1]];
    if (types.some((type) => !((type ?? "") in SIZES))) {
        throw new ModelReadError("header");
    }

    return list
        ? { name: tokens[4] ?? "", type: tokens[3], countType: tokens[2] }
        : { name: tokens[2] ?? "", type: tokens[1] };
}

/**
 * What a PLY's header says it draws.
 * @param header - The header.
 * @returns `mesh`, `points` or `splats`.
 */
export function plyGeometryKind(header: PlyHeader): PlyGeometryKind {
    const vertex = header.elements.find((e) => e.name === "vertex");
    const names = new Set(vertex?.properties.map((p) => p.name));
    if ((names.has("f_dc_0") && names.has("opacity")) || names.has("packed_position")) {
        return "splats";
    }

    const face = header.elements.find((e) => e.name === "face");
    return face === undefined || face.count === 0 ? "points" : "mesh";
}

/**
 * The picture a PLY names in a `comment TextureFile <name>` line.
 * @param header - The header.
 * @returns The name, or undefined.
 */
export function plyTextureFile(header: PlyHeader): string | undefined {
    for (const comment of header.comments) {
        // A prefix test and a slice, not a `\s+(.+)$` regex, which backtracks on long whitespace runs.
        const [word, ...rest] = comment.trim().split(/\s/);
        const name = rest.join(" ").trim();
        if (word.toLowerCase() === "texturefile" && name !== "") {
            return name;
        }
    }

    return undefined;
}

/** One element's values: a column per scalar property, and offsets and values per list. */
interface ElementData {
    readonly count: number;
    readonly columns: Map<string, Float64Array>;
    readonly lists: Map<string, { offsets: Uint32Array; values: Float64Array }>;
}

/** Reads the next value of a type, or throws past the end. */
type NextValue = (type: string) => number;

/**
 * A reader of the ASCII body's numbers in order.
 * @param bytes - The file.
 * @param at - Where the body starts.
 * @returns The reader.
 */
function asciiReader(bytes: Uint8Array, at: number): NextValue {
    const tokens = new TextDecoder("latin1").decode(bytes.subarray(at)).split(/\s+/).filter(Boolean);
    let next = 0;
    return () => {
        if (next >= tokens.length) {
            throw new ModelReadError("ply");
        }

        const value = Number(tokens[next++]);
        if (Number.isNaN(value)) {
            throw new ModelReadError("ply");
        }

        return value;
    };
}

/**
 * A reader of the binary body's values in order.
 * @param bytes - The file.
 * @param at - Where the body starts.
 * @param little - Little-endian.
 * @returns The reader.
 */
function binaryReader(bytes: Uint8Array, at: number, little: boolean): NextValue {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = at;
    const read: Readonly<Record<string, (o: number) => number>> = {
        char: (o) => view.getInt8(o),
        int8: (o) => view.getInt8(o),
        uchar: (o) => view.getUint8(o),
        uint8: (o) => view.getUint8(o),
        short: (o) => view.getInt16(o, little),
        int16: (o) => view.getInt16(o, little),
        ushort: (o) => view.getUint16(o, little),
        uint16: (o) => view.getUint16(o, little),
        int: (o) => view.getInt32(o, little),
        int32: (o) => view.getInt32(o, little),
        uint: (o) => view.getUint32(o, little),
        uint32: (o) => view.getUint32(o, little),
        float: (o) => view.getFloat32(o, little),
        float32: (o) => view.getFloat32(o, little),
        double: (o) => view.getFloat64(o, little),
        float64: (o) => view.getFloat64(o, little),
    };
    return (type) => {
        const size = SIZES[type];
        if (offset + size > bytes.length) {
            throw new ModelReadError("ply");
        }

        const value = read[type](offset);
        offset += size;
        return value;
    };
}

/**
 * Read one element's rows.
 * @param element - The element.
 * @param next - The body reader.
 * @returns Its values.
 */
function readElement(element: PlyElement, next: NextValue): ElementData {
    const columns = new Map<string, Float64Array>();
    const listValues = new Map<string, number[]>();
    const listOffsets = new Map<string, Uint32Array>();
    for (const p of element.properties) {
        if (p.countType === undefined) {
            columns.set(p.name, new Float64Array(element.count));
        } else {
            listValues.set(p.name, []);
            listOffsets.set(p.name, new Uint32Array(element.count + 1));
        }
    }

    for (let row = 0; row < element.count; row++) {
        for (const p of element.properties) {
            if (p.countType === undefined) {
                (columns.get(p.name) as Float64Array)[row] = next(p.type);
                continue;
            }

            const values = listValues.get(p.name) as number[];
            const length = next(p.countType);
            if (!Number.isInteger(length) || length < 0) {
                throw new ModelReadError("ply");
            }

            for (let k = 0; k < length; k++) {
                values.push(next(p.type));
            }
            (listOffsets.get(p.name) as Uint32Array)[row + 1] = values.length;
        }
    }

    const lists = new Map<string, { offsets: Uint32Array; values: Float64Array }>();
    for (const [name, values] of listValues) {
        lists.set(name, { offsets: listOffsets.get(name) as Uint32Array, values: Float64Array.from(values) });
    }

    return { count: element.count, columns, lists };
}

/**
 * Read every element of the body.
 * @param bytes - The file.
 * @param header - Its header.
 * @returns Each element's values, by name.
 */
function readBody(bytes: Uint8Array, header: PlyHeader): Map<string, ElementData> {
    const next =
        header.format === "ascii"
            ? asciiReader(bytes, header.bodyAt)
            : binaryReader(bytes, header.bodyAt, header.format === "binary_little_endian");
    const out = new Map<string, ElementData>();
    for (const element of header.elements) {
        out.set(element.name, readElement(element, next));
    }

    return out;
}

/**
 * The first column of a vertex that exists, of several spellings.
 * @param vertex - The vertex element.
 * @param names - The spellings, best first.
 * @returns The column, or undefined.
 */
function column(vertex: ElementData, ...names: string[]): Float64Array | undefined {
    for (const name of names) {
        const found = vertex.columns.get(name);
        if (found !== undefined) {
            return found;
        }
    }

    return undefined;
}

/**
 * Interleave columns into one array.
 * @param count - Rows.
 * @param cols - The columns.
 * @returns The interleaved values, or undefined when a column is missing.
 */
function interleave(count: number, cols: (Float64Array | undefined)[]): Float32Array | undefined {
    if (cols.includes(undefined)) {
        return undefined;
    }

    const out = new Float32Array(count * cols.length);
    for (let i = 0; i < count; i++) {
        cols.forEach((c, k) => {
            out[i * cols.length + k] = (c as Float64Array)[i];
        });
    }

    return out;
}

/**
 * The vertices' colors as r, g, b, a from 0 to 255, when they have them.
 * @param header - The header (for the color properties' types).
 * @param vertex - The vertex element.
 * @returns The colors, or undefined.
 */
function vertexColors(header: PlyHeader, vertex: ElementData): Uint8Array | undefined {
    const props = header.elements.find((e) => e.name === "vertex")?.properties ?? [];
    const red = props.find((p) => p.name === "red" || p.name === "diffuse_red");
    const r = column(vertex, "red", "diffuse_red");
    const g = column(vertex, "green", "diffuse_green");
    const b = column(vertex, "blue", "diffuse_blue");
    if (red === undefined || r === undefined || g === undefined || b === undefined) {
        return undefined;
    }

    const a = column(vertex, "alpha", "diffuse_alpha");
    const scale = red.type.startsWith("float") || red.type === "double" ? 255 : 1;
    const out = new Uint8Array(vertex.count * 4);
    for (let i = 0; i < vertex.count; i++) {
        out[i * 4] = r[i] * scale;
        out[i * 4 + 1] = g[i] * scale;
        out[i * 4 + 2] = b[i] * scale;
        out[i * 4 + 3] = a === undefined ? 255 : a[i] * scale;
    }

    return out;
}

/**
 * Triangulate the faces as fans, checking every index.
 * @param face - The face element.
 * @param vertices - How many vertices there are.
 * @returns Three indices per triangle.
 */
function fanIndices(face: ElementData, vertices: number): Uint32Array {
    const list = face.lists.get("vertex_indices") ?? face.lists.get("vertex_index") ?? [...face.lists.values()][0];
    if (list === undefined) {
        throw new ModelReadError("ply");
    }

    const out: number[] = [];
    for (let f = 0; f < face.count; f++) {
        const start = list.offsets[f];
        const end = list.offsets[f + 1];
        for (let k = start + 1; k + 1 < end; k++) {
            out.push(list.values[start], list.values[k], list.values[k + 1]);
        }
    }

    if (out.some((i) => !Number.isInteger(i) || i < 0 || i >= vertices)) {
        throw new ModelReadError("ply");
    }

    return Uint32Array.from(out);
}

/**
 * The rows of a 3D Gaussian splat PLY (`f_dc_*`, `scale_*`, `opacity`).
 * @param vertex - The vertex element.
 * @param positions - x, y, z per splat.
 * @returns 32-byte splat rows.
 */
function gaussianRows(vertex: ElementData, positions: Float32Array): ArrayBuffer {
    const SH_C0 = 0.28209479177387814;
    const rows = new ArrayBuffer(vertex.count * SPLAT_ROW_BYTES);
    const floats = new Float32Array(rows);
    const bytes = new Uint8ClampedArray(rows);
    const get = (name: string, i: number): number => vertex.columns.get(name)?.[i] ?? 0;
    for (let i = 0; i < vertex.count; i++) {
        floats.set(positions.subarray(i * 3, i * 3 + 3), i * 8);
        for (let k = 0; k < 3; k++) {
            floats[i * 8 + 3 + k] = Math.exp(get(`scale_${String(k)}`, i));
            bytes[i * 32 + 24 + k] = (0.5 + SH_C0 * get(`f_dc_${String(k)}`, i)) * 255;
        }
        bytes[i * 32 + 27] = (1 / (1 + Math.exp(-get("opacity", i)))) * 255;
    }

    return rows;
}

/**
 * The rows of a PlayCanvas compressed splat PLY: 256 splats per chunk, positions and scales
 * packed 11-10-11 between the chunk's bounds, colors 8-8-8-8.
 * @param vertex - The vertex element.
 * @param chunk - The chunk element.
 * @returns 32-byte splat rows.
 */
function compressedRows(vertex: ElementData, chunk: ElementData | undefined): ArrayBuffer {
    const rows = new ArrayBuffer(vertex.count * SPLAT_ROW_BYTES);
    const floats = new Float32Array(rows);
    const bytes = new Uint8ClampedArray(rows);
    const at = (name: string, c: number, fallback: number): number => chunk?.columns.get(name)?.[c] ?? fallback;
    const unpack = (v: number): [number, number, number] => [
        (v >>> 21) / 2047,
        ((v >>> 11) & 1023) / 1023,
        (v & 2047) / 2047,
    ];
    const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
    const axes = ["x", "y", "z"];
    const channels = ["r", "g", "b"];
    for (let i = 0; i < vertex.count; i++) {
        const c = Math.floor(i / 256);
        if (chunk !== undefined && c >= chunk.count) {
            throw new ModelReadError("splat");
        }

        const position = unpack(vertex.columns.get("packed_position")?.[i] ?? 0);
        const scale = unpack(vertex.columns.get("packed_scale")?.[i] ?? 0);
        const color = vertex.columns.get("packed_color")?.[i] ?? 0xffffffff;
        axes.forEach((axis, k) => {
            floats[i * 8 + k] = lerp(at(`min_${axis}`, c, 0), at(`max_${axis}`, c, 1), position[k]);
            floats[i * 8 + 3 + k] = Math.exp(
                lerp(at(`min_scale_${axis}`, c, 0), at(`max_scale_${axis}`, c, 0), scale[k]),
            );
        });
        channels.forEach((channel, k) => {
            const value = ((color >>> (24 - k * 8)) & 255) / 255;
            bytes[i * 32 + 24 + k] = lerp(at(`min_${channel}`, c, 0), at(`max_${channel}`, c, 1), value) * 255;
        });
        bytes[i * 32 + 27] = color & 255;
    }

    return rows;
}

/** What {@link readPly} returns. */
export interface PlyRead {
    readonly kind: PlyGeometryKind;
    readonly geometry: Geometry;
    /** Points or splats drawn, for a point cloud or a splat. */
    readonly drawn?: number;
    /** The picture a `comment TextureFile` line names. */
    readonly textureFile?: string;
}

/**
 * Read a PLY into geometry, in Babylon's left-handed space with the file's up axis kept.
 * @param bytes - The file.
 * @returns What it draws.
 * @throws {ModelReadError} `header`, `ply` or `splat` for a damaged file.
 */
export function readPly(bytes: Uint8Array): PlyRead {
    const header = readPlyHeader(bytes);
    const body = readBody(bytes, header);
    const vertex = body.get("vertex");
    const kind = plyGeometryKind(header);
    if (vertex === undefined) {
        throw new ModelReadError("ply");
    }

    if (kind === "splats" && vertex.columns.has("packed_position")) {
        const { geometry, drawn } = splatRowsToSolids(compressedRows(vertex, body.get("chunk")));
        return { kind, geometry: toLeftHanded(geometry), drawn };
    }

    const positions = interleave(vertex.count, [column(vertex, "x"), column(vertex, "y"), column(vertex, "z")]);
    if (positions === undefined) {
        throw new ModelReadError("ply");
    }

    if (kind === "splats") {
        const { geometry, drawn } = splatRowsToSolids(gaussianRows(vertex, positions));
        return { kind, geometry: toLeftHanded(geometry), drawn };
    }

    const colors = vertexColors(header, vertex);
    if (kind === "points") {
        const { geometry, drawn } = pointsToSolids(positions, colors);
        return { kind, geometry: toLeftHanded(geometry), drawn };
    }

    const geometry: Geometry = { positions, indices: fanIndices(body.get("face") as ElementData, vertex.count) };
    const normals = interleave(vertex.count, [column(vertex, "nx"), column(vertex, "ny"), column(vertex, "nz")]);
    const uvs = interleave(vertex.count, [
        column(vertex, "s", "u", "texture_u", "texture_s"),
        column(vertex, "t", "v", "texture_v", "texture_t"),
    ]);
    if (normals !== undefined) {
        geometry.normals = normals;
    }
    if (uvs !== undefined) {
        geometry.uvs = uvs;
    }
    if (colors !== undefined) {
        geometry.colors = Float32Array.from(colors, (c) => c / 255);
    }

    const textureFile = plyTextureFile(header);
    return { kind, geometry: toLeftHanded(geometry), ...(textureFile === undefined ? {} : { textureFile }) };
}
