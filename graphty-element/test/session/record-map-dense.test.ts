/**
 * @file Record arrays keep no Map entry per row (design/rendering/row-renderer.md 4.6, stage 127).
 * Under the "batched" render path a forward add of edges, and of nodes whose ids are their row
 * numbers, holds each row's value in an array by its counter instead of one `Map.set` per row; the
 * map still answers every read as a `Map` does, in insertion order. Under "objects" every row is a
 * Map entry, as on master.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../src/session";
import { createElementSession, dispatcherOf } from "../../src/session/GraphSession";
import { dataDigest } from "../../src/session/project/digest";
import { RecordMap } from "../../src/session/project/recordMap";

const N = 50;
const NODES = Array.from({ length: N }, (_, id) => ({ id, group: id % 3 }));
const EDGES = Array.from({ length: 2 * N }, (_, at) => ({ source: at % N, target: (at * 7 + 1) % N, weight: at }));

/**
 * The slice maps of a session.
 * @param session - The session.
 * @returns The node and edge maps.
 */
function maps(session: GraphSession): [RecordMap<unknown>, RecordMap<unknown>] {
    const { nodes, edges } = dispatcherOf(session).state.graph;
    return [nodes as RecordMap<unknown>, edges as RecordMap<unknown>];
}

/**
 * The digest of the session's graph slice and snapshot.
 * @param session - The session.
 * @returns The digest.
 */
function digest(session: GraphSession): string {
    return dataDigest(dispatcherOf(session).state.graph, () => session.data.snapshot());
}

describe("record arrays keep no Map entry per row", () => {
    it("holds a batched load's rows by counter, and the objects path's as Map entries", async () => {
        const objects = createElementSession({}, { batched: () => false });
        const batched = createElementSession({}, { batched: () => true });
        for (const session of [objects, batched]) {
            await session.data.addNodes(NODES);
            await session.data.addEdges(EDGES);
        }

        const [objectNodes, objectEdges] = maps(objects);
        const [nodes, edges] = maps(batched);
        assert.deepStrictEqual([objectNodes.mapEntries(), objectEdges.mapEntries()], [N, 2 * N]);
        assert.deepStrictEqual([nodes.mapEntries(), edges.mapEntries()], [0, 0]);
        assert.deepStrictEqual([nodes.size, edges.size], [N, 2 * N]);
        assert.strictEqual(digest(batched), digest(objects));
        assert.deepStrictEqual([...edges.keys()], [...objectEdges.keys()]);
        assert.deepStrictEqual([...nodes.entries()], [...objectNodes.entries()]);
        const loaded = digest(batched);
        // Two commands, the nodes and then the edges.
        await batched.undo();
        await batched.undo();
        assert.deepStrictEqual([nodes.size, edges.size], [0, 0]);
        await batched.redo();
        await batched.redo();
        assert.strictEqual(digest(batched), loaded);
    });

    it("answers every read as a Map does, in insertion order, through out-of-order writes", () => {
        const map = new RecordMap<number>({ counterOf: (key) => key, keyOf: (counter) => counter });
        const plain = new Map<number, unknown>();
        const record = (n: number): { n: number } => ({ n });
        const both = (fn: (m: Map<number, unknown>) => void): void => {
            fn(map);
            fn(plain);
        };
        for (let id = 3; id < 9; id++) {
            map.put(id, record(id), true);
            plain.set(id, record(id));
        }

        assert.strictEqual(map.mapEntries(), 0);
        both((m) => m.delete(5));
        both((m) => m.set(4, record(40)));
        both((m) => m.set(12, record(12)));
        assert.strictEqual(map.mapEntries(), 0);
        assert.deepStrictEqual([...map.entries()], [...plain.entries()]);
        assert.deepStrictEqual([map.has(5), map.get(5), map.size], [false, undefined, plain.size]);
        // A key before the run, or a deleted one put back, goes last as a Map puts it.
        both((m) => m.set(5, record(5)));
        both((m) => m.set(1, record(1)));
        assert.deepStrictEqual([...map.entries()], [...plain.entries()]);
        assert.strictEqual(map.mapEntries(), plain.size);
        both((m) => m.clear());
        assert.strictEqual(map.size, 0);
        map.put(0, record(0), true);
        assert.deepStrictEqual([map.mapEntries(), map.size, map.get(0)], [0, 1, record(0)]);
    });
});
