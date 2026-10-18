/**
 * @file Counted-work scaling of the calls that repaint or dispose ONE node or edge: a node
 * repainted onto a new mesh, a node disposed and an edge repainted with a new line colour. Each
 * touches one element, so each is run on the middle element of a graph of n and of 4n nodes and
 * the elements it visits (Map, Set and Array iterator steps and array scans, see `visitsDuring`)
 * may grow at most 2x, never 4x (issue #2894). Counted, never timed (issue #1643).
 *
 * A call that still does more work than its reach is an expected failure naming the issue that
 * records what is left, so the fix turns it red and it becomes a normal test.
 *
 * The render loop is stopped, so no frame runs while a call is counted, and strict state is off,
 * as it is for a consumer (see `data-path-scaling.test.ts`).
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** The two graph sizes: big enough that a cost per call that grows with the graph is 4x. */
const SIZES = [100, 400] as const;

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
    await operationQueueOf(graph).waitForCompletion();
    await dispatcherOf(graph.getSession()).lane.settled();
    graph.update();
    return element;
}

/**
 * The middle one of a list.
 * @param items - The list.
 * @returns Its middle item.
 */
function middle<T>(items: Iterable<T>): T {
    const all = [...items];
    return all[Math.floor(all.length / 2)];
}

/** One call under test. */
interface Case {
    /** The method, as the cost-coverage registry spells it. */
    readonly method: string;
    /**
     * The issue recording that the call still walks the scene. Its test is expected to fail until
     * that issue is fixed, and its method stays out of the registry.
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
 * Disposing a node's instance takes it out of `scene.meshes` and out of graph-root's children, both
 * by Babylon's `indexOf`: what #2894 could not remove without changing how nodes are drawn.
 */
const INSTANCE_LEAVES_SCENE_LISTS = 2938;

const CASES: readonly Case[] = [
    {
        method: "Node.applySessionPaint",
        superlinear: INSTANCE_LEAVES_SCENE_LISTS,
        prepare: (element) => {
            const node = middle(element.graph.getDataManager().nodes.values());
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
                    assert.isTrue(before.isDisposed(), "the old mesh was freed");
                    assert.notInclude(element.graph.scene.meshes, before, "the old mesh left the scene");
                    assert.isNotNull(node.dragHandler, "the new mesh can be dragged");
                },
            };
        },
    },
    {
        method: "Node.dispose",
        superlinear: INSTANCE_LEAVES_SCENE_LISTS,
        prepare: (element) => {
            const node = middle(element.graph.getDataManager().nodes.values());
            const { mesh } = node;
            return {
                call: () => {
                    node.dispose();
                },
                check: () => {
                    assert.isTrue(node.isDisposed());
                    assert.isTrue(mesh.isDisposed(), "the node's mesh was freed");
                    assert.notInclude(element.graph.scene.meshes, mesh, "the node's mesh left the scene");
                },
            };
        },
    },
    {
        method: "Edge.applySessionPaint",
        prepare: (element) => {
            const edge = middle(element.graph.getDataManager().edges.values());
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
];

describe("repainting or disposing one node or edge costs the same at any graph size", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    for (const { method, superlinear, prepare } of CASES) {
        const name = `${method}: about the same at any size`;
        // A call with an open issue is expected to fail, so the fix turns it red.
        const test = superlinear === undefined ? it : it.fails;
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
                { sizes: SIZES, growth: "constant", counter: `elements visited by ${method}` },
            );
        });
    }
});
