/**
 * A layer's rule as the Which elements editor edits it (tier3 design, section 3.1): the form's
 * state, the graphty-element selector it makes and reads back, and the rule as one sentence.
 * Every value a rule reads comes from the element's `session.data.readableValues()`.
 */

import { type GraphSession, type Layer, type RuleTree, selectorRule } from "@graphty/graphty-element/session";

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
import { readableName, valueName } from "./words";

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
        default: {
            // Every other selector through the element's rule reader, so a run's layer (a route's
            // "onPath == true" expression included) opens on conditions, as a reader's does.
            const rule = selectorRule(selector);
            if (rule !== undefined) {
                return { ...ruleForm(rule.where, attributes, prefer), touching: rule.edges === "incident" };
            }
            return selector.match === "expression"
                ? { ...BLANK_FORM, mode: "expression", expression: selector.where }
                : { ...BLANK_FORM, mode: "other" };
        }
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
 * Whether a form's rule reads only node values, so a Both layer chooses which edges go with it. A
 * value edges carry too (a route's "On the route") is read by each kind itself.
 * @param form - the form.
 * @param attributes - what a rule can read; without them every `node:` value counts as nodes only.
 * @returns true for a node rule.
 */
export function readsNodes(form: Form, attributes: readonly Field[] = []): boolean {
    const nodesOnly = (reads: string): boolean =>
        reads.startsWith("node:") && !attributes.some((a) => a.kind === "edge" && `node:${a.path}` === reads);
    if (form.mode === "top") {
        return nodesOnly(form.topReads);
    }
    return form.mode === "where" && form.conditions.length > 0 && form.conditions.every((c) => nodesOnly(c.reads));
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
 * Whether a condition is "<a yes-or-no value> is true", which reads as the value's own name.
 * @param condition - the condition.
 * @param attributes - what a rule can read.
 * @returns true for one.
 */
function isYes(condition: Condition, attributes: readonly Field[]): boolean {
    return (
        condition.compare === "is" &&
        condition.text === "true" &&
        attributeOf(condition.reads, attributes)?.type === "yes-no"
    );
}

/**
 * One condition in words: "node id matches pattern [13579]$", "Community is Group 3", "on the
 * route". A value that names a run's group is said by the group's name, as the key says it.
 * @param session - the element's session.
 * @param condition - the condition.
 * @param attributes - what a rule can read.
 * @returns the words.
 */
function conditionWords(session: GraphSession, condition: Condition, attributes: readonly Field[]): string {
    const name = readsWords(condition.reads, attributes);
    if (isYes(condition, attributes)) {
        return name.charAt(0).toLowerCase() + name.slice(1);
    }
    const compare = compareWords(condition.compare);
    const path = attributeOf(condition.reads, attributes)?.path ?? "id";
    const named = (text: string): string => valueName(session, path, text);
    switch (condition.compare) {
        case "has-value":
            return `${name} ${compare}`;
        case "between":
            return `${name} is between ${String(condition.low)} and ${String(condition.high)}`;
        case "at-least":
        case "at-most":
            return `${name} is ${compare} ${String(condition.low)}`;
        case "one-of":
            return `${name} ${compare} ${condition.text
                .split(",")
                .map((v) => named(v.trim()))
                .join(", ")}`;
        default: {
            const numeric = isNumber(attributeOf(condition.reads, attributes));
            return `${name} ${compare} ${named(numeric ? String(condition.low) : condition.text)}`;
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
    const nodeRule = kind === "both" && readsNodes(form, attributes);
    const edgeTail = nodeRule ? `, and the edges ${form.touching ? "touching" : "between"} them` : "";
    const lead = nodeRule ? "Nodes" : who;
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
        case "where": {
            if (form.conditions.length === 0) {
                return `${who}: no rule yet`;
            }
            // "Nodes and edges on the route": a yes-or-no value needs no "where".
            const where = form.conditions.every((c) => isYes(c, attributes)) ? "" : " where";
            const words = form.conditions.map((c) => conditionWords(session, c, attributes)).join(" and ");
            return `${lead}${where} ${words}${edgeTail}`;
        }
        default:
            return `${who} chosen by a rule`;
    }
}

/**
 * The name a hand-made layer is given by its rule: a condition rule by its conditions alone ("Name
 * contains Mme"), since the tree's glyph already says what it paints and the tree's width would
 * cut "Nodes where" off the part that tells two layers apart; any other rule by its sentence.
 * @param session - the element's session.
 * @param attributes - what a rule can read.
 * @param form - the rule's form.
 * @param kind - what the layer paints.
 * @returns the name.
 */
export function ruleName(session: GraphSession, attributes: readonly Field[], form: Form, kind: Kind): string {
    if (form.mode !== "where" || form.conditions.length === 0) {
        return sentenceOf(session, attributes, form, kind);
    }
    const words = form.conditions.map((c) => conditionWords(session, c, attributes)).join(" and ");
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * How many elements a rule matches, before any layer holds it: "6 nodes", "3 nodes, 2 edges".
 * Asked of the element (`selection.count` over the rule's scope), never counted here.
 * @param session - the element's session.
 * @param selector - the rule.
 * @param kind - what the layer will paint.
 * @returns the words, or null for a rule only a layer can count (Selected, an expression).
 */
export async function draftCount(session: GraphSession, selector: Selector, kind: Kind): Promise<string | null> {
    let counted: { readonly nodes: number; readonly edges: number };
    switch (selector.match) {
        case "everything": {
            const { nodeCount, edgeCount } = session.data.statistics();
            counted = { nodes: nodeCount, edges: edgeCount };
            break;
        }
        case "ids":
            counted = { nodes: selector.nodes?.length ?? 0, edges: selector.edges?.length ?? 0 };
            break;
        case "member":
            counted = await session.selection.count({ scope: selector.of });
            break;
        case "rule":
            counted = await session.selection.count({
                scope: { define: { kind: "rule", where: selector.where, reading: selector.edges ?? "clipped" } },
            });
            break;
        default:
            return null;
    }
    const words = [
        kind === "edge" ? null : countWords(counted.nodes, "node"),
        kind === "node" ? null : countWords(counted.edges, "edge"),
    ];
    return words.filter((w) => w !== null).join(", ");
}

/** The name a hand-made layer is written with before it has a rule. */
export const DRAFT_NAME = "New layer";
