/**
 * The recipe's intents: what each "+ Step" tile asks graphty-element to do, as the join choices it
 * hands over, and how a step's choices read back as one of them. Every count and match comes from
 * the element's recipe draft; this file only names things and builds choices from the element's
 * own suggestion.
 */

import type {
    JoinChoices,
    JoinInput,
    JoinKey,
    JoinReport,
    JoinRowFate,
    JoinsDraft,
    JoinStepEntry,
    JoinStepOutcome,
} from "@graphty/graphty-element/session";

import { GLYPHS } from "../../glyphs";

/** One intent of the recipe. */
export type JoinOp = "values" | "edges" | "link" | "map" | "merge" | "compare" | "flag" | "kind" | "split";

/** One tile of "+ Step": its intent, words, glyph and key. */
export interface OpTile {
    readonly op: JoinOp;
    readonly label: string;
    readonly glyph: keyof typeof GLYPHS;
    readonly key: string;
    /** Drawn small, in the row under the six. */
    readonly small?: boolean;
}

/** The tiles, in the order "+ Step" draws them; their keys are 1 to 9. */
export const OP_TILES: readonly OpTile[] = [
    { op: "values", label: "Put values on nodes", glyph: "tags", key: "1" },
    { op: "edges", label: "Turn rows into edges", glyph: "edge", key: "2" },
    { op: "link", label: "Link by shared value", glyph: "link", key: "3" },
    { op: "map", label: "Map ids through a table", glyph: "go", key: "4" },
    { op: "merge", label: "Merge on a key", glyph: "joined", key: "5" },
    { op: "compare", label: "Compare two graphs", glyph: "intersect", key: "6" },
    { op: "flag", label: "Flag from a list", glyph: "pin", key: "7", small: true },
    { op: "kind", label: "Column to node kind", glyph: "category", key: "8", small: true },
    { op: "split", label: "Split a list", glyph: "several", key: "9", small: true },
];

/** Each intent's tile. */
export const OP_BY_ID: Readonly<Record<JoinOp, OpTile>> = Object.fromEntries(
    OP_TILES.map((tile) => [tile.op, tile]),
) as Record<JoinOp, OpTile>;

/** The separator a split starts with. */
export const DEFAULT_SEPARATOR = ";";

/** The node's own id, as a loaded source's records name it. */
const ID_KEY: JoinKey = { file: "id", graph: "id" };

/**
 * The intent a step's choices read as.
 * @param choices - the step's choices.
 * @returns the intent.
 */
export function opOf(choices: JoinChoices): JoinOp {
    const [first, second] = choices.keys;
    const own = first?.file === "id" && first.graph === "id";
    switch (choices.shape) {
        case "merge":
            return choices.compare === true ? "compare" : "merge";
        case "link":
            return "link";
        case "edges":
            if (own && choices.kindIds === "scoped") {
                return second !== undefined && choices.split?.[second.file] !== undefined ? "split" : "kind";
            }
            return "edges";
        default:
            if (choices.flag !== undefined) {
                return "flag";
            }
            if (choices.via !== undefined || choices.lookup !== undefined) {
                return "map";
            }
            return own && choices.split !== undefined ? "split" : "values";
    }
}

/**
 * The input a new step of an intent reads first: one no step reads yet, a held table for the
 * intents that read a table, a loaded source for those that read a source's own columns.
 * @param op - the intent.
 * @param inputs - the draft's inputs.
 * @param steps - the steps so far.
 * @returns the input's key, or undefined when there is none.
 */
export function startInput(
    op: JoinOp,
    inputs: readonly JoinInput[],
    steps: readonly JoinStepEntry[],
): string | undefined {
    const used = new Set(steps.map((step) => step.from));
    const own = op === "kind" || op === "split";
    const fits = inputs.filter((input) => input.held !== own);
    const pool = fits.length > 0 ? fits : inputs;
    return (pool.find((input) => !used.has(input.key)) ?? pool.at(-1))?.key;
}

/**
 * The first column of an input that is not its own id.
 * @param input - the input.
 * @returns the column, or undefined.
 */
function ownColumn(input: JoinInput | undefined): string | undefined {
    return input?.columns.find((column) => column !== "id");
}

/**
 * The choices a new step of an intent starts with: the element's suggestion for its input, read
 * as that intent.
 * @param op - the intent.
 * @param draft - the recipe.
 * @param from - the input.
 * @param before - a step: suggest against the graph before it.
 * @returns the choices.
 */
export function startChoices(op: JoinOp, draft: JoinsDraft, from: string, before?: string): JoinChoices {
    const input = draft.inputs.find((each) => each.key === from);
    const column = ownColumn(input) ?? "id";
    if (op === "kind") {
        return {
            shape: "edges",
            keys: [ID_KEY, { file: column, graph: "id" }],
            endKinds: { target: column },
            kindIds: "scoped",
        };
    }
    if (op === "split") {
        return {
            shape: "node-values",
            keys: [ID_KEY],
            columns: [column],
            split: { [column]: DEFAULT_SEPARATOR },
            clash: { [column]: "overwrite" },
        };
    }
    const suggestion = draft.suggest(from, before);
    const key: JoinKey = suggestion.keys[0] ?? { file: input?.columns[0] ?? "id", graph: "id" };
    // A second graph's nodes name themselves by id, as the graph's do.
    const mergeKey = input?.columns.includes("id") === true ? ID_KEY : key;
    switch (op) {
        case "edges":
            return {
                shape: "edges",
                keys:
                    suggestion.shape === "edges"
                        ? suggestion.keys
                        : [key, { file: input?.columns.find((each) => each !== key.file) ?? key.file, graph: "id" }],
            };
        case "link":
            return { shape: "link", keys: [key], link: suggestion.link ?? { columns: [] } };
        case "map": {
            const via = draft.inputs.find((each) => each.key !== from && each.held);
            // The column the mapping table also names is the one it translates.
            const named = input?.columns.find((each) => via?.columns.includes(each));
            return {
                shape: "node-values",
                keys: [{ file: named ?? key.file, graph: "id" }],
                ...(via === undefined ? {} : { via: via.key }),
            };
        }
        case "merge":
            return { shape: "merge", keys: [mergeKey] };
        case "compare":
            return { shape: "merge", compare: true, keys: [mergeKey] };
        case "flag":
            return {
                shape: "node-values",
                keys: [key],
                columns: [],
                flag: `on_${(input?.name ?? from).replace(/\.[a-z]+$/i, "")}`,
            };
        default:
            return {
                shape: suggestion.shape === "edge-values" ? "edge-values" : "node-values",
                keys: [key],
            };
    }
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
 * A graph value's name: "id" or the column.
 * @param path - `"id"` or `"data.<column>"`.
 * @returns the name.
 */
export function pathName(path: string): string {
    return path.startsWith("data.") ? path.slice("data.".length) : path;
}

/**
 * A step's title on its card.
 * @param step - the step.
 * @param inputs - the draft's inputs.
 * @returns the title.
 */
export function stepTitle(step: JoinStepEntry, inputs: readonly JoinInput[]): string {
    const { choices } = step;
    const from = inputName(inputs, step.from);
    const [first, second] = choices.keys;
    switch (opOf(choices)) {
        case "edges":
            return `${from}: ${first?.file ?? "-"} - ${second?.file ?? "-"}`;
        case "kind":
            return `${from}: ${choices.endKinds?.target ?? second?.file ?? "-"}`;
        case "split":
            return `${choices.columns?.[0] ?? second?.file ?? "-"} in ${from}`;
        case "link":
            return `${from}: ${(choices.link?.columns ?? []).join(", ") || "-"}`;
        case "map":
            return `${from} via ${inputName(inputs, choices.via) || "-"}`;
        case "flag":
            return `${from}: ${choices.flag ?? "-"}`;
        default:
            return `${from} on ${first === undefined ? "-" : pathName(first.graph)}`;
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
 * A row fate's word on a step's card: a merge's or a comparison's words for its own fates.
 * @param fate - the fate.
 * @param op - the step's intent.
 * @param from - the step's input name.
 * @returns the word.
 */
export function fateWord(fate: JoinRowFate, op: JoinOp, from: string): string {
    if (op === "merge" || op === "compare") {
        if (fate === "new-end") {
            return `only ${from}`;
        }
        if (fate === "merged") {
            return op === "compare" ? "both" : "merged";
        }
        if (fate === "left-out") {
            return "dropped";
        }
    }
    const words: Readonly<Record<JoinRowFate, string>> = {
        joined: "matched",
        "new-end": "new end",
        repeat: "repeat",
        "left-out": "left out",
        merged: "merged",
        linked: "linked",
        "over-cap": "over cap",
    };
    return words[fate];
}

/**
 * How many things a step's conflicts review lists: clashing values of columns with no rule chosen, repeated keys, unmapped keys,
 * rows matching many elements and values shared too widely.
 * @param draft - the recipe.
 * @param id - the step.
 * @param report - its report.
 * @returns the count.
 */
export function conflictCount(draft: JoinsDraft, id: string, report: JoinReport): number {
    // A column the reader gave a rule is settled: its clashes no longer count.
    const choices = draft.steps.find((step) => step.id === id)?.choices;
    const settled = new Set([...Object.keys(choices?.clash ?? {}), ...Object.keys(choices?.fuse ?? {})]);
    // A comparison writes a clashing column side by side by design: nothing to settle.
    const open = choices?.compare === true ? [] : report.clashes.filter((each) => !settled.has(each.column));
    const clashes = open.reduce((sum, each) => sum + draft.clashes(id, each.column, { limit: 0 }).total, 0);
    return clashes + report.repeatedKeys + report.unmapped + report.fanOut + report.valuesOverCap;
}

/**
 * A step's counts on its card's header, as short chips.
 * @param op - the step's intent.
 * @param report - its report.
 * @param draft - the recipe.
 * @param id - the step.
 * @returns the chips' words.
 */
export function summaryChips(op: JoinOp, report: JoinReport, draft: JoinsDraft, id: string): readonly string[] {
    const plus = (count: number, unit: string): string[] => (count > 0 ? [`+${String(count)} ${unit}`] : []);
    switch (op) {
        case "edges":
        case "kind":
        case "link":
            return [`+${String(report.newEdges)} e`, ...plus(report.newNodes, "n")];
        case "merge":
            return [`${String(report.merged)} merged`, ...plus(report.newNodes, "n")];
        case "compare": {
            const regions = report.regions?.nodes;
            return regions === undefined
                ? []
                : [`${String(regions["only-onto"])} | ${String(regions.both)} | ${String(regions["only-from"])}`];
        }
        default: {
            if (op === "split" && report.newEdges > 0) {
                return [`+${String(report.newEdges)} e`, ...plus(report.newNodes, "n")];
            }
            const rows = draft.rows(id, { limit: 0 }).total;
            const joined = draft.rows(id, { fate: "joined", limit: 0 }).total;
            return [`${String(joined)} / ${String(rows)} rows`];
        }
    }
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
        return "pick keys";
    }
    if (reason === "link") {
        return "pick shared columns";
    }
    return typeof reason === "string" ? reason : error.code;
}
