/**
 * A USD model's Radiance HDR (`.hdr`) picture draws its picture, as a PNG does: OpenUSD's importer
 * leaves an `.hdr` off, so babylonjs-models decodes it and hands it over as a BMP. Before, every
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

describe("a USD model with a Radiance HDR picture", () => {
    it("draws the picture, not the node's color", async () => {
        const element = await mount();
        const files = new Map([
            ["cube.usda", await cubeReading("color.hdr")],
            ["color.hdr", greenHdr()],
        ]);
        const record = await element.session.assets.add({ files });
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        await drawModel(element, files, [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
        const frame = await readFrame(element);
        const green = countIn(frame, GREEN);
        const red = countIn(frame, RED);
        assert.isAbove(green.left + green.right, 500, "the cube is drawn in its picture's green");
        assert.strictEqual(red.left + red.right, 0, "nothing in the node's red");
    });

    it("draws a part whose picture cannot be decoded in the node's color", async () => {
        const element = await mount();
        // A Radiance header HDRTools refuses: narrower than 8 pixels.
        const narrow = Uint8Array.from([
            ...new TextEncoder().encode("#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1 +X 1\n"),
            0,
            128,
            0,
            129,
        ]);
        const files = new Map([
            ["cube.usda", await cubeReading("color.hdr")],
            ["color.hdr", narrow],
        ]);
        const record = await element.session.assets.add({ files });
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        await drawModel(element, files, [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
        const red = countIn(await readFrame(element), RED);
        assert.isAbove(red.left + red.right, 500, "the cube is drawn in the node's red");
    });
});
