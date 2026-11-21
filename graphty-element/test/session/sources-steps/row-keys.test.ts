// The keys of rows that name no key of their own (spec 6.1): keyless edge rows by their ends,
// node rows of a source with no key column by their content.
import { assert, describe, it } from "vitest";

import { keylessEdgeKeys, keylessNodeKeys } from "../../../src/session/sources/rowKeys";

const ENDS = { source: "from", target: "to" };
const edge = (from: unknown, to: unknown, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    from,
    to,
    ...extra,
});

describe("keyless edge keys", () => {
    it("numbers rows per ordered pair, in row order", () => {
        const rows = [edge("a", "b"), edge("a", "b"), edge("b", "a")];
        assert.deepEqual(keylessEdgeKeys(rows, ENDS), ["a|b#1", "a|b#2", "b|a#1"]);
    });

    it("escapes | and \\ in each end", () => {
        assert.deepEqual(keylessEdgeKeys([edge("a|x", "b"), edge("c\\d", "e")], ENDS), [
            String.raw`a\|x|b#1`,
            String.raw`c\\d|e#1`,
        ]);
    });

    it("keeps every key when rows are re-sorted or appended to", () => {
        const rows = [edge("a", "b"), edge("c", "d"), edge("e", 7)];
        const keys = keylessEdgeKeys(rows, ENDS);
        assert.deepEqual(keylessEdgeKeys([...rows].reverse(), ENDS), [...keys].reverse());
        assert.deepEqual(keylessEdgeKeys([...rows, edge("x", "y")], ENDS), [...keys, "x|y#1"]);
        assert.strictEqual(keys[2], "e|7#1", "a number end is its key text");
    });

    it("gives no key to a row with an edge id or an empty end", () => {
        const columns = { ...ENDS, edgeId: "id" };
        const rows = [edge("a", "b", { id: "e1" }), edge("", "b"), edge("a", null), edge("a", "b", { id: "" })];
        assert.deepEqual(keylessEdgeKeys(rows, columns), [undefined, undefined, undefined, "a|b#1"]);
    });

    it("skips a number whose key an edge id already holds", () => {
        const rows = [edge("a", "b"), edge("x", "y", { id: "a|b#1" })];
        assert.deepEqual(keylessEdgeKeys(rows, { ...ENDS, edgeId: "id" }), ["a|b#2", undefined]);
    });
});

describe("keyless node keys", () => {
    it("is the content digest and a count, unchanged by re-sorting", () => {
        const rows = [{ name: "Ava", age: 3 }, { name: "Ben" }];
        const keys = keylessNodeKeys(rows);
        assert.match(keys[0], /^[0-9a-f]{32}#1$/);
        assert.deepEqual(keylessNodeKeys([...rows].reverse()), [...keys].reverse());
        assert.deepEqual(keylessNodeKeys([{ age: 3, name: "Ava" }]), [keys[0]], "column order does not count");
    });

    it("numbers identical rows #1 and #2", () => {
        const [first, second] = keylessNodeKeys([{ name: "Ava" }, { name: "Ava" }]);
        assert.strictEqual(second, first.replace(/#1$/, "#2"));
    });

    it("keeps keys when an all-null column is added, and changes only the row whose cell changed", () => {
        const keys = keylessNodeKeys([{ name: "Ava" }, { name: "Ben" }]);
        assert.deepEqual(
            keylessNodeKeys([
                { name: "Ava", tag: null },
                { name: "Ben", tag: null },
            ]),
            keys,
        );
        const changed = keylessNodeKeys([{ name: "Ava" }, { name: "Bea" }]);
        assert.strictEqual(changed[0], keys[0]);
        assert.notStrictEqual(changed[1], keys[1]);
    });
});
