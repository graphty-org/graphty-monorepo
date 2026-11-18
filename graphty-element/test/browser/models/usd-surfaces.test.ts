/**
 * USD surfaces Babylon's USD importer reads unlike the specification, drawn as the file means:
 * - a texture that connects no texture coordinate draws on a mesh whose one coordinate primvar is
 *   not named `st` (the importer reads `st` and dropped the mesh, so the USD Mini Car Kit, whose
 *   meshes name theirs `map1`, failed to load at all);
 * - a surface that leaves its base color out has the specification's 0.18 gray, not white, so a
 *   surface that only glows draws its glow (usduvtexture_color_test.usda's swatches were pale);
 * - a mesh whose GeomSubsets bind their own materials draws each subset in its own (the importer
 *   gives it a MultiMaterial; the sedan drew all over in its first subset's material).
 */

import { assert, describe, it } from "vitest";

import { countIn, drawModel, filesOf, mount, readFrame } from "./helpers";

describe("USD surfaces the importer reads unlike the specification", () => {
    it("draws on a mesh whose coordinates are named map1", async () => {
        const text = new TextDecoder().decode((await filesOf("usda")).get("cube.usda"));
        const picture = (await filesOf("usd-layers")).get("textures/cube.png") as Uint8Array;
        const layer = text
            .replace("primvars:st =", "primvars:map1 =")
            .replace(
                "color3f inputs:diffuseColor = (0, 0, 1)",
                "color3f inputs:diffuseColor.connect = </Cube/Look/Tex.outputs:rgb>",
            )
            .replace(
                "            token outputs:surface\n        }\n",
                `            token outputs:surface
        }

        def Shader "Tex"
        {
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @./t.png@
            vector3f outputs:rgb
        }
`,
            );
        assert.include(layer, '"UsdUVTexture"');
        const files = new Map([
            ["cube.usda", new TextEncoder().encode(layer)],
            ["t.png", picture],
        ]);
        const { problems } = await drawModel(await mount(), files, [{ id: "a", x: 0 }]);
        assert.deepStrictEqual(problems, []);
    });

    it("draws a surface that only glows in its glow, its base color the default gray", async () => {
        const text = new TextDecoder().decode((await filesOf("usda")).get("cube.usda"));
        const layer = text.replace(
            "color3f inputs:diffuseColor = (0, 0, 1)",
            "color3f inputs:emissiveColor = (0.574, 0.125, 0.031)",
        );
        const element = await mount();
        await drawModel(element, new Map([["cube.usda", new TextEncoder().encode(layer)]]), [{ id: "a", x: 0 }], {
            "node.modelTint": false,
        });
        const frame = await readFrame(element);
        const at = (Math.floor(frame.height / 2) * frame.width + Math.floor(frame.width / 2)) * 4;
        const [r, g, b] = frame.pixels.slice(at, at + 3);
        // Lit white over the glow drew (255, 216, 202); the gray adds a little light to orange.
        assert.isTrue(r > 170 && g < 160 && b < 130 && r - b > 80, `orange, not pale: ${String([r, g, b])}`);
    });

    it("draws each GeomSubset of a mesh in the material it binds", async () => {
        const text = new TextDecoder().decode((await filesOf("usda")).get("cube.usda"));
        const subset = (name: string, faces: string, look: string): string => `def GeomSubset "${name}" (
            prepend apiSchemas = ["MaterialBindingAPI"]
        )
        {
            uniform token elementType = "face"
            uniform token familyName = "materialBind"
            int[] indices = [${faces}]
            rel material:binding = </Cube/${look}>
        }
`;
        const layer = text
            .replace(
                '        uniform token subdivisionScheme = "none"\n',
                `        uniform token subdivisionScheme = "none"\n        ${subset("Greens", "0, 1, 2, 3, 5", "Green")}        ${subset("Reds", "4", "Red")}`,
            )
            .replace('def Material "Look"', 'def Material "Red"')
            .replace("color3f inputs:diffuseColor = (0, 0, 1)", "color3f inputs:diffuseColor = (1, 0, 0)")
            .replace("Look/Surface", "Red/Surface")
            .replace(/\n\}\s*$/, "").concat(`
    def Material "Green"
    {
        token outputs:surface.connect = </Cube/Green/Surface.outputs:surface>

        def Shader "Surface"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor = (0, 1, 0)
            token outputs:surface
        }
    }
}
`);
        const element = await mount();
        await drawModel(element, new Map([["cube.usda", new TextEncoder().encode(layer)]]), [{ id: "a", x: 0 }]);
        const frame = await readFrame(element);
        const red = countIn(frame, (r, g, b) => r > 100 && g < 60 && b < 60);
        const green = countIn(frame, (r, g, b) => g > 100 && r < 60 && b < 60);
        // The camera faces the cube's +Z face, the red subset's one face; the green one is listed
        // first, so a mesh drawn in one material draws it green.
        assert.isAbove(red.left + red.right, 200, "the red subset");
        assert.strictEqual(green.left + green.right, 0, "the green subset, out of sight");
    });
});
