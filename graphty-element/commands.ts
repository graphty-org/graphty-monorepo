/**
 * @file `@graphty/graphty-element/commands`: the serialisable form of every verb.
 *
 * Every change a session makes is a command: plain data with an `op`, which `session.execute`
 * runs, a transaction groups into one undoable step, and a recipe, a journal or an agent's tool
 * call can carry. This entry point publishes the vocabulary as data:
 *
 * - `SessionCommand`, the union of every command, the same type `./session` publishes;
 * - `COMMANDS`, one entry per op saying whether it is undoable, or exempt from the history and
 *   why;
 * - `isSessionCommand`, which tells a value that names a known op from anything else.
 *
 * The typed builders, `parsePattern`, `formatCommand` and the JSON Schema generated from the
 * union are still to come (GitHub issue #337).
 *
 * What the element can do today is published as data by `@graphty/graphty-element/catalog`: the
 * algorithms, layouts, formats, palettes and scales that exist, with every option each accepts.
 */

import type { SessionCommand } from "./src/session/planning";

export type { SessionCommand };

/** How one op behaves under undo: a step in the history, or exempt from it and why. */
export type CommandMeta =
    | { readonly undo: "undoable" }
    | {
          readonly undo: "exempt";
          /** Why it changes nothing a project file saves. */
          readonly reason: string;
      };

/**
 * Every op in the vocabulary, and how it behaves under undo. An op missing here, or declaring
 * neither, is a compile error.
 */
export const COMMANDS = Object.freeze({
    "algo.run": { undo: "undoable" },
    "style.patch": { undo: "undoable" },
    "style.encode": { undo: "undoable" },
    "style.template": { undo: "undoable" },
    "visibility.set": { undo: "undoable" },
    "visibility.window": { undo: "undoable" },
    "visibility.context": { undo: "undoable" },
    "scope.save": { undo: "undoable" },
    "scope.remove": { undo: "undoable" },
    "view.save": { undo: "undoable" },
    "view.remove": { undo: "undoable" },
    "view.camera": { undo: "exempt", reason: "Where the camera is looking is view state, not saved in a project file." },
    "config.set": { undo: "undoable" },
} as const satisfies { readonly [Op in SessionCommand["op"]]: CommandMeta });

/**
 * Whether a value is a command: an object whose `op` names an op in {@link COMMANDS}. The
 * arguments are checked when the command runs.
 * @param value - Anything.
 * @returns True when it names a known op.
 */
export function isSessionCommand(value: unknown): value is SessionCommand {
    const op = (value as { op?: unknown } | null)?.op;
    return typeof value === "object" && typeof op === "string" && Object.hasOwn(COMMANDS, op);
}
