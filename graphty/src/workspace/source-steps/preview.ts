/**
 * The source-steps experiment's draft helpers (design design/data/multiple-data-sources-design.md):
 * the question a data write meets while a draft is open.
 */

import { isGraphtyError } from "@graphty/graphty-element/session";

import type { WorkspaceStore } from "../state/store";

/**
 * A data write meeting the open draft: asks Commit / Discard / Cancel, and makes it again after
 * Commit or Discard.
 * @param workspace - the workspace store.
 * @param error - what the write threw.
 * @param retry - makes the write again.
 * @returns true when it was the draft that refused it.
 */
export function askIfDraftOpen(workspace: WorkspaceStore, error: unknown, retry: () => Promise<unknown>): boolean {
    if (!isGraphtyError(error) || error.code !== "E_DRAFT_OPEN") {
        return false;
    }
    workspace.set({ draftOpen: { retry } });
    return true;
}
