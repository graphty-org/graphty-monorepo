/**
 * An FBX file's curves (Line and NurbsCurve geometries) are drawn as tubes, one mesh per polyline:
 * the check counts those meshes and their triangles against the limits. graphty-element's browser
 * test drawn-as-checked.test.ts loads the same files and finds these counts drawn.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { checkModelFiles, DEFAULT_MODEL_LIMITS, type ModelLimits } from "../src/files/index.js";
import { ModelError } from "../src/files/references.js";

const CURVES = join(dirname(fileURLToPath(import.meta.url)), "fixtures/variants/fbx-curves");

/**
 * A curve file, as a set.
 * @param name - The file.
 * @returns The set.
 */
function curve(name: string): Map<string, Uint8Array> {
    return new Map([[name, new Uint8Array(readFileSync(join(CURVES, name)))]]);
}

describe("FBX curves", () => {
    it("are counted as the tubes they are drawn as, one mesh per polyline", async () => {
        for (const [name, meshes, triangles] of [
            // 20 polylines of 2 points: 16 triangles per point and 48 for the caps, each.
            ["lines-many.fbx", 20, 20 * (16 * 2 + 48)],
            // One polyline of 102 points.
            ["lines-long.fbx", 1, 16 * 102 + 48],
            // A cubic curve of 6 control points: knots 0 to 3, 3 spans of 4 segments, 13 points.
            ["nurbs.fbx", 1, 16 * 13 + 48],
        ] as const) {
            const { summary } = await checkModelFiles(curve(name), {}, DEFAULT_MODEL_LIMITS);
            assert.deepStrictEqual([summary.meshes, summary.triangles], [meshes, triangles], name);
        }
    });

    it("are held to maxMeshes and maxTriangles", async () => {
        const refusal = async (name: string, limits: Partial<ModelLimits>) => {
            const error = await checkModelFiles(curve(name), {}, { ...DEFAULT_MODEL_LIMITS, ...limits }).then(
                () => assert.fail("accepted"),
                (e: unknown) => e,
            );
            assert.instanceOf(error, ModelError);
            return error.fact;
        };
        assert.deepStrictEqual(await refusal("lines-many.fbx", { maxMeshes: 5 }), {
            code: "E_MODEL_TOO_LARGE",
            params: { what: "count", item: "meshes", found: 20, limit: 5 },
        });
        assert.deepStrictEqual(await refusal("lines-long.fbx", { maxTriangles: 1000 }), {
            code: "E_MODEL_TOO_LARGE",
            params: { what: "triangles", found: 1680, limit: 1000 },
        });
    });
});
