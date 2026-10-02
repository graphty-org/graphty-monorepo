/**
 * @file Hostile notes members: what `mergeDocument` must survive when a file was written by
 * someone else. Prototype pollution through unknown fields and extensions, malformed and
 * duplicate ids, targets naming nothing, huge text, control characters and markup kept exactly,
 * media types, and inputs that are not plain JSON (accessors, shared references).
 */

import { assert, describe, it } from "vitest";

import type { Note } from "../../../src/session/notes/types";
import { notesHarness, refusalOf } from "./harness";

const TIME = "2026-10-01T09:00:00.000Z";

/**
 * A member holding the given notes.
 * @param notes - The notes.
 * @returns The member.
 */
function member(notes: unknown[]): Record<string, unknown> {
    return { kind: "graphty-notes", version: 1, notes };
}

/**
 * A note as a file holds it.
 * @param id - The suffix of its id.
 * @param fields - Fields to set or override.
 * @returns The note.
 */
function fileNote(id: string, fields: Record<string, unknown> = {}): Record<string, unknown> {
    return { id: `note_${id}`, time: TIME, targets: [{ node: "a" }], text: `note ${id}`, ...fields };
}

describe("a hostile notes member", () => {
    it("keeps unknown fields named like Object.prototype members as data, and pollutes nothing", () => {
        const { session } = notesHarness();
        const text = JSON.stringify(
            member([
                fileNote("p", {
                    toString: "x",
                    valueOf: "y",
                    constructor: { prototype: { polluted: 1 } },
                    hasOwnProperty: 1,
                    toJSON: "z",
                    extensions: { graphty: { constructor: { prototype: { polluted: 1 } } } },
                    targets: [{ node: "a" }, { constructor: 1 }, { hasOwnProperty: "x" }],
                }),
            ]),
        );
        const report = session.notes.mergeDocument(JSON.parse(text));
        assert.deepEqual(report.added, ["note_p"]);
        assert.strictEqual(({} as Record<string, unknown>).polluted, undefined);
        assert.deepEqual(
            session.notes.status("note_p").targets.map((target) => target.state),
            ["present", "unsupported", "unsupported"],
        );
        assert.strictEqual(session.notes.list({ targetKind: "constructor" }).length, 1);
        const saved = JSON.parse(JSON.stringify(session.notes.toDocument())) as { notes: Record<string, unknown>[] };
        assert.strictEqual(saved.notes[0].toJSON, "z");
        assert.strictEqual(session.notes.mergeDocument(saved).unchanged, 1, "the same file twice changes nothing");
        session.notes.update("note_p", { text: "edited" });
        assert.strictEqual(session.notes.get("note_p")?.text, "edited");
    });

    it("finds no node for targets named like Object.prototype members", () => {
        const { session } = notesHarness();
        session.notes.mergeDocument(
            member([
                fileNote("n", {
                    targets: [{ node: "__proto__x" }, { node: "constructor" }, { node: "toString" }, { node: "" }],
                }),
            ]),
        );
        assert.deepEqual(
            session.notes.status("note_n").targets.map((target) => target.state),
            ["missing", "missing", "missing", "missing"],
        );
    });

    it("skips each malformed id alone and keeps the rest", () => {
        const { session } = notesHarness();
        const bad = ["note_", `note_${"x".repeat(65)}`, "note_a b", "note_\u0000", "NOTE_a", "note_a/../b", 7, null];
        const report = session.notes.mergeDocument(
            member([...bad.map((id) => ({ ...fileNote("x"), id })), fileNote("ok")]),
        );
        assert.deepEqual(report.added, ["note_ok"]);
        assert.strictEqual(report.skipped.length, bad.length);
    });

    it("stores control characters, bidi overrides and markup in text and author exactly", () => {
        const { session } = notesHarness();
        const text = "\u0000\u001b[31m<bold>x</bold>\u202e\r\n<script>alert(1)</script>";
        const author = "<color='red'>Ada</color>\u202e\u0007";
        session.notes.mergeDocument(member([fileNote("c", { text, author })]));
        assert.strictEqual(session.notes.get("note_c")?.text, text);
        assert.strictEqual(session.notes.get("note_c")?.author, author);
        const again = JSON.parse(JSON.stringify(session.notes.toDocument())) as unknown;
        assert.strictEqual(session.notes.mergeDocument(again).unchanged, 1);
    });

    it("skips, alone, a note with a media type that is not a media type", () => {
        const { session } = notesHarness();
        const bad = ["text/html\r\nX-Evil: 1", "javascript:alert(1)", "text/", `text/${"a".repeat(251)}`, 3, ""];
        const report = session.notes.mergeDocument(
            member([
                ...bad.map((mediaType, at) => fileNote(`m${String(at)}`, { mediaType })),
                fileNote("html", { mediaType: "text/html" }),
            ]),
        );
        assert.deepEqual(report.added, ["note_html"]);
        assert.strictEqual(report.skipped.length, bad.length);
    });

    it("skips an oversized note alone rather than refusing the member", () => {
        const { session } = notesHarness();
        const report = session.notes.mergeDocument(
            member([
                fileNote("long", { text: "x".repeat(65_537) }),
                fileNote("wide", { text: "\u{1F600}".repeat(65_536) }),
                fileNote("ctl", { text: "\u0001".repeat(60_000) }),
                fileNote("targets", { targets: Array.from({ length: 65 }, (_, at) => ({ node: at })) }),
                fileNote("ok"),
            ]),
        );
        assert.deepEqual(report.added, ["note_ok"]);
        assert.strictEqual(report.skipped.length, 4);
    });

    it("refuses a member nested past the limit whole, inside an unknown field", () => {
        const { session } = notesHarness();
        let deep: unknown = 1;
        for (let level = 0; level < 70; level++) {
            deep = [deep];
        }

        const refusal = refusalOf(() => session.notes.mergeDocument(member([fileNote("d", { later: deep })])));
        assert.strictEqual(refusal?.code, "E_BAD_DOCUMENT");
        assert.deepEqual(session.notes.list(), []);
    });

    it("keeps both when a file reuses a held id, and never overwrites the held note by default", () => {
        const { session } = notesHarness();
        const mine = session.notes.add({ text: "mine", targets: [{ node: "a" }] });
        const held = session.notes.get(mine) as Note;
        const report = session.notes.mergeDocument(
            member([{ ...fileNote("z"), id: mine, time: held.time, text: "theirs", author: held.author ?? "Ada" }]),
        );
        assert.strictEqual(session.notes.get(mine)?.text, "mine");
        assert.strictEqual(report.renamed.length, 1);
    });

    it("reads each field of a note once: an accessor cannot pass the id check and store another value", () => {
        const { session } = notesHarness();
        let reads = 0;
        const note = fileNote("g");
        Object.defineProperty(note, "id", {
            enumerable: true,
            get: () => (++reads > 3 ? { not: "an id" } : "note_g"),
        });
        const refusal = refusalOf(() => session.notes.mergeDocument(member([note])));
        assert.strictEqual(refusal?.code, "E_BAD_DOCUMENT", "an accessor is not JSON");
        assert.isAtMost(reads, 0, "the accessor is never called");
        assert.deepEqual(session.notes.list(), []);
    });

    it("refuses or finishes quickly on a member whose objects share references", () => {
        const { session } = notesHarness();
        let shared: unknown = 1;
        for (let level = 0; level < 23; level++) {
            shared = { left: shared, right: shared };
        }

        const started = performance.now();
        const refusal = refusalOf(() => session.notes.mergeDocument(member([fileNote("s", { later: shared })])));
        assert.strictEqual(refusal?.code, "E_BAD_DOCUMENT", "an object reached twice is not JSON");
        assert.isBelow(performance.now() - started, 500, "a 23-level shared tree is 2^23 visits if walked as a tree");
    });

    it("refuses a merge name longer than 1,024 characters, which would land in the undo label", () => {
        const { session } = notesHarness();
        const refusal = refusalOf(() =>
            session.notes.mergeDocument(member([fileNote("n")]), { name: "x".repeat(1025) }),
        );
        assert.strictEqual(refusal?.code, "E_OPTION_RANGE");
        assert.deepEqual(session.notes.list(), []);
    });
});
