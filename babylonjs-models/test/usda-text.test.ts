/**
 * The USD checks on text layers written here: a reference by a relative prim path, a deleted
 * reference, a sublayer, and the faces and sizes a layer is refused for.
 */

import { assert, describe, it } from "vitest";

import type { ModelLimits } from "../src/files/index.js";
import { refusalOf as refusalIn, summaryOf as summaryIn } from "./check-helpers.js";

/** A one-quad mesh of two triangles, from (0, 0, 0) to (1, 1, 0). */
const QUAD = `
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        point3f[] points = [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)]`;

/**
 * A set of text layers.
 * @param layers - Path to the layer's text after `#usda 1.0`.
 * @returns The set.
 */
function layers(layers: Record<string, string>): Map<string, Uint8Array> {
    return new Map(
        Object.entries(layers).map(([path, body]): [string, Uint8Array] => [
            path,
            new TextEncoder().encode(`#usda 1.0\n${body}`),
        ]),
    );
}

/** The summary of a set whose main layer is `main.usda`. */
const summaryOf = (files: Map<string, Uint8Array>) => summaryIn(files, {}, "main.usda");

/** What checking a set whose main layer is `main.usda` threw. */
const refusalOf = (files: Map<string, Uint8Array>, limits: Partial<ModelLimits> = {}) =>
    refusalIn(files, limits, "main.usda");

describe("a text USD layer", () => {
    it("draws a reference by a relative prim path where it is, and nothing for a deleted one", async () => {
        const summary = await summaryOf(
            layers({
                "main.usda": `
def Xform "Shapes"
{
    def Mesh "Quad"
    {${QUAD}
    }

    def "Copy" (
        prepend references = <./../Quad>
    )
    {
        double3 xformOp:translate = (5, 0, 0)
        uniform token[] xformOpOrder = ["xformOp:translate"]
    }

    def "Gone" (
        delete references = <../Quad>
    )
    {
    }
}
`,
            }),
        );
        assert.deepEqual([summary.triangles, summary.meshes], [4, 2]);
        assert.deepEqual(summary.bounds, { min: [0, 0, 0], max: [6, 1, 0] });
    });

    it("draws what a sublayer holds beside the root layer's own prims", async () => {
        const summary = await summaryOf(
            layers({
                "main.usda": `(\n    subLayers = [@geo.usda@]\n)\n`,
                "geo.usda": `def Mesh "Quad"\n{${QUAD}\n}\n`,
            }),
        );
        assert.deepEqual([summary.triangles, summary.meshes], [2, 1]);
    });

    it("refuses a negative face size, a layer that is not USD text, and text over the text limit", async () => {
        const faces = layers({ "main.usda": `def Mesh "Quad"\n{${QUAD.replace("[4]", "[4, -1]")}\n}\n` });
        assert.deepEqual((await refusalOf(faces)).params, { rule: "index", where: "usd.faceVertexCounts" });
        const quad = layers({ "main.usda": `def Mesh "Quad"\n{${QUAD}\n}\n` });
        const size = quad.get("main.usda")?.length ?? 0;
        assert.deepEqual(await refusalOf(quad, { maxTextBytes: 20 }), {
            code: "E_MODEL_TOO_LARGE",
            params: { what: "bytes", found: size, limit: 20 },
        });
    });
});
