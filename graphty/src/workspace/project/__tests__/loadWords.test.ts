/**
 * Why a load did not open, in the app's words: every code a load can raise gets the app's own
 * clause, numbers follow the reader's Number format, and a code the app has no words for names
 * the code, never graphty-element's English message (#5362).
 */

import { GraphtyError, type GraphtyErrorCode } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { setNumberFormat } from "../../settings/numberFormat";
import { NUMBER_FORMAT } from "../../settings/preferences";
import { problemSentence } from "../actions";
import { notReadWords } from "../words";

/** The element's own message, which no sentence may show. */
const MESSAGE = "ELEMENT MESSAGE FOR DEBUGGING";

/**
 * A GraphtyError as the element throws one.
 * @param code - its code.
 * @param details - its details.
 * @returns the error.
 */
function error(code: GraphtyErrorCode, details: Record<string, unknown> = {}): GraphtyError {
    return new GraphtyError({ code, message: MESSAGE, source: "data", details });
}

/** Every code a load can raise that the app words, and the clause it says for it. */
const WORDED: readonly [GraphtyErrorCode, Record<string, unknown>, string][] = [
    ["E_UNKNOWN_FORMAT", {}, "graphty cannot tell what kind of file it is"],
    ["E_BAD_DOCUMENT", {}, "it is not a graphty project file"],
    ["E_UNSUPPORTED_VERSION", { found: 9, reads: 1 }, "it was saved by a newer graphty; update graphty to open it"],
    ["E_UNSUPPORTED", {}, "it needs a part this graphty cannot read yet"],
    ["E_PROJECT_FILE_AS_DATA", {}, "it is a graphty project; open it with Open"],
    ["E_TOO_LARGE", {}, "it is too large"],
    ["E_TOO_LARGE", { count: 12, limit: 10, of: "edges" }, "it would make 12 edges; graphty draws at most 10"],
    ["E_OUT_OF_MEMORY", {}, "this browser ran out of memory reading it"],
    ["E_FETCH_FAILED", {}, "the download failed; check your connection and try again"],
    ["E_FETCH_FAILED", { status: 404 }, "the download failed (HTTP 404)"],
    ["E_EMPTY_LOAD", {}, "it holds no nodes or edges"],
    ["E_EDGE_ENDPOINTS_UNRESOLVED", {}, "no columns say which nodes each edge links"],
    ["E_ID_MISSING", {}, "some rows have no id"],
    ["E_DUPLICATE_ID", {}, "it holds the same id more than once"],
    ["E_DUPLICATE_ID", { id: "n7" }, "it holds the id n7 more than once"],
    ["E_DUPLICATE_EDGE", {}, "it holds the same edge more than once"],
    ["E_UNKNOWN_DATASET", {}, "graphty has no dataset by that name"],
    ["E_UNKNOWN_GENERATOR", {}, "graphty has no generator by that name"],
    ["E_OPTION_RANGE", {}, "a setting is out of range"],
    ["E_OPTION_RANGE", { option: "n" }, "n is out of range"],
    ["E_MISSING_PACKAGE", {}, "it needs a package graphty does not have"],
    ["E_MISSING_PACKAGE", { package: "@graphty/graph-io" }, "it needs the @graphty/graph-io package"],
    ["E_AUTOSAVE_ENTRY_TAKEN", {}, "another tab has this work open"],
    ["E_AUTOSAVE_UNKNOWN_ENTRY", {}, "this browser no longer keeps that work"],
    ["E_SUPERSEDED", {}, "another load took its place"],
    ["E_DISPOSED", {}, "the project closed before it finished"],
    ["E_SOURCE_NOT_FOUND", { origin: "https://api.example.org" }, "not found: api.example.org"],
];

afterEach(() => {
    setNumberFormat("system");
    localStorage.removeItem(NUMBER_FORMAT.key);
});

describe("notReadWords", () => {
    it("words every load code from its code and details, never the element's message", () => {
        for (const [code, details, clause] of WORDED) {
            assert.equal(
                notReadWords("friends", error(code, details), "opened"),
                `friends could not be opened: ${clause}.`,
            );
        }
    });

    it("words a file it could not read whole, with the line it broke at", () => {
        assert.equal(
            notReadWords("friends", error("E_PARSE_FAILED", { line: 12 }), "added"),
            "friends could not be added: the file is incomplete or damaged near line 12, so nothing was read. Ask for the file again.",
        );
    });

    it("words a model's refusal with the model's own words", () => {
        assert.equal(
            notReadWords("chair", error("E_MODEL_STRUCTURE"), "opened"),
            "chair could not be opened. The model file is damaged.",
        );
    });

    it("spells the counts in the reader's Number format", () => {
        setNumberFormat("comma");
        assert.equal(
            notReadWords("big", error("E_TOO_LARGE", { count: 2_000_000, limit: 1_000_000, of: "nodes" }), "opened"),
            "big could not be opened: it would make 2.000.000 nodes; graphty draws at most 1.000.000.",
        );
        assert.include(notReadWords("big", error("E_PARSE_FAILED", { line: 12_345 }), "opened"), "near line 12.345");
    });

    it("names a code it has no words for, never the element's message", () => {
        const sentence = notReadWords("friends", error("E_UNKNOWN_LAYOUT"), "opened");
        assert.equal(sentence, "friends could not be opened (E_UNKNOWN_LAYOUT).");
        assert.notInclude(sentence, MESSAGE);
        assert.equal(notReadWords("friends", new Error(MESSAGE), "added"), "friends could not be added.");
    });

    it("words a project file that did not open, falling back to the load's words", () => {
        assert.equal(problemSentence("a.json", error("E_TOO_LARGE")), "a.json could not be opened: it is too large.");
        assert.equal(problemSentence("a.json", error("E_INTERNAL")), "a.json could not be opened (E_INTERNAL).");
    });
});
