/**
 * Failure notices outside loading, in the app's words (#5574): the style tree's verbs, a refused
 * join, a failed command and a failed video export word the element's code and details, and a
 * code the app has no words for is named, never graphty-element's English message.
 */

import { GraphtyError, type GraphtyErrorCode } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { failureWords } from "../../export/choices";
import { orNotice } from "../../graph-place/actions";
import { setNumberFormat } from "../../settings/numberFormat";
import { NUMBER_FORMAT } from "../../settings/preferences";
import { createWorkspaceStore } from "../../state/store";
import { errorWords } from "../words";

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

afterEach(() => {
    setNumberFormat("system");
    localStorage.removeItem(NUMBER_FORMAT.key);
});

describe("errorWords", () => {
    it("words a style refusal from its code", () => {
        assert.equal(
            errorWords("Could not add a folder", error("E_LOCKED")),
            "Could not add a folder: its layer is locked.",
        );
        assert.equal(
            errorWords("Could not change what the layer styles", error("E_PROTECTED")),
            "Could not change what the layer styles: that layer is drawn by graphty itself; add a layer above it instead.",
        );
    });

    it("words a refused join from its reason", () => {
        assert.equal(
            errorWords("Cannot join", error("E_BAD_COMMAND", { reason: "unknown-column", column: "gene" })),
            "Cannot join: the table has no column gene.",
        );
        assert.equal(
            errorWords("Cannot join", error("E_BAD_COMMAND", { reason: "keys", shape: "edges", keys: 1 })),
            "Cannot join: a join of edges takes two keys.",
        );
        assert.equal(
            errorWords("Cannot join", error("E_BAD_COMMAND", { reason: "keys", shape: "node-values", keys: 0 })),
            "Cannot join: a join takes a key.",
        );
        assert.equal(errorWords("Cannot join", error("E_BAD_COMMAND")), "Cannot join (E_BAD_COMMAND).");
    });

    it("spells numbers in the reader's Number format", () => {
        setNumberFormat("comma");
        assert.equal(
            errorWords("Group failed", error("E_TOO_LARGE", { count: 2_000_000, limit: 1_000_000, of: "nodes" })),
            "Group failed: it would make 2.000.000 nodes; graphty draws at most 1.000.000.",
        );
    });

    it("names a code it has no words for, and never shows any error's message", () => {
        const sentence = errorWords("Could not duplicate Degree", error("E_INTERNAL"));
        assert.equal(sentence, "Could not duplicate Degree (E_INTERNAL).");
        assert.notInclude(sentence, MESSAGE);
        assert.equal(errorWords("Fail failed", new Error(MESSAGE)), "Fail failed.");
        assert.equal(errorWords("Fail failed", MESSAGE), "Fail failed.");
    });
});

describe("the style tree's verbs", () => {
    it("put up the app's words when the element refuses one", async () => {
        const store = createWorkspaceStore();
        await orNotice(store, "rename Degree", Promise.reject(error("E_UNKNOWN_LAYER")));
        assert.deepEqual(store.get().notice, { message: "Could not rename Degree: the layer is gone.", error: true });
        await orNotice(store, "move Degree", Promise.reject(error("E_INTERNAL")));
        assert.deepEqual(store.get().notice, { message: "Could not move Degree (E_INTERNAL).", error: true });
    });
});

describe("a failed video export", () => {
    it("words the element's code, never its message", () => {
        assert.equal(failureWords(error("E_DISPOSED")), "The graph was closed.");
        assert.equal(failureWords(error("E_INTERNAL")), "Something went wrong (E_INTERNAL).");
        assert.equal(failureWords(new Error(MESSAGE)), "Something went wrong.");
    });
});
