/**
 * The Filters section's words (design/data/filter-cards.md section 5). Every count is
 * graphty-element's (`visibility.summary`, `visibility.conditionCounts`); every word is the app's.
 */

import {
    type GraphSession,
    type HistoryCode,
    type NodeId,
    renamePaths,
    type RuleTree,
    selectorRule,
} from "@graphty/graphty-element/session";

import { valueWord } from "../inspector/words";
import { attributeName } from "../style/words";
import { sourceName } from "./words";

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
 * Reads attribute, value and load names from the session, as the card words show them.
 * @param session - the element's session.
 * @returns the namer.
 */
export function sessionNamer(session: GraphSession): Namer {
    const attributes = session.data.attributes();
    return {
        attribute: (path) => {
            const name = attributeName(session, path);
            return name === path ? path.replace(/^data\./, "") : name;
        },
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
 * A rule written as an expression, in words: the sentence of the rule graphty-element reads it
 * as ("gal4RGexp is below -1", "trained is false"), else the expression with each value under
 * its name and its literals without their backticks.
 * @param where - the expression.
 * @param names - reads attribute and value names.
 * @returns the words.
 */
export function whereWords(where: string, names: Namer): string {
    const rule = selectorRule({ match: "expression", where }, { comparisons: true, below: true });
    if (rule !== undefined) {
        return ruleWords(rule.where, names);
    }
    try {
        return renamePaths(where, (path) => names.attribute(path))
            .replaceAll(/`([^`]*)`/g, "$1")
            .trim();
    } catch {
        return where.trim();
    }
}

/**
 * A rule as one sentence: "weight is at least 4", "in the largest component", "within 2 hops of Ava".
 * @param rule - the rule.
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
            if (rule.top !== undefined) {
                return `${name} is among the highest ${String(rule.top)}`;
            }
            return rule.below === undefined
                ? `${name} is above ${String(rule.above ?? "")}`
                : `${name} is below ${String(rule.below)}`;
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
 * The header chip's name and tooltip, in the same words: how much is showing and which cards are
 * on ("Filter: 9 of 22 nodes, filtered by "kind is agency"").
 * @param words - the chip's own words, from `chipWords`.
 * @param on - the words of the cards that are on.
 * @returns the words.
 */
export function chipName(words: string, on: readonly string[]): string {
    const cards = on.map((card) => `"${card}"`).join(", ");
    return `Filter: ${words}, filtered by ${cards}`;
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
 * card that is on hides edges by an edge value.
 * @param showing - the element's visibility summary.
 * @param edges - whether the edges are named too.
 * @returns the words.
 */
export function chipWords(showing: Showing, edges = false): string {
    const nodes = `${String(showing.visibleNodes)} of ${String(showing.totalNodes)} nodes`;
    return edges ? `${nodes}, ${String(showing.visibleEdges)} of ${String(showing.totalEdges)} edges` : nodes;
}

/**
 * The status line after a filter change: "Filter on: 9 of 22 nodes, 14 edges", or "Filter off"
 * once no card hides anything.
 * @param on - whether a card that hides is on.
 * @param showing - the element's visibility summary.
 * @returns the words.
 */
export function statusWords(on: boolean, showing: Showing): string {
    return on ? `Filter on: ${chipWords(showing)}, ${String(showing.visibleEdges)} edges` : "Filter off";
}

/** What each filter history code did, as Undo and Redo name it. */
const DID: Partial<Record<HistoryCode, string>> = {
    "visibility.step-add": "adding",
    "visibility.step-edit": "editing",
    "visibility.step-on": "turning on",
    "visibility.step-off": "turning off",
    "visibility.step-remove": "deleting",
    "visibility.condition-add": "adding",
    "visibility.condition-edit": "editing",
    "visibility.condition-on": "turning on",
    "visibility.condition-off": "turning off",
    "visibility.condition-remove": "deleting",
};

/**
 * A filter change as Undo and Redo name it: `turning off the filter "weight is at least 4"`. It
 * says "the filter", since a style layer may hold the same words as its name.
 * @param code - the history step's code.
 * @param words - the card's words.
 * @returns the words, or null for a code that is not one card's.
 */
export function filterChangeWords(code: HistoryCode, words: string): string | null {
    const did = DID[code];
    return did === undefined ? null : `${did} the filter "${words}"`;
}
