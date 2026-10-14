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
        const pointsFor = (length: number): number =>
            EdgeMesh.createBezierLine(new Vector3(0, 0, 0), new Vector3(length, 0, 0)).length / 3;

        test("a longer edge generates more points, at the stated density", () => {
            const expected = (length: number): number =>
                Math.max(10, Math.ceil(length * 1.5 * EDGE_CONSTANTS.BEZIER_POINT_DENSITY)) + 1;

            assert.strictEqual(pointsFor(1), expected(1));
            assert.strictEqual(pointsFor(3), expected(3));
            assert.isAbove(pointsFor(3), pointsFor(1), "point count grows with edge length");
        });

        test("no curve is drawn with more than the ceiling's segments, however long (issue #2249)", () => {
            // A circular layout of 330 nodes puts edges about a hundred units long; at the density
            // alone each took about 1,200 segments, and 359 of them took ten seconds to settle.
            const ceiling = EDGE_CONSTANTS.BEZIER_MAX_SEGMENTS + 1;

            assert.strictEqual(pointsFor(100), ceiling);
            assert.strictEqual(pointsFor(10_000), ceiling);
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
