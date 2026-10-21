/**
 * @file Time window arithmetic: moving an instant by whole steps, rounding it down to the start of
 * its step, the first window over an attribute and the window one step on. Calendar steps are in
 * UTC. Pure functions over numbers; `VisibilityApi.firstWindow` and `VisibilityApi.stepWindow`
 * read the attribute's range and the window in force and hand them here.
 */

import type { Path } from "../../catalog/types";
import type { TimeHistogram, TimeStep, TimeWindow } from "./filter";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MONTHS = { month: 1, quarter: 3, year: 12 } as const;

/**
 * Moves an instant by whole steps: a number adds, a calendar step adds in UTC (a month added to
 * the 31st runs into the next month, as `Date` does; window starts are the 1st, so it never does).
 * @param at - The instant, in ms since the epoch or a plain number.
 * @param step - The step.
 * @param times - How many steps, negative to go back.
 * @returns The moved instant.
 */
export function addTimeStep(at: number, step: TimeStep, times: number): number {
    if (typeof step === "number") {
        return at + step * times;
    }
    if (step === "hour") {
        return at + HOUR * times;
    }
    if (step === "day") {
        return at + DAY * times;
    }
    if (step === "week") {
        return at + 7 * DAY * times;
    }
    const date = new Date(at);
    date.setUTCMonth(date.getUTCMonth() + MONTHS[step] * times);
    return date.getTime();
}

/**
 * Rounds an instant down to the start of its step: the hour, the UTC day, the Monday of its week,
 * the first of its month, quarter or year; a number to a multiple of the step.
 * @param at - The instant.
 * @param step - The step.
 * @returns The start.
 */
export function floorTimeStep(at: number, step: TimeStep): number {
    if (typeof step === "number") {
        return Math.floor(at / step) * step;
    }
    if (step === "hour") {
        return Math.floor(at / HOUR) * HOUR;
    }
    const day = Math.floor(at / DAY) * DAY;
    if (step === "day") {
        return day;
    }
    if (step === "week") {
        // getUTCDay is 0 on a Sunday; Monday starts the week.
        return day - ((new Date(day).getUTCDay() + 6) % 7) * DAY;
    }
    const date = new Date(day);
    const month = date.getUTCMonth();
    return Date.UTC(date.getUTCFullYear(), month - (month % MONTHS[step]), 1);
}

/** What {@link firstTimeWindow} is asked for. */
export interface FirstWindowOptions {
    /** The window's width, and the step it advances by. */
    readonly step: TimeStep;
    /** An instant the window holds: a number, or a string `Date.parse` understands. Default: the attribute's first value. */
    readonly at?: number | string;
    /** An interval's end attribute, carried onto the window. */
    readonly end?: Path;
    /** Which time decides a node, carried onto the window. */
    readonly nodes?: "own" | "follow-edges";
}

/**
 * The window one step wide holding an instant (the attribute's first value by default), its
 * start rounded down to the step so consecutive windows tile the timeline.
 * @param histogram - The attribute's range.
 * @param options - The step, the instant, and what to carry onto the window.
 * @returns The window, or null when no element carries a value.
 */
export function firstTimeWindow(histogram: TimeHistogram, options: FirstWindowOptions): TimeWindow | null {
    if (histogram.min === null) {
        return null;
    }
    const at = options.at === undefined ? histogram.min : instant(options.at);
    const from = floorTimeStep(at, options.step);
    return {
        attribute: histogram.attribute,
        from,
        to: addTimeStep(from, options.step, 1),
        step: options.step,
        ...(options.end === undefined ? {} : { end: options.end }),
        ...(options.nodes === undefined ? {} : { nodes: options.nodes }),
    };
}

/**
 * A window moved one step on or back: by its `step`, or by its own width when it has none, its
 * width kept.
 * @param window - The window.
 * @param histogram - Its attribute's range.
 * @param direction - 1 forward, -1 back.
 * @returns The moved window, or null when it would hold none of the range.
 */
export function steppedTimeWindow(window: TimeWindow, histogram: TimeHistogram, direction: 1 | -1): TimeWindow | null {
    const from = instant(window.from);
    const to = instant(window.to);
    const step = window.step ?? to - from;
    const next = { from: addTimeStep(from, step, direction), to: addTimeStep(to, step, direction) };
    if (histogram.min === null || histogram.max === null || next.from > histogram.max || next.to <= histogram.min) {
        return null;
    }
    return { ...window, ...next };
}

/**
 * A window bound as a number.
 * @param value - A number, or a string `Date.parse` understands.
 * @returns The instant.
 */
function instant(value: number | string): number {
    return typeof value === "number" ? value : Date.parse(value);
}
