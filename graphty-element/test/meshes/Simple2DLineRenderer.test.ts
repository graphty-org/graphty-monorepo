import { NullEngine, Scene, ShaderMaterial, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { JOIN_TEMPLATE_POSITIONS } from "../../src/meshes/edgeJoinShader";
import { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import { Simple2DLineRenderer } from "../../src/meshes/Simple2DLineRenderer";

// What a 2D line draws on screen -- the rectangle of a straight edge, the joins of a bent one -- is
// held by the pixels in test/browser/edge-corner-joins.test.ts. These hold what the batch is built
// from and what a slot records.
describe("Simple2DLineRenderer", () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene(new NullEngine());
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    test("builds the joined line template, its width in world units, marked as a 2D line", () => {
        const mesh = Simple2DLineRenderer.createBatchMesh(0.1, "#ff0000", 0.5, scene);

        assert.strictEqual(mesh.getTotalVertices(), JOIN_TEMPLATE_POSITIONS.length / 3);
        assert.strictEqual(mesh.metadata?.is2DLine, true);
        assert.strictEqual(mesh.metadata?.joinedLine, true);
        assert.strictEqual(mesh.metadata?.lineWidth, 0.1);
        assert.strictEqual(mesh.metadata?.lineOpacity, 0.5);
        assert.instanceOf(mesh.material, ShaderMaterial);
        assert.include(mesh.material.options.defines, "#define WORLD_WIDTH");
        assert.strictEqual(mesh.visibility, 0.5, "a translucent line is drawn in the transparent pass");
    });

    test("a slot records the ends it was placed at, and a straight line has no neighbours", () => {
        const batch = new EdgeLineBatch(Simple2DLineRenderer.createBatchMesh(0.2, "#ff0000", 1, scene), scene);
        const slot = batch.acquire();
        const start = new Vector3(1, 1, 0);
        const end = new Vector3(4, 5, 0);
        batch.place(slot, start, end);

        const [a, b] = batch.endsOf(slot);
        assert.isTrue(a.equalsWithEpsilon(start, 1e-6));
        assert.isTrue(b.equalsWithEpsilon(end, 1e-6));
        assert.closeTo(batch.lengthOf(slot), 5, 1e-6);
        assert.strictEqual(batch.drawnCount, 1);
        assert.strictEqual(batch.mesh.forcedInstanceCount, 1, "one instance, not a thin instance");
    });
});
