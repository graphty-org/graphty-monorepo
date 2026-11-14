/**
 * @file graph-io's file loads on the batched path (design/rendering/row-renderer.md, section 4.6,
 * "The typed door"): a file read by graph-io reaches the graph in chunks of a thousand nodes with
 * every edge in the last, and under the "batched" render path its load is still one range entry for
 * its nodes and one for its edges in the op log, as a record load is. The graph, its load entry and
 * undo and redo are the same on both render paths.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../src/session";
import { createElementSession, dispatcherOf } from "../../src/session/GraphSession";
import { dataDigest } from "../../src/session/project/digest";

/** More nodes than one chunk holds, so the load arrives in several. */
const NODES = 5_000;
const EDGES = 8_000;

/**
 * The edges of the test graph, the same for every format.
 * @returns The endpoint pairs.
 */
function pairs(): [number, number][] {
    return Array.from({ length: EDGES }, (_, i) => [i % NODES, (i * 31 + 7) % NODES]);
}

/** Each format's file of the same graph. */
const FILES: Record<string, () => string> = {
    graphml: () =>
        [
            '<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph edgedefault="directed">',
            ...Array.from({ length: NODES }, (_, i) => `<node id="n${String(i)}"/>`),
            ...pairs().map(([s, t]) => `<edge source="n${String(s)}" target="n${String(t)}"/>`),
            "</graph></graphml>",
        ].join("\n"),
    gml: () =>
        [
            "graph [ directed 1",
            ...Array.from({ length: NODES }, (_, i) => `node [ id ${String(i)} ]`),
            ...pairs().map(([s, t]) => `edge [ source ${String(s)} target ${String(t)} ]`),
            "]",
        ].join("\n"),
};

/**
 * The digest of the session's graph slice and snapshot, and what its load entry says.
 * @param session - The session.
 * @returns Both, as one string.
 */
function state(session: GraphSession): string {
    const loads = session.data.sources().map(({ kind, name, counts }) => ({ kind, name, counts }));
    return `${dataDigest(dispatcherOf(session).state.graph, () => session.data.snapshot())} ${JSON.stringify(loads)}`;
}

describe("graph-io's file loads on the batched path", () => {
    for (const [type, file] of Object.entries(FILES)) {
        it(`loads a ${type} file as the objects path does, as one range entry for nodes and one for edges`, async () => {
            const data = file();
            const seen: string[][] = [];
            const bytes: number[] = [];
            for (const batched of [false, true]) {
                const session = createElementSession({}, { batched: () => batched });
                await session.data.import({ type, name: `graph.${type}`, config: { data } });
                bytes.push(session.history.steps.at(-1)?.bytes ?? 0);
                const after = [state(session)];
                await session.undo();
                after.push(state(session));
                await session.redo();
                after.push(state(session));
                seen.push(after);
                session.dispose();
            }

            assert.deepStrictEqual(seen[1], seen[0], "the batched path holds what the objects path does");
            const [objects, batched] = bytes;
            // A node op costs at least 27 bytes more than its place in a range, an edge op 31.
            assert.isAtLeast(
                objects - batched,
                NODES * 27 + EDGES * 31,
                `objects ${String(objects)}, batched ${String(batched)}`,
            );
        });
    }
});
