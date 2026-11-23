/**
 * The OBJ, MTL and `.babylon` checks on files written here: the picture names an MTL's options
 * hide, which materials draw each picture, what makes a material see-through, the corners an OBJ
 * face may name, and the MTL lines a skipped picture takes away.
 */

import { assert, describe, it } from "vitest";

import { WHITE_PNG, withSkips } from "../src/files/index.js";
import { mtlMaterialsWithout } from "../src/files/textFormats.js";
import { fixture, refusalOf, summaryOf } from "./check-helpers.js";

const PNG = fixture("obj-mtl-png", "cube.png");

/** One triangle, its material from `m.mtl`. */
const TRIANGLE = "mtllib m.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nusemtl a\nf 1 2 3\n";

const encode = (value: string): Uint8Array => new TextEncoder().encode(value);
const decode = (bytes: Uint8Array | undefined): string => new TextDecoder().decode(bytes);

/**
 * A set of text files, and pictures given by name.
 * @param texts - Path to text.
 * @param pictures - Paths of pictures.
 * @returns The set.
 */
function set(texts: Record<string, string>, pictures: string[] = []): Map<string, Uint8Array> {
    return new Map([
        ...Object.entries(texts).map(([path, value]): [string, Uint8Array] => [path, encode(value)]),
        ...pictures.map((path): [string, Uint8Array] => [path, PNG]),
    ]);
}

describe("an OBJ's MTL", () => {
    it("reads a picture's name after the options a map statement takes", async () => {
        const named = async (statement: string, picture: string): Promise<unknown> =>
            (await summaryOf(set({ "t.obj": TRIANGLE, "m.mtl": `newmtl a\n${statement}\n` }, [picture]))).pictures;
        assert.deepEqual(await named("map_Kd -s 1 1 1 -bm 0.5 -clamp on my tex.png", "my tex.png"), [
            { name: "my tex.png", materials: ["a"] },
        ]);
        // -o takes up to three numbers: the name is not one.
        assert.deepEqual(await named("map_Kd -o 2 tex.png", "tex.png"), [{ name: "tex.png", materials: ["a"] }]);
        assert.deepEqual(await named("bump -BM 2 -IMFCHAN l hills.png", "hills.png"), [
            { name: "hills.png", materials: ["a"] },
        ]);
    });

    it("counts a picture two materials draw once, and names a map before any material by no material", async () => {
        const mtl = "map_Ka shared.png\nnewmtl a\nmap_Kd shared.png\nnewmtl b\nmap_Kd shared.png\n";
        const summary = await summaryOf(set({ "t.obj": TRIANGLE, "m.mtl": mtl }, ["shared.png"]));
        assert.strictEqual(summary.textures, 1);
        assert.deepEqual(summary.materials, ["a", "b"]);
        assert.deepEqual(summary.pictures, [{ name: "shared.png", materials: ["", "a", "b"] }]);
        const one = await summaryOf(
            set({ "t.obj": TRIANGLE, "m.mtl": "newmtl a\nmap_Kd shared.png\n" }, ["shared.png"]),
        );
        assert.strictEqual(summary.textureBytes, one.textureBytes);
        assert.deepInclude(
            await refusalOf(set({ "t.obj": TRIANGLE, "m.mtl": mtl }, ["shared.png"]), { maxTextureBytes: 1 }),
            { code: "E_MODEL_TOO_LARGE" },
        );
    });

    it("makes a material see-through for d under 1 or Tr over 0, never for d 1 or Tr 0", async () => {
        const transparent = async (statement: string): Promise<boolean | undefined> =>
            (await summaryOf(set({ "t.obj": TRIANGLE, "m.mtl": `newmtl a\n${statement}\n` }))).transparent;
        assert.isTrue(await transparent("d 0.5"));
        assert.isTrue(await transparent("Tr 0.25"));
        assert.isFalse(await transparent("d 1"));
        assert.isFalse(await transparent("Tr 0"));
    });
});

describe("an OBJ's faces", () => {
    const faces = (face: string): Map<string, Uint8Array> => set({ "t.obj": `v 0 0 0\nv 1 0 0\nv 0 1 0\n${face}\n` });

    it("draws a face of indices counted back from the last vertex", async () => {
        const summary = await summaryOf(faces("f -3 -2 -1"));
        assert.strictEqual(summary.triangles, 1);
        assert.deepEqual(summary.bounds, { min: [0, 0, 0], max: [1, 1, 0] });
    });

    it("refuses a face corner of 0, one that is not a number, and one further back than the vertices", async () => {
        for (const face of ["f 0 1 2", "f 1 2 x", "f -4 -2 -1", "f 1.5 2 3"]) {
            assert.deepEqual((await refusalOf(faces(face))).params, { rule: "index", where: "obj.f" }, face);
        }
    });

    it("gives an OBJ with no vertices no box", async () => {
        const summary = await summaryOf(set({ "t.obj": "o empty\n" }));
        assert.strictEqual(summary.triangles, 0);
        assert.isUndefined(summary.bounds);
    });
});

describe("a .babylon file", () => {
    const quad = {
        positions: [0, 0, 0, 1, 0, 0, 1, 1, 0],
        indices: [0, 1, 2],
    };

    it("lists unnamed materials, see-through ones and vertex colors", async () => {
        const json = {
            materials: [{ id: "glass", alpha: 0.4 }, { name: "paint" }],
            meshes: [{ id: "a", materialId: "glass", ...quad, colors: [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1] }],
        };
        const summary = await summaryOf(set({ "s.babylon": JSON.stringify(json) }));
        assert.deepEqual(summary.materials, ["", "paint"]);
        assert.isTrue(summary.transparent);
        assert.isTrue(summary.vertexColors);
        assert.deepEqual(summary.bounds, { min: [0, 0, 0], max: [1, 1, 0] });
    });

    it("gives a file with no positions no box and no vertex colors, and holds it to the texture limit", async () => {
        const empty = await summaryOf(set({ "s.babylon": JSON.stringify({ materials: [{ alpha: 1 }], meshes: [] }) }));
        assert.isUndefined(empty.bounds);
        assert.isUndefined(empty.vertexColors);
        assert.isFalse(empty.transparent);
        const painted = {
            materials: [{ id: "m", diffuseTexture: { name: "skin.png" } }],
            meshes: [{ id: "a", materialId: "m", ...quad }],
        };
        assert.deepInclude(
            await refusalOf(set({ "s.babylon": JSON.stringify(painted) }, ["skin.png"]), { maxTextureBytes: 1 }),
            { code: "E_MODEL_TOO_LARGE" },
        );
    });
});

describe("skipping an MTL's pictures", () => {
    const mtl = "newmtl wood\nmap_Kd maps/wood.png\nbump maps/wood.png\nnewmtl metal\nKd 1 1 1\nmap_Kd metal.png\n";

    it("names the materials whose color picture is skipped, by its path or its base name", () => {
        const files = set({ "kit/m.mtl": mtl, "kit/t.obj": TRIANGLE, "readme.txt": "map_Kd metal.png" });
        assert.deepEqual([...mtlMaterialsWithout(files, ["kit/maps/WOOD.png"])], ["wood"]);
        // A part reported by its bare name: kit/m.mtl's metal.png is kit/metal.png in the set.
        assert.deepEqual([...mtlMaterialsWithout(files, ["Metal.png"])], ["metal"]);
        assert.deepEqual([...mtlMaterialsWithout(files, [])], []);
        assert.deepEqual([...mtlMaterialsWithout(files, ["other.png"])], []);
    });

    it("drops every map line naming a skipped picture, and stands in an empty MTL for a skipped one", () => {
        const files = set({ "m.mtl": mtl, "t.obj": TRIANGLE });
        const drawn = withSkips(files, ["maps/wood.png"], true);
        assert.strictEqual(decode(drawn.get("m.mtl")), "newmtl wood\nnewmtl metal\nKd 1 1 1\nmap_Kd metal.png\n");
        assert.strictEqual(drawn.get("maps/wood.png"), WHITE_PNG, "a 1 x 1 white PNG in its place");
        const kept = withSkips(files, ["maps/wood.png"]);
        assert.strictEqual(decode(kept.get("m.mtl")), mtl, "without dropMaps the MTL is left as it is");

        const noMtl = withSkips(set({ "t.obj": TRIANGLE }), ["m.mtl"], true);
        assert.strictEqual(noMtl.get("m.mtl")?.length, 0);
        assert.strictEqual(withSkips(files, []), files);
    });
});
