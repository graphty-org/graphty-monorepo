/**
 * Every style code a load can report and every reason a file's layer can give has the app's own
 * words, enumerated from graphty-element's runtime lists so a code the element adds fails here.
 */

import {
    EXPORT_STYLE_LOSS_CODES,
    FILE_STYLE_CODES,
    FILE_STYLE_REASONS,
    type FileStyleNote,
    type FileStyleOrigin,
} from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import {
    fileStyleLayerWords,
    fileStyleNotesWords,
    fileStyleNoteWords,
    STYLE_NOTE_WORDS,
    STYLE_REASON_WORDS,
} from "../fileStyleWords";

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

    it("words every reason a file's layer gives", () => {
        assert.isAbove(FILE_STYLE_REASONS.length, 0);
        for (const reason of FILE_STYLE_REASONS) {
            const words = STYLE_REASON_WORDS[reason];
            assert.isString(words, reason);
            const origin: FileStyleOrigin = {
                format: "gexf",
                importId: "1",
                ruleId: "node.copy.color",
                role: "passthrough",
                origin: "inferred",
                distinctValues: 281,
                reason,
            };
            assert.include(fileStyleLayerWords(origin), words);
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

    it("says what a mapping layer reads and how many values it maps", () => {
        const origin: FileStyleOrigin = {
            format: "gexf",
            importId: "1",
            ruleId: "node.by.Modularity Class",
            role: "mapping",
            origin: "inferred",
            mapping: "discrete",
            entries: 9,
        };
        assert.equal(fileStyleLayerWords(origin, "Modularity Class"), "From the file, by Modularity Class (9 values)");
        assert.equal(
            fileStyleLayerWords({ ...origin, role: "defaults", origin: "tool" }),
            "Defaults of the program that wrote the file",
        );
    });
});
