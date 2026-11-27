/**
 * Edge Integration Tests
 *
 * Tests the complete edge creation workflow including line, arrows,
 * positioning, and transformation. Uses NullEngine for headless rendering.
 */

import { AbstractMesh, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import type { EdgeStyleConfig } from "../../src/config";
import type { PatternedLineMesh } from "../../src/meshes/PatternedLineMesh";
import { batchLineFor } from "../helpers/edgeLine";
import { asData } from "../helpers/testSetup";

/**
 * Helper to check if a mesh is disposed, handling both AbstractMesh (method) and PatternedLineMesh (property)
 */
function isDisposed(mesh: AbstractMesh | PatternedLineMesh | ArrowCap): boolean {
    if ("isDisposed" in mesh) {
        if (typeof mesh.isDisposed === "function") {
            return mesh.isDisposed();
        }

        return mesh.isDisposed;
    }

    return false;
}
import { Edge, edgeInternals } from "../../src/Edge";
import { DataManager, dataManagerInternals } from "../../src/managers/DataManager";
import { EventManager } from "../../src/managers/EventManager";
import { DefaultGraphContext } from "../../src/managers/GraphContext";
import { LayoutManager } from "../../src/managers/LayoutManager";
import { StatsManager } from "../../src/managers/StatsManager";
import { bootstrapNodePaint, type EdgePaint } from "../../src/managers/StylePainter";
import type { ArrowCap } from "../../src/meshes/ArrowCapBatch";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { MeshCache } from "../../src/meshes/MeshCache";
import { Node } from "../../src/Node";
import { Styles } from "../../src/Styles";

/**
 * A real graph context on the test's scene, holding real nodes drawn at the given positions.
 * @param scene - The scene.
 * @param meshCache - The mesh cache.
 * @param styles - The styles.
 * @param positions - Each node's id and where it is drawn.
 * @returns The context.
 */
function contextWith(
    scene: Scene,
    meshCache: MeshCache,
    styles: Styles,
    positions: Record<string, Vector3>,
): DefaultGraphContext {
    const eventManager = new EventManager();
    const dataManager = new DataManager(eventManager, styles);
    const layoutManager = new LayoutManager(eventManager, dataManager, styles);
    const context = new DefaultGraphContext(
        () => styles,
        dataManager,
        layoutManager,
        meshCache,
        scene,
        new StatsManager(eventManager),
        {},
    );

    for (const [id, at] of Object.entries(positions)) {
        const node = new Node(context, id, { ...bootstrapNodePaint(), meshKey: "edge-integration" }, { id });
        dataManagerInternals.adoptNode(dataManager, node);
        dataManager.nodeCache.set(id, node);
        node.setMeshPosition(at.x, at.y, at.z);
    }

    return context;
}

/**
 * Create a minimal Styles object for testing
 */
function createMinimalStyles(): Styles {
    return new Styles({
        graphtyTemplate: true,
        majorVersion: "1",
        layers: [],
        graph: {
            addDefaultStyle: true,
            background: {
                backgroundType: "color",
                color: "#000000",
            },
            startingCameraDistance: 100,
            layout: "none",
            twoD: false,
            viewMode: "3d",
        },
        behavior: {
            layout: {
                type: "none",
                preSteps: 0,
                stepMultiplier: 1,
                minDelta: 0.001,
                zoomStepInterval: 100,
                maxInFlight: 2,
            },
            node: {
                pinOnDrag: false,
            },
            labels: {
                declutter: false,
                avoidNodesAndEdges: false,
            },
            rendering: {
                onDemand: false,
            },
            camera: {
                pivotOnSelection: false,
                autoRotate: 0,
                autoRotateResume: 0,
                fitInsets: { top: 0, right: 0, bottom: 0, left: 0 },
                fitBounds: "box",
                refitOnResize: false,
                hoverWhileDragging: true,
            },
            expand: {
                trigger: "none",
                depth: 1,
                direction: "both",
                layout: "continue",
            },
            selection: {
                region: "off",
            },
        },
        data: {
            knownFields: {
                nodeIdPath: "id",
                nodeLabelPath: null,
                nodeWeightPath: null,
                nodeTimePath: null,
                edgeSrcIdPath: "source",
                edgeDstIdPath: "target",
                edgeIdPath: null,
                repeatedEdges: "keep",
                edgeWeightPath: null,
                edgeTimePath: null,
                edgeWeightMeaning: null,
                positionScale: 1,
                idCoercion: "canonical",
            },
            directed: "auto",
        },
    });
}

/**
 * The paint an edge is drawn from, with a key of its own.
 *
 * An Edge is handed its paint rather than an id to look a style up by: the session's paint is
 * addressed by the dense index the store assigns after construction, so there is nothing to look
 * up at the moment an Edge is built. The key is what decides whether a restyle rebuilds the line
 * and its arrow caps, so each distinct style here gets a distinct one.
 * @param name - What to key this style's geometry under.
 * @param style - The style to draw from.
 * @returns The paint.
 */
function paintOf(name: string, style: EdgeStyleConfig): EdgePaint {
    return { meshKey: `test-${name}`, style };
}

describe("Edge Integration", () => {
    let engine: NullEngine;
    let scene: Scene;
    let meshCache: MeshCache;
    let styles: Styles;

    // Pre-defined style configurations
    let defaultPaint: EdgePaint;
    let arrowHeadPaint: EdgePaint;
    let arrowTailPaint: EdgePaint;
    let bidirectionalPaint: EdgePaint;
    let initialPaint: EdgePaint;
    let updatedPaint: EdgePaint;
    let styleAPaint: EdgePaint;
    let styleBPaint: EdgePaint;

    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine);
        meshCache = new MeshCache();
        styles = createMinimalStyles();

        // One paint per distinct style, each with a mesh key of its own
        defaultPaint = paintOf("default", {
            line: { width: 0.5, color: "#A9A9A9" },
        });

        arrowHeadPaint = paintOf("arrowHead", {
            line: { width: 0.5, color: "#FF0000" },
            arrowHead: { type: "normal", size: 1, color: "#FF0000", opacity: 1 },
        });

        arrowTailPaint = paintOf("arrowTail", {
            line: { width: 0.5, color: "#00FF00" },
            arrowTail: { type: "tee", size: 1, color: "#00FF00", opacity: 1 },
        });

        bidirectionalPaint = paintOf("bidirectional", {
            line: { width: 0.5, color: "#0000FF" },
            arrowHead: { type: "normal", size: 1, color: "#FF0000", opacity: 1 },
            arrowTail: { type: "inverted", size: 1, color: "#00FF00", opacity: 1 },
        });

        initialPaint = paintOf("initial", {
            line: { width: 0.5, color: "#FF0000" },
        });

        updatedPaint = paintOf("updated", {
            line: { width: 1.0, color: "#00FF00" },
            arrowHead: { type: "diamond", size: 1.5, color: "#00FF00", opacity: 1 },
        });

        styleAPaint = paintOf("styleA", {
            line: { width: 0.5, color: "#FF0000" },
            arrowHead: { type: "normal", size: 1, color: "#FF0000", opacity: 1 },
        });

        styleBPaint = paintOf("styleB", {
            line: { width: 1.0, color: "#0000FF" },
            arrowHead: { type: "box", size: 1, color: "#0000FF", opacity: 1 },
        });
    });

    afterEach(() => {
        engine.dispose();
    });

    describe("Complete Edge Creation", () => {
        test("creates edge with line mesh", () => {
            const context = contextWith(scene, meshCache, styles, {
                src: new Vector3(0, 0, 0),
                dst: new Vector3(5, 0, 0),
            });

            const edge = new Edge(context, "src", "dst", 0, defaultPaint, asData({}));

            assert.exists(edge.mesh);
            assert.isFalse(isDisposed(edge.mesh));
            assert.equal(edge.srcId, "src");
            assert.equal(edge.dstId, "dst");
            assert.equal(edge.id, "0", "Edge.id is the element-assigned counter, printed");
        });

        test("placing an edge whose ends both have a Node looks up no end by id", () => {
            const context = contextWith(scene, meshCache, styles, {
                src: new Vector3(0, 0, 0),
                dst: new Vector3(5, 0, 0),
            });
            const edge = new Edge(context, "src", "dst", 0, defaultPaint, asData({}));
            const rowOf = vi.spyOn(dataManagerInternals, "rowOf");

            const [a, b] = [new Vector3(0, 0, 0), new Vector3(5, 0, 0)];
            const ends = [edgeInternals.bareEnd(edge, "source", a, b), edgeInternals.bareEnd(edge, "target", b, a)];

            // the end checks added for rows with no `Node` asked the id map up to four times an end, every frame
            assert.strictEqual(rowOf.mock.calls.length, 0);
            assert.deepEqual(
                ends.map((p) => p.asArray()),
                [a.asArray(), b.asArray()],
            );
            rowOf.mockRestore();
        });

        test("creates edge with arrowHead when configured", () => {
            const context = contextWith(scene, meshCache, styles, {
                src: new Vector3(0, 0, 0),
                dst: new Vector3(5, 0, 0),
            });
            const edge = new Edge(context, "src", "dst", 0, arrowHeadPaint, asData({}));

            assert.exists(edge.mesh);
            assert.exists(edge.arrowCap);
            assert.isFalse(isDisposed(edge.arrowCap));
        });

        test("creates edge with arrowTail when configured", () => {
            const context = contextWith(scene, meshCache, styles, {
                src: new Vector3(0, 0, 0),
                dst: new Vector3(5, 0, 0),
            });
            const edge = new Edge(context, "src", "dst", 0, arrowTailPaint, asData({}));

            assert.exists(edge.mesh);
            assert.exists(edge.arrowTailCap);
            assert.isFalse(isDisposed(edge.arrowTailCap));
        });

        test("creates edge with bidirectional arrows", () => {
            const context = contextWith(scene, meshCache, styles, {
                src: new Vector3(0, 0, 0),
                dst: new Vector3(5, 0, 0),
            });
            const edge = new Edge(context, "src", "dst", 0, bidirectionalPaint, asData({}));

            assert.exists(edge.mesh);
            assert.exists(edge.arrowCap);
            assert.exists(edge.arrowTailCap);
            assert.isFalse(isDisposed(edge.arrowCap));
            assert.isFalse(isDisposed(edge.arrowTailCap));
        });

        test("updates edge style correctly", () => {
            const context = contextWith(scene, meshCache, styles, {
                src: new Vector3(0, 0, 0),
                dst: new Vector3(5, 0, 0),
            });
            const edge = new Edge(context, "src", "dst", 0, initialPaint, asData({}));

            assert.isTrue(edge.arrowCap === null, "no arrow before the repaint");
            /* WHICH STYLE THE EDGE IS DRAWN FROM, BEFORE. Two assertions on `edge.styleId` used
               to bracket this repaint, and they are what said "drawn from THAT style" rather
               than "drawn from something". A style id is gone with the 1.x style table and the
               mesh key that replaced it is private, so the identity is read where it is public:
               the line as drawn, at the width the paint asks for. (Its batch is keyed by the
               line's shape, not by the paint's key: edges that differ only in color share it.) */
            const before = edge.mesh;
            assert.strictEqual(edge.drawnLine?.width, initialPaint.style.line?.width);

            // Repaint from a style that carries an arrow cap. `applySessionPaint` is the door the
            // session's own pass uses; `updateStyle()` is the no-argument rebuild request beside
            // it, and neither takes a style id any more.
            edge.applySessionPaint(updatedPaint);

            const drawn: ArrowCap | null = edge.arrowCap;

            assert.exists(drawn);
            /* WHICH style it was drawn from, not merely that something was drawn. That identity
               used to be asserted through a style id, and without it this test passes on an edge
               that grew an arrow of any shape at all. The mesh cache names an arrow after the
               cap it built, so the name carries the one part of the new style that is visible
               from outside -- read off the paint rather than spelled out here, so the two cannot
               drift. */
            assert.include(drawn.name, updatedPaint.style.arrowHead?.type ?? "none");

            // AND THE SECOND HALF OF THE BRACKET: the line the repaint rebuilt is drawn from the
            // new paint's mesh key, not the old one's.
            assert.strictEqual(edge.drawnLine?.width, updatedPaint.style.line?.width);
            assert.notStrictEqual(edge.mesh, before, "drawn from another batch");
        });

        test("draws an arrow at the size its own style asks for, not at one fixed size", () => {
            const context = contextWith(scene, meshCache, styles, {
                src: new Vector3(0, 0, 0),
                dst: new Vector3(5, 0, 0),
            });
            const small = new Edge(context, "src", "dst", 0, arrowHeadPaint, asData({}));
            const large = new Edge(
                context,
                "src",
                "dst",
                1,
                paintOf("bigArrowHead", {
                    line: { width: 0.5, color: "#FF0000" },
                    arrowHead: { type: "normal", size: 3, color: "#FF0000", opacity: 1 },
                }),
                asData({}),
            );

            assert.exists(small.arrowCap);
            assert.exists(large.arrowCap);

            /* `EdgeStyle.arrowHead.size` has been in the schema and read by the renderer since
               1.x, and for the whole of the 2.0 branch no public route wrote it. This is the
               renderer half of that gap: the cap really is built at the size the style names,
               which is what makes `edge.arrowHeadSize` worth publishing. */
            assert.isAbove(large.arrowCap.span, small.arrowCap.span * 2);
        });

        test("draws an arrow at the opacity its own style asks for", () => {
            const context = contextWith(scene, meshCache, styles, {
                src: new Vector3(0, 0, 0),
                dst: new Vector3(5, 0, 0),
            });
            const faint = new Edge(
                context,
                "src",
                "dst",
                0,
                paintOf("faintArrowHead", {
                    line: { width: 0.5, color: "#FF0000" },
                    arrowHead: { type: "normal", size: 1, color: "#FF0000", opacity: 0.25 },
                }),
                asData({}),
            );

            assert.exists(faint.arrowCap);
            assert.strictEqual(faint.arrowCap.visibility, 0.25);
        });

        test("disposes edge resources when style changes", () => {
            const context = contextWith(scene, meshCache, styles, {
                src: new Vector3(0, 0, 0),
                dst: new Vector3(5, 0, 0),
            });
            const edge = new Edge(context, "src", "dst", 0, styleAPaint, asData({}));

            const oldMesh = edge.mesh;
            const oldArrowMesh = edge.arrowCap;

            // Repainting from another style disposes the meshes the old one built.
            edge.applySessionPaint(styleBPaint);

            // Old meshes should be disposed
            assert.isTrue(isDisposed(oldMesh));
            assert.exists(oldArrowMesh);
            assert.isTrue(isDisposed(oldArrowMesh));

            // New meshes should exist and not be disposed
            assert.isFalse(isDisposed(edge.mesh));
            assert.exists(edge.arrowCap);
            assert.isFalse(isDisposed(edge.arrowCap));
        });
    });

    describe("Arrow Positioning", () => {
        test("arrow positions are calculated using getArrowGeometry", () => {
            // Test the static arrow geometry lookup
            const normalGeometry = EdgeMesh.getArrowGeometry("normal");
            assert.equal(normalGeometry.positioningMode, "tip");
            assert.equal(normalGeometry.needsRotation, false);
            assert.equal(normalGeometry.positionOffset, 0);

            const dotGeometry = EdgeMesh.getArrowGeometry("dot");
            assert.equal(dotGeometry.positioningMode, "center");
            assert.equal(dotGeometry.needsRotation, false);

            const invertedGeometry = EdgeMesh.getArrowGeometry("inverted");
            assert.equal(invertedGeometry.positioningMode, "tip");
            assert.equal(invertedGeometry.positionOffset, 1.0);
        });

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

        test("calculateArrowPosition handles inverted arrows with offset", () => {
            const surfacePoint = new Vector3(10, 0, 0);
            const direction = new Vector3(1, 0, 0);
            const arrowLength = 0.5;
            const geometry = EdgeMesh.getArrowGeometry("inverted");

            const position = EdgeMesh.calculateArrowPosition(surfacePoint, direction, arrowLength, geometry);

            // Inverted arrow: offset = 1.0 (full arrow length)
            const expectedX = surfacePoint.x - arrowLength * geometry.positionOffset;
            assert.closeTo(position.x, expectedX, 0.001);
        });

        test("calculateLineEndpoint creates gap for arrows", () => {
            const surfacePoint = new Vector3(10, 0, 0);
            const direction = new Vector3(1, 0, 0);
            const arrowLength = 0.5;
            const geometry = EdgeMesh.getArrowGeometry("normal");

            const lineEndpoint = EdgeMesh.calculateLineEndpoint(surfacePoint, direction, arrowLength, geometry);

            // Line should end at surface minus arrow length
            const expectedX = surfacePoint.x - arrowLength;
            assert.closeTo(lineEndpoint.x, expectedX, 0.001);
        });

        test("calculateLineEndpoint respects scaleFactor", () => {
            const surfacePoint = new Vector3(10, 0, 0);
            const direction = new Vector3(1, 0, 0);
            const arrowLength = 1.0;
            const geometry = EdgeMesh.getArrowGeometry("sphere-dot");

            const lineEndpoint = EdgeMesh.calculateLineEndpoint(surfacePoint, direction, arrowLength, geometry);

            // sphere-dot has scaleFactor 0.25, so gap = arrowLength * 0.25
            const actualSize = arrowLength * (geometry.scaleFactor ?? 1.0);
            const expectedX = surfacePoint.x - actualSize;
            assert.closeTo(lineEndpoint.x, expectedX, 0.001);
        });
    });

    describe("Edge Transformation", () => {
        test("transformMesh positions line at midpoint", () => {
            const srcPoint = new Vector3(0, 0, 0);
            const dstPoint = new Vector3(10, 0, 0);

            const options = { styleId: "transform-test", width: 0.5, color: "#FF0000" };
            const style = { line: { width: 0.5, color: "#FF0000" }, enabled: true };
            const mesh = batchLineFor(meshCache, options, style, scene);

            EdgeMesh.transformMesh(mesh, srcPoint, dstPoint);

            // Midpoint should be at (5, 0, 0)
            assert.closeTo(mesh.position.x, 5, 0.001);
            assert.closeTo(mesh.position.y, 0, 0.001);
            assert.closeTo(mesh.position.z, 0, 0.001);
        });

        test("transformMesh scales line to correct length", () => {
            const srcPoint = new Vector3(0, 0, 0);
            const dstPoint = new Vector3(3, 4, 0);

            const options = { styleId: "scale-test", width: 0.5, color: "#FF0000" };
            const style = { line: { width: 0.5, color: "#FF0000" }, enabled: true };
            const mesh = batchLineFor(meshCache, options, style, scene);

            EdgeMesh.transformMesh(mesh, srcPoint, dstPoint);

            // Length = sqrt(3^2 + 4^2) = 5
            assert.closeTo(mesh.scaling.z, 5, 0.001);
        });

        test("transformMesh handles 3D coordinates", () => {
            const srcPoint = new Vector3(0, 0, 0);
            const dstPoint = new Vector3(1, 2, 2);

            const options = { styleId: "3d-test", width: 0.5, color: "#FF0000" };
            const style = { line: { width: 0.5, color: "#FF0000" }, enabled: true };
            const mesh = batchLineFor(meshCache, options, style, scene);

            EdgeMesh.transformMesh(mesh, srcPoint, dstPoint);

            // Midpoint should be at (0.5, 1, 1)
            assert.closeTo(mesh.position.x, 0.5, 0.001);
            assert.closeTo(mesh.position.y, 1, 0.001);
            assert.closeTo(mesh.position.z, 1, 0.001);

            // Length = sqrt(1^2 + 2^2 + 2^2) = 3
            assert.closeTo(mesh.scaling.z, 3, 0.001);
        });

        test("transformMesh handles negative coordinates", () => {
            const srcPoint = new Vector3(-5, -5, -5);
            const dstPoint = new Vector3(5, 5, 5);

            const options = { styleId: "negative-test", width: 0.5, color: "#FF0000" };
            const style = { line: { width: 0.5, color: "#FF0000" }, enabled: true };
            const mesh = batchLineFor(meshCache, options, style, scene);

            EdgeMesh.transformMesh(mesh, srcPoint, dstPoint);

            // Midpoint should be at origin
            assert.closeTo(mesh.position.x, 0, 0.001);
            assert.closeTo(mesh.position.y, 0, 0.001);
            assert.closeTo(mesh.position.z, 0, 0.001);

            // Length = sqrt(10^2 + 10^2 + 10^2) = sqrt(300)
            assert.closeTo(mesh.scaling.z, Math.sqrt(300), 0.001);
        });

        test("transformMesh orients line correctly (lookAt)", () => {
            const srcPoint = new Vector3(0, 0, 0);
            const dstPoint = new Vector3(5, 0, 0);

            const options = { styleId: "orient-test", width: 0.5, color: "#FF0000" };
            const style = { line: { width: 0.5, color: "#FF0000" }, enabled: true };
            const mesh = batchLineFor(meshCache, options, style, scene);

            EdgeMesh.transformMesh(mesh, srcPoint, dstPoint);

            // After lookAt(dstPoint), the mesh's Z scale is stretched along the edge direction
            // The scaling.z is set to the edge length, which is 5
            assert.closeTo(mesh.scaling.z, 5, 0.001);

            // Verify the position is at midpoint
            assert.closeTo(mesh.position.x, 2.5, 0.001);
            assert.closeTo(mesh.position.y, 0, 0.001);
            assert.closeTo(mesh.position.z, 0, 0.001);
        });
    });

    describe("Edge Ray Updates", () => {
        test("ray is created during edge construction", () => {
            const context = contextWith(scene, meshCache, styles, {
                src: new Vector3(0, 0, 0),
                dst: new Vector3(5, 0, 0),
            });
            const edge = new Edge(context, "src", "dst", 0, defaultPaint, asData({}));

            assert.exists(edge.ray);
            // Ray direction should point from source to destination
            assert.closeTo(edge.ray.direction.x, 5, 0.001);
            assert.closeTo(edge.ray.direction.y, 0, 0.001);
            assert.closeTo(edge.ray.direction.z, 0, 0.001);
        });
    });

    describe("Error Handling", () => {
        test("throws error when source node doesn't exist", () => {
            const context = contextWith(scene, meshCache, styles, { dst: new Vector3(5, 0, 0) });

            assert.throws(
                () => new Edge(context, "src", "dst", 0, defaultPaint, asData({})),
                /Node 'src' hasn't been created yet/,
            );
        });

        test("throws error when destination node doesn't exist", () => {
            const context = contextWith(scene, meshCache, styles, { src: new Vector3(0, 0, 0) });

            assert.throws(
                () => new Edge(context, "src", "dst", 0, defaultPaint, asData({})),
                /Node 'dst' hasn't been created yet/,
            );
        });
    });
});
