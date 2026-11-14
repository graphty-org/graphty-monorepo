/**
 * @file Writes the model variant fixtures: one folder per variant of every format graphty-element
 * reads (or recognizes and refuses), and `manifest.json`, which both the element's browser test
 * and the graphty app's dialog test walk.
 *
 * Run from graphty-element: `pnpm exec tsx test/fixtures/models/variants/generate.ts`.
 *
 * Every mesh is a 12-triangle cube in one strong color, so a test can check what the picture
 * shows: vertex-colored variants are red, textured ones green (an 8 x 8 picture), plain material
 * colors (MTL `Kd`, glTF `baseColorFactor`, `.babylon` `diffuse`) blue; point clouds and splats
 * are a 6 x 6 x 6 grid of red points.
 *
 * What it needs beyond the repository's dev dependencies:
 * - ImageMagick's `convert` for the GIF, WebP, AVIF and DDS pictures;
 * - the network, once, for the files no npm package can write (listed in SOURCES.md): Babylon's
 *   compressed splat PLY, `.spz` and `.sog` samples and one KTX2 texture. A file already in its
 *   folder is not downloaded again. Tests never download anything.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRDracoMeshCompression } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { zipSync } from "fflate";
import { MeshoptEncoder } from "meshoptimizer/encoder";

const HERE = dirname(fileURLToPath(import.meta.url));
const SH_C0 = 0.28209479177387814;

/** What the tests expect of one variant. */
interface Variant {
    readonly id: string;
    /** The files, in the order a reader would choose them. */
    readonly files: string[];
    /** How the app's dialog test hands them over: files chosen, or a folder. */
    readonly upload: "files" | "folder";
    readonly format: string;
    readonly geometry?: "mesh" | "points" | "splats";
    readonly encoding?: "ascii" | "binary" | "binaryBigEndian";
    readonly compression?: string[];
    readonly gltfVersion?: "1.0";
    /** The color the picture shows, or "any". */
    readonly color: "red" | "green" | "blue" | "any";
    /** Warning codes the record carries. */
    readonly warnings: string[];
    /** For a refused variant: the code, and params it must carry. */
    readonly refused: { code: string; params?: Record<string, unknown> } | null;
    /** A part the reader answers with "draw without it". */
    readonly needs?: string;
    /** Accepted, but drawing it fails with one of these codes. */
    readonly drawFails?: string[];
    /** A short description for people. */
    readonly what: string;
}

const variants: Variant[] = [];
const encoder = new TextEncoder();

/**
 * Write one variant's files and record it.
 * @param variant - What the tests expect.
 * @param files - Its files, by name.
 */
function write(variant: Omit<Variant, "files">, files: Record<string, Uint8Array | string>): void {
    const dir = join(HERE, variant.id);
    for (const [name, bytes] of Object.entries(files)) {
        const path = join(dir, name);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, typeof bytes === "string" ? encoder.encode(bytes) : bytes);
    }
    variants.push({ ...variant, files: Object.keys(files) });
}

// ---------------------------------------------------------------------------------------------
// The cube.

/** Each face: its normal, and two axes whose cross product is the normal. */
const FACES: readonly (readonly [number[], number[], number[]])[] = [
    [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ],
    [
        [-1, 0, 0],
        [0, 0, 1],
        [0, 1, 0],
    ],
    [
        [0, 1, 0],
        [0, 0, 1],
        [1, 0, 0],
    ],
    [
        [0, -1, 0],
        [1, 0, 0],
        [0, 0, 1],
    ],
    [
        [0, 0, 1],
        [1, 0, 0],
        [0, 1, 0],
    ],
    [
        [0, 0, -1],
        [0, 1, 0],
        [1, 0, 0],
    ],
];

/** A cube of side 1, four vertices per face, wound counter-clockwise seen from outside. */
const CUBE = (() => {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    FACES.forEach(([n, u, v], f) => {
        const corners = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
        ];
        for (const [a, b] of corners) {
            for (let k = 0; k < 3; k++) {
                positions.push(n[k] * 0.5 + u[k] * a * 0.5 + v[k] * b * 0.5);
            }
            normals.push(...n);
            uvs.push((a + 1) / 2, (b + 1) / 2);
        }
        indices.push(f * 4, f * 4 + 1, f * 4 + 2, f * 4, f * 4 + 2, f * 4 + 3);
    });
    return { positions, normals, uvs, indices };
})();

/** The cube's triangles as nine coordinates each. */
const TRIANGLES: number[][] = [];
for (let t = 0; t < 12; t++) {
    const tri: number[] = [];
    for (let c = 0; c < 3; c++) {
        const i = CUBE.indices[t * 3 + c];
        tri.push(CUBE.positions[i * 3], CUBE.positions[i * 3 + 1], CUBE.positions[i * 3 + 2]);
    }
    TRIANGLES.push(tri);
}

/** A 6 x 6 x 6 grid of points in the unit cube. */
const GRID: number[][] = [];
for (let x = 0; x < 6; x++) {
    for (let y = 0; y < 6; y++) {
        for (let z = 0; z < 6; z++) {
            GRID.push([x / 5 - 0.5, y / 5 - 0.5, z / 5 - 0.5]);
        }
    }
}

// ---------------------------------------------------------------------------------------------
// Pictures: an 8 x 8 green square.

const GREEN = [0, 200, 0];

/**
 * A CRC-32, for PNG chunks.
 * @param bytes - The bytes.
 * @returns The CRC.
 */
function crc32(bytes: Uint8Array): number {
    let c = 0xffffffff;
    for (const b of bytes) {
        c ^= b;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
    }
    return (c ^ 0xffffffff) >>> 0;
}

/**
 * An 8 x 8 PNG of one color.
 * @param rgb - The color.
 * @returns The PNG.
 */
function png(rgb: number[]): Uint8Array {
    const raw = new Uint8Array(8 * (1 + 8 * 3));
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            raw.set(rgb, y * 25 + 1 + x * 3);
        }
    }
    const chunk = (type: string, data: Uint8Array): Uint8Array => {
        const out = new Uint8Array(12 + data.length);
        const view = new DataView(out.buffer);
        view.setUint32(0, data.length);
        out.set(encoder.encode(type), 4);
        out.set(data, 8);
        view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
        return out;
    };
    const ihdr = new Uint8Array(13);
    new DataView(ihdr.buffer).setUint32(0, 8);
    new DataView(ihdr.buffer).setUint32(4, 8);
    ihdr.set([8, 2, 0, 0, 0], 8);
    return concat([
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", new Uint8Array(deflateSync(raw))),
        chunk("IEND", new Uint8Array(0)),
    ]);
}

/**
 * An 8 x 8 uncompressed true-color TGA of one color.
 * @param rgb - The color.
 * @returns The TGA.
 */
function tga(rgb: number[]): Uint8Array {
    const out = new Uint8Array(18 + 64 * 3);
    out[2] = 2;
    out[12] = 8;
    out[14] = 8;
    out[16] = 24;
    for (let i = 0; i < 64; i++) {
        out.set([rgb[2], rgb[1], rgb[0]], 18 + i * 3);
    }
    return out;
}

/**
 * An 8 x 8 24-bit BMP of one color.
 * @param rgb - The color.
 * @returns The BMP.
 */
function bmp(rgb: number[]): Uint8Array {
    const out = new Uint8Array(54 + 64 * 3);
    const view = new DataView(out.buffer);
    out.set(encoder.encode("BM"), 0);
    view.setUint32(2, out.length, true);
    view.setUint32(10, 54, true);
    view.setUint32(14, 40, true);
    view.setInt32(18, 8, true);
    view.setInt32(22, 8, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(34, 64 * 3, true);
    for (let i = 0; i < 64; i++) {
        out.set([rgb[2], rgb[1], rgb[0]], 54 + i * 3);
    }
    return out;
}

/**
 * The green PNG converted by ImageMagick.
 * @param format - The output format, as ImageMagick names it (`gif`, `webp`, `avif`, `dds`).
 * @param args - Extra options.
 * @returns The picture.
 */
function converted(format: string, args: string[] = []): Uint8Array {
    const tmp = join(HERE, `.tmp-green.png`);
    writeFileSync(tmp, png(GREEN));
    try {
        return new Uint8Array(execFileSync("convert", [tmp, ...args, `${format}:-`]));
    } finally {
        rmSync(tmp);
    }
}

// ---------------------------------------------------------------------------------------------
// glTF.

/**
 * Concatenate byte arrays.
 * @param parts - The arrays.
 * @returns One array.
 */
function concat(parts: Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of parts) {
        out.set(p, at);
        at += p.length;
    }
    return out;
}

/** A growing glTF binary buffer, padded to 4 bytes per view. */
class Bin {
    readonly parts: Uint8Array[] = [];
    length = 0;
    readonly views: Record<string, unknown>[] = [];

    /**
     * Add a view.
     * @param bytes - Its bytes.
     * @param extra - More view fields (a target, a stride).
     * @returns The view's index.
     */
    view(bytes: Uint8Array, extra: Record<string, unknown> = {}): number {
        this.views.push({ buffer: 0, byteOffset: this.length, byteLength: bytes.length, ...extra });
        const padded = new Uint8Array(Math.ceil(bytes.length / 4) * 4);
        padded.set(bytes);
        this.parts.push(padded);
        this.length += padded.length;
        return this.views.length - 1;
    }

    get bytes(): Uint8Array {
        return concat(this.parts);
    }
}

/**
 * The bytes of numbers as a typed array.
 * @param values - The numbers.
 * @param type - The array type.
 * @returns The bytes.
 */
function bytesOf(
    values: number[],
    type: Float32ArrayConstructor | Uint16ArrayConstructor | Uint8ArrayConstructor | Int16ArrayConstructor,
): Uint8Array {
    return new Uint8Array(type.from(values).buffer);
}

/** Options for {@link cubeGltf}. */
interface CubeOptions {
    readonly vertexColors?: boolean;
    readonly texture?: "png" | "webp" | "avif" | "ktx2" | "embedded";
    readonly noIndices?: boolean;
    readonly quantized?: boolean;
    readonly animated?: boolean;
    readonly morph?: boolean;
    readonly skinned?: boolean;
    readonly unlit?: boolean;
    readonly twoScenes?: boolean;
    readonly transmissionUsed?: boolean;
}

/**
 * A glTF 2.0 cube and its binary buffer.
 * @param options - What the cube carries.
 * @returns The JSON (its buffer 0 without a uri) and the buffer.
 */
function cubeGltf(options: CubeOptions = {}): { json: Record<string, unknown>; bin: Uint8Array } {
    const bin = new Bin();
    const accessors: Record<string, unknown>[] = [];
    const accessor = (view: number, componentType: number, count: number, type: string, extra = {}): number =>
        accessors.push({ bufferView: view, componentType, count, type, ...extra }) - 1;

    let { positions } = CUBE;
    let { normals } = CUBE;
    let { uvs } = CUBE;
    let colors: number[] = [];
    for (let i = 0; i < 24; i++) {
        colors.push(1, 0, 0, 1);
    }
    if (options.noIndices) {
        const expand = (values: number[], size: number): number[] =>
            CUBE.indices.flatMap((i) => values.slice(i * size, i * size + size));
        positions = expand(positions, 3);
        normals = expand(normals, 3);
        uvs = expand(uvs, 2);
        colors = expand(colors, 4);
    }
    const count = positions.length / 3;
    const attributes: Record<string, number> = {};
    if (options.quantized) {
        // SHORT positions (a stride of 8), scaled back down by the node: KHR_mesh_quantization.
        const packed = new Int16Array(count * 4);
        for (let i = 0; i < count; i++) {
            packed.set([positions[i * 3] * 2, positions[i * 3 + 1] * 2, positions[i * 3 + 2] * 2], i * 4);
        }
        attributes.POSITION = accessor(
            bin.view(new Uint8Array(packed.buffer), { byteStride: 8, target: 34962 }),
            5122,
            count,
            "VEC3",
            {
                min: [-1, -1, -1],
                max: [1, 1, 1],
            },
        );
    } else {
        attributes.POSITION = accessor(
            bin.view(bytesOf(positions, Float32Array), { target: 34962 }),
            5126,
            count,
            "VEC3",
            {
                min: [-0.5, -0.5, -0.5],
                max: [0.5, 0.5, 0.5],
            },
        );
    }
    attributes.NORMAL = accessor(bin.view(bytesOf(normals, Float32Array), { target: 34962 }), 5126, count, "VEC3");
    if (options.texture !== undefined) {
        attributes.TEXCOORD_0 = accessor(bin.view(bytesOf(uvs, Float32Array), { target: 34962 }), 5126, count, "VEC2");
    }
    if (options.vertexColors) {
        attributes.COLOR_0 = accessor(bin.view(bytesOf(colors, Float32Array), { target: 34962 }), 5126, count, "VEC4");
    }
    const primitive: Record<string, unknown> = { attributes, material: 0 };
    if (!options.noIndices) {
        primitive.indices = accessor(
            bin.view(bytesOf(CUBE.indices, Uint16Array), { target: 34963 }),
            5123,
            36,
            "SCALAR",
        );
    }
    if (options.morph) {
        const deltas = CUBE.normals.map((n) => n * 0.2);
        primitive.targets = [
            {
                POSITION: accessor(bin.view(bytesOf(deltas, Float32Array)), 5126, 24, "VEC3", {
                    min: [-0.2, -0.2, -0.2],
                    max: [0.2, 0.2, 0.2],
                }),
            },
        ];
    }
    if (options.skinned) {
        primitive.attributes = {
            ...attributes,
            JOINTS_0: accessor(bin.view(new Uint8Array(24 * 4)), 5121, 24, "VEC4"),
            WEIGHTS_0: accessor(
                bin.view(bytesOf(Array.from({ length: 24 }, () => [1, 0, 0, 0]).flat(), Float32Array)),
                5126,
                24,
                "VEC4",
            ),
        };
    }

    const extensionsUsed: string[] = [];
    const extensionsRequired: string[] = [];
    const material: Record<string, unknown> = {
        name: "cube",
        pbrMetallicRoughness: { baseColorFactor: [0, 0, 1, 1], metallicFactor: 0, roughnessFactor: 1 },
    };
    const json: Record<string, unknown> = { asset: { version: "2.0", generator: "graphty variant fixtures" } };
    if (options.vertexColors) {
        material.pbrMetallicRoughness = { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 };
    }
    if (options.texture !== undefined) {
        material.pbrMetallicRoughness = { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 1 };
        const extensionOf = { webp: "EXT_texture_webp", avif: "EXT_texture_avif", ktx2: "KHR_texture_basisu" } as const;
        const kind = options.texture;
        if (kind === "embedded") {
            json.images = [{ bufferView: bin.view(png(GREEN)), mimeType: "image/png" }];
            json.textures = [{ source: 0 }];
        } else if (kind === "png") {
            json.images = [{ uri: "cube.png" }];
            json.textures = [{ source: 0 }];
        } else {
            const name = extensionOf[kind];
            json.images = [{ uri: `cube.${kind}`, mimeType: `image/${kind}` }];
            json.textures = [{ extensions: { [name]: { source: 0 } } }];
            extensionsUsed.push(name);
            extensionsRequired.push(name);
        }
    }
    if (options.unlit) {
        material.extensions = { KHR_materials_unlit: {} };
        extensionsUsed.push("KHR_materials_unlit");
    }
    if (options.transmissionUsed) {
        material.extensions = { KHR_materials_transmission: { transmissionFactor: 1 } };
        extensionsUsed.push("KHR_materials_transmission");
    }
    if (options.quantized) {
        extensionsUsed.push("KHR_mesh_quantization");
        extensionsRequired.push("KHR_mesh_quantization");
    }

    const nodes: Record<string, unknown>[] = [{ mesh: 0, ...(options.quantized ? { scale: [0.5, 0.5, 0.5] } : {}) }];
    if (options.skinned) {
        nodes[0].skin = 0;
        nodes.push({ name: "joint" });
        const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        json.skins = [
            { joints: [1], inverseBindMatrices: accessor(bin.view(bytesOf(identity, Float32Array)), 5126, 1, "MAT4") },
        ];
    }
    if (options.morph) {
        (json as { meshesWeights?: number[] }).meshesWeights = [0.5];
    }
    if (options.animated) {
        const input = accessor(bin.view(bytesOf([0, 1], Float32Array)), 5126, 2, "SCALAR", { min: [0], max: [1] });
        const output = accessor(bin.view(bytesOf([0, 0, 0, 1, 0, 0.7071, 0, 0.7071], Float32Array)), 5126, 2, "VEC4");
        json.animations = [
            {
                name: "spin",
                samplers: [{ input, output }],
                channels: [{ sampler: 0, target: { node: 0, path: "rotation" } }],
            },
        ];
    }

    Object.assign(json, {
        scene: 0,
        scenes: options.twoScenes ? [{ nodes: [0] }, { nodes: [1] }] : [{ nodes: options.skinned ? [0, 1] : [0] }],
        nodes: options.twoScenes ? [...nodes, { mesh: 0, translation: [3, 0, 0] }] : nodes,
        meshes: [{ primitives: [primitive], ...(options.morph ? { weights: [0.5] } : {}) }],
        materials: [material],
        accessors,
        bufferViews: bin.views,
        buffers: [{ byteLength: bin.length }],
    });
    delete (json as { meshesWeights?: number[] }).meshesWeights;
    if (extensionsUsed.length > 0) {
        json.extensionsUsed = extensionsUsed;
    }
    if (extensionsRequired.length > 0) {
        json.extensionsRequired = extensionsRequired;
    }
    return { json, bin: bin.bytes };
}

/**
 * A GLB from JSON and a binary chunk.
 * @param json - The JSON.
 * @param bin - The binary chunk.
 * @param version - 2, or 1 for a `KHR_binary_glTF` GLB.
 * @returns The GLB.
 */
function glb(json: Record<string, unknown>, bin: Uint8Array, version: 1 | 2 = 2): Uint8Array {
    const text = encoder.encode(JSON.stringify(json));
    const jsonBytes = new Uint8Array(Math.ceil(text.length / 4) * 4).fill(0x20);
    jsonBytes.set(text);
    if (version === 1) {
        const out = new Uint8Array(20 + jsonBytes.length + bin.length);
        const view = new DataView(out.buffer);
        view.setUint32(0, 0x46546c67, true);
        view.setUint32(4, 1, true);
        view.setUint32(8, out.length, true);
        view.setUint32(12, jsonBytes.length, true);
        view.setUint32(16, 0, true);
        out.set(jsonBytes, 20);
        out.set(bin, 20 + jsonBytes.length);
        return out;
    }
    const binBytes = new Uint8Array(Math.ceil(bin.length / 4) * 4);
    binBytes.set(bin);
    const out = new Uint8Array(12 + 8 + jsonBytes.length + 8 + binBytes.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, out.length, true);
    view.setUint32(12, jsonBytes.length, true);
    view.setUint32(16, 0x4e4f534a, true);
    out.set(jsonBytes, 20);
    view.setUint32(20 + jsonBytes.length, binBytes.length, true);
    view.setUint32(24 + jsonBytes.length, 0x004e4942, true);
    out.set(binBytes, 28 + jsonBytes.length);
    return out;
}

/**
 * A .gltf whose buffer 0 is a file beside it.
 * @param json - The JSON.
 * @param binName - The buffer's file name.
 * @returns The JSON text.
 */
function withBufferUri(json: Record<string, unknown>, binName: string): string {
    const buffers = json.buffers as Record<string, unknown>[];
    return JSON.stringify({ ...json, buffers: [{ ...buffers[0], uri: binName }, ...buffers.slice(1)] }, null, 1);
}

/**
 * A data: URL of bytes.
 * @param bytes - The bytes.
 * @param type - The media type.
 * @returns The URL.
 */
function dataUrl(bytes: Uint8Array, type: string): string {
    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
}

/**
 * A glTF 1.0 cube: id-keyed objects, a technique and shaders it names (never asked for), a
 * `diffuse` color in blue.
 * @param bufferUri - The buffer's uri, or undefined for a GLB version 1's body.
 * @returns The JSON and the buffer.
 */
function cubeGltf1(bufferUri: string | undefined): { json: Record<string, unknown>; bin: Uint8Array } {
    const bin = concat([
        bytesOf(CUBE.positions, Float32Array),
        bytesOf(CUBE.normals, Float32Array),
        bytesOf(CUBE.indices, Uint16Array),
    ]);
    const bufferId = bufferUri === undefined ? "binary_glTF" : "cube";
    const json: Record<string, unknown> = {
        asset: { version: "1.0", generator: "graphty variant fixtures" },
        scene: "defaultScene",
        scenes: { defaultScene: { nodes: ["cubeNode"] } },
        nodes: { cubeNode: { meshes: ["cubeMesh"], matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] } },
        meshes: {
            cubeMesh: {
                primitives: [
                    { attributes: { POSITION: "pos", NORMAL: "nrm" }, indices: "idx", material: "blue", mode: 4 },
                ],
            },
        },
        accessors: {
            pos: {
                bufferView: "vertices",
                byteOffset: 0,
                byteStride: 12,
                componentType: 5126,
                count: 24,
                type: "VEC3",
                min: [-0.5, -0.5, -0.5],
                max: [0.5, 0.5, 0.5],
            },
            nrm: {
                bufferView: "vertices",
                byteOffset: 288,
                byteStride: 12,
                componentType: 5126,
                count: 24,
                type: "VEC3",
            },
            idx: { bufferView: "indices", byteOffset: 0, componentType: 5123, count: 36, type: "SCALAR" },
        },
        bufferViews: {
            vertices: { buffer: bufferId, byteOffset: 0, byteLength: 576, target: 34962 },
            indices: { buffer: bufferId, byteOffset: 576, byteLength: 72, target: 34963 },
        },
        buffers: { [bufferId]: { uri: bufferUri ?? "data:,", byteLength: bin.length, type: "arraybuffer" } },
        materials: { blue: { name: "blue", technique: "tech", values: { diffuse: [0, 0, 1, 1] } } },
        techniques: { tech: { program: "prog", parameters: {}, attributes: {}, uniforms: {} } },
        programs: { prog: { vertexShader: "vs", fragmentShader: "fs", attributes: ["a_position", "a_normal"] } },
        shaders: { vs: { type: 35633, uri: "cube0VS.glsl" }, fs: { type: 35632, uri: "cube0FS.glsl" } },
        ...(bufferUri === undefined ? { extensionsUsed: ["KHR_binary_glTF"] } : {}),
    };
    return { json, bin };
}

// ---------------------------------------------------------------------------------------------
// Text and binary mesh formats.

/** The cube as OBJ text, with texture coordinates and normals. */
function cubeObj(mtl?: string, colored = false): string {
    const lines = ["# graphty variant fixtures", ...(mtl === undefined ? [] : [`mtllib ${mtl}`]), "o cube"];
    for (let i = 0; i < 24; i++) {
        const p = CUBE.positions.slice(i * 3, i * 3 + 3).join(" ");
        lines.push(colored ? `v ${p} 1 0 0` : `v ${p}`);
    }
    for (let i = 0; i < 24; i++) {
        lines.push(`vt ${CUBE.uvs[i * 2]} ${CUBE.uvs[i * 2 + 1]}`);
    }
    for (let i = 0; i < 24; i++) {
        lines.push(`vn ${CUBE.normals.slice(i * 3, i * 3 + 3).join(" ")}`);
    }
    if (mtl !== undefined) {
        lines.push("usemtl cube");
    }
    for (let t = 0; t < 12; t++) {
        const c = CUBE.indices.slice(t * 3, t * 3 + 3).map((i) => `${i + 1}/${i + 1}/${i + 1}`);
        lines.push(`f ${c.join(" ")}`);
    }
    return `${lines.join("\n")}\n`;
}

/**
 * The cube as ASCII STL.
 * @param name - The solid's name ("" for none).
 * @param end - The name on `endsolid`.
 * @param zeroNormals - Write 0 0 0 normals.
 * @returns The text.
 */
function asciiStl(name: string, end: string, zeroNormals = false): string {
    const lines = [name === "" ? "solid" : `solid ${name}`];
    FACES.forEach(([n], f) => {
        for (const t of [f * 2, f * 2 + 1]) {
            lines.push(`  facet normal ${zeroNormals ? "0 0 0" : n.join(" ")}`, "    outer loop");
            for (let c = 0; c < 3; c++) {
                lines.push(`      vertex ${TRIANGLES[t].slice(c * 3, c * 3 + 3).join(" ")}`);
            }
            lines.push("    endloop", "  endfacet");
        }
    });
    lines.push(end === "" ? "endsolid" : `endsolid ${end}`);
    return `${lines.join("\n")}\n`;
}

/**
 * The cube as binary STL.
 * @param header - The 80-byte header's text.
 * @param attribute - Each face's attribute word.
 * @param headerBytes - Bytes to put in the header after its text.
 * @returns The bytes.
 */
function binaryStl(header: string, attribute = 0, headerBytes: number[] = []): Uint8Array {
    const out = new Uint8Array(84 + 12 * 50);
    const view = new DataView(out.buffer);
    out.set(encoder.encode(header), 0);
    out.set(headerBytes, header.length);
    view.setUint32(80, 12, true);
    TRIANGLES.forEach((tri, t) => {
        const at = 84 + t * 50;
        const n = FACES[Math.floor(t / 2)][0];
        n.forEach((v, k) => view.setFloat32(at + k * 4, v, true));
        tri.forEach((v, k) => view.setFloat32(at + 12 + k * 4, v, true));
        view.setUint16(at + 48, attribute, true);
    });
    return out;
}

/** A PLY property list and the values per row. */
interface PlyTable {
    readonly element: string;
    readonly properties: string[];
    readonly rows: number[][];
}

/**
 * A PLY file.
 * @param format - `ascii`, `binary_little_endian` or `binary_big_endian`.
 * @param tables - The elements.
 * @param comments - `comment` lines.
 * @returns The file.
 */
function ply(format: string, tables: PlyTable[], comments: string[] = []): Uint8Array {
    const head = ["ply", `format ${format} 1.0`, ...comments.map((c) => `comment ${c}`)];
    for (const t of tables) {
        head.push(`element ${t.element} ${t.rows.length}`, ...t.properties.map((p) => `property ${p}`));
    }
    head.push("end_header");
    const header = encoder.encode(`${head.join("\n")}\n`);
    if (format === "ascii") {
        const body = tables.flatMap((t) => t.rows.map((r) => r.join(" "))).join("\n");
        return concat([header, encoder.encode(`${body}\n`)]);
    }
    const little = format === "binary_little_endian";
    const parts: Uint8Array[] = [header];
    for (const t of tables) {
        const types = t.properties.map((p) => p.split(" "));
        for (const row of t.rows) {
            let k = 0;
            for (const type of types) {
                if (type[0] === "list") {
                    const n = row[k++];
                    parts.push(scalar(type[1], n, little));
                    for (let j = 0; j < n; j++) {
                        parts.push(scalar(type[2], row[k++], little));
                    }
                } else {
                    parts.push(scalar(type[0], row[k++], little));
                }
            }
        }
    }
    return concat(parts);
}

/**
 * One PLY binary value.
 * @param type - Its type.
 * @param value - The value.
 * @param little - Little-endian.
 * @returns The bytes.
 */
function scalar(type: string, value: number, little: boolean): Uint8Array {
    const size = { uchar: 1, uint8: 1, int: 4, uint: 4, float: 4, ushort: 2 }[type] ?? 4;
    const out = new Uint8Array(size);
    const view = new DataView(out.buffer);
    if (type === "float") {
        view.setFloat32(0, value, little);
    } else if (type === "uchar" || type === "uint8") {
        view.setUint8(0, value);
    } else if (type === "ushort") {
        view.setUint16(0, value, little);
    } else if (type === "uint") {
        view.setUint32(0, value, little);
    } else {
        view.setInt32(0, value, little);
    }
    return out;
}

/** The cube's vertices as PLY rows of x y z nx ny nz. */
const PLY_VERTICES = Array.from({ length: 24 }, (_, i) => [
    ...CUBE.positions.slice(i * 3, i * 3 + 3),
    ...CUBE.normals.slice(i * 3, i * 3 + 3),
]);
/** The cube's triangles as PLY face rows. */
const PLY_FACES = Array.from({ length: 12 }, (_, t) => [3, ...CUBE.indices.slice(t * 3, t * 3 + 3)]);
const XYZN = ["float x", "float y", "float z", "float nx", "float ny", "float nz"];
const FACE = ["list uchar int vertex_indices"];

/**
 * The red point grid as 32-byte splat rows.
 * @returns The rows.
 */
function splatRows(): Uint8Array {
    const out = new Uint8Array(GRID.length * 32);
    const view = new DataView(out.buffer);
    GRID.forEach((p, i) => {
        p.forEach((v, k) => view.setFloat32(i * 32 + k * 4, v, true));
        for (let k = 0; k < 3; k++) {
            view.setFloat32(i * 32 + 12 + k * 4, 0.04, true);
        }
        out.set([255, 0, 0, 255, 128, 128, 128, 255], i * 32 + 24);
    });
    return out;
}

// ---------------------------------------------------------------------------------------------
// Downloads, once.

/**
 * A file downloaded once into a variant's folder, or read from it.
 * @param id - The variant.
 * @param name - The file name.
 * @param url - Where it comes from.
 * @returns The bytes.
 */
async function downloaded(id: string, name: string, url: string): Promise<Uint8Array> {
    const path = join(HERE, id, name);
    if (existsSync(path)) {
        return new Uint8Array(readFileSync(path));
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${url}: ${String(response.status)}`);
    }
    return new Uint8Array(await response.arrayBuffer());
}

const SPLATS = "https://assets.babylonjs.com/splats";
const KTX2 =
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ChronographWatch/glTF-KTX-BasisU/dgg_basecolor.ktx2";

// ---------------------------------------------------------------------------------------------
// The variants.

const up = (format: string): string[] => (format === "stl" || format === "ply" ? ["W_MODEL_UP_GUESSED"] : []);
const mesh = { geometry: "mesh" as const, warnings: [] as string[], refused: null, upload: "files" as const };

async function main(): Promise<void> {
    const kept = new Map<string, Uint8Array>();
    for (const [id, name, url] of [
        ["ply-splat-compressed", "combined_SPZv3.compressed.ply", `${SPLATS}/combined_SPZv3.compressed.ply`],
        ["spz", "combined_SPZv3.spz", `${SPLATS}/combined_SPZv3.spz`],
        ["sog", "combined_SPZv3.sog", `${SPLATS}/combined_SPZv3.sog`],
        ["gltf-ktx2", "cube.ktx2", KTX2],
    ] as const) {
        kept.set(id, await downloaded(id, name, url));
    }

    for (const entry of readdirVariants()) {
        rmSync(join(HERE, entry), { recursive: true, force: true });
    }

    // glTF 2.0
    {
        const { json, bin } = cubeGltf();
        write(
            { ...mesh, id: "glb", format: "glb", color: "blue", what: "GLB, plain geometry" },
            { "cube.glb": glb(json, bin) },
        );
        write(
            { ...mesh, id: "gltf-bin", format: "gltf", color: "blue", what: ".gltf with its .bin beside it" },
            {
                "cube.gltf": withBufferUri(json, "cube.bin"),
                "cube.bin": bin,
            },
        );
        write(
            {
                ...mesh,
                id: "gltf-embedded",
                format: "gltf",
                color: "blue",
                what: ".gltf with its buffer as a data: URL",
            },
            {
                "cube.gltf": withBufferUri(json, dataUrl(bin, "application/octet-stream")),
            },
        );
        write(
            { ...mesh, id: "zip-gltf", format: "gltf", color: "blue", what: "a .zip holding a .gltf and its .bin" },
            {
                "cube.zip": zipSync({
                    "cube/cube.gltf": encoder.encode(withBufferUri(json, "cube.bin")),
                    "cube/cube.bin": bin,
                }),
            },
        );
        write(
            {
                ...mesh,
                id: "zip-two-models",
                format: "zip",
                color: "any",
                what: "a .zip holding two models: which one is meant",
                refused: { code: "E_MODEL_AMBIGUOUS" },
            },
            { "two.zip": zipSync({ "a.glb": glb(json, bin), "b.glb": glb(json, bin) }) },
        );
    }
    {
        const { json, bin } = cubeGltf({ texture: "png" });
        write(
            { ...mesh, id: "gltf-textured", format: "gltf", color: "green", what: ".gltf, .bin and a PNG texture" },
            {
                "cube.gltf": withBufferUri(json, "cube.bin"),
                "cube.bin": bin,
                "cube.png": png(GREEN),
            },
        );
    }
    {
        const { json, bin } = cubeGltf({ texture: "embedded" });
        write(
            { ...mesh, id: "glb-textured", format: "glb", color: "green", what: "GLB with its PNG texture inside" },
            { "cube.glb": glb(json, bin) },
        );
    }
    const gltfOne = (
        id: string,
        options: CubeOptions,
        color: Variant["color"],
        what: string,
        warnings: string[] = [],
    ): void => {
        const { json, bin } = cubeGltf(options);
        write({ ...mesh, id, format: "glb", color, what, warnings }, { "cube.glb": glb(json, bin) });
    };
    gltfOne("gltf-vertex-colors", { vertexColors: true }, "red", "GLB with per-vertex colors");
    gltfOne("gltf-no-indices", { noIndices: true }, "blue", "GLB with no index buffer");
    gltfOne("gltf-quantized", { quantized: true }, "blue", "GLB with KHR_mesh_quantization (SHORT positions)");
    gltfOne("gltf-animated", { animated: true }, "blue", "GLB with an animation (drawn in its rest pose)", [
        "W_MODEL_HAS_ANIMATIONS",
    ]);
    gltfOne("gltf-morph", { morph: true }, "blue", "GLB with a morph target");
    gltfOne("gltf-skinned", { skinned: true }, "blue", "GLB with a skin");
    gltfOne("gltf-unlit", { unlit: true }, "blue", "GLB with KHR_materials_unlit");
    gltfOne("gltf-two-scenes", { twoScenes: true }, "blue", "GLB with two scenes (the default one is drawn)");
    gltfOne(
        "gltf-transmission-used",
        { transmissionUsed: true },
        "blue",
        "GLB using KHR_materials_transmission (drawn opaque)",
    );

    // Encoded glTF.
    {
        const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
            "draco3d.encoder": await draco3d.createEncoderModule(),
            "draco3d.decoder": await draco3d.createDecoderModule(),
            "meshopt.encoder": MeshoptEncoder,
        });
        await MeshoptEncoder.ready;
        const { json, bin } = cubeGltf();
        const source = glb(json, bin);

        const draco = await io.readBinary(source);
        draco.createExtension(KHRDracoMeshCompression).setRequired(true);
        write(
            {
                ...mesh,
                id: "glb-draco",
                format: "glb",
                compression: ["draco"],
                color: "blue",
                what: "GLB, Draco compressed",
            },
            {
                "cube.glb": await io.writeBinary(draco),
            },
        );
        const dracoJson = await io.writeJSON(draco, { basename: "cube" });
        write(
            {
                ...mesh,
                id: "gltf-draco",
                format: "gltf",
                compression: ["draco"],
                color: "blue",
                what: ".gltf and .bin, Draco compressed",
            },
            {
                "cube.gltf": JSON.stringify(dracoJson.json, null, 1),
                ...Object.fromEntries(Object.entries(dracoJson.resources)),
            },
        );

        const meshopt = await io.readBinary(source);
        meshopt
            .createExtension(EXTMeshoptCompression)
            .setRequired(true)
            .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
        const meshoptJson = await io.writeJSON(meshopt, { basename: "cube" });
        write(
            {
                ...mesh,
                id: "gltf-meshopt-ext",
                format: "gltf",
                compression: ["meshopt"],
                color: "blue",
                what: ".gltf and .bin, EXT_meshopt_compression",
            },
            {
                "cube.gltf": JSON.stringify(meshoptJson.json, null, 1),
                ...Object.fromEntries(Object.entries(meshoptJson.resources)),
            },
        );
        // The ratified KHR name for the same buffer layout.
        write(
            {
                ...mesh,
                id: "gltf-meshopt-khr",
                format: "gltf",
                compression: ["meshopt"],
                color: "blue",
                what: ".gltf and .bin, KHR_meshopt_compression",
            },
            {
                "cube.gltf": JSON.stringify(meshoptJson.json, null, 1).replaceAll(
                    "EXT_meshopt_compression",
                    "KHR_meshopt_compression",
                ),
                ...Object.fromEntries(Object.entries(meshoptJson.resources)),
            },
        );
    }
    for (const kind of ["webp", "avif"] as const) {
        const { json, bin } = cubeGltf({ texture: kind });
        write(
            {
                ...mesh,
                id: `gltf-${kind}`,
                format: "gltf",
                compression: [kind],
                color: "green",
                what: `.gltf with a ${kind.toUpperCase()} texture (EXT_texture_${kind})`,
            },
            {
                "cube.gltf": withBufferUri(json, "cube.bin"),
                "cube.bin": bin,
                [`cube.${kind}`]: converted(kind, kind === "webp" ? ["-define", "webp:lossless=true"] : []),
            },
        );
    }
    {
        const { json, bin } = cubeGltf({ texture: "ktx2" });
        write(
            {
                ...mesh,
                id: "gltf-ktx2",
                format: "gltf",
                compression: ["ktx2"],
                color: "any",
                what: ".gltf with a KTX2 / Basis Universal texture (needs @babylonjs/ktx2decoder)",
            },
            {
                "cube.gltf": withBufferUri(json, "cube.bin"),
                "cube.bin": bin,
                "cube.ktx2": kept.get("gltf-ktx2") as Uint8Array,
            },
        );
    }

    // glTF 1.0
    {
        const { json, bin } = cubeGltf1("cube.bin");
        write(
            {
                ...mesh,
                id: "gltf1-bin",
                format: "gltf",
                gltfVersion: "1.0",
                color: "blue",
                what: "glTF 1.0 .gltf and .bin (its GLSL shaders are never asked for)",
            },
            {
                "cube.gltf": JSON.stringify(json, null, 1),
                "cube.bin": bin,
            },
        );
        const embedded = cubeGltf1(dataUrl(bin, "application/octet-stream"));
        write(
            {
                ...mesh,
                id: "gltf1-embedded",
                format: "gltf",
                gltfVersion: "1.0",
                color: "blue",
                what: "glTF 1.0 with its buffer as a data: URL",
            },
            {
                "cube.gltf": JSON.stringify(embedded.json, null, 1),
            },
        );
        const binary = cubeGltf1(undefined);
        write(
            {
                ...mesh,
                id: "glb1",
                format: "glb",
                gltfVersion: "1.0",
                color: "blue",
                what: "GLB version 1 (KHR_binary_glTF)",
            },
            {
                "cube.glb": glb(binary.json, binary.bin, 1),
            },
        );
    }

    // OBJ
    const blueMtl = "newmtl cube\nKd 0 0 1\n";
    const mapMtl = (picture: string): string => `newmtl cube\nKd 1 1 1\nmap_Kd ${picture}\n`;
    write(
        { ...mesh, id: "obj-alone", format: "obj", color: "any", what: "OBJ with no .mtl" },
        { "cube.obj": cubeObj() },
    );
    write(
        { ...mesh, id: "obj-mtl", format: "obj", color: "blue", what: "OBJ and its .mtl (a blue Kd)" },
        {
            "cube.obj": cubeObj("cube.mtl"),
            "cube.mtl": blueMtl,
        },
    );
    write(
        { ...mesh, id: "obj-vertex-colors", format: "obj", color: "red", what: "OBJ with colors on its v lines" },
        {
            "cube.obj": cubeObj(undefined, true),
        },
    );
    const pictures: Record<string, () => Uint8Array> = {
        png: () => png(GREEN),
        tga: () => tga(GREEN),
        bmp: () => bmp(GREEN),
        gif: () => converted("gif"),
        dds: () => converted("dds", ["-define", "dds:compression=none", "-define", "dds:mipmaps=0"]),
    };
    for (const [ext, make] of Object.entries(pictures)) {
        write(
            {
                ...mesh,
                id: `obj-mtl-${ext}`,
                format: "obj",
                color: "green",
                what: `OBJ, .mtl and a ${ext.toUpperCase()} texture`,
                upload: "folder",
            },
            {
                "cube.obj": cubeObj("cube.mtl"),
                "cube.mtl": mapMtl(`cube.${ext}`),
                [`cube.${ext}`]: make(),
            },
        );
    }
    write(
        {
            ...mesh,
            id: "obj-mtl-missing-png",
            format: "obj",
            color: "blue",
            what: "OBJ and .mtl whose texture is missing: drawn without it",
            needs: "cube.png",
            warnings: ["W_MODEL_PART_SKIPPED"],
        },
        { "cube.obj": cubeObj("cube.mtl"), "cube.mtl": "newmtl cube\nKd 0 0 1\nmap_Kd cube.png\n" },
    );

    // STL
    const stl = { ...mesh, format: "stl", warnings: up("stl") };
    write(
        { ...stl, id: "stl-ascii", encoding: "ascii", color: "any", what: "ASCII STL" },
        { "cube.stl": asciiStl("cube", "cube") },
    );
    write(
        {
            ...stl,
            id: "stl-ascii-unnamed",
            encoding: "ascii",
            color: "any",
            what: "ASCII STL with an unnamed solid and another name on endsolid",
        },
        {
            "cube.stl": asciiStl("", "other"),
        },
    );
    write(
        {
            ...stl,
            id: "stl-ascii-zero-normals",
            encoding: "ascii",
            color: "any",
            what: "ASCII STL whose facet normals are all 0 0 0",
        },
        {
            "cube.stl": asciiStl("cube", "cube", true),
        },
    );
    write(
        { ...stl, id: "stl-binary", encoding: "binary", color: "any", what: "binary STL" },
        { "cube.stl": binaryStl("graphty binary stl") },
    );
    write(
        {
            ...stl,
            id: "stl-binary-colored",
            encoding: "binary",
            color: "red",
            what: "binary STL with VisCAM face colors",
        },
        {
            "cube.stl": binaryStl("graphty viscam stl", 0x8000 | (31 << 10)),
        },
    );
    write(
        {
            ...stl,
            id: "stl-binary-materialise",
            encoding: "binary",
            color: "red",
            what: "binary STL with Materialise face colors (COLOR= header)",
        },
        {
            "cube.stl": binaryStl("graphty materialise COLOR=", 31, [255, 0, 0, 255]),
        },
    );

    // PLY
    const plyMesh = { ...mesh, format: "ply", warnings: up("ply") };
    const cubeTables: PlyTable[] = [
        { element: "vertex", properties: XYZN, rows: PLY_VERTICES },
        { element: "face", properties: FACE, rows: PLY_FACES },
    ];
    write(
        { ...plyMesh, id: "ply-ascii", encoding: "ascii", color: "any", what: "ASCII PLY mesh" },
        { "cube.ply": ply("ascii", cubeTables) },
    );
    write(
        { ...plyMesh, id: "ply-le", encoding: "binary", color: "any", what: "binary little-endian PLY mesh" },
        {
            "cube.ply": ply("binary_little_endian", cubeTables),
        },
    );
    write(
        { ...plyMesh, id: "ply-be", encoding: "binaryBigEndian", color: "any", what: "binary big-endian PLY mesh" },
        {
            "cube.ply": ply("binary_big_endian", cubeTables),
        },
    );
    write(
        {
            ...plyMesh,
            id: "ply-ascii-colors",
            encoding: "ascii",
            color: "red",
            what: "ASCII PLY mesh with vertex colors",
        },
        {
            "cube.ply": ply("ascii", [
                {
                    element: "vertex",
                    properties: [...XYZN, "uchar red", "uchar green", "uchar blue"],
                    rows: PLY_VERTICES.map((r) => [...r, 255, 0, 0]),
                },
                { element: "face", properties: FACE, rows: PLY_FACES },
            ]),
        },
    );
    {
        // Eight shared corners and six quads, after which Babylon's PLY reading corrupts faces.
        const corners: number[][] = [];
        for (const x of [-0.5, 0.5]) {
            for (const y of [-0.5, 0.5]) {
                for (const z of [-0.5, 0.5]) {
                    corners.push([x, y, z]);
                }
            }
        }
        const quads = [
            [0, 1, 3, 2],
            [4, 6, 7, 5],
            [0, 4, 5, 1],
            [2, 3, 7, 6],
            [0, 2, 6, 4],
            [1, 5, 7, 3],
        ];
        write(
            { ...plyMesh, id: "ply-quads", encoding: "ascii", color: "any", what: "ASCII PLY mesh of quads" },
            {
                "cube.ply": ply("ascii", [
                    { element: "vertex", properties: ["float x", "float y", "float z"], rows: corners },
                    { element: "face", properties: FACE, rows: quads.map((q) => [4, ...q]) },
                ]),
            },
        );
    }
    write(
        {
            ...plyMesh,
            id: "ply-uv-png",
            encoding: "ascii",
            color: "green",
            what: "ASCII PLY with texture coordinates and a PNG (comment TextureFile)",
            upload: "folder",
        },
        {
            "cube.ply": ply(
                "ascii",
                [
                    {
                        element: "vertex",
                        properties: [...XYZN, "float s", "float t"],
                        rows: PLY_VERTICES.map((r, i) => [...r, CUBE.uvs[i * 2], CUBE.uvs[i * 2 + 1]]),
                    },
                    { element: "face", properties: FACE, rows: PLY_FACES },
                ],
                ["TextureFile cube.png"],
            ),
            "cube.png": png(GREEN),
        },
    );
    {
        // Damaged: the header is right and the body long enough, but a face names vertex 9999.
        const faces = PLY_FACES.map((f, i) => (i === 5 ? [3, 0, 1, 9999] : f));
        write(
            {
                ...plyMesh,
                id: "ply-damaged",
                encoding: "binary",
                color: "any",
                what: "binary PLY whose face names a vertex it does not have",
                drawFails: ["E_MODEL_STRUCTURE"],
            },
            {
                "cube.ply": ply("binary_little_endian", [
                    cubeTables[0],
                    { element: "face", properties: FACE, rows: faces },
                ]),
            },
        );
    }
    const points = {
        ...mesh,
        format: "ply",
        geometry: "points" as const,
        warnings: [...up("ply"), "W_MODEL_POINTS_APPROXIMATED"],
    };
    const pointRows = GRID.map((p) => [...p, 255, 0, 0]);
    const pointProps = ["float x", "float y", "float z", "uchar red", "uchar green", "uchar blue"];
    write(
        { ...points, id: "ply-points-ascii", encoding: "ascii", color: "red", what: "ASCII PLY point cloud" },
        {
            "points.ply": ply("ascii", [{ element: "vertex", properties: pointProps, rows: pointRows }]),
        },
    );
    write(
        { ...points, id: "ply-points-bin", encoding: "binary", color: "red", what: "binary PLY point cloud" },
        {
            "points.ply": ply("binary_little_endian", [{ element: "vertex", properties: pointProps, rows: pointRows }]),
        },
    );
    const splats = { ...mesh, geometry: "splats" as const, warnings: ["W_MODEL_POINTS_APPROXIMATED"] };
    write(
        {
            ...splats,
            format: "ply",
            warnings: [...up("ply"), ...splats.warnings],
            id: "ply-splat",
            encoding: "binary",
            color: "red",
            what: "3D Gaussian splat PLY",
        },
        {
            "splat.ply": ply("binary_little_endian", [
                {
                    element: "vertex",
                    properties: [
                        "x",
                        "y",
                        "z",
                        "f_dc_0",
                        "f_dc_1",
                        "f_dc_2",
                        "opacity",
                        "scale_0",
                        "scale_1",
                        "scale_2",
                        "rot_0",
                        "rot_1",
                        "rot_2",
                        "rot_3",
                    ].map((n) => `float ${n}`),
                    rows: GRID.map((p) => [
                        ...p,
                        0.5 / SH_C0,
                        -0.5 / SH_C0,
                        -0.5 / SH_C0,
                        5,
                        Math.log(0.04),
                        Math.log(0.04),
                        Math.log(0.04),
                        1,
                        0,
                        0,
                        0,
                    ]),
                },
            ]),
        },
    );
    write(
        {
            ...splats,
            format: "ply",
            warnings: [...up("ply"), ...splats.warnings],
            id: "ply-splat-compressed",
            encoding: "binary",
            color: "any",
            what: "PlayCanvas compressed splat PLY (Babylon sample)",
        },
        {
            "combined_SPZv3.compressed.ply": kept.get("ply-splat-compressed") as Uint8Array,
        },
    );
    write(
        { ...splats, format: "splat", id: "splat", color: "red", what: "raw .splat (32-byte rows)" },
        { "points.splat": splatRows() },
    );
    write(
        { ...splats, format: "spz", id: "spz", color: "any", what: "Niantic .spz (Babylon sample)" },
        { "combined_SPZv3.spz": kept.get("spz") as Uint8Array },
    );
    write(
        { ...splats, format: "sog", id: "sog", color: "any", what: "PlayCanvas .sog bundle (Babylon sample)" },
        { "combined_SPZv3.sog": kept.get("sog") as Uint8Array },
    );

    // .babylon (left-handed: the winding is reversed)
    const babylonIndices = Array.from({ length: 12 }, (_, t) => [
        CUBE.indices[t * 3],
        CUBE.indices[t * 3 + 2],
        CUBE.indices[t * 3 + 1],
    ]).flat();
    const babylonFile = (material: Record<string, unknown>): string =>
        JSON.stringify({
            producer: { name: "graphty variant fixtures", version: "1", file: "cube.babylon" },
            materials: [{ name: "cube", id: "cube", ...material }],
            meshes: [
                {
                    name: "cube",
                    id: "cube",
                    materialId: "cube",
                    position: [0, 0, 0],
                    rotation: [0, 0, 0],
                    scaling: [1, 1, 1],
                    positions: CUBE.positions.map((v, i) => (i % 3 === 2 ? -v : v)),
                    normals: CUBE.normals.map((v, i) => (i % 3 === 2 ? -v : v)),
                    uvs: CUBE.uvs,
                    indices: babylonIndices,
                },
            ],
        });
    write(
        { ...mesh, id: "babylon", format: "babylon", color: "blue", what: ".babylon mesh with a blue material" },
        {
            "cube.babylon": babylonFile({ diffuse: [0, 0, 1] }),
        },
    );
    write(
        {
            ...mesh,
            id: "babylon-textured",
            format: "babylon",
            color: "green",
            what: ".babylon mesh with a PNG texture",
            upload: "folder",
        },
        {
            "cube.babylon": babylonFile({ diffuse: [1, 1, 1], diffuseTexture: { name: "cube.png" } }),
            "cube.png": png(GREEN),
        },
    );

    // Recognized and refused.
    const refused = (id: string, format: string, name: string, bytes: Uint8Array | string, what: string): void => {
        write(
            {
                id,
                upload: "files",
                format,
                color: "any",
                warnings: [],
                refused: { code: "E_MODEL_FORMAT_UNSUPPORTED", params: { format } },
                what,
            },
            { [name]: bytes },
        );
    };
    refused(
        "fbx",
        "fbx",
        "cube.fbx",
        concat([encoder.encode("Kaydara FBX Binary  "), new Uint8Array([0, 0x1a, 0, 0xe8, 0x1c, 0, 0])]),
        "FBX (refused)",
    );
    refused(
        "dae",
        "dae",
        "cube.dae",
        '<?xml version="1.0" encoding="utf-8"?>\n<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1"></COLLADA>\n',
        "COLLADA (refused)",
    );
    refused("3mf", "3mf", "cube.3mf", zipSync({ "3D/3dmodel.model": encoder.encode("<model/>") }), "3MF (refused)");
    refused(
        "usdz",
        "usdz",
        "cube.usdz",
        zipSync({ "cube.usdc": encoder.encode("PXR-USDC") }, { level: 0 }),
        "USDZ (refused)",
    );
    refused("blend", "blend", "cube.blend", "BLENDER-v300REND", "Blender (refused)");
    refused(
        "bvh",
        "bvh",
        "walk.bvh",
        "HIERARCHY\nROOT Hips\n{\n  OFFSET 0 0 0\n  CHANNELS 3 Xposition Yposition Zposition\n}\nMOTION\nFrames: 1\nFrame Time: 0.033\n0 0 0\n",
        "BVH animation with no mesh (refused)",
    );

    writeFileSync(join(HERE, "manifest.json"), `${JSON.stringify(variants, null, 2)}\n`);
    console.log(`${String(variants.length)} variants written to ${HERE}`);
}

/**
 * The variant folders already written (any folder beside this script).
 * @returns Their names.
 */
function readdirVariants(): string[] {
    return readdirSync(HERE).filter((name) => statSync(join(HERE, name)).isDirectory());
}

await main();
