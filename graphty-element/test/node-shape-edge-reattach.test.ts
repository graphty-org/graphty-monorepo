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
import { afterEach, assert, describe, it } from "vitest";

import type { EdgeStyleConfig, NodeStyleConfig } from "../src/config";
import { Edge } from "../src/Edge";
import { SimpleLayoutEngine } from "../src/layout/LayoutEngine";
import { DataManager, dataManagerInternals } from "../src/managers/DataManager";
import { EventManager } from "../src/managers/EventManager";
import { DefaultGraphContext, type GraphContext } from "../src/managers/GraphContext";
import { LayoutManager, layoutManagerInternals } from "../src/managers/LayoutManager";
import { StatsManager } from "../src/managers/StatsManager";
import type { EdgePaint, NodePaint } from "../src/managers/StylePainter";
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

describe("A self-loop and a bundle of parallel edges", () => {
    let harness: Harness | undefined;

    afterEach(() => {
        harness?.dispose();
        harness = undefined;
    });

    const LINE: EdgeStyleConfig = { line: { type: "solid", color: "#AAAAAA", width: 0.5 } };
    const CURVED: EdgeStyleConfig = { line: { ...LINE.line, bezier: true } };

    /**
     * Add edges between two of the harness's nodes and place every edge once more, as a frame does.
     * @param h - The harness.
     * @param ends - Each edge's source and target.
     * @param style - Their style.
     * @returns The edges.
     */
    function addEdges(h: Harness, ends: readonly (readonly [string, string])[], style = LINE): Edge[] {
        const edges = ends.map(([from, to]) => {
            const edge = new Edge(h.context, from, to, h.dataManager.edges.size, edgePaintOf(style), {});
            dataManagerInternals.adoptEdge(h.dataManager, edge);
            h.layoutEngine.addEdge(edge);
            return edge;
        });
        for (const edge of edges) {
            edge.update();
        }

        return edges;
    }

    /**
     * The drawn points of an edge's line.
     * @param edge - The edge.
     * @returns Its points; one straight segment when it is not drawn as a run.
     */
    function drawn(edge: Edge): Vector3[] {
        const curve = edge.drawnCurve;
        assert.isNotNull(curve, "the edge is drawn as a run of segments");
        return curve ?? [];
    }

    /**
     * How far a node's surface reaches from its centre in x-y, at most.
     * @param node - The node.
     * @returns The reach.
     */
    function reachOf(node: Node): number {
        const { extendSize } = node.mesh.getBoundingInfo().boundingBox;
        const { scaling } = node.mesh;
        return Math.hypot(extendSize.x * scaling.x, extendSize.y * scaling.y);
    }

    for (const shape of [
        { type: "box", size: 6 },
        { type: "sphere", size: 1 },
    ] as const) {
        it(`draws a straight-styled loop on a ${shape.type} as a teardrop outside it, not a ring round it`, () => {
            harness = createHarness();
            const node = addNode(harness, "src", nodeStyle({ shape }));
            const [loop] = addEdges(harness, [["src", "src"]]);
            const points = drawn(loop);
            const centre = node.mesh.position;
            const reach = reachOf(node);
            const tip = Math.max(...points.map((p) => Math.hypot(p.x - centre.x, p.y - centre.y)));
            assert.isAbove(tip, reach, "the loop reaches past the node");
            // Every drawn point is outside the node's surface (the ends on it).
            const ends = [points[0], points.at(-1)];
            for (const p of points) {
                if (!ends.includes(p)) {
                    assert.isAtLeast(Math.hypot(p.x - centre.x, p.y - centre.y), reach * 0.5);
                }
            }

            // A teardrop leaves and returns on one side: its points span well under a half turn.
            const angles = points.map((p) => Math.atan2(p.y - centre.y, p.x - centre.x));
            const span = Math.max(...angles) - Math.min(...angles);
            assert.isBelow(span, Math.PI, "the loop is on one side of the node");
        });
    }

    for (const type of ["dash", "dot"] as const) {
        it(`draws a ${type} self-loop round its teardrop, not as a line of no length`, () => {
            harness = createHarness();
            const node = addNode(harness, "src", nodeStyle({}));
            const [loop] = addEdges(harness, [["src", "src"]], { line: { ...LINE.line, type } });
            const centre = node.mesh.position;
            const tip = Math.max(...drawn(loop).map((p) => Math.hypot(p.x - centre.x, p.y - centre.y)));
            assert.isAbove(tip, reachOf(node), "the loop reaches past the node");
        });
    }

    it("turns each loop on one node a different way", () => {
        harness = createHarness();
        const node = addNode(harness, "src", nodeStyle({}));
        const loops = addEdges(harness, [
            ["src", "src"],
            ["src", "src"],
            ["src", "src"],
        ]);
        const centre = node.mesh.position;
        const tips = loops.map((loop) => {
            const points = drawn(loop);
            return points[Math.floor(points.length / 2)].subtract(centre).normalize();
        });
        for (let i = 0; i < tips.length; i++) {
            for (let j = i + 1; j < tips.length; j++) {
                assert.isBelow(Vector3.Dot(tips[i], tips[j]), 0.9, `loops ${i} and ${j} point different ways`);
            }
        }
    });

    it("fans two curved edges between one pair apart, either way round, and leaves a lone edge straight", () => {
        harness = createHarness();
        addNode(harness, "src", nodeStyle({}));
        addNode(harness, "dst", nodeStyle({}));
        const [there, back] = addEdges(
            harness,
            [
                ["src", "dst"],
                ["dst", "src"],
            ],
            CURVED,
        );
        const middle = (edge: Edge): Vector3 => {
            const points = drawn(edge);
            return points[Math.floor(points.length / 2)];
        };
        // The nodes sit on the x axis: the two arcs bow to opposite sides of it.
        assert.isBelow(middle(there).y * middle(back).y, 0, "the two edges bow to opposite sides");
        assert.isAbove(Math.abs(middle(there).y), 0.5);

        harness.dispose();
        harness = createHarness();
        addNode(harness, "src", nodeStyle({}));
        addNode(harness, "dst", nodeStyle({}));
        const [lone] = addEdges(harness, [["src", "dst"]]);
        assert.isNull(lone.drawnCurve, "a lone edge is one straight segment");
    });

    it("draws a lone curved edge along its own curve, its arrow pointing along the curve's end", () => {
        harness = createHarness();
        addNode(harness, "src", nodeStyle({}));
        addNode(harness, "dst", nodeStyle({}));
        const [edge] = addEdges(harness, [["src", "dst"]], {
            ...CURVED,
            arrowHead: { type: "normal", color: "#AAAAAA", size: 1, opacity: 1 },
        });
        const points = drawn(edge);
        // the nodes sit on the x axis, src left of dst: the curve bows to its left, up
        assert.isAbove(points[Math.floor(points.length / 2)].y, 0.5, "the edge bows");
        const direction = edge.arrowCap?.drawnAppearance?.direction;
        assert.isDefined(direction, "the arrow is placed");
        // it comes down into the target along the curve, not along the straight line between centers
        assert.isBelow(direction?.normalize().y ?? 0, -0.2, "the arrow follows the curve");
    });

    it("draws each curved edge of a pair that does not fan as its own curve, bowing to its own left", () => {
        harness = createHarness();
        addNode(harness, "src", nodeStyle({}));
        addNode(harness, "dst", nodeStyle({}));
        const own: EdgeStyleConfig = { line: { ...CURVED.line, fanned: false } };
        const [forth, back] = addEdges(
            harness,
            [
                ["src", "dst"],
                ["dst", "src"],
            ],
            own,
        );
        // The nodes sit on the x axis, src left of dst: going right bows up, coming back bows down (Gephi's lens).
        const middle = (edge: Edge): Vector3 => {
            const points = drawn(edge);
            return points[Math.floor(points.length / 2)];
        };
        assert.isAbove(middle(forth).y, 0.5, "the edge going right bows up, to its left");
        assert.isBelow(middle(back).y, -0.5, "the edge coming back bows down, to its own left");
    });

    it("draws the middle edge of an odd curved bundle straight", () => {
        harness = createHarness();
        addNode(harness, "src", nodeStyle({}));
        addNode(harness, "dst", nodeStyle({}));
        const edges = addEdges(
            harness,
            [
                ["src", "dst"],
                ["src", "dst"],
                ["src", "dst"],
            ],
            CURVED,
        );
        // The nodes sit on the x axis: the middle edge stays on it.
        const bows = edges.map((edge) => Math.max(...drawn(edge).map((p) => Math.abs(p.y))));
        assert.isAbove(bows[0], 0.5);
        assert.isBelow(bows[1], 1e-6);
        assert.isAbove(bows[2], 0.5);
    });

    it("leaves a bundle of straight edges straight, overlapping as the style asks", () => {
        harness = createHarness();
        addNode(harness, "src", nodeStyle({}));
        addNode(harness, "dst", nodeStyle({}));
        const edges = addEdges(harness, [
            ["src", "dst"],
            ["dst", "src"],
            ["src", "dst"],
        ]);
        assert.deepEqual(
            edges.map((edge) => edge.drawnCurve),
            [null, null, null],
        );
    });

    it("keeps a straight sibling on the line and alternates the curved ones either side of it", () => {
        harness = createHarness();
        addNode(harness, "src", nodeStyle({}));
        addNode(harness, "dst", nodeStyle({}));
        const [straight] = addEdges(harness, [["src", "dst"]]);
        const curved = addEdges(
            harness,
            [
                ["src", "dst"],
                ["src", "dst"],
            ],
            CURVED,
        );
        straight.update();
        assert.isNull(straight.drawnCurve, "the straight edge keeps the line");
        const middles = curved.map((edge) => {
            const points = drawn(edge);
            return points[Math.floor(points.length / 2)].y;
        });
        assert.isBelow(middles[0] * middles[1], 0, "the two curved edges bow to opposite sides");
    });

    it("fans an edge out when a second one is added beside it, with no node moving", () => {
        harness = createHarness();
        addNode(harness, "src", nodeStyle({}));
        addNode(harness, "dst", nodeStyle({}));
        const [first] = addEdges(harness, [["src", "dst"]], CURVED);
        // a lone curved edge is drawn with its own bow, not fanned
        const lone = drawn(first).map((p) => p.clone());
        addEdges(harness, [["dst", "src"]], CURVED);
        first.update();
        assert.notDeepEqual(drawn(first), lone, "the first edge regrouped into a bundle of two");
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
