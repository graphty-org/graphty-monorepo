/**
 * @file What one data edit costs on a real element, under the starting rows (Everything, Selected and
 * Hovered, the graphty app's project): the edges it places again and the elements it repaints are
 * those the edit touched, the same at four times the graph (issue #9164). At 100,000 nodes and a
 * million edges every edit walked every edge and repainted every element, more than a minute each.
 *
 * Counted in calls, never timed: `Edge.update` for the edges placed, and `applySessionPaint` (or a
 * batched row's `paintRow`) for the elements repainted, from the edit until its frames are at
 * rest. Runs on both render paths (the forced-batched project runs this file on `"batched"`).
 *
 * Also what the narrowed work must still get right: a removal's renumbering keeps the selection's
 * look on the right node, and a fan of parallel edges follows an edge added to it or taken from it.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { NodeBatches } from "../../src/meshes/NodeBatch";
import { Node } from "../../src/Node";
import { dispatcherOf } from "../../src/session/GraphSession";
import type { ElementSession } from "../../src/session/types";

/** Each node joins the next five, around a ring: ten edges at every node, whatever the size. */
const SPAN = 5;

/**
 * Mount an element over a ring of `size` nodes, each joined to the next {@link SPAN}, placed where
 * their records say, under the starting rows, its paint applied and its frames at rest.
 * @param size - The node count.
 * @returns The element.
 */
async function mount(size: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.layout = "fixed";
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.waitForStableFrame();
    await element.session.config.set({ startingRows: true });
    const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
    const turn = (2 * Math.PI) / size;
    await element.session.data.addNodes(
        ids.map((id, at) => ({
            id,
            group: at % 3,
            position: { x: 50 * Math.cos(at * turn), y: 50 * Math.sin(at * turn), z: 0 },
        })),
    );
    await element.session.data.addEdges(
        ids.flatMap((id, at) =>
            Array.from({ length: SPAN }, (_, step) => ({ source: id, target: ids[(at + step + 1) % size] })),
        ),
    );
    await settle(element);
    return element;
}

/**
 * Let every queued write and pass finish, and the frames that draw them come to rest.
 * @param element - The element.
 */
async function settle(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
    await element.graph.getSession().styles.settled();
    await element.waitForStableFrame();
}

interface Counted {
    /** Edges placed again. */
    readonly placed: number;
    /** Nodes and edges repainted. */
    readonly repainted: number;
}

/**
 * Run one edit and count the edges placed again and the elements repainted until it is drawn.
 * @param element - The element.
 * @param edit - The edit.
 * @returns The counts.
 */
async function countedWork(element: Graphty, edit: () => Promise<unknown>): Promise<Counted> {
    const placed = vi.spyOn(Edge.prototype, "update");
    const nodes = vi.spyOn(Node.prototype, "applySessionPaint");
    const rows = vi.spyOn(NodeBatches.prototype, "paintRow");
    const edges = vi.spyOn(Edge.prototype, "applySessionPaint");
    await edit();
    await settle(element);
    const counted = {
        placed: placed.mock.calls.length,
        repainted:
            nodes.mock.calls.length +
            rows.mock.results.filter(({ value }) => value === true).length +
            edges.mock.calls.length,
    };
    placed.mockRestore();
    nodes.mockRestore();
    rows.mockRestore();
    edges.mockRestore();
    return counted;
}

/**
 * The work of each kind of edit on a graph of `size` nodes.
 * @param size - The node count.
 * @returns The counts, by edit.
 */
async function editsOn(size: number): Promise<Record<string, Counted>> {
    const element = await mount(size);
    const { data } = element.session;
    const firstEdge = (): string => {
        const [record] = data.edgePage({ offset: 3, limit: 1 }).records;
        return record.id;
    };

    const work: Record<string, Counted> = {};
    work.removeEdge = await countedWork(element, () => data.removeEdges([firstEdge()]));
    work.updateNode = await countedWork(element, () => data.updateNodes([{ id: "n7", values: { group: 9 } }]));
    work.updateEdge = await countedWork(element, () => data.updateEdges([{ id: firstEdge(), values: { w: 2 } }]));
    work.addNode = await countedWork(element, () =>
        data.addNodes([{ id: "extra", group: 1, position: { x: 1, y: 2, z: 0 } }]),
    );
    work.addEdge = await countedWork(element, () => data.addEdges([{ source: "extra", target: "n3" }]));
    work.removeNode = await countedWork(element, () => data.removeNodes(["n11"]));
    document.body.replaceChildren();
    return work;
}

describe("one data edit on a large graph", () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it("places and repaints what the edit touched, the same at four times the graph", async () => {
        const small = await editsOn(100);
        const large = await editsOn(400);

        assert.deepEqual(large, small, "an edit's work does not grow with the graph");
        for (const [edit, counted] of Object.entries(large)) {
            assert.isAtMost(counted.placed, 2 * SPAN, `${edit} places only the edges of its own pairs`);
            assert.isAtMost(counted.repainted, 2, `${edit} repaints only the elements it changed`);
        }
    });

    it("places only the pair's fan when many edges are added between the same two nodes", async () => {
        // 400 nodes, 2,000 edges: one walk of every edge is more than the fan's bound below.
        const element = await mount(400);
        const added = Array.from({ length: 40 }, () => ({ source: "n4", target: "n5" }));

        const counted = await countedWork(element, () => element.session.data.addEdges(added));

        // Each of the fan's 41 edges may be placed again on each frame that builds or paints part of it.
        assert.isAtMost(counted.placed, 41 * 41, "placements are bounded by the fan, not the graph");
        assert.isAtMost(counted.repainted, added.length + 2, "the added edges and their ends are repainted");
    });

    it("keeps the selection's look on the selected node after a removal renumbers the rows", async () => {
        const element = await mount(30);
        const session = element.graph.getSession() as ElementSession;
        await session.selection.apply({ nodes: ["n20"] });
        await settle(element);
        const halo = (id: string): unknown =>
            session.paint.styleOf("node", session.snapshot().ids.indexOf(id))["node.haloOpacity"];
        assert.strictEqual(halo("n20"), 1);
        assert.notStrictEqual(halo("n21"), 1);

        await session.data.removeNodes(["n2"]);
        await settle(element);

        assert.strictEqual(halo("n20"), 1, "the selected node still shows the selection");
        assert.notStrictEqual(halo("n19"), 1, "the node that took its old row does not");
        assert.notStrictEqual(halo("n21"), 1, "the node that took its row does not");
    });

    it("fans parallel edges out and back in as one is added to the pair and one taken away", async () => {
        const element = await mount(30);
        const data = element.graph.getDataManager();
        const between = (a: string, b: string): Edge[] =>
            [...data.edges.values()].filter(
                (edge) => (edge.srcId === a && edge.dstId === b) || (edge.srcId === b && edge.dstId === a),
            );
        assert.lengthOf(between("n4", "n5"), 1);

        await element.session.data.addEdges([{ source: "n5", target: "n4" }]);
        await element.session.data.addEdges([{ source: "n4", target: "n5" }]);
        await settle(element);
        const fan = between("n4", "n5");
        assert.lengthOf(fan, 3);
        assert.sameMembers(
            fan.map((edge) => data.drawnBundle(edge).count),
            [3, 3, 3],
        );
        assert.sameMembers(
            fan.map((edge) => data.drawnBundle(edge).rank),
            [0, 1, 2],
        );

        await element.session.data.removeEdges([fan[1].id]);
        await settle(element);
        const left = between("n4", "n5");
        assert.lengthOf(left, 2);
        assert.sameMembers(
            left.map((edge) => data.drawnBundle(edge).rank),
            [0, 1],
        );
        assert.deepEqual(
            left.map((edge) => data.drawnBundle(edge).members.length),
            [2, 2],
        );

        await element.session.data.removeEdges([left[0].id]);
        await settle(element);
        const lone = between("n4", "n5");
        assert.lengthOf(lone, 1);
        assert.strictEqual(data.drawnBundle(lone[0]).count, 1, "the last edge of the pair is drawn alone");

        // Every other pair is answered as a full pass over the edge set answers it.
        for (const edge of data.edges.values()) {
            assert.strictEqual(
                data.drawnBundle(edge).count,
                between(String(edge.srcId), String(edge.dstId)).length,
                `the bundle of ${edge.id}`,
            );
        }
    });
});
