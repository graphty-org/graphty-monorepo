/**
 * @file The attribute writer and its per-field revisions (design/sets/sets-design.md 6.2). The
 * write paths through `Graph` and `DataManager` are in `test/browser/sets/attributes.revision.test.ts`.
 */

import { assert, describe, it } from "vitest";

import { inputCountersOf, replaceAttributes, writeAttributes } from "../../src/session/attributes";

describe("writeAttributes", () => {
    it("writes the named fields and bumps only those", () => {
        const counters = inputCountersOf({});
        const data: Record<string, unknown> = { label: "a", weight: 1 };

        writeAttributes(counters.nodes, data, { label: "b" });
        assert.deepEqual(data, { label: "b", weight: 1 });
        assert.strictEqual(counters.nodes.of("label"), 1);
        assert.strictEqual(counters.nodes.of("weight"), 0);
        assert.strictEqual(counters.edges.of("label"), 0, "node writes leave edge revisions alone");

        writeAttributes(counters.nodes, data, { id: "a", weight: 2 }, ["weight"]);
        assert.deepEqual(data, { label: "b", weight: 2 }, "a key outside `fields` is not written");
        assert.strictEqual(counters.nodes.of("weight"), 1);
        assert.strictEqual(counters.nodes.of("id"), 0);
    });

    it("bumps a field even when the value did not change", () => {
        const counters = inputCountersOf({});
        const data: Record<string, unknown> = { label: "a" };
        writeAttributes(counters.edges, data, { label: "a" });
        assert.strictEqual(counters.edges.of("label"), 1);
    });

    it("advances the tick once per write", () => {
        const counters = inputCountersOf({});
        const before = counters.tick.value;
        writeAttributes(counters.nodes, {}, { a: 1, b: 2 });
        assert.strictEqual(counters.tick.value, before + 1);
    });
});

describe("replaceAttributes", () => {
    it("replaces the record and bumps every field of the old and the new", () => {
        const counters = inputCountersOf({});
        const owner = { data: { a: 1, b: 2 } as Record<string, unknown> };
        const record = { b: 3, c: 4 };
        replaceAttributes(counters.edges, owner, record);
        assert.strictEqual(owner.data, record);
        assert.deepEqual(["a", "b", "c", "d"].map((f) => counters.edges.of(f)), [1, 1, 1, 0]);
    });
});

describe("inputCountersOf", () => {
    it("hands one owner the same counters and two owners different ones", () => {
        const owner = {};
        assert.strictEqual(inputCountersOf(owner), inputCountersOf(owner));
        assert.notStrictEqual(inputCountersOf(owner), inputCountersOf({}));
        assert.strictEqual(inputCountersOf(owner).nodes.of("anything"), 0);
    });
});
