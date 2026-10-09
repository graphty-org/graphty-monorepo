/**
 * Filter steps as the app reaches them: their words from the session, the step editor's door, the
 * one write, and the words Undo and Redo name a step change with. The steps themselves are graphty-element's.
 */

import type { CodedFact, FilterStep, GraphSession, HistoryCode } from "@graphty/graphty-element/session";

import type { WorkspaceStore } from "../state/store";
import { type Namer, ruleWords, stepChangeWords } from "./filterWords";

/** The inspected kind of the step editor; its id is a step id, or `NEW` for a new step. */
const STEP_KIND = "filter-step";
/** The editor's id for a new step; `NEW:<node|edge>:<path>` opens it with an attribute filled. */
export const NEW = "new";

/**
 * Reads attribute and node names from the session, as the step words show them.
 * @param session - the element's session.
 * @returns the namer.
 */
function namerOf(session: GraphSession): Namer {
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
 * The attribute a new step was opened from (its `Filter to...`), as `<node|edge>:<path>`, so
 * the attribute's row stays marked while the editor is open.
 * @param inspected - what the inspector shows.
 * @returns the attribute, or undefined.
 */
export function stepSource(inspected: { readonly kind: string; readonly id?: string } | null): string | undefined {
    const prefix = `${NEW}:`;
    return inspected?.kind === STEP_KIND && inspected.id?.startsWith(prefix) === true
        ? inspected.id.slice(prefix.length)
        : undefined;
}

/**
 * A new step id, unique among the steps.
 * @param steps - the steps.
 * @returns the id.
 */
export function newId(steps: readonly FilterStep[]): string {
    let n = steps.length + 1;
    while (steps.some((s) => s.id === `step-${String(n)}`)) {
        n += 1;
    }
    return `step-${String(n)}`;
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
 * A filter step change as Undo and Redo name it (`turning off "weight is at least 4"`), or null
 * for any other history step, or for a step the session does not hold now (a removed step before
 * its Redo): read it again after the undo or redo has run.
 * @param session - the element's session.
 * @param fact - the history step's fact.
 * @returns the words, or null.
 */
export function stepChange(session: GraphSession, fact: CodedFact<HistoryCode>): string | null {
    const { id } = fact.params;
    const step = session.visibility.steps.find((each) => each.id === id);
    return step === undefined ? null : stepChangeWords(fact.code, stepWords(session, step));
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
