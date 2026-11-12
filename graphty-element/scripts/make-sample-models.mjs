#!/usr/bin/env node
/**
 * Writes the sample models in assets/models/: box, server, person and tree, each a .glb and a
 * 128 x 128 .png thumbnail of it.
 *
 * The models are built here from boxes, cylinders, cones and spheres, so the package owns them
 * outright and dedicates them to the public domain (CC0 1.0, written into each GLB's
 * `asset.copyright` and into assets/models/LICENSES.md). Every base color is a light neutral gray,
 * so `node.modelTint` (the model's base color times `node.color`) shows a data color faithfully.
 * Faces are flat shaded, the model's up axis is +Y as glTF requires, and the front faces +Z.
 *
 * The thumbnails are drawn from the same triangles by a small software rasterizer (an
 * orthographic three-quarter view, one directional light, a depth buffer, 3 x 3 supersampling and a
 * one-pixel gray outline so a light model reads on a light or a dark page), with a transparent
 * background.
 *
 * It also writes two story fixtures that are not shipped, in stories/fixtures/models/: an STL made
 * with +Y up (stories/NodeModels.stories.ts turns it upright) and a GLB cut short (a model that
 * fails); and a test fixture, test/fixtures/models/police.glb, laid out as the Kenney car kit's
 * models are: a GLB whose one picture is the separate file Textures/colormap.png.
 *
 * The output is byte-for-byte deterministic. Usage: node scripts/make-sample-models.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const OUT = fileURLToPath(new URL("../assets/models/", import.meta.url));
const COPYRIGHT = "CC0 1.0 (public domain), graphty-org; https://creativecommons.org/publicdomain/zero/1.0/";
const GENERATOR = "graphty-element scripts/make-sample-models.mjs";

// ---------------------------------------------------------------------------------------------
// Geometry: every part is a list of triangles, each three [x, y, z] points, counter-clockwise
// seen from outside.
// ---------------------------------------------------------------------------------------------

function box(cx, cy, cz, sx, sy, sz) {
    const [x0, x1, y0, y1, z0, z1] = [cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2];
    const quad = (a, b, c, d) => [
        [a, b, c],
        [a, c, d],
    ];
    return [
        ...quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]), // +Z
        ...quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]), // -Z
        ...quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]), // +X
        ...quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]), // -X
        ...quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]), // +Y
        ...quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]), // -Y
    ];
}

/** A frustum about a vertical axis; r1 = 0 makes a cone. */
function frustum(cx, cz, y0, y1, r0, r1, segments) {
    const ring = (y, r) =>
        Array.from({ length: segments }, (_, i) => {
            const a = (i / segments) * Math.PI * 2;
            return [cx + Math.sin(a) * r, y, cz + Math.cos(a) * r];
        });
    const bottom = ring(y0, r0);
    const top = ring(y1, r1);
    const tris = [];
    for (let i = 0; i < segments; i++) {
        const j = (i + 1) % segments;
        tris.push([bottom[i], bottom[j], top[j]]);
        if (r1 > 0) {
            tris.push([bottom[i], top[j], top[i]], [[cx, y1, cz], top[i], top[j]]);
        }
        tris.push([[cx, y0, cz], bottom[j], bottom[i]]);
    }
    return tris;
}

function sphere(cx, cy, cz, r, rings, segments) {
    const point = (ring, seg) => {
        const phi = (ring / rings) * Math.PI;
        const theta = (seg / segments) * Math.PI * 2;
        return [
            cx + r * Math.sin(phi) * Math.sin(theta),
            cy + r * Math.cos(phi),
            cz + r * Math.sin(phi) * Math.cos(theta),
        ];
    };
    const tris = [];
    for (let i = 0; i < rings; i++) {
        for (let j = 0; j < segments; j++) {
            const [a, b, c, d] = [point(i, j), point(i + 1, j), point(i + 1, j + 1), point(i, j + 1)];
            if (i > 0) {
                tris.push([a, b, d]);
            }
            if (i < rings - 1) {
                tris.push([b, c, d]);
            }
        }
    }
    return tris;
}

// ---------------------------------------------------------------------------------------------
// The four samples: parts by material.
// ---------------------------------------------------------------------------------------------

const SAMPLES = [
    {
        name: "box",
        materials: [{ name: "box", color: [0.9, 0.9, 0.9] }],
        parts: [[0, box(0, 0, 0, 1, 1, 1)]],
    },
    {
        name: "server",
        materials: [
            { name: "cabinet", color: [0.88, 0.88, 0.88] },
            { name: "bay", color: [0.62, 0.62, 0.62] },
            { name: "light", color: [0.97, 0.97, 0.97] },
        ],
        parts: [
            [0, box(0, 0.6, 0, 0.6, 1.2, 0.6)],
            ...Array.from({ length: 6 }, (_, i) => [1, box(-0.03, 0.16 + i * 0.17, 0.31, 0.44, 0.12, 0.02)]),
            ...Array.from({ length: 6 }, (_, i) => [2, box(0.23, 0.16 + i * 0.17, 0.315, 0.05, 0.05, 0.03)]),
        ],
    },
    {
        name: "person",
        materials: [
            { name: "body", color: [0.86, 0.86, 0.86] },
            { name: "head", color: [0.94, 0.94, 0.94] },
        ],
        parts: [
            [0, frustum(-0.09, 0, 0, 0.75, 0.065, 0.075, 10)],
            [0, frustum(0.09, 0, 0, 0.75, 0.065, 0.075, 10)],
            [0, frustum(0, 0, 0.72, 1.36, 0.16, 0.2, 14)],
            [0, frustum(-0.26, 0, 0.82, 1.32, 0.045, 0.055, 8)],
            [0, frustum(0.26, 0, 0.82, 1.32, 0.045, 0.055, 8)],
            [1, sphere(0, 1.54, 0, 0.14, 8, 14)],
        ],
    },
    {
        name: "tree",
        materials: [
            { name: "trunk", color: [0.85, 0.81, 0.76] },
            { name: "leaves", color: [0.9, 0.92, 0.88] },
        ],
        parts: [
            [0, frustum(0, 0, 0, 0.5, 0.08, 0.06, 8)],
            [1, frustum(0, 0, 0.35, 0.9, 0.45, 0, 12)],
            [1, frustum(0, 0, 0.65, 1.15, 0.35, 0, 12)],
            [1, frustum(0, 0, 0.9, 1.4, 0.25, 0, 12)],
        ],
    },
];

// ---------------------------------------------------------------------------------------------
// GLB
// ---------------------------------------------------------------------------------------------

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (v) => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
};
const faceNormal = ([a, b, c]) => normalize(cross(sub(b, a), sub(c, a)));
/** Rounded to float32, so min and max match the stored positions exactly. */
const f32 = (x) => Math.fround(Math.round(x * 1e6) / 1e6);

function trianglesByMaterial(sample) {
    return sample.materials.map((_, m) => sample.parts.filter(([index]) => index === m).flatMap(([, tris]) => tris));
}

function glb(sample) {
    const groups = trianglesByMaterial(sample);
    const chunks = [];
    const bufferViews = [];
    const accessors = [];
    let offset = 0;
    const push = (typed, target) => {
        const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
        const padded = new Uint8Array(Math.ceil(bytes.length / 4) * 4);
        padded.set(bytes);
        chunks.push(padded);
        bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
        offset += padded.length;
        return bufferViews.length - 1;
    };

    const primitives = groups.map((tris, material) => {
        const positions = new Float32Array(tris.length * 9);
        const normals = new Float32Array(tris.length * 9);
        tris.forEach((tri, t) => {
            const n = faceNormal(tri);
            tri.forEach((p, k) => {
                positions.set(p.map(f32), t * 9 + k * 3);
                normals.set(n.map(f32), t * 9 + k * 3);
            });
        });
        const indices = new Uint16Array(tris.length * 3).map((_, i) => i);
        const min = [0, 1, 2].map((axis) => Math.min(...positions.filter((_, i) => i % 3 === axis)));
        const max = [0, 1, 2].map((axis) => Math.max(...positions.filter((_, i) => i % 3 === axis)));
        const count = tris.length * 3;
        accessors.push({ bufferView: push(positions, 34962), componentType: 5126, count, type: "VEC3", min, max });
        const position = accessors.length - 1;
        accessors.push({ bufferView: push(normals, 34962), componentType: 5126, count, type: "VEC3" });
        const normal = accessors.length - 1;
        accessors.push({ bufferView: push(indices, 34963), componentType: 5123, count, type: "SCALAR" });
        return { attributes: { POSITION: position, NORMAL: normal }, indices: accessors.length - 1, material };
    });

    const json = {
        asset: { version: "2.0", generator: GENERATOR, copyright: COPYRIGHT },
        scene: 0,
        scenes: [{ name: sample.name, nodes: [0] }],
        nodes: [{ name: sample.name, mesh: 0 }],
        meshes: [{ name: sample.name, primitives }],
        materials: sample.materials.map(({ name, color }) => ({
            name,
            pbrMetallicRoughness: { baseColorFactor: [...color, 1], metallicFactor: 0, roughnessFactor: 0.8 },
        })),
        accessors,
        bufferViews,
        buffers: [{ byteLength: offset }],
    };

    const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
    const jsonChunk = new Uint8Array(Math.ceil(jsonBytes.length / 4) * 4).fill(0x20);
    jsonChunk.set(jsonBytes);
    const bin = new Uint8Array(offset);
    let at = 0;
    for (const chunk of chunks) {
        bin.set(chunk, at);
        at += chunk.length;
    }

    const total = 12 + 8 + jsonChunk.length + 8 + bin.length;
    const out = new Uint8Array(total);
    const view = new DataView(out.buffer);
    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, total, true);
    view.setUint32(12, jsonChunk.length, true);
    view.setUint32(16, 0x4e4f534a, true);
    out.set(jsonChunk, 20);
    view.setUint32(20 + jsonChunk.length, bin.length, true);
    view.setUint32(24 + jsonChunk.length, 0x004e4942, true);
    out.set(bin, 28 + jsonChunk.length);
    return out;
}

// ---------------------------------------------------------------------------------------------
// Thumbnail
// ---------------------------------------------------------------------------------------------

const SIZE = 128;
const SS = 3;
const LIGHT = normalize([-0.5, 0.8, 0.6]);
const OUTLINE = [0x6b, 0x72, 0x80];

/**
 * Draw one screen-space triangle into the depth and color buffers.
 * @param {number[][]} tri - The triangle's corners, [x, y, depth] in pixels.
 * @param {number[]} rgb - Its lit color.
 * @param {Float32Array} depth - The depth buffer, W x W.
 * @param {Float32Array} color - The color buffer, W x W x 3.
 * @param {number} W - The buffers' width.
 */
function rasterize([a, b, c], rgb, depth, color, W) {
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (area >= 0) {
        return; // Facing away (screen y points down, so front faces wind clockwise here).
    }
    const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const maxY = Math.min(W - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const [px, py] = [x + 0.5, y + 0.5];
            const w0 = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area;
            const w1 = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area;
            const w2 = 1 - w0 - w1;
            if (w0 < 0 || w1 < 0 || w2 < 0) {
                continue;
            }
            const z = w0 * a[2] + w1 * b[2] + w2 * c[2];
            const i = y * W + x;
            if (z > depth[i]) {
                depth[i] = z;
                color.set(rgb, i * 3);
            }
        }
    }
}

/**
 * Average the SS x SS supersamples behind one output pixel.
 * @param {Float32Array} depth - The depth buffer.
 * @param {Float32Array} color - The color buffer.
 * @param {number} W - The buffers' width.
 * @param {number} x - The output pixel's column.
 * @param {number} y - The output pixel's row.
 * @returns {{ sum: number[], covered: number }} The summed color and how many samples hit the model.
 */
function samplesAt(depth, color, W, x, y) {
    const sum = [0, 0, 0];
    let covered = 0;
    for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
            const i = (y * SS + dy) * W + x * SS + dx;
            if (depth[i] > -Infinity) {
                covered++;
                for (let k = 0; k < 3; k++) {
                    sum[k] += color[i * 3 + k];
                }
            }
        }
    }
    return { sum, covered };
}

/**
 * Downsample the supersampled buffers to SIZE x SIZE RGBA.
 * @param {Float32Array} depth - The depth buffer.
 * @param {Float32Array} color - The color buffer.
 * @param {number} W - The buffers' width.
 * @returns {Uint8Array} The pixels.
 */
function downsample(depth, color, W) {
    const rgba = new Uint8Array(SIZE * SIZE * 4);
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const { sum, covered } = samplesAt(depth, color, W, x, y);
            const o = (y * SIZE + x) * 4;
            if (covered > 0) {
                for (let k = 0; k < 3; k++) {
                    rgba[o + k] = Math.round((255 * sum[k]) / covered);
                }
                rgba[o + 3] = Math.round((255 * covered) / (SS * SS));
            }
        }
    }
    return rgba;
}

/**
 * Outline every transparent pixel that touches the model.
 * @param {Uint8Array} rgba - The pixels, outlined in place.
 */
function outline(rgba) {
    const solid = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE && rgba[(y * SIZE + x) * 4 + 3] > 127;
    const edge = [];
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) {
                edge.push((y * SIZE + x) * 4);
            }
        }
    }
    for (const o of edge) {
        rgba.set([...OUTLINE, 255], o);
    }
}

function render(sample) {
    const groups = trianglesByMaterial(sample);
    // Turn the model so its front (+Z) and right side show, then tip it toward the viewer.
    const yaw = (-35 * Math.PI) / 180;
    const pitch = (22 * Math.PI) / 180;
    const view = ([x, y, z]) => {
        const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
        const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
        return [x1, y * Math.cos(pitch) - z1 * Math.sin(pitch), y * Math.sin(pitch) + z1 * Math.cos(pitch)];
    };
    const viewed = groups.map((tris) => tris.map((tri) => tri.map(view)));
    const all = viewed.flat(2);
    const lo = [0, 1].map((a) => Math.min(...all.map((p) => p[a])));
    const hi = [0, 1].map((a) => Math.max(...all.map((p) => p[a])));
    const W = SIZE * SS;
    const scale = (W * 0.84) / Math.max(hi[0] - lo[0], hi[1] - lo[1]);
    const center = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2];
    const toScreen = ([x, y, z]) => [W / 2 + (x - center[0]) * scale, W / 2 - (y - center[1]) * scale, z];

    const depth = new Float32Array(W * W).fill(-Infinity);
    const color = new Float32Array(W * W * 3);
    viewed.forEach((tris, m) => {
        const base = sample.materials[m].color;
        tris.forEach((tri, t) => {
            const n = faceNormal(groups[m][t]);
            const lit = 0.3 + 0.7 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
            rasterize(
                tri.map(toScreen),
                base.map((channel) => channel * lit),
                depth,
                color,
                W,
            );
        });
    });

    const rgba = downsample(depth, color, W);
    outline(rgba);
    return png(rgba);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return c >>> 0;
});

function crc32(bytes) {
    let c = 0xffffffff;
    for (const b of bytes) {
        c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(data, 8);
    view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
}

function png(rgba, size = SIZE) {
    const header = new Uint8Array(13);
    const hv = new DataView(header.buffer);
    hv.setUint32(0, size);
    hv.setUint32(4, size);
    header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
    const raw = new Uint8Array(size * (size * 4 + 1));
    for (let y = 0; y < size; y++) {
        raw.set(rgba.subarray(y * size * 4, (y + 1) * size * 4), y * (size * 4 + 1) + 1);
    }
    const parts = [
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk("IHDR", header),
        pngChunk("IDAT", deflateSync(raw, { level: 9 })),
        pngChunk("IEND", new Uint8Array(0)),
    ];
    return Buffer.concat(parts);
}

// ---------------------------------------------------------------------------------------------
// Story fixtures (not shipped): a binary STL made with Y up, which the element's Z-up guess lays on
// its side, and a GLB cut short, which intake refuses.
// ---------------------------------------------------------------------------------------------

function binaryStl(tris) {
    const out = new Uint8Array(84 + tris.length * 50);
    const view = new DataView(out.buffer);
    out.set(new TextEncoder().encode("graphty-element story fixture: a column made with +Y up"));
    view.setUint32(80, tris.length, true);
    tris.forEach((tri, t) => {
        const at = 84 + t * 50;
        [faceNormal(tri), ...tri].forEach((v, k) => {
            v.forEach((x, axis) => view.setFloat32(at + k * 12 + axis * 4, f32(x), true));
        });
    });
    return out;
}

const FIXTURES = fileURLToPath(new URL("../stories/fixtures/models/", import.meta.url));

mkdirSync(OUT, { recursive: true });
mkdirSync(FIXTURES, { recursive: true });
for (const sample of SAMPLES) {
    const model = glb(sample);
    const thumbnail = render(sample);
    writeFileSync(`${OUT}${sample.name}.glb`, model);
    writeFileSync(`${OUT}${sample.name}.png`, thumbnail);
    process.stdout.write(`${sample.name}: ${String(model.length)} B model, ${String(thumbnail.length)} B thumbnail\n`);
    if (sample.name === "server") {
        writeFileSync(`${FIXTURES}damaged.glb`, model.subarray(0, Math.floor(model.length / 2)));
    }
}

writeFileSync(
    `${FIXTURES}column-y-up.stl`,
    binaryStl([...box(0, 0.5, 0, 0.3, 1, 0.3), ...frustum(0, 0, 1, 1.4, 0.3, 0, 4)]),
);

// ---------------------------------------------------------------------------------------------
// Test fixture (not shipped): a box whose texture is a separate file, as a Kenney kit's GLB is.
// ---------------------------------------------------------------------------------------------

/** A GLB of one box with UVs, whose material's base color texture is the file `imageUri`. */
function externalTextureGlb(name, imageUri) {
    const tris = box(0, 0.5, 0, 1, 1, 1);
    const positions = new Float32Array(tris.flat(2).map(f32));
    const normals = new Float32Array(tris.flatMap((tri) => [0, 1, 2].flatMap(() => faceNormal(tri))).map(f32));
    // Each vertex samples the palette by its x and z, so every face shows a few of its colors.
    const uvs = new Float32Array(tris.flatMap((tri) => tri.flatMap(([x, , z]) => [x + 0.5, z + 0.5])).map(f32));
    const parts = [positions, normals, uvs].map((typed) => new Uint8Array(typed.buffer));
    const bin = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    const bufferViews = [];
    let at = 0;
    for (const part of parts) {
        bin.set(part, at);
        bufferViews.push({ buffer: 0, byteOffset: at, byteLength: part.length, target: 34962 });
        at += part.length;
    }

    const count = tris.length * 3;
    const json = {
        asset: { version: "2.0", generator: GENERATOR, copyright: COPYRIGHT },
        scene: 0,
        scenes: [{ name, nodes: [0] }],
        nodes: [{ name, mesh: 0 }],
        meshes: [{ name, primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, material: 0 }] }],
        materials: [
            {
                name: "colormap",
                pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.8 },
            },
        ],
        textures: [{ source: 0, sampler: 0 }],
        samplers: [{ magFilter: 9728, minFilter: 9728 }],
        images: [{ uri: imageUri }],
        accessors: [
            { bufferView: 0, componentType: 5126, count, type: "VEC3", min: [-0.5, 0, -0.5], max: [0.5, 1, 0.5] },
            { bufferView: 1, componentType: 5126, count, type: "VEC3" },
            { bufferView: 2, componentType: 5126, count, type: "VEC2" },
        ],
        bufferViews,
        buffers: [{ byteLength: bin.length }],
    };
    const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
    const jsonChunk = new Uint8Array(Math.ceil(jsonBytes.length / 4) * 4).fill(0x20);
    jsonChunk.set(jsonBytes);
    const total = 12 + 8 + jsonChunk.length + 8 + bin.length;
    const out = new Uint8Array(total);
    const view = new DataView(out.buffer);
    view.setUint32(0, 0x46546c67, true);
    view.setUint32(4, 2, true);
    view.setUint32(8, total, true);
    view.setUint32(12, jsonChunk.length, true);
    view.setUint32(16, 0x4e4f534a, true);
    out.set(jsonChunk, 20);
    view.setUint32(20 + jsonChunk.length, bin.length, true);
    view.setUint32(24 + jsonChunk.length, 0x004e4942, true);
    out.set(bin, 28 + jsonChunk.length);
    return out;
}

/** An 8 x 8 palette of four saturated colors in 4 x 4 blocks, as a kit's colormap is. */
function colormap() {
    const colors = [
        [0x1f, 0x4e, 0xd8],
        [0xf2, 0xf2, 0xf2],
        [0xd8, 0x2b, 0x2b],
        [0x22, 0x22, 0x28],
    ];
    const rgba = new Uint8Array(8 * 8 * 4);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            rgba.set([...colors[(y >> 2) * 2 + (x >> 2)], 255], (y * 8 + x) * 4);
        }
    }
    return png(rgba, 8);
}

const TEST_FIXTURES = fileURLToPath(new URL("../test/fixtures/models/", import.meta.url));
mkdirSync(`${TEST_FIXTURES}Textures`, { recursive: true });
writeFileSync(`${TEST_FIXTURES}police.glb`, externalTextureGlb("police", "Textures/colormap.png"));
writeFileSync(`${TEST_FIXTURES}Textures/colormap.png`, colormap());
