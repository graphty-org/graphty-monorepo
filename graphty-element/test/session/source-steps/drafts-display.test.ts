/**
 * @file Drawing a source draft (design 5.6, 10 row 12): `draft.display(on)` makes every element
 * read `graphty.draft` as what the commit would do to it, so an ordinary style layer can show it;
 * `draft.show("before" | "after")` picks the side; the Draft starting row rings what the commit
 * merges; and none of it reaches the history, the digest or a saved file. Ports the reference
 * model's phase 5 `display()` assertion (merged count equals the matched keys).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type SourceDraftChange } from "../../../src/session";
import { dispatcherOf } from "../../../src/session/dispatchers";
import { stateDigest } from "../../../src/session/project/digest";
import { ACCOUNTS, full, phase2 } from "./scenario";

const ACCOUNTS_CSV = { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" } as const;

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

        d.display(true);
        const shown = counts();
        assert.strictEqual(shown.merged, matched, "a merged node per matched key (A-1 and A-2)");
        assert.strictEqual(shown.merged, d.preview().steps.find((s) => s.op === "join.merge")?.buckets?.merged);
        assert.strictEqual(shown.removed, 0, "the merge removes nothing");
        assert.strictEqual(shown.new, 0, "a new account is not in the committed graph, so no drawn node reads new");
        assert.strictEqual(
            MARKS.reduce((sum, mark) => sum + shown[mark], 0),
            nodes,
            "every drawn node reads exactly one mark",
        );

        d.display(false);
        assert.deepStrictEqual(Object.values(counts()), [0, 0, 0, 0, 0], "hidden again, it reads nothing");
        d.dispose();
        session.dispose();
    });

    it("an act on a displayed draft moves the marks; undo moves them back", async () => {
        const { session, a } = await renamedAndStaged();
        const counts = await markLayers(session, "node");
        const d = session.data.draft();
        d.display(true);
        assert.strictEqual(counts().merged, 0);
        assert.strictEqual(counts().unchanged, session.data.store.getSnapshot().nodeCount);
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        assert.strictEqual(counts().merged, 2);
        d.undo();
        assert.strictEqual(counts().merged, 0);
        d.dispose();
        session.dispose();
    });

    it("removing a source in a draft marks its nodes and edges removed, as many as the preview removes", async () => {
        const { session, b } = await full();
        const nodeCounts = await markLayers(session, "node");
        const edgeCounts = await markLayers(session, "edge");
        const d = session.data.draft();
        d.removeSource(b);
        d.display(true);
        const pv = d.preview();
        assert.isAbove(pv.edges.removed, 0, "bank B's edges go");
        assert.strictEqual(edgeCounts().removed, pv.edges.removed);
        assert.strictEqual(nodeCounts().removed, pv.nodes.removed);
        assert.strictEqual(
            edgeCounts().unchanged + edgeCounts().changed + edgeCounts().removed,
            session.data.store.getSnapshot().edgeCount,
        );
        d.dispose();
        session.dispose();
    });

    it("display and show write nothing: the digest, the history and the saved file stay as they were", async () => {
        const { session, b } = await full();
        const d = session.data.draft();
        d.removeSource(b);
        const before = await held(session);
        const reasons: SourceDraftChange["reason"][] = [];
        session.on("data:draft-changed", (change) => reasons.push(change.reason));
        d.display(true);
        d.show("before");
        d.show("after");
        d.show("after");
        assert.deepStrictEqual(await held(session), before);
        d.display(false);
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
            d.show("sideways" as "before");
        }, /before.*after/u);
        d.display(true);
        await d.commit();
        assert.throws(() => {
            d.display(false);
        }, /closed/u);
        assert.throws(() => {
            d.show("before");
        }, /closed/u);
        session.dispose();
    });

    it("a committed or discarded draft leaves graphty.draft reading nothing", async () => {
        const { session, a } = await renamedAndStaged();
        const counts = await markLayers(session, "node");
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        d.display(true);
        assert.strictEqual(counts().merged, 2);
        await d.commit();
        await session.styles.settled();
        assert.deepStrictEqual(Object.values(counts()), [0, 0, 0, 0, 0]);
        const again = session.data.draft();
        again.display(true);
        assert.isAbove(counts().unchanged, 0);
        again.dispose();
        assert.deepStrictEqual(Object.values(counts()), [0, 0, 0, 0, 0]);
        session.dispose();
    });

    it("the Draft starting row rings what a displayed draft merges, written only under the experiment", async () => {
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
        d.display(true);
        assert.strictEqual(session.styles.counts(node?.id ?? "").matched, 2, "the two merged accounts");
        d.dispose();
        session.dispose();
    });
});
