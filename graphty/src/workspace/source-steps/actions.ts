/**
 * What the staged sources' buttons and keys do (the source-steps experiment, design
 * design/data/multiple-data-sources-design.md, sections 5.1 and 5.5). Every change goes through
 * graphty-element's session: a draft for Add, `data.setMapping` and `data.removeSource` for the rest.
 */

import type {
    GraphSession,
    LoadedSource,
    SourceDraft,
    SourceKey,
    SourceMappingPatch,
} from "@graphty/graphty-element/session";

import { sourceName } from "../data-place/words";
import { showUndoNotice } from "../frame/undoNotice";
import type { WorkspaceState, WorkspaceStore } from "../state/store";
import { askIfDraftOpen } from "./preview";
import { stepCardSource } from "./steps";
import { committedWords, refusedWords, removedWords, STAGED_WORDS, WORKSPACE_WORDS } from "./words";

/**
 * The staged sources, oldest first.
 * @param session - the element's session.
 * @returns them.
 */
export function stagedSources(session: GraphSession): readonly LoadedSource[] {
    return session.data.staged();
}

/**
 * Add (Shift+D): adds a staged source with no join, in a draft drawn on the graph, and opens the
 * Add card on its preview (design 5.6); the card commits it as one undo step. A source whose keys
 * meet nodes already in the graph also asks the key-overlap question there. Nothing happens while
 * its Rows are holds edges whose ends are not both picked.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param source - the staged source.
 * @returns settles once the card is open and the draft drawn.
 */
export async function startAdd(workspace: WorkspaceStore, session: GraphSession, source: SourceKey): Promise<void> {
    // Edges picked without both ends are not the element's yet: adding now would add the old rows.
    if (workspace.get().stagedEnds?.source === source) {
        return;
    }
    // Another card's draft is open: the reader commits or discards it first.
    if (session.data.currentDraft() !== null) {
        workspace.set({ draftOpen: { retry: () => startAdd(workspace, session, source) } });
        return;
    }
    const draft = session.data.draft({ askOverlap: true });
    try {
        draft.add(source);
    } catch {
        draft.dispose();
        workspace.set({ notice: { message: STAGED_WORDS.notAdded } });
        return;
    }
    workspace.set({ sourceCard: { kind: "add", source } });
    await draft.display(true);
}

/**
 * Closes the open card, discarding its draft.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 */
export function cancelCard(workspace: WorkspaceStore, session: GraphSession): void {
    const draft = session.data.currentDraft();
    if (draft?.open === true) {
        draft.dispose();
    }
    // The Join card opened the dock on its Fields tab: closing it gives the dock back as it was.
    closeCard(workspace);
}

/**
 * The source a card adds, joins or removes: the Add card's, the Join card's Field 2, or the step
 * card's.
 * @param session - the element's session.
 * @param card - the open card.
 * @returns its key, or undefined.
 */
function cardSource(session: GraphSession, card: WorkspaceState["sourceCard"]): SourceKey | undefined {
    if (card?.kind === "step") {
        return stepCardSource(session, card);
    }
    return card?.kind === "join" ? card.field2?.source : card?.source;
}

/**
 * The notice after a card commits.
 * @param card - the card.
 * @param name - the source it names.
 * @returns its words.
 */
function noticeWords(card: NonNullable<WorkspaceState["sourceCard"]>, name: string): string {
    if (card.kind === "step") {
        return removedWords(card.remove, name);
    }
    if (card.kind === "join" && card.editing !== null) {
        return committedWords("edit", name);
    }
    return committedWords(card.kind, name);
}

/**
 * Commits the open card's draft and closes it, then offers Undo on a notice while the commit is
 * still the newest step; a refused commit keeps it open and says why.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @returns settles once committed or refused.
 */
export async function commitCard(workspace: WorkspaceStore, session: GraphSession): Promise<void> {
    const draft = session.data.currentDraft();
    const card = workspace.get().sourceCard;
    if (draft === null || card === null) {
        workspace.set({ sourceCard: null });
        return;
    }
    const key = cardSource(session, card);
    const source = session.data.sources({ staged: true }).find((each) => each.key === key);
    // Undo's target, not the history's length: after an undo, a commit drops the redo step and adds
    // its own, so the length stays the same while the next undo is the new step.
    const before = undoTarget(session);
    try {
        await draft.commit();
    } catch (error) {
        workspace.set({ notice: { message: refusedWords(error), error: true } });
        return;
    }
    closeCard(workspace);
    const step = undoTarget(session);
    if (step === undefined || step === before) {
        return;
    }
    // The notice goes once the commit is no longer the step Undo takes back.
    showUndoNotice(session, workspace, noticeWords(card, source === undefined ? "" : sourceName(source)), () => {
        return undoTarget(session) === step;
    });
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
 * Closes the open card, giving the dock back as the Join card found it.
 * @param workspace - the workspace store.
 */
function closeCard(workspace: WorkspaceStore): void {
    const card = workspace.get().sourceCard;
    workspace.set(
        card?.kind === "join"
            ? { sourceCard: null, dockOpen: card.dockWas.open, dockTab: card.dockWas.tab }
            : { sourceCard: null },
    );
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
 * @returns True once committed; false when the commit was refused, which leaves the draft open.
 */
export async function commitWorkspace(
    workspace: WorkspaceStore,
    session: GraphSession,
    draft: SourceDraft,
): Promise<boolean> {
    const before = undoTarget(session);
    try {
        await draft.commit();
    } catch (error) {
        workspace.set({ notice: { message: refusedWords(error), error: true } });
        return false;
    }
    const step = undoTarget(session);
    if (step !== undefined && step !== before) {
        showUndoNotice(session, workspace, WORKSPACE_WORDS.committed, () => undoTarget(session) === step);
    }
    return true;
}
