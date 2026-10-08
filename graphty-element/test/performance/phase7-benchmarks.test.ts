/**
 * Phase 7 edge-mesh work counts
 *
 * What the Phase 7 performance requirements rest on, asserted in units that do not change with
 * machine load: how many points a bezier curve generates, and how many source meshes the mesh
 * cache builds. Wall-clock budgets used to live here; they measured the runner rather than the
 * code, and the per-call helpers they timed (arrow geometry, arrow position, line endpoint,
 * transformMesh) are checked for correctness in test/EdgeMesh.test.ts. A hang is caught by the
 * test timeout.
 */

import { NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { assert, beforeEach, describe, test } from "vitest";

import type { EdgeStyleConfig } from "../../src/config";
import { EDGE_CONSTANTS } from "../../src/constants/meshConstants";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { MeshCache } from "../../src/meshes/MeshCache";
import { edgeLineFor } from "../helpers/edgeLine";

describe("Phase 7 edge-mesh work counts", () => {
    let scene: Scene;
    let meshCache: MeshCache;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
        meshCache = new MeshCache();
    });

    describe("Bezier Generation", () => {
        test("a longer edge generates more points, at the stated density", () => {
            const pointsFor = (length: number): number =>
                EdgeMesh.createBezierLine(new Vector3(0, 0, 0), new Vector3(length, 0, 0)).length / 3;
            const expected = (length: number): number =>
                Math.max(10, Math.ceil(length * 1.5 * EDGE_CONSTANTS.BEZIER_POINT_DENSITY)) + 1;

            assert.strictEqual(pointsFor(10), expected(10));
            assert.strictEqual(pointsFor(200), expected(200));
            assert.isAbove(pointsFor(200), pointsFor(10), "point count grows with edge length");
        });
        test("bezier point density follows expected formula", () => {
            // Test point density calculation matches EDGE_CONSTANTS
            const src = new Vector3(0, 0, 0);
            const dst = new Vector3(100, 0, 0);

            const points = EdgeMesh.createBezierLine(src, dst);
            const pointCount = points.length / 3;

            // Expected: max(10, ceil(distance * 1.5 * BEZIER_POINT_DENSITY)) + 1
            const distance = 100;
            const estimatedLength = distance * 1.5;
            const expectedPoints = Math.max(10, Math.ceil(estimatedLength * EDGE_CONSTANTS.BEZIER_POINT_DENSITY)) + 1;

            // Allow 20% tolerance
            assert.closeTo(
                pointCount,
                expectedPoints,
                expectedPoints * 0.2,
                `Expected ~${expectedPoints} points, got ${pointCount}`,
            );
        });
    });

    describe("Mesh Cache Performance", () => {
        test("mesh cache provides instances for same style edges", () => {
            const style: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF0000" },
            };

            // Create first mesh
            const mesh1 = edgeLineFor(
                meshCache,
                {
                    styleId: "cache-test-style",
                    width: style.line?.width ?? 0.25,
                    color: style.line?.color ?? "#FFFFFF",
                },
                style,
                scene,
            );

            // Create second mesh with same style
            const mesh2 = edgeLineFor(
                meshCache,
                {
                    styleId: "cache-test-style",
                    width: style.line?.width ?? 0.25,
                    color: style.line?.color ?? "#FFFFFF",
                },
                style,
                scene,
            );

            // Both meshes should exist
            assert.exists(mesh1, "First mesh should exist");
            assert.exists(mesh2, "Second mesh should exist");

            // Every edge of one appearance is a slot in the one cached batch
            assert.strictEqual(mesh1, mesh2, "Both edges should be drawn from the same cached batch");
        });

        test("mesh cache creates new meshes for different styles", () => {
            const style1: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF0000" },
            };

            const style2: EdgeStyleConfig = {
                line: { width: 0.5, color: "#00FF00" },
            };

            // Create first mesh
            const mesh1 = edgeLineFor(
                meshCache,
                { styleId: "cache-style-1", width: style1.line?.width ?? 0.25, color: style1.line?.color ?? "#FFFFFF" },
                style1,
                scene,
            );

            // Create second mesh with different style
            const mesh2 = edgeLineFor(
                meshCache,
                { styleId: "cache-style-2", width: style2.line?.width ?? 0.25, color: style2.line?.color ?? "#FFFFFF" },
                style2,
                scene,
            );

            // Both meshes should exist and be different
            assert.exists(mesh1, "First mesh should exist");
            assert.exists(mesh2, "Second mesh should exist");

            // Different styles = different batches
            assert.notStrictEqual(mesh1, mesh2, "Different styles should be drawn from different batches");
        });
    });
    describe("Mesh Creation", () => {
        test("each distinct solid-line style builds exactly one cached batch", () => {
            const iterations = 100;
            const style: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF0000" },
            };

            for (let i = 0; i < iterations; i++) {
                const options = { styleId: `perf-test-${i}`, width: 0.5, color: "#FF0000" };
                edgeLineFor(meshCache, options, style, scene);
                edgeLineFor(meshCache, options, style, scene);
            }

            assert.strictEqual(meshCache.misses, iterations);
            assert.strictEqual(meshCache.hits, iterations);
        });

        test("curves of one appearance share one line batch", () => {
            const iterations = 50;
            const style: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF0000", bezier: true },
            };
            const options = { styleId: "bezier-perf", width: 0.5, color: "#FF0000" };
            const first = edgeLineFor(meshCache, options, style, scene);

            for (let i = 0; i < iterations; i++) {
                assert.strictEqual(edgeLineFor(meshCache, options, style, scene), first);
            }
        });

        test("arrow mesh creation returns a mesh for every filled arrow type", () => {
            for (const arrowType of ["normal", "inverted", "dot", "diamond", "box"]) {
                const mesh = EdgeMesh.createArrowHead(
                    meshCache,
                    `arrow-perf-${arrowType}`,
                    { type: arrowType, width: 1.0, color: "#FF0000", size: 1.0, opacity: 1.0 },
                    scene,
                );
                assert.isNotNull(mesh, arrowType);
            }
        });
    });
});
