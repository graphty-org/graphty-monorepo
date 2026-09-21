/**
 * @file Look before you leap: what one command would do, and what it would cost.
 *
 * Two doors, and the difference between them is not a detail. `estimate` is SYNCHRONOUS and
 * returns the cost half alone, because a user interface has to decide how a button behaves before
 * the click happens -- under a couple of seconds it simply runs, past that it warns, past a higher
 * limit it asks -- and a promise cannot gate a click. `plan` answers the fuller question: whether
 * the command would be allowed at all, what it would write, and what would qualify the numbers.
 *
 * Both belong to the element rather than to whoever is calling it. The evidence is on the record:
 * the one consumer carries a 449-line model of this package's own performance, and its own history
 * says that model was wrong by 6.9x at 200,000 nodes -- a graph it estimated at 2.10 seconds locked
 * the frame for 10.4. No consumer should be able to compute a better estimate than the element can,
 * because the element is the only party that knows what its own work costs and can time it.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { AlgorithmDescriptor, AlgorithmKey, FieldDescriptor, RunId, Scope } from "../catalog/types";
import type { GraphtyErrorCode } from "../errors";
import {
    type CostEstimate,
    type CostGateLimits,
    type CostInput,
    type CostMeasurement,
    estimateCost,
    gateRun,
    type MachineCalibration,
} from "./cost";
import type { Caveats, ResolvedScope } from "./runs";
import type { GraphStatistics } from "./types";

// ---------------------------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------------------------

/**
 * Start one algorithm, as data.
 *
 * Every verb on a session is meant to be expressible as one of these, so that "do this" and
 * "record that you did this" are the same artifact -- what a recipe replays, what a journal
 * stores, what an agent's tool call carries. One verb is expressible today, and the union below
 * has one member rather than a placeholder: a command that does not exist is discovered by
 * autocomplete finding nothing, which costs a consumer one keystroke, where a stub that compiles
 * and then throws costs them an afternoon.
 */
export interface AlgorithmRunCommand {
    /** Which verb this is. */
    readonly op: "algo.run";
    /** Which algorithm to run. */
    readonly algorithm: AlgorithmKey;
    /** Its parameters. */
    readonly params?: Readonly<Record<string, unknown>>;
    /** What it may look at. Defaults to the visible graph. */
    readonly scope?: Scope;
    /** The seed for a randomised or sampled method. */
    readonly seed?: number;
    /** Ask for the approximate method at a chosen sample size. */
    readonly sample?: number;
    /** Refuse to approximate: above the cost cap this fails rather than sampling. */
    readonly exact?: boolean;
    /** The id to give the run. Required for anything that will be saved. */
    readonly as?: RunId;
}

/** Everything a session can be asked to do, as data. */
export type SessionCommand = AlgorithmRunCommand;

/**
 * Tell whether a value is the command that starts an algorithm.
 * @param value - The value to test.
 * @returns True when it is an `algo.run` command.
 */
export function isAlgorithmRunCommand(value: unknown): value is AlgorithmRunCommand {
    return typeof value === "object" && value !== null && (value as { op?: unknown }).op === "algo.run";
}

// ---------------------------------------------------------------------------------------------
// What a plan says
// ---------------------------------------------------------------------------------------------

/**
 * What a command would change, in the shape that command's own preview takes.
 *
 * The whole union is declared rather than only the members a command produces today, because a
 * consumer switching on `effect.kind` must be able to write the switch once and have it stay
 * valid as commands arrive. An algorithm run produces `write`; a command that previews nothing
 * produces `none`.
 */
export type PlanEffect =
    | {
          /** How many elements a selector, filter or search would match. */
          readonly kind: "match";
          /** The nodes it would match. */
          readonly nodes: number;
          /** The edges it would match. */
          readonly edges: number;
          /** Whether the counts were counted or estimated. */
          readonly exact: boolean;
          /** How many elements were sampled, when they were estimated. */
          readonly sampled?: number;
      }
    | {
          /** What a change to the graph would add, remove and alter. */
          readonly kind: "mutate";
          /** Nodes it would add. */
          readonly nodesAdded: number;
          /** Nodes it would remove. */
          readonly nodesRemoved: number;
          /** Edges it would add. */
          readonly edgesAdded: number;
          /** Edges it would remove. */
          readonly edgesRemoved: number;
          /** Attribute values it would change. */
          readonly attributesChanged: number;
          /** The same counts broken down by record type, when the command knows them. */
          readonly byType?: Readonly<Record<string, number>>;
      }
    | {
          /** The fields a run would publish. */
          readonly kind: "write";
          /** The fields. */
          readonly fields: readonly FieldDescriptor[];
      }
    | {
          /** How large an export would be. */
          readonly kind: "bytes";
          /** The byte count. */
          readonly bytes: number;
          /** How many elements it would carry. */
          readonly elements: number;
          /** Whether the counts were counted or estimated. */
          readonly exact: boolean;
      }
    | {
          /** What an image export would contain. */
          readonly kind: "image";
          /** Its width in pixels. */
          readonly width: number;
          /** Its height in pixels. */
          readonly height: number;
          /** How many nodes would be in the frame. */
          readonly nodesInFrame: number;
          /** How many channels the legend would carry. */
          readonly legendChannels: number;
          /** Its size in bytes. */
          readonly bytes: number;
      }
    | {
          /** Nothing to preview. */
          readonly kind: "none";
      };

/** Why a command would not be allowed to run. */
export interface PlanBlock {
    /** The code a consumer switches on. */
    readonly code: GraphtyErrorCode;
    /** A sentence a person can read. */
    readonly reason: string;
}

/** What one command would do, and what it would cost. */
export interface Plan {
    /** Whether the command would be allowed to run as asked. */
    readonly ok: boolean;
    /** Why it would not, when it would not. */
    readonly blocked?: PlanBlock;
    /** What it would cost. */
    readonly cost: CostEstimate;
    /** What it would change. */
    readonly effect: PlanEffect;
    /** What would qualify its numbers, including any approximation the gate would choose. */
    readonly caveats: Caveats;
}

// ---------------------------------------------------------------------------------------------
// What planning reads
// ---------------------------------------------------------------------------------------------

/** Everything `estimate` and `plan` read, each of it something the session already maintains. */
export interface PlanningContext {
    /**
     * Every algorithm the element can run.
     * @returns The descriptors.
     */
    algorithms(): readonly AlgorithmDescriptor[];
    /**
     * The graph's shape, which the session maintains incrementally.
     * @returns The statistics.
     */
    statistics(): GraphStatistics;
    /**
     * Resolve a scope specification against the graph as it stands.
     * @param spec - What was asked for.
     * @returns What it resolves to now.
     * @throws A `GraphtyError` when the element cannot narrow to that scope yet.
     */
    resolveScope(spec: Scope): ResolvedScope;
    /** The scope a command that names none would run over. */
    readonly defaultScope: Scope;
    /** The cap and the memory budget the gate compares against. */
    readonly limits: Readonly<CostGateLimits>;
    /** The caveats a run starts from, before the work refines them. */
    readonly defaultCaveats: Caveats;
    /**
     * Whether an accelerator is attached, for an algorithm that declares it needs one.
     * @returns True when one is attached.
     */
    acceleratorAvailable(): boolean;
    /** Reads this machine's measured throughput, when it has been measured. */
    readonly calibration?: () => MachineCalibration | undefined;
    /** Reads the most recent timing of each algorithm on this machine. */
    readonly measurements?: () => ReadonlyMap<AlgorithmKey, CostMeasurement> | undefined;
}

// ---------------------------------------------------------------------------------------------
// Estimating
// ---------------------------------------------------------------------------------------------

/**
 * Build the cost model's inputs from a command and the session's own maintained facts.
 * @param context - What planning reads.
 * @param command - The command.
 * @param descriptor - The algorithm's catalogue entry, when it has one.
 * @returns The inputs, or the reason the scope could not be resolved.
 */
function costInput(
    context: PlanningContext,
    command: AlgorithmRunCommand,
    descriptor: AlgorithmDescriptor | undefined,
): { input: CostInput } | { unresolvableScope: string } {
    const statistics = context.statistics();
    const spec = command.scope ?? context.defaultScope;
    let scope: ResolvedScope;

    try {
        scope = context.resolveScope(spec);
    } catch (error) {
        return { unresolvableScope: error instanceof Error ? error.message : String(error) };
    }

    const calibration = context.calibration?.();
    const measurements = context.measurements?.();

    return {
        input: {
            algorithm: command.algorithm,
            ...(descriptor === undefined ? {} : { descriptor }),
            ...(command.params === undefined ? {} : { params: command.params }),
            statistics,
            scope: { nodes: scope.nodeCount, edges: scope.edgeCount, spec, exact: true },
            ...(calibration === undefined ? {} : { calibration }),
            ...(measurements === undefined ? {} : { measurements }),
            acceleratorAvailable: context.acceleratorAvailable(),
            ...(command.sample === undefined ? {} : { sample: command.sample }),
        },
    };
}

/**
 * The estimate a command gets when its scope cannot be narrowed.
 *
 * Unavailable rather than computed over the whole graph: a number produced for a scope the run
 * would refuse is a confident answer to a question nobody asked, and it would gate a button on it.
 * @param descriptor - The algorithm's catalogue entry, when it has one.
 * @param reason - Why the scope could not be resolved.
 * @returns The estimate.
 */
function unavailableEstimate(descriptor: AlgorithmDescriptor | undefined, reason: string): CostEstimate {
    return Object.freeze({
        seconds: Number.POSITIVE_INFINITY,
        confidence: "unknown",
        costClass: descriptor?.costClass ?? "unbounded",
        blocksFrame: false,
        cancellable: false,
        available: false,
        reason,
        basis: reason,
    });
}

/**
 * What one command would cost, answered synchronously so that a button can be drawn from it.
 * @param context - What planning reads.
 * @param command - The command.
 * @returns The estimate.
 */
export function estimateCommand(context: PlanningContext, command: SessionCommand): CostEstimate {
    const descriptor = context.algorithms().find((candidate) => candidate.key === command.algorithm);
    const built = costInput(context, command, descriptor);

    if ("unresolvableScope" in built) {
        return unavailableEstimate(descriptor, built.unresolvableScope);
    }

    return estimateCost(built.input);
}

// ---------------------------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------------------------

/**
 * What one command would do, what it would cost, and whether it would be allowed.
 *
 * The gate is asked the same question here that it is asked when the run starts, from the same
 * inputs, so the sentence on the confirmation dialog and the behaviour after the click cannot
 * disagree: one policy, consulted twice.
 * @param context - What planning reads.
 * @param command - The command.
 * @returns The plan.
 */
export function planCommand(context: PlanningContext, command: SessionCommand): Plan {
    const descriptor = context.algorithms().find((candidate) => candidate.key === command.algorithm);
    const built = costInput(context, command, descriptor);

    if ("unresolvableScope" in built) {
        return Object.freeze({
            ok: false,
            blocked: Object.freeze({ code: "E_UNSUPPORTED" as GraphtyErrorCode, reason: built.unresolvableScope }),
            cost: unavailableEstimate(descriptor, built.unresolvableScope),
            effect: Object.freeze({ kind: "none" as const }),
            caveats: context.defaultCaveats,
        });
    }

    const decision = gateRun(built.input, {
        limits: context.limits,
        ...(command.exact === undefined ? {} : { exact: command.exact }),
        ...(command.sample === undefined ? {} : { sample: command.sample }),
    });
    const effect: PlanEffect =
        descriptor === undefined
            ? Object.freeze({ kind: "none" as const })
            : Object.freeze({ kind: "write" as const, fields: descriptor.fields });

    if (decision.kind === "refused") {
        return Object.freeze({
            ok: false,
            blocked: Object.freeze({ code: decision.error.code, reason: decision.error.message }),
            cost: estimateCommand(context, command),
            effect,
            caveats: context.defaultCaveats,
        });
    }

    if (decision.kind === "exact") {
        return Object.freeze({
            ok: true,
            cost: decision.estimate,
            effect,
            caveats: Object.freeze({
                ...context.defaultCaveats,
                method: descriptor?.technicalName ?? context.defaultCaveats.method,
                ...(command.seed === undefined ? {} : { seed: command.seed }),
            }),
        });
    }

    return Object.freeze({
        ok: true,
        cost: decision.estimate,
        effect,
        caveats: Object.freeze({
            ...context.defaultCaveats,
            exact: false,
            sampleSize: decision.sampleSize,
            seed: decision.seeded ? (command.seed ?? null) : null,
            method: decision.method,
            notes: decision.notes,
        }),
    });
}
