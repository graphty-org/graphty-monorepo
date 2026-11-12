/**
 * @file The model fixtures of design/rendering/node-models.md section 10, built as bytes.
 *
 * The samples are tiny valid files of every format `session.assets` reads; the hostile ones are
 * each built to trip exactly one check. They are built here rather than committed as files
 * because several are large on purpose (a 100,000-node glTF, a 1,000:1 zip) and every one is
 * clearer as the few lines that make it than as an opaque binary.
 */

import { zipSync } from "fflate";

const encoder = new TextEncoder();

/**
 * UTF-8 bytes of text.
 * @param text - The text.
 * @returns The bytes.
 */
export function utf8(text: string): Uint8Array {
    return encoder.encode(text);
}

/** A valid 1 x 1 PNG. */
export const PNG_1X1 = Uint8Array.from(
    atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
    (c) => c.charCodeAt(0),
);

/**
 * A PNG header claiming a size (the pixels are not there; only the header is read).
 * @param width - The claimed width.
 * @param height - The claimed height.
 * @returns The bytes.
 */
export function pngClaiming(width: number, height: number): Uint8Array {
    const bytes = PNG_1X1.slice();
    const view = new DataView(bytes.buffer);
    view.setUint32(16, width);
    view.setUint32(20, height);
    return bytes;
}

/**
 * Base64 of bytes.
 * @param bytes - The bytes.
 * @returns Base64.
 */
function base64(bytes: Uint8Array): string {
    let binary = "";
    for (const b of bytes) {
        binary += String.fromCharCode(b);
    }

    return btoa(binary);
}

/** One triangle: three float positions. */
const TRIANGLE = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);

/**
 * A glTF with one triangle mesh, its buffer in a separate .bin.
 * @param overrides - Fields to replace in the JSON.
 * @returns The JSON object.
 */
export function triangleGltf(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        asset: { version: "2.0", generator: "graphty fixtures" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
        materials: [{ name: "plain", pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] } }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] }],
        bufferViews: [{ buffer: 0, byteLength: 36 }],
        buffers: [{ uri: "tri.bin", byteLength: 36 }],
        ...overrides,
    };
}

/** The .bin of {@link triangleGltf}. */
export const TRIANGLE_BIN = new Uint8Array(TRIANGLE.buffer.slice(0));

/**
 * A .gltf and its .bin as a files map.
 * @param json - The glTF JSON.
 * @returns path to bytes.
 */
export function gltfPair(json: Record<string, unknown> = triangleGltf()): Map<string, Uint8Array> {
    return new Map([
        ["tri.gltf", utf8(JSON.stringify(json))],
        ["tri.bin", TRIANGLE_BIN],
    ]);
}

/**
 * A .gltf with its .bin and a PNG texture beside it, as a files map: a model of three files.
 * @returns path to bytes.
 */
export function texturedGltfSet(): Map<string, Uint8Array> {
    const json = triangleGltf({
        materials: [{ name: "painted", pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
        textures: [{ source: 0 }],
        images: [{ uri: "tex.png" }],
    });
    return new Map([...gltfPair(json), ["tex.png", PNG_1X1]]);
}

/**
 * A GLB from JSON and a binary chunk.
 * @param json - The glTF JSON.
 * @param bin - The binary chunk.
 * @returns The GLB bytes.
 */
export function glb(json: Record<string, unknown>, bin?: Uint8Array): Uint8Array {
    let jsonBytes = utf8(JSON.stringify(json));
    const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
    jsonBytes = Uint8Array.from([...jsonBytes, ...new Array<number>(jsonPad).fill(0x20)]);
    const binPadded =
        bin === undefined
            ? undefined
            : Uint8Array.from([...bin, ...new Array<number>((4 - (bin.length % 4)) % 4).fill(0)]);
    const total = 12 + 8 + jsonBytes.length + (binPadded === undefined ? 0 : 8 + binPadded.length);
    const out = new Uint8Array(total);
    const view = new DataView(out.buffer);
    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, total, true);
    view.setUint32(12, jsonBytes.length, true);
    view.setUint32(16, 0x4e4f534a, true);
    out.set(jsonBytes, 20);
    if (binPadded !== undefined) {
        const at = 20 + jsonBytes.length;
        view.setUint32(at, binPadded.length, true);
        view.setUint32(at + 4, 0x004e4942, true);
        out.set(binPadded, at + 8);
    }

    return out;
}

/**
 * A GLB with one textured triangle: the PNG sits in the binary chunk after the positions.
 * @param png - The image bytes.
 * @returns The GLB.
 */
export function texturedGlb(png: Uint8Array = PNG_1X1): Uint8Array {
    const bin = new Uint8Array(36 + png.length);
    bin.set(TRIANGLE_BIN, 0);
    bin.set(png, 36);
    return glb(
        triangleGltf({
            materials: [{ name: "painted", pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
            textures: [{ source: 0 }],
            images: [{ bufferView: 1, mimeType: "image/png" }],
            bufferViews: [
                { buffer: 0, byteLength: 36 },
                { buffer: 0, byteOffset: 36, byteLength: png.length },
            ],
            buffers: [{ byteLength: bin.length }],
            animations: [
                {
                    name: "spin",
                    samplers: [{ input: 1, output: 2 }],
                    channels: [{ sampler: 0, target: { node: 0, path: "rotation" } }],
                },
            ],
            accessors: [
                { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] },
                { componentType: 5126, count: 2, type: "SCALAR", min: [0], max: [2.5] },
                { componentType: 5126, count: 2, type: "VEC4" },
            ],
        }),
        bin,
    );
}

/** An OBJ quad, its MTL (a texture behind option flags) and the PNG, as a files map. */
export function objSet(
    mtl = "newmtl painted\nKd 1 1 1\nmap_Kd -o 0 0 0 -s 1 1 1 tex.png\n",
    obj?: string,
): Map<string, Uint8Array> {
    return new Map([
        [
            "quad.obj",
            utf8(obj ?? "mtllib quad.mtl\no quad\nv 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nusemtl painted\nf 1 2 3 4\n"),
        ],
        ["quad.mtl", utf8(mtl)],
        ["tex.png", PNG_1X1],
    ]);
}

/**
 * A binary STL.
 * @param triangles - The triangles it holds.
 * @param declared - The count its header claims (default: the real one).
 * @returns The bytes.
 */
export function binaryStl(triangles = 1, declared = triangles): Uint8Array {
    const out = new Uint8Array(84 + 50 * triangles);
    out.set(utf8("binary stl fixture"), 0);
    const view = new DataView(out.buffer);
    view.setUint32(80, declared, true);
    for (let t = 0; t < triangles; t++) {
        for (let i = 0; i < 9; i++) {
            view.setFloat32(84 + t * 50 + 12 + i * 4, TRIANGLE[i] + t, true);
        }
    }

    return out;
}

/** An ASCII STL with one facet. */
export const ASCII_STL = utf8(
    "solid tri\n facet normal 0 0 1\n  outer loop\n   vertex 0 0 0\n   vertex 1 0 0\n   vertex 0 1 0\n  endloop\n endfacet\nendsolid tri\n",
);

/** An ASCII PLY with one triangle. */
export const ASCII_PLY = utf8(
    "ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n0 0 0\n1 0 0\n0 1 0\n3 0 1 2\n",
);

/**
 * A zip of entries.
 * @param entries - name to bytes.
 * @param level - Deflate level.
 * @returns The zip bytes.
 */
export function zip(entries: Record<string, Uint8Array>, level: 0 | 9 = 9): Uint8Array {
    return zipSync(entries, { level });
}

/**
 * The hostile references, each refused with E_MODEL_EXTERNAL_URL. A `file:` URL is a path on its
 * author's disk and means only its base name (design 12.5), so it is not here.
 */
export const HOSTILE_REFERENCES = ["//host/x.bin", "%2e%2e/x.bin", "../x.bin", "blob:https://a/b", "http://host/x.bin"];

/** A glTF whose accessor claims 2e8 elements with no buffer view behind it. */
export function accessorBomb(): Map<string, Uint8Array> {
    return gltfPair(
        triangleGltf({
            accessors: [
                { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
                { componentType: 5126, count: 2e8, type: "SCALAR" },
            ],
        }),
    );
}

/** A glTF whose nodes form a cycle. */
export function nodeCycle(): Map<string, Uint8Array> {
    return gltfPair(triangleGltf({ scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, children: [1] }, { children: [0] }] }));
}

/**
 * A glTF whose nodes form a chain.
 * @param length - How many nodes deep.
 * @returns The file set.
 */
export function nodeChain(length: number): Map<string, Uint8Array> {
    const nodes = Array.from({ length }, (_, i) => (i + 1 < length ? { children: [i + 1] } : { mesh: 0 }));
    return gltfPair(triangleGltf({ nodes }));
}

/**
 * A glTF in which one 12-triangle mesh is used by many nodes.
 * @param uses - How many nodes use it.
 * @returns The file set.
 */
export function meshUsedBy(uses: number): Map<string, Uint8Array> {
    const positions = new Float32Array(36 * 3);
    const nodes = Array.from({ length: uses }, () => ({ mesh: 0 }));
    return new Map([
        [
            "many.gltf",
            utf8(
                JSON.stringify(
                    triangleGltf({
                        scenes: [{ nodes: nodes.map((_, i) => i) }],
                        nodes,
                        accessors: [{ bufferView: 0, componentType: 5126, count: 36, type: "VEC3" }],
                        bufferViews: [{ buffer: 0, byteLength: positions.byteLength }],
                        buffers: [
                            {
                                uri: `data:application/octet-stream;base64,${base64(new Uint8Array(positions.buffer))}`,
                                byteLength: positions.byteLength,
                            },
                        ],
                    }),
                ),
            ),
        ],
    ]);
}

/** A glTF whose image is a PNG header claiming 65,536 x 65,536, as a data: URL. */
export function hugePngGltf(): Map<string, Uint8Array> {
    return gltfPair(
        triangleGltf({
            textures: [{ source: 0 }],
            images: [{ uri: `data:image/png;base64,${base64(pngClaiming(65536, 65536))}` }],
        }),
    );
}

/**
 * A GLB holding one UV sphere with normals: `2 * segments * rings` triangles, stretched by
 * `scale`, in one white (or `color`) material.
 * @param segments - Slices around the axis.
 * @param rings - Bands from pole to pole.
 * @param scale - The stretch along x, y and z.
 * @param color - The base color factor.
 * @param offset - Where the sphere's center sits, away from the file's origin.
 * @returns The GLB.
 */
export function sphereGlb(
    segments = 16,
    rings = 8,
    scale: readonly [number, number, number] = [1, 1, 1],
    color: readonly [number, number, number, number] = [1, 1, 1, 1],
    offset: readonly [number, number, number] = [0, 0, 0],
): Uint8Array {
    const positions: number[] = [];
    const normals: number[] = [];
    for (let ring = 0; ring <= rings; ring++) {
        const theta = (ring / rings) * Math.PI;
        for (let segment = 0; segment <= segments; segment++) {
            const phi = (segment / segments) * Math.PI * 2;
            const n = [Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)];
            normals.push(...n);
            positions.push(n[0] * scale[0] + offset[0], n[1] * scale[1] + offset[1], n[2] * scale[2] + offset[2]);
        }
    }

    const indices: number[] = [];
    const row = segments + 1;
    for (let ring = 0; ring < rings; ring++) {
        for (let segment = 0; segment < segments; segment++) {
            const a = ring * row + segment;
            const b = a + row;
            indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
    }

    const positionBytes = new Uint8Array(new Float32Array(positions).buffer);
    const normalBytes = new Uint8Array(new Float32Array(normals).buffer);
    const indexBytes = new Uint8Array(new Uint32Array(indices).buffer);
    const bin = new Uint8Array(positionBytes.length + normalBytes.length + indexBytes.length);
    bin.set(positionBytes, 0);
    bin.set(normalBytes, positionBytes.length);
    bin.set(indexBytes, positionBytes.length + normalBytes.length);
    const count = positions.length / 3;
    const json = {
        asset: { version: "2.0", generator: "graphty fixtures" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
        materials: [
            {
                name: "plain",
                pbrMetallicRoughness: { baseColorFactor: [...color], metallicFactor: 0, roughnessFactor: 1 },
            },
        ],
        accessors: [
            {
                bufferView: 0,
                componentType: 5126,
                count,
                type: "VEC3",
                min: [offset[0] - scale[0], offset[1] - scale[1], offset[2] - scale[2]],
                max: [offset[0] + scale[0], offset[1] + scale[1], offset[2] + scale[2]],
            },
            { bufferView: 1, componentType: 5126, count, type: "VEC3" },
            { bufferView: 2, componentType: 5125, count: indices.length, type: "SCALAR" },
        ],
        bufferViews: [
            { buffer: 0, byteOffset: 0, byteLength: positionBytes.length, target: 34962 },
            { buffer: 0, byteOffset: positionBytes.length, byteLength: normalBytes.length, target: 34962 },
            {
                buffer: 0,
                byteOffset: positionBytes.length + normalBytes.length,
                byteLength: indexBytes.length,
                target: 34963,
            },
        ],
        buffers: [{ byteLength: bin.length }],
    };

    return glb(json, bin);
}
