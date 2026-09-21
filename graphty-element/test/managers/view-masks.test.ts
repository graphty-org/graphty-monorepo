/**
 * The renderer honouring the session's two masks.
 *
 * What is under test is the pass that brings the meshes into line with the selection mask and the
 * visibility mask: which render state each element lands in, that `showContext` turns a hidden
 * node into a faint one rather than into nothing, and -- the part that decides whether a filter
 * over a large graph is affordable -- that the pass is a DELTA: an element whose state did not
 * move is never written to, and a pass over unchanged masks writes nothing at all.
 *
 * The meshes themselves need a browser; these fakes stand in for `Node` and `Edge` and count what
 * the pass asks of them.
 */

import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, beforeEach, describe, it } from "vitest";

import type { EdgeId, NodeId } from "../../src/catalog/types";
import type { DataManager } from "../../src/managers/DataManager";
import { UpdateManager, type ViewMaskSource } from "../../src/managers/UpdateManager";
import type { NodeRenderState } from "../../src/Node";
import { ElementMask, type MaskIdSpace } from "../../src/session/scope/index";

/** A node as the mask pass sees it, counting every write it is handed. */
interface FakeNode {
    index: number;
    state: NodeRenderState;
    selected: boolean;
    stateWrites: number;
    selectionWrites: number;
    getRenderState(): NodeRenderState;
    setRenderState(next: NodeRenderState): boolean;
    setSelected(next: boolean): boolean;
}

/** An edge as the mask pass sees it, on the same terms. */
interface FakeEdge {
    index: number;
    visible: boolean;
    selected: boolean;
    visibilityWrites: number;
    selectionWrites: number;
    isRenderVisible(): boolean;
    setRenderVisible(next: boolean): boolean;
    setSelected(next: boolean): boolean;
}

/**
 * Build a node that behaves like the real one: a write that changes nothing changes nothing.
 * @param index - The dense node index.
 * @returns The fake.
 */
function fakeNode(index: number): FakeNode {
    const node: FakeNode = {
        index,
        state: "visible",
        selected: false,
        stateWrites: 0,
        selectionWrites: 0,
        getRenderState: () => node.state,
        setRenderState: (next) => {
            if (node.state === next) {
                return false;
            }

            node.state = next;
            node.stateWrites += 1;

            return true;
        },
        setSelected: (next) => {
            if (node.selected === next) {
                return false;
            }

            node.selected = next;
            node.selectionWrites += 1;

            return true;
        },
    };

    return node;
}

/**
 * Build an edge that behaves like the real one.
 * @param index - The dense edge index.
 * @returns The fake.
 */
function fakeEdge(index: number): FakeEdge {
    const edge: FakeEdge = {
        index,
        visible: true,
        selected: false,
        visibilityWrites: 0,
        selectionWrites: 0,
        isRenderVisible: () => edge.visible,
        setRenderVisible: (next) => {
            if (edge.visible === next) {
                return false;
            }

            edge.visible = next;
            edge.visibilityWrites += 1;

            return true;
        },
        setSelected: (next) => {
            if (edge.selected === next) {
                return false;
            }

            edge.selected = next;
            edge.selectionWrites += 1;

            return true;
        },
    };

    return edge;
}

/**
 * An identity space over a fixed list of ids.
 * @param ids - The ids, in index order.
 * @returns The space.
 */
function spaceOf<TId>(ids: readonly TId[]): MaskIdSpace<TId> {
    return {
        indexOf: (id) => ids.indexOf(id),
        idOf: (index) => ids[index],
    };
}

/**
 * A mask over `count` rows, with everything in the set.
 * @param count - How many rows.
 * @param ids - The ids the rows carry.
 * @returns The mask.
 */
function fullMask<TId>(count: number, ids: readonly TId[]): ElementMask<TId> {
    const mask = new ElementMask<TId>(() => spaceOf(ids), Math.max(1, count));
    mask.grow(count);
    mask.fill();

    return mask;
}

describe("UpdateManager view masks", () => {
    let nodes: Map<string, FakeNode>;
    let edges: Map<string, FakeEdge>;
    let manager: UpdateManager;

    /**
     * Build an UpdateManager over the fakes.
     *
     * Only the data manager is reached by the mask pass, so everything else is left unbuilt: a
     * scene, a camera and a stats collector would all need a browser and none of them is asked a
     * question here.
     * @returns The manager.
     */
    function buildManager(): UpdateManager {
        const dataManager = { nodes, edges } as unknown as DataManager;

        return new UpdateManager(
            null as never,
            null as never,
            null as never,
            dataManager,
            null as never,
            null as never,
        );
    }

    /**
     * A mask source over the node and edge masks given.
     * @param nodeMask - The node mask.
     * @param edgeMask - The edge mask.
     * @returns The source.
     */
    function sourceOf(nodeMask: ElementMask<NodeId>, edgeMask: ElementMask<EdgeId>): ViewMaskSource {
        return { nodes: () => nodeMask, edges: () => edgeMask };
    }

    beforeEach(() => {
        nodes = new Map([
            ["a", fakeNode(0)],
            ["b", fakeNode(1)],
            ["c", fakeNode(2)],
        ]);
        edges = new Map([
            ["a:b", fakeEdge(0)],
            ["b:c", fakeEdge(1)],
        ]);
        manager = buildManager();
    });

    it("draws everything and highlights nothing when no masks are bound", () => {
        manager.syncViewMasks();

        for (const node of nodes.values()) {
            assert.equal(node.state, "visible");
            assert.isFalse(node.selected);
            assert.equal(node.stateWrites, 0);
        }
    });

    it("hides the nodes the visibility mask leaves out", () => {
        const nodeMask = fullMask<NodeId>(3, ["a", "b", "c"]);
        const edgeMask = fullMask<EdgeId>(2, ["a:b", "b:c"]);
        nodeMask.delete(1);
        edgeMask.delete(0);

        manager.bindViewMasks({ visibility: sourceOf(nodeMask, edgeMask) });
        manager.syncViewMasks();

        assert.equal(nodes.get("a")?.state, "visible");
        assert.equal(nodes.get("b")?.state, "hidden");
        assert.equal(nodes.get("c")?.state, "visible");
        assert.isFalse(edges.get("a:b")?.visible);
        assert.isTrue(edges.get("b:c")?.visible);
    });

    it("draws a hidden node faintly instead of removing it when showContext is on", () => {
        const nodeMask = fullMask<NodeId>(3, ["a", "b", "c"]);
        const edgeMask = fullMask<EdgeId>(2, ["a:b", "b:c"]);
        nodeMask.delete(1);
        let showContext = false;

        manager.bindViewMasks({ visibility: sourceOf(nodeMask, edgeMask), showContext: () => showContext });
        manager.syncViewMasks();
        assert.equal(nodes.get("b")?.state, "hidden");

        showContext = true;
        manager.syncViewMasks();
        assert.equal(nodes.get("b")?.state, "context");
        // Still hidden as far as the data scope is concerned: a context node is drawn, not visible.
        assert.isFalse(nodeMask.has(1));
    });

    it("highlights exactly what the selection mask holds", () => {
        const nodeMask = fullMask<NodeId>(3, ["a", "b", "c"]);
        const edgeMask = fullMask<EdgeId>(2, ["a:b", "b:c"]);
        nodeMask.clear();
        edgeMask.clear();
        nodeMask.add(2);
        edgeMask.add(1);

        manager.bindViewMasks({ selection: sourceOf(nodeMask, edgeMask) });
        manager.syncViewMasks();

        assert.isFalse(nodes.get("a")?.selected);
        assert.isFalse(nodes.get("b")?.selected);
        assert.isTrue(nodes.get("c")?.selected);
        assert.isFalse(edges.get("a:b")?.selected);
        assert.isTrue(edges.get("b:c")?.selected);
    });

    it("writes nothing on a second pass over unchanged masks", () => {
        const nodeMask = fullMask<NodeId>(3, ["a", "b", "c"]);
        const edgeMask = fullMask<EdgeId>(2, ["a:b", "b:c"]);
        nodeMask.delete(0);

        manager.bindViewMasks({ visibility: sourceOf(nodeMask, edgeMask) });
        manager.syncViewMasks();
        const afterFirst = nodes.get("a")?.stateWrites;

        manager.syncViewMasks();
        manager.syncViewMasks();

        assert.equal(nodes.get("a")?.stateWrites, afterFirst);
    });

    it("touches only the elements whose state moved", () => {
        const nodeMask = fullMask<NodeId>(3, ["a", "b", "c"]);
        const edgeMask = fullMask<EdgeId>(2, ["a:b", "b:c"]);

        manager.bindViewMasks({ visibility: sourceOf(nodeMask, edgeMask) });
        manager.syncViewMasks();

        nodeMask.delete(2);
        manager.syncViewMasks();

        assert.equal(nodes.get("a")?.stateWrites, 0);
        assert.equal(nodes.get("b")?.stateWrites, 0);
        assert.equal(nodes.get("c")?.stateWrites, 1);
    });

    it("shows an element again without asking for a layout, and keeps its index", () => {
        const nodeMask = fullMask<NodeId>(3, ["a", "b", "c"]);
        const edgeMask = fullMask<EdgeId>(2, ["a:b", "b:c"]);

        manager.bindViewMasks({ visibility: sourceOf(nodeMask, edgeMask) });
        nodeMask.delete(1);
        manager.syncViewMasks();
        assert.equal(nodes.get("b")?.state, "hidden");

        nodeMask.add(1);
        manager.syncViewMasks();

        assert.equal(nodes.get("b")?.state, "visible");
        assert.equal(nodes.get("b")?.index, 1);
    });

    it("draws a record the store has no row for, and never selects it", () => {
        nodes.set("orphan", fakeNode(INVALID_INDEX));
        manager = buildManager();

        const nodeMask = fullMask<NodeId>(3, ["a", "b", "c"]);
        const edgeMask = fullMask<EdgeId>(2, ["a:b", "b:c"]);
        nodeMask.clear();

        manager.bindViewMasks({ selection: sourceOf(nodeMask, edgeMask), visibility: sourceOf(nodeMask, edgeMask) });
        manager.syncViewMasks();

        assert.equal(nodes.get("orphan")?.state, "visible");
        assert.isFalse(nodes.get("orphan")?.selected);
        assert.equal(nodes.get("a")?.state, "hidden");
    });

    it("rewrites everything after the render objects are invalidated", () => {
        const nodeMask = fullMask<NodeId>(3, ["a", "b", "c"]);
        const edgeMask = fullMask<EdgeId>(2, ["a:b", "b:c"]);
        nodeMask.delete(0);

        manager.bindViewMasks({ visibility: sourceOf(nodeMask, edgeMask) });
        manager.syncViewMasks();
        assert.equal(nodes.get("a")?.state, "hidden");

        // A dataset boundary: the render objects are new and know nothing of the mask.
        nodes.set("a", fakeNode(0));
        manager.invalidateViewMasks();
        manager.syncViewMasks();

        assert.equal(nodes.get("a")?.state, "hidden");
        assert.equal(nodes.get("a")?.stateWrites, 1);
    });

    it("unbinding draws the whole graph again", () => {
        const nodeMask = fullMask<NodeId>(3, ["a", "b", "c"]);
        const edgeMask = fullMask<EdgeId>(2, ["a:b", "b:c"]);
        nodeMask.clear();

        manager.bindViewMasks({ selection: sourceOf(nodeMask, edgeMask), visibility: sourceOf(nodeMask, edgeMask) });
        manager.syncViewMasks();
        assert.equal(nodes.get("a")?.state, "hidden");

        manager.bindViewMasks(null);
        manager.syncViewMasks();

        // Nothing says anything about the masks any more, so nothing is hidden and nothing is
        // highlighted -- not "whatever the last filter said, for ever".
        for (const node of nodes.values()) {
            assert.equal(node.state, "visible");
            assert.isFalse(node.selected);
        }

        for (const edge of edges.values()) {
            assert.isTrue(edge.visible);
        }
    });
});
