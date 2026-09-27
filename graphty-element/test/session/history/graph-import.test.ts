/**
 * @file Loading data as undoable steps, on a session with no renderer: an import through a data
 * source, a batch of data changes, and the baseline a session starts from.
 *
 * An import is one step whether it replaces the graph or adds to it; undo takes back every row it
 * wrote and the report it left, and never reads the source again. A failed or cancelled import
 * records nothing. Two imports under one coalesce key dispatched in one tick are one load. A batch
 * is one step and rolls back whole. And with the baseline window open, what was declared at
 * construction, and every setting made before the graph first changes, is where history starts.
 * The renderer half is `test/browser/history-graph-import.test.ts`.
 */

import { assert, describe, it } from "vitest";

import type { ImportReport } from "../../../src/data/report";
import { dispatcherOf } from "../../../src/session/GraphSession";
import { stateDigest } from "../../../src/session/project/digest";
import type { GraphSession } from "../../../src/session/types";
import { makeSession } from "../helpers";
import { fixtureSession } from "./fixture-session";

/** A small graph document the JSON data source reads. */
const DOCUMENT = JSON.stringify({
    nodes: [{ id: "a", position: [1, 2, 3] }, { id: "b" }],
    edges: [{ src: "a", dst: "b", value: 4 }],
});

/**
 * A document that fails part way: its node is written, then no edge names its endpoints in any
 * spelling the element reads, which is refused.
 */
const FAILING = JSON.stringify({ nodes: [{ id: "q" }], edges: [{ x: "q", y: "q" }] });

/** The node ids in row order. */
function ids(session: GraphSession): unknown[] {
    return session.snapshot().ids.toArray();
}

/**
 * Every column the snapshot's tables carry, by table.
 * @param session - The session.
 * @returns The names, sorted per table.
 */
function columns(session: GraphSession): Record<string, string[]> {
    const snapshot = session.snapshot();
    return {
        nodes: [...snapshot.nodes.names()].sort(),
        edges: [...snapshot.edges.names()].sort(),
        graph: [...snapshot.graph.names()].sort(),
    };
}

/**
 * The state digest, rows included.
 * @param session - The session.
 * @returns The digest.
 */
function digest(session: GraphSession): string {
    return stateDigest(dispatcherOf(session).state, { snapshot: session.snapshot() });
}

describe("data.import", () => {
    it("replacing the graph is one step, and undo brings back the rows and the column set", async () => {
        const session = await fixtureSession();
        const before = { ids: ids(session), columns: columns(session), digest: digest(session) };

        await session.data.import({ type: "json", config: { data: DOCUMENT } });

        assert.deepEqual(ids(session), ["a", "b"]);
        assert.lengthOf(session.history.steps, 1);

        await session.undo();
        assert.deepEqual(ids(session), before.ids);
        assert.deepEqual(columns(session), before.columns, "the store's column set is the original's");
        assert.strictEqual(digest(session), before.digest);

        await session.redo();
        assert.deepEqual(ids(session), ["a", "b"]);
        session.dispose();
    });

    it("undoing a merge import and an add restores the report each one replaced", async () => {
        const session = await fixtureSession();
        const first = session.data.lastImport();

        await session.data.import({ type: "json", config: { data: DOCUMENT } }, { mode: "merge" });
        const imported = session.data.lastImport() as ImportReport;
        assert.strictEqual(imported.format, "json");
        assert.deepEqual(ids(session), ["n1", "n2", "n3", "a", "b"], "merged into the graph");

        await session.data.addEdges([{ src: "n3", dst: "a" }]);
        assert.strictEqual(session.data.lastImport()?.format, "records");

        await session.undo();
        assert.strictEqual(session.data.lastImport(), imported, "undoing the add: the import's report");
        await session.undo();
        assert.strictEqual(session.data.lastImport(), first, "undoing the import: the report before it");
        session.dispose();
    });

    it("keeps where the rows came from, without the text they were read from", async () => {
        const session = await fixtureSession();
        await session.data.import({ type: "json", config: { data: DOCUMENT, nodeIdPath: "id" } });

        assert.deepEqual(dispatcherOf(session).state.graph.values.get("source"), {
            type: "json",
            config: { nodeIdPath: "id" },
        });
        session.dispose();
    });

    it("a failed import records nothing and leaves the graph as it was, the rows it wrote gone", async () => {
        const session = await fixtureSession();
        const before = digest(session);

        const failed = await session.data.import({ type: "json", config: { data: FAILING } }).then(
            () => false,
            () => true,
        );

        assert.isTrue(failed);
        assert.lengthOf(session.history.steps, 0);
        assert.strictEqual(digest(session), before);
        session.dispose();
    });

    it("undo while an import waits its turn cancels it, and nothing is recorded", async () => {
        const session = await fixtureSession();
        const load = session.data.import({ type: "json", config: { data: DOCUMENT } });
        const outcome = await session.undo();

        assert.strictEqual(outcome.kind, "cancelled");
        assert.isTrue(await load.then(() => false, () => true), "the import settles as cancelled");
        assert.deepEqual(ids(session), ["n1", "n2", "n3"]);
        assert.lengthOf(session.history.steps, 0);
        session.dispose();
    });

    it("two imports under one coalesce key in one tick are one load and one step", async () => {
        const session = await fixtureSession();
        const dispatcher = dispatcherOf(session);
        const other = JSON.stringify({ nodes: [{ id: "z" }], edges: [] });

        const first = dispatcher.dispatch({ op: "data.import", source: { type: "json" }, coalesce: "pair" });
        const second = dispatcher.dispatch({
            op: "data.import",
            source: { type: "json", config: { data: other } },
            coalesce: "pair",
        });
        await Promise.all([first, second]);

        assert.lengthOf(session.history.steps, 1);
        assert.deepEqual(ids(session), ["z"]);
        session.dispose();
    });

    it("chooses the recommended layout for what it loaded, in its own step", async () => {
        const session = await fixtureSession();
        await session.layout.set("spiral");
        const before = digest(session);
        const steps = session.history.steps.length;

        await session.execute({
            op: "data.import",
            source: { type: "json", config: { data: DOCUMENT } },
            layout: "recommended",
        });
        // The choice is made once the rows are in, and joins the import's step.
        for (let wait = 0; wait < 100 && session.history.pending.length > 0; wait++) {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }

        assert.lengthOf(session.history.pending, 0);
        assert.lengthOf(session.history.steps, steps + 1, "the import and its layout are one step");
        assert.strictEqual(session.layout.id, "force", "two nodes, one edge, one of them unplaced: force");

        await session.undo();
        assert.strictEqual(session.layout.id, "spiral", "one undo leaves the previous layout");
        assert.strictEqual(digest(session), before);
        session.dispose();
    });
});

describe("batch", () => {
    it("rolls back whole when a member fails, recording nothing", async () => {
        const session = await fixtureSession();
        const before = digest(session);

        const failed = await session
            .execute({
                op: "batch",
                steps: [
                    { op: "data.apply", mutation: { kind: "add-nodes", records: [{ id: "n4" }] } },
                    {
                        op: "data.apply",
                        mutation: { kind: "add-edges", records: [{ src: "n1", dst: "n2" }], repeated: "error" },
                    },
                ],
            })
            .then(
                () => false,
                () => true,
            );

        assert.isTrue(failed);
        assert.lengthOf(session.history.steps, 0);
        assert.strictEqual(digest(session), before, "the node the first member added is gone again");
        session.dispose();
    });
});

describe("the baseline window", () => {
    /**
     * A session whose baseline window is open, as a renderer's is.
     * @returns The session.
     */
    function windowed(): GraphSession {
        return makeSession({ internals: { baselineWindow: true } }).session;
    }

    it("an import declared at construction is the baseline: nothing to undo after it", async () => {
        const session = windowed();
        await session.config.set({ data: { knownFields: { nodeLabelPath: "name" } } });
        await dispatcherOf(session).dispatch({
            op: "data.import",
            source: { type: "json", config: { data: DOCUMENT } },
            setup: true,
        });

        assert.deepEqual(ids(session), ["a", "b"]);
        assert.isFalse(session.canUndo);

        await session.config.set({ data: { knownFields: { nodeLabelPath: "label" } } });
        assert.isTrue(session.canUndo, "a setting after the load is a step");
        session.dispose();
    });

    it("the first data change is the first step, and settings before it are the baseline", async () => {
        const session = windowed();
        await session.config.set({ data: { knownFields: { nodeLabelPath: "name" } } });
        assert.isFalse(session.canUndo, "a setting before any data is baseline");

        await session.data.addNodes([{ id: "n1" }]);
        assert.lengthOf(session.history.steps, 1);

        await session.undo();
        assert.deepEqual(ids(session), []);
        assert.deepEqual(session.config.data.knownFields.nodeLabelPath, "name", "undo stops at the baseline");
        session.dispose();
    });

    it("a first import that fails leaves no step, and closes the window", async () => {
        const session = windowed();
        const failed = await dispatcherOf(session)
            .dispatch({ op: "data.import", source: { type: "json", config: { data: FAILING } }, setup: true })
            .then(
                () => false,
                () => true,
            );

        assert.isTrue(failed);
        assert.isFalse(session.canUndo);

        await session.styles.add({
            name: "after",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        assert.isTrue(session.canUndo, "a style edit after the failed load is a step");
        session.dispose();
    });

    it("declared data arriving after a step is a step", async () => {
        const session = windowed();
        await session.data.addNodes([{ id: "n1" }]);
        await dispatcherOf(session).dispatch({
            op: "batch",
            setup: true,
            steps: [{ op: "data.apply", mutation: { kind: "add-nodes", records: [{ id: "n2" }] } }],
        });

        assert.lengthOf(session.history.steps, 2);
        session.dispose();
    });
});
