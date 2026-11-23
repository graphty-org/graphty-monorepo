/**
 * The FBX checks on ASCII files written here: where models' transforms put a mesh, how often a
 * shared mesh is drawn, the pictures textures name, the clips of FBX 7 stacks and FBX 6 takes, and
 * the curves drawn as tubes.
 */

import { assert, describe, it } from "vitest";

import { asciiFbxPictures } from "../src/files/fbxChecks.js";
import { checkModelFiles, DEFAULT_MODEL_LIMITS } from "../src/files/index.js";
import { fixture, refusalOf, summaryOf } from "./check-helpers.js";

/** One second in FBX time units. */
const SECOND = 46_186_158_000;

/** A triangle geometry of id 200, from (0, 0, 0) to (1, 1, 0). */
const TRIANGLE = `Geometry: 200, "Geometry::tri", "Mesh" {
    Vertices: *9 { a: 0,0,0,1,0,0,0,1,0 }
    PolygonVertexIndex: *3 { a: 0,1,-3 }
}`;

/**
 * An FBX 7.4 ASCII file.
 * @param objects - The Objects block's body.
 * @param connections - The Connections block's body.
 * @param top - More top-level blocks.
 * @returns The set holding it as `s.fbx`.
 */
function fbx(objects: string, connections = "", top = ""): Map<string, Uint8Array> {
    const text = `; FBX 7.4.0 project file
FBXHeaderExtension:  {
    FBXVersion: 7400
}
${top}
Objects:  {
${objects}
}
Connections:  {
${connections}
}
`;
    return new Map([["s.fbx", new TextEncoder().encode(text)]]);
}

/**
 * A model of an id, with Properties70 entries.
 * @param id - Its id.
 * @param properties - Name to its three numbers.
 * @returns The block.
 */
function model(id: number, properties: Record<string, [number, number, number]> = {}): string {
    const lines = Object.entries(properties).map(
        ([name, [x, y, z]]) => `        P: "${name}", "${name}", "", "A", ${String(x)}, ${String(y)}, ${String(z)}`,
    );
    return `Model: ${String(id)}, "Model::m${String(id)}", "Mesh" {\n    Properties70:  {\n${lines.join("\n")}\n    }\n}`;
}

describe("an FBX scene's meshes", () => {
    it("places a mesh through its model's and the model's parent's transforms", async () => {
        const files = fbx(
            [TRIANGLE, model(100, { "Lcl Translation": [10, 0, 0] }), model(101, { "Lcl Scaling": [2, 2, 2] })].join(
                "\n",
            ),
            'C: "OO", 200, 100\nC: "OO", 100, 101\nC: "OO", 101, 0',
        );
        const summary = await summaryOf(files);
        assert.strictEqual(summary.triangles, 1);
        assert.deepEqual(summary.bounds, { min: [20, 0, 0], max: [22, 2, 0] });
    });

    it("draws a mesh two models use twice, and one no model uses once where it is", async () => {
        const shared = await summaryOf(
            fbx(
                [TRIANGLE, model(100), model(101, { "Lcl Translation": [0, 0, 5] })].join("\n"),
                'C: "OO", 200, 100\nC: "OO", 200, 101',
            ),
        );
        assert.deepEqual([shared.meshes, shared.triangles], [2, 2]);
        assert.deepEqual(shared.bounds, { min: [0, 0, 0], max: [1, 1, 5] });
        const alone = await summaryOf(fbx(TRIANGLE));
        assert.deepEqual([alone.meshes, alone.triangles], [1, 1]);
        assert.deepEqual(alone.bounds, { min: [0, 0, 0], max: [1, 1, 0] });
    });

    it("walks models that are each other's parent once, and skips connections that are not C", async () => {
        const summary = await summaryOf(
            fbx(
                [TRIANGLE, model(100, { "Lcl Translation": [1, 0, 0] }), model(101)].join("\n"),
                'C: "OO", 200, 100\nC: "OO", 100, 101\nC: "OO", 101, 100\nNote: "OO", 100, 999',
            ),
        );
        assert.deepEqual(summary.bounds, { min: [1, 0, 0], max: [2, 1, 0] });
    });

    it("refuses vertices that are not whole points", async () => {
        const broken = TRIANGLE.replace("a: 0,0,0,1,0,0,0,1,0", "a: 0,0,0,1,0,0,0,1");
        assert.deepEqual((await refusalOf(fbx(broken))).params, { rule: "fbx" });
    });

    it("reads see-through materials and the file's unit", async () => {
        const material = `Material: 300, "Material::glass", "" {
    Properties70:  {
        P: "Opacity", "double", "Number", "", 0.5
    }
}`;
        const settings = `GlobalSettings:  {
    Properties70:  {
        P: "UnitScaleFactor", "double", "Number", "", 100
    }
}`;
        const summary = await summaryOf(fbx(`${TRIANGLE}\n${material}`, "", settings));
        assert.isTrue(summary.transparent);
        assert.deepEqual(summary.materials, ["glass"]);
        assert.strictEqual(summary.metersPerUnit, 1);
    });

    it("refuses a text file over the text limit before reading it", async () => {
        const files = fbx(TRIANGLE);
        const size = files.get("s.fbx")?.length ?? 0;
        assert.deepEqual(await refusalOf(files, { maxTextBytes: 100 }), {
            code: "E_MODEL_TOO_LARGE",
            params: { what: "bytes", found: size, limit: 100 },
        });
    });
});

describe("an FBX 6 file", () => {
    /**
     * A one-triangle FBX 6.1 file: the mesh in its model, its properties in Properties60.
     * @param takes - The Takes block's body.
     * @returns The set.
     */
    function fbx6(takes: string): Map<string, Uint8Array> {
        const text = `; FBX 6.1.0 project file
FBXHeaderExtension:  {
    FBXVersion: 6100
}
Objects:  {
    Model: "Model::tri", "Mesh" {
        Properties60:  {
            Property: "Lcl Translation", "Lcl Translation", "A", 5,0,0
        }
        Vertices: 0,0,0,1,0,0,0,1,0
        PolygonVertexIndex: 0,1,-3
    }
}
Connections:  {
    Connect: "OO", "Model::tri", "Model::Scene"
}
Takes:  {
${takes}
}
`;
        return new Map([["s.fbx", new TextEncoder().encode(text)]]);
    }

    it("draws the mesh a model holds, where its Properties60 put it", async () => {
        const summary = await summaryOf(fbx6(""));
        assert.strictEqual(summary.triangles, 1);
        assert.deepEqual(summary.bounds, { min: [5, 0, 0], max: [6, 1, 0] });
        assert.deepEqual(summary.animations, []);
    });

    it("lists each take that animates a model, by its name and local time", async () => {
        const summary = await summaryOf(
            fbx6(`    Take: "walk" {
        LocalTime: 0,${String(2 * SECOND)}
        Model: "Model::tri" {
        }
    }
    Take: "" {
        Model: "Model::tri" {
        }
    }
    Take: "still" {
        LocalTime: 0,${String(SECOND)}
    }`),
        );
        assert.deepEqual(summary.animations, [
            { name: "walk", seconds: 2 },
            { name: "Take", seconds: 0 },
        ]);
    });
});

describe("an FBX file's clips", () => {
    it("times an unnamed stack by its curves' keys when it says no local time", async () => {
        const objects = [
            TRIANGLE,
            'AnimationStack: 400, "AnimStack::", "" {\n}',
            'AnimationStack: 410, "AnimStack::empty", "" {\n}',
            'AnimationLayer: 401, "AnimLayer::base", "" {\n}',
            'AnimationCurveNode: 402, "AnimCurveNode::T", "" {\n}',
            `AnimationCurve: 403, "AnimCurve::", "" {\n    KeyTime: *2 { a: ${String(SECOND)},${String(3 * SECOND)} }\n}`,
        ].join("\n");
        const checked = await checkModelFiles(
            fbx(objects, 'C: "OO", 401, 400\nC: "OO", 402, 401\nC: "OO", 403, 402'),
            {},
            DEFAULT_MODEL_LIMITS,
        );
        assert.deepEqual(checked.summary.animations, [{ name: "Animation", seconds: 2 }]);
        assert.deepInclude(checked.warnings, { code: "W_MODEL_HAS_ANIMATIONS", params: { clips: ["Animation"] } });
    });
});

describe("an FBX file's pictures", () => {
    const png = fixture("obj-mtl-png", "cube.png");

    /**
     * A file whose material draws textures of these properties.
     * @param textures - Each texture's body.
     * @returns The set, without its pictures.
     */
    function textured(textures: string[]): Map<string, Uint8Array> {
        const objects = [
            TRIANGLE,
            'Material: 300, "Material::skin", "" {\n}',
            ...textures.map((body, i) => `Texture: ${String(500 + i)}, "Texture::t${String(i)}", "" {\n${body}\n}`),
        ];
        const connections = textures.map((_, i) => `C: "OP", ${String(500 + i)}, 300, "DiffuseColor"`);
        return fbx(objects.join("\n"), connections.join("\n"));
    }

    it("finds a picture by the base name of a path outside the folder, and lists it once", async () => {
        const files = textured([
            '    FileName: "C:\\\\art\\\\wood.png"',
            '    RelativeFilename: "..\\\\maps\\\\wood.png"',
            '    Filename: "/home/art/wood.png"',
        ]).set("wood.png", png);
        const summary = await summaryOf(files);
        assert.strictEqual(summary.textures, 3);
        assert.deepEqual(summary.pictures, [{ name: "wood.png", materials: ["skin"] }]);
        assert.deepInclude(await refusalOf(files, { maxTextureBytes: 1 }), { code: "E_MODEL_TOO_LARGE" });
    });

    it("skips a texture naming no file, and reads past content that is not base64", async () => {
        const files = textured(["", '    RelativeFilename: "skin.png"']).set("skin.png", png);
        const video = `Video: 600, "Video::v", "Clip" {\n    Content: "not base64!"\n}`;
        const text = new TextDecoder().decode(files.get("s.fbx")).replace("Objects:  {", `Objects:  {\n${video}`);
        files.set(
            "s.fbx",
            new TextEncoder().encode(text.replace("Connections:  {", 'Connections:  {\nC: "OO", 600, 501')),
        );
        const summary = await summaryOf(files);
        assert.strictEqual(summary.textures, 1);
        assert.deepEqual(summary.pictures, [{ name: "skin.png", materials: ["skin"] }]);
    });

    it("hands over an ASCII file's embedded pictures, and none for a binary file", () => {
        const embedded = asciiFbxPictures(fixture("fbx-ascii-embedded-texture", "cube.fbx"), DEFAULT_MODEL_LIMITS);
        assert.strictEqual(embedded.size, 1);
        const [bytes] = embedded.values();
        assert.deepEqual([...bytes.subarray(1, 4)], [0x50, 0x4e, 0x47], "a PNG");
        assert.strictEqual(asciiFbxPictures(fixture("fbx", "cube.fbx"), DEFAULT_MODEL_LIMITS).size, 0);
    });
});

describe("an FBX file's curves", () => {
    it("draws a line with no PointsIndex as one polyline, and nothing for points that are not whole", async () => {
        const line = (points: string): Map<string, Uint8Array> =>
            fbx(`Geometry: 700, "Geometry::l", "Line" {\n    Points: *9 { a: ${points} }\n}`);
        const drawn = await summaryOf(line("0,0,0,1,0,0,2,0,0"));
        // Three points: 16 triangles per point and 48 for the caps.
        assert.deepEqual([drawn.meshes, drawn.triangles], [1, 16 * 3 + 48]);
        assert.deepEqual(drawn.bounds, { min: [0, 0, 0], max: [2, 0, 0] });
        const broken = await summaryOf(line("0,0,0,1,0,0,2,0"));
        assert.deepEqual([broken.meshes, broken.triangles], [0, 0]);
        assert.isUndefined(broken.bounds);
    });

    it("draws nothing for a NURBS curve of an order or knots the loader cannot read", async () => {
        const nurbs = (order: number, knots: string): Map<string, Uint8Array> =>
            fbx(`Geometry: 700, "Geometry::n", "NurbsCurve" {
    Order: ${String(order)}
    Points: *12 { a: 0,0,0,1,1,0,0,1,2,0,0,1 }
    KnotVector: *5 { a: ${knots} }
}`);
        assert.strictEqual((await summaryOf(nurbs(2, "0,0,1,1,1"))).meshes, 1);
        assert.strictEqual((await summaryOf(nurbs(2, "0,1,0,1,1"))).meshes, 0, "knots out of order");
        assert.strictEqual((await summaryOf(nurbs(1, "0,0,1,1,1"))).meshes, 0, "order 1");
        assert.strictEqual((await summaryOf(nurbs(2, "0,1"))).meshes, 0, "too few knots");
    });
});
