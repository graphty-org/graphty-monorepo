/**
 * @file The element's data manager bound to a real session, storing each edge with no `Edge` of its
 * own, as the "batched" render path does:
 * what the edge maps answer, how many `Edge`s each read builds, and what undo and redo draw. Also
 * the manager's own doors once it is bound -- each is a step the session can undo -- and its loads
 * from a data source, which a later replacing load or a clear supersedes. The binding is
 * test/helpers/session-bound-data-manager.ts.
 */

import { assert, describe, it } from "vitest";

import type { GraphtyError } from "../../src/errors";
import { dataManagerInternals } from "../../src/managers/DataManager";
import {
    type BoundDataManager,
    drawnEdges,
    drawnNodes,
    sessionBoundDataManager,
} from "../helpers/session-bound-data-manager";

/** A JSON file of two nodes and the edge joining them. */
const PAIR_FILE = JSON.stringify({ nodes: [{ id: "p" }, { id: "q" }], edges: [{ source: "p", target: "q" }] });

/**
 * A data manager storing its edges with no `Edge`, holding the triangle a > b > c > a.
 * @param batched - Whether its rows are drawn under renderPath "batched".
 * @returns The harness.
 */
async function storedTriangle(batched = false): Promise<BoundDataManager> {
    const h = sessionBoundDataManager({ unbuiltEdges: true, batched });
    await h.session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await h.session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
        { src: "c", dst: "a" },
    ]);
    return h;
}

/**
 * How many `Edge`s the manager has built so far.
 * @param h - The harness.
 * @returns The count.
 */
function built(h: BoundDataManager): number {
    return dataManagerInternals.edgesBuilt(h.dataManager);
}

/**
 * Wait until the session holds no pending work: what the manager's own doors dispatched has run
 * and been recorded as a step, so an undo undoes it rather than canceling it.
 * @param h - The harness.
 * @returns Once nothing is pending.
 */
async function committed(h: BoundDataManager): Promise<void> {
    await dataManagerInternals.lastEdit(h.dataManager);
    await new Promise<void>((resolve) => {
        const check = (): boolean => {
            if (h.session.history.pending.length > 0) {
                return false;
            }

            resolve();
            return true;
        };
        if (!check()) {
            const off = h.session.on("history:changed", () => {
                if (check()) {
                    off();
                }
            });
        }
    });
}

/**
 * The code of the error a promise rejects with.
 * @param promise - The promise.
 * @returns The code, or "resolved" when it did not reject.
 */
async function rejection(promise: Promise<unknown>): Promise<string> {
    try {
        await promise;
        return "resolved";
    } catch (error) {
        return (error as GraphtyError).code;
    }
}

describe("edges stored with no Edge, through the session", () => {
    it("counts them with none built, and builds none through a node's removal, its undo and its redo", async () => {
        const h = await storedTriangle();
        assert.strictEqual(h.dataManager.edges.size, 3);
        assert.strictEqual(built(h), 0, "an add builds no Edge");

        await h.session.data.removeNodes(["b"]);
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["a", "c"]);
        assert.strictEqual(h.dataManager.edges.size, 1, "b's two edges went with it");

        await h.session.undo();
        assert.strictEqual(h.dataManager.edges.size, 3);
        await h.session.redo();
        assert.strictEqual(h.dataManager.edges.size, 1);
        assert.strictEqual(built(h), 0, "undo and redo build no Edge");

        assert.deepStrictEqual(drawnEdges(h.dataManager), ["c>a"]);
        assert.strictEqual(built(h), 1, "a walk builds the one left");
    });

    it("keeps an edge moved to a new row by an edge's removal, and builds it there on a read", async () => {
        const h = await storedTriangle();
        const [first] = h.dataManager.edges.keys();

        await h.session.data.removeEdges([first]);
        h.dataManager.getSnapshot();
        await h.session.undo();
        await h.session.redo();
        assert.strictEqual(h.dataManager.edges.size, 2);
        assert.strictEqual(built(h), 0);

        const rows = [...h.dataManager.edges.keys()].map((id) => h.dataManager.getEdge(id)?.index);
        assert.deepStrictEqual(rows.sort(), [0, 1], "each built Edge sits on the row its edge holds now");
        assert.strictEqual(built(h), 2);
    });

    it("finds the edges between two nodes, building only theirs", async () => {
        const h = await storedTriangle();

        const between = h.dataManager.getEdgesBetween("b", "c");
        assert.deepStrictEqual(
            between.map((edge) => `${String(edge.srcId)}>${String(edge.dstId)}`),
            ["b>c"],
        );
        assert.strictEqual(built(h), 1);
        assert.deepStrictEqual(h.dataManager.getEdgesBetween("c", "b"), [], "the pair is ordered");
        assert.deepStrictEqual(h.dataManager.getEdgesBetween("a", "nowhere"), []);
    });

    it("gives the first edge the repeat's record under the last-wins repeat policy", async () => {
        const h = sessionBoundDataManager({ unbuiltEdges: true });
        await h.session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await h.session.data.addEdges([{ src: "a", dst: "b", weight: 1, color: "red" }]);

        h.dataManager.addEdges([{ src: "a", dst: "b", weight: 4, color: "blue" }], { repeated: "last" });
        await committed(h);
        assert.strictEqual(h.dataManager.edges.size, 1, "the repeat folded into the edge");
        assert.strictEqual(built(h), 0);

        const [edge] = h.dataManager.edges.values();
        assert.strictEqual(edge.data.color, "blue");
    });
});

describe("edges stored with no Edge, under the batched render path", () => {
    it("finds both edges of a repeated pair, oldest first, building only theirs", async () => {
        const h = await storedTriangle(true);
        await h.session.data.addEdges([{ src: "a", dst: "b" }]);

        const between = h.dataManager.getEdgesBetween("a", "b");
        assert.strictEqual(between.length, 2, "both a > b edges, oldest first");
        assert.isBelow(Number(between[0].id), Number(between[1].id));
        assert.strictEqual(built(h), 2);
        assert.deepStrictEqual(h.dataManager.getEdgesBetween("a", "nowhere"), []);
        assert.strictEqual(dataManagerInternals.edgesJoining(h.dataManager, 0, 1), 2);
    });
});

describe("the manager's own doors once bound", () => {
    it("makes each add and removal a step the session undoes", async () => {
        const h = sessionBoundDataManager();
        h.dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        h.dataManager.addEdges([
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
        ]);
        await committed(h);
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["a>b", "b>c"]);

        const removed = h.dataManager.removeNodeAndIncidentEdges("b");
        await committed(h);
        assert.isNotNull(removed);
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["a", "c"]);
        assert.deepStrictEqual(drawnEdges(h.dataManager), []);
        assert.isNull(h.dataManager.removeNodeAndIncidentEdges("nowhere"));

        await h.session.undo();
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["a", "b", "c"]);
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["a>b", "b>c"]);

        const [edge] = h.dataManager.getEdgesBetween("a", "b");
        assert.isTrue(h.dataManager.removeEdge(edge.id));
        await committed(h);
        assert.isFalse(h.dataManager.removeEdge(edge.id), "it is gone");
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["b>c"]);
    });

    it("replaces every edge in one step, which one undo takes back", async () => {
        const h = sessionBoundDataManager();
        h.dataManager.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        h.dataManager.addEdges([{ src: "a", dst: "b" }]);
        await committed(h);

        h.dataManager.setEdges([
            { src: "b", dst: "c" },
            { src: "c", dst: "a" },
        ]);
        await committed(h);
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["b>c", "c>a"]);

        await h.session.undo();
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["a>b"]);
    });

    it("clears the graph in one step, which an undo takes back", async () => {
        const h = sessionBoundDataManager();
        h.dataManager.addNodes([{ id: "a" }, { id: "b" }]);
        await committed(h);

        h.dataManager.clear();
        await committed(h);
        assert.deepStrictEqual(drawnNodes(h.dataManager), []);
        assert.deepStrictEqual(h.dataManager.getStats().nodeCount, 0);

        await h.session.undo();
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["a", "b"]);
        assert.deepStrictEqual(h.dataManager.getStats(), { nodeCount: 2, edgeCount: 0, cachedMeshes: 0 });
    });
});

describe("a load from a data source once bound", () => {
    it("draws the file's rows as one undoable step", async () => {
        const h = sessionBoundDataManager();
        await h.dataManager.addDataFromSource("json", { data: PAIR_FILE });
        assert.deepStrictEqual(drawnNodes(h.dataManager), ["p", "q"]);
        assert.deepStrictEqual(drawnEdges(h.dataManager), ["p>q"]);

        await h.session.undo();
        assert.deepStrictEqual(drawnNodes(h.dataManager), []);
    });

    it("rejects with E_SUPERSEDED once a replacing load is asked for after it, and adds nothing", async () => {
        const h = sessionBoundDataManager();
        const generation = h.dataManager.beginLoad(false);
        h.dataManager.beginLoad(true);

        const code = await rejection(h.dataManager.addDataFromSource("json", { data: PAIR_FILE }, { generation }));
        assert.strictEqual(code, "E_SUPERSEDED");
        assert.deepStrictEqual(drawnNodes(h.dataManager), []);
    });

    it("rejects with E_SUPERSEDED when the graph is cleared while it is loading", async () => {
        const h = sessionBoundDataManager();
        const load = h.dataManager.addDataFromSource("json", { data: PAIR_FILE });
        h.dataManager.clear();

        assert.strictEqual(await rejection(load), "E_SUPERSEDED");
        await committed(h);
        assert.deepStrictEqual(drawnNodes(h.dataManager), []);
    });

    it("rejects with the caller's reason when its signal is aborted", async () => {
        const h = sessionBoundDataManager();
        const controller = new AbortController();
        controller.abort(new Error("stop"));

        const outcome = await h.dataManager
            .addDataFromSource("json", { data: PAIR_FILE }, { signal: controller.signal })
            .then(
                () => "resolved",
                (error: unknown) => (error as Error).message,
            );
        assert.strictEqual(outcome, "stop");
        assert.deepStrictEqual(drawnNodes(h.dataManager), []);
    });
});

describe("what the bound manager reports about its graph", () => {
    it("answers the graph-level reads of an empty and a loaded graph", async () => {
        const h = sessionBoundDataManager();
        assert.isUndefined(h.dataManager.graphResults);
        assert.throws(() => {
            h.dataManager.graphResults = {};
        }, /written by a plugin algorithm/);
        assert.deepStrictEqual(h.dataManager.groups, []);
        assert.deepStrictEqual(h.dataManager.rankSets, []);

        await h.session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await h.session.data.addEdges([{ src: "a", dst: "b" }]);
        assert.strictEqual(h.dataManager.nodeIdAtRow(1), "b");
        assert.strictEqual(h.dataManager.nodeAtRow(0)?.id, "a");
        assert.isUndefined(h.dataManager.nodeIdAtRow(99));
        assert.strictEqual(h.dataManager.edgeDirected(0), h.dataManager.directed);
        assert.strictEqual(h.dataManager.seededNodeCount, 0);
        assert.deepStrictEqual(h.dataManager.directionSettledBy, { by: "unsettled", statedBy: null });
        const [node] = h.dataManager.nodes.values();
        assert.strictEqual(h.dataManager.incidentEdgeIds(node).length, 1);
    });
});
