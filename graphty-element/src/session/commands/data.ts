/**
 * @file The data ops, each one undoable step:
 *
 * - `data.apply`: one change to the graph's rows or records. The kinds that grow or patch the
 *   graph, `add-nodes`, `add-edges`, `set-attributes` and `update-rows`, and the removals and
 *   `clear`: `remove-nodes`, `remove-edges`, `clear`.
 * - `data.import`: a load through a registered data source, replacing the graph or adding to it.
 * - `data.expand`: the neighbourhood a double-click fetched, added as one step. The fetched
 *   records are in the command, so redo never fetches again.
 *
 * Each reads its records through ingest (id and endpoint extraction, the repeated-edge policy,
 * weights) and writes through the graph primitives in its draft, which record the resolved values,
 * so undo and redo never pass through ingest, a data source or a fetcher again. See
 * design/undo/undo-design.md sections 3.3, 3.4, 4.7 and 11.1.
 *
 * `data.apply` and `data.expand` run on the immediate lane: the write is visible as soon as
 * `dispatch` returns, and the element's own doors take their turn on the operation queue first, so
 * an add is ordered against loads and layouts as before. `data.import` takes its turn on the queue
 * itself, holding the whole graph while it reads.
 */

import type { DuplicatePolicy } from "@graphty/graph-format";
import jmespath from "jmespath";

import type { EdgeId, NodeId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { UndoableContext, UndoableDefinition } from "../project/Dispatcher";
import type { Draft } from "../project/draft";
import { edgeKey, nodeKey } from "../project/graphOps";
import type { NodeRecordInput, RowUpdate } from "../types";
import type { BatchCommand } from "./index";

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
}

/** `data.import`. */
export interface DataImportCommand {
    readonly op: "data.import";
    readonly source: ImportSource;
    /** `"replace"` (the default) empties the graph first, in the same step; `"merge"` adds to it. */
    readonly mode?: "replace" | "merge";
    /** `"recommended"` also chooses a layout for what was loaded; not available yet. */
    readonly layout?: "recommended" | "keep";
    /** Declared at construction: while the baseline window is open it becomes the baseline. */
    readonly setup?: boolean;
    /**
     * Imports with the same key coalesce while the first waits its turn: the element's two
     * properties assigned one after the other are one load.
     */
    readonly coalesce?: string;
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

/** Every data op. */
export type DataCommand = DataApplyCommand | DataImportCommand | DataExpandCommand;

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
    import(command: DataImportCommand, draft: Draft, signal: AbortSignal, after?: UndoableContext["after"]): Promise<void>;
}

/** The graph value naming where the graph was last loaded from. */
export const SOURCE_VALUE = "source";

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
            : Object.freeze(Object.fromEntries(Object.entries(source.config).filter(([key]) => key !== "data" && key !== "file")));

    return Object.freeze({
        ...(source.type === undefined ? {} : { type: source.type }),
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
    return { op: "batch", label: "Replaced the edges", steps, ...(setup ? { setup } : {}) };
}

/**
 * The step replacing the graph's nodes: remove the nodes it holds that the new records do not
 * name, with their edges, and add the new ones. A node named again keeps its row and its edges.
 * @param held - The ids of the nodes it holds, read when the step is about to run.
 * @param records - The nodes it should hold afterwards.
 * @param idPath - Where a record's id is, `data.knownFields.nodeIdPath`.
 * @param setup - Declared at construction.
 * @returns The command.
 */
export function replaceNodesCommand(
    held: readonly NodeId[],
    records: readonly RecordInput[],
    idPath: string,
    setup = false,
): BatchCommand {
    const named = new Set(records.map((record) => jmespath.search(record, idPath) as unknown));
    const gone = held.filter((id) => !named.has(id));
    const steps: DataApplyCommand[] = [];
    if (gone.length > 0) {
        steps.push({ op: "data.apply", mutation: { kind: "remove-nodes", ids: gone } });
    }

    steps.push({ op: "data.apply", mutation: { kind: "add-nodes", records } });
    return { op: "batch", label: "Replaced the nodes", steps, ...(setup ? { setup } : {}) };
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

const dataApply: UndoableDefinition<DataApplyCommand> = {
    op: "data.apply",
    undo: { kind: "undoable", label: (command) => labelOf(command.mutation) },
    moves: false,
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
    lane: { kind: "immediate" },
    // The records are the caller's own objects, kept as they are: `Node.data` has always been the
    // record handed in. Freezing them is design/undo/undo-plan.md phase 18b.
    byReference: ["records"],
    execute: (command, ctx) => {
        serviceOf(ctx.services.data).apply(command.mutation, ctx.draft, ctx.after);
    },
};

/**
 * The data service, or the refusal of a session that has none.
 * @param service - The session's data service.
 * @returns It.
 */
function serviceOf(service: DataService | undefined): DataService {
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
    const { type, config } = command.source;
    if (type === undefined || config === undefined) {
        return "Set the data source";
    }

    const named = config.filename ?? config.url;
    return `Loaded ${typeof named === "string" && !named.startsWith("data:") ? named : type}`;
}

const dataImport: UndoableDefinition<DataImportCommand> = {
    op: "data.import",
    undo: { kind: "undoable", label: importLabel },
    moves: false,
    draws: true,
    variants: ["replace", "merge"],
    // A load writes rows it cannot name before it has read them, so it holds the whole slice.
    keys: () => ["graph"],
    lane: { kind: "queued", category: "data-add", coalesce: (command) => command.coalesce ?? null },
    // The options can carry a `File` and a whole file's text; neither is copied.
    byReference: ["config"],
    closesBaseline: true,
    execute: async (command, ctx) => {
        if (command.layout === "recommended") {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: 'data.import cannot choose a layout yet; import with layout "keep" and set the layout after.',
                source: "data",
            });
        }

        await serviceOf(ctx.services.data).import(command, ctx.draft, ctx.signal, ctx.after);
    },
};

const dataExpand: UndoableDefinition<DataExpandCommand> = {
    op: "data.expand",
    undo: { kind: "undoable", label: (command) => `Expanded ${String(command.seed)}` },
    moves: false,
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

/** The data ops' definitions. */
export const DATA_DEFINITIONS = [dataApply, dataImport, dataExpand] as const;
