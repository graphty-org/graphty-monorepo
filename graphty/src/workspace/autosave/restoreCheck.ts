/**
 * After a restore, every kept field that names something graphty-element holds by id must still
 * name something. One that does not is a loss the reader sees (the picked layer shows as
 * Everything, the open selection workspace closes), so it is logged, never passed over: before
 * issue #9973 each such field fell back to its default with no trace, and the remote logs said
 * "reopened" while the screen was wrong.
 */

import { GraphtyLogger } from "@graphty/graphty-element/logging";
import type { GraphSession } from "@graphty/graphty-element/session";

import { findTreeRow } from "../graph-place/rows";
import type { ElementIdKey, WorkspaceState } from "../state/store";

const logger = GraphtyLogger.getLogger(["graphty", "restore"]);

/** What the test setup reads (src/test/setup.ts): a test fails when a kept reference was lost. */
interface MissSink {
    __GRAPHTY_RESTORE_MISSES__?: string[];
}

/**
 * Reports a kept reference that names nothing after a restore: to the logs, and to the test
 * setup, which fails the test unless it expects the loss.
 * @param field - the store field.
 * @param id - the id it held.
 */
export function restoreMiss(field: string, id: string): void {
    logger.warn(`[graphty.restore] kept ${field} gone`, { field, id });
    (globalThis as MissSink).__GRAPHTY_RESTORE_MISSES__?.push(`${field}: ${id}`);
}

/**
 * Whether a style tree row is still there.
 * @param session - the session.
 * @param id - the row's id.
 * @returns true when the tree holds it.
 */
const hasRow = (session: GraphSession, id: string): boolean => findTreeRow(session.styles.tree(), id) !== undefined;

/**
 * The id each element-id field holds that names nothing in the session, or null. One entry per
 * field labeled "kept: element-id" in ON_RELOAD: a new such field does not compile until it is here.
 */
const LOST: {
    readonly [K in ElementIdKey]: (value: WorkspaceState[K], session: GraphSession) => string | null;
} = {
    styleRow: (id, session) => (id !== null && !hasRow(session, id) ? id : null),
    renamingRow: (id, session) => (id !== null && !id.startsWith("filter:") && !hasRow(session, id) ? id : null),
    inspected: (inspected, session) =>
        (inspected?.kind === "layer-row" || inspected?.kind === "folder-row") &&
        inspected.id !== undefined &&
        !hasRow(session, inspected.id)
            ? inspected.id
            : null,
    selectionWorkspace: (open, session) => {
        if (open === null) {
            return null;
        }
        // The key is `<kind>:<id>:<side>` (SelectionEditor's workspaceKey).
        const id = open.owner.slice(open.owner.indexOf(":") + 1, open.owner.lastIndexOf(":"));
        const { visibility } = session;
        const back = open.owner.startsWith("filter:")
            ? visibility.conditions.some((each) => each.id === id) || visibility.draftOf(id) !== null
            : session.styles.get(id) !== undefined;
        return back ? null : open.owner;
    },
};

/**
 * Checks each element-id field after a restore: reports the ones that name nothing and clears
 * them, so no panel goes on holding an id the session does not have (a selection workspace left
 * open with no editor would keep the panels inert).
 * @param state - the store's state after the restore put the reader's place back.
 * @param session - the restored session.
 * @returns the fields to clear.
 */
export function lostReferences(state: WorkspaceState, session: GraphSession): Partial<WorkspaceState> {
    const cleared: Partial<Record<ElementIdKey, null>> = {};
    for (const field of Object.keys(LOST) as ElementIdKey[]) {
        const check = LOST[field] as (value: unknown, session: GraphSession) => string | null;
        const id = check(state[field], session);
        if (id !== null) {
            restoreMiss(field, id);
            cleared[field] = null;
        }
    }
    return cleared;
}
