/**
 * @file Reading a value as an instant on a timeline, and stepping along a calendar.
 *
 * Parsed ONCE per designated column, never per window: the index in `./TimeApi` holds the result.
 *
 * Every instant is UTC epoch milliseconds (or, for `unit: "ordinal"`, the plain number). A
 * date-time written with no offset is read in the zone the caller names, by default UTC and never
 * the machine's local time, so the same file gives the same timeline on every machine.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { TimeStep } from "../visibility/filter";
import { instantOfWall, UTC_ZONE, wallClock } from "./zone";

/**
 * How numbers in a time column are read: epoch milliseconds, epoch seconds, calendar years (`1995`
 * is January 1, 1995 UTC; a fraction is that share of the year), or plain ordered numbers with no
 * calendar (a simulation step, a tick). Strings and dates ignore it.
 * @experimental timeline
 * @beta
 */
export type TimeUnit = "ms" | "s" | "year" | "ordinal";

/** Every time unit, for a check. */
export const TIME_UNITS: readonly TimeUnit[] = Object.freeze(["ms", "s", "year", "ordinal"]);

/** How one value was read, for the counts a designation reports. */
export type InstantReading = "strict" | "loose" | "missing" | "unparsed";

/**
 * Strict ISO 8601: `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, a date-time with an optional offset or `Z`,
 * and the expanded signed year (`-000500`, `+012000`) for years before 1000 CE and BCE dates.
 */
const ISO =
    /^([+-]\d{6}|\d{4})(?:-(\d{2})(?:-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?)?)?)?$/; // NOSONAR(S5843): one anchored pattern for the whole ISO 8601 subset; splitting it hides which forms are accepted

/** A plain decimal number written as text, such as a CSV cell holding an epoch. */
const NUMERIC = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

/**
 * Text that says its own zone, as `Date.parse` reads one: a zone name, or an offset after a clock
 * time (a dash after a date is no offset: `01-15-2026`).
 */
const OWN_ZONE = /(?<![a-z])(?:Z|UTC?|GMT|[ECMP][SD]T)(?![a-z])|:\d{2}(?:\.\d+)?\s*(?:[ap]m\s*)?[+-]\d{1,2}/i;

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * Milliseconds since the epoch for a UTC calendar moment, including years 0 to 99 and BCE, which
 * `Date.UTC` maps into the twentieth century.
 * @param year - The proleptic Gregorian year.
 * @param month - The month, 0 to 11; it may overflow, as `Date` allows.
 * @param day - The day of the month, from 1.
 * @param ms - Milliseconds into that day.
 * @returns The instant.
 */
function utc(year: number, month: number, day: number, ms = 0): number {
    const date = new Date(0);
    date.setUTCFullYear(year, month, day);

    return date.getTime() + ms;
}

/**
 * How many days a month holds.
 * @param year - The year.
 * @param month - The month, 0 to 11.
 * @returns The day count.
 */
function daysIn(year: number, month: number): number {
    return new Date(utc(year, month + 1, 0)).getUTCDate();
}

/**
 * A strict ISO 8601 string as an instant, or null when it is not one or names no real date.
 * @param text - The trimmed text.
 * @param zone - The zone text with no offset reads in.
 * @returns Milliseconds, or null.
 */
function strictIso(text: string, zone: string): number | null {
    const match = ISO.exec(text);
    if (match === null) {
        return null;
    }

    const [, y, mo, d, h, mi, s, frac, offset] = match;
    const year = Number(y);
    const month = mo === undefined ? 1 : Number(mo);
    const day = d === undefined ? 1 : Number(d);
    const hour = h === undefined ? 0 : Number(h);
    const minute = mi === undefined ? 0 : Number(mi);
    const second = s === undefined ? 0 : Number(s);
    if (
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > daysIn(year, month - 1) ||
        hour > 23 ||
        minute > 59 ||
        second > 59 ||
        (y.length === 7 && year === 0 && y.startsWith("-"))
    ) {
        return null;
    }

    const millis = frac === undefined ? 0 : Math.floor(Number(`0.${frac}`) * 1000);
    let at = utc(year, month - 1, day, ((hour * 60 + minute) * 60 + second) * 1000 + millis);
    if (offset !== undefined && offset !== "Z") {
        const sign = offset.startsWith("-") ? -1 : 1;
        const digits = offset.slice(1).replace(":", "");
        at -= sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2))) * 60_000;
    } else if (offset === undefined) {
        at = instantOfWall(at, zone);
    }

    return Number.isFinite(at) ? at : null;
}

/**
 * A number read by its unit.
 * @param value - The number.
 * @param unit - The unit.
 * @returns The instant, or NaN when the number is not finite.
 */
function numberOf(value: number, unit: TimeUnit): number {
    if (!Number.isFinite(value)) {
        return Number.NaN;
    }

    if (unit === "year") {
        const whole = Math.floor(value);
        const start = utc(whole, 0, 1);
        return start + (value - whole) * (utc(whole + 1, 0, 1) - start);
    }

    return unit === "s" ? value * 1000 : value;
}

/** Whole numbers in this range read as calendar years when a column is designated with no unit. */
const YEARS = { min: 1000, max: 2999 } as const;

/**
 * The unit a column of numbers is read in when the reader gave none, from its values alone:
 * `"year"` when every value is a whole number from 1000 to 2999, `"s"` when every one is an epoch
 * in seconds (1973 to 2286), `"ms"` when every one is an epoch in milliseconds, else `"ordinal"`
 * (plain numbers: steps, ticks). Undefined when a value is not a number, so text dates decide.
 * @param values - The non-missing values.
 * @returns The unit, or undefined.
 */
export function inferUnit(values: Iterable<unknown>): TimeUnit | undefined {
    let count = 0;
    let years = 0;
    let seconds = 0;
    let millis = 0;
    for (const value of values) {
        const number = typeof value === "string" && isNumericText(value) ? Number(value) : value;
        if (typeof number !== "number" || !Number.isFinite(number)) {
            return undefined;
        }

        count++;
        years += Number.isInteger(number) && number >= YEARS.min && number <= YEARS.max ? 1 : 0;
        seconds += number >= 1e8 && number < 1e10 ? 1 : 0;
        millis += number >= 1e11 && number < 1e13 ? 1 : 0;
    }

    if (count === 0) {
        return undefined;
    }

    if (years === count) {
        return "year";
    }

    if (seconds === count) {
        return "s";
    }

    return millis === count ? "ms" : "ordinal";
}

/**
 * The zone text reads in under a unit: 1995 in a year column is January 1 UTC in every zone, or it
 * would read as 1994 west of Greenwich.
 * @param unit - The unit.
 * @param zone - The zone asked for.
 * @returns The zone.
 */
function zoneUnder(unit: TimeUnit, zone: string): string {
    return unit === "year" ? UTC_ZONE : zone;
}

/**
 * Whether text only `Date.parse` understands says its own zone. `Date.parse` skips parentheses, so
 * a zone named in them says nothing.
 * @param text - The text.
 * @returns True when the text says its zone.
 */
function namesOwnZone(text: string): boolean {
    return OWN_ZONE.test(text.replaceAll(/\([^()]*\)/g, ""));
}

/**
 * Text only `Date.parse` understands, in a zone. Text saying its own zone reads as it says: an
 * added `UTC` would win over it.
 * @param text - The text.
 * @param zone - The zone.
 * @returns The instant, NaN when it names none.
 */
function looseIn(text: string, zone: string): number {
    const wall = namesOwnZone(text) ? Number.NaN : Date.parse(`${text} UTC`);

    return Number.isNaN(wall) ? Date.parse(text) : instantOfWall(wall, zone);
}

/**
 * Read one value as an instant.
 *
 * 1. A number: by the unit. 2. A `Date`: its time. 3. Text: strict ISO 8601 first (except under
 * `"s"` and `"ordinal"`, where numeric text is a number first), then numeric text by the unit,
 * then `Date.parse` as a last resort, reported as `"loose"`. Nothing parses: `"unparsed"`.
 * @param value - The value an element carries.
 * @param unit - How numbers are read.
 * @param timeZone - The zone text with no offset reads in.
 * @returns The instant (NaN when there is none) and how it was read.
 */
export function readInstant(
    value: unknown,
    unit: TimeUnit,
    timeZone: string = UTC_ZONE,
): { readonly at: number; readonly how: InstantReading } {
    if (value === undefined || value === null || value === "") {
        return { at: Number.NaN, how: "missing" };
    }

    if (typeof value === "number") {
        const at = numberOf(value, unit);
        return { at, how: Number.isNaN(at) ? "unparsed" : "strict" };
    }

    if (value instanceof Date) {
        const at = value.getTime();
        return { at, how: Number.isNaN(at) ? "unparsed" : "strict" };
    }

    if (typeof value !== "string") {
        return { at: Number.NaN, how: "unparsed" };
    }

    const text = value.trim();
    const numeric = NUMERIC.test(text);
    if (numeric && unit !== "ms") {
        return { at: numberOf(Number(text), unit), how: "strict" };
    }

    const zone = zoneUnder(unit, timeZone);
    const iso = strictIso(text, zone);
    if (iso !== null) {
        return { at: iso, how: "strict" };
    }

    if (numeric) {
        return { at: numberOf(Number(text), unit), how: "strict" };
    }

    const loose = zone === UTC_ZONE ? Date.parse(text) : looseIn(text, zone);

    return Number.isNaN(loose) ? { at: Number.NaN, how: "unparsed" } : { at: loose, how: "loose" };
}

/**
 * Read one value as an instant the way the session's time parser reads typed text: as
 * {@link readInstant} does, except that a date written loosely with no zone is read in the given
 * zone, as the time field reads date-times.
 * @param value - The value, or typed text.
 * @param unit - How numbers are read.
 * @param timeZone - The zone text with no offset reads in. Absent, text reads in UTC, and loose
 *     text saying its own zone does too.
 * @returns Epoch milliseconds (or the ordinal value), or null when it names no instant.
 */
export function readTimeValue(value: unknown, unit: TimeUnit, timeZone?: string): number | null {
    const text = typeof value === "string" ? value.trim() : value;
    const reading = readInstant(text, unit, timeZone);
    if (reading.how === "strict") {
        return reading.at;
    }

    if (typeof text === "string" && text !== "" && (timeZone === undefined || !namesOwnZone(text))) {
        const utc = Date.parse(`${text} UTC`);
        if (!Number.isNaN(utc)) {
            return instantOfWall(utc, zoneUnder(unit, timeZone ?? UTC_ZONE));
        }
    }

    return reading.how === "loose" ? reading.at : null;
}

/**
 * A window bound as a number: text is read as a date-time is read in a time column.
 * @param bound - The bound.
 * @param timeZone - The zone text with no offset reads in.
 * @returns The number, NaN when the text names no instant.
 */
export function numericBound(bound: number | string, timeZone: string = UTC_ZONE): number {
    return typeof bound === "number" ? bound : readInstant(bound, "ms", timeZone).at;
}

/**
 * Whether text is a plain decimal number, such as a CSV cell holding an epoch.
 * @param text - The text.
 * @returns True for a number written as text.
 */
export function isNumericText(text: string): boolean {
    return NUMERIC.test(text.trim());
}

/** The calendar steps, shortest first, with their length (a month and longer, on average). */
const CALENDAR_LENGTHS: readonly (readonly [Exclude<TimeStep, number>, number])[] = [
    ["hour", MS_PER_HOUR],
    ["day", MS_PER_DAY],
    ["week", 7 * MS_PER_DAY],
    ["month", 30.436875 * MS_PER_DAY],
    ["quarter", 91.310625 * MS_PER_DAY],
    ["year", 365.2425 * MS_PER_DAY],
];

/**
 * About how long a step is, in milliseconds (or ordinal units): a month and longer on average.
 * @param step - The step.
 * @returns Its length.
 */
export function stepLength(step: TimeStep): number {
    return isCalendarStep(step) ? (CALENDAR_LENGTHS.find(([name]) => name === step)?.[1] ?? MS_PER_DAY) : step;
}

/**
 * The calendar step whose length is closest to a span, by ratio.
 * @param ms - The span.
 * @returns The step.
 */
export function calendarStepNear(ms: number): Exclude<TimeStep, number> {
    let best = CALENDAR_LENGTHS[0];
    for (const entry of CALENDAR_LENGTHS) {
        if (Math.abs(Math.log(entry[1] / ms)) < Math.abs(Math.log(best[1] / ms))) {
            best = entry;
        }
    }

    return best[0];
}

/**
 * The shortest calendar step at least as long as a span, or null when even a year is shorter.
 * @param ms - The span.
 * @returns The step, or null.
 */
export function calendarStepAtLeast(ms: number): Exclude<TimeStep, number> | null {
    return CALENDAR_LENGTHS.find(([, length]) => length >= ms)?.[0] ?? null;
}

/**
 * The 1-2-5 number (1, 2, 5, 10, 20, ...) closest to a value by ratio.
 * @param value - A positive value.
 * @returns The number.
 */
export function niceNear(value: number): number {
    const decade = 10 ** Math.floor(Math.log10(value));
    let best = decade;
    for (const factor of [1, 2, 5, 10]) {
        if (Math.abs(Math.log((factor * decade) / value)) < Math.abs(Math.log(best / value))) {
            best = factor * decade;
        }
    }

    return best;
}

/**
 * The smallest 1-2-5 number at least a value.
 * @param value - A positive value.
 * @returns The number.
 */
export function niceAtLeast(value: number): number {
    const decade = 10 ** Math.floor(Math.log10(value));
    const factor = [1, 2, 5, 10].find((each) => each * decade >= value) ?? 10;

    return factor * decade;
}

/**
 * Whether a step is a calendar step (a month is not a fixed number of milliseconds).
 * @param step - The step.
 * @returns True for a named step.
 */
export function isCalendarStep(step: TimeStep): step is Exclude<TimeStep, number> {
    return typeof step === "string";
}

/**
 * Move an instant by whole days or longer on a zone's wall clock, so a day across a clock change is
 * 23 or 25 hours. The first moment of a day stays the first moment of its day, also on a day whose
 * midnight a change removed, so a walk of boundaries never drifts off midnight.
 * @param at - The instant.
 * @param step - The step.
 * @param count - How many steps; negative goes back.
 * @param zone - The zone.
 * @returns The moved instant.
 */
function addWallSteps(at: number, step: Exclude<TimeStep, number>, count: number, zone: string): number {
    const wall = wallClock(at, zone);
    const midnight = alignTo(wall, "day");
    const start = instantOfWall(midnight, zone) === at ? midnight : wall;
    const moved = instantOfWall(addSteps(start, step, count), zone);

    // A day the zone skipped reads as the day after it, which is no move at all going back.
    return moved === at && count !== 0 ? addWallSteps(at, step, count + Math.sign(count), zone) : moved;
}

/**
 * Move an instant by whole steps. A month added to January 31 lands on the last day of February.
 * An hour is always absolute; a day and longer move on the zone's wall clock.
 * @param at - The instant.
 * @param step - The step.
 * @param count - How many steps; negative goes back.
 * @param zone - The zone calendar steps read in.
 * @returns The moved instant.
 */
export function addSteps(at: number, step: TimeStep, count: number, zone: string = UTC_ZONE): number {
    if (zone !== UTC_ZONE && isCalendarStep(step) && step !== "hour") {
        return addWallSteps(at, step, count, zone);
    }

    switch (step) {
        case "hour":
            return at + count * MS_PER_HOUR;
        case "day":
            return at + count * MS_PER_DAY;
        case "week":
            return at + count * 7 * MS_PER_DAY;
        case "month":
        case "quarter":
        case "year": {
            const months = count * { month: 1, quarter: 3, year: 12 }[step];
            const date = new Date(at);
            const total = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
            const year = Math.floor(total / 12);
            const month = total - year * 12;
            const day = Math.min(date.getUTCDate(), daysIn(year, month));
            const intoDay = at - utc(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

            return utc(year, month, day, intoDay);
        }
        default:
            return at + count * step;
    }
}

/**
 * The start of the calendar unit an instant falls in: midnight for a day, Monday for a week, the
 * first of the month, quarter or year, and the whole hour on the zone's clock. A day with no
 * midnight starts at its first moment. A numeric step aligns nothing.
 * @param at - The instant.
 * @param step - The step.
 * @param zone - The zone calendar steps read in.
 * @returns The aligned instant.
 */
export function alignTo(at: number, step: TimeStep, zone: string = UTC_ZONE): number {
    if (!isCalendarStep(step)) {
        return at;
    }

    if (zone !== UTC_ZONE) {
        const wall = wallClock(at, zone);
        const aligned = alignTo(wall, step);

        return step === "hour" ? at - (wall - aligned) : instantOfWall(aligned, zone);
    }

    if (step === "hour") {
        return Math.floor(at / MS_PER_HOUR) * MS_PER_HOUR;
    }

    const date = new Date(at);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    switch (step) {
        case "day":
            return utc(year, month, date.getUTCDate());
        case "week":
            return utc(year, month, date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
        case "month":
            return utc(year, month, 1);
        case "quarter":
            return utc(year, month - (month % 3), 1);
        default:
            return utc(year, 0, 1);
    }
}
