/**
 * A layer's rule as the Which elements editor edits it (tier3 design, section 3.1): the form's
 * state, the graphty-element selector it makes and reads back, and the rule as one sentence.
 * Every value a rule reads comes from the element's `session.data.readableValues()`.
 */

import type { GraphSession, Layer, RuleTree } from "@graphty/graphty-element/session";

import {
    attributeOf,
    compareWords,
    type Condition,
    conditionOf,
    conditionRule,
    type Field,
    ID_READS,
    isNumber,
    readableFields,
} from "../rules/conditions";
import { readableName } from "./words";

/** What a layer's rule picks, as graphty-element's layer holds it. */
export type Selector = Layer["selector"];
/** Nodes or edges, as a layer's target reads. */
export type SelectorTarget = Layer["target"];

/** What a layer paints: nodes, edges, or both. */
export type Kind = "node" | "edge" | "both";

/** The ways a rule picks elements, as the editor's Rule select offers them. */
export type Mode = "every" | "where" | "top" | "named" | "set" | "selected" | "hovered" | "expression" | "other";

/** The editor's state: the way it picks and each way's fields. A whole one is written live. */
export interface Form {
    readonly mode: Mode;
    readonly conditions: readonly Condition[];
    /** Top N by: what it ranks by (`<kind>:<path>`) and N. */
    readonly topReads: string;
    readonly topN: number | string;
    readonly named: readonly string[];
    readonly set: string;
    readonly expression: string;
    /** A Both layer on a node rule: the edges touching its nodes, not only those between them. */
    readonly touching: boolean;
}

/** A form with nothing chosen yet. */
export const BLANK_FORM: Form = {
    mode: "where",
    conditions: [],
    topReads: "",
    topN: 10,
    named: [],
    set: "",
    expression: "",
    touching: false,
};

/** The ways a rule picks, as the Rule select offers them. */
export const MODES: readonly { readonly value: Mode; readonly label: string }[] = [
    { value: "every", label: "Every one" },
    { value: "where", label: "Where a value" },
    { value: "top", label: "Top N by" },
    { value: "named", label: "Named" },
    { value: "set", label: "Members of a set" },
    { value: "selected", label: "Selected" },
    { value: "hovered", label: "Hovered" },
    { value: "expression", label: "Expression" },
];

/**
 * Counts elements in words: "3 nodes", "1 edge".
 * @param n - how many.
 * @param kind - nodes or edges.
 * @returns the words.
 */
export function countWords(n: number, kind: "node" | "edge"): string {
    return `${String(n)} ${kind}${n === 1 ? "" : "s"}`;
}

/**
 * Every value a rule can read: graphty-element's readable values (the node id, the data
 * columns, each finished run's fields), named and grouped as the vary picker names them.
 * @param session - the element's session.
 * @returns the fields.
 */
export function fieldsOf(session: GraphSession): Field[] {
    return readableFields(session.data.readableValues(), session.data.attributes(), (value) =>
        readableName(session, value),
    );
}

/**
 * What a `<kind>:<path>` names, for a rule: the attribute's path, or `id`.
 * @param reads - the choice.
 * @param attributes - the attributes.
 * @returns the path, or undefined for none.
 */
function pathOf(reads: string, attributes: readonly Field[]): string | undefined {
    return reads === ID_READS ? "id" : attributeOf(reads, attributes)?.path;
}

/**
 * The editor's state for a layer's selector.
 * @param selector - the selector.
 * @param attributes - what a rule can read.
 * @param prefer - the kind to read a path shared by nodes and edges as.
 * @returns the form; mode `other` for a selector it does not draw.
 */
export function formOf(selector: Selector, attributes: readonly Field[], prefer: SelectorTarget): Form {
    switch (selector.match) {
        case "everything":
            return { ...BLANK_FORM, mode: "every" };
        case "state":
            return { ...BLANK_FORM, mode: selector.state };
        case "ids":
            return {
                ...BLANK_FORM,
                mode: "named",
                named: ((prefer === "edge" ? selector.edges : selector.nodes) ?? []).map(String),
            };
        case "member":
            return typeof selector.of === "object" && "set" in selector.of
                ? { ...BLANK_FORM, mode: "set", set: selector.of.set }
                : { ...BLANK_FORM, mode: "other" };
        case "expression":
            return { ...BLANK_FORM, mode: "expression", expression: selector.where };
        case "rule":
            return { ...ruleForm(selector.where, attributes, prefer), touching: selector.edges === "incident" };
        // A run's layer paints what carries its value: the condition "<value> has a value".
        case "has":
            return ruleForm({ kind: "text", reads: selector.path, mode: "regex", text: "" }, attributes, prefer);
        case "top":
            return ruleForm({ kind: "threshold", path: selector.path, top: selector.n }, attributes, prefer);
        default:
            return { ...BLANK_FORM, mode: "other" };
    }
}

/**
 * The editor's state for a rule tree.
 * @param rule - the rule.
 * @param attributes - what a rule can read.
 * @param prefer - the kind to read a shared path as.
 * @returns the form.
 */
function ruleForm(rule: RuleTree, attributes: readonly Field[], prefer: SelectorTarget): Form {
    if (rule.kind === "threshold" && rule.top !== undefined && rule.above === undefined) {
        const kinds = attributes.filter((a) => a.path === rule.path).map((a) => a.kind);
        const kind = kinds.includes(prefer) ? prefer : (kinds[0] ?? prefer);
        return { ...BLANK_FORM, mode: "top", topReads: `${kind}:${rule.path}`, topN: rule.top };
    }
    if (rule.kind === "expression") {
        return { ...BLANK_FORM, mode: "expression", expression: rule.where };
    }
    const leaves = rule.kind === "all" ? rule.of : [rule];
    const conditions = leaves.map((leaf) => conditionOf(leaf, attributes, prefer));
    return conditions.every((c): c is Condition => c !== null)
        ? { ...BLANK_FORM, mode: "where", conditions }
        : { ...BLANK_FORM, mode: "other" };
}

/**
 * The selector a whole form makes, or null while it is incomplete.
 * @param form - the form.
 * @param attributes - what a rule can read.
 * @param nodes - whether the layer paints nodes (Named names nodes, else edges).
 * @returns the selector.
 */
export function selectorOf(form: Form, attributes: readonly Field[], nodes: boolean): Selector | null {
    const edges = form.touching ? { edges: "incident" as const } : {};
    switch (form.mode) {
        case "every":
            return { match: "everything" };
        case "selected":
        case "hovered":
            return { match: "state", state: form.mode };
        case "named":
            if (form.named.length === 0) {
                return null;
            }
            return nodes ? { match: "ids", nodes: form.named } : { match: "ids", edges: form.named };
        case "set":
            return form.set === "" ? null : { match: "member", of: { set: form.set } };
        case "expression":
            return form.expression.trim() === "" ? null : { match: "expression", where: form.expression.trim() };
        case "top": {
            const path = pathOf(form.topReads, attributes);
            return path === undefined || typeof form.topN !== "number" || form.topN < 1
                ? null
                : { match: "rule", where: { kind: "threshold", path, top: form.topN }, ...edges };
        }
        case "where": {
            const rules = form.conditions.map((c) => conditionRule(c, attributes));
            if (rules.length === 0 || rules.some((r) => r === null)) {
                return null;
            }
            const leaves = rules as RuleTree[];
            return { match: "rule", where: leaves.length === 1 ? leaves[0] : { kind: "all", of: leaves }, ...edges };
        }
        default:
            return null;
    }
}

/**
 * Whether a form's rule reads only node values, so a Both layer chooses which edges go with it.
 * @param form - the form.
 * @returns true for a node rule.
 */
export function readsNodes(form: Form): boolean {
    if (form.mode === "top") {
        return form.topReads.startsWith("node:");
    }
    return (
        form.mode === "where" && form.conditions.length > 0 && form.conditions.every((c) => c.reads.startsWith("node:"))
    );
}

/**
 * What a condition reads, in words: the value's plain name, "node id" for the element's own id.
 * @param reads - the condition's `reads`.
 * @param attributes - what a rule can read.
 * @returns the words.
 */
function readsWords(reads: string, attributes: readonly Field[]): string {
    return reads === ID_READS ? "node id" : (attributeOf(reads, attributes)?.plainName ?? "a value");
}

/**
 * One condition in words: "node id matches pattern [13579]$".
 * @param condition - the condition.
 * @param attributes - what a rule can read.
 * @returns the words.
 */
function conditionWords(condition: Condition, attributes: readonly Field[]): string {
    const name = readsWords(condition.reads, attributes);
    const compare = compareWords(condition.compare);
    switch (condition.compare) {
        case "has-value":
            return `${name} ${compare}`;
        case "between":
            return `${name} is between ${String(condition.low)} and ${String(condition.high)}`;
        case "at-least":
        case "at-most":
            return `${name} is ${compare} ${String(condition.low)}`;
        default: {
            const numeric = isNumber(attributeOf(condition.reads, attributes));
            return `${name} ${compare} ${numeric ? String(condition.low) : condition.text}`;
        }
    }
}

/**
 * The rule as one sentence: "Nodes where node id matches pattern [13579]$, and the edges between
 * them". A hand-made layer is named by it until the reader renames it.
 * @param session - the element's session.
 * @param attributes - what a rule can read.
 * @param form - the rule's form.
 * @param kind - what the layer paints.
 * @returns the sentence.
 */
export function sentenceOf(session: GraphSession, attributes: readonly Field[], form: Form, kind: Kind): string {
    const who = { node: "Nodes", edge: "Edges", both: "Nodes and edges" }[kind];
    const edgeTail =
        kind === "both" && readsNodes(form) ? `, and the edges ${form.touching ? "touching" : "between"} them` : "";
    const lead = kind === "both" && readsNodes(form) ? "Nodes" : who;
    switch (form.mode) {
        case "every":
            return `Every ${kind === "both" ? "node and edge" : kind}`;
        case "selected":
            return `${who} that are selected`;
        case "hovered":
            return `${who} under the pointer`;
        case "named":
            return `Named: ${form.named.join(", ")}`;
        case "set":
            return `Members of ${session.sets.get(form.set)?.name ?? "a set"}`;
        case "expression":
            return `${who} where ${form.expression}`;
        case "top":
            return `Top ${String(form.topN)} ${lead.toLowerCase()} by ${readsWords(form.topReads, attributes)}${edgeTail}`;
        case "where":
            return form.conditions.length === 0
                ? `${who}: no rule yet`
                : `${lead} where ${form.conditions.map((c) => conditionWords(c, attributes)).join(" and ")}${edgeTail}`;
        default:
            return `${who} chosen by a rule`;
    }
}

/** The name a hand-made layer is written with before it has a rule. */
export const DRAFT_NAME = "New layer";
