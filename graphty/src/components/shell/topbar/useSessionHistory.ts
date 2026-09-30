/**
 * The element's undo history, read into React.
 *
 * graphty-element owns the history. `session.history.version` moves on every
 * `history:changed`, and `steps` and `nextUndo` are the identical frozen objects between
 * changes, so this is the documented `useSyncExternalStore` subscription and nothing more.
 */

import type { GraphSession, HistoryStep, SessionHistory } from "@graphty/graphty-element/session";
import { useCallback, useSyncExternalStore } from "react";

/** What the top bar reads off the history on one render. */
interface SessionHistoryView {
    /** Every step, oldest first. */
    readonly steps: readonly HistoryStep[];
    /** How many steps are applied. */
    readonly position: number;
    /** What the next undo will do. */
    readonly nextUndo: SessionHistory["nextUndo"];
    /** Whether `session.undo()` would do something. */
    readonly canUndo: boolean;
    /** Whether `session.redo()` would do something. */
    readonly canRedo: boolean;
}

const NO_HISTORY: SessionHistoryView = { steps: [], position: 0, nextUndo: null, canUndo: false, canRedo: false };

/**
 * Subscribes to a session's history.
 * @param session - the element's session, or null before the element has come up.
 * @returns the history as it stands, re-read on every `history:changed`.
 */
export function useSessionHistory(session: GraphSession | null): SessionHistoryView {
    const subscribe = useCallback(
        (changed: () => void) => session?.on("history:changed", changed) ?? (() => undefined),
        [session],
    );
    // The re-render is the point: `steps` and `nextUndo` keep their identity until they move.
    useSyncExternalStore(subscribe, () => session?.history.version ?? -1);

    if (session === null) {
        return NO_HISTORY;
    }

    const { history } = session;

    return {
        steps: history.steps,
        position: history.position,
        nextUndo: history.nextUndo,
        canUndo: session.canUndo,
        canRedo: session.canRedo,
    };
}
