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

import { InstancedMesh, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { assert, beforeEach, describe, test } from "vitest";

import type { EdgeStyleConfig } from "../../src/config";
import { EDGE_CONSTANTS } from "../../src/constants/meshConstants";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { MeshCache } from "../../src/meshes/MeshCache";

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
            const mesh1 = EdgeMesh.create(
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
            const mesh2 = EdgeMesh.create(
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

            // MeshCache returns InstancedMesh objects that share the same source mesh
            // Both mesh1 and mesh2 should be instances of the same source
            // The sourceMesh of both should be the same cached Mesh
            const instancedMesh1 = mesh1 as InstancedMesh;
            const instancedMesh2 = mesh2 as InstancedMesh;
            const sourceMesh1 = instancedMesh1.sourceMesh;
            const sourceMesh2 = instancedMesh2.sourceMesh;
            assert.strictEqual(sourceMesh1, sourceMesh2, "Both meshes should share the same source mesh from cache");
        });

        test("mesh cache creates new meshes for different styles", () => {
            const style1: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF0000" },
            };

            const style2: EdgeStyleConfig = {
                line: { width: 0.5, color: "#00FF00" },
            };

            // Create first mesh
            const mesh1 = EdgeMesh.create(
                meshCache,
                { styleId: "cache-style-1", width: style1.line?.width ?? 0.25, color: style1.line?.color ?? "#FFFFFF" },
                style1,
                scene,
            );

            // Create second mesh with different style
            const mesh2 = EdgeMesh.create(
                meshCache,
                { styleId: "cache-style-2", width: style2.line?.width ?? 0.25, color: style2.line?.color ?? "#FFFFFF" },
                style2,
                scene,
            );

            // Both meshes should exist and be different
            assert.exists(mesh1, "First mesh should exist");
            assert.exists(mesh2, "Second mesh should exist");

            // Different styles = different source meshes
            // (they may still be instances of different source meshes)
            const instancedMesh1 = mesh1 as InstancedMesh;
            const instancedMesh2 = mesh2 as InstancedMesh;
            assert.notEqual(
                instancedMesh1.sourceMesh,
                instancedMesh2.sourceMesh,
                "Different styles should have different source meshes",
            );
        });
    });
    describe("Mesh Creation", () => {
        test("each distinct solid-line style builds exactly one cached source mesh", () => {
            const iterations = 100;
            const style: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF0000" },
            };

            for (let i = 0; i < iterations; i++) {
                const options = { styleId: `perf-test-${i}`, width: 0.5, color: "#FF0000" };
                EdgeMesh.create(meshCache, options, style, scene);
                EdgeMesh.create(meshCache, options, style, scene);
            }

            assert.strictEqual(meshCache.size(), iterations);
            assert.strictEqual(meshCache.misses, iterations);
            assert.strictEqual(meshCache.hits, iterations);
        });

        test("bezier meshes are built per edge and bypass the cache", () => {
            const iterations = 50;
            const style: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF0000", bezier: true },
            };

            for (let i = 0; i < iterations; i++) {
                const mesh = EdgeMesh.create(
                    meshCache,
                    { styleId: `bezier-perf-${i}`, width: 0.5, color: "#FF0000" },
                    style,
                    scene,
                    new Vector3(0, i, 0),
                    new Vector3(50, i, 0),
                );
                assert.deepEqual((mesh as InstancedMesh).metadata, { isBezierCurve: true });
            }

            assert.strictEqual(meshCache.size(), 0);
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
