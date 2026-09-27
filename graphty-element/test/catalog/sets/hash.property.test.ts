import fc from "fast-check";
import { assert, describe, it } from "vitest";

import {
    addToSum,
    EMPTY_SUM,
    hashCounters,
    hashEdgeMember,
    hashHex,
    hashNodeId,
    type LanePair,
    memberSum,
    revisionOf,
    subtractFromSum,
} from "../../../src/catalog/sets/hash";
import type { EdgeMember, NodeId, SetDefinition } from "../../../src/catalog/types";
import { fcParams } from "../../helpers/fc-params";

const nodeId: fc.Arbitrary<NodeId> = fc.oneof(
    fc.integer({ min: -50, max: 50 }),
    fc.double({ noNaN: true, noDefaultInfinity: true }),
    fc.string({ maxLength: 6, unit: "binary" }),
);

const edgeMember: fc.Arbitrary<EdgeMember> = fc.oneof(
    fc.record({ source: nodeId, target: nodeId, id: fc.oneof(fc.integer(), fc.string({ maxLength: 4 })) }),
    fc.record({ source: nodeId, target: nodeId, key: fc.string({ maxLength: 4 }) }),
    fc
        .record({ source: nodeId, target: nodeId, among: fc.integer({ min: 1, max: 5 }), shift: fc.nat(4) })
        .map(({ source, target, among, shift }) => ({ source, target, among, ordinal: shift % among })),
);

const ids = fc.uniqueArray(nodeId, {
    maxLength: 20,
    comparator: (a, b) => Object.is(a === 0 ? 0 : a, b === 0 ? 0 : b),
});

/**
 * A seeded shuffle.
 * @param items - The items.
 * @param pick - A seeded integer in [min, max].
 * @returns A shuffled copy.
 */
function shuffle<T>(items: readonly T[], pick: (min: number, max: number) => number): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = pick(0, i);
        [out[i], out[j]] = [out[j], out[i]];
    }

    return out;
}

/**
 * The member sum of node ids.
 * @param nodes - The ids.
 * @returns Their sum.
 */
function nodeSum(nodes: readonly NodeId[]): LanePair {
    return memberSum(nodes.map(hashNodeId));
}

describe("the member sum, over generated memberships", () => {
    it("is order-free", () => {
        fc.assert(
            fc.property(ids, fc.infiniteStream(fc.nat()), (nodes, stream) => {
                const it = stream[Symbol.iterator]();
                const pick = (min: number, max: number): number =>
                    min + ((it.next().value as number) % (max - min + 1));

                assert.deepEqual(nodeSum(shuffle(nodes, pick)), nodeSum(nodes));
            }),
            fcParams(1000),
        );
    });

    it("returns to the original after adding then removing a delta", () => {
        fc.assert(
            fc.property(ids, ids, (base, delta) => {
                const start = nodeSum(base);
                let sum = start;
                for (const id of delta) {
                    sum = addToSum(sum, hashNodeId(id));
                }

                for (const id of delta) {
                    sum = subtractFromSum(sum, hashNodeId(id));
                }

                assert.deepEqual(sum, start);
            }),
            fcParams(1000),
        );
    });

    it("adds over a disjoint union", () => {
        fc.assert(
            fc.property(ids, (nodes) => {
                const cut = Math.floor(nodes.length / 2);
                const left = nodes.slice(0, cut);
                const right = nodes.slice(cut);

                assert.deepEqual(addToSum(nodeSum(left), nodeSum(right)), nodeSum(nodes));
            }),
            fcParams(1000),
        );
    });
});

describe("edge member hashes, over generated members", () => {
    it("are symmetric in the endpoints undirected and not directed", () => {
        fc.assert(
            fc.property(edgeMember, (member) => {
                const swapped = { ...member, source: member.target, target: member.source };

                assert.deepEqual(hashEdgeMember(swapped, false), hashEdgeMember(member, false));
                if (hashHex(hashNodeId(member.source)) !== hashHex(hashNodeId(member.target))) {
                    assert.notDeepEqual(hashEdgeMember(swapped, true), hashEdgeMember(member, true));
                }
            }),
            fcParams(1000),
        );
    });
});

describe("the revision, over generated definitions", () => {
    it("does not change when member arrays are permuted", () => {
        fc.assert(
            fc.property(
                fc.array(nodeId, { maxLength: 12 }),
                fc.array(edgeMember, { maxLength: 8 }),
                fc.infiniteStream(fc.nat()),
                (nodes, edges, stream) => {
                    const it = stream[Symbol.iterator]();
                    const pick = (min: number, max: number): number =>
                        min + ((it.next().value as number) % (max - min + 1));
                    const one: SetDefinition = { kind: "fixed", nodes, edges, reading: "listed" };
                    const other: SetDefinition = {
                        kind: "fixed",
                        nodes: shuffle(nodes, pick),
                        edges: shuffle(edges, pick),
                        reading: "listed",
                    };

                    assert.strictEqual(revisionOf(other), revisionOf(one));
                },
            ),
            fcParams(1000),
        );
    });

    it("does not depend on the set's name, which is not part of the definition", () => {
        // A rename writes the record's name and leaves its definition object untouched, and
        // revisionOf reads only the definition; pin that a copy of the same definition agrees.
        const definition: SetDefinition = { kind: "fixed", nodes: ["a", "b"], reading: "induced" };
        const renamed = { name: "renamed", definition: { ...definition } };

        assert.strictEqual(revisionOf(renamed.definition), revisionOf(definition));
    });
});

describe("member sums over many small graphs", () => {
    it("are pairwise distinct over 10,000 memberships, and both lanes vary", () => {
        // Every non-empty subset of a 14-node graph (16,383 memberships), mixing string and
        // numeric ids. With 64 bits a collision here means a bug, not bad luck.
        const universe: NodeId[] = ["a", "b", "c", "d", "e", "f", "g", 0, 1, 2, 3, 1e21, -7.5, "0"];
        const hashes = universe.map(hashNodeId);
        const seen = new Set<string>();
        const lanesA = new Set<number>();
        const lanesB = new Set<number>();

        for (let mask = 1; mask < 1 << universe.length; mask++) {
            let sum = EMPTY_SUM;
            for (let i = 0; i < universe.length; i++) {
                if (mask & (1 << i)) {
                    sum = addToSum(sum, hashes[i]);
                }
            }

            seen.add(hashHex(sum));
            lanesA.add(sum.a);
            lanesB.add(sum.b);
        }

        const count = (1 << universe.length) - 1;
        assert.isAtLeast(count, 10_000);
        assert.strictEqual(seen.size, count);
        assert.isAbove(lanesA.size, 1);
        assert.isAbove(lanesB.size, 1);
    });
});

describe("work count", () => {
    for (const size of [1_000, 100_000]) {
        it(`revisionOf of a fixed set hashes each member once at ${size} members`, () => {
            const nodes = Array.from({ length: size }, (_, i) => (i % 2 === 0 ? i : `n${i}`));
            const edges = Array.from({ length: size / 10 }, (_, i) => ({ source: i, target: i + 1, id: `e${i}` }));
            const before = hashCounters.memberHashes;

            revisionOf({ kind: "fixed", nodes, edges, reading: "listed" });

            assert.strictEqual(hashCounters.memberHashes - before, size + size / 10);
        });
    }
});
