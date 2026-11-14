/**
 * Edge Case Handling Tests
 *
 * Tests for edge conditions in edge rendering:
 * - Very short edges (< 1 unit) and very long edges (> 100 units), placed by Edge.update()
 * - Zero-width lines
 * - Opacity edge cases (0.0, 1.0)
 * - Self-loops with all arrow types
 * - Overlapping nodes
 */

import { AbstractMesh, type Mesh, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { cloneDeep } from "lodash";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import type { EdgeStyleConfig } from "../../src/config";
import { Edge } from "../../src/Edge";
import { SimpleLayoutEngine } from "../../src/layout/LayoutEngine";
import { DataManager, dataManagerInternals } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext } from "../../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import { bootstrapEdgePaint, bootstrapNodePaint } from "../../src/managers/StylePainter";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { MeshCache } from "../../src/meshes/MeshCache";
import { Node } from "../../src/Node";
import { Styles } from "../../src/Styles";
import { isDisposed } from "../helpers/testSetup";

describe("Edge Case Handling", () => {
    let scene: Scene;
    let meshCache: MeshCache;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
        meshCache = new MeshCache();
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    /**
     * The mesh a non-patterned line is drawn by: its line batch's, shared by every edge of the
     * same appearance.
     * @param options - Edge mesh options.
     * @param style - The edge style.
     * @returns The batch's mesh.
     */
    function lineMesh(options: { styleId: string; width: number; color: string }, style: EdgeStyleConfig): Mesh {
        const batch = EdgeMesh.lineBatch(meshCache, options, style, scene);
        assert.isNotNull(batch, "every line but a patterned one is drawn from a batch");
        return batch.mesh;
    }

    describe("Very Short Edges", () => {
        test("bezier curve generation handles very short distance", () => {
            const src = new Vector3(0, 0, 0);
            const dst = new Vector3(0.1, 0, 0);

            const curvePoints = EdgeMesh.createBezierLine(src, dst);

            // Should have minimum number of points
            assert.isTrue(
                curvePoints.length >= 6,
                `Should have at least 2 points (6 values), got ${curvePoints.length}`,
            );

            // First and last points should match input
            assert.closeTo(curvePoints[0], src.x, 0.01);
            assert.closeTo(curvePoints[curvePoints.length - 3], dst.x, 0.01);
        });
    });

    describe("Very Long Edges", () => {
        test("bezier curve point density scales with edge length", () => {
            const src = new Vector3(0, 0, 0);
            const dst = new Vector3(200, 0, 0);

            const curvePoints = EdgeMesh.createBezierLine(src, dst);

            // Should have many points for a long edge
            const pointCount = curvePoints.length / 3;
            assert.isTrue(pointCount > 50, `Long edge should have many points, got ${pointCount}`);
        });
    });

    /**
     * Real edges placed by `Edge.update()` between two nodes a given distance apart (issue #6965): the
     * line and its pattern are laid where the edge actually runs, not at the placeholder ends a
     * patterned line is built with.
     */
    describe("Edges placed at a very short and a very long length", () => {
        const DISTANCES = [0.1, 200] as const;
        // dash, dot and diamond draw in a joined line's shader; dash-dot and the waves as pattern elements
        const LINE_TYPES = ["solid", "dash", "dot", "diamond", "dash-dot", "sinewave", "zigzag"] as const;

        class TwoNodeLayout extends SimpleLayoutEngine {
            static override type = "fixed-test-edge-lengths";
            override scalingFactor = 1;
            constructor(distance: number) {
                super();
                this.positions = { src: [0, 0, 0], dst: [distance, 0, 0] };
            }

            doLayout(): void {
                this.stale = false;
            }
        }

        /**
         * An edge of one line type, placed by `Edge.update()` between nodes `distance` apart along x. The
         * nodes are small enough (0.02) that even the 0.1 gap leaves a line between their surfaces, and the
         * edge has no arrow head, so the line itself is what is measured.
         * @param distance - How far apart the two nodes' centres are.
         * @param type - The line type.
         * @returns The placed edge.
         */
        function placedEdge(distance: number, type: (typeof LINE_TYPES)[number]): Edge {
            const styles = Styles.default();
            const eventManager = new EventManager();
            const dataManager = new DataManager(eventManager, styles);
            const layoutManager = new LayoutManager(eventManager, dataManager, styles);
            const layout = new TwoNodeLayout(distance);
            layoutManagerInternals.setEngine(layoutManager, layout);
            const context = new DefaultGraphContext(
                () => styles,
                dataManager,
                layoutManager,
                meshCache,
                scene,
                new StatsManager(eventManager),
                {},
            );
            const nodePaint = { ...cloneDeep(bootstrapNodePaint()), meshKey: "tiny-node" };
            nodePaint.style.shape = { ...nodePaint.style.shape, size: 0.02 };
            for (const id of ["src", "dst"]) {
                const node = new Node(context, id, nodePaint, { id });
                dataManagerInternals.adoptNode(dataManager, node);
                dataManager.nodeCache.set(id, node);
                layout.addNode(node);
                node.update();
            }

            const style = cloneDeep(bootstrapEdgePaint(false).style);
            style.line = { ...style.line, type };
            const edge = new Edge(context, "src", "dst", 0, { meshKey: `length-${type}`, style }, {});
            dataManagerInternals.adoptEdge(dataManager, edge);
            layout.addEdge(edge);
            edge.update();
            return edge;
        }

        /**
         * Asserts a point is finite and lies on the segment between the two node centres, near the x axis
         * (a wave swings off it by its amplitude, within the line's width). A point left at the placeholder
         * ends a patterned line is built with, (0, 0, -0.5) and (0, 0, 0.5), fails this on the short edge.
         * @param p - The point.
         * @param distance - The segment's length along x.
         * @param what - What the point is, for the message.
         */
        function assertOnSegment(p: Vector3, distance: number, what: string): void {
            const slack = Math.min(1, distance / 2);
            for (const v of p.asArray()) {
                assert.isTrue(Number.isFinite(v), `${what} is not finite: ${p.toString()}`);
            }

            assert.isAtLeast(p.x, -1e-6, `${what} lies before the source: ${p.toString()}`);
            assert.isAtMost(p.x, distance + 1e-6, `${what} lies past the target: ${p.toString()}`);
            assert.isBelow(Math.hypot(p.y, p.z), slack, `${what} is off the segment: ${p.toString()}`);
        }

        for (const distance of DISTANCES) {
            for (const type of LINE_TYPES) {
                test(`a ${type} edge ${distance} units long is placed between its nodes with no NaN`, () => {
                    const edge = placedEdge(distance, type);
                    const line = edge.drawnLine;
                    const pattern = edge.drawnPattern;

                    if (EdgeMesh.drawsAsPattern({ line: { type } })) {
                        assert.isNull(line, `a ${type} line is drawn as pattern elements`);
                        assert.isAtLeast(pattern.length, 1, `a ${type} line lays at least one element`);
                        if (distance > 100) {
                            assert.isAbove(pattern.length, 10, `a long ${type} line lays many elements`);
                        }

                        for (const [i, element] of pattern.entries()) {
                            assertOnSegment(element.position, distance, `${type} element ${i}`);
                            for (const v of element.transform.asArray()) {
                                assert.isTrue(Number.isFinite(v), `${type} element ${i}'s matrix holds ${v}`);
                            }
                        }

                        if (pattern.length > 1) {
                            assert.isBelow(
                                pattern[0].position.x,
                                pattern[pattern.length - 1].position.x,
                                "elements run from the source to the target",
                            );
                        }
                    } else {
                        assert.isNotNull(line, `a ${type} line is drawn by a line batch`);
                        assert.lengthOf(pattern, 0);
                        assert.isTrue(Number.isFinite(line.length), `its length is ${line.length}`);
                        assert.isAtMost(line.length, distance + 1e-6, "no longer than the gap between centres");
                        assertOnSegment(line.centre, distance, `${type} line's centre`);
                        if (distance > 100) {
                            assert.isAbove(line.length, distance - 10, "a long line runs nearly centre to centre");
                        }
                    }
                });
            }
        }
    });

    describe("Opacity Edge Cases", () => {
        test("zero opacity renders invisible mesh", () => {
            const style: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF00FF", opacity: 0.0 },
            };

            const mesh = lineMesh(
                { styleId: "zero-opacity", width: style.line?.width ?? 0.25, color: style.line?.color ?? "#FFFFFF" },
                style,
            );

            assert.exists(mesh, "Mesh should be created even with zero opacity");
            assert.equal(mesh.visibility, 0.0, "Mesh visibility should be 0.0");
        });

        test("full opacity (1.0) renders visible mesh", () => {
            const style: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF00FF", opacity: 1.0 },
            };

            const mesh = lineMesh(
                { styleId: "full-opacity", width: style.line?.width ?? 0.25, color: style.line?.color ?? "#FFFFFF" },
                style,
            );

            assert.exists(mesh, "Mesh should be created with full opacity");
            assert.equal(mesh.visibility, 1.0, "Mesh visibility should be 1.0");
        });

        test("partial opacity (0.5) is applied correctly", () => {
            const style: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF00FF", opacity: 0.5 },
            };

            const mesh = lineMesh(
                { styleId: "partial-opacity", width: style.line?.width ?? 0.25, color: style.line?.color ?? "#FFFFFF" },
                style,
            );

            assert.exists(mesh, "Mesh should be created with partial opacity");
            assert.closeTo(mesh.visibility, 0.5, 0.01, "Mesh visibility should be 0.5");
        });

        test("bezier curve respects zero opacity", () => {
            const style: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF00FF", opacity: 0.0, bezier: true },
            };

            const mesh = lineMesh(
                {
                    styleId: "bezier-zero-opacity",
                    width: style.line?.width ?? 0.25,
                    color: style.line?.color ?? "#FFFFFF",
                },
                style,
            );

            assert.exists(mesh, "Bezier mesh should be created with zero opacity");
            assert.equal(mesh.visibility, 0.0, "Bezier mesh visibility should be 0.0");
        });

        test("arrow mesh respects zero opacity", () => {
            const arrowCap = EdgeMesh.createArrowHead(
                meshCache,
                "zero-opacity-arrow",
                {
                    type: "normal",
                    width: 1.0,
                    color: "#FF0000",
                    size: 1.0,
                    opacity: 0.0,
                },
                scene,
            );

            // arrowCap cannot be null since type is "normal" (not "none")
            assert.equal(arrowCap?.visibility, 0.0, "Arrow mesh visibility should be 0.0");
        });
    });

    describe("Self-Loops", () => {
        const arrowTypes = [
            "normal",
            "inverted",
            "dot",
            "open-dot",
            "sphere-dot",
            "diamond",
            "box",
            "vee",
            "tee",
            "half-open",
            "crow",
            "open-normal",
            "open-diamond",
        ];

        test("self-loop bezier curve creates circular path", () => {
            const point = new Vector3(5, 5, 5);

            const curvePoints = EdgeMesh.createBezierLine(point, point);

            // Should generate a circular loop
            assert.isTrue(
                curvePoints.length > 30,
                `Self-loop should have many points for smooth circle, got ${curvePoints.length / 3}`,
            );

            // First and last points should be at same location (forming a loop)
            const firstX = curvePoints[0];
            const firstY = curvePoints[1];
            const firstZ = curvePoints[2];

            const lastX = curvePoints[curvePoints.length - 3];
            const lastY = curvePoints[curvePoints.length - 2];
            const lastZ = curvePoints[curvePoints.length - 1];

            assert.closeTo(firstX, lastX, 0.1, "Self-loop X should close");
            assert.closeTo(firstY, lastY, 0.1, "Self-loop Y should close");
            assert.closeTo(firstZ, lastZ, 0.1, "Self-loop Z should close");
        });

        arrowTypes.forEach((arrowType) => {
            test(`creates arrow mesh for self-loop with ${arrowType} type`, () => {
                const arrowCap = EdgeMesh.createArrowHead(
                    meshCache,
                    `self-loop-${arrowType}`,
                    {
                        type: arrowType,
                        width: 1.0,
                        color: "#FF0000",
                        size: 1.0,
                        opacity: 1.0,
                    },
                    scene,
                );

                // arrowCap cannot be null since arrowTypes don't include "none"
                assert.isFalse(
                    arrowCap ? isDisposed(arrowCap) : false,
                    `${arrowType} arrow mesh should not be disposed`,
                );
            });
        });
    });

    describe("Arrow Geometry Metadata", () => {
        const arrowTypes = [
            "normal",
            "inverted",
            "dot",
            "open-dot",
            "sphere-dot",
            "diamond",
            "box",
            "vee",
            "tee",
            "half-open",
            "crow",
            "open-normal",
            "open-diamond",
            "sphere",
        ];

        arrowTypes.forEach((arrowType) => {
            test(`getArrowGeometry returns valid metadata for ${arrowType}`, () => {
                const geometry = EdgeMesh.getArrowGeometry(arrowType);

                assert.exists(geometry, `Geometry should exist for ${arrowType}`);
                assert.isString(geometry.positioningMode, "positioningMode should be a string");
                assert.include(
                    ["center", "tip"],
                    geometry.positioningMode,
                    `positioningMode should be 'center' or 'tip', got ${geometry.positioningMode}`,
                );
                assert.isBoolean(geometry.needsRotation, "needsRotation should be a boolean");
                assert.isNumber(geometry.positionOffset, "positionOffset should be a number");
            });
        });
    });

    describe("Arrow Position Calculations", () => {
        test("calculateArrowPosition handles tip-based arrows", () => {
            const surfacePoint = new Vector3(10, 0, 0);
            const direction = new Vector3(1, 0, 0);
            const arrowLength = 0.5;
            const geometry = EdgeMesh.getArrowGeometry("normal");

            const position = EdgeMesh.calculateArrowPosition(surfacePoint, direction, arrowLength, geometry);

            // Tip-based arrow with offset=0: position at surface
            assert.closeTo(position.x, surfacePoint.x, 0.001);
            assert.closeTo(position.y, surfacePoint.y, 0.001);
            assert.closeTo(position.z, surfacePoint.z, 0.001);
        });

        test("calculateArrowPosition handles center-based arrows", () => {
            const surfacePoint = new Vector3(10, 0, 0);
            const direction = new Vector3(1, 0, 0);
            const arrowLength = 1.0;
            const geometry = EdgeMesh.getArrowGeometry("dot");

            const position = EdgeMesh.calculateArrowPosition(surfacePoint, direction, arrowLength, geometry);

            // Center-based arrow: position center back by radius (half of length)
            const expectedX = surfacePoint.x - arrowLength / 2;
            assert.closeTo(position.x, expectedX, 0.001);
        });

        test("calculateLineEndpoint creates appropriate gap", () => {
            const surfacePoint = new Vector3(10, 0, 0);
            const direction = new Vector3(1, 0, 0);
            const arrowLength = 0.5;
            const geometry = EdgeMesh.getArrowGeometry("normal");

            const lineEndpoint = EdgeMesh.calculateLineEndpoint(surfacePoint, direction, arrowLength, geometry);

            // Line should end at surface minus arrow length
            const expectedX = surfacePoint.x - arrowLength;
            assert.closeTo(lineEndpoint.x, expectedX, 0.001);
        });
    });

    describe("Mesh Transform Edge Cases", () => {
        test("transformMesh handles zero-length edge gracefully", () => {
            const style: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF0000" },
            };

            const mesh = lineMesh(
                { styleId: "zero-length", width: style.line?.width ?? 0.25, color: style.line?.color ?? "#FFFFFF" },
                style,
            );

            // Same source and destination
            const point = new Vector3(5, 5, 5);

            // This should not throw
            EdgeMesh.transformMesh(mesh, point, point);

            // Mesh should still exist
            assert.exists(mesh);
            assert.isFalse(isDisposed(mesh));
        });

        test("transformMesh handles negative coordinates", () => {
            const style: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF0000" },
            };

            const mesh = lineMesh(
                { styleId: "negative-coords", width: style.line?.width ?? 0.25, color: style.line?.color ?? "#FFFFFF" },
                style,
            );

            const srcPoint = new Vector3(-10, -10, -10);
            const dstPoint = new Vector3(10, 10, 10);

            EdgeMesh.transformMesh(mesh, srcPoint, dstPoint);

            // Midpoint should be at origin
            assert.closeTo((mesh as AbstractMesh).position.x, 0, 0.001);
            assert.closeTo(mesh.position.y, 0, 0.001);
            assert.closeTo(mesh.position.z, 0, 0.001);
        });

        test("transformMesh handles very large coordinates", () => {
            const style: EdgeStyleConfig = {
                line: { width: 0.5, color: "#FF0000" },
            };

            const mesh = lineMesh(
                { styleId: "large-coords", width: style.line?.width ?? 0.25, color: style.line?.color ?? "#FFFFFF" },
                style,
            );

            const srcPoint = new Vector3(1000, 1000, 1000);
            const dstPoint = new Vector3(1500, 1000, 1000);

            EdgeMesh.transformMesh(mesh, srcPoint, dstPoint);

            // Should calculate correct position
            assert.closeTo((mesh as AbstractMesh).position.x, 1250, 0.001);
            assert.closeTo(mesh.position.y, 1000, 0.001);
            assert.closeTo(mesh.position.z, 1000, 0.001);
        });
    });
});
