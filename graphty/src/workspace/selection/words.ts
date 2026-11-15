/**
 * The selection editor's words: every code graphty-element reports about a selection's steps, its
 * verbs and its references, said in the app's glossary (design/ui/selection-groups/spec.md,
 * section 11). The element returns codes; the app writes the words.
 */

import type {
    CodedFact,
    GraphSession,
    RuleTree,
    StepReading,
    StepReasonCode,
    StepReference,
    StepsReading,
    UnionLeaf,
    UnionStep,
} from "@graphty/graphty-element/session";

import { costLine, wordsFor } from "../analyze/words";
import { formatNumber } from "../inspector/words";
import { type Card, cardFields, cardOf, cardWords, type Side } from "../style/cards";
import { NATURAL, valueName } from "../style/words";
import type { Verb } from "./model";
import { isRelative, referenceOf, STATE_WORDS, stepCard, WHILE } from "./values";

/** A verb's word, Figma's name for it, and the words a search finds it by. Verbs are words everywhere. */
export const VERB_WORDS: Readonly<Record<Verb, { word: string; figma: string; aliases: readonly string[] }>> = {
    add: { word: "Add", figma: "Union", aliases: ["union", "or"] },
    except: { word: "Except", figma: "Subtract", aliases: ["subtract", "remove", "minus"] },
    keep: { word: "Keep", figma: "Intersect", aliases: ["intersect", "only", "and"] },
};

/** The nouns a side goes by. */
export const NOUNS: Readonly<Record<Side, { one: string; many: string }>> = {
    node: { one: "node", many: "nodes" },
    edge: { one: "edge", many: "edges" },
};

/**
 * "24 of 77 nodes".
 * @param count - how many.
 * @param of - out of.
 * @param side - nodes or edges.
 * @returns the words.
 */
export const countWords = (count: number, of: number, side: Side): string =>
    `${String(count)} of ${String(of)} ${of === 1 ? NOUNS[side].one : NOUNS[side].many}`;

export { letterOf } from "./model";

/** From this count up, a sidebar row writes it short ("200k"); its tooltip has every digit. */
const SHORT_FROM = 10_000;

/**
 * A count as a narrow sidebar row writes it: in full under 10,000, else short ("50k", "1.2m").
 * @param count - the count.
 * @returns the words.
 */
export const shortCount = (count: number): string =>
    count < SHORT_FROM
        ? formatNumber(count)
        : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(count).toLowerCase();

/**
 * A count written short from 1,000 up ("1.9k"), for a row's "N values".
 * @param count - the count.
 * @returns the words.
 */
const compactCount = (count: number): string =>
    count < 1000
        ? formatNumber(count)
        : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(count).toLowerCase();

/** A reason's short word on a step's row, and its whole words in the row's tooltip. */
const REASONS: Readonly<Record<StepReasonCode, { short: string; long: string }>> = {
    // A step with a value and no test is said as its value alone (the owner's review, ws-polish 3).
    "test-unset": { short: "", long: "No test yet: this step changes nothing" },
    "no-reference": { short: "No reference", long: "No reference chosen: this step changes nothing" },
    "one-node-only": { short: "One node", long: "This option takes one node; the reference holds several" },
    computing: { short: "Computing", long: "Computing" },
    "run-needed": { short: "Run", long: "Waits for Run" },
    stale: { short: "Stale", long: "The data changed: waits for Run" },
    "run-paused": { short: "Paused", long: "Paused while hovering" },
    "run-failed": { short: "Failed", long: "The run failed" },
    "waits-for": { short: "Waits", long: "Waits for an earlier step" },
    "input-empty": { short: "Passes none", long: "Nothing comes into this step" },
    "reference-empty": { short: "Passes none", long: "The reference holds no node now" },
    "frozen-from": { short: "Frozen", long: "Frozen to the nodes it held when written" },
};

/**
 * A reason in words.
 * @param reason - the element's reason.
 * @param steps - the group's step ids, to say which step a step waits for.
 * @returns the short word and the whole words; empty for none.
 */
export function reasonWords(
    reason: CodedFact<StepReasonCode> | null,
    steps: readonly string[] = [],
): { short: string; long: string } {
    if (reason === null) {
        return { short: "", long: "" };
    }
    const words = REASONS[reason.code];
    if (reason.code === "waits-for") {
        const at = steps.indexOf(String(reason.params.step ?? ""));
        return at === -1
            ? words
            : { short: `Waits for step ${String(at + 1)}`, long: `Waits for step ${String(at + 1)}` };
    }
    if (reason.code === "run-needed" || reason.code === "stale") {
        const ms = reason.params.estimateMs;
        if (typeof ms === "number") {
            const about = costLine(ms / 1000).toLowerCase();
            return { short: `Run (${about})`, long: `${words.long} (${about})` };
        }
    }
    return words ?? { short: reason.code, long: reason.code };
}

/**
 * A reference in words: "Hovered or selected", "Selected (3)", "So far", a set's name, a node's id.
 * @param session - the element's session.
 * @param reference - the reference.
 * @returns the words.
 */
export function referenceWords(session: GraphSession, reference: StepReference | undefined): string {
    if (reference === undefined) {
        return "";
    }
    if (reference === "hovered-or-selected") {
        return "Hovered or selected";
    }
    if (reference === "so-far") {
        return "So far";
    }
    if (reference === "selection") {
        return `Selected (${formatNumber(session.selection.nodes.length)})`;
    }
    if (typeof reference === "object" && "set" in reference) {
        return session.sets.get(reference.set)?.name ?? "A set";
    }
    if (typeof reference === "object" && "nodes" in reference) {
        const [only] = reference.nodes;
        return reference.nodes.length === 1
            ? session.data.nodeName(only).name
            : `${formatNumber(reference.nodes.length)} nodes`;
    }
    return "A scope";
}

/**
 * A relative rule's preset name, by its form.
 * @param rule - the rule.
 * @returns the name.
 */
function relativeName(rule: RuleTree): string {
    switch (rule.kind) {
        case "hops":
            if (rule.direction === "out") {
                return "Downstream of";
            }
            if (rule.direction === "in") {
                return "Upstream of";
            }
            if (rule.max === undefined) {
                return "Connected to";
            }
            if (rule.max === 0) {
                return "Is in";
            }
            return `Within ${String(rule.max)} ${rule.max === 1 ? "hop" : "hops"} of`;
        case "touching":
            return { either: "Edges touching", both: "Edges within", one: "Edges leaving" }[rule.ends];
        case "nonempty":
            return WHILE;
        default:
            return "Shares a value with";
    }
}

/** A structure leaf's name. */
const STRUCTURE: Partial<Record<RuleTree["kind"], string>> = {
    isolated: "Isolated",
    "self-loop": "Self-loops",
    "repeated-edge": "Repeated edges",
};

/**
 * The name of a value that takes no test: a structure leaf, the largest component, a state.
 * @param rule - the step's rule.
 * @returns the name, or undefined for a value with a test.
 */
function testlessName(rule: RuleTree): string | undefined {
    if (rule.kind === "state") {
        return STATE_WORDS[rule.state];
    }
    return rule.kind === "member" && rule.of === "largest-component" ? "Largest component" : STRUCTURE[rule.kind];
}

/**
 * A step's value and test, as its row says them: the value ("Degree", "Betweenness", "Within 1 hop
 * of") and the short test ("6 to 10", "Valjean"), or the inert word in its place.
 * @param session - the element's session.
 * @param step - the step.
 * @param side - the selection's side.
 * @param reading - the step's reading, for the run a `measure` reads.
 * @returns the value and the test.
 */
export function stepWords(
    session: GraphSession,
    step: UnionStep,
    side: Side,
    reading?: StepReading,
): { value: string; test: string } {
    const words = ruleStepWords(session, step, side, reading);
    // An edge step reading a node value says when either end is enough; both ends goes unsaid.
    return step.ends === "either"
        ? { ...words, test: [words.test, "either end"].filter((each) => each !== "").join(" ") }
        : words;
}

/**
 * {@link stepWords} before the ends are said.
 * @param session - the element's session.
 * @param step - the step.
 * @param side - the selection's side.
 * @param reading - the step's reading.
 * @returns the value and the test.
 */
function ruleStepWords(
    session: GraphSession,
    step: UnionStep,
    side: Side,
    reading?: StepReading,
): { value: string; test: string } {
    const { rule } = step;
    if (rule.kind === "nonempty") {
        // "While Hovered or selected has nodes": the reference sits inside the preset's words.
        const of = referenceOf(rule);
        return of === undefined
            ? { value: WHILE, test: "" }
            : { value: "While", test: `${referenceWords(session, of)} has nodes` };
    }
    if (isRelative(rule)) {
        return { value: relativeName(rule), test: referenceWords(session, referenceOf(rule)) };
    }
    const plain = testlessName(rule);
    if (plain !== undefined) {
        return { value: plain, test: "" };
    }
    if (rule.kind === "measure") {
        const descriptor = session.catalog.algorithms().find((each) => each.key === rule.algorithm);
        const method = descriptor === undefined ? rule.algorithm : wordsFor(descriptor).name;
        const field = descriptor?.fields.filter((each) => each.kind === side) ?? [];
        const named =
            field.length > 1
                ? `${method}: ${field.find((each) => each.name === rule.field)?.plainName ?? rule.field}`
                : method;
        const { card } = stepCard(session, step, reading, side);
        return { value: named, test: card === null ? "" : testWords(cardWords(session, card), "") };
    }
    if (rule.kind === "degree") {
        // A tier 4 degree leaf, read as the Degree value it is (a converted card is named by it).
        return { value: "Degree", test: boundsWords(rule.min, rule.max) };
    }
    const { card, field } = stepCard(session, step, undefined, side);
    if (card === null) {
        return { value: "Rule", test: "" };
    }
    const name = field?.name ?? "";
    return { value: name, test: testWords(cardWords(session, card), name) };
}

/**
 * Whether a step's Links condition has a test set, so it can leave an edge out: untouched, every
 * edge with a value passes, and the step is tagged with nothing (ws-polish 3).
 * @param session - the element's session.
 * @param links - the condition.
 * @returns true when its test is set.
 */
export function linksTested(session: GraphSession, links: RuleTree): boolean {
    const card = cardOf(session, links, cardFields(session, "edge"), 0);
    // A test with no short words (text, a date) is taken as set.
    return !("field" in card) || shortTest(session, card) !== "";
}

/**
 * A step's Links condition in words: the edge value and its short test.
 * @param session - the element's session.
 * @param links - the condition.
 * @returns the words.
 */
export function linksSaid(session: GraphSession, links: RuleTree): string {
    const card = cardOf(session, links, cardFields(session, "edge"), 0);
    if (!("field" in card)) {
        return "a rule";
    }
    return [card.field.name, shortTest(session, card) ?? ""].filter((each) => each !== "").join(" ");
}

/**
 * A step as its outline row says it (spec 3.1): the value, the short test in the Min and Max
 * boxes' words ("min 10", "3 to 7", "top 10") or a summary of the values ("1, 3 and 2,083 more"),
 * and a tag per setting that is not its default ("So far", "Either end").
 * @param session - the element's session.
 * @param step - the step.
 * @param side - the selection's side.
 * @param reading - the step's reading.
 * @returns the value, the test and the tags.
 */
export function rowWords(
    session: GraphSession,
    step: UnionStep,
    side: Side,
    reading?: StepReading,
): { value: string; test: string; tags: string[]; more?: string; moreShort?: string } {
    const words = ruleStepWords(session, step, side, reading);
    const tags = [
        ...(step.computedOn === "so-far" ? ["So far"] : []),
        ...(step.links === undefined || !linksTested(session, step.links)
            ? []
            : [`Edges: ${linksSaid(session, step.links)}`]),
        ...(step.ends === "either" ? ["Either end"] : []),
    ];
    if (isRelative(step.rule) || step.rule.kind === "member" || STRUCTURE[step.rule.kind] !== undefined) {
        return { ...words, tags };
    }
    const { card } = stepCard(session, step, reading, side);
    const short = card === null ? undefined : shortTest(session, card);
    // An untouched test (text, a date) says nothing in the row: its state word already says No test.
    const untouched =
        reading?.reason?.code === "test-unset" ||
        (card?.type === "text" && card.match !== "list" && card.text.trim() === "");
    // A long list of values is drawn as its first names and "and N more", which is never cut short.
    const many =
        card?.type === "category" && card.match === "values" ? valuesParts(categoryNames(session, card)) : null;
    if (many !== null && many.more > MANY_NAMED) {
        // A long list is its count alone: two names of 1,898 say little and cost the value its width.
        // Drawn short ("1.9k values"), so the value keeps its name in a narrow row; said in full
        // (ws-polish 3).
        return {
            value: words.value,
            test: "",
            more: `${formatNumber(many.more + 2)} values`,
            moreShort: `${compactCount(many.more + 2)} values`,
            tags,
        };
    }
    if (many !== null && many.more > 0) {
        return { value: words.value, test: many.listed, more: `and ${formatNumber(many.more)} more`, tags };
    }
    return { value: words.value, test: short ?? (untouched ? "" : words.test), tags };
}

/**
 * A row's whole test: its words and its "and N more" (or "1,898 values"), as one string.
 * @param words - the row's words.
 * @param words.test - its test.
 * @param words.more - its count of values left out, if any.
 * @returns the test.
 */
export const rowTest = (words: { readonly test: string; readonly more?: string }): string =>
    [words.test, words.more ?? ""].filter((each) => each !== "").join(" ");

/** The most values left out after the two a row names; a longer list is said as its count. */
const MANY_NAMED = 7;

/**
 * A number or category test in a row's short words, or undefined for any other card.
 * @param session - the element's session.
 * @param card - the card.
 * @returns the words.
 */
function shortTest(session: GraphSession, card: Card): string | undefined {
    if (card.type === "number" && card.match === "top") {
        if (card.top === undefined) {
            return "";
        }
        return `${card.from === "low" ? "bottom" : "top"} ${formatNumber(card.top)}${card.percent === true ? "%" : ""}`;
    }
    if (card.type === "number" && card.match === "range") {
        return boundsWords(card.min, card.max);
    }
    if (card.type === "category" && card.match === "values") {
        return valuesWords(categoryNames(session, card));
    }
    return undefined;
}

/**
 * Two bounds in the Min and Max boxes' words: "3 to 7", "min 3", "max 7", or "".
 * @param min - the lower bound.
 * @param max - the upper bound.
 * @returns the words.
 */
function boundsWords(min: number | undefined, max: number | undefined): string {
    if (min !== undefined && max !== undefined) {
        return `${formatNumber(min)} to ${formatNumber(max)}`;
    }
    if (min !== undefined) {
        return `min ${formatNumber(min)}`;
    }
    return max === undefined ? "" : `max ${formatNumber(max)}`;
}

/**
 * A category test's values by name, in natural order, "(no value)" last.
 * @param session - the element's session.
 * @param card - the category card.
 * @returns the names.
 */
function categoryNames(session: GraphSession, card: Extract<Card, { type: "category" }>): string[] {
    return [
        ...card.values.map((value) => valueName(session, card.field.path, value)).sort(NATURAL.compare),
        ...(card.gaps ? ["(no value)"] : []),
    ];
}

/**
 * {@link valuesWords} in two parts: the names listed and how many more.
 * @param names - the values' names, in order.
 * @returns the listed names and the count left out.
 */
function valuesParts(names: readonly string[]): { listed: string; more: number } {
    return names.length <= 3
        ? { listed: names.join(", "), more: 0 }
        : { listed: names.slice(0, 2).join(", "), more: names.length - 2 };
}

/**
 * Up to three values in full ("1, 3, 4"), else the first two and how many more ("1, 3 and 2,083
 * more"): a row never lists every value.
 * @param names - the values' names, in order.
 * @returns the words.
 */
export function valuesWords(names: readonly string[]): string {
    if (names.length <= 3) {
        return names.join(", ");
    }
    return `${names.slice(0, 2).join(", ")} and ${formatNumber(names.length - 2)} more`;
}

/**
 * A card's words without its field's name in front: "6 to 10" from "Degree 6 to 10".
 * @param words - the card's words.
 * @param name - the field's name.
 * @returns the test's words.
 */
function testWords(words: string, name: string): string {
    const head = [`${name}: `, `${name} `].find((each) => name !== "" && words.startsWith(each));
    return head === undefined ? words : words.slice(head.length);
}

/**
 * A selection as one line, said as its rows say each step: "Degree 10 or more, keep Isolated or
 * Within 1 hop of Valjean". A group starting with nothing reads its first Add as the step itself.
 * One words function for a filter card's name, its remove, its undo step and its rows.
 * @param session - the element's session.
 * @param rule - the selection.
 * @returns the words.
 */
export function selectionWords(session: GraphSession, rule: UnionLeaf): string {
    const side: Side = rule.side === "nodes" ? "node" : "edge";
    const groups = rule.branches.map((branch) =>
        branch.steps
            .map((step, at) => {
                const { value, test } = stepWords(session, step, side);
                const words = test === "" ? value : `${value} ${test}`;
                // A narrowing step says no verb; a group's first Add is the step itself.
                return step.op === "keep" || (at === 0 && branch.start !== "all" && step.op === "add")
                    ? words
                    : `${VERB_WORDS[step.op].word.toLowerCase()} ${words}`;
            })
            .join(", "),
    );
    return groups.filter((each) => each !== "").join(" or ") || "a selection";
}

/** Two bounds as the Min and Max boxes say them ("8 to 36"), and nothing else. */
const RANGE = /^(-?[\d.,]+) to (-?[\d.,]+)$/u;

/** A lower bound alone, as the Min box says it ("min 3"). */
const LOWER = /^min (-?[\d.,]+)$/u;

/** The most values a summary lists before it says how many more ("+3"). */
const SUMMARY_NAMED = 6;

/**
 * A category step's values as a summary lists them: every value up to {@link SUMMARY_NAMED}, else
 * the first ones and "+N"; and when every value is a shared word and a number ("Group 1", "Group
 * 4"), only the numbers ("1, 4").
 * @param names - the values' names, in order.
 * @returns the words.
 */
export function summaryValues(names: readonly string[]): string {
    const numbered = names.map((name) => /^(.*\S)\s+(\d+)$/u.exec(name));
    const head = numbered[0]?.[1];
    const shared = numbered.every((each) => each !== null && each[1] === head);
    const shown = shared ? numbered.map((each) => each?.[2] ?? "") : [...names];
    if (shown.length <= SUMMARY_NAMED) {
        return shown.join(", ");
    }
    const listed = SUMMARY_NAMED - 1;
    return `${shown.slice(0, listed).join(", ")} +${formatNumber(shown.length - listed)}`;
}

/**
 * The value a summary names a step by: an algorithm by its name alone when the step reads its
 * first field ("Louvain", not "Louvain: Community"), anything else as its row names it.
 * @param session - the element's session.
 * @param step - the step.
 * @param side - the selection's side.
 * @param value - the row's value.
 * @returns the value.
 */
function summaryValue(session: GraphSession, step: UnionStep, side: Side, value: string): string {
    if (step.rule.kind !== "measure") {
        return value;
    }
    const { algorithm, field } = step.rule;
    const descriptor = session.catalog.algorithms().find((each) => each.key === algorithm);
    const first = descriptor?.fields.find(
        (each) => each.kind === side && each.type !== "table" && each.name !== "rank" && each.name !== "percentile",
    );
    const at = value.indexOf(": ");
    return first?.name === field && at > 0 ? value.slice(0, at) : value;
}

/**
 * The workspace's cards as one structured line, never a sentence: each step as its value and its
 * test, "; " between steps and cards, ", " between values, "-" for a range, "3+" for a lower bound
 * alone, and "except" only before a step that removes: "Louvain 1, 4, 5, 7; Degree 8-36; except
 * Isolated". What a filter is called until the reader names it, and what a selection says at rest.
 * @param session - the element's session.
 * @param rule - the selection.
 * @param reading - its reading, which an algorithm's test is said from.
 * @returns the words, or "" for cards with no value yet.
 */
export function cardsWords(session: GraphSession, rule: UnionLeaf, reading?: StepsReading): string {
    const side: Side = rule.side === "nodes" ? "node" : "edge";
    const read = reading?.branches.flatMap((each) => each.steps) ?? [];
    return rule.branches
        .flatMap((branch) => branch.steps)
        .map((step) => {
            const stepReading = read.find((each) => each.id === step.id);
            const words = rowWords(session, step, side, stepReading);
            const plain =
                isRelative(step.rule) || step.rule.kind === "member" || STRUCTURE[step.rule.kind] !== undefined;
            const { card } = plain ? { card: null } : stepCard(session, step, stepReading, side);
            const test =
                card?.type === "category" && card.match === "values" && rowTest(words) !== ""
                    ? summaryValues(categoryNames(session, card))
                    : rowTest(words).replace(RANGE, "$1-$2").replace(LOWER, "$1+");
            const said = [summaryValue(session, step, side, words.value), test].filter((each) => each !== "").join(" ");
            return step.op === "except" ? `${VERB_WORDS.except.word.toLowerCase()} ${said}` : said;
        })
        .filter((each) => each !== "")
        .join("; ");
}
