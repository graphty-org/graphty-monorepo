/**
 * Every style code a load can report has the app's own words, enumerated from graphty-element's runtime lists so a code the element adds fails here.
 */

import { EXPORT_STYLE_LOSS_CODES, FILE_STYLE_CODES, type FileStyleNote } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { fileStyleNotesWords, fileStyleNoteWords, STYLE_NOTE_WORDS } from "../fileStyleWords";

const EXPORT_ONLY: readonly string[] = EXPORT_STYLE_LOSS_CODES;
const IMPORT_CODES = FILE_STYLE_CODES.filter((code) => !EXPORT_ONLY.includes(code));
const GENERIC = "Something in the file's styles";

describe("the app's words for a file's styles", () => {
    it("words every style code a load reports", () => {
        assert.isAbove(IMPORT_CODES.length, 30);
        for (const code of IMPORT_CODES) {
            assert.isString((STYLE_NOTE_WORDS as Readonly<Record<string, string>>)[code], code);
            const said = fileStyleNoteWords({
                code: code as FileStyleNote["code"],
                params: { property: "fill", target: "node", count: 3 },
            });
            assert.isFalse(said.startsWith(GENERIC), code);
            assert.include(said, "(node fill color), 3 times.");
        }
    });

    it("names a property in words, and says each sentence of a load once", () => {
        const note: FileStyleNote = {
            code: "W_STYLE_GRADIENT",
            params: { property: "borderColor", target: "node", count: 1 },
        };
        assert.equal(fileStyleNoteWords(note), "A gradient fill is drawn as its first color (node border color).");
        assert.deepEqual(fileStyleNotesWords([note, note]), [fileStyleNoteWords(note)]);
    });

    it("words an unknown code generically", () => {
        const said = fileStyleNoteWords({ code: "W_STYLE_FROM_THE_FUTURE" as never, params: {} });
        assert.isTrue(said.startsWith(GENERIC));
    });
});
