/**
 * The words of the staged sources and their cards (the source-steps experiment, design
 * design/data/multiple-data-sources-design.md, sections 5.1 and 5.5): every label the reader sees,
 * written here from what graphty-element reports.
 */

import type { SourceOverlapQuestion, SourceTableMapping } from "@graphty/graphty-element/session";

import { sizeWords } from "../data-place/words";
import { formatNumber } from "../inspector/words";

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
