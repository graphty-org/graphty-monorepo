/**
 * @file Writing notes on a standalone session: what `add`, `update` and `remove` store, every
 * refusal of design/notes/notes-design.md section 5.4 (except the merge-only ones), and that a
 * refused write changes nothing and publishes nothing.
 */

import { assert, describe, it } from "vitest";

import { dispatcherOf } from "../../../src/session/GraphSession";
import type { NoteInput, NotePatch } from "../../../src/session/notes/types";
import type { SessionCommand } from "../../../src/session/planning";
import { stateDigest } from "../../../src/session/project/digest";
import type { GraphSession } from "../../../src/session/types";
import { edgeBetween } from "../helpers";
import { notesHarness, type Refusal, refusalOf } from "./harness";

/**
 * Check a write is refused with a code and reason, and changes nothing: no state, no step, no event.
 * @param session - The session.
 * @param write - The write.
 * @returns The refusal, for further checks.
 */
function refuses(session: GraphSession, write: () => unknown): Refusal {
    const before = stateDigest(dispatcherOf(session).state);
    const steps = session.history.steps.length;
    let heard = 0;
    const stop = session.on("note:changed", () => heard++);
    const refusal = refusalOf(write);
    stop();

    assert.isNotNull(refusal, "the write was expected to be refused");
    assert.strictEqual(stateDigest(dispatcherOf(session).state), before, "state changed");
    assert.strictEqual(session.history.steps.length, steps, "a step was recorded");
    assert.strictEqual(heard, 0, "note:changed was published");
    return refusal;
}

/**
 * The reason a refused `add` gives.
 * @param session - The session.
 * @param input - The input.
 * @returns The code and reason.
 */
function addReason(session: GraphSession, input: unknown): [string, unknown] {
    const refusal = refuses(session, () => session.notes.add(input as NoteInput));
    return [refusal.code, refusal.details.reason];
}

describe("notes.add", () => {
    it("stores a frozen record with an id, a time and the text exactly, and lists it", () => {
        const { session } = notesHarness();
        const text = "  Line one\r\nline two\n\ttabbed \u200B \uD800 end  ";
        const id = session.notes.add({ text, targets: [{ node: "a" }] });

        const note = session.notes.get(id);
        assert.isDefined(note);
        assert.strictEqual(note.text, text, "byte for byte: line breaks, spaces, a lone surrogate");
        assert.match(note.id, /^note_[0-9A-Z]{26}$/);
        assert.match(note.time, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        assert.deepEqual(note.targets, [{ node: "a" }]);
        assert.deepEqual(Object.keys(note), ["id", "time", "targets", "text"], "absent fields are absent");
        assert.isTrue(Object.isFrozen(note) && Object.isFrozen(note.targets) && Object.isFrozen(note.targets[0]));
        assert.strictEqual(session.notes.get(id), note, "the same object until it changes");
        assert.deepEqual(session.notes.list(), [note]);
        assert.isUndefined(session.notes.get("note_nope"));
    });

    it("accepts a note holding only a zero-width space, and 65,536 code points of text", () => {
        const { session } = notesHarness();
        session.notes.add({ text: "\u200B", targets: [{ graph: true }] });
        const long = "\u{1F600}".repeat(16_384) + "x".repeat(65_536 - 16_384);
        const id = session.notes.add({ text: long, targets: [{ graph: true }] });
        assert.strictEqual(session.notes.get(id)?.text, long);
    });

    it("never freezes or keeps the caller's own objects", () => {
        const { session } = notesHarness();
        const input = {
            text: "x",
            targets: [{ node: "a" }],
            extensions: { "com.example.app": { tags: ["one"] } },
        };
        const id = session.notes.add(input);
        input.targets[0].node = "b";
        input.extensions["com.example.app"].tags.push("two");

        assert.isFalse(Object.isFrozen(input) || Object.isFrozen(input.targets[0]));
        const note = session.notes.get(id);
        assert.deepEqual(note?.targets, [{ node: "a" }]);
        assert.deepEqual(JSON.parse(JSON.stringify(note?.extensions)), { "com.example.app": { tags: ["one"] } });
        assert.isTrue(Object.isFrozen(note?.extensions?.["com.example.app"]));
    });

    it("stores every target kind in its saved form, collapsing duplicates to the first", async () => {
        const h = notesHarness();
        const { session } = h;
        const setId = session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Core" });
        await session.runs.start("degree", undefined, { as: "deg", style: false });
        const execution = session.notes.get(
            session.notes.add({ text: "pin", targets: [{ graph: true }], cites: [{ result: "deg" }] }),
        )?.cites?.[0].run;
        assert.isString(execution);

        const id = session.notes.add({
            text: "all kinds",
            targets: [
                { graph: true },
                { node: "a" },
                { node: 11 },
                { edge: edgeBetween(h, "a", "b") },
                { edge: { source: "b", target: "c", ordinal: 0, among: 1 } },
                { set: setId },
                { result: "deg" },
                { item: { result: "deg", key: { field: "group", value: 3 } } },
                { item: { result: "deg", run: "older", key: { field: "group", value: 3 } } },
                { node: "a" },
                { graph: true },
            ],
        });

        // A session edge id becomes the edge's stable form: here, an edge added without a file id.
        assert.deepEqual(session.notes.get(id)?.targets, [
            { graph: true },
            { node: "a" },
            { node: 11 },
            { edge: { source: "a", target: "b", id: "graphty:e0" } },
            { edge: { source: "b", target: "c", ordinal: 0, among: 1 } },
            { set: setId, name: "Core" },
            { result: "deg" },
            { item: { result: "deg", run: execution, key: { field: "group", value: 3 } } },
            { item: { result: "deg", run: "older", key: { field: "group", value: 3 } } },
        ]);
    });

    it("accepts a node or an edge the graph does not hold", () => {
        const { session } = notesHarness();
        const id = session.notes.add({
            text: "before the data",
            targets: [{ node: "zz" }, { edge: { source: "zz", target: "yy", id: "e-1" } }],
        });
        assert.lengthOf(session.notes.get(id)?.targets ?? [], 2);
    });

    it("pins a cite to the result's current finished run, and stores the media type and extensions", async () => {
        const { session } = notesHarness();
        await session.runs.start("degree", undefined, { as: "deg", style: false });
        const id = session.notes.add({
            text: "**bold**",
            targets: [{ node: "a" }],
            cites: [{ result: "deg" }, { result: "deg" }],
            mediaType: "Text/Markdown; variant=GFM",
            extensions: { "com.example.casebook": { done: true, n: [1, null, "x"] } },
        });
        const note = session.notes.get(id);
        assert.lengthOf(note?.cites ?? [], 1, "duplicates collapsed");
        assert.strictEqual(note?.cites?.[0].result, "deg");
        assert.isString(note?.cites?.[0].run);
        assert.strictEqual(note?.mediaType, "Text/Markdown; variant=GFM");
        assert.deepEqual(Object.keys(note ?? {}), [
            "id",
            "time",
            "targets",
            "text",
            "mediaType",
            "cites",
            "extensions",
        ]);
    });

    it("stamps the author setting when one is set, and nothing when none is", async () => {
        const { session } = notesHarness();
        const before = session.notes.add({ text: "x", targets: [{ graph: true }] });
        await session.config.set({ author: "Ada" });
        const after = session.notes.add({ text: "y", targets: [{ graph: true }] });

        assert.notProperty(session.notes.get(before), "author");
        assert.strictEqual(session.notes.get(after)?.author, "Ada");
    });

    it("refuses each malformed input with its reason, and changes nothing", async () => {
        const h = notesHarness();
        const { session } = h;
        const node = [{ node: "a" }];
        const many = Array.from({ length: 65 }, (_, i) => ({ node: `n${String(i)}` }));

        assert.deepEqual(addReason(session, { text: "", targets: node }), ["E_BAD_COMMAND", "empty-text"]);
        assert.deepEqual(addReason(session, { text: " \n\t ", targets: node }), ["E_BAD_COMMAND", "empty-text"]);
        assert.deepEqual(addReason(session, { targets: node }), ["E_BAD_COMMAND", "empty-text"]);
        assert.deepEqual(addReason(session, { text: "x".repeat(65_537), targets: node }), [
            "E_BAD_COMMAND",
            "text-too-long",
        ]);
        assert.deepEqual(addReason(session, { text: "x", targets: [] }), ["E_BAD_COMMAND", "no-targets"]);
        assert.deepEqual(addReason(session, { text: "x" }), ["E_BAD_COMMAND", "no-targets"]);

        const tooMany = refuses(session, () => session.notes.add({ text: "x", targets: many }));
        assert.deepEqual([tooMany.details.reason, tooMany.details.field], ["too-many", "targets"]);
        const cites = Array.from({ length: 65 }, () => ({ result: "deg" }));
        const tooManyCites = refuses(session, () => session.notes.add({ text: "x", targets: node, cites }));
        assert.deepEqual([tooManyCites.details.reason, tooManyCites.details.field], ["too-many", "cites"]);

        for (const target of [
            { node: { id: 1 } },
            { node: Number.NaN },
            { graph: false },
            { node: "a", extra: 1 },
            { edge: "999999" },
            { edge: { source: "a" } },
            { edge: { source: "a", target: "b", id: "e", ordinal: 0, among: 1 } },
            { edge: { source: "a", target: "b", ordinal: -1, among: 1 } },
            { edge: { source: "a", target: "b", key: "k" } },
            { item: { result: "deg", key: { field: "", value: 1 } } },
            { filterStep: "s1" },
            "a",
            null,
        ]) {
            const refusal = refuses(session, () =>
                session.notes.add({ text: "x", targets: [{ node: "b" }, target] } as unknown as NoteInput),
            );
            assert.deepEqual(
                [refusal.code, refusal.details.reason, refusal.details.index],
                ["E_BAD_COMMAND", "bad-target", 1],
                JSON.stringify(target),
            );
        }

        for (const target of [
            { set: "set_nope" },
            { result: "nope" },
            { item: { result: "nope", key: { field: "g", value: 1 } } },
        ]) {
            const refusal = refuses(session, () => session.notes.add({ text: "x", targets: [target] }));
            assert.deepEqual(
                [refusal.details.reason, refusal.details.index],
                ["unknown-target", 0],
                JSON.stringify(target),
            );
        }

        assert.deepEqual(addReason(session, { text: "x", targets: node, cites: [{ result: "nope" }] }), [
            "E_BAD_COMMAND",
            "unknown-cite",
        ]);
        assert.deepEqual(addReason(session, { text: "x", targets: node, cites: [{ run: "deg" }] }), [
            "E_BAD_COMMAND",
            "unknown-cite",
        ]);

        // A run that has not finished: no current run to pin a cite or a run-less item to.
        const waiting = session.runs.start("degree", undefined, { as: "slow", style: false });
        assert.deepEqual(addReason(session, { text: "x", targets: node, cites: [{ result: "slow" }] }), [
            "E_BAD_COMMAND",
            "not-finished",
        ]);
        assert.deepEqual(
            addReason(session, { text: "x", targets: [{ item: { result: "slow", key: { field: "g", value: 1 } } }] }),
            ["E_BAD_COMMAND", "not-finished"],
        );
        await waiting;

        for (const mediaType of ["markdown", "text/", "text/plain\n", `text/${"x".repeat(251)}`, 7]) {
            assert.deepEqual(addReason(session, { text: "x", targets: node, mediaType }), [
                "E_BAD_COMMAND",
                "bad-media-type",
            ]);
        }

        const cycle: Record<string, unknown> = {};
        cycle.self = cycle;
        let deep: unknown = 1;
        for (let i = 0; i < 32; i++) {
            deep = [deep];
        }

        for (const extensions of [
            { "com.example.app": new Date() },
            { "com.example.app": new Map() },
            { "com.example.app": new Uint8Array(2) },
            { "com.example.app": () => 1 },
            { "com.example.app": Number.POSITIVE_INFINITY },
            { "com.example.app": undefined },
            { "com.example.app": cycle },
            { "com.example.app": deep },
            { "com.example.app": "x".repeat(65_536) },
            { notReverseDomain: 1 },
            { "Com.Example": 1 },
            JSON.parse('{"com.example.app":{"__proto__":{"x":1}}}') as unknown,
            [1],
            "x",
        ]) {
            assert.deepEqual(addReason(session, { text: "x", targets: node, extensions }), [
                "E_BAD_COMMAND",
                "bad-extensions",
            ]);
        }

        const minted = refuses(session, () =>
            session.notes.add({ text: "x", targets: node, id: "note_x", author: "Me" } as unknown as NoteInput),
        );
        assert.deepEqual([minted.details.reason, minted.details.fields], ["element-field", ["id", "author"]]);
        assert.deepEqual(addReason(session, { text: "x", targets: node, tags: ["a"] }), [
            "E_BAD_COMMAND",
            "unknown-field",
        ]);
        assert.deepEqual(session.notes.list(), []);
    });

    it("refuses a note larger than 256 KB saved, and a session past 10,000 notes", async () => {
        const { session } = notesHarness();
        const big = refuses(session, () =>
            session.notes.add({ text: "\u{1F600}".repeat(65_536), targets: [{ node: "a" }] }),
        );
        assert.deepEqual([big.code, big.details.reason], ["E_TOO_LARGE", "note-size"]);

        await session.transaction("Many notes", (tx) => {
            for (let i = 0; i < 10_000; i++) {
                tx.notes.add({ text: String(i), targets: [{ graph: true }] });
            }
        });
        assert.strictEqual(session.notes.counts().notes, 10_000);
        const full = refuses(session, () => session.notes.add({ text: "one more", targets: [{ graph: true }] }));
        assert.deepEqual([full.code, full.details.reason], ["E_TOO_LARGE", "notes"]);
    });
});

describe("notes.update and notes.remove", () => {
    it("changes only what the patch names, stamps edited, keeps author and time, and keeps unchanged parts", async () => {
        const { session } = notesHarness();
        await session.config.set({ author: "Ada" });
        await session.runs.start("degree", undefined, { as: "deg", style: false });
        const id = session.notes.add({ text: "x", targets: [{ node: "a" }], cites: [{ result: "deg" }] });
        const first = session.notes.get(id);
        assert.isDefined(first);
        await session.config.set({ author: "Bob" });

        session.notes.update(id, { text: "y", mediaType: "text/plain" });
        const second = session.notes.get(id);
        assert.isDefined(second);
        assert.strictEqual(second.text, "y");
        assert.strictEqual(second.author, "Ada", "editing someone else's note keeps their name");
        assert.strictEqual(second.time, first.time);
        assert.match(second.edited ?? "", /Z$/);
        assert.strictEqual(second.targets, first.targets, "an unchanged part is the same object");
        assert.strictEqual(second.cites, first.cites);

        session.notes.update(id, { mediaType: null, cites: [] });
        assert.notProperty(session.notes.get(id), "mediaType");
        assert.notProperty(session.notes.get(id), "cites");
    });

    it("keeps a cite's pin when the cite is left unchanged, and pins a new one to the current run", async () => {
        const { session } = notesHarness();
        await session.runs.start("degree", undefined, { as: "deg", style: false });
        const id = session.notes.add({ text: "x", targets: [{ node: "a" }], cites: [{ result: "deg" }] });
        const pinned = session.notes.get(id)?.cites?.[0].run;
        await session.runs.get("deg")?.rerun();

        session.notes.update(id, { cites: [{ result: "deg" }] });
        assert.strictEqual(session.notes.get(id)?.cites?.[0].run, pinned, "unchanged cite keeps its pin");
        assert.isNull(refusalOf(() => session.notes.update(id, { text: "still" })));
    });

    it("records nothing for a patch that changes nothing", () => {
        const { session } = notesHarness();
        const id = session.notes.add({ text: "x", targets: [{ node: "a" }] });
        const note = session.notes.get(id);
        const steps = session.history.steps.length;

        session.notes.update(id, { text: "x", targets: [{ node: "a" }] });
        session.notes.update(id, {});
        assert.strictEqual(session.history.steps.length, steps);
        assert.strictEqual(session.notes.get(id), note);
        assert.notProperty(note, "edited");
    });

    it("refuses an unknown id, element-made fields, and every add refusal, changing nothing", () => {
        const { session } = notesHarness();
        const id = session.notes.add({ text: "x", targets: [{ node: "a" }] });

        assert.strictEqual(
            refuses(session, () => session.notes.update("note_nope", { text: "y" })).details.reason,
            "unknown-id",
        );
        assert.strictEqual(refuses(session, () => session.notes.remove("note_nope")).details.reason, "unknown-id");
        assert.strictEqual(refusalOf(() => session.notes.status("note_nope"))?.details.reason, "unknown-id");
        const minted = refuses(session, () =>
            session.notes.update(id, { time: "2026-01-01T00:00:00.000Z", edited: "x" } as unknown as NotePatch),
        );
        assert.deepEqual([minted.details.reason, minted.details.fields], ["element-field", ["time", "edited"]]);
        assert.strictEqual(
            refuses(session, () => session.notes.update(id, { text: " " })).details.reason,
            "empty-text",
        );
        assert.strictEqual(
            refuses(session, () => session.notes.update(id, { targets: [] })).details.reason,
            "no-targets",
        );
        assert.strictEqual(
            refuses(session, () => session.notes.update(id, { mediaType: "nope" })).details.reason,
            "bad-media-type",
        );
    });

    it("removes a note", () => {
        const { session } = notesHarness();
        const id = session.notes.add({ text: "x", targets: [{ node: "a" }] });
        session.notes.remove(id);
        assert.isUndefined(session.notes.get(id));
        assert.deepEqual(session.notes.list(), []);
    });

    it("refuses set.create carrying element-made fields with the same reason notes use", async () => {
        const { session } = notesHarness();
        const refused = await session
            .execute({
                op: "set.create",
                id: "set_x",
                definition: { kind: "fixed", nodes: ["a"], reading: "induced" },
            } as unknown as SessionCommand)
            .then(
                () => null,
                (error: unknown) => (error as { details?: Record<string, unknown> }).details,
            );
        assert.deepEqual(refused, { fields: ["id"], reason: "element-field" });
    });
});
