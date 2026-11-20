/**
 * A USD model's Radiance HDR (`.hdr`) or OpenEXR (`.exr`) picture draws its picture, as a PNG does:
 * OpenUSD's importer leaves both off, so babylonjs-models decodes each and hands it over as a BMP. Before, every
 * part textured with one drew in the node's color (usd-wg's usduvtexture_color_test.usda). One that
 * cannot be decoded is drawn without its picture, in the node's color.
 */

import { assert, describe, it } from "vitest";

import { countIn, drawModel, filesOf, mount, readFrame } from "./helpers";

const RED = (r: number, g: number, b: number): boolean => r > 120 && g < 60 && b < 60;
const GREEN = (r: number, g: number, b: number): boolean => g > 100 && r < 70 && b < 70;

/**
 * An 8 x 8 Radiance HDR picture of pure green (0, 1, 0), stored flat.
 * @returns The file.
 */
function greenHdr(): Uint8Array {
    const head = new TextEncoder().encode("#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 8 +X 8\n");
    return Uint8Array.from([...head, ...Array<number[]>(64).fill([0, 128, 0, 129]).flat()]);
}

/**
 * An 8 x 8 OpenEXR picture of pure green (0, 1, 0): uncompressed, half-float B, G and R channels.
 * @returns The file.
 */
function greenExr(): Uint8Array {
    const bytes: number[] = [0x76, 0x2f, 0x31, 0x01, 2, 0, 0, 0];
    const put = (...parts: (string | number[])[]): void => {
        for (const part of parts) {
            bytes.push(...(typeof part === "string" ? Array.from(`${part}\0`, (c) => c.charCodeAt(0)) : part));
        }
    };
    const le = (v: number): number[] => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
    // Each channel: its name, pixel type 1 (half), linear flag and padding, x and y sampling.
    const channel = (name: string): (string | number[])[] => [name, [...le(1), 0, 0, 0, 0, ...le(1), ...le(1)]];
    put("channels", "chlist", le(55), ...channel("B"), ...channel("G"), ...channel("R"), [0]);
    put("compression", "compression", le(1), [0], "dataWindow", "box2i", le(16), [
        ...le(0),
        ...le(0),
        ...le(7),
        ...le(7),
    ]);
    put("lineOrder", "lineOrder", le(1), [0], [0]);
    // A line: its y, its size, then each channel's 8 halves (0 is 0x0000, 1 is 0x3c00).
    const line = 8 + 8 * 3 * 2;
    const start = bytes.length + 8 * 8;
    for (let y = 0; y < 8; y++) {
        put([...le(start + y * line), 0, 0, 0, 0]);
    }
    for (let y = 0; y < 8; y++) {
        put(
            le(y),
            le(line - 8),
            Array<number>(16).fill(0),
            Array<number[]>(8).fill([0x00, 0x3c]).flat(),
            Array<number>(16).fill(0),
        );
    }
    return Uint8Array.from(bytes);
}

/**
 * The usda cube fixture with its color read from one picture.
 * @param file - The picture.
 * @returns The layer.
 */
async function cubeReading(file: string): Promise<Uint8Array> {
    const text = new TextDecoder().decode((await filesOf("usda")).get("cube.usda"));
    const out = text.replace(
        /def Shader "Surface"[\s\S]*?token outputs:surface\n {8}\}/,
        `def Shader "Surface"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor.connect = </Cube/Look/Color.outputs:rgb>
            token outputs:surface
        }
        def Shader "Color"
        {
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @./${file}@
            float2 inputs:st.connect = </Cube/Look/St.outputs:result>
            float3 outputs:rgb
        }
        def Shader "St"
        {
            uniform token info:id = "UsdPrimvarReader_float2"
            token inputs:varname = "st"
            float2 outputs:result
        }`,
    );
    assert.notStrictEqual(out, text, "the fixture's surface was replaced");
    return new TextEncoder().encode(out);
}

/**
 * Draw the usda cube with its color read from one picture, the node colored red.
 * @param file - The picture's name.
 * @param bytes - The picture.
 * @returns The frame drawn.
 */
async function drawCubeReading(file: string, bytes: Uint8Array): Promise<Awaited<ReturnType<typeof readFrame>>> {
    const element = await mount();
    const files = new Map([
        ["cube.usda", await cubeReading(file)],
        [file, bytes],
    ]);
    const record = await element.session.assets.add({ files });
    assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
    await drawModel(element, files, [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
    return readFrame(element);
}

const PICTURES = [
    {
        kind: "a Radiance HDR",
        file: "color.hdr",
        green: greenHdr(),
        // A Radiance header HDRTools refuses: narrower than 8 pixels.
        broken: Uint8Array.from([
            ...new TextEncoder().encode("#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1 +X 1\n"),
            ...[0, 128, 0, 129],
        ]),
    },
    {
        kind: "an OpenEXR",
        file: "color.exr",
        green: greenExr(),
        // An OpenEXR whose channels (B, G, R renamed Z) are none the decoder reads.
        broken: greenExr().map((b, i) => (i === 28 || i === 46 || i === 64 ? 0x5a : b)),
    },
];

describe.each(PICTURES)("a USD model with $kind picture", ({ file, green, broken }) => {
    it("draws the picture, not the node's color", async () => {
        const frame = await drawCubeReading(file, green);
        const greens = countIn(frame, GREEN);
        const red = countIn(frame, RED);
        assert.isAbove(greens.left + greens.right, 500, "the cube is drawn in its picture's green");
        assert.strictEqual(red.left + red.right, 0, "nothing in the node's red");
    });

    it("draws a part whose picture cannot be decoded in the node's color", async () => {
        const red = countIn(await drawCubeReading(file, broken), RED);
        assert.isAbove(red.left + red.right, 500, "the cube is drawn in the node's red");
    });
});
