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
    type SourceDraftRow,
    type SourceOverlapQuestion,
    type SourceProfileKind,
    type SourceStepCounts,
    type SourceStepRow,
    type SourceTableMapping,
} from "@graphty/graphty-element/session";

import { formatNumber } from "../inspector/words";

/** The fixed labels. */
export const STAGED_WORDS = {
    file: "File",
    rows: "Rows",
    rowsAre: "Rows are",
    key: "Node id",
    /** The source whose nodes these rows' ids name: a row with the same id is the same node. */
    space: "Same nodes as",
    /** What an end's ids name: the nodes of a source. */
    endSpace: "nodes of",
    unset: "None",
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

/** The join cards' labels. */
export const JOIN_WORDS = {
    join: "Join",
    field: "Field",
    edgeType: "Edge type",
    direction: "Direction",
    ignoreCase: "Ignore case",
    ignoreSpaces: "Ignore spaces",
} as const;

/** The join workspace's words (issue #9796). */
export const WORKSPACE_WORDS = {
    title: "Join",
    open: "Join",
    joins: "Joins",
    openJoin: "Open",
    newJoin: "New join",
    source: "Source",
    waiting: "Waiting",
    inGraph: "In graph",
    nodeTypes: "Node types",
    newNodes: "As new nodes",
    match: "Match",
    matchCount: "Match count",
    matching: "matching",
    matched: "Matched",
    suggested: "suggested",
    repeats: "repeats",
    unique: "unique",
    empty: "empty",
    joinAs: "Join as",
    advanced: "Advanced",
    all: "All",
    only: (name: string) => `Only ${name}`,
    show: "Rows shown",
    tables: "Tables",
    merge: "Merge",
    manyRows: "Rows per node",
    manyRowsByField: "Rows per node, by field",
    clash: "Both have",
    noMatch: "No match",
    missing: "Missing end",
    severalMatch: "Several match",
    each: "Each",
    add: "Add",
    skip: "Skip",
    first: "First",
    last: "Last",
    list: "List all",
    count: "Count",
    edges: "Edges",
    perRow: "Per row",
    perPair: "Per pair",
    untouched: "nodes with no match",
    nodesMerged: "nodes merged",
    nodesNew: "nodes new",
    edgesNew: "edges new",
    nodesChanged: "nodes changed",
    nodesRemoved: "nodes removed",
    edgesChanged: "edges changed",
    edgesRemoved: "edges removed",
    edgesMerged: "edges merged",
    removedSource: "removed source",
    cardColors: "Card colors",
    styled: "Styled",
    preview: "Preview",
    cancel: "Cancel",
    done: "Done",
    undo: "Undo",
    redo: "Redo",
    unfinished: "Unfinished",
    unanswered: "Question unanswered",
    frame: "Frame",
    remove: "Remove",
    rows: "Rows",
    drawing: "Drawing",
    committed: "Joined",
    committedAdd: "Added",
    pick1: "Use existing",
    pick2: "Use incoming",
    clearPicks: "Clear",
    exclude: "Exclude",
    include: "Include",
    excluded: "excluded",
    includeAll: "Include all",
    addAsIs: "Add as is",
    added: "added",
    readAs: (name: string) => `${name} rows`,
    newType: "New type",
    splitOn: "Split on",
    carry: "Move fields",
    none: "None",
    existing: "Existing edge",
    hubCap: "Max nodes per value",
    minShared: "Minimum shared",
    ignore: "Every match ignores",
} as const;

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
 * The "+n" beside an Ignore switch: how many more rows it would match.
 * @param more - the element's count, null while the switch is on.
 * @returns such as "+1", or null while on.
 */
export function moreWords(more: number | null): string | null {
    return more === null ? null : `(${formatNumber(more)} more)`;
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
    keep: "Keep existing",
    overwrite: "Use incoming",
    both: "Both",
    vote: "Vote",
    min: "Min",
    max: "Max",
    mean: "Mean",
};

/** A step's count as a card lists it: its words for one and for several. */
export interface BucketWords {
    readonly id: SourceStepNumberBucket;
    readonly one: string;
    readonly many: string;
}

/** What a step linking nodes that share a value makes, whatever it reads the values from. */
const LINK_BUCKETS: readonly BucketWords[] = [
    { id: "newNodes", one: "new node", many: "new nodes" },
    { id: "newEdges", one: "new edge", many: "new edges" },
    { id: "pairsBelowMin", one: "pair below the minimum", many: "pairs below the minimum" },
    { id: "parallelPairs", one: "parallel edge", many: "parallel edges" },
    { id: "selfLoops", one: "self-loop", many: "self-loops" },
];

/** A step's counts a card lists, in order, by what the step makes. */
export const BUCKET_WORDS: Readonly<Record<"merge" | "edge" | "links" | "nodeLinks", readonly BucketWords[]>> = {
    merge: [
        { id: "merged", one: "node matched", many: "nodes matched" },
        { id: "keptNew", one: "new node", many: "new nodes" },
        { id: "untouched", one: "node with no match", many: "nodes with no match" },
        { id: "emptyKey", one: "empty row", many: "empty rows" },
        { id: "repeated2", one: "value in several rows", many: "values in several rows" },
        { id: "fanOut", one: "matches several", many: "match several" },
        { id: "typeDiffers", one: "type differs", many: "types differ" },
        { id: "namedOnly", one: "named only", many: "named only" },
    ],
    edge: [
        { id: "matched", one: "row matched", many: "rows matched" },
        { id: "unmatched", one: "row unmatched", many: "rows unmatched" },
        { id: "emptyKey", one: "empty row", many: "empty rows" },
        { id: "newNodes", one: "new node", many: "new nodes" },
        { id: "newEdges", one: "new edge", many: "new edges" },
        { id: "mergedEdges", one: "edge merged", many: "edges merged" },
        { id: "repeated2", one: "value in several rows", many: "values in several rows" },
        { id: "fanOut", one: "matches several", many: "match several" },
        { id: "parallelPairs", one: "parallel edge", many: "parallel edges" },
        { id: "selfLoops", one: "self-loop", many: "self-loops" },
    ],
    links: [
        { id: "matched", one: "row linked", many: "rows linked" },
        { id: "unmatched", one: "row not linked", many: "rows not linked" },
        { id: "emptyKey", one: "empty row", many: "empty rows" },
        ...LINK_BUCKETS,
    ],
    nodeLinks: [
        { id: "matched", one: "node linked", many: "nodes linked" },
        { id: "unmatched", one: "node not linked", many: "nodes not linked" },
        ...LINK_BUCKETS,
    ],
};

/**
 * How many of a step's count a card says: a merge's are the nodes it merged into, as the header
 * counts them, and the rows that reached them are listed.
 * @param buckets - the step's counts.
 * @param id - which.
 * @returns the number.
 */
export function bucketCount(buckets: SourceStepCounts, id: SourceStepNumberBucket): number {
    return id === "merged" ? buckets.groups.length : buckets[id];
}

/**
 * A count with its words.
 * @param count - how many.
 * @param words - its words for one and for several.
 * @param words.one - for one.
 * @param words.many - for several.
 * @returns such as "1 repeated key".
 */
export function counted(count: number, words: { readonly one: string; readonly many: string }): string {
    return `${formatNumber(count)} ${count === 1 ? words.one : words.many}`;
}

/** The values of a link too many nodes hold, as a card lists them. */
export const OVER_CAP_WORDS = { one: "value over the cap", many: "values over the cap" } as const;

/** The step counts the Preview lists as one number each: names of the element's counts. */
export type SourceStepNumberBucket = Extract<
    keyof SourceStepCounts,
    | "merged"
    | "keptNew"
    | "untouched"
    | "repeated2"
    | "fanOut"
    | "emptyKey"
    | "typeDiffers"
    | "namedOnly"
    | "matched"
    | "unmatched"
    | "newNodes"
    | "newEdges"
    | "mergedEdges"
    | "pairsBelowMin"
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
    source: "Source",
    target: "Target",
    from: "From",
    effect: "Effect",
    held: "held",
    incoming: "incoming",
    shown: "Shown",
    by: "By",
    /** A cell a reader decision (a pick or an edit) shows. */
    reader: "Reader",
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

/** The Steps list, the step card and the Reader edits list. */
export const STEP_WORDS = {
    steps: "Steps",
    edit: "Edit",
    delete: "Delete",
    off: "Off",
    graphAfter: "Graph after",
    nodes: "Nodes",
    edges: "Edges",
    otherJoins: "Other joins",
    references: "References",
    readerEdits: "Reader edits",
    applies: "apply",
    lost: "lost",
    sourceChanged: "source changed",
    notRemoved: "Not removed",
} as const;

/**
 * A join whose counts the change moves, as the removal lists it.
 * @param name - its line in the list.
 * @param before - its counts now, from `stepCountWords`.
 * @param after - its counts once committed.
 * @returns such as "people + door_entries: 5 edges -> 0 edges".
 */
export function stepChangedWords(name: string, before: string, after: string): string {
    return `${name}: ${before || STEP_WORDS.off} -> ${after || STEP_WORDS.off}`;
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
            return `${formatNumber(buckets.groups.length)} merged`;
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
 * What an Add step brings, as its card says it.
 * @param step - the step
 * @returns such as "60 nodes, 0 edges", or "" while it is not built
 */
export function addStepWords(step: SourceStepRow): string {
    const b = step.buckets;
    return b === null
        ? ""
        : `${formatNumber(b.newNodes)} ${STEP_WORDS.nodes.toLowerCase()}, ${formatNumber(b.newEdges)} ${STEP_WORDS.edges.toLowerCase()}`;
}

/** What becomes of a join the removal reaches, by `W_STEP_REMOVED`'s reason. */
const REMOVED_REASON_WORDS: Readonly<Record<"source-removed" | "step-removed" | "source-held", string>> = {
    "source-removed": "removed",
    "step-removed": "removed",
    "source-held": "left out",
};

/**
 * A join the removal takes away, from the preview's `W_STEP_REMOVED`.
 * @param name - its line in the list.
 * @param reason - why it goes.
 * @returns such as "people + door_entries: removed".
 */
export function stepRemovedWords(name: string, reason: "source-removed" | "step-removed" | "source-held"): string {
    return `${name}: ${REMOVED_REASON_WORDS[reason]}`;
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
