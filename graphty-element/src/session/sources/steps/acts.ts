/**
 * @file The acts on sources and steps (design design/data/multiple-data-sources-design.md,
 * sections 3.6, 3.10, 4.3 and 4.4), behind the `source-steps` experiment: Merge, Make an edge,
 * Extract, Move columns, a per-source Rename, a pick, and deleting a step. Each act turns the value
 * it finds into the next one, adding the steps and type rules section 3.6 names; a door dispatches
 * it as one `data.steps-set` step. Add of a staged source is here too. Pure, and free of Babylon.js, Lit and the DOM.
 */

import type { GraphtyErrorCode } from "../../../errors/codes";
import { GraphtyError } from "../../../errors/GraphtyError";
import type { JoinReduce } from "../../types";
import { copyKey, freeName, isStaged, mintPart, nodeSpace, ownSpace, stepSources, tableRows } from "./build";
import {
    addSource,
    buildOf,
    checkSpace,
    type Copies,
    copyMap,
    declared,
    type SourceSteps,
    stepSpaces,
    type StepsSource,
    withSourceRules,
} from "./project";
import { checkClashRule, conflicts, isOutcome, pickEdit, type Rename, renameColumn } from "./provenance";
import type {
    Aggregate,
    ClashRule,
    EdgesStep,
    ElementRef,
    Mapping,
    MergeStep,
    NodeValuesStep,
    RowFilter,
    Step,
    StepJoin,
    TableName,
} from "./types";

/** A column of one source. */
interface FieldRef {
    readonly source: string;
    readonly field: string;
}

/**
 * The node 1 side of Merge or Make an edge: a source's key (or another field of it, translated
 * through the source's rows), or every node of an id space (by its key, or by a column the nodes
 * carry as the steps before build them).
 */
export type JoinInto =
    | { readonly source: string; readonly field?: string; readonly space?: string }
    | { readonly space: string; readonly source?: undefined; readonly field?: string };

/** Merge 2 into 1 (3.6). */
interface MergeAct {
    /** The join the act is one of (`SourceJoinTag`), kept on each step it writes. */
    readonly join?: StepJoin;
    readonly from: FieldRef;
    readonly into: JoinInto;
    readonly unmatchedFrom?: "keep" | "drop";
    readonly clash?: ClashRule | Readonly<Record<string, ClashRule>>;
    /** `"first"` or `"last"` row wins; any other reduction is `aggregate: { "*": rule }`. */
    readonly repeated?: JoinReduce;
    readonly except?: RowFilter;
    readonly ignoreCase?: boolean;
    readonly ignoreSpaces?: boolean;
    /** The working columns a staged source 2 brings besides its key; absent means every column. */
    readonly columns?: readonly string[];
    /** Per column (`"*"` for every column it does not match on), how a node's repeated rows reduce. */
    readonly aggregate?: Aggregate;
    /** A row whose value names several node 1s: left out (default), or folded into each of them. */
    readonly fanOut?: "skip" | "each";
}

/** Make an edge (3.6): each row of the source becomes an edge between its node and node 1. */
interface ConnectAct {
    /** The join the act is one of (`SourceJoinTag`), kept on each step it writes. */
    readonly join?: StepJoin;
    readonly from: FieldRef;
    readonly into: JoinInto;
    /** `"into-from"` (default) runs each edge from node 1 to the source's node. */
    readonly direction?: "into-from" | "from-into";
    readonly edgeType?: string;
    readonly ignoreCase?: boolean;
    readonly ignoreSpaces?: boolean;
    readonly perPair?: boolean;
    readonly unmatched?: "skip" | "add";
    /**
     * The other end: each row becomes an edge between node 1 and the node this field names, making
     * no node, or under `keepRow` a node of its own with an edge to each.
     */
    readonly to?: {
        readonly field: string;
        readonly into: JoinInto;
        readonly keepRow?: boolean;
        readonly unmatched?: "add";
        readonly type?: string;
    };
    /** A row whose ends an edge already joins: add another (default), or fold its columns into that edge. */
    readonly existing?: "add" | "merge";
    /** A row whose value names several nodes: no edge (default), or an edge to each. */
    readonly fanOut?: "skip" | "each";
    /** A row kept as a node that no edge reaches: kept (default), dropped when a join made it, or taken out. */
    readonly unlinked?: "keep" | "drop" | "remove";
}

/** Extract (4.3): one column becomes nodes, joined to an edge row's end or to the row's own node by new edges. */
interface ExtractAct {
    /** The join the act is one of (`SourceJoinTag`), kept on each step it writes. */
    readonly join?: StepJoin;
    readonly column: string;
    readonly space?: string;
    readonly type?: string;
    readonly edgeType?: string;
    /** Columns moved onto the extracted nodes. */
    readonly columns?: readonly string[];
    /** Where the new edges start: an end of an edge row (default `"source"`), or the node a node row is. */
    readonly from?: "source" | "target" | "row";
    /** The separator a cell holds several values by: one node each. */
    readonly split?: string;
}

/** Link nodes whose rows share a value. */
interface LinkAct {
    /** The join the act is one of (`SourceJoinTag`), kept on each step it writes. */
    readonly join?: StepJoin;
    readonly source: string;
    readonly columns: readonly string[];
    /** The column naming the node that holds each row's values; absent, the row's own node. */
    readonly field?: string;
    /** The nodes `field` names; absent, the source's own by that column. */
    readonly into?: JoinInto;
    /** The space whose nodes hold the values, as the steps before build them, instead of the source's rows. */
    readonly nodes?: string;
    /** One edge per pair sharing a value (default), or one node per shared value. */
    readonly as?: "edges" | "nodes";
    readonly maxShared?: number;
    readonly minShared?: number;
    readonly edgeType?: string;
    /** The type and space of the nodes `as: "nodes"` makes. */
    readonly type?: string;
    readonly space?: string;
    readonly ignoreCase?: boolean;
    readonly ignoreSpaces?: boolean;
}

/** The hub cap of a link that names none, as `JoinLink` has it. */
const MAX_SHARED = 10;

/** Move columns (4.3): an edge source's columns onto the nodes at one end, or the nodes a column names. */
interface MoveColumnsAct {
    readonly columns: readonly string[];
    readonly to: "source" | "target" | { readonly column: string; readonly space: string };
}

/** One act, as `data.steps-set` carries it. */
export type StepsAct =
    | { readonly act: "merge"; readonly options: MergeAct }
    | { readonly act: "connect"; readonly options: ConnectAct }
    | { readonly act: "extract"; readonly source: string; readonly options: ExtractAct }
    | { readonly act: "link"; readonly options: LinkAct }
    | { readonly act: "move-columns"; readonly source: string; readonly options: MoveColumnsAct }
    | { readonly act: "rename"; readonly rename: Rename }
    | {
          readonly act: "pick";
          readonly id: string;
          readonly ref: ElementRef;
          readonly column: string;
          readonly source: string;
      }
    | { readonly act: "remove-step"; readonly index: number; readonly adds?: "keep" | "remove" }
    /** Make a join act again in one step's place, keeping the old step's rows left out and clash rules. */
    | {
          readonly act: "replace-step";
          readonly index: number;
          readonly with:
              | { readonly act: "merge"; readonly options: MergeAct }
              | { readonly act: "connect"; readonly options: ConnectAct }
              | { readonly act: "link"; readonly options: LinkAct }
              | { readonly act: "extract"; readonly source: string; readonly options: ExtractAct };
      }
    /** Move one step to another place in the build order (an edited act keeps its step's place). */
    | { readonly act: "move-step"; readonly index: number; readonly to: number }
    /** Turn one step off (kept and listed, not built) or back on (7.13). */
    | { readonly act: "set-step-off"; readonly index: number; readonly off: boolean }
    | { readonly act: "add-staged"; readonly source: string; readonly overlap?: "separate" | "merge" }
    /** Change a staged source's mapping, space or type (5.1): Rows are, Key, Space, Type, the edge ends. */
    | { readonly act: "set-mapping"; readonly source: string; readonly patch: MappingPatch };

/** What `setMapping` may change on a source. */
export interface MappingPatch {
    /** What its rows are: node rows, edge rows, or both; only for a source that read one table. */
    readonly rows?: "nodes" | "edges" | "both";
    /** The id space its node keys live in; naming one means a later Add never asks the overlap question. */
    readonly space?: string;
    /** Its node type, written as its whole-source rule; `null` gives it none. */
    readonly type?: string | null;
    /** Roles of its node rows, merged into its node mapping. */
    readonly nodes?: Partial<NonNullable<Mapping["nodes"]>>;
    /** Roles of its edge rows, merged into its edge mapping. */
    readonly edges?: Partial<NonNullable<Mapping["edges"]>>;
    /** The node types of its edge ends, written as end rules; `null` takes one off. */
    readonly endTypes?: { readonly source?: string | null; readonly target?: string | null };
}

/**
 * A refusal.
 * @param code - Its code.
 * @param message - For developers.
 * @param details - Its parameters.
 * @returns The error.
 */
function refused(code: GraphtyErrorCode, message: string, details: Record<string, unknown>): GraphtyError {
    return new GraphtyError({ code, message, source: "data", details });
}

/**
 * The source an act names, or a refusal.
 * @param value - The value.
 * @param id - The source's id.
 * @returns The source.
 */
export function sourceOf(value: SourceSteps, id: string): StepsSource {
    const src = value.sources[id] as StepsSource | undefined;
    if (src === undefined) {
        throw refused("E_LOAD_UNKNOWN", `No source has key ${JSON.stringify(id)}.`, {
            key: id,
            known: Object.keys(value.sources),
        });
    }
    return src;
}

/**
 * The source of a Merge or Make an edge: its node rows, or, read as edges, its edge rows, which name
 * a node by any of their fields as node rows do.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param id - The source's id.
 * @returns The source and the table its rows are read from.
 * @throws A `GraphtyError` with `E_STEP_NEEDS_NODES` when it holds no rows of either kind.
 */
function rowSource(value: SourceSteps, copies: Copies, id: string): { src: StepsSource; table: TableName } {
    const src = sourceOf(value, id);
    if (src.mapping.nodes === undefined && (copies[copyKey(src)]?.edges?.length ?? 0) > 0) {
        return { src, table: "edges" };
    }
    if (src.mapping.nodes === undefined || (copies[copyKey(src)]?.nodes?.length ?? 0) === 0) {
        throw refused("E_STEP_NEEDS_NODES", `Source ${id} holds no rows.`, { source: id });
    }
    return { src, table: "nodes" };
}

/**
 * Refuse a field a source's rows do not hold, such as one an earlier join brought its nodes: no row
 * of it would match, and what matches nothing is made anew. Such a field is named by its space. Only
 * the acts ask, so a saved step whose rows changed since still replays.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param id - The source, if one is named.
 * @param field - The field, if one is.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`, reason `no-column`.
 */
function checkField(value: SourceSteps, copies: Copies, id: string | undefined, field: string | undefined): void {
    if (id === undefined || field === undefined || field.trim() === "") {
        return;
    }
    const src = sourceOf(value, id);
    const tables = [
        ...(src.mapping.nodes === undefined ? [] : ["nodes" as const]),
        ...(src.mapping.edges === undefined ? [] : ["edges" as const]),
    ];
    const read = tables.flatMap((table) => tableRows(src, copyMap(copies), table) ?? []);
    if (read.length > 0 && !read.some((row) => field in row)) {
        throw refused("E_BAD_COMMAND", `Source ${id} holds no column ${JSON.stringify(field)}.`, {
            reason: "no-column",
            source: id,
            column: field,
        });
    }
}

/**
 * The rows of a Merge or Make an edge, with a staged node 1 added first, so its nodes are there to join.
 * @param prior - The value.
 * @param copies - The rows as read.
 * @param s1 - Node 1's source, if it names one to add.
 * @param id - The source of the rows.
 * @returns The value, and the rows' source and table.
 */
function rowsOnto(
    prior: SourceSteps,
    copies: Copies,
    s1: string | undefined,
    id: string,
): { value: SourceSteps; src: StepsSource; table: TableName } {
    const value = s1 !== undefined && isStaged(prior, s1) ? joinedSource(prior, copies, s1) : prior;
    return { value, ...rowSource(value, copies, id) };
}

/**
 * Whether a join act must add a source's node rows before it reads them: no `join.add` step of the
 * source is there to make its nodes.
 * @param value - The value.
 * @param id - The source's id.
 * @returns True when none is.
 */
function notAdded(value: SourceSteps, id: string): boolean {
    return !value.steps.some((s) => s.op === "join.add" && s.source === id);
}

/**
 * The source of Extract or Move columns, which must hold edge rows.
 * @param value - The value.
 * @param id - The source's id.
 * @returns The source's edge mapping.
 */
function edgeMapping(value: SourceSteps, id: string): NonNullable<StepsSource["mapping"]["edges"]> {
    const { edges } = sourceOf(value, id).mapping;
    if (edges === undefined) {
        throw refused("E_BAD_COMMAND", `Source ${id} holds no edge rows.`, { reason: "no-edges", source: id });
    }
    return edges;
}

/** What an act needs to know of node 1. */
export interface NodeOne {
    readonly space: string;
    /** Whether the field named is node 1's key, so no translation is needed. */
    readonly isKey: boolean;
    /** Node 1's key column in its source, for a translation. */
    readonly keyCol?: string;
    /** The column node 1's nodes are looked up by, when a space's column names them. */
    readonly nodeColumn?: string;
}

/**
 * The end of an edge source a field names: the one whose space is given, else the one whose column
 * the field is.
 * @param edges - The source's edge mapping.
 * @param ends - The space each end's keys live in.
 * @param ends.source - The source end's.
 * @param ends.target - The target end's.
 * @param field - The field.
 * @param space - The space, when one is given.
 * @returns The end, or null when none or, with no space, both are named.
 */
function endNamed(
    edges: NonNullable<Mapping["edges"]>,
    ends: { readonly source: string; readonly target: string },
    field: string,
    space: string | undefined,
): "source" | "target" | null {
    const named = (["source", "target"] as const).filter((end) =>
        space === undefined ? edges[end] === field : ends[end] === space,
    );
    return named.length === 1 || (space !== undefined && named.length === 2) ? named[0] : null;
}

/**
 * Node 1's space and key (3.6): a field of an edge source names the end whose column it is, or whose
 * space is given; an edge source whose two ends live in different spaces, given any other field or
 * none, is ambiguous.
 * @param value - The value.
 * @param into - Node 1.
 * @returns What the act needs.
 * @throws A `GraphtyError` with `E_AMBIGUOUS_ID` when the field names no one end's nodes, or
 *   `E_BAD_COMMAND` (reason `no-field`) for a space's column with no name.
 */
export function nodeOne(value: SourceSteps, into: JoinInto): NodeOne {
    if (into.source === undefined) {
        const { space, field } = into;
        if (field?.trim() === "") {
            throw refused("E_BAD_COMMAND", `A column of ${space} is named by no name.`, { reason: "no-field" });
        }
        return field === undefined ? { space, isKey: true } : { space, isKey: false, nodeColumn: field };
    }
    const s1 = sourceOf(value, into.source);
    const { edges } = s1.mapping;
    const ends = edges && {
        source: edges.sourceSpace ?? ownSpace(s1.id),
        target: edges.targetSpace ?? ownSpace(s1.id),
    };
    if (into.field !== undefined && edges && ends && s1.mapping.nodes === undefined) {
        const end = endNamed(edges, ends, into.field, into.space);
        if (end !== null) {
            const keyCol = edges[end];
            return { space: ends[end], isKey: into.field === keyCol, keyCol };
        }
        if (into.space !== undefined) {
            throw refused("E_AMBIGUOUS_ID", `No end of source ${s1.id} lives in ${into.space}.`, {
                source: s1.id,
                space: into.space,
            });
        }
    }
    const key = s1.mapping.nodes?.key;
    if (key !== undefined) {
        return { space: nodeSpace(s1), isKey: into.field === undefined || into.field === key, keyCol: key };
    }
    const spaces = [...new Set([ends?.source, ends?.target])].filter((s) => s !== undefined);
    if (spaces.length !== 1 || into.field !== undefined) {
        throw refused("E_AMBIGUOUS_ID", `Name which end of source ${s1.id} node 1 is, by its space.`, {
            source: s1.id,
            spaces,
        });
    }
    return { space: spaces[0], isKey: true };
}

/**
 * The type of the nodes a space already holds in the build.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param space - The space.
 * @returns The first node's type, or null.
 */
function typeIn(value: SourceSteps, copies: Copies, space: string): string | null {
    for (const n of buildOf(value, copies).nodes.values()) {
        if (n.space === space) {
            return n.type;
        }
    }
    return null;
}

/**
 * A node type rule, declared when a name is given.
 * @param value - The value.
 * @param kind - Node or edge.
 * @param name - The type, or nothing.
 * @param rule - Its rule.
 * @returns The value with the rule.
 */
function withRule(
    value: SourceSteps,
    kind: "node" | "edge",
    name: string | null | undefined,
    rule: SourceSteps["types"][number]["rules"][number],
): SourceSteps {
    if (name === undefined || name === null) {
        return value;
    }
    return { ...value, types: declared(value.types, { name, kind, plainName: name, rules: [rule] }) };
}

/**
 * Add a staged source with `join.add` in the space an act writes for it (3.6); its edge ends in the
 * space it proposed follow its nodes.
 * @param value - The value.
 * @param src - The staged source.
 * @param space - The space.
 * @param type - Its node type, or none.
 * @param mergeDuplicates - Whether repeated keys fill each other's empty cells.
 * @param columns - The working columns its node rows bring besides their roles; absent brings every one.
 * @returns The value with the source added.
 */
function addStaged(
    value: SourceSteps,
    src: StepsSource,
    space: string,
    type: string | null | undefined,
    mergeDuplicates = false,
    columns?: readonly string[],
): SourceSteps {
    const proposed = src.mapping.nodes?.space;
    const { edges } = src.mapping;
    const end = (s: string | undefined): string => (s === undefined || s === proposed ? space : s);
    const moved: StepsSource = {
        ...src,
        mapping: {
            ...src.mapping,
            nodes: { ...src.mapping.nodes, space },
            ...(edges === undefined
                ? {}
                : { edges: { ...edges, sourceSpace: end(edges.sourceSpace), targetSpace: end(edges.targetSpace) } }),
        },
    };
    const next: SourceSteps = {
        ...value,
        sources: { ...value.sources, [src.id]: moved },
        steps: [
            ...value.steps,
            {
                op: "join.add",
                source: src.id,
                joined: true,
                ...(mergeDuplicates ? { duplicateIds: "merge" } : {}),
                ...(columns === undefined ? {} : { columns }),
            },
        ],
    };
    return withRule(next, "node", type, { source: src.id });
}

/**
 * Add a staged source a join act needs the nodes of (see `AddStep.joined`).
 * @param value - The value.
 * @param copies - The rows as read.
 * @param id - The staged source.
 * @returns The value with the source added.
 */
function joinedSource(value: SourceSteps, copies: Copies, id: string): SourceSteps {
    const next = addSource(value, sourceOf(value, id), copies, undefined);
    const steps = next.steps.map((s, i) =>
        i === next.steps.length - 1 && s.op === "join.add" ? { ...s, joined: true as const } : s,
    );
    return { ...next, steps };
}

/**
 * Whether a step needs the nodes a source's `join.add` builds: it makes or folds the source's own row
 * nodes, reads its edges, or reads or writes an id space they are in. A step that only reads the
 * source's rows, as a Connect whose rows are edges between two ends does, needs none of them.
 * @param step - The step.
 * @param value - The value.
 * @param add - The source's `join.add`.
 * @returns True when it does.
 */
function needsNodesOf(step: Step, value: SourceSteps, add: Step): boolean {
    const id = add.source;
    if (step === add) {
        return false;
    }
    const others = stepSources(step).filter((each) => each !== step.source);
    const own = step.source === id && step.op === "join.merge" && step.read.table !== "edges";
    const spaces = stepSpaces(add, value.sources[id]);
    return (
        own ||
        others.includes(id) ||
        [...stepSpaces(step, value.sources[step.source])].some((space) => spaces.has(space))
    );
}

/**
 * The value without the adds a step was made with, once it is gone and no other step needs their
 * nodes: each of their sources is staged again. An add kept by an earlier removal stays.
 * @param before - The value the step was in.
 * @param gone - The step.
 * @param value - The value without it.
 * @returns The value.
 */
export function withoutAddsOf(before: SourceSteps, gone: Step, value: SourceSteps): SourceSteps {
    const made = new Set(
        before.steps.flatMap((add) =>
            add.op === "join.add" && add.joined === true && needsNodesOf(gone, before, add) ? [add.source] : [],
        ),
    );
    const at = value.steps.findIndex(
        (add) =>
            add.op === "join.add" &&
            add.joined === true &&
            made.has(add.source) &&
            // an add makes its own nodes: it needs no other source's, even in the same space
            !value.steps.some((step) => step.op !== "join.add" && needsNodesOf(step, value, add)),
    );
    return at === -1 ? value : withoutAddsOf(before, gone, withoutStep(value, at));
}

/**
 * A new part for a `join.edges` step of a source: one above every part present (3.3).
 * @param value - The value.
 * @param source - The source.
 * @returns The part and the value.
 */
function minted(value: SourceSteps, source: string): { part: number; value: SourceSteps } {
    return { part: mintPart(value, source), value };
}

/**
 * The members of an object that are defined.
 * @param members - The members.
 * @returns Them, without the undefined ones.
 */
function defined<T extends Record<string, unknown>>(members: T): Partial<T> {
    return Object.fromEntries(Object.entries(members).filter(([, v]) => v !== undefined && v !== false)) as Partial<T>;
}

/**
 * Refuse `repeated: "both"` off a `join.edges` step (3.3): only an edge step can keep two rows
 * naming one key as two elements.
 * @param op - The step's op.
 * @param repeated - The `repeated` asked for.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`, reason `repeated-both`.
 */
export function refuseBoth(op: Step["op"], repeated: string | null | undefined): void {
    if (repeated === "both" && op !== "join.edges") {
        throw refused("E_BAD_COMMAND", `A ${op} step cannot keep repeated rows both.`, {
            reason: "repeated-both",
            op,
        });
    }
}

/**
 * Merge 2 into 1 (3.6): a staged node 1 is added first, a staged source 2 in its own space, then
 * `join.merge` folds each of its nodes into the node 1 its field names. A source read as edges adds
 * nothing: `join.merge` folds its edge rows.
 * @param prior - The value.
 * @param copies - The rows as read.
 * @param o - The choices.
 * @returns The next value.
 */
function merge(prior: SourceSteps, copies: Copies, o: MergeAct): SourceSteps {
    refuseBoth("join.merge", o.repeated);
    checkField(prior, copies, o.from.source, o.from.field);
    checkField(prior, copies, o.into.source, o.into.field);
    // One spelling for several rows (#10056): a reduction given as `repeated` is aggregate's "*".
    const rowWins = o.repeated === undefined || o.repeated === "first" || o.repeated === "last";
    const repeated = rowWins ? o.repeated : undefined;
    const aggregate = rowWins || o.repeated === undefined ? o.aggregate : { "*": o.repeated, ...o.aggregate };
    const s1 = o.into.source === o.from.source ? undefined : o.into.source;
    const { value, src: s2, table } = rowsOnto(prior, copies, s1, o.from.source);
    const n1 = nodeOne(value, o.into);
    let next = value;
    if (table === "nodes" && notAdded(value, s2.id)) {
        const type = s2.stagedType ?? typeIn(value, copies, n1.space);
        next = addStaged(next, s2, ownSpace(s2.id), type, o.from.field === s2.mapping.nodes?.key, o.columns);
    }
    const step: MergeStep = {
        op: "join.merge",
        source: s2.id,
        read: { ...(table === "edges" ? { table } : {}), key: o.from.field, space: n1.space },
        unmatchedFrom: o.unmatchedFrom ?? "keep",
        ...defined({
            clash: o.clash,
            repeated,
            aggregate,
            except: o.except,
            ignoreCase: o.ignoreCase,
            ignoreSpaces: o.ignoreSpaces,
            fanOut: o.fanOut === "each" ? o.fanOut : undefined,
            columns: table === "edges" ? o.columns : undefined,
        }),
        ...throughOf(o.into, n1),
    };
    const out = { ...next, steps: [...next.steps, step] };
    if (o.clash !== undefined) {
        checkClash(out, copies, out.steps.length - 1, o.clash);
    }
    return out;
}

/**
 * Refuse a merge whose clash rule orders values that cannot be ordered (3.10): `min`, `max` or
 * `mean` on a column whose meeting values are not all numbers (or, for `min` and `max`, all dates).
 * @param value - The value with the merge step added.
 * @param copies - The rows as read.
 * @param index - The merge step's place.
 * @param clash - The step's rule, one for every column or one per column with `"*"` for the rest.
 * @throws A `GraphtyError` with `E_CLASH_RULE_TYPE { step, column, rule }`.
 */
export function checkClash(
    value: SourceSteps,
    copies: Copies,
    index: number,
    clash: NonNullable<MergeStep["clash"]>,
): void {
    const result = buildOf(value, copies);
    const rules: Readonly<Record<string, ClashRule>> = typeof clash === "string" ? { "*": clash } : clash;
    const columns = new Set(conflicts(result, { step: index }).map((c) => c.column));
    for (const column of columns) {
        const rule = rules[column] ?? rules["*"] ?? "keep";
        const out = checkClashRule(result, index, column, rule);
        if (out !== null) {
            throw refused(
                out.code as GraphtyErrorCode,
                `Rule ${rule} cannot order the values in ${column}.`,
                out.params,
            );
        }
    }
}

/**
 * Make an edge (3.6): a staged source 1 is added as `add-staged` adds it, a staged source 2 in its
 * own space (never node 1's), then `join.edges` reads its rows, one edge each, between node 1 and
 * the row's node. A source read as edges is not added: the step makes each of its rows a node.
 * @param prior - The value.
 * @param copies - The rows as read.
 * @param o - The choices.
 * @returns The next value.
 * @throws A `GraphtyError` with `E_JOIN_SPACE_SAME` when source 2 would land in node 1's space.
 */
function connect(prior: SourceSteps, copies: Copies, o: ConnectAct): SourceSteps {
    checkField(prior, copies, o.from.source, o.from.field);
    checkField(prior, copies, o.into.source, o.into.field);
    if (o.to !== undefined) {
        return connectRows(prior, copies, o, o.to);
    }
    const mirror = mirrored(prior, copies, o);
    if (mirror !== null) {
        return connect(prior, copies, mirror);
    }
    const { value, src: s2, table } = rowsOnto(prior, copies, o.into.source, o.from.source);
    const n1 = nodeOne(value, o.into);
    let next = value;
    if (table === "nodes" && notAdded(value, s2.id)) {
        const space = rowSpaceOf(s2, [n1.space]);
        next = addStaged(next, s2, space, s2.stagedType);
    }
    const row = next.sources[s2.id];
    const key = table === "nodes" ? row.mapping.nodes?.key : undefined;
    const one = { col: o.from.field, space: n1.space };
    const two = key === undefined ? null : { col: key, space: nodeSpace(row) };
    const intoFrom = (o.direction ?? "into-from") === "into-from";
    const [a, b] = intoFrom ? [one, two] : [two, one];
    return withEdgesStep(next, o, n1, {
        source: s2.id,
        read: { table, ...readEnds(a, b) },
        key,
        // an end with no column naming it is the row's own node
        ...(two === null ? { rowNode: intoFrom ? ("target" as const) : ("source" as const) } : {}),
    });
}

/**
 * The space a source's node rows land in when a Connect makes nodes of them: the one picked for it,
 * else its own.
 * @param src - The source.
 * @param ends - The spaces it connects to.
 * @returns The space.
 * @throws A `GraphtyError` with `E_JOIN_SPACE_SAME` when it is one of `ends`.
 */
export function rowSpaceOf(src: StepsSource, ends: readonly string[]): string {
    const space = src.spacePicked === true ? (src.mapping.nodes?.space ?? ownSpace(src.id)) : ownSpace(src.id);
    if (ends.includes(space)) {
        throw refused("E_JOIN_SPACE_SAME", `Source ${src.id} would land in ${space}, the space it connects to.`, {
            source: src.id,
            space,
        });
    }
    return space;
}

/** One end of an edge step: the column naming its node and the space the node lives in. */
interface EndRead {
    readonly col: string;
    readonly space: string;
}

/**
 * The ends an edge step reads; null for the row's own node.
 * @param a - The source end.
 * @param b - The target end.
 * @returns The step's `read` members.
 */
function readEnds(a: EndRead | null, b: EndRead | null): Omit<EdgesStep["read"], "table"> {
    return {
        ...(a === null ? {} : { source: a.col, sourceSpace: a.space }),
        ...(b === null ? {} : { target: b.col, targetSpace: b.space }),
    };
}

/**
 * The value with a Connect's `join.edges` step at the end, in a part of its own.
 * @param value - The value.
 * @param o - The choices.
 * @param n1 - Node 1.
 * @param at - The source, what the step reads, the column keying its edges, and its row node.
 * @param at.source - The source.
 * @param at.read - The table and ends.
 * @param at.key - The column keying each row's edge, if any.
 * @param at.rowNode - Where the row's own node stands, if the step needs it.
 * @param at.end - A Connect's other end.
 * @param at.end.which - Which edge end it is.
 * @param at.end.add - Whether its values naming no node make one.
 * @param at.end.type - The type its nodes are declared with.
 * @param at.end.column - The column its nodes are named by, when not by their key.
 * @returns The next value.
 */
function withEdgesStep(
    value: SourceSteps,
    o: ConnectAct,
    n1: NodeOne,
    at: {
        readonly source: string;
        readonly read: EdgesStep["read"];
        readonly key: string | undefined;
        readonly rowNode?: EdgesStep["rowNode"];
        readonly end?: {
            readonly which: "source" | "target";
            readonly add: boolean;
            readonly type?: string;
            readonly column?: string;
        };
    },
): SourceSteps {
    const mint = minted(value, at.source);
    const intoFrom = (o.direction ?? "into-from") === "into-from";
    const step: EdgesStep = {
        op: "join.edges",
        source: at.source,
        part: mint.part,
        read: {
            ...at.read,
            // one edge per pair keys the edges by their ends (build.ts edgeStepKey), not by the row
            ...(o.perPair === true || at.key === undefined || at.rowNode !== undefined ? {} : { edgeId: at.key }),
            weight: null,
        },
        unmatchedRows: o.unmatched === "add" ? "add" : "leave-out",
        ...(at.end?.add === true ? { addEnd: at.end.which } : {}),
        ...(o.perPair === true ? { repeated: "first" as const } : {}),
        ...defined({ ignoreCase: o.ignoreCase, ignoreSpaces: o.ignoreSpaces, rowNode: at.rowNode }),
        ...defined({
            fanOut: o.fanOut === "each" ? o.fanOut : undefined,
            unlinked:
                (at.rowNode !== undefined || o.to === undefined) && o.unlinked !== "keep" ? o.unlinked : undefined,
        }),
        ...existingOf(o.to !== undefined && o.to.keepRow !== true, o.existing),
        // Says which end is node 1, so the step reads back the way round it was made.
        ...(at.end?.which === "source" ? { viaEnd: "target" as const } : {}),
        ...(at.end?.column === undefined
            ? {}
            : { otherColumn: at.end.column, viaEnd: intoFrom ? ("source" as const) : ("target" as const) }),
        ...viaOf(o.into, n1, intoFrom),
    };
    const { stagedType } = value.sources[at.source];
    // Node rows take their source's type; an edge row kept as a node, the type its source was staged with.
    const typed = at.rowNode !== undefined && at.read.table === "edges" ? stagedType : undefined;
    let next: SourceSteps = { ...mint.value, steps: [...mint.value.steps, step] };
    next = withRule(next, "node", typed, { source: at.source, part: mint.part });
    next = withRule(next, "node", at.end?.type, { source: at.source, part: mint.part, end: at.end?.which });
    return withRule(next, "edge", o.edgeType, { source: at.source, part: mint.part });
}

/**
 * What an edge step does with a row whose ends an edge already joins. A row making no node brings its
 * columns to the edge it makes or folds into; a row that is a node keeps them itself.
 * @param rowsOnly - Whether the step's rows make no node.
 * @param existing - The choice.
 * @returns The step's `existing` and `columns`; absent columns bring every one.
 */
export function existingOf(
    rowsOnly: boolean,
    existing: "add" | "merge" | undefined,
): Pick<EdgesStep, "existing" | "columns"> {
    return {
        ...(existing === "merge" ? { existing } : {}),
        ...(rowsOnly ? {} : { columns: [] }),
    };
}

/**
 * The translation an edge step reads node 1 through when its field is not node 1's key.
 * @param into - Node 1 as the act names it.
 * @param n1 - Node 1.
 * @param intoFrom - Whether node 1 is the edges' source end.
 * @returns The translation and its `viaEnd`, or nothing for a key.
 */
function viaOf(into: JoinInto, n1: NodeOne, intoFrom: boolean): Through & Pick<EdgesStep, "viaEnd"> {
    const through = throughOf(into, n1);
    return Object.keys(through).length === 0 ? {} : { ...through, viaEnd: intoFrom ? "source" : "target" };
}

/** What a step looks node 1 up by when the field named is not its key. */
type Through = Pick<MergeStep, "via" | "mapping" | "nodeColumn">;

/**
 * What a step looks node 1 up by when the field is not its key: a source's rows, or a column its nodes carry.
 * @param into - Node 1 as the act names it.
 * @param n1 - Node 1.
 * @returns The step's `via` and `mapping`, or its `nodeColumn`, or nothing for a key.
 */
function throughOf(into: JoinInto, n1: NodeOne): Through {
    if (n1.nodeColumn !== undefined) {
        return { nodeColumn: n1.nodeColumn };
    }
    return n1.isKey || n1.keyCol === undefined
        ? {}
        : { via: into.source, mapping: { columns: [into.field ?? "", n1.keyCol], space: n1.space } };
}

/**
 * Make an edge from each row (3.6): the row's `from.field` names node 1, its `to.field` names the
 * other end, and the row itself makes no node, or under `keepRow` a node between the two. A staged
 * source an end names is added first, the rows' own too: its nodes are the ones named.
 * @param prior - The value.
 * @param copies - The rows as read.
 * @param o - The choices.
 * @param to - The other end.
 * @returns The next value.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` (reason `no-field`) when the other end names no
 *   field; with `E_JOIN_SPACE_SAME` when rows kept as nodes would land in a space they connect to.
 */
function connectRows(
    prior: SourceSteps,
    copies: Copies,
    o: ConnectAct,
    to: NonNullable<ConnectAct["to"]>,
): SourceSteps {
    if (to.field.trim() === "") {
        throw refused("E_BAD_COMMAND", `The other end names no field.`, { reason: "no-field" });
    }
    checkField(prior, copies, o.from.source, to.field);
    checkField(prior, copies, to.into.source, to.into.field);
    let value = prior;
    for (const end of [o.into.source, to.into.source]) {
        if (end !== undefined && isStaged(value, end)) {
            value = joinedSource(value, copies, end);
        }
    }
    const { src: rows, table } = rowSource(value, copies, o.from.source);
    const n1 = nodeOne(value, o.into);
    const n2 = nodeOne(value, to.into);
    // a source's nodes carry its columns by then
    const column = n2.isKey ? undefined : (n2.nodeColumn ?? to.into.field);
    const one = { col: o.from.field, space: n1.space };
    const two = { col: to.field, space: n2.space };
    const intoFrom = (o.direction ?? "into-from") === "into-from";
    const [a, b] = intoFrom ? [one, two] : [two, one];
    const keepRow = to.keepRow === true;
    if (keepRow && table === "nodes" && notAdded(value, rows.id)) {
        // Staged, its keys live only in the space it proposes: the step makes its nodes in this one.
        const space = rowSpaceOf(rows, [n1.space, n2.space]);
        const nodes = { ...rows.mapping.nodes, space };
        const moved = { ...rows, mapping: { ...rows.mapping, nodes } };
        value = { ...value, sources: { ...value.sources, [rows.id]: moved } };
    }
    return withEdgesStep(value, o, n1, {
        source: rows.id,
        read: { table, ...readEnds(a, b) },
        // An edge row source keys each edge by its edge id column, if it names one, else by the row.
        key: table === "nodes" ? rows.mapping.nodes?.key : rows.mapping.edges?.edgeId,
        ...(keepRow ? { rowNode: "middle" as const } : {}),
        end: { which: intoFrom ? "target" : "source", add: to.unmatched === "add", type: to.type, column },
    });
}

/**
 * Make a join act again in one step's place (3.6), as one value: the old step goes, the new act's
 * steps land where it was, and a step of the same source and op keeps the old one's rows left out
 * and clash rules unless the act names its own.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param index - The step's place.
 * @param act - The act.
 * @returns The next value.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` (reason `no-step`) for no step at `index`.
 */
function replaceStep(
    value: SourceSteps,
    copies: Copies,
    index: number,
    act: Extract<StepsAct, { act: "replace-step" }>["with"],
): SourceSteps {
    const old = value.steps[index] as Step | undefined;
    if (old === undefined) {
        throw refused("E_BAD_COMMAND", `No step at ${String(index)}.`, { reason: "no-step", index });
    }
    const gone = withoutStep(value, index);
    let next = joined(gone, copies, act);
    const made = next.steps.length - gone.steps.length;
    for (let i = 0; i < made; i++) {
        next = moveStep(next, gone.steps.length + i, index + i);
    }
    // an Extract's moved columns follow its edges
    const end = index + made - 1;
    const at = movedAfter(next.steps, end - 1) ? end - 1 : end;
    const last = next.steps[at];
    if (old.source !== last.source || old.op !== last.op) {
        return withoutAddsOf(value, old, next);
    }
    const kept = {
        ...last,
        ...(last.except === undefined && old.except !== undefined ? { except: old.except } : {}),
        ...(last.clash === undefined && old.clash !== undefined ? { clash: old.clash } : {}),
    };
    return withoutAddsOf(value, old, { ...next, steps: next.steps.map((s, i) => (i === at ? kept : s)) });
}

/**
 * The value a join act makes at the end.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param act - The act.
 * @returns The next value.
 */
function joined(
    value: SourceSteps,
    copies: Copies,
    act: Extract<StepsAct, { act: "replace-step" }>["with"],
): SourceSteps {
    const next = ((): SourceSteps => {
        switch (act.act) {
            case "merge":
                return merge(value, copies, act.options);
            case "connect":
                return connect(value, copies, act.options);
            case "link":
                return link(value, copies, act.options);
            default:
                return extract(value, act.source, copies, act.options);
        }
    })();
    return withJoin(value, next, act.options.join);
}

/**
 * The steps an act added, each carrying the join it was given (`SourceJoinTag`), whatever the act wrote
 * them as; a source it added keeps none, since one source may serve several joins.
 * @param before - The value before the act.
 * @param after - The value it made, its new steps at the end.
 * @param join - The join, if the act was given one.
 * @returns The value.
 */
function withJoin(before: SourceSteps, after: SourceSteps, join: StepJoin | undefined): SourceSteps {
    if (join === undefined) {
        return after;
    }
    const kept: StepJoin = { id: join.id, matches: [...join.matches] };
    return {
        ...after,
        steps: after.steps.map((step, i) =>
            i < before.steps.length || step.op === "join.add" ? step : { ...step, join: kept },
        ),
    };
}

/**
 * Make an edge from a column of source 1 that is not its key to source 2's key, read the other way
 * round: one edge per source 1 row, to the node 2 its column names. Read from source 2's rows, a
 * value several source 1 rows share would name several nodes and make no edge (fan-out, 3.5).
 * @param value - The value.
 * @param copies - The rows as read.
 * @param o - The choices.
 * @returns The same act with its fields swapped, or null when it reads as it is.
 */
function mirrored(value: SourceSteps, copies: Copies, o: ConnectAct): ConnectAct | null {
    const s1 = o.into.source;
    const field1 = o.into.field;
    if (s1 === undefined || field1 === undefined) {
        return null;
    }
    const one = sourceOf(value, s1).mapping.nodes?.key;
    const two = rowSource(value, copies, o.from.source).src.mapping.nodes?.key;
    if (one === undefined || field1 === one || o.from.field !== two) {
        return null;
    }
    return {
        ...o,
        from: { source: s1, field: field1 },
        into: { source: o.from.source },
        direction: (o.direction ?? "into-from") === "into-from" ? "from-into" : "into-from",
    };
}

/**
 * Extract (4.3): `join.edges` from one end, or from the row's own node, to the column's values, read
 * once per end pair, the new nodes typed by an end rule. A node source's, and any whose cells are
 * split, carries the moved columns itself; an edge source's follow with `join.node-values`. A staged
 * node source is added first.
 * @param prior - The value.
 * @param id - The source.
 * @param copies - The rows as read.
 * @param o - The choices.
 * @returns The next value.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`: reason `no-field` for no column, `split` for an empty
 *   separator, `no-nodes` or `no-edges` for a source without the rows `from` reads.
 */
function extract(prior: SourceSteps, id: string, copies: Copies, o: ExtractAct): SourceSteps {
    if (o.column.trim() === "") {
        throw refused("E_BAD_COMMAND", "Extract names no column.", { reason: "no-field" });
    }
    checkSplit(o.split);
    const from = o.from ?? (sourceOf(prior, id).mapping.edges === undefined ? "row" : "source");
    if (from === "row" || o.split !== undefined) {
        return extractRows(prior, id, copies, o, from);
    }
    const value = prior;
    const m = edgeMapping(value, id);
    const space = o.space ?? o.type ?? freeSpace(value, o.column);
    const mint = minted(value, id);
    const step: EdgesStep = {
        op: "join.edges",
        source: id,
        part: mint.part,
        read: {
            table: "edges",
            source: m[from],
            sourceSpace: m[`${from}Space`] ?? ownSpace(id),
            target: o.column,
            targetSpace: space,
            weight: null,
        },
        columns: [],
        repeated: "first",
    };
    let next: SourceSteps = { ...mint.value, steps: [...mint.value.steps, step] };
    next = withRule(next, "node", o.type, { source: id, part: mint.part, end: "target" });
    next = withRule(next, "edge", o.edgeType, { source: id, part: mint.part });
    if (o.columns !== undefined) {
        const values: NodeValuesStep = {
            op: "join.node-values",
            source: id,
            read: { table: "edges", key: o.column, space },
            columns: o.columns,
        };
        next = { ...next, steps: [...next.steps, values] };
    }
    return next;
}

/**
 * The space a column's values become nodes in when none is named: the column's name, unless rows of a
 * source are nodes there (the rows' own among them), where a value equal to a row's key would be that row.
 * @param value - The value.
 * @param column - The column.
 * @returns The space.
 */
export function freeSpace(value: SourceSteps, column: string): string {
    const taken = new Set(
        Object.values(value.sources).flatMap((src) => [
            ...(src.mapping.nodes === undefined ? [] : [nodeSpace(src)]),
            src.mapping.edges?.sourceSpace,
            src.mapping.edges?.targetSpace,
        ]),
    );
    return freeName(column, taken);
}

/**
 * Refuse an empty separator, which would split a cell into letters.
 * @param split - The separator, if any.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`, reason `split`.
 */
export function checkSplit(split: string | null | undefined): void {
    if (split === "") {
        throw refused("E_BAD_COMMAND", "A separator cannot be empty.", { reason: "split" });
    }
}

/**
 * An Extract whose one `join.edges` step carries the moved columns: each row, or the node a row is,
 * to the values of its cell.
 * @param prior - The value.
 * @param id - The source.
 * @param copies - The rows as read.
 * @param o - The choices.
 * @param from - Where the new edges start.
 * @returns The next value.
 */
function extractRows(
    prior: SourceSteps,
    id: string,
    copies: Copies,
    o: ExtractAct,
    from: NonNullable<ExtractAct["from"]>,
): SourceSteps {
    let value = prior;
    const asRow = from === "row";
    if (asRow) {
        const src = sourceOf(value, id);
        if (src.mapping.nodes === undefined) {
            throw refused("E_BAD_COMMAND", `Source ${id} holds no node rows.`, { reason: "no-nodes", source: id });
        }
        value = isStaged(value, id) ? joinedSource(value, copies, id) : value;
    }
    const space = o.space ?? o.type ?? freeSpace(value, o.column);
    const m = from === "row" ? null : edgeMapping(value, id);
    const mint = minted(value, id);
    const step: EdgesStep = {
        op: "join.edges",
        source: id,
        part: mint.part,
        read: {
            table: asRow ? "nodes" : "edges",
            ...(m === null || from === "row"
                ? {}
                : { source: m[from], sourceSpace: m[`${from}Space`] ?? ownSpace(id) }),
            target: o.column,
            targetSpace: space,
            weight: null,
        },
        columns: [],
        repeated: "first",
        ...(asRow ? { rowNode: "source" as const, unmatchedRows: "add" as const } : {}),
        extract: defined({ split: o.split, columns: o.columns }),
    };
    const next: SourceSteps = { ...mint.value, steps: [...mint.value.steps, step] };
    return withRule(
        withRule(next, "node", o.type, { source: id, part: mint.part, end: "target" }),
        "edge",
        o.edgeType,
        { source: id, part: mint.part },
    );
}

/**
 * The place of the `join.node-values` step moving an Extract's columns: the one right after it that
 * reads the same column into the same space.
 * @param steps - The steps.
 * @param index - The Extract's place.
 * @returns The step, or undefined when none follows or the step at `index` is no Extract.
 */
export function movedAfter(steps: readonly Step[], index: number): NodeValuesStep | undefined {
    const step = steps[index] as Step | undefined;
    const next = steps[index + 1] as Step | undefined;
    const made = step === undefined ? null : extractOf(step);
    if (made === null || made.extract !== undefined || next?.op !== "join.node-values") {
        return undefined;
    }
    const same =
        next.source === made.source && next.read.key === made.read.target && next.read.space === made.read.targetSpace;
    return same ? next : undefined;
}

/**
 * The step, when an Extract made it: one of the kind only `extractRows` makes, or an edge source's,
 * which makes one unweighted edge per pair, carries no column and says nothing of a row naming no node.
 * @param step - The step.
 * @returns It, or null when no Extract did.
 */
export function extractOf(step: Step): EdgesStep | null {
    if (step.op !== "join.edges" || step.link !== undefined) {
        return null;
    }
    const bare = step.columns?.length === 0 && step.read.weight === null && step.unmatchedRows === undefined;
    const plain = bare && step.read.table === "edges" && step.rowNode === undefined;
    return step.extract !== undefined || plain ? step : null;
}

/**
 * Refuse a hub cap or a minimum that links nothing or is no count.
 * @param maxShared - The hub cap, if given.
 * @param minShared - The minimum shared values, if given.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`, reason `max-shared` or `min-shared`.
 */
export function checkShared(maxShared: number | undefined, minShared: number | undefined): void {
    if (maxShared !== undefined && !(Number.isInteger(maxShared) && maxShared >= 2)) {
        throw refused("E_BAD_COMMAND", "A hub cap is at least 2.", { reason: "max-shared", maxShared });
    }
    if (minShared !== undefined && !(Number.isInteger(minShared) && minShared >= 1)) {
        throw refused("E_BAD_COMMAND", "A pair shares at least 1 value.", { reason: "min-shared", minShared });
    }
}

/**
 * Link nodes that share a value: `join.edges` reading the rows' values, held by each row's own node
 * or by the node `field` names. A staged source whose rows are nodes is added first, as is a staged
 * source `into` names; edge rows with no `field` become nodes the step makes.
 * @param prior - The value.
 * @param copies - The rows as read.
 * @param o - The choices.
 * @returns The next value.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`: reason `no-columns`, `no-field` for an `into` with no
 *   field, `nodes` for both a space's nodes and a field, `max-shared` or `min-shared`;
 *   `E_STEP_NEEDS_NODES` for a source with no rows; or
 *   `E_AMBIGUOUS_ID` when the field names no one set of nodes.
 */
function link(prior: SourceSteps, copies: Copies, o: LinkAct): SourceSteps {
    checkLink(o);
    checkLinkFields(prior, copies, o);
    const { source: id, field, nodes } = o;
    const { table } = rowSource(prior, copies, id);
    const into: JoinInto | undefined = field === undefined ? undefined : (o.into ?? { source: id, field });
    const value = nodes === undefined ? withHolders(prior, copies, id, table, into) : prior;
    const n1 = into === undefined ? null : nodeOne(value, into);
    const mint = minted(value, id);
    const asNodes = o.as === "nodes";
    let holder: Partial<EdgesStep> = { rowNode: "source" };
    if (n1 !== null && into !== undefined) {
        holder = viaOf(into, n1, true);
    } else if (nodes !== undefined) {
        holder = {};
    }
    const step: EdgesStep = {
        op: "join.edges",
        source: id,
        part: mint.part,
        read: {
            table,
            ...(n1 === null ? {} : { source: field, sourceSpace: n1.space }),
            ...(nodes === undefined ? {} : { sourceSpace: nodes }),
            ...(asNodes ? { targetSpace: o.space ?? o.type ?? ownSpace(id) } : {}),
            weight: null,
            time: null,
        },
        columns: [],
        unmatchedRows: "leave-out",
        link: {
            columns: [...o.columns],
            ...(nodes === undefined ? {} : { of: "nodes" as const }),
            ...(asNodes ? { as: "nodes" as const } : {}),
            maxShared: o.maxShared ?? MAX_SHARED,
            minShared: o.minShared ?? 1,
        },
        ...defined({ ignoreCase: o.ignoreCase, ignoreSpaces: o.ignoreSpaces }),
        ...holder,
    };
    const rule = { source: id, part: mint.part };
    let next: SourceSteps = { ...mint.value, steps: [...mint.value.steps, step] };
    const rowType = table === "edges" && n1 === null && nodes === undefined ? next.sources[id].stagedType : undefined;
    next = withRule(next, "node", rowType, rule);
    next = withRule(next, "node", asNodes ? o.type : undefined, { ...rule, end: "target" });
    return withRule(next, "edge", o.edgeType, rule);
}

/**
 * Refuse a link that names no column, no field for the nodes it names, or a count it cannot take.
 * @param o - The choices.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`, as {@link link} says.
 */
function checkLink(o: LinkAct): void {
    if (o.columns.length === 0 || o.columns.some((c) => c.trim() === "")) {
        throw refused("E_BAD_COMMAND", "A link names no column.", { reason: "no-columns" });
    }
    if (o.field === undefined ? o.into !== undefined : o.field.trim() === "") {
        throw refused("E_BAD_COMMAND", "The nodes a link's values are held by are named by no field.", {
            reason: "no-field",
        });
    }
    if (o.nodes !== undefined && o.field !== undefined) {
        throw refused(
            "E_BAD_COMMAND",
            "A link's values are held by the nodes of a space or by the ones its field names.",
            {
                reason: "nodes",
            },
        );
    }
    checkShared(o.maxShared, o.minShared);
}

/**
 * Refuse a link naming a column its rows do not hold.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param o - The choices.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`, reason `no-column`.
 */
function checkLinkFields(value: SourceSteps, copies: Copies, o: LinkAct): void {
    // a space's nodes hold what the steps before build them with
    for (const column of o.nodes === undefined ? [...o.columns, o.field] : []) {
        checkField(value, copies, o.source, column);
    }
    checkField(value, copies, o.into?.source, o.into?.field);
}

/**
 * The value with the staged source whose nodes hold a link's values added: the rows' own when each is
 * a node, or the one the link's field names.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param id - The link's source.
 * @param table - The table its rows are read from.
 * @param into - The nodes its field names, if it has one.
 * @returns The value.
 */
function withHolders(
    value: SourceSteps,
    copies: Copies,
    id: string,
    table: TableName,
    into: JoinInto | undefined,
): SourceSteps {
    const held = into === undefined ? id : into.source;
    const own = held === id;
    if (held === undefined || (own && (into !== undefined || table === "edges")) || !isStaged(value, held)) {
        return value;
    }
    return joinedSource(value, copies, held);
}

/**
 * Move columns (4.3): `join.node-values` reading the edge rows by one end, or by a column naming
 * nodes in a space.
 * @param value - The value.
 * @param id - The edge source.
 * @param o - The columns and where they go.
 * @returns The next value.
 */
function moveColumns(value: SourceSteps, id: string, o: MoveColumnsAct): SourceSteps {
    const m = edgeMapping(value, id);
    const read =
        typeof o.to === "string"
            ? { table: "edges" as TableName, key: m[o.to], space: m[`${o.to}Space`] ?? ownSpace(id) }
            : { table: "edges" as TableName, key: o.to.column, space: o.to.space };
    const step: NodeValuesStep = { op: "join.node-values", source: id, read, columns: o.columns };
    return { ...value, steps: [...value.steps, step] };
}

/**
 * Delete one step (3.6): a source left with no step is staged again, and the space an act wrote
 * for it goes back to the one it proposed. An Extract takes the step moving its columns with it.
 * @param value - The value.
 * @param index - The step's place.
 * @returns The next value.
 */
function withoutStep(value: SourceSteps, index: number): SourceSteps {
    const gone = value.steps[index] as Step | undefined;
    if (gone === undefined) {
        throw refused("E_BAD_COMMAND", `No step at ${String(index)}.`, { reason: "no-step", index });
    }
    const moved = movedAfter(value.steps, index);
    const next: SourceSteps = { ...value, steps: value.steps.filter((s, i) => i !== index && s !== moved) };
    const src = next.sources[gone.source] as StepsSource | undefined;
    if (src === undefined || !isStaged(next, src.id)) {
        return next;
    }
    const own = ownSpace(src.id);
    const { nodes, edges } = src.mapping;
    if (src.spacePicked === true && nodes?.space !== own) {
        // The space the reader picked is not one an act wrote: it stays.
        return next;
    }
    const proposal = src.stagedType ?? undefined;
    const back = (s: string | undefined): string | undefined => (s === own ? proposal : s);
    const proposed: StepsSource = {
        ...src,
        spacePicked: false,
        mapping: {
            ...(nodes === undefined ? {} : { nodes: { ...nodes, space: back(nodes.space) } }),
            ...(edges === undefined
                ? {}
                : { edges: { ...edges, sourceSpace: back(edges.sourceSpace), targetSpace: back(edges.targetSpace) } }),
        },
    };
    return { ...next, sources: { ...next.sources, [src.id]: proposed } };
}

/**
 * The value without one step and the adds it was made with.
 * @param value - The value.
 * @param index - The step's place.
 * @returns The value.
 */
export function withoutStepAndAdds(value: SourceSteps, index: number): SourceSteps {
    return withoutAddsOf(value, value.steps[index], withoutStep(value, index));
}

/**
 * The value without one step and the adds it was made with; without a source's add, and without the
 * joins of other sources that need the nodes it made: a join never names nodes that are not there.
 * @param value - The value.
 * @param index - The step's place.
 * @returns The value.
 */
function withoutStepAndAll(value: SourceSteps, index: number): SourceSteps {
    const gone = value.steps[index] as Step | undefined;
    if (gone?.op !== "join.add") {
        return withoutStepAndAdds(value, index);
    }
    const spaces = stepSpaces(gone, value.sources[gone.source]);
    const others = value.steps.filter((step) => step.op === "join.add" && step !== gone && step.off !== true);
    const made = new Set(others.flatMap((add) => [...stepSpaces(add, value.sources[add.source])]));
    const lost = new Set([...spaces].filter((space) => !made.has(space)));
    const needs = (step: Step): boolean =>
        step.op !== "join.add" &&
        step.source !== gone.source &&
        [...stepSpaces(step, value.sources[step.source])].some((space) => lost.has(space));
    let next = withoutStep(value, index);
    for (const step of value.steps.filter((each) => needs(each))) {
        const at = next.steps.indexOf(step);
        next = at === -1 ? next : withoutStepAndAdds(next, at);
    }
    return next;
}

/**
 * Move one step to another place in the build order: the steps between shift by one. Refused when
 * a step would read a source before the step that adds it.
 * @param value - The value.
 * @param index - The step's place.
 * @param to - Its new place.
 * @returns The next value.
 */
function moveStep(value: SourceSteps, index: number, to: number): SourceSteps {
    const step = value.steps[index] as Step | undefined;
    if (step === undefined) {
        throw refused("E_BAD_COMMAND", `No step at ${String(index)}.`, { reason: "no-step", index });
    }
    if (!Number.isInteger(to) || to < 0 || to >= value.steps.length) {
        throw refused("E_BAD_COMMAND", `No place ${String(to)} to move a step to.`, { reason: "no-step", index: to });
    }
    const steps = value.steps.filter((_, i) => i !== index);
    steps.splice(to, 0, step);
    const next: SourceSteps = { ...value, steps };
    const adds = new Map(steps.flatMap((s) => (s.op === "join.add" ? [[s.source, s] as const] : [])));
    const added = new Set<string>();
    // a step reading only a source's rows needs none of the nodes its add makes
    const tooEarly = (s: Step): boolean =>
        stepSources(s, next).some((id) => {
            const add = adds.get(id);
            return add !== undefined && !added.has(id) && needsNodesOf(s, next, add);
        });
    for (const s of steps) {
        if (s.op === "join.add") {
            added.add(s.source);
        } else if (tooEarly(s)) {
            throw refused("E_BAD_COMMAND", `Step ${String(index)} cannot come before the source it reads.`, {
                reason: "order",
                index,
                to,
            });
        }
    }
    return next;
}

/**
 * Turn one step off or back on (7.13): an off step is kept, listed and saved but not built; on, it
 * builds again, and a source whose only steps were off is built with it.
 * @param value - The value.
 * @param index - The step's place.
 * @param off - True to turn it off.
 * @returns The next value; the same value when the step is already so.
 */
function setStepOff(value: SourceSteps, index: number, off: boolean): SourceSteps {
    const step = value.steps[index] as Step | undefined;
    if (step === undefined) {
        throw refused("E_BAD_COMMAND", `No step at ${String(index)}.`, { reason: "no-step", index });
    }
    if ((step.off === true) === off) {
        return value;
    }
    const { off: _off, ...on } = step;
    const next: Step = off ? { ...step, off: true } : on;
    return { ...value, steps: value.steps.map((s, i) => (i === index ? next : s)) };
}

/**
 * A pick or Use (3.10): a reader edit taking one source's value for a cell.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param act - The pick.
 * @returns The next value.
 */
function pick(value: SourceSteps, copies: Copies, act: Extract<StepsAct, { act: "pick" }>): SourceSteps {
    const op = pickEdit(value, buildOf(value, copies), act);
    if (op === null) {
        throw refused("E_BAD_COMMAND", `Source ${act.source} holds no value for ${act.column} there.`, {
            reason: "no-value",
            source: act.source,
            column: act.column,
        });
    }
    if (isOutcome(op)) {
        throw refused(op.code as GraphtyErrorCode, `${op.code} for ${act.column}.`, op.params);
    }
    return { ...value, reader: [...value.reader, op] };
}

/**
 * The value an act makes.
 * @param value - The value now.
 * @param act - The act.
 * @param copies - The rows as read.
 * @returns The next value.
 * @throws A `GraphtyError` when the act is refused.
 */
export function applyAct(value: SourceSteps, act: StepsAct, copies: Copies): SourceSteps {
    switch (act.act) {
        case "merge":
        case "connect":
        case "extract":
        case "link":
            return joined(value, copies, act);
        case "move-columns":
            return moveColumns(value, act.source, act.options);
        case "rename": {
            sourceOf(value, act.rename.source);
            const out = renameColumn(value, new Map(Object.entries(copies)), act.rename, buildOf(value, copies));
            if (isOutcome(out)) {
                throw refused(out.code as GraphtyErrorCode, `${out.code} for ${act.rename.from}.`, out.params);
            }
            return out as SourceSteps;
        }
        case "pick":
            return pick(value, copies, act);
        case "add-staged": {
            const src = sourceOf(value, act.source);
            if (!isStaged(value, src.id)) {
                throw refused("E_BAD_COMMAND", `Source ${src.id} is not staged.`, {
                    reason: "not-staged",
                    source: src.id,
                });
            }
            return addSource(value, src, copies, act.overlap);
        }
        case "set-step-off":
            return setStepOff(value, act.index, act.off);
        case "move-step":
            return moveStep(value, act.index, act.to);
        case "replace-step":
            return replaceStep(value, copies, act.index, act.with);
        case "set-mapping":
            if (!isStaged(value, sourceOf(value, act.source).id)) {
                throw refused("E_BAD_COMMAND", `Source ${act.source} is not staged.`, {
                    reason: "not-staged",
                    source: act.source,
                });
            }
            return mapped(value, act.source, act.patch, copies);
        default:
            return act.adds === "remove" ? withoutStepAndAll(value, act.index) : withoutStep(value, act.index);
    }
}

/** The roles of a mapping patch that name a column of the rows. */
const COLUMN_ROLES: ReadonlySet<string> = new Set([
    "key",
    "source",
    "target",
    "edgeId",
    "weight",
    "time",
    "timeEnd",
    "latitude",
    "longitude",
    "coordinates",
    "country",
    "region",
    "city",
]);

/**
 * The copy a change of what a source's rows are makes (5.1): the one table it read, held as node
 * rows, edge rows or both.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param id - The source.
 * @param patch - The change.
 * @returns The copy to hold under the source's copy key, or undefined when its rows stay as they are.
 * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for an unknown source, or `E_BAD_COMMAND` (reason
 *   `many-tables`) for a source that read more than one table.
 */
export function rowsCopies(value: SourceSteps, copies: Copies, id: string, patch: MappingPatch): Copies | undefined {
    if (patch.rows === undefined) {
        return undefined;
    }
    const src = sourceOf(value, id);
    if (src.tables.length > 1) {
        throw refused("E_BAD_COMMAND", `Source ${id} read more than one table.`, { reason: "many-tables", source: id });
    }
    const key = copyKey(src);
    const rows = copies[key]?.nodes ?? copies[key]?.edges ?? [];
    return {
        [key]: {
            ...(patch.rows === "edges" ? {} : { nodes: rows }),
            ...(patch.rows === "nodes" ? {} : { edges: rows }),
        },
    };
}

/**
 * Refuse a column a table's rows do not hold.
 * @param src - The source, mapped as it will be.
 * @param copies - The rows as read.
 * @param table - The table.
 * @param roles - The roles the patch names for it.
 * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` `{ source, column, table }`.
 */
function checkColumns(src: StepsSource, copies: Copies, table: TableName, roles: object | undefined): void {
    const rows = tableRows(src, copyMap(copies), table) ?? [];
    for (const [role, column] of Object.entries(roles ?? {})) {
        if (COLUMN_ROLES.has(role) && typeof column === "string" && !rows.some((row) => column in row)) {
            throw new GraphtyError({
                code: "E_UNKNOWN_ATTRIBUTE",
                message: `Source ${src.id} holds no column ${JSON.stringify(column)} in its ${table}.`,
                source: "data",
                details: { source: src.id, column, table },
            });
        }
    }
}

/**
 * A source's mapping with a patch laid over it: the tables `rows` names, each with its roles.
 * @param src - The source.
 * @param patch - The change.
 * @returns The mapping.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` (reason `no-nodes`, `no-edges` or `no-ends`).
 */
function patchedMapping(src: StepsSource, patch: MappingPatch): Mapping {
    const { id } = src;
    const { nodes, edges } = src.mapping;
    const wantNodes = patch.rows === undefined ? nodes !== undefined : patch.rows !== "edges";
    const wantEdges = patch.rows === undefined ? edges !== undefined : patch.rows !== "nodes";
    if (!wantNodes && (patch.nodes !== undefined || patch.space !== undefined)) {
        throw refused("E_BAD_COMMAND", `Source ${id} holds no node rows.`, { reason: "no-nodes", source: id });
    }
    if (!wantEdges && (patch.edges !== undefined || patch.endTypes !== undefined)) {
        throw refused("E_BAD_COMMAND", `Source ${id} holds no edge rows.`, { reason: "no-edges", source: id });
    }
    const edgeMap = wantEdges ? { ...edges, ...patch.edges } : undefined;
    if (edgeMap !== undefined && (edgeMap.source === undefined || edgeMap.target === undefined)) {
        throw refused("E_BAD_COMMAND", `Source ${id} names no column for an edge end.`, {
            reason: "no-ends",
            source: id,
        });
    }
    const space = patch.space === undefined ? {} : { space: patch.space };
    return {
        ...(wantNodes ? { nodes: { ...nodes, ...patch.nodes, ...space } } : {}),
        ...(edgeMap === undefined ? {} : { edges: edgeMap as NonNullable<Mapping["edges"]> }),
    };
}

/**
 * A mapping whose node space follows a type picked while no space was: unpicked, the node space is
 * the type's proposal, as staging with a type makes it (5.1, 5.5); no type, the source's own.
 * @param src - The source.
 * @param patch - The change.
 * @param mapping - The mapping with the patch laid over it.
 * @returns The mapping.
 */
function proposedSpace(src: StepsSource, patch: MappingPatch, mapping: Mapping): Mapping {
    const proposes = patch.type !== undefined && patch.space === undefined && src.spacePicked !== true;
    if (!proposes || mapping.nodes === undefined) {
        return mapping;
    }
    const { space: _was, ...nodes } = mapping.nodes;
    return { ...mapping, nodes: patch.type === null ? nodes : { ...nodes, space: patch.type } };
}

/**
 * A source's mapping, space or type changed (5.1, 5.6), or what its rows are. A type writes the
 * source's whole-source and end rules again at once (9.1).
 * @param value - The value.
 * @param id - The source's id.
 * @param patch - The change.
 * @param copies - The rows as read, holding the tables `rows` names (see `rowsCopies`).
 * @returns The next value.
 * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for an unknown source, `E_SPACE_RESERVED` for a
 *   `graph:` space, `E_UNKNOWN_ATTRIBUTE` for a column the rows do not hold, or `E_BAD_COMMAND` for
 *   roles of a table the source does not hold (reason `no-nodes` or `no-edges`) or edge rows with no
 *   column for an end (reason `no-ends`).
 */
export function mapped(value: SourceSteps, id: string, patch: MappingPatch, copies: Copies): SourceSteps {
    const src = sourceOf(value, id);
    checkSpace(patch.space);
    checkSpace(patch.type ?? undefined);
    const mapping = proposedSpace(src, patch, patchedMapping(src, patch));
    const wantNodes = mapping.nodes !== undefined;
    const wantEdges = mapping.edges !== undefined;
    const { endTypes: _held, ...rest } = src;
    const endTypes = patch.endTypes === undefined ? src.endTypes : endTypesOf(src.endTypes, patch.endTypes);
    const next: StepsSource = {
        ...rest,
        mapping,
        ...(wantEdges && endTypes !== undefined ? { endTypes } : {}),
        ...(patch.rows === undefined
            ? {}
            : { tableRows: [...(wantNodes ? ["nodes" as const] : []), ...(wantEdges ? ["edges" as const] : [])] }),
        ...(patch.space === undefined ? {} : { spacePicked: true }),
        ...(patch.type === undefined ? {} : { stagedType: patch.type }),
    };
    checkColumns(next, copies, "nodes", patch.nodes);
    checkColumns(next, copies, "edges", patch.edges);
    let { types } = value;
    if (patch.type !== undefined || patch.endTypes !== undefined || patch.rows !== undefined) {
        const own = (rule: (typeof types)[number]["rules"][number]): boolean =>
            rule.source === id &&
            (Object.keys(rule).length === 1 || (rule.end !== undefined && rule.part === undefined));
        types = withSourceRules(
            types.map((t) => (t.kind === "node" ? { ...t, rules: t.rules.filter((r) => !own(r)) } : t)),
            next,
        );
    }
    return { ...value, sources: { ...value.sources, [id]: next }, types };
}

/**
 * A source's end types with a change laid over them.
 * @param held - The end types now.
 * @param patch - The change; `null` takes an end's type off.
 * @returns The end types.
 */
function endTypesOf(
    held: StepsSource["endTypes"],
    patch: NonNullable<MappingPatch["endTypes"]>,
): NonNullable<StepsSource["endTypes"]> {
    const pick = (end: "source" | "target"): string | undefined =>
        patch[end] === undefined ? held?.[end] : (patch[end] ?? undefined);
    const source = pick("source");
    const target = pick("target");
    return { ...(source === undefined ? {} : { source }), ...(target === undefined ? {} : { target }) };
}
