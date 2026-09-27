/**
 * @file The five set operations: frozen records, sharing, no-ops, member edits and their
 * refusals, the O(delta) revision, and unknown content carried through (design/sets/sets-design.md
 * sections 4.1, 4.6, 12.2, 12.5, 13.2).
 */

import { assert, describe, it } from "vitest";

import { hashCounters, revisionOf } from "../../../src/catalog/sets/hash";
import type { EdgeMember, SetDefinition } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { loadRecord, MAX_EDGE_MEMBER_EDIT } from "../../../src/session/sets/prepare";
import { createSetsApi } from "../../../src/session/sets/SetsApi";
import { SetsStore } from "../../../src/session/sets/store";
import type { SetsApi } from "../../../src/session/sets/types";

/** A store and its doors; session edge id "7" is the edge a -> b with file id "e7". */
function harness(maxEdgeMembers?: number): { store: SetsStore; sets: SetsApi } {
    const store = new SetsStore();
    const sets = createSetsApi(
        {
            edgeMember: (id) => (id === "7" ? { source: "a", target: "b", id: "e7" } : undefined),
            ...(maxEdgeMembers === undefined ? {} : { maxEdgeMembers }),
        },
        store,
    );

    return { store, sets };
}

/** What a call throws: its code and details. */
function refusal(call: () => unknown): { code: string; details: Record<string, unknown> } {
    try {
        call();
    } catch (error) {
        assert.isTrue(isGraphtyError(error), String(error));
        return error as { code: string; details: Record<string, unknown> };
    }

    return assert.fail("expected a refusal");
}

/** A fixed set's definition. */
function fixedOf(sets: SetsApi, id: string): Extract<SetDefinition, { kind: "fixed" }> {
    const definition = sets.get(id)?.definition;
    assert.strictEqual(definition?.kind, "fixed");

    return definition as Extract<SetDefinition, { kind: "fixed" }>;
}

const edge = (source: string, target: string, id: string): EdgeMember => ({ source, target, id });

/**
 * Whether a value is frozen all the way down.
 * @param value - Any value.
 * @returns True when every object reachable from it is frozen.
 */
function deeplyFrozen(value: unknown): boolean {
    if (typeof value !== "object" || value === null) {
        return true;
    }

    return Object.isFrozen(value) && Object.values(value).every(deeplyFrozen);
}

describe("records", () => {
    it("clones and deep-freezes the caller's input", () => {
        const { sets } = harness();
        const nodes = ["b", "a"];
        const edges = [edge("a", "b", "x")];
        const values = ["red"];
        const fixed = sets.create({ kind: "fixed", nodes, edges, reading: "listed" }, { name: "F" });
        const rule = sets.create({ kind: "rule", where: { kind: "categories", attribute: "colour", values }, reading: "induced" }, { name: "R" });
        nodes.push("c");
        (edges[0] as { id: string }).id = "changed";
        values.push("blue");

        assert.deepStrictEqual(sets.get(fixed)?.definition, {
            edges: [{ id: "x", source: "a", target: "b" }],
            kind: "fixed",
            nodes: ["a", "b"],
            reading: "listed",
        });
        assert.deepStrictEqual(sets.get(rule)?.definition, {
            kind: "rule",
            reading: "induced",
            where: { attribute: "colour", kind: "categories", values: ["red"] },
        });
        assert.isFalse(Object.isFrozen(values));
        assert.isTrue(deeplyFrozen(sets.get(fixed)));
        assert.isTrue(deeplyFrozen(sets.get(rule)));
    });

    it("a rename keeps the id and the revision", () => {
        const { sets } = harness();
        const id = sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "A" });
        const before = sets.get(id);
        sets.rename(id, "B");
        const after = sets.get(id);
        assert.notStrictEqual(after, before);
        assert.strictEqual(after?.id, id);
        assert.strictEqual(after?.revision, before?.revision);
        assert.strictEqual(after?.definition, before?.definition);
    });

    it("a redefine that changes only the reading shares the member arrays", () => {
        const { sets } = harness();
        const id = sets.create({ kind: "fixed", nodes: ["a", "b"], edges: [edge("a", "b", "x")], reading: "induced" }, { name: "A" });
        const before = sets.get(id)?.definition as Extract<SetDefinition, { kind: "fixed" }>;
        sets.redefine(id, { kind: "fixed", nodes: ["b", "a"], edges: [edge("a", "b", "x")], reading: "listed" });
        const after = sets.get(id)?.definition as Extract<SetDefinition, { kind: "fixed" }>;
        assert.strictEqual(after.reading, "listed");
        assert.strictEqual(after.nodes, before.nodes);
        assert.strictEqual(after.edges, before.edges);
        assert.notStrictEqual(sets.get(id)?.revision, revisionOf(before));
        assert.strictEqual(sets.get(id)?.revision, revisionOf(after));
    });

    it("a fixed clipped reading is stored listed", () => {
        const { sets } = harness();
        const id = sets.create({ kind: "fixed", nodes: ["a"], reading: "clipped" }, { name: "A" });
        assert.strictEqual((sets.get(id)?.definition as { reading: string }).reading, "listed");
    });

    it("no-ops change no record", () => {
        const { sets } = harness();
        const id = sets.create({ kind: "fixed", nodes: ["a", "b"], edges: [edge("a", "b", "x")], reading: "listed" }, { name: "A" });
        const record = sets.get(id);
        sets.rename(id, "  A  ");
        sets.redefine(id, { kind: "fixed", nodes: ["b", "a", "b"], edges: [edge("a", "b", "x"), edge("a", "b", "x")], reading: "clipped" });
        sets.addMembers(id, { nodes: ["a"], edges: [edge("a", "b", "x")] });
        sets.removeMembers(id, { nodes: ["q"], edges: [edge("a", "b", "y")] });
        assert.strictEqual(sets.get(id), record);
    });
});

describe("member edits", () => {
    it("adds and removes nodes and edges in canonical order", () => {
        const { sets } = harness();
        const id = sets.create({ kind: "fixed", nodes: [2, "b"], reading: "listed" }, { name: "A" });
        sets.addMembers(id, { nodes: ["a", 1, 3], edges: [edge("c", "d", "z"), edge("a", "b", "x"), "7"] });
        assert.deepStrictEqual(sets.get(id)?.definition, {
            edges: [edge("a", "b", "e7"), edge("a", "b", "x"), edge("c", "d", "z")].map(({ id: e, source, target }) => ({ id: e, source, target })),
            kind: "fixed",
            nodes: [1, 2, 3, "a", "b"],
            reading: "listed",
        });
        sets.removeMembers(id, { nodes: [2], edges: [edge("a", "b", "x")] });
        assert.deepStrictEqual(fixedOf(sets, id).nodes, [1, 3, "a", "b"]);
        assert.deepStrictEqual(
            (fixedOf(sets, id).edges ?? []).map((member) => member.id),
            ["e7", "z"],
        );
        assert.strictEqual(sets.get(id)?.revision, revisionOf(sets.get(id)?.definition as SetDefinition));
    });

    it("removing a node removes every edge member incident to it", () => {
        const { sets } = harness();
        const id = sets.create(
            {
                kind: "fixed",
                nodes: ["u", "v"],
                edges: [edge("u", "v", "1"), edge("w", "u", "2"), edge("v", "w", "3"), { source: "u", target: "x", ordinal: 0, among: 2 }],
                reading: "listed",
            },
            { name: "A" },
        );
        sets.removeMembers(id, { nodes: ["u"] });
        assert.deepStrictEqual(sets.get(id)?.definition, {
            edges: [{ id: "3", source: "v", target: "w" }],
            kind: "fixed",
            nodes: ["v"],
            reading: "listed",
        });
    });

    it("keeps ordinal members and their order", () => {
        const { sets } = harness();
        const id = sets.create({ kind: "fixed", nodes: [], reading: "listed" }, { name: "A" });
        sets.addMembers(id, {
            edges: [
                { source: "a", target: "b", ordinal: 1, among: 2 },
                { source: "a", target: "b", id: "k" },
                { source: "a", target: "b", ordinal: 0, among: 2 },
            ],
        });
        const { edges } = fixedOf(sets, id);
        // Canonical order: an absent id sorts before a present one.
        assert.deepStrictEqual(edges, [
            { among: 2, ordinal: 0, source: "a", target: "b" },
            { among: 2, ordinal: 1, source: "a", target: "b" },
            { id: "k", source: "a", target: "b" },
        ]);
        sets.removeMembers(id, { edges: [{ source: "a", target: "b", ordinal: 0, among: 2 }] });
        assert.lengthOf(fixedOf(sets, id).edges ?? [], 2);
    });

    it("refuses a set that is not fixed, opaque content, an unknown edge id and too many edge members", () => {
        const { store, sets } = harness();
        const rule = sets.create({ kind: "rule", where: "degree > `1`", reading: "induced" }, { name: "R" });
        assert.strictEqual(refusal(() => sets.addMembers(rule, { nodes: ["a"] })).code, "E_BAD_COMMAND");
        assert.strictEqual(refusal(() => sets.removeMembers(rule, { nodes: ["a"] })).code, "E_BAD_COMMAND");

        store.transact(() => {
            store.put(
                loadRecord({
                    id: "set_weighted",
                    name: "Weighted",
                    order: 9,
                    definition: { kind: "fixed", nodes: ["b", "a"], weights: [2, 1], reading: "induced" },
                    createdFrom: { kind: "user" },
                }),
            );
        });
        for (const call of [
            () => sets.addMembers("set_weighted", { nodes: ["c"] }),
            () => sets.removeMembers("set_weighted", { nodes: ["a"] }),
            () => sets.redefine("set_weighted", { kind: "fixed", nodes: ["a"], reading: "induced" }),
        ]) {
            const { code, details } = refusal(call);
            assert.strictEqual(code, "E_UNSUPPORTED");
            assert.strictEqual(details.reason, "opaque-content");
        }

        const fixed = sets.create({ kind: "fixed", nodes: [], reading: "listed" }, { name: "F" });
        assert.strictEqual(refusal(() => sets.addMembers(fixed, { edges: ["8"] })).code, "E_BAD_COMMAND");
        assert.strictEqual(refusal(() => sets.removeMembers(fixed, { edges: ["8"] })).code, "E_BAD_COMMAND");
        assert.strictEqual(refusal(() => sets.addMembers("set_nothing", { nodes: ["a"] })).code, "E_BAD_COMMAND");
        assert.strictEqual(refusal(() => sets.addMembers(fixed, { nodes: [Number.NaN] })).code, "E_BAD_COMMAND");
    });

    it("refuses an edit to a set holding more than 1M edge members", () => {
        assert.strictEqual(MAX_EDGE_MEMBER_EDIT, 1_000_000);
        const { sets } = harness();
        const edges = Array.from({ length: MAX_EDGE_MEMBER_EDIT + 1 }, (_, i) => ({ source: i, target: i + 1, id: i }));
        const id = sets.create({ kind: "fixed", nodes: [], edges, reading: "listed" }, { name: "Big" });
        const record = sets.get(id);
        assert.strictEqual(refusal(() => sets.addMembers(id, { nodes: ["n"] })).code, "E_TOO_LARGE");
        assert.strictEqual(refusal(() => sets.removeMembers(id, { edges: [{ source: 0, target: 1, id: 0 }] })).code, "E_TOO_LARGE");
        assert.strictEqual(sets.get(id), record);

        // At the limit an edit is allowed until it would cross it.
        const small = harness(2);
        const at = small.sets.create({ kind: "fixed", nodes: [], edges: [edge("a", "b", "1"), edge("a", "b", "2")], reading: "listed" }, { name: "At" });
        small.sets.removeMembers(at, { edges: [edge("a", "b", "1")] });
        small.sets.addMembers(at, { edges: [edge("a", "b", "1")] });
        assert.strictEqual(refusal(() => small.sets.addMembers(at, { edges: [edge("a", "b", "3")] })).code, "E_TOO_LARGE");
    }, 60_000);
});

describe("the revision moves by the delta", () => {
    for (const size of [500, 500_000]) {
        it(`adding 3 members to a ${size}-member set makes 3 hashes and 3 sums`, () => {
            const { sets } = harness();
            const nodes = Array.from({ length: size }, (_, i) => i);
            const id = sets.create({ kind: "fixed", nodes, edges: [edge("a", "b", "x")], reading: "listed" }, { name: "A" });
            const before = sets.get(id)?.revision;
            const hashes = hashCounters.memberHashes;
            const {sums} = hashCounters;

            sets.addMembers(id, { nodes: [-1, "p", "q"] });
            const revision = sets.get(id)?.revision;

            assert.strictEqual(hashCounters.memberHashes - hashes, 3);
            assert.strictEqual(hashCounters.sums - sums, 3);
            assert.notStrictEqual(revision, before);
            assert.strictEqual(revision, revisionOf(sets.get(id)?.definition as SetDefinition));
        });
    }

    it("removing members, and adding edge members, keeps the memoised revision exact", () => {
        const { sets } = harness();
        const id = sets.create({ kind: "fixed", nodes: ["a", "b", "c"], edges: [edge("a", "b", "x"), edge("b", "c", "y")], reading: "listed" }, { name: "A" });
        void sets.get(id)?.revision;
        sets.removeMembers(id, { nodes: ["a"] });
        sets.addMembers(id, { edges: [edge("c", "d", "z"), { source: "d", target: "c", ordinal: 1, among: 3 }] });
        sets.removeMembers(id, { edges: [edge("b", "c", "y"), edge("c", "d", "z"), { source: "d", target: "c", ordinal: 1, among: 3 }] });
        const record = sets.get(id);
        assert.strictEqual(record?.revision, revisionOf(record?.definition as SetDefinition));
        assert.deepStrictEqual(record?.definition, { kind: "fixed", nodes: ["b", "c"], reading: "listed" });
    });
});

describe("unknown top-level fields", () => {
    it("survive rename untouched", () => {
        const { store, sets } = harness();
        const meta = { colour: "red", tags: ["x"] };
        store.transact(() => {
            store.put(
                loadRecord({
                    id: "set_meta",
                    name: "Meta",
                    order: 1,
                    definition: { kind: "fixed", nodes: ["a"], reading: "induced" },
                    createdFrom: { kind: "user" },
                    meta,
                }),
            );
        });
        const before = sets.get("set_meta") as unknown as { meta: unknown };
        sets.rename("set_meta", "Renamed");
        sets.addMembers("set_meta", { nodes: ["b"] });
        const after = sets.get("set_meta") as unknown as { meta: unknown; name: string };
        assert.strictEqual(after.name, "Renamed");
        assert.strictEqual(after.meta, before.meta);
        assert.deepStrictEqual(after.meta, meta);
    });

    it("an opaque definition can be renamed and removed, and round-trips value-identical", () => {
        const { store, sets } = harness();
        const definition = { kind: "plugin:ring", centre: "a", radius: 2 };
        store.transact(() => {
            store.put(loadRecord({ id: "set_ring", name: "Ring", order: 1, definition, createdFrom: { kind: "user" } }));
        });
        sets.rename("set_ring", "Ring 2");
        assert.deepStrictEqual(sets.get("set_ring")?.definition as unknown, definition);
        assert.match(sets.get("set_ring")?.revision ?? "", /^r1:/);
        sets.remove("set_ring");
        assert.isUndefined(sets.get("set_ring"));
    });
});
