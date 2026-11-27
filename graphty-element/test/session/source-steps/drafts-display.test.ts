/**
 * @file Drawing a source draft (design 5.3, 5.6, 10 row 12): `draft.display(on)` makes every
 * element read `graphty.draft` as what the commit would do to it, so an ordinary style layer can
 * show it; `draft.show("before" | "after")` picks the side, After drawing the graph the commit would
 * leave (what it adds drawn and counted, what it removes gone) and Before the graph as it is;
 * `styles.showDraft` rings what the commit merges and dashes the edges it adds; and none of it
 * reaches the history or a saved file, and the digest is the same once it comes off. Ports the
 * reference model's phase 5 `display()` assertion (merged count equals the matched keys).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type SourceDraft, type SourceDraftChange } from "../../../src/session";
import { dispatcherOf } from "../../../src/session/dispatchers";
import { stateDigest } from "../../../src/session/project/digest";
import type { LegendBlock } from "../../../src/session/styles/legend";
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

    it("a listener told the draft was drawn otherwise counts what the graph draws", async () => {
        const { session, d } = await foundingDraft();
        const pv = d.preview();
        const counted: { reason: SourceDraftChange["reason"]; nodes: number; edges: number }[] = [];
        session.on("data:draft-changed", (change) => {
            const { nodeCount, edgeCount } = session.data.statistics({ scope: "all" });
            counted.push({ reason: change.reason, nodes: nodeCount, edges: edgeCount });
        });
        const after = { nodes: pv.after.nodes, edges: pv.after.edges };
        const before = { nodes: pv.before.nodes, edges: pv.before.edges };
        await d.display(true);
        await d.show("before");
        await d.show("after");
        assert.deepStrictEqual(counted, [
            { reason: "displayed", ...after },
            { reason: "displayed", ...before },
            { reason: "displayed", ...after },
        ]);
        d.dispose();
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

    it("showDraft rings what a displayed draft merges and dashes what it adds, over a suspended stack", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const { a } = await renamedAndStaged(session);
        await session.config.set({ startingRows: true });
        await session.styles.settled();
        assert.deepStrictEqual(
            session.styles.tree().map((each) => each.name),
            ["Everything", "Selected", "Hovered"],
            "no Draft row: the preview is a view, not a layer",
        );
        const layers = session.styles.list();
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        await d.display(true);
        const steps = session.history.steps.length;
        const view = session.styles.showDraft({ merged: "#7048E8", new: "#E8590C" });
        await session.styles.settled();
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
        assert.isAtLeast(
            Number(session.styles.explain({ node: "A-9" }).merged["node.borderScreenWidth"]),
            2,
            "its dashed border is drawn wide enough to see on a graph framed whole",
        );
        // Where the edges it brings meet, a new node stays in sight: drawn hollow, in front of them.
        const fill = (id: string): unknown =>
            (session.styles.explain({ node: id }).merged["node.color"] as { hex?: string } | undefined)?.hex;
        assert.strictEqual(String(fill("A-9")).toUpperCase(), "#FFFFFF", "a new node is drawn hollow");
        assert.notStrictEqual(String(fill("A-1")).toUpperCase(), "#FFFFFF", "a merged node keeps its fill");
        assert.isAbove(
            Number(session.styles.explain({ node: "A-9" }).merged["node.drawOrder"]),
            0,
            "a new node is drawn in front of the edges",
        );
        assert.isTrue(
            session.styles.explain({ node: "A-9" }).merged["node.onTop"],
            "a new node is drawn on top in 3D too, where the edges meeting it would cover it",
        );
        // The graph the reader already has stays in sight over what a join adds, however many new nodes it adds.
        assert.isTrue(session.styles.explain({ node: "A-1" }).merged["node.onTop"], "a merged node is on top too");
        assert.isAbove(
            Number(session.styles.explain({ node: "A-1" }).merged["node.drawOrder"]),
            Number(session.styles.explain({ node: "A-9" }).merged["node.drawOrder"]),
            "a node the graph holds is drawn in front of a new one",
        );
        assert.notStrictEqual(
            session.styles.explain({ node: "A-9" }).merged["node.sizeSpace"],
            "screen",
            "with no new size, a new node keeps its own size",
        );
        const sized = session.styles.showDraft({ merged: "#7048E8", new: "#E8590C", newSize: 1 });
        await session.styles.settled();
        assert.deepStrictEqual(
            [
                session.styles.explain({ node: "A-9" }).merged["node.size"],
                session.styles.explain({ node: "A-9" }).merged["node.sizeSpace"],
            ],
            [1, "screen"],
            "with a new size, a new node is drawn at that size on screen, seen at any zoom",
        );
        assert.notStrictEqual(
            session.styles.explain({ node: "A-1" }).merged["node.sizeSpace"],
            "screen",
            "a merged node keeps its size",
        );
        sized.end();
        assert.isFalse(session.styles.showingBranches, "not a branches view");
        assert.strictEqual(session.styles.list(), layers, "the layer list is unchanged");
        assert.strictEqual(session.history.steps.length, steps, "no undo step");
        view.end();
        await session.styles.settled();
        assert.deepStrictEqual(look("A-1"), { halo: 0, border: "none" }, "ending the view takes the ring off");
        d.dispose();
        session.dispose();
    });

    it("showDraft marks what the commit removes while Before shows, only with a color for it", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("people.csv", "badge,name\nB1,Ann\nB2,Bo"), { key: "badge", type: "person" });
        const people = session.data.sources()[0]?.key ?? "";
        const boss = await session.data.stage(csv("boss.csv", "badge,boss\nB1,B2"), { key: "badge", type: "boss" });
        await session.data.add(boss);
        await session.data.connect({ from: { source: boss, field: "boss" }, into: { source: people } });
        const d = session.data.draft();
        d.removeSource(boss);
        await d.display(true);
        await d.show("before");
        const edge = session.data.edges()[0]?.id ?? "";
        const look = (): unknown => {
            const node = (id: string): Readonly<Record<string, unknown>> => session.styles.explain({ node: id }).merged;
            const line = session.styles.explain({ edge }).merged as Readonly<Record<string, unknown>>;
            const gone = node(String(session.data.nodes().at(-1)?.id));
            return [
                (gone["node.borderColor"] as { hex?: string } | undefined)?.hex,
                gone["node.opacity"],
                line["edge.opacity"],
                node("B2")["node.opacity"],
            ];
        };
        session.styles.showDraft({ merged: "#7048E8", new: "#E8590C" });
        await session.styles.settled();
        const plain = look();
        session.styles.showDraft({ merged: "#7048E8", new: "#E8590C", removed: "#123456" });
        await session.styles.settled();
        assert.deepStrictEqual(look(), ["#123456", 0.4, 0.4, (plain as unknown[])[3]]);
        assert.notDeepEqual(plain, look());
        // With a new size, what the commit removes is held at it too, so it is seen among the edges it takes with it.
        session.styles.showDraft({ merged: "#7048E8", new: "#E8590C", removed: "#123456", newSize: 1 });
        await session.styles.settled();
        const gone = session.styles.explain({ node: String(session.data.nodes().at(-1)?.id) }).merged;
        assert.deepStrictEqual([gone["node.size"], gone["node.sizeSpace"]], [1, "screen"]);
        assert.notStrictEqual(session.styles.explain({ node: "B2" }).merged["node.sizeSpace"], "screen", "B2 stays");
        d.dispose();
        session.dispose();
    });

    it("showDraft dashes the edges the founding example's joins add, in the new color", async () => {
        const { session, d } = await foundingDraft();
        await d.display(true);
        const view = session.styles.showDraft({ merged: "#7048E8", new: "#E8590C" });
        await session.styles.settled();
        const dashed = (): number =>
            session.data.edges().filter((edge) => {
                const merged = session.styles.explain({ edge: edge.id }).merged as Readonly<Record<string, unknown>>;
                return merged["edge.style"] === "dash";
            }).length;
        assert.strictEqual(dashed(), d.preview().edges.added);
        await d.show("before");
        await session.styles.settled();
        assert.strictEqual(dashed(), 0, "Before adds no edge");
        view.end();
        await session.styles.settled();
        d.dispose();
        session.dispose();
    });

    it("a saved project's Draft row stays an ordinary layer: the legend keys it by what the draft does", async () => {
        const { session, d } = await foundingDraft();
        // The row as projects created while the starting rows wrote it hold it.
        const row = await session.styles.addRow({
            name: "Draft",
            target: "both",
            selector: { match: "expression", where: "graphty.draft == 'merged' || graphty.draft == 'new'" },
            set: {
                "node.haloColor": "#7048E8",
                "node.haloScale": 1.4,
                "node.borderColor": "#7048E8",
                "node.borderStyle": "dashed",
                "edge.style": "dash",
            },
            encode: {
                "node.haloOpacity": { by: "graphty.draft", map: { merged: 1, new: 0, removed: 0 } },
                "node.borderWidth": { by: "graphty.draft", map: { merged: 0, new: 0.1 } },
            },
        });
        await session.styles.settled();
        const keyOf = (): LegendBlock[] => session.styles.legend().filter((block) => block.layerId === row.node);
        assert.deepStrictEqual(keyOf(), [], "nothing to key until a draft is drawn");
        await d.display(true);
        await session.styles.settled();
        const blocks = keyOf();
        assert.lengthOf(blocks, 1, "one block, not one per channel the row draws with");
        assert.strictEqual(blocks[0]?.kind, "categorical");
        assert.strictEqual(blocks[0]?.field?.path, "graphty.draft");
        assert.strictEqual(blocks[0]?.field?.technicalName, "draft");
        assert.deepStrictEqual(blocks[0]?.swatches, [{ value: "new", count: 6, color: "#7048e8" }], "six new entries");
        await d.show("before");
        await session.styles.settled();
        assert.deepStrictEqual(keyOf(), [], "Before adds nothing to key");
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
