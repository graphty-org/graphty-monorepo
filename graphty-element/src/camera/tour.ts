/**
 * @file Camera tours: the saved form (`Tour`, `TourStop`), the easing names, and the planner that
 * checks and times a tour before anything moves.
 *
 * A tour is named stops in order. Each stop names a view and says how long to fly there
 * (`duration`) and how long to hold (`hold`); an unset flight or hold is 0. The plan is authored:
 * its times come only from those values, the same for every reader and every recording.
 *
 * NODE-SAFE: plain data only.
 */

import type { CodedFact } from "../session/shared";
import type { CameraWaypoint, ViewWaypoint } from "../video/VideoCapture";
import { stateProblem, type ViewModeName } from "./mode";
import type { CameraState } from "./types";

/** How a camera flight speeds up and slows down. */
export type EasingName = "linear" | "easeIn" | "easeOut" | "easeInOut";

/** The easing names, for checking a value from outside. */
export const EASING_NAMES: readonly EasingName[] = ["linear", "easeIn", "easeOut", "easeInOut"];

/**
 * One stop of a saved tour: the name of a view (a camera view's id or a saved view's name), the
 * flight there (`duration`, ms) and the hold (`hold`, ms). In a stop, `duration` is the flight to
 * that stop; in a recording's options it is the whole recording's length.
 */
export type TourStop = ViewWaypoint & { view: string };

/** A tour: its stops in order, and how each flight eases. */
export interface Tour {
    /** The stops, in order. */
    stops: readonly TourStop[];
    /** The easing of each flight. Default `"easeInOut"`; `playTour`'s `easing` option wins. */
    easing?: EasingName;
}

/** What `planTour` and `playTour` take: a saved tour's name, a tour, or stops given inline. */
export type TourInput = string | Tour | readonly (ViewWaypoint | CameraWaypoint)[];

/**
 * Why a tour ended: `"finished"` the last hold ended; `"cancelled"` its `signal` aborted or
 * `cancelCameraAnimation()` was called; `"interrupted"` the reader moved the camera or pressed the
 * canvas; `"replaced"` another tour, a recording, `setCameraState`, `applyCameraView`, the
 * `view.camera` op or a screenshot with a `camera` moved the camera; `"mode-changed"` the drawing
 * mode switched (2D, 3D or immersive).
 */
export type TourEndReason = "finished" | "cancelled" | "interrupted" | "replaced" | "mode-changed";

/** One stop of a {@link TourPlan}. */
export interface TourPlanStop {
    /** When the stop's flight starts, in ms from the tour's start. */
    readonly startMs: number;
    /** The authored flight to the stop, ms. */
    readonly duration: number;
    /** The authored hold at the stop, ms. */
    readonly hold: number;
    /**
     * Why the stop cannot be flown now, as `viewProblem` answers for its view plus `stop` (the
     * 0-based index), or `E_OPTION_RANGE` `{ option, stop }` for a bad flight or hold; null when
     * it can.
     */
    readonly problem: CodedFact | null;
}

/** A tour checked and timed, with nothing moved. */
export interface TourPlan {
    /** The sum of every authored flight and hold, ms. */
    readonly totalMs: number;
    /** True exactly when `problem` and every stop's `problem` are null. */
    readonly playable: boolean;
    /** Each stop's times and problem. */
    readonly stops: readonly TourPlanStop[];
    /**
     * Why the tour as a whole cannot be played: `E_BAD_COMMAND` `{ reason: "no-stops" }`,
     * `E_BAD_COMMAND` `{ missing, available }` for a tour name nothing is saved under, or
     * `E_UNSUPPORTED` `{ reason: "xr", mode }` while immersive; null when none.
     */
    readonly problem: CodedFact | null;
}

/** What the planner reads from the element. */
export interface TourPlanContext {
    /** The element's view mode now. */
    readonly mode: ViewModeName;
    /** The saved tours, for a tour given by name. */
    readonly tours: ReadonlyMap<string, Tour>;
    /**
     * Judge a view name in the drawing mode, as `viewProblem(name)` does.
     * @param name - The view name.
     * @returns Null when it can be applied now, else the coded fact.
     */
    judge(name: string): CodedFact | null;
}

/** A tour resolved for planning: its name, its stops and its easing. */
export interface ResolvedTour {
    /** The saved tour's name, or null for a tour given inline. */
    readonly name: string | null;
    readonly stops: readonly (ViewWaypoint | CameraWaypoint)[];
    readonly easing: EasingName | undefined;
}

/**
 * Whether a flight or hold is valid: absent, or a finite number of at least 0.
 * @param value - The value.
 * @returns True when valid.
 */
export function validTime(value: unknown): boolean {
    return value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

/**
 * The first bad flight or hold of a stop, as an `E_OPTION_RANGE` fact.
 * @param stop - The stop.
 * @param stop.duration - Its flight, as given.
 * @param stop.hold - Its hold, as given.
 * @param index - Its 0-based index.
 * @returns The fact, or null when both are valid.
 */
export function timeProblem(stop: { duration?: unknown; hold?: unknown }, index: number): CodedFact | null {
    for (const option of ["duration", "hold"] as const) {
        if (!validTime(stop[option])) {
            return { code: "E_OPTION_RANGE", params: { option, stop: index } };
        }
    }

    return null;
}

/**
 * Find the tour a planner input means.
 * @param input - The input.
 * @param tours - The saved tours.
 * @returns The tour, or the fact for a name nothing is saved under.
 */
export function resolveTour(input: TourInput, tours: ReadonlyMap<string, Tour>): ResolvedTour | CodedFact {
    if (typeof input === "string") {
        const saved = tours.get(input);
        if (saved === undefined) {
            return { code: "E_BAD_COMMAND", params: { missing: [input], available: [...tours.keys()] } };
        }
        return { name: input, stops: saved.stops, easing: saved.easing };
    }

    if (Array.isArray(input)) {
        return { name: null, stops: input as readonly (ViewWaypoint | CameraWaypoint)[], easing: undefined };
    }

    const tour = input as Tour;
    return { name: null, stops: Array.isArray(tour.stops) ? tour.stops : [], easing: tour.easing };
}

/**
 * The camera state a stop names directly, or its view's name.
 * @param stop - The stop.
 * @returns The name, or the state.
 */
export function stopTarget(stop: ViewWaypoint | CameraWaypoint): string | CameraState {
    return "view" in stop ? stop.view : { position: stop.position, target: stop.target };
}

/**
 * Check and time a tour, moving nothing.
 * @param input - A saved tour's name, a tour, or stops.
 * @param context - What the planner reads from the element.
 * @returns The resolved tour (null for an unknown name) and its plan.
 */
export function planTourStops(
    input: TourInput,
    context: TourPlanContext,
): { readonly tour: ResolvedTour | null; readonly plan: TourPlan } {
    const resolved = resolveTour(input, context.tours);
    if ("code" in resolved) {
        return { tour: null, plan: { totalMs: 0, playable: false, stops: [], problem: resolved } };
    }

    const immersive = context.mode === "ar" || context.mode === "vr";
    let startMs = 0;
    const stops = resolved.stops.map((stop, index): TourPlanStop => {
        const duration = validTime(stop.duration) ? (stop.duration ?? 0) : 0;
        const hold = validTime(stop.hold) ? (stop.hold ?? 0) : 0;
        const planned = { startMs, duration, hold, problem: immersive ? null : stopProblem(stop, index, context) };
        startMs += duration + hold;
        return planned;
    });

    let problem: CodedFact | null = null;
    if (stops.length === 0) {
        problem = { code: "E_BAD_COMMAND", params: { reason: "no-stops" } };
    } else if (immersive) {
        problem = { code: "E_UNSUPPORTED", params: { reason: "xr", mode: context.mode } };
    }

    return {
        tour: resolved,
        plan: {
            totalMs: startMs,
            playable: problem === null && stops.every((stop) => stop.problem === null),
            stops,
            problem,
        },
    };
}

/**
 * Why one stop cannot be flown in the drawing mode.
 * @param stop - The stop.
 * @param index - Its 0-based index.
 * @param context - The planner's context.
 * @returns The fact, or null.
 */
function stopProblem(stop: ViewWaypoint | CameraWaypoint, index: number, context: TourPlanContext): CodedFact | null {
    const time = timeProblem(stop, index);
    if (time !== null) {
        return time;
    }

    const target = stopTarget(stop);
    if (typeof target === "string") {
        const judged = context.judge(target);
        return judged === null ? null : { code: judged.code, params: { ...judged.params, stop: index } };
    }

    const problem = stateProblem(target, context.mode, { stop: index });
    return problem === null ? null : { code: "E_UNSUPPORTED", params: problem };
}
