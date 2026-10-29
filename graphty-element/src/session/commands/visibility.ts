/**
 * @file The visibility ops: `visibility.set` (the filter), `visibility.steps` (the filter steps),
 * `visibility.window` (the time window) and `visibility.context` (whether hidden nodes are drawn
 * faintly). Each is one undoable step.
 *
 * All three run on the immediate lane: the value is written to the `visibility` slice when the
 * command is dispatched, and the masks are evaluated on the derivation lane against whatever the
 * slice holds when the pass runs, so a filter superseded before then is never evaluated. The
 * masks are not state; they are derived from these three values and the graph. See
 * design/undo/undo-design.md sections 3.4, 9.2 and 11.3.
 */

import type { FilterStep } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { UndoableDefinition } from "../project/Dispatcher";
import type { CodedFact } from "../shared";
import type { HistoryCode } from "../types";
import { assertVisibility, type RuleTree, type TimePlayback, type TimeWindow } from "../visibility/filter";
import { assertSteps, stepsFact } from "../visibility/steps";

/** `visibility.set`: apply a filter, or clear it with null. */
interface VisibilitySetCommand {
    readonly op: "visibility.set";
    readonly filter: RuleTree | null;
}

/** `visibility.window`: apply a time window, or clear it with null. */
interface VisibilityWindowCommand {
    readonly op: "visibility.window";
    readonly window: TimeWindow | null;
    /**
     * Where a gesture ended (a dragged window let go): its own step, never merged into a window
     * step recorded just before it.
     */
    readonly ownStep?: boolean;
}

/** `visibility.context`: draw hidden nodes faintly, or not at all. */
interface VisibilityContextCommand {
    readonly op: "visibility.context";
    readonly show: boolean;
}

/** `visibility.steps`: replace the filter steps, combined with AND; an empty list clears them. */
interface VisibilityStepsCommand {
    readonly op: "visibility.steps";
    readonly steps: readonly FilterStep[];
}

/** `visibility.playback`: how `session.time` moves windows (results, mode, step, missing), or null for the defaults. */
interface VisibilityPlaybackCommand {
    readonly op: "visibility.playback";
    readonly playback: TimePlayback | null;
}

/** Every visibility op. */
export type VisibilityCommand =
    | VisibilitySetCommand
    | VisibilityWindowCommand
    | VisibilityContextCommand
    | VisibilityStepsCommand
    | VisibilityPlaybackCommand;

/** The session's visibility model, as the visibility ops reach it. */
export interface VisibilityService {
    /**
     * Refuse a filter or a window the session could not evaluate, before anything is written.
     * @param filter - The filter, or null.
     * @param window - The window, or null.
     */
    check(filter: RuleTree | null, window: TimeWindow | null): void;
}

/**
 * The coalesce key of a filter edit: what a slider or a chip list drags over, so a drag of one
 * filter's bounds merges, and a different filter, a different attribute or a clear does not.
 * @param filter - The filter the edit leaves in force.
 * @returns The key, or null for an edit that is its own step.
 */
function filterKey(filter: VisibilitySetCommand["filter"]): string | null {
    switch (filter?.kind) {
        case "range":
        case "categories":
            return `filter:${filter.kind}:${filter.attribute}`;
        case "degree":
            return `filter:degree:${filter.direction ?? ""}`;
        default:
            return null;
    }
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
        fact: (command): CodedFact<HistoryCode> =>
            command.filter === null
                ? { code: "visibility.clear-filter", params: {} }
                : { code: "visibility.filter", params: { kind: command.filter.kind } },
        // A slider drag is one step: edits of the same filter recorded close together merge.
        coalesce: (command) => filterKey(command.filter),
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
        fact: (command) => ({
            code: command.window === null ? "visibility.clear-window" : "visibility.window",
            params: {},
        }),
        coalesce: (command) => (command.ownStep === true ? null : "window"),
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
        fact: (command) => ({ code: command.show ? "visibility.show-context" : "visibility.hide-context", params: {} }),
    },
    execute: (command, ctx) => {
        ctx.draft.visibility.set("showContext", command.show);
    },
};

const visibilitySteps: UndoableDefinition<VisibilityStepsCommand> = {
    ...COMMON,
    op: "visibility.steps",
    keys: () => ["visibility/steps"],
    undo: {
        kind: "undoable",
        label: () => "Changed the filter steps",
        fact: (command, state) => stepsFact(state.visibility.steps, command.steps),
        // ponytail: no coalescing, so each add, edit, toggle or delete is its own step; a dragged
        // step's bounds would need a key naming the step if that drag ever records too many.
    },
    execute: (command, ctx) => {
        assertSteps(command.steps);
        const service = ctx.services.visibility;
        for (const step of command.steps) {
            if (service === undefined) {
                assertVisibility(step.rule, null);
            } else {
                service.check(step.rule, null);
            }
        }

        ctx.draft.visibility.set("steps", Object.freeze([...command.steps]));
    },
};

/** The values each playback setting takes. */
const PLAYBACK_VALUES = {
    results: ["keep", "stale", "rerun"],
    mode: ["sliding", "cumulative"],
    missing: ["inside", "outside"],
    outside: ["hide", "ghost"],
} as const;

/** The named steps a playback setting takes besides a positive number. */
const PLAYBACK_STEPS = new Set(["auto", "hour", "day", "week", "month", "quarter", "year"]);

/**
 * Refuse a malformed playback setting.
 * @param playback - The settings, or null.
 * @throws `E_BAD_COMMAND` naming the setting.
 */
function assertPlayback(playback: TimePlayback | null): void {
    if (playback === null) {
        return;
    }

    const bad = (field: string, value: unknown): GraphtyError =>
        new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `A playback setting's ${field} is not one it takes.`,
            source: "data",
            details: { field, value, reason: "playback" },
        });
    for (const [field, allowed] of Object.entries(PLAYBACK_VALUES)) {
        const value = (playback as Readonly<Record<string, unknown>>)[field];
        if (value !== undefined && !(allowed as readonly unknown[]).includes(value)) {
            throw bad(field, value);
        }
    }

    const { step } = playback;
    if (
        step !== undefined &&
        !(typeof step === "number" && Number.isFinite(step) && step > 0) &&
        !(typeof step === "string" && PLAYBACK_STEPS.has(step))
    ) {
        throw bad("step", step);
    }
}

const visibilityPlayback: UndoableDefinition<VisibilityPlaybackCommand> = {
    moves: false,
    draws: false,
    lane: { kind: "immediate" },
    op: "visibility.playback",
    keys: () => ["visibility/playback"],
    undo: {
        kind: "undoable",
        label: () => "Changed how time plays",
        fact: () => ({ code: "visibility.playback", params: {} }),
        coalesce: () => "playback",
    },
    execute: (command, ctx) => {
        assertPlayback(command.playback);
        ctx.draft.visibility.set("playback", command.playback === null ? null : Object.freeze({ ...command.playback }));
    },
};

/** The visibility ops' definitions. */
export const VISIBILITY_DEFINITIONS = [
    visibilitySet,
    visibilityWindow,
    visibilityContext,
    visibilitySteps,
    visibilityPlayback,
] as const;
