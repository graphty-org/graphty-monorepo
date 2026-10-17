import type { AutosaveEntry, AutosaveRestored, AutosaveStatus } from "@graphty/graphty-element";
import { assert, describe, it } from "vitest";

import {
    atRiskSentence,
    autosaveProblemSentence,
    availableSentence,
    formatAutosaveChip,
    restoredSentence,
} from "../formatAutosave";

const STATUS: AutosaveStatus = {
    state: "saved",
    savedAt: null,
    revision: 0,
    entry: null,
    unexported: false,
    persisted: null,
    storage: null,
    ephemeral: "unknown",
    problem: null,
};

const ENTRY: AutosaveEntry = {
    id: "e1",
    key: "app.graphty.shell",
    name: "",
    createdAt: "2026-10-13T10:00:00.000Z",
    savedAt: "2026-10-13T10:00:00.000Z",
    revision: 3,
    nodes: 2,
    edges: 1,
    dirty: true,
    live: true,
};

/**
 * A restore of ENTRY saved at `savedAt`, with `others` other unsaved entries.
 * @param savedAt - when it was saved.
 * @param others - the other unsaved entries.
 * @returns the restore.
 */
function restore(savedAt: string, others: number): AutosaveRestored {
    return {
        entry: ENTRY,
        savedAt,
        revision: 3,
        report: { opened: "project", name: null, restored: [], problems: [], extensions: {} },
        wasDiscarded: null,
        navigationType: "reload",
        others,
        copiedFrom: null,
        pageOverrides: [],
    } as unknown as AutosaveRestored;
}

describe("formatAutosave", () => {
    it("words each state, and draws nothing while autosave is off with nothing to say", () => {
        assert.isNull(formatAutosaveChip(STATUS), "nothing written yet");
        const written = { ...STATUS, savedAt: "2026-10-13T10:00:00.000Z" };
        assert.deepEqual(
            ["saved", "pending", "failing"].map(
                (state) => formatAutosaveChip({ ...written, state: state as AutosaveStatus["state"] })?.label,
            ),
            ["Autosave: saved", "Autosave: saving...", "Autosave: not saved"],
        );
        assert.isNull(formatAutosaveChip({ ...STATUS, state: "off" }));
        const off = formatAutosaveChip({
            ...STATUS,
            state: "off",
            problem: { code: "E_AUTOSAVE_UNAVAILABLE", params: { api: "indexedDB" } },
        });
        assert.strictEqual(off?.tone, "problem");
    });

    it("gives every failure code its own sentence, and an unknown one the general sentence", () => {
        const codes = [
            "E_AUTOSAVE_UNAVAILABLE",
            "E_AUTOSAVE_QUOTA",
            "E_AUTOSAVE_STALLED",
            "E_AUTOSAVE_CONNECTION_LOST",
            "E_AUTOSAVE_TOO_LARGE",
            "E_AUTOSAVE_FORMAT_NEWER",
            "E_AUTOSAVE_RESTORE_CRASHED",
        ];
        const sentences = new Set(codes.map((code) => autosaveProblemSentence({ code })));
        assert.strictEqual(sentences.size, codes.length);
        assert.strictEqual(
            autosaveProblemSentence({ code: "E_SOMETHING_NEW" }),
            autosaveProblemSentence({ code: "E_AUTOSAVE_FAILED" }),
        );
    });

    it("says when the work was saved, and what else the browser holds", () => {
        const now = Date.parse("2026-10-13T10:02:30.000Z");
        assert.strictEqual(
            restoredSentence(restore("2026-10-13T10:02:20.000Z", 0), [ENTRY], now),
            "Restored your work from a moment ago.",
        );
        assert.strictEqual(
            restoredSentence(
                restore("2026-10-13T10:00:00.000Z", 2),
                [ENTRY, { ...ENTRY, id: "e2", ended: "replaced" }],
                now,
            ),
            "Restored your work from 2 minutes ago. 2 other unsaved copies of your work are in this browser. " +
                "1 earlier graph you replaced is kept too.",
        );
    });

    it("words the entries it did not reopen and the at-risk fact", () => {
        const reasons = ["held-by-other-tab", "page-data-changed", "restore-failed", "manual"] as const;
        assert.strictEqual(
            new Set(reasons.map((reason) => availableSentence({ entry: ENTRY, reason, problem: null }))).size,
            reasons.length,
        );
        assert.include(
            availableSentence({
                entry: ENTRY,
                reason: "restore-failed",
                problem: { code: "E_AUTOSAVE_FORMAT_NEWER", params: {} },
            }),
            "newer version",
        );
        const fact = (ephemeral: "likely" | "unknown") => ({
            code: "W_AUTOSAVE_ORIGIN_EPHEMERAL" as const,
            params: { persisted: false, ephemeral, unexported: true },
        });
        assert.include(atRiskSentence(fact("likely")), "private window");
        assert.include(atRiskSentence(fact("unknown")), "may clear");
    });
});
