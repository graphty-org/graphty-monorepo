/**
 * A picture's size read from its header, for every format a model may name, and the bytes it takes
 * on the GPU; and the references a model makes that are data URLs, missing files or no file at all.
 */

import { assert, describe, it } from "vitest";

import {
    type Findings,
    findReference,
    imageSize,
    ModelError,
    resolveReference,
    roleOfName,
    textureBytesOf,
} from "../src/files/references.js";

/**
 * The fact a call threw.
 * @param call - The call.
 * @returns The ModelError's first fact.
 */
function factOf(call: () => unknown): ModelError["fact"] {
    try {
        call();
    } catch (error) {
        assert.instanceOf(error, ModelError);
        return error.fact;
    }
    return assert.fail("it did not throw");
}

/**
 * Bytes from text and numbers.
 * @param parts - Text (as its character codes) or bytes.
 * @returns The bytes.
 */
function bytesOf(...parts: (string | number[])[]): Uint8Array {
    return Uint8Array.from(parts.flatMap((p) => (typeof p === "string" ? Array.from(p, (c) => c.charCodeAt(0)) : p)));
}

/** A 32-bit little-endian integer's bytes. */
const le32 = (v: number): number[] => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];
/** A 32-bit big-endian integer's bytes. */
const be32 = (v: number): number[] => le32(v).reverse();

describe("a picture's size", () => {
    it("reads a WebP's VP8 and VP8X chunks, and nothing from another chunk", () => {
        const webp = (chunk: string, body: number[]): Uint8Array =>
            bytesOf("RIFF", le32(30), "WEBP", chunk, body.concat(Array.from({ length: 14 - body.length }, () => 0)));
        // VP8: a 3-byte frame tag and a 3-byte start code, then 14-bit width and height at 26 and 28.
        assert.deepEqual(imageSize(webp("VP8 ", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 0, 32, 0])), {
            width: 64,
            height: 32,
        });
        // VP8X: width - 1 and height - 1 as 24-bit numbers at 24 and 27.
        assert.deepEqual(imageSize(webp("VP8X", [0, 0, 0, 0, 0, 0, 0, 0, 255, 1, 0, 99, 0, 0])), {
            width: 512,
            height: 100,
        });
        assert.isUndefined(imageSize(webp("ALPH", [])));
    });

    it("walks a JPEG's segments, and gives up on bytes that are not a segment", () => {
        const app0 = [0xff, 0xe0, 0, 4, 0, 0];
        const sof0 = [0xff, 0xc0, 0, 11, 8, 0, 48, 0, 96, 3, 0, 0];
        assert.deepEqual(imageSize(bytesOf([0xff, 0xd8], app0, sof0)), { width: 96, height: 48 });
        assert.isUndefined(imageSize(bytesOf([0xff, 0xd8], [0x00, 0xe0, 0, 4, 0, 0], sof0)));
    });

    it("reads an AVIF's spatial extent, by any of its brands, and nothing when it has none", () => {
        const avif = (brand: string, extent: boolean): Uint8Array =>
            bytesOf(
                le32(0),
                "ftyp",
                brand,
                [0, 0, 0, 0],
                extent ? [...bytesOf("ispe", [0, 0, 0, 0], be32(640), be32(480))] : new Array<number>(16).fill(0),
                new Array<number>(16).fill(0),
            );
        assert.deepEqual(imageSize(avif("avif", true)), { width: 640, height: 480 });
        assert.deepEqual(imageSize(avif("mif1", true)), { width: 640, height: 480 });
        assert.isUndefined(imageSize(avif("avif", false)));
    });

    it("reads a Radiance HDR's resolution either way round, and nothing when both axes are one", () => {
        assert.deepEqual(imageSize(bytesOf("#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 256 +X 512\n")), {
            width: 512,
            height: 256,
        });
        assert.deepEqual(imageSize(bytesOf("#?RADIANCE\n\n+X 300 -Y 200\n")), { width: 300, height: 200 });
        assert.isUndefined(imageSize(bytesOf("#?RADIANCE\n\n-Y 256 +Y 512\n")));
    });

    it("finds no OpenEXR size in a header that ends, is cut short or has an empty window", () => {
        const exr = (...attributes: (string | number[])[]): Uint8Array =>
            bytesOf([0x76, 0x2f, 0x31, 0x01, 2, 0, 0, 0], ...attributes);
        const window = (x0: number, y0: number, x1: number, y1: number): (string | number[])[] => [
            "dataWindow\0box2i\0",
            le32(16),
            [...le32(x0), ...le32(y0), ...le32(x1), ...le32(y1)],
        ];
        assert.deepEqual(imageSize(exr(...window(0, 0, 7, 3))), { width: 8, height: 4 });
        assert.isUndefined(imageSize(exr("\0")), "no attributes");
        assert.isUndefined(imageSize(exr("dataWin")), "a name with no end");
        assert.isUndefined(imageSize(exr("dataWindow\0box2i\0", [1])), "a size cut short");
        assert.isUndefined(imageSize(exr("other\0int\0", le32(-1))), "a negative size");
        assert.isUndefined(imageSize(exr(...window(5, 0, 4, 3))), "an empty window");
    });

    it("reads a TGA only with a pixel depth TGA has", () => {
        const tga = (depth: number): Uint8Array =>
            bytesOf([0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 0, 10, 0, depth, 0]);
        assert.deepEqual(imageSize(tga(24)), { width: 20, height: 10 });
        assert.isUndefined(imageSize(tga(12)));
    });
});

describe("a picture's bytes on the GPU", () => {
    it("refuses a picture it cannot measure, and one wider than any GPU draws", () => {
        assert.deepEqual(
            factOf(() => textureBytesOf(bytesOf("not a picture at all"), "x.png")),
            {
                code: "E_MODEL_STRUCTURE",
                params: { rule: "image", name: "x.png" },
            },
        );
        const wide = bytesOf("GIF89a", [0x01, 0x48, 1, 0]);
        assert.deepEqual(
            factOf(() => textureBytesOf(wide, "wide.gif")),
            {
                code: "E_MODEL_TOO_LARGE",
                params: { what: "textureSize", found: 0x4801, limit: 16384, name: "wide.gif" },
            },
        );
    });

    it("counts a Radiance HDR as floats, 16 bytes a pixel", () => {
        const hdr = bytesOf("#?RADIANCE\n\n-Y 3 +X 4\n");
        assert.strictEqual(textureBytesOf(hdr, "sky.hdr"), Math.ceil((4 * 3 * 16 * 4) / 3));
    });
});

describe("a model's references", () => {
    const files = new Map([["kit/a.bin", Uint8Array.from([1])]]);

    it("decodes a percent-encoded data URL, and refuses one with no payload or a bad escape", () => {
        assert.deepEqual([...resolveReference("data:application/octet-stream,%01%02", "a.gltf", files).bytes], [1, 2]);
        for (const ref of ["data:image/png;base64", "data:image/png", "data:application/octet-stream,%zz"]) {
            assert.strictEqual(factOf(() => resolveReference(ref, "a.gltf", files)).code, "E_MODEL_EXTERNAL_URL", ref);
        }
    });

    it("refuses a web address with no host or path, and cuts a long missing name to 256 characters", () => {
        assert.deepEqual(
            factOf(() => resolveReference("https://?q", "a.gltf", files)),
            {
                code: "E_MODEL_EXTERNAL_URL",
                params: { url: "https://?q" },
            },
        );
        const fact = factOf(() => resolveReference(`${"n".repeat(300)}.png`, "a.gltf", files));
        assert.strictEqual(fact.code, "E_MODEL_MISSING_FILE");
        assert.lengthOf(fact.params.name as string, 256);
    });

    it("records a missing part as optional unless it is geometry, and throws any other refusal", () => {
        const findings: Findings = { warnings: [], missing: [], found: [] };
        assert.isUndefined(findReference("wood.png", "kit/a.gltf", files, "texture", findings));
        assert.isUndefined(findReference("wood.png", "kit/a.gltf", files, "texture", findings));
        findReference("b.bin", "kit/a.gltf", files, "geometry", findings);
        assert.deepEqual(
            findings.missing.map((m) => [m.params.name, m.params.optional]),
            [
                ["kit/wood.png", true],
                ["kit/b.bin", false],
            ],
            "each part once",
        );
        assert.strictEqual(
            factOf(() => findReference("ftp://host/a.bin", "kit/a.gltf", files, "geometry", findings)).code,
            "E_MODEL_EXTERNAL_URL",
        );
    });

    it("tells a part's role by its name", () => {
        assert.deepEqual(
            ["look.MTL", "wood.ktx2", "a.bin"].map((name) => roleOfName(name)),
            ["materials", "texture", "geometry"],
        );
    });
});
