import { NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { assert, beforeEach, describe, test } from "vitest";

import type { EdgeStyleConfig } from "../src/config";
import type { EdgeLineBatch } from "../src/meshes/EdgeLineBatch";
import { EdgeMesh } from "../src/meshes/EdgeMesh";
import { MeshCache } from "../src/meshes/MeshCache";
import { isDisposed } from "./helpers/testSetup";

/**
 * A curve is a run of slots in the same line batch a straight line takes (`Edge.placeCurve`
 * places them), so these pin the batch a curve is drawn from and the points it is drawn through.
 */
describe("Bezier Curve Edge Integration", () => {
    let scene: Scene;
    let meshCache: MeshCache;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
        meshCache = new MeshCache();
    });

    function batchFor(styleId: string, style: EdgeStyleConfig): EdgeLineBatch {
        const batch = EdgeMesh.lineBatch(
            meshCache,
            { styleId, width: style.line?.width ?? 0.25, color: style.line?.color ?? "#FFFFFF" },
            style,
            scene,
        );
        assert.isNotNull(batch, "every line but a patterned one is drawn from a batch");
        return batch;
    }

    test("a curve is drawn from a line batch", () => {
        const batch = batchFor("bezier-test", { line: { width: 0.5, color: "#FF0000", bezier: true } });

        assert.isFalse(isDisposed(batch.mesh), "the batch mesh should not be disposed");
    });

    test("a straight line is drawn from a line batch", () => {
        const batch = batchFor("straight-test", { line: { width: 0.5, color: "#FF0000", bezier: false } });

        assert.isFalse(isDisposed(batch.mesh), "the batch mesh should not be disposed");
    });

    test("a curve's batch respects the opacity setting", () => {
        const batch = batchFor("bezier-opacity-test", {
            line: { width: 0.5, color: "#FF00FF", bezier: true, opacity: 0.5 },
        });

        assert.closeTo(batch.mesh.visibility, 0.5, 0.01, "the batch should have the style's opacity");
    });

    test("curves of one appearance share one batch", () => {
        const style: EdgeStyleConfig = { line: { width: 0.5, color: "#FFFF00", bezier: true } };

        assert.strictEqual(batchFor("bezier-cache-test", style), batchFor("bezier-cache-test", style));
    });

    test("a curve runs from its source to its destination, wherever they are", () => {
        const src = new Vector3(5, 5, 5);
        const dst = new Vector3(15, 10, 8);
        const points = EdgeMesh.createBezierLine(src, dst);
        const last = points.length - 3;

        assert.isAtLeast(points.length / 3, 2);
        assert.isTrue(new Vector3(points[0], points[1], points[2]).equalsWithEpsilon(src, 0.01));
        assert.isTrue(new Vector3(points[last], points[last + 1], points[last + 2]).equalsWithEpsilon(dst, 0.01));
    });

    test("a self-loop curve leaves its node and comes back", () => {
        const point = new Vector3(5, 5, 5);
        const points = EdgeMesh.createBezierLine(point, point);

        assert.isAtLeast(points.length / 3, 3, "a loop needs more than a start and an end");
        const far = Math.max(
            ...Array.from({ length: points.length / 3 }, (_, i) =>
                Vector3.Distance(point, new Vector3(points[i * 3], points[i * 3 + 1], points[i * 3 + 2])),
            ),
        );
        assert.isAbove(far, 0, "the loop bows away from the node");
    });
});
