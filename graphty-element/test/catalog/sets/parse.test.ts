import { assert, describe, expect, it } from "vitest";

import * as catalogEntry from "../../../catalog";
import * as sessionEntry from "../../../session";
import { parseSetDefinition } from "../../../src/catalog/sets/parse";
import { isGraphtyError } from "../../../src/errors";

/**
 * Run the door-mode validator and return the refusal it threw.
 * @param value - What a caller handed a door.
 * @returns The error.
 */
function refusal(value: unknown): { code: string; details: Readonly<Record<string, unknown>>; message: string } {
    let thrown: unknown;
    try {
        parseSetDefinition(value);
    } catch (error) {
        thrown = error;
    }

    assert.ok(isGraphtyError(thrown), `expected ${JSON.stringify(value)} to be refused with a GraphtyError`);

    return thrown;
}

const member = { source: "a", target: "b", id: "x" };

/** Every refusal that needs no graph, as [what it is, the value]. */
const REFUSED: readonly (readonly [string, unknown])[] = [
    // The definition itself
    ["not an object", "fixed"],
    ["null", null],
    ["an array", []],
    ["no kind", { nodes: [], reading: "induced" }],
    ["a kind that is not a string", { kind: 3, nodes: [], reading: "induced" }],
    ["an unknown kind", { kind: "bag", nodes: [] }],
    ["a plugin kind", { kind: "acme:bag", nodes: [] }],
    ["an unknown field", { kind: "fixed", nodes: [], reading: "induced", colour: "red" }],
    ["a reserved weights on fixed", { kind: "fixed", nodes: ["a"], reading: "induced", weights: [1] }],
    ["a reserved within on a rule", { kind: "rule", where: "x", reading: "clipped", within: "visible" }],
    ["a reserved dataSource on a definition", { kind: "fixed", nodes: [], reading: "induced", dataSource: "s" }],
    // Fixed
    ["fixed without nodes", { kind: "fixed", reading: "induced" }],
    ["fixed nodes not an array", { kind: "fixed", nodes: "a", reading: "induced" }],
    ["a node id that is an object", { kind: "fixed", nodes: [{}], reading: "induced" }],
    ["a node id that is NaN", { kind: "fixed", nodes: [Number.NaN], reading: "induced" }],
    ["a node id that is infinite", { kind: "fixed", nodes: [Number.POSITIVE_INFINITY], reading: "induced" }],
    ["a node id that is -infinite", { kind: "fixed", nodes: [Number.NEGATIVE_INFINITY], reading: "induced" }],
    ["fixed without a reading", { kind: "fixed", nodes: [] }],
    ["an unknown reading", { kind: "fixed", nodes: [], reading: "all" }],
    ["fixed edges not an array", { kind: "fixed", nodes: [], edges: member, reading: "listed" }],
    ["a session EdgeId where a stable member is needed", { kind: "fixed", nodes: [], edges: ["e1"], reading: "listed" }],
    // Edge members
    ["an edge member with neither id, key nor ordinal", { kind: "fixed", nodes: [], edges: [{ source: "a", target: "b" }], reading: "listed" }],
    ["an edge member with both id and ordinal", { kind: "fixed", nodes: [], edges: [{ ...member, ordinal: 0, among: 1 }], reading: "listed" }],
    ["an edge member with both id and key", { kind: "fixed", nodes: [], edges: [{ ...member, key: "k" }], reading: "listed" }],
    ["an edge member with a key, which is reserved", { kind: "fixed", nodes: [], edges: [{ source: "a", target: "b", key: "k" }], reading: "listed" }],
    ["ordinal without among", { kind: "fixed", nodes: [], edges: [{ source: "a", target: "b", ordinal: 0 }], reading: "listed" }],
    ["among without ordinal", { kind: "fixed", nodes: [], edges: [{ ...member, among: 2 }], reading: "listed" }],
    ["an ordinal that is not a whole number", { kind: "fixed", nodes: [], edges: [{ source: "a", target: "b", ordinal: 0.5, among: 2 }], reading: "listed" }],
    ["an ordinal at or past among", { kind: "fixed", nodes: [], edges: [{ source: "a", target: "b", ordinal: 2, among: 2 }], reading: "listed" }],
    ["a negative ordinal", { kind: "fixed", nodes: [], edges: [{ source: "a", target: "b", ordinal: -1, among: 2 }], reading: "listed" }],
    ["an edge id that is NaN", { kind: "fixed", nodes: [], edges: [{ source: "a", target: "b", id: Number.NaN }], reading: "listed" }],
    ["an edge member missing its target", { kind: "fixed", nodes: [], edges: [{ source: "a", id: "x" }], reading: "listed" }],
    ["an edge member with a reserved dataSource", { kind: "fixed", nodes: [], edges: [{ ...member, dataSource: "s" }], reading: "listed" }],
    ["an edge member with an unknown field", { kind: "fixed", nodes: [], edges: [{ ...member, weight: 2 }], reading: "listed" }],
    // Rule
    ["a rule without where", { kind: "rule", reading: "clipped" }],
    ["a rule with a blank query", { kind: "rule", where: "  ", reading: "clipped" }],
    ["a rule without a reading", { kind: "rule", where: "x" }],
    ["a rule leaf that is not an object", { kind: "rule", where: 3, reading: "clipped" }],
    ["an unknown leaf", { kind: "rule", where: { kind: "fuzzy" }, reading: "clipped" }],
    ["a plugin leaf", { kind: "rule", where: { kind: "acme:fuzzy" }, reading: "clipped" }],
    ["a leaf with an unknown field", { kind: "rule", where: { kind: "range", attribute: "data.x", min: 1, op: "le" }, reading: "clipped" }],
    ["an expression leaf with a blank query", { kind: "rule", where: { kind: "expression", where: "" }, reading: "clipped" }],
    ["a range with no attribute", { kind: "rule", where: { kind: "range", min: 1 }, reading: "clipped" }],
    ["a range bound that is NaN", { kind: "rule", where: { kind: "range", attribute: "data.x", min: Number.NaN }, reading: "clipped" }],
    ["a range bound that is infinite", { kind: "rule", where: { kind: "range", attribute: "data.x", max: Number.POSITIVE_INFINITY }, reading: "clipped" }],
    ["a range with min above max", { kind: "rule", where: { kind: "range", attribute: "data.x", min: 2, max: 1 }, reading: "clipped" }],
    ["categories that are not a list of strings", { kind: "rule", where: { kind: "categories", attribute: "data.t", values: [1] }, reading: "clipped" }],
    ["a degree direction that is unknown", { kind: "rule", where: { kind: "degree", direction: "up" }, reading: "clipped" }],
    ["a component id that is not a whole number", { kind: "rule", where: { kind: "component", id: 1.5 }, reading: "clipped" }],
    ["a neighbourhood with a negative depth", { kind: "rule", where: { kind: "neighborhood", seeds: ["a"], depth: -1 }, reading: "clipped" }],
    ["a neighbourhood with a NaN seed", { kind: "rule", where: { kind: "neighborhood", seeds: [Number.NaN], depth: 1 }, reading: "clipped" }],
    ["an all whose operands are not a list", { kind: "rule", where: { kind: "all", of: { kind: "degree" } }, reading: "clipped" }],
    ["a not with a malformed operand", { kind: "rule", where: { kind: "not", of: { kind: "range" } }, reading: "clipped" }],
    // Path
    ["a path with no nodes", { kind: "path", nodes: [] }],
    ["a path whose edges are one too many", { kind: "path", nodes: ["a", "b"], edges: [null, null] }],
    ["a path whose edges are one too few", { kind: "path", nodes: ["a", "b", "c"], edges: [null] }],
    ["a path with edges on a single node", { kind: "path", nodes: ["a"], edges: [null] }],
    ["a path step that is an empty group", { kind: "path", nodes: ["a", "b"], edges: [[]] }],
    ["a path step that is a malformed member", { kind: "path", nodes: ["a", "b"], edges: [{ source: "a", target: "b" }] }],
    ["a path directed that is not a boolean", { kind: "path", nodes: ["a"], directed: "yes" }],
    ["a path with a reading", { kind: "path", nodes: ["a"], reading: "listed" }],
];

describe("parseSetDefinition, the door-mode validator", () => {
    it.each(REFUSED)("refuses %s with E_BAD_COMMAND", (_what, value) => {
        const error = refusal(value);

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.ok(error.message.length > 0);
    });

    it("refuses a rule read induced that holds an edges leaf, with reason induced-edge-leaf", () => {
        for (const where of [
            { kind: "edges", where: "data.w > 1" },
            { kind: "any", of: [{ kind: "degree", min: 1 }, { kind: "not", of: { kind: "edges", where: "x" } }] },
        ]) {
            const error = refusal({ kind: "rule", where, reading: "induced" });

            assert.strictEqual(error.code, "E_BAD_COMMAND");
            assert.strictEqual(error.details.reason, "induced-edge-leaf");
        }
    });

    it("names the reserved field it refused, so a caller knows what this element does not read yet", () => {
        assert.strictEqual(refusal({ kind: "rule", where: "x", reading: "clipped", within: "visible" }).details.field, "rule.within");
        assert.strictEqual(refusal({ kind: "fixed", nodes: [], edges: [{ source: "a", target: "b", key: 1 }], reading: "listed" }).details.field, "edgeMember.key");
    });

    it("accepts every well-formed definition and returns its canonical form", () => {
        expect(parseSetDefinition({ reading: "clipped", nodes: ["b", "a", "a"], kind: "fixed" })).toEqual({
            kind: "fixed",
            nodes: ["a", "b"],
            reading: "listed",
        });
        expect(
            parseSetDefinition({
                kind: "fixed",
                nodes: [-0, 1],
                edges: [
                    { source: "a", target: "b", ordinal: 0, among: 1 },
                    { source: 1, target: 2, id: 9 },
                ],
                reading: "induced",
            }),
        ).toEqual({
            kind: "fixed",
            nodes: [0, 1],
            edges: [
                { source: 1, target: 2, id: 9 },
                { source: "a", target: "b", ordinal: 0, among: 1 },
            ],
            reading: "induced",
        });
        expect(parseSetDefinition({ kind: "rule", where: { kind: "expression", where: "q" }, reading: "induced" })).toEqual({
            kind: "rule",
            where: "q",
            reading: "induced",
        });
        const tree = {
            kind: "all",
            of: [
                { kind: "range", attribute: "data.x", min: 0, max: 1 },
                { kind: "categories", attribute: "data.t", values: ["a"] },
                { kind: "degree", min: 1, direction: "in" },
                { kind: "component", id: 0 },
                { kind: "neighborhood", seeds: ["a", 2], depth: 0 },
                { kind: "not", of: { kind: "edges", where: "data.w > 1" } },
                { kind: "any", of: [] },
            ],
        };
        expect(parseSetDefinition({ kind: "rule", where: tree, reading: "clipped" })).toEqual({ kind: "rule", where: tree, reading: "clipped" });
        expect(parseSetDefinition({ kind: "rule", where: tree, reading: "listed" })).toEqual({ kind: "rule", where: tree, reading: "listed" });
        expect(parseSetDefinition({ kind: "path", nodes: ["a"] })).toEqual({ kind: "path", nodes: ["a"] });
        expect(
            parseSetDefinition({
                kind: "path",
                nodes: ["a", "b", "a"],
                edges: [null, [{ source: "b", target: "a", id: 2 }, { source: "a", target: "b", id: 1 }]],
                directed: true,
            }),
        ).toEqual({
            kind: "path",
            nodes: ["a", "b", "a"],
            edges: [null, [{ source: "a", target: "b", id: 1 }, { source: "b", target: "a", id: 2 }]],
            directed: true,
        });
    });

    it("treats a field whose value is undefined as absent", () => {
        expect(parseSetDefinition({ kind: "path", nodes: ["a"], edges: undefined, extra: undefined })).toEqual({ kind: "path", nodes: ["a"] });
    });
});

describe("where parseSetDefinition is published", () => {
    it("is the same function from ./catalog and ./session", () => {
        assert.strictEqual(catalogEntry.parseSetDefinition, parseSetDefinition);
        assert.strictEqual(sessionEntry.parseSetDefinition, parseSetDefinition);
    });
});
