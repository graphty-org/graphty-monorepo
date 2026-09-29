/**
 * @file Strict state against the writes that do not go through a command: records, the resident
 * snapshot's tables, the builder behind the `graph` slice, and typed arrays state keeps. Each
 * write either throws where it is made, or makes the next dispatch fail naming the slice. See
 * design/undo/undo-design.md sections 4.9 and 12.1.
 */

import { GraphFormatError } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import type { Edge } from "../../../src/Edge";
import { isGraphtyError } from "../../../src/errors";
import type { Graph } from "../../../src/Graph";
import type { LayoutEngine } from "../../../src/layout/LayoutEngine";
import type { DataManager } from "../../../src/managers/DataManager";
import type { LayoutManager } from "../../../src/managers/LayoutManager";
import type { Node } from "../../../src/Node";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { LegacyWrites, openLegacyScope } from "../../../src/session/commands/algo";
import { dispatcherOf } from "../../../src/session/GraphSession";
import { retainArray, verifyRetainedArrays } from "../../../src/session/project/strict";
import { makeSession } from "../helpers";

/**
 * Assert a promise rejects with a strict-state violation whose message names `words`.
 * @param promise - The dispatch.
 * @param words - What the message must name.
 */
async function rejectsNaming(promise: Promise<unknown>, words: string): Promise<void> {
    try {
        await promise;
    } catch (error) {
        assert.isTrue(isGraphtyError(error), String(error));
        assert.include((error as Error).message, "Strict state");
        assert.include((error as Error).message, words);
        return;
    }

    assert.fail("the dispatch was expected to fail");
}

/**
 * Assert a write throws the graph-format error `E_FROZEN`.
 * @param write - The write.
 */
function throwsFrozen(write: () => unknown): void {
    try {
        write();
    } catch (error) {
        assert.instanceOf(error, GraphFormatError);
        assert.strictEqual(error.code, "E_FROZEN");
        return;
    }

    assert.fail("the write was expected to throw E_FROZEN");
}

describe("strict state: records", () => {
    it("keeps a deep-frozen copy of each record, never freezing the caller's own object", async () => {
        const { session } = makeSession();
        const given = { id: "n1", style: { colour: "red" }, tags: ["a"] };
        await session.data.addNodes([given]);
        await session.data.addEdges([{ src: "n1", dst: "n2", meta: { kind: "road" } }]);

        const { graph } = dispatcherOf(session).state;
        const node = graph.nodes.get("n1") as { style: { colour: string }; tags: string[] };
        const edge = [...graph.edges.values()][0] as { meta: { kind: string } };
        assert.isFalse(Object.isFrozen(given), "the caller's object is its own");
        assert.isTrue(Object.isFrozen(node) && Object.isFrozen(node.style) && Object.isFrozen(node.tags));
        assert.isTrue(Object.isFrozen(edge) && Object.isFrozen(edge.meta));
        assert.throws(() => {
            node.style.colour = "blue";
        }, TypeError);
        assert.throws(() => {
            node.tags.push("b");
        }, TypeError);

        given.style.colour = "green";
        assert.strictEqual(node.style.colour, "red", "a later write to the caller's object changes nothing");
    });

    it("keeps a patched record deep-frozen too", async () => {
        const { session } = makeSession();
        await session.data.addNodes([{ id: "n1" }]);
        await session.data.updateNodes([{ id: "n1", values: { score: { value: 1 } } }]);

        const record = dispatcherOf(session).state.graph.nodes.get("n1") as { score: { value: number } };
        assert.isTrue(Object.isFrozen(record) && Object.isFrozen(record.score));
        assert.throws(() => {
            record.score.value = 2;
        }, TypeError);
    });

    it("hands out nested values from session.data.node() and edge() frozen", async () => {
        const harness = makeSession();
        const { session } = harness;
        await session.data.addNodes([{ id: "n1" }, { id: "n2" }]);
        await session.data.addEdges([{ src: "n1", dst: "n2" }]);
        harness.nodeAttributes.set(0, { nested: { a: 1 } });
        harness.edgeAttributes.set(0, { nested: { b: 2 } });

        const node = session.data.node("n1") as unknown as { nested: { a: number } };
        const edge = session.data.edge(session.snapshot().edges.value("graphty.edgeId", 0) as never);
        assert.isTrue(Object.isFrozen(node.nested));
        assert.isTrue(Object.isFrozen((edge as unknown as { nested: object }).nested));
        assert.throws(() => {
            node.nested.a = 5;
        }, TypeError);
    });

    it("refuses a write through a record a plugin kept past its run, naming the command to use", () => {
        class Row {
            readonly id = "n1";
            readonly #record = Object.freeze({ algorithmResults: Object.freeze({ score: 1 }) });

            get data(): Record<string, Record<string, unknown>> {
                return this.#record;
            }
        }

        const row = new Row();
        const scope = new LegacyWrites({}, () => true);
        const close = openLegacyScope(scope, [{ prototype: Row.prototype, target: "node" }]);
        const kept = row.data;
        kept.algorithmResults.score = 2;
        close();

        let caught: unknown;
        try {
            kept.algorithmResults.score = 3;
        } catch (error) {
            caught = error;
        }

        assert.isTrue(isGraphtyError(caught));
        assert.strictEqual((caught as { code: string }).code, "E_READONLY");
        assert.include((caught as Error).message, "session.data.updateNodes");
        assert.include((caught as Error).message, 'node "n1"');
        assert.throws(() => {
            delete (kept as Record<string, unknown>).algorithmResults;
        }, /updateNodes/);
        assert.deepEqual(scope.writes().nodes, [{ id: "n1", values: { algorithmResults: { score: 2 } } }]);
    });
});

describe("strict state: the resident snapshot", () => {
    it("seals the resident snapshot's tables once the store has attached its columns", async () => {
        const { session } = makeSession();
        await session.data.addNodes([{ id: "n1" }, { id: "n2" }]);
        await session.data.addEdges([{ src: "n1", dst: "n2" }]);
        const snapshot = session.snapshot();

        assert.isNotNull(snapshot.nodes.byRole("position"), "the position column is attached before the seal");
        throwsFrozen(() => snapshot.nodes.set("extra", new Float32Array(snapshot.nodeCount)));
        throwsFrozen(() => snapshot.nodes.remove("position"));
        throwsFrozen(() => snapshot.nodes.rename("graphty.pinned", "pins"));
        throwsFrozen(() => snapshot.edges.set("extra", new Float32Array(snapshot.edgeCount)));
        throwsFrozen(() => snapshot.graph.set("extra", [1]));
    });

    it("fails the next dispatch, naming the graph slice, after the builder is written directly", async () => {
        const harness = makeSession();
        await harness.session.data.addNodes([{ id: "n1" }]);

        harness.store.builder.addNode("rogue");

        await rejectsNaming(harness.session.data.addNodes([{ id: "n2" }]), "graph slice's builder");
    });

    it("finds a column of the resident snapshot written in place, naming the column", async () => {
        const { session, store } = makeSession();
        await session.data.addNodes([{ id: "n1" }, { id: "n2" }]);
        await session.data.addEdges([{ src: "n1", dst: "n2" }]);
        const column = store.getSnapshot().edges.get("graphty.edgeId") as unknown as { data: Uint32Array };
        const was = column.data[0];

        column.data[0] = was + 7;
        try {
            assert.throws(verifyRetainedArrays, /graphty\.edgeId/);
        } finally {
            column.data[0] = was;
        }

        verifyRetainedArrays();
    });

    it("finds the resident topology written in place at the next dispatch, however old it is", async () => {
        const { session, store } = makeSession();
        await session.data.addNodes([{ id: "n1" }, { id: "n2" }]);
        await session.data.addEdges([{ src: "n1", dst: "n2" }]);
        const { colIdx } = store.getSnapshot();
        await session.positions.set([{ id: "n1", x: 1, y: 2, z: 3 }]);
        const was = colIdx[0];

        colIdx[0] = was + 1;
        try {
            await rejectsNaming(session.data.addNodes([{ id: "n3" }]), "colIdx");
        } finally {
            colIdx[0] = was;
        }
    });

    it("leaves the lane-backed position column out, because a layout writes it every frame", async () => {
        const { session } = makeSession();
        await session.data.addNodes([{ id: "n1" }]);
        const position = session.snapshot().nodes.byRole("position") as unknown as { data: Float32Array };

        position.data[0] = 42;

        verifyRetainedArrays();
    });
});

describe("strict state: typed arrays state keeps", () => {
    it("fails the next dispatch when an array retained since the last one was written in place", async () => {
        const { session } = makeSession();
        const kept = new Float32Array([1, 2, 3]);
        retainArray(kept, "the arrangement slice's capture");

        kept[1] = 9;
        try {
            await rejectsNaming(session.data.addNodes([{ id: "n1" }]), "the arrangement slice's capture");
        } finally {
            kept[1] = 2;
        }
    });

    it("retains a coordinate capture, and finds it written in place", async () => {
        const { session } = makeSession();
        await session.data.addNodes([{ id: "n1" }, { id: "n2" }]);
        const capture = dispatcherOf(session).arrangement.capture();
        assert.isNotNull(capture);
        // Byte by byte: an unplaced node's coordinates are NaN, and NaN + 1 writes the same bits.
        const bytes = new Uint8Array((capture as { coords: Float32Array }).coords.buffer);
        const was = bytes[0];

        bytes[0] = was ^ 0xff;
        try {
            assert.throws(verifyRetainedArrays, /arrangement slice's capture/);
        } finally {
            bytes[0] = was;
        }
    });
});

describe("strict state: the narrowed public surface", () => {
    it("gives session.positions and the store's coordinates no writer, even through a cast", async () => {
        const { session } = makeSession();
        await session.data.addNodes([{ id: "n1" }]);

        for (const member of ["write", "view", "setPinned", "fillUnplaced", "grow", "remap", "pinnedView", "moved"]) {
            assert.notProperty(session.positions, member, `session.positions.${member}`);
            assert.notProperty(session.data.store.positions, member, `session.data.store.positions.${member}`);
        }

        await session.positions.set([{ id: "n1", x: 1, y: 2, z: 3 }]);
        const at = { x: 0, y: 0, z: 0 };
        session.positions.read(0, at);
        assert.deepEqual(at, { x: 1, y: 2, z: 3 }, "the verbs still place, and the reads still see it");
    });

    it("hands a consumer copies of the coordinate and pin columns, so a write there moves nothing", async () => {
        const harness = makeSession();
        const { session } = harness;
        await session.data.addNodes([{ id: "n1" }]);
        await session.positions.set([{ id: "n1", x: 1, y: 2, z: 3 }]);

        for (const snapshot of [session.snapshot(), session.data.snapshot(), session.data.store.getSnapshot()]) {
            const position = snapshot.nodes.typed("position", "f32");
            const pinned = snapshot.nodes.typed("graphty.pinned", "u8");
            assert.isNotNull(position);
            assert.isNotNull(pinned);
            position.data[0] = 99;
            pinned.data[0] = 1;
            throwsFrozen(() => snapshot.nodes.set("extra", new Float32Array(snapshot.nodeCount)));
        }

        const at = { x: 0, y: 0, z: 0 };
        harness.store.positions.read(0, at);
        assert.strictEqual(at.x, 1, "the lane is untouched");
        assert.isFalse(harness.store.positions.isPinned(0), "and so are the pins");
        await session.data.addNodes([{ id: "n2" }]);
    });

    it("hands a consumer copies of the topology and every column, so a write there changes no state", async () => {
        const { session, store } = makeSession();
        await session.data.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }]);
        await session.data.addEdges([
            { src: "n1", dst: "n2" },
            { src: "n1", dst: "n3" },
        ]);
        /**
         * Every byte of a snapshot's topology and edge columns, as plain numbers.
         * @param snapshot - The snapshot.
         * @returns The bytes.
         */
        const bytesOf = (snapshot: ReturnType<typeof store.getSnapshot>): number[][] => [
            [...snapshot.colIdx],
            [...(snapshot.weights ?? [])],
            ...[...snapshot.edges].flatMap((column) =>
                "data" in column && ArrayBuffer.isView(column.data)
                    ? [[...new Uint8Array(column.data.buffer, column.data.byteOffset, column.data.byteLength)]]
                    : [],
            ),
        ];
        const before = bytesOf(store.getSnapshot());
        const handed = session.snapshot();

        handed.colIdx[0] = 2;
        if (handed.weights !== null) {
            handed.weights[0] = 7;
        }
        for (const column of handed.edges) {
            if ("data" in column && ArrayBuffer.isView(column.data)) {
                new Uint8Array(column.data.buffer, column.data.byteOffset, column.data.byteLength)[0] ^= 0xff;
            }
        }

        assert.notDeepEqual(bytesOf(handed), before, "the consumer's copy took the writes");
        assert.deepEqual(bytesOf(store.getSnapshot()), before, "the resident graph is untouched");
        assert.deepEqual(bytesOf(session.snapshot()), before, "and so is the next consumer's copy");
        await session.data.addNodes([{ id: "n4" }]);
    });

    it("hands out sealed sets for the pins and for a resolved scope", async () => {
        const { session } = makeSession();
        await session.data.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }]);
        await session.positions.pin(["n1"]);
        const saved = session.scope.save("A", { nodes: ["n1"] });
        const sets: [string, ReadonlySet<unknown>][] = [["positions.pinned", session.positions.pinned]];
        const resolved = await session.scope.resolve({ set: saved });
        sets.push(["scope nodes", resolved.nodes], ["scope edges", resolved.edges]);

        for (const [label, set] of sets) {
            const writable = set as Set<unknown>;
            for (const write of [() => writable.add("n3"), () => writable.delete("n1"), () => writable.clear()]) {
                let caught: unknown;
                try {
                    write();
                } catch (error) {
                    caught = error;
                }
                assert.strictEqual((caught as { code?: string } | undefined)?.code, "E_READONLY", label);
            }
        }

        assert.deepEqual([...session.positions.pinned], ["n1"]);
        const again = await session.scope.resolve({ set: saved });
        assert.deepEqual([...again.nodes], ["n1"]);
    });

    it("ignores a store or record source handed to the published factory by a caller the types did not check", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }]);
        const session = createGraphSession({ store: harness.store } as never);

        assert.strictEqual(session.status.counts.nodes, 0, "it built a store of its own");
        session.dispose();
    });
});

/**
 * Compile-only: each line must not compile, so a member that becomes writable again fails
 * `tsc` (the package's lint). Never called.
 * @param parts - The renderer's objects.
 * @param parts.graph - A graph.
 * @param parts.dataManager - Its data manager.
 * @param parts.layoutManager - Its layout manager.
 * @param parts.engine - A layout engine.
 * @param parts.node - A node.
 * @param parts.edge - An edge.
 * @param parts.session - A session.
 */
export function narrowedAtCompileTime(parts: {
    graph: Graph;
    dataManager: DataManager;
    layoutManager: LayoutManager;
    engine: LayoutEngine;
    node: Node;
    edge: Edge;
    session: GraphSession;
}): void {
    const { graph, dataManager, layoutManager, engine, node, edge, session } = parts;
    // @ts-expect-error `Graph.styles` is readonly
    graph.styles = null as unknown as typeof graph.styles;
    // @ts-expect-error `Graph.operationQueue` is private
    void graph.operationQueue;
    // @ts-expect-error the node map is read-only
    dataManager.nodes.set(node.id, node);
    // @ts-expect-error the edge map is read-only
    dataManager.edges.delete(edge.id);
    // @ts-expect-error the row index is read-only
    dataManager.edgesByIndex[0] = edge;
    // @ts-expect-error a node's id is read-only
    node.id = "other";
    // @ts-expect-error and so is its row
    node.index = 0;
    // @ts-expect-error an edge's endpoints are read-only
    edge.srcId = "other";
    // @ts-expect-error and so is its row
    edge.index = 0;
    // @ts-expect-error the engine is chosen through the `layout` slice
    layoutManager.layoutEngine = engine;
    // @ts-expect-error building an engine outside the slice is private
    void layoutManager.setLayout("circular");
    // @ts-expect-error placing a node on the engine is protected
    engine.setNodePosition(node, { x: 0, y: 0, z: 0 });
    // @ts-expect-error pinning on the engine is protected
    engine.pin(node);
    // @ts-expect-error the store's coordinates are read-only
    session.data.store.positions.write(0, 1, 2, 3);
    // @ts-expect-error and so are the session's
    session.positions.setPinned(0, true);
}

describe("strict state: pins", () => {
    it("catches a pin byte written outside a command after a history call and at any commit", async () => {
        const harness = makeSession();
        const { session } = harness;
        await session.data.addNodes([{ id: "n1" }, { id: "n2" }]);
        await session.config.set({ runAlgorithmsOnLoad: true });

        // Neither the undo nor the commit below writes the pins slice.
        harness.store.positions.setPinned(1, true);
        await rejectsNaming(session.undo(), "pin byte");

        // The undo took the setting back, so setting it again is a step.
        await rejectsNaming(session.config.set({ runAlgorithmsOnLoad: true }), "pin byte");
    });
});
