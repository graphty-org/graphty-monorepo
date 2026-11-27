/**
 * @file Make an edge from a column of a source already in the graph (not its key) to a staged
 * source's key (design design/data/multiple-data-sources-design.md 3.5, 3.6, 5.2): door entries are
 * the graph's nodes, people arrive staged, and each entry connects to the person its badge names,
 * as many entries to one person as share a badge. The preview counts what the graph then draws.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors/GraphtyError";
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

    it("refuses an other end that names no field, and removing the other end leaves a one-match Connect", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(PEOPLE, { key: "badge", type: "person" });
        await session.data.import(csv("doors.csv", "door,building", "D1,North", "D2,South"), {
            key: "door",
            type: "door",
            mode: "merge",
        });
        const entries = await session.data.stage(ENTRIES, { key: "entry", type: "entry" });
        const draft = session.data.draft();
        const from = { source: entries, field: "badge" };
        draft.connect({ from, into: { space: "person" }, to: { field: "door", into: { space: "door" } } });
        const at = draft.steps().findIndex((row) => row.op === "join.edges");
        assert.isAbove(at, -1);
        assert.strictEqual(draft.steps()[at]?.act?.to?.field, "door", "two ends");
        let refusal: unknown = null;
        try {
            draft.replaceStep(at, {
                act: "connect",
                options: { from, into: { space: "person" }, to: { field: "", into: { space: "door" } } },
            });
        } catch (error) {
            refusal = error;
        }
        assert.isTrue(
            isGraphtyError(refusal) && refusal.code === "E_BAD_COMMAND" && refusal.details.reason === "no-field",
        );
        draft.replaceStep(at, { act: "connect", options: { from, into: { space: "person" } } });
        const row = draft.steps().find((each) => each.op === "join.edges");
        assert.isUndefined(row?.act?.to, "read back without an other end");
        assert.isAbove(
            row?.buckets === null
                ? 0
                : (draft.preview().steps.find((s) => s.op === "join.edges")?.buckets?.newEdges ?? 0),
            0,
        );
        draft.dispose();
        session.dispose();
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
    it("connects door entries staged as edges to people and buildings, one edge per entry, read back", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("people.csv", "person,name", "P1,Ann", "P2,Bo"), {
            key: "person",
            type: "person",
        });
        const draft = session.data.draft();
        const buildings = await draft.stage(csv("buildings.csv", "bldg,floors", "H1,4", "H2,9"), {
            key: "bldg",
            type: "building",
        });
        const doors = await draft.stage(
            csv("doors.csv", "entry,person,bldg", "E1,P1,H1", "E2,P1,H2", "E3,P2,H1", "E4,P9,H1"),
            { edges: { from: { column: "person" }, to: { column: "bldg" } } },
        );
        assert.strictEqual(draft.sourceTable(doors).summary().mapping.rows, "edges");
        draft.connect({
            from: { source: doors, field: "person" },
            into: { space: "person" },
            to: { field: "bldg", into: { source: buildings } },
            edgeType: "entered",
        });
        const act = draft.steps().find((row) => row.source === doors)?.act;
        assert.strictEqual(act?.act, "connect", "read back as the Connect that made it");
        assert.strictEqual(act?.to?.field, "bldg");
        await draft.commit();
        assert.deepStrictEqual(drawn(session), ["P1->H1", "P1->H2", "P2->H1"], "P9 names no person");
        session.dispose();
    });
    it("commits a staged source the draft reads as edges, so the Connect over its rows lands", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("people.csv", "person,name", "P1,Ann", "P2,Bo"), {
            key: "person",
            type: "person",
        });
        const buildings = await session.data.stage(csv("buildings.csv", "bldg,floors", "H1,4", "H2,9"), {
            key: "bldg",
            type: "building",
        });
        const doors = await session.data.stage(csv("doors.csv", "entry,person,bldg", "E1,P1,H1", "E2,P2,H2"), {
            key: "entry",
        });
        const draft = session.data.draft();
        draft.setMapping(doors, { rows: "edges", edges: { source: "person", target: "bldg" } });
        draft.connect({
            from: { source: doors, field: "person" },
            into: { space: "person" },
            to: { field: "bldg", into: { source: buildings } },
        });
        await draft.commit();
        assert.deepStrictEqual(drawn(session), ["P1->H1", "P2->H2"], "the rows are read as edges after the commit");
        session.dispose();
    });
});
