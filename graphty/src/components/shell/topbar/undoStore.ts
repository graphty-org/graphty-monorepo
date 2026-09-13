/**
 * The one history store, as the shell sees it.
 *
 * Build spec 02 (tmp/shell-spec/02-bars-and-rail.md) section 3: one history store for
 * the whole application, depth 50, and a new action clears the redo stack. Undo and
 * redo walk this single store; the two filtered views the spec names -- Data tier 2
 * `Cleaning steps` (data mutations only) and Analyze tier 2 `History` (every entry) --
 * are filters over it and not stores of their own, which is why
 * {@link isDataMutationCategory} lives here rather than in the Data panel.
 *
 * The undoable and not-undoable categories of sections 3.1 and 3.2 are encoded as
 * DATA, so a producer names the category it is recording and the store, the pop-out,
 * the Cleaning steps view and the confirmation rule all read the same table.
 *
 * PRODUCERS ARE NOT CONNECTED. Nothing in the application pushes to this store yet:
 * wiring real mutations into it is out of the top bar's scope. The store is real and
 * tested, and the shell's Undo, Redo and History surfaces read it.
 */

import { useCallback, useMemo, useState } from "react";

import { UNDO_DEPTH } from "../constants";
import type { ActivityId } from "../types";

/* -------------------------------------------------------------------------- */
/* The categories (spec 02 sections 3.1 and 3.2)                               */
/* -------------------------------------------------------------------------- */

/**
 * Every kind of step the one history store can hold. The ids are the shell's own;
 * the labels are the spec's words.
 *
 * Named in {@link UndoCategory.id} and narrowed by {@link isUndoableCategory}.
 * @public
 */
export type UndoableCategoryId =
    | "algorithmResult"
    | "autoFix"
    | "cellEdit"
    | "columnOperation"
    | "computedAttribute"
    | "filterOrTimeWindow"
    | "identifierMapping"
    | "import"
    | "layoutSwitch"
    | "noteEdit"
    | "nodeMerge"
    | "presetApplication"
    | "reappliedImportOptions"
    | "recipeStep"
    | "rowDeletion"
    | "styleLayerOrEncoding"
    | "tableJoin";

/**
 * Every kind of change section 3.2 keeps OUT of the store. Naming them is what stops
 * a later producer quietly pushing a camera move or a selection onto the stack.
 *
 * Named in {@link UndoCategory.id}, the other half of the pair.
 * @public
 */
export type NotUndoableCategoryId =
    | "aiChat"
    | "cameraMove"
    | "exitXrSession"
    | "panelAndTierState"
    | "selection"
    | "settings";

/**
 * One row of either category table.
 *
 * The row type of {@link UNDOABLE_CATEGORIES} and {@link NOT_UNDOABLE_CATEGORIES}.
 * @public
 */
export interface UndoCategory {
    /** The category's id. */
    readonly id: NotUndoableCategoryId | UndoableCategoryId;
    /** What the spec calls it, in its own words. */
    readonly label: string;
    /**
     * Whether the step is a data mutation, which is what the Data panel's tier 2
     * `Cleaning steps` view filters this store down to (section 3.3).
     */
    readonly dataMutation: boolean;
}

/**
 * The undoable categories, in the spec's own order: the data mutations first, then
 * the view, style and analysis steps. Spec 02 section 3.1.
 */
export const UNDOABLE_CATEGORIES: readonly UndoCategory[] = [
    { id: "import", label: "imports and their policies", dataMutation: true },
    { id: "tableJoin", label: "table joins", dataMutation: true },
    { id: "identifierMapping", label: "identifier mappings", dataMutation: true },
    { id: "nodeMerge", label: "node merges", dataMutation: true },
    { id: "columnOperation", label: "column operations", dataMutation: true },
    { id: "cellEdit", label: "cell edits", dataMutation: true },
    { id: "rowDeletion", label: "row deletions", dataMutation: true },
    { id: "autoFix", label: "Auto-fix", dataMutation: true },
    { id: "computedAttribute", label: "computed attribute add, edit and remove", dataMutation: true },
    { id: "reappliedImportOptions", label: "re-applied import options", dataMutation: true },
    { id: "filterOrTimeWindow", label: "filter and time window changes", dataMutation: false },
    { id: "styleLayerOrEncoding", label: "style layer and encoding changes", dataMutation: false },
    { id: "presetApplication", label: "preset application", dataMutation: false },
    { id: "layoutSwitch", label: "layout switches", dataMutation: false },
    { id: "algorithmResult", label: "algorithm result add and remove", dataMutation: false },
    { id: "noteEdit", label: "note edits", dataMutation: false },
    { id: "recipeStep", label: "recipe steps", dataMutation: false },
];

/**
 * The changes that never enter the store. Spec 02 section 3.2.
 */
export const NOT_UNDOABLE_CATEGORIES: readonly UndoCategory[] = [
    { id: "cameraMove", label: "camera moves", dataMutation: false },
    { id: "selection", label: "selection", dataMutation: false },
    { id: "panelAndTierState", label: "panel and tier state", dataMutation: false },
    { id: "settings", label: "Settings", dataMutation: false },
    { id: "aiChat", label: "AI chat", dataMutation: false },
    { id: "exitXrSession", label: "exiting an XR session", dataMutation: false },
];

/**
 * The three irreversible actions that KEEP their confirmation dialog. Everything
 * undoable from the top bar gets no confirmation, only a toast carrying Undo
 * (section 3.4); these are the exceptions, named by the spec.
 *
 * Exported because the list is the rule: a caller adding a confirmation reads it rather than
 * guessing which actions keep one.
 * @public
 */
export const CONFIRMED_IRREVERSIBLE_ACTIONS: readonly string[] = [
    "Clear history",
    "Remove key",
    "Close dataset",
];

/**
 * Whether a category id names a step the one history store records.
 * @param id - the category id to test.
 * @returns true when the step is undoable.
 */
export function isUndoableCategory(id: string): id is UndoableCategoryId {
    return UNDOABLE_CATEGORIES.some((category) => category.id === id);
}

/**
 * Whether a category id names a data mutation, which is what the Data panel's
 * `Cleaning steps` view filters the store down to (section 3.3).
 * @param id - the category id to test.
 * @returns true when the step is a data mutation.
 */
export function isDataMutationCategory(id: string): boolean {
    return UNDOABLE_CATEGORIES.some((category) => category.id === id && category.dataMutation);
}

/**
 * Whether an action needs a confirmation dialog before it runs. Section 3.4: any
 * action that is undoable from the top bar gets NO confirmation dialog, only a toast
 * carrying Undo. Confirmations remain for everything else.
 * @param categoryId - the category the action would record.
 * @returns false for every undoable category, true otherwise.
 */
export function needsConfirmation(categoryId: string): boolean {
    return !isUndoableCategory(categoryId);
}

/**
 * Whether an action is one of the three the spec names as irreversible, which keep
 * their confirmation however the rest of the rule reads. Section 3.4.
 * @param label - the action's full label, e.g. "Clear history".
 * @returns true when the action is on the named list.
 */
export function isConfirmedIrreversibleAction(label: string): boolean {
    return CONFIRMED_IRREVERSIBLE_ACTIONS.includes(label);
}

/* -------------------------------------------------------------------------- */
/* Entries                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One step in the history store, and one row of the History pop-out.
 */
export interface HistoryEntry {
    /** Stable id, unique within the store. */
    readonly id: string;
    /** Which of section 3.1's categories the step belongs to. */
    readonly category: UndoableCategoryId;
    /**
     * What the step is called, in the user's own words where the step names the
     * user's own data (floor item 7), e.g. `Merge acct-0093 into acct-4471`.
     */
    readonly title: string;
    /** The panel that owns the step; a title click opens it there. */
    readonly activity: ActivityId;
    /** That panel's name, as the row's activity column prints it, e.g. `Analyze`. */
    readonly activityLabel: string;
    /** When the step was taken, in epoch milliseconds. */
    readonly at: number;
    /**
     * The title the step's own name carries, naming where a click on it lands, e.g.
     * `Ran Bridges (betweenness). Opens Analyze at its card`. A step with no
     * destination is not a link, which is the case for an XR session's group header.
     */
    readonly destinationTitle?: string;
    /** A second line under the title, e.g. `by voice, in VR`. Spec 02 section 2.5. */
    readonly provenance?: string;
    /** The XR session this step was taken inside; those steps draw as one group. */
    readonly xrSessionId?: string;
    /** That session's name, e.g. `VR session 14:21 - 14:39`. Spec 02 section 2.5. */
    readonly xrSessionLabel?: string;
}

/* -------------------------------------------------------------------------- */
/* The store                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The store's state: the entries oldest first, and where the current position sits.
 */
export interface UndoStoreState {
    /** Every entry, oldest first. At most {@link UNDO_DEPTH} of them. */
    readonly entries: readonly HistoryEntry[];
    /**
     * The index of the entry at the current position. Every entry ABOVE it has been
     * undone and is redoable. -1 means everything has been undone, or the store is
     * empty.
     */
    readonly currentIndex: number;
}

/**
 * An empty store. The shell starts here and stays here until a producer pushes.
 */
export const EMPTY_UNDO_STORE: UndoStoreState = { entries: [], currentIndex: -1 };

/**
 * Whether there is a step to undo.
 * @param state - the store's state.
 * @returns true when the current position is on an entry.
 */
export function canUndo(state: UndoStoreState): boolean {
    return state.currentIndex >= 0;
}

/**
 * Whether there is a step to redo.
 * @param state - the store's state.
 * @returns true when an entry sits above the current position.
 */
export function canRedo(state: UndoStoreState): boolean {
    return state.currentIndex < state.entries.length - 1;
}

/**
 * How many entries have been undone and are redoable -- the M of the History
 * pop-out's `N entries, M undone` state line.
 * @param state - the store's state.
 * @returns the count of entries above the current position.
 */
export function undoneCount(state: UndoStoreState): number {
    return state.entries.length - 1 - state.currentIndex;
}

/**
 * Records a step. A new action clears the redo stack (section 3.3), so everything
 * above the current position is dropped before the entry is appended, and the store
 * never grows past {@link UNDO_DEPTH}: the oldest entry falls off the end.
 * @param state - the store's state.
 * @param entry - the step to record.
 * @returns the new state.
 */
export function pushEntry(state: UndoStoreState, entry: HistoryEntry): UndoStoreState {
    const kept = state.entries.slice(0, state.currentIndex + 1);

    kept.push(entry);

    const overflow = Math.max(0, kept.length - UNDO_DEPTH);
    const entries = overflow === 0 ? kept : kept.slice(overflow);

    return { entries, currentIndex: entries.length - 1 };
}

/**
 * Walks the current position back one step. Undone entries stay in the store: they
 * are what Redo and the struck-through rows of the History pop-out are made of.
 * @param state - the store's state.
 * @returns the new state, or the same state when there is nothing to undo.
 */
export function undo(state: UndoStoreState): UndoStoreState {
    if (!canUndo(state)) {
        return state;
    }

    return { entries: state.entries, currentIndex: state.currentIndex - 1 };
}

/**
 * Walks the current position forward one step.
 * @param state - the store's state.
 * @returns the new state, or the same state when there is nothing to redo.
 */
export function redo(state: UndoStoreState): UndoStoreState {
    if (!canRedo(state)) {
        return state;
    }

    return { entries: state.entries, currentIndex: state.currentIndex + 1 };
}

/**
 * Restores the point a History row names. Clicking a row is the only way to move
 * more than one step at a time, and a History row never re-runs anything
 * (spec 02 section 2.5).
 * @param state - the store's state.
 * @param entryId - the id of the entry to make the current position.
 * @returns the new state, or the same state when the id is not in the store.
 */
export function restoreTo(state: UndoStoreState, entryId: string): UndoStoreState {
    const index = state.entries.findIndex((entry) => entry.id === entryId);

    if (index === -1) {
        return state;
    }

    return { entries: state.entries, currentIndex: index };
}

/**
 * The entries the Data panel's tier 2 `Cleaning steps` view shows: this same store,
 * filtered to the data mutations (section 3.3).
 * @param state - the store's state.
 * @returns the data-mutation entries, oldest first.
 */
export function cleaningSteps(state: UndoStoreState): readonly HistoryEntry[] {
    return state.entries.filter((entry) => isDataMutationCategory(entry.category));
}

/* -------------------------------------------------------------------------- */
/* The History pop-out's rows (spec 02 section 2.5)                            */
/* -------------------------------------------------------------------------- */

/**
 * One entry, as the History pop-out draws it.
 */
export interface HistoryEntryRow {
    /** Discriminator. */
    readonly kind: "entry";
    /** The step. */
    readonly entry: HistoryEntry;
    /** Whether the step has been undone, which the row marks by striking it through. */
    readonly undone: boolean;
    /** Whether the step is the current position. */
    readonly current: boolean;
}

/**
 * An XR session, which the pop-out draws as ONE collapsible group rather than as
 * loose steps. Exiting XR is not a step and has no row. Spec 02 section 2.5.
 *
 * One arm of {@link HistoryRow}, so a caller drawing the pop-out can tell the two rows apart.
 * @public
 */
export interface HistoryXrSessionRow {
    /** Discriminator. */
    readonly kind: "xrSession";
    /** The session's id. */
    readonly sessionId: string;
    /** The session's name, e.g. `VR session 14:21 - 14:39`. */
    readonly label: string;
    /** The session's steps, newest first. */
    readonly children: readonly HistoryEntryRow[];
    /** Whether every step in the session has been undone. */
    readonly undone: boolean;
    /** The newest step's time, which the group header prints. */
    readonly at: number;
}

/**
 * One row of the History pop-out.
 */
export type HistoryRow = HistoryEntryRow | HistoryXrSessionRow;

/**
 * The store as the History pop-out draws it: newest first, with each XR session
 * collapsed into one group, and every entry above the current position marked undone.
 * Spec 02 section 2.5.
 * @param state - the store's state.
 * @returns the rows, newest first.
 */
export function historyRows(state: UndoStoreState): readonly HistoryRow[] {
    const rows: HistoryRow[] = [];
    const sessions = new Map<string, HistoryEntryRow[]>();

    for (let index = state.entries.length - 1; index >= 0; index -= 1) {
        const entry = state.entries[index];
        const row: HistoryEntryRow = {
            kind: "entry",
            entry,
            undone: index > state.currentIndex,
            current: index === state.currentIndex,
        };
        const { xrSessionId } = entry;

        if (xrSessionId === undefined) {
            rows.push(row);
            continue;
        }

        const existing = sessions.get(xrSessionId);

        if (existing === undefined) {
            const children: HistoryEntryRow[] = [row];

            sessions.set(xrSessionId, children);
            rows.push({
                kind: "xrSession",
                sessionId: xrSessionId,
                label: entry.xrSessionLabel ?? xrSessionId,
                children,
                undone: row.undone,
                at: entry.at,
            });
            continue;
        }

        existing.push(row);
    }

    return rows.map((row) => {
        if (row.kind !== "xrSession") {
            return row;
        }

        return { ...row, undone: row.children.every((child) => child.undone) };
    });
}

/* -------------------------------------------------------------------------- */
/* The hook                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The one history store, with its actions bound.
 *
 * {@link useUndoStore}'s return.
 * @public
 */
export interface UndoStore extends UndoStoreState {
    /** Whether there is a step to undo. */
    readonly canUndo: boolean;
    /** Whether there is a step to redo. */
    readonly canRedo: boolean;
    /** How many entries have been undone and are redoable. */
    readonly undoneCount: number;
    /** Records a step, clearing the redo stack. */
    readonly push: (entry: HistoryEntry) => void;
    /** Walks the current position back one step. */
    readonly undo: () => void;
    /** Walks the current position forward one step. */
    readonly redo: () => void;
    /** Restores the point a History row names. */
    readonly restoreTo: (entryId: string) => void;
}

/**
 * Holds the one history store in React state.
 *
 * Mount it ONCE, at the shell root: section 3 gives the whole application a single
 * store, and two of these would be two histories. The top bar reads it; producers
 * elsewhere push to it.
 * @param initial - the state to start from; tests pass a filled store.
 * @returns the store's state and its actions.
 */
export function useUndoStore(initial: UndoStoreState = EMPTY_UNDO_STORE): UndoStore {
    const [state, setState] = useState<UndoStoreState>(initial);

    const push = useCallback((entry: HistoryEntry) => {
        setState((current) => pushEntry(current, entry));
    }, []);

    const undoStep = useCallback(() => {
        setState((current) => undo(current));
    }, []);

    const redoStep = useCallback(() => {
        setState((current) => redo(current));
    }, []);

    const restore = useCallback((entryId: string) => {
        setState((current) => restoreTo(current, entryId));
    }, []);

    return useMemo<UndoStore>(
        () => ({
            entries: state.entries,
            currentIndex: state.currentIndex,
            canUndo: canUndo(state),
            canRedo: canRedo(state),
            undoneCount: undoneCount(state),
            push,
            undo: undoStep,
            redo: redoStep,
            restoreTo: restore,
        }),
        [push, redoStep, restore, state, undoStep],
    );
}
