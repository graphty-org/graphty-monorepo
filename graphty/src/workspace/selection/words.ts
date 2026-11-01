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
import { GLYPHS } from "../glyphs";
import { cardWords, type Side } from "../style/cards";
import { letterOf, type Verb } from "./model";
import { isRelative, referenceOf, stepCard } from "./values";

/** A verb's word, Figma's name for it, the words a search finds it by, and its glyph. */
export const VERB_WORDS: Readonly<
    Record<Verb, { word: string; figma: string; aliases: readonly string[]; glyph: (typeof GLYPHS)["union"] }>
> = {
    add: { word: "Add", figma: "Union", aliases: ["union", "or"], glyph: GLYPHS.union },
    except: { word: "Except", figma: "Subtract", aliases: ["subtract", "remove", "minus"], glyph: GLYPHS.subtract },
    keep: { word: "Keep", figma: "Intersect", aliases: ["intersect", "only", "and"], glyph: GLYPHS.intersect },
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

export { letterOf };

/** A reason's short word on a step's row, and its whole words in the row's tooltip. */
const REASONS: Readonly<Record<StepReasonCode, { short: string; long: string }>> = {
    "test-unset": { short: "No test", long: "No test yet: this step changes nothing" },
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
        return `Selected (${String(session.selection.nodes.length)})`;
    }
    if (typeof reference === "object" && "set" in reference) {
        return session.sets.get(reference.set)?.name ?? "A set";
    }
    if (typeof reference === "object" && "nodes" in reference) {
        return reference.nodes.length === 1 ? String(reference.nodes[0]) : `${String(reference.nodes.length)} nodes`;
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
            return rule.max === 0 ? "Is in" : `Within ${String(rule.max)} ${rule.max === 1 ? "hop" : "hops"} of`;
        case "touching":
            return { either: "Edges touching", both: "Edges within", one: "Edges leaving" }[rule.ends];
        case "nonempty":
            return "While has nodes";
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
        return { value: "While", test: of === undefined ? "" : `${referenceWords(session, of)} has nodes` };
    }
    if (isRelative(rule)) {
        return { value: relativeName(rule), test: referenceWords(session, referenceOf(rule)) };
    }
    const structure = STRUCTURE[rule.kind];
    if (structure !== undefined) {
        return { value: structure, test: "" };
    }
    if (rule.kind === "member" && rule.of === "largest-component") {
        return { value: "Largest component", test: "" };
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
    const { card, field } = stepCard(session, step, undefined, side);
    if (card === null) {
        return { value: "Rule", test: "" };
    }
    const name = field?.name ?? "";
    return { value: name, test: testWords(cardWords(session, card), name) };
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
 * A selection folded to one line of chips, the same in both hosts: per step its verb's glyph (none
 * for a None group's first Add, which only says what the group holds), its value and its short
 * test, the group's letter first when there are several; each chip's tooltip says it in full. An off
 * step (or a step of an off group) says "off" and is drawn as its row is.
 * @param session - the element's session.
 * @param side - nodes or edges.
 * @param reading - the element's reading of the selection.
 * @returns the chips, each with its key, its spoken words and its parts.
 */
export function summaryChips(
    session: GraphSession,
    side: Side,
    reading: StepsReading,
): { key: string; spoken: string; letter: string; glyph: Verb | null; text: string; off: boolean }[] {
    // The element's canonical rule: every step has its id.
    const { rule } = reading;
    const multi = rule.branches.length > 1;
    return rule.branches.flatMap((branch, at) =>
        branch.steps.map((step, index) => {
            const read = reading.branches[at]?.steps.find((each) => each.id === step.id);
            const words = stepWords(session, step, side, read);
            const state =
                read?.state === "inert" || read?.state === "pending" ? reasonWords(read.reason).short : words.test;
            const letter = multi ? `${branch.name ?? letterOf(at)}: ` : "";
            const plain = index === 0 && step.op === "add" && branch.start === "none";
            const text = `${words.value}${state === "" ? "" : ` ${state}`}`;
            // An off step, or a step of an off group, is drawn and said as its row is.
            const off = step.on === false || branch.on === false;
            return {
                key: step.id ?? "",
                spoken: `${letter}${VERB_WORDS[step.op].word} ${text}${off ? ", off" : ""}`,
                letter,
                glyph: plain ? null : step.op,
                text,
                off,
            };
        }),
    );
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
                return at === 0 && branch.start !== "all" && step.op === "add"
                    ? words
                    : `${VERB_WORDS[step.op].word.toLowerCase()} ${words}`;
            })
            .join(", "),
    );
    return groups.filter((each) => each !== "").join(" or ") || "a selection";
}
