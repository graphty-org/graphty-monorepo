/**
 * @file Edge members across stores: a replacing import rebinds them by stable identity, a
 * different graph leaves them missing, and the binding cases of design/sets/sets-design.md 12.3,
 * including the two for a file that embeds the graph (a store rebuilt from its saved columns).
 */

import { maskToIndices } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import type { EdgeMember, SetDefinition, SetId } from "../../../src/catalog/types";
import { identityColumnsOf } from "../../../src/data/edgeIdentity";
import { type Resolution, resolveFixed } from "../../../src/session/sets/resolve";
import { type EdgeRecord, TestGraph } from "./graphs";

/**
 * Resolve a kept fixed set against the graph's current snapshot.
 * @param graph - The graph.
 * @param id - The set.
 * @param seeded - False resolves as a fresh session would, with no seeds.
 * @returns The resolution.
 */
function resolveSet(graph: TestGraph, id: SetId, seeded = true): Resolution {
    const definition = graph.sets.get(id)?.definition as Extract<SetDefinition, { kind: "fixed" }>;

    return resolveFixed(definition, { snapshot: graph.snapshot() }, seeded ? graph.setsStore.seedsOf(id) : undefined);
}

/**
 * A kept fixed set's edge members.
 * @param graph - The graph.
 * @param id - The set.
 * @returns The members.
 */
function membersOf(graph: TestGraph, id: SetId): readonly EdgeMember[] {
    return (graph.sets.get(id)?.definition as Extract<SetDefinition, { kind: "fixed" }>).edges ?? [];
}

/**
 * The counters a resolution's edges carry, ascending.
 * @param graph - The graph.
 * @param resolution - The resolution.
 * @returns The counters.
 */
function bound(graph: TestGraph, resolution: Resolution): number[] {
    return Array.from(maskToIndices(resolution.edges, graph.snapshot().edgeCount), (e) => graph.counterAt(e)).sort(
        (a, b) => a - b,
    );
}

/**
 * The ordinal and among of the edge carrying a counter.
 * @param graph - The graph.
 * @param counter - The counter.
 * @returns `ordinal/among`.
 */
function ordinalOf(graph: TestGraph, counter: number): string {
    const { edgeOrdinal, edgeAmong } = identityColumnsOf(graph.snapshot());
    const row = graph.rowOf(counter);

    return `${edgeOrdinal[row]}/${edgeAmong[row]}`;
}

/**
 * A set holding the given edges, created through the doors from their session ids.
 * @param graph - The graph.
 * @param counters - The edges.
 * @returns The set.
 */
function setOf(graph: TestGraph, counters: readonly number[]): SetId {
    return graph.sets.create({
        kind: "fixed",
        nodes: [],
        edges: counters.map((c) => graph.edgeId(c)),
        reading: "listed",
    });
}

const FILE: EdgeRecord[] = [
    { s: "a", t: "b" },
    { s: "a", t: "b" },
    { s: "a", t: "b" },
    { s: "b", t: "c", fields: { eid: "bc" } },
    { s: "c", t: "a" },
];

describe("a replacing import", () => {
    it("of the same file rebinds every member by stable identity", () => {
        const graph = new TestGraph();
        graph.path = "eid";
        const first = graph.load(FILE);
        const id = setOf(graph, [first[1], first[3], first[4]]);
        assert.deepStrictEqual(bound(graph, resolveSet(graph, id)), [first[1], first[3], first[4]]);

        graph.replaceStore();
        const second = graph.load(FILE);
        const resolution = resolveSet(graph, id);
        assert.deepStrictEqual(
            bound(graph, resolution),
            [second[1], second[3], second[4]],
            "the same edges, by their new counters",
        );
        assert.strictEqual(resolution.missingEdges, 0);
        assert.notInclude(bound(graph, resolution), second[0]);
    });

    it("of a different graph with identical counts leaves every member missing", () => {
        const graph = new TestGraph();
        const first = graph.load(FILE);
        const id = setOf(graph, first);

        graph.replaceStore();
        graph.load(FILE.map((record) => ({ ...record, s: `${String(record.s)}2`, t: `${String(record.t)}2` })));
        const resolution = resolveSet(graph, id);
        assert.strictEqual(graph.snapshot().edgeCount, FILE.length);
        assert.strictEqual(resolution.edgeCount, 0);
        assert.strictEqual(resolution.missingEdges, membersOf(graph, id).length);
    });
});

describe("the binding cases of design 12.3", () => {
    it("re-importing a source that dropped one of three parallel edges leaves the ordinal members missing", () => {
        const graph = new TestGraph();
        const first = graph.load(FILE);
        const id = setOf(graph, first.slice(0, 3));

        graph.replaceStore();
        const second = graph.load(FILE.slice(1));
        const resolution = resolveSet(graph, id);
        assert.strictEqual(resolution.edgeCount, 0, "none binds a sibling");
        assert.strictEqual(resolution.missingEdges, 3);
        assert.deepStrictEqual(
            [second[0], second[1]].map((c) => ordinalOf(graph, c)),
            ["0/2", "1/2"],
        );
    });

    it("configuring edgeIdPath between save and re-import: the ordinal members still bind", () => {
        const graph = new TestGraph();
        const records: EdgeRecord[] = FILE.map((record, i) => ({ ...record, fields: { eid: `e${i}` } }));
        const first = graph.load(records);
        const id = setOf(graph, [first[0], first[2]]);
        const members = membersOf(graph, id);
        assert.isTrue(
            members.every((member) => member.ordinal !== undefined),
            "no path was configured, so ordinals",
        );

        graph.replaceStore();
        graph.path = "eid";
        const second = graph.load(records);
        const resolution = resolveSet(graph, id);
        assert.deepStrictEqual(bound(graph, resolution), [second[0], second[2]]);
        assert.strictEqual(resolution.missingEdges, 0);
    });

    it("two Add data loads giving one pair an id-less edge each: after a re-import the member is ambiguous", () => {
        const graph = new TestGraph();
        const [one] = graph.load([{ s: "a", t: "b" }]);
        const [two] = graph.load([{ s: "a", t: "b" }]);
        const id = setOf(graph, [one, two]);
        const members = membersOf(graph, id);
        assert.strictEqual(members.length, 1, "both edges have one stable identity");
        assert.deepStrictEqual(bound(graph, resolveSet(graph, id)), [one], "in the session, the edge it came through");

        graph.replaceStore();
        graph.load([{ s: "a", t: "b" }]);
        graph.load([{ s: "a", t: "b" }]);
        const resolution = resolveSet(graph, id);
        assert.strictEqual(resolution.edgeCount, 0, "neither binds");
        assert.strictEqual(resolution.missingEdges, 1);
        assert.strictEqual(resolution.ambiguousEdges, 1);
    });

    it("a second Add data load touching a pair of the first changes none of its ordinals, and its members still bind", () => {
        const graph = new TestGraph();
        const first = graph.load([
            { s: "a", t: "b" },
            { s: "a", t: "b" },
        ]);
        const id = setOf(graph, first);
        const before = first.map((c) => ordinalOf(graph, c));

        const [third] = graph.load([
            { s: "a", t: "b" },
            { s: "b", t: "a" },
        ]);
        assert.deepStrictEqual(
            first.map((c) => ordinalOf(graph, c)),
            before,
        );
        assert.strictEqual(ordinalOf(graph, third), "0/2", "the second load counts its own edges");
        const resolution = resolveSet(graph, id);
        assert.deepStrictEqual(bound(graph, resolution), first);
        assert.strictEqual(resolution.missingEdges, 0);
    });
});

describe("a file that embeds the graph", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        it(`delete one of three parallel edges, reload embedded: the member binds the same edge (shuffle ${seed})`, () => {
            const graph = new TestGraph();
            const first = graph.load(FILE);
            const id = setOf(graph, [first[1]]);
            const revision = graph.sets.get(id)?.revision;
            graph.removeEdge(first[0]);
            graph.snapshot();

            graph.rebuildEmbedded(seed);
            for (const seeded of [true, false]) {
                const resolution = resolveSet(graph, id, seeded);
                assert.deepStrictEqual(bound(graph, resolution), [first[1]], seeded ? "seeded" : "a fresh session");
                assert.strictEqual(resolution.missingEdges, 0);
            }

            assert.strictEqual(graph.sets.get(id)?.revision, revision);
            const [next] = graph.load([{ s: "x", t: "y" }], { asLoad: false });
            assert.isAbove(next, Math.max(...first), "the counter resumed past every restored edge");
        });

        it(`delete ordinal 2 of three, add an edge to the pair, reload embedded: the member stays missing (shuffle ${seed})`, () => {
            const graph = new TestGraph();
            const first = graph.load(FILE);
            const id = setOf(graph, [first[2]]);
            graph.removeEdge(first[2]);
            const [minted] = graph.load([{ s: "a", t: "b" }], { asLoad: false });
            graph.snapshot();

            graph.rebuildEmbedded(seed);
            for (const seeded of [true, false]) {
                const resolution = resolveSet(graph, id, seeded);
                assert.strictEqual(resolution.edgeCount, 0, `never the new edge ${minted}`);
                assert.strictEqual(resolution.missingEdges, 1);
            }
        });
    }
});
