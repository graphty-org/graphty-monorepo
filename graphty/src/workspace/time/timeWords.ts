/**
 * The timeline's words. graphty-element gives numbers (epoch milliseconds, or plain numbers for
 * ordinal time) and codes; the app writes every date and label. Dates read in the zone the caller
 * passes, the one the element lines up its calendar steps and bins in (`session.time.timeZone`), else UTC.
 */

import type {
    CodedFact,
    TimeNoticeCode,
    TimeResultsPolicy,
    TimeStep,
    TimeUnit,
    TimeWindow,
} from "@graphty/graphty-element/session";

import { formatCount } from "../settings/numberFormat";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** The calendar steps a date window can take, in order. */
export const CALENDAR_STEPS = ["hour", "day", "week", "month", "quarter", "year"] as const;

/** The steps an ordinal window (years as numbers, simulation steps) can take. */
export const ORDINAL_STEPS = [1, 5, 10, 50, 100] as const;

/** The words for each calendar step. */
const STEP_WORDS: Readonly<Record<(typeof CALENDAR_STEPS)[number], string>> = {
    hour: "Hour",
    day: "Day",
    week: "Week",
    month: "Month",
    quarter: "Quarter",
    year: "Year",
};

/**
 * A step's label in the Step menu.
 * @param step - the step.
 * @returns "Week", or "10" for a number.
 */
export function stepLabel(step: TimeStep): string {
    return typeof step === "number" ? String(step) : STEP_WORDS[step];
}

/**
 * The Step menu's Auto entry, naming the step it picked when there is one.
 * @param picked - the step in use, or undefined with no window.
 * @returns "Auto (Week)", or "Auto".
 */
export function autoLabel(picked: TimeStep | undefined): string {
    return picked === undefined ? "Auto" : `Auto (${stepLabel(picked)})`;
}

/**
 * Whether a step is finer than a day, so its readouts name the zone they are in.
 * @param step - the step.
 * @returns true for an hour or less.
 */
function finerThanDay(step: TimeStep | undefined): boolean {
    return step === "hour" || (typeof step === "number" && step < DAY);
}

/** The Untimed choices: whether elements with no time stay in every window. */
export const UNTIMED_CHOICES = [
    { value: "inside", label: "Show" },
    { value: "outside", label: "Hide" },
] as const;

/** What a suggested unit says the numbers look like. */
const SUGGESTED_WORDS: Readonly<Record<TimeUnit, string>> = {
    year: "years",
    s: "seconds",
    ms: "milliseconds",
    ordinal: "numbers",
};

/**
 * A notice from designating a field, in words, and the unit its action sets, if any.
 * @param notice - the element's notice.
 * @returns the words and the suggested unit.
 */
export function noticeOf(notice: CodedFact<TimeNoticeCode>): { message: string; unit?: TimeUnit } {
    const { path, count, suggested } = notice.params as { path: string; count?: number; suggested?: TimeUnit };
    switch (notice.code) {
        case "time.unparsed":
            return {
                message: `${countWords(count ?? 0, "value")} in ${path} ${count === 1 ? "is not a time" : "are not times"}`,
            };
        case "time.parsed-loosely":
            return { message: `${countWords(count ?? 0, "value")} in ${path} read loosely as dates` };
        default:
            return {
                message: `${path} looks like ${SUGGESTED_WORDS[suggested ?? "s"]}`,
                ...(suggested === undefined ? {} : { unit: suggested }),
            };
    }
}

/**
 * Why a column cannot be the time field, from the element's refusal.
 * @param column - the column.
 * @param reason - the refusal's reason code.
 * @returns the words.
 */
export function refusalWords(column: string, reason: unknown): string {
    switch (reason) {
        case "no-times":
            return `${column} has no times`;
        case "declared-not-time":
            return `${column} is set as another kind`;
        default:
            return `${column} cannot be the time field`;
    }
}

/**
 * What a unit choice is called on its action button.
 * @param unit - the unit.
 * @returns "Number", "Epoch s".
 */
export function unitLabel(unit: TimeUnit): string {
    return UNIT_CHOICES.find((choice) => choice.value === unit)?.label ?? unit;
}

/** The algorithm-results choices, as the Time section's menu words them. */
export const RESULTS_CHOICES: readonly { readonly value: TimeResultsPolicy; readonly label: string }[] = [
    { value: "stale", label: "Mark out of date" },
    { value: "keep", label: "Keep" },
    { value: "rerun", label: "Re-run" },
];

/** The unit choices for a number column. */
export const UNIT_CHOICES: readonly { readonly value: TimeUnit; readonly label: string }[] = [
    { value: "year", label: "Year" },
    { value: "ms", label: "Epoch ms" },
    { value: "s", label: "Epoch s" },
    { value: "ordinal", label: "Number" },
];

/** The Outside choices: whether elements outside the window are hidden or drawn as ghosts. */
export const OUTSIDE_CHOICES = [
    { value: "hide", label: "Hide" },
    { value: "ghost", label: "Ghost" },
] as const;

const UTC = "UTC";

/**
 * The reader's own zone.
 * @returns its IANA name.
 */
function readerZone(): string {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * The Zone choices: UTC, the reader's own, and a zone set some other way, as a project saved in
 * another place holds, under its own name.
 * @param current - the zone in force.
 * @returns the choices.
 */
export function zoneChoices(current: string): readonly { readonly value: string; readonly label: string }[] {
    const local = readerZone();
    return [
        { value: UTC, label: UTC },
        ...(local === UTC ? [] : [{ value: local, label: "Local" }]),
        ...(current === UTC || current === local ? [] : [{ value: current, label: current }]),
    ];
}

/**
 * A zone's date formats.
 * @param timeZone - the zone.
 * @returns one per grain, and one that gives the zone's short name.
 */
function makeFormats(
    timeZone: string,
): Readonly<Record<"minute" | "month" | "year" | "day" | "name", Intl.DateTimeFormat>> {
    return {
        minute: new Intl.DateTimeFormat(undefined, { timeZone, dateStyle: "medium", timeStyle: "short" }),
        month: new Intl.DateTimeFormat(undefined, { timeZone, year: "numeric", month: "short" }),
        year: new Intl.DateTimeFormat(undefined, { timeZone, year: "numeric" }),
        day: new Intl.DateTimeFormat(undefined, { timeZone, dateStyle: "medium" }),
        name: new Intl.DateTimeFormat(undefined, { timeZone, timeZoneName: "short" }),
    };
}

/**
 * The date formats, each made once per zone: a formatter costs far more to make than to use, and
 * the dock writes two dates for every bar of its histogram on every frame of a play (#4196).
 */
const ZONE_FORMATS = new Map([[UTC, makeFormats(UTC)]]);

/**
 * The date formats of a zone.
 * @param zone - the zone.
 * @returns its formats, made on first use.
 */
function formatsIn(zone: string): ReturnType<typeof makeFormats> {
    let formats = ZONE_FORMATS.get(zone);
    if (formats === undefined) {
        formats = makeFormats(zone);
        ZONE_FORMATS.set(zone, formats);
    }
    return formats;
}

/**
 * How finely a date is written for a step: to the minute below a day, to the month for months
 * and quarters, to the year for years, else to the day.
 * @param step - the window's step, or undefined.
 * @param zone - the zone it reads in.
 * @returns the formatter.
 */
function dateFormat(step: TimeStep | undefined, zone: string): Intl.DateTimeFormat {
    const formats = formatsIn(zone);
    if (step === "hour" || (typeof step === "number" && step < DAY)) {
        return formats.minute;
    }
    if (step === "month" || step === "quarter") {
        return formats.month;
    }
    if (step === "year") {
        return formats.year;
    }
    return formats.day;
}

/**
 * One instant in words.
 * @param at - epoch milliseconds, or a plain number for ordinal time.
 * @param unit - how the field reads numbers.
 * @param step - the window's step, which sets how finely a date is written.
 * @param zone - the zone it reads in.
 * @returns "Mar 10, 2025", or "1995" for ordinal time and for years.
 */
export function instantWords(at: number, unit: TimeUnit, step?: TimeStep, zone: string = UTC): string {
    if (unit === "ordinal") {
        return String(Math.round(at * 1000) / 1000);
    }
    // A field of years is written as years unless a step finer than a year asks for more.
    const grain = unit === "year" && (step === undefined || stepAtLeastYear(step)) ? "year" : step;
    return Number.isFinite(at) ? dateFormat(grain, zone).format(at) : "";
}

/**
 * Whether a step is a year or longer.
 * @param step - the step.
 * @returns true for a year or more.
 */
function stepAtLeastYear(step: TimeStep): boolean {
    return step === "year" || (typeof step === "number" && step >= 365 * DAY);
}

/**
 * A half-open window `[from, to)` as the reader reads it: its first and its last included instant.
 * A date window ends one millisecond before `to`, written at the step's grain, so a week from
 * Mar 10 reads "Mar 10, 2025 - Mar 16, 2025". An ordinal window of whole numbers ends at `to - 1`.
 * @param from - the window's start.
 * @param to - the window's end, excluded.
 * @param unit - how the field reads numbers.
 * @param step - the window's step.
 * @param zone - the zone it reads in.
 * @returns the words; one instant when both ends read the same.
 */
export function rangeWords(from: number, to: number, unit: TimeUnit, step?: TimeStep, zone: string = UTC): string {
    // A date window and a whole-number window both end one unit before `to`.
    const last = unit === "ordinal" && !(Number.isInteger(from) && Number.isInteger(to)) ? to : to - 1;
    const start = instantWords(from, unit, step, zone);
    const end = instantWords(Math.max(from, last), unit, step, zone);
    return start === end ? start : `${start} - ${end}`;
}

/**
 * A range for a readout: finer than a day, a date reads with its zone's name.
 * @param range - the range, `[from, to)`.
 * @param unit - how the field reads numbers.
 * @param step - the window's step.
 * @param zone - the zone it reads in.
 * @returns the words.
 */
export function readoutRange(
    range: readonly [number, number],
    unit: TimeUnit,
    step: TimeStep | undefined,
    zone: string = UTC,
): string {
    const words = rangeWords(range[0], range[1], unit, step, zone);
    if (unit === "ordinal" || !finerThanDay(step)) {
        return words;
    }
    const name = formatsIn(zone)
        .name.formatToParts(range[0])
        .find((part) => part.type === "timeZoneName")?.value;
    return `${words} ${zone === UTC ? UTC : (name ?? zone)}`;
}

/**
 * A window's readout.
 * @param window - the window.
 * @param unit - how the field reads numbers.
 * @param zone - the zone it reads in.
 * @returns the words.
 */
export function windowWords(window: TimeWindow, unit: TimeUnit, zone?: string): string {
    return readoutRange([Number(window.from), Number(window.to)], unit, window.step, zone);
}

/**
 * A count and its noun.
 * @param count - the count.
 * @param noun - the singular noun.
 * @returns "1 edge", "12 edges".
 */
export function countWords(count: number, noun: string): string {
    return `${formatCount(count)} ${noun}${count === 1 ? "" : "s"}`;
}

/** The step and speed a play step happens at: 1x is one step a second. */
export const SPEEDS = [1, 2, 4] as const;

/**
 * The milliseconds between playback steps at a speed.
 * @param speed - 1, 2 or 4.
 * @returns the interval.
 */
export function intervalOf(speed: number): number {
    return Math.round(1000 / speed);
}
