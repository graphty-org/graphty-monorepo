/**
 * @file The owner's founding example end to end, through the public API only (design
 * design/data/multiple-data-sources-design.md sections 5.2-5.6, 13): door entries joined to the
 * people who badged in and the buildings whose doors they opened. A reader stages the entries, an
 * HR list and a visitor list; reads the live match counts; in one draft makes an edge to people by
 * badge and to buildings by door, merges the HR list with a values-differ rule and a pick, leaves
 * a test badge out, answers the key-overlap question the visitor list asks, reads the preview and
 * commits it as one undo step; then undoes it (the sources return to staged) and redoes it.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type SourceDraft } from "../../../src/session";
import { refused } from "./scenario";

/**
 * A CSV source.
 * @param name - Its name.
 * @param data - Its lines.
 * @returns What `import` and `stage` take.
 */
function csv(name: string, ...data: string[]): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data: data.join("\n") }, name };
}

const PEOPLE = csv("people.csv", "badge,name,dept", "B1,Ann,Ops", "B2,Bo,Lab", "B3,Cy,Sales");
const BUILDINGS = csv("buildings.csv", "door,building", "D1,North", "D2,South");
/** B9 badges no person, b3 is B3 typed in lower case, D3 is no building's door, B2 badged in twice. */
const ENTRIES = csv(
    "entries.csv",
    "entry,badge,door",
    "E1,B1,D1",
    "E2,B1,D2",
    "E3,B2,D1",
    "E4,B9,D1",
    "E5,b3,D3",
    "E6,B2,D2",
);
/** HR's list: B1 and B2 name another department than people.csv does. */
const HR = csv("hr.csv", "badge,dept", "B1,Operations", "B2,Research", "B3,Sales");
/** Visitors: V1 is new, B1 is a person already. */
const VISITORS = csv("visitors.csv", "badge,name", "B1,Ann", "V1,Val");

/** The committed project the reader starts from, and the three staged sources. */
interface Founding {
    readonly session: GraphSession;
    readonly people: string;
    readonly buildings: string;
    readonly entries: string;
    readonly hr: string;
    readonly visitors: string;
}

/**
 * People and buildings in the graph; entries, HR and visitors staged.
 * @returns The session and the sources.
 */
async function founding(): Promise<Founding> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(PEOPLE, { key: "badge", type: "person" });
    const people = session.data.sources({ staged: true })[0]?.key ?? "";
    const buildings = await session.data.stage(BUILDINGS, { key: "door", type: "building" });
    await session.data.add(buildings);
    const entries = await session.data.stage(ENTRIES, { key: "entry", type: "entry" });
    const hr = await session.data.stage(HR, { key: "badge" });
    const visitors = await session.data.stage(VISITORS, { key: "badge", type: "person" });
    return { session, people, buildings, entries, hr, visitors };
}

/**
 * Where each source stands, by key.
 * @param session - The session.
 * @returns Each source's state.
 */
function states(session: GraphSession): Record<string, string | undefined> {
    return Object.fromEntries(session.data.sources({ staged: true }).map((s) => [s.key, s.state]));
}

/**
 * The place of the draft's step that reads a source with an op.
 * @param draft - The draft.
 * @param op - The step's op.
 * @param source - The source it reads.
 * @param nth - Which of them, from 0.
 * @returns The step's place.
 */
function stepOf(draft: SourceDraft, op: string, source: string, nth = 0): number {
    const found = draft.steps().filter((s) => s.op === op && s.source === source)[nth];
    assert.isDefined(found, `${op} on ${source}`);
    return found?.index ?? -1;
}

describe("source-steps drafts: the founding example", () => {
    it("joins door entries to people and buildings in one draft, commits it as one step, and undoes it", async () => {
        const { session, people, buildings, entries, hr, visitors } = await founding();
        const before = session.data.store.getSnapshot();
        assert.strictEqual(before.nodeCount, 5, "three people and two buildings");
        assert.strictEqual(before.edgeCount, 0);
        assert.deepInclude(states(session), { [entries]: "staged", [hr]: "staged", [visitors]: "staged" });
        const historyBefore = session.history.steps.length;
        const reasons: string[] = [];
        session.on("data:draft-changed", (change) => reasons.push(change.reason));

        // The Join card's counts, before any act: hashing two columns, no build.
        const badge = { from: { source: entries, field: "badge" }, into: { source: people } } as const;
        assert.deepStrictEqual(session.data.matchCounts(badge), {
            matched: 2,
            only1: 1,
            only2: 2,
            repeated1: 0,
            repeated2: 2,
            fanOut: 0,
            textVersusNumber: 0,
            moreWithIgnoreCase: 1,
            moreWithIgnoreSpaces: 0,
            rows: 6,
            matchedRows: 4,
            emptyRows: 0,
            moreRowsWithIgnoreCase: 1,
            moreRowsWithIgnoreSpaces: 0,
            moreRowsWithBoth: 1,
            matchedNodes: 2,
            moreNodesWithIgnoreCase: 1,
            moreNodesWithIgnoreSpaces: 0,
            moreNodesWithBoth: 1,
        });
        assert.deepStrictEqual(
            session.data.matchValues(badge, { only: "only2" }).values.map((v) => v.value),
            ["B9", "b3"],
        );

        const draft = session.data.draft({ askOverlap: true });
        assert.deepStrictEqual(draft.matchCounts(badge), session.data.matchCounts(badge), "the draft counts alike");
        assert.strictEqual(draft.matchCounts(badge, { ignoreCase: true }).matched, 3, "b3 meets B3");

        // Make an edge to people by badge, and to buildings by door.
        draft.connect({ ...badge, edgeType: "by", ignoreCase: true });
        draft.connect({ from: { source: entries, field: "door" }, into: { source: buildings }, edgeType: "at" });
        const toPeople = stepOf(draft, "join.edges", entries, 0);
        const toBuildings = stepOf(draft, "join.edges", entries, 1);

        // Merge HR's list into people: two departments differ; HR's rule, then one pick back.
        draft.merge({ from: { source: hr, field: "badge" }, into: { source: people } });
        const merge = stepOf(draft, "join.merge", hr);
        draft.editStep(merge, { clash: { dept: "overwrite" } });

        // The visitor list meets B1, so adding it asks the key-overlap question.
        draft.add(visitors);
        let pv = draft.preview();
        assert.deepStrictEqual(
            pv.questions.map((q) => [q.params.source, q.params.count, q.params.of]),
            [[visitors, 1, 2]],
        );
        assert.deepStrictEqual(await refused(() => draft.commit(), "E_OVERLAP_UNANSWERED"), {
            space: pv.questions[0]?.params.space,
            source: visitors,
        });
        draft.answerOverlap(visitors, "merge");

        pv = draft.preview();
        assert.deepStrictEqual(pv.questions, []);
        const people1 = pv.steps.find((s) => s.index === toPeople)?.buckets;
        assert.strictEqual(people1?.matched, 5, "E1, E2, E3, E6, and E5 by ignoring case");
        assert.strictEqual(people1?.unmatched, 1, "B9 badges no person");
        assert.strictEqual(people1?.newEdges, 5);
        const doors = pv.steps.find((s) => s.index === toBuildings)?.buckets;
        assert.strictEqual(doors?.matched, 5);
        assert.strictEqual(doors?.unmatched, 1, "D3 is no building's door");
        const merged = pv.steps.find((s) => s.index === merge)?.buckets;
        assert.strictEqual(merged?.merged, 3, "every HR row meets its person");
        assert.strictEqual(merged?.valuesDiffer.dept, 2, "B1 and B2");
        assert.deepInclude(
            pv.issues.map((i) => i.code),
            "W_UNMATCHED",
        );
        assert.strictEqual(pv.nodes.added, 7, "six entries and V1");
        assert.strictEqual(pv.after.edgeTypes.by, 5);
        assert.strictEqual(pv.after.edgeTypes.at, 5);
        assert.strictEqual(pv.after.nodeTypes.entry, 6);
        assert.strictEqual(pv.after.nodeTypes.person, 4, "B1-B3 and V1");

        // The Values differ drill-down: both cells show HR's value under the rule.
        const cells = pv.cells({ column: "dept", step: merge });
        assert.strictEqual(cells.total, 2);
        assert.deepStrictEqual(cells.cells.map((c) => [c.shown, c.rule, c.decided]).sort(), [
            ["Operations", "overwrite", false],
            ["Research", "overwrite", false],
        ]);
        // A pick: B2 keeps people.csv's Lab.
        const b2 = cells.cells.find((c) => c.shown === "Research");
        assert.isDefined(b2);
        draft.pick(b2?.ref ?? { kind: "node", id: "" }, "dept", people);
        pv = draft.preview();
        assert.deepStrictEqual(
            pv.cells({ column: "dept", only: "decided" }).cells.map((c) => [c.shown, c.by]),
            [["Lab", "reader"]],
        );
        assert.strictEqual(pv.cells({ column: "dept", only: "open" }).total, 1);

        // Exclude: B2's entries make no edge to their person.
        const b2Rows = pv.rows({ step: toPeople, bucket: "matched" }).rows.filter((r) => r.incoming?.badge === "B2");
        assert.strictEqual(b2Rows.length, 2, "E3 and E6");
        draft.exclude(
            toPeople,
            b2Rows.map((r) => r.key ?? ""),
        );
        pv = draft.preview();
        assert.strictEqual(pv.steps.find((s) => s.index === toPeople)?.buckets?.matched, 3);
        assert.strictEqual(pv.after.edgeTypes.by, 3);
        assert.strictEqual(session.data.store.getSnapshot().nodeCount, 5, "the graph waits for the commit");
        assert.strictEqual(session.history.steps.length, historyBefore, "no act is an undo step");

        await draft.commit();
        assert.isFalse(draft.open);
        assert.deepStrictEqual(reasons.at(0), "opened");
        assert.deepStrictEqual(reasons.at(-1), "committed");
        assert.strictEqual(session.history.steps.length, historyBefore + 1, "the commit is one undo step");
        const after = session.data.store.getSnapshot();
        assert.strictEqual(after.nodeCount, pv.after.nodes);
        assert.strictEqual(after.edgeCount, pv.after.edges);
        assert.strictEqual(after.nodeCount, 12, "five, six entries and V1");
        assert.strictEqual(after.edgeCount, 8, "three to people and five to buildings");
        assert.deepStrictEqual(
            session.data.steps().map((s) => s.buckets),
            pv.steps.map((s) => s.buckets),
        );
        assert.deepStrictEqual(
            session.data
                .conflicts({ column: "dept" })
                .map((c) => [c.shown, c.by])
                .sort(),
            [
                ["Lab", "reader"],
                ["Operations", "overwrite"],
            ],
        );
        assert.deepInclude(states(session), { [entries]: "built", [hr]: "built", [visitors]: "built" });

        // Undo returns the entries, HR and visitors to staged; redo commits them again.
        await session.undo();
        assert.strictEqual(session.data.store.getSnapshot().nodeCount, 5);
        assert.strictEqual(session.data.store.getSnapshot().edgeCount, 0);
        assert.deepInclude(states(session), { [entries]: "staged", [hr]: "staged", [visitors]: "staged" });
        await session.redo();
        assert.strictEqual(session.data.store.getSnapshot().nodeCount, 12);
        assert.strictEqual(session.data.store.getSnapshot().edgeCount, 8);
        assert.deepStrictEqual(
            session.data.steps().map((s) => s.buckets),
            pv.steps.map((s) => s.buckets),
        );
        session.dispose();
    });

    it("discarding the draft leaves the graph, the history and the staged sources as they were", async () => {
        const { session, people, entries } = await founding();
        const saved = (await session.project.save()).text;
        const history = session.history.steps.length;
        const draft = session.data.draft();
        draft.connect({ from: { source: entries, field: "badge" }, into: { source: people }, edgeType: "by" });
        assert.strictEqual(draft.preview().after.edges, 4);
        draft.dispose();
        assert.isFalse(draft.open);
        assert.strictEqual(session.data.store.getSnapshot().edgeCount, 0);
        assert.strictEqual(session.history.steps.length, history);
        assert.strictEqual(states(session)[entries], "staged");
        assert.strictEqual((await session.project.save()).text, saved);
        session.dispose();
    });
    it("runs the guide's first example: entries made into edges to people, previewed, committed and undone", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const people = await session.data.stage(PEOPLE, { key: "badge", type: "person" });
        await session.data.add(people);
        const entries = await session.data.stage(ENTRIES, { key: "entry", type: "entry" });

        const draft = session.data.draft();
        const byBadge = { from: { source: entries, field: "badge" }, into: { source: people } };
        assert.strictEqual(draft.matchCounts(byBadge).matched, 2);
        draft.connect({ ...byBadge, edgeType: "entered" });

        const preview = draft.preview();
        assert.strictEqual(preview.after.edges - preview.before.edges, 4, "E1, E2, E3 and E6");
        await draft.commit();
        assert.strictEqual(session.data.count({ type: "entered" }).edges, 4);
        await session.undo();
        assert.strictEqual(states(session)[entries], "staged");
        assert.strictEqual(session.data.store.getSnapshot().edgeCount, 0);
        session.dispose();
    });
});
