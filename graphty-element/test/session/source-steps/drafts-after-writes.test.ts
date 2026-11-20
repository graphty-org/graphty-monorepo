/**
 * @file What the reader can do while a source draft's After is drawn (design 5.3, 5.6). After draws
 * the graph the draft's commit would leave, but that graph is not the project: a run, a pin or a note
 * would measure or name elements the committed graph lacks, so they are refused with
 * `E_DRAFT_OPEN { draft, side: "after" }`; moving a node the committed graph has is kept, through
 * Before, a discard and the history; and drawing After is never pending work the history lists,
 * cancels or offers to undo.
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

const ENTRIES = ["entry,badge", "E1,B1", "E2,B1", "E3,B2"].join("\n");

/**
 * People loaded and positioned, and a drawn draft that stages door entries joined to them by badge.
 * @param runs - What a run executes, counted.
 * @returns The session and its draft, After drawn.
 */
async function afterShown(runs?: { started: number }): Promise<{ session: GraphSession; d: SourceDraft }> {
    const session = createGraphSession({
        features: ["source-steps"],
        ...(runs === undefined
            ? {}
            : {
                  runs: {
                      execute: () => {
                          runs.started++;
                          return Promise.reject(new Error("not measured"));
                      },
                  },
              }),
    });
    await session.data.import(csv("people.csv", "badge,name\nB1,Ann\nB2,Bo\nB3,Cy"), { key: "badge", type: "person" });
    await session.positions.set([
        { id: "B1", x: 1, y: 1, z: 0 },
        { id: "B2", x: 2, y: 2, z: 0 },
        { id: "B3", x: 3, y: 3, z: 0 },
    ]);
    const people = session.data.sources()[0]?.key ?? "";
    const d = session.data.draft();
    const entries = await d.stage(csv("entries.csv", ENTRIES), { key: "entry", type: "entry" });
    d.connect({ from: { source: entries, field: "badge" }, into: { source: people }, edgeType: "by" });
    await d.display(true);
    assert.strictEqual(session.data.snapshot().nodeCount, 6, "After draws the entries");
    return { session, d };
}

/**
 * The code and details a refused call rejected with.
 * @param call - The call.
 * @returns Them, or null when it was not refused.
 */
async function refusal(call: () => PromiseLike<unknown>): Promise<{ code: string; details: unknown } | null> {
    try {
        await call();
        return null;
    } catch (error) {
        const { code, details } = error as { code: string; details: unknown };
        return { code, details };
    }
}

describe("source-steps drafts: writes while After is drawn", () => {
    it("a node moved while After shows stays where it was moved through Before and a discard", async () => {
        const { session, d } = await afterShown();
        const steps = session.history.steps.length;
        await session.positions.set([{ id: "B1", x: 50, y: 60, z: 0 }]);
        assert.strictEqual(session.history.steps.length, steps + 1, "the move is a step");

        await d.show("before");
        await session.styles.settled();
        assert.deepInclude(session.positions.get("B1"), { x: 50, y: 60 }, "Before keeps the move");
        d.dispose();
        await session.styles.settled();
        assert.deepInclude(session.positions.get("B1"), { x: 50, y: 60 }, "a discard keeps the move");
        assert.strictEqual(session.history.steps.at(-1)?.fact.code, "positions.set");
        session.dispose();
    });

    it("a run started while After shows is refused and never executes", async () => {
        const runs = { started: 0 };
        const { session, d } = await afterShown(runs);
        const steps = session.history.steps.length;
        const refused = await refusal(() => session.runs.start("degree", undefined, { style: false }));
        assert.deepStrictEqual(refused, { code: "E_DRAFT_OPEN", details: { draft: d.id, side: "after" } });
        assert.strictEqual(runs.started, 0, "nothing measured the draft's graph");

        await d.show("before");
        await session.styles.settled();
        assert.strictEqual(session.history.steps.length, steps, "nothing recorded");
        assert.notInclude((await session.project.save()).text, "results.degree");
        session.dispose();
    });

    it("pins and notes while After shows are refused; a move of a node only After draws too", async () => {
        const { session, d } = await afterShown();
        const steps = session.history.steps.length;
        const after = { code: "E_DRAFT_OPEN", details: { draft: d.id, side: "after" } };
        assert.deepStrictEqual(await refusal(() => session.positions.pin(["E1"])), after);
        assert.deepStrictEqual(await refusal(() => session.positions.pin(["B1"])), after);
        assert.deepStrictEqual(await refusal(() => session.positions.set([{ id: "E1", x: 9, y: 9, z: 0 }])), after);
        assert.deepStrictEqual(
            await refusal(() => Promise.resolve(session.notes.add({ text: "x", targets: [{ node: "E1" }] }))),
            after,
        );
        assert.strictEqual(session.history.steps.length, steps, "nothing recorded");

        await d.show("before");
        await session.styles.settled();
        assert.isNull(await refusal(() => session.positions.pin(["B1"])), "Before takes reader edits again");
        assert.notInclude((await session.project.save()).text, '"E1"');
        session.dispose();
    });

    it("drawing After is no pending work: nothing to undo or cancel, and the history's next undo is unchanged", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(csv("people.csv", "badge,name\nB1,Ann\nB2,Bo"), { key: "badge", type: "person" });
        const people = session.data.sources()[0]?.key ?? "";
        const d = session.data.draft();
        const entries = await d.stage(csv("entries.csv", ENTRIES), { key: "entry", type: "entry" });
        d.connect({ from: { source: entries, field: "badge" }, into: { source: people }, edgeType: "by" });
        const { nextUndo } = session.history;
        await d.display(true);
        assert.deepStrictEqual(session.history.pending, [], "After is not listed as pending");
        assert.deepStrictEqual(session.history.nextUndo, nextUndo, "the next undo is what it was");
        assert.strictEqual(session.data.snapshot().nodeCount, 5);
        d.dispose();
        await session.styles.settled();
        session.dispose();
    });
});
