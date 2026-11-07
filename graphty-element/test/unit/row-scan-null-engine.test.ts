/**
 * @file The row scan needs no frame and no GPU (design/rendering/row-renderer.md 9): on a
 * NullEngine, before anything is drawn, it answers what `scene.pick` answers.
 */

import { FreeCamera, type Mesh, MeshBuilder, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { assert, describe, it } from "vitest";

import { NodeMesh } from "../../src/meshes/NodeMesh";
import { RowScan } from "../../src/render/PickService";

/**
 * Compare the scan with `scene.pick` on a grid of points, over three overlapping rows of a source.
 * @param build - Builds the source mesh in a scene.
 */
function assertSameAsPick(build: (scene: Scene) => Mesh): void {
    const engine = new NullEngine({
        renderWidth: 400,
        renderHeight: 300,
        textureSize: 16,
        deterministicLockstep: false,
        lockstepMaxSteps: 1,
    });
    const scene = new Scene(engine);
    const camera = new FreeCamera("camera", new Vector3(0, 0, -20), scene);
    camera.setTarget(Vector3.Zero());
    const source = build(scene);
    source.isVisible = false;
    source.isPickable = false;
    const radius =
        source.getBoundingInfo().boundingSphere.radius + source.getBoundingInfo().boundingSphere.center.length();
    const rowBounds = new Float32Array(16);
    const rows = [
        [0, 0, 0],
        [3, 0, 2],
        [0, 0, 5],
    ].map(([x = 0, y = 0, z = 0], row) => {
        const mesh = source.createInstance(`row${String(row)}`);
        mesh.isPickable = true;
        mesh.position.set(x, y, z);
        mesh.computeWorldMatrix(true);
        rowBounds.set([x, y, z, radius], row * 4);
        return {
            drawnPickMesh: mesh,
            drawnAnchor: mesh,
            drawnSourceMesh: source,
            drawnScaling: mesh.scaling,
            drawnByRowScan: true,
            index: row,
        };
    });
    const scan = new RowScan(scene, { rows: rows.length, rowBounds }, (row) => rows[row], null);
    let hits = 0;
    for (let x = 0; x < 400; x += 7) {
        for (let y = 0; y < 300; y += 7) {
            const expected = scene.pick(x, y, (mesh) => mesh.isPickable).pickedMesh;
            const row = scan.shapeRayHit(x, y);
            assert.strictEqual(
                row === null ? null : rows[row.row]?.drawnPickMesh,
                expected,
                `${String(x)},${String(y)}`,
            );
            hits += expected === null ? 0 : 1;
        }
    }

    scene.dispose();
    engine.dispose();
    assert.isAbove(hits, 20, "enough points hit a row");
}

describe("the row scan on a NullEngine", () => {
    it("answers scene.pick before the first frame", () => {
        assertSameAsPick((scene) => MeshBuilder.CreateBox("source", { size: 2 }, scene));
    });

    it("reads a custom shape: to the scan it is one more source mesh", () => {
        assertSameAsPick((scene) => {
            NodeMesh.registerShapeCreator("row-scan-knot", () =>
                MeshBuilder.CreateTorusKnot("knot", { radius: 1, tube: 0.3 }, scene),
            );
            return NodeMesh.createMeshWithoutCache(
                { styleId: "knot", is2D: false, size: 1 },
                { shape: { type: "row-scan-knot" as "box", size: 1 } },
                scene,
            );
        });
    });
});
