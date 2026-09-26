/**
 * @file The visibility ops: `visibility.set` (the filter), `visibility.window` (the time window)
 * and `visibility.context` (whether hidden nodes are drawn faintly). Each is one undoable step.
 *
 * All three run on the immediate lane: the value is written to the `visibility` slice when the
 * command is dispatched, and the masks are evaluated on the derivation lane against whatever the
 * slice holds when the pass runs, so a filter superseded before then is never evaluated. The
 * masks are not state; they are derived from these three values and the graph. See
 * design/undo/undo-design.md sections 3.4, 9.2 and 11.3.
 */

import type { UndoableDefinition } from "../project/Dispatcher";
import { assertVisibility, type Filter, type TimeWindow } from "../visibility/filter";

/** `visibility.set`: apply a filter, or clear it with null. */
interface VisibilitySetCommand {
    readonly op: "visibility.set";
    readonly filter: Filter | null;
}

/** `visibility.window`: apply a time window, or clear it with null. */
interface VisibilityWindowCommand {
    readonly op: "visibility.window";
    readonly window: TimeWindow | null;
}

/** `visibility.context`: draw hidden nodes faintly, or not at all. */
interface VisibilityContextCommand {
    readonly op: "visibility.context";
    readonly show: boolean;
}

/** Every visibility op. */
export type VisibilityCommand = VisibilitySetCommand | VisibilityWindowCommand | VisibilityContextCommand;

/** The session's visibility model, as the visibility ops reach it. */
export interface VisibilityService {
    /**
     * Refuse a filter or a window the session could not evaluate, before anything is written.
     * @param filter - The filter, or null.
     * @param window - The window, or null.
     */
    check(filter: Filter | null, window: TimeWindow | null): void;
}

/** Shared by the three ops. */
const COMMON = { moves: false, draws: true, lane: { kind: "immediate" } } as const;

const visibilitySet: UndoableDefinition<VisibilitySetCommand> = {
    ...COMMON,
    op: "visibility.set",
    keys: () => ["visibility/filter"],
    undo: {
        kind: "undoable",
        label: (command) => (command.filter === null ? "Cleared the filter" : `Filtered (${command.filter.kind})`),
        // A slider drag is one step: filter edits recorded close together merge.
        coalesce: () => "filter",
    },
    execute: (command, ctx) => {
        (ctx.services.visibility?.check ?? assertVisibility)(command.filter, null);
        ctx.draft.visibility.set("filter", command.filter);
    },
};

const visibilityWindow: UndoableDefinition<VisibilityWindowCommand> = {
    ...COMMON,
    op: "visibility.window",
    keys: () => ["visibility/window"],
    undo: {
        kind: "undoable",
        label: (command) => (command.window === null ? "Cleared the time window" : "Set the time window"),
        coalesce: () => "window",
    },
    execute: (command, ctx) => {
        (ctx.services.visibility?.check ?? assertVisibility)(null, command.window);
        ctx.draft.visibility.set("window", command.window);
    },
};

const visibilityContext: UndoableDefinition<VisibilityContextCommand> = {
    ...COMMON,
    op: "visibility.context",
    keys: () => ["visibility/showContext"],
    undo: {
        kind: "undoable",
        label: (command) => (command.show ? "Showed hidden nodes faintly" : "Stopped showing hidden nodes"),
    },
    execute: (command, ctx) => {
        ctx.draft.visibility.set("showContext", command.show);
    },
};

/** The visibility ops' definitions. */
export const VISIBILITY_DEFINITIONS = [visibilitySet, visibilityWindow, visibilityContext] as const;
