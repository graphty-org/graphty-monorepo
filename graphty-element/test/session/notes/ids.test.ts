/**
 * @file Note ids and times: `note_` plus a ULID that matches the schema's pattern and never
 * repeats, and times written as `Date.prototype.toISOString()` writes them.
 */

import { assert, describe, it } from "vitest";

import { mintNoteId, noteTime } from "../../../src/session/notes/ids";

/** The schema's `noteId` pattern (design/documents/notes.schema.json). */
const SCHEMA_ID = /^note_[0-9A-Za-z_-]{1,64}$/;

/** A ULID: 26 characters of Crockford base 32. */
const ULID = /^note_[0-9A-HJKMNP-TV-Z]{26}$/;

describe("note ids", () => {
    it("are note_ plus a ULID, match the schema, and are unique across 100,000 mints", () => {
        const seen = new Set<string>();
        for (let i = 0; i < 100_000; i++) {
            const id = mintNoteId();
            assert.match(id, SCHEMA_ID);
            assert.match(id, ULID);
            seen.add(id);
        }

        assert.strictEqual(seen.size, 100_000);
    });

    it("start with the time they were minted at, so later ids sort after earlier ones", () => {
        const early = mintNoteId(Date.UTC(2026, 0, 1));
        const late = mintNoteId(Date.UTC(2026, 9, 1));
        assert.isBelow(early.localeCompare(late), 0);
        assert.strictEqual(mintNoteId(0).slice(5, 15), "0000000000");
    });
});

describe("note times", () => {
    it("are UTC with milliseconds, as toISOString writes them", () => {
        assert.strictEqual(noteTime(Date.UTC(2026, 9, 1, 9, 12, 3, 120)), "2026-10-01T09:12:03.120Z");
        assert.match(noteTime(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
});
