/**
 * @file The acts on sources and steps (design design/data/multiple-data-sources-design.md,
 * sections 3.6, 3.10, 4.3 and 4.4), behind the `source-steps` experiment: Merge, Make an edge,
 * Extract, Move columns, a per-source Rename, a pick, and deleting a step. Each act turns the value
 * it finds into the next one, adding the steps and type rules section 3.6 names; a door dispatches
 * it as one `data.steps-set` step. Add of a staged source is here too. Pure, and free of Babylon.js, Lit and the DOM.
 */

import type { GraphtyErrorCode } from "../../../errors/codes";
import { GraphtyError } from "../../../errors/GraphtyError";
import { isStaged, mintPart, nodeSpace, ownSpace } from "./build";
import { addSource, buildOf, type Copies, declared, type SourceSteps, type StepsSource } from "./project";
import { checkClashRule, conflicts, isOutcome, pickEdit, type Rename, renameColumn } from "./provenance";
import type { ClashRule, EdgesStep, ElementRef, MergeStep, NodeValuesStep, RowFilter, Step, TableName } from "./types";

/** A column of one source. */
interface FieldRef {
    readonly source: string;
    readonly field: string;
}

/**
 * The node 1 side of Merge or Make an edge: a source's key (or another field of it, translated
 * through the source's rows), or every node of an id space.
 */
type JoinInto =
    | { readonly source: string; readonly field?: string; readonly space?: string }
    | { readonly space: string; readonly source?: undefined; readonly field?: undefined };

/** Merge 2 into 1 (3.6). */
interface MergeAct {
    readonly from: FieldRef;
    readonly into: JoinInto;
    readonly unmatchedFrom?: "keep" | "drop";
    readonly clash?: ClashRule | Readonly<Record<string, ClashRule>>;
    readonly repeated?: "first" | "last";
    readonly except?: RowFilter;
    readonly ignoreCase?: boolean;
    readonly ignoreSpaces?: boolean;
    /** The working columns a staged source 2 brings besides its key; absent means every column. */
    readonly columns?: readonly string[];
}

/** Make an edge (3.6): each row of the source becomes an edge between its node and node 1. */
interface ConnectAct {
    readonly from: FieldRef;
    readonly into: JoinInto;
    /** `"into-from"` (default) runs each edge from node 1 to the source's node. */
    readonly direction?: "into-from" | "from-into";
    readonly edgeType?: string;
    readonly ignoreCase?: boolean;
}

/** Extract (4.3): one column of an edge source becomes nodes, joined to one end by new edges. */
interface ExtractAct {
    readonly column: string;
    readonly space?: string;
    readonly type?: string;
    readonly edgeType?: string;
    /** Columns moved onto the extracted nodes. */
    readonly columns?: readonly string[];
    /** The end the new edges start from; default `"source"`. */
    readonly from?: "source" | "target";
}

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
    | { readonly act: "move-columns"; readonly source: string; readonly options: MoveColumnsAct }
    | { readonly act: "rename"; readonly rename: Rename }
    | {
          readonly act: "pick";
          readonly id: string;
          readonly ref: ElementRef;
          readonly column: string;
          readonly source: string;
      }
    | { readonly act: "remove-step"; readonly index: number }
    | { readonly act: "add-staged"; readonly source: string; readonly overlap?: "separate" | "merge" };

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
function sourceOf(value: SourceSteps, id: string): StepsSource {
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
 * The source of a Merge or Make an edge, which must hold node rows.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param id - The source's id.
 * @returns The source.
 */
function nodeSource(value: SourceSteps, copies: Copies, id: string): StepsSource {
    const src = sourceOf(value, id);
    if (src.mapping.nodes === undefined || (copies[src.origin.copy]?.nodes?.length ?? 0) === 0) {
        throw refused("E_STEP_NEEDS_NODES", `Source ${id} holds no node rows.`, { source: id });
    }
    return src;
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
interface NodeOne {
    readonly space: string;
    /** Whether the field named is node 1's key, so no translation is needed. */
    readonly isKey: boolean;
    /** Node 1's key column in its source, for a translation. */
    readonly keyCol?: string;
}

/**
 * Node 1's space and key (3.6): an edge source names which end its field belongs to by a space;
 * an edge source whose two ends live in different spaces, given a field, is ambiguous.
 * @param value - The value.
 * @param into - Node 1.
 * @returns What the act needs.
 * @throws A `GraphtyError` with `E_AMBIGUOUS_ID` when the field names no one end's nodes.
 */
function nodeOne(value: SourceSteps, into: JoinInto): NodeOne {
    if (into.source === undefined) {
        return { space: into.space, isKey: true };
    }
    const s1 = sourceOf(value, into.source);
    const { edges } = s1.mapping;
    const ends = edges && {
        source: edges.sourceSpace ?? ownSpace(s1.id),
        target: edges.targetSpace ?? ownSpace(s1.id),
    };
    if (into.space !== undefined && into.field !== undefined && edges && ends && s1.mapping.nodes === undefined) {
        let keyCol: string | null = null;
        if (ends.source === into.space) {
            keyCol = edges.source;
        } else if (ends.target === into.space) {
            keyCol = edges.target;
        }
        if (keyCol === null) {
            throw refused("E_AMBIGUOUS_ID", `No end of source ${s1.id} lives in ${into.space}.`, {
                source: s1.id,
                space: into.space,
            });
        }
        return { space: into.space, isKey: into.field === keyCol, keyCol };
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
                ...(mergeDuplicates ? { duplicateIds: "merge" } : {}),
                ...(columns === undefined ? {} : { columns }),
            },
        ],
    };
    return withRule(next, "node", type, { source: src.id });
}

/**
 * A new part for a `join.edges` step of a source, recorded so a deleted step's part is never reused.
 * @param value - The value.
 * @param source - The source.
 * @returns The part and the value recording it.
 */
function minted(value: SourceSteps, source: string): { part: number; value: SourceSteps } {
    const part = mintPart(value, source, { high: value.parts?.[source] });
    return { part, value: { ...value, parts: { ...value.parts, [source]: part } } };
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
 * Merge 2 into 1 (3.6): a staged source 2 is added in its own space first, then `join.merge` folds
 * each of its nodes into the node 1 its field names.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param o - The choices.
 * @returns The next value.
 */
function merge(value: SourceSteps, copies: Copies, o: MergeAct): SourceSteps {
    refuseBoth("join.merge", o.repeated);
    const s2 = nodeSource(value, copies, o.from.source);
    const n1 = nodeOne(value, o.into);
    let next = value;
    if (isStaged(value, s2.id)) {
        const type = s2.stagedType ?? typeIn(value, copies, n1.space);
        next = addStaged(next, s2, ownSpace(s2.id), type, o.from.field === s2.mapping.nodes?.key, o.columns);
    }
    const step: MergeStep = {
        op: "join.merge",
        source: s2.id,
        read: { key: o.from.field, space: n1.space },
        unmatchedFrom: o.unmatchedFrom ?? "keep",
        ...defined({
            clash: o.clash,
            repeated: o.repeated,
            except: o.except,
            ignoreCase: o.ignoreCase,
            ignoreSpaces: o.ignoreSpaces,
        }),
        ...(n1.isKey || n1.keyCol === undefined
            ? {}
            : { via: o.into.source, mapping: { columns: [o.into.field ?? "", n1.keyCol], space: n1.space } }),
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
 * own space (never node 1's), then `join.edges` reads its node rows, one edge each, between node 1
 * and its node.
 * @param prior - The value.
 * @param copies - The rows as read.
 * @param o - The choices.
 * @returns The next value.
 * @throws A `GraphtyError` with `E_JOIN_SPACE_SAME` when source 2 would land in node 1's space.
 */
function connect(prior: SourceSteps, copies: Copies, o: ConnectAct): SourceSteps {
    const s1 = o.into.source;
    const value =
        s1 !== undefined && isStaged(prior, s1) ? addSource(prior, sourceOf(prior, s1), copies, undefined) : prior;
    let s2 = nodeSource(value, copies, o.from.source);
    const n1 = nodeOne(value, o.into);
    let next = value;
    if (isStaged(value, s2.id)) {
        const space = s2.spacePicked === true ? (s2.mapping.nodes?.space ?? ownSpace(s2.id)) : ownSpace(s2.id);
        if (space === n1.space) {
            throw refused("E_JOIN_SPACE_SAME", `Source ${s2.id} would land in ${space}, the space it connects to.`, {
                source: s2.id,
                space,
            });
        }
        next = addStaged(next, s2, space, s2.stagedType);
        s2 = next.sources[s2.id];
    }
    const mint = minted(next, s2.id);
    next = mint.value;
    const k2 = s2.mapping.nodes?.key ?? "";
    const one = { col: o.from.field, space: n1.space };
    const two = { col: k2, space: nodeSpace(s2) };
    const intoFrom = (o.direction ?? "into-from") === "into-from";
    const [a, b] = intoFrom ? [one, two] : [two, one];
    const step: EdgesStep = {
        op: "join.edges",
        source: s2.id,
        part: mint.part,
        read: {
            table: "nodes",
            source: a.col,
            sourceSpace: a.space,
            target: b.col,
            targetSpace: b.space,
            edgeId: k2,
            weight: null,
        },
        unmatchedRows: "leave-out",
        columns: [],
        ...defined({ ignoreCase: o.ignoreCase }),
        ...(n1.isKey || n1.keyCol === undefined
            ? {}
            : {
                  via: o.into.source,
                  mapping: { columns: [o.into.field ?? "", n1.keyCol] as const, space: n1.space },
                  viaEnd: intoFrom ? ("source" as const) : ("target" as const),
              }),
    };
    next = { ...next, steps: [...next.steps, step] };
    return withRule(next, "edge", o.edgeType, { source: s2.id, part: mint.part });
}

/**
 * Extract (4.3): `join.edges` from one end to the column's values, read once per end pair, the new
 * nodes typed by an end rule; the moved columns follow with `join.node-values`.
 * @param value - The value.
 * @param id - The edge source.
 * @param o - The choices.
 * @returns The next value.
 */
function extract(value: SourceSteps, id: string, o: ExtractAct): SourceSteps {
    const m = edgeMapping(value, id);
    const from = o.from ?? "source";
    const space = o.space ?? o.type ?? ownSpace(id);
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
 * for it goes back to the one it proposed.
 * @param value - The value.
 * @param index - The step's place.
 * @returns The next value.
 */
function removeStep(value: SourceSteps, index: number): SourceSteps {
    const gone = value.steps[index] as Step | undefined;
    if (gone === undefined) {
        throw refused("E_BAD_COMMAND", `No step at ${String(index)}.`, { reason: "no-step", index });
    }
    const next: SourceSteps = { ...value, steps: value.steps.filter((_, i) => i !== index) };
    const src = next.sources[gone.source] as StepsSource | undefined;
    if (src === undefined || !isStaged(next, src.id)) {
        return next;
    }
    const own = ownSpace(src.id);
    const proposal = src.stagedType ?? undefined;
    const back = (s: string | undefined): string | undefined => (s === own ? proposal : s);
    const { nodes, edges } = src.mapping;
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
            return merge(value, copies, act.options);
        case "connect":
            return connect(value, copies, act.options);
        case "extract":
            return extract(value, act.source, act.options);
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
        default:
            return removeStep(value, act.index);
    }
}
