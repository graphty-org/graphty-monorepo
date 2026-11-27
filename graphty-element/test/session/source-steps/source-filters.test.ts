/**
 * @file A filter condition naming a source under the source-steps experiment (design 3.8, 8.4):
 * it reads that source's own value and judges only the elements that source gave the column.
 * Ported from the reference model's phases 9, clash-column-in-source-section "a filter in B" and
 * roundtrips "a source section's filter" cases.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { conditionFields } from "../../../src/session/styles/conditions";
import { clashing, full, phase1, phase2 } from "./scenario";

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

    it("judges a source section's filter on graphty.type, never holds it (type-filter-is-judged)", async () => {
        const { session, t } = await phase2();
        assert.isTrue((await shown(session)).nodes.has("D-1"));
        await session.visibility.addCondition({
            effect: "keep",
            source: t,
            rule: { kind: "categories", attribute: "graphty.type", values: ["transfer", "account", "merchant"] },
        });
        assert.deepStrictEqual(session.visibility.held, []);
        const { nodes } = await shown(session);
        assert.isFalse(nodes.has("D-1"), "T's device nodes are judged and hidden");
        assert.isTrue(nodes.has("A-1"));
        session.dispose();
    });
});

describe("a filter made for a source that waits", () => {
    const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
        type: "csv",
        config: { data: data.join("\n") },
        name,
    });

    it("lists the waiting source's own fields, and counts over its rows until it is added", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("people.csv", "id,name,age", "P1,Ann,30", "P2,Bo,41"), { key: "id" });
        const rooms = await session.data.stage(
            csv("rooms.csv", "room,floor,wing", "R1,1,east", "R2,2,east", "R3,3,west"),
            { key: "room" },
        );
        const fields = conditionFields(session, "node", { source: rooms }).map((each) => [each.path, each.kind]);
        assert.deepInclude(fields, ["data.floor", "number"]);
        assert.deepInclude(fields, ["data.wing", "category"]);
        assert.notInclude(
            fields.map(([path]) => path),
            "data.age",
        );
        assert.deepEqual(
            session.data.readableValues({ source: rooms }).find((value) => value.path === "data.floor")?.range,
            { min: 1, max: 3 },
        );
        const count = (): unknown => session.visibility.conditionCounts()[0]?.nodes;
        await session.visibility.addCondition({
            id: "east",
            effect: "keep",
            on: true,
            source: rooms,
            rule: { kind: "categories", attribute: "data.wing", values: ["east"] },
        });
        assert.deepEqual(count(), { matched: 2, total: 3, shown: 0 }, "two of three rooms, none drawn yet");
        assert.strictEqual(session.visibility.summary.visibleNodes, 2, "the people stay");
        assert.deepInclude(session.visibility.summaryOf(rooms), { visibleNodes: 2, totalNodes: 3 });
        const draft = session.visibility.draft({
            effect: "keep",
            source: rooms,
            rule: { kind: "range", attribute: "data.floor", min: 2, max: 3 },
        });
        assert.deepEqual(draft.counts().nodes, { matched: 2, total: 3, shown: 0 });
        draft.cancel();
        await session.data.add(rooms);
        assert.deepEqual(count(), { matched: 2, total: 3, shown: 2 }, "added, it judges them");
        session.dispose();
    });

    it("reads a selection of a waiting source's rows step by step, holding nothing of the graph", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("people.csv", "id,name,age", "P1,Ann,30", "R1,Bo,41"), { key: "id" });
        const rooms = await session.data.stage(
            csv("rooms.csv", "room,floor,wing", "R1,1,east", "R2,2,east", "R3,,west"),
            { key: "room" },
        );
        let heard = 0;
        const watch = session.scope.watchSteps(
            {
                kind: "union",
                side: "nodes",
                within: "graph",
                sources: [rooms],
                branches: [
                    {
                        start: "all",
                        steps: [
                            { op: "keep", rule: { kind: "categories", attribute: "data.wing", values: ["east"] } },
                            { op: "keep", rule: { kind: "range", attribute: "data.floor", min: 2, max: 3 } },
                        ],
                    },
                ],
            },
            () => {
                heard++;
            },
        );
        const { current } = watch;
        assert.deepEqual(current.total, { count: 1, of: 3, shown: 0 });
        assert.deepEqual(
            current.branches[0].steps.map((step) => step.count),
            [2, 1],
        );
        const [wing, floor] = current.branches[0].steps.map((step) => step.values);
        assert.deepEqual(wing?.kind === "categorical" ? wing.values.map((each) => [each.value, each.count]) : null, [
            ["east", 2],
            ["west", 1],
        ]);
        assert.deepInclude(floor, { kind: "numeric", min: 1, max: 2, missing: 0, of: 2 });
        assert.deepEqual(current.result, { nodes: [] }, "R1 in the graph is another thing");
        assert.strictEqual(current.branchOf("R1"), null);
        await session.data.add(rooms);
        await session.styles.settled();
        assert.isAbove(heard, 0, "once added, it is read over the graph");
        assert.deepEqual(watch.current.total, { count: 1, of: 3, shown: 1 });
        watch.end();
        session.dispose();
    });

    it("judges a source's elements by a selection that reads no column, such as their degree", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("links.csv", "source,target", "a,b", "b,c"));
        const rooms = await session.data.stage(csv("rooms.csv", "room,floor", "R1,1", "R2,2"), { key: "room" });
        await session.data.add(rooms);
        await session.visibility.addCondition({
            effect: "keep",
            on: true,
            source: rooms,
            rule: {
                kind: "union",
                side: "nodes",
                within: "graph",
                sources: [rooms],
                branches: [{ start: "none", steps: [{ op: "add", rule: { kind: "degree", min: 1 } }] }],
            },
        });
        assert.strictEqual(session.visibility.summary.visibleNodes, 3, "no room has a link; the rest stay");
        session.dispose();
    });

    it("judges a waiting source's rows from the moment they are in the graph", async () => {
        for (const union of [false, true]) {
            const session = createGraphSession({ features: ["source-steps"] });
            await session.data.import(csv("people.csv", "id,name", "P1,Ann", "P2,Bo"), { key: "id" });
            const rooms = await session.data.stage(csv("rooms.csv", "room,floor", "R1,1", "R2,2", "R3,3"), {
                key: "room",
            });
            const rule = { kind: "range" as const, attribute: "data.floor", min: 2 };
            await session.visibility.addCondition({
                effect: "keep",
                on: true,
                source: rooms,
                rule: union
                    ? {
                          kind: "union",
                          side: "nodes",
                          within: "graph",
                          sources: [rooms],
                          branches: [{ start: "none", steps: [{ op: "add", rule }] }],
                      }
                    : rule,
            });
            assert.strictEqual(session.visibility.summary.visibleNodes, 2, "the people stay");
            await session.data.add(rooms);
            assert.strictEqual(session.visibility.summary.visibleNodes, 4, "two people, two rooms of three");
            session.dispose();
        }
    });

    it("counts a waiting edge list's rows as edges, and follows its Rows are", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const links = await session.data.stage(csv("links.csv", "from,to,kind", "a,b,x", "b,c,y", "c,a,x"), {
            edges: { from: { column: "from" }, to: { column: "to" } },
        });
        await session.visibility.addCondition({
            id: "x",
            effect: "keep",
            on: true,
            source: links,
            rule: { kind: "categories", attribute: "data.kind", values: ["x"] },
        });
        assert.deepEqual(session.visibility.conditionCounts()[0]?.edges, { matched: 2, total: 3, shown: 0 });
        await session.data.setMapping(links, { rows: "nodes" });
        assert.deepEqual(session.visibility.conditionCounts()[0]?.nodes, { matched: 2, total: 3, shown: 0 });
        session.dispose();
    });
});
