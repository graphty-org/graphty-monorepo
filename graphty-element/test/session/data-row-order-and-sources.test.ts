/**
 * @file session.data corners the other data tests leave out: the records the element's `nodeData`
 * and `edgeData` read, in row order; the undirected view of the current graph and of an older
 * snapshot; columns loaded as one source under the source-steps experiment; and a reload or a
 * replace that loses its source to a removal asked for first. Every case runs on a real headless
 * session.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../src/session";
import { recordsInRowOrder } from "../../src/session/data";
import { dispatcherOf } from "../../src/session/GraphSession";

/**
 * The records the element reads for `nodeData` or `edgeData`, read the way it reads them.
 * @param session - The session.
 * @param target - Nodes or edges.
 * @returns The records.
 */
function rowRecords(session: GraphSession, target: "node" | "edge"): readonly Record<string, unknown>[] {
    return recordsInRowOrder(dispatcherOf(session).state.graph, session.snapshot(), target);
}

/**
 * The refusal a promise settles with, failing the test when it resolves.
 * @param run - The call.
 * @returns The error's code and details.
 */
async function refusal(run: Promise<unknown>): Promise<{ code?: string; details?: Record<string, unknown> }> {
    return run.then(
        () => assert.fail("expected a refusal"),
        (error: unknown) => error as { code?: string; details?: Record<string, unknown> },
    );
}

describe("the records the element reads, in row order", () => {
    it("lists nodes and edges in the snapshot's row order, and follows a removal", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "c", name: "Cy" },
            { id: "a", name: "Al" },
            { id: "b", name: "Bo" },
        ]);
        await session.data.addEdges([
            { source: "a", target: "b", kind: "first" },
            { source: "b", target: "c", kind: "second" },
        ]);

        const order = [...session.snapshot().ids.toArray()];
        assert.deepStrictEqual(
            rowRecords(session, "node").map((record) => record.id),
            order,
            "one record per row, in row order",
        );
        assert.deepStrictEqual(
            rowRecords(session, "edge").map((record) => record.kind),
            ["first", "second"],
        );
        assert.isTrue(Object.isFrozen(rowRecords(session, "node")));

        await session.data.removeNodes(["a"]);
        assert.deepStrictEqual(
            rowRecords(session, "node").map((record) => record.id),
            [...session.snapshot().ids.toArray()],
        );
        assert.notInclude(
            rowRecords(session, "node").map((record) => record.id),
            "a",
        );
        assert.deepStrictEqual(
            rowRecords(session, "edge").map((record) => record.kind),
            ["second"],
            "the edge that touched the removed node went with it",
        );
        session.dispose();
    });

    it("reads nothing for an empty graph", () => {
        const session = createGraphSession();
        assert.deepStrictEqual(rowRecords(session, "node"), []);
        assert.deepStrictEqual(rowRecords(session, "edge"), []);
        session.dispose();
    });
});

describe("session.data.undirected", () => {
    it("derives the undirected view of the current graph, and of a snapshot taken earlier", async () => {
        const session = createGraphSession();
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "b", target: "a" },
            { source: "b", target: "c" },
        ]);
        const before = session.snapshot();
        const now = session.data.undirected();
        assert.isFalse(now.snapshot.directed);
        assert.strictEqual(now.snapshot.nodeCount, 3);
        assert.strictEqual(now.snapshot.edgeCount, 2, "a-b and b-a are one undirected edge");

        await session.data.addEdges([{ source: "c", target: "d" }]);
        assert.strictEqual(session.data.undirected().snapshot.edgeCount, 3);
        const earlier = session.data.undirected(before);
        assert.strictEqual(earlier.snapshot.nodeCount, 3, "the older snapshot's view, not the current one");
        assert.strictEqual(earlier.snapshot.edgeCount, 2);
        session.dispose();
    });

    it("refuses after the session is disposed", () => {
        const session = createGraphSession();
        session.dispose();
        let code: unknown;
        try {
            session.data.undirected();
        } catch (error) {
            ({ code } = error as { code?: unknown });
        }
        assert.strictEqual(code, "E_DISPOSED");
    });
});

describe("session.data.importColumns under source-steps", () => {
    it("loads the columns as one source holding every row", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.importColumns({
            sources: new Uint32Array([0, 1]),
            targets: new Uint32Array([1, 2]),
            nodeCount: 3,
            ids: ["a", "b", "c"],
        });

        assert.strictEqual(session.status.counts.nodes, 3);
        assert.strictEqual(session.status.counts.edges, 2);
        const sources = session.data.sources();
        assert.strictEqual(sources.length, 1, "one source, not a load per column");
        assert.deepStrictEqual(
            session.data
                .nodes()
                .map((node) => node.id)
                .sort(),
            ["a", "b", "c"],
        );
        session.dispose();
    });
});

describe("a reload or a replace that loses its source to a removal asked for first", () => {
    for (const door of ["reloadSource", "replaceSource"] as const) {
        it(`${door} reports the key unknown once the removal has run`, async () => {
            const session = createGraphSession({ features: ["source-steps"] });
            await session.data.import({ type: "csv", config: { data: "id\np1\np2\n" }, name: "people.csv" });
            const [{ key }] = session.data.sources();

            const removing = session.data.removeSource(key);
            const again =
                door === "reloadSource"
                    ? session.data.reloadSource(key, {})
                    : session.data.replaceSource(key, {
                          type: "csv",
                          config: { data: "id\np1\np3\n" },
                          name: "people.csv",
                      });
            await removing;
            const { code, details } = await refusal(again);

            assert.strictEqual(code, "E_SOURCE_UNKNOWN");
            assert.strictEqual(details?.key, key);
            assert.deepStrictEqual(details?.known, []);
            assert.strictEqual(session.status.counts.nodes, 0, "the removal stood, and nothing was read again");
            session.dispose();
        });
    }
});
