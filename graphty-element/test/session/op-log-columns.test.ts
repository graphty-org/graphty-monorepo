/**
 * @file The op log of a batched add keeps its columns small: no file-id column until an edge
 * carries a file id, and one bit per node for "existed before". Undo and redo still rebuild every
 * row exactly: string ids, file ids that arrive partway through a run, and nodes that existed.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../src/session";
import { createElementSession, dispatcherOf } from "../../src/session/GraphSession";
import { dataDigest } from "../../src/session/project/digest";

const N = 40;
/** Edges read their file id at "id". */
const OPTIONS = { config: { data: { knownFields: { edgeIdPath: "id" } } } };
const NODES = Array.from({ length: N }, (_, at) => ({ id: `n${String(at)}` }));
const EDGES = Array.from({ length: 2 * N }, (_, at) => ({
    source: `n${String(at % N)}`,
    target: `n${String((at * 7 + 1) % N)}`,
    weight: at / 3,
}));

/**
 * The digest of the session's graph slice and snapshot.
 * @param session - The session.
 * @returns The digest.
 */
function digest(session: GraphSession): string {
    return dataDigest(dispatcherOf(session).state.graph, () => session.data.snapshot());
}

/**
 * What the newest history step retains.
 * @param session - The session.
 * @returns Bytes.
 */
function lastBytes(session: GraphSession): number {
    return session.history.steps.at(-1)?.bytes ?? Number.NaN;
}

describe("the op log of a batched add", () => {
    it("keeps no file-id column for edges that carry no file id", async () => {
        const plain = createElementSession(OPTIONS, { batched: () => true });
        const named = createElementSession(OPTIONS, { batched: () => true });
        for (const session of [plain, named]) {
            await session.data.addNodes(NODES);
        }

        // The same records, with the same key lengths: only "id" is read as the file's own id.
        await plain.data.addEdges(EDGES.map((edge, at) => ({ ...edge, ix: `e${String(at)}` })));
        await named.data.addEdges(EDGES.map((edge, at) => ({ ...edge, id: `e${String(at)}` })));
        assert.strictEqual(
            lastBytes(named) - lastBytes(plain),
            4 * EDGES.length,
            "a run with file ids keeps one slot per edge for them, and a run without none",
        );
    });

    it("redoes every edge exactly when file ids start partway through the run", async () => {
        const session = createElementSession(OPTIONS, { batched: () => true });
        await session.data.addNodes(NODES.slice(0, N / 2));
        // Half the nodes already exist: their bits say so, and undo leaves them in place.
        await session.data.addNodes(NODES);
        await session.data.addEdges(
            EDGES.map((edge, at) =>
                at < EDGES.length / 2 ? edge : { ...edge, id: at % 2 === 0 ? `e${String(at)}` : at },
            ),
        );
        const loaded = digest(session);
        const ids = [...session.data.snapshot().ids];

        await session.undo();
        await session.undo();
        assert.strictEqual(session.data.snapshot().nodeCount, N / 2, "the nodes that existed stay");
        await session.redo();
        await session.redo();
        assert.strictEqual(digest(session), loaded);
        assert.deepStrictEqual([...session.data.snapshot().ids], ids);
    });
});
