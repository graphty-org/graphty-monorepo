/**
 * @file Drawing a source draft (design 5.3, 5.6, 10 row 12): `draft.display(on)` makes every
 * element read `graphty.draft` as what the commit would do to it, so an ordinary style layer can
 * show it; `draft.show("before" | "after")` picks the side, After drawing the graph the commit would
 * leave (what it adds drawn and counted, what it removes gone) and Before the graph as it is; the
 * Draft starting row rings what the commit merges and dashes the edges it adds; and none of it
 * reaches the history or a saved file, and the digest is the same once it comes off. Ports the
 * reference model's phase 5 `display()` assertion (merged count equals the matched keys).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type SourceDraft, type SourceDraftChange } from "../../../src/session";
import { dispatcherOf } from "../../../src/session/dispatchers";
import { stateDigest } from "../../../src/session/project/digest";
import { ACCOUNTS, full, phase2 } from "./scenario";

const ACCOUNTS_CSV = { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" } as const;

/**
 * A CSV source.
 * @param name - Its name.
 * @param data - Its text.
 * @returns What `import` and `stage` take.
 */
function csv(name: string, data: string): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data }, name };
}

/** Door entries for the founding example: B9 badges no person, D3 is no building's door. */
const ENTRIES = ["entry,badge,door", "E1,B1,D1", "E2,B1,D2", "E3,B2,D1", "E4,B9,D1", "E5,B2,D3", "E6,B2,D1"].join("\n");

/**
 * The founding example: people loaded, buildings added, and a draft that stages the door entries
 * and makes edges from them to people by badge and to buildings by door.
 * @returns The session, the draft and the entries' source.
 */
async function foundingDraft(): Promise<{ session: GraphSession; d: SourceDraft; entries: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(csv("people.csv", "badge,name\nB1,Ann\nB2,Bo\nB3,Cy"), { key: "badge", type: "person" });
    const people = session.data.sources()[0]?.key ?? "";
    const buildings = await session.data.stage(csv("buildings.csv", "door,building\nD1,North\nD2,South"), {
        key: "door",
        type: "building",
    });
    await session.data.add(buildings);
    const d = session.data.draft();
    const entries = await d.stage(csv("entries.csv", ENTRIES), { key: "entry", type: "entry" });
    d.connect({ from: { source: entries, field: "badge" }, into: { source: people }, edgeType: "by" });
    d.connect({ from: { source: entries, field: "door" }, into: { source: buildings }, edgeType: "at" });
    return { session, d, entries };
}

/** Every value `graphty.draft` reads. */
const MARKS = ["merged", "new", "changed", "removed", "unchanged"] as const;

/** Saved text with its clock readings blanked, so two saves compare. */
const CLOCK = /"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z"/gu;

/**
 * Phase 2 with holder_name renamed to holder, and accounts.csv staged.
 * @param session - The session to load into.
 * @returns The session and the staged accounts.
 */
async function renamedAndStaged(session?: GraphSession): Promise<{ session: GraphSession; a: string }> {
    const { session: s, t } = await phase2(session);
    await s.data.renameColumn({ kind: "edge", name: "holder_name" }, "holder", { source: t });
    const a = await s.data.stage(ACCOUNTS_CSV, { key: "account_id", type: "account" });
    return { session: s, a };
}

/**
 * One layer per mark, for one kind of element, each selecting the elements `graphty.draft` gives it.
 * @param session - The session.
 * @param target - Nodes or edges.
 * @returns A reader of how many elements each layer matches now.
 */
async function markLayers(
    session: GraphSession,
    target: "node" | "edge",
): Promise<() => Record<(typeof MARKS)[number], number>> {
    const ids: Partial<Record<(typeof MARKS)[number], string>> = {};
    for (const mark of MARKS) {
        const layer = await session.styles.add({
            name: `${target} ${mark}`,
            target,
            selector: { match: "expression", where: `graphty.draft == '${mark}'` },
            set: target === "node" ? { "node.size": 2 } : { "edge.width": 2 },
        });
        ids[mark] = layer.id;
    }
    return () =>
        Object.fromEntries(MARKS.map((mark) => [mark, session.styles.counts(ids[mark] ?? "").matched])) as Record<
            (typeof MARKS)[number],
            number
        >;
}

/**
 * What a session holds that drawing a draft must leave alone: its digest, its history and its file.
 * @param session - The session.
 * @returns The three, as text.
 */
async function held(session: GraphSession): Promise<{ digest: string; history: string; saved: string }> {
    const dispatcher = dispatcherOf(session);
    return {
        digest: stateDigest(dispatcher.state, { snapshot: session.data.store.getSnapshot() }),
        history: JSON.stringify({ steps: session.history.steps.length, position: session.history.position }),
        saved: (await session.project.save()).text.replaceAll(CLOCK, '"T"'),
    };
}

describe("source-steps drafts: drawing a draft", () => {
    it("phase 5: graphty.draft reads merged on the matched keys only while the draft is displayed", async () => {
        const { session, a } = await renamedAndStaged();
        const nodes = session.data.store.getSnapshot().nodeCount;
        const counts = await markLayers(session, "node");
        const d = session.data.draft();
        const pair = { from: { source: a, field: "account_id" }, into: { space: "account" } } as const;
        const { matched } = d.matchCounts(pair);
        d.merge(pair);
        assert.deepStrictEqual(
            Object.values(counts()),
            [0, 0, 0, 0, 0],
            "nothing reads graphty.draft until it is drawn",
        );
        assert.isFalse(d.displayed);
        assert.strictEqual(d.side, "after");

        await d.display(true);
        await session.styles.settled();
        const pv = d.preview();
        const shown = counts();
        assert.strictEqual(shown.merged, matched, "a merged node per matched key (A-1 and A-2)");
        assert.strictEqual(shown.merged, pv.steps.find((s) => s.op === "join.merge")?.buckets?.merged);
        assert.strictEqual(shown.removed, 0, "the merge removes nothing");
        assert.isAbove(pv.nodes.added, 0, "A-9 is an account no transaction names");
        assert.strictEqual(shown.new, pv.nodes.added, "After draws the account the merge adds, reading new");
        assert.strictEqual(
            MARKS.reduce((sum, mark) => sum + shown[mark], 0),
            nodes + pv.nodes.added,
            "every drawn node reads exactly one mark",
        );
        assert.strictEqual(session.data.statistics().nodeCount, pv.after.nodes, "statistics count the draft");

        await d.show("before");
        await session.styles.settled();
        assert.strictEqual(counts().new, 0, "Before draws the graph as it is: no new account");
        assert.strictEqual(session.data.statistics().nodeCount, nodes, "statistics count the committed graph");

        await d.display(false);
        await session.styles.settled();
        assert.deepStrictEqual(Object.values(counts()), [0, 0, 0, 0, 0], "hidden again, it reads nothing");
        assert.strictEqual(session.data.store.getSnapshot().nodeCount, nodes);
        d.dispose();
        session.dispose();
    });

    it("an act on a displayed draft moves the marks; undo moves them back", async () => {
        const { session, a } = await renamedAndStaged();
        const nodes = session.data.store.getSnapshot().nodeCount;
        const counts = await markLayers(session, "node");
        const d = session.data.draft();
        await d.display(true);
        assert.strictEqual(counts().merged, 0);
        assert.strictEqual(counts().unchanged, nodes);
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        await d.display(true);
        await session.styles.settled();
        assert.strictEqual(counts().merged, 2);
        assert.strictEqual(counts().new, 1, "A-9 drawn");
        d.undo();
        await d.display(true);
        await session.styles.settled();
        assert.strictEqual(counts().merged, 0);
        assert.strictEqual(counts().new, 0);
        assert.strictEqual(session.data.store.getSnapshot().nodeCount, nodes, "undone, A-9 is gone again");
        d.dispose();
        session.dispose();
    });

    it("removing a source in a draft: Before marks its nodes and edges removed, After draws without them", async () => {
        const { session, b } = await full();
        const committed = session.data.store.getSnapshot();
        const all = { nodes: committed.nodeCount, edges: committed.edgeCount };
        const nodeCounts = await markLayers(session, "node");
        const edgeCounts = await markLayers(session, "edge");
        const d = session.data.draft();
        d.removeSource(b);
        const pv = d.preview();
        assert.isAbove(pv.edges.removed, 0, "bank B's edges go");

        await d.display(true);
        await d.show("before");
        await session.styles.settled();
        assert.strictEqual(edgeCounts().removed, pv.edges.removed);
        assert.strictEqual(nodeCounts().removed, pv.nodes.removed);
        assert.strictEqual(edgeCounts().unchanged + edgeCounts().changed + edgeCounts().removed, all.edges);

        await d.show("after");
        await session.styles.settled();
        const after = session.data.store.getSnapshot();
        assert.deepStrictEqual(
            { nodes: after.nodeCount, edges: after.edgeCount },
            { nodes: all.nodes - pv.nodes.removed, edges: all.edges - pv.edges.removed },
            "After draws the graph without bank B's own nodes and edges",
        );
        assert.strictEqual(edgeCounts().removed, 0, "nothing removed is drawn in After");
        d.dispose();
        await session.styles.settled();
        const back = session.data.store.getSnapshot();
        assert.deepStrictEqual({ nodes: back.nodeCount, edges: back.edgeCount }, all, "a discarded draft puts it back");
        session.dispose();
    });

    it("the founding example: After draws and counts what the joins add, Before does not", async () => {
        const { session, d, entries } = await foundingDraft();
        const committed = session.data.store.getSnapshot();
        const all = { nodes: committed.nodeCount, edges: committed.edgeCount };
        const nodeCounts = await markLayers(session, "node");
        const edgeCounts = await markLayers(session, "edge");
        const before = await held(session);
        const steps = session.history.steps.length;
        const pv = d.preview();
        assert.isAbove(pv.edges.added, 0, "the joins add edges");

        await d.display(true);
        await session.styles.settled();
        const after = session.data.store.getSnapshot();
        assert.deepStrictEqual(
            { nodes: after.nodeCount, edges: after.edgeCount },
            { nodes: pv.after.nodes, edges: pv.after.edges },
            "After draws the preview's graph",
        );
        assert.strictEqual(edgeCounts().new, pv.edges.added, "every edge the joins add reads new");
        assert.strictEqual(nodeCounts().new, pv.nodes.added);
        assert.deepStrictEqual(
            { nodes: session.data.statistics().nodeCount, edges: session.data.statistics().edgeCount },
            { nodes: pv.after.nodes, edges: pv.after.edges },
            "statistics count the draft",
        );
        assert.isUndefined(
            session.data.sources().find((s) => s.key === entries),
            "the sources list is the committed one",
        );
        const saved = (await session.project.save()).text.replaceAll(CLOCK, '"T"');
        assert.strictEqual(saved, before.saved, "a save while After shows writes the committed project");
        assert.strictEqual(session.history.steps.length, steps, "nothing recorded");
        assert.deepStrictEqual(session.history.pending, [], "After is neither pending nor recorded");

        await d.show("before");
        await session.styles.settled();
        const shown = session.data.store.getSnapshot();
        assert.deepStrictEqual(
            { nodes: shown.nodeCount, edges: shown.edgeCount },
            all,
            "Before draws the graph as it is",
        );
        assert.strictEqual(edgeCounts().new, 0);
        assert.strictEqual(session.data.statistics().edgeCount, all.edges);

        await d.show("after");
        const pvAgain = d.preview();
        await d.commit();
        await session.styles.settled();
        const done = session.data.store.getSnapshot();
        assert.deepStrictEqual(
            { nodes: done.nodeCount, edges: done.edgeCount },
            { nodes: pvAgain.after.nodes, edges: pvAgain.after.edges },
            "a commit made while After shows lands the preview's graph",
        );
        assert.strictEqual(session.history.steps.length, steps + 1, "one step for the commit");
        await session.undo();
        const undone = session.data.store.getSnapshot();
        assert.deepStrictEqual({ nodes: undone.nodeCount, edges: undone.edgeCount }, all);
        session.dispose();
    });

    it("display and show record and save nothing, and the digest is the same once After comes off", async () => {
        const { session, b } = await full();
        const d = session.data.draft();
        d.removeSource(b);
        const before = await held(session);
        const reasons: SourceDraftChange["reason"][] = [];
        session.on("data:draft-changed", (change) => reasons.push(change.reason));
        await d.display(true);
        const whileAfter = await held(session);
        assert.strictEqual(whileAfter.history, before.history, "nothing recorded while After shows");
        assert.strictEqual(whileAfter.saved, before.saved, "a save while After shows writes the committed project");
        await d.show("before");
        await session.styles.settled();
        assert.deepStrictEqual(await held(session), before, "Before is the committed graph, digest and all");
        await d.show("after");
        await d.show("after");
        await d.display(false);
        await session.styles.settled();
        assert.deepStrictEqual(await held(session), before);
        assert.deepStrictEqual(reasons, ["displayed", "displayed", "displayed", "displayed"], "a repeat says nothing");
        d.dispose();
        session.dispose();
    });

    it("refuses a side it does not know, and both doors once the draft is closed", async () => {
        const { session, a } = await renamedAndStaged();
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        assert.throws(() => {
            void d.show("sideways" as "before");
        }, /before.*after/u);
        await d.display(true);
        await d.commit();
        assert.throws(() => {
            void d.display(false);
        }, /closed/u);
        assert.throws(() => {
            void d.show("before");
        }, /closed/u);
        session.dispose();
    });

    it("a committed or discarded draft leaves graphty.draft reading nothing", async () => {
        const { session, a } = await renamedAndStaged();
        const counts = await markLayers(session, "node");
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        await d.display(true);
        assert.strictEqual(counts().merged, 2);
        await d.commit();
        await session.styles.settled();
        assert.deepStrictEqual(Object.values(counts()), [0, 0, 0, 0, 0]);
        const again = session.data.draft();
        await again.display(true);
        assert.isAbove(counts().unchanged, 0);
        again.dispose();
        assert.deepStrictEqual(Object.values(counts()), [0, 0, 0, 0, 0]);
        session.dispose();
    });

    it("the Draft starting row rings what a displayed draft merges and dashes what it adds, only under the experiment", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const { a } = await renamedAndStaged(session);
        await session.config.set({ startingRows: true });
        await session.styles.settled();
        assert.deepStrictEqual(
            session.styles.tree().map((each) => each.name),
            ["Everything", "Draft", "Selected", "Hovered"],
        );
        const parts = session.styles.list().filter((each) => each.name === "Draft");
        assert.sameMembers(
            parts.map((each) => each.target),
            ["node", "edge"],
        );
        const node = parts.find((each) => each.target === "node");
        assert.strictEqual(node?.source.by, "template");
        assert.strictEqual(session.styles.counts(node?.id ?? "").matched, 0, "matches nothing until a draft is drawn");
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        await d.display(true);
        await session.styles.settled();
        assert.strictEqual(
            session.styles.counts(node?.id ?? "").matched,
            3,
            "After marks two merged accounts and one new",
        );
        const look = (id: string): { halo: unknown; border: unknown } => {
            const merged = session.styles.explain({ node: id }).merged as Readonly<Record<string, unknown>>;
            const width = merged["node.borderWidth"];
            return {
                halo: merged["node.haloOpacity"] ?? 0,
                border: typeof width === "number" && width > 0 ? (merged["node.borderStyle"] ?? "solid") : "none",
            };
        };
        assert.deepStrictEqual(look("A-1"), { halo: 1, border: "none" }, "a merged account is ringed");
        assert.deepStrictEqual(look("A-9"), { halo: 0, border: "dashed" }, "a new account is dashed, not ringed");
        await d.show("before");
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(node?.id ?? "").matched, 2, "Before has no new account to ring");
        d.dispose();
        session.dispose();
    });

    it("the Draft starting row dashes the edges the founding example's joins add", async () => {
        const { session, d } = await foundingDraft();
        await session.config.set({ startingRows: true });
        await session.styles.settled();
        const edge = session.styles.list().find((each) => each.name === "Draft" && each.target === "edge");
        await d.display(true);
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(edge?.id ?? "").matched, d.preview().edges.added);
        await d.show("before");
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(edge?.id ?? "").matched, 0);
        d.dispose();
        session.dispose();
    });
    it("After gives every node it draws a mark when a staged source's keys overlap a committed type's and stay apart", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("people.csv", "id,name\nX1,Ann\nX2,Bo"), { key: "id", type: "person" });
        const counts = await markLayers(session, "node");
        const d = session.data.draft();
        d.add(await d.stage(csv("rooms.csv", "id,floor\nX1,1\nX9,2"), { key: "id", type: "room" }));
        await d.display(true);
        await d.show("after");
        await session.styles.settled();
        const drawn = session.data.store.getSnapshot().nodeCount;
        const read = counts();
        assert.strictEqual(
            MARKS.reduce((sum, mark) => sum + read[mark], 0),
            drawn,
            "every drawn node reads a mark",
        );
        session.dispose();
    });
});
