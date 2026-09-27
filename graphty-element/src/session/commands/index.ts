/**
 * @file The definition of every op in the vocabulary: how it behaves under undo, which keys it
 * writes, which lane it runs on, and what it does. The dispatcher is built from this list, and
 * `COMMANDS` in `commands.ts` publishes the undo half of it; the vocabulary test checks that the
 * two agree op for op. See design/undo/undo-design.md sections 4.1 and 10.5.
 */

import { GraphtyError } from "../../errors/GraphtyError";
import type { AlgorithmRunCommand, SessionCommand } from "../planning";
import type { CommandDefinition, UndoableDefinition } from "../project/Dispatcher";
import { CONFIG_DEFINITIONS } from "./config";
import { DATA_DEFINITIONS } from "./data";
import { SCOPE_DEFINITIONS } from "./scope";
import { STYLE_DEFINITIONS } from "./style";
import { VIEW_DEFINITIONS } from "./view";
import { VISIBILITY_DEFINITIONS } from "./visibility";

/**
 * `algo.run`: a finished run, its result and the layers it paints are one step. Until runs are
 * project state the session starts a run through the runs API rather than dispatching this, so
 * its `execute` refuses: a dispatch reaching it is a door ported before its slice.
 */
const algoRun: UndoableDefinition<AlgorithmRunCommand> = {
    op: "algo.run",
    undo: { kind: "undoable", label: (command) => `Ran ${command.algorithm}` },
    moves: false,
    draws: true,
    keys: () => ["runs"],
    lane: { kind: "queued", category: "algorithm-run" },
    execute: () => {
        throw new GraphtyError({
            code: "E_INTERNAL",
            message: "algo.run cannot be dispatched yet: runs are not project state, so session.run starts them.",
            source: "history",
        });
    },
};

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
 * `batch`: its members run as one transaction, so they are one step and roll back together. The
 * dispatcher runs it through `members`; `execute` is never reached.
 */
const batch: UndoableDefinition<BatchCommand> = {
    op: "batch",
    undo: { kind: "undoable", label: (command) => command.label ?? `${String(command.steps.length)} changes` },
    moves: false,
    keys: () => [],
    lane: { kind: "immediate" },
    // Its members' own arguments, kept as their definitions keep them.
    byReference: ["records", "config", "nodes", "edges"],
    members: (command) => ({ label: command.label ?? `${String(command.steps.length)} changes`, steps: command.steps }),
    execute: () => {
        throw new GraphtyError({ code: "E_INTERNAL", message: "A batch runs as a transaction of its members.", source: "history" });
    },
};

/** Every op's definition, one per op. */
export const DEFINITIONS: readonly CommandDefinition<SessionCommand>[] = [
    algoRun,
    batch,
    ...DATA_DEFINITIONS,
    ...STYLE_DEFINITIONS,
    ...VISIBILITY_DEFINITIONS,
    ...SCOPE_DEFINITIONS,
    ...VIEW_DEFINITIONS,
    ...CONFIG_DEFINITIONS,
];
