import { assert, describe, expect, it } from "vitest";

import { canonicalSetDefinition } from "../../../src/catalog/sets/canonical";
import { loadSetDefinition, parseSetDefinition } from "../../../src/catalog/sets/parse";
import type { SetDefinition } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";

/**
 * Content a newer element, or a plugin, may have written. Each value is already canonical, as
 * that element would have stored it, and names the first unknown kind or field.
 */
const OPAQUE: readonly (readonly [string, Record<string, unknown>, string])[] = [
    ["an unknown definition kind", { kind: "weighted", nodes: ["b", "a"], weights: [2, 1] }, "weighted"],
    ["an unknown leaf", { kind: "rule", reading: "clipped", where: { kind: "all", of: [{ kind: "degree", min: 1 }, { kind: "fuzzy", z: [2, 1] }] } }, "fuzzy"],
    ["a plugin leaf", { kind: "rule", reading: "clipped", where: { kind: "acme:fuzzy", score: 0.5 } }, "acme:fuzzy"],
    ["a known leaf with an unknown field", { kind: "rule", reading: "clipped", where: { attribute: "data.x", kind: "range", min: 1, op: "le" } }, "range.op"],
    ["a reserved field on a rule", { kind: "rule", reading: "clipped", where: "x", within: "visible" }, "rule.within"],
    ["a reserved field on fixed, which keeps its member order", { kind: "fixed", nodes: ["b", "a"], reading: "induced", weights: [2, 1] }, "fixed.weights"],
    ["an unknown top-level field on a definition", { kind: "path", meta: { by: "newer" }, nodes: ["a"] }, "path.meta"],
    ["a reserved key on an edge member", { edges: [{ key: "k", source: "a", target: "b" }], kind: "fixed", nodes: [], reading: "listed" }, "edgeMember.key"],
    ["a reserved dataSource on an edge member", { edges: [{ dataSource: "s", id: 1, source: "a", target: "b" }], kind: "fixed", nodes: [], reading: "listed" }, "edgeMember.dataSource"],
    ["a reserved cut on a threshold, as its only cut", { kind: "rule", reading: "clipped", where: { kind: "threshold", path: "data.score", percentile: 0.9 } }, "threshold.percentile"],
    ["a reserved population on a threshold", { kind: "rule", reading: "clipped", where: { kind: "threshold", path: "results.pr.rank", population: "group", top: 3 } }, "threshold.population"],
    ["a reserved op on an item key", { kind: "rule", reading: "clipped", where: { item: { key: { field: "level", op: "le", value: 2 }, run: "kc" }, kind: "item" } }, "itemKey.op"],
    ["a reserved keyed item form", { kind: "rule", reading: "clipped", where: { item: { key: { smallestNode: "a" }, run: "cc" }, kind: "item" } }, "itemKey.smallestNode"],
];

describe("loadSetDefinition, the internal load mode", () => {
    it.each(OPAQUE)("loads %s, flags it opaque and keeps it value-identical", (_what, value, first) => {
        const loaded = loadSetDefinition(value);

        assert.deepEqual(loaded.opaque, { first });
        expect(loaded.definition).toEqual(value);
        expect(canonicalSetDefinition(loaded.definition)).toEqual(value);
        assert.strictEqual(JSON.stringify(canonicalSetDefinition(loaded.definition)), JSON.stringify(loaded.definition));
    });

    it.each(OPAQUE)("refuses %s in door mode", (_what, value) => {
        assert.throws(() => parseSetDefinition(value), /./);
    });

    it("names the first unknown in the order the definition is read", () => {
        const loaded = loadSetDefinition({
            kind: "rule",
            reading: "clipped",
            where: { kind: "any", of: [{ kind: "zeta" }, { kind: "alpha" }] },
        });

        assert.deepEqual(loaded.opaque, { first: "zeta" });
    });

    it("loads known content with no opaque flag, canonicalised", () => {
        const loaded = loadSetDefinition({ kind: "fixed", nodes: ["b", "a"], reading: "clipped" });

        assert.strictEqual(loaded.opaque, undefined);
        expect(loaded.definition).toEqual({ kind: "fixed", nodes: ["a", "b"], reading: "listed" });
    });

    it("loads a stored induced rule with an edges leaf, which reads invalid later rather than failing the load", () => {
        const value: SetDefinition = { kind: "rule", where: { kind: "edges", where: "x" }, reading: "induced" };

        assert.strictEqual(loadSetDefinition(value).opaque, undefined);
    });

    it("still refuses a malformed known node", () => {
        for (const value of [
            { kind: "fixed", nodes: [Number.NaN], reading: "induced" },
            { kind: "path", nodes: ["a", "b"], edges: [] },
            { kind: "rule", reading: "clipped", where: { kind: "range", attribute: "data.x", min: 1, max: 0, op: "le" } },
            { kind: "fixed", nodes: [], edges: [{ source: "a", target: "b", key: "k", id: 1 }], reading: "listed" },
        ]) {
            try {
                loadSetDefinition(value);
                assert.fail(`expected ${JSON.stringify(value)} to be refused`);
            } catch (error) {
                assert.ok(isGraphtyError(error));
                assert.strictEqual(error.code, "E_BAD_COMMAND");
            }
        }
    });
});
