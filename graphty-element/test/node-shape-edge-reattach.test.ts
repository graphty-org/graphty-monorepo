/**
 * Regression tests for two defects that both live on the Node style path (plan unit U3):
 *
 * 1. A node SHAPE change did not invalidate its incident edges, so the edges kept the endpoints
 *    they had computed against the previous geometry -- the product owner's report "when I change
 *    shapes the edges are no longer touching the surface of the node". The restyle path tested
 *    `this.size !== oldSize` alone, and a shape change at constant size leaves `size` equal. This
 *    is a regression, not a never-worked: `Edge.update` recomputed endpoints every frame until
 *    973f1d96 (2025-11-11) added the position dirty check. See Node.paintFrom for the dates.
 * 2. `effect.glow` was declared in the schema, interned into the style id, and rendered by
 *    nothing at all -- "glow doesn't work". `NodeEffects.applyGlowEffect` is the missing renderer.
 *
 * The harness builds real `Node` and `Edge` objects against a `NullEngine` scene rather than a
 * full `Graph`, because both defects live on Node's repaint path and both need REAL geometry: the
 * whole point of (1) is that a ray hits an icosphere and a box at different distances, and the
 * whole point of (2) is which Babylon mesh ends up in the effect layer's inclusion list.
 */
import { InstancedMesh, NullEngine, type Scene as BabylonScene, Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { EdgeStyleConfig, NodeStyleConfig } from "../src/config";
import { Edge } from "../src/Edge";
import { SimpleLayoutEngine } from "../src/layout/LayoutEngine";
import { DataManager, dataManagerInternals } from "../src/managers/DataManager";
import { EventManager } from "../src/managers/EventManager";
import { DefaultGraphContext, type GraphContext } from "../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../src/managers/LayoutManager";
import { StatsManager } from "../src/managers/StatsManager";
import type { EdgePaint, NodePaint } from "../src/managers/StylePainter";
import { EdgeMesh } from "../src/meshes/EdgeMesh";
import { MeshCache } from "../src/meshes/MeshCache";
import { Node } from "../src/Node";
import { Styles } from "../src/Styles";

const GLOW_LAYER_NAME = "graphty-node-glow";
const SRC_POSITION = [0, 0, 0];
const DST_POSITION = [5, 0, 0];

/**
 * A layout engine that reports fixed positions and never moves anything.
 *
 * Dirty tracking in `Edge.update` keys on node POSITION, so a test that is trying to prove a
 * shape change invalidates an edge must hold positions perfectly still -- otherwise the edge
 * would recompute for the ordinary reason and prove nothing.
 */
class FixedTestLayout extends SimpleLayoutEngine {
    static override type = "fixed-test";

    override scalingFactor = 1;

    override positions: Record<string | number, number[]> = {
        src: SRC_POSITION,
        dst: DST_POSITION,
    };

    /**
     * Mark the (already final) positions as fresh.
     */
    doLayout(): void {
        this.stale = false;
    }
}

interface Harness {
    context: GraphContext;
    dataManager: DataManager;
    layoutEngine: FixedTestLayout;
    scene: BabylonScene;
    dispose(): void;
}

/**
 * Build a minimal but REAL graph context: a NullEngine scene, a mesh cache, and the managers
 * Node and Edge actually call into. Nothing here is mocked with stubs -- Node builds genuine
 * Babylon geometry through NodeMesh, and Edge shoots a genuine ray at it.
 * @returns A harness whose dispose() tears down the Babylon scene
 */
function createHarness(): Harness {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const meshCache = new MeshCache();
    const styles = Styles.default();
    const eventManager = new EventManager();
    const statsManager = new StatsManager(eventManager);
    const dataManager = new DataManager(eventManager, styles);
    const layoutManager = new LayoutManager(eventManager, dataManager, styles);
    const layoutEngine = new FixedTestLayout();
    layoutManagerInternals.setEngine(layoutManager, layoutEngine);

    const context = new DefaultGraphContext(
        () => styles,
        dataManager,
        layoutManager,
        meshCache,
        scene,
        statsManager,
        {},
    );

    return {
        context,
        dataManager,
        layoutEngine,
        scene,
        dispose(): void {
            scene.dispose();
            engine.dispose();
        },
    };
}

/**
 * A stand-in for the session's mesh-key interner: one key per distinct style, minted in
 * first-seen order.
 *
 * A Node and an Edge are handed the paint they are drawn from rather than an id to look one up
 * by, and the key in that paint is what decides whether a restyle rebuilds geometry or leaves it
 * alone. This harness has no session behind it, so it mints its own keys -- distinct from the
 * `s0`, `s1` the real interner mints, for the same reason the bootstrap's key is.
 */
const meshKeys = new Map<string, string>();

/**
 * The key one style is drawn under.
 * @param style - The node or edge style.
 * @returns A key that is stable for that style and different for every other.
 */
function meshKeyOf(style: object): string {
    const spelled = JSON.stringify(style);
    const known = meshKeys.get(spelled);

    if (known !== undefined) {
        return known;
    }

    const minted = `test-s${String(meshKeys.size)}`;
    meshKeys.set(spelled, minted);

    return minted;
}

/**
 * The paint a node is drawn from.
 *
 * The colour is null because this harness paints no instance colours: what these tests are about
 * is geometry, and a colour lives beside the style precisely so that changing it is not geometry.
 * @param style - The style to draw from.
 * @returns The paint.
 */
function nodePaintOf(style: NodeStyleConfig): NodePaint {
    return { meshKey: meshKeyOf(style), style, color: null };
}

/**
 * The paint an edge is drawn from.
 * @param style - The style to draw from.
 * @returns The paint.
 */
function edgePaintOf(style: EdgeStyleConfig): EdgePaint {
    return { meshKey: meshKeyOf(style), style };
}

/**
 * Create a node, register it everywhere a real load would, and place its mesh.
 * @param harness - The test harness
 * @param id - Node id, which must match a key in FixedTestLayout.positions
 * @param style - The node style to draw it from
 * @returns The created node
 */
function addNode(harness: Harness, id: string, style: NodeStyleConfig): Node {
    const node = new Node(harness.context, id, nodePaintOf(style), { id });
    dataManagerInternals.adoptNode(harness.dataManager, node);
    harness.dataManager.nodeCache.set(id, node);
    harness.layoutEngine.addNode(node);
    node.update();
    return node;
}

/**
 * Create the src -> dst edge and give it one update, so its endpoints are computed against the
 * geometry that exists right now.
 * @param harness - The test harness
 * @param style - The edge style to draw it from
 * @returns The created edge
 */
function addEdge(harness: Harness, style: EdgeStyleConfig): Edge {
    const edge = new Edge(harness.context, "src", "dst", 0, edgePaintOf(style), {});
    dataManagerInternals.adoptEdge(harness.dataManager, edge);
    harness.layoutEngine.addEdge(edge);
    edge.update();
    return edge;
}

function nodeStyle(overrides: NodeStyleConfig): NodeStyleConfig {
    return {
        shape: { type: "icosphere", size: 1 },
        texture: { color: "#6366F1" },
        ...overrides,
    };
}

const ARROW_EDGE_STYLE: EdgeStyleConfig = {
    line: { type: "solid", color: "#AAAAAA", width: 0.5 },
    arrowHead: { type: "normal", size: 1, color: "#AAAAAA", opacity: 1 },
};

describe("Node shape changes and connected edges", () => {
    let harness: Harness | undefined;

    afterEach(() => {
        harness?.dispose();
        harness = undefined;
    });

    it("moves the edge endpoint when only the node SHAPE changes", () => {
        harness = createHarness();
        addNode(harness, "src", nodeStyle({ shape: { type: "icosphere", size: 1 } }));
        const dstNode = addNode(harness, "dst", nodeStyle({ shape: { type: "icosphere", size: 1 } }));
        const edge = addEdge(harness, ARROW_EDGE_STYLE);

        assert.isNotNull(edge.arrowCap, "the test needs an arrowhead: it is what marks the surface point");
        const sphereEndpoint = edge.arrowCap?.position.clone();
        assert.isDefined(sphereEndpoint);

        // Same declared size, different geometry. Before the fix this changed nothing about the
        // edge, because the restyle path only invalidated on a SIZE change. A cylinder rather than
        // a box: every shape is now as wide across the view as the icosphere (#2495), so a box's
        // side lies exactly where the sphere's surface does, while a cylinder is narrower than it
        // is tall.
        dstNode.applySessionPaint(nodePaintOf(nodeStyle({ shape: { type: "cylinder", size: 1 } })));
        edge.update();

        const boxEndpoint = edge.arrowCap?.position.clone();
        assert.isDefined(boxEndpoint);
        assert.isAbove(
            Vector3.Distance(sphereEndpoint, boxEndpoint),
            0.05,
            "the edge endpoint must move onto the cylinder surface; unpatched it stays on the old sphere surface",
        );

        // ... and switching back must reattach, not strand the edge on the box surface.
        dstNode.applySessionPaint(nodePaintOf(nodeStyle({ shape: { type: "icosphere", size: 1 } })));
        edge.update();

        const backAgain = edge.arrowCap?.position.clone();
        assert.isDefined(backAgain);
        assert.isBelow(Vector3.Distance(sphereEndpoint, backAgain), 0.001, "switching back must restore the endpoint");
    });

    it("does NOT invalidate connected edges for a colour-only change", () => {
        harness = createHarness();
        addNode(harness, "src", nodeStyle({}));
        const dstNode = addNode(harness, "dst", nodeStyle({}));
        const edge = addEdge(harness, ARROW_EDGE_STYLE);
        assert.isNotNull(edge.arrowCap);

        // A sentinel is the only honest probe here: a colour change leaves the geometry identical,
        // so a recomputed endpoint and a cached one have the SAME value. Parking the arrow
        // somewhere impossible makes "Edge.update returned early" observable. The guard matters
        // for cost, not for pixels -- the invalidation loop is O(E) per node.
        const sentinel = new Vector3(99, 99, 99);
        // A cap has no position to assign any more -- it is a slot in a shared batch -- so the
        // sentinel is written the way the renderer writes one, through the cap's own placement.
        edge.arrowCap?.place(sentinel, Vector3.Right());

        dstNode.applySessionPaint(nodePaintOf(nodeStyle({ texture: { color: "#FF0000" } })));
        edge.update();

        assert.isTrue(
            edge.arrowCap?.position.equalsWithEpsilon(sentinel, 0.001),
            "a colour-only change must not invalidate the edge position cache",
        );
    });
});

describe("Edge ends on a non-round node under a moved graph root", () => {
    let harness: Harness | undefined;

    afterEach(() => {
        harness?.dispose();
        harness = undefined;
    });

    /**
     * Where a box-to-box edge's ends land, in graph-root space, with the root moved and scaled
     * the way an XR gesture leaves it (or left alone).
     * @param transformed - Whether to move and scale the root.
     * @returns The two surface points.
     */
    function boxEnds(transformed: boolean): { src: Vector3; dst: Vector3 } {
        harness = createHarness();
        const root = new TransformNode("graph-root", harness.scene);
        if (transformed) {
            root.position.set(10, -3, 4);
            root.scaling.setAll(2.5);
        }

        addNode(harness, "src", nodeStyle({ shape: { type: "box", size: 1 } }));
        addNode(harness, "dst", nodeStyle({ shape: { type: "box", size: 1 } }));
        const edge = addEdge(harness, ARROW_EDGE_STYLE);
        const { srcPoint, dstPoint } = edge.getInterceptPoints();
        assert.isNotNull(srcPoint, "the ray must hit the source box");
        assert.isNotNull(dstPoint, "the ray must hit the destination box");
        const ends = { src: srcPoint.clone(), dst: dstPoint.clone() };
        harness.dispose();
        harness = undefined;

        return ends;
    }

    it("trims to the same graph-root points whatever the root's transform", () => {
        const plain = boxEnds(false);
        const moved = boxEnds(true);

        // The line is drawn in graph-root space, so its ends must not move with the root. Before
        // the fix the ray was cast from graph-root positions against world-space geometry and its
        // world-space hits were used as graph-root points.
        assert.isBelow(Vector3.Distance(plain.src, moved.src), 1e-4, `source end moved: ${moved.src.toString()}`);
        assert.isBelow(Vector3.Distance(plain.dst, moved.dst), 1e-4, `destination end moved: ${moved.dst.toString()}`);
    });
});

describe("A self-loop clears its node", () => {
    let harness: Harness | undefined;

    afterEach(() => {
        harness?.dispose();
        harness = undefined;
        vi.restoreAllMocks();
    });

    /**
     * Draw a curved self-loop on one node and return how close the loop comes to its centre.
     * @param shape - The node's shape.
     * @returns The nearest loop point's distance from the centre in x-y, and the node's reach there.
     */
    function loopAround(shape: NonNullable<NodeStyleConfig["shape"]>): { nearest: number; reach: number } {
        harness = createHarness();
        const node = addNode(harness, "src", nodeStyle({ shape }));
        const curves: number[][] = [];
        const original = EdgeMesh.createBezierLine.bind(EdgeMesh);
        vi.spyOn(EdgeMesh, "createBezierLine").mockImplementation((...args) => {
            const points = original(...args);
            curves.push(points);
            return points;
        });
        const style: EdgeStyleConfig = { line: { type: "solid", color: "#AAAAAA", width: 0.5, bezier: true } };
        const edge = new Edge(harness.context, "src", "src", 0, edgePaintOf(style), {});
        dataManagerInternals.adoptEdge(harness.dataManager, edge);
        harness.layoutEngine.addEdge(edge);
        edge.update();

        assert.isAbove(curves.length, 0, "the self-loop was drawn as a curve");
        const points = curves[curves.length - 1];
        const centre = node.mesh.position;
        let nearest = Infinity;
        for (let i = 0; i < points.length; i += 3) {
            nearest = Math.min(nearest, Math.hypot(points[i] - centre.x, points[i + 1] - centre.y));
        }

        const { extendSize } = node.mesh.getBoundingInfo().boundingBox;
        const { scaling } = node.mesh;
        const reach = Math.hypot(extendSize.x * scaling.x, extendSize.y * scaling.y);
        return { nearest, reach };
    }

    it("runs outside a node bigger than the usual loop", () => {
        const { nearest, reach } = loopAround({ type: "box", size: 6 });

        assert.isAbove(nearest, reach, "the loop is drawn inside the node, where it cannot be seen");
    });

    it("keeps the usual radius around a default-sized node", () => {
        const { nearest } = loopAround({ type: "sphere", size: 1 });

        assert.closeTo(nearest, EdgeMesh.SELF_LOOP_RADIUS, 1e-6);
    });
});

describe("Node glow effect", () => {
    let harness: Harness | undefined;

    afterEach(() => {
        harness?.dispose();
        harness = undefined;
    });

    /**
     * Find the glow layer this package creates, by name.
     * @param scene - The scene to search
     * @returns The glow layer, or undefined when none was ever created
     */
    function findGlowLayer(scene: BabylonScene): { hasMesh(mesh: InstancedMesh | Node["mesh"]): boolean } | undefined {
        return scene.effectLayers.find((layer) => layer.name === GLOW_LAYER_NAME);
    }

    /**
     * The mesh Babylon actually renders for a node: an instance's source, since MeshCache hands
     * out instances of one source mesh per style id.
     * @param node - The node to resolve
     * @returns The rendered mesh
     */
    function renderedMeshOf(node: Node): Node["mesh"] {
        return node.mesh instanceof InstancedMesh ? node.mesh.sourceMesh : node.mesh;
    }

    it("creates NO glow layer for a graph that uses no glow", () => {
        harness = createHarness();
        addNode(harness, "src", nodeStyle({}));
        addNode(harness, "dst", nodeStyle({}));

        assert.isUndefined(
            findGlowLayer(harness.scene),
            "a GlowLayer is a full-screen post-process; a graph with no glow must not pay for one",
        );
    });

    it("puts a glowing node's rendered mesh into the glow layer", () => {
        harness = createHarness();
        const node = addNode(harness, "src", nodeStyle({ effect: { glow: { color: "#FF0000", strength: 2 } } }));

        const glowLayer = findGlowLayer(harness.scene);
        assert.isDefined(glowLayer, "a style carrying effect.glow must create the glow layer");
        assert.isTrue(
            glowLayer.hasMesh(renderedMeshOf(node)),
            "the SOURCE mesh must be included: Babylon consults subMesh.getRenderingMesh(), not the instance",
        );
    });

    it("draws no glow for a style that sets only a glow strength", () => {
        // `node.glowStrength` writes `effect.glow.strength`, so a layer binding only a strength
        // leaves an `effect.glow` with no colour. That must not switch glow on (#2068).
        harness = createHarness();
        addNode(harness, "src", nodeStyle({ effect: { glow: { strength: 2 } } }));

        assert.isUndefined(
            findGlowLayer(harness.scene),
            "a glow strength with no glow colour drew a glow (the white fallback)",
        );
    });

    it("takes a node out of the glow layer when glow is turned off", () => {
        harness = createHarness();
        // Two DIFFERENT glow styles, so the inclusion list is never empty while we assert. An
        // empty Babylon inclusion list means "no opinion", i.e. hasMesh() answers true for
        // everything, which would make the assertion below meaningless.
        const node = addNode(harness, "src", nodeStyle({ effect: { glow: { color: "#FF0000" } } }));
        addNode(harness, "dst", nodeStyle({ effect: { glow: { color: "#00FF00" } } }));

        const glowLayer = findGlowLayer(harness.scene);
        assert.isDefined(glowLayer);
        assert.isTrue(glowLayer.hasMesh(renderedMeshOf(node)));

        node.applySessionPaint(nodePaintOf(nodeStyle({})));

        assert.isFalse(
            glowLayer.hasMesh(renderedMeshOf(node)),
            "after glow is removed the node's rendered mesh must no longer be in the glow layer",
        );
    });
});

describe("Node and Edge disposal", () => {
    let harness: Harness | undefined;

    afterEach(() => {
        harness?.dispose();
        harness = undefined;
    });

    it("disposes the arrowheads, which are not in the mesh cache", () => {
        harness = createHarness();
        addNode(harness, "src", nodeStyle({}));
        addNode(harness, "dst", nodeStyle({}));
        const edge = addEdge(harness, ARROW_EDGE_STYLE);

        const { arrowCap } = edge;
        assert.isNotNull(arrowCap, "the test needs an arrowhead to prove it is freed");

        edge.dispose();

        assert.isTrue(edge.isDisposed());
        assert.isTrue(arrowCap?.isDisposed(), "the arrowhead is created bare against the scene; only dispose frees it");
        assert.isNull(edge.arrowCap);
    });

    it("refuses to rebuild a disposed node's mesh", () => {
        harness = createHarness();
        const node = addNode(harness, "src", nodeStyle({}));
        addNode(harness, "dst", nodeStyle({}));

        node.dispose();
        const disposedMesh = node.mesh;

        // The layout engine and SelectionManager both keep Node references across a dataset
        // boundary and both call these. Without the disposed guard, update()'s
        // recreate-if-the-mesh-is-disposed branch would silently resurrect the mesh.
        node.update();
        node.updateStyle();

        assert.isTrue(node.isDisposed());
        assert.strictEqual(node.mesh, disposedMesh, "a disposed node must not be given a new mesh");
        assert.isTrue(node.mesh.isDisposed(), "and the mesh it still points at must stay disposed");
    });

    it("disposes every node and edge when DataManager.clear runs", () => {
        harness = createHarness();
        const srcNode = addNode(harness, "src", nodeStyle({}));
        const dstNode = addNode(harness, "dst", nodeStyle({}));
        const edge = addEdge(harness, ARROW_EDGE_STYLE);

        harness.dataManager.clear();

        assert.isTrue(edge.isDisposed(), "clear() must free the edge's uncached meshes");
        assert.isTrue(srcNode.isDisposed());
        assert.isTrue(dstNode.isDisposed());
    });
});
