/**
 * @file A filter condition naming a source under the source-steps experiment (design 3.8, 8.4):
 * it reads that source's own value and judges only the elements that source gave the column.
 * Ported from the reference model's phases 9, clash-column-in-source-section "a filter in B" and
 * roundtrips "a source section's filter" cases.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../../src/session";
import { clashing, full, phase1 } from "./scenario";

/**
 * The ids shown now.
 * @param session - The session.
 * @returns The node and edge ids.
 */
async function shown(session: GraphSession): Promise<{ nodes: Set<string>; edges: Set<string> }> {
    const visible = await session.scope.resolve("visible");
    return { nodes: new Set([...visible.nodes].map(String)), edges: new Set([...visible.edges].map(String)) };
}

/**
 * Each edge's id by its key column.
 * @param session - The session.
 * @param column - The column holding the edge's key.
 * @returns The ids.
 */
function edgeIds(session: GraphSession, column: string): Map<string, string> {
    return new Map(session.data.edges().map((e) => [String(e[column]), e.id]));
}

describe("source-steps: a source's filter", () => {
    it("phase 9: judges only that source's elements", async () => {
        const { session, t } = await full();
        await session.visibility.addCondition({
            effect: "keep",
            source: t,
            rule: { kind: "range", attribute: "data.amount", min: 8 },
        });
        const ids = edgeIds(session, "txn_id");
        const { edges } = await shown(session);
        assert.isFalse(edges.has(ids.get("T-3") ?? ""), "T-3's amount is 5");
        assert.isFalse(edges.has(ids.get("T-4") ?? ""), "T-4's amount is 7");
        assert.isTrue(edges.has(ids.get("T-1") ?? ""));
        // Bank B's edges carry amount too, below 8, but pass T's section filter.
        assert.isTrue(edges.has(ids.get("X-1") ?? ""));
        session.dispose();
    });

    it("judges B's own value for its clash column (clash-column-in-source-section)", async () => {
        const { session, b } = await clashing();
        const clash = `amt (${b})`;
        assert.include(
            session.data.attributes({ source: b }).map((a) => a.name),
            clash,
            "B's section lists its clash column",
        );
        await session.visibility.addCondition({
            effect: "keep",
            source: b,
            rule: { kind: "range", attribute: `data.${clash}`, min: 35 },
        });
        const { nodes } = await shown(session);
        assert.isFalse(nodes.has("p1"), "p1's B value is 30, below 35");
        assert.isTrue(nodes.has("p2"));
        session.dispose();
    });

    it("follows a column moved onto the merchants: merchants judged, no transfer hidden on its own", async () => {
        const { session, t } = await phase1();
        await session.visibility.addCondition({
            effect: "keep",
            source: t,
            rule: { kind: "categories", attribute: "data.category", values: ["food"] },
        });
        const ids = edgeIds(session, "txn_id");
        assert.isFalse((await shown(session)).edges.has(ids.get("T-4") ?? ""), "T-4 is atm");
        await session.data.moveColumns(t, { columns: ["category"], to: "target" });
        const after = await shown(session);
        assert.isFalse(after.nodes.has("M-3"), "M-3 is the atm merchant");
        assert.isTrue(after.nodes.has("A-3"), "accounts carry no category of T's and are not judged");
        assert.isTrue(after.nodes.has("M-1"));
        session.dispose();
    });

    it("holds a filter whose column no element of the source carries (W_FILTER_HELD)", async () => {
        const { session, t } = await phase1();
        const { id } = await session.visibility.addCondition({
            effect: "keep",
            source: t,
            rule: { kind: "range", attribute: "data.nothing", min: 1 },
        });
        const { nodes, edges } = await shown(session);
        assert.strictEqual(nodes.size, session.data.store.getSnapshot().nodeCount);
        assert.strictEqual(edges.size, session.data.store.getSnapshot().edgeCount);
        assert.deepStrictEqual(session.visibility.held, [
            { code: "W_FILTER_HELD", params: { filter: id, column: "data.nothing" } },
        ]);
        session.dispose();
    });

    it("holds a graph-wide filter on a column no element carries (W_FILTER_HELD)", async () => {
        const { session } = await phase1();
        const { id } = await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "range", attribute: "data.nothing", min: 1 },
        });
        const { nodes } = await shown(session);
        assert.strictEqual(nodes.size, session.data.store.getSnapshot().nodeCount, "it hides nothing");
        assert.deepStrictEqual(session.visibility.held, [
            { code: "W_FILTER_HELD", params: { filter: id, column: "data.nothing" } },
        ]);
        session.dispose();
    });

    it("a graph-wide filter on a removed source's column hides nothing", async () => {
        const { session, m } = await full();
        const { id } = await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "categories", attribute: "data.city", values: ["Oslo"] },
        });
        assert.isFalse((await shown(session)).nodes.has("M-2"), "M-2 is in Bergen");
        assert.deepStrictEqual(session.visibility.held, []);
        await session.data.removeSource(m);
        const { nodes } = await shown(session);
        assert.strictEqual(nodes.size, session.data.store.getSnapshot().nodeCount, "it hides nothing");
        assert.deepStrictEqual(session.visibility.held, [
            { code: "W_FILTER_HELD", params: { filter: id, column: "data.city" } },
        ]);
        session.dispose();
    });

    it("never holds a judged filter on graphty.type (type-filter-is-judged)", async () => {
        const { session } = await full();
        await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "categories", attribute: "graphty.type", values: ["account"] },
        });
        assert.deepStrictEqual(session.visibility.held, []);
        session.dispose();
    });
});
