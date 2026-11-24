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
