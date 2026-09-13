import { describe, expect, it } from "vitest";

import {
    COMPARE_TITLE,
    compareTitle,
    EXPORT_LABEL,
    EXPORT_MENU_DATA,
    EXPORT_MENU_IMAGE,
    exportTitle,
    formatHistoryTime,
    HISTORY_CURRENT_BADGE,
    HISTORY_INFO_TEXT,
    HISTORY_TITLE,
    historyStateLine,
    INSPECTOR_TOGGLE_VERB,
    inspectorToggleTitle,
    PALETTE_PILL_TEXT,
    PANEL_TOGGLE_VERB,
    panelToggleTitle,
    redoAccessibleName,
    redoTitle,
    SHARE_MENU_COPY_IMAGE,
    SHARE_MENU_EXPORT_DATA,
    SHARE_TITLE,
    shareTitle,
    undoAccessibleName,
    undoTitle,
    XR_VOICE_PROVENANCE,
    xrSessionStepCount,
} from "../topBarStrings";

describe("topBarStrings", () => {
    describe("undo and redo titles", () => {
        it("prints the Apple spelling of the chord", () => {
            expect(undoTitle(true, true)).toBe("Undo (Cmd+Z)");
            expect(redoTitle(true, true)).toBe("Redo (Shift+Cmd+Z)");
        });

        it("prints the Windows and Linux spelling of the same chord", () => {
            expect(undoTitle(true, false)).toBe("Undo (Ctrl+Z)");
            expect(redoTitle(true, false)).toBe("Redo (Shift+Ctrl+Z)");
        });

        it("appends the reason when there is nothing to act on", () => {
            expect(undoTitle(false, true)).toBe("Undo (Cmd+Z). Nothing to undo yet");
            expect(redoTitle(false, true)).toBe("Redo (Shift+Cmd+Z). Nothing to redo yet");
        });

        it("strips the key chip from the accessible name and keeps the reason", () => {
            expect(undoAccessibleName(true)).toBe("Undo");
            expect(undoAccessibleName(false)).toBe("Undo. Nothing to undo yet");
            expect(redoAccessibleName(true)).toBe("Redo");
            expect(redoAccessibleName(false)).toBe("Redo. Nothing to redo yet");
        });
    });

    describe("the right group's titles", () => {
        it("appends the load-data reason to Export, Share and Compare", () => {
            expect(exportTitle(true)).toBe("Export");
            expect(exportTitle(false)).toBe("Export. Load data first");
            expect(shareTitle(true)).toBe("Share this view");
            expect(shareTitle(false)).toBe("Share this view. Load data first");
            expect(compareTitle(true)).toBe("Compare two views");
            expect(compareTitle(false)).toBe("Compare two views. Load data first");
        });

        it("never renames the inspector toggle, on either platform", () => {
            expect(inspectorToggleTitle(true)).toBe("Toggle inspector (D)");
            expect(inspectorToggleTitle(false)).toBe("Toggle inspector (D)");
            expect(INSPECTOR_TOGGLE_VERB).toBe("Toggle inspector");
        });

        it("never renames the panel toggle, and spells its chip for the platform", () => {
            expect(panelToggleTitle(true)).toBe("Toggle panel (Cmd+B)");
            expect(panelToggleTitle(false)).toBe("Toggle panel (Ctrl+B)");
            expect(PANEL_TOGGLE_VERB).toBe("Toggle panel");
        });

        it("names the menu rows the spec fixes", () => {
            expect(EXPORT_LABEL).toBe("Export");
            expect(EXPORT_MENU_IMAGE).toBe("Image");
            expect(EXPORT_MENU_DATA).toBe("Data");
            expect(SHARE_TITLE).toBe("Share this view");
            expect(SHARE_MENU_EXPORT_DATA).toBe("Export data");
            expect(SHARE_MENU_COPY_IMAGE).toBe("Copy image");
            expect(COMPARE_TITLE).toBe("Compare two views");
        });
    });

    describe("the command palette pill", () => {
        it("reads the same string on every screen", () => {
            expect(PALETTE_PILL_TEXT).toBe("Search commands, nodes and edges");
        });
    });

    describe("the History pop-out", () => {
        it("names itself History", () => {
            expect(HISTORY_TITLE).toBe("History");
        });

        it("prints the state line in the N entries, M undone form", () => {
            expect(historyStateLine(12, 6)).toBe("12 entries, 6 undone");
            expect(historyStateLine(0, 0)).toBe("0 entries, 0 undone");
        });

        it("keeps the state line grammatical at one entry", () => {
            expect(historyStateLine(1, 0)).toBe("1 entry, 0 undone");
        });

        it("carries the interaction sentence in its info circle", () => {
            expect(HISTORY_INFO_TEXT).toBe(
                "Hover previews, click restores, click a title opens its panel, Esc closes.",
            );
        });

        it("marks the current position and an XR step's provenance", () => {
            expect(HISTORY_CURRENT_BADGE).toBe("Current");
            expect(XR_VOICE_PROVENANCE).toBe("by voice, in VR");
        });

        it("counts an XR session's steps", () => {
            expect(xrSessionStepCount(3)).toBe("3 steps");
            expect(xrSessionStepCount(1)).toBe("1 step");
        });

        it("prints a 24-hour HH:MM time", () => {
            expect(formatHistoryTime(new Date(2026, 0, 5, 14, 15).getTime())).toBe("14:15");
            expect(formatHistoryTime(new Date(2026, 0, 5, 9, 3).getTime())).toBe("09:03");
        });
    });
});
