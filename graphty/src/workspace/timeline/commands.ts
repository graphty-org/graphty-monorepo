/**
 * The Timeline package (data prototype spec section 3.10): the clock button opens a strip whose
 * window is graphty-element's time window (`visibility.setWindow`), so the window, its step and
 * whether nodes follow their edges all live in the element and undo with it. The app only picks
 * where the window goes next; the element masks, counts and composes it with the filters.
 */

import type { AttributeDescriptor, GraphSession, TimeStep, TimeWindow } from "@graphty/graphty-element/session";

import { type CommandContext, defineRegistration } from "../commands/registry";

/** The calendar units a date window is sized and stepped in. */
export const DATE_UNITS = ["hour", "day", "week", "month"] as const;

/** One calendar unit. */
export type DateUnit = (typeof DATE_UNITS)[number];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * Moves an instant by whole steps: a number adds, a calendar unit adds in UTC (a month keeps its
 * day of the month where it can).
 * @param at - the instant, in ms or a plain number.
 * @param step - the step.
 * @param times - how many steps, negative to go back.
 * @returns the moved instant.
 */
export function addStep(at: number, step: TimeStep, times: number): number {
    if (typeof step === "number") {
        return at + step * times;
    }
    switch (step) {
        case "hour":
            return at + HOUR * times;
        case "day":
            return at + DAY * times;
        case "week":
            return at + 7 * DAY * times;
        default: {
            const months = { month: 1, quarter: 3, year: 12 }[step] * times;
            const date = new Date(at);
            date.setUTCMonth(date.getUTCMonth() + months);
            return date.getTime();
        }
    }
}

/**
 * Rounds an instant down to the start of its step: the hour, the UTC day, the Monday of its week,
 * the first of its month; a number to a multiple of the step.
 * @param at - the instant.
 * @param step - the step.
 * @returns the start.
 */
export function floorTo(at: number, step: TimeStep): number {
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
        // 1970-01-01 was a Thursday; Monday is 3 days later.
        return day - ((new Date(day).getUTCDay() + 6) % 7) * DAY;
    }
    const date = new Date(day);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

/**
 * The integer sizes a window over a number column offers: about 1/50, 1/20, 1/10 and 1/5 of the
 * range, at least 1, each once.
 * @param min - the smallest value.
 * @param max - the largest value.
 * @returns the sizes, smallest first.
 */
export function numberSizes(min: number, max: number): number[] {
    const range = Math.max(1, max - min);
    return [...new Set([50, 20, 10, 5].map((parts) => Math.max(1, Math.round(range / parts))))];
}

/**
 * The column the timeline reads by default: the one holding the time role, edges first (an event
 * table's time is on its edges).
 * @param session - the element's session.
 * @returns the column, or undefined when no column has the time role.
 */
export function timeColumn(session: GraphSession): AttributeDescriptor | undefined {
    const timed = session.data.attributes().filter((a) => a.roles?.includes("time") === true);
    return timed.find((a) => a.kind === "edge") ?? timed[0];
}

/**
 * The columns the gear offers as the time field or an interval's end: the time-role columns and
 * every time or number column, none hidden.
 * @param session - the element's session.
 * @returns the columns.
 */
export function timeFields(session: GraphSession): AttributeDescriptor[] {
    return session.data
        .attributes()
        .filter(
            (a) =>
                a.hidden !== true &&
                (a.roles?.includes("time") === true ||
                    a.type === "time" ||
                    a.type === "number" ||
                    a.type === "integer"),
        );
}

/**
 * The window the strip opens on: the first step of the field's range, one day for dates and
 * about 1/20 of the range for numbers, nodes following edges when the field is an edge column.
 * @param session - the element's session.
 * @param field - the time column.
 * @param end - an interval's end column, if any.
 * @returns the window, or null when no element carries a time.
 */
export function firstWindow(session: GraphSession, field: AttributeDescriptor, end?: string): TimeWindow | null {
    const { min, max, kind } = session.visibility.timeHistogram(field.path, { bins: 1 });
    if (min === null || max === null) {
        return null;
    }
    const step: TimeStep = kind === "date" ? "day" : numberSizes(min, max)[1];
    const from = floorTo(min, step);
    return {
        attribute: field.path,
        from,
        to: addStep(from, step, 1),
        step,
        ...(end === undefined ? {} : { end }),
        nodes: field.kind === "edge" ? "follow-edges" : "own",
    };
}

/**
 * The window in force as numbers, or null when none is.
 * @param window - the element's window.
 * @returns its bounds in ms (or plain numbers).
 */
export function boundsOf(window: TimeWindow | null): { from: number; to: number } | null {
    if (window === null) {
        return null;
    }
    const read = (value: number | string): number => (typeof value === "number" ? value : Date.parse(value));
    return { from: read(window.from), to: read(window.to) };
}

/**
 * Applies a window, reporting a refusal as a notice rather than a thrown error.
 * @param session - the element's session.
 * @param window - the window, or null to clear it.
 * @param onFail - called when the element refuses it.
 */
export function applyWindow(session: GraphSession, window: TimeWindow | null, onFail: () => void): void {
    try {
        session.visibility.setWindow(window).then(undefined, onFail);
    } catch {
        onFail();
    }
}

/**
 * The window one step on (or back): moved by its `step`, its width kept. With no window, the
 * first one. Returns null at either end of the field's range, so play stops there.
 * @param session - the element's session.
 * @param direction - 1 forward, -1 back.
 * @returns the next window, or null when there is nowhere to go.
 */
export function steppedWindow(session: GraphSession, direction: 1 | -1): TimeWindow | null {
    const { window } = session.visibility;
    const bounds = boundsOf(window);
    if (window === null || bounds === null) {
        const field = timeColumn(session);
        return field === undefined ? null : firstWindow(session, field);
    }
    const { min, max } = session.visibility.timeHistogram(window.attribute, { bins: 1 });
    const step = window.step ?? bounds.to - bounds.from;
    const from = addStep(bounds.from, step, direction);
    const to = addStep(bounds.to, step, direction);
    if (min === null || max === null || from > max || to <= min) {
        return null;
    }
    return { ...window, from, to };
}

/**
 * A date as the readout shows it, in UTC: the day, with the time when the window is under a day.
 * @param at - the instant in ms.
 * @param withTime - whether to show hours and minutes.
 * @returns such as `2024-03-01` or `2024-03-01 14:00`.
 */
function dateWords(at: number, withTime: boolean): string {
    const iso = new Date(at).toISOString();
    return withTime ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : iso.slice(0, 10);
}

/**
 * The readout: the window's first and last instants (its end is exclusive, so a one-day window
 * reads as one date).
 * @param from - the first instant inside.
 * @param to - the first instant past.
 * @param kind - whether the column holds dates or plain numbers.
 * @returns such as `2024-03-01 .. 2024-03-07`, `2024-03-01` or `10 .. 20`.
 */
export function readout(from: number, to: number, kind: "number" | "date"): string {
    if (kind === "number") {
        return `${from.toLocaleString("en-US")} .. ${to.toLocaleString("en-US")}`;
    }
    const withTime = to - from < 86_400_000;
    const first = dateWords(from, withTime);
    const last = dateWords(to - (withTime ? 60_000 : 1), withTime);
    return first === last ? first : `${first} .. ${last}`;
}

/**
 * Whether the timeline has something to show: some column has the time role.
 * @param session - the element's session, or null.
 * @returns true when the clock button is drawn.
 */
function hasTime(session: GraphSession | null): boolean {
    return session !== null && timeColumn(session) !== undefined;
}

/** The notice for a window the element refused. */
const NOT_MOVED = { notice: { message: "Window not moved" } };

/**
 * The Timeline's commands: the clock button (Timeline), and comma and period to step the window
 * back and forward while the strip is open.
 */
export const registration = defineRegistration({
    owner: "timeline",
    commands: [
        {
            id: "timeline.toggle",
            label: "Timeline",
            group: "View",
            keywords: ["time", "window", "play", "date"],
            description: "Show or hide the timeline",
            shown: ({ session }) => hasTime(session),
            run: ({ session, workspace }) => {
                if (session === null) {
                    return;
                }
                const opening = !workspace.get().timelineOpen;
                workspace.set({ timelineOpen: opening });
                const fail = (): void => {
                    workspace.set(NOT_MOVED);
                };
                // Closing clears the window, so nothing stays hidden by a tool that is not drawn.
                if (!opening) {
                    if (session.visibility.window !== null) {
                        applyWindow(session, null, fail);
                    }
                    return;
                }
                const field = timeColumn(session);
                if (session.visibility.window === null && field !== undefined) {
                    applyWindow(session, firstWindow(session, field), fail);
                }
            },
        },
        ...(
            [
                ["timeline.step-back", "Step back", ",", -1],
                ["timeline.step-forward", "Step forward", ".", 1],
            ] as const
        ).map(([id, label, key, direction]) => ({
            id,
            label,
            group: "View" as const,
            keys: [key],
            keywords: ["timeline", "time", "window"],
            shown: ({ session, workspace }: CommandContext) => workspace.get().timelineOpen && hasTime(session),
            run: ({ session, workspace }: CommandContext) => {
                if (session === null) {
                    return;
                }
                const next = steppedWindow(session, direction);
                if (next !== null) {
                    applyWindow(session, next, () => {
                        workspace.set(NOT_MOVED);
                    });
                }
            },
        })),
    ],
});
