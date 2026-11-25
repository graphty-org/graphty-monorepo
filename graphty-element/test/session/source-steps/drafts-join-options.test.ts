/**
 * @file Joins from a source however its rows are read, and the options of a Connect (design
 * design/data/multiple-data-sources-design.md, sections 3.5, 3.6 and 5.2): Merge and a one-match
 * Connect from rows read as edges, `to.keepRow` (a row stays a node between two ends) and
 * `existing: "merge"` (a row folds into the edge already joining its ends). Each is previewed,
 * committed, read back by `steps()`, undone, and saved and reopened as the same graph.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors/GraphtyError";
import { createGraphSession, type GraphSession, type SourceDraft, type SourceStepRow } from "../../../src/session";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

const PEOPLE = csv("people.csv", "person,name", "P1,Ann", "P2,Bo", "P3,Cy");
const BUILDINGS = csv("buildings.csv", "bldg,floors", "H1,4", "H2,9");
/** P1 enters twice through H1, P9 names no person and E5 names none. */
const DOORS = csv(
    "doors.csv",
    "entry,person,bldg,door",
    "E1,P1,H1,north",
    "E2,P1,H1,roof",
    "E3,P2,H2,north",
    "E4,P9,H1,roof",
    "E5,,H2,dock",
);
const AS_EDGES = { edges: { from: { column: "person" }, to: { column: "bldg" } } };

/**
 * People and buildings in the graph, the door entries staged, and a draft open.
 * @param stage - How the entries are staged; as edges by default.
 * @returns The session, the draft and the entries' key.
 */
async function opened(
    stage: Parameters<GraphSession["data"]["stage"]>[1] = AS_EDGES,
): Promise<{ session: GraphSession; d: SourceDraft; doors: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(PEOPLE, { key: "person", type: "person" });
    await session.data.import(BUILDINGS, { key: "bldg", type: "building", mode: "merge" });
    const d = session.data.draft();
    const doors = await d.stage(DOORS, stage);
    return { session, d, doors };
}

/**
 * Each edge as `<source>-><target>` by the ends' ids, sorted; a row kept as a node reads as its entry.
 * @param session - The session.
 * @returns The edges.
 */
function drawn(session: GraphSession): string[] {
    const name = (id: string | number): string => (session.data.node(id)?.entry as string) ?? String(id);
    return session.data
        .edges()
        .map((e) => `${name(e.source)}->${name(e.target)}`)
        .sort();
}

/**
 * The graph after a save and an open, as `drawn` and the node count give it, with its steps' acts.
 * @param session - The session.
 * @returns The reopened graph.
 */
async function reopened(
    session: GraphSession,
): Promise<{ edges: string[]; nodes: number; acts: readonly SourceStepRow["act"][] }> {
    const { text } = await session.project.save();
    const other = createGraphSession({ features: ["source-steps"] });
    const report = await other.project.open(text);
    assert.deepStrictEqual(report.problems, []);
    const out = {
        edges: drawn(other),
        nodes: other.data.nodes().length,
        acts: other.data.steps().map((row) => row.act),
    };
    other.dispose();
    return out;
}

/**
 * The graph as `reopened` reads it.
 * @param session - The session.
 * @returns The graph.
 */
const now = (session: GraphSession): Awaited<ReturnType<typeof reopened>> => ({
    edges: drawn(session),
    nodes: session.data.nodes().length,
    acts: session.data.steps().map((row) => row.act),
});

/**
 * The details of the refusal a call throws.
 * @param call - The call.
 * @param code - The code it must throw.
 * @returns The details.
 */
function refusal(call: () => unknown, code: string): Readonly<Record<string, unknown>> {
    let caught: unknown = null;
    try {
        call();
    } catch (error) {
        caught = error;
    }
    if (!isGraphtyError(caught)) {
        assert.fail(`no ${code}`);
    }
    assert.strictEqual(caught.code, code);
    return caught.details;
}

describe("source-steps drafts: Merge from rows read as edges", () => {
    it("folds each row into the node it names, keeps the value naming none, and draws no edge", async () => {
        const { session, d, doors } = await opened();
        d.merge({ from: { source: doors, field: "person" }, into: { space: "person" }, aggregate: { door: "list" } });
        const row = d.preview().steps.at(-1);
        assert.isDefined(row);
        if (row === undefined) {
            return;
        }
        assert.strictEqual(row.op, "join.merge");
        assert.deepInclude(row.buckets, { merged: 3, keptNew: 1, untouched: 1, emptyKey: 1, unmatched: 1 });
        assert.deepStrictEqual(row.buckets?.groups, [3, 2]);
        assert.deepStrictEqual(d.preview().marks.nodes, { merged: 2, new: 1, untouched: 1, removed: 0 });
        assert.strictEqual(d.preview().marks.edges.new, 0);
        assert.strictEqual(d.preview().rows({ step: row.index, bucket: "merged" }).total, 3);
        await d.commit();
        assert.deepStrictEqual(drawn(session), []);
        assert.deepInclude(session.data.node("P1"), { name: "Ann", bldg: "H1", door: ["north", "roof"] });
        assert.deepInclude(session.data.node("P9"), { bldg: "H1" }, "the value naming no person is kept as one");
        assert.strictEqual(session.data.spaces().find((each) => each.space === "person")?.nodes, 4);
        assert.deepStrictEqual(await reopened(session), now(session));
        await session.undo();
        assert.isUndefined(session.data.node("P9"));
        assert.isUndefined(session.data.node("P1")?.door);
        session.dispose();
    });

    it("reads back as the Merge that made it, and editStep and replaceStep change it", async () => {
        const { session, d, doors } = await opened();
        const into = { space: "person" };
        d.merge({ from: { source: doors, field: "person" }, into });
        const at = d.steps().length - 1;
        assert.deepStrictEqual(d.steps()[at]?.act, {
            act: "merge",
            from: { source: doors, field: "person" },
            into,
            ignoreCase: false,
            ignoreSpaces: false,
            repeated: null,
            aggregate: null,
            unmatchedFrom: "keep",
        });
        d.editStep(at, { unmatchedFrom: "drop" });
        assert.strictEqual(d.preview().marks.nodes.new, 0, "P9 is left out");
        assert.strictEqual(d.steps()[at]?.act?.unmatchedFrom, "drop");
        d.replaceStep(at, {
            act: "connect",
            options: {
                from: { source: doors, field: "person" },
                into,
                to: { field: "bldg", into: { space: "building" } },
            },
        });
        assert.strictEqual(d.steps()[at]?.act?.act, "connect");
        assert.isTrue(d.undo());
        assert.strictEqual(d.steps()[at]?.act?.act, "merge");
        d.removeStep(at);
        assert.strictEqual(d.preview().marks.merged, 0);
        assert.strictEqual(d.sourceTable(doors).summary().mapping.rows, "edges", "still read as edges");
        d.dispose();
        session.dispose();
    });

    it("merges on a field that is not node 1's key, and by a clash rule", async () => {
        const { session, d } = await opened();
        const [people] = session.data.sources();
        const calls = await d.stage(csv("calls.csv", "caller,callee,floors", "Ann,Bo,1", "Zed,Bo,2"), {
            edges: { from: { column: "caller" }, to: { column: "callee" } },
        });
        d.merge({
            from: { source: calls, field: "caller" },
            into: { source: people?.key ?? "", field: "name" },
            unmatchedFrom: "keep",
        });
        assert.deepInclude(d.preview().steps.at(-1)?.buckets, { merged: 1, keptNew: 1 });
        assert.deepStrictEqual(d.steps().at(-1)?.act?.into, {
            space: "person",
            source: people?.key,
            field: "name",
        });
        d.dispose();
        const again = session.data.draft();
        const heights = await again.stage(csv("heights.csv", "bldg,near,floors", "H1,H2,7"), {
            edges: { from: { column: "bldg" }, to: { column: "near" } },
        });
        again.merge({
            from: { source: heights, field: "bldg" },
            into: { space: "building" },
            clash: { floors: "max" },
        });
        await again.commit();
        assert.deepInclude(session.data.node("H1"), { floors: 7, near: "H2" });
        session.dispose();
    });

    it("adds the node rows of a source an earlier two-end Connect read without adding", async () => {
        const { session, d, doors } = await opened({ key: "entry" });
        const badges = await d.stage(csv("badges.csv", "entry,color", "E1,red"), { key: "entry", type: "badge" });
        d.connect({
            from: { source: doors, field: "person" },
            into: { space: "person" },
            to: { field: "bldg", into: { space: "building" } },
        });
        d.merge({ from: { source: doors, field: "entry" }, into: { source: badges } });
        assert.deepInclude(d.preview().steps.at(-1)?.buckets, { merged: 1, keptNew: 4 });
        d.dispose();
        session.dispose();
    });
});

describe("source-steps drafts: a one-match Connect makes each row a node", () => {
    it("from rows read as edges: a node per row, an edge to the node each names", async () => {
        const { session, d, doors } = await opened();
        d.connect({ from: { source: doors, field: "person" }, into: { space: "person" }, edgeType: "entered" });
        const at = d.steps().length - 1;
        assert.deepInclude(d.steps()[at]?.act, {
            act: "connect",
            from: { source: doors, field: "person" },
            into: { space: "person" },
            direction: "into-from",
            edgeType: "entered",
        });
        assert.isUndefined(d.steps()[at]?.act?.to);
        assert.deepStrictEqual(d.preview().marks.nodes.new, 5);
        assert.deepInclude(d.preview().steps[at]?.buckets, {
            newNodes: 5,
            newEdges: 3,
            matched: 3,
            unmatched: 1,
            emptyKey: 1,
        });
        d.replaceStep(at, {
            act: "connect",
            options: { from: { source: doors, field: "person" }, into: { space: "person" }, direction: "from-into" },
        });
        assert.strictEqual(d.steps()[at]?.act?.direction, "from-into");
        await d.commit();
        assert.deepStrictEqual(drawn(session), ["E1->P1", "E2->P1", "E3->P2"]);
        assert.deepStrictEqual(await reopened(session), now(session));
        await session.undo();
        assert.lengthOf(session.data.nodes(), 5);
        session.dispose();
    });

    it("from node rows with no key column", async () => {
        const { session, d } = await opened();
        const notes = await d.stage(csv("notes.csv", "text,about", "late,P1", "early,P1", "lost,P9"), {
            edges: { from: { column: "about" }, to: { column: "about" } },
        });
        d.setMapping(notes, { rows: "nodes" });
        assert.isUndefined(d.sourceTable(notes).summary().mapping.key);
        d.connect({ from: { source: notes, field: "about" }, into: { space: "person" } });
        const row = d.steps().find((each) => each.op === "join.edges");
        assert.isFalse(row?.held, "it reads no column the rows lack");
        assert.isUndefined(row?.act?.to);
        assert.deepInclude(row?.act, { act: "connect", direction: "into-from" });
        assert.deepInclude(d.preview().marks, { edges: { merged: 0, new: 2, removed: 0 } });
        await d.commit();
        assert.lengthOf(session.data.edges(), 2);
        assert.deepStrictEqual(await reopened(session), now(session));
        session.dispose();
    });

    it("onto a field of rows read as edges: the end whose column it is", async () => {
        const { session, d, doors } = await opened();
        const cards = await d.stage(csv("cards.csv", "card,owner", "C1,P1", "C2,P2"), { key: "card", type: "card" });
        assert.deepInclude(
            d.matchCounts({ from: { source: cards, field: "owner" }, into: { source: doors, field: "person" } }),
            { matched: 2 },
        );
        refusal(
            () => d.connect({ from: { source: cards, field: "owner" }, into: { source: doors, field: "door" } }),
            "E_AMBIGUOUS_ID",
        );
        const loops = await d.stage(csv("loops.csv", "at,note", "P1,x"), {
            edges: { from: { column: "at" }, to: { column: "at" } },
        });
        d.setMapping(loops, { edges: { sourceSpace: "a", targetSpace: "b" } });
        refusal(
            () => d.connect({ from: { source: cards, field: "owner" }, into: { source: loops, field: "at" } }),
            "E_AMBIGUOUS_ID",
        );
        d.connect({ from: { source: cards, field: "owner" }, into: { source: doors, field: "person" } });
        assert.deepInclude(d.preview().steps.at(-1)?.buckets, { matched: 2, newEdges: 2 });
        d.dispose();
        session.dispose();
    });
});

describe("source-steps drafts: suggestMatches from rows read as edges", () => {
    it("proposes a Connect for each column naming nodes, never onto its own ends", async () => {
        const { session, d, doors } = await opened({
            edges: { from: { column: "person", space: "visitor" }, to: { column: "bldg", space: "site" } },
        });
        const pairs = (): string[] =>
            d.suggestMatches(doors).map((each) => {
                assert.strictEqual(each.result, "connect");
                return `${each.matches[0].from.field}=${each.matches[0].into.space ?? ""}`;
            });
        assert.sameMembers(pairs(), ["person=person", "bldg=building"]);
        d.add(doors);
        assert.sameMembers(pairs(), ["person=person", "bldg=building"], "its own ends are no match");
        d.dispose();
        session.dispose();
    });
});

describe("source-steps drafts: a Connect over the ends a source already reads", () => {
    it("reads back as the Connect that made it, and an Extract as none", async () => {
        const { session, d, doors } = await opened({
            edges: { from: { column: "person", space: "person" }, to: { column: "bldg", space: "building" } },
        });
        d.connect({
            from: { source: doors, field: "person" },
            into: { space: "person" },
            to: { field: "bldg", into: { space: "building" } },
        });
        const part = d.extract(doors, { column: "door", type: "door", from: "source" });
        const [connect, extract] = d.steps().slice(-2);
        assert.deepInclude(connect?.act, {
            act: "connect",
            from: { source: doors, field: "person" },
            into: { space: "person" },
            to: { field: "bldg", into: { space: "building" } },
        });
        assert.strictEqual(extract?.buckets?.part, part);
        assert.isNull(extract?.act ?? null);
        await d.commit();
        assert.deepStrictEqual(await reopened(session), now(session));
        session.dispose();
    });
});

describe("source-steps drafts: Connect with existing edges", () => {
    /** Leases already join P1 to H1 and P2 to H1. */
    const LEASES = csv("leases.csv", "lease,who,where,rent", "L1,P1,H1,10", "L2,P2,H1,20");

    /**
     * People, buildings and leases in the graph, and the door entries staged as edges.
     * @returns The session, the draft and the entries' key.
     */
    async function leased(): Promise<{ session: GraphSession; d: SourceDraft; doors: string }> {
        const { session, d, doors: _unused } = await opened();
        d.dispose();
        await session.data.import(LEASES, {
            mode: "merge",
            edges: {
                from: { column: "who", space: "person" },
                to: { column: "where", space: "building" },
                id: "lease",
            },
        });
        const leases = session.data.sources().at(-1)?.key ?? "";
        await session.data.declareType({ name: "lease", kind: "edge", rules: [{ source: leases }] });
        const next = session.data.draft();
        return { session, d: next, doors: await next.stage(DOORS, AS_EDGES) };
    }
    const options = (doors: string): Parameters<SourceDraft["connect"]>[0] => ({
        from: { source: doors, field: "person" },
        into: { space: "person" },
        to: { field: "bldg", into: { space: "building" } },
    });

    it("merge folds a row's columns into the edge joining its ends, and adds an edge where none does", async () => {
        const { session, d, doors } = await leased();
        d.connect({ ...options(doors), existing: "merge" });
        const at = d.steps().length - 1;
        assert.strictEqual(d.steps()[at]?.act?.existing, "merge");
        assert.deepInclude(d.preview().steps[at]?.buckets, {
            matched: 3,
            mergedEdges: 1,
            newEdges: 1,
            parallelPairs: 0,
        });
        assert.deepStrictEqual(d.preview().marks.edges, { merged: 1, new: 1, removed: 0 });
        assert.strictEqual(d.preview().rows({ step: at, bucket: "mergedEdges" }).total, 1);
        await d.display(true);
        const shown = session.styles.showDraft({ merged: "#7048e8", new: "#e8590c" });
        await session.styles.settled();
        const folded = session.data.edges().find((e) => e.source === "P1");
        const look = session.styles.explain({ edge: folded?.id ?? "" }).merged["edge.color"];
        assert.strictEqual((look as { hex?: string } | undefined)?.hex, "#7048e8", "drawn in the merged color");
        shown.end();
        await d.display(false);
        await d.commit();
        assert.deepStrictEqual(drawn(session), ["P1->H1", "P2->H1", "P2->H2"]);
        const lease = session.data.edges().find((e) => e.source === "P1");
        assert.deepInclude(lease, { rent: 10, entry: "E1", door: "north" }, "E1 and E2 fold in, the first wins");
        assert.deepStrictEqual(await reopened(session), now(session));
        await session.undo();
        assert.deepStrictEqual(drawn(session), ["P1->H1", "P2->H1"]);
        assert.isUndefined(session.data.edges().find((e) => e.source === "P1")?.door);
        session.dispose();
    });

    it("add is the default, and editStep and replaceStep change the choice", async () => {
        const { session, d, doors } = await leased();
        d.connect(options(doors));
        const at = d.steps().length - 1;
        const counts = (): (number | undefined)[] => {
            const { buckets } = d.preview().steps[at] ?? {};
            return [buckets?.mergedEdges, buckets?.newEdges];
        };
        assert.isUndefined(d.steps()[at]?.act?.existing);
        assert.deepStrictEqual(counts(), [0, 3]);
        d.editStep(at, { existing: "merge", clash: "overwrite" });
        assert.deepStrictEqual(counts(), [1, 1]);
        d.editStep(at, { existing: "add" });
        assert.deepStrictEqual(counts(), [0, 3]);
        assert.isUndefined(d.steps()[at]?.act?.existing);
        d.replaceStep(at, { act: "connect", options: { ...options(doors), existing: "merge" } });
        assert.deepStrictEqual(counts(), [1, 1]);
        d.undo();
        assert.deepStrictEqual(counts(), [0, 3]);
        assert.deepInclude(
            refusal(() => {
                d.editStep(0, { existing: "merge" });
            }, "E_BAD_COMMAND"),
            { reason: "existing", op: "join.add" },
        );
        d.dispose();
        session.dispose();
    });

    it("merge folds only into an edge of the type the rows are given, the same way round", async () => {
        const { session, d, doors } = await leased();
        d.connect({ ...options(doors), existing: "merge", edgeType: "entered" });
        const at = d.steps().length - 1;
        assert.deepInclude(d.preview().steps[at]?.buckets, { mergedEdges: 0, newEdges: 3 });
        d.replaceStep(at, { act: "connect", options: { ...options(doors), existing: "merge", edgeType: "lease" } });
        assert.deepInclude(d.preview().steps[at]?.buckets, { mergedEdges: 1, newEdges: 1 });
        d.replaceStep(at, {
            act: "connect",
            options: { ...options(doors), existing: "merge", direction: "from-into" },
        });
        assert.deepInclude(d.preview().steps[at]?.buckets, { mergedEdges: 0, newEdges: 3 });
        d.dispose();
        session.dispose();
    });
});

describe("source-steps drafts: Connect keeping each row as a node", () => {
    const options = (doors: string, keepRow: boolean): Parameters<SourceDraft["connect"]>[0] => ({
        from: { source: doors, field: "person" },
        into: { space: "person" },
        to: { field: "bldg", into: { space: "building" }, keepRow },
    });
    const KEPT = ["E1->H1", "E2->H1", "E3->H2", "E4->H1", "E5->H2", "P1->E1", "P1->E2", "P2->E3"];

    for (const [rows, stage] of [
        ["edges", AS_EDGES],
        ["nodes", { key: "entry", type: "entry" }],
        ["nodes with no key", undefined],
    ] as const) {
        it(`reads ${rows}: every row a node, with an edge to each end it names`, async () => {
            const { session, d, doors } = await opened(stage ?? AS_EDGES);
            if (stage === undefined) {
                // Read as nodes after edges, the rows have no key column.
                d.setMapping(doors, { rows: "nodes" });
            }
            d.connect({ ...options(doors, true), edgeType: "entered" });
            const at = d.steps().length - 1;
            assert.deepStrictEqual(d.steps()[at]?.act?.to, {
                field: "bldg",
                into: { space: "building" },
                keepRow: true,
            });
            assert.deepStrictEqual(d.steps()[at]?.act?.from, { source: doors, field: "person" });
            assert.deepInclude(d.preview().steps[at]?.buckets, {
                newNodes: 5,
                newEdges: 8,
                matched: 3,
                unmatched: 1,
                emptyKey: 1,
            });
            assert.deepStrictEqual(d.preview().marks.nodes.new, 5);
            assert.deepStrictEqual(d.preview().marks.edges, { merged: 0, new: 8, removed: 0 });
            await d.commit();
            assert.deepStrictEqual(drawn(session), KEPT);
            assert.deepStrictEqual(await reopened(session), now(session));
            await session.undo();
            assert.deepStrictEqual(drawn(session), []);
            assert.lengthOf(session.data.nodes(), 5);
            session.dispose();
        });
    }

    it("replaceStep turns it off and on: the rows' nodes go with it", async () => {
        const { session, d, doors } = await opened({ key: "entry", type: "entry" });
        d.connect(options(doors, true));
        const at = d.steps().length - 1;
        d.replaceStep(at, { act: "connect", options: options(doors, false) });
        assert.isUndefined(d.steps()[at]?.act?.to?.keepRow);
        assert.deepInclude(d.preview().marks, { new: 3 });
        d.replaceStep(at, { act: "connect", options: { ...options(doors, true), direction: "from-into" } });
        assert.deepInclude(d.preview().marks, { new: 13 });
        assert.isTrue(d.undo());
        assert.deepInclude(d.preview().marks, { new: 3 });
        d.removeStep(at);
        assert.deepInclude(d.preview().marks, { new: 0 });
        d.dispose();
        session.dispose();
    });

    it("uses the nodes of a source already in the graph, and adds the ends it names that are missing", async () => {
        const { session, d, doors } = await opened({ key: "entry", type: "entry" });
        d.add(doors);
        d.connect({ ...options(doors, true), unmatched: "add" });
        const { buckets } = d.preview().steps.at(-1) ?? {};
        assert.deepInclude(buckets, { newNodes: 1, newEdges: 9 }, "P9 is added; the entries are in the graph");
        await d.commit();
        assert.include(drawn(session), "P9->E4");
        session.dispose();
    });

    it("refuses rows kept as nodes in a space they connect to", async () => {
        const { session, d } = await opened();
        const more = await d.stage(DOORS, { key: "entry", space: "person" });
        assert.deepStrictEqual(
            refusal(() => d.connect(options(more, true)), "E_JOIN_SPACE_SAME"),
            { source: more, space: "person" },
        );
        d.dispose();
        session.dispose();
    });
});
