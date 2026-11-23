import { assert, describe, expect, it } from "vitest";

import { parseScope, parseSetDefinition } from "../../../catalog";
import { isGraphtyError } from "../../../src/errors";

/**
 * Hand a value to the published door-mode validator and return what it refused with.
 * @param value - A candidate set definition.
 * @returns The refusal's code and details.
 */
function refusal(value: unknown): { code: string; details: Readonly<Record<string, unknown>> } {
    let thrown: unknown;
    try {
        parseSetDefinition(value);
    } catch (error) {
        thrown = error;
    }

    assert.ok(isGraphtyError(thrown), `expected ${JSON.stringify(value)} to be refused with a GraphtyError`);

    return thrown;
}

/**
 * A rule set over one tree.
 * @param where - The rule tree.
 * @returns The definition.
 */
const rule = (where: unknown): unknown => ({ kind: "rule", where, reading: "clipped" });

/**
 * A rule set holding one union with one branch of the given steps.
 * @param steps - The branch's steps.
 * @param branch - More branch fields.
 * @returns The definition.
 */
const union = (steps: unknown, branch: Record<string, unknown> = {}): unknown =>
    rule({ kind: "union", side: "nodes", within: "graph", branches: [{ start: "none", steps, ...branch }] });

/**
 * A union whose one step's rule is the given leaf.
 * @param leaf - The step's rule.
 * @returns The definition.
 */
const inStep = (leaf: unknown): unknown => union([{ op: "add", rule: leaf }]);

const item = (value: unknown): unknown => rule({ kind: "item", item: value });
const text = (fields: Record<string, unknown>): unknown =>
    rule({ kind: "text", reads: "id", mode: "exact", text: "a", ...fields });
const bySize = (fields: Record<string, unknown>): unknown => rule({ kind: "by-size", path: "data.t", ...fields });
const measure = (fields: Record<string, unknown>): unknown =>
    inStep({ kind: "measure", algorithm: "degree", field: "degree", ...fields });

/** Each refusal, as [what it is, the definition, the detail key that names the bad part]. */
const REFUSED: readonly (readonly [string, unknown, string])[] = [
    // Edge members and items
    [
        "an edge member key that is an object",
        { kind: "fixed", nodes: [], edges: [{ source: "a", target: "b", key: {} }], reading: "listed" },
        "member",
    ],
    ["an item that is not an object", item(3), "item"],
    ["an item key that is not an object", item({ result: "r", key: 3 }), "key"],
    ["an empty item key", item({ result: "r", key: {} }), "name"],
    ["an item key with an empty field", item({ result: "r", key: { field: "", value: 1 } }), "key"],
    // Threshold
    ["a threshold path that is a number", rule({ kind: "threshold", path: 3, top: 1 }), "path"],
    [
        "a threshold path that reads an end but no field",
        rule({ kind: "threshold", path: "graphty.source.data.x", top: 1 }),
        "path",
    ],
    ["a percentile above 100", rule({ kind: "threshold", path: "data.x", percentile: 101 }), "percentile"],
    ["a threshold from that is unknown", rule({ kind: "threshold", path: "data.x", top: 1, from: "mid" }), "from"],
    [
        "a threshold within that is unknown",
        rule({ kind: "threshold", path: "data.x", top: 1, within: "all" }),
        "within",
    ],
    // Text
    ["a text leaf with nodes that are unknown", text({ nodes: "some" }), "nodes"],
    ["a text leaf with an unknown mode", text({ mode: "fuzzy" }), "name"],
    ["a text leaf whose text is a number", text({ text: 3 }), "text"],
    ["a text leaf whose caseSensitive is text", text({ caseSensitive: "yes" }), "caseSensitive"],
    // Other leaves
    ["a source leaf with an unknown side", rule({ kind: "source", sources: ["a"], side: "both" }), "side"],
    ["a range compared as a date", rule({ kind: "range", attribute: "data.x", min: 1, as: "date" }), "as"],
    [
        "a range missing that is unknown",
        rule({ kind: "range", attribute: "data.x", min: 1, missing: "drop" }),
        "missing",
    ],
    [
        "a categories match that is unknown",
        rule({ kind: "categories", attribute: "data.t", values: ["a"], match: "most" }),
        "match",
    ],
    // By-size
    ["a by-size path with no field", bySize({ path: "data." }), "path"],
    ["a by-size top that is a fraction", bySize({ top: 1.5 }), "top"],
    ["a by-size cut by top and min", bySize({ top: 1, min: 2 }), "top"],
    ["a by-size ties that is unknown", bySize({ top: 1, ties: "some" }), "ties"],
    // Measure
    ["a measure with no algorithm", measure({ algorithm: "" }), "algorithm"],
    ["a measure with no field", measure({ field: "" }), "field"],
    ["a measure whose params are a number", measure({ params: 3 }), "params"],
    ["a measure whose bind is a number", measure({ bind: 3 }), "bind"],
    ["a measure whose test is a number", measure({ test: 3 }), "test"],
    ["a measure whose test kind is unknown", measure({ test: { kind: "fuzzy" } }), "test"],
    // Step leaves
    ["a hops max below 0", inStep({ kind: "hops", max: -1 }), "max"],
    ["a hops direction that is unknown", inStep({ kind: "hops", direction: "up" }), "direction"],
    ["a touching with unknown ends", inStep({ kind: "touching", ends: "none" }), "ends"],
    // Union
    ["a union with an unknown side", rule({ kind: "union", side: "both", within: "graph", branches: [] }), "side"],
    ["a union with no within", rule({ kind: "union", side: "nodes", branches: [] }), "within"],
    [
        "a union whose branches are not a list",
        rule({ kind: "union", side: "nodes", within: "graph", branches: {} }),
        "branches",
    ],
    [
        "a union branch that is not an object",
        rule({ kind: "union", side: "nodes", within: "graph", branches: [3] }),
        "branch",
    ],
    [
        "two union branches with one id",
        rule({
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [
                { id: "b", start: "none", steps: [] },
                { id: "b", start: "none", steps: [] },
            ],
        }),
        "id",
    ],
    ["a union branch start that is unknown", union([], { start: "some" }), "start"],
    ["a union branch whose steps are not a list", union({}), "steps"],
    ["a union branch whose on is text", union([], { on: "yes" }), "on"],
    ["a union branch whose name is a number", union([], { name: 3 }), "name"],
    ["a union step that is not an object", union([3]), "step"],
    ["a union step with an unknown op", union([{ op: "drop", rule: { kind: "degree" } }]), "op"],
    // A step's links
    [
        "links whose all holds a non-object",
        union([{ op: "add", rule: { kind: "degree" }, links: { kind: "all", of: [3] } }]),
        "node",
    ],
    [
        "links whose any operands are not a list",
        union([{ op: "add", rule: { kind: "degree" }, links: { kind: "any", of: "x" } }]),
        "of",
    ],
    [
        "links that negate a node-only leaf",
        union([{ op: "add", rule: { kind: "degree" }, links: { kind: "not", of: { kind: "degree" } } }]),
        "reason",
    ],
];

describe("parseSetDefinition refuses each malformed leaf by name", () => {
    it.each(REFUSED)("refuses %s with E_BAD_COMMAND", (_what, value, part) => {
        const error = refusal(value);

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.ok(part in error.details, `details ${JSON.stringify(error.details)} name ${part}`);
    });

    it("says links that negate a node-only leaf do not speak edges", () => {
        const error = refusal(
            union([{ op: "add", rule: { kind: "degree" }, links: { kind: "not", of: { kind: "degree" } } }]),
        );

        expect(error.details).toEqual({ reason: "links-not-edges", kind: "degree" });
    });

    it("accepts a union step that measures with bound references and a test, and returns it unchanged", () => {
        const where = {
            kind: "union",
            side: "nodes",
            within: "graph",
            branches: [
                {
                    id: "b",
                    start: "none",
                    steps: [
                        {
                            id: "s",
                            op: "add",
                            rule: {
                                kind: "measure",
                                algorithm: "pagerank",
                                field: "score",
                                params: { damping: 0.85 },
                                bind: { seeds: "so-far", sources: { set: "core" } },
                                test: { kind: "threshold", top: 3, from: "low", missing: "exclude" },
                            },
                        },
                        { op: "keep", rule: { kind: "hops", of: "hovered-or-selected", max: 2, direction: "out" } },
                    ],
                },
            ],
        };

        expect(parseSetDefinition({ kind: "rule", where, reading: "clipped" })).toEqual({
            kind: "rule",
            where,
            reading: "clipped",
        });
    });

    it("accepts by-size and categories with every option they take", () => {
        for (const where of [
            { kind: "by-size", path: "data.t", top: 2, ties: "all", from: "low" },
            { kind: "categories", attribute: "data.t", values: ["a"], match: "all", missing: "exclude" },
        ]) {
            expect(parseSetDefinition(rule(where))).toEqual(rule(where));
        }
    });

    it("refuses a scope whose inline definition is malformed, as the definition door does", () => {
        let thrown: unknown;
        try {
            parseScope({ define: text({ caseSensitive: 1 }) });
        } catch (error) {
            thrown = error;
        }

        assert.ok(isGraphtyError(thrown));
        assert.strictEqual(thrown.code, "E_BAD_COMMAND");
        assert.deepStrictEqual(thrown.details, { caseSensitive: 1 });
    });
});
