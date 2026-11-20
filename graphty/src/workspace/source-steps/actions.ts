/**
 * What the staged sources' buttons and keys do (the source-steps experiment, design
 * design/data/multiple-data-sources-design.md, sections 5.1 and 5.5). Every change goes through
 * graphty-element's session: a draft for Add, `data.setMapping` and `data.removeSource` for the rest.
 */

import type { GraphSession, LoadedSource, SourceKey, SourceMappingPatch } from "@graphty/graphty-element/session";

import type { WorkspaceStore } from "../state/store";
import { STAGED_WORDS } from "./words";

/**
 * The staged sources, oldest first.
 * @param session - the element's session.
 * @returns them.
 */
export function stagedSources(session: GraphSession): readonly LoadedSource[] {
    return session.data.staged();
}

/**
 * Add (Shift+D): adds a staged source with no join, in one draft. Nothing happens while its Rows
 * are holds edges whose ends are not both picked. A source whose keys meet nodes
 * already in the graph opens the Add card on the key-overlap question instead, and commits from
 * there; any other commits at once, as one undo step.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param source - the staged source.
 * @returns settles once it is added or the card is open.
 */
export async function startAdd(workspace: WorkspaceStore, session: GraphSession, source: SourceKey): Promise<void> {
    // Edges picked without both ends are not the element's yet: adding now would add the old rows.
    if (session.data.currentDraft() !== null || workspace.get().stagedEnds?.source === source) {
        return;
    }
    const draft = session.data.draft({ askOverlap: true });
    try {
        draft.add(source);
        if (draft.preview().questions.length > 0) {
            workspace.set({ sourceCard: { kind: "add", source } });
            return;
        }
        await draft.commit();
    } catch {
        if (draft.open) {
            draft.dispose();
        }
        workspace.set({ notice: { message: STAGED_WORDS.notAdded } });
    }
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
    const card = workspace.get().sourceCard;
    // The Join card opened the dock on its Fields tab: closing it gives the dock back as it was.
    workspace.set(
        card?.kind === "join"
            ? { sourceCard: null, dockOpen: card.dockWas.open, dockTab: card.dockWas.tab }
            : { sourceCard: null },
    );
}

/**
 * Commits the open card's draft and closes it; a refused commit keeps it open and says so.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @returns settles once committed or refused.
 */
export async function commitCard(workspace: WorkspaceStore, session: GraphSession): Promise<void> {
    const draft = session.data.currentDraft();
    if (draft === null) {
        workspace.set({ sourceCard: null });
        return;
    }
    try {
        await draft.commit();
        workspace.set({ sourceCard: null });
    } catch {
        workspace.set({ notice: { message: STAGED_WORDS.notAdded } });
    }
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
    await session.data.setMapping(source, patch).catch(() => {
        workspace.set({ notice: { message: STAGED_WORDS.notChanged } });
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
    await session.data.removeSource(source).catch(() => {
        workspace.set({ notice: { message: STAGED_WORDS.notRemoved } });
    });
}
