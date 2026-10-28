/**
 * @file Counted-work scaling of the per-element calls on `Node` and `Edge`: painting, render
 * state and visibility, update, style rebuild, mesh transforms, rays and dispose. Each call
 * touches one element, so each is run on one element of a graph of n and of 4n nodes and the
 * elements it visits (Map, Set and Array iterator steps and array scans, see `visitsDuring`) may
 * grow at most 2x, never 4x. Counted, never timed (issue #1643).
 *
 * A call that visits nothing on one element is measured as the loop over every element a caller
 * writes with it, which may grow no faster than the graph: a count of nothing cannot tell constant
 * work from no work at all.
 *
 * A call whose work grows faster than its reach today is an expected failure naming the issue
 * that records it, so the fix turns it green and its methods move into the registry.
 *
 * The render loop is stopped, so no frame runs while a call is counted, and strict state is off,
 * as it is for a consumer (see `data-path-scaling.test.ts`).
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import type { Node } from "../../src/Node";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, type Growth, visitsDuring } from "../helpers/cost";

/** The two graph sizes: big enough that a cost per call that grows with the graph is 4x. */
const SIZES = [100, 400] as const;

/**
 * Wait until every queued operation has run and the pass that derives it has drawn it.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
}

/**
 * Mount a graphty-element with `size` nodes on a path, its render loop stopped and a static
 * layout, with one frame's update drawn so every edge has been placed once.
 * @param size - The node count.
 * @returns The element.
 */
async function mount(size: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    const { graph } = element;
    graph.engine.stopRenderLoop();
    await graph.setLayout("random");
    const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
    await graph.addNodes(ids.map((id) => ({ id })));
    await graph.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
    await settled(element);
    graph.update();
    return element;
}

/**
 * The node in the middle of the path, which has an edge on each side.
 * @param element - The element.
 * @returns The node.
 */
function middleNode(element: Graphty): Node {
    const nodes = [...element.graph.getDataManager().nodes.values()];
    return nodes[Math.floor(nodes.length / 2)];
}

/**
 * The edge in the middle of the path.
 * @param element - The element.
 * @returns The edge.
 */
function middleEdge(element: Graphty): Edge {
    const edges = [...element.graph.getDataManager().edges.values()];
    return edges[Math.floor(edges.length / 2)];
}

/** One call under test. */
interface Case {
    /** Every public method (`Owner.method`, as the cost-coverage registry spells it) the call covers. */
    readonly methods: readonly string[];
    /** `constant` for a call on one element, `linear` for a loop over every element. */
    readonly growth: Growth;
    /**
     * The issue recording that the call does more work than its reach today. Its test is expected
     * to fail until the issue is fixed, and its methods stay out of the registry.
     */
    readonly superlinear?: number;
    /**
     * Build the state the call needs and return the call and a check that it did its work.
     * @param element - A mounted element.
     * @returns The call to count, and the check run after it.
     */
    prepare(element: Graphty): { call: () => unknown; check: () => void };
}

/**
 * Every edge, with the points it is placed between.
 * @param element - The element.
 * @returns The edges.
 */
function everyEdge(element: Graphty): Edge[] {
    return [...element.graph.getDataManager().edges.values()];
}

/**
 * Every node.
 * @param element - The element.
 * @returns The nodes.
 */
function everyNode(element: Graphty): Node[] {
    return [...element.graph.getDataManager().nodes.values()];
}

/**
 * The issue recording that one call still costs the size of the scene: disposing a node's instance
 * takes it out of `scene.meshes` and graph-root's children by Babylon's `indexOf` (#2894 removed
 * the rest).
 */
const ONE_ELEMENT_WALKS_THE_SCENE = 2938;

const CASES: readonly Case[] = [
    {
        methods: ["Node.applySessionPaint"],
        growth: "constant",
        superlinear: ONE_ELEMENT_WALKS_THE_SCENE,
        prepare: (element) => {
            const node = middleNode(element);
            const paint = element.graph.getStylePainter().nodePaint(node.index);
            assert.isNotNull(paint);
            const box = {
                ...paint,
                meshKey: `${paint.meshKey}-box`,
                style: { ...paint.style, shape: { ...paint.style.shape, type: "box" as const } },
            };
            const before = node.mesh;
            return {
                call: () => {
                    node.applySessionPaint(box);
                },
                check: () => {
                    assert.notStrictEqual(node.mesh, before, "the node was drawn from a new mesh");
                },
            };
        },
    },
    {
        methods: ["Node.setRenderState"],
        growth: "constant",
        prepare: (element) => {
            const node = middleNode(element);
            return {
                call: () => {
                    assert.isTrue(node.setRenderState("hidden"));
                },
                check: () => {
                    assert.isFalse(node.mesh.isEnabled(), "the hidden node is not drawn");
                },
            };
        },
    },
    {
        methods: ["Node.update"],
        growth: "linear",
        prepare: (element) => {
            const nodes = everyNode(element);
            for (const node of nodes) {
                node.mesh.position.set(1000, 1000, 1000);
            }

            return {
                call: () => {
                    for (const node of nodes) {
                        node.update();
                    }
                },
                check: () => {
                    for (const node of nodes) {
                        assert.notStrictEqual(node.mesh.position.x, 1000, "the node went back to its layout position");
                    }
                },
            };
        },
    },
    {
        methods: ["Node.updateStyle"],
        growth: "constant",
        prepare: (element) => {
            const node = middleNode(element);
            // What a 2D/3D switch leaves behind: a live node whose mesh is gone.
            node.mesh.dispose();
            return {
                call: () => {
                    node.updateStyle();
                },
                check: () => {
                    assert.isFalse(node.mesh.isDisposed(), "the node's mesh was rebuilt");
                },
            };
        },
    },
    {
        methods: ["Node.dispose"],
        growth: "constant",
        superlinear: ONE_ELEMENT_WALKS_THE_SCENE,
        prepare: (element) => {
            const node = middleNode(element);
            return {
                call: () => {
                    node.dispose();
                },
                check: () => {
                    assert.isTrue(node.isDisposed());
                    assert.isTrue(node.mesh.isDisposed(), "the node's mesh was freed");
                },
            };
        },
    },
    {
        methods: ["Edge.applySessionPaint"],
        growth: "constant",
        prepare: (element) => {
            const edge = middleEdge(element);
            const paint = element.graph.getStylePainter().edgePaint(edge.index);
            assert.isNotNull(paint);
            const red = {
                meshKey: `${paint.meshKey}-red`,
                style: { ...paint.style, line: { ...paint.style.line, color: "red" } },
            };
            const before = edge.mesh;
            return {
                call: () => {
                    edge.applySessionPaint(red);
                },
                check: () => {
                    assert.notStrictEqual(edge.mesh, before, "the edge was drawn from the new paint's line");
                },
            };
        },
    },
    {
        methods: ["Edge.invalidatePositionCache"],
        growth: "linear",
        prepare: (element) => {
            const edges = everyEdge(element);
            return {
                call: () => {
                    for (const edge of edges) {
                        edge.invalidatePositionCache();
                    }
                },
                check: () => {
                    // An invalidated edge is placed again by its next update, although nothing moved.
                    const edge = edges[0];
                    const place = vi.spyOn(edge, "transformArrowCap");
                    edge.update();
                    assert.strictEqual(place.mock.calls.length, 1, "the edge was placed again");
                },
            };
        },
    },
    {
        methods: ["Edge.setRenderVisible"],
        growth: "constant",
        prepare: (element) => {
            const edge = middleEdge(element);
            return {
                call: () => {
                    assert.isTrue(edge.setRenderVisible(false));
                },
                check: () => {
                    assert.isFalse(edge.isRenderVisible());
                },
            };
        },
    },
    {
        methods: ["Edge.transformArrowCap"],
        growth: "linear",
        prepare: (element) => {
            const edges = everyEdge(element);
            const placed: ReturnType<Edge["transformArrowCap"]>[] = [];
            return {
                call: () => {
                    for (const edge of edges) {
                        placed.push(edge.transformArrowCap());
                    }
                },
                check: () => {
                    assert.lengthOf(placed, edges.length);
                    for (const { dstPoint } of placed) {
                        assert.isNotNull(dstPoint, "the line was cut back for the arrowhead");
                    }
                },
            };
        },
    },
    {
        methods: ["Edge.transformEdgeMesh"],
        growth: "linear",
        prepare: (element) => {
            const jobs = everyEdge(element).map(
                (edge) => [edge, edge.srcNode.mesh.position.clone(), edge.dstNode.mesh.position.clone()] as const,
            );
            return {
                call: () => {
                    for (const [edge, src, dst] of jobs) {
                        edge.transformEdgeMesh(src, dst);
                    }
                },
                check: () => {
                    assert.isAbove(jobs.length, 0);
                },
            };
        },
    },
    {
        methods: ["Edge.update"],
        growth: "linear",
        prepare: (element) => {
            const edges = everyEdge(element);
            // Every endpoint moves, so every edge has to be placed again.
            for (const node of everyNode(element)) {
                node.mesh.position.x += 5;
            }

            const before = edges.map((edge) => edge.arrowCap?.position.clone());
            return {
                call: () => {
                    for (const edge of edges) {
                        edge.update();
                    }
                },
                check: () => {
                    edges.forEach((edge, at) => {
                        assert.isFalse(edge.arrowCap?.position.equals(before[at] ?? edge.arrowCap.position), "moved");
                    });
                },
            };
        },
    },
    {
        methods: ["Edge.updateRays"],
        growth: "linear",
        prepare: (element) => {
            const edges = everyEdge(element);
            return {
                // Deprecated and empty: what a 3.x caller still runs once per edge after a move.
                call: () => {
                    for (const _edge of edges) {
                        Edge.updateRays(element.graph);
                    }
                },
                check: () => {
                    assert.isAbove(edges.length, 0);
                },
            };
        },
    },
    {
        methods: ["Edge.updateStyle"],
        growth: "linear",
        prepare: (element) => {
            const edges = everyEdge(element);
            // What a 2D/3D switch does first: every cached mesh, the line batches among them, is gone.
            element.graph.getDataManager().meshCache.clear();
            for (const edge of edges) {
                edge.arrowCap?.dispose();
            }

            return {
                call: () => {
                    for (const edge of edges) {
                        edge.updateStyle();
                    }
                },
                check: () => {
                    for (const edge of edges) {
                        assert.isFalse(edge.arrowCap?.isDisposed() ?? true, "the edge's arrowhead was rebuilt");
                    }
                },
            };
        },
    },
    {
        methods: ["Edge.dispose"],
        growth: "linear",
        prepare: (element) => {
            const edges = everyEdge(element);
            return {
                call: () => {
                    for (const edge of edges) {
                        edge.dispose();
                    }
                },
                check: () => {
                    for (const edge of edges) {
                        assert.isTrue(edge.isDisposed());
                        assert.isNull(edge.arrowCap, "the edge's arrowhead was released");
                    }
                },
            };
        },
    },
];

describe("the per-element calls on Node and Edge do work in proportion to their reach", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const { methods, growth, superlinear, prepare } of CASES) {
        const reach = growth === "linear" ? "no more than linear over every element" : "about the same at any size";
        // A call with an open superlinear issue is expected to fail, so the fix turns it green.
        const test = superlinear === undefined ? it : it.fails;
        const name = `${methods.join(", ")}: ${reach}`;
        test(superlinear === undefined ? name : `${name} (not yet: #${String(superlinear)})`, async () => {
            await assertScalesLinearly(
                async (size) => {
                    const element = await mount(size);
                    try {
                        const { call, check } = prepare(element);
                        const visits = await visitsDuring(call);
                        check();
                        return visits;
                    } finally {
                        element.remove();
                    }
                },
                { sizes: SIZES, growth, counter: `elements visited by ${methods.join(", ")}` },
            );
        });
    }
});
