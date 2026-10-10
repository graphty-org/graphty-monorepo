/**
 * The Filters section's words (tier2-design.md section 1). Every count is graphty-element's
 * (`visibility.summary`, the `steps` effect of `plan`); every word is the app's.
 */

import type { FilterStep, HistoryCode, NodeId, RuleTree } from "@graphty/graphty-element/session";

/** What the words read from the session: an attribute's name and a node's name. */
export interface Namer {
    readonly attribute: (path: string) => string;
    readonly node: (id: NodeId) => string;
}

/**
 * A rule as one sentence: "weight is at least 4", "in the largest component", "within 2 hops of Ava".
 * @param rule - the step's rule.
 * @param names - reads attribute and node names.
 * @returns the sentence.
 */
export function ruleWords(rule: RuleTree, names: Namer): string {
    switch (rule.kind) {
        case "range": {
            const name = names.attribute(rule.attribute);
            if (rule.min !== undefined && rule.max !== undefined) {
                return `${name} is between ${String(rule.min)} and ${String(rule.max)}`;
            }
            if (rule.min !== undefined) {
                return `${name} is at least ${String(rule.min)}`;
            }
            return rule.max === undefined ? `${name} has a value` : `${name} is at most ${String(rule.max)}`;
        }
        case "categories":
            return `${names.attribute(rule.attribute)} is ${rule.values.join(" or ")}`;
        case "member":
            return rule.of === "largest-component" ? "in the largest component" : "in a set";
        case "neighborhood": {
            // The hop count leads: a cut row still tells two steps on the same node apart.
            const who = rule.seeds.length === 1 ? names.node(rule.seeds[0]) : `${String(rule.seeds.length)} nodes`;
            return `within ${String(rule.depth)} ${rule.depth === 1 ? "hop" : "hops"} of ${who}`;
        }
        default:
            return "a rule";
    }
}

/** The editor's one line on an edge-attribute step. */
export const ENDS_LINE = "Keeps edges that pass and the nodes at their ends.";

/**
 * A step's outcome, shown after its sentence: "22 to 9 nodes", or "off" for a step that is off.
 * @param on - whether the step is on.
 * @param before - the nodes left before it, or undefined until counted.
 * @param after - the nodes left after it, or undefined until counted.
 * @returns the words, or "" while uncounted.
 */
export function outcomeWords(on: boolean, before: number | undefined, after: number | undefined): string {
    if (!on) {
        return "off";
    }
    return before === undefined || after === undefined ? "" : `${String(before)} to ${String(after)} nodes`;
}

/**
 * The status line after the step editor saves a step, which turns it on:
 * 'Saved "weight is at least 4". The step is on.'
 * @param words - the step's sentence.
 * @returns the words.
 */
export function savedWords(words: string): string {
    return `Saved "${words}". The step is on.`;
}

/**
 * The header chip's tooltip: what is showing, and that a click opens Filters to turn it off.
 * The Filters list is not on the Graph page, so the words say how to reach it.
 * @param on - the sentences of the steps that are on.
 * @returns the words.
 */
export function chipTip(on: readonly string[]): string {
    const named = on.map((words) => `"${words}"`).join(", ");
    return `Showing only: ${named}. Click to open Filters, where you can turn ${on.length === 1 ? "it" : "them"} off.`;
}

/**
 * The step checkbox's tooltip, by what a click does.
 * @param on - whether the step is on.
 * @returns the words.
 */
export function applyTip(on: boolean): string {
    return on ? "Turn this step off" : "Turn this step on";
}

/**
 * The step editor's save button: saving an off step turns it on, so the button says so.
 * @param on - whether the step being edited is on.
 * @returns the label.
 */
export function saveLabel(on: boolean): string {
    return on ? "Save step" : "Save and turn on";
}

/**
 * The step checkbox's accessible name.
 * @param words - the step's sentence.
 * @returns the name.
 */
export function applyName(words: string): string {
    return `Apply step: ${words}`;
}

/** How much of the graph is showing, as the element's summary has it. */
interface Showing {
    readonly visibleNodes: number;
    readonly totalNodes: number;
    readonly visibleEdges: number;
}

/**
 * The header chip: "9 of 22 nodes".
 * @param showing - the element's visibility summary.
 * @returns the words.
 */
export function chipWords(showing: Showing): string {
    return `${String(showing.visibleNodes)} of ${String(showing.totalNodes)} nodes`;
}

/**
 * The status line after a steps change: "Filter on: 9 of 22 nodes, 14 edges", or "Filter off"
 * once no step is on.
 * @param steps - the steps.
 * @param showing - the element's visibility summary.
 * @returns the words.
 */
export function statusWords(steps: readonly FilterStep[], showing: Showing): string {
    return steps.some((step) => step.on)
        ? `Filter on: ${chipWords(showing)}, ${String(showing.visibleEdges)} edges`
        : "Filter off";
}

/** What each step history code did, as Undo and Redo name it. */
const DID: Partial<Record<HistoryCode, string>> = {
    "visibility.step-add": "adding",
    "visibility.step-edit": "editing",
    "visibility.step-on": "turning on",
    "visibility.step-off": "turning off",
    "visibility.step-remove": "deleting",
};

/**
 * A step change as Undo and Redo name it: `turning off "weight is at least 4"`.
 * @param code - the history step's code.
 * @param words - the step's sentence.
 * @returns the words, or null for a code that is not one step's.
 */
export function stepChangeWords(code: HistoryCode, words: string): string | null {
    const did = DID[code];
    return did === undefined ? null : `${did} "${words}"`;
}
