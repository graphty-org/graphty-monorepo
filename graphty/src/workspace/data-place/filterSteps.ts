/**
 * Filter steps as the app reaches them: their words from the session, the step editor's door, the
 * one write, and the undo notice. The steps themselves are graphty-element's.
 */

import type { FilterStep, GraphSession, HistoryCode } from "@graphty/graphty-element/session";

import type { WorkspaceStore } from "../state/store";
import { historyNotice, type Namer, ruleWords } from "./filterWords";

/** The inspected kind of the step editor; its id is a step id, or `NEW` for a new step. */
export const STEP_KIND = "filter-step";
/** The editor's id for a new step; `NEW:<node|edge>:<path>` opens it with an attribute filled. */
export const NEW = "new";

/**
 * Reads attribute and node names from the session, as the step words show them.
 * @param session - the element's session.
 * @returns the namer.
 */
export function namerOf(session: GraphSession): Namer {
    const attributes = session.data.attributes();
    return {
        attribute: (path) => attributes.find((a) => a.path === path)?.plainName ?? path.replace(/^data\./, ""),
        // A node is named by its id until graphty-element publishes its name (#895).
        node: (id) => String(id),
    };
}

/**
 * One step's sentence.
 * @param session - the element's session.
 * @param step - the step.
 * @returns the sentence.
 */
export function stepWords(session: GraphSession, step: FilterStep): string {
    return ruleWords(step.rule, namerOf(session));
}

/**
 * Opens the step editor in the inspector on the Data place.
 * @param store - the chrome store.
 * @param id - a step id, `NEW`, or `NEW:<kind>:<path>` for a new step on that attribute.
 */
export function openStepEditor(store: WorkspaceStore, id: string): void {
    store.set({ page: "panels", place: "data", inspected: { kind: STEP_KIND, id } });
}

/**
 * Replaces the steps: one undoable step of the element's. A refusal is one notice.
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param steps - the new list.
 * @returns true when the element took it.
 */
export async function writeSteps(
    session: GraphSession,
    store: WorkspaceStore,
    steps: readonly FilterStep[],
): Promise<boolean> {
    try {
        await session.visibility.setSteps(steps);
        return true;
    } catch {
        store.set({ notice: { message: "The filter could not be changed.", error: true } });
        return false;
    }
}

/**
 * The notice an Undo or Redo of a step change shows, naming the step, or null for any other
 * history step. Read before the undo or redo runs, since the step may be gone after it.
 * @param session - the element's session.
 * @param undo - true for Undo, false for Redo.
 * @returns a function to call once it has run, giving the notice words, or null.
 */
export function stepHistoryNotice(session: GraphSession, undo: boolean): (() => string | null) | null {
    const { history } = session;
    const next = history.nextUndo;
    let step = history.steps.at(history.position);
    if (undo) {
        step = next?.kind === "undo" ? next.step : undefined;
    }
    const code: HistoryCode | undefined = step?.fact.code;
    const id = step?.fact.params.id;
    if (code === undefined || typeof id !== "string" || !code.startsWith("visibility.step")) {
        return null;
    }
    const before = session.visibility.steps.find((s) => s.id === id);
    return () => {
        const named = before ?? session.visibility.steps.find((s) => s.id === id);
        return named === undefined ? null : historyNotice(code, stepWords(session, named), undo);
    };
}

/**
 * The step editor's header name: the step's sentence, or "New filter step".
 * @param session - the element's session.
 * @param id - the editor's id.
 * @returns the name.
 */
export function stepEditorName(session: GraphSession, id: string): string {
    const step = session.visibility.steps.find((s) => s.id === id);
    return step === undefined ? "New filter step" : stepWords(session, step);
}
