/**
 * @file The join workspace's acts on one source draft: `matchCounts` with `before` counts a step's
 * match without its own result, `connect` with `to` makes each row an edge between two named nodes
 * (one per pair with `perPair`), `merge` takes an `aggregate` for every column (`"*"`), and
 * `replaceStep` makes an act again in a step's place, keeping its clash rules, as one undo entry.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type SourceDraft } from "../../../src/session";

/**
 * A CSV source.
 * @param name - Its name.
 * @param data - Its text.
 * @returns What `import` and `stage` take.
 */
function csv(name: string, data: string): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data }, name };
}

/** Door entries: B1 enters D1 twice, B2 enters D2, B9 badges no one. */
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D1\nE3,B2,D2\nE4,B9,D1";

/**
 * People in the graph, HR, the entries and the buildings staged, and a draft open.
 * @returns The session, the draft and the staged sources.
 */
async function opened(): Promise<{
    session: GraphSession;
    d: SourceDraft;
    hr: string;
    entries: string;
    doors: string;
}> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(csv("people.csv", "badge,name\nB1,Ann\nB2,Bo\nB3,Cy"), { key: "badge", type: "person" });
    const d = session.data.draft();
    const hr = await d.stage(csv("hr.csv", "badge,dept\nB1,Ops\nB2,Lab\nB9,Ops"), { key: "badge", type: "hr" });
    const entries = await d.stage(csv("entries.csv", ENTRIES), { key: "entry", type: "entry" });
    const doors = await d.stage(csv("doors.csv", "door,name\nD1,North\nD2,South"), { key: "door", type: "door" });
    return { session, d, hr, entries, doors };
}

describe("source-steps drafts: the join workspace's acts", () => {
    it("matchCounts with before counts a merge's match without the nodes the merge itself kept", async () => {
        const { session, d, hr } = await opened();
        const pair = { from: { source: hr, field: "badge" }, into: { space: "person" } };
        d.merge(pair);
        const step = d.steps().length - 1;
        assert.strictEqual(d.matchCounts(pair).only2, 0, "after the merge, its kept B9 is in the space");
        const counts = d.matchCounts(pair, { before: step });
        assert.strictEqual(counts.matched, 2, "B1 and B2");
        assert.strictEqual(counts.only2, 1, "B9 names no one before the merge");
        assert.strictEqual(d.matchValues(pair, { before: step, only: "only2" }).total, 1);
        d.dispose();
        session.dispose();
    });

    it("connect with to makes each row an edge between the two nodes it names, and steps() reads it back", async () => {
        const { session, d, entries, doors } = await opened();
        d.connect({
            from: { source: entries, field: "badge" },
            into: { space: "person" },
            to: { field: "door", into: { source: doors } },
        });
        const act = d.steps().at(-1)?.act;
        assert.strictEqual(act?.act, "connect");
        assert.strictEqual(act?.to?.field, "door");
        assert.strictEqual(act?.from.field, "badge");
        await d.commit();
        const edges = session.data.edges();
        assert.lengthOf(edges, 3, "one per row naming a person: E4's B9 names no one");
        for (const e of edges) {
            assert.notStrictEqual(String(e.source), String(e.target), "no edge from a node to itself");
        }
        assert.isUndefined(session.data.node("E1"), "an entry row makes no node");
        session.dispose();
    });

    it("connect with to and perPair makes one edge per pair of ends", async () => {
        const { session, d, entries, doors } = await opened();
        d.connect({
            from: { source: entries, field: "badge" },
            into: { space: "person" },
            to: { field: "door", into: { source: doors } },
            perPair: true,
        });
        assert.isTrue(d.steps().at(-1)?.act?.perPair);
        await d.commit();
        assert.lengthOf(session.data.edges(), 2, "B1-D1 once, B2-D2");
        session.dispose();
    });

    it("merge with an aggregate for every column reduces each node's rows, and never its match column", async () => {
        const { session, d, entries } = await opened();
        d.merge({ from: { source: entries, field: "badge" }, into: { space: "person" }, aggregate: { "*": "count" } });
        assert.deepStrictEqual(d.steps().at(-1)?.act?.aggregate, { "*": "count" });
        await d.commit();
        assert.strictEqual(session.data.node("B1")?.door, 2, "B1's two rows counted");
        assert.strictEqual(session.data.node("B1")?.badge, "B1", "the match column is not reduced");
        session.dispose();
    });

    it("replaceStep makes the act again in its place as one undo entry and keeps its clash rules", async () => {
        const { session, d, hr, entries } = await opened();
        const pair = { from: { source: hr, field: "badge" }, into: { space: "person" } };
        d.merge(pair);
        d.connect({ from: { source: entries, field: "badge" }, into: { space: "person" } });
        const at = d.steps().findIndex((row) => row.act?.act === "merge");
        d.editStep(at, { clash: { dept: "overwrite" } });
        const count = d.steps().length;
        d.replaceStep(at, { act: "merge", options: { ...pair, unmatchedFrom: "drop" } });
        const row = d.steps()[at];
        assert.strictEqual(d.steps().length, count, "no step added");
        assert.strictEqual(row.act?.unmatchedFrom, "drop", "the new act in the old place");
        assert.strictEqual(row.op, "join.merge");
        assert.isTrue(d.undo(), "one undo");
        assert.strictEqual(d.steps()[at].act?.unmatchedFrom, "keep", "one undo takes the replacement back");
        d.dispose();
        session.dispose();
    });
});
