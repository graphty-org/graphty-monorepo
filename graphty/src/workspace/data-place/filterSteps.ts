/**
 * Filter steps as the Filters section writes them. The steps are graphty-element's
 * (`visibility.steps` / `setSteps`): each holds one condition card's rule. A card in Hide is a step
 * that is on (the elements it does not hold are hidden); a card in Select is a step that is off,
 * which keeps its rule, and selects what it holds instead of hiding anything.
 */

import type { FilterStep, GraphSession, RuleTree } from "@graphty/graphty-element/session";

import type { WorkspaceStore } from "../state/store";

/** What a card does: select what it holds, or hide the rest. */
export type Mode = "select" | "hide";

/**
 * A step's mode.
 * @param step - the step.
 * @returns Hide for a step that is on, Select for one that is off.
 */
export const modeOf = (step: FilterStep): Mode => (step.on ? "hide" : "select");

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
 * Replaces the steps, and selects what a card in Select holds, as one undoable step of the
 * element's (one transaction). A refusal is one notice.
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param steps - the new list.
 * @param select - a rule to select once the steps are written, if any.
 * @returns true when the element took it.
 */
export async function writeSteps(
    session: GraphSession,
    store: WorkspaceStore,
    steps: readonly FilterStep[],
    select?: RuleTree,
): Promise<boolean> {
    try {
        await session.transaction("Filter", async (tx) => {
            await tx.visibility.setSteps(steps);
            if (select !== undefined) {
                await selectRule(tx, select);
            }
        });
        return true;
    } catch {
        store.set({ notice: { message: "Filter not changed" } });
        return false;
    }
}

/**
 * Selects what a rule holds, replacing the selection: what a card in Select does.
 * @param session - the element's session.
 * @param rule - the rule.
 */
export async function selectRule(session: Pick<GraphSession, "selection">, rule: RuleTree): Promise<void> {
    await session.selection.apply({ scope: { define: { kind: "rule", where: rule, reading: "clipped" } } });
}
