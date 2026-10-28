/**
 * The Filters section's words (tier2-design.md section 1). Every count is graphty-element's
 * (`visibility.summary`, the `steps` effect of `plan`); every word is the app's.
 */

import type { FilterStep, HistoryCode, NodeId, RuleTree } from "@graphty/graphty-element/session";

/** What the words read from the session: an attribute's name and a node's name. */
export interface Namer {
    readonly attribute: (path: string) => string;
    readonly node: (id: NodeId) => string;
    /** One value of a path in words (a yes-or-no as Yes or No); absent writes it as it is. */
    readonly value?: (path: string, value: string) => string;
    /** A load's name, by its `data.sources()` key; absent writes the key. */
    readonly source?: (key: string) => string;
}

/**
 * A rule as one sentence: "weight is at least 4", "in the largest component", "within 2 hops of Ava".
 * @param rule - the step's rule.
 * @param names - reads attribute and node names.
 * @returns the sentence.
 */
export function ruleWords(rule: RuleTree, names: Namer): string {
    switch (rule.kind) {
        case "range":
            return rangeWords(rule, names);
        case "categories":
            return `${names.attribute(rule.attribute)} is ${rule.values
                .map((value) => names.value?.(rule.attribute, value) ?? value)
                .join(" or ")}`;
        case "text":
            return textWords(rule, names);
        case "threshold": {
            const name = names.attribute(rule.path);
            return rule.top === undefined
                ? `${name} is above ${String(rule.above ?? "")}`
                : `${name} is among the highest ${String(rule.top)}`;
        }
        case "not":
            // "Has no value" is the one negation a condition card makes.
            return rule.of.kind === "text" && rule.of.mode === "regex" && rule.of.text === ""
                ? `${names.attribute(rule.of.reads)} has no value`
                : `not: ${ruleWords(rule.of, names)}`;
        case "any":
            return rule.of.map((each) => ruleWords(each, names)).join(" or ");
        case "all":
            return rule.of.map((each) => ruleWords(each, names)).join(" and ");
        case "member":
            return rule.of === "largest-component" ? "in the largest component" : "in a set";
        case "source":
            return `from ${rule.sources.map((key) => names.source?.(key) ?? key).join(" or ")}`;
        case "neighborhood": {
            // The hop count leads: a cut row still tells two steps on the same node apart.
            const who = rule.seeds.length === 1 ? names.node(rule.seeds[0]) : `${String(rule.seeds.length)} nodes`;
            return `within ${String(rule.depth)} ${rule.depth === 1 ? "hop" : "hops"} of ${who}`;
        }
        default:
            return "a rule";
    }
}

/**
 * A range leaf as a sentence: "weight is between 1 and 4", "weight is at least 4".
 * @param rule - the leaf.
 * @param names - reads attribute names.
 * @returns the sentence.
 */
function rangeWords(rule: Extract<RuleTree, { kind: "range" }>, names: Namer): string {
    const name = names.attribute(rule.attribute);
    if (rule.min !== undefined && rule.max !== undefined) {
        return `${name} is between ${String(rule.min)} and ${String(rule.max)}`;
    }
    if (rule.min !== undefined) {
        return `${name} is at least ${String(rule.min)}`;
    }
    return rule.max === undefined ? `${name} has a value` : `${name} is at most ${String(rule.max)}`;
}

/** A text test in words, by its mode. */
const TEXT_MODE_WORDS: Readonly<Record<string, string>> = {
    substring: "contains",
    "starts-with": "starts with",
    "ends-with": "ends with",
    exact: "is",
    regex: "matches",
};

/**
 * A text leaf as a sentence: "name contains Mme", "email has a value".
 * @param rule - the leaf.
 * @param names - reads attribute names and values.
 * @returns the sentence.
 */
function textWords(rule: Extract<RuleTree, { kind: "text" }>, names: Namer): string {
    const name = names.attribute(rule.reads);
    if (rule.mode === "regex" && rule.text === "") {
        return `${name} has a value`;
    }
    const value = names.value?.(rule.reads, rule.text) ?? rule.text;
    return `${name} ${TEXT_MODE_WORDS[rule.mode ?? "exact"] ?? "is"} ${value}`;
}

/**
 * Whether a rule's value tests read at its edges' ends, inside `not` and `any` too.
 * @param rule - the rule.
 * @returns true when one does.
 */
export function readsEnds(rule: RuleTree): boolean {
    switch (rule.kind) {
        case "range":
        case "categories":
        case "text":
            return rule.nodes === "ends";
        case "not":
            return readsEnds(rule.of);
        case "any":
        case "all":
            return rule.of.some(readsEnds);
        default:
            return false;
    }
}

/** The editor's one line on an edge-attribute step. */
export const ENDS_LINE = "Keeps edges that pass and the nodes at their ends.";

/**
 * Whether a step is over an edge column (its rule keeps edges and the nodes at their ends), so
 * its outcome names the edges as well as the nodes.
 * @param step - the step.
 * @returns true for an edge step.
 */
export function overEdges(step: FilterStep): boolean {
    return readsEnds(step.rule);
}

/** How many nodes and edges are left, as the element's plan counts them. */
export interface Left {
    readonly nodes: number;
    readonly edges: number;
}

/**
 * A step's outcome, shown after its sentence: "22 to 9 nodes", or for a step over an edge
 * column, which keeps edges and the nodes at their ends, "20 to 19 nodes, 41 to 12 edges";
 * "off" for a step that is off.
 * @param on - whether the step is on.
 * @param before - what is left before it, or undefined until counted.
 * @param after - what is left after it, or undefined until counted.
 * @param edges - whether the edges are named too (a step over an edge column).
 * @returns the words, or "" while uncounted.
 */
export function outcomeWords(on: boolean, before: Left | undefined, after: Left | undefined, edges = false): string {
    if (!on) {
        return "off";
    }
    if (before === undefined || after === undefined) {
        return "";
    }
    const nodes = `${String(before.nodes)} to ${String(after.nodes)} nodes`;
    return edges ? `${nodes}, ${String(before.edges)} to ${String(after.edges)} edges` : nodes;
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
 * The status line after Escape closes the step editor without saving: 'Step not added.' for a
 * new step, 'Not saved: "weight is at least 4" is as it was.' for an edit.
 * @param words - the saved step's sentence, or null for a new step.
 * @returns the words.
 */
export function cancelledWords(words: string | null): string {
    return words === null ? "Step not added." : `Not saved: "${words}" is as it was.`;
}

/**
 * The notice after the reader left a new step's editor without Add step: the step was dropped.
 * @param words - the step's sentence, or null while it was not yet whole.
 * @returns the words: 'Filter step not added: "role is board". Press Add step to use a step.'
 */
export function notAddedWords(words: string | null): string {
    const what = words === null ? "Filter step not added." : `Filter step not added: "${words}".`;
    return `${what} Press Add step to use a step.`;
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
 * What the step editor's submit waits for: an attribute, a value, a selected node, a change, or
 * a rule that keeps something ("none": the step as it stands would hide every node).
 */
export type StepMissing = "attribute" | "value" | "nodes" | "change" | "none";

/**
 * The step editor's submit tooltip while it is drawn disabled: what is missing.
 * @param missing - what the rule lacks, or "change" for a saved step edited back to itself.
 * @returns the words.
 */
export function missingTip(missing: StepMissing): string {
    switch (missing) {
        case "attribute":
            return "Add a condition first";
        case "value":
            return "Type a value first";
        case "nodes":
            return "Select a node first";
        case "none":
            return "No node matches this step";
        default:
            return "Nothing changed since the last save";
    }
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
    readonly totalEdges: number;
}

/**
 * The header chip: "9 of 22 nodes", and the edges too ("9 of 22 nodes, 20 of 41 edges") while a
 * step that is on is over an edge column.
 * @param showing - the element's visibility summary.
 * @param steps - the steps.
 * @returns the words.
 */
export function chipWords(showing: Showing, steps: readonly FilterStep[] = []): string {
    const nodes = `${String(showing.visibleNodes)} of ${String(showing.totalNodes)} nodes`;
    return steps.some((step) => step.on && overEdges(step))
        ? `${nodes}, ${String(showing.visibleEdges)} of ${String(showing.totalEdges)} edges`
        : nodes;
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
 * A step change as Undo and Redo name it: `turning off the filter step "weight is at least 4"`. It
 * says "the filter step", since a style layer may hold the same sentence as its name.
 * @param code - the history step's code.
 * @param words - the step's sentence.
 * @returns the words, or null for a code that is not one step's.
 */
export function stepChangeWords(code: HistoryCode, words: string): string | null {
    const did = DID[code];
    return did === undefined ? null : `${did} the filter step "${words}"`;
}
