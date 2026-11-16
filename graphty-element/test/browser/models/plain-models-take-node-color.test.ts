/**
 * A model part that states no color of its own draws in the node's color from the style layers,
 * whatever format it came in and however it lost its material: an OBJ loaded without its `.mtl`,
 * a glTF primitive with no material (Babylon gives it a white default), a glTF material that names
 * no color and no picture, a model whose materials are only plain grays, an STL and a PLY with
 * neither. A part whose material states a color
 * keeps it unless `node.modelTint` asks otherwise.
 */

import { assert, describe, it } from "vitest";

import { countIn, drawModel, filesOf, type Frame, mount, readFrame } from "./helpers";

const RED = (r: number, g: number, b: number): boolean => r > 120 && g < 60 && b < 60;
const BLUE = (r: number, g: number, b: number): boolean => b > 100 && r < 70 && g < 70;

/**
 * Count the pixels of a frame that pass a test.
 * @param frame - The frame.
 * @param match - Which pixels count.
 * @returns How many.
 */
function count(frame: Frame, match: (r: number, g: number, b: number) => boolean): number {
    const { left, right } = countIn(frame, match);
    return left + right;
}

/**
 * The gltf-bin cube with its material changed.
 * @param edit - What to do to its JSON.
 * @returns Its files.
 */
async function gltfWith(edit: (json: Record<string, unknown>) => void): Promise<Map<string, Uint8Array>> {
    const files = await filesOf("gltf-bin");
    const json = JSON.parse(new TextDecoder().decode(files.get("cube.gltf"))) as Record<string, unknown>;
    edit(json);
    files.set("cube.gltf", new TextEncoder().encode(JSON.stringify(json)));
    return files;
}

/** The glTF primitive. */
type Primitive = { material?: number };

describe("a model part with no color of its own", () => {
    it("draws an OBJ loaded without its .mtl in the node's color, and follows a later color", async () => {
        const element = await mount();
        const files = await filesOf("obj-mtl");
        files.delete("cube.mtl");
        const record = await element.session.assets.add({ files }, { skipped: ["cube.mtl"] });
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        const { layer, asset } = await drawModel(element, files, [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
        assert.isAbove(count(await readFrame(element), RED), 500, "the cube is drawn red");
        await element.session.styles.update(layer, { set: { "node.model": asset, "node.color": "#0000ff" } });
        const blue = await readFrame(element);
        assert.isAbove(count(blue, BLUE), 500, "and blue once the layer says blue");
        assert.strictEqual(count(blue, RED), 0);
    });

    it("draws a glTF primitive with no material in the node's color", async () => {
        const element = await mount();
        const files = await gltfWith((json) => {
            delete json.materials;
            for (const mesh of json.meshes as { primitives: Primitive[] }[]) {
                for (const primitive of mesh.primitives) {
                    delete primitive.material;
                }
            }
        });
        await drawModel(element, files, [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
        assert.isAbove(count(await readFrame(element), RED), 500, "the cube is drawn red");
    });

    it("draws a glTF material that names no color and no picture in the node's color", async () => {
        const element = await mount();
        const files = await gltfWith((json) => {
            json.materials = [{ name: "plain" }];
        });
        await drawModel(element, files, [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
        assert.isAbove(count(await readFrame(element), RED), 500, "the cube is drawn red");
    });

    it("draws a model whose only material is a plain gray in the node's color", async () => {
        const element = await mount();
        // Blender's default material: 0.8 gray, no picture.
        const files = await gltfWith((json) => {
            json.materials = [
                { name: "Material", pbrMetallicRoughness: { baseColorFactor: [0.8, 0.8, 0.8, 1], metallicFactor: 0 } },
            ];
        });
        await drawModel(element, files, [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
        assert.isAbove(count(await readFrame(element), RED), 500, "the cube is drawn red");
    });

    it("keeps a plain gray model's own gray when a layer sets node.modelTint to false", async () => {
        const element = await mount();
        const files = await gltfWith((json) => {
            json.materials = [
                { name: "Material", pbrMetallicRoughness: { baseColorFactor: [0.8, 0.8, 0.8, 1], metallicFactor: 0 } },
            ];
        });
        await drawModel(element, files, [{ id: "a", x: 0 }], { "node.color": "#ff0000", "node.modelTint": false });
        assert.equal(count(await readFrame(element), RED), 0, "the cube is not drawn red");
    });

    it("keeps a see-through metallic gray as the file draws it", async () => {
        const element = await mount();
        const files = await gltfWith((json) => {
            json.materials = [
                {
                    name: "Glass",
                    alphaMode: "BLEND",
                    pbrMetallicRoughness: { baseColorFactor: [0.5, 0.5, 0.5, 0.3], metallicFactor: 1 },
                },
            ];
        });
        await drawModel(element, files, [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
        assert.equal(count(await readFrame(element), RED), 0, "the cube is not drawn red");
    });

    for (const variant of ["stl-binary", "ply-ascii"]) {
        it(`draws a plain ${variant} in the node's color`, async () => {
            const element = await mount();
            await drawModel(element, variant, [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
            assert.isAbove(count(await readFrame(element), RED), 500, "the model is drawn red");
        });
    }

    it("paints a GLB's embedded picture over in the node's color under 'replace'", async () => {
        const element = await mount();
        const GREEN = (r: number, g: number, b: number): boolean => g > 100 && r < 70 && b < 70;
        const { layer, asset } = await drawModel(element, "glb-textured", [{ id: "a", x: 0 }], {
            "node.color": "#ff0000",
        });
        const own = count(await readFrame(element), GREEN);
        assert.isAbove(own, 300, "its embedded green picture");
        await element.session.styles.update(layer, {
            set: { "node.model": asset, "node.color": "#ff0000", "node.modelTint": "replace" },
        });
        const replaced = await readFrame(element);
        assert.isAbove(count(replaced, RED), own * 0.8, "one flat node color");
        assert.strictEqual(count(replaced, GREEN), 0, "no picture left");
    });

    it("keeps a glTF material's own blue unless the tint asks for the node's", async () => {
        const element = await mount();
        await drawModel(element, "gltf-bin", [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
        const own = await readFrame(element);
        assert.isAbove(count(own, BLUE), 500, "its own blue");
        assert.strictEqual(count(own, RED), 0);
    });
});
