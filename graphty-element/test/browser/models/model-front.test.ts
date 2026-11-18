/**
 * @file babylonjs-models gives every format with its front where Babylon's glTF loader puts a glTF
 * file's: the file's front at +Z and its right at -X, so the element's one turn shows every model's
 * front. A `.babylon` file (left-handed, front toward -Z) and Babylon's USD loader (which only
 * mirrors Z) came out facing the other way, and drew their backs.
 */

import { Engine } from "@babylonjs/core/Engines/engine.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { VertexBuffer } from "@babylonjs/core/Meshes/buffer.js";
import { Scene } from "@babylonjs/core/scene.js";
import { loadModel } from "babylonjs-models";
import { afterEach, assert, describe, it } from "vitest";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        cleanup();
    }
});

/**
 * A WebGL engine and scene on a canvas in the page.
 * @returns The scene.
 */
function makeScene(): Scene {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const engine = new Engine(canvas, false);
    const scene = new Scene(engine);
    cleanups.push(() => {
        engine.dispose();
        canvas.remove();
    });
    return scene;
}

/**
 * Where the first vertex of a one-triangle model lands once loaded.
 * @param name - The file's name.
 * @param text - Its text.
 * @returns The vertex in world space.
 */
async function firstVertex(name: string, text: string): Promise<Vector3> {
    const { container } = await loadModel(makeScene(), new File([text], name));
    const mesh = container.meshes.find((m) => m.getTotalVertices() > 0);
    assert.isDefined(mesh);
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    assert.isNotNull(positions);
    const at = Vector3.FromArray(positions, 0);
    return Vector3.TransformCoordinates(at, mesh.computeWorldMatrix(true));
}

/**
 * Assert a point is where it should be.
 * @param actual - The point.
 * @param expected - Where.
 */
function near(actual: Vector3, expected: Vector3): void {
    assert.isBelow(actual.subtract(expected).length(), 1e-5, `${actual.toString()} is not ${expected.toString()}`);
}

describe("a model's front", () => {
    it("puts a USD file's front-right corner (+Z, +X) at +Z, -X, as the glTF loader does", async () => {
        const usda = [
            "#usda 1.0",
            "(",
            '    defaultPrim = "T"',
            "    metersPerUnit = 1",
            '    upAxis = "Y"',
            ")",
            'def Mesh "T" {',
            "    int[] faceVertexCounts = [3]",
            "    int[] faceVertexIndices = [0, 1, 2]",
            "    point3f[] points = [(1, 0, 1), (0, 1, 1), (0, 0, 1)]",
            "}",
        ].join("\n");
        near(await firstVertex("t.usda", usda), new Vector3(-1, 0, 1));
    });

    it("puts a .babylon file's front-right corner (-Z, +X) at +Z, -X, as the glTF loader does", async () => {
        const babylon = JSON.stringify({
            meshes: [{ name: "t", positions: [1, 0, -1, 0, 1, -1, 0, 0, -1], indices: [0, 1, 2] }],
        });
        near(await firstVertex("t.babylon", babylon), new Vector3(-1, 0, 1));
    });
});
