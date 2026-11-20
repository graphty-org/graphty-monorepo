/**
 * The Join card's Preview (the source-steps experiment, design
 * design/data/multiple-data-sources-design.md, sections 5.3 and 5.4): the card's act made in the
 * element's draft, the choices beside its buckets written to the draft's step, Undo inside the
 * draft, Before / After, and the question a data write meets while the draft is open. Every count
 * comes from the draft's `preview()`.
 */

import {
    type GraphSession,
    isGraphtyError,
    type SourceClashRule,
    type SourceDraft,
    type SourceDraftPreview,
    type SourceDraftPreviewStep,
    type SourceStepPatch,
} from "@graphty/graphty-element/session";

import type { JoinCardState, JoinChoices, JoinRepeats, WorkspaceStore } from "../state/store";
import { joinCardOf, joinPair, sourceColumns } from "./join";
import { refusedWords } from "./words";

/**
 * The open draft, or null.
 * @param session - the element's session.
 * @returns the draft.
 */
export function openDraft(session: GraphSession): SourceDraft | null {
    const draft = session.data.currentDraft();
    return draft?.open === true ? draft : null;
}

/**
 * Whether the card's picks make an act Preview can make: both fields and an act.
 * @param card - the card's picks.
 * @returns true when Preview can run.
 */
export function canPreview(card: JoinCardState): boolean {
    return card.preview === null && card.act !== null && joinPair(card) !== null;
}

/**
 * Preview (Shift+P): opens a draft, makes the card's act in it with its choices, and draws it on
 * the graph (After first). A refusal discards the draft and says so.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @returns settles once the draft is drawn.
 */
export async function startPreview(workspace: WorkspaceStore, session: GraphSession): Promise<void> {
    const card = joinCardOf(workspace.get().sourceCard);
    const pair = card === null ? null : joinPair(card);
    if (card === null || pair === null || card.act === null || card.preview !== null) {
        return;
    }
    if (session.data.currentDraft() !== null) {
        return;
    }
    const draft = session.data.draft();
    const matching = { ignoreCase: card.ignoreCase, ignoreSpaces: card.ignoreSpaces };
    const op = card.act === "edge" ? "join.edges" : "join.merge";
    let step: number | undefined;
    try {
        if (card.act === "edge") {
            draft.connect({
                ...pair,
                ...matching,
                direction: card.reversed ? "from-into" : "into-from",
                ...(card.edgeType === "" ? {} : { edgeType: card.edgeType }),
            });
        } else {
            draft.merge({ ...pair, ...matching, unmatchedFrom: card.unmatchedFrom });
        }
        // The draft holds only this act, so its last step of the op is the one it made (an edge from a
        // column of source 1 reads source 1's rows, not source 2's).
        step = draft.steps().findLast((row) => row.op === op)?.index;
        // Repeats other than First (the element's own default) are the step's to settle.
        if (step !== undefined && card.act === "merge" && card.repeated !== "first") {
            draft.editStep(step, repeatsPatch(session, card, card.repeated));
        }
    } catch (error) {
        draft.dispose();
        workspace.set({ notice: { message: refusedWords(error), error: true } });
        return;
    }
    if (step === undefined) {
        draft.dispose();
        return;
    }
    workspace.set({ sourceCard: { ...card, preview: { step, undo: [] } } });
    await draft.display(true);
}

/**
 * The step Preview made, as the draft's preview counts it.
 * @param preview - the draft's preview.
 * @param card - the card.
 * @returns the step, or null while picking.
 */
export function previewStep(preview: SourceDraftPreview, card: JoinCardState): SourceDraftPreviewStep | null {
    const step = card.preview?.step;
    return step === undefined ? null : (preview.steps.find((row) => row.index === step) ?? null);
}

/**
 * The card's choices now.
 * @param card - the card.
 * @returns them.
 */
function choicesOf(card: JoinCardState): JoinChoices {
    const { ignoreCase, ignoreSpaces, repeated, unmatchedFrom } = card;
    return { ignoreCase, ignoreSpaces, repeated, unmatchedFrom };
}

/**
 * Writes one change to the previewed step, remembering the choices as they were so Undo puts them
 * back. A refusal leaves the step as it was and says why.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param patch - the change, as `editStep` takes it.
 * @param choices - the card's choices the change sets.
 */
function editPreviewed(
    workspace: WorkspaceStore,
    session: GraphSession,
    patch: SourceStepPatch,
    choices: Partial<JoinChoices> = {},
): void {
    const card = joinCardOf(workspace.get().sourceCard);
    const draft = openDraft(session);
    if (card?.preview === undefined || card.preview === null || draft === null) {
        return;
    }
    try {
        draft.editStep(card.preview.step, patch);
    } catch (error) {
        workspace.set({ notice: { message: refusedWords(error), error: true } });
        return;
    }
    workspace.set({
        sourceCard: {
            ...card,
            ...choices,
            preview: { ...card.preview, undo: [...card.preview.undo, choicesOf(card)] },
        },
    });
}

/**
 * Sets one of the card's choices: before Preview it is only the card's, after it the draft's step
 * takes it too.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param choices - the change.
 */
export function setChoice(workspace: WorkspaceStore, session: GraphSession, choices: Partial<JoinChoices>): void {
    const card = joinCardOf(workspace.get().sourceCard);
    if (card === null) {
        return;
    }
    if (card.preview === null) {
        workspace.set({ sourceCard: { ...card, ...choices } });
        return;
    }
    const { repeated, ...rest } = choices;
    editPreviewed(
        workspace,
        session,
        { ...rest, ...(repeated === undefined ? {} : repeatsPatch(session, card, repeated)) },
        choices,
    );
}

/**
 * Repeats as the merge step takes it: the first or the last row as its `repeated`, or every column
 * source 2 brings besides its key reduced to its rows' count or list, as its `aggregate`.
 * @param session - the element's session.
 * @param card - the card.
 * @param repeats - the reader's choice.
 * @returns the step's change.
 */
function repeatsPatch(session: GraphSession, card: JoinCardState, repeats: JoinRepeats): SourceStepPatch {
    if (repeats === "first" || repeats === "last") {
        return { repeated: repeats, aggregate: null };
    }
    const { field2 } = card;
    const columns =
        field2 === null ? [] : sourceColumns(session, field2.source).filter((column) => column !== field2.field);
    return { repeated: null, aggregate: Object.fromEntries(columns.map((column) => [column, repeats])) };
}

/**
 * Sets a Values differ rule for one column of the previewed step.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param column - the column.
 * @param rule - the rule.
 */
export function setRule(workspace: WorkspaceStore, session: GraphSession, column: string, rule: SourceClashRule): void {
    editPreviewed(workspace, session, { clash: { [column]: rule } });
}

/**
 * Undo (Mod+Z) while the card previews: takes back the draft's newest change, or the act itself,
 * which returns the card to picking.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 */
export function undoInCard(workspace: WorkspaceStore, session: GraphSession): void {
    const card = joinCardOf(workspace.get().sourceCard);
    const draft = openDraft(session);
    if (card?.preview === undefined || card.preview === null || draft === null) {
        return;
    }
    const was = card.preview.undo.at(-1);
    if (was === undefined) {
        // The act was the draft's only act: taking it back leaves nothing to draw or commit.
        draft.dispose();
        workspace.set({ sourceCard: { ...card, preview: null } });
        return;
    }
    draft.undo();
    workspace.set({
        sourceCard: { ...card, ...was, preview: { ...card.preview, undo: card.preview.undo.slice(0, -1) } },
    });
}

/**
 * Before / After (B): which side of the commit the graph draws.
 * @param session - the element's session.
 * @param side - the side, or absent to flip it.
 * @returns settles once it is drawn.
 */
export async function showSide(session: GraphSession, side?: "before" | "after"): Promise<void> {
    const draft = openDraft(session);
    if (draft?.displayed === true) {
        await draft.show(side ?? (draft.side === "after" ? "before" : "after"));
    }
}

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
