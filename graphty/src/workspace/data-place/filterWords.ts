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
 * A number as a step reads it: as written, without trailing zeros.
 * @param value - the number.
 * @returns the words.
 */
function num(value: number): string {
    return String(value);
}

/**
 * A rule as one sentence: "weight is at least 4", "in the largest component", "neighbors of Ava".
 * @param rule - the step's rule.
 * @param names - reads attribute and node names.
 * @returns the sentence.
 */
export function ruleWords(rule: RuleTree, names: Namer): string {
    switch (rule.kind) {
        case "range": {
            const name = names.attribute(rule.attribute);
            if (rule.min !== undefined && rule.max !== undefined) {
                return `${name} is between ${num(rule.min)} and ${num(rule.max)}`;
            }
            if (rule.min !== undefined) {
                return `${name} is at least ${num(rule.min)}`;
            }
            return rule.max === undefined ? `${name} has a value` : `${name} is at most ${num(rule.max)}`;
        }
        case "categories":
            return `${names.attribute(rule.attribute)} is ${rule.values.join(" or ")}`;
        case "member":
            return rule.of === "largest-component" ? "in the largest component" : "in a set";
        case "neighborhood": {
            const of =
                rule.seeds.length === 1
                    ? `neighbors of ${names.node(rule.seeds[0])}`
                    : `neighbors of ${String(rule.seeds.length)} nodes`;
            return rule.depth > 1 ? `${of} within ${String(rule.depth)} hops` : of;
        }
        default:
            return "a rule";
    }
}

/** The editor's one line on an edge-attribute step. */
export const ENDS_LINE = "Keeps edges that pass and the nodes at their ends.";

/**
 * A step's outcome at the end of its row: "22 to 9 nodes", or "off" for a step that is off.
 * @param on - whether the step is on.
 * @param before - the nodes left before it, or undefined until counted.
 * @param after - the nodes left after it, or undefined until counted.
 * @returns the words, or "" while uncounted.
 */
export function outcomeWords(on: boolean, before: number | undefined, after: number | undefined): string {
    if (!on) {
        return "off";
    }
    return before === undefined || after === undefined ? "" : `${num(before)} to ${num(after)} nodes`;
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
    return `${num(showing.visibleNodes)} of ${num(showing.totalNodes)} nodes`;
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
        ? `Filter on: ${chipWords(showing)}, ${num(showing.visibleEdges)} edges`
        : "Filter off";
}

/** What each step history code did, as the undo notice says it. */
const DID: Partial<Record<HistoryCode, string>> = {
    "visibility.step-add": "adding",
    "visibility.step-edit": "editing",
    "visibility.step-on": "turning on",
    "visibility.step-off": "turning off",
    "visibility.step-remove": "deleting",
};

/**
 * The notice after Undo or Redo of a step change: `Undid turning off "weight is at least 4".`
 * @param code - the history step's code.
 * @param words - the step's sentence.
 * @param undo - true for Undo, false for Redo.
 * @returns the words, or null for a code that is not one step's.
 */
export function historyNotice(code: HistoryCode, words: string, undo: boolean): string | null {
    const did = DID[code];
    return did === undefined ? null : `${undo ? "Undid" : "Redid"} ${did} "${words}".`;
}
