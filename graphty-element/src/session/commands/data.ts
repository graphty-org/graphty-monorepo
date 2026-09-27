/**
 * @file `data.apply`: one change to the graph's rows or records as one undoable step. The kinds
 * that grow or patch the graph are here: `add-nodes`, `add-edges`, `set-attributes` and
 * `update-rows`, and the removals and `clear`: `remove-nodes`, `remove-edges`, `clear`.
 *
 * The command reads its records through ingest (id and endpoint extraction, the repeated-edge
 * policy, weights) and writes through the graph primitives in its draft, which record the
 * resolved values, so undo and redo never pass through ingest again. See
 * design/undo/undo-design.md sections 3.4, 4.7 and 11.1.
 *
 * It runs on the immediate lane: the write is visible as soon as `dispatch` returns. The element's
 * own doors still take their turn on the operation queue first, so an add is ordered against loads
 * and layouts exactly as before.
 */

import type { DuplicatePolicy } from "@graphty/graph-format";

import type { EdgeId, NodeId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { UndoableDefinition } from "../project/Dispatcher";
import type { Draft } from "../project/draft";
import { edgeKey, nodeKey } from "../project/graphOps";
import type { NodeRecordInput, RowUpdate } from "../types";

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

/** Every data op. */
export type DataCommand = DataApplyCommand;

/** How a session applies a data mutation: its ingest and its store. Set by whoever owns them. */
export interface DataService {
    /**
     * Apply one mutation, writing through the graph primitives in `draft`.
     * @param mutation - The mutation.
     * @param draft - The command's draft.
     */
    apply(mutation: DataMutation, draft: Draft): void;
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
        const service = ctx.services.data;
        if (service === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This session holds no graph store it can write, so it cannot apply data.",
                source: "data",
            });
        }

        service.apply(command.mutation, ctx.draft);
    },
};

/** The data ops' definitions. */
export const DATA_DEFINITIONS = [dataApply] as const;
