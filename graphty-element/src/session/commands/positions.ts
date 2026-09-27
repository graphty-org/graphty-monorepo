/**
 * @file The positions ops, each one undoable step on the immediate lane:
 *
 * - `positions.set`: place nodes at coordinates. It records the rows it wrote as a row patch, or,
 *   over more than a third of the rows, a capture; calls made one after another within the
 *   coalescing window are one step.
 * - `positions.pin`: pin nodes where they are, or release them. The pinned ids are the `pins`
 *   slice; the lane's pin bytes and the layout engine follow it.
 *
 * See design/undo/undo-design.md sections 6.4 and 10.5.
 */

import type { NodeId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { UndoableContext, UndoableDefinition } from "../project/Dispatcher";
import { nodeKey } from "../project/graphOps";
import type { PositionEntry } from "../types";

/** `positions.set`: place nodes at coordinates. */
interface PositionsSetCommand {
    readonly op: "positions.set";
    readonly entries: readonly PositionEntry[];
}

/** `positions.pin`: pin nodes, or release them. */
interface PositionsPinCommand {
    readonly op: "positions.pin";
    readonly ids: readonly NodeId[];
    readonly pinned: boolean;
}

/** Every positions op. */
export type PositionsCommand = PositionsSetCommand | PositionsPinCommand;

/**
 * The arrangement a positions op writes through.
 * @param ctx - The command's context.
 * @returns The session's arrangement.
 */
function arrangementOf(ctx: UndoableContext): NonNullable<UndoableContext["services"]["positions"]> {
    const { positions } = ctx.services;
    if (positions === undefined) {
        throw new GraphtyError({
            code: "E_INTERNAL",
            message: "This dispatcher has no arrangement.",
            source: "history",
        });
    }

    return positions;
}

/**
 * "a node" or "3 nodes".
 * @param count - How many.
 * @returns The words.
 */
function nodes(count: number): string {
    return count === 1 ? "a node" : `${String(count)} nodes`;
}

const positionsSet: UndoableDefinition<PositionsSetCommand> = {
    op: "positions.set",
    moves: false,
    draws: true,
    lane: { kind: "immediate" },
    keys: () => [],
    undo: {
        kind: "undoable",
        label: (command) => `Moved ${nodes(command.entries.length)}`,
        coalesce: () => "positions",
    },
    execute: (command, ctx) => {
        arrangementOf(ctx).set(command.entries, ctx.draft);
    },
};

const positionsPin: UndoableDefinition<PositionsPinCommand> = {
    op: "positions.pin",
    moves: false,
    draws: true,
    lane: { kind: "immediate" },
    keys: (command) => command.ids.map((id) => `pins/${nodeKey(id)}`),
    undo: {
        kind: "undoable",
        label: (command) => `${command.pinned ? "Pinned" : "Released"} ${nodes(command.ids.length)}`,
    },
    execute: (command, ctx) => {
        arrangementOf(ctx).pin(command.ids, command.pinned, ctx.draft);
    },
};

/** The positions ops' definitions. */
export const POSITIONS_DEFINITIONS = [positionsSet, positionsPin] as const;
