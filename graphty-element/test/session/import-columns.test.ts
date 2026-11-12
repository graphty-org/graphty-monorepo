/**
 * @file The typed door (design/rendering/row-renderer.md, stage 28): `session.data.importColumns`
 * loads a graph from column arrays as one undoable step, and the graph it makes is the one the
 * record doors (`addNodes`, `addEdges`) make from the same rows. Under the "batched" render path a
 * forward add of nodes, and of edges, records each as one range entry in the op log, which undo and redo take
 * back and put again in one go.
 */

import { assert, describe, it } from "vitest";

import type { GraphStore } from "../../src/data/GraphStore";
import type { GraphSession } from "../../src/session";
import { createElementSession, dispatcherOf } from "../../src/session/GraphSession";
import { dataDigest } from "../../src/session/project/digest";
import { assertScalesLinearly } from "../helpers/cost";

/**
 * The digest of the session's graph slice and snapshot.
 * @param session - The session.
 * @returns The digest.
 */
function digest(session: GraphSession): string {
    return dataDigest(dispatcherOf(session).state.graph, () => session.data.snapshot());
}

/**
 * The graph builder's id map: null while every node's id is its own row (graph-format design 6.6).
 * @param session - The session.
 * @returns The map, or null when the builder keeps none.
 */
function idMapOf(session: GraphSession): unknown {
    // The graph's store and the builder's staging are private: this reads the one fact the stage is about.
    const { store } = dispatcherOf(session).graph as unknown as { store: GraphStore };
    return (store.builder as unknown as { staging: { idToIndex: unknown } }).staging.idToIndex;
}

/** Five nodes in a ring with a chord; node 4 has no edge of its own besides the ring. */
const SOURCES = new Uint32Array([0, 1, 2, 3, 4, 0]);
const TARGETS = new Uint32Array([1, 2, 3, 4, 0, 2]);
const WEIGHTS = new Float32Array([1, 2, 3, 4, 5, 0.5]);
const IDS = ["a", "b", "c", "d", "e"];
const POSITIONS = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0.5, 0.5, 1]);

/**
 * The same graph through the record doors, as one step.
 * @param session - The session.
 */
async function byRecords(session: GraphSession): Promise<void> {
    await session.transaction("records", async (tx) => {
        await tx.data.addNodes(
            IDS.map((id, row) => ({
                id,
                position: [POSITIONS[row * 3], POSITIONS[row * 3 + 1], POSITIONS[row * 3 + 2]],
                group: row % 2,
            })),
        );
        await tx.data.addEdges(
            [...SOURCES].map((source, at) => ({
                source: IDS[source],
                target: IDS[TARGETS[at]],
                weight: WEIGHTS[at],
                kind: at === 5 ? "chord" : "ring",
            })),
        );
    });
}

/**
 * The graph through the typed door.
 * @param session - The session.
 */
async function byColumns(session: GraphSession): Promise<void> {
    await session.data.importColumns({
        sources: SOURCES,
        targets: TARGETS,
        nodeCount: IDS.length,
        ids: IDS,
        weights: WEIGHTS,
        positions: POSITIONS,
        attributes: {
            nodes: { group: IDS.map((_, row) => row % 2) },
            edges: { kind: [...SOURCES].map((_, at) => (at === 5 ? "chord" : "ring")) },
        },
    });
}

describe("session.data.importColumns", () => {
    for (const batched of [false, true]) {
        const path = batched ? "batched" : "objects";

        it(`makes the graph the record doors make, on the ${path} path`, async () => {
            const records = createElementSession({}, { batched: () => batched });
            const columns = createElementSession({}, { batched: () => batched });
            await byRecords(records);
            await byColumns(columns);
            assert.deepStrictEqual(columns.data.count(), { nodes: 5, edges: 6 });
            assert.strictEqual(digest(columns), digest(records));
        });

        it(`is one step that undo takes back and redo puts again, on the ${path} path`, async () => {
            const session = createElementSession({}, { batched: () => batched });
            const empty = digest(session);
            const steps = session.history.steps.length;
            await byColumns(session);
            const loaded = digest(session);
            assert.strictEqual(session.history.steps.length, steps + 1);
            await session.undo();
            assert.strictEqual(digest(session), empty);
            assert.deepStrictEqual(session.data.count(), { nodes: 0, edges: 0 });
            await session.redo();
            assert.strictEqual(digest(session), loaded);
            await session.undo();
            await session.redo();
            assert.strictEqual(digest(session), loaded);
        });
    }

    it("numbers the nodes by row when no ids are given", async () => {
        const session = createElementSession({});
        await session.data.importColumns({ sources: [0, 1], targets: [1, 2], nodeCount: 4 });
        assert.deepStrictEqual(session.data.count(), { nodes: 4, edges: 2 });
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.id),
            [0, 1, 2, 3],
        );
    });

    it("keeps no id map for nodes numbered by row on the batched path, and the objects path's on objects", async () => {
        const batched = createElementSession({}, { batched: () => true });
        const objects = createElementSession({}, { batched: () => false });
        for (const session of [batched, objects]) {
            await session.data.importColumns({ sources: SOURCES, targets: TARGETS, nodeCount: 5 });
        }

        assert.isNull(idMapOf(batched));
        assert.isNotNull(idMapOf(objects));
        assert.strictEqual(digest(batched), digest(objects));

        // A named node joining later builds the map, and every row keeps its id.
        for (const session of [batched, objects]) {
            await session.data.addNodes([{ id: "late" }]);
            await session.data.addEdges([{ source: "late", target: 0 }]);
        }

        assert.isNotNull(idMapOf(batched));
        assert.deepStrictEqual(batched.data.snapshot().ids.toArray(), [0, 1, 2, 3, 4, "late"]);
        assert.strictEqual(digest(batched), digest(objects));
        await batched.undo();
        await objects.undo();
        assert.strictEqual(digest(batched), digest(objects));
    });

    it("refuses columns that do not line up, adding nothing", async () => {
        const session = createElementSession({});
        const bad = [
            { sources: [0, 1], targets: [1], nodeCount: 2 },
            { sources: [0, 2], targets: [1, 1], nodeCount: 2 },
            { sources: [0], targets: [1], nodeCount: 2, ids: ["a"] },
            { sources: [0], targets: [1], nodeCount: 2, weights: [] },
            { sources: [0], targets: [1], nodeCount: 2, positions: [0, 0, 0] },
            { sources: [0], targets: [1], nodeCount: 2, attributes: { nodes: { x: [1] } } },
            { sources: [-1], targets: [1], nodeCount: 2 },
        ];
        for (const columns of bad) {
            let code: unknown;
            try {
                await session.data.importColumns(columns);
            } catch (error) {
                ({ code } = error as { code?: unknown });
            }

            assert.strictEqual(code, "E_BAD_COMMAND", JSON.stringify(columns));
        }

        assert.deepStrictEqual(session.data.count(), { nodes: 0, edges: 0 });
    });

    it("keeps a batched load of edges as one range entry, retaining less than one op per edge", async () => {
        const bytes: number[] = [];
        for (const batched of [false, true]) {
            const session = createElementSession({}, { batched: () => batched });
            await session.data.addEdges(
                Array.from({ length: 20_000 }, (_, i) => ({ source: i % 100, target: (i * 31 + 1) % 100 })),
            );
            bytes.push(session.history.steps.at(-1)?.bytes ?? 0);
        }

        const [objects, batched] = bytes;
        // Each edge op costs 48 bytes of its own; the range costs that once and 16 per edge.
        assert.isAtLeast(objects - batched, 20_000 * 31, `objects ${String(objects)}, batched ${String(batched)}`);
    });

    it("keeps a batched load of nodes as one range entry, retaining less than one op per node", async () => {
        const bytes: number[] = [];
        for (const batched of [false, true]) {
            const session = createElementSession({}, { batched: () => batched });
            await session.data.addNodes(Array.from({ length: 20_000 }, (_, i) => ({ id: `n${String(i)}` })));
            bytes.push(session.history.steps.at(-1)?.bytes ?? 0);
        }

        const [objects, batched] = bytes;
        // Each node op costs 48 bytes of its own; the range costs that once and 20 per node.
        assert.isAtLeast(objects - batched, 20_000 * 27, `objects ${String(objects)}, batched ${String(batched)}`);
    });

    for (const batched of [false, true]) {
        it(`undoes and redoes nodes merged into existing ones, on the ${batched ? "batched" : "objects"} path`, async () => {
            const session = createElementSession({}, { batched: () => batched });
            await session.data.addNodes([{ id: "a", x: 1 }, { id: "b" }]);
            await session.data.addEdges([{ source: "b", target: "z" }]);
            const before = digest(session);
            // "a" and "z" already have rows ("z" made by the edge, with no record); "c" is new.
            await session.data.addNodes([{ id: "a", x: 2 }, { id: "c" }, { id: "z", y: 3 }]);
            const after = digest(session);
            assert.deepStrictEqual(session.data.count(), { nodes: 4, edges: 1 });
            await session.undo();
            assert.strictEqual(digest(session), before);
            assert.deepStrictEqual(session.data.count(), { nodes: 3, edges: 1 });
            await session.redo();
            assert.strictEqual(digest(session), after);
        });
    }

    it("retains history in proportion to the edges it loads", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = createElementSession({}, { batched: () => true });
                const sources = Uint32Array.from({ length: size }, (_, i) => i % 100);
                const targets = Uint32Array.from({ length: size }, (_, i) => (i * 31 + 1) % 100);
                await session.data.importColumns({ sources, targets, nodeCount: 100 });
                return session.history.steps.at(-1)?.bytes ?? 0;
            },
            { sizes: [2_000, 8_000], counter: "bytes the step retains" },
        );
    });
});
