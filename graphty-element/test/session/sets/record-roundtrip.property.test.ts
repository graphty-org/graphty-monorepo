/**
 * @file A stored record survives JSON into a fresh session (design/sets/sets-design.md sections
 * 12 and 12.3): the store's `toLogicalRecords()` exported, `JSON.stringify`, `JSON.parse`, and
 * `loadLogicalRecords()` into a new session over the same graph, loaded with node order and pair
 * order shuffled (the order within a pair kept, since ordinals depend on it) and the edge counter
 * started elsewhere. Ids, names, order, canonical definitions and revisions are identical;
 * resolutions are equal as id sets; the register and tombstones survive. Opaque records (an
 * unknown leaf, an unknown field, an unknown top-level field) round-trip value-identical.
 */

import { maskToIndices } from "@graphty/graph-format";
import fc from "fast-check";
import { assert, describe, it } from "vitest";

import { compareIds } from "../../../src/catalog/sets/canonical";
import type { EdgeId, NodeId, Query, SetDefinitionInput } from "../../../src/catalog/types";
import { identityColumnsOf, resumeEdgeCounter } from "../../../src/data/edgeIdentity";
import { isGraphtyError } from "../../../src/errors";
import { resolveSet } from "../../../src/session/sets/cache";
import { loadRecord } from "../../../src/session/sets/prepare";
import type { Resolution } from "../../../src/session/sets/resolve";
import { fcParams } from "../../helpers/fc-params";
import { type EdgeRecord, TestGraph } from "./graphs";
import { plant } from "./plant";

const NODES: readonly NodeId[] = ["a", "b", "c", "d", 1, 2, "1"];

/** One generated session. */
interface Session {
    /** Edge endpoints as node picks, and whether each carries a file id. */
    readonly edges: readonly { s: number; t: number; withId: boolean }[];
    /** Set operations, drawn as numbers the run interprets against the graph. */
    readonly ops: readonly { kind: number; picks: readonly number[]; reading: boolean }[];
    /** Whether the source session reads file ids; the target always does in the variant. */
    readonly sourcePath: boolean;
    readonly seed: number;
    readonly counterStart: number;
}

const session: fc.Arbitrary<Session> = fc.record({
    edges: fc.array(fc.record({ s: fc.nat(NODES.length - 1), t: fc.nat(NODES.length - 1), withId: fc.boolean() }), {
        minLength: 1,
        maxLength: 14,
    }),
    ops: fc.array(
        fc.record({
            kind: fc.nat(9),
            picks: fc.array(fc.nat(40), { minLength: 1, maxLength: 5 }),
            reading: fc.boolean(),
        }),
        { maxLength: 10 },
    ),
    sourcePath: fc.boolean(),
    seed: fc.integer({ min: 1, max: 0x7fffffff }),
    counterStart: fc.integer({ min: 1, max: 10_000 }),
});

/**
 * The records a generated graph loads.
 * @param edges - The generated edges.
 * @returns One record per edge; an id-bearing one carries a unique `eid`.
 */
function recordsOf(edges: Session["edges"]): EdgeRecord[] {
    return edges.map((edge, i) => ({
        s: NODES[edge.s],
        t: NODES[edge.t],
        fields: edge.withId ? { eid: `e${i}` } : {},
    }));
}

/**
 * A seeded shuffle.
 * @param items - What to shuffle.
 * @param seed - The seed.
 * @returns A shuffled copy.
 */
function shuffled<T>(items: readonly T[], seed: number): T[] {
    let state = seed >>> 0 || 1;
    const random = (): number => {
        state ^= state << 13;
        state >>>= 0;
        state ^= state >>> 17;
        state ^= state << 5;
        state >>>= 0;
        return state / 2 ** 32;
    };

    return items
        .map((item) => ({ item, key: random() }))
        .sort((x, y) => x.key - y.key)
        .map(({ item }) => item);
}

/**
 * The same records with node order and pair order shuffled, the order within a pair kept.
 * @param graph - The target session, into which nodes are added first in shuffled order.
 * @param records - The records.
 * @param seed - The seed.
 * @returns The records in their new order.
 */
function reorder(graph: TestGraph, records: readonly EdgeRecord[], seed: number): EdgeRecord[] {
    // The same nodes the source holds (those the records name), in another order.
    for (const node of shuffled(NODES, seed).filter((id) => records.some((r) => r.s === id || r.t === id))) {
        graph.addNode(node);
    }

    const pairs = new Map<string, EdgeRecord[]>();
    for (const record of records) {
        const ends = [record.s, record.t].sort(compareIds);
        const key = JSON.stringify(ends);
        pairs.set(key, [...(pairs.get(key) ?? []), record]);
    }

    return shuffled([...pairs.values()], seed ^ 0x5bd1e995).flat();
}

/**
 * The test double of a query engine: a query lists the ids it matches between quotes.
 * @param graph - The session.
 * @returns The matcher.
 */
function matcherOf(graph: TestGraph): (where: Query) => NodeId[] {
    return (where) => {
        const named = new Set([...where.matchAll(/'([^']*)'/g)].map((match) => match[1]));
        const snapshot = graph.snapshot();

        return Array.from({ length: snapshot.nodeCount }, (_, i) => snapshot.ids.idOf(i)).filter((id) =>
            named.has(String(id)),
        );
    };
}

/**
 * A resolution as ids: node ids, and each edge by (unordered pair, ordinal, among), which every
 * loaded edge has whatever `edgeIdPath` says.
 * @param graph - The session.
 * @param resolution - The resolution.
 * @returns Sorted keys.
 */
function asIds(graph: TestGraph, resolution: Resolution): { nodes: string[]; edges: string[]; missing: number[] } {
    const snapshot = graph.snapshot();
    const { edgeOrdinal, edgeAmong } = identityColumnsOf(snapshot);
    const nodes = Array.from(maskToIndices(resolution.nodes, snapshot.nodeCount), (i) =>
        JSON.stringify(snapshot.ids.idOf(i)),
    ).sort();
    const edges = Array.from(maskToIndices(resolution.edges, snapshot.edgeCount), (e) => {
        const ends = [snapshot.ids.idOf(snapshot.edgeSource(e)), snapshot.ids.idOf(snapshot.edgeTarget(e))].sort(
            compareIds,
        );
        return JSON.stringify([...ends, edgeOrdinal[e], edgeAmong[e]]);
    }).sort();

    return { nodes, edges, missing: [resolution.missingNodes, resolution.missingEdges, resolution.ambiguousEdges] };
}

/**
 * Build the source session's sets from the generated operations.
 * @param graph - The source session.
 * @param ops - The operations.
 */
function build(graph: TestGraph, ops: Session["ops"]): void {
    const counters = graph.counters();
    const node = (pick: number): NodeId => NODES[pick % NODES.length];
    const edge = (pick: number): EdgeId => graph.edgeId(counters[pick % counters.length]);
    const tryWrite = (write: () => void): void => {
        try {
            write();
        } catch {
            // A refused door (a taken name, a no-op) leaves nothing behind, which is fine here.
        }
    };

    for (const [n, op] of ops.entries()) {
        const live = graph.sets.list();
        const target = live.length === 0 ? undefined : live[op.picks[0] % live.length];
        const reading = op.reading ? "listed" : "induced";
        switch (op.kind) {
            case 0:
                tryWrite(() =>
                    graph.sets.create(
                        { kind: "fixed", nodes: op.picks.map(node), reading: "induced" },
                        { name: `Fixed ${n}` },
                    ),
                );
                break;
            case 1:
                tryWrite(() =>
                    graph.sets.create({
                        kind: "fixed",
                        nodes: op.picks.slice(1).map(node),
                        edges: op.picks.map(edge),
                        reading: "listed",
                    }),
                );
                break;
            case 2: {
                // A path along one edge, named, then a null step back.
                const counter = counters[op.picks[0] % counters.length];
                const snapshot = graph.snapshot();
                const row = graph.rowOf(counter);
                const s = snapshot.ids.idOf(snapshot.edgeSource(row));
                const t = snapshot.ids.idOf(snapshot.edgeTarget(row));
                const definition: SetDefinitionInput = {
                    kind: "path",
                    nodes: [s, t, s],
                    edges: [graph.edgeId(counter), null],
                };
                tryWrite(() => graph.sets.create(definition, { name: `Path ${n}` }));
                break;
            }

            case 3:
                tryWrite(() =>
                    graph.sets.create({
                        kind: "rule",
                        where: `pick ${op.picks.map((p) => `'${String(node(p))}'`).join(" ")}`,
                        reading: op.reading ? "clipped" : "induced",
                    }),
                );
                break;
            case 4:
                if (target !== undefined) {
                    tryWrite(() => graph.sets.rename(target.id, `Renamed ${n}`));
                }

                break;
            case 5:
                if (target !== undefined) {
                    tryWrite(() => graph.sets.remove(target.id));
                }

                break;
            case 6:
                if (target !== undefined) {
                    tryWrite(() =>
                        graph.sets.redefine(target.id, { kind: "fixed", nodes: op.picks.map(node), reading }),
                    );
                }

                break;
            default: {
                // Opaque content, as a newer element or a plugin wrote it: only a loader puts it.
                const definitions = [
                    { kind: "rule", where: { kind: "vendor:leaf", knob: op.picks[0] }, reading: "clipped" },
                    { kind: "fixed", nodes: [node(op.picks[0])], reading: "induced", weights: [0.5] },
                    { kind: "fixed", nodes: [node(op.picks[0])], reading: "induced" },
                ];
                const store = graph.setsStore;
                tryWrite(() => {
                    const id = store.mint(`Opaque ${n}`);
                    plant(
                        store,
                        ...store.list(),
                        loadRecord({
                            id,
                            name: `Opaque ${n}`,
                            order: store.nextOrder(),
                            definition: definitions[op.kind - 7],
                            createdFrom: { kind: "user" },
                            meta: { note: `kept ${n}` },
                        }),
                    );
                });
            }
        }
    }
}

describe("a stored set survives JSON into a fresh session", () => {
    it("keeps every record, the register and the tombstones, and resolves to the same ids", () => {
        fc.assert(
            fc.property(session, fc.boolean(), (generated, variant) => {
                const records = recordsOf(generated.edges);
                const source = new TestGraph();
                // The variant reads no file ids in the source (every member is an ordinal) and
                // configures `edgeIdPath` only in the target: the ordinal members must still bind.
                source.path = generated.sourcePath && !variant ? "eid" : null;
                source.load(records);
                build(source, generated.ops);

                const stored: unknown = JSON.parse(JSON.stringify(source.setsStore.toLogicalRecords()));

                const target = new TestGraph();
                resumeEdgeCounter(target.counter, generated.counterStart);
                target.path = variant ? "eid" : source.path;
                target.load(reorder(target, records, generated.seed));
                target.setsStore.loadLogicalRecords(stored);

                const before = source.sets.list();
                const after = target.sets.list();
                assert.deepStrictEqual(
                    after.map((record) => JSON.stringify(record)),
                    before.map((record) => JSON.stringify(record)),
                    "ids, names, order, canonical definitions and unknown fields",
                );
                assert.deepStrictEqual(
                    after.map((record) => record.revision),
                    before.map((record) => record.revision),
                );
                assert.deepStrictEqual(
                    [...target.setsStore.register()].sort(),
                    [...source.setsStore.register()].sort(),
                );
                assert.strictEqual(
                    JSON.stringify(target.setsStore.toLogicalRecords().tombstones),
                    JSON.stringify(source.setsStore.toLogicalRecords().tombstones),
                );

                for (const [i, record] of before.entries()) {
                    const one = asIds(
                        source,
                        resolveSet(record, {
                            snapshot: source.snapshot(),
                            sets: source.setsStore,
                            match: matcherOf(source),
                        }),
                    );
                    const two = asIds(
                        target,
                        resolveSet(after[i], {
                            snapshot: target.snapshot(),
                            sets: target.setsStore,
                            match: matcherOf(target),
                        }),
                    );
                    assert.deepStrictEqual(two, one, `${record.id} resolves to the same ids`);
                    assert.deepStrictEqual(
                        target.sets.status({ set: after[i].id }),
                        source.sets.status({ set: record.id }),
                        `${record.id} has the same status`,
                    );
                }

                for (const { id } of source.setsStore.toLogicalRecords().tombstones) {
                    assert.deepStrictEqual(
                        target.sets.status({ set: id }),
                        source.sets.status({ set: id }),
                        `removed ${id} reads detached alike`,
                    );
                }

                // The order high-water mark survives: a new set orders after every stored one.
                const next = target.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" });
                const highest = Math.max(
                    0,
                    ...before.map((r) => r.order),
                    ...source.setsStore.toLogicalRecords().tombstones.map((t) => t.record?.order ?? 0),
                );
                assert.isAbove(target.sets.get(next)?.order ?? 0, highest);
                assert.isFalse(source.setsStore.register().has(next), "a new id is never a stored one");
            }),
            fcParams(200),
        );
    });

    it("round-trips each opaque form value-identical, resolving to nothing", () => {
        const graph = new TestGraph();
        graph.load([{ s: "a", t: "b" }]);
        // Every op kind once, the three opaque ones included, with no refusal swallowed.
        build(
            graph,
            [0, 1, 2, 3, 7, 8, 9].map((kind) => ({ kind, picks: [1, 2], reading: true })),
        );
        assert.strictEqual(graph.sets.list().length, 7);
        const target = new TestGraph();
        target.load([{ s: "a", t: "b" }]);
        target.setsStore.loadLogicalRecords(JSON.parse(JSON.stringify(graph.setsStore.toLogicalRecords())));
        const opaque = target.sets.list().filter((record) => record.name.startsWith("Opaque"));
        assert.deepStrictEqual(
            opaque.map((record) => JSON.stringify(record)),
            graph.sets
                .list()
                .filter((record) => record.name.startsWith("Opaque"))
                .map((record) => JSON.stringify(record)),
        );
        assert.deepStrictEqual(
            opaque.map((record) => (record as unknown as { meta: unknown }).meta),
            [{ note: "kept 4" }, { note: "kept 5" }, { note: "kept 6" }],
        );
        const [leaf, field] = opaque;
        for (const record of [leaf, field]) {
            assert.strictEqual(resolveSet(record, { snapshot: target.snapshot() }).nodeCount, 0);
            const status = target.sets.status({ set: record.id });
            assert.strictEqual(status.freshness, "unresolvable");
            assert.deepStrictEqual(
                status.reasons.map((reason) => reason.kind),
                ["missing-capability"],
            );
            assert.throws(
                () => target.sets.redefine(record.id, { kind: "fixed", nodes: ["a"], reading: "induced" }),
                /does not know/,
            );
        }
    });

    it("refuses to load into a store that already holds sets", () => {
        const graph = new TestGraph();
        graph.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" });
        assert.throws(
            () => graph.setsStore.loadLogicalRecords({ records: [], register: [], tombstones: [] }),
            /empty store/,
        );
    });

    it("refuses a malformed slice and two records with one id, and drops a tombstone for a live id", () => {
        const source = new TestGraph();
        const id = source.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "A" });
        const [record] = JSON.parse(JSON.stringify(source.setsStore.toLogicalRecords())).records as Record<
            string,
            unknown
        >[];
        const codeOf = (stored: unknown): string | null => {
            try {
                new TestGraph().setsStore.loadLogicalRecords(stored);
            } catch (error) {
                return isGraphtyError(error) ? error.code : "not-a-graphty-error";
            }

            return null;
        };

        assert.strictEqual(codeOf({ records: "x" }), "E_BAD_COMMAND");
        assert.strictEqual(
            codeOf({ records: [record, { ...record, name: "B" }], register: [], tombstones: [] }),
            "E_BAD_COMMAND",
        );

        const target = new TestGraph();
        target.setsStore.loadLogicalRecords({ records: [record], register: [], tombstones: [{ id, name: "Old" }] });
        assert.strictEqual(target.setsStore.tombstone(id), undefined);
        assert.deepStrictEqual(target.setsStore.toLogicalRecords().tombstones, []);
    });
});
