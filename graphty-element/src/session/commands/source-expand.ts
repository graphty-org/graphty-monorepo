/**
 * @file The ops click-to-expand dispatches. Experimental.
 *
 * - `data.source-expand`: what an expansion from a network source fetched, already merged against
 *   the graph it was fetched for: the new nodes (placed near their seed), the attribute updates of
 *   nodes already there (the incoming values and the `_source` facts) and the edges. The rows are
 *   in the command, so redo never fetches.
 * - `data.collapse`: what a node's expansions alone brought, removed, and the seed's facts reset.
 */

import type { EdgeId, NodeId } from "../../catalog/types";
import type { SessionCommand } from "../planning";
import type { CommandDefinition, UndoableDefinition } from "../project/Dispatcher";
import type { RowUpdate } from "../types";
import { serviceOf } from "./data";

/** `data.source-expand`: one expansion from a network source, rows included. */
export interface SourceExpandCommand {
    readonly op: "data.source-expand";
    /** The expansion's key, also in each row's `_source.loads`. */
    readonly key: string;
    /** The seeds. */
    readonly seeds: readonly NodeId[];
    /** Nodes the graph did not hold. */
    readonly nodes: readonly Record<string, unknown>[];
    /** Nodes the graph held: the incoming values and their `_source` facts. */
    readonly updates: readonly RowUpdate<NodeId>[];
    /** Edge records, `source` and `target` naming their endpoints; one the graph holds is skipped. */
    readonly edges: readonly Record<string, unknown>[];
    /** "continue" plays the layout so it places the new nodes; "none" leaves it as it is. */
    readonly layout: "continue" | "none";
}

/** `data.collapse`: what a node's expansions alone brought, removed. */
export interface SourceCollapseCommand {
    readonly op: "data.collapse";
    /** The node collapsed. */
    readonly seed: NodeId;
    /** The nodes to remove, with every edge attached to one. */
    readonly nodes: readonly NodeId[];
    /** Further edges to remove, by the element-assigned id. */
    readonly edges: readonly EdgeId[];
    /** The seed's reset `_source` facts. */
    readonly update: RowUpdate<NodeId>;
}

/** The ops of this file. */
export type SourceExpandOpCommand = SourceExpandCommand | SourceCollapseCommand;

const sourceExpand: UndoableDefinition<SourceExpandCommand> = {
    op: "data.source-expand",
    undo: {
        kind: "undoable",
        label: (command) => `Expanded ${command.seeds.map(String).join(", ")}`,
        fact: (command) => ({
            code: "data.source-expand",
            params: { seeds: command.seeds, nodes: command.nodes.length, edges: command.edges.length },
        }),
    },
    moves: true,
    draws: true,
    keys: () => ["graph"],
    lane: { kind: "immediate" },
    byReference: ["nodes", "updates", "edges"],
    execute: (command, ctx) => {
        const service = serviceOf(ctx.services.data);
        service.apply({ kind: "add-nodes", records: command.nodes }, ctx.draft, ctx.after);
        if (command.updates.length > 0) {
            service.apply({ kind: "update-rows", target: "node", rows: command.updates }, ctx.draft, ctx.after);
        }

        // `first`: a neighborhood names edges the graph already holds, such as the one followed here.
        service.apply(
            { kind: "add-edges", records: command.edges, repeated: "first", source: "source", target: "target" },
            ctx.draft,
            ctx.after,
        );
        if (command.layout === "continue") {
            ctx.services.layout?.transport("play");
        }
    },
};

const sourceCollapse: UndoableDefinition<SourceCollapseCommand> = {
    op: "data.collapse",
    undo: {
        kind: "undoable",
        label: (command) => `Collapsed ${String(command.seed)}`,
        fact: (command) => ({
            code: "data.collapse",
            params: { node: command.seed, nodes: command.nodes.length },
        }),
    },
    moves: true,
    draws: true,
    keys: () => ["graph"],
    lane: { kind: "immediate" },
    byReference: ["nodes", "edges"],
    execute: (command, ctx) => {
        const service = serviceOf(ctx.services.data);
        if (command.edges.length > 0) {
            service.apply({ kind: "remove-edges", ids: command.edges }, ctx.draft, ctx.after);
        }

        if (command.nodes.length > 0) {
            service.apply({ kind: "remove-nodes", ids: command.nodes }, ctx.draft, ctx.after);
        }

        service.apply({ kind: "update-rows", target: "node", rows: [command.update] }, ctx.draft, ctx.after);
    },
};

/** The source-expand ops' definitions. */
export const SOURCE_EXPAND_DEFINITIONS: readonly CommandDefinition<SessionCommand>[] = [sourceExpand, sourceCollapse];
