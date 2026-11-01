/**
 * @file Starting runs, finding them, and taking them away.
 *
 * This sits in FRONT of the element's existing operation queue and does not replace any part of
 * it. The queue still decides order, still owns an abort controller per operation, still emits the
 * progress and lifecycle events every other operation emits. What this adds is the half an
 * operation id cannot answer: which run that operation is, whether starting the same work again
 * should make a second one, where a waiting run sits in the line, and what removing a run would
 * take with it.
 *
 * The one rule worth reading before anything else: **starting the same algorithm with the same
 * parameters over the same scope returns the run that already exists**, and re-executes it in
 * place when the data has moved under it. That is what "re-run from a layer" needs, and it is why
 * a layer binding never dangles. It is also why ids are derived from what a run IS rather than
 * from how many runs came before it.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM. The queue arrives as {@link RunQueue}, a
 * structural view of `OperationQueueManager` narrow enough that the session never imports the
 * renderer's manager to talk to it.
 */

import { paletteDescriptor } from "../../catalog/palettes";
import { registeredAlgorithmByKey } from "../../catalog/registry";
import {
    type AlgorithmDescriptor,
    type AlgorithmKey,
    isDeprecatedAlgorithm,
    type LayerId,
    type NodeId,
    type OptionDescriptor,
    type PaletteId,
    type RunId,
    type Scope,
    type ScopeInput,
    type SetId,
    type SuggestedName,
} from "../../catalog/types";
import { GraphtyError, isGraphtyError } from "../../errors";
import { ALGO_DEFINITIONS, type AlgoMoveCommand, type AlgoRemoveCommand, type RunService } from "../commands/algo";
import type { AlgorithmRunCommand } from "../planning";
import {
    cancelReasonOf,
    Dispatcher,
    type DispatchFunction,
    runQueueScheduler,
    type UndoableContext,
} from "../project/Dispatcher";
import type { Draft } from "../project/draft";
import type { RunEntry } from "../project/state";
import { elementIdsOf } from "../results/RunResult";
import { RESULT_ROOT, type RunResult } from "../results/types";
import type { HeldCaptures } from "../sets/captures";
import type { CodedFact } from "../shared";
import {
    authoredDriving,
    type AutoApplyPolicy,
    bare,
    idOf,
    type PaintHold,
    suggestionCommand,
} from "../styles/autoApply";
import type { StyleSuggestion } from "../styles/derive";
import type { Layer } from "../styles/Layer";
import { findRow, rowsOf } from "../styles/tree";
import { type GroupMatch, matchGroups, realignPatch } from "../styles/values";
import type { HistoryCode } from "../types";
import { valueLabelKey, valueLabelOf } from "../valueLabels";
import {
    ManagedRun,
    type RunBody,
    type RunDefinition,
    type RunExecutor,
    type RunProgressSink,
    type RunQueueContext,
    type RunSurroundings,
    type RunTicket,
} from "./Run";
import {
    assertRunId,
    canonicalize,
    canonicalizeParams,
    canonicalResultIdentity,
    deriveRunId,
    freezeScope,
    type LiveKeyword,
    type ResultIdentity,
    type RunIdentity,
} from "./runId";
import { type RunName, suggestRunName } from "./suggestedName";
import {
    type BatchResult,
    type BatchStep,
    type Caveats,
    type EngineVersions,
    isTerminalRunStatus,
    type QueueEntry,
    type ResolvedScope,
    type Run,
    type RunChange,
    type RunGroup,
    type RunLayers,
    type RunOptions,
    type RunPainting,
    type RunPhase,
    type RunRemoval,
    type RunsApi,
    type RunScopeFacts,
    type RunSpec,
    type RunStyle,
    type StaleNote,
    type StartOptions,
    type SuggestionOutcome,
} from "./types";

// ---------------------------------------------------------------------------------------------
// What the runs API needs from the rest of the element
// ---------------------------------------------------------------------------------------------

/**
 * The element's operation queue, as a run needs it.
 *
 * `OperationQueueManager` satisfies this structurally: the point of writing it down rather than
 * importing the class is that the session stays free of the renderer's manager graph, and that a
 * test can drive a run without a queue at all.
 */
export interface RunQueue {
    /**
     * Put work in the queue.
     * @param category - Which of the queue's categories this run belongs to, and therefore which
     *     obsolescence rules apply to it. `"algorithm-run"` is a computation over the graph,
     *     which arriving data makes stale and so cancels; `"style-edit"` is a write to the style
     *     stack, which is a standing instruction about how to paint whatever the graph holds and
     *     which nothing obsoletes. The queue's remaining categories are not runs.
     * @param execute - The work.
     * @param options - What to call it in the queue's own events.
     * @param options.description - The description the queue's events carry.
     * @returns The queue's operation id, which is not the run id.
     */
    queueOperation(
        category: "algorithm-run" | "style-edit",
        execute: (context: RunQueueContext) => Promise<void> | void,
        options?: { description?: string },
    ): string;
    /**
     * Resolve once nothing is queued or running.
     *
     * WHAT THIS EXISTS TO ANSWER. The element starts work of its own that nobody awaited -- a
     * run's suggested encoding lands on the run's first completion, deliberately without making a
     * consumer await the picture in order to have started the run. So `await runs.start(...)`
     * hands back the numbers while the paint is still on its way, and a consumer that read the
     * layer stack or the legend right then saw the picture as it stood a moment ago. Working that
     * out by counting turns is coordination code, and coordination code the element should not be
     * shipping to a consumer.
     * @returns A promise that resolves when the queue is empty.
     */
    settled(): Promise<void>;
    /**
     * Stop one queued or running operation.
     * @param operationId - The id `queueOperation` returned.
     * @returns True when there was something to stop.
     */
    cancelOperation(operationId: string): boolean;
}

/** The algorithm half of the catalogue, which is all a run reads. */
interface RunCatalog {
    /**
     * Every algorithm the element can run.
     * @returns The descriptors.
     */
    algorithms(): readonly AlgorithmDescriptor[];
}

/**
 * The style layers that read runs.
 *
 * Optional, because a session can be built without a style stack at all. While it is absent,
 * removing a run removes no layers and says so honestly rather than pretending it checked.
 */
interface RunLayerBindings {
    /**
     * Which layers read one run.
     * @param runId - The run.
     * @returns The layer ids.
     */
    bindings(runId: RunId): readonly LayerId[];
    /**
     * Remove layers, because the run they read is going away. Used only by a runs API whose
     * dispatcher has no style stack registered; a session removes them in the removal's own step.
     * @param layerIds - The layers to remove.
     */
    remove?(layerIds: readonly LayerId[]): void;
}

/** Everything the runs API is built from. */
export interface RunsApiOptions {
    /** The element's operation queue. */
    readonly queue: RunQueue;
    /** The catalogue the run machinery agrees with rather than restates. */
    readonly catalog: RunCatalog;
    /**
     * Resolve a scope specification against the graph as it stands.
     * @param spec - What was asked for.
     * @returns What it resolves to now.
     */
    readonly resolveScope: (spec: Scope) => ResolvedScope;
    /**
     * What a run records about the set a scope names: its revision and its edge reading. Absent
     * records neither.
     * @param spec - The scope.
     * @returns The facts.
     */
    readonly scopeFacts?: (spec: Scope) => RunScopeFacts;
    /**
     * The digest of the graph's data now, compared with the one a run's scope facts recorded.
     * Absent compares scopes only.
     */
    readonly dataDigest?: () => string;
    /**
     * A scope digest a run counts as current besides the one it ran on: what a time window move
     * under `results: "keep"` accepted. Absent, only the digest it ran on is current.
     * @param id - The run.
     * @param ranOn - The digest it ran on.
     * @returns The accepted digest, or undefined.
     */
    readonly acceptedDigest?: (id: RunId, ranOn: string) => string | undefined;
    /**
     * The time window in force now (attribute and bounds), compared with the one a run over the
     * visible graph recorded. Absent, windows are not compared.
     */
    readonly windowNow?: () => { readonly attribute: string; readonly from: number; readonly to: number } | null;
    /**
     * The window a `results: "keep"` window move accepted a run as current in, besides the one it
     * ran in.
     * @param id - The run.
     * @returns The accepted window key, or undefined.
     */
    readonly acceptedWindow?: (id: RunId) => string | undefined;
    /**
     * The name of a kept set, for a run label.
     * @param id - The set.
     * @returns The name, or undefined when no set has the id.
     */
    readonly setName?: (id: SetId) => string | undefined;
    /** The thing that actually runs an algorithm. */
    readonly execute: RunExecutor;
    /** Which versions are producing the numbers. */
    readonly engine: EngineVersions;
    /** What a call that names no scope gets. Defaults to the visible graph. */
    readonly defaultScope?: Scope;
    /**
     * A write door's check of the scope a call names: session edge ids to stable members, set ids
     * checked as issued. Absent, the scope is taken as given.
     * @param spec - The scope as given.
     * @returns The scope to record.
     */
    readonly admitScope?: (spec: ScopeInput) => Scope;
    /**
     * The definition a live scope keyword stands for now, which a derived run id hashes in its
     * place: the visibility filter and window for `"visible"`, the selected nodes for
     * `"selection"`. Absent, the keyword itself is hashed.
     * @param keyword - The keyword.
     * @returns Plain data that changes exactly when the keyword's definition does.
     */
    readonly liveScope?: (keyword: LiveKeyword) => unknown;
    /** The caveats a run starts from, before the work refines them. */
    readonly defaultCaveats?: Caveats;
    /** The style layers that read runs, once there are any. */
    readonly layers?: RunLayerBindings;
    /**
     * The one policy that decides whether a finished run paints, and with what.
     *
     * Optional, and absent it paints nothing: a session with no style stack has nowhere to put a
     * layer. It is handed IN rather than built here because the policy belongs to the style
     * system -- this file knows when a run finished and when a batch is in flight, and nothing
     * else about styling.
     */
    readonly styling?: AutoApplyPolicy;
    /**
     * Called every time any run this session holds reaches one of the four watched moments.
     *
     * One observer for every run, rather than a handler per call, because the thing that wants it
     * is a status bar that did not start the run: an element mirroring runs onto a DOM event has
     * no way to attach `onProgress` to a run a console or an agent started. `StartOptions.onProgress`
     * stays what it is -- the caller's own handler for its own run.
     * @param change - The run's record, and which moment it reached.
     */
    readonly onChange?: (change: RunChange) => void;
    /**
     * The dispatcher whose `runs` slice holds the finished runs and whose history records them.
     * A session hands in its own; absent, the runs API keeps a private one over its queue.
     */
    readonly dispatcher?: Dispatcher;
    /** Called once per execution token minted, which is what advances the session input tick. */
    readonly onExecution?: () => void;
    /** Called when a run is removed, and with it its result (design/sets 11). */
    readonly onRemoved?: (id: RunId) => void;
    /**
     * Capture what live references hold of a run's result before a re-run replaces it
     * (design/sets 5.2). Absent: nothing is captured.
     * @param run - The run about to re-execute in place, its result still in place.
     * @param prior - The captures it keeps now.
     * @returns The captures it keeps from now on.
     */
    readonly captureHeld?: (run: RunId, prior: HeldCaptures) => HeldCaptures;
}

/** The runs API, plus the things a session needs and a consumer never calls. */
export interface SessionRunsApi extends RunsApi {
    /**
     * Whether the element minted this run's id rather than the author naming it with `as:`.
     *
     * A document that references a derived id would resolve differently against a session where
     * the run was started with different parameters, so serialising one is refused with
     * `E_UNSTABLE_RUN_ID`. Nothing else can answer this: a derived id and an author-assigned one
     * are the same string once they exist.
     * @param id - The run id.
     * @returns True when the element derived the id.
     */
    isDerivedId(id: RunId): boolean;
    /**
     * Start one algorithm through a dispatch of the caller's: a transaction's, so the run joins
     * its step, or the one a command hands its deferred members.
     * @param dispatch - Where the run's command is dispatched.
     * @param algorithm - Which algorithm to run.
     * @param params - Its parameters.
     * @param options - The scope, the seed, the id and the rest.
     * @returns The run.
     */
    startVia(
        dispatch: DispatchFunction,
        algorithm: AlgorithmKey,
        params?: Readonly<Record<string, unknown>>,
        options?: StartOptions,
    ): Run;
    /**
     * What a run keeps of earlier executions' items that live references hold (design/sets 5.2).
     * @param id - The run id.
     * @returns The captures; empty for a run this session does not hold.
     */
    heldOf(id: RunId): HeldCaptures;
    /** Cancel everything still running and forget every run this session held. */
    dispose(): void;
}

// ---------------------------------------------------------------------------------------------
// Defaults and small helpers
// ---------------------------------------------------------------------------------------------

/** What a run's numbers are qualified by before the work has said anything about them. */
/** What a run with no captures keeps. */
const NO_HELD: HeldCaptures = new Map();

/** A run whose decision is not made yet. */
const PENDING: RunPainting = bare("pending");

/** A run recorded without a decision. */
const UNKNOWN: RunPainting = bare("unknown");

/**
 * A group's value spelled as a category, the way a rule's `categories` names it.
 * @param value - The value.
 * @returns The name.
 */
function categoryName(value: unknown): string {
    return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * What a colour binding paints each group of a partition when every group is a layer of its own:
 * through the palette the binding paints with (the one it names, else the one the element picks
 * for it), and past that palette's colours, colours of their own rather than one "other" grey.
 * Keeping the palette matters: asked to extend, the element would otherwise pick a ramp sized to
 * the number of groups.
 * @param preview - The styles service's column preview.
 * @param binding - The binding.
 * @param column - The groups' values, one per node.
 * @returns The preview.
 */
function groupsPreview<B extends { readonly palette?: string }, P extends { readonly palette: string | null }>(
    preview: (binding: B, channel: "node.color", column: readonly unknown[]) => P,
    binding: B,
    column: readonly unknown[],
): P {
    const named = binding.palette ?? preview(binding, "node.color", column).palette;
    const palette = named === null || named === "custom" ? {} : { palette: named };
    return preview({ ...binding, overflow: "extend", ...palette }, "node.color", column);
}

/**
 * The first of a consumer's palettes with a color for every group, else its first.
 * @param palettes - The palettes, in order of preference.
 * @param column - The groups' values, one per node.
 * @returns `{ palette }`, or nothing when no palettes were given.
 */
function preferredPalette(
    palettes: readonly PaletteId[] | undefined,
    column: readonly unknown[],
): { readonly palette?: PaletteId } {
    if (palettes === undefined || palettes.length === 0) {
        return {};
    }
    const groups = new Set(column.filter((value) => value !== undefined && value !== null)).size;
    const covering = palettes.find((id) => (paletteDescriptor(id)?.colors.length ?? 0) >= groups);
    return { palette: covering ?? palettes[0] };
}

/**
 * A painted colour as one spelling, so two paints of one colour compare equal: a hex string as
 * it is, a colour value by its hex, upper case.
 * @param paints - The paint.
 * @returns The hex, or undefined for anything else.
 */
function hexOf(paints: unknown): string | undefined {
    const hex = typeof paints === "string" ? paints : (paints as { readonly hex?: unknown } | null | undefined)?.hex;
    return typeof hex === "string" ? hex.toUpperCase() : undefined;
}

/**
 * The layers a style command added, read off what it resolved with: one layer for an encoding,
 * one per half for a highlight.
 * @param outcome - What the command resolved with.
 * @returns Their ids.
 */
function addedLayers(outcome: unknown): LayerId[] {
    const result = typeof outcome === "object" && outcome !== null && "result" in outcome ? outcome.result : undefined;

    return [result]
        .flat()
        .filter((layer): layer is Layer => typeof layer === "object" && layer !== null && "id" in layer)
        .map((layer) => layer.id);
}

/**
 * What became of a suggestion that was added: its layers, and the hand-written layer it was
 * placed directly beneath, if any.
 * @param suggestion - The suggestion.
 * @param outcome - What its command resolved with.
 * @param stack - The stack after it, bottom first.
 * @returns The outcome.
 */
function addedOutcome(suggestion: StyleSuggestion, outcome: unknown, stack: readonly Layer[]): SuggestionOutcome {
    const layerIds = Object.freeze(addedLayers(outcome));
    const top = Math.max(...layerIds.map((id) => stack.findIndex((layer) => layer.id === id)));
    const above = top < 0 ? undefined : stack[top + 1];

    return Object.freeze({
        outcome: "added",
        suggestion,
        layerIds,
        ...(above !== undefined && authoredDriving(above, suggestion.channels)
            ? { placedBeneathLayerId: above.id }
            : {}),
    });
}

/**
 * What became of a suggestion the stack refused.
 * @param suggestion - The suggestion.
 * @param error - Why.
 * @returns The outcome, carrying the code `style:problem` carried.
 */
function refusedOutcome(suggestion: StyleSuggestion, error: unknown): SuggestionOutcome {
    return Object.freeze({ outcome: "refused", suggestion, code: isGraphtyError(error) ? error.code : "E_INTERNAL" });
}

const DEFAULT_CAVEATS: Caveats = Object.freeze({
    exact: true,
    seed: null,
    direction: "as-loaded",
    weight: null,
    precision: "f64",
    method: "exact",
    facts: Object.freeze([]),
    notes: Object.freeze([]),
});

/** Where progress goes for work running beside the queue, which has no operation to report on. */
const NO_QUEUE_PROGRESS: RunProgressSink = Object.freeze({
    setProgress: () => {
        // The run publishes its own progress; there is no operation to report on.
    },
    setMessage: () => {
        // The run publishes its own progress; there is no operation to report on.
    },
    setPhase: () => {
        // The run publishes its own progress; there is no operation to report on.
    },
});

/**
 * Tell whether a thrown value is an abort rather than a failure.
 * @param error - The thrown value.
 * @returns True when it is an `AbortError` or a `TimeoutError`.
 */
function isAbortLike(error: unknown): boolean {
    return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/**
 * What to call a scope in a run label.
 * @param spec - The scope specification.
 * @param setName - A kept set's name, when there is one to ask.
 * @returns A short phrase a person reads.
 */
function describeScope(spec: Scope, setName?: (id: SetId) => string | undefined): string {
    if (spec === "visible") {
        return "visible";
    }

    if (spec === "graph") {
        return "whole graph";
    }

    if (spec === "selection") {
        return "selection";
    }

    if (spec === "largest-component") {
        return "largest component";
    }

    if ("set" in spec) {
        return setName?.(spec.set) ?? `set ${spec.set}`;
    }

    if ("where" in spec) {
        return spec.where;
    }

    if ("define" in spec) {
        return `${spec.define.kind} set`;
    }

    return `${spec.nodes.length} nodes`;
}

/**
 * How a parameter value reads inside a label.
 * @param value - The value.
 * @returns Its text.
 */
function formatParamValue(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number") {
        return String(value);
    }

    if (typeof value === "boolean") {
        return value ? "on" : "off";
    }

    if (value === undefined) {
        return "default";
    }

    return canonicalize(value);
}

/**
 * The versions to record on a run, with the registered algorithm's own version beside them.
 *
 * A run records the versions of the code that produced its numbers, and the three fixed fields
 * name the element and its two sibling packages -- which says nothing at all about a third
 * party's algorithm. The version is read from an optional `static version` on the registered
 * class, so an algorithm that declares none leaves the record exactly as it was.
 * @param key - The catalogue key the run was started by.
 * @param base - The element's own versions.
 * @returns The versions to record on this run.
 */
function engineVersionsFor(key: AlgorithmKey, base: EngineVersions): EngineVersions {
    const version = registeredAlgorithmByKey(key)?.version;

    return version === undefined ? base : Object.freeze({ ...base, plugins: Object.freeze({ [key]: version }) });
}

/**
 * Check one option's value against what its descriptor permits.
 * @param algorithm - Which algorithm the option belongs to, for the error's details.
 * @param option - The option descriptor.
 * @param value - What the caller passed.
 * @throws A `GraphtyError` with code `E_OPTION_RANGE` when the value is outside what is allowed.
 */
function checkOptionValue(algorithm: AlgorithmKey, option: OptionDescriptor, value: unknown): void {
    if (option.values !== undefined && option.values.length > 0 && typeof value === "string") {
        const allowed = option.values.map((choice) => choice.value);

        if (!allowed.includes(value)) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `"${value}" is not one of the values the "${option.name}" option accepts.`,
                source: "run",
                details: { algorithm, option: option.name, value, allowed },
            });
        }
    }

    if (typeof value !== "number") {
        return;
    }

    if (typeof option.min === "number" && value < option.min) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: `The "${option.name}" option is ${value}, below its minimum of ${option.min}.`,
            source: "run",
            details: { algorithm, option: option.name, value, min: option.min },
        });
    }

    if (typeof option.max === "number" && value > option.max) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: `The "${option.name}" option is ${value}, above its maximum of ${option.max}.`,
            source: "run",
            details: { algorithm, option: option.name, value, max: option.max },
        });
    }
}

// ---------------------------------------------------------------------------------------------
// Execution tokens (design/sets/sets-design.md 5.2)
// ---------------------------------------------------------------------------------------------

/** Minters built in this process, so two sessions' nonces differ even if the random part does not. */
let mintersBuilt = 0;

/**
 * A random 64-bit value in hex, from Web Crypto where the platform has it.
 * @returns 16 hex digits
 */
function randomHex(): string {
    const words = new Uint32Array(2);
    if (typeof globalThis.crypto?.getRandomValues === "function") {
        globalThis.crypto.getRandomValues(words);
    } else {
        words[0] = Math.floor(Math.random() * 0x1_00_00_00_00);
        words[1] = Math.floor(Math.random() * 0x1_00_00_00_00);
    }

    return [...words].map((word) => word.toString(16).padStart(8, "0")).join("");
}

/**
 * Build one session's execution-token minter: a nonce drawn once, then a counter shared by every
 * run the session holds, never a per-run count. `startedAt` was rejected as an identity because
 * two executions in one millisecond compare equal.
 * @param onMint - called after every mint
 * @returns the minter; each call returns `<nonce>.<counter>`, opaque to every reader
 */
export function createExecutionMinter(onMint?: () => void): () => string {
    const nonce = `${randomHex()}${(mintersBuilt++).toString(36)}`;
    let counter = 0;

    return () => {
        counter += 1;
        onMint?.();

        return `${nonce}.${counter}`;
    };
}

// ---------------------------------------------------------------------------------------------
// The runs API
// ---------------------------------------------------------------------------------------------

/** How the next execution of a run is dispatched. */
interface Launch {
    /** Where its command goes: the session's dispatcher, a transaction's scope, or a command's deferred members. */
    readonly via: DispatchFunction;
    /** Its command. */
    readonly command: AlgorithmRunCommand;
    /** Started beside the queue rather than in it: the "now" policy. */
    readonly beside: boolean;
}

/**
 * The command that starts one run: only what the caller said, so a recorded command reads the
 * way it was asked for.
 * @param algorithm - Which algorithm.
 * @param params - Its parameters, when there are any.
 * @param options - The scope, the seed, the sample, the exactness, the id and whether to apply
 *     the suggested layers.
 * @param scope - The scope as admitted, when the caller named one.
 * @returns The command.
 */
function runCommand(
    algorithm: AlgorithmKey,
    params: Readonly<Record<string, unknown>> | undefined,
    options: StartOptions,
    scope: Scope | undefined,
): AlgorithmRunCommand {
    return {
        op: "algo.run",
        algorithm,
        ...(params === undefined || Object.keys(params).length === 0 ? {} : { params }),
        ...(scope === undefined ? {} : { scope }),
        ...(options.seed === undefined ? {} : { seed: options.seed }),
        ...(options.sample === undefined ? {} : { sample: options.sample }),
        ...(options.exact === undefined ? {} : { exact: options.exact }),
        ...(options.as === undefined ? {} : { as: options.as }),
        ...(options.applySuggestedStyles === true ? { applySuggestedStyles: true } : {}),
        ...(options.restoreLayer === true ? { restoreLayer: true } : {}),
    };
}

/**
 * A run's command without the one-off request to apply its suggested layers, which a re-run does
 * not repeat.
 * @param command - The command.
 * @returns The command a re-run dispatches.
 */
function withoutSuggested(command: AlgorithmRunCommand): AlgorithmRunCommand {
    const { applySuggestedStyles, restoreLayer, ...rest } = command;

    return applySuggestedStyles === undefined && restoreLayer === undefined ? command : rest;
}

/**
 * A time window as one comparable string.
 * @param window - Its attribute and bounds.
 * @param window.attribute - The attribute it reads.
 * @param window.from - Its start.
 * @param window.to - Its end.
 * @returns The key.
 */
export function windowKey(window: { readonly attribute: string; readonly from: number; readonly to: number }): string {
    return `${window.attribute}|${String(window.from)}|${String(window.to)}`;
}

/** What a run is and what it answers to, worked out from what the caller asked for. */
interface ResolvedRun {
    readonly descriptor: AlgorithmDescriptor;
    readonly identity: RunIdentity;
    /** The canonical identity of the result it answers: what an id may be reused for. */
    readonly result: string;
    /** The same identity with every live scope keyword left as it is spelled. */
    readonly spelled: string;
    readonly spec: Scope;
    readonly id: RunId;
    readonly derived: boolean;
    /** The name the algorithm suggested, for a run the caller did not name. */
    readonly name?: RunName;
}

/** A run's group folder, and what every group layer added to it shares. */
interface GroupFolder {
    /** The folder's id. */
    readonly folder: string;
    /** The run's layer each group layer takes its source from. */
    readonly from: Layer;
    /** The group path. */
    readonly path: string;
    /** What to call a group, when the run's style names them. */
    readonly groupName: ((group: RunGroup) => string) | undefined;
    /** The names of the folder's group layers so far; each new name is added to it. */
    readonly taken: string[];
}

/** Starting runs, finding them, and taking them away. */
class Runs implements SessionRunsApi {
    private readonly options: RunsApiOptions;

    private readonly defaultScope: Scope;

    private readonly defaultCaveats: Caveats;

    /**
     * One handle per run id, for the life of the session: history swaps a run's entry in the
     * `runs` slice, never its handle, so a handle held before an undo is the one a redo reports.
     */
    private readonly runs = new Map<RunId, ManagedRun>();

    /**
     * The result each run answers, so that reusing an id for different work is caught rather than
     * silent. Parameters and the seed are not in it: a change of either re-runs the result.
     */
    private readonly identities = new Map<RunId, string>();

    /**
     * Each run's identity with its live scope keywords as spelled: the same spelling under another
     * filter or window is the same question asked of what is showing now, which a re-run answers.
     */
    private readonly spellings = new Map<RunId, string>();

    /** The ids the element minted, which are the ones a saved document may not reference. */
    private readonly derivedIds = new Set<RunId>();

    /** The name each minted id was suggested as: the id it tried first, and the run's label. */
    private readonly names = new Map<RunId, RunName>();

    /** The command each run was started with, which a re-run dispatches again. */
    private readonly commands = new Map<RunId, AlgorithmRunCommand>();

    /** How each run's next execution is dispatched, set just before it starts. */
    private readonly launches = new Map<RunId, Launch>();

    /** The work of each execution dispatched and waiting for its command to run it. */
    private readonly bodies = new Map<RunId, RunBody>();

    /** The batch each member's painting is held for. */
    private readonly holds = new Map<RunId, PaintHold>();
    /** The style of each run first started with `groups: "layers"`, kept for its re-runs and restores. */
    private readonly groupStyles = new Map<RunId, Exclude<RunStyle, boolean>>();

    /**
     * What a batch decided for its members when it released their hold. Kept beside the runs
     * slice rather than in it, because the release paints through the batch's transaction after
     * each member's entry is written; `painting()` reads it for an entry still marked pending.
     * Undo takes the members' entries away with the batch, and redo brings back entries this
     * still answers for.
     */
    private readonly released = new Map<RunId, RunPainting>();

    /**
     * Runs that are not listed although their handle lives on: removed while still going, or
     * cancelled by an undo before they were recorded. Listed again once a run of theirs starts,
     * or a redo brings their entry back.
     */
    private readonly dropped = new Set<RunId>();

    /** The batches, which are not algorithm runs and therefore not in `list()`. */
    private readonly batches = new Set<ManagedRun<BatchResult>>();

    /** Where runs are dispatched and recorded. */
    private readonly dispatcher: Dispatcher;

    /** Set while a command dispatched as data makes its own handle inside the slot it holds. */
    private adopting = false;

    private disposed = false;

    /** Mints the token of every execution this session starts. */
    private readonly mintExecution: () => string;

    /**
     * Build the runs API.
     * @param options - The queue, the catalogue, the scope resolver and the thing that does the
     * work.
     */
    constructor(options: RunsApiOptions) {
        this.options = options;
        this.defaultScope = options.defaultScope ?? "visible";
        this.defaultCaveats = options.defaultCaveats ?? DEFAULT_CAVEATS;
        this.dispatcher =
            options.dispatcher ??
            new Dispatcher({ definitions: ALGO_DEFINITIONS, scheduler: runQueueScheduler(options.queue) });
        this.dispatcher.services.runs = this.service();
        // Undo, redo and restore take a finished run out of the project or put it back without
        // running anything: the run's watchers are told so, with the cause.
        this.dispatcher.lane.register("runs", (rendered, target, dirty) => {
            const cause = this.dispatcher.lane.passCause;

            for (const id of dirty) {
                const was = rendered.runs.get(id);
                const now = target.runs.get(id);
                const run = this.runs.get(id);

                if (was === now || run === undefined) {
                    continue;
                }

                if (now !== undefined) {
                    this.dropped.delete(id);
                    if (cause !== "command") {
                        // A later re-run dispatches the command of the execution history put back.
                        this.commands.set(id, now.command);
                    }
                } else if (was !== undefined && cause !== "command") {
                    // Its result went with it on undo, redo or a rollback: what read it reads
                    // again. A forward removal told them as it was written.
                    this.options.onRemoved?.(id);
                }

                if (cause !== "command") {
                    this.announce(run, now === undefined ? "removed" : "restored", cause);
                }
            }
        });
        this.mintExecution = createExecutionMinter(options.onExecution);
    }

    // -- starting -----------------------------------------------------------------------------

    /**
     * Start one algorithm, or hand back the run that already answers this question.
     * @param algorithm - Which algorithm to run.
     * @param params - Its parameters.
     * @param options - The scope, the seed, the id and the rest.
     * @returns The run, awaitable and watchable straight away.
     */
    start(algorithm: AlgorithmKey, params?: Readonly<Record<string, unknown>>, options: StartOptions = {}): Run {
        return this.startVia(this.dispatch, algorithm, params, options);
    }

    /**
     * Start one algorithm through a given dispatch.
     * @param via - Where the run's command is dispatched.
     * @param algorithm - Which algorithm to run.
     * @param params - Its parameters.
     * @param options - The scope, the seed, the id and the rest.
     * @returns The run.
     */
    startVia(
        via: DispatchFunction,
        algorithm: AlgorithmKey,
        params?: Readonly<Record<string, unknown>>,
        options: StartOptions = {},
    ): Run {
        return this.startRun(via, algorithm, params, options, undefined);
    }

    /**
     * Start several algorithms as one piece of work, with one progress stream and one cancel.
     *
     * The batch itself runs BESIDE the queue rather than in it. A batch that occupied the queue
     * would be waiting for members that cannot start until it finishes, which on a queue that runs
     * one operation at a time is a deadlock rather than a slow batch. Its members are one step:
     * one undo takes every member it recorded, and their layers, away together.
     * @param specs - What to run.
     * @param options - The batch's label, and the ordinary run options.
     * @returns A run over the batch, resolving to how each member turned out.
     */
    batch(specs: readonly RunSpec[], options: RunOptions & { readonly label?: string } = {}): Run<BatchResult> {
        this.refuseWhenDisposed();

        const label = options.label ?? "Batch";
        const identity: RunIdentity = {
            algorithm: "batch",
            params: { label, specs: specs.map((spec) => ({ ...spec })) },
            scope: this.defaultScope,
            seed: null,
            sample: null,
            exact: null,
        };
        const id = deriveRunId(identity);
        let run: ManagedRun<BatchResult> | null = null;
        const definition: RunDefinition<BatchResult> = {
            id,
            algorithm: "batch",
            params: identity.params,
            seed: null,
            exact: null,
            sample: null,
            timeBoxMs: null,
            style: false,
            shape: "fact",
            fields: [],
            engine: this.options.engine,
            caveats: this.defaultCaveats,
            execute: this.batchExecutor(
                specs,
                label,
                { code: "algo.batch", params: { label: options.label ?? null, count: specs.length } },
                () => run,
            ),
            publishOnCancel: true,
            ...(options.signal === undefined ? {} : { signal: options.signal }),
            ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
        };
        const surroundings: RunSurroundings = {
            label: () => label,
            queuePosition: () => null,
            stale: () => null,
            resolveScope: () => this.options.resolveScope(this.defaultScope),
            enqueue: (body) => enqueueBesideQueue(body, id),
            mintExecution: this.mintExecution,
            notify: (phase) => {
                if (run !== null) {
                    this.announce(run, phase);
                }
            },
        };
        run = new ManagedRun<BatchResult>(definition, surroundings);
        this.batches.add(run);
        run.start();

        return run;
    }

    /**
     * The finished run `start()` would hand back without computing, or undefined.
     * @param algorithm - Which algorithm.
     * @param params - Its parameters.
     * @param options - As `start()` takes them.
     * @returns The run, or undefined.
     */
    answered(
        algorithm: AlgorithmKey,
        params?: Readonly<Record<string, unknown>>,
        options: StartOptions = {},
    ): Run | undefined {
        const { identity, result, id } = this.resolve(algorithm, params, options);
        const existing = this.runs.get(id);

        if (
            existing === undefined ||
            !this.listed(existing) ||
            existing.status !== "succeeded" ||
            this.identities.get(id) !== result ||
            canonicalize(existing.params) !== canonicalize(identity.params) ||
            existing.seed !== identity.seed ||
            this.shouldReexecute(existing)
        ) {
            return undefined;
        }

        return existing;
    }

    // -- addressing ---------------------------------------------------------------------------

    /**
     * One run, by id.
     * @param id - The run id.
     * @returns The run, or undefined when this session holds none with that id.
     */
    get(id: RunId): Run | undefined {
        const run = this.runs.get(id);

        return run !== undefined && this.listed(run) ? run : undefined;
    }

    /**
     * Every algorithm run this session holds, finished or not.
     * @returns The runs, in the order they were started.
     */
    list(): readonly Run[] {
        return Object.freeze([...this.runs.values()].filter((run) => this.listed(run)));
    }

    /**
     * Which style layers read a run.
     *
     * Answered from the layers themselves -- a layer built from a run records the run in its own
     * `source` -- rather than from a register kept beside them, so the two cannot disagree. A run
     * whose suggested styling has not landed yet reports none, which is the truthful answer
     * rather than a promise about a layer that does not exist.
     * @param id - The run id.
     * @returns The layer ids, bottom of the stack first.
     */
    bindings(id: RunId): readonly LayerId[] {
        return Object.freeze([...(this.options.layers?.bindings(id) ?? [])]);
    }

    /**
     * What the element decided to paint when a run first completed.
     * @param id - The run id.
     * @returns The decision, or undefined when this session holds no run with that id.
     */
    painting(id: RunId): RunPainting | undefined {
        const run = this.get(id);

        if (run === undefined) {
            return undefined;
        }

        const entry = this.dispatcher.state.runs.get(id);

        if (entry === undefined) {
            return run.status === "failed" || run.status === "canceled" ? bare("not-succeeded") : PENDING;
        }

        if (entry.painting?.state === "pending") {
            return this.released.get(id) ?? entry.painting;
        }

        return entry.painting ?? (this.options.styling === undefined ? bare("no-styles") : UNKNOWN);
    }

    /**
     * Remove a run and every style layer reading it, as one step.
     *
     * The count and the ids come back so a consumer can say "Removes 1 style layer" BEFORE it asks
     * for confirmation. `bindings(id)` answers the same question without removing anything, which
     * is what a confirmation dialog should ask first.
     * @param id - The run id.
     * @returns What went with it.
     */
    remove(id: RunId): RunRemoval {
        const command: AlgoRemoveCommand = { op: "algo.remove", runId: id };
        const removal = this.removalOf(id);
        this.dispatcher.dispatchNow(command);

        return removal;
    }

    /**
     * Move every layer reading a run, as one block in its own order, to sit immediately below
     * `before` (`null` = the top), as one step.
     * @param id - The run id.
     * @param before - The layer to sit below, or null for the top of the stack.
     * @param options - How the move is dispatched.
     * @param options.signal - Withdraws the move.
     * @returns Settles once the block has moved; rejects with the refusal.
     */
    move(id: RunId, before: LayerId | null, options: { readonly signal?: AbortSignal } = {}): Promise<void> {
        const command: AlgoMoveCommand = { op: "algo.move", runId: id, before };

        return this.dispatcher.dispatch(command, options).then(() => undefined);
    }

    /**
     * Whether the element minted this run's id rather than the author naming it.
     * @param id - The run id.
     * @returns True when the element derived the id.
     */
    isDerivedId(id: RunId): boolean {
        return this.derivedIds.has(id);
    }

    heldOf(id: RunId): HeldCaptures {
        return this.runs.get(id)?.held ?? NO_HELD;
    }

    /**
     * The runs waiting to start, in queue order.
     * @returns One entry per waiting run, each carrying its position and the total.
     */
    get queue(): readonly QueueEntry[] {
        const waiting = this.waiting();

        return Object.freeze(waiting.map((run, index) => Object.freeze({ runId: run.id, index, of: waiting.length })));
    }

    /** Cancel everything still running and forget every run this session held. */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        for (const run of this.batches) {
            run.cancel("The session was disposed.");
        }

        for (const run of this.runs.values()) {
            run.cancel("The session was disposed.");
        }

        this.batches.clear();
        this.runs.clear();
        this.identities.clear();
        this.derivedIds.clear();
        this.names.clear();
        this.commands.clear();
        this.launches.clear();
        this.bodies.clear();
    }

    // -- building a run -----------------------------------------------------------------------

    /**
     * The session's own dispatch: a run that is its own step.
     * @param command - The command.
     * @param options - Its signal, and whether it starts beside the queue.
     * @returns Settles when the command does.
     */
    private readonly dispatch: DispatchFunction = (command, options) => this.dispatcher.dispatch(command, options);

    /**
     * Start one algorithm, or hand back the run that already answers this question.
     * @param via - Where the run's command is dispatched.
     * @param algorithm - Which algorithm to run.
     * @param params - Its parameters.
     * @param options - The scope, the seed, the id and the rest.
     * @param hold - The batch whose painting holds this run's.
     * @returns The run.
     */
    private startRun(
        via: DispatchFunction,
        algorithm: AlgorithmKey,
        params: Readonly<Record<string, unknown>> | undefined,
        options: StartOptions,
        hold: PaintHold | undefined,
    ): Run {
        this.refuseWhenDisposed();

        if (options.dryRun === true) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "runs.start does not answer dry runs. Ask session.plan for what a run would do and cost.",
                source: "run",
                details: { algorithm, reason: "dry-run" },
            });
        }

        if ("scopeAs" in options) {
            // Reserved (design/sets 10.1): "population" -- compute on the whole graph, keep and
            // re-rank the scope's values -- is built later; refusing it now keeps accepting it additive.
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message:
                    'The run option "scopeAs" is reserved and not accepted yet. A run computes over its scope as its algorithm declares.',
                source: "run",
                details: { algorithm, field: "scopeAs", reason: "reserved" },
            });
        }

        const { descriptor, identity, result, spelled, spec, id, derived, name } = this.resolve(
            algorithm,
            params,
            options,
        );
        // The scope as admitted: session edge ids made stable, so a re-run reads the same edges.
        const command = runCommand(algorithm, params, options, options.scope === undefined ? undefined : spec);
        const launch: Launch = { via, command, beside: options.queue === "now" };
        const existing = this.runs.get(id);

        if (hold === undefined) {
            this.holds.delete(id);
        } else {
            this.holds.set(id, hold);
        }

        if (existing !== undefined && (this.listed(existing) || this.identities.get(id) === result)) {
            if (this.identities.get(id) !== result && this.spellings.get(id) === spelled) {
                // The same question over a visible graph that moved (a filter, the time window):
                // the run answers it again under its id.
                this.identities.set(id, result);
            }

            if (!this.listed(existing) && !this.adopting) {
                this.restart(existing, options.style ?? true, command, derived);
            }

            return this.reuse(existing, identity, result, descriptor, launch);
        }

        if (name !== undefined) {
            this.names.set(id, name);
        }

        this.spellings.set(id, spelled);

        return this.create(id, identity, result, descriptor, { spec, options, derived }, launch);
    }

    /**
     * Make a removed run's handle answer a new start under its id (#3231): a removed run has no
     * first completion behind it, so its styling choice, its command and whether its id was
     * minted are the new start's, never the start before the removal. Without this, a project
     * opened in place over the session that ran it painted the run's suggested layer again,
     * which the file does not hold.
     * @param run - The removed run.
     * @param style - The new start's `style`.
     * @param command - The new start's command.
     * @param derived - Whether the element minted the id this time.
     */
    private restart(run: ManagedRun, style: RunStyle, command: AlgorithmRunCommand, derived: boolean): void {
        run.restyle(style);
        this.commands.set(run.id, withoutSuggested(command));
        this.groupStyles.delete(run.id);
        if (derived) {
            this.derivedIds.add(run.id);
        } else {
            this.derivedIds.delete(run.id);
            this.names.delete(run.id);
        }
    }

    /**
     * Check what the caller asked for and work out the run it names.
     * @param algorithm - Which algorithm to run.
     * @param params - Its parameters.
     * @param options - The scope, the seed, the id and the rest.
     * @returns The run's descriptor, identity, scope and id.
     */
    private resolve(
        algorithm: AlgorithmKey,
        params: Readonly<Record<string, unknown>> | undefined,
        options: StartOptions,
    ): ResolvedRun {
        const descriptor = this.descriptorFor(algorithm);
        this.checkParams(descriptor, params);

        const spec =
            options.scope === undefined
                ? this.defaultScope
                : (this.options.admitScope?.(options.scope) ?? (options.scope as Scope));
        const identity: RunIdentity = {
            algorithm: descriptor.key,
            params: canonicalizeParams(params, descriptor.options),
            scope: spec,
            seed: options.seed ?? null,
            sample: options.sample ?? null,
            exact: options.exact ?? null,
        };
        const result: ResultIdentity = {
            algorithm: identity.algorithm,
            scope: freezeScope(spec, (keyword) => this.options.liveScope?.(keyword) ?? null),
            sample: identity.sample,
            exact: identity.exact,
        };
        const canonical = canonicalResultIdentity(result);
        const spelled = canonicalResultIdentity({ ...result, scope: freezeScope(spec, () => null) });

        if (options.as !== undefined) {
            return {
                descriptor,
                identity,
                result: canonical,
                spelled,
                spec,
                id: assertRunId(options.as),
                derived: false,
            };
        }

        const name = suggestRunName(descriptor, identity.params);

        return {
            descriptor,
            identity,
            result: canonical,
            spelled,
            spec,
            id: this.mintId(name, canonical),
            derived: true,
            name,
        };
    }

    /**
     * The id an unnamed run answers to: the run already holding this result under this name, or
     * else the name itself, counting up from `_2` past every id something else holds.
     * @param name - The name the algorithm suggested.
     * @param result - The canonical identity of the result.
     * @returns The id.
     */
    private mintId(name: SuggestedName, result: string): RunId {
        for (const id of this.derivedIds) {
            if (this.identities.get(id) === result && this.names.get(id)?.id === name.id) {
                return id;
            }
        }

        for (let count = 1; ; count++) {
            const id = count === 1 ? name.id : `${name.id}_${count}`;

            if (!this.runs.has(id) && !this.dispatcher.state.runs.has(id)) {
                return id;
            }
        }
    }

    /**
     * Build, register and start a run that does not exist yet.
     * @param id - The id it will answer to.
     * @param identity - What the run is.
     * @param result - The canonical identity of the result it answers.
     * @param descriptor - The algorithm's catalogue entry.
     * @param request - How it was asked for.
     * @param request.spec - The scope specification it was asked for.
     * @param request.options - What the caller passed.
     * @param request.derived - Whether the element minted the id rather than the author naming it.
     * @param launch - How its first execution is dispatched.
     * @returns The run.
     */
    private create(
        id: RunId,
        identity: RunIdentity,
        result: string,
        descriptor: AlgorithmDescriptor,
        request: { readonly spec: Scope; readonly options: StartOptions; readonly derived: boolean },
        launch: Launch,
    ): Run {
        const { spec, options, derived } = request;
        if (options.queue === "replace") {
            this.cancelSiblings(descriptor.key, id);
        }

        const definition: RunDefinition = {
            id,
            algorithm: descriptor.key,
            params: identity.params,
            seed: identity.seed,
            exact: identity.exact,
            sample: identity.sample,
            timeBoxMs: options.timeBoxMs ?? null,
            style: options.style ?? true,
            shape: descriptor.shape,
            fields: descriptor.fields,
            engine: engineVersionsFor(descriptor.key, this.options.engine),
            caveats: this.caveatsFor(identity, descriptor),
            execute: this.options.execute,
            ...(options.signal === undefined ? {} : { signal: options.signal }),
            ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
        };
        const surroundings: RunSurroundings = {
            label: () => this.labelOf(id),
            distinguishedBy: () => this.names.get(id)?.distinguishedBy ?? null,
            siblingsDifferBy: () => this.siblingsDifferBy(id),
            queuePosition: () => this.queuePositionOf(id),
            stale: () => this.staleOf(id),
            resolveScope: () => refuseEmptySet(spec, this.options.resolveScope(spec)),
            ...(this.options.scopeFacts === undefined
                ? {}
                : { scopeFacts: () => this.options.scopeFacts?.(spec) ?? {} }),
            enqueue: (body) => this.launch(run, body),
            mintExecution: this.mintExecution,
            ...(this.options.captureHeld === undefined
                ? {}
                : { captureHeld: (prior: HeldCaptures) => this.options.captureHeld?.(id, prior) ?? prior }),
            notify: (phase) => {
                this.announce(run, phase);
            },
            entry: () => this.dispatcher.state.runs.get(id),
        };
        const run = new ManagedRun<RunResult>(definition, surroundings);

        this.runs.set(id, run);
        this.identities.set(id, result);
        this.commands.set(id, withoutSuggested(launch.command));
        this.launches.set(id, launch);

        if (derived) {
            this.derivedIds.add(id);
        } else {
            this.derivedIds.delete(id);
            this.names.delete(id);
        }

        run.start();

        return run;
    }

    /**
     * The caveats a run starts from.
     * @param identity - What the run is.
     * @param descriptor - The algorithm's catalogue entry.
     * @returns The caveats.
     */
    private caveatsFor(identity: RunIdentity, descriptor: AlgorithmDescriptor): Caveats {
        return Object.freeze({ ...this.defaultCaveats, seed: identity.seed, method: descriptor.technicalName });
    }

    /**
     * Hand back the run that already answers this result: re-run with the new parameters or seed
     * when they changed, else re-executed only if the data moved.
     * @param existing - The run this session already holds under that id.
     * @param identity - What the caller asked for.
     * @param result - The canonical identity of the result the caller asked for.
     * @param descriptor - The algorithm's catalogue entry.
     * @param launch - How a re-execution is dispatched.
     * @returns The existing run.
     * @throws A `GraphtyError` with code `E_DUPLICATE_ID` when the id names a different result.
     */
    private reuse(
        existing: ManagedRun,
        identity: RunIdentity,
        result: string,
        descriptor: AlgorithmDescriptor,
        launch: Launch,
    ): Run {
        if (this.identities.get(existing.id) !== result) {
            throw new GraphtyError({
                code: "E_DUPLICATE_ID",
                message:
                    `The run id "${existing.id}" already names a different computation. ` +
                    "Choose another id, or remove the run that holds it.",
                source: "run",
                target: { kind: "run", id: existing.id },
                details: { id: existing.id, held: existing.algorithm, wanted: identity.algorithm },
            });
        }

        if (canonicalize(existing.params) !== canonicalize(identity.params) || existing.seed !== identity.seed) {
            // The same result under other parameters: its re-execution is the new command.
            this.commands.set(existing.id, withoutSuggested(launch.command));
            this.launches.set(existing.id, launch);
            return existing.retune(identity.params, identity.seed, this.caveatsFor(identity, descriptor));
        }

        if (this.shouldReexecute(existing)) {
            this.launches.set(existing.id, launch);
            existing.rerun();
        } else if (
            (launch.command.applySuggestedStyles === true || launch.command.restoreLayer === true) &&
            !this.adopting
        ) {
            // Nothing to compute, but its layers were asked for: the command still goes through,
            // and applies them from the result the run already has, as one step.
            existing.settleAfter(launch.via(launch.command));
        }

        return existing;
    }

    /**
     * Whether starting this run again should re-execute it in place.
     *
     * Only when it has something to redo: work still queued or running is left alone, a finished
     * run is redone when the scope it ran over no longer resolves the same way, and a run that
     * failed, was cancelled or was removed is redone because it has no answer to give.
     * @param run - The run held under the requested id.
     * @returns True when it should run again.
     */
    private shouldReexecute(run: ManagedRun): boolean {
        if (!isTerminalRunStatus(run.status)) {
            return false;
        }

        if (run.status !== "succeeded") {
            return true;
        }

        return (
            this.options.resolveScope(run.scope.spec).digest !== run.record.scope.digest ||
            this.dataMoved(run) ||
            this.windowMoved(run)
        );
    }

    /**
     * Whether a run over the visible graph was computed in another time window than the one in
     * force now, and no `results: "keep"` move accepted it in this one.
     * @param run - The run.
     * @returns True when the window moved.
     */
    private windowMoved(run: ManagedRun): boolean {
        const ran = run.scopeWindow;
        if (ran === undefined || this.options.windowNow === undefined) {
            return false;
        }

        const now = this.options.windowNow();
        const key = now === null ? "" : windowKey(now);
        return (ran === null ? "" : windowKey(ran)) !== key && this.options.acceptedWindow?.(run.id) !== key;
    }

    /**
     * Whether the graph's data changed since a run recorded it.
     * @param run - The run.
     * @returns False when the run recorded no data digest, or the session gives none.
     */
    private dataMoved(run: ManagedRun): boolean {
        const recorded = run.dataDigest;

        return (
            recorded !== undefined && this.options.dataDigest !== undefined && this.options.dataDigest() !== recorded
        );
    }

    /**
     * Whether a run is one this session lists and hands out by id.
     * @param run - The run.
     * @returns False once it has been removed, or cancelled by an undo before it was recorded.
     */
    private listed(run: ManagedRun): boolean {
        return run.status !== "removed" && !this.dropped.has(run.id);
    }

    // -- executing ----------------------------------------------------------------------------

    /**
     * Hand one execution of a run to the dispatcher: its command is dispatched, and its work runs
     * when the command's turn comes.
     * @param run - The run.
     * @param body - The execution's work.
     * @returns A ticket that withdraws the command.
     */
    private launch(run: ManagedRun, body: RunBody): RunTicket {
        this.dropped.delete(run.id);
        this.bodies.set(run.id, body);

        if (this.adopting) {
            // The command is already executing and runs this body in the slot it holds.
            return { cancel: () => undefined };
        }

        // A re-run keeps its id: a command that names none would derive one from the scope as it
        // is now, which after a filter or a window move names another run, and this one would wait
        // in the queue for ever.
        const recorded = this.commands.get(run.id) ?? { op: "algo.run", algorithm: run.algorithm };
        const launch = this.launches.get(run.id) ?? {
            via: this.dispatch,
            command: this.pinnedTo(run.id, recorded),
            beside: false,
        };
        this.launches.delete(run.id);
        const controller = new AbortController();

        launch.via(launch.command, { signal: controller.signal, beside: launch.beside }).then(undefined, () => {
            // Refused before it ran (a transaction already aborted, a key it may not wait for):
            // the run is told, since nothing else will run it.
            if (this.bodies.get(run.id) === body) {
                this.bodies.delete(run.id);
                run.cancel(`Run "${run.id}" was not started.`);
            }
        });

        return {
            cancel: () => {
                controller.abort();
            },
        };
    }

    /**
     * A recorded command that still names its run: one that names no id derives it from the scope
     * as it is now, and is given the run's id when that derives another.
     * @param id - The run's id.
     * @param command - The command it was recorded with.
     * @returns The command to dispatch.
     */
    private pinnedTo(id: RunId, command: AlgorithmRunCommand): AlgorithmRunCommand {
        if (command.as !== undefined) {
            return command;
        }

        const { algorithm, params, ...options } = command;

        return this.resolve(algorithm, params, options).id === id ? command : { ...command, as: id };
    }

    /**
     * What the run ops call.
     * @returns The service the dispatcher reaches this API through.
     */
    private service(): RunService {
        return {
            run: (command, ctx) => this.execute(command, ctx),
            remove: (command, draft) => this.removeInto(command, draft),
            move: (command, draft) => {
                this.moveInto(command, draft);
            },
        };
    }

    /**
     * Carry out one `algo.run`: run the execution waiting for it -- or, for a command dispatched
     * as data, start one here -- and write the run into the command's step when it finishes.
     * @param command - The command.
     * @param ctx - The command's context.
     * @returns The run's id, once the run is written; rejects when it failed or was cancelled first.
     */
    private async execute(command: AlgorithmRunCommand, ctx: UndoableContext): Promise<RunId> {
        const run = this.adopt(command);
        const body = this.bodies.get(run.id);

        if (body === undefined) {
            // A run that already answers this command and did not need running again: only the
            // layers it was asked to apply are written.
            if (command.applySuggestedStyles === true && run.status === "succeeded") {
                this.applySuggested(ctx.draft, run);
            }

            if (command.restoreLayer === true && run.status === "succeeded") {
                this.restoreMissing(ctx.draft, run.id, this.dispatcher.state.runs.get(run.id)?.result);
            }

            return run.id;
        }

        this.bodies.delete(run.id);
        ctx.signal.addEventListener(
            "abort",
            () => {
                const reason = cancelReasonOf(ctx.signal.reason);

                // Cancelled by undo or redo before it was recorded: as if it had never been asked.
                if (reason === "undo" || reason === "redo") {
                    this.dropped.add(run.id);
                }

                run.cancel(`Run "${run.id}" was cancelled (${reason ?? "cancel"}).`);
            },
            { once: true },
        );
        const { token } = ctx.state.graph;
        let wrote = false;
        let written: () => void = () => undefined;
        const writing = new Promise<void>((resolve) => {
            written = resolve;
        });
        const finished = body(
            {
                signal: ctx.signal,
                progress: ctx.slot.progress ?? NO_QUEUE_PROGRESS,
                id: ctx.slot.id ?? `run:${run.id}`,
            },
            (finishedRun) => {
                this.commit(finishedRun, command, ctx, token);
                wrote = true;
                written();

                return ctx.done;
            },
        );

        await Promise.race([writing, finished]);

        if (!wrote) {
            throw run.error ?? new DOMException(`Run "${run.id}" stopped before it was recorded.`, "AbortError");
        }

        // The journal reads which run this command finished from what it resolves with.
        return run.id;
    }

    /**
     * The handle for a command about to run: the one that dispatched it, or, for a command
     * dispatched as data, the one starting it now makes.
     * @param command - The command.
     * @returns The handle.
     */
    private adopt(command: AlgorithmRunCommand): ManagedRun {
        const { algorithm, params, ...options } = command;
        const waiting = this.runs.get(this.resolve(algorithm, params, options).id);

        if (waiting !== undefined && this.bodies.has(waiting.id)) {
            return waiting;
        }

        this.adopting = true;
        try {
            return this.startRun(this.dispatch, algorithm, params, options, undefined) as ManagedRun;
        } finally {
            this.adopting = false;
        }
    }

    /**
     * Write a finished run into its command's step: its entry in the `runs` slice, the layers its
     * first completion paints, and the suggested layers it was asked to apply. Synchronous, so
     * nothing can come between the entry and its layers; a refusal part way reverts all of it.
     * @param run - The run, finished.
     * @param command - Its command.
     * @param ctx - The command's context.
     * @param token - The graph token when the command started, to tell whether the graph moved.
     */
    private commit(run: ManagedRun, command: AlgorithmRunCommand, ctx: UndoableContext, token: number): void {
        // Throws when the command no longer runs: a late value is never written.
        const { draft } = ctx;
        const prior = ctx.state.runs.get(run.id);
        const hold = this.holds.get(run.id);
        this.holds.delete(run.id);
        const decision = this.options.styling?.completed(run, prior?.painted === true, hold) ?? {
            painted: prior?.painted === true,
            paint: [],
            painting: bare("no-styles"),
        };

        if (decision.painting !== undefined) {
            // A fresh first completion: whatever an earlier batch decided for this id is gone.
            this.released.delete(run.id);
        }
        const entry: RunEntry = Object.freeze({
            command: this.commands.get(run.id) ?? command,
            record: run.record,
            result: run.computed as RunResult,
            ...(run.computedExecution === undefined ? {} : { execution: run.computedExecution }),
            ...(run.computedHeld.size === 0 ? {} : { held: run.computedHeld }),
            painted: decision.painted,
            // A re-run keeps the decision of its first completion.
            ...(prior?.painting === undefined ? {} : { painting: prior.painting }),
            derived: this.derivedIds.has(run.id),
            stale: ctx.state.graph.token !== token,
        });
        const revert = draft.checkpoint();

        try {
            draft.runs.set(run.id, entry);
            if (prior !== undefined) {
                this.realignGroups(draft, prior.result, entry.result);
                this.addNewGroupLayers(draft, entry.result, run.style);
            }
            const outcomes = this.paint(draft, run.id, decision.paint, { style: run.style, result: entry.result });

            if (decision.painting !== undefined) {
                // Written after the layers, which need the run's entry to bind to.
                const painting: RunPainting = Object.freeze({
                    state: decision.painting.state,
                    suggestions: Object.freeze([...decision.painting.suggestions, ...outcomes]),
                });
                draft.runs.set(run.id, Object.freeze({ ...entry, painting }));
            }

            if (command.applySuggestedStyles === true) {
                this.applySuggested(draft, run);
            }

            if (command.restoreLayer === true) {
                this.restoreMissing(draft, run.id, entry.result);
            }
        } catch (error) {
            revert();
            throw error;
        }
    }

    /**
     * Carry every layer's value-table entries, hidden values and rule conditions naming this run's
     * groups across its re-run: a partition's groups follow the group sharing most members, other
     * values match by name, and what matched nothing is reported on the layer as codes. Written
     * into the run's own step, so undoing the re-run undoes this too.
     * @param draft - The run's draft.
     * @param before - The result being replaced.
     * @param after - The result replacing it.
     */
    private realignGroups(draft: Draft, before: RunResult, after: RunResult): void {
        const root = `${RESULT_ROOT}.${after.runId}.`;
        // A run that publishes group sizes made its labels up; any other value is a name.
        const byOverlap = Array.isArray(after.graph.sizes);
        this.realignNames(draft, before, after, byOverlap);
        const { styles } = this.dispatcher.services;
        if (styles === undefined) {
            return;
        }

        const matches = new Map<string, GroupMatch>();

        for (const { layer } of draft.styles) {
            // An element-owned layer is never written, and reads no run's groups.
            if (layer.locked) {
                continue;
            }
            const half = layer.target === "edge" ? "edge" : "node";
            const matchOf = (path: string, named: boolean): GroupMatch | undefined => {
                // By name, a layer that names no value has nothing to carry or to report.
                if (!byOverlap && !named) {
                    return undefined;
                }
                const key = `${half}|${path}`;
                const known = matches.get(key);
                if (known !== undefined) {
                    return known;
                }
                const field = path.slice(root.length);
                const read =
                    (result: RunResult) =>
                    (id: NodeId): unknown =>
                        (half === "edge" ? result.edge(String(id)) : result.node(id))?.[field];
                const match = matchGroups<NodeId>(
                    new Set([...elementIdsOf(before, half), ...elementIdsOf(after, half)]),
                    read(before),
                    read(after),
                    byOverlap,
                );
                matches.set(key, match);
                return match;
            };
            const patch = realignPatch(layer, after.runId, root, matchOf);
            if (patch === null) {
                continue;
            }
            try {
                styles.execute({ op: "style.patch", action: "update", id: layer.id, patch }, draft);
            } catch (error) {
                // ponytail: a layer the reader locked keeps its entries as they were; carrying them
                // needs a style.patch that bypasses the reader's lock, add it if a locked layer
                // must follow its groups.
                if (!isGraphtyError(error) || error.code !== "E_LOCKED") {
                    throw error;
                }
            }
        }
    }

    /**
     * Carry the names given to a run's values (`data.setValueLabel`) across its re-run: a name
     * follows its group to the group sharing most members (on a merge, the larger overlap keeps
     * it), and the name of a group that matched none is dropped. Written into the run's own step.
     * @param draft - The run's draft.
     * @param before - The result being replaced.
     * @param after - The result replacing it.
     * @param byOverlap - Whether the run made its groups' labels up.
     */
    private realignNames(draft: Draft, before: RunResult, after: RunResult, byOverlap: boolean): void {
        const root = `${RESULT_ROOT}.${after.runId}.`;
        const named = [...this.dispatcher.state.valueLabels].map(([key, label]) => ({
            key,
            label,
            ...valueLabelOf(key),
        }));
        const moved: [string, string][] = [];
        const fields = new Set(named.filter(({ path }) => path.startsWith(root)).map(({ path }) => path));
        for (const path of fields) {
            const field = path.slice(root.length);
            const half = after.fields.find((candidate) => candidate.name === field)?.kind === "edge" ? "edge" : "node";
            const read =
                (result: RunResult) =>
                (id: NodeId): unknown =>
                    (half === "edge" ? result.edge(String(id)) : result.node(id))?.[field];
            const match = matchGroups<NodeId>(
                new Set([...elementIdsOf(before, half), ...elementIdsOf(after, half)]),
                read(before),
                read(after),
                byOverlap,
            );
            for (const { key, label, value } of named.filter((entry) => entry.path === path)) {
                draft.valueLabels.delete(key);
                const to = match.to.get(value);
                if (to !== undefined) {
                    moved.push([valueLabelKey(path, to), label]);
                }
            }
        }

        for (const [key, label] of moved) {
            draft.valueLabels.set(key, label);
        }
    }

    /**
     * Plan suggested layers into a draft. A refused one is reported and the rest still land.
     * @param draft - The draft.
     * @param runId - The run they come from.
     * @param suggestions - What to paint.
     * @param groups - The run's style option and result, for a run whose groups become layers.
     * @param groups.style - The style option.
     * @param groups.result - The result.
     * @returns What became of each.
     */
    private paint(
        draft: Draft,
        runId: RunId,
        suggestions: readonly StyleSuggestion[],
        groups?: { readonly style: RunStyle; readonly result: RunResult },
    ): SuggestionOutcome[] {
        const { styles } = this.dispatcher.services;

        if (styles === undefined) {
            return [];
        }

        return suggestions.map((suggestion) => {
            try {
                const outcome = styles.execute(suggestionCommand(suggestion, true), draft);
                const layered = groups === undefined ? null : this.groupLayers(draft, outcome, groups);
                if (layered !== null) {
                    return Object.freeze({ outcome: "added" as const, suggestion, layerIds: layered });
                }

                return addedOutcome(
                    suggestion,
                    outcome,
                    draft.styles.map((each) => each.layer),
                );
            } catch (error) {
                this.options.styling?.refused(runId, error);

                return refusedOutcome(suggestion, error);
            }
        });
    }

    /**
     * Turn the one layer a partition's colour suggestion added into a folder of one layer per group,
     * when the run was started with `style: { groups: "layers" }`: see {@link RunStyle}. Planned into
     * the same draft, so the run, the folder and its layers are one step.
     * @param draft - The run's draft.
     * @param outcome - What the colour suggestion's command resolved with.
     * @param groups - The run's style option and its result.
     * @param groups.style - The style option.
     * @param groups.result - The result.
     * @returns The group layers' ids, or null when this is not such a suggestion.
     */
    private groupLayers(
        draft: Draft,
        outcome: unknown,
        { style, result }: { readonly style: RunStyle; readonly result: RunResult },
    ): LayerId[] | null {
        const { styles } = this.dispatcher.services;
        const layer = (outcome as { result?: unknown } | null)?.result as Layer | undefined;
        const binding = layer?.encode?.["node.color"];
        if (
            typeof style !== "object" ||
            style.groups !== "layers" ||
            result.shape !== "community" ||
            styles?.previewColumn === undefined ||
            layer === undefined ||
            binding === undefined ||
            !("by" in binding)
        ) {
            return null;
        }

        this.groupStyles.set(result.runId, style);
        const field = binding.by.slice(`${RESULT_ROOT}.${result.runId}.`.length);
        const column = elementIdsOf(result, "node").map((id) => result.node(id)?.[field]);
        // Every group has a layer of its own, so none is folded into an "other" grey: the groups
        // past the palette's colours take colours of their own.
        const preview = groupsPreview(
            styles.previewColumn.bind(styles),
            { ...binding, ...preferredPalette(style.groupPalettes, column) },
            column,
        );
        const found = findRow(rowsOf(draft.styles), layer.id);
        const folder = styles.execute(
            {
                op: "style.patch",
                action: "addFolder",
                name: style.name ?? layer.name,
                at: { parent: found?.ancestors.at(-1)?.id ?? null, index: found?.index ?? 0 },
            },
            draft,
        ) as { result: { id: string } };
        styles.execute({ op: "style.patch", action: "remove", id: layer.id }, draft);

        // Largest first, each put at the bottom of the folder: the largest ends on top.
        const ids: LayerId[] = [];
        const values = preview.bins.filter((bin) => bin.value !== undefined && bin.count > 0);
        const into: GroupFolder = {
            folder: folder.result.id,
            from: layer,
            path: binding.by,
            groupName: style.groupName,
            taken: [],
        };
        for (const [at, bin] of values.entries()) {
            ids.push(this.addGroupLayer(draft, into, bin, at + 1));
        }

        return ids;
    }

    /**
     * Add one group's layer at the bottom of its folder.
     * @param draft - The draft.
     * @param into - The folder, and what every group layer in it shares.
     * @param bin - The group, as a preview of the run's colour binding counts and paints it.
     * @param bin.value - The group's value.
     * @param bin.count - How many nodes it holds.
     * @param bin.paints - The colour the run's layer paints it.
     * @param rank - Its place by size, 1 for the largest.
     * @returns The layer's id.
     */
    private addGroupLayer(
        draft: Draft,
        into: GroupFolder,
        bin: { readonly value?: unknown; readonly count: number; readonly paints: unknown },
        rank: number,
    ): LayerId {
        const { folder, from, path, groupName, taken } = into;
        const { styles } = this.dispatcher.services;
        const paints = bin.paints as { readonly hex?: string } | string | null;
        const color = typeof paints === "string" ? paints : paints?.hex;
        const value = categoryName(bin.value);
        const given = groupName?.({ value: bin.value, rank, size: bin.count, taken: [...taken] });
        const name = given ?? value;
        taken.push(name);
        if (given !== undefined) {
            // The group goes by its layer's name wherever its value is named (the legend, a
            // value list), and the name follows the group across a re-run.
            draft.valueLabels.set(valueLabelKey(path, value), given);
        }
        const added = styles?.execute(
            {
                op: "style.patch",
                action: "add",
                spec: {
                    name,
                    target: "node",
                    selector: {
                        match: "rule",
                        where: { kind: "categories", attribute: path, values: [value] },
                    },
                    ...(color === undefined ? {} : { set: { "node.color": color } }),
                    source: from.source,
                },
            },
            draft,
        ) as { result: Layer };
        styles?.execute(
            { op: "style.patch", action: "moveRow", id: added.result.id, to: { parent: folder, index: 0 } },
            draft,
        );
        return added.result.id;
    }

    /**
     * After a re-run, add a layer at the bottom of a run's group folder for each group no layer
     * there selects: see {@link RunStyle}'s `groups`.
     * @param draft - The run's draft.
     * @param result - The new result.
     * @param style - The run's style option.
     */
    private addNewGroupLayers(draft: Draft, result: RunResult, style: RunStyle): void {
        const { styles } = this.dispatcher.services;
        if (styles?.previewColumn === undefined) {
            return;
        }
        // A re-run started without the option still keeps its folder whole, named as it was.
        const groupName =
            (typeof style === "object" ? style.groupName : undefined) ?? this.groupStyles.get(result.runId)?.groupName;
        const path = `${RESULT_ROOT}.${result.runId}.group`;
        const groupValues = (layer: Layer): readonly string[] => {
            const where = layer.selector.match === "rule" ? layer.selector.where : undefined;
            return where?.kind === "categories" && where.attribute === path ? where.values : [];
        };
        const layers = draft.styles.map((entry) => entry.layer);
        const mine = layers.filter(
            (layer) =>
                layer.source.by === "run" && layer.source.runId === result.runId && groupValues(layer).length > 0,
        );
        const rows = rowsOf(draft.styles);
        const folder = mine.length === 0 ? undefined : findRow(rows, mine[0].id)?.ancestors.at(-1);
        if (folder === undefined) {
            return;
        }
        const held = new Set(mine.flatMap(groupValues));
        const names = layers
            .filter((layer) => findRow(rows, layer.id)?.ancestors.at(-1)?.id === folder.id)
            .map((layer) => layer.name);
        const used = new Set(mine.map((layer) => hexOf(layer.set?.["node.color"])));
        const column = elementIdsOf(result, "node").map((id) => result.node(id)?.group);
        const first = mine[0].encode?.["node.color"];
        const { bins } = groupsPreview(
            styles.previewColumn.bind(styles),
            { by: path, scale: "ordinal", ...(first !== undefined && "by" in first ? { palette: first.palette } : {}) },
            column,
        );
        // The run's palette by place among the groups, the colours no group layer holds yet first.
        const free = bins.map((bin) => bin.paints).filter((paints) => !used.has(hexOf(paints)));
        for (const [at, bin] of bins.entries()) {
            if (bin.value !== undefined && bin.count > 0 && !held.has(categoryName(bin.value))) {
                const paints = free.shift() ?? bin.paints;
                used.add(hexOf(paints));
                this.addGroupLayer(
                    draft,
                    { folder: folder.id, from: mine[0], path, groupName, taken: names },
                    { ...bin, paints },
                    at + 1,
                );
            }
        }
    }

    /**
     * The suggestions a run's first completion added that no layer reading the run paints now.
     * @param stack - The layers, as the draft or the session holds them.
     * @param painting - The run's first decision.
     * @param runId - The run.
     * @returns The missing suggestions, in the order they were made.
     */
    private missingOf(
        stack: readonly { readonly layer: Layer }[],
        painting: RunPainting | undefined,
        runId: RunId,
    ): StyleSuggestion[] {
        const painted = new Set(
            stack
                .filter(({ layer }) => layer.source.by === "run" && layer.source.runId === runId)
                .flatMap(({ layer }) => [...Object.keys(layer.encode ?? {}), ...Object.keys(layer.set ?? {})]),
        );

        return (painting?.suggestions ?? [])
            .filter((outcome) => outcome.outcome === "added")
            .map((outcome) => outcome.suggestion)
            .filter((suggestion) => !suggestion.channels.some((channel) => painted.has(channel)));
    }

    /**
     * Put back what {@link missingOf} finds, into the run's step, where the run's first completion
     * put it (beneath the reader's own layers when the project places runs there).
     * @param draft - The draft.
     * @param runId - The run.
     * @param result - The run's result, so a run whose groups were layers gets its folder back.
     */
    private restoreMissing(draft: Draft, runId: RunId, result?: RunResult): void {
        const { styles } = this.dispatcher.services;
        if (styles === undefined) {
            return;
        }

        const style = this.groupStyles.get(runId);
        for (const suggestion of this.missingOf(draft.styles, this.dispatcher.state.runs.get(runId)?.painting, runId)) {
            const outcome = styles.execute(suggestionCommand(suggestion, true), draft);
            // A run whose groups were layers gets its folder of groups back, not one layer.
            if (result !== undefined && style !== undefined) {
                this.groupLayers(draft, outcome, { style, result });
            }
        }
    }

    /**
     * Which of a run's layers the stack holds: see {@link RunsApi.layers}.
     * @param id - The run id.
     * @returns The layers, or undefined when this session holds no such run.
     */
    layers(id: RunId): RunLayers | undefined {
        if (this.get(id) === undefined) {
            return undefined;
        }

        const stack = this.dispatcher.state.styles;
        return Object.freeze({
            present: this.bindings(id),
            missing: Object.freeze(this.missingOf(stack, this.dispatcher.state.runs.get(id)?.painting, id)),
        });
    }

    /**
     * Apply what a run suggests and put its layers on top of the stack, in its own step: what
     * `runAlgorithm(..., { applySuggestedStyles: true })` asks for.
     * @param draft - The run's draft.
     * @param run - The run.
     */
    private applySuggested(draft: Draft, run: ManagedRun): void {
        const { styles } = this.dispatcher.services;

        if (styles === undefined) {
            return;
        }

        for (const suggestion of run.suggestEncodings()) {
            styles.execute(suggestionCommand(suggestion), draft);
        }

        const stack = draft.styles;
        const bound = stack
            .filter((entry) => entry.layer.source.by === "run" && entry.layer.source.runId === run.id)
            .map((entry) => entry.layer.id);
        const top = stack.slice(stack.length - bound.length).map((entry) => entry.layer.id);

        if (!top.every((id, at) => id === bound[at])) {
            for (const id of bound) {
                styles.execute({ op: "style.patch", action: "move", id, before: null }, draft);
            }
        }
    }

    /**
     * Carry out one `algo.remove`: stop the run if it is still going, and take its entry and the
     * layers bound to it out of the project through the command's draft.
     * @param command - The removal.
     * @param draft - The command's draft.
     * @returns What went with it.
     */
    private removeInto(command: AlgoRemoveCommand, draft: Draft): RunRemoval {
        const { runId: id } = command;
        const removal = this.removalOf(id);
        const { layerIds } = removal;
        const run = this.runs.get(id);

        if (run?.cancellable) {
            this.dropped.add(id);
            run.cancel(`Run "${id}" was removed.`);
        }

        if (this.dispatcher.state.runs.has(id)) {
            draft.runs.delete(id);
            // Its result went with it: what read it reads again, now, as a forward write is told.
            this.options.onRemoved?.(id);
        }

        if (layerIds.length > 0) {
            const { styles } = this.dispatcher.services;

            if (styles === undefined) {
                this.options.layers?.remove?.(layerIds);
            } else {
                // A folder that held only this run's layers (its groups, see RunStyle) goes with them.
                const folders = new Set(
                    layerIds.flatMap((layerId) => findRow(rowsOf(draft.styles), layerId)?.ancestors.at(-1)?.id ?? []),
                );
                styles.execute({ op: "style.patch", action: "removeBySource", ids: layerIds }, draft);
                for (const folder of folders) {
                    const left = findRow(rowsOf(draft.styles), folder);
                    if (left !== undefined && (left.row.children ?? []).length === 0) {
                        styles.execute({ op: "style.patch", action: "deleteRow", id: folder }, draft);
                    }
                }
            }
        }

        return removal;
    }

    /**
     * Carry out one `algo.move`: refuse what `styles.move` would refuse, then move the run's
     * layers bottom first, each to sit below `before`, so each lands above the one moved before
     * it and the block keeps its order.
     * @param command - The move.
     * @param draft - The command's draft.
     */
    private moveInto(command: AlgoMoveCommand, draft: Draft): void {
        const { runId: id, before } = command;
        const block = draft.styles
            .filter((entry) => entry.layer.source.by === "run" && entry.layer.source.runId === id)
            .map((entry) => entry.layer.id);
        const target = before === null ? undefined : draft.styles.find((entry) => entry.layer.id === before)?.layer;

        if (this.get(id) === undefined && !this.dispatcher.state.runs.has(id)) {
            throw new GraphtyError({
                code: "E_UNKNOWN_RUN",
                message: `This session holds no run "${id}".`,
                source: "run",
                details: { runId: id },
            });
        }

        if (before !== null && target === undefined) {
            throw new GraphtyError({
                code: "E_UNKNOWN_LAYER",
                message: `No layer "${before}" is in the stack.`,
                source: "style",
                target: { kind: "layer", id: before },
                details: { id: before },
            });
        }

        if (target?.locked === true) {
            throw new GraphtyError({
                code: "E_PROTECTED",
                message: `"${target.name}" is the element's own layer, and nothing moves beneath it.`,
                source: "style",
                target: { kind: "layer", id: target.id },
                details: { id: target.id },
            });
        }

        if (before !== null && block.includes(before)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `Layer "${before}" reads run "${id}", so the run cannot move below it.`,
                source: "style",
                details: { runId: id, before },
            });
        }

        const { styles } = this.dispatcher.services;

        for (const layer of block) {
            styles?.execute({ op: "style.patch", action: "move", id: layer, before }, draft);
        }
    }

    /**
     * What removing a run takes with it.
     * @param id - The run id.
     * @returns The layers bound to it.
     */
    private removalOf(id: RunId): RunRemoval {
        const layerIds = Object.freeze([...(this.options.layers?.bindings(id) ?? [])]);

        return Object.freeze({ removedLayers: layerIds.length, layerIds });
    }

    // -- the queue ----------------------------------------------------------------------------

    /**
     * The runs still waiting their turn, in the order they were started.
     * @returns The waiting runs.
     */
    private waiting(): ManagedRun[] {
        return [...this.runs.values()].filter((run) => run.status === "queued" && this.listed(run));
    }

    /**
     * Where one run sits among the runs still waiting.
     * @param id - The run id.
     * @returns The position counting from 0, or null when it is not waiting.
     */
    private queuePositionOf(id: RunId): number | null {
        const index = this.waiting().findIndex((run) => run.id === id);

        return index === -1 ? null : index;
    }

    /**
     * Cancel every other run of one algorithm, which is what the "replace" queue policy means.
     * @param algorithm - The algorithm whose runs make each other obsolete.
     * @param keep - The run that is replacing them.
     */
    private cancelSiblings(algorithm: AlgorithmKey, keep: RunId): void {
        for (const run of this.runs.values()) {
            if (run.algorithm === algorithm && run.id !== keep && run.cancellable) {
                run.cancel(`Replaced by a newer "${algorithm}" run.`);
            }
        }
    }

    // -- derived facts ------------------------------------------------------------------------

    /**
     * Why one run's numbers no longer describe what is on screen.
     * @param id - The run id.
     * @returns The note, or null when they still do.
     */
    private staleOf(id: RunId): StaleNote | null {
        const run = this.runs.get(id);

        if (run === undefined) {
            return null;
        }

        const dataChanged = this.dataMoved(run);
        const windowMoved = !dataChanged && this.windowMoved(run);
        let nowVisible: number;
        try {
            const current = this.options.resolveScope(run.scope.spec);
            if (
                !dataChanged &&
                !windowMoved &&
                (current.digest === run.scope.digest ||
                    current.digest === this.options.acceptedDigest?.(id, run.scope.digest))
            ) {
                return null;
            }

            nowVisible = current.nodeCount;
        } catch (error) {
            // A scope that no longer resolves (its set was removed) holds nothing now; reading a
            // run's record must never throw.
            if (!isGraphtyError(error)) {
                throw error;
            }

            nowVisible = 0;
        }

        const ran = windowMoved ? run.scopeWindow : undefined;
        let reason: StaleNote["reason"] = windowMoved ? "window-moved" : "scope-changed";
        if (dataChanged) {
            reason = "data-changed";
        }

        return Object.freeze({
            reason,
            ranOn: run.scope.nodeCount,
            nowVisible,
            scopeSpec: run.scope.spec,
            ...(ran === undefined || ran === null
                ? {}
                : {
                      window: Object.freeze({
                          code: "window-moved" as const,
                          params: Object.freeze({ from: ran.from, to: ran.to, nodes: ran.nodes, edges: ran.edges }),
                      }),
                  }),
        });
    }

    /**
     * What to call one run.
     *
     * The algorithm's plain name while it is the only run of that algorithm, gaining whatever
     * tells it apart from its siblings the moment one exists. Computed here rather than by the
     * consumer, so the layer row, the legend, the journal and every export say the same thing.
     * @param id - The run id.
     * @returns The label.
     */
    private labelOf(id: RunId): string {
        const run = this.runs.get(id);

        if (run === undefined) {
            return id;
        }

        const base = this.baseLabelOf(run);
        const differing = this.siblingsDifferBy(id);

        if (differing === null) {
            return base;
        }

        const qualifier =
            differing.length === 0
                ? describeScope(run.scope.spec, this.options.setName)
                : differing.map((name) => `${name} ${formatParamValue(run.params[name])}`).join(", ");

        return `${base} (${qualifier})`;
    }

    /**
     * What a run is called before any sibling shares the name: what its algorithm suggested, or
     * the algorithm's plain name.
     * @param run - The run.
     * @returns The label.
     */
    private baseLabelOf(run: ManagedRun): string {
        return this.names.get(run.id)?.label ?? this.findDescriptor(run.algorithm)?.plainName ?? run.algorithm;
    }

    /**
     * What tells one run apart from the other listed runs of its algorithm that go by the same
     * name: the parameters that differ, or failing that the scope it ran over.
     * @param id - The run id.
     * @returns The differing parameter names, sorted; an empty list when only the scope differs;
     *   null while no other run shares the name.
     */
    private siblingsDifferBy(id: RunId): readonly string[] | null {
        const run = this.runs.get(id);

        if (run === undefined) {
            return null;
        }

        const base = this.baseLabelOf(run);
        const siblings = [...this.runs.values()].filter(
            (other) =>
                other.algorithm === run.algorithm &&
                other.id !== id &&
                this.listed(other) &&
                this.baseLabelOf(other) === base,
        );

        if (siblings.length === 0) {
            return null;
        }

        const differing = new Set<string>();

        for (const sibling of siblings) {
            for (const name of new Set([...Object.keys(run.params), ...Object.keys(sibling.params)])) {
                if (canonicalize(run.params[name]) !== canonicalize(sibling.params[name])) {
                    differing.add(name);
                }
            }
        }

        return Object.freeze([...differing].sort((left, right) => (left < right ? -1 : 1)));
    }

    // -- the catalogue ------------------------------------------------------------------------

    /**
     * One algorithm's catalogue entry.
     * @param algorithm - The algorithm key.
     * @returns The descriptor, or undefined when nothing registers that key.
     */
    private findDescriptor(algorithm: AlgorithmKey): AlgorithmDescriptor | undefined {
        return this.options.catalog.algorithms().find((candidate) => candidate.key === algorithm);
    }

    /**
     * One algorithm's catalogue entry, insisting that it exists.
     * @param algorithm - The algorithm key.
     * @returns The descriptor.
     * @throws A `GraphtyError` with code `E_UNSUPPORTED` for a deprecated built-in name the
     *   element reserves but does not run, or `E_UNKNOWN_ALGORITHM` when nothing registers that key.
     */
    private descriptorFor(algorithm: AlgorithmKey): AlgorithmDescriptor {
        if (isDeprecatedAlgorithm(algorithm)) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: `The "${algorithm}" algorithm is not implemented. The name is deprecated and will be removed at the next major release unless it is implemented first.`,
                source: "run",
                details: { algorithm, reason: "deprecated" },
            });
        }

        const descriptor = this.findDescriptor(algorithm);

        if (descriptor === undefined) {
            throw new GraphtyError({
                code: "E_UNKNOWN_ALGORITHM",
                message: `No algorithm is registered under "${algorithm}".`,
                source: "run",
                details: {
                    algorithm,
                    available: this.options.catalog.algorithms().map((candidate) => candidate.key),
                },
            });
        }

        return descriptor;
    }

    /**
     * Check the caller's parameters against what the algorithm declares it accepts.
     * @param descriptor - The algorithm's catalogue entry.
     * @param params - What the caller passed.
     * @throws A `GraphtyError` with code `E_UNKNOWN_OPTION` or `E_OPTION_RANGE`.
     */
    private checkParams(descriptor: AlgorithmDescriptor, params: Readonly<Record<string, unknown>> | undefined): void {
        if (params === undefined) {
            return;
        }

        for (const [name, value] of Object.entries(params)) {
            if (value === undefined) {
                continue;
            }

            const option = descriptor.options.find((candidate) => candidate.name === name);

            if (option === undefined) {
                throw new GraphtyError({
                    code: "E_UNKNOWN_OPTION",
                    message: `"${name}" is not an option the "${descriptor.key}" algorithm accepts.`,
                    source: "run",
                    details: {
                        algorithm: descriptor.key,
                        option: name,
                        available: descriptor.options.map((candidate) => candidate.name),
                    },
                });
            }

            checkOptionValue(descriptor.key, option, value);
        }
    }

    // -- batches ------------------------------------------------------------------------------

    /**
     * The work a batch does: start each member in turn, on one progress stream and one cancel, as
     * one transaction, so its members and their layers are one step.
     * @param specs - What to run.
     * @param label - What the batch is called.
     * @param fact - What its step did.
     * @param handle - The batch's own run, once it exists.
     * @returns The executor.
     */
    private batchExecutor(
        specs: readonly RunSpec[],
        label: string,
        fact: CodedFact<HistoryCode>,
        handle: () => ManagedRun<BatchResult> | null,
    ): RunExecutor<BatchResult> {
        return async (context) => {
            const steps: BatchStep[] = [];
            let completed = 0;

            const members = async (via: DispatchFunction, stopped: AbortSignal): Promise<void> => {
                // Held for the whole batch, so a sweep of six node metrics paints ONCE rather than
                // adding six colour layers with five of them invisible under the sixth. Released
                // whatever stopped the batch: a cancelled sweep still keeps the members that
                // finished, and their picture is part of what was kept.
                const hold = this.options.styling?.hold();

                for (let index = 0; index < specs.length; index++) {
                    const spec = specs[index];

                    if (context.signal.aborted || stopped.aborted) {
                        steps.push({
                            index,
                            ok: false,
                            reason: "The batch was stopped before this member started.",
                        });
                        continue;
                    }

                    context.report({
                        phase: "running",
                        completed: index,
                        total: specs.length,
                        message: `Running ${spec.algorithm}`,
                    });

                    const step = await this.runBatchMember(context.signal, spec, index, via, hold);
                    steps.push(step);

                    if (step.ok) {
                        completed += 1;
                    }
                }

                if (hold !== undefined) {
                    await this.release(hold, via);
                }
            };

            try {
                await this.dispatcher.transaction(
                    label,
                    async (tx, signal) => {
                        // Undo cancelling the batch aborts the transaction; the batch stops with it
                        // and settles with what it had, which the undo has already taken back.
                        signal.addEventListener(
                            "abort",
                            () => {
                                handle()?.cancel("The batch was undone.");
                            },
                            { once: true },
                        );
                        await members((command, options) => tx.dispatch(command, options), signal);
                    },
                    { fact },
                );
            } catch (error) {
                if (!(error instanceof Error && error.name === "AbortError")) {
                    throw error;
                }
            }

            const partial = completed < specs.length;

            return {
                result: Object.freeze({ label, total: specs.length, completed, partial, steps: Object.freeze(steps) }),
                partial,
                ...(partial
                    ? {
                          partialCause: {
                              code: "partial.batch-incomplete" as const,
                              params: { completed, total: specs.length },
                          },
                      }
                    : {}),
            };
        };
    }

    /**
     * Paint what a batch held, and record for each member what became of its suggestions.
     * @param hold - The batch's hold.
     * @param via - The batch's transaction.
     */
    private async release(hold: PaintHold, via: DispatchFunction): Promise<void> {
        const { paint, settled, members } = hold.release();
        const outcomes = new Map<RunId, SuggestionOutcome[]>(members.map((id) => [id, []]));
        const record = (outcome: SuggestionOutcome): void => {
            outcomes.get(idOf(outcome.suggestion.spec.run))?.push(outcome);
        };

        settled.forEach(record);

        for (const suggestion of paint) {
            const runId = idOf(suggestion.spec.run);

            try {
                const outcome = await via(suggestionCommand(suggestion, true));
                record(
                    addedOutcome(
                        suggestion,
                        outcome,
                        this.dispatcher.state.styles.map((each) => each.layer),
                    ),
                );
            } catch (error) {
                this.options.styling?.refused(runId, error);
                record(refusedOutcome(suggestion, error));
            }
        }

        for (const [id, suggestions] of outcomes) {
            this.released.set(id, Object.freeze({ state: "decided", suggestions: Object.freeze(suggestions) }));
        }
    }

    /**
     * Run one member of a batch, keeping its failure to itself.
     *
     * A member that fails does not take the batch down: the batch reports how each member turned
     * out and the members that finished keep their results, because throwing away work somebody
     * paid for is not the element's decision to make.
     * @param signal - The batch's signal, which cancels the member that is in flight.
     * @param spec - What to run.
     * @param index - Its place in the specification list.
     * @param via - The batch's transaction.
     * @param hold - The batch's painting hold.
     * @returns How it turned out.
     */
    private async runBatchMember(
        signal: AbortSignal,
        spec: RunSpec,
        index: number,
        via: DispatchFunction,
        hold: PaintHold | undefined,
    ): Promise<BatchStep> {
        let member: Run;

        try {
            member = this.startRun(
                via,
                spec.algorithm,
                spec.params,
                {
                    ...(spec.scope === undefined ? {} : { scope: spec.scope }),
                    ...(spec.seed === undefined ? {} : { seed: spec.seed }),
                    ...(spec.as === undefined ? {} : { as: spec.as }),
                    ...(spec.style === undefined ? {} : { style: spec.style }),
                },
                hold,
            );
        } catch (error) {
            return { index, ok: false, reason: error instanceof Error ? error.message : String(error) };
        }

        const stopMember = (): void => {
            member.cancel("The batch was canceled.");
        };

        signal.addEventListener("abort", stopMember, { once: true });

        try {
            await member;

            return { index, runId: member.id, ok: true };
        } catch (error) {
            return { index, runId: member.id, ok: false, reason: batchStepReason(error) };
        } finally {
            signal.removeEventListener("abort", stopMember);
        }
    }

    /**
     * Tell the session's observer that one run reached a watched moment.
     *
     * A throwing observer is contained here rather than allowed to reach the run: a status bar
     * that fails to render must not turn a successful computation into a failed one.
     * @param run - The run.
     * @param phase - Which moment it reached.
     * @param cause - What moved it.
     */
    private announce(
        run: ManagedRun | ManagedRun<BatchResult>,
        phase: RunPhase,
        cause: RunChange["cause"] = "command",
    ): void {
        const { onChange } = this.options;

        if (onChange === undefined) {
            return;
        }

        try {
            onChange(Object.freeze({ run: run.record, phase, cause, generation: run.generation }));
        } catch {
            // A watcher's failure is the watcher's. The run carries on.
        }
    }

    /**
     * Refuse work on a session that has been torn down.
     * @throws A `GraphtyError` with code `E_DISPOSED`.
     */
    private refuseWhenDisposed(): void {
        if (this.disposed) {
            throw new GraphtyError({
                code: "E_DISPOSED",
                message: "This session's runs have been disposed and accept no further work.",
                source: "run",
                details: { disposed: "runs" },
            });
        }
    }
}

/**
 * Why one batch member did not finish, in a sentence its row can show.
 * @param error - What the member threw.
 * @returns The reason.
 */
function batchStepReason(error: unknown): string {
    if (isAbortLike(error)) {
        return "The batch was canceled.";
    }

    return error instanceof Error ? error.message : String(error);
}

/**
 * Run work beside the queue rather than in it.
 *
 * Used by the "now" queue policy, and by every batch: a batch that occupied a sequential queue
 * would be waiting for members that cannot start until it finishes.
 * @param body - The work.
 * @param id - The run id, so the pseudo-operation has a name in a stack trace.
 * @returns A ticket that aborts the work.
 */
function enqueueBesideQueue(body: RunBody, id: RunId): RunTicket {
    const controller = new AbortController();

    void body({ signal: controller.signal, progress: NO_QUEUE_PROGRESS, id: `beside:${id}` });

    return {
        cancel: () => {
            controller.abort(new DOMException(`Run "${id}" was canceled.`, "AbortError"));
        },
    };
}

/**
 * Build the runs API over an existing operation queue.
 * @param options - The queue, the catalogue, the scope resolver and the thing that does the work.
 * @returns The runs API, plus the teardown a session needs.
 */
export function createRunsApi(options: RunsApiOptions): SessionRunsApi {
    return new Runs(options);
}

/**
 * Refuse a run over a set that holds no nodes: there is nothing to compute, and a result over
 * nothing reads as a finding. The whole graph and the visible graph are not sets a caller chose,
 * so an empty graph, or a filter that hides everything, is not refused here.
 * @param spec - The scope the run names.
 * @param scope - What it resolves to now.
 * @returns The resolution, when it holds a node.
 * @throws `E_SCOPE_EMPTY`, targeting the set when the scope names a kept one.
 */
function refuseEmptySet(spec: Scope, scope: ResolvedScope): ResolvedScope {
    if (scope.nodeCount > 0 || spec === "graph" || spec === "visible") {
        return scope;
    }

    const id = typeof spec === "object" && "set" in spec ? spec.set : undefined;
    throw new GraphtyError({
        code: "E_SCOPE_EMPTY",
        message: "The run's scope holds no nodes, so there is nothing to compute over. Choose a scope with members.",
        source: "run",
        ...(id === undefined ? {} : { target: { kind: "scope" as const, id } }),
        details: { scope: spec },
    });
}
