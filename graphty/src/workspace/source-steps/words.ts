/**
 * The words of the staged sources and their cards (the source-steps experiment, design
 * design/data/multiple-data-sources-design.md, sections 5.1 and 5.5): every label the reader sees,
 * written here from what graphty-element reports.
 */

import {
    isGraphtyError,
    type ReaderEditRow,
    type SourceCellValue,
    type SourceClashRule,
    type SourceDraftBucket,
    type SourceDraftRow,
    type SourceOverlapQuestion,
    type SourceProfileKind,
    type SourceRefreshIssue,
    type SourceStepAct,
    type SourceStepCounts,
    type SourceStepRow,
    type SourceTableMapping,
} from "@graphty/graphty-element/session";

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
 * @param space - that space as the reader reads it: its name, or its owning source's name.
 * @returns the question.
 */
export function overlapQuestionWords(space: string): string {
    return `Same ${space}?`;
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

/** The join workspace's words (issue #9796). */
export const WORKSPACE_WORDS = {
    title: "Join",
    open: "Join",
    addJoin: "Join",
    match: "Match",
    matches: "Matches",
    result: "Result",
    merge: "Merge",
    connect: "Connect",
    suggested: "suggested",
    inGraph: "In graph",
    incoming: "Incoming",
    manyRows: "Many rows",
    clash: "Both have",
    noMatch: "No match",
    add: "Add",
    skip: "Skip",
    first: "First",
    last: "Last",
    list: "List",
    count: "Count",
    edges: "Edges",
    perRow: "Per row",
    perPair: "Per pair",
    merged: "merged",
    new: "new",
    untouched: "nodes untouched",
    nodesMerged: "nodes merged",
    nodesNew: "nodes new",
    otherEnd: "Other end",
    cardColors: "Card colors",
    styled: "Styled",
    preview: "Preview",
    cancel: "Cancel",
    done: "Done",
    undo: "Undo",
    frame: "Frame",
    remove: "Remove",
    rows: "Rows",
    unknown: "?",
    drawing: "Drawing",
    committed: "Joined",
    matchCount: "Match count",
    pick1: "Pick 1",
    pick2: "Pick 2",
    clearPicks: "Clear",
    row: "Row",
    fields: "Fields",
    values: "Values",
    exclude: "Exclude",
    include: "Include",
    addAsIs: "Add as is",
    added: "Added",
    readSettings: "Read as",
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
    keysRepeat: "keys repeat",
    new: "new",
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
 * @param kind - the card: Add, Join, or Join editing a step.
 * @param name - the source it added or joined.
 * @returns such as "Joined entries.csv".
 */
export function committedWords(kind: "add" | "join" | "edit", name: string): string {
    const verb = { add: "Added", join: "Joined", edit: "Edited" }[kind];
    return `${verb} ${name}`;
}

/**
 * A bucket of new elements of one type.
 * @param type - the type.
 * @returns such as "new person".
 */
export function newTypeWords(type: string): string {
    return `new ${type}`;
}

/**
 * An Add's count of rows whose key meets a node already in the graph, by the space it looks in.
 * @param space - the space's name as the reader reads it.
 * @returns such as "ends meet person".
 */
export function endsMeetWords(space: string): string {
    return `ends meet ${space}`;
}

/** The dock's Preview tab and the card's acts on its selection. */
export const DRILL_WORDS = {
    preview: "Preview",
    show: "Show",
    changedOnly: "Changed only",
    all: "All",
    rows: "rows",
    rowsLabel: "Rows",
    cells: "Cells",
    cellsLabel: "Cells",
    key: "Key",
    from: "From",
    effect: "Effect",
    held: "held",
    incoming: "incoming",
    shown: "Shown",
    by: "By",
    /** A cell a reader decision (a pick or an edit) shows. */
    reader: "R",
    excluded: "Excluded",
    remove: "Remove",
} as const;

/** What the commit does to a row's element, as `preview.rows` reports it. */
export const EFFECT_WORDS: Readonly<Record<SourceDraftRow["effect"], string>> = {
    added: "new",
    changed: "changed",
    removed: "removed",
    unchanged: "unchanged",
    "left-out": "left out",
};

/** The cell list's filters, as `preview.cells` takes them. */
export const CELL_FILTERS = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "decided", label: "Decided" },
] as const;

/**
 * A count's name, as the Preview lists it.
 * @param bucket - the element's name for the count.
 * @returns its words.
 */
export function bucketWords(bucket: SourceDraftBucket): string {
    for (const list of Object.values(BUCKET_WORDS)) {
        const found = list.find((each) => each.id === bucket);
        if (found !== undefined) {
            return found.label;
        }
    }
    return bucket;
}

/**
 * The Show rows button's name for a count.
 * @param label - the count's words.
 * @returns such as "Show new edges rows".
 */
export function showRowsWords(label: string): string {
    return `Show ${label} rows`;
}

/**
 * The Show cells button's name for a Values differ column.
 * @param column - the column.
 * @returns such as "Show dept cells".
 */
export function showCellsWords(column: string): string {
    return `Show ${column} cells`;
}

/**
 * Exclude selected (n).
 * @param count - the keys selected.
 * @returns the label.
 */
export function excludeWords(count: number): string {
    return `Exclude selected (${formatNumber(count)})`;
}

/**
 * Pick 1 (n) or Pick 2 (n).
 * @param side - which source.
 * @param count - the cells selected.
 * @returns the label.
 */
export function pickWords(side: 1 | 2, count: number): string {
    return `Pick ${side} (${formatNumber(count)})`;
}

/**
 * Clear picks (n).
 * @param count - the decided cells selected.
 * @returns the label.
 */
export function clearPicksWords(count: number): string {
    return `Clear picks (${formatNumber(count)})`;
}

/** The Steps list, the step card and the Reader edits list. */
export const STEP_WORDS = {
    steps: "Steps",
    edit: "Edit",
    delete: "Delete",
    off: "Off",
    graphAfter: "Graph after",
    nodes: "Nodes",
    edges: "Edges",
    laterSteps: "Later steps",
    references: "References",
    readerEdits: "Reader edits",
    applies: "apply",
    lost: "lost",
    sourceChanged: "source changed",
    notRemoved: "Not removed",
} as const;

/** A step's kind, as the Steps list names it. */
export const OP_WORDS: Readonly<Record<SourceStepRow["op"], string>> = {
    "join.add": "Add",
    "join.merge": "Merge",
    "join.edges": "Edges",
    "join.node-values": "Values",
    "join.edge-values": "Values",
};

/**
 * What a join step joined: field 2, then the field or space of node 1 it joined onto.
 * @param act - the step's act.
 * @param spaceName - the name the reader reads for `act.into.space` (see `spaceLabel`).
 * @returns such as "badge -> person" or "badge -> people.csv".
 */
export function actWords(act: SourceStepAct, spaceName: string): string {
    return `${act.from.field} -> ${act.into.field ?? spaceName}`;
}

/**
 * A step as the step card names it under its title: its kind, its source and what it joined.
 * @param row - the step.
 * @param name - its source's name.
 * @param spaceName - the name the reader reads for the space it joined onto.
 * @returns such as "Edges entries.csv badge -> person".
 */
export function stepSubjectWords(row: SourceStepRow, name: string, spaceName: string): string {
    return [OP_WORDS[row.op], name, ...(row.act === null ? [] : [actWords(row.act, spaceName)])].join(" ");
}

/**
 * A later step whose counts the change moves, as the step card lists it.
 * @param index - its place in the committed list.
 * @param op - its kind.
 * @param before - its counts now, from `stepCountWords`.
 * @param after - its counts once committed.
 * @returns such as "Step 2 Edges: 5 edges -> 0 edges".
 */
export function stepChangedWords(index: number, op: SourceStepRow["op"], before: string, after: string): string {
    return `${stepWords(index)} ${OP_WORDS[op]}: ${before || STEP_WORDS.off} -> ${after || STEP_WORDS.off}`;
}

/**
 * A step's counts as its Steps row shows them, short so the row keeps room for what it joined:
 * "n" nodes, "e" edges, "m" merged.
 * @param row - the step.
 * @returns such as "3 n, 4 e", "3 m", or "" when it was not built.
 */
export function stepCountShortWords(row: SourceStepRow): string {
    const { buckets } = row;
    if (buckets === null) {
        return "";
    }
    switch (row.op) {
        case "join.add":
            return [
                `${formatNumber(buckets.newNodes)} n`,
                ...(buckets.newEdges > 0 ? [`${formatNumber(buckets.newEdges)} e`] : []),
            ].join(", ");
        case "join.merge":
            return `${formatNumber(buckets.merged)} m`;
        case "join.edges":
            return `${formatNumber(buckets.newEdges)} e`;
        default:
            return formatNumber(buckets.matched);
    }
}

/**
 * A Steps row's counts, from the step's buckets in the committed build.
 * @param row - the step.
 * @returns such as "3 nodes, 4 edges", "3 merged", or "" when it was not built.
 */
export function stepCountWords(row: SourceStepRow): string {
    const { buckets } = row;
    if (buckets === null) {
        return "";
    }
    const plural = (count: number, one: string, many: string): string =>
        `${formatNumber(count)} ${count === 1 ? one : many}`;
    switch (row.op) {
        case "join.add": {
            const parts = [plural(buckets.newNodes, "node", "nodes")];
            if (buckets.newEdges > 0) {
                parts.push(plural(buckets.newEdges, "edge", "edges"));
            }
            return parts.join(", ");
        }
        case "join.merge": {
            return `${formatNumber(buckets.merged)} merged`;
        }
        case "join.edges": {
            return plural(buckets.newEdges, "edge", "edges");
        }
        default: {
            return `${formatNumber(buckets.matched)} matched`;
        }
    }
}

/**
 * The column a held step misses, as the Steps row names it.
 * @param issue - one of the step's `missing`.
 * @returns such as "badge missing".
 */
export function missingWords(issue: SourceRefreshIssue): string {
    return "column" in issue.params ? `${issue.params.column} missing` : STEP_WORDS.off;
}

/**
 * A Steps row's name.
 * @param index - the step's place, from 0.
 * @returns such as "Step 2".
 */
export function stepWords(index: number): string {
    return `Step ${formatNumber(index + 1)}`;
}

/**
 * The Join card's title while it edits a committed step: the step, its kind and its source.
 * @param row - the step.
 * @param name - its source's name.
 * @returns such as "Step 2 Merge hr.csv".
 */
export function editTitleWords(row: SourceStepRow, name: string): string {
    return `${stepWords(row.index)} ${OP_WORDS[row.op]} ${name}`;
}

/**
 * The edited step's own counts, now and once committed.
 * @param before - its counts now, from `stepCountWords`.
 * @param after - its counts once committed.
 * @returns such as "3 merged -> 4 merged".
 */
export function countsChangeWords(before: string, after: string): string {
    return before === after ? PREVIEW_WORDS.noChange : `${before || STEP_WORDS.off} -> ${after || STEP_WORDS.off}`;
}

/**
 * The step card's title.
 * @param remove - what it removes.
 * @param name - the source's name.
 * @returns such as "Delete step 2" or "Remove people.csv".
 */
export function removeTitleWords(
    remove: { readonly step: number } | { readonly source: string },
    name: string,
): string {
    return "step" in remove ? `Delete step ${formatNumber(remove.step + 1)}` : `Remove ${name}`;
}

/** Why a later step goes with the removal, by `W_STEP_REMOVED`'s reason. */
const REMOVED_REASON_WORDS: Readonly<Record<"source-removed" | "step-removed" | "source-held", string>> = {
    "source-removed": "source removed",
    "step-removed": "step removed",
    "source-held": "source held",
};

/**
 * A later step the removal takes away, from the preview's `W_STEP_REMOVED`.
 * @param params - the issue's params.
 * @param params.step - the step's place.
 * @param params.reason - why it goes.
 * @returns such as "Step 3: source removed".
 */
export function stepRemovedWords(params: {
    readonly step: number;
    readonly reason: "source-removed" | "step-removed" | "source-held";
}): string {
    return `${stepWords(params.step)}: ${REMOVED_REASON_WORDS[params.reason]}`;
}

/**
 * A reader edit's kind, as the Reader edits list names it: a pick names the source it took.
 * @param edit - the edit.
 * @returns its words.
 */
export function editKindWords(edit: ReaderEditRow): string {
    switch (edit.op) {
        case "add": {
            return "Add";
        }
        case "add-edge": {
            return "Add edge";
        }
        case "remove": {
            return "Remove";
        }
        default: {
            return edit.picked === undefined ? "Value" : "Pick";
        }
    }
}

/**
 * A reader edit's value: the column and what it writes.
 * @param edit - the edit.
 * @returns such as "dept = Research", or "" for an edit that writes no cell.
 */
export function editValueWords(edit: ReaderEditRow): string {
    return edit.column === undefined ? "" : `${edit.column} = ${cellWords(edit.value ?? null)}`;
}

/**
 * The notice after a step card commits.
 * @param remove - what it removed.
 * @param name - the source's name.
 * @returns such as "Deleted step 2" or "Removed people.csv".
 */
export function removedWords(remove: { readonly step: number } | { readonly source: string }, name: string): string {
    return "step" in remove ? `Deleted step ${formatNumber(remove.step + 1)}` : `Removed ${name}`;
}
