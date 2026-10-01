import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { canonicalSetDefinition } from "../../../src/catalog/sets/canonical";
import { loadSetDefinition } from "../../../src/catalog/sets/parse";
import type { EdgeMember, NodeId, SetDefinition } from "../../../src/catalog/types";
import { fcParams } from "../../helpers/fc-params";

// Small alphabets, so duplicates and ties between members are common.
const nodeId: fc.Arbitrary<NodeId> = fc.oneof(
    fc.integer({ min: -3, max: 3 }),
    fc.constantFrom(0.5, 1e21, -2.25),
    fc.constantFrom("a", "b", "1", "Z", "\uFFFF", "\u{1F600}", ""),
);

const edgeMember: fc.Arbitrary<EdgeMember> = fc.oneof(
    fc.record({
        source: nodeId,
        target: nodeId,
        id: fc.oneof(fc.integer({ min: 0, max: 3 }), fc.constantFrom("x", "y")),
    }),
    fc
        .record({ source: nodeId, target: nodeId, among: fc.integer({ min: 1, max: 3 }), shift: fc.nat(2) })
        .map(({ source, target, among, shift }) => ({ source, target, among, ordinal: shift % among })),
);

const query = fc.constantFrom("data.x > 1", "degree >= 2", "algorithmResults.pr.score > 0.1");

// A leaf this element does not know, as a plugin would write it.
const opaqueLeaf = fc.record({ kind: fc.constantFrom("acme:fuzzy", "fuzzy"), score: fc.integer({ min: 0, max: 9 }) });

const { tree } = fc.letrec<{ tree: unknown }>((tie) => ({
    tree: fc.oneof(
        { depthSize: "small", maxDepth: 4 },
        query.map((where) => ({ kind: "expression", where })),
        query.map((where) => ({ kind: "edges", where })),
        fc.record(
            { kind: fc.constant("range"), attribute: fc.constant("data.x"), min: fc.integer({ min: 0, max: 5 }) },
            { requiredKeys: ["kind", "attribute"] },
        ),
        fc.record({
            kind: fc.constant("categories"),
            attribute: fc.constant("data.t"),
            values: fc.array(fc.constantFrom("a", "b"), { maxLength: 3 }),
        }),
        fc.record(
            { kind: fc.constant("degree"), min: fc.nat(4), direction: fc.constantFrom("in", "out", "all") },
            { requiredKeys: ["kind"] },
        ),
        fc.record({ kind: fc.constant("component"), id: fc.nat(3) }),
        fc.record({ kind: fc.constant("neighborhood"), seeds: fc.array(nodeId, { maxLength: 3 }), depth: fc.nat(2) }),
        opaqueLeaf,
        fc.record({ kind: fc.constantFrom("all", "any"), of: fc.array(tie("tree"), { maxLength: 3 }) }),
        fc.record({ kind: fc.constant("not"), of: tie("tree") }),
    ),
}));

const fixed = fc.record(
    {
        kind: fc.constant("fixed"),
        nodes: fc.array(nodeId, { maxLength: 12 }),
        edges: fc.array(edgeMember, { maxLength: 8 }),
        reading: fc.constantFrom("induced", "listed", "clipped"),
    },
    { requiredKeys: ["kind", "nodes", "reading"] },
);

const rule = fc.record({
    kind: fc.constant("rule"),
    where: fc.oneof(query, tree),
    reading: fc.constantFrom("induced", "listed", "clipped"),
});

const path = fc.array(nodeId, { minLength: 1, maxLength: 6 }).chain((nodes) =>
    fc.record(
        {
            kind: fc.constant("path"),
            nodes: fc.constant(nodes),
            edges: fc.array(
                fc.oneof(fc.constant(null), edgeMember, fc.array(edgeMember, { minLength: 1, maxLength: 3 })),
                {
                    minLength: nodes.length - 1,
                    maxLength: nodes.length - 1,
                },
            ),
            directed: fc.boolean(),
        },
        { requiredKeys: ["kind", "nodes"] },
    ),
);

const opaqueDefinition = fc.record({ kind: fc.constant("acme:bag"), items: fc.array(fc.nat(9), { maxLength: 4 }) });

const definition = fc.oneof(fixed, rule, path, opaqueDefinition) as unknown as fc.Arbitrary<SetDefinition>;

/**
 * The same definition with every member array shuffled by a seeded permutation.
 * @param value - A definition.
 * @param pick - A seeded integer in [min, max].
 * @returns The shuffled copy.
 */
function permuteMembers(value: SetDefinition, pick: (min: number, max: number) => number): SetDefinition {
    const shuffle = <T>(items: readonly T[]): T[] => {
        const out = [...items];
        for (let i = out.length - 1; i > 0; i--) {
            const j = pick(0, i);
            [out[i], out[j]] = [out[j], out[i]];
        }

        return out;
    };

    if (value.kind === "fixed") {
        return {
            ...value,
            nodes: shuffle(value.nodes),
            ...(value.edges === undefined ? {} : { edges: shuffle(value.edges) }),
        };
    }

    if (value.kind === "path" && value.edges !== undefined) {
        return {
            ...value,
            edges: value.edges.map((step) => (Array.isArray(step) ? shuffle(step as readonly EdgeMember[]) : step)),
        };
    }

    return value;
}

describe("the canonical form, over generated definitions", () => {
    it("is idempotent", () => {
        fc.assert(
            fc.property(definition, (value) => {
                const once = canonicalSetDefinition(value);

                expect(JSON.stringify(canonicalSetDefinition(once))).toBe(JSON.stringify(once));
            }),
            fcParams(1000),
        );
    });

    it("does not change when member arrays are permuted", () => {
        fc.assert(
            fc.property(definition, fc.gen(), (value, gen) => {
                const pick = (min: number, max: number): number => gen(fc.integer, { min, max });

                expect(JSON.stringify(canonicalSetDefinition(permuteMembers(value, pick)))).toBe(
                    JSON.stringify(canonicalSetDefinition(value)),
                );
            }),
            fcParams(1000),
        );
    });

    it("survives a JSON round trip through the loader unchanged", () => {
        fc.assert(
            fc.property(definition, (value) => {
                const canonical = canonicalSetDefinition(value);
                const loaded = loadSetDefinition(JSON.parse(JSON.stringify(canonical)));

                expect(loaded.definition).toEqual(canonical);
                expect(JSON.stringify(loaded.definition)).toBe(JSON.stringify(canonical));
            }),
            fcParams(1000),
        );
    });
});
