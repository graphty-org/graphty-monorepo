#!/usr/bin/env node
/**
 * Writes src/models/environment.ts: the neutral environment a loaded model's PBR materials
 * reflect when the scene has no environment of its own.
 *
 * graphty-element's lights carry no specular color, so they light a model's diffuse color and
 * nothing else: what a surface reflects comes only from this environment. Its two parts are
 * therefore set apart:
 *
 * - Irradiance (the diffuse part) is a dim uniform gray, a little fill under the lights. At 0.5 the
 *   two together washed a light gray model out to flat white.
 * - Radiance (the reflected part) is a soft studio gradient, bright above and dark below. A metal
 *   has no diffuse color and shows only what it reflects: in a dim uniform environment gold read
 *   flat olive and a clear coat had nothing to show.
 *
 * The radiance is linear in the height of the direction, L(d) = MID + SLOPE * d.y, so it can be
 * prefiltered exactly here with no GPU pass: a lobe symmetric about d averages it to
 * MID + SLOPE * k * d.y, where k is the lobe's mean cosine to d, measured once per mip level by
 * sampling the GGX lobe Babylon.js's own prefiltering uses at that level's roughness. The file is
 * written byte by byte in Babylon.js's .env layout (magic bytes, a NUL-terminated JSON manifest,
 * then one RGBD-encoded PNG per face per mip level; the four side faces of a level point at one
 * copy). Its irradiance is the matching spherical polynomial: a constant radiance L is the
 * polynomial with xx = yy = zz = L and every other term zero.
 *
 * The file is a base64 `data:` URL in a TypeScript module rather than a binary asset, so every
 * build that reads the source (the library, ./bundle, the tests, Storybook) inlines it the same
 * way with no asset configuration, and loading it makes no request.
 *
 * Usage: node scripts/make-model-environment.mjs
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

/** Linear irradiance, the same from every direction and in every color channel. */
const IRRADIANCE = 0.125;
/** Reflected radiance straight up and straight down, in every color channel. */
const TOP = 1;
const BOTTOM = 0.1;
const MID = (TOP + BOTTOM) / 2;
const SLOPE = (TOP - BOTTOM) / 2;
/** Width of the largest mip level of each face. */
const WIDTH = 16;

const MAGIC = [0x86, 0x16, 0x87, 0x96, 0xf6, 0xd6, 0x96, 0x36];

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

function chunk(type, data) {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, "ascii");
    data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
}

/**
 * A size x size RGBA PNG.
 * @param size - Its width and height.
 * @param pixel - The RGBA bytes of the texel in column x and row y.
 * @returns The PNG's bytes.
 */
function png(size, pixel) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA, no interlace
    const rows = [];
    for (let y = 0; y < size; y++) {
        rows.push(Buffer.from([0, ...Array.from({ length: size }, (_, x) => pixel(x, y)).flat()]));
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

/**
 * The mean cosine to its axis of the GGX lobe Babylon.js prefilters with (normal = view =
 * reflection), weighted by N.L as its filter weights samples.
 * @param alpha - The lobe's GGX alpha.
 * @returns k, from 1 (a mirror) down.
 */
function meanCosine(alpha) {
    if (alpha === 0) {
        return 1;
    }
    const samples = 4096;
    let sum = 0;
    let weight = 0;
    for (let i = 0; i < samples; i++) {
        const xi = (i + 0.5) / samples;
        const cosH = Math.sqrt((1 - xi) / (1 + (alpha * alpha - 1) * xi));
        // L = reflect(-N, H): its cosine to N is 2 cos^2(H) - 1, whatever H's azimuth.
        const cosL = 2 * cosH * cosH - 1;
        if (cosL > 0) {
            sum += cosL * cosL;
            weight += cosL;
        }
    }
    return sum / weight;
}

/**
 * The RGBA bytes of a linear gray radiance at most 1, RGBD-encoded as Babylon's toRGBD shader
 * writes it: D = clamp(floor(255 / max) / 255, 0, 1) is 1 for every value here, rgb in gamma space.
 * @param value - The radiance.
 * @returns The four bytes.
 */
function rgbd(value) {
    const gamma = Math.round(Math.min(value, 1) ** (1 / 2.2) * 255);
    return [gamma, gamma, gamma, 255];
}

// Babylon.js's cube faces in .env order (+x, -x, +y, -y, +z, -z): a side face's rows run from +y
// down to -y; +y and -y face straight up and down. Each face's height of a texel's direction:
const side = (u, v) => -v / Math.hypot(1, u, v);
const up = (u, v) => 1 / Math.hypot(1, u, v);
const down = (u, v) => -1 / Math.hypot(1, u, v);

const levels = Math.log2(WIDTH) + 1;
const images = [];
const mipmaps = [];
let position = 0;
for (let level = 0; level < levels; level++) {
    const size = WIDTH >> level;
    // The roughness Babylon.js's HDRFiltering gives this level (lodGenerationScale 0.8, offset 0).
    const k = meanCosine(level === 0 ? 0 : Math.min(2 ** (level / 0.8) / WIDTH, 1));
    const face = (height) =>
        png(size, (x, y) => rgbd(MID + SLOPE * k * height((2 * (x + 0.5)) / size - 1, (2 * (y + 0.5)) / size - 1)));
    const [sides, top, bottom] = [face(side), face(up), face(down)].map((bytes) => {
        const at = { length: bytes.length, position };
        images.push(bytes);
        position += bytes.length;
        return at;
    });
    mipmaps.push(sides, sides, top, bottom, sides, sides);
}

const zero = [0, 0, 0];
const flat = [IRRADIANCE, IRRADIANCE, IRRADIANCE];
const manifest = {
    version: 2,
    width: WIDTH,
    imageType: "image/png",
    irradiance: { x: zero, y: zero, z: zero, xx: flat, yy: flat, zz: flat, yz: zero, zx: zero, xy: zero },
    specular: { mipmaps, lodGenerationScale: 0.8 },
};

const out = Buffer.concat([
    Buffer.from(MAGIC),
    Buffer.from(JSON.stringify(manifest), "ascii"),
    Buffer.from([0]),
    ...images,
]);
const target = fileURLToPath(new URL("../src/models/environment.ts", import.meta.url));
const source = `/**
 * @file THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT scripts/make-model-environment.mjs
 * The neutral prefiltered environment (a Babylon.js .env file, ${out.length} bytes) that model
 * materials reflect when the scene has none: uniform linear irradiance ${IRRADIANCE}, and reflected
 * radiance from ${TOP} straight up to ${BOTTOM} straight down.
 */

/** The .env file as a data: URL. */
export const NEUTRAL_ENVIRONMENT_URL =
    "data:application/octet-stream;base64,${out.toString("base64")}";
`;
writeFileSync(target, source);
console.log(`Wrote ${target} (${out.length} bytes of .env)`);
