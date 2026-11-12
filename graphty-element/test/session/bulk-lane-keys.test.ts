/**
 * @file Bulk lane keys (design/rendering/cosmos-gap.md, G4). Under the "batched" render path a
 * forward `addEdges` marks the `graph` slice dirty with one range key (`e+:<first edge id>:<count>`)
 * instead of one `e:<id>` key per edge, so the lane's dirty set after a load holds a number of keys
 * that does not grow with the edge count. Under "objects", the default, every edge is touched as
 * before. Either way the graph, its digest and its undo, redo and restore are the same.
 */

import { assert, describe, it } from "vitest";

import type { EdgeRecordInput, GraphSession } from "../../src/session";
import { createElementSession, dispatcherOf } from "../../src/session/GraphSession";
import { dataDigest } from "../../src/session/project/digest";

/**
 * A session on one render path that keeps every `graph` dirty set its lane passes.
 * @param batched - Whether the session draws on the "batched" path.
 * @returns The session and the dirty sets seen.
 */
function recording(batched: boolean): { session: GraphSession; passes: string[][] } {
    const session = createElementSession({}, { batched: () => batched });
    const passes: string[][] = [];
    dispatcherOf(session).lane.register("graph", (_rendered, _target, dirty) => {
        passes.push([...dirty]);
    });
    return { session, passes };
}

/**
 * A ring of edges over `count` nodes, each with a record field.
 * @param count - Nodes and edges.
 * @returns The edge records.
 */
function ring(count: number): EdgeRecordInput[] {
    return Array.from({ length: count }, (_, i) => ({ source: i, target: (i + 1) % count, w: i }));
}

/**
 * The digest of the session's graph slice and snapshot.
 * @param session - The session.
 * @returns The digest.
 */
function digest(session: GraphSession): string {
    return dataDigest(dispatcherOf(session).state.graph, () => session.data.snapshot());
}

/**
 * The edge keys of a pass's dirty set.
 * @param keys - The dirty keys.
 * @returns Those naming edges, per edge or as a range.
 */
function edgeKeys(keys: readonly string[]): string[] {
    return keys.filter((key) => key.startsWith("e:") || key.startsWith("e+:"));
}

describe("bulk lane keys", () => {
    it("a batched load's dirty set holds as many keys at 50,000 edges as at 500", async () => {
        const counts: number[] = [];
        for (const size of [500, 50_000]) {
            const { session, passes } = recording(true);
            // Over the same 100 nodes, so only the edge count changes.
            await session.data.addEdges(
                Array.from({ length: size }, (_, i) => ({ source: i % 100, target: (i * 31 + 1) % 100 })),
            );
            assert.strictEqual(session.data.count().edges, size);
            await session.styles.settled();
            const keys = passes.flatMap(edgeKeys);
            assert.deepStrictEqual(
                keys.filter((key) => key.startsWith("e:")),
                [],
                "no per-edge key on the batched path",
            );
            counts.push(passes.flat().length);
        }

        assert.strictEqual(counts[0], counts[1]);
    });

    it("a batched load touches the lane as often at 50,000 edges as at 500", async () => {
        const touches: number[] = [];
        for (const size of [500, 50_000]) {
            const { session } = recording(true);
            const { lane } = dispatcherOf(session);
            await session.data.addNodes(Array.from({ length: 100 }, (_, id) => ({ id })));
            const before = lane.writes("graph");
            await session.data.addEdges(
                Array.from({ length: size }, (_, i) => ({ source: i % 100, target: (i * 31 + 1) % 100 })),
            );
            touches.push(lane.writes("graph") - before);
        }

        assert.strictEqual(touches[0], touches[1]);
    });

    it("an objects load touches every edge, as before", async () => {
        const { session, passes } = recording(false);
        await session.data.addEdges(ring(300));
        await session.styles.settled();
        const keys = passes.flatMap(edgeKeys);
        assert.strictEqual(keys.length, 300);
        assert.isTrue(keys.every((key) => key.startsWith("e:")));
    });

    it("a load, per-edge edits, undo, redo and a restore end equal on both paths", async () => {
        const trail = async (batched: boolean): Promise<string[]> => {
            const { session } = recording(batched);
            const seen: string[] = [];
            await session.data.addEdges(ring(200));
            seen.push(digest(session));
            const ids = session.data.edges().map((edge) => edge.id);
            await session.data.updateEdges(ids.slice(10, 15).map((id) => ({ id, values: { w: -1 } })));
            await session.data.addEdges(ring(50).map((edge) => ({ ...edge, source: `x${String(edge.source)}` })));
            seen.push(digest(session));
            await session.undo();
            await session.undo();
            seen.push(digest(session));
            await session.undo();
            seen.push(digest(session));
            await session.redo();
            await session.redo();
            await session.redo();
            seen.push(digest(session));
            const { text } = await session.project.save();
            const reopened = createElementSession({}, { batched: () => batched });
            await reopened.project.open(text);
            seen.push(digest(reopened));
            await session.styles.settled();
            assert.deepStrictEqual(session.data.count(), { nodes: 250, edges: 250 });
            return seen;
        };

        assert.deepStrictEqual(await trail(true), await trail(false));
    });
});
