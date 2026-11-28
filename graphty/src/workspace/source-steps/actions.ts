/**
 * What the staged sources' buttons and keys do (the source-steps experiment, design
 * design/data/multiple-data-sources-design.md, sections 5.1 and 5.5). Every change goes through
 * graphty-element's session: `data.setMapping` and `data.removeSource` from the Data place, the
 * join workspace's draft for the rest.
 */

import type {
    GraphSession,
    LoadedSource,
    SourceDraft,
    SourceKey,
    SourceMappingPatch,
} from "@graphty/graphty-element/session";

import { showUndoNotice } from "../frame/undoNotice";
import type { WorkspaceStore } from "../state/store";
import { askIfDraftOpen } from "./preview";
import { committedWords, refusedWords, STAGED_WORDS } from "./words";

/**
 * The staged sources, oldest first.
 * @param session - the element's session.
 * @returns them.
 */
export function stagedSources(session: GraphSession): readonly LoadedSource[] {
    return session.data.staged();
}

/**
 * The step the next undo takes back.
 * @param session - the element's session.
 * @returns its id, or undefined when the next undo takes back no step.
 */
function undoTarget(session: GraphSession): string | undefined {
    const next = session.history.nextUndo;
    return next?.kind === "undo" ? next.step.id : undefined;
}

/**
 * Changes what a staged source's rows are for; a refusal leaves it as it was and says so.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param source - the staged source.
 * @param patch - the change.
 * @returns settles once changed or refused.
 */
export async function remap(
    workspace: WorkspaceStore,
    session: GraphSession,
    source: SourceKey,
    patch: SourceMappingPatch,
): Promise<void> {
    await session.data.setMapping(source, patch).catch((error: unknown) => {
        if (!askIfDraftOpen(workspace, error, () => remap(workspace, session, source, patch))) {
            workspace.set({ notice: { message: STAGED_WORDS.notChanged } });
        }
    });
}

/**
 * Add to graph in a staged section's menu: draws the waiting source as its own nodes, one undo step.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param source - the staged source.
 * @returns settles once added or refused.
 */
export async function addStaged(workspace: WorkspaceStore, session: GraphSession, source: SourceKey): Promise<void> {
    await session.data.add(source).catch((error: unknown) => {
        if (!askIfDraftOpen(workspace, error, () => addStaged(workspace, session, source))) {
            workspace.set({ notice: { message: STAGED_WORDS.notAdded } });
        }
    });
}

/**
 * Remove in a staged section's menu: drops the source, one undo step.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param source - the staged source.
 * @returns settles once removed or refused.
 */
export async function removeStaged(workspace: WorkspaceStore, session: GraphSession, source: SourceKey): Promise<void> {
    await session.data.removeSource(source).catch((error: unknown) => {
        if (!askIfDraftOpen(workspace, error, () => removeStaged(workspace, session, source))) {
            workspace.set({ notice: { message: STAGED_WORDS.notRemoved } });
        }
    });
}

/**
 * Done in the join workspace (issue #9796): commit the open draft, every card as one undo step,
 * then offer to undo it.
 * @param workspace - The workspace store.
 * @param session - The element's session.
 * @param draft - The workspace's draft.
 * @param onError - Shows a refusal where the reader is; default a notice.
 * @returns True once committed; false when the commit was refused, which leaves the draft open.
 */
export async function commitWorkspace(
    workspace: WorkspaceStore,
    session: GraphSession,
    draft: SourceDraft,
    onError: (error: unknown) => void = (error) => {
        workspace.set({ notice: { message: refusedWords(error), error: true } });
    },
): Promise<boolean> {
    const before = undoTarget(session);
    try {
        await draft.commit();
    } catch (error) {
        onError(error);
        return false;
    }
    const next = session.history.nextUndo;
    const step = next?.kind === "undo" ? next.step : undefined;
    if (step !== undefined && step.id !== before) {
        showUndoNotice(session, workspace, committedWords(step.fact), () => undoTarget(session) === step.id);
    }
    return true;
}
