/**
 * @file Strict state against the writes that do not go through a command: records, the resident
 * snapshot's tables, the builder behind the `graph` slice, and typed arrays state keeps. Each
 * write either throws where it is made, or makes the next dispatch fail naming the slice. See
 * design/undo/undo-design.md sections 4.9 and 12.1.
 */

import { GraphFormatError } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
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
        const { session } = makeSession();
        await session.data.addNodes([{ id: "n1" }, { id: "n2" }]);
        await session.data.addEdges([{ src: "n1", dst: "n2" }]);
        const column = session.snapshot().edges.get("graphty.edgeId") as unknown as { data: Uint32Array };
        const was = column.data[0];

        column.data[0] = was + 7;
        try {
            assert.throws(verifyRetainedArrays, /graphty\.edgeId/);
        } finally {
            column.data[0] = was;
        }

        verifyRetainedArrays();
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
