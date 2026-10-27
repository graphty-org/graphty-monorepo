import type { AutosaveEntry, AutosaveStatus } from "@graphty/graphty-element";
import { assert, describe, it } from "vitest";

import {
    autosaveProblemSentence,
    availableSentence,
    formatAutosaveChip,
    recoveredSentence,
    reopenedSentence,
} from "../words";

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

    it("words the entries it did not reopen", () => {
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
        // Short facts, not sentences: no sentence ends in a period.
        for (const reason of reasons) {
            assert.notMatch(availableSentence({ entry: ENTRY, reason, problem: null }), /\.$/);
        }
    });

    it("words the start screen's offer and the notice once it is restored", () => {
        const now = Date.parse("2026-10-13T10:05:00.000Z");
        assert.strictEqual(
            recoveredSentence(ENTRY, now),
            "An untitled project (2 nodes), changed 5 minutes ago, was never saved to a file.",
        );
        assert.strictEqual(
            recoveredSentence({ ...ENTRY, name: "Org chart", nodes: 1 }, now),
            "Org chart (1 node), changed 5 minutes ago, was never saved to a file.",
        );
        assert.strictEqual(reopenedSentence(ENTRY, now), "Restored: 5 minutes ago");
    });
});
