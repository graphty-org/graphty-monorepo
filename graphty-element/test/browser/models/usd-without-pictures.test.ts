/**
 * A USD model drawn without its pictures keeps its geometry and its plain look: a part whose
 * roughness picture is taken off is still drawn (RoughnessTest.usdz lost every strip), and a part
 * whose color and glow picture is taken off is drawn in the node's color, not in the white glow
 * the file gives it without the picture (SoC-ElephantWithMonochord.usdc). A two-sided part keeps
 * both its sides in the node's color: RoughnessTest's strips, seen from behind, vanished.
 */

import { assert, describe, it } from "vitest";

import { countIn, drawModel, filesOf, mount, readFrame } from "./helpers";

const RED = (r: number, g: number, b: number): boolean => r > 120 && g < 60 && b < 60;
const BLUE = (r: number, g: number, b: number): boolean => b > 100 && r < 70 && g < 70;
const GREEN = (r: number, g: number, b: number): boolean => g > 100 && r < 70 && b < 70;

/**
 * The usda cube fixture with its surface replaced.
 * @param surface - The UsdPreviewSurface's inputs and the texture shaders beside it.
 * @returns The layer's text.
 */
async function cubeWith(surface: string): Promise<Uint8Array> {
    const text = new TextDecoder().decode((await filesOf("usda")).get("cube.usda"));
    const out = text.replace(/def Shader "Surface"[\s\S]*?token outputs:surface\n {8}\}/, surface);
    assert.notStrictEqual(out, text, "the fixture's surface was replaced");
    return new TextEncoder().encode(out);
}

/**
 * A UsdUVTexture shader reading one picture.
 * @param name - The shader's name.
 * @param file - The picture.
 * @param output - Its output: `rgb` or `r`.
 * @returns The shader.
 */
function texture(name: string, file: string, output: "rgb" | "r"): string {
    return `def Shader "${name}"
        {
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @./${file}@
            float2 inputs:st.connect = </Cube/Look/St.outputs:result>
            ${output === "rgb" ? "float3 outputs:rgb" : "float outputs:r"}
        }
`;
}

const ST = `def Shader "St"
        {
            uniform token info:id = "UsdPrimvarReader_float2"
            token inputs:varname = "st"
            float2 outputs:result
        }
`;

describe("a USD model without its pictures", () => {
    it("still draws a part whose roughness picture is taken off, in its own color", async () => {
        const element = await mount();
        const picture = (await filesOf("usd-layers")).get("textures/cube.png") as Uint8Array;
        const layer = await cubeWith(`def Shader "Surface"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor = (0, 0, 1)
            float inputs:roughness.connect = </Cube/Look/Rough.outputs:r>
            token outputs:surface
        }
        ${texture("Rough", "rough.png", "r")}
        ${ST}`);
        const files = new Map([
            ["cube.usda", layer],
            ["rough.png", picture],
        ]);
        const record = await element.session.assets.add({ files });
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        await element.session.assets.setDefaults(record.id, { hiddenTextures: ["rough.png"] });
        await drawModel(element, files, [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
        const { left, right } = countIn(await readFrame(element), BLUE);
        assert.isAbove(left + right, 500, "the part is drawn, in its own blue");
    });

    // Still, and posed by its clip (the Elephant plays one, and a playing model keeps its own vertices).
    it.each([
        ["still", {}],
        [
            "held in its clip",
            { "node.modelAnimation": "USD Animation 1", "node.modelAnimationSpeed": 0, "node.modelAnimationOffset": 0 },
        ],
    ])(
        "draws a part whose color and glow picture is taken off in the node's color, not its white glow (%s)",
        async (_how, clip) => {
            const element = await mount();
            const picture = (await filesOf("usd-layers")).get("textures/cube.png") as Uint8Array;
            const layer = await cubeWith(`def Shader "Surface"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor = (0.18, 0.18, 0.18)
            color3f inputs:diffuseColor.connect = </Cube/Look/Color.outputs:rgb>
            color3f inputs:emissiveColor = (1, 1, 1)
            color3f inputs:emissiveColor.connect = </Cube/Look/Glow.outputs:rgb>
            token outputs:surface
        }
        ${texture("Color", "color.png", "rgb")}
        ${texture("Glow", "color.png", "rgb")}
        ${ST}`).then((bytes) =>
                // A white displayColor, as the Elephant's exporter writes: drawn as white vertex colors.
                new TextEncoder().encode(
                    new TextDecoder()
                        .decode(bytes)
                        .replace(
                            "uniform token subdivisionScheme",
                            "color3f[] primvars:displayColor = [(1, 1, 1)]\n        uniform token subdivisionScheme",
                        )
                        .replace(
                            'def Xform "Cube"\n{',
                            'def Xform "Cube"\n{\n    float xformOp:rotateY.timeSamples = {\n        0: 0,\n        24: 90,\n    }\n    uniform token[] xformOpOrder = ["xformOp:rotateY"]\n',
                        )
                        .replace(
                            "upAxis",
                            "endTimeCode = 24\n    startTimeCode = 0\n    timeCodesPerSecond = 24\n    upAxis",
                        ),
                ),
            );
            const files = new Map([
                ["cube.usda", layer],
                ["color.png", picture],
            ]);
            const record = await element.session.assets.add({ files });
            assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
            await element.session.assets.setDefaults(record.id, { hiddenTextures: ["color.png"] });
            await drawModel(element, files, [{ id: "a", x: 0 }], { "node.color": "#ff0000", ...clip });
            const frame = await readFrame(element);
            const red = countIn(frame, RED);
            const green = countIn(frame, GREEN);
            assert.isAbove(red.left + red.right, 500, "the part is drawn in the node's red");
            assert.strictEqual(green.left + green.right, 0, "nothing of the picture is left");
        },
    );

    // One square, two-sided, whose picture is taken off; drawn facing each way, so one of the two
    // shows the camera its back.
    it.each([
        ["facing +Z", "(-0.5, -0.5, 0), (0.5, -0.5, 0), (0.5, 0.5, 0), (-0.5, 0.5, 0)"],
        ["facing -Z", "(-0.5, -0.5, 0), (-0.5, 0.5, 0), (0.5, 0.5, 0), (0.5, -0.5, 0)"],
    ])("draws a two-sided square %s without its picture, in the node's color", async (_facing, points) => {
        const element = await mount();
        const picture = (await filesOf("usd-layers")).get("textures/cube.png") as Uint8Array;
        const layer = `#usda 1.0
(
    defaultPrim = "Square"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Square"
{
    def Mesh "Mesh" (
        prepend apiSchemas = ["MaterialBindingAPI"]
    )
    {
        uniform bool doubleSided = 1
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        rel material:binding = </Square/Look>
        point3f[] points = [${points}]
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (
            interpolation = "vertex"
        )
        uniform token subdivisionScheme = "none"
    }

    def Material "Look"
    {
        token outputs:surface.connect = </Square/Look/Surface.outputs:surface>

        def Shader "Surface"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor.connect = </Square/Look/Color.outputs:rgb>
            token outputs:surface
        }

        def Shader "Color"
        {
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @./color.png@
            float2 inputs:st.connect = </Square/Look/St.outputs:result>
            float3 outputs:rgb
        }

        def Shader "St"
        {
            uniform token info:id = "UsdPrimvarReader_float2"
            token inputs:varname = "st"
            float2 outputs:result
        }
    }
}
`;
        const files = new Map([
            ["square.usda", new TextEncoder().encode(layer)],
            ["color.png", picture],
        ]);
        const record = await element.session.assets.add({ files });
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        await element.session.assets.setDefaults(record.id, { hiddenTextures: ["color.png"] });
        await drawModel(element, files, [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
        const { left, right } = countIn(await readFrame(element), RED);
        assert.isAbove(left + right, 500, "the square is drawn in the node's red from either side");
    });
});
