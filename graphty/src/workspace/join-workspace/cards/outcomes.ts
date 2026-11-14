/**
 * The join cards' answers to "what does each row become?": fields on a node, an edge, a node with
 * edges, or links by a shared value. Each answer is one graphty-element join shape; this file
 * names the answers, builds a card's starting choices from the element's own suggestion for the
 * answer picked, and words a card's title, summary and counts. Every count and match comes from
 * the element's recipe draft.
 */

import type {
    JoinChoices,
    JoinInput,
    JoinKey,
    JoinReduce,
    JoinReport,
    JoinRowFate,
    JoinsDraft,
    JoinShape,
    JoinStepEntry,
    JoinStepOutcome,
    JoinSuggestion,
} from "@graphty/graphty-element/session";

/** What each row of a card's table becomes. */
export type Outcome = "fields" | "edge" | "node" | "links";

/** One answer: its words, the word in a card's title, and the element shape it asks for. */
export interface OutcomeInfo {
    readonly value: Outcome;
    readonly label: string;
    readonly word: string;
    readonly shape: JoinShape;
}

/** The answers, in the order a card lists them. */
export const OUTCOMES: readonly OutcomeInfo[] = [
    { value: "fields", label: "Fields on a node", word: "fields", shape: "node-values" },
    { value: "edge", label: "An edge", word: "edges", shape: "edges" },
    { value: "node", label: "A node with edges", word: "nodes", shape: "row-nodes" },
    { value: "links", label: "Links by shared value", word: "links", shape: "link" },
];

/** Each answer's info. */
export const OUTCOME_BY_ID: Readonly<Record<Outcome, OutcomeInfo>> = Object.fromEntries(
    OUTCOMES.map((each) => [each.value, each]),
) as Record<Outcome, OutcomeInfo>;

/**
 * The answer a step's choices read as.
 * @param choices - the step's choices.
 * @returns the answer.
 */
export function outcomeOf(choices: JoinChoices): Outcome {
    switch (choices.shape) {
        case "edges":
            return "edge";
        case "row-nodes":
            return "node";
        case "link":
            return "links";
        default:
            return "fields";
    }
}

/** The shapes a card's answers ask for: what the element's guess chooses among. */
export const OUTCOME_SHAPES: readonly JoinShape[] = OUTCOMES.map((each) => each.shape);

/**
 * The answer graphty-element's suggestion reads as: the one a card tags "suggested". Ask the
 * element with `draft.suggest(from, before, { among: OUTCOME_SHAPES })`, so any of the four can be
 * the guess.
 * @param suggestion - the element's suggestion for the card's table.
 * @returns the answer, or undefined when the suggestion names no key.
 */
export function guessOf(suggestion: JoinSuggestion): Outcome | undefined {
    if (suggestion.keys.length === 0) {
        return undefined;
    }
    switch (suggestion.shape) {
        case "edges":
            return "edge";
        case "row-nodes":
            return "node";
        case "link":
            return "links";
        case "node-values":
        case "merge":
            return "fields";
        default:
            return undefined;
    }
}

/**
 * An edges card's "Per pair": one edge per pair of ends, carrying how many rows named it.
 * @param keys - the card's keys; the first is the source end.
 * @returns the choices that make it.
 */
export function perPair(keys: readonly JoinKey[]): Pick<JoinChoices, "aggregate" | "names"> {
    const first = keys[0]?.file;
    return first === undefined ? {} : { aggregate: { [first]: "count" }, names: { [`${first} (count)`]: "count" } };
}

/**
 * A Fields card's "List": every row's value of each brought column, as a list on every node.
 * @param columns - the brought columns.
 * @returns the reductions.
 */
export function listOf(columns: readonly string[]): Readonly<Record<string, JoinReduce>> {
    return Object.fromEntries(columns.map((column) => [column, "list"]));
}

/**
 * A Fields card's "Count": how many rows name each node, written as `<table> count`.
 * @param key - the key column.
 * @param from - the table's name.
 * @returns the choices that make it.
 */
export function countOf(key: string, from: string): Pick<JoinChoices, "aggregate" | "names" | "columns"> {
    return { aggregate: { [key]: "count" }, names: { [`${key} (count)`]: `${from} count` }, columns: [] };
}

/**
 * An input's name, its file extension dropped.
 * @param inputs - the draft's inputs.
 * @param key - the input's key.
 * @returns the name.
 */
export function inputName(inputs: readonly JoinInput[], key: string | undefined): string {
    const found = inputs.find((each) => each.key === key);
    return (found?.name ?? key ?? "").replace(/\.(csv|tsv|txt|json|graphml|gml)$/i, "");
}

/**
 * The choices a card starts with once its answer is picked: graphty-element's suggestion for that
 * shape (`draft.suggest(from, before, { shape })`), the matches prefilled from it.
 * @param outcome - the answer picked.
 * @param draft - the recipe.
 * @param from - the card's input.
 * @param before - the card's step, to suggest against the graph before it.
 * @returns the choices.
 */
export function choicesFor(outcome: Outcome, draft: JoinsDraft, from: string, before?: string): JoinChoices {
    const { shape } = OUTCOME_BY_ID[outcome];
    const suggestion = draft.suggest(from, before, { shape });
    switch (outcome) {
        case "edge": {
            const keys = suggestion.keys.slice(0, 2);
            return { shape, keys, ...perPair(keys) };
        }
        case "node":
            return {
                shape,
                keys: suggestion.keys,
                rowNode: { ...suggestion.rowNode, kind: inputName(draft.inputs, from) },
            };
        case "links":
            return { shape, keys: suggestion.keys.slice(0, 1), link: suggestion.link ?? { columns: [] } };
        default:
            return { shape, keys: suggestion.keys.slice(0, 1) };
    }
}

/**
 * Whether a key is "new from values": a named column with nothing to match, whose values become
 * nodes of their own kind.
 * @param key - the key.
 * @returns true for such a key.
 */
export function isNewKey(key: JoinKey | undefined): boolean {
    return key?.unknown === "add" && key.kind === key.file;
}

/**
 * A graph value's name: "id" or the column.
 * @param path - `"id"` or `"data.<column>"`.
 * @returns the name.
 */
export function pathName(path: string): string {
    return path.startsWith("data.") ? path.slice("data.".length) : path;
}

/**
 * A card's title without its number: its table and what each row becomes.
 * @param step - the step, or just its input for a card with no answer yet.
 * @param inputs - the draft's inputs.
 * @returns the title.
 */
export function cardTitle(
    step: Pick<JoinStepEntry, "from"> & { choices?: JoinChoices },
    inputs: readonly JoinInput[],
): string {
    const word = step.choices === undefined ? "?" : OUTCOME_BY_ID[outcomeOf(step.choices)].word;
    return `${inputName(inputs, step.from)} -> ${word}`;
}

/**
 * A card's matches as one line: "person_id = id, building_id = id".
 * @param choices - the step's choices.
 * @returns the line.
 */
export function matchLine(choices: JoinChoices): string {
    const keys = choices.keys.map((key) =>
        isNewKey(key) ? `${key.file} new` : `${key.file} = ${pathName(key.graph)}`,
    );
    const shared = choices.shape === "link" ? (choices.link?.columns ?? []) : [];
    return [...keys, ...(shared.length > 0 ? [`shared ${shared.join(", ")}`] : [])].join(", ");
}

/**
 * A card's counts, as short chips for its header.
 * @param outcome - the card's answer.
 * @param report - its step's report.
 * @param draft - the recipe.
 * @param id - the step.
 * @returns the chips' words.
 */
export function summaryChips(outcome: Outcome, report: JoinReport, draft: JoinsDraft, id: string): readonly string[] {
    const plus = (count: number, unit: string): string[] => (count > 0 ? [`+${String(count)} ${unit}`] : []);
    switch (outcome) {
        case "edge":
            return [
                `+${String(report.newEdges)} e`,
                ...plus(report.newNodes, "n"),
                ...((report.edgesMerged ?? 0) > 0 ? [`${String(report.edgesMerged)} merged`] : []),
            ];
        case "node":
            return [`+${String(report.newNodes)} n`, `+${String(report.newEdges)} e`];
        case "links":
            return [`+${String(report.newEdges)} e`, ...plus(report.newNodes, "n")];
        default: {
            const rows = draft.rows(id, { limit: 0 }).total;
            const used = rows - draft.rows(id, { fate: "left-out", limit: 0 }).total;
            return [`${String(used)} / ${String(rows)} rows`, ...plus(report.newNodes, "n")];
        }
    }
}

/** The order fate chips are drawn in. */
export const FATE_ORDER: readonly JoinRowFate[] = [
    "joined",
    "merged",
    "linked",
    "new-end",
    "repeat",
    "left-out",
    "over-cap",
];

/** The fates that ask the reader to look. */
export const WARN_FATES: ReadonlySet<JoinRowFate> = new Set(["left-out", "over-cap"]);

/**
 * How many rows the step reads of each fate, from the element's paged rows.
 * @param draft - the recipe.
 * @param id - the step.
 * @returns the fates with at least one row, in drawing order.
 */
export function fateCounts(draft: JoinsDraft, id: string): readonly { fate: JoinRowFate; rows: number }[] {
    return FATE_ORDER.map((fate) => ({ fate, rows: draft.rows(id, { fate, limit: 0 }).total })).filter(
        (each) => each.rows > 0,
    );
}

/**
 * A row fate's word on a card, with a comparison's words for its own fates.
 * @param fate - the fate.
 * @param choices - the step's choices.
 * @param from - the step's input name.
 * @returns the word.
 */
export function fateWord(fate: JoinRowFate, choices: JoinChoices, from: string): string {
    if (choices.shape === "merge") {
        if (fate === "new-end") {
            return choices.compare === true ? `only ${from}` : "new";
        }
        if (fate === "merged") {
            return choices.compare === true ? "both" : "matched";
        }
    }
    const words: Readonly<Record<JoinRowFate, string>> = {
        joined: "matched",
        "new-end": choices.shape === "node-values" ? "new" : "new end",
        repeat: "repeat",
        "left-out": "left out",
        merged: "merged",
        linked: "linked",
        "over-cap": "over cap",
    };
    return words[fate];
}

/**
 * Why a step cannot run, in a few words, from the element's error code and details.
 * @param outcome - the step's outcome.
 * @returns the words.
 */
export function errorWords(outcome: JoinStepOutcome): string {
    const { error } = outcome;
    if (error === undefined) {
        return "";
    }
    const { reason } = error.details;
    if (error.code === "E_SOURCE_UNKNOWN") {
        return "missing input";
    }
    if (reason === "unknown-column") {
        return `no column ${String(error.details.column)}`;
    }
    if (reason === "keys") {
        return "pick matches";
    }
    if (reason === "link") {
        return "pick shared";
    }
    return typeof reason === "string" ? reason : error.code;
}
