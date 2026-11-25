/**
 * @file The shapes the build of sources and steps reads and returns (design
 * design/data/multiple-data-sources-design.md, sections 3 and 10), behind the `source-steps`
 * experiment.
 *
 * A source keeps its rows as read (its copy) and a mapping that says what its columns are for. The
 * working graph is rebuilt from an ordered list of steps that read those rows. Member names are the
 * section 10 save-format names. Plain data, free of Babylon.js, Lit and the DOM.
 */

import type { DuplicatePolicy } from "@graphty/graph-format";

import type { JoinReduce } from "../../types";

/** One cell of a row as read. */
export type CellValue = string | number | boolean | null;

/** A built element's value for one cell: a cell as read, or the list an `aggregate` of `list` gathers. */
export type Value = CellValue | readonly CellValue[];

/** Per working column, how a step settles the rows of one repeated key (3.3); other columns follow `repeated`. */
export type Aggregate = Readonly<Record<string, JoinReduce>>;

/** One row as read, keyed by its column names. */
export type Row = Readonly<Record<string, CellValue | undefined>>;

/** The two tables a source can hold. */
export type TableName = "nodes" | "edges";

/** A source's rows as read: one copy, named by its copy id. */
export interface CopyTables {
    readonly nodes?: readonly Row[];
    readonly edges?: readonly Row[];
}

/** The time roles a table can carry, and its renames (3.9). */
interface TimeRoles {
    /** The column holding the element's time. */
    readonly time?: string;
    /** How the time column's numbers read: `"ms"`, `"s"`, `"year"` or `"ordinal"`; absent means milliseconds. */
    readonly timeUnit?: "ms" | "s" | "year" | "ordinal";
    /** The column holding the end of the element's time span. */
    readonly timeEnd?: string;
    /** The column holding the element's list of time spells. */
    readonly timeSpells?: string;
    /** The IANA zone a time with no offset of its own is read in, such as `"Europe/Oslo"`; absent means UTC. */
    readonly timeParseZone?: string;
    /** Working names for columns, keyed by the name as read (Rename, 4.4). */
    readonly renamed?: Readonly<Record<string, string>>;
}

/** The weight roles a table can carry (3.9). */
interface WeightRoles {
    /** The column holding the element's weight. */
    readonly weight?: string;
    /** What a larger weight means, such as `"strength"` or `"distance"`. */
    readonly weightMeaning?: string;
}

/** What a source's node rows are for. */
interface NodeMapping extends TimeRoles, WeightRoles {
    /** The key column; absent makes every row its own node keyed by its content, `<digest>#<n>` (spec 6.1). */
    readonly key?: string;
    /** The id space the keys live in; absent means the source's own space `source:<id>`. */
    readonly space?: string;
    readonly latitude?: string;
    readonly longitude?: string;
    readonly coordinates?: string;
    readonly country?: string;
    readonly region?: string;
    readonly city?: string;
}

/** What a source's edge rows are for. */
export interface EdgeMapping extends TimeRoles, WeightRoles {
    /** The column naming the edge's source end. */
    readonly source: string;
    /** The column naming the edge's target end. */
    readonly target: string;
    /** The space the source end's keys live in; absent means `source:<id>`. */
    readonly sourceSpace?: string;
    /** The space the target end's keys live in; absent means `source:<id>`. */
    readonly targetSpace?: string;
    /** The column holding the edge's own key; absent keys each row `<from>|<to>#<n>` (spec 6.1). */
    readonly edgeId?: string;
}

/** Whether a source's rows are nodes, edges, or both (3.1). */
export interface Mapping {
    readonly nodes?: NodeMapping;
    readonly edges?: EdgeMapping;
}

/** A source's own settings, which no act writes (3.3). */
export interface SourceSettings {
    /**
     * A node row repeating a key: `"first"` (default) keeps the first; `"merge"` fills cells it left
     * empty; `"refuse"` refused the load, so the rows hold no repeat.
     */
    readonly duplicateIds?: "first" | "merge" | "refuse";
    /** An edge end naming no node: `"add"` (default) makes the node; `"leave-out"` drops the row. */
    readonly unmatched?: "add" | "leave-out";
}

/** One loaded input: its rows as read (by copy id) and its mapping (3.1). */
export interface Source {
    /** `src_` plus a ULID; the reader's edits are the source `reader`. */
    readonly id: string;
    /**
     * How it was obtained: `copy` is its copy id (version 2, 4.1.2 rule 1), `sha256:` and the hex
     * digest of the bytes as read for a file, URL or downloaded sample, else a ULID; `rows`, when
     * set, is the key the session holds the rows under, since sources reading the same bytes share
     * a copy id. Read the rows with `copyKey`.
     */
    readonly origin: { readonly copy: string; readonly rows?: string };
    readonly mapping: Mapping;
    readonly settings?: SourceSettings;
    /** A held source is kept but not built, with every step that depends on it (7.15). */
    readonly held?: boolean;
    /**
     * The column its node rows, which named no key, were numbered under when they were read. The file
     * held no such column: it may key the rows, but no element carries it and no list names it.
     */
    readonly numbered?: string;
}

/** Rows a step reads by one column's values, compared as strings after Unicode normalization. */
export interface RowFilter {
    readonly column: string;
    readonly values: readonly CellValue[];
}

/** How a step settles a cell another source already filled (3.10). */
export type ClashRule = "keep" | "overwrite" | "both" | "min" | "max" | "mean" | "vote";

/** A field-to-field translation through another source's rows (3.5). */
interface StepMappingTable {
    /** `[from, to]`: the column a value is found in and the key column it translates to. */
    readonly columns: readonly [string, string];
    readonly table?: TableName;
    /** The space the translated keys are looked up in; absent means the mapping source's node space. */
    readonly space?: string;
}

/** The choices every step but `join.add` may carry (3.3, 3.4). */
interface StepChoices {
    readonly source: string;
    /** Set only by the reader's choice: the step is kept but not built (7.12, 7.13). */
    readonly off?: boolean;
    /** The working columns the step brings besides its role columns; absent means every column. */
    readonly columns?: readonly string[];
    readonly rows?: RowFilter;
    readonly except?: RowFilter;
    readonly clash?: ClashRule | Readonly<Record<string, ClashRule>>;
    readonly ignoreCase?: boolean;
    readonly ignoreSpaces?: boolean;
}

/** `join.add`: every table of the source, through its mapping. */
export interface AddStep extends StepChoices {
    readonly op: "join.add";
    /** A join act added the source because it needed its nodes: once no step needs them, it goes too. */
    readonly joined?: true;
    readonly duplicateIds?: "first" | "merge" | "refuse";
}

/** The key a node step reads, and the space it looks it up in. */
interface NodeStepRead {
    readonly table?: TableName;
    readonly key: string;
    readonly space: string;
}

/** Translation choices shared by the steps that look a value up (3.5). */
interface Translating {
    /** Translate through this source's own rows; a value they lack is unmatched. */
    readonly via?: string;
    /** Translate through this id-mapping source; a value it lacks passes through as it is. */
    readonly lookup?: string;
    readonly mapping?: StepMappingTable;
    /**
     * Look the value up among the nodes of the space by this column of theirs, as the steps before
     * this one build them, each value of a list apart; absent, by their key.
     */
    readonly nodeColumn?: string;
}

/**
 * `join.merge`: each node 2 an earlier step built folds into the node 1 its field names. Reading
 * `edges`, the source's edge rows have no node 2: each row's columns fold into the node 1 it names,
 * and a row naming none makes the node (`unmatchedFrom: "keep"`) or is left out.
 */
export interface MergeStep extends StepChoices, Translating {
    readonly op: "join.merge";
    readonly read: NodeStepRead;
    readonly repeated?: "first" | "last";
    /** Settles the merged values of every node 2 folding into one node 1. */
    readonly aggregate?: Aggregate;
    readonly unmatchedFrom?: "keep" | "drop";
}

/** `join.node-values`: a row's columns onto the node its key names; builds no node unless `unmatchedRows: "add"`. */
export interface NodeValuesStep extends StepChoices, Translating {
    readonly op: "join.node-values";
    readonly read: NodeStepRead;
    readonly repeated?: "first" | "last";
    readonly aggregate?: Aggregate;
    readonly unmatchedRows?: "add" | "leave-out";
}

/** `join.edge-values`: a row's columns onto the edge of source `edges` whose full key `read.edgeId` names. */
export interface EdgeValuesStep extends StepChoices {
    readonly op: "join.edge-values";
    readonly edges: string;
    readonly read: { readonly table?: TableName; readonly edgeId: string };
    readonly repeated?: "first" | "last";
}

/** The ends and roles a `join.edges` step reads. */
interface EdgesStepRead {
    readonly table?: TableName;
    /** Absent, with its space, for the end that is the row's own node (`rowNode`). */
    readonly source?: string;
    readonly sourceSpace?: string;
    readonly target?: string;
    readonly targetSpace?: string;
    readonly edgeId?: string;
    /** Absent means the source's weight role; `null` means none. */
    readonly weight?: string | null;
    readonly weightMeaning?: string;
    /** Absent means the source's time role; `null` means none. */
    readonly time?: string | null;
    /** How the step's time column's numbers read; absent means the source's `timeUnit`. */
    readonly timeUnit?: "ms" | "s" | "year" | "ordinal";
}

/**
 * What a `join.edges` step linking nodes that share a value reads. Each row's node (`rowNode`
 * `"source"`, or the node `read.source` names) holds the row's values in `columns`; a value two to
 * `maxShared` nodes hold links them. The edges are keyed `<part>/<from>|<to>`.
 */
export interface LinkRead {
    readonly columns: readonly string[];
    /** The nodes of `read.sourceSpace` hold the values, as the steps before build them; no row is read. */
    readonly of?: "nodes";
    /** One node per shared value, keyed `<column>:<value>` in `read.targetSpace`; absent, one edge per pair. */
    readonly as?: "nodes";
    readonly maxShared: number;
    readonly minShared: number;
}

/**
 * What a `join.edges` step making nodes of a column's values reads besides its ends. An edge source's
 * column that is neither split nor read from its rows needs none of it (`acts.ts` `extract`).
 */
interface ExtractRead {
    /** The separator a cell holds several values by; absent, a cell is one value (a list is each of its values). */
    readonly split?: string;
    /** The row's columns the new nodes carry, off the row's own node or edge. */
    readonly columns?: readonly string[];
}

/** `join.edges`: each row one edge, keyed `<part>/<key>`. */
export interface EdgesStep extends StepChoices, Translating {
    readonly op: "join.edges";
    /** Minted by the element, unique among the source's steps and never reused (3.3). */
    readonly part: number;
    readonly read: EdgesStepRead;
    /**
     * Which end `via` or `nodeColumn` translates; default `"target"`. With neither, which end of two
     * named by columns is node 1; default `"source"`.
     */
    readonly viaEnd?: "source" | "target";
    /**
     * Each row is a node: the edge's source or target end, or the node between the two ends, with an
     * edge to each (keyed `<part>/<row key>|source` and `|target`). It is keyed as the source's node
     * rows are, in their space; an edge row by its content, in the source's own space. The step
     * makes the node unless the source's `join.add` did.
     */
    readonly rowNode?: "source" | "target" | "middle";
    /** `"merge"` folds a row into an edge an earlier step made between its ends; absent adds one. */
    readonly existing?: "merge";
    /** Links nodes whose rows share a value, instead of one edge per row (see {@link LinkRead}). */
    readonly link?: LinkRead;
    /** The target column's values become nodes: each names one, or several (see {@link ExtractRead}). */
    readonly extract?: ExtractRead;
    /** Two rows naming one end pair: absent leaves them to the graph's `repeatedEdges`. */
    readonly repeated?: "first" | "last" | "both";
    /** Makes one edge per end pair, as `repeated` does, with these columns reduced over its rows. */
    readonly aggregate?: Aggregate;
    readonly unmatchedRows?: "add" | "leave-out";
    /** The end whose values naming no node make one, whatever `unmatchedRows` says of the other. */
    readonly addEnd?: "source" | "target";
}

/** One entry of the ordered join history (3.4). */
export type Step = AddStep | MergeStep | NodeValuesStep | EdgeValuesStep | EdgesStep;

/** One rule giving elements a type (3.7). */
export interface TypeRule {
    readonly source: string;
    /** With `values`: only rows whose cell in this column is listed. */
    readonly column?: string;
    readonly values?: readonly CellValue[];
    /** Only the nodes the source's edges reach at this end. */
    readonly end?: "source" | "target";
    /** Only what the `join.edges` step with this `part` makes. */
    readonly part?: number;
}

/** One entry of the type registry (3.7): a type is declared, never guessed. */
export interface TypeEntry {
    /** The type's id, read as `graphty.type`. */
    readonly name: string;
    readonly kind: "node" | "edge";
    /** The type's default name for a reader; absent means `name`. An application may show it or replace it. */
    readonly plainName?: string;
    /** Which rows or ends of which source carry the type. */
    readonly rules: readonly TypeRule[];
    /** What the type's elements are expected to carry, by column; kept and saved, not checked by the build. */
    readonly schema?: Readonly<Record<string, unknown>>;
}

/** The id of the reader source: the reader's own edits, built after every step (3.2). */
export const READER_SOURCE = "reader";

/** The frozen id space a node the reader adds lives in (3.1). */
export const READER_SPACE = "source:reader";

/** A node named by its id space and key. */
export interface NodeRef {
    readonly space: string;
    readonly key: string;
}

/** An edge named by the source that made it and its key within that source. */
interface EdgeRef {
    readonly load: string;
    readonly key: string;
}

/** A node or edge reference; binds through live keys and aliases on every build (3.2). */
export type ElementRef = NodeRef | EdgeRef;

/** The element a reader operation names: a node or an edge. */
type ReaderTarget =
    { readonly node: NodeRef; readonly edge?: never } | { readonly edge: EdgeRef; readonly node?: never };

/** A reader operation that removes one node (with its edges) or one edge. */
type ReaderRemove = { readonly id: string; readonly op: "remove" } & ReaderTarget;

/** A reader operation that adds one node; it always lands in {@link READER_SPACE}, whatever space it names. */
interface ReaderAdd {
    readonly id: string;
    readonly op: "add";
    readonly node: NodeRef;
    /** The node's type; absent means the default type. */
    readonly type?: string | null;
    readonly columns?: Readonly<Record<string, CellValue>>;
}

/**
 * A reader operation that adds one edge between two nodes, keyed `{ load: "reader", key }`. An end
 * no node holds is added in {@link READER_SPACE}, as an edge file's end makes its node.
 */
interface ReaderAddEdge {
    readonly id: string;
    readonly op: "add-edge";
    readonly edge: { readonly load: typeof READER_SOURCE; readonly key: string };
    readonly from: NodeRef;
    readonly to: NodeRef;
    readonly weight?: number | null;
    readonly columns?: Readonly<Record<string, CellValue>>;
}

/** A reader operation that sets one cell; it wins over every step (3.8). */
export type ReaderEdit = {
    readonly id: string;
    readonly op: "edit";
    readonly column: string;
    readonly value: CellValue;
    /** The value shown under the cell when the edit was made (7.12). */
    readonly was?: Value | null;
    /** The source whose value a pick or Use took; a typed value has none (3.10). */
    readonly picked?: string;
} & ReaderTarget;

/** One operation of the reader source, applied in the order made, after the steps (3.2). */
export type ReaderOp = ReaderRemove | ReaderAdd | ReaderAddEdge | ReaderEdit;

/** Everything the build reads besides the copies. */
export interface BuildInput {
    readonly sources: Readonly<Record<string, Source>>;
    readonly steps: readonly Step[];
    readonly types?: readonly TypeEntry[];
    /** Parallel edges a step does not reduce itself; default `"keep"`. */
    readonly repeatedEdges?: DuplicatePolicy;
    /** The reader source's operations, in the order made. */
    readonly reader?: readonly ReaderOp[];
}

/** One source's value for one cell. */
export interface OwnValue {
    readonly v: Value;
    readonly step: number;
    readonly row: number;
}

/** One row a step read into an element. */
interface Touch {
    readonly step: number;
    readonly source: string;
    readonly table: TableName;
    readonly row: number;
    readonly cells: Row;
    /** The row only names the node, by a value of a column: it is not the node's own row. */
    readonly valued?: true;
}

/** A clash column a `both` rule wrote (3.3). */
interface ClashColumn {
    readonly column: string;
    readonly base: string;
    readonly source: string;
}

/** What a built node and a built edge share. */
export interface BuiltElement {
    /** Internal id, unique in the build. */
    id: string;
    key: string;
    type: string | null;
    /** The sources that supplied it (3.1). */
    loads: string[];
    /** The sources that only named it (3.1). */
    named: string[];
    values: Record<string, Value>;
    /** The source whose value each cell shows, or `rule:mean` for a computed one. */
    origin: Record<string, string>;
    own: Record<string, Record<string, OwnValue>>;
    touch: Touch[];
    /** The clash rule that settled each column another source also filled. */
    rule?: Record<string, ClashRule>;
    /** The step whose rule settled each such column. */
    ruleStep?: Record<string, number>;
    /** The steps whose value for each column differed from the one shown before it, in order. */
    differAt?: Record<string, number[]>;
    /** The reader edit that sets each edited column. */
    edited?: Record<string, ReaderEdit>;
    clashColumns?: Record<string, ClashColumn>;
    time: number | null;
    timeFrom: string | null;
}

/** A node of the working graph. */
export interface BuiltNode extends BuiltElement {
    space: string;
    /** The types of node 2s merged into it (3.4). */
    otherTypes: (string | null)[];
    /** The `{ space, key }` of node 2s merged into it, and of its own former place. */
    aliases: { space: string; key: string; type: string | null }[];
    /** Values a repeat of one source left in the provenance only. */
    alt?: { src: string; col: string; v: Value; from?: string }[];
    /** Sources whose edge ends reach it; settled into `loads` or `named` after the build. */
    ends?: string[];
}

/** An edge of the working graph, keyed `{ load, key }`. */
export interface BuiltEdge extends BuiltElement {
    load: string;
    from: string;
    to: string;
    weight: number | null;
    weightMeaning: string | null;
    /** The edge's own source reads a weight but had none for it, so it reads 1. */
    weightDefault: boolean;
    timeEnd?: number;
    /** The columns the step that made it read its ends from. */
    ends?: { readonly source: string; readonly target: string };
}

/** What became of one row a source holds. */
export type RowFateKind =
    | "built"
    | "left-out:empty-key"
    | "left-out:empty-end"
    | "left-out:unmatched"
    | "left-out:fan-out"
    | "left-out:no-step";

/** The fate of one row, and the elements it built. */
export interface RowFate {
    fate: RowFateKind;
    elements: string[];
}

/** One step's counts (the buckets `data.steps()` will return). */
export interface StepStats {
    readonly step: number;
    readonly op: Step["op"];
    readonly source: string;
    readonly part?: number;
    newNodes: number;
    newEdges: number;
    /** For `join.edges`: edges earlier steps made that its rows folded into (`existing: "merge"`). */
    mergedEdges: number;
    matched: number;
    unmatched: number;
    fanOut: number;
    rowsDiffer: number;
    valuesDiffer: Record<string, number>;
    /** Columns a numeric rule met values that are not all numbers in. */
    ruleType: Record<string, number>;
    merged: number;
    typeDiffers: number;
    untouched: number;
    /**
     * For `join.merge`: node 2s left in the graph as nodes of their own, or nodes its edge rows made
     * (none under Only 2 Drop).
     */
    keptNew: number;
    groups: number[];
    selfLoops: number;
    /** For a `join.edges` that links: pairs sharing fewer values than `minShared`, so not linked. */
    pairsBelowMin: number;
    emptyKey: number;
    repeatedKept: number;
    hub: { value: string; rows: number }[];
    /** Rows of one repeated key whose values differ, by column (the cells `rowsDiffer` counts). */
    rowsDifferIn: Record<string, number>;
    /** End pairs this step joined with an edge when an earlier edge already joined them. */
    parallelPairs: number;
    /** Edge ends that found a node already built, by the space they look in. */
    endsMeet: Record<string, number>;
    /** Edge ends that found no node, so made one or left the row out, by space. */
    endsMissing: Record<string, number>;
    /** For `join.add`: nodes of the source's own space its edges name but its node rows lack. */
    namedOnly: number;
    /** Key values reaching more than one node (the keys behind `fanOut`). */
    repeated1: number;
    /** Key values the step's own rows hold more than once. */
    repeated2: number;
    /** Nodes this step made that the graph holds, by type; untyped ones are left out. */
    newNodeTypes: Record<string, number>;
    /** Edges this step made that the graph holds, by type; untyped ones are left out. */
    newEdgeTypes: Record<string, number>;
}

/** A build outcome, as a code and its parameters. */
export type BuildIssue =
    | { readonly code: "W_KEY_EMPTY"; readonly params: { source: string; column: string; rows: number } }
    | { readonly code: "W_VALUE_HUB"; readonly params: { source: string; column: string; value: string; rows: number } }
    | { readonly code: "E_EDGE_KEY_COLLISION"; readonly params: { load: string; key: string; steps: number[] } }
    | { readonly code: "W_REFERENCE_UNBOUND"; readonly params: { ref: ElementRef; edit: string } };

/**
 * One thing a step's count counted, kept so a draft's preview can list what is behind each count:
 * a row of a source, an element, a key, or a cell (an element and a column).
 */
export interface DrillUnit {
    /** The source whose row it is; absent, the step's own source. */
    readonly source?: string;
    /** The row's table, when known without its element. */
    readonly table?: TableName;
    /** The row's place in its table. */
    readonly row?: number;
    /** The element's internal id when it was counted; later merges and moves reach it through the aliases. */
    readonly element?: string;
    /** The key it was counted by, for a count of keys or of node 2s. */
    readonly key?: string;
    /** The column, space or type of a count kept by name. */
    readonly name?: string;
}

/** Whether one reader operation found its element. */
export interface ReaderResult {
    readonly id: string;
    readonly applied: boolean;
}

/** The working graph the steps build, and what the build counted. */
export interface BuildResult {
    readonly nodes: Map<string, BuiltNode>;
    readonly edges: Map<string, BuiltEdge>;
    /** A node 2's or moved node's former internal id to the node it is now. */
    readonly aliases: Map<string, string>;
    /** A reduced edge's row key to the edge it folded into. */
    readonly edgeAliases: Map<string, string>;
    readonly stats: StepStats[];
    readonly issues: BuildIssue[];
    /**
     * The first row that repeats an end pair under `repeatedEdges` "error", by the internal ids of its
     * ends; a commit refuses the build with `E_DUPLICATE_EDGE`, as a load without the experiment does.
     */
    readonly duplicate?: { readonly from: string; readonly to: string; readonly repeat: Row };
    /** Per source, per `<table>#<row>`. */
    readonly fates: Map<string, Map<string, RowFate>>;
    /** Each reader operation, in order, and whether it applied. */
    readonly readerResults: ReaderResult[];
    /** What each count of each built step counted: by step place, then by count name. */
    readonly drill: ReadonlyMap<number, ReadonlyMap<string, readonly DrillUnit[]>>;
}
