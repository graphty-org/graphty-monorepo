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

import type { GraphSnapshot } from "@graphty/graph-format";
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
 * @param strict - Whether its session checks strict state (test/setup.ts). The check after each pass walks every
 *     edge, which a consumer never runs, so an element whose walks are counted is mounted without it.
 * @returns The element.
 */
async function mount(size: number, strict = true): Promise<Graphty> {
    const flag = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    const wasStrict = flag.__GRAPHTY_STRICT_STATE__;
    flag.__GRAPHTY_STRICT_STATE__ = strict && wasStrict === true;
    const element = document.createElement("graphty-element");
    element.layout = "fixed";
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.waitForStableFrame();
    flag.__GRAPHTY_STRICT_STATE__ = wasStrict;
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
    /** Entries written into any `Map`: an index rebuilt over every edge or node writes one per row. */
    readonly hashed: number;
    /** Built `Edge`s visited by a walk of every built edge: a renumbering told to each edge visits them all. */
    readonly walked: number;
}

/** The ways a `Map` is walked; each is counted on the data manager's map of built edges. */
const WALKS = ["values", "entries", "keys", "forEach", Symbol.iterator] as const;

/**
 * Count every walk of the built edges, by any caller: each entry of the data manager's edge map that a walk visits.
 * @param edgeMap - The data manager's map of built `Edge`s.
 * @returns How many were visited so far, and a function that stops counting.
 */
function countWalks(edgeMap: Map<unknown, unknown>): { visited: () => number; stop: () => void } {
    let visited = 0;
    const kept = WALKS.map((name) => [name, Map.prototype[name]] as const);
    for (const [name, walk] of kept) {
        Object.defineProperty(Map.prototype, name, {
            configurable: true,
            writable: true,
            value: function (this: Map<unknown, unknown>, ...args: unknown[]) {
                if (this !== edgeMap) {
                    return (walk as (...a: unknown[]) => unknown).apply(this, args);
                }

                if (name === "forEach") {
                    const [callback, thisArg] = args as [(...a: unknown[]) => void, unknown];
                    walk.call(this, (...each: unknown[]) => {
                        visited++;
                        callback.apply(thisArg, each);
                    });
                    return undefined;
                }

                const each = (walk as () => Iterator<unknown>).call(this);
                return (function* () {
                    for (let next = each.next(); next.done !== true; next = each.next()) {
                        visited++;
                        yield next.value;
                    }
                })();
            },
        });
    }

    return {
        visited: () => visited,
        stop: () => {
            for (const [name, walk] of kept) {
                Object.defineProperty(Map.prototype, name, { configurable: true, writable: true, value: walk });
            }
        },
    };
}

/**
 * Run one edit and count the edges placed again and the elements repainted until it is drawn.
 * @param element - The element.
 * @param edit - The edit.
 * @returns The counts.
 */
async function countedWork(element: Graphty, edit: () => Promise<unknown>): Promise<Counted> {
    const { edgeMap } = element.graph.getDataManager() as unknown as { edgeMap: Map<unknown, unknown> };
    const walks = countWalks(edgeMap);
    const placed = vi.spyOn(Edge.prototype, "update");
    const nodes = vi.spyOn(Node.prototype, "applySessionPaint");
    const rows = vi.spyOn(NodeBatches.prototype, "paintRow");
    const edges = vi.spyOn(Edge.prototype, "applySessionPaint");
    const { set } = Map.prototype;
    let hashed = 0;
    Map.prototype.set = function (this: Map<unknown, unknown>, key: unknown, value: unknown) {
        hashed++;
        return set.call(this, key, value);
    };
    try {
        await edit();
        await settle(element);
    } finally {
        Map.prototype.set = set;
        walks.stop();
    }

    const counted = {
        placed: placed.mock.calls.length,
        repainted:
            nodes.mock.calls.length +
            rows.mock.results.filter(({ value }) => value === true).length +
            edges.mock.calls.length,
        hashed,
        walked: walks.visited(),
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
    const element = await mount(size, false);
    const { data } = element.session;
    const firstEdge = (): string => {
        const [record] = data.edgePage({ offset: 3, limit: 1 }).records;
        return record.id;
    };

    const work: Record<string, Counted> = {};
    // Under "batched" the store let its builder go after the load, and the first edit brings it back once
    // for the session, as whole columns (test/data/builder-release.test.ts counts the cells it writes).
    work.firstEdit = await countedWork(element, () => data.updateNodes([{ id: "n0", values: { group: 1 } }]));
    work.removeEdge = await countedWork(element, () => data.removeEdges([firstEdge()]));
    work.updateNode = await countedWork(element, () => data.updateNodes([{ id: "n7", values: { group: 9 } }]));
    work.updateEdge = await countedWork(element, () => data.updateEdges([{ id: firstEdge(), values: { w: 2 } }]));
    work.addNode = await countedWork(element, () =>
        data.addNodes([{ id: "extra", group: 1, position: { x: 1, y: 2, z: 0 } }]),
    );
    work.addEdge = await countedWork(element, () => data.addEdges([{ source: "extra", target: "n3" }]));
    // Undo takes the added edge out again, and redo puts it back.
    work.undo = await countedWork(element, () => element.session.undo());
    work.redo = await countedWork(element, () => element.session.redo());
    work.removeNode = await countedWork(element, () => data.removeNodes(["n11"]));
    // Undo puts the node and its edges back between the others, and redo takes them out again.
    work.undoRemoveNode = await countedWork(element, () => element.session.undo());
    work.redoRemoveNode = await countedWork(element, () => element.session.redo());
    work.removeEdgeAgain = await countedWork(element, () => data.removeEdges([firstEdge()]));
    work.undoRemoveEdge = await countedWork(element, () => element.session.undo());
    work.redoRemoveEdge = await countedWork(element, () => element.session.redo());
    // Undo and redo of edits that change only values.
    work.updateNodeAgain = await countedWork(element, () => data.updateNodes([{ id: "n8", values: { group: 7 } }]));
    work.undoUpdateNode = await countedWork(element, () => element.session.undo());
    work.redoUpdateNode = await countedWork(element, () => element.session.redo());
    work.updateEdgeAgain = await countedWork(element, () => data.updateEdges([{ id: firstEdge(), values: { w: 3 } }]));
    work.undoUpdateEdge = await countedWork(element, () => element.session.undo());
    work.redoUpdateEdge = await countedWork(element, () => element.session.redo());
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

        for (const [edit, counted] of Object.entries(large)) {
            const before = small[edit];
            assert.strictEqual(
                counted.repainted,
                before.repainted,
                `${edit} repaints the same at four times the graph`,
            );
            assert.strictEqual(counted.placed, before.placed, `${edit} places the same at four times the graph`);
            // Putting a node back brings back its node and its ten edges, each placed on the frames that build it;
            // an undo or redo also selects what it touched, which places that node's edges again.
            const restores = /^(undo|redo)Remove/.test(edit);
            assert.isAtMost(
                counted.placed,
                (/^(undo|redo)/.test(edit) ? 6 : 2) * SPAN,
                `${edit} places only the edges of its own pairs`,
            );
            assert.isAtMost(
                counted.repainted,
                restores ? 3 * SPAN : 2,
                `${edit} repaints only the elements it changed`,
            );
            assert.strictEqual(counted.walked, 0, `${edit} walks no built edge`);
            if (/remove/i.test(edit) || edit === "firstEdit") {
                // A removal, its undo and its redo renumber the rows after it, and the first edit under "batched"
                // brings the builder back: the builder's id map, and under "batched" the rows waiting for a `Node`
                // and their ids, hold an entry per node -- never one per edge (1,500 more).
                assert.isAtMost(counted.hashed - before.hashed, 3 * (400 - 100), `${edit} indexes no edge again`);
            } else {
                assert.strictEqual(counted.hashed, before.hashed, `${edit} indexes nothing again`);
            }
        }
    });

    it("places and repaints what the edit touched past the 10,000-node detail threshold too", async () => {
        // Past `largeGraphThreshold` a node is drawn as the large graph draws it: putting a removed node back
        // there built its shaded drawing, whose new size walked and placed every edge of the graph.
        const work = await editsOn(12_000);
        for (const [edit, counted] of Object.entries(work)) {
            assert.isAtMost(
                counted.placed,
                (/^(undo|redo)/.test(edit) ? 6 : 2) * SPAN,
                `${edit} places only the edges of its own pairs`,
            );
            assert.isAtMost(
                counted.repainted,
                /^(undo|redo)Remove/.test(edit) ? 3 * SPAN : 2,
                `${edit} repaints only what it changed`,
            );
            assert.strictEqual(counted.walked, 0, `${edit} walks no built edge`);
        }
    });

    it("places only the pair's fan when many edges are added between the same two nodes", async () => {
        // 400 nodes, 2,000 edges: one walk of every edge is more than the fan's bound below.
        const element = await mount(400);
        const added = Array.from({ length: 40 }, () => ({ source: "n4", target: "n5" }));

        const counted = await countedWork(element, () => element.session.data.addEdges(added));

        // Each of the fan's 41 edges is placed once a frame at most, on the frames that build and paint it: a few
        // hundred placements, against 2,000 for one walk of every edge.
        assert.isAtMost(counted.placed, 1000, "placements are bounded by the fan, not the graph");
        assert.isAtMost(counted.repainted, added.length + 2, "the added edges and their ends are repainted");
    });

    it("sorts no edge again for an edit that changes only values", async () => {
        const element = await mount(100);
        const { data } = element.session;
        // The graph as the element froze it, not the session's copy with its own coordinate columns.
        const frozen = (): GraphSnapshot => element.graph.getDataManager().getSnapshot();
        // Under "batched" the first edit brings back the builder the load let go (sorted once there).
        await data.updateNodes([{ id: "n0", values: { group: 1 } }]);
        await settle(element);
        const before = frozen();
        await data.updateNodes([{ id: "n7", values: { group: 9 } }]);
        await data.updateEdges([{ id: data.edgePage({ offset: 3, limit: 1 }).records[0].id, values: { w: 2 } }]);
        await settle(element);
        const after = frozen();
        assert.notStrictEqual(after, before, "the values are in a new snapshot");
        assert.strictEqual(after.colIdx.buffer, before.colIdx.buffer, "whose edge structure is the one already sorted");

        await data.addEdges([{ source: "n1", target: "n50" }]);
        await settle(element);
        assert.notStrictEqual(frozen().colIdx.buffer, before.colIdx.buffer, "a new edge is sorted in");
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
