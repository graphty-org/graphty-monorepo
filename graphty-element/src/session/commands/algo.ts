/**
 * @file The run ops: `algo.run` and `algo.remove`.
 *
 * `algo.run` takes a slot on the queue under `algorithm-run`, computes, and then, in one
 * synchronous commit tail, writes the finished run into the `runs` slice together with the style
 * layers it paints: its first-completion layers, and the suggested layers it was asked to apply.
 * So a run, its result, its layers and its legend are one step, and undoing it keeps the result
 * in history instead of recomputing it. A run cancelled before it commits, whether by undo, by
 * the queue or by its own `cancel()`, writes nothing.
 *
 * `algo.remove` takes a run out of the `runs` slice and removes the layers bound to it, in one
 * draft, so one undo brings both back.
 *
 * What a run computes, and which handle a consumer holds for it, is the runs API's work: it
 * registers the {@link RunService} these ops call. See design/undo/undo-design.md sections 4.7,
 * 4.8 and 6.3.
 */

import type { RunId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { AlgorithmRunCommand } from "../planning";
import type { UndoableContext, UndoableDefinition } from "../project/Dispatcher";
import type { Draft } from "../project/draft";

/** `algo.remove`: take a finished run, and every layer bound to it, out of the project. */
export interface AlgoRemoveCommand {
    readonly op: "algo.remove";
    /** The run. */
    readonly id: RunId;
}

/** How a session carries out the run ops; registered by its runs API. */
export interface RunService {
    /**
     * Compute a run, then write it and the layers it paints through the command's draft.
     * @param command - The run.
     * @param ctx - The command's context: its draft, its signal and its slot.
     * @returns Settles once the run is written; rejects when it failed or was cancelled first.
     */
    run(command: AlgorithmRunCommand, ctx: UndoableContext): Promise<unknown>;
    /**
     * Remove a run and the layers bound to it through `draft`, and stop it if it is still going.
     * @param command - The removal.
     * @param draft - The command's draft.
     * @returns What went with it.
     */
    remove(command: AlgoRemoveCommand, draft: Draft): unknown;
}

/**
 * The session's run service, or the refusal of a dispatcher that has none.
 * @param service - The registered service.
 * @returns It.
 */
function required(service: RunService | undefined): RunService {
    if (service === undefined) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message: "This dispatcher has no runs API registered, so it cannot run an algorithm.",
            source: "run",
        });
    }

    return service;
}

const algoRun: UndoableDefinition<AlgorithmRunCommand> = {
    op: "algo.run",
    undo: { kind: "undoable", label: (command) => `Ran ${command.algorithm}` },
    moves: false,
    draws: true,
    // Written only in the commit tail, which is synchronous, so a run holds nothing while it
    // computes and never blocks a style edit.
    keys: () => ["runs", "styles"],
    lane: { kind: "queued", category: "algorithm-run" },
    execute: (command, ctx) => required(ctx.services.runs).run(command, ctx),
};

const algoRemove: UndoableDefinition<AlgoRemoveCommand> = {
    op: "algo.remove",
    undo: { kind: "undoable", label: (command) => `Removed run ${command.id}` },
    moves: false,
    draws: true,
    keys: () => ["runs", "styles"],
    lane: { kind: "immediate" },
    execute: (command, ctx) => required(ctx.services.runs).remove(command, ctx.draft),
};

/** The run ops' definitions. */
export const ALGO_DEFINITIONS = [algoRun, algoRemove] as const;
