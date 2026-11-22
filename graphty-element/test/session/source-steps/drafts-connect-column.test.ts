/**
 * @file Make an edge from a column of a source already in the graph (not its key) to a staged
 * source's key (design design/data/multiple-data-sources-design.md 3.5, 3.6, 5.2): door entries are
 * the graph's nodes, people arrive staged, and each entry connects to the person its badge names,
 * as many entries to one person as share a badge. The preview counts what the graph then draws.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

const ENTRIES = csv("entries.csv", "entry,badge,door", "e1,B1,D1", "e2,B2,D1", "e3,B1,D2", "e4,B3,D2", "e5,B9,D1");
const PEOPLE = csv("people.csv", "badge,name,dept", "B1,Ann,Ops", "B2,Bo,Lab", "B3,Cy,Sales", "B4,Di,HR");

/**
 * Each edge of the graph as `<source>-><target>`, sorted.
 * @param session - The session.
 * @returns The edges.
 */
function drawn(session: GraphSession): string[] {
    return session.data
        .edges()
        .map((e) => `${String(e.source)}->${String(e.target)}`)
        .sort();
}

describe("source-steps drafts: an edge from a column of a source in the graph", () => {
    it("connects each entry to the person its badge names, and the preview counts what it draws", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(ENTRIES, { key: "entry", type: "entry" });
        const entries = session.data.sources({ staged: true })[0]?.key ?? "";
        const people = await session.data.stage(PEOPLE, { key: "badge", type: "person" });

        const draft = session.data.draft();
        draft.connect({
            from: { source: people, field: "badge" },
            into: { source: entries, field: "badge" },
            edgeType: "entered",
        });
        const pv = draft.preview();
        const buckets = pv.steps.find((s) => s.op === "join.edges")?.buckets;
        assert.strictEqual(buckets?.matched, 4, "e1, e2, e3 and e4");
        assert.strictEqual(buckets?.newEdges, 4);
        assert.strictEqual(buckets?.unmatched, 1, "B9 badges no person");
        assert.strictEqual(buckets?.fanOut, 0);
        assert.strictEqual(buckets?.selfLoops, 0);
        assert.deepStrictEqual(pv.after.edgeTypes, { entered: 4 });
        assert.strictEqual(pv.after.nodes, 9);

        await draft.display(true);
        assert.deepStrictEqual(drawn(session), ["e1->B1", "e2->B2", "e3->B1", "e4->B3"], "the drawn draft");
        await draft.commit();
        assert.deepStrictEqual(drawn(session), ["e1->B1", "e2->B2", "e3->B1", "e4->B3"], "after the commit");
        assert.notStrictEqual(session.data.sources({ staged: true }).find((s) => s.key === people)?.state, "staged");
    });

    it("runs the edge the other way when asked", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(ENTRIES, { key: "entry", type: "entry" });
        const entries = session.data.sources({ staged: true })[0]?.key ?? "";
        const people = await session.data.stage(PEOPLE, { key: "badge", type: "person" });
        const draft = session.data.draft();
        draft.connect({
            from: { source: people, field: "badge" },
            into: { source: entries, field: "badge" },
            direction: "from-into",
        });
        await draft.commit();
        assert.deepStrictEqual(drawn(session), ["B1->e1", "B1->e3", "B2->e2", "B3->e4"]);
    });

    it("draws an edge between two nodes whose keys share a column name, never a self-loop", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(PEOPLE, { key: "badge", type: "person" });
        const people = session.data.sources({ staged: true })[0]?.key ?? "";
        const cards = await session.data.stage(csv("cards.csv", "badge,issued", "B1,2024", "B2,2025"), {
            key: "badge",
            type: "card",
        });
        const draft = session.data.draft();
        draft.connect({ from: { source: cards, field: "badge" }, into: { source: people }, edgeType: "holds" });
        assert.strictEqual(draft.preview().steps.find((s) => s.op === "join.edges")?.buckets?.selfLoops, 0);
        await draft.commit();
        const edges = session.data.edges();
        assert.lengthOf(edges, 2);
        for (const e of edges) {
            assert.notStrictEqual(String(e.source), String(e.target), "an edge between two nodes");
        }
    });
});
