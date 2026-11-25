/**
 * @file What a join workspace reads from one source draft holding several joins: `draft.batch`
 * makes several acts one undo entry, `draft.suggestMatches` proposes the fields to match,
 * `connect` takes `perPair` and `unmatched` and reads them back, `preview.marks` counts what the
 * draft marks, `preview.ids` names elements by session id, and `styles.showDraft` colors each step,
 * draws untouched nodes, marks a step and reads its view back on `styles.shownDraft`.
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

/** HR rows: B1 and B2 badge people, B9 badges no one. */
const HR = "badge,dept\nB1,Ops\nB2,Lab\nB9,Ops";
/** Door entries: B1 twice through D1, B9 badges no one. */
const ENTRIES = "entry,badge\nE1,B1\nE2,B1\nE3,B2\nE4,B9";

/**
 * People in the graph (B3 never meets a row), HR and the entries staged, and a draft open.
 * @returns The session, the draft and the staged sources.
 */
async function opened(): Promise<{ session: GraphSession; d: SourceDraft; hr: string; entries: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(csv("people.csv", "badge,name\nB1,Ann\nB2,Bo\nB3,Cy"), { key: "badge", type: "person" });
    const d = session.data.draft();
    const hr = await d.stage(csv("hr.csv", HR), { key: "badge", type: "hr" });
    const entries = await d.stage(csv("entries.csv", ENTRIES), { key: "entry", type: "entry" });
    return { session, d, hr, entries };
}

describe("source-steps drafts: the join workspace's reads", () => {
    it("batch makes several acts one undo entry, and a refusal inside leaves the draft as it was", async () => {
        const { session, d, hr } = await opened();
        d.batch(() => {
            d.merge({ from: { source: hr, field: "badge" }, into: { space: "person" } });
            d.editStep(d.steps().length - 1, { repeated: "last" });
        });
        assert.strictEqual(d.steps().at(-1)?.act?.repeated, "last");
        assert.isTrue(d.undo(), "one undo");
        assert.isFalse(
            d.steps().some((row) => row.op === "join.merge"),
            "one undo takes the merge and its edit back together",
        );
        const before = d.steps().length;
        assert.throws(() =>
            d.batch(() => {
                d.merge({ from: { source: hr, field: "badge" }, into: { space: "person" } });
                d.removeStep(99);
            }),
        );
        assert.strictEqual(d.steps().length, before, "the merge made before the refusal is taken back");
        d.dispose();
        session.dispose();
    });

    it("merge into a staged node 1 adds it first, so its rows' matches merge", async () => {
        const { session, d, hr } = await opened();
        const titles = await d.stage(csv("titles.csv", "badge,title\nb1,Lead\nB2,Tech\nB7,Temp"), { key: "badge" });
        d.merge({ from: { source: titles, field: "badge" }, into: { source: hr }, ignoreCase: true });
        assert.isTrue(
            d.steps().some((row) => row.op === "join.add" && row.source === hr),
            "the staged node 1 is added before the merge",
        );
        const merge = d.preview().steps.find((row) => row.op === "join.merge");
        assert.strictEqual(merge?.buckets?.merged, 2, "b1 (ignoring case) and B2 meet HR's rows");
        d.dispose();
        session.dispose();
    });

    it("suggestMatches proposes the column whose values meet a space's keys, best first", async () => {
        const { session, d, hr } = await opened();
        const [best] = d.suggestMatches(hr);
        assert.deepStrictEqual(best?.matches, [{ from: { source: hr, field: "badge" }, into: { space: "person" } }]);
        assert.strictEqual(best.result, "merge", "the source's key merges");
        assert.isFalse(best.confident, "two of three values meet: under the confident share");
        d.dispose();
        session.dispose();
    });

    it("connect takes perPair and unmatched, and steps() reads them back", async () => {
        const { session, d, entries } = await opened();
        d.connect({
            from: { source: entries, field: "badge" },
            into: { space: "person" },
            perPair: true,
            unmatched: "add",
        });
        const act = d.steps().at(-1)?.act;
        assert.strictEqual(act?.perPair, true, "one edge per pair");
        assert.strictEqual(act?.unmatched, "add");
        d.dispose();
        session.dispose();
    });

    it("preview.marks counts merged, new and untouched; preview.ids names a step's elements", async () => {
        const { session, d, hr } = await opened();
        d.merge({ from: { source: hr, field: "badge" }, into: { space: "person" } });
        const step = d.steps().length - 1;
        await d.display(true);
        const p = d.preview();
        assert.deepStrictEqual(
            p.marks,
            {
                merged: 2,
                new: 1,
                untouched: 1,
                nodes: { merged: 2, new: 1, untouched: 1, removed: 0 },
                edges: { merged: 0, new: 0, removed: 0 },
            },
            "B1, B2 merged; B9 new; B3 untouched",
        );
        assert.sameMembers([...p.ids({ step, bucket: "merged" }).nodes].map(String), ["B1", "B2"]);
        assert.sameMembers([...p.ids({ refs: [{ space: "person", key: "B3" }] }).nodes].map(String), ["B3"]);
        d.dispose();
        session.dispose();
    });

    it("preview.marks counts a Connect's new edges apart from its new nodes", async () => {
        const { session, d, entries } = await opened();
        d.connect({ from: { source: entries, field: "badge" }, into: { space: "person" } });
        const { marks } = d.preview();
        assert.strictEqual(marks.edges.new, 3, "E1, E2 and E3 meet a person");
        assert.strictEqual(marks.nodes.new, 4, "each entry is a node");
        assert.strictEqual(marks.new, marks.nodes.new + marks.edges.new, "new stays the sum");
        d.dispose();
        session.dispose();
    });

    it("setMapping changes a source still staged in the session, and the change commits with the draft", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("people.csv", "badge,name\nB1,Ann\nB2,Bo\nB3,Cy"), {
            key: "badge",
            type: "person",
        });
        const hr = await session.data.stage(csv("hr.csv", HR), { key: "badge" });
        const d = session.data.draft();
        d.setMapping(hr, { type: "person" });
        assert.strictEqual(d.sourceTable(hr).summary().mapping.type, "person");
        assert.notStrictEqual(session.data.sourceTable(hr).summary().mapping.type, "person", "not before the commit");
        await d.commit();
        assert.strictEqual(session.data.sourceTable(hr).summary().mapping.type, "person");
        session.dispose();
    });

    it("spaces() lists the spaces the draft builds, naming the staged source a step adds", async () => {
        const { session, d, hr, entries } = await opened();
        assert.isTrue(
            d.spaces().every((row) => row.staged === null),
            "nothing added yet",
        );
        d.add(entries);
        const row = d.spaces().find((each) => each.staged === entries);
        assert.isDefined(row, "the entries' space names them");
        assert.include(row?.sources ?? [], entries);
        assert.strictEqual(
            d.spaces().find((each) => each.space === "person")?.staged,
            null,
            "people were in the graph",
        );
        assert.isFalse(
            d.spaces().some((each) => each.staged === hr),
            "HR is staged but not added",
        );
        d.dispose();
        session.dispose();
    });

    it("showDraft colors by step, dots untouched nodes, marks a step and reads back on shownDraft", async () => {
        const { session, d, hr } = await opened();
        d.merge({ from: { source: hr, field: "badge" }, into: { space: "person" } });
        const step = d.steps().length - 1;
        await d.display(true);
        const view = { merged: "#7048E8", new: "#E8590C", untouched: "#2F9E44", steps: [{ step, color: "#1971C2" }] };
        const shown = session.styles.showDraft(view);
        await session.styles.settled();
        const look = (id: string): Readonly<Record<string, unknown>> => session.styles.explain({ node: id }).merged;
        assert.strictEqual(
            (look("B1")["node.haloColor"] as { hex?: string } | undefined)?.hex,
            "#1971c2",
            "a merged node is ringed in its step's color",
        );
        assert.strictEqual(look("B3")["node.borderStyle"], "dotted", "an untouched node is dotted");
        assert.deepStrictEqual(session.styles.shownDraft, view);
        session.styles.showDraft({ ...view, mark: { refs: [{ space: "person", key: "B3" }] } });
        await session.styles.settled();
        assert.strictEqual(look("B3")["node.opacity"], 1, "the marked node is at full strength");
        assert.strictEqual(look("B1")["node.opacity"], 0.2, "the rest is faint");
        const { untouched: _none, ...plain } = view;
        session.styles.showDraft(plain);
        await session.styles.settled();
        assert.notStrictEqual(look("B3")["node.borderStyle"], "dotted", "with no color for it, it keeps its look");
        shown.end();
        session.styles.showDraft(view).end();
        assert.isNull(session.styles.shownDraft, "ended, nothing is shown");
        d.dispose();
        session.dispose();
    });
});
