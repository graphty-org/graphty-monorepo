/**
 * Filter steps as the app reaches them: their words from the session, the step editor's door, the
 * one write, and the words Undo and Redo name a step change with. The steps themselves are graphty-element's.
 */

import type { CodedFact, FilterStep, GraphSession, HistoryCode, RuleTree } from "@graphty/graphty-element/session";

import { valueWord } from "../inspector/words";
import type { WorkspaceStore } from "../state/store";
import { type Left, type Namer, ruleWords, stepChangeWords } from "./filterWords";
import { sourceName } from "./words";

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
        attribute: (path) =>
            path === "id"
                ? "Node id"
                : (attributes.find((a) => a.path === path)?.plainName ?? path.replace(/^data\./, "")),
        // A node is named by its id until graphty-element publishes its name (#895).
        node: String,
        value: (path, value) => valueWord(value, attributes.find((a) => a.path === path)?.type),
        source: (key) => {
            const load = session.data.sources().find((each) => each.key === key);
            return load === undefined ? "a removed source" : sourceName(load);
        },
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

/** The Filters row, and the editor id, of the time window. */
export const TIME_ROW = "time-window";

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
 * What is left before and after one step of a list the session does not hold yet, as the
 * element's plan counts them, so an editor can say what its step would keep before it is written.
 * @param session - the element's session.
 * @param steps - the list, with the step on.
 * @param id - the step's id.
 * @returns the counts, or null when the element counted nothing for it.
 */
export async function countStep(
    session: GraphSession,
    steps: readonly FilterStep[],
    id: string,
): Promise<{ readonly before: Left; readonly after: Left } | null> {
    const plan = await session.plan({ op: "visibility.steps", steps });
    if (plan.effect.kind !== "steps") {
        return null;
    }
    // One entry per step that is on, in order: the one before it says what reaches it.
    const counted = plan.effect.steps;
    const at = counted.findIndex((s) => s.id === id);
    return at === -1 ? null : { before: at === 0 ? plan.effect.start : counted[at - 1], after: counted[at] };
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
 * A filter step change as Undo and Redo name it (`turning off the filter step "weight is at least 4"`), or null
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
    if (id === TIME_ROW) {
        return "Time window";
    }
    const step = session.visibility.steps.find((s) => s.id === id);
    return step === undefined ? "New filter step" : stepWords(session, step);
}

/**
 * Selects what a rule holds, replacing the selection: a source row's Select nodes.
 * @param session - the element's session.
 * @param rule - the rule.
 */
export async function selectRule(session: Pick<GraphSession, "selection">, rule: RuleTree): Promise<void> {
    await session.selection.apply({ scope: { define: { kind: "rule", where: rule, reading: "clipped" } } });
}

/**
 * Whether the graph has a column to put on a timeline: one designated, or one whose values read
 * as time.
 * @param session - the element's session.
 * @returns true when the editor offers a time window.
 */
export function offersTime(session: GraphSession): boolean {
    return session.time.field !== null || session.time.candidates().length > 0;
}
