/**
 * Conditions: what a condition row reads, how it compares, and the graphty-element rule leaf it
 * makes. Shared by Data > Filters and a layer's Which elements (tier3 design, section 3.1).
 */

import type { ReadableValue, RuleTree } from "@graphty/graphty-element/session";

/**
 * What a condition can read, as much of it as a condition row needs: a data column
 * (graphty-element's `AttributeDescriptor` is one) or an entry of `session.data.readableValues()`
 * (the node id, a column, a run's field) read into this shape by {@link readableFields}.
 */
export interface Field {
    /** The path a rule reads: `id`, `data.<name>`, `results.<run>.<field>`. */
    readonly path: string;
    /** Whether nodes or edges carry it. */
    readonly kind: "node" | "edge";
    readonly plainName: string;
    /** The heading it is listed under ("Data", or the run's name); absent lists it under its kind. */
    readonly group?: string;
    /** `number` or `integer` for numbers; anything else reads as text. */
    readonly type?: string;
    /** Values to offer while typing one. */
    readonly sampleValues?: readonly unknown[];
}

/**
 * The fields a rule can read, from graphty-element's one list of readable values, each data
 * column keeping its sample values.
 * @param readable - `session.data.readableValues()`.
 * @param attributes - `session.data.attributes()`, for the sample values.
 * @param nameOf - each value's name and heading, when the caller names them; else its plainName.
 * @returns the fields, in the element's order.
 */
export function readableFields(
    readable: readonly ReadableValue[],
    attributes: readonly Field[],
    nameOf?: (value: ReadableValue) => { readonly name: string; readonly group: string },
): Field[] {
    // ponytail: a node value read at an edge's end (`value.end`) is left out until the picker
    // words it ("the source's name"); listed bare it would read as the edge's own column.
    return readable
        .filter((value) => value.end === undefined)
        .map((value) => ({
            path: value.path,
            kind: value.on,
            plainName: nameOf?.(value).name ?? value.plainName,
            group: nameOf?.(value).group,
            type: value.kind === "number" ? "number" : "string",
            sampleValues: attributes.find((a) => a.path === value.path && a.kind === value.on)?.sampleValues ?? [],
        }));
}

/** How a condition compares its value. */
export type Compare =
    | "is"
    | "is-not"
    | "one-of"
    | "at-least"
    | "at-most"
    | "between"
    | "contains"
    | "starts-with"
    | "ends-with"
    | "pattern"
    | "has-value";

/** One condition: what it reads, how it compares, and the operand as typed. */
export interface Condition {
    /** `<node|edge>:<path>`, `node:id` for the element id, or "" for none yet. */
    readonly reads: string;
    readonly compare: Compare;
    readonly low: number | string;
    readonly high: number | string;
    readonly text: string;
}

export const BLANK_CONDITION: Condition = { reads: "", compare: "at-least", low: "", high: "", text: "" };

/** The value an element id is read as. */
export const ID_READS = "node:id";

const COMPARE_WORDS: Readonly<Record<Compare, string>> = {
    is: "is",
    "is-not": "is not",
    "one-of": "is one of",
    "at-least": "at least",
    "at-most": "at most",
    between: "between",
    contains: "contains",
    "starts-with": "starts with",
    "ends-with": "ends with",
    pattern: "matches pattern",
    "has-value": "has a value",
};

/**
 * A comparison in words: "at least", "matches pattern".
 * @param compare - the comparison.
 * @returns the words.
 */
export function compareWords(compare: Compare): string {
    return COMPARE_WORDS[compare];
}

/**
 * Whether an attribute holds numbers.
 * @param attribute - the attribute.
 * @returns true for a number column.
 */
export const isNumber = (attribute: Field | undefined): boolean =>
    attribute?.type === "number" || attribute?.type === "integer";

/** The comparisons a layer's rule offers on numbers, on text, and on the element id. */
const NUMBER_COMPARES: readonly Compare[] = ["at-least", "at-most", "between", "is", "is-not", "has-value"];
const TEXT_COMPARES: readonly Compare[] = [
    "is",
    "is-not",
    "one-of",
    "contains",
    "starts-with",
    "ends-with",
    "pattern",
    "has-value",
];
const ID_COMPARES: readonly Compare[] = ["is", "is-not", "contains", "starts-with", "ends-with", "pattern"];

/**
 * Every comparison a layer's rule offers for what a condition reads.
 * @param attribute - the attribute, or undefined for the element id.
 * @returns the comparisons.
 */
export function allCompares(attribute: Field | undefined): readonly Compare[] {
    if (attribute === undefined || attribute.path === "id") {
        return ID_COMPARES;
    }
    return isNumber(attribute) ? NUMBER_COMPARES : TEXT_COMPARES;
}

/**
 * The comparisons a filter step offers: a range on numbers, a list of values on categories.
 * @param attribute - the attribute.
 * @returns the comparisons.
 */
export function filterCompares(attribute: Field | undefined): readonly Compare[] {
    return isNumber(attribute) ? ["at-least", "at-most", "between"] : ["one-of"];
}

/**
 * The attribute a condition reads, or undefined for the element id or none.
 * @param reads - the condition's `reads`.
 * @param attributes - the session's attributes.
 * @returns the attribute.
 */
export function attributeOf<T extends Field>(reads: string, attributes: readonly T[]): T | undefined {
    return attributes.find((a) => `${a.kind}:${a.path}` === reads);
}

/**
 * Splits a comma list into its values.
 * @param text - the list as typed.
 * @returns the values, trimmed, empties dropped.
 */
const listOf = (text: string): string[] =>
    text
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v !== "");

/**
 * The rule leaf a condition makes, or null while it is incomplete.
 * @param condition - the condition.
 * @param attributes - the session's attributes.
 * @param ends - an edge attribute's rule keeps its edges' ends too (a filter step's reading).
 * @returns the rule.
 */
export function conditionRule(condition: Condition, attributes: readonly Field[], ends = false): RuleTree | null {
    const attribute = attributeOf(condition.reads, attributes);
    if (attribute === undefined && condition.reads !== ID_READS) {
        return null;
    }
    const path = attribute?.path ?? "id";
    const nodes = ends && attribute?.kind === "edge" ? { nodes: "ends" as const } : {};
    const low = typeof condition.low === "number" ? condition.low : undefined;
    const high = typeof condition.high === "number" ? condition.high : undefined;
    const text = condition.text.trim();
    const textRule = (mode: "exact" | "substring" | "starts-with" | "ends-with" | "regex"): RuleTree | null =>
        text === "" ? null : { kind: "text", reads: path, mode, text, ...nodes };
    const numberIs = (): RuleTree | null =>
        low === undefined ? null : { kind: "range", attribute: path, min: low, max: low, ...nodes };
    const is = (): RuleTree | null => (attribute !== undefined && isNumber(attribute) ? numberIs() : textRule("exact"));
    switch (condition.compare) {
        case "is":
            return is();
        case "is-not": {
            const of = is();
            return of === null ? null : { kind: "not", of };
        }
        case "one-of": {
            const values = listOf(condition.text);
            return values.length === 0 ? null : { kind: "categories", attribute: path, values, ...nodes };
        }
        case "at-least":
            return low === undefined ? null : { kind: "range", attribute: path, min: low, ...nodes };
        case "at-most":
            return low === undefined ? null : { kind: "range", attribute: path, max: low, ...nodes };
        case "between":
            return low === undefined || high === undefined
                ? null
                : { kind: "range", attribute: path, min: low, max: high, ...nodes };
        case "contains":
            return textRule("substring");
        case "starts-with":
            return textRule("starts-with");
        case "ends-with":
            return textRule("ends-with");
        case "pattern":
            return textRule("regex");
        default:
            // Any text at all: an element without a value fails a text test.
            return { kind: "text", reads: path, mode: "regex", text: "", ...nodes };
    }
}

/** The text modes a condition writes, by comparison. */
const MODES: Readonly<Record<string, Compare>> = {
    exact: "is",
    substring: "contains",
    "starts-with": "starts-with",
    "ends-with": "ends-with",
    regex: "pattern",
};

/**
 * The condition a rule leaf reads as, or null for a leaf no condition row draws.
 * @param rule - the leaf.
 * @param attributes - the session's attributes.
 * @param prefer - the kind to read a path as when nodes and edges both carry it.
 * @returns the condition.
 */
export function conditionOf(
    rule: RuleTree,
    attributes: readonly Field[],
    prefer: "node" | "edge" = "node",
): Condition | null {
    const readsOf = (path: string, ends: boolean): string => {
        if (path === "id") {
            return ID_READS;
        }
        const kinds = attributes.filter((a) => a.path === path).map((a) => a.kind);
        const kind = ends || (kinds.includes(prefer) ? prefer : kinds[0]) === "edge" ? "edge" : "node";
        return `${kind}:${path}`;
    };
    switch (rule.kind) {
        case "range": {
            const reads = readsOf(rule.attribute, rule.nodes === "ends");
            if (rule.min !== undefined && rule.min === rule.max) {
                return { ...BLANK_CONDITION, reads, compare: "is", low: rule.min };
            }
            if (rule.min !== undefined && rule.max !== undefined) {
                return { ...BLANK_CONDITION, reads, compare: "between", low: rule.min, high: rule.max };
            }
            if (rule.min !== undefined) {
                return { ...BLANK_CONDITION, reads, compare: "at-least", low: rule.min };
            }
            return rule.max === undefined ? null : { ...BLANK_CONDITION, reads, compare: "at-most", low: rule.max };
        }
        case "categories":
            return {
                ...BLANK_CONDITION,
                reads: readsOf(rule.attribute, rule.nodes === "ends"),
                compare: "one-of",
                text: rule.values.join(", "),
            };
        case "text": {
            const reads = readsOf(rule.reads, rule.nodes === "ends");
            if (rule.mode === "regex" && rule.text === "") {
                return { ...BLANK_CONDITION, reads, compare: "has-value" };
            }
            return { ...BLANK_CONDITION, reads, compare: MODES[rule.mode] ?? "is", text: rule.text };
        }
        case "not": {
            const inner = conditionOf(rule.of, attributes, prefer);
            return inner?.compare === "is" ? { ...inner, compare: "is-not" } : null;
        }
        default:
            return null;
    }
}

/** One choice of what a condition reads, grouped under a heading. */
export interface ReadsGroup {
    readonly group: string;
    readonly items: readonly { readonly value: string; readonly label: string }[];
}
