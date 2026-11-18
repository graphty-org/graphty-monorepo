/**
 * A summary's bounds are those of what is drawn, where the file's transforms put it: a glTF's node
 * transforms, an FBX file's model transforms and its curves, a PLY's vertices (which also settle
 * its guessed up axis), and a USD stage's selected variants.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { checkModelFiles, DEFAULT_MODEL_LIMITS, type ModelSummary } from "../src/files/index.js";

const VARIANTS = join(dirname(fileURLToPath(import.meta.url)), "fixtures/variants");

/**
 * A variant's file.
 * @param id - The variant.
 * @param name - The file.
 * @returns Its bytes.
 */
function fixture(id: string, name: string): Uint8Array {
    return new Uint8Array(readFileSync(join(VARIANTS, id, name)));
}

/**
 * The summary of a set.
 * @param files - The set, by path.
 * @returns Its summary.
 */
async function summaryOf(files: Record<string, Uint8Array | string>): Promise<ModelSummary> {
    const set = new Map(
        Object.entries(files).map(([name, body]) => [
            name,
            typeof body === "string" ? new TextEncoder().encode(body) : body,
        ]),
    );
    return (await checkModelFiles(set, {}, DEFAULT_MODEL_LIMITS)).summary;
}

/**
 * A summary's bounds, rounded.
 * @param summary - The summary.
 * @returns min and max.
 */
function boundsOf(summary: ModelSummary): number[][] | undefined {
    return summary.bounds === undefined
        ? undefined
        : [summary.bounds.min, summary.bounds.max].map((v) => v.map((n) => Math.round(n * 1000) / 1000));
}

describe("summary bounds", () => {
    it("put a glTF's meshes where its node transforms do", async () => {
        const json = JSON.parse(new TextDecoder().decode(fixture("gltf-textured", "cube.gltf"))) as {
            nodes: Record<string, unknown>[];
            scenes: { nodes: number[] }[];
        };
        // A root scaling x by 4 and turning Y onto -Z, over the unit cube moved 10 along y.
        json.nodes = [
            { children: [1], matrix: [4, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1] },
            { mesh: 0, translation: [0, 10, 0] },
        ];
        json.scenes = [{ nodes: [0] }];
        const summary = await summaryOf({
            "cube.gltf": JSON.stringify(json),
            "cube.bin": fixture("gltf-textured", "cube.bin"),
            "cube.png": fixture("gltf-textured", "cube.png"),
        });
        assert.deepStrictEqual(boundsOf(summary), [
            [-2, -0.5, -10.5],
            [2, 0.5, -9.5],
        ]);
    });

    it("give an FBX file's curves bounds, where their models' transforms put them", async () => {
        const nurbs = new TextDecoder()
            .decode(fixture("fbx-curves", "nurbs.fbx"))
            .replace(
                '"Model::Curve", "Line" {',
                '"Model::Curve", "Line" {\n\t\tProperties70:  {\n\t\t\tP: "Lcl Translation", "Lcl Translation", "", "A",0,0,10\n\t\t\tP: "Lcl Scaling", "Lcl Scaling", "", "A",2,1,1\n\t\t}',
            );
        // Control points x 0 to 5, y 0 to 2, z 0 to 1: x doubled, z moved by 10.
        assert.deepStrictEqual(boundsOf(await summaryOf({ "nurbs.fbx": nurbs })), [
            [0, 0, 10],
            [10, 2, 11],
        ]);
    });

    it("give a PLY bounds, and guess Z up for one lying flat in Y-up terms", async () => {
        const ply = (points: string): string =>
            `ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n${points}\n3 0 1 2\n`;
        const lying = await summaryOf({ "lying.ply": ply("0 0 0\n4 1 0\n0 0 6") });
        assert.deepStrictEqual(
            [lying.upAxis, boundsOf(lying)],
            [
                "z",
                [
                    [0, 0, 0],
                    [4, 1, 6],
                ],
            ],
        );
        const standing = await summaryOf({ "standing.ply": ply("0 0 0\n1 4 0\n0 0 1") });
        assert.strictEqual(standing.upAxis, "y");
    });

    it("count a USD text layer's selected variant only, its selection in prim metadata", async () => {
        const mesh = (x: number): string =>
            `def Mesh "shape" {\n int[] faceVertexCounts = [3]\n point3f[] points = [(0, 0, 0), (${x}, 0, 0), (0, 1, 0)]\n }`;
        const summary = await summaryOf({
            "stage.usda": `#usda 1.0
(
    defaultPrim = "Asset"
)

def Xform "Asset" (
    assetInfo = {
        string name = "Asset"
    }
    variants = {
        string size = "big"
    }
    prepend variantSets = "size"
)
{
    variantSet "size" = {
        "small" (
            kind = "component"
        ) {
            ${mesh(1)}
        }
        "big" {
            ${mesh(5)}
        }
    }
}
`,
        });
        assert.deepStrictEqual(
            [summary.meshes, summary.triangles, boundsOf(summary)],
            [
                1,
                1,
                [
                    [0, 0, 0],
                    [5, 1, 0],
                ],
            ],
        );
    });
});
