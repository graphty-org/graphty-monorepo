/**
 * @file The copy-on-write records a plugin algorithm writes through while `algo.legacy` runs it:
 * reads pass through to the record the graph holds, a write copies only the top-level key it
 * lands under, the record itself is never touched, and only written keys are handed to the draft.
 */

import { assert, describe, it } from "vitest";

import { LegacyWrites, openLegacyScope } from "../../../src/session/commands/algo";

/**
 * A scope that owns every element.
 * @returns The scope.
 */
function scope(): LegacyWrites {
    return new LegacyWrites({}, () => true);
}

/**
 * A frozen record, as the graph will hold one.
 * @returns The record.
 */
function frozenRecord(): Record<string, unknown> {
    const inner = Object.freeze({ fixture: Object.freeze({ a: Object.freeze({ value: 1 }) }) });
    return Object.freeze({ id: "n1", label: "one", algorithmResults: inner, tags: Object.freeze(["x", "y"]) });
}

describe("copy-on-write records", () => {
    it("reads pass through, and a record read twice is one view", () => {
        const writes = scope();
        const record = frozenRecord();
        const view = writes.view("node", "n1", record) as Record<string, unknown>;

        assert.strictEqual(view.label, "one");
        assert.deepEqual(view.algorithmResults, record.algorithmResults);
        assert.deepEqual({ ...view }, { ...record });
        assert.deepEqual(JSON.parse(JSON.stringify(view)), JSON.parse(JSON.stringify(record)));
        assert.isTrue(Array.isArray(view.tags));
        assert.deepEqual([...(view.tags as string[])], ["x", "y"]);
        assert.strictEqual(writes.view("node", "n1", record), view);
        assert.deepEqual(writes.writes(), { nodes: [], edges: [], graph: null });
    });

    it("a nested write copies its top-level key and never touches the record", () => {
        const writes = scope();
        const record = frozenRecord();
        const view = writes.view("node", "n1", record) as { algorithmResults: Record<string, Record<string, unknown>> };

        view.algorithmResults.fixture.b = { value: 2 };

        assert.deepEqual(view.algorithmResults.fixture, { a: { value: 1 }, b: { value: 2 } });
        assert.deepEqual(record.algorithmResults, { fixture: { a: { value: 1 } } }, "the record is untouched");
        assert.deepEqual(writes.writes().nodes, [
            { id: "n1", values: { algorithmResults: { fixture: { a: { value: 1 }, b: { value: 2 } } } } },
        ]);
    });

    it("a write at the top is only that key", () => {
        const writes = scope();
        const view = writes.view("edge", "0", frozenRecord()) as Record<string, unknown>;

        view.marked = true;
        delete view.label;

        assert.isTrue(view.marked);
        assert.deepEqual(writes.writes().edges, [{ id: "0", values: { marked: true, label: undefined } }]);
    });

    it("the graph's values are one view, written by name", () => {
        const writes = scope();
        const values = new Map<string, unknown>([["source", { type: "json" }]]);

        writes.graph(values).graphResults = { total: 3 };

        assert.strictEqual(writes.graph(values), writes.graph(values));
        assert.deepEqual(writes.writes().graph, { graphResults: { total: 3 } });
    });

    it("swaps a prototype's data getter only while a scope is open", () => {
        class Row {
            readonly id = "r1";
            readonly #record = Object.freeze({ weight: 1 });

            get data(): Record<string, unknown> {
                return this.#record;
            }
        }

        const row = new Row();
        const writes = scope();
        const close = openLegacyScope(writes, [{ prototype: Row.prototype, target: "node" }]);
        try {
            row.data.weight = 2;
            assert.strictEqual(row.data.weight, 2);
        } finally {
            close();
        }

        assert.strictEqual(row.data.weight, 1, "the record itself was never written");
        assert.deepEqual(writes.writes().nodes, [{ id: "r1", values: { weight: 2 } }]);
        assert.throws(() => {
            row.data.weight = 3;
        }, TypeError);
    });
});
