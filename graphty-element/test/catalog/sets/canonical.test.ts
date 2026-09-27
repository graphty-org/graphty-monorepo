import { assert, describe, expect, it } from "vitest";

import { canonicalSetDefinition } from "../../../src/catalog/sets/canonical";
import type { EdgeMember, SetDefinition } from "../../../src/catalog/types";

/** Serialise, so key order is part of what a test compares. */
function json(value: unknown): string {
    return JSON.stringify(value);
}

describe("the canonical form of a set definition", () => {
    it("sorts object keys by UTF-16 code unit, at every level", () => {
        const definition = {
            reading: "listed",
            nodes: ["a"],
            kind: "fixed",
            edges: [{ target: "b", source: "a", id: "x" }],
        } as const;

        assert.strictEqual(
            json(canonicalSetDefinition(definition)),
            '{"edges":[{"id":"x","source":"a","target":"b"}],"kind":"fixed","nodes":["a"],"reading":"listed"}',
        );
        assert.strictEqual(
            json(canonicalSetDefinition({ reading: "clipped", where: { where: "q", kind: "edges" }, kind: "rule" })),
            '{"kind":"rule","reading":"clipped","where":{"kind":"edges","where":"q"}}',
        );
    });

    it("omits absent optional fields, an empty edge list and a default direction", () => {
        const withUndefined = { kind: "path", nodes: ["a", "b"], edges: undefined, directed: undefined };

        assert.strictEqual(
            json(canonicalSetDefinition(withUndefined as unknown as SetDefinition)),
            '{"kind":"path","nodes":["a","b"]}',
        );
        assert.strictEqual(json(canonicalSetDefinition({ kind: "path", nodes: ["a"], directed: false })), '{"kind":"path","nodes":["a"]}');
        assert.strictEqual(
            json(canonicalSetDefinition({ kind: "fixed", nodes: [1], edges: [], reading: "induced" })),
            '{"kind":"fixed","nodes":[1],"reading":"induced"}',
        );
        assert.strictEqual(json(canonicalSetDefinition({ kind: "path", nodes: ["a"], directed: true })), '{"directed":true,"kind":"path","nodes":["a"]}');
    });

    it("keeps a path step's null, which means every edge between that pair", () => {
        const out = canonicalSetDefinition({
            kind: "path",
            nodes: ["a", "b", "c"],
            edges: [null, { source: "b", target: "c", id: 7 }],
        });

        assert.strictEqual(json(out), '{"edges":[null,{"id":7,"source":"b","target":"c"}],"kind":"path","nodes":["a","b","c"]}');
    });

    it("sorts node members numbers first, then strings by code unit, keeping 1 and \"1\" and dropping duplicates", () => {
        const out = canonicalSetDefinition({
            kind: "fixed",
            nodes: ["b", 10, "a", 2, "1", 2, "b", "Z", "\uFFFF", "\u{1F600}", -0],
            reading: "induced",
        });

        assert.ok(out.kind === "fixed");
        // "\u{1F600}" sorts before "\uFFFF": code units, not code points.
        expect(out.nodes).toEqual([0, 2, 10, "1", "Z", "a", "b", "\u{1F600}", "\uFFFF"]);
        assert.ok(Object.is(out.nodes[0], 0), "-0 is stored as +0");
    });

    it("sorts edge members by (source, target, id, key, ordinal, among), absent before present, and drops duplicates", () => {
        const members: EdgeMember[] = [
            { source: "b", target: "a", id: 1 },
            { source: "a", target: "b", ordinal: 1, among: 2 },
            { source: "a", target: "b", id: "x" },
            { source: "a", target: "b", ordinal: 0, among: 2 },
            { source: "a", target: "b", id: 3 },
            { source: "a", target: 5, id: "x" },
            { source: "a", target: "b", id: "x" },
        ];
        const out = canonicalSetDefinition({ kind: "fixed", nodes: [], edges: members, reading: "listed" });

        assert.ok(out.kind === "fixed");
        expect(out.edges).toEqual([
            { source: "a", target: 5, id: "x" },
            // No id: absent sorts before present.
            { source: "a", target: "b", ordinal: 0, among: 2 },
            { source: "a", target: "b", ordinal: 1, among: 2 },
            { source: "a", target: "b", id: 3 },
            { source: "a", target: "b", id: "x" },
            { source: "b", target: "a", id: 1 },
        ]);
    });

    it("keeps a path's node and step order, and sorts each step's edge group", () => {
        const out = canonicalSetDefinition({
            kind: "path",
            nodes: ["c", "a", "c"],
            edges: [
                [
                    { source: "c", target: "a", id: "z" },
                    { source: "a", target: "c", id: "y" },
                    { source: "c", target: "a", id: "z" },
                ],
                { source: "a", target: "c", id: "y" },
            ],
        });

        assert.ok(out.kind === "path");
        expect(out.nodes).toEqual(["c", "a", "c"]);
        expect(out.edges).toEqual([
            [
                { source: "a", target: "c", id: "y" },
                { source: "c", target: "a", id: "z" },
            ],
            { source: "a", target: "c", id: "y" },
        ]);
    });

    it("keeps the operand order of all and any, because the user wrote it", () => {
        const out = canonicalSetDefinition({
            kind: "rule",
            reading: "clipped",
            where: {
                kind: "any",
                of: [
                    { kind: "degree", min: 5 },
                    { kind: "all", of: [{ kind: "edges", where: "b" }, { kind: "expression", where: "a" }] },
                ],
            },
        });

        assert.strictEqual(
            json(out),
            '{"kind":"rule","reading":"clipped","where":{"kind":"any","of":[{"kind":"degree","min":5},' +
                '{"kind":"all","of":[{"kind":"edges","where":"b"},{"kind":"expression","where":"a"}]}]}}',
        );
    });

    it("turns a one-leaf expression tree into the bare query", () => {
        const out = canonicalSetDefinition({ kind: "rule", reading: "induced", where: { kind: "expression", where: "data.x > 1" } });

        assert.strictEqual(json(out), '{"kind":"rule","reading":"induced","where":"data.x > 1"}');
    });

    it("stores a fixed set's clipped reading as listed, which holds the same members", () => {
        const input = { kind: "fixed", nodes: ["a"], reading: "clipped" } as unknown as SetDefinition;

        assert.strictEqual(json(canonicalSetDefinition(input)), '{"kind":"fixed","nodes":["a"],"reading":"listed"}');
    });

    it("leaves unknown kinds exactly as they are, key order included", () => {
        const unknownDefinition = { zeta: [3, 1, 2], kind: "acme:bag", alpha: { b: 1, a: 2 } };
        const out = canonicalSetDefinition(unknownDefinition as unknown as SetDefinition);

        assert.strictEqual(json(out), json(unknownDefinition));

        const unknownLeaf = { z: [2, 1], kind: "acme:fuzzy", a: 1 };
        const rule = canonicalSetDefinition({
            kind: "rule",
            reading: "clipped",
            where: { kind: "all", of: [unknownLeaf as never, { kind: "degree", min: 1 }] },
        });

        assert.strictEqual(
            json(rule),
            `{"kind":"rule","reading":"clipped","where":{"kind":"all","of":[${json(unknownLeaf)},{"kind":"degree","min":1}]}}`,
        );
    });

    it("keeps a fixed set's member order when it carries a field this element does not know", () => {
        // A newer element's parallel array (such as weights) must never be left misaligned.
        const input = { kind: "fixed", nodes: ["b", "a"], weights: [0.2, 0.1], reading: "induced" };
        const out = canonicalSetDefinition(input as unknown as SetDefinition);

        assert.strictEqual(json(out), '{"kind":"fixed","nodes":["b","a"],"reading":"induced","weights":[0.2,0.1]}');
    });

    it("does not modify its input", () => {
        const input: SetDefinition = { kind: "fixed", nodes: ["b", "a"], reading: "induced" };

        canonicalSetDefinition(input);
        expect(input.nodes).toEqual(["b", "a"]);
    });
});
