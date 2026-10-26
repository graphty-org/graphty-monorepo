/**
 * @file The data ops, each one undoable step:
 *
 * - `data.apply`: one change to the graph's rows or records. The kinds that grow or patch the
 *   graph, `add-nodes`, `add-edges`, `set-attributes` and `update-rows`, and the removals and
 *   `clear`: `remove-nodes`, `remove-edges`, `clear`.
 * - `data.import`: a load through a registered data source, replacing the graph or adding to it.
 * - `data.expand`: the neighbourhood a double-click fetched, added as one step. The fetched
 *   records are in the command, so redo never fetches again.
 * - `data.declare`: what a column measures, kept in the `attributes` slice under
 *   `<kind>:<name>` so it is saved and undone like any other project change.
 * - `data.setSource`: the source the graph was loaded from, the `source` graph value
 *   `data.source()` reads: a new name for it, or the source a project file recorded.
 * - `data.setFileStyles`: the per-element style values the layers made from files read at
 *   `graphty.style.<namespace>.<kind>.<key>`, kept beside the data and never in its records.
 *
 * Each reads its records through ingest (id and endpoint extraction, the repeated-edge policy,
 * weights) and writes through the graph primitives in its draft, which record the resolved values,
 * so undo and redo never pass through ingest, a data source or a fetcher again. See
 * design/undo/undo-design.md sections 3.3, 3.4, 4.7 and 11.1.
 *
 * `data.apply` and `data.import` take their turn on the queue, so an add is ordered against the
 * loads, layouts and runs dispatched before it, and one still waiting is pending work that undo
 * cancels. A synchronous door starts its `data.apply` beside the queue instead. `data.import`
 * holds the whole graph while it reads. `data.expand` runs on the immediate lane: the write is
 * visible as soon as `dispatch` returns.
 */

import type { DuplicatePolicy } from "@graphty/graph-format";

import type { EdgeId, EdgeMember, LayerId, MeasurementDeclaration, NodeId, Path } from "../../catalog/types";
import type { DeclaredDirection } from "../../data/DataSource";
import { searchRecord } from "../../data/endpoints";
import type { DataLoadingError } from "../../data/ErrorAggregator";
import { GraphtyError } from "../../errors/GraphtyError";
import { GRAPHVIZ_ENGINES, graphvizLayoutId } from "../../layout/graphviz/engines";
import { POINTS_PER_UNIT } from "../../layout/graphviz/toDot";
import { GraphtyLogger } from "../../logging/GraphtyLogger.js";
import type { UndoableContext, UndoableDefinition } from "../project/Dispatcher";
import type { Draft } from "../project/draft";
import { edgeKey, nodeKey } from "../project/graphOps";
import type { CodedFact } from "../shared";
import { applyFileStyles, type ImportOutcome } from "../styles/fileStyles/apply";
import { FILE_STYLES_VALUE, type FileStyleLoadValues, fileStyleStoreOf } from "../styles/fileStyles/store";
import type { FileStyleOptions } from "../styles/fileStyles/translate";
import { deepEquals } from "../styles/predicate";
import type { Selector } from "../styles/selector";
import type { HistoryCode, LoadedSource, NodeRecordInput, RowUpdate } from "../types";
import { valueLabelKey } from "../valueLabels";
import type { BatchCommand } from "./index";
import type { DataImportSourceCommand } from "./source-load";

/** A record to add; its id, or its endpoints, are read through the configured paths. */
type RecordInput = NodeRecordInput;

/** One change `data.apply` makes. */
export type DataMutation =
    | {
          readonly kind: "add-nodes";
          readonly records: readonly RecordInput[];
          /** The id path for this call, overriding `data.knownFields.nodeIdPath`. */
          readonly idPath?: string;
      }
    | {
          readonly kind: "add-edges";
          readonly records: readonly RecordInput[];
          /** The source endpoint path for this call. */
          readonly source?: string;
          /** The target endpoint path for this call. */
          readonly target?: string;
          /** The repeated-edge policy for this call. */
          readonly repeated?: DuplicatePolicy;
          /**
           * The graph's direction, declared the way a node-link JSON file's `"directed"` key
           * declares it, and taken on the same terms: only while the graph holds no edges, and
           * never over a `data.directed` the configuration set to a boolean. On a graph that
           * already holds edges it changes nothing, not even where the direction came from; a
           * value that disagrees is logged. Undo takes it back with the edges. Default: leave
           * the direction as it is.
           */
          readonly directed?: boolean;
      }
    | {
          /** The same values on many rows: "set type to hub on these nodes". */
          readonly kind: "set-attributes";
          readonly target: "node" | "edge";
          readonly ids: readonly (NodeId | EdgeId)[];
          readonly values: Readonly<Record<string, unknown>>;
      }
    | {
          /** Values of its own for each row. */
          readonly kind: "update-rows";
          readonly target: "node" | "edge";
          readonly rows: readonly RowUpdate<NodeId | EdgeId>[];
          /** Each row's values become its whole record instead of patching it. Default: patch. */
          readonly replace?: boolean;
      }
    | {
          /** Remove nodes, and every edge attached to one. */
          readonly kind: "remove-nodes";
          readonly ids: readonly NodeId[];
      }
    | {
          /** Remove edges, by the element-assigned edge id. */
          readonly kind: "remove-edges";
          readonly ids: readonly EdgeId[];
      }
    | {
          /** Remove every node, edge, record and graph-level value. */
          readonly kind: "clear";
      };

/** `data.apply`. */
interface DataApplyCommand {
    readonly op: "data.apply";
    readonly mutation: DataMutation;
}

/**
 * Where a load comes from: a registered data source's name and its options. The element's
 * `dataSource` / `dataSourceConfig` pair may be half assigned, so either may be absent; a source
 * missing either is recorded and nothing is loaded.
 */
export interface ImportSource {
    readonly type?: string;
    readonly config?: Readonly<Record<string, unknown>>;
    /** What the reader calls the data; see `DataSourceInput.name`. */
    readonly name?: string;
    /** The file's size in bytes, when a file was read. */
    readonly size?: number;
}

/** `data.import`. */
export interface DataImportCommand {
    readonly op: "data.import";
    readonly source: ImportSource;
    /** `"replace"` (the default) empties the graph first, in the same step; `"merge"` adds to it. */
    readonly mode?: "replace" | "merge";
    /** `"recommended"` also chooses a layout for what was loaded, in the same step. */
    readonly layout?: "recommended" | "keep";
    /** Rows a draft already read: loaded in place of reading the source again, on redo too. */
    readonly held?: HeldRows;
    /** An edge naming a node no node record holds: made (the default), or left out. */
    readonly unmatched?: "add" | "leave-out";
    /** A node record repeating an id an earlier one gave; see `LoadChoices.duplicateIds`. */
    readonly duplicateIds?: "first" | "merge" | "refuse";
    /** For `"merge"`: a node already in the graph keeps its attributes (the default) or takes the incoming ones. */
    readonly existing?: "keep" | "update";
    /**
     * Count the load instead of refusing it: a limit it passes is recorded in the report, and
     * the graph `present` describes counts as already there. Only a draft's scratch session sends it.
     * `pairs` holds the graph's edges as `pairKey(source, target)` (both ways on an undirected
     * graph), so a record repeating one is counted as the real merge counts it.
     */
    readonly measure?: {
        readonly nodes: ReadonlySet<NodeId>;
        readonly edges: number;
        readonly pairs?: ReadonlySet<string>;
    };
    /** Declared at construction: while the baseline window is open it becomes the baseline. */
    readonly setup?: boolean;
    /** Starts the history: see `ImportOptions.history`. */
    readonly startsHistory?: boolean;
    /**
     * Imports with the same key coalesce while the first waits its turn: the element's two
     * properties assigned one after the other are one load.
     */
    readonly coalesce?: string;
    /** The names of the tables a draft read, kept with the load in `data.sources()`. */
    readonly tables?: readonly string[];
    /** What each of `tables` held, in the same order, kept with the load in `data.sources()`. */
    readonly tableRows?: readonly ("nodes" | "edges")[];
    /**
     * `"file"` draws the file's own styles as layers, in the same step; `"none"` leaves them out.
     * Absent, the source's `styles` option decides, and without one the file's styles are left out.
     */
    readonly styles?: "file" | "none";
    /** How the file's styles are turned into layers; the source's `styleOptions` when absent. */
    readonly styleOptions?: FileStyleOptions;
}

/** What `LoadDraft` holds and hands the ingest: the rows, and how to read them. */
export interface HeldRows {
    /** Node records. */
    readonly nodes: readonly Record<string, unknown>[];
    /** Edge records. */
    readonly edges: readonly Record<string, unknown>[];
    /** Each edge record's line, as `DraftRow.line` numbers it; its position from 1 when absent. */
    readonly edgeLines?: readonly number[] | null;
    /** The direction the file declared, read when the rows were. */
    readonly declaredDirection: DeclaredDirection | null;
    /** The rows reading the source refused. */
    readonly errors: readonly DataLoadingError[];
    /** How many refused rows end a read: the source's error limit. */
    readonly errorLimit: number;
    /** The expression a node record's id is read with; the configured one when absent. */
    readonly idPath?: string;
    /** The expression an edge's source is read with; probed when absent. */
    readonly source?: string;
    /** The expression an edge's target is read with; probed when absent. */
    readonly target?: string;
    /** The record key weights are read from, with no `value` fallback; null reads none; configured when absent. */
    readonly weight?: string | null;
    /** What a row naming a pair the graph already holds does; `data.knownFields.repeatedEdges` when absent. */
    readonly repeated?: DuplicatePolicy;
}

/** The load choices a `data.import` command carries. */
export type ImportChoices = Pick<
    DataImportCommand,
    "mode" | "layout" | "existing" | "styles" | "styleOptions" | "unmatched" | "duplicateIds"
>;

/**
 * The one `data.import` command `session.data.import` and `LoadDraft.load` both send, so a file
 * loads the same whichever of the two loads it.
 * @param source - Where the rows come from.
 * @param choices - The load choices; one left out is left out of the command.
 * @param held - The rows a draft already read, loaded in place of reading the source again.
 * @returns The command.
 */
export function importCommand(source: ImportSource, choices: ImportChoices, held?: HeldRows): DataImportCommand {
    const optional = Object.fromEntries(
        (["layout", "existing", "styles", "styleOptions", "unmatched", "duplicateIds"] as const)
            .filter((key) => choices[key] !== undefined)
            .map((key) => [key, choices[key]]),
    );
    return {
        op: "data.import",
        source,
        mode: choices.mode ?? "replace",
        ...optional,
        ...(held === undefined ? {} : { held }),
    };
}

/**
 * Whether a command adds rows, and so starts the load-time algorithm list once it is recorded: an
 * add of nodes or edges, or an import naming both a source type and its options.
 * @param command - Any dispatched command.
 * @param command.op - What it does.
 * @returns True when it does.
 */
export function addsRows(command: { readonly op: string }): boolean {
    if (command.op === "data.apply") {
        const { kind } = (command as DataApplyCommand).mutation;
        return kind === "add-nodes" || kind === "add-edges";
    }

    if (command.op === "data.import") {
        const { source } = command as DataImportCommand;
        return source.type !== undefined && source.config !== undefined;
    }

    return false;
}

/** `data.expand`: what a double-click on `seed` fetched, captured so redo does not fetch again. */
interface DataExpandCommand {
    readonly op: "data.expand";
    readonly seed: NodeId;
    readonly nodes: readonly RecordInput[];
    readonly edges: readonly RecordInput[];
    /** The expression naming each edge's source, resolved once for the fetched edges. */
    readonly source?: string;
    /** The expression naming each edge's target. */
    readonly target?: string;
}

/** `data.declare`: what a column measures, overriding what the element inferred. */
interface DataDeclareCommand {
    readonly op: "data.declare";
    readonly column: { readonly kind: "node" | "edge"; readonly name: string };
    readonly declaration: MeasurementDeclaration;
}

/**
 * `data.setSource`: describe the source the graph was loaded from -- a new name for it, or the
 * source a project file recorded.
 */
interface DataSetSourceCommand {
    readonly op: "data.setSource";
    readonly source: ImportSource;
    /** Every load still in the graph, as `data.sources()` reports them; left as they are when absent. */
    readonly sources?: readonly LoadedSource[];
}

/**
 * `data.label`: the name one value of a path is shown by (a community's "Group 3" called
 * "Students"), or `null` to take the name away. A name is not a data edit: rules, bindings and
 * exports still read the value itself.
 */
interface DataLabelCommand {
    readonly op: "data.label";
    /** The value path: `data.<column>` or `results.<run>.<field>`. */
    readonly path: Path;
    /** The value, compared as the legend spells it, so `3` and `"3"` are one value. */
    readonly value: string | number | boolean;
    /** The name, or null to remove it. */
    readonly label: string | null;
}

/**
 * `data.setFileStyles`: replace the per-element style values the layers made from files read, one
 * entry per load. An empty list removes them all.
 */
export interface DataSetFileStylesCommand {
    readonly op: "data.setFileStyles";
    readonly loads: readonly FileStyleLoadValues[];
}

/** Every data op. */
export type DataCommand =
    | DataApplyCommand
    | DataImportCommand
    | DataImportSourceCommand
    | DataExpandCommand
    | DataDeclareCommand
    | DataSetSourceCommand
    | DataSetFileStylesCommand
    | DataLabelCommand;

/** The measurements every declaration may name. */
const DECLARABLE: ReadonlySet<string> = new Set(["categorical", "ordinal", "quantitative", "time"]);

/**
 * The `attributes` slice key one column's declaration is kept under.
 * @param column - The column.
 * @param column.kind - Nodes or edges.
 * @param column.name - Its literal name.
 * @returns The key.
 */
export function declarationKey(column: { readonly kind: string; readonly name: string }): string {
    return `${column.kind}:${column.name}`;
}

/** How a session applies a data mutation: its ingest and its store. Set by whoever owns them. */
export interface DataService {
    /**
     * Apply one mutation, writing through the graph primitives in `draft`.
     * @param mutation - The mutation.
     * @param draft - The command's draft.
     * @param after - Starts work once the command's step is recorded, as its deferred members:
     *     the on-load runs of a command that adds rows.
     */
    apply(mutation: DataMutation, draft: Draft, after?: UndoableContext["after"]): void;
    /**
     * Carry out one import, writing through the graph primitives in `draft`.
     * @param command - The import.
     * @param draft - The command's draft.
     * @param signal - Fires when the import is cancelled; it stops before the next chunk.
     * @param after - Starts work once the import's step is recorded, as its deferred members.
     * @returns Settles once the last chunk is written.
     */
    import(
        command: DataImportCommand,
        draft: Draft,
        signal: AbortSignal,
        after?: UndoableContext["after"],
    ): Promise<ImportOutcome | null | undefined>;
    /**
     * Set graph-level values through `draft`: what a plugin algorithm wrote to `graphResults`, or
     * the data source's new name.
     * @param values - The values by name.
     * @param draft - The command's draft.
     */
    values?(values: Readonly<Record<string, unknown>>, draft: Draft): void;
}

/** A session's stable edge identity, read from its current snapshot. */
export interface EdgeIdentityService {
    /**
     * An edge's stable identity: its file id, else its ordinal among its pair's edges in its load.
     * @param id - The session edge id.
     * @returns The member, or undefined when the graph holds no such edge.
     */
    member(id: EdgeId): EdgeMember | undefined;
    /**
     * The session ids of the edges stable members name now.
     * @param members - The members.
     * @returns One entry per member: its edge's id, or undefined when it binds no single edge.
     */
    idsOf(members: readonly EdgeMember[]): (EdgeId | undefined)[];
}

/** The graph value naming where the graph was last loaded from. */
export const SOURCE_VALUE = "source";

/** The graph value listing every load still in the graph, oldest first. */
export const SOURCES_VALUE = "sources";

/**
 * The graph value holding what the last loaded file said about the whole graph: its format and
 * its graph-level attributes (`{ format: "dot", attributes: { layout: "neato" } }`). Written only
 * for a reader that declares graph values.
 */
export const FILE_GRAPH_VALUE = "fileGraph";

/** What {@link FILE_GRAPH_VALUE} holds. */
export interface FileGraphValue {
    readonly format: string;
    readonly attributes: Readonly<Record<string, unknown>>;
}

/**
 * A source as the graph keeps it: without the inline text or the file, which the loaded rows
 * already hold and which history must not keep alive.
 * @param source - The source.
 * @returns The descriptor.
 */
export function describeSource(source: ImportSource): ImportSource {
    const config =
        source.config === undefined
            ? undefined
            : Object.freeze(
                  Object.fromEntries(Object.entries(source.config).filter(([key]) => key !== "data" && key !== "file")),
              );

    return Object.freeze({
        ...(source.type === undefined ? {} : { type: source.type }),
        ...(source.name === undefined ? {} : { name: source.name }),
        ...(source.size === undefined ? {} : { size: source.size }),
        ...(config === undefined ? {} : { config }),
    });
}

/** How new edges are read: the endpoint expressions and the repeated-edge policy. */
interface EdgeReadOptions {
    readonly source?: string;
    readonly target?: string;
    readonly repeated?: DuplicatePolicy;
}

/**
 * The step replacing the graph's edges: remove the edges it holds, add the new ones.
 * @param held - The ids of the edges it holds, read when the step is about to run.
 * @param records - The edges it should hold afterwards.
 * @param options - Endpoint expressions and the repeated-edge policy for the new edges.
 * @param setup - Declared at construction.
 * @returns The command.
 */
export function replaceEdgesCommand(
    held: readonly EdgeId[],
    records: readonly RecordInput[],
    options: EdgeReadOptions = {},
    setup = false,
): BatchCommand {
    const steps: DataApplyCommand[] = [];
    if (held.length > 0) {
        steps.push({ op: "data.apply", mutation: { kind: "remove-edges", ids: [...held] } });
    }

    steps.push({
        op: "data.apply",
        mutation: {
            kind: "add-edges",
            records,
            ...(options.source === undefined ? {} : { source: options.source }),
            ...(options.target === undefined ? {} : { target: options.target }),
            ...(options.repeated === undefined ? {} : { repeated: options.repeated }),
        },
    });
    return {
        op: "batch",
        label: "Replaced the edges",
        fact: { code: "data.replace-edges", params: {} },
        steps,
        ...(setup ? { setup } : {}),
    };
}

/**
 * The step replacing the graph's nodes: remove the nodes it holds that the new records do not
 * name, with their edges, give every node named again the record it was just handed (it keeps its
 * row, its position and its edges), and add the new ones.
 * @param held - The records of the nodes it holds by id, read when the step is about to run.
 * @param records - The nodes it should hold afterwards.
 * @param idPath - Where a record's id is, `data.knownFields.nodeIdPath`.
 * @param setup - Declared at construction.
 * @returns The command.
 */
export function replaceNodesCommand(
    held: ReadonlyMap<NodeId, Readonly<Record<string, unknown>>>,
    records: readonly RecordInput[],
    idPath: string,
    setup = false,
): BatchCommand {
    const named = new Map(records.map((record) => [searchRecord(record, idPath), record]));
    const gone = [...held.keys()].filter((id) => !named.has(id));
    const changed: RowUpdate<NodeId>[] = [];
    for (const [id, prior] of held) {
        const record = named.get(id);
        if (record !== undefined && !deepEquals(prior, record)) {
            changed.push({ id, values: record });
        }
    }

    const steps: DataApplyCommand[] = [];
    if (gone.length > 0) {
        steps.push({ op: "data.apply", mutation: { kind: "remove-nodes", ids: gone } });
    }

    if (changed.length > 0) {
        steps.push({
            op: "data.apply",
            mutation: { kind: "update-rows", target: "node", rows: changed, replace: true },
        });
    }

    steps.push({ op: "data.apply", mutation: { kind: "add-nodes", records, idPath } });
    return {
        op: "batch",
        label: "Replaced the nodes",
        fact: { code: "data.replace-nodes", params: {} },
        steps,
        ...(setup ? { setup } : {}),
    };
}

/** Above this many rows a command holds the whole `graph` slice instead of each id. */
const MAX_HELD_IDS = 1024;

/**
 * The ids a patching mutation names.
 * @param mutation - A `set-attributes` or `update-rows` mutation.
 * @returns The ids, each once.
 */
function patchedIds(mutation: Extract<DataMutation, { kind: "set-attributes" | "update-rows" }>): (NodeId | EdgeId)[] {
    return mutation.kind === "set-attributes" ? [...mutation.ids] : mutation.rows.map((row) => row.id);
}

/**
 * How many rows a mutation names, for its label.
 * @param mutation - The mutation.
 * @returns The count.
 */
function sizeOf(mutation: Exclude<DataMutation, { kind: "clear" }>): number {
    switch (mutation.kind) {
        case "add-nodes":
        case "add-edges":
            return mutation.records.length;
        case "remove-nodes":
        case "remove-edges":
            return mutation.ids.length;
        default:
            return patchedIds(mutation).length;
    }
}

/**
 * The step's label.
 * @param mutation - The mutation.
 * @returns "Added 3 nodes" and the like.
 */
function labelOf(mutation: DataMutation): string {
    if (mutation.kind === "clear") {
        return "Cleared the graph";
    }

    const count = sizeOf(mutation);
    switch (mutation.kind) {
        case "add-nodes":
            return count === 1 ? "Added a node" : `Added ${String(count)} nodes`;
        case "add-edges":
            return count === 1 ? "Added an edge" : `Added ${String(count)} edges`;
        case "remove-nodes":
            return count === 1 ? "Removed a node" : `Removed ${String(count)} nodes`;
        case "remove-edges":
            return count === 1 ? "Removed an edge" : `Removed ${String(count)} edges`;
        default:
            return `Edited ${String(count)} ${mutation.target}${count === 1 ? "" : "s"}`;
    }
}

/**
 * The step's fact.
 * @param mutation - The mutation.
 * @returns `data.add-nodes` with its count, and the like.
 */
function factOf(mutation: DataMutation): CodedFact<HistoryCode> {
    if (mutation.kind === "clear") {
        return { code: "data.clear", params: {} };
    }

    const count = sizeOf(mutation);
    switch (mutation.kind) {
        case "add-nodes":
        case "add-edges":
        case "remove-nodes":
        case "remove-edges":
            return { code: `data.${mutation.kind}`, params: { count } };
        default:
            return { code: "data.edit", params: { target: mutation.target, count } };
    }
}

const dataApply: UndoableDefinition<DataApplyCommand> = {
    op: "data.apply",
    undo: {
        kind: "undoable",
        label: (command) => labelOf(command.mutation),
        fact: (command) => factOf(command.mutation),
    },
    moves: false,
    // A clear begins a new dataset, whose step keeps the arrangement it replaced.
    movesWhen: (command) => command.mutation.kind === "clear",
    draws: true,
    variants: ["add-nodes", "add-edges", "set-attributes", "update-rows", "remove-nodes", "remove-edges", "clear"],
    // An add's ids are not known before it runs (an edge's id is assigned, a record's id is read
    // through a path), nor are the edges a node removal takes with it, and a removal renumbers
    // every row after it, so these hold the whole slice; a small patch holds only the ids it names.
    keys: (command) => {
        const { mutation } = command;
        if (mutation.kind !== "set-attributes" && mutation.kind !== "update-rows") {
            return ["graph"];
        }

        const ids = patchedIds(mutation);
        if (ids.length > MAX_HELD_IDS) {
            return ["graph"];
        }

        return ids.map((id) => `graph/${mutation.target === "node" ? nodeKey(id) : edgeKey(String(id))}`);
    },
    lane: { kind: "queued", category: "data-add", categoryOf: (command) => categoryOf(command.mutation) },
    // The records are the caller's own objects, kept as they are: `Node.data` has always been the
    // record handed in. Freezing them is design/undo/undo-plan.md phase 18b.
    byReference: ["records"],
    execute: (command, ctx) => {
        serviceOf(ctx.services.data).apply(command.mutation, ctx.draft, ctx.after);
    },
};

/**
 * The queue category of a mutation, which decides what it obsoletes on the element's queue.
 * @param mutation - The mutation.
 * @returns `data-add`, `data-update` or `data-remove`.
 */
function categoryOf(mutation: DataMutation): "data-add" | "data-update" | "data-remove" {
    switch (mutation.kind) {
        case "add-nodes":
        case "add-edges":
            return "data-add";
        case "set-attributes":
        case "update-rows":
            return "data-update";
        default:
            return "data-remove";
    }
}

/**
 * The data service, or the refusal of a session that has none.
 * @param service - The session's data service.
 * @returns It.
 */
export function serviceOf(service: DataService | undefined): DataService {
    if (service === undefined) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message: "This session holds no graph store it can write, so it cannot apply data.",
            source: "data",
        });
    }

    return service;
}

/**
 * What an import's step is called.
 * @param command - The import.
 * @returns "Loaded flights.csv" and the like.
 */
function importLabel(command: DataImportCommand): string {
    const { name, type } = importFact(command).params;
    if (name !== null) {
        return `Loaded ${String(name)}`;
    }

    return type === null ? "Set the data source" : `Loaded ${String(type)}`;
}

/**
 * The fact of an import's step: the name `data.source()` reports and the data source.
 * @param command - The import.
 * @returns `data.import` with `name` and `type`, each null when unknown.
 */
export function importFact(command: DataImportCommand): CodedFact<"data.import"> {
    const { type, config, name } = command.source;
    const file = config?.file as { name?: unknown } | undefined;
    const url = typeof config?.url === "string" && !config.url.startsWith("data:") ? config.url : undefined;
    // The same name `data.source()` reports: the one given, the file's, or the URL's last part.
    const named = [name, config?.filename, file?.name, url?.split(/[?#]/)[0]?.split("/").pop()].find(
        (each): each is string => typeof each === "string" && each !== "",
    );
    return { code: "data.import", params: { name: named ?? null, type: type ?? null } };
}

/**
 * The import's `layout` choice: the command's own, else the one its source config names (a load
 * call's options and `dataSourceConfig` carry it there, beside the reader's options).
 * @param command - the import
 * @returns `"recommended"` or `"keep"`
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when the config names any other value.
 */
function layoutChoiceOf(command: DataImportCommand): "recommended" | "keep" {
    const layout = command.layout ?? command.source.config?.layout ?? "keep";
    if (layout !== "recommended" && layout !== "keep") {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `A load's layout is "recommended" or "keep", not ${JSON.stringify(layout)}.`,
            source: "data",
            details: { reason: "bad-layout-choice", layout: JSON.stringify(layout) },
        });
    }

    return layout;
}

export const dataImport: UndoableDefinition<DataImportCommand> = {
    op: "data.import",
    undo: { kind: "undoable", label: importLabel, fact: importFact },
    // A chunked writer: a layout can move the lane between its chunks, so it takes the
    // arrangement it began from, and a replacing one begins a new dataset.
    moves: true,
    draws: true,
    variants: ["replace", "merge"],
    // A load writes rows it cannot name before it has read them, so it holds the whole slice.
    keys: () => ["graph"],
    lane: { kind: "queued", category: "data-add", coalesce: (command) => command.coalesce ?? null },
    // The options can carry a `File` and a whole file's text, and a draft's held rows a whole
    // file's records, an error tally and the graph a measured merge counts; none is copied.
    byReference: ["config", "held", "measure"],
    closesBaseline: true,
    execute: async (command, ctx) => {
        // The scene units one unit of the file's lengths is drawn as, once its styles are drawn:
        // the stored drawing a recommended fixed layout keeps takes the same unit (issue #2322).
        let sceneScale: number | null = null;
        if (layoutChoiceOf(command) === "recommended") {
            adviseLayout(ctx, () => sceneScale);
        }

        const replacing = command.mode !== "merge" && command.measure === undefined;
        const picked = replacing ? pickedEdges(ctx) : [];
        const outcome = await serviceOf(ctx.services.data).import(command, ctx.draft, ctx.signal, ctx.after);
        if (outcome !== null && outcome !== undefined) {
            await repickEdges(picked, ctx);
        }

        // The file's styles, and the previous file's layers swept, in this same step.
        sceneScale = await applyFileStyles(command, outcome ?? null, ctx);
        if (layoutChoiceOf(command) === "recommended") {
            // Whether a Graphviz engine can draw the file is a question for a Worker, so it is
            // asked here, before the step seals and the recommendation is read.
            await ctx.services.layoutPrepare?.();
        }
    },
};

/** A user layer naming edges by id, with each edge's stable identity before a replacing load. */
interface PickedEdges {
    readonly id: LayerId;
    readonly selector: Extract<Selector, { match: "ids" }>;
    readonly members: readonly (EdgeMember | undefined)[];
}

/**
 * The user layers whose `ids` selector names edges, read before a replacing load: a session edge
 * id is a counter that never rewinds, so the same file loaded again issues new ids.
 * @param ctx - The import's context.
 * @returns Each such layer with its edges' stable identities.
 */
function pickedEdges(ctx: UndoableContext): PickedEdges[] {
    const identity = ctx.services.edgeIdentity;
    if (identity === undefined) {
        return [];
    }

    const picked: PickedEdges[] = [];
    for (const { layer } of ctx.state.styles) {
        const { selector } = layer;
        if (layer.locked || selector.match !== "ids" || selector.edges === undefined || selector.edges.length === 0) {
            continue;
        }

        picked.push({ id: layer.id, selector, members: selector.edges.map((edge) => identity.member(edge)) });
    }

    return picked;
}

/**
 * Point each hand-picked layer at the ids the replacing load gave the same edges, in the load's
 * step, so loading the same file again keeps the layer's members. An edge the new graph does not
 * hold keeps its old id, which matches nothing.
 * @param picked - What {@link pickedEdges} read before the load.
 * @param ctx - The import's context.
 */
async function repickEdges(picked: readonly PickedEdges[], ctx: UndoableContext): Promise<void> {
    const identity = ctx.services.edgeIdentity;
    if (identity === undefined) {
        return;
    }

    for (const { id, selector, members } of picked) {
        const bound = members.filter((member): member is EdgeMember => member !== undefined);
        const ids = identity.idsOf(bound);
        let at = 0;
        const edges = (selector.edges ?? []).map((edge, k) => (members[k] === undefined ? edge : (ids[at++] ?? edge)));
        if (edges.some((edge, k) => edge !== selector.edges?.[k])) {
            await ctx.inline({ op: "style.patch", action: "update", id, patch: { selector: { ...selector, edges } } });
        }
    }
}

/**
 * Choose the layout recommended for what an import loads, once it is loaded, merged into the
 * import's step.
 * @param ctx - The import's context.
 * @param sceneScale - The scene units one unit of the file's lengths was drawn as, read once the
 *     import is done: a fixed layout draws the file's stored positions in the same unit.
 */
function adviseLayout(ctx: UndoableContext, sceneScale: () => number | null): void {
    const advise = ctx.services.layoutAdvice;
    ctx.after("layout:recommended", (dispatch) => {
        const advice = advise?.();
        if (advice === undefined) {
            return;
        }

        const { unplaced, placed = [] } = advice;
        const graphviz = GRAPHVIZ_ENGINES.some((engine) => graphvizLayoutId(engine) === advice.id);
        const scale = advice.id === "fixed" || graphviz || unplaced !== undefined ? sceneScale() : null;
        // A file that placed only some nodes: every placed node goes back where the file put it,
        // in the unit the fixed layout would draw it in (a layout may have moved it since), and
        // the advised layout runs over the unplaced ones, holding the rest still.
        const resize = scale ?? 1;
        // A Graphviz engine lays the file out in inches, and the file's lengths (its node sizes)
        // are points, 72 to the inch: drawn at the scale its styles were, so its nodes keep their
        // size against the spaces Graphviz leaves between them.
        // ponytail: no scale when lengths are kept as the file has them (`lengths: "file"`), where
        // an inch should be 72 scene units; pass it when that option is used with a Graphviz file.
        const unit = graphviz && scale !== null ? POINTS_PER_UNIT * scale : scale;
        const options =
            (advice.id === "fixed" || graphviz) && unit !== null ? { ...advice.options, scale: unit } : advice.options;
        const layout = dispatch({
            op: "layout.set",
            id: advice.id,
            engine: advice.engine,
            ...(unplaced === undefined ? {} : { scope: { nodes: unplaced } }),
            ...(options === undefined ? {} : { options }),
        });
        // Once the new layout holds the placed nodes, put them back: the layout running before
        // it may have moved them.
        const applied =
            unplaced === undefined
                ? layout
                : layout.then(() =>
                      dispatch({
                          op: "positions.set",
                          entries: placed.map(({ id, x, y, z = 0 }) => ({
                              id,
                              x: x * resize,
                              y: y * resize,
                              z: z * resize,
                          })),
                      }),
                  );
        void applied.catch((error: unknown) => {
            // An undo that took the import away cancels this too; anything else is a
            // layout the import promised and did not apply.
            if ((error as { name?: unknown } | null)?.name !== "AbortError") {
                GraphtyLogger.getLogger(["graphty", "data"]).error(
                    "The layout recommended for the imported data could not be applied",
                    error instanceof Error ? error : new Error(String(error)),
                    { layout: advice.id },
                );
            }
        });
    });
}

const dataExpand: UndoableDefinition<DataExpandCommand> = {
    op: "data.expand",
    undo: {
        kind: "undoable",
        label: (command) => `Expanded ${String(command.seed)}`,
        fact: (command) => ({ code: "data.expand", params: { node: command.seed } }),
    },
    // A slot-holding writer (design section 6.4).
    moves: true,
    draws: true,
    keys: () => ["graph"],
    lane: { kind: "immediate" },
    byReference: ["nodes", "edges"],
    execute: (command, ctx) => {
        const service = serviceOf(ctx.services.data);
        service.apply({ kind: "add-nodes", records: command.nodes }, ctx.draft, ctx.after);
        // `first`, because a neighbourhood legitimately names edges the graph already holds: the
        // edge the reader followed to get here is in both of its endpoints' neighbourhoods.
        service.apply(
            {
                kind: "add-edges",
                records: command.edges,
                repeated: "first",
                ...(command.source === undefined ? {} : { source: command.source }),
                ...(command.target === undefined ? {} : { target: command.target }),
            },
            ctx.draft,
            ctx.after,
        );
    },
};

const dataDeclare: UndoableDefinition<DataDeclareCommand> = {
    op: "data.declare",
    undo: {
        kind: "undoable",
        label: (command) => `Declare ${command.column.name}`,
        fact: (command) => ({
            code: "data.declare",
            params: { kind: command.column.kind, column: command.column.name },
        }),
    },
    // A declaration repaints nothing: a layer keeps the binding it was created with.
    moves: false,
    keys: (command) => [`attributes/${declarationKey(command.column)}`],
    lane: { kind: "immediate" },
    execute: (command, ctx) => {
        const { declaration } = command;
        const { order } = declaration as { order?: unknown };
        const valid =
            DECLARABLE.has(declaration.measurement) &&
            (declaration.measurement === "ordinal"
                ? Array.isArray(order) &&
                  order.length > 0 &&
                  order.every((value) => typeof value === "string" || typeof value === "number")
                : order === undefined);
        if (!valid) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `A declaration names one of ${[...DECLARABLE].join(", ")}, and an ordinal one lists its values in order.`,
                source: "data",
                details: { column: command.column, declaration, available: [...DECLARABLE] },
            });
        }

        const stored: MeasurementDeclaration =
            declaration.measurement === "ordinal"
                ? { measurement: "ordinal", order: Object.freeze([...declaration.order]) }
                : { measurement: declaration.measurement };
        ctx.draft.attributes.set(declarationKey(command.column), Object.freeze(stored));
    },
};

const dataSetSource: UndoableDefinition<DataSetSourceCommand> = {
    op: "data.setSource",
    undo: {
        kind: "undoable",
        label: (command) => `Name the source ${command.source.name ?? ""}`,
        fact: (command) => ({ code: "data.set-source", params: { name: command.source.name ?? null } }),
    },
    moves: false,
    keys: () => [`graph/v:${SOURCE_VALUE}`, `graph/v:${SOURCES_VALUE}`],
    lane: { kind: "immediate" },
    execute: (command, ctx) => {
        const { source } = command;
        if (typeof source !== "object" || source === null || Array.isArray(source)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "A data source is described by an object: its type, name, size and options.",
                source: "data",
                details: { reason: "not-a-source", source },
            });
        }

        const service = serviceOf(ctx.services.data);
        if (service.values === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This session cannot write graph values, so it cannot describe the data source.",
                source: "data",
            });
        }

        service.values(
            {
                [SOURCE_VALUE]: describeSource(source),
                ...(command.sources === undefined ? {} : { [SOURCES_VALUE]: Object.freeze([...command.sources]) }),
            },
            ctx.draft,
        );
    },
};

const dataSetFileStyles: UndoableDefinition<DataSetFileStylesCommand> = {
    op: "data.setFileStyles",
    undo: {
        kind: "undoable",
        label: () => "Set the style values of loaded files",
        fact: (command) => ({
            code: "data.set-file-styles",
            params: { loads: Array.isArray(command.loads) ? command.loads.length : 0 },
        }),
    },
    moves: false,
    keys: () => [`graph/v:${FILE_STYLES_VALUE}`],
    lane: { kind: "immediate" },
    execute: (command, ctx) => {
        // Checked before anything is written: the values may come from a file anyone edited.
        const store = fileStyleStoreOf(command.loads);
        const service = serviceOf(ctx.services.data);
        if (service.values === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This session cannot write graph values, so it cannot keep style values.",
                source: "data",
            });
        }

        service.values({ [FILE_STYLES_VALUE]: store.loads.length === 0 ? undefined : store }, ctx.draft);
    },
};

/** The data ops' definitions. */
const dataLabel: UndoableDefinition<DataLabelCommand> = {
    op: "data.label",
    undo: {
        kind: "undoable",
        label: (command) =>
            command.label === null
                ? `Remove the name of ${String(command.value)}`
                : `Name ${String(command.value)} ${command.label}`,
        fact: (command) => ({
            code: "data.label",
            params: { path: command.path, value: command.value, label: command.label },
        }),
    },
    // A name repaints nothing: what an element is drawn as reads the value, never its name.
    moves: false,
    keys: (command) => [`valueLabels/${valueLabelKey(command.path, command.value)}`],
    lane: { kind: "immediate" },
    execute: (command, ctx) => {
        const { path, value, label } = command;
        const valid =
            typeof path === "string" &&
            (path.startsWith("data.") || path.startsWith("results.")) &&
            ["string", "number", "boolean"].includes(typeof value) &&
            (label === null || typeof label === "string");
        if (!valid) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message:
                    'A value is named on a path ("data.<column>" or "results.<run>.<field>"), with text or null to remove the name.',
                source: "data",
                details: { path, value, label },
            });
        }

        const key = valueLabelKey(path, value);
        const name = label?.trim() ?? "";
        if (name === "") {
            ctx.draft.valueLabels.delete(key);
        } else {
            ctx.draft.valueLabels.set(key, name);
        }
    },
};

export const DATA_DEFINITIONS = [
    dataApply,
    dataImport,
    dataExpand,
    dataDeclare,
    dataSetSource,
    dataSetFileStyles,
    dataLabel,
] as const;
