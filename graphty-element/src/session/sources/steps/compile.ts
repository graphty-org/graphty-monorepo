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
import { type DataImportCommand, type DataMutation, importFact } from "../../commands/data";
import type { DataStepsSetCommand } from "../../commands/source-steps";
import type { SessionCommand } from "../../planning";
import type { ImportOptions, JoinChoices, JoinRecord, JoinShape } from "../../types";
import { applyAct } from "./acts";
import { isStaged, mintPart, nodeSpace, ownSpace, resolveNode } from "./build";
import {
    buildOf,
    checkSpace,
    type Copies,
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
    type NodeRef,
    READER_SOURCE,
    READER_SPACE,
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
 * An object holding only the members that are defined.
 * @param members - The members.
 * @returns Them, without the undefined ones.
 */
function defined<T extends Record<string, unknown>>(members: T): Partial<T> {
    return Object.fromEntries(Object.entries(members).filter(([, v]) => v !== undefined)) as Partial<T>;
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
        duplicateIds: command.duplicateIds === "merge" ? ("merge" as const) : undefined,
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
    const copy = mintCopyId();
    // Node rows a draft made for an edge table's ends are not rows the source held.
    const ownNodes = command.tableRows === undefined || command.tableRows.includes("nodes");
    const nodes = (ownNodes ? held.nodes : []) as readonly Row[];
    const edges = held.edges as readonly Row[];
    const tables: CopyTables = {
        ...(nodes.length > 0 ? { nodes } : {}),
        ...(edges.length > 0 ? { edges } : {}),
    };
    const source: StepsSource = {
        id,
        origin: { copy },
        mapping: {
            ...(nodes.length > 0
                ? { nodes: { key: options.key ?? held.idPath ?? known.nodeIdPath, ...defined({ space }) } }
                : {}),
            ...(edges.length > 0 ? { edges: edgeMappingOf(edges, held, options, known, space) } : {}),
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
 * assignment adds it with `join.add`, a later one replaces that table of its copy in place, so a
 * file loaded after it can merge into its nodes. The step carries the off path's label and fact.
 * @param table - Which half was assigned.
 * @param records - The records.
 * @param values - The graph values: the sources and steps and their copies.
 * @param known - The configured paths: the node id, and the edge ends when configured.
 * @param known.nodeIdPath - Where a node record holds its id.
 * @param known.source - Where an edge record names its source; probed when absent.
 * @param known.target - Where an edge record names its target; probed when absent.
 * @param setup - Whether the assignment is part of the element's setup.
 * @returns The step.
 */
export function compileRecords(
    table: "nodes" | "edges",
    records: readonly Readonly<Record<string, unknown>>[],
    values: ReadonlyMap<string, unknown>,
    known: { readonly nodeIdPath: string; readonly source?: string; readonly target?: string },
    setup: boolean,
): BatchCommand {
    const value = (values.get(SOURCE_STEPS_VALUE) as SourceSteps | undefined) ?? EMPTY_STEPS;
    const copies = (values.get(SOURCE_COPIES_VALUE) as Copies | undefined) ?? {};
    const prior = Object.values(value.sources).find((each) => each.kind === "derived");
    const held: CopyTables = prior === undefined ? {} : (copies[prior.origin.copy] ?? {});
    const tables: CopyTables = { ...held, [table]: records as readonly Row[] };
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
        label: table === "nodes" ? "Replaced the nodes" : "Replaced the edges",
        fact: { code: table === "nodes" ? "data.replace-nodes" : "data.replace-edges", params: {} },
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
                    const at = "node" in target ? resolveNode(built, target.node.space, target.node.key) : null;
                    const was = at?.values[column];
                    return {
                        id: mintEditId(),
                        op: "edit" as const,
                        ...target,
                        column,
                        value: v as CellValue,
                        ...(was === undefined ? {} : { was }),
                    };
                });
            });
        }
        default:
            return [];
    }
}

/** Join choices the steps do not express yet; a join naming one is refused under the experiment. */
const LATER_CHOICES = [
    "via",
    "lookup",
    "mapping",
    "endKinds",
    "kindIds",
    "compare",
    "membership",
    "aggregate",
    "link",
    "names",
] as const;

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
        const rows = copies[src.origin.copy]?.nodes;
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
    const { choices, shape, id } = join;
    const edges = shape === "edges";
    const files = choices.keys.map((k) => k.file);
    const keyValues = join.rows.flatMap((row) => files.map((f) => row[f]));
    // A node join keyed on a graph field reads its key through the rows of the source holding it (3.5).
    const graphKey = choices.keys[0]?.graph ?? "id";
    const column = !edges && graphKey.startsWith(DATA_PATH) ? graphKey.slice(DATA_PATH.length) : null;
    const field = column === null ? null : fieldSourceOf(value, copies, column, keyValues);
    refuseUnexpressed(choices, shape, field !== null);
    const space = field?.space ?? spaceOfKeys(value, copies, keyValues, id);
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
        return applyAct(
            next,
            {
                act: "merge",
                options: {
                    from: { source: id, field: files[0] },
                    into: through === null ? { space } : { source: through.source, field: through.column },
                    ...options,
                    ...(choices.unmatchedFrom === undefined ? {} : { unmatchedFrom: choices.unmatchedFrom }),
                },
            },
            copies,
        );
    }
    const step: Step = edges
        ? edgesStepOf(next, id, files, space, { ...options, ...defined({ unmatchedRows: choices.unknownEnds }) })
        : {
              op: "join.node-values",
              source: id,
              read: { table: "nodes", key: files[0], space },
              ...options,
              ...defined({ unmatchedRows: choices.unmatchedRows }),
              ...(through === null
                  ? {}
                  : { via: through.source, mapping: { columns: [through.column, through.key] as const, space } }),
          };
    const parts = step.op === "join.edges" ? { parts: { ...next.parts, [id]: step.part } } : {};
    return { ...next, ...parts, steps: [...next.steps, step] };
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
 * or a choice from the later list.
 * @param choices - The join's choices.
 * @param shape - Its shape.
 * @param fieldHeld - Whether its graph field key names a column a built source holds.
 * @throws A `GraphtyError` with `E_UNSUPPORTED` (reason `later`).
 */
function refuseUnexpressed(choices: JoinChoices, shape: JoinShape, fieldHeld: boolean): void {
    const later = LATER_CHOICES.filter((k) => choices[k] !== undefined);
    const edges = shape === "edges";
    const supported =
        (shape === "node-values" || shape === "merge" || edges) &&
        choices.keys.length === (edges ? 2 : 1) &&
        (choices.keys.every((k) => k.graph === "id") || fieldHeld) &&
        choices.repeated !== "both";
    if (!supported || later.length > 0) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message: "This join is not available under the source-steps experiment yet.",
            source: "data",
            details: { reason: "later", shape, choices: later },
        });
    }
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
        part: mintPart(value, id, { high: value.parts?.[id] }),
        read: { table: "edges", source: files[0], sourceSpace: space, target: files[1], targetSpace: space },
        ...options,
    };
}
