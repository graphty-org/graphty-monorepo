import { describe, expect, it } from "vitest";

import { UNDO_DEPTH } from "../../constants";
import { canRedo, canUndo, cleaningSteps, EMPTY_UNDO_STORE, type HistoryEntry, historyRows, isConfirmedIrreversibleAction, isDataMutationCategory, isUndoableCategory, needsConfirmation, NOT_UNDOABLE_CATEGORIES, pushEntry, redo, restoreTo, undo, UNDOABLE_CATEGORIES, undoneCount,type UndoStoreState } from "../undoStore";

const makeEntry = (
    id: string,
    overrides: Partial<HistoryEntry> = {},
): HistoryEntry => ({
    id,
    category: "algorithmResult",
    title: `Step ${id}`,
    activity: "analyze",
    activityLabel: "Analyze",
    at: new Date(2026, 0, 5, 14, 0).getTime(),
    ...overrides,
});

const storeOf = (count: number, currentIndex = count - 1): UndoStoreState => ({
    entries: Array.from({ length: count }, (_unused, index) => makeEntry(String(index))),
    currentIndex,
});

describe("undoStore", () => {
    describe("the category tables", () => {
        it("carries every undoable category the spec names", () => {
            expect(UNDOABLE_CATEGORIES).toHaveLength(17);
            expect(UNDOABLE_CATEGORIES.map((category) => category.id)).toContain("nodeMerge");
            expect(UNDOABLE_CATEGORIES.map((category) => category.id)).toContain("recipeStep");
        });

        it("carries every not-undoable category the spec names", () => {
            expect(NOT_UNDOABLE_CATEGORIES.map((category) => category.id)).toEqual([
                "cameraMove",
                "selection",
                "panelAndTierState",
                "settings",
                "aiChat",
                "exitXrSession",
            ]);
        });

        it("gives every category a unique id", () => {
            const ids = [...UNDOABLE_CATEGORIES, ...NOT_UNDOABLE_CATEGORIES].map((c) => c.id);

            expect(new Set(ids).size).toBe(ids.length);
        });

        it("flags exactly the ten data mutations", () => {
            const mutations = UNDOABLE_CATEGORIES.filter((category) => category.dataMutation);

            expect(mutations.map((category) => category.id)).toEqual([
                "import",
                "tableJoin",
                "identifierMapping",
                "nodeMerge",
                "columnOperation",
                "cellEdit",
                "rowDeletion",
                "autoFix",
                "computedAttribute",
                "reappliedImportOptions",
            ]);
        });

        it("answers whether a category is undoable and whether it mutates data", () => {
            expect(isUndoableCategory("nodeMerge")).toBe(true);
            expect(isUndoableCategory("cameraMove")).toBe(false);
            expect(isDataMutationCategory("nodeMerge")).toBe(true);
            expect(isDataMutationCategory("layoutSwitch")).toBe(false);
        });
    });

    describe("the confirmation rule", () => {
        it("asks for no confirmation on anything undoable", () => {
            for (const category of UNDOABLE_CATEGORIES) {
                expect(needsConfirmation(category.id)).toBe(false);
            }
        });

        it("keeps a confirmation for what the store cannot take back", () => {
            expect(needsConfirmation("settings")).toBe(true);
            expect(isConfirmedIrreversibleAction("Clear history")).toBe(true);
            expect(isConfirmedIrreversibleAction("Remove key")).toBe(true);
            expect(isConfirmedIrreversibleAction("Close dataset")).toBe(true);
            expect(isConfirmedIrreversibleAction("Remove result")).toBe(false);
        });
    });

    describe("recording a step", () => {
        it("starts empty, with nothing to undo or redo", () => {
            expect(canUndo(EMPTY_UNDO_STORE)).toBe(false);
            expect(canRedo(EMPTY_UNDO_STORE)).toBe(false);
            expect(undoneCount(EMPTY_UNDO_STORE)).toBe(0);
        });

        it("appends the step and moves the position onto it", () => {
            const state = pushEntry(EMPTY_UNDO_STORE, makeEntry("a"));

            expect(state.entries).toHaveLength(1);
            expect(state.currentIndex).toBe(0);
            expect(canUndo(state)).toBe(true);
            expect(canRedo(state)).toBe(false);
        });

        it("clears the redo stack", () => {
            const undone = undo(undo(storeOf(3)));

            expect(undoneCount(undone)).toBe(2);

            const state = pushEntry(undone, makeEntry("new"));

            expect(state.entries.map((entry) => entry.id)).toEqual(["0", "new"]);
            expect(canRedo(state)).toBe(false);
        });

        it("holds at most the depth the spec fixes, dropping the oldest", () => {
            let state = EMPTY_UNDO_STORE;

            for (let index = 0; index < UNDO_DEPTH + 5; index += 1) {
                state = pushEntry(state, makeEntry(String(index)));
            }

            expect(UNDO_DEPTH).toBe(50);
            expect(state.entries).toHaveLength(UNDO_DEPTH);
            expect(state.entries[0].id).toBe("5");
            expect(state.currentIndex).toBe(UNDO_DEPTH - 1);
        });
    });

    describe("walking the store", () => {
        it("undoes one step at a time and stops at the bottom", () => {
            const state = undo(undo(undo(storeOf(2))));

            expect(state.currentIndex).toBe(-1);
            expect(canUndo(state)).toBe(false);
            expect(undoneCount(state)).toBe(2);
        });

        it("redoes one step at a time and stops at the top", () => {
            const state = redo(redo(redo(undo(undo(storeOf(2))))));

            expect(state.currentIndex).toBe(1);
            expect(canRedo(state)).toBe(false);
        });

        it("keeps undone entries in the store so they can be redone", () => {
            const state = undo(storeOf(3));

            expect(state.entries).toHaveLength(3);
            expect(canRedo(state)).toBe(true);
        });

        it("restores the point a row names", () => {
            const state = restoreTo(storeOf(4), "1");

            expect(state.currentIndex).toBe(1);
            expect(undoneCount(state)).toBe(2);
        });

        it("ignores a restore to an id the store does not hold", () => {
            const before = storeOf(2);

            expect(restoreTo(before, "nope")).toBe(before);
        });
    });

    describe("the Cleaning steps view", () => {
        it("is this same store filtered to the data mutations", () => {
            const state: UndoStoreState = {
                entries: [
                    makeEntry("a", { category: "nodeMerge" }),
                    makeEntry("b", { category: "layoutSwitch" }),
                    makeEntry("c", { category: "autoFix" }),
                ],
                currentIndex: 2,
            };

            expect(cleaningSteps(state).map((entry) => entry.id)).toEqual(["a", "c"]);
        });
    });

    describe("the History pop-out's rows", () => {
        it("runs newest first", () => {
            const rows = historyRows(storeOf(3));

            expect(rows.map((row) => (row.kind === "entry" ? row.entry.id : row.sessionId))).toEqual([
                "2",
                "1",
                "0",
            ]);
        });

        it("marks the current position and everything above it as undone", () => {
            const rows = historyRows(storeOf(3, 1));

            expect(rows[0]).toMatchObject({ undone: true, current: false });
            expect(rows[1]).toMatchObject({ undone: false, current: true });
            expect(rows[2]).toMatchObject({ undone: false, current: false });
        });

        it("collapses an XR session into one group, newest first", () => {
            const state: UndoStoreState = {
                entries: [
                    makeEntry("import", { category: "import" }),
                    makeEntry("vr-1", { xrSessionId: "vr", xrSessionLabel: "VR session 14:21 - 14:39" }),
                    makeEntry("vr-2", { xrSessionId: "vr", xrSessionLabel: "VR session 14:21 - 14:39" }),
                    makeEntry("vr-3", { xrSessionId: "vr", xrSessionLabel: "VR session 14:21 - 14:39" }),
                ],
                currentIndex: 3,
            };
            const rows = historyRows(state);

            expect(rows).toHaveLength(2);

            const [group] = rows;

            expect(group.kind).toBe("xrSession");

            if (group.kind !== "xrSession") {
                throw new Error("expected the XR session group first");
            }

            expect(group.label).toBe("VR session 14:21 - 14:39");
            expect(group.children.map((child) => child.entry.id)).toEqual(["vr-3", "vr-2", "vr-1"]);
            expect(group.undone).toBe(false);
        });

        it("strikes a whole XR session through only when every step in it is undone", () => {
            const state: UndoStoreState = {
                entries: [
                    makeEntry("a", { xrSessionId: "vr", xrSessionLabel: "VR session" }),
                    makeEntry("b", { xrSessionId: "vr", xrSessionLabel: "VR session" }),
                ],
                currentIndex: -1,
            };
            const [group] = historyRows(state);

            expect(group.kind === "xrSession" && group.undone).toBe(true);
        });
    });
});
