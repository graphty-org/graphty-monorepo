/**
 * @file `sets.combine` through the published session: the edge rule of design 7 (every operand
 * induced gives an induced result, otherwise edge-first), `difference` against the union of the
 * rest, what the result records, and the laws edge-first gives up, pinned by example
 * (design/sets/sets-design.md sections 5.1 and 7).
 */

import { assert, describe, it } from "vitest";

import type { EdgeId, NodeId, SetDefinition } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { edgeSpaceOf } from "../../../src/session/scope/ScopeApi";
import { edgeBetween, type EdgeRow, type Harness, makeSession } from "../helpers";

/** A session over the given edges; nodes are their endpoints. */
function harnessOf(edges: readonly [string, string][]): Harness {
    const harness = makeSession();
    const ids = [...new Set(edges.flat())];
    harness.add(
        ids.map((id) => ({ id })),
        edges.map(([src, dst]): EdgeRow => ({ src, dst })),
    );

    return harness;
}

/** What a kept set resolves to: sorted node ids and sorted `source-target` edge names. */
async function membersOf(h: Harness, id: string): Promise<{ nodes: NodeId[]; edges: string[] }> {
    const resolved = await h.session.scope.resolve({ set: id });
    const snapshot = h.session.data.snapshot();
    const space = edgeSpaceOf(snapshot);
    const names = new Map<EdgeId, string>();
    for (let row = 0; row < snapshot.edgeCount; row++) {
        names.set(space.idOf(row), `${String(snapshot.ids.idOf(snapshot.edgeSource(row)))}-${String(snapshot.ids.idOf(snapshot.edgeTarget(row)))}`);
    }

    return { nodes: [...resolved.nodes].sort(), edges: [...resolved.edges].map((edge) => names.get(edge) ?? edge).sort() };
}

/** A kept fixed set. */
function fixed(h: Harness, name: string, definition: Omit<Extract<SetDefinition, { kind: "fixed" }>, "kind" | "edges"> & { edges?: EdgeId[] }): string {
    return h.session.sets.create({ kind: "fixed", ...definition }, { name });
}

describe("sets.combine: the edge rule", () => {
    it("gives an induced result when every operand is induced, which gains the edges between its operands", async () => {
        const h = harnessOf([
            ["a", "b"],
            ["b", "c"],
            ["c", "d"],
        ]);
        const a = fixed(h, "A", { nodes: ["a", "b"], reading: "induced" });
        const b = fixed(h, "B", { nodes: ["c", "d"], reading: "induced" });

        const id = await h.session.sets.combine("union", [{ set: a }, { set: b }]);

        assert.deepStrictEqual(h.session.sets.get(id)?.definition, { kind: "fixed", nodes: ["a", "b", "c", "d"], reading: "induced" });
        assert.deepStrictEqual((await membersOf(h, id)).edges, ["a-b", "b-c", "c-d"]);
    });

    it("combines edges first when any operand is not induced, keeping their endpoints and no cross edge", async () => {
        const h = harnessOf([
            ["a", "b"],
            ["b", "c"],
            ["c", "d"],
        ]);
        const a = fixed(h, "A", { nodes: [], edges: [edgeBetween(h, "a", "b")], reading: "listed" });
        const b = fixed(h, "B", { nodes: ["c", "d"], reading: "induced" });

        const id = await h.session.sets.combine("union", [{ set: a }, { set: b }]);

        const stored = h.session.sets.get(id)?.definition;
        assert.strictEqual(stored?.kind === "fixed" ? stored.reading : null, "listed");
        assert.deepStrictEqual(await membersOf(h, id), { nodes: ["a", "b", "c", "d"], edges: ["a-b", "c-d"] });
    });

    it("takes a difference as the first operand minus the union of the rest", async () => {
        const h = harnessOf([
            ["a", "b"],
            ["b", "c"],
            ["c", "d"],
        ]);

        const id = await h.session.sets.combine("difference", ["graph", { nodes: ["a"] }, { nodes: ["d"] }]);

        assert.deepStrictEqual(await membersOf(h, id), { nodes: ["b", "c"], edges: ["b-c"] });
    });

    it("records a fixed set created from the combination, holding references and the sizes of inline member lists", async () => {
        const h = harnessOf([
            ["a", "b"],
            ["b", "c"],
        ]);
        const a = fixed(h, "A", { nodes: ["a"], reading: "induced" });

        const id = await h.session.sets.combine(
            "symmetric-difference",
            [{ set: a }, { nodes: ["b", "c"] }, { define: { kind: "fixed", nodes: ["c"], edges: [edgeBetween(h, "b", "c")], reading: "listed" } }, "graph"],
            { name: "Odd" },
        );

        const set = h.session.sets.get(id);
        assert.strictEqual(set?.name, "Odd");
        assert.strictEqual(set?.definition.kind, "fixed");
        assert.deepStrictEqual(set?.createdFrom, {
            kind: "combine",
            op: "symmetric-difference",
            of: [{ set: a }, { inline: { nodes: 2, edges: 0 } }, { inline: { nodes: 1, edges: 1 } }, "graph"],
        });
    });

    it("refuses an unknown combination, fewer than two operands and a bad reading", async () => {
        const h = harnessOf([["a", "b"]]);
        const code = async (call: () => Promise<unknown>): Promise<string | null> => {
            try {
                await call();
            } catch (error) {
                return isGraphtyError(error) ? error.code : "not-a-graphty-error";
            }

            return null;
        };

        assert.strictEqual(await code(() => h.session.sets.combine("xor" as "union", ["graph", "graph"])), "E_BAD_COMMAND");
        assert.strictEqual(await code(() => h.session.sets.combine("union", ["graph"])), "E_BAD_COMMAND");
        assert.strictEqual(await code(() => h.session.sets.combine("union", ["graph", "graph"], { reading: "all" as "listed" })), "E_BAD_COMMAND");
        assert.strictEqual(await code(() => h.session.sets.combine("union", ["graph", { set: "set_never" }])), "E_BAD_COMMAND");
    });
});

describe("sets.combine: the laws edge-first gives up, by example", () => {
    it("keeps the edges of a Kruskal tree that a Prim tree lacks, with their shared endpoints, so (A - B) intersect B is not empty", async () => {
        const h = harnessOf([
            ["a", "b"],
            ["b", "c"],
            ["a", "c"],
        ]);
        const kruskal = fixed(h, "Kruskal", { nodes: [], edges: [edgeBetween(h, "a", "b"), edgeBetween(h, "b", "c")], reading: "listed" });
        const prim = fixed(h, "Prim", { nodes: [], edges: [edgeBetween(h, "a", "b"), edgeBetween(h, "a", "c")], reading: "listed" });

        const only = await h.session.sets.combine("difference", [{ set: kruskal }, { set: prim }], { name: "K - P" });
        assert.deepStrictEqual(await membersOf(h, only), { nodes: ["b", "c"], edges: ["b-c"] });

        const back = await h.session.sets.combine("intersection", [{ set: only }, { set: prim }]);
        assert.deepStrictEqual(await membersOf(h, back), { nodes: ["b", "c"], edges: [] });
    });

    it("gives a different union when nesting mixes readings: the design 7 counterexample", async () => {
        const h = harnessOf([
            ["a", "b"],
            ["c", "d"],
        ]);
        const a = fixed(h, "A", { nodes: ["a"], reading: "induced" });
        const b = fixed(h, "B", { nodes: ["b"], reading: "induced" });
        const c = fixed(h, "C", { nodes: ["c", "d"], reading: "listed" });

        const ab = await h.session.sets.combine("union", [{ set: a }, { set: b }]);
        const left = await h.session.sets.combine("union", [{ set: ab }, { set: c }]);
        const bc = await h.session.sets.combine("union", [{ set: b }, { set: c }]);
        const right = await h.session.sets.combine("union", [{ set: a }, { set: bc }]);

        assert.deepStrictEqual(await membersOf(h, left), { nodes: ["a", "b", "c", "d"], edges: ["a-b"] });
        assert.deepStrictEqual(await membersOf(h, right), { nodes: ["a", "b", "c", "d"], edges: [] });
    });
});
