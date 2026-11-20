/**
 * A USD model's Radiance HDR and OpenEXR pictures are given to OpenUSD as BMPs it draws: decoded
 * with Babylon's HDRTools or EXR decoder, renamed `<picture>.hdr.bmp` (`.exr.bmp`), and every layer's asset paths renamed to match,
 * a text layer's and a binary layer's tokens alike. One that cannot be decoded is reported as drawn
 * without.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { exrAsBmp, hdrAsBmp } from "../src/decoders/floatPictures.js";
import { readCrate, renameCrateTokens } from "../src/files/readers/usdc.js";
import { WHITE_PNG } from "../src/files/textFormats.js";
import { withFloatPicturesAsBmp } from "../src/load/usdHdr.js";

const VARIANTS = join(dirname(fileURLToPath(import.meta.url)), "fixtures/variants");

/**
 * An 8 x 2 Radiance HDR picture, stored flat: a red row (1, 0, 0) over a gray one (0.25 each).
 * @returns The file.
 */
function hdr(): Uint8Array {
    const head = new TextEncoder().encode("#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 2 +X 8\n");
    const pixels = [...Array<number[]>(8).fill([128, 0, 0, 129]), ...Array<number[]>(8).fill([64, 64, 64, 128])];
    return Uint8Array.from([...head, ...pixels.flat()]);
}

/**
 * An uncompressed OpenEXR picture of float RGB pixels.
 * @param width - Pixels across.
 * @param rows - Each row's color, top first.
 * @returns The file.
 */
function exr(width: number, rows: [number, number, number][]): Uint8Array {
    const text = (t: string): number[] => Array.from(`${t}\0`, (c) => c.codePointAt(0) ?? 0);
    const int32 = (...v: number[]): number[] => [...new Uint8Array(Int32Array.from(v).buffer)];
    const float32 = (...v: number[]): number[] => [...new Uint8Array(Float32Array.from(v).buffer)];
    // Channels are stored by name: B, G, R, each a float (pixel type 2).
    const channels = ["B", "G", "R"].flatMap((c) => [...text(c), ...int32(2), 0, 0, 0, 0, ...int32(1, 1)]);
    const head = [
        ...[0x76, 0x2f, 0x31, 0x01, 2, 0, 0, 0],
        ...[...text("channels"), ...text("chlist"), ...int32(channels.length + 1), ...channels, 0],
        ...[...text("compression"), ...text("compression"), ...int32(1), 0],
        ...[...text("dataWindow"), ...text("box2i"), ...int32(16, 0, 0, width - 1, rows.length - 1)],
        ...[...text("lineOrder"), ...text("lineOrder"), ...int32(1), 0],
        0,
    ];
    const line = 8 + width * 12;
    const table = rows.flatMap((_, y) => [...int32(head.length + rows.length * 8 + y * line), ...int32(0)]);
    const lines = rows.flatMap(([r, g, b], y) => [
        ...int32(y, width * 12),
        ...[b, g, r].flatMap((v) => float32(...Array<number>(width).fill(v))),
    ]);
    return Uint8Array.from([...head, ...table, ...lines]);
}

describe("an OpenEXR picture", () => {
    it("is decoded into a bottom-up 24-bit BMP of its linear values", async () => {
        const bmp = (await exrAsBmp(
            exr(8, [
                [1, 0, 0],
                [0.25, 0.25, 0.25],
            ]),
        )) as Uint8Array;
        const view = new DataView(bmp.buffer);
        assert.strictEqual(String.fromCodePoint(bmp[0], bmp[1]), "BM");
        assert.strictEqual(view.getInt32(18, true), 8);
        assert.strictEqual(view.getInt32(22, true), 2, "rows bottom to top, as the decoder writes them");
        assert.deepStrictEqual([...bmp.subarray(54, 57)], [64, 64, 64], "the bottom row is a quarter gray");
        assert.deepStrictEqual([...bmp.subarray(54 + 24, 57 + 24)], [0, 0, 255], "the top is red");
    });

    it("is undefined when the decoder cannot read it", async () => {
        assert.isUndefined(await exrAsBmp(new TextEncoder().encode("not a picture")));
    });
});

describe("a Radiance HDR picture", () => {
    it("is decoded into a top-down 24-bit BMP of its linear values", () => {
        const bmp = hdrAsBmp(hdr()) as Uint8Array;
        const view = new DataView(bmp.buffer);
        assert.strictEqual(String.fromCodePoint(bmp[0], bmp[1]), "BM");
        assert.strictEqual(view.getInt32(18, true), 8);
        assert.strictEqual(view.getInt32(22, true), -2);
        assert.strictEqual(view.getUint16(28, true), 24);
        // Rows of 24 bytes (8 x 3, already a multiple of 4), blue first.
        assert.deepStrictEqual([...bmp.subarray(54, 57)], [0, 0, 255], "the first row is red");
        assert.deepStrictEqual([...bmp.subarray(54 + 24, 57 + 24)], [64, 64, 64], "the second is a quarter gray");
        assert.strictEqual(bmp.length, 54 + 2 * 24);
    });

    it("is undefined when HDRTools cannot read it", () => {
        assert.isUndefined(hdrAsBmp(new TextEncoder().encode("not a picture")));
    });
});

describe("a USD set with HDR and OpenEXR pictures", () => {
    const layer = new TextEncoder().encode(
        '#usda 1.0\ndef Shader "T" {\n    asset inputs:file = @./maps/sky.hdr@\n}\n' +
            'def Shader "U" {\n    asset inputs:file = @maps/broken.HDR@\n}\n' +
            'def Shader "V" {\n    asset inputs:file = @maps/ground.exr@\n}\n' +
            'def Shader "W" {\n    asset inputs:file = @maps/broken.EXR@\n}\n',
    );

    it("draws each as a BMP beside its name, and renames the text layer's asset paths", async () => {
        const { files, undecoded } = await withFloatPicturesAsBmp(
            new Map([
                ["scene.usda", layer],
                ["maps/sky.hdr", hdr()],
                ["maps/broken.HDR", new Uint8Array([1, 2, 3])],
                ["maps/ground.exr", exr(8, [[0, 1, 0]])],
                ["maps/broken.EXR", new Uint8Array([1, 2, 3])],
            ]),
            [],
            1 << 20,
        );
        assert.sameMembers(
            [...files.keys()],
            ["scene.usda", "maps/sky.hdr.bmp", "maps/broken.HDR.bmp", "maps/ground.exr.bmp", "maps/broken.EXR.bmp"],
        );
        const text = new TextDecoder().decode(files.get("scene.usda"));
        assert.include(text, "@./maps/sky.hdr.bmp@");
        assert.include(text, "@maps/broken.HDR.bmp@");
        assert.include(text, "@maps/ground.exr.bmp@");
        assert.include(text, "@maps/broken.EXR.bmp@");
        assert.strictEqual(String.fromCodePoint(...(files.get("maps/sky.hdr.bmp") as Uint8Array).subarray(0, 2)), "BM");
        assert.strictEqual(
            String.fromCodePoint(...(files.get("maps/ground.exr.bmp") as Uint8Array).subarray(0, 2)),
            "BM",
        );
        assert.deepStrictEqual(
            undecoded,
            ["maps/broken.HDR", "maps/broken.EXR"],
            "the ones the decoders cannot read are drawn without",
        );
        assert.strictEqual(files.get("maps/broken.HDR.bmp"), WHITE_PNG);
        assert.strictEqual(files.get("maps/broken.EXR.bmp"), WHITE_PNG);
    });

    it("gives a picture drawn without as its stand-in, and leaves a set with none as it is", async () => {
        const given = new Map([
            ["scene.usda", layer],
            ["maps/sky.hdr", WHITE_PNG],
        ]);
        const { files, undecoded } = await withFloatPicturesAsBmp(given, ["maps/SKY.hdr"], 1 << 20);
        assert.strictEqual(files.get("maps/sky.hdr.bmp"), WHITE_PNG);
        assert.deepStrictEqual(undecoded, []);
        const plain = new Map([["scene.usda", layer]]);
        assert.strictEqual((await withFloatPicturesAsBmp(plain, [], 1 << 20)).files, plain);
    });

    it("renames a binary layer's tokens, which it then reads as renamed", () => {
        const usdc = new Uint8Array(readFileSync(join(VARIANTS, "usdc", "cube.usdc")));
        const before = readCrate(usdc, 1 << 24);
        const token = before.tokens.find((t) => t.length > 2) as string;
        const renamed = renameCrateTokens(usdc, (t) => (t === token ? `${t}.hdr.bmp` : t), 1 << 24);
        const after = readCrate(renamed, 1 << 24);
        assert.deepStrictEqual(
            after.tokens,
            before.tokens.map((t) => (t === token ? `${t}.hdr.bmp` : t)),
        );
        assert.strictEqual(after.specs.length, before.specs.length);
        assert.strictEqual(
            renameCrateTokens(usdc, (t) => t, 1 << 24),
            usdc,
            "nothing renamed, nothing copied",
        );
    });
});
