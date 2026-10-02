/**
 * @file Saving and opening notes (design/documents/notes.md, "Writing" and "Opening"):
 * `toDocument` writes a member the schema accepts, oldest first and byte-stable, and
 * `mergeDocument` adds a member's notes all or nothing, keeps both on a conflicting id, skips a
 * bad note alone, keeps what it does not know, and binds set, result and item targets only to
 * what the same file carries. The `note-<n>` names are rows of design/documents/conformance.md.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session/GraphSession";
import type { NotesDocument } from "../../../src/session/notes/types";
import { edgeBetween } from "../helpers";
import { notesHarness, refusalOf } from "./harness";

const schemaUrl = new URL("../../../../design/documents/notes.schema.json", import.meta.url);
const ajv = new Ajv2020({ allErrors: true, strict: false });
// ajv-formats is CommonJS: its default export arrives as the module object under Node.
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(schemaUrl, "utf8")) as object);

/**
 * Whether the schema accepts a member.
 * @param member - The member.
 * @returns The schema's errors, or an empty list.
 */
function schemaErrors(member: unknown): string[] {
    return validate(member)
        ? []
        : (validate.errors ?? []).map((error) => `${error.instancePath} ${error.message ?? ""}`);
}

/**
 * A member holding the given notes.
 * @param notes - The notes.
 * @param extra - Other member fields.
 * @returns The member.
 */
function member(notes: unknown[], extra: Record<string, unknown> = {}): Record<string, unknown> {
    return { kind: "graphty-notes", version: 1, ...extra, notes };
}

/**
 * A note as a file holds it.
 * @param id - The suffix of its id.
 * @param fields - Fields to set or override.
 * @returns The note.
 */
function fileNote(id: string, fields: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: `note_${id}`,
        time: "2026-10-01T09:00:00.000Z",
        targets: [{ node: "a" }],
        text: `note ${id}`,
        ...fields,
    };
}

describe("notes.toDocument", () => {
    it("writes a member the schema accepts, oldest first, in the saved key order, the same bytes each time", async () => {
        const h = notesHarness();
        const { session } = h;
        await session.runs.start("degree", undefined, { as: "deg", style: false });
        const set = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Core" });
        const edge = edgeBetween(h, "a", "b");
        const first = session.notes.add({
            text: "first",
            targets: [{ node: 11 }, { set }],
            mediaType: "text/markdown",
        });
        await session.config.set({ author: "Ada" });
        const second = session.notes.add({
            text: "second",
            targets: [{ edge }, { item: { result: "deg", key: { field: "group", value: 1 } } }, { result: "deg" }],
            cites: [{ result: "deg" }],
            extensions: { "com.example.app": { done: true } },
        });
        session.notes.update(second, { text: "second, edited" });

        const document = session.notes.toDocument({ name: "Findings", description: "What we saw." });
        assert.deepEqual(schemaErrors(document), []);
        assert.deepEqual(Object.keys(document), ["kind", "version", "name", "description", "notes"]);
        assert.deepEqual(
            document.notes.map((note) => note.id),
            [first, second],
            "oldest first",
        );
        assert.deepEqual(Object.keys(document.notes[0]), ["id", "time", "targets", "text", "mediaType"]);
        assert.deepEqual(Object.keys(document.notes[1]), [
            "id",
            "time",
            "targets",
            "text",
            "author",
            "edited",
            "cites",
            "extensions",
        ]);
        assert.deepEqual(document.notes[0].targets[1], { set, name: "Core" });
        assert.strictEqual(JSON.stringify(session.notes.toDocument()), JSON.stringify(session.notes.toDocument()));
        assert.deepEqual(schemaErrors(session.notes.toDocument()), [], "no name, no description");
    });

    it("refuses a name or description the schema would not accept", () => {
        const { session } = notesHarness();
        assert.strictEqual(
            refusalOf(() => session.notes.toDocument({ name: "x".repeat(1025) }))?.code,
            "E_BAD_COMMAND",
        );
        assert.strictEqual(
            refusalOf(() => session.notes.toDocument({ description: 7 as unknown as string }))?.code,
            "E_BAD_COMMAND",
        );
    });

    it("accepts the example of notes.md and notes-design.md section 7.2", () => {
        const example = member(
            [
                {
                    id: "note_01K6A1B2C3D4E5F6G7H8J9K0M1",
                    time: "2026-10-01T09:12:03.120Z",
                    targets: [{ node: "ACC-1042" }, { node: "ACC-1043" }],
                    text: "Opened the same day from **one device**.",
                    mediaType: "text/markdown",
                },
                {
                    id: "note_01K6A1C9Q2W3E4R5T6Y7U8I9O0",
                    time: "2026-10-01T09:20:41.007Z",
                    targets: [{ edge: { source: "ACC-1042", target: "DEV-77", id: "login-2026-09-18" } }],
                    text: "First shared login; the chargebacks start 36 hours later.",
                    author: "Ada",
                    edited: "2026-10-01T10:02:15.530Z",
                    extensions: { "com.example.casebook": { done: true } },
                },
            ],
            { name: "Ring A findings" },
        );
        assert.deepEqual(schemaErrors(example), []);

        const { session } = notesHarness();
        const report = session.notes.mergeDocument(example);
        assert.strictEqual(report.added.length, 2);
        assert.strictEqual(
            JSON.stringify(session.notes.toDocument({ name: "Ring A findings" })),
            JSON.stringify(example),
        );
    });
});

describe("notes.mergeDocument", () => {
    it("restores every note of a saved member into a fresh session, ids, times, authors and edits included", async () => {
        const { session } = notesHarness();
        await session.config.set({ author: "Ada" });
        const id = session.notes.add({ text: "  two\r\nlines\u200b ", targets: [{ node: "a" }, { graph: true }] });
        session.notes.update(id, { mediaType: "text/plain" });
        session.notes.add({ text: "second", targets: [{ node: "zz" }] });
        const saved = JSON.parse(JSON.stringify(session.notes.toDocument({ name: "mine" }))) as NotesDocument;

        const fresh = notesHarness().session;
        const report = fresh.notes.mergeDocument(saved);
        assert.deepEqual(
            report.added,
            saved.notes.map((note) => note.id),
        );
        assert.strictEqual(report.missing, 1, "the note about zz");
        assert.deepEqual(fresh.notes.get(id), session.notes.get(id));
        assert.isUndefined(fresh.config.author, "the file's author never sets the author setting");
        assert.strictEqual(JSON.stringify(fresh.notes.toDocument({ name: "mine" })), JSON.stringify(saved));
        const { source } = fresh.notes.status(id);
        assert.strictEqual(source?.name, "mine");
        assert.match(source?.opened ?? "", /Z$/);
        assert.deepEqual(
            fresh.history.steps.map((step) => step.label),
            ["Added notes from mine"],
        );
        await fresh.undo();
        assert.deepEqual(fresh.notes.list(), []);
        await fresh.redo();
        assert.deepEqual(fresh.notes.get(id), session.notes.get(id));
    });

    it("takes the source name from the options over the member's, and publishes one note:changed per note", () => {
        const { session } = notesHarness();
        const changes: string[] = [];
        session.on("note:changed", (change) => changes.push(`${change.change} ${change.id}`));
        session.notes.mergeDocument(member([fileNote("a"), fileNote("b")], { name: "inner" }), {
            name: "outer.graphty.json",
        });
        assert.deepEqual(changes.sort(), ["created note_a", "created note_b"]);
        assert.strictEqual(session.notes.status("note_a").source?.name, "outer.graphty.json");
        assert.strictEqual(session.history.steps.at(-1)?.label, "Added notes from outer.graphty.json");
    });

    it("opens a bare empty member (note-2)", () => {
        const { session } = notesHarness();
        const report = session.notes.mergeDocument({ kind: "graphty-notes", version: 1, notes: [] });
        assert.deepEqual(report, {
            added: [],
            unchanged: 0,
            renamed: [],
            older: [],
            replaced: [],
            kept: [],
            missing: 0,
            skipped: [],
            notices: [],
        });
        assert.strictEqual(session.history.steps.length, 0, "nothing to record");
    });

    it("adds a note about a node the graph lacks, and finds it once the data holds it (note-3, note-4)", () => {
        const h = notesHarness();
        const report = h.session.notes.mergeDocument(member([fileNote("x", { targets: [{ node: "ACC-9999" }] })]));
        assert.strictEqual(report.missing, 1);
        assert.strictEqual(h.session.notes.status("note_x").targets[0].state, "missing");
        h.add([{ id: "ACC-9999" }]);
        assert.strictEqual(h.session.notes.status("note_x").targets[0].state, "present");
    });

    it("keeps targets and cites it does not know, reads them unsupported and writes them back as read (note-5, note-6)", () => {
        const { session } = notesHarness();
        const note = fileNote("u", {
            targets: [{ filterStep: "s1" }, { node: 1, type: "person" }, { node: "a" }],
            cites: [{ result: "r", run: "x", weight: 2 }],
        });
        assert.deepEqual(schemaErrors(member([note])), []);

        const report = session.notes.mergeDocument(member([note]));
        assert.deepEqual(report.added, ["note_u"]);
        const status = session.notes.status("note_u");
        assert.deepEqual(
            status.targets.map((target) => target.state),
            ["unsupported", "unsupported", "present"],
        );
        assert.deepEqual(
            status.cites.map((cite) => cite.state),
            ["unsupported"],
        );
        assert.deepEqual(JSON.parse(JSON.stringify(session.notes.toDocument().notes[0])), note);
        assert.deepEqual(
            session.notes.counts(),
            { notes: 1, nodes: 1, edges: 0 },
            "an unsupported node target counts nowhere",
        );
    });

    it("stores note text exactly as read (note-7)", () => {
        const { session } = notesHarness();
        const texts = ["<img src=x onerror=alert(1)>", "**bold**", "<color='red'>x</color>", "\ud800 lone"];
        session.notes.mergeDocument(member(texts.map((text, at) => fileNote(String(at), { text }))));
        assert.deepEqual(
            texts.map((_, at) => session.notes.get(`note_${String(at)}`)?.text),
            texts,
        );
    });

    it("skips a note that fails the schema alone, with its pointer, and never stamps it (note-8, note-9)", () => {
        const { session } = notesHarness();
        const { time: _time, ...timeless } = fileNote("nt");
        const bad = [
            timeless,
            fileNote("m13", { time: "2026-13-01T00:00:00Z" }),
            fileNote("f30", { time: "2026-02-30T00:00:00Z" }),
            fileNote("au", { author: "" }),
            fileNote("bl", { text: " \n " }),
            fileNote("tg", { targets: [] }),
            fileNote("ed", { edited: "yesterday" }),
            { ...fileNote("x"), id: "nope" },
            "not a note",
        ];
        const report = session.notes.mergeDocument(member([fileNote("ok"), ...bad]));

        assert.deepEqual(report.added, ["note_ok"]);
        assert.deepEqual(
            report.skipped.map((problem) => [problem.what, problem.code]),
            bad.map((_, at) => [`/notes/${String(at + 1)}`, "E_BAD_DOCUMENT"]),
        );
        for (const note of bad) {
            assert.isNotEmpty(schemaErrors(member([note])), JSON.stringify(note));
        }

        assert.isUndefined(session.notes.get("note_nt"));
    });

    it("changes nothing when the same member is merged twice (note-10)", () => {
        const { session } = notesHarness();
        const doc = member([fileNote("a"), fileNote("b")]);
        session.notes.mergeDocument(doc);
        const steps = session.history.steps.length;
        const report = session.notes.mergeDocument(doc);
        assert.deepEqual(report.added, []);
        assert.strictEqual(report.unchanged, 2);
        assert.strictEqual(session.history.steps.length, steps);
        // A time is an instant: another spelling of the same one is the same content.
        assert.strictEqual(
            session.notes.mergeDocument(member([fileNote("a", { time: "2026-10-01T09:00:00+00:00" })])).unchanged,
            1,
        );
    });

    it("keeps both on a conflicting id, and finds the copy unchanged the next time (note-11)", () => {
        const { session } = notesHarness();
        session.notes.mergeDocument(member([fileNote("a")]));
        const doc = member([fileNote("a", { text: "theirs" })]);
        const report = session.notes.mergeDocument(doc);

        assert.strictEqual(report.renamed.length, 1);
        const { from, to } = report.renamed[0];
        assert.strictEqual(from, "note_a");
        assert.match(to, /^note_[0-9A-HJKMNP-TV-Z]{26}$/);
        assert.deepEqual(report.added, [to]);
        assert.strictEqual(session.notes.get("note_a")?.text, "note a", "the held note is never overwritten");
        assert.strictEqual(session.notes.get(to)?.text, "theirs");
        assert.strictEqual(session.notes.get(to)?.time, "2026-10-01T09:00:00.000Z");

        const again = session.notes.mergeDocument(doc);
        assert.strictEqual(again.unchanged, 1);
        assert.deepEqual(again.renamed, []);
    });

    it("reports a file's note older when the held note is a later edit of it (note-12)", () => {
        const { session } = notesHarness();
        const doc = member([fileNote("a")]);
        session.notes.mergeDocument(doc);
        session.notes.update("note_a", { text: "edited here" });
        const report = session.notes.mergeDocument(doc);
        assert.deepEqual(report.older, ["note_a"]);
        assert.deepEqual(report.added, []);
        assert.strictEqual(session.notes.list().length, 1);
    });

    it("treats a second note with one id in one member as a conflict with the first (note-13)", () => {
        const { session } = notesHarness();
        const report = session.notes.mergeDocument(
            member([fileNote("a"), fileNote("a", { text: "other" }), fileNote("a")]),
        );
        assert.strictEqual(report.added.length, 2);
        assert.strictEqual(report.renamed.length, 1);
        assert.strictEqual(report.unchanged, 1);
    });

    it("replaces or keeps a held note as onConflict says", () => {
        const { session } = notesHarness();
        session.notes.mergeDocument(member([fileNote("a"), fileNote("b")]));
        const doc = member([fileNote("a", { text: "A", author: "Bob" }), fileNote("b", { text: "B" })]);

        const mine = session.notes.mergeDocument(doc, { onConflict: "keep-mine" });
        assert.deepEqual(mine.kept, ["note_a", "note_b"]);
        assert.strictEqual(session.notes.get("note_a")?.text, "note a");

        const replaced = session.notes.mergeDocument(doc, { onConflict: "replace" });
        assert.deepEqual(replaced.replaced, ["note_a", "note_b"]);
        assert.deepEqual(replaced.added, []);
        assert.strictEqual(session.notes.get("note_a")?.text, "A");
        assert.strictEqual(session.notes.get("note_a")?.author, "Bob");
        assert.strictEqual(
            refusalOf(() => session.notes.mergeDocument(doc, { onConflict: "x" as "replace" }))?.code,
            "E_OPTION_RANGE",
        );
    });

    it("binds set, result and item targets and cites only to what the file carries (note-15)", async () => {
        const { session } = notesHarness();
        await session.runs.start("degree", undefined, { as: "deg", style: false });
        const set = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Mine" });
        const note = fileNote("s", {
            targets: [
                { set, name: "Suspects" },
                { result: "deg" },
                { item: { result: "deg", run: "r1", key: { field: "group", value: 1 } } },
                { node: "a" },
            ],
            cites: [{ result: "deg", run: "r1" }],
        });
        const report = session.notes.mergeDocument(member([note]));
        assert.strictEqual(report.missing, 1);

        const status = session.notes.status("note_s");
        assert.deepEqual(
            status.targets.map((target) => [target.state, target.label]),
            [
                ["missing", "Suspects"],
                ["missing", "deg"],
                ["missing", "deg: group 1"],
                ["present", "a"],
            ],
        );
        assert.deepEqual(
            status.cites.map((cite) => cite.state),
            ["missing"],
        );
        assert.deepEqual(session.sets.usedBy(set), [], "an unbound note does not use the session's set");

        // Edited here, the targets are the session's own again.
        session.notes.update("note_s", { targets: [{ set }] });
        assert.strictEqual(session.notes.status("note_s").targets[0].state, "present");
        assert.strictEqual(session.notes.status("note_s").cites[0].state, "missing", "the cites were not edited");
    });

    it("refuses a member with __proto__ anywhere whole, and changes nothing (note-20)", () => {
        const { session } = notesHarness();
        const head = '{"id":"note_p","time":"2026-10-01T09:00:00Z","text":"x"';
        for (const note of [
            `${head},"targets":[{"node":"a"}],"__proto__":{"x":1}}`,
            `${head},"targets":[{"node":"a","__proto__":{"x":1}}]}`,
            `${head},"targets":[{"node":"a"}],"extensions":{"com.example.app":{"__proto__":{"x":1}}}}`,
        ]) {
            const text = `{"kind":"graphty-notes","version":1,"notes":[${JSON.stringify(fileNote("ok"))},${note}]}`;
            const refusal = refusalOf(() => session.notes.mergeDocument(JSON.parse(text)));
            assert.strictEqual(refusal?.code, "E_BAD_DOCUMENT", note);
            assert.deepEqual(session.notes.list(), []);
        }
    });

    it("refuses a member that would take the session past 10,000 notes whole (note-21)", () => {
        const { session } = notesHarness();
        const many = (count: number, prefix: string): unknown[] =>
            Array.from({ length: count }, (_, at) => fileNote(`${prefix}${String(at)}`));
        session.notes.mergeDocument(member(many(2000, "h")));
        const refusal = refusalOf(() => session.notes.mergeDocument(member(many(9000, "f"))));
        assert.strictEqual(refusal?.code, "E_TOO_LARGE");
        assert.strictEqual(session.notes.list().length, 2000);
        assert.strictEqual(
            refusalOf(() => session.notes.mergeDocument(member(many(10_001, "g"))))?.code,
            "E_TOO_LARGE",
        );
    });

    it("refuses what is not a version 1 notes member whole", () => {
        const { session } = notesHarness();
        const code = (doc: unknown): string | undefined => refusalOf(() => session.notes.mergeDocument(doc))?.code;
        assert.strictEqual(code(null), "E_BAD_DOCUMENT");
        assert.strictEqual(code({ kind: "graphty-style", version: 1, layers: [] }), "E_BAD_DOCUMENT");
        assert.strictEqual(code({ kind: "graphty-notes", version: 1 }), "E_BAD_DOCUMENT");
        assert.strictEqual(code({ kind: "graphty-notes", version: "1", notes: [] }), "E_BAD_DOCUMENT");
        assert.strictEqual(code(member([], { name: 3 })), "E_BAD_DOCUMENT");
        assert.strictEqual(code(member([], { extensions: { Bad: 1 } })), "E_BAD_DOCUMENT");
        const version = refusalOf(() => session.notes.mergeDocument({ kind: "graphty-notes", version: 2, notes: [] }));
        assert.strictEqual(version?.code, "E_UNSUPPORTED_VERSION");
        assert.deepEqual(version?.details, { kind: "graphty-notes", found: 2, reads: [1] });
    });

    it("keeps unknown fields of a note through an edit and reports them; never reports extensions (note-29)", () => {
        const { session } = notesHarness();
        const report = session.notes.mergeDocument(
            member([fileNote("k", { reviewed: true, extensions: { "com.example.app": 1 } })], { "org.example.x": 1 }),
        );
        assert.deepEqual(
            report.notices.map((problem) => [problem.what, problem.code]),
            [
                ["/org.example.x", "W_UNKNOWN_MEMBER"],
                ["/notes/0/reviewed", "W_UNKNOWN_MEMBER"],
            ],
        );
        session.notes.update("note_k", { text: "changed" });
        const written = session.notes.toDocument().notes[0] as unknown as Record<string, unknown>;
        assert.deepEqual(Object.keys(written), ["id", "time", "targets", "text", "edited", "extensions", "reviewed"]);
        assert.strictEqual(written.reviewed, true);
    });

    it("keeps a time far in the future and says so (note-28)", () => {
        const { session } = notesHarness();
        const report = session.notes.mergeDocument(member([fileNote("f", { time: "2099-01-01T00:00:00Z" })]));
        assert.deepEqual(report.added, ["note_f"]);
        assert.deepEqual(
            report.notices.map((problem) => [problem.what, problem.code]),
            [["/notes/0/time", "W_FUTURE_TIME"]],
        );
        assert.strictEqual(session.notes.get("note_f")?.time, "2099-01-01T00:00:00Z", "kept as read");
    });

    it("joins a transaction as one step with the other writes", async () => {
        const { session } = notesHarness();
        await session.transaction("Open findings", (tx) => {
            tx.notes.mergeDocument(member([fileNote("a")]));
            tx.notes.add({ text: "mine", targets: [{ graph: true }] });
        });
        assert.deepEqual(
            session.history.steps.map((step) => step.label),
            ["Open findings"],
        );
        assert.strictEqual(session.notes.list().length, 2);
    });

    it("is the same API on a standalone session", () => {
        const session = createGraphSession();
        assert.strictEqual(session.notes.mergeDocument(member([fileNote("a")])).added.length, 1);
        session.dispose();
    });
});
