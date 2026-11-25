/**
 * An open draft of the sources and steps is the reader's unfinished edit. Autosave keeps it with
 * the work and reopens it after a restore, still uncommitted, drawn as it was and with its undo
 * history, so a page that reloads (Safari ends a background tab) picks it up through
 * `data.currentDraft()` (issue #9660).
 */

import { assert, it } from "vitest";

import { Autosaver } from "../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import { createGraphSession } from "../../src/session";
import { sourceDraftHooks } from "../../src/session/sourceDraftHooks";
import { ACCOUNTS, phase2 } from "../session/source-steps/scenario";
import { FakeClock, FakeLocks } from "./fakes";

const KEY = "test.source-drafts";

it("an open source draft comes back after a restore, uncommitted, drawn, undoable and committable", async () => {
    const store = memoryAutosaveStore();
    const { session: first } = await phase2();
    const writer = new Autosaver({ key: KEY, session: first, store, clock: new FakeClock(), locks: new FakeLocks() });
    const draft = first.data.draft();
    const a = await draft.stage(
        { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" },
        { key: "account_id", type: "account" },
    );
    draft.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
    await draft.display(true);
    await draft.show("before");
    const steps = JSON.stringify(draft.steps());
    const committed = JSON.stringify(first.data.steps());
    await writer.flush();
    const id = writer.status.entry ?? "";
    writer.stop();
    first.dispose();

    const second = createGraphSession({ features: ["source-steps"] });
    const reader = new Autosaver({ key: KEY, session: second, store, clock: new FakeClock(), locks: new FakeLocks() });
    const report = await reader.restore(id, true);
    assert.deepStrictEqual(report.problems, []);
    const back = second.data.currentDraft();
    assert.isNotNull(back);
    assert.strictEqual(JSON.stringify(back?.steps()), steps);
    assert.strictEqual(JSON.stringify(second.data.steps()), committed, "nothing was committed");
    assert.isTrue(back?.displayed);
    assert.strictEqual(back?.side, "before");

    // Undo steps back through what the draft did before the reload: the merge, then the stage.
    assert.isTrue(back?.undo());
    assert.isUndefined(back?.steps().find((s) => s.op === "join.merge"));
    assert.isTrue(back?.undo());
    assert.isFalse(back?.undo());
    reader.stop();
    second.dispose();
});

it("the restored draft commits what the reader had drafted", async () => {
    const store = memoryAutosaveStore();
    const { session: first } = await phase2();
    const writer = new Autosaver({ key: KEY, session: first, store, clock: new FakeClock(), locks: new FakeLocks() });
    const draft = first.data.draft();
    const a = await draft.stage(
        { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" },
        { key: "account_id", type: "account" },
    );
    draft.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
    await writer.flush();
    const id = writer.status.entry ?? "";
    writer.stop();
    first.dispose();

    const second = createGraphSession({ features: ["source-steps"] });
    const reader = new Autosaver({ key: KEY, session: second, store, clock: new FakeClock(), locks: new FakeLocks() });
    await reader.restore(id, true);
    await second.data.currentDraft()?.commit();
    assert.isNull(second.data.currentDraft());
    assert.isDefined(second.data.steps().find((s) => s.op === "join.merge"));
    assert.strictEqual(second.data.node("A-2")?.holder, "Bob");
    reader.stop();
    second.dispose();
});

it("a draft that changed what a staged source's rows are reads them that way after a restore", async () => {
    const store = memoryAutosaveStore();
    const { session: first } = await phase2();
    const csv = (name: string, data: string): Parameters<typeof first.data.stage>[0] => ({
        type: "csv",
        config: { data },
        name,
    });
    // One source staged before the draft (the project holds its rows), one staged by it.
    const held = await first.data.stage(csv("pays.csv", "payer,payee\nA-1,A-2\nA-2,A-9"), { key: "payer" });
    const writer = new Autosaver({ key: KEY, session: first, store, clock: new FakeClock(), locks: new FakeLocks() });
    const draft = first.data.draft();
    const own = await draft.stage(csv("calls.csv", "from,to\nA-1,A-9\nA-9,A-2"), { key: "from" });
    for (const [source, from, to] of [
        [held, "payer", "payee"],
        [own, "from", "to"],
    ]) {
        draft.setMapping(source, { rows: "edges", edges: { source: from, target: to } });
        draft.add(source);
    }
    const tables = (d: NonNullable<ReturnType<typeof first.data.currentDraft>>): unknown =>
        [held, own].map((source) => d.sourceTable(source).summary().tables);
    const before = { steps: JSON.stringify(draft.steps()), marks: draft.preview().marks, tables: tables(draft) };
    assert.strictEqual(before.marks.edges.new, 4);
    await writer.flush();
    const id = writer.status.entry ?? "";
    writer.stop();
    first.dispose();

    const second = createGraphSession({ features: ["source-steps"] });
    const reader = new Autosaver({ key: KEY, session: second, store, clock: new FakeClock(), locks: new FakeLocks() });
    await reader.restore(id, true);
    const back = second.data.currentDraft();
    if (back === null) {
        throw new Error("the draft did not come back");
    }
    assert.deepStrictEqual(
        { steps: JSON.stringify(back.steps()), marks: back.preview().marks, tables: tables(back) },
        before,
    );
    // Undo goes back to the rows as they were read: nodes, of both sources.
    for (let i = 0; i < 4; i++) {
        back.undo();
    }
    const rowsAre = [held, own].map((source) => back.sourceTable(source).summary());
    assert.deepStrictEqual(
        rowsAre.map((facts) => [facts.mapping.rows, facts.tables.map((table) => [table.table, table.rows])]),
        [
            ["nodes", [["nodes", 2]]],
            ["nodes", [["nodes", 2]]],
        ],
    );
    reader.stop();
    second.dispose();
});

it("a kept draft whose rows are gone is not opened", async () => {
    const session = createGraphSession({ features: ["source-steps"] });
    const reopened = await sourceDraftHooks(session.data)?.reopen({
        askOverlap: false,
        shown: { on: false, side: "after" },
        states: [{ value: { sources: {}, steps: [], types: [], reader: [] }, copies: ["gone"], owned: [] }],
        copies: {},
    });
    assert.isFalse(reopened);
    assert.isNull(session.data.currentDraft());
    session.dispose();
});

for (const act of ["link", "extract", "connect"] as const) {
    it(`a first write made while a ${act} is drawn After holds the committed graph, not the draft's`, async () => {
        const store = memoryAutosaveStore();
        const first = createGraphSession({ features: ["source-steps"] });
        const writer = new Autosaver({
            key: KEY,
            session: first,
            store,
            clock: new FakeClock(),
            locks: new FakeLocks(),
        });
        const people = { type: "csv", config: { data: "person,dept\np1,x\np2,x\np3,y" }, name: "people.csv" };
        await first.data.import(people, { key: "person" });
        const source = first.data.sources()[0]?.key ?? "";
        const draft = first.data.draft();
        if (act === "link") {
            draft.link({ source, columns: ["dept"] });
        } else if (act === "extract") {
            draft.extract(source, { column: "dept" });
        } else {
            const entries = { type: "csv", config: { data: "entry,person\ne1,p1\ne2,p2" }, name: "entries.csv" };
            const e = await draft.stage(entries, { key: "entry", type: "entry" });
            draft.connect({
                from: { source: e, field: "person" },
                into: { space: draft.spaces()[0]?.space ?? "" },
            });
        }
        await draft.display(true);
        const { after } = draft.preview();
        const drawn = (session: typeof first): number[] => [session.data.nodes().length, session.data.edges().length];
        assert.deepStrictEqual(drawn(first), [after.nodes, after.edges]);
        await writer.flush();
        await draft.display(true);
        assert.deepStrictEqual(drawn(first), [after.nodes, after.edges], "the write leaves the draft drawn");
        const id = writer.status.entry ?? "";
        writer.stop();
        first.dispose();

        const second = createGraphSession({ features: ["source-steps"] });
        const reader = new Autosaver({
            key: KEY,
            session: second,
            store,
            clock: new FakeClock(),
            locks: new FakeLocks(),
        });
        await reader.restore(id, true);
        const back = second.data.currentDraft();
        await back?.display(true);
        assert.deepStrictEqual(drawn(second), [after.nodes, after.edges]);
        await back?.commit();
        assert.deepStrictEqual(drawn(second), [after.nodes, after.edges]);
        await second.undo();
        assert.deepStrictEqual(drawn(second), [3, 0]);
        reader.stop();
        second.dispose();
    });
}
