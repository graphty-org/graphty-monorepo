/**
 * The committed steps and reader edits (the source-steps experiment, design
 * design/data/multiple-data-sources-design.md, sections 7.13 and 7.17): Edit reopens a join step on
 * the Join card, Delete and a committed source's Remove open the step card on a draft holding the
 * removal, and a reader edit's Delete takes it back. Every fact is the element's (`data.steps()`,
 * `data.edits()`, the draft's `preview()`).
 */

import {
    type GraphSession,
    isGraphtyError,
    type SourceKey,
    type SourceStepAct,
} from "@graphty/graphty-element/session";

import type { JoinRepeats, StepCardState, WorkspaceStore } from "../state/store";
import { panelsInView } from "../time/timeActions";
import { showJoinCard } from "./join";
import { askIfDraftOpen } from "./preview";
import { refusedWords, STEP_WORDS } from "./words";

/**
 * Whether a card or a draft is open: a second waits, and a draft another door opened asks first.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param retry - opens the card again once that draft is committed or discarded.
 * @returns true when the card cannot open now.
 */
function busy(workspace: WorkspaceStore, session: GraphSession, retry: () => Promise<unknown>): boolean {
    if (session.data.currentDraft() !== null) {
        workspace.set({ draftOpen: { retry } });
        return true;
    }
    return workspace.get().sourceCard !== null;
}

/**
 * The card's Repeats for a step's: the step's `repeated`, when it is one the card offers.
 * @param act - the step's act.
 * @returns the card's choice.
 */
function repeatsOf(act: SourceStepAct): JoinRepeats {
    const { repeated } = act;
    return repeated === "last" || repeated === "count" || repeated === "list" ? repeated : "first";
}

/**
 * Edit on a Steps row: reopens the Join card on a committed join step, as it was made, in a draft
 * that draws it. Its rule, Repeats, Only 2, Ignore switches and excluded keys change the step
 * (`draft.editStep`); a changed field or act removes it and makes the new act instead.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param index - the step's place.
 * @returns settles once the draft is drawn.
 */
export async function openEditStep(workspace: WorkspaceStore, session: GraphSession, index: number): Promise<void> {
    const act = session.data.steps()[index]?.act ?? null;
    if (act === null || busy(workspace, session, () => openEditStep(workspace, session, index))) {
        return;
    }
    const draft = session.data.draft();
    const { into } = act;
    showJoinCard(workspace, {
        kind: "join",
        field1:
            into.source === undefined || into.field === undefined
                ? { space: into.space }
                : { space: into.space, source: into.source, field: into.field },
        field2: { source: act.from.source, field: act.from.field },
        act: act.act === "merge" ? "merge" : "edge",
        edgeType: act.edgeType ?? "",
        reversed: act.direction === "from-into",
        ignoreCase: act.ignoreCase,
        ignoreSpaces: act.ignoreSpaces,
        repeated: repeatsOf(act),
        unmatchedFrom: act.unmatchedFrom ?? "keep",
        preview: { step: index, undo: [], reopened: true },
        editing: index,
        drill: null,
    });
    await draft.display(true);
}

/**
 * Delete on a Steps row, or Remove in a committed source's menu: opens the step card on a draft
 * holding the removal, drawn After, which shows what the commit would change.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param remove - the step or the source.
 * @param asBefore - removes a source no step reads, which the draft refuses, as with the
 *   experiment off.
 * @returns settles once the draft is drawn.
 */
export async function openRemove(
    workspace: WorkspaceStore,
    session: GraphSession,
    remove: StepCardState["remove"],
    asBefore?: () => Promise<void>,
): Promise<void> {
    if (busy(workspace, session, () => openRemove(workspace, session, remove, asBefore))) {
        return;
    }
    const draft = session.data.draft();
    try {
        if ("step" in remove) {
            draft.removeStep(remove.step);
        } else {
            draft.removeSource(remove.source);
        }
    } catch (error) {
        draft.dispose();
        if (asBefore !== undefined && isGraphtyError(error) && error.details.reason === "not-in-steps") {
            await asBefore();
            return;
        }
        workspace.set({ notice: { message: refusedWords(error), error: true } });
        return;
    }
    workspace.set({
        sourceCard: { kind: "step", remove },
        page: "panels",
        place: "data",
        dataTab: "loaded",
        ...panelsInView(),
    });
    await draft.display(true);
}

/**
 * Delete on a reader edit: takes it back, one undo step.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param id - the edit's id.
 * @returns settles once removed or refused.
 */
export async function removeEdit(workspace: WorkspaceStore, session: GraphSession, id: string): Promise<void> {
    await session.data.removeEdit(id).catch((error: unknown) => {
        if (!askIfDraftOpen(workspace, error, () => removeEdit(workspace, session, id))) {
            workspace.set({ notice: { message: STEP_WORDS.notRemoved, error: true } });
        }
    });
}

/**
 * The source a step card names: the source it removes, or the one the step reads.
 * @param session - the element's session.
 * @param card - the step card.
 * @returns its key, or undefined once the step is gone.
 */
export function stepCardSource(session: GraphSession, card: StepCardState): SourceKey | undefined {
    return "source" in card.remove ? card.remove.source : session.data.steps()[card.remove.step]?.source;
}

/**
 * Reader edits (R): opens or closes the list on the Data place's Sources tab.
 * @param workspace - the workspace store.
 */
export function toggleReaderEdits(workspace: WorkspaceStore): void {
    const open = !workspace.get().readerEditsOpen;
    workspace.set(
        open
            ? { readerEditsOpen: true, page: "panels", place: "data", dataTab: "loaded", ...panelsInView() }
            : { readerEditsOpen: false },
    );
}
