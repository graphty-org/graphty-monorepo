/**
 * @file Today's data doors as edits of the sources and steps, behind the `source-steps` experiment
 * (design design/data/multiple-data-sources-design.md, sections 9.1 and 13, stage 1).
 *
 * A load (a file, a URL, a generated graph, a dataset, a draft's load, a network source) becomes
 * one source holding the rows it read plus `join.add`; a replacing load takes every source out
 * first. A direct edit (`addNodes` and the rest) becomes reader operations. Free of Babylon.js, Lit
 * and the DOM.
 */

import type { EdgeId, NodeId } from "../../../catalog/types";
import { GraphtyError } from "../../../errors/GraphtyError";
import type { BatchCommand } from "../../commands";
import { type DataImportCommand, type DataMutation, type HeldRows, importFact } from "../../commands/data";
import type { DataStepsSetCommand } from "../../commands/source-steps";
import type { SessionCommand } from "../../planning";
import type {
    ImportOptions,
    JoinChoices,
    JoinRecord,
    JoinShape,
    LoadChoices,
    LoadMapping,
    SideMapping,
    TableMapping,
} from "../../types";
import { applyAct } from "./acts";
import { copyKey, isStaged, mintPart, nodeSpace, ownSpace, resolveEdge, resolveNode } from "./build";
import {
    buildOf,
    checkSpace,
    type Copies,
    copyOrigin,
    EMPTY_STEPS,
    mintCopyId,
    mintEditId,
    mintSourceId,
    nodeIdsOf,
    nodeOfId,
    refOf,
    SOURCE_COPIES_VALUE,
    SOURCE_STEPS_VALUE,
    type SourceSteps,
    type StepsEdit,
    type StepsSource,
    type StepsSourceKind,
} from "./project";
import { checkEdit } from "./provenance";
import {
    type BuildResult,
    type CellValue,
    type CopyTables,
    type EdgesStep,
    type EdgeValuesStep,
    type NodeRef,
    READER_SOURCE,
    READER_SPACE,
    type ReaderEdit,
    type ReaderOp,
    type Row,
    type Step,
} from "./types";

/** The endpoint column pairs probed when a load names none, as the CSV reader probes them. */
const ENDPOINT_PAIRS: readonly (readonly [string, string])[] = [
    ["source", "target"],
    ["src", "dst"],
    ["from", "to"],
];

/** What the compile reads of the configuration. */
interface KnownFields {
    readonly nodeIdPath: string;
    readonly edgeIdPath?: string | null;
}

/**
 * The columns an edge table's ends are read from: the load's, else a probed pair.
 * @param rows - The edge rows.
 * @param source - The source column the load named.
 * @param target - The target column the load named.
 * @returns The two columns.
 */
function endsOf(rows: readonly Row[], source?: string, target?: string): { source: string; target: string } {
    if (source !== undefined && target !== undefined) {
        return { source, target };
    }
    const first = rows[0] ?? {};
    const pair = ENDPOINT_PAIRS.find(([s, t]) => s in first && t in first) ?? ENDPOINT_PAIRS[0];
    return { source: source ?? pair[0], target: target ?? pair[1] };
}

/**
 * Where a load came from, for its `data.sources()` entry.
 * @param command - The import.
 * @returns The kind.
 */
function kindOf(command: DataImportCommand): StepsSourceKind {
    if (command.origin !== undefined && command.origin !== "join") {
        return command.origin;
    }
    const url = command.source.config?.url;
    return typeof url === "string" && !url.startsWith("data:") ? "url" : "file";
}

/**
 * The SHA-256 of the bytes each draft's rows were read from, under the source-steps experiment: what
 * names a file, URL or downloaded sample's copy (version 2, 4.1.2 rule 1).
 */
export const heldDigests = new WeakMap<HeldRows, string>();

/**
 * A command with the digest of the bytes its rows were read from noted on each import's rows.
 * @param command - An import, or a batch holding imports.
 * @param digest - The lower-case hex SHA-256, or undefined when there are no bytes to name.
 * @returns The command.
 */
export function withDigest<C extends DataImportCommand | BatchCommand>(command: C, digest: string | undefined): C {
    const imports: readonly SessionCommand[] = command.op === "batch" ? command.steps : [command];
    for (const step of imports) {
        if (digest !== undefined && step.op === "data.import" && step.held !== undefined) {
            heldDigests.set(step.held, digest);
        }
    }
    return command;
}

/**
 * An object holding only the members that are defined.
 * @param members - The members.
 * @returns Them, without the undefined ones.
 */
function defined<T extends Record<string, unknown>>(members: T): Partial<T> {
    return Object.fromEntries(Object.entries(members).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/**
 * Whether a mapping names its tables by side (`{ nodes, edges }`).
 * @param mapping - The mapping.
 * @returns True for a mapping by side.
 */
function isSideMapping(mapping: LoadMapping): mapping is SideMapping {
    return "nodes" in mapping || "edges" in mapping;
}

/**
 * The time roles a load's column mapping gives its node rows and its edge rows (design 3.9), so the
 * built elements carry `graphty.time`.
 * @param mapping - The load's mapping, one table's or each table's.
 * @returns The time column of each kind of row, where one is named.
 */
function timeRoles(mapping: LoadChoices["mapping"]): { readonly nodes?: string; readonly edges?: string } {
    if (mapping === undefined) {
        return {};
    }
    let tables: readonly TableMapping[];
    if ("tables" in mapping) {
        tables = Object.values(mapping.tables);
    } else if (isSideMapping(mapping)) {
        // Named by side: each side's roles are the rows it names.
        tables = (["nodes", "edges"] as const).flatMap((side) => {
            const roles = mapping[side];
            return roles === undefined ? [] : [{ ...roles, rowsAre: side }];
        });
    } else {
        tables = [mapping];
    }
    const timeOf = (edges: boolean): string | undefined =>
        tables.find((t) => (t.rowsAre === "edges") === edges && typeof t.time === "string")?.time ?? undefined;
    return defined({ nodes: timeOf(false), edges: timeOf(true) });
}

/**
 * What a source's edge rows are for: their ends, the spaces of each end, the weight and the edge key.
 * @param edges - The edge rows.
 * @param held - The rows the load read, with the columns it read them by.
 * @param options - The source-steps choices.
 * @param known - The configured id paths.
 * @param space - The space the source's node rows key into.
 * @returns The edge mapping.
 */
function edgeMappingOf(
    edges: readonly Row[],
    held: NonNullable<DataImportCommand["held"]>,
    options: ImportOptions,
    known: KnownFields,
    space: string | undefined,
): NonNullable<StepsSource["mapping"]["edges"]> {
    const from = options.edges?.from;
    const to = options.edges?.to;
    const edgeId = options.edges?.id ?? known.edgeIdPath ?? undefined;
    return {
        ...endsOf(edges, from?.column ?? held.source, to?.column ?? held.target),
        ...defined({
            sourceSpace: from?.space ?? from?.type ?? space,
            targetSpace: to?.space ?? to?.type ?? space,
            weight: typeof held.weight === "string" ? held.weight : undefined,
            edgeId: edgeId !== undefined && edgeId in (edges[0] ?? {}) ? edgeId : undefined,
        }),
    };
}

/**
 * What `data.sources()` lists of a loaded source, and its settings and staged types.
 * @param command - The import.
 * @param options - The source-steps choices.
 * @returns The members of the source besides its id, copy and mapping.
 */
function sourceFacts(
    command: DataImportCommand,
    options: ImportOptions,
): Omit<StepsSource, "id" | "origin" | "mapping"> {
    const endTypes = defined({ source: options.edges?.from.type, target: options.edges?.to.type });
    const settings = defined({
        duplicateIds: command.duplicateIds === "first" ? undefined : command.duplicateIds,
        unmatched: command.unmatched === "leave-out" ? ("leave-out" as const) : undefined,
    });
    const { name, type } = importFact(command).params;
    const direction = command.held?.declaredDirection ?? undefined;
    return {
        kind: kindOf(command),
        label: typeof name === "string" ? name : null,
        tables: command.tables ?? [],
        ...defined({
            type: typeof type === "string" ? type : undefined,
            tableRows: command.tableRows,
            input: command.input,
            spacePicked: options.space === undefined ? undefined : true,
            stagedType: options.type,
            endTypes: Object.keys(endTypes).length === 0 ? undefined : endTypes,
            settings: Object.keys(settings).length === 0 ? undefined : settings,
            declared:
                direction === undefined ? undefined : { directed: direction.directed, statedBy: direction.statedBy },
        }),
    };
}

/**
 * One import as a source plus `join.add`: the rows it read become the source's copy, keyed by the
 * id column it read, in the space the caller named (its type, else its own space).
 * @param command - The import, with the rows it read.
 * @param options - The source-steps choices the load was given.
 * @param known - The configured id paths.
 * @returns The edit, or null for an import that holds no rows.
 * @throws A `GraphtyError` with `E_SPACE_RESERVED` for a reserved space.
 */
export function compileImport(
    command: DataImportCommand,
    options: ImportOptions,
    known: KnownFields,
): (DataStepsSetCommand & { readonly edit: Extract<StepsEdit, { kind: "add" }> }) | null {
    const { held } = command;
    if (held === undefined) {
        return null;
    }
    const space = options.space ?? options.type;
    checkSpace(space);
    checkSpace(options.edges?.from.space);
    checkSpace(options.edges?.to.space);
    const id = mintSourceId();
    const kind = kindOf(command);
    const { origin, key: copy } = copyOrigin(kind, heldDigests.get(held));
    // Node rows a draft made for an edge table's ends are not rows the source held.
    const ownNodes = command.tableRows === undefined || command.tableRows.includes("nodes");
    const nodes = (ownNodes ? held.nodes : []) as readonly Row[];
    const edges = held.edges as readonly Row[];
    const tables: CopyTables = {
        ...(nodes.length > 0 ? { nodes } : {}),
        ...(edges.length > 0 ? { edges } : {}),
    };
    const times = timeRoles((options as LoadChoices).mapping);
    const source: StepsSource = {
        id,
        origin,
        mapping: {
            ...(nodes.length > 0
                ? {
                      nodes: {
                          key: options.key ?? held.idPath ?? known.nodeIdPath,
                          ...defined({ space, time: times.nodes }),
                      },
                  }
                : {}),
            ...(edges.length > 0
                ? { edges: { ...edgeMappingOf(edges, held, options, known, space), ...defined({ time: times.edges }) } }
                : {}),
        },
        ...sourceFacts(command, options),
    };
    return {
        op: "data.steps-set",
        edit: {
            kind: "add",
            source,
            replace: command.mode !== "merge",
            ...(options.overlap === undefined ? {} : { overlap: options.overlap }),
        },
        copies: { [copy]: tables },
    };
}

/**
 * A dispatched import, or a batch holding one, with each import that holds its rows turned into
 * `data.steps-set`. A batch carrying the import's history marks keeps them.
 * @param command - The command.
 * @param options - The source-steps choices the load was given.
 * @param known - The configured id paths.
 * @returns The command to dispatch.
 */
export function compileCommand(command: SessionCommand, options: ImportOptions, known: KnownFields): SessionCommand {
    if (command.op === "batch") {
        const batch = command;
        return { ...batch, steps: batch.steps.map((step) => compileCommand(step, options, known)) };
    }
    if (command.op !== "data.import" && command.op !== "data.import-source") {
        return command;
    }
    const load = command as DataImportCommand;
    const compiled = compileImport({ ...load, op: "data.import" }, { ...load.choices, ...options }, known);
    if (compiled === null) {
        return command;
    }
    const steps: DataStepsSetCommand =
        command.op === "data.import-source" && compiled.edit.kind === "add"
            ? { ...compiled, edit: { ...compiled.edit, source: { ...compiled.edit.source, kind: "server" } } }
            : compiled;
    if (load.setup !== true && load.startsHistory !== true) {
        return steps;
    }
    return {
        op: "batch",
        steps: [steps],
        fact: importFact(load),
        ...(load.setup === true ? { setup: true } : {}),
        ...(load.startsHistory === true ? { startsHistory: true } : {}),
    };
}

/**
 * The element's `nodeData` / `edgeData` pair as one source of kind `derived` (9.1): the first
 * assignment adds it with `join.add`, a later one replaces the tables it names in its copy in place,
 * so a file loaded after it can merge into its nodes. The step carries the off path's label and fact.
 * @param records - The records assigned: the nodes, the edges or both.
 * @param records.nodes - The nodes.
 * @param records.edges - The edges.
 * @param values - The graph values: the sources and steps and their copies.
 * @param known - The configured paths: the node id, and the edge ends when configured.
 * @param known.nodeIdPath - Where a node record holds its id.
 * @param known.source - Where an edge record names its source; probed when absent.
 * @param known.target - Where an edge record names its target; probed when absent.
 * @param setup - Whether the assignment is part of the element's setup.
 * @returns The step.
 */
export function compileRecords(
    records: {
        readonly nodes?: readonly Readonly<Record<string, unknown>>[];
        readonly edges?: readonly Readonly<Record<string, unknown>>[];
    },
    values: ReadonlyMap<string, unknown>,
    known: { readonly nodeIdPath: string; readonly source?: string; readonly target?: string },
    setup: boolean,
): BatchCommand {
    const value = (values.get(SOURCE_STEPS_VALUE) as SourceSteps | undefined) ?? EMPTY_STEPS;
    const copies = (values.get(SOURCE_COPIES_VALUE) as Copies | undefined) ?? {};
    const prior = Object.values(value.sources).find((each) => each.kind === "derived");
    const held: CopyTables = prior === undefined ? {} : (copies[copyKey(prior)] ?? {});
    const tables: CopyTables = {
        ...held,
        ...(records.nodes === undefined ? {} : { nodes: records.nodes as readonly Row[] }),
        ...(records.edges === undefined ? {} : { edges: records.edges as readonly Row[] }),
    };
    let fact = "data.set" as "data.set" | "data.replace-nodes" | "data.replace-edges";
    if (records.edges === undefined) {
        fact = "data.replace-nodes";
    } else if (records.nodes === undefined) {
        fact = "data.replace-edges";
    }
    const copy = mintCopyId();
    const source: StepsSource = {
        id: prior?.id ?? mintSourceId(),
        origin: { copy },
        kind: "derived",
        label: null,
        tables: (["nodes", "edges"] as const).filter((name) => tables[name] !== undefined),
        mapping: {
            ...(tables.nodes === undefined ? {} : { nodes: { key: known.nodeIdPath } }),
            ...(tables.edges === undefined ? {} : { edges: endsOf(tables.edges, known.source, known.target) }),
        },
    };
    const edit: StepsEdit =
        prior === undefined
            ? { kind: "add", source }
            : { kind: "set", value: { ...value, sources: { ...value.sources, [source.id]: source } } };
    return {
        op: "batch",
        label: {
            "data.replace-nodes": "Replaced the nodes",
            "data.replace-edges": "Replaced the edges",
            "data.set": "Set the graph data",
        }[fact],
        fact: { code: fact, params: {} },
        steps: [{ op: "data.steps-set", edit, copies: { [copy]: tables } }],
        ...(setup ? { setup } : {}),
    };
}

/**
 * The `{ space, key }` a NodeId names in the committed build: the exact NodeId, else the one space holding the key,
 * else the reader space for a key no node holds.
 * @param built - The committed build.
 * @param id - The NodeId.
 * @returns The reference.
 * @throws A `GraphtyError` with `E_AMBIGUOUS_ID` when nodes in several spaces hold the key.
 */
function nodeRef(built: BuildResult, id: NodeId): NodeRef {
    const n = nodeOfId(built, id);
    return n === null
        ? (refOf(built, String(id)) ?? { space: READER_SPACE, key: String(id) })
        : { space: n.space, key: n.key };
}

/**
 * The `{ load, key }` of the built edge a session edge id draws.
 * @param edgeIds - The session edge id of each built edge.
 * @param id - The session edge id.
 * @returns The reference, or null for an edge no build made.
 */
function edgeRef(edgeIds: Readonly<Record<string, EdgeId>>, id: EdgeId): { load: string; key: string } | null {
    const found = Object.entries(edgeIds).find(([, each]) => each === id);
    if (found === undefined) {
        return null;
    }
    const [load, key] = found[0].split("\u0001");
    return { load, key };
}

/**
 * A direct edit as reader operations (3.2): an added node lands in the reader space, an added edge
 * joins the nodes its ends name, an update edits each cell, a removal removes.
 * @param mutation - The edit.
 * @param value - The value now.
 * @param copies - Its copies.
 * @param edgeIds - The session edge id of each built edge.
 * @param known - The configured paths: the node id, and the edge ends when configured.
 * @param known.nodeIdPath - Where a node record holds its id.
 * @param known.source - Where an edge record names its source; probed when absent.
 * @param known.target - Where an edge record names its target; probed when absent.
 * @returns The operations, in order.
 */
export function readerOps(
    mutation: DataMutation,
    value: SourceSteps,
    copies: Copies,
    edgeIds: Readonly<Record<string, EdgeId>>,
    known: { readonly nodeIdPath: string; readonly source?: string; readonly target?: string },
): ReaderOp[] {
    const cells = (record: Readonly<Record<string, unknown>>, drop: readonly string[]): Record<string, CellValue> =>
        Object.fromEntries(Object.entries(record).filter(([k]) => !drop.includes(k))) as Record<string, CellValue>;
    const built = buildOf(value, copies);
    switch (mutation.kind) {
        case "add-nodes":
            return mutation.records.map((record) => {
                const key = String(record[mutation.idPath ?? known.nodeIdPath]);
                return { id: mintEditId(), op: "add", node: { space: READER_SPACE, key }, columns: cells(record, []) };
            });
        case "add-edges": {
            // The edit's own ends, else the configured ones, else a pair the records hold, as ingest reads them.
            const ends = endsOf(
                mutation.records as readonly Row[],
                mutation.source ?? known.source,
                mutation.target ?? known.target,
            );
            return mutation.records.map((record) => {
                const id = mintEditId();
                return {
                    id,
                    op: "add-edge",
                    edge: { load: READER_SOURCE, key: id },
                    from: nodeRef(built, record[ends.source] as NodeId),
                    to: nodeRef(built, record[ends.target] as NodeId),
                    columns: cells(record, []),
                };
            });
        }
        case "remove-nodes":
            return mutation.ids.map((id) => ({ id: mintEditId(), op: "remove", node: nodeRef(built, id) }));
        case "remove-edges":
            return mutation.ids.flatMap((id) => {
                const edge = edgeRef(edgeIds, id);
                return edge === null ? [] : [{ id: mintEditId(), op: "remove" as const, edge }];
            });
        case "set-attributes":
        case "update-rows": {
            const rows =
                mutation.kind === "set-attributes"
                    ? mutation.ids.map((id) => ({ id, values: mutation.values }))
                    : mutation.rows;
            return rows.flatMap((row) => {
                const target =
                    mutation.target === "node"
                        ? { node: nodeRef(built, row.id) }
                        : (() => {
                              const edge = edgeRef(edgeIds, String(row.id));
                              return edge === null ? null : { edge };
                          })();
                if (target === null) {
                    return [];
                }
                return Object.entries(row.values).map(([column, v]) => {
                    // A key, end or a column a step reads is the source's to say, not the reader's (3.8).
                    const guarded = checkEdit(value, built, "node" in target ? target.node : target.edge, column);
                    if (guarded !== null) {
                        throw new GraphtyError({
                            code: "E_EDIT_ROLE_COLUMN",
                            message: `${column} is read by a key, a role or a step, so it is not edited directly.`,
                            source: "data",
                            details: guarded.params,
                        });
                    }
                    const at =
                        "node" in target
                            ? resolveNode(built, target.node.space, target.node.key)
                            : resolveEdge(built, target.edge.load, target.edge.key);
                    // `was` is always written, null for an empty cell (version 2, 4.1.4); a cell the
                    // reader edited before keeps the value the first edit replaced, as a pick does
                    const prior = [...value.reader]
                        .reverse()
                        .find(
                            (o): o is ReaderEdit =>
                                o.op === "edit" &&
                                o.column === column &&
                                JSON.stringify(o.node ?? o.edge) ===
                                    JSON.stringify("node" in target ? target.node : target.edge),
                        );
                    return {
                        id: mintEditId(),
                        op: "edit" as const,
                        ...target,
                        column,
                        value: v as CellValue,
                        was: prior === undefined ? (at?.values[column] ?? null) : (prior.was ?? null),
                    };
                });
            });
        }
        default:
            return [];
    }
}

/** Join choices the steps do not express yet; a join naming one is refused under the experiment. */
const LATER_CHOICES = ["lookup", "endKinds", "kindIds", "compare", "membership", "aggregate", "link", "names"] as const;

/** A join, as the draft's join screen and `editJoin` make it, ready to compile to steps. */
export interface JoinAsSteps {
    /** The joined table's source id: a new one, or the edited join's. */
    readonly id: string;
    /** The copy id its rows are held under. */
    readonly copy: string;
    readonly rows: readonly Row[];
    readonly choices: JoinChoices;
    readonly shape: JoinShape;
    readonly record: JoinRecord;
    /**
     * For a join with `via`: the mapping table's column holding the incoming keys, then its column
     * holding the graph's, as the join reads the table (a load's records name its ends `source` and
     * `target` and a node's key `id`).
     */
    readonly mapping?: readonly [string, string];
}

/** How a step translates a join's keys through a loaded source (3.5). */
interface Translation {
    readonly lookup: string;
    readonly mapping: {
        readonly columns: readonly [string, string];
        readonly table: "nodes" | "edges";
        readonly space: string;
    };
}

/**
 * A join's `via` as the step translation 3.5 describes: the source's own rows, looked up by the
 * columns the join reads (a load's record fields turned back into the columns its rows are read
 * by). A key the rows lack passes through as it is, as today's `via` matches it (`lookup`).
 * @param value - The value.
 * @param copies - The rows as read.
 * @param join - The join.
 * @param id - The joined source's id.
 * @returns The translation, or null when the join names no `via` or no source holds it.
 */
function translationOf(value: SourceSteps, copies: Copies, join: JoinAsSteps, id: string): Translation | null {
    const { via } = join.choices;
    const src = via === undefined ? undefined : (value.sources[via] as StepsSource | undefined);
    if (src === undefined || join.mapping === undefined) {
        return null;
    }
    const { nodes, edges } = src.mapping;
    const table = nodes === undefined ? "edges" : "nodes";
    // A joined table is read as its rows; another load as its records (design 3.5, `JoinChoices.via`).
    const records: Record<string, string | undefined> =
        table === "edges" ? { source: edges?.source, target: edges?.target } : { id: nodes?.key };
    const field = src.join === undefined ? records : {};
    const [from, to] = join.mapping.map((c) => field[c] ?? c) as [string, string];
    const rows = copies[copyKey(src)]?.[table] ?? [];
    const space = spaceOfKeys(
        value,
        copies,
        rows.map((r) => r[to]),
        id,
    );
    return { lookup: src.id, mapping: { columns: [from, to], table, space } };
}

/**
 * The id space most of a table's key values name a node in: the space a join reads its keys in.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param keys - The key values.
 * @param id - The joined source's id, whose own space is the answer when no key names a node.
 * @returns The space.
 */
function spaceOfKeys(value: SourceSteps, copies: Copies, keys: readonly unknown[], id: string): string {
    const built = buildOf(value, copies);
    const ids = nodeIdsOf(built);
    const spaceById = new Map<string, string>();
    for (const n of built.nodes.values()) {
        spaceById.set(String(ids.get(n.id)), n.space);
    }
    const tally = new Map<string, number>();
    for (const key of keys) {
        const space = spaceById.get(String(key));
        if (space !== undefined) {
            tally.set(space, (tally.get(space) ?? 0) + 1);
        }
    }
    const best = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0];
    return best ?? spaceById.values().next().value ?? ownSpace(id);
}

/** Where a graph field a join key names is read: the source holding it, its node space and key column. */
interface FieldSource {
    readonly source: string;
    readonly space: string;
    readonly key: string;
}

/**
 * The built source whose node rows hold a column most of a table's key values appear in: a join
 * keyed on a graph field (`data.<column>`) translates through its rows to the nodes they key.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param column - The column.
 * @param keys - The key values.
 * @returns The source, or null when no built source's node rows hold the column.
 */
function fieldSourceOf(
    value: SourceSteps,
    copies: Copies,
    column: string,
    keys: readonly unknown[],
): FieldSource | null {
    const wanted = new Set(keys.map(String));
    let best: FieldSource | null = null;
    let most = -1;
    for (const src of Object.values(value.sources)) {
        const key = src.mapping.nodes?.key;
        const rows = copies[copyKey(src)]?.nodes;
        if (key === undefined || rows === undefined || isStaged(value, src.id) || !rows.some((r) => column in r)) {
            continue;
        }
        const hits = rows.filter((r) => wanted.has(String(r[column]))).length;
        if (hits > most) {
            best = { source: src.id, space: nodeSpace(src), key };
            most = hits;
        }
    }
    return best;
}

/** The prefix of a graph path naming a working column. */
const DATA_PATH = "data.";

/**
 * The value without a joined table: its source and every step reading it. Its type rules stay.
 * @param value - The value.
 * @param id - The joined source's id.
 * @returns The value without it.
 */
export function withoutJoin(value: SourceSteps, id: string): SourceSteps {
    return {
        ...value,
        sources: Object.fromEntries(Object.entries(value.sources).filter(([each]) => each !== id)),
        steps: value.steps.filter((step) => step.source !== id),
    };
}

/**
 * A join of today's join screen as a source and its steps (3.6): values onto the nodes the key
 * names (`join.node-values`), a merge (`join.add` in the table's own space, then `join.merge`), or
 * edges between the nodes the two keys name (`join.add` of an edge table). The key is read in the
 * id space most of its values name a node in.
 * @param value - The value the join is added to.
 * @param copies - The rows as read, the table's included.
 * @param join - The join.
 * @returns The next value.
 * @throws A `GraphtyError` with `E_UNSUPPORTED` (reason `later`) for a shape or choice the steps
 * do not express yet.
 */
export function compileJoin(value: SourceSteps, copies: Copies, join: JoinAsSteps): SourceSteps {
    if (join.shape === "edge-values") {
        return compileEdgeValues(value, copies, join);
    }
    const { choices, shape, id } = join;
    const edges = shape === "edges";
    const files = choices.keys.map((k) => k.file);
    const keyValues = join.rows.flatMap((row) => files.map((f) => row[f]));
    // A node join keyed on a graph field reads its key through the rows of the source holding it (3.5).
    const graphKey = choices.keys[0]?.graph ?? "id";
    const column = !edges && graphKey.startsWith(DATA_PATH) ? graphKey.slice(DATA_PATH.length) : null;
    const field = column === null ? null : fieldSourceOf(value, copies, column, keyValues);
    const translation = translationOf(value, copies, join, id);
    refuseUnexpressed(choices, shape, field !== null, translation !== null);
    const space = translation?.mapping.space ?? field?.space ?? spaceOfKeys(value, copies, keyValues, id);
    const options = defined({
        columns: choices.columns,
        // Today's join keeps a clashing value both ways unless the reader says otherwise (section 10 item 23).
        clash: { "*": "both" as const, ...choices.clash },
        repeated: choices.repeated === "both" ? undefined : (choices.repeated ?? "first"),
        ignoreCase: choices.ignoreCase,
        ignoreSpaces: choices.ignoreSpaces,
    });
    const next: SourceSteps = { ...value, sources: { ...value.sources, [id]: joinedSource(join, files, space) } };
    const through = field === null || column === null ? null : { ...field, column };
    if (shape === "merge") {
        const merged = applyAct(
            next,
            {
                act: "merge",
                options: {
                    from: { source: id, field: files[0] },
                    into: through === null ? { space } : { source: through.source, field: through.column },
                    ...options,
                    ...defined({ unmatchedFrom: choices.unmatchedFrom }),
                },
            },
            copies,
        );
        return translation === null ? merged : translatedMerge(merged, translation);
    }
    const step: Step = edges
        ? edgesStepOf(next, id, files, space, { ...options, ...defined({ unmatchedRows: choices.unknownEnds }) })
        : {
              op: "join.node-values",
              source: id,
              read: { table: "nodes", key: files[0], space },
              ...options,
              ...defined({ unmatchedRows: choices.unmatchedRows }),
              ...(through === null ? translation : fieldVia(through, space)),
          };
    return { ...next, steps: [...next.steps, step] };
}

/**
 * A staged joined table's join as the steps it would take, each `off` (version 2, 4.1.8 rules 1
 * and 8): the join the reader is setting up, kept and listed but not built until a step is turned
 * on. The record's other fields (`onto`, `matched`, `columns`, `before`, `made`, the table's
 * `unreadRows`) are the session's report of a join that ran, and no step holds them.
 * @param value - The value, the source staged in it.
 * @param copies - The rows as read.
 * @param src - The staged source.
 * @returns The steps, or none when the source is not a staged joined table or its join no longer
 *   compiles.
 */
export function stagedJoinSteps(value: SourceSteps, copies: Copies, src: StepsSource): Step[] {
    const { join } = src;
    if (join === undefined || !isStaged(value, src.id)) {
        return [];
    }
    const held = copies[copyKey(src)] ?? {};
    const rows = held.nodes ?? held.edges ?? [];
    const base: SourceSteps = {
        ...value,
        sources: Object.fromEntries(Object.entries(value.sources).filter(([id]) => id !== src.id)),
    };
    try {
        const next = compileJoin(base, copies, {
            id: src.id,
            copy: copyKey(src),
            rows,
            choices: join.choices,
            shape: join.shape,
            record: join,
        });
        return next.steps.slice(base.steps.length).map((step) => ({ ...step, off: true }));
    } catch {
        // A join the steps no longer express (its field source removed, say) stays session-only.
        return [];
    }
}

/**
 * A node-values step's read of a graph field through the rows of the source holding it (3.5).
 * @param through - The source, its key column and the field's column.
 * @param space - The space the key is read in.
 * @returns The step's `via` and `mapping`.
 */
function fieldVia(
    through: FieldSource & { readonly column: string },
    space: string,
): { readonly via: string; readonly mapping: { readonly columns: readonly [string, string]; readonly space: string } } {
    return { via: through.source, mapping: { columns: [through.column, through.key], space } };
}

/**
 * The value with its last step, the merge a join's act wrote, translating its keys first (3.5).
 * @param value - The value.
 * @param translation - The translation.
 * @returns The value.
 */
function translatedMerge(value: SourceSteps, translation: Translation): SourceSteps {
    const last = value.steps.length - 1;
    const steps = value.steps.map((step, at) =>
        at === last && step.op === "join.merge" ? { ...step, ...translation } : step,
    );
    return { ...value, steps };
}

/**
 * The joined table as a source: its rows are nodes keyed by the file's column (in its own space for
 * a merge, else the space the key is read in), or edges between the nodes its two columns name.
 * @param join - The join.
 * @param files - Its key columns.
 * @param space - The space its keys are read in.
 * @returns The source.
 */
function joinedSource(join: JoinAsSteps, files: readonly string[], space: string): StepsSource {
    const { id, shape, choices } = join;
    const edges = shape === "edges";
    return {
        id,
        origin: { copy: join.copy },
        kind: "file",
        label: join.record.table.name,
        tables: [join.record.table.name],
        tableRows: [edges ? "edges" : "nodes"],
        join: join.record,
        mapping: edges
            ? { edges: { source: files[0], target: files[1], sourceSpace: space, targetSpace: space } }
            : { nodes: { key: files[0], space: shape === "merge" ? ownSpace(id) : space } },
        ...(edges && choices.unknownEnds === "leave-out" ? { settings: { unmatched: "leave-out" as const } } : {}),
    };
}

/**
 * Refuse a join the steps do not express yet: a shape or key count other than a values, merge or
 * edges join, a key on anything but a node id or a graph field a source holds, `repeated: "both"`,
 * a `via` on edges, on a graph field or naming no source, or a choice from the later list
 * (`mapping.many` among them: section 11 reserves it).
 * @param choices - The join's choices.
 * @param shape - Its shape.
 * @param fieldHeld - Whether its graph field key names a column a built source holds.
 * @param translated - Whether its `via` names a source the steps translate through.
 * @throws A `GraphtyError` with `E_UNSUPPORTED` (reason `later`).
 */
function refuseUnexpressed(choices: JoinChoices, shape: JoinShape, fieldHeld: boolean, translated: boolean): void {
    const later = [
        ...LATER_CHOICES.filter((k) => choices[k] !== undefined),
        ...(choices.mapping?.many === undefined ? [] : ["mapping.many"]),
    ];
    const edges = shape === "edges";
    const viaFits = choices.via === undefined || (translated && !edges && choices.keys[0]?.graph === "id");
    const supported =
        (shape === "node-values" || shape === "merge" || edges) &&
        choices.keys.length === (edges ? 2 : 1) &&
        (choices.keys.every((k) => k.graph === "id") || fieldHeld) &&
        choices.repeated !== "both" &&
        viaFits;
    if (!supported || later.length > 0) {
        throw notYet(shape, later);
    }
}

/**
 * The refusal of a join the steps do not express yet.
 * @param shape - Its shape.
 * @param later - The choices it names from the later list.
 * @returns The error, with `E_UNSUPPORTED` (reason `later`).
 */
function notYet(shape: JoinShape, later: readonly string[]): GraphtyError {
    return new GraphtyError({
        code: "E_UNSUPPORTED",
        message: "This join is not available under the source-steps experiment yet.",
        source: "data",
        details: { reason: "later", shape, choices: later },
    });
}

/**
 * An edge-values join as `join.edge-values` (3.4): each row's columns onto the edge whose key it
 * names. The key is read against the edge keys of the built source most of its values name an edge
 * of; the table is a source of its own whose rows only that step reads.
 * @param value - The value the join is added to.
 * @param copies - The rows as read.
 * @param join - The join.
 * @returns The next value.
 * @throws A `GraphtyError` with `E_UNSUPPORTED` (reason `later`) when no built source keys its
 * edges by the values, the key names another column, or a choice is one the steps do not express.
 */
function compileEdgeValues(value: SourceSteps, copies: Copies, join: JoinAsSteps): SourceSteps {
    const { choices, shape, id } = join;
    const later = (["via", "mapping", ...LATER_CHOICES] as const).filter((k) => choices[k] !== undefined);
    const [key] = choices.keys;
    const load =
        choices.keys.length === 1 && choices.repeated !== "both" && later.length === 0
            ? edgeLoadOf(
                  value,
                  copies,
                  join.rows.map((row) => row[key.file]),
              )
            : null;
    if (load === null || (key.graph !== "id" && key.graph !== `${DATA_PATH}${load.edgeId}`)) {
        throw notYet(shape, later);
    }
    const step: EdgeValuesStep = {
        op: "join.edge-values",
        source: id,
        edges: load.source,
        read: { table: "nodes", edgeId: key.file },
        ...defined({
            columns: choices.columns,
            clash: { "*": "both" as const, ...choices.clash },
            repeated: choices.repeated === "both" ? undefined : choices.repeated,
            ignoreCase: choices.ignoreCase,
            ignoreSpaces: choices.ignoreSpaces,
        }),
    };
    return {
        ...value,
        sources: { ...value.sources, [id]: joinedSource(join, [key.file], ownSpace(id)) },
        steps: [...value.steps, step],
    };
}

/**
 * The built source whose edge rows are keyed by most of some values: what an edge-values join's
 * key names.
 * @param value - The value.
 * @param copies - The rows as read.
 * @param keys - The key values.
 * @returns The source and its edge key column, or null when no built source's edge keys match one.
 */
function edgeLoadOf(
    value: SourceSteps,
    copies: Copies,
    keys: readonly unknown[],
): { readonly source: string; readonly edgeId: string } | null {
    const wanted = new Set(keys.map(String));
    let best: { readonly source: string; readonly edgeId: string } | null = null;
    let most = 0;
    for (const src of Object.values(value.sources)) {
        const edgeId = src.mapping.edges?.edgeId;
        const rows = copies[copyKey(src)]?.edges;
        if (edgeId === undefined || rows === undefined || isStaged(value, src.id)) {
            continue;
        }
        // ponytail: reads the key column under its working name; a renamed key column matches nothing.
        const hits = rows.filter((r) => wanted.has(String(r[edgeId]))).length;
        if (hits > most) {
            best = { source: src.id, edgeId };
            most = hits;
        }
    }
    return best;
}

/**
 * An edges join as `join.edges`, not `join.add`: only it reads `repeated`, `ignoreCase`,
 * `ignoreSpaces` and what to do with an unknown end (3.4).
 * @param value - The value with the joined source in it.
 * @param id - The joined source.
 * @param files - Its source and target columns.
 * @param space - The space both ends are read in.
 * @param options - The step's choices.
 * @returns The step, with a part never used by the source before.
 */
function edgesStepOf(
    value: SourceSteps,
    id: string,
    files: readonly string[],
    space: string,
    options: Partial<Omit<EdgesStep, "op" | "source" | "part" | "read">>,
): EdgesStep {
    return {
        op: "join.edges",
        source: id,
        part: mintPart(value, id),
        read: { table: "edges", source: files[0], sourceSpace: space, target: files[1], targetSpace: space },
        ...options,
    };
}
