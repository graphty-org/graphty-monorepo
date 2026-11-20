/**
 * The words of the staged sources and their cards (the source-steps experiment, design
 * design/data/multiple-data-sources-design.md, sections 5.1 and 5.5): every label the reader sees,
 * written here from what graphty-element reports.
 */

import {
    isGraphtyError,
    type SourceCellValue,
    type SourceClashRule,
    type SourceOverlapQuestion,
    type SourceProfileKind,
    type SourceStepCounts,
    type SourceTableMapping,
} from "@graphty/graphty-element/session";

import { sizeWords } from "../data-place/words";
import { formatNumber } from "../inspector/words";
import type { JoinRepeats } from "../state/store";

/** The fixed labels. */
export const STAGED_WORDS = {
    file: "File",
    rowsAre: "Rows are",
    key: "Key",
    space: "Space",
    unset: "unset",
    distinct: "Distinct",
    repeats: "Repeats",
    type: "Type",
    from: "From",
    to: "To",
    meets: "meets",
    add: "Add",
    remove: "Remove",
    merge: "Merge",
    separate: "Keep separate",
    commit: "Commit",
    cancel: "Cancel",
    notChanged: "Not changed",
    notAdded: "Not added",
    notRemoved: "Not removed",
} as const;

/** What a staged source's rows are, as the Rows are control names each choice. */
export const ROWS_ARE: readonly { readonly value: SourceTableMapping["rows"]; readonly label: string }[] = [
    { value: "nodes", label: "Nodes" },
    { value: "edges", label: "Edges" },
    { value: "both", label: "Nodes + edges" },
];

/**
 * The staged section's File line: its size, then its rows.
 * @param size - its size in bytes, when the element knows it.
 * @param rows - its rows, over every table.
 * @returns such as "61 KB, 1,243 rows".
 */
export function fileWords(size: number | undefined, rows: number): string {
    const counted = `${formatNumber(rows)} ${rows === 1 ? "row" : "rows"}`;
    return size === undefined ? counted : `${sizeWords(size)}, ${counted}`;
}

/**
 * The Distinct line.
 * @param distinct - the key column's distinct values.
 * @returns such as "1,240 keys".
 */
export function distinctWords(distinct: number): string {
    return `${formatNumber(distinct)} ${distinct === 1 ? "key" : "keys"}`;
}

/**
 * The Repeats line.
 * @param repeated - keys held by more than one row, and those rows.
 * @param repeated.keys - the keys.
 * @param repeated.rows - the rows holding them.
 * @returns such as "3 keys, 6 rows", or "None".
 */
export function repeatsWords(repeated: { readonly keys: number; readonly rows: number }): string {
    if (repeated.keys === 0) {
        return "None";
    }
    return `${distinctWords(repeated.keys)}, ${formatNumber(repeated.rows)} ${repeated.rows === 1 ? "row" : "rows"}`;
}

/**
 * The key-overlap question: "Same person?", named by the space the keys meet in.
 * @param question - the element's `W_SPACE_OVERLAP`.
 * @returns the question.
 */
export function overlapQuestionWords(question: SourceOverlapQuestion): string {
    return `Same ${question.params.space}?`;
}

/**
 * How many of the source's keys meet nodes already there.
 * @param question - the element's `W_SPACE_OVERLAP`.
 * @returns such as "1 of 2".
 */
export function overlapCountWords(question: SourceOverlapQuestion): string {
    return `${formatNumber(question.params.count)} of ${formatNumber(question.params.of)}`;
}

/**
 * Replace's label, naming the committed source it replaces.
 * @param name - that source's name.
 * @returns such as "Replace people.csv".
 */
export function replaceWords(name: string): string {
    return `Replace ${name}`;
}

/** The Join card's and the Fields tab's labels. */
export const JOIN_WORDS = {
    join: "Join",
    field1: "Field 1",
    field2: "Field 2",
    type: "Type",
    source: "Source",
    field: "Field",
    key: "Key",
    swap: "Swap fields",
    act: "Act",
    edge: "Make an edge",
    merge: "Merge 2 into 1",
    edgeType: "Edge type",
    direction: "Direction",
    oneToTwo: "1->2",
    twoToOne: "2->1",
    ignoreCase: "Ignore case",
    ignoreSpaces: "Ignore spaces",
    fields: "Fields",
    values: "Values",
    value: "Value",
    in1: "In 1",
    in2: "In 2",
    kind: "Kind",
    valid: "Valid",
    empty: "Empty",
    distinct: "Distinct",
    samples: "Samples",
    /** E_STEP_NEEDS_NODES: source 2 holds no node rows, so neither act applies. */
    needsNodes: "No node rows",
} as const;

/** The six live counts of `data.matchCounts`, in the order the card shows them. */
export const COUNT_WORDS = [
    { id: "matched", label: "matched" },
    { id: "only1", label: "only 1" },
    { id: "only2", label: "only 2" },
    { id: "repeated1", label: "repeat in 1" },
    { id: "repeated2", label: "repeat in 2" },
    { id: "textVersusNumber", label: "text vs number" },
] as const;

/** The value-overlap list's filters, as `data.matchValues` takes them. */
export const OVERLAP_FILTERS = [
    { value: "all", label: "All" },
    { value: "matched", label: "Matched" },
    { value: "only1", label: "Only 1" },
    { value: "only2", label: "Only 2" },
] as const;

/** A profile's kind, as the reader reads it. */
export const KIND_WORDS: Readonly<Record<SourceProfileKind, string>> = {
    text: "text",
    number: "number",
    date: "date",
    boolean: "yes / no",
};

/**
 * A value as the card and the Fields tab show it.
 * @param value - the cell.
 * @returns its words; an empty cell reads as nothing.
 */
export function cellWords(value: SourceCellValue): string {
    if (value === null) {
        return "";
    }
    return typeof value === "number" ? formatNumber(value) : String(value);
}

/**
 * The "+n" beside an Ignore switch: how many more keys it would match.
 * @param more - the element's count, null while the switch is on.
 * @returns such as "+1", or null while on.
 */
export function moreWords(more: number | null): string | null {
    return more === null ? null : `+${formatNumber(more)}`;
}

/** The Join card's Preview and the Before / After chip. */
export const PREVIEW_WORDS = {
    preview: "Preview",
    graphAfter: "Graph after",
    buckets: "Buckets",
    largestGroup: "largest group",
    nodes: "Nodes",
    edges: "Edges",
    noChange: "no change",
    valuesDiffer: "Values differ",
    decided: "decided",
    rule: "Rule",
    repeats: "Repeats",
    only2: "Only 2",
    keep: "Keep",
    drop: "Drop",
    commit: "Commit",
    before: "Before",
    after: "After",
    beforeAfter: "Before / After",
    draftOpen: "Draft open",
    discard: "Discard",
    undo: "Undo",
} as const;

/** The Values differ rules, as the rule menu names them. */
export const RULE_WORDS: Readonly<Record<SourceClashRule, string>> = {
    keep: "Keep 1",
    overwrite: "Use 2",
    both: "Both",
    vote: "Vote",
    min: "Min",
    max: "Max",
    mean: "Mean",
};

/** How a merge settles a key source 2's rows repeat, as the Repeats menu names each way. */
export const REPEATS_WORDS: Readonly<Record<JoinRepeats, string>> = {
    first: "First",
    last: "Last",
    count: "Count",
    list: "List",
};

/** A step's counts the Preview lists, in order, by the step's op. */
export const BUCKET_WORDS: Readonly<
    Record<"merge" | "edge", readonly { readonly id: SourceStepNumberBucket; readonly label: string }[]>
> = {
    merge: [
        { id: "merged", label: "merged" },
        { id: "keptNew", label: "new" },
        { id: "untouched", label: "untouched" },
        { id: "repeated2", label: "keys repeat" },
        { id: "fanOut", label: "fan-out" },
        { id: "typeDiffers", label: "type differs" },
        { id: "namedOnly", label: "named only in 2" },
    ],
    edge: [
        { id: "matched", label: "matched" },
        { id: "unmatched", label: "unmatched" },
        { id: "newEdges", label: "new edges" },
        { id: "repeated2", label: "keys repeat" },
        { id: "fanOut", label: "fan-out" },
        { id: "parallelPairs", label: "parallel" },
        { id: "selfLoops", label: "self-loops" },
    ],
};

/** The step counts the Preview lists as one number each: names of the element's counts. */
export type SourceStepNumberBucket = Extract<
    keyof SourceStepCounts,
    | "merged"
    | "keptNew"
    | "untouched"
    | "repeated2"
    | "fanOut"
    | "typeDiffers"
    | "namedOnly"
    | "matched"
    | "unmatched"
    | "newEdges"
    | "parallelPairs"
    | "selfLoops"
>;

/**
 * A Graph after line: "3 -> 5", or "no change".
 * @param before - the count now.
 * @param after - the count the commit would leave.
 * @returns the words.
 */
export function afterWords(before: number, after: number): string {
    return before === after ? PREVIEW_WORDS.noChange : `${formatNumber(before)} -> ${formatNumber(after)}`;
}

/** Refusals the source cards meet, by the element's code. */
const REFUSAL_WORDS: Readonly<Record<string, string>> = {
    E_CLASH_RULE_TYPE: "Rule does not fit these values",
    E_STEP_NEEDS_NODES: "No node rows",
    E_DRAFT_OPEN: "Draft open",
    E_OVERLAP_UNANSWERED: "Question unanswered",
    E_DRAFT_STALE: "Graph changed since the draft opened",
};

/**
 * A refusal as the reader reads it.
 * @param error - what the element threw.
 * @returns its words.
 */
export function refusedWords(error: unknown): string {
    const code = isGraphtyError(error) ? error.code : undefined;
    return (code === undefined ? undefined : REFUSAL_WORDS[code]) ?? STAGED_WORDS.notChanged;
}

/**
 * The notice after a source card commits.
 * @param kind - the card.
 * @param name - the source it added or joined.
 * @returns such as "Joined entries.csv".
 */
export function committedWords(kind: "add" | "join", name: string): string {
    return `${kind === "join" ? "Joined" : "Added"} ${name}`;
}

/**
 * A bucket of new elements of one type.
 * @param type - the type.
 * @returns such as "new person".
 */
export function newTypeWords(type: string): string {
    return `new ${type}`;
}
