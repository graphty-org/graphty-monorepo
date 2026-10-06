/**
 * @file The definition of every op in the vocabulary: how it behaves under undo, which keys it
 * writes, which lane it runs on, and what it does. The dispatcher is built from this list, and
 * `COMMANDS` in `commands.ts` publishes the undo half of it; the vocabulary test checks that the
 * two agree op for op. See design/undo/undo-design.md sections 4.1 and 10.5.
 */

import { GraphtyError } from "../../errors/GraphtyError";
import type { SessionCommand } from "../planning";
import type { CommandDefinition, UndoableDefinition } from "../project/Dispatcher";
import { ALGO_DEFINITIONS } from "./algo";
import { CONFIG_DEFINITIONS } from "./config";
import { DATA_DEFINITIONS } from "./data";
import { LAYOUT_DEFINITIONS } from "./layout";
import { NOTE_DEFINITIONS } from "./notes";
import { POSITIONS_DEFINITIONS } from "./positions";
import { SET_DEFINITIONS } from "./sets";
import { STYLE_DEFINITIONS } from "./style";
import { VIEW_DEFINITIONS } from "./view";
import { VISIBILITY_DEFINITIONS } from "./visibility";

/** `batch`: commands that are one step, as data. A serialisable transaction. */
export interface BatchCommand {
    readonly op: "batch";
    /** The commands, dispatched in order; each takes its own lane. */
    readonly steps: readonly SessionCommand[];
    /** What the step is called; the first member's name by default. */
    readonly label?: string;
    /** Declared at construction: while the baseline window is open it becomes the baseline. */
    readonly setup?: boolean;
}

/**
 * What to call a batch nobody named.
 * @param count - How many commands it holds.
 * @returns The label.
 */
function batchLabel(count: number): string {
    return count === 1 ? "1 change" : `${String(count)} changes`;
}

/**
 * `batch`: its members run as one transaction, so they are one step and roll back together. The
 * dispatcher runs it through `members`; `execute` is never reached.
 */
const batch: UndoableDefinition<BatchCommand> = {
    op: "batch",
    undo: { kind: "undoable", label: (command) => command.label ?? batchLabel(command.steps.length) },
    moves: false,
    keys: () => [],
    lane: { kind: "immediate" },
    // Its members' own arguments, kept as their definitions keep them.
    byReference: ["records", "config", "nodes", "edges", "held", "measure"],
    members: (command) => ({ label: command.label ?? batchLabel(command.steps.length), steps: command.steps }),
    execute: () => {
        throw new GraphtyError({
            code: "E_INTERNAL",
            message: "A batch runs as a transaction of its members.",
            source: "history",
        });
    },
};

/** Every op's definition, one per op. */
export const DEFINITIONS: readonly CommandDefinition<SessionCommand>[] = [
    ...ALGO_DEFINITIONS,
    batch,
    ...DATA_DEFINITIONS,
    ...STYLE_DEFINITIONS,
    ...VISIBILITY_DEFINITIONS,
    ...SET_DEFINITIONS,
    ...NOTE_DEFINITIONS,
    ...VIEW_DEFINITIONS,
    ...CONFIG_DEFINITIONS,
    ...POSITIONS_DEFINITIONS,
    ...LAYOUT_DEFINITIONS,
];
