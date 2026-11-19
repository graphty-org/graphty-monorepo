/**
 * @file A draft of the sources and steps and the session around it (design 5.6, 8.9): its acts
 * dispatch nothing and its commit exactly one `data.steps-set`; the commit round-trips through undo
 * and redo; discarding leaves nothing; a save with a draft open writes the committed project;
 * opening a project or clearing the graph discards it; notes and runs made while it is open survive
 * its commit (ported from the reference model's notes-survive-commit-and-undo case).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type SourceDraftChange } from "../../../src/session";
import { dispatcherOf } from "../../../src/session/dispatchers";
import { stateDigest } from "../../../src/session/project/digest";
import { ACCOUNTS, phase2, refused } from "./scenario";

const ACCOUNTS_CSV = { type: "csv", config: { data: ACCOUNTS }, name: "accounts.csv" } as const;

/** Saved text with its clock readings blanked, so two saves compare. */
const CLOCK = /"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z"/gu;

/**
 * A project's saved text, clock readings blanked.
 * @param session - The session.
 * @returns The text.
 */
async function saved(session: GraphSession): Promise<string> {
    return (await session.project.save()).text.replaceAll(CLOCK, '"T"');
}

/**
 * Every command the session dispatches while `work` runs.
 * @param session - The session.
 * @param work - The work.
 * @returns The commands, in order.
 */
async function dispatched(session: GraphSession, work: () => Promise<unknown> | unknown): Promise<{ op: string }[]> {
    const dispatcher = dispatcherOf(session);
    const seen: { op: string }[] = [];
    const previous = dispatcher.events.dispatched;
    dispatcher.events.dispatched = (command) => {
        seen.push(command);
    };
    try {
        await work();
    } finally {
        dispatcher.events.dispatched = previous;
    }
    return seen;
}

/**
 * Collect the session's `data:draft-changed` events.
 * @param session - The session.
 * @returns The reasons, as they arrive.
 */
function draftEvents(session: GraphSession): SourceDraftChange["reason"][] {
    const reasons: SourceDraftChange["reason"][] = [];
    session.on("data:draft-changed", (change) => reasons.push(change.reason));
    return reasons;
}

describe("source-steps drafts: the session around a draft", () => {
    it("draft acts dispatch nothing; commit dispatches exactly one data.steps-set setting the whole value", async () => {
        const { session, t } = await phase2();
        const a = await session.data.stage(ACCOUNTS_CSV, { key: "account_id", type: "account" });
        const d = session.data.draft();
        const acts = await dispatched(session, async () => {
            await d.stage(
                { type: "csv", config: { data: "merchant_id,city\nM-1,Oslo" }, name: "m.csv" },
                { key: "merchant_id" },
            );
            d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
            d.renameColumn({ kind: "edge", name: "category" }, "kind", { source: t });
            d.declareType({ name: "atm", kind: "node", rules: [{ source: t, end: "target" }] });
            d.editStep(
                d.steps().findIndex((s) => s.op === "join.merge"),
                { clash: { holder: "overwrite" } },
            );
            d.setMapping(a, { type: "account" });
            d.pick({ space: "account", key: "A-2" }, "holder", a);
            d.undo();
        });
        assert.deepStrictEqual(acts, []);
        const commit = await dispatched(session, () => d.commit());
        assert.deepStrictEqual(
            commit.map((c) => [c.op, (c as unknown as { edit: { kind: string } }).edit.kind]),
            [["data.steps-set", "set"]],
        );
        assert.strictEqual(session.data.node("A-2")?.holder, "Bob", "overwrite: accounts.csv's holder");
        assert.strictEqual(session.data.sources().find((s) => s.name === "m.csv")?.state, "staged");
        session.dispose();
    });

    it("a draft asked for while a commit is landing is refused, so it never starts from before it", async () => {
        const { session } = await phase2();
        const a = await session.data.stage(ACCOUNTS_CSV, { key: "account_id", type: "account" });
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        const landing = d.commit();
        const details = await refused(() => Promise.resolve(session.data.draft()), "E_DRAFT_OPEN");
        assert.strictEqual(details.draft, d.id);
        await landing;
        const next = session.data.draft();
        assert.isDefined(
            next.steps().find((s) => s.op === "join.merge"),
            "the next draft starts from the commit",
        );
        next.dispose();
        session.dispose();
    });

    it("the commit round-trips: undo gives back the state before it, redo the state after", async () => {
        const { session } = await phase2();
        const a = await session.data.stage(ACCOUNTS_CSV, { key: "account_id", type: "account" });
        const state = (): string => stateDigest(dispatcherOf(session).state);
        const before = state();
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        await d.commit();
        const after = state();
        assert.notStrictEqual(after, before);
        await session.undo();
        assert.strictEqual(state(), before);
        await session.redo();
        assert.strictEqual(state(), after);
        session.dispose();
    });

    it("discarding leaves nothing: no step, the same state, and only the discarded event", async () => {
        const { session } = await phase2();
        const a = await session.data.stage(ACCOUNTS_CSV, { key: "account_id", type: "account" });
        const before = stateDigest(dispatcherOf(session).state);
        const history = session.history.steps.length;
        const reasons = draftEvents(session);
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        d.dispose();
        assert.deepStrictEqual(reasons, ["opened", "changed", "discarded"]);
        assert.isFalse(d.open);
        assert.strictEqual(stateDigest(dispatcherOf(session).state), before);
        assert.lengthOf(session.history.steps, history);
        await refused(
            () => Promise.resolve(d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } })),
            "E_BAD_COMMAND",
        );
        session.dispose();
    });

    it("a commit that changes nothing records nothing", async () => {
        const { session } = await phase2();
        const history = session.history.steps.length;
        const reasons = draftEvents(session);
        const d = session.data.draft();
        const sent = await dispatched(session, () => d.commit());
        assert.deepStrictEqual(sent, []);
        assert.lengthOf(session.history.steps, history);
        assert.deepStrictEqual(reasons, ["opened", "committed"]);
        session.dispose();
    });

    it("a save with a draft open writes the committed project and leaves the draft open", async () => {
        const { session } = await phase2();
        const a = await session.data.stage(ACCOUNTS_CSV, { key: "account_id", type: "account" });
        const committed = await saved(session);
        const d = session.data.draft();
        d.merge({ from: { source: a, field: "account_id" }, into: { space: "account" } });
        assert.strictEqual(await saved(session), committed);
        assert.isTrue(d.open);
        await d.commit();
        assert.notStrictEqual(await saved(session), committed);
        session.dispose();
    });

    it("opening a project and clearing the graph discard the draft", async () => {
        const { session } = await phase2();
        const { text } = await session.project.save();
        const reasons = draftEvents(session);
        const d = session.data.draft();
        await session.project.open(text);
        assert.isFalse(d.open);
        assert.isNull(session.data.currentDraft());
        const e = session.data.draft();
        await session.data.clear();
        assert.isFalse(e.open);
        assert.deepStrictEqual(reasons, ["opened", "discarded", "opened", "discarded"]);
        assert.strictEqual(session.data.store.getSnapshot().ids.size, 0);
        session.dispose();
    });

    it("a note and a style written while a draft is open survive its commit", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: "id,name\na1,Ann\na2,Bo" }, name: "accounts.csv" },
            { key: "id", type: "account" },
        );
        const d = session.data.draft();
        await d.stage(
            { type: "csv", config: { data: "id,name\nb1,Cy" }, name: "more.csv" },
            { key: "id", type: "other" },
        );
        session.notes.add({ text: "check", targets: [{ node: "a1" }] });
        await session.styles.add({
            name: "draft-time layer",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        await d.commit();
        assert.lengthOf(session.notes.list(), 1, "the commit kept the note written while the draft was open");
        assert.isDefined(
            session.styles.list().find((layer) => layer.name === "draft-time layer"),
            "and the style layer",
        );
        session.dispose();
    });

    it("an import in a draft is one act and one undo step once committed", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: "id,name\na1,Ann\na2,Bo" }, name: "accounts.csv" },
            { key: "id", type: "account" },
        );
        const history = session.history.steps.length;
        const d = session.data.draft();
        await d.import(
            { type: "csv", config: { data: "id,name\nb1,Cy" }, name: "more.csv" },
            { key: "id", type: "other" },
        );
        assert.isUndefined(session.data.node("b1"), "nothing is drawn before the commit");
        await d.commit();
        assert.isDefined(session.data.node("b1"));
        assert.lengthOf(session.history.steps, history + 1);
        await session.undo();
        assert.isUndefined(session.data.node("b1"), "undo takes more.csv back");
        assert.isUndefined(session.data.sources().find((s) => s.name === "more.csv"));
        session.dispose();
    });

    it("with the experiment off, data.draft() and data.currentDraft() throw E_FEATURE_OFF", async () => {
        const session = createGraphSession({ features: [] });
        await refused(() => Promise.resolve(session.data.draft()), "E_FEATURE_OFF");
        await refused(() => Promise.resolve(session.data.currentDraft()), "E_FEATURE_OFF");
        session.dispose();
    });
});
