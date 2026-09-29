import { Matrix, NullEngine, Quaternion, Scene, Vector3 } from "@babylonjs/core";
import { assert, beforeEach, describe, test } from "vitest";

import { segmentMatrixToRef } from "../../src/meshes/EdgeLineBatch";
import { Simple2DLineRenderer } from "../../src/meshes/Simple2DLineRenderer";

/**
 * The four corners the per-edge 2D line drew before it was batched: a unit rectangle in the XY
 * plane scaled to (length, width), turned about Z to the line's angle and put at its middle.
 * @param start - Where the line starts.
 * @param end - Where it ends.
 * @param width - How wide it is.
 * @returns The corners, in world units.
 */
function perEdgeCorners(start: Vector3, end: Vector3, width: number): Vector3[] {
    const direction = end.subtract(start);
    const world = Matrix.Compose(
        new Vector3(direction.length(), width, 1),
        Quaternion.RotationAxis(Vector3.Forward(), Math.atan2(direction.y, direction.x)),
        start.add(end).scale(0.5),
    );

    return [
        [0.5, 0.5],
        [0.5, -0.5],
        [-0.5, -0.5],
        [-0.5, 0.5],
    ].map(([x, y]) => Vector3.TransformCoordinates(new Vector3(x, y, 0), world));
}

describe("Simple2DLineRenderer", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    test("builds one rectangle with its own material, marked as a 2D line", () => {
        const mesh = Simple2DLineRenderer.createBatchMesh(0.1, "#ff0000", 0.5, scene);

        assert.strictEqual(mesh.getTotalVertices(), 4, "a rectangle");
        assert.strictEqual(mesh.metadata?.is2DLine, true);
        assert.isNotNull(mesh.material);
        assert.strictEqual(mesh.material.alpha, 0.5, "the opacity is the material's");
    });

    // The batch places every 2D line with the 3D line's slot matrix. This holds that the corners
    // it draws are the corners the per-edge mesh drew, for lines at every angle, so batching the
    // 2D line moved no pixel.
    for (const [name, end] of [
        ["horizontal", new Vector3(3, 1, 0)],
        ["vertical", new Vector3(1, 4, 0)],
        ["diagonal", new Vector3(3, 3, 0)],
        ["backwards", new Vector3(-2, -0.5, 0)],
        ["straight down", new Vector3(1, -2, 0)],
    ] as const) {
        test(`a slot draws the per-edge rectangle for a ${name} line`, () => {
            const start = new Vector3(1, 1, 0);
            const width = 0.2;
            const mesh = Simple2DLineRenderer.createBatchMesh(width, "#ff0000", 1, scene);
            const slot = new Matrix();
            segmentMatrixToRef(start, end, slot);

            const positions = mesh.getVerticesData("position");
            assert.isNotNull(positions);
            const drawn = [0, 1, 2, 3].map((i) =>
                Vector3.TransformCoordinates(Vector3.FromArray(positions, i * 3), slot),
            );

            for (const corner of perEdgeCorners(start, end, width)) {
                assert.isTrue(
                    drawn.some((point) => point.equalsWithEpsilon(corner, 1e-5)),
                    `corner ${corner.toString()} is drawn; the slot drew ${drawn.map(String).join(" ")}`,
                );
            }
        });
    }
});
