/**
 * @file Reading a value as an instant on a timeline, and stepping along a calendar.
 *
 * Parsed ONCE per designated column, never per window: the index in `./timeIndex` holds the result.
 *
 * Every instant is UTC epoch milliseconds (or, for `unit: "ordinal"`, the plain number). A
 * date-time written with no offset is read in the zone the caller names, never the machine's local
 * time, so the same file gives the same timeline on every machine. With no zone named, strict text
 * reads in UTC and loose text as `Date.parse` reads it, which is how it reads with the timeline off.
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

const CHAR_0 = 48;
const CHAR_DASH = 45;
const CHAR_COLON = 58;
const CHAR_DOT = 46;
const CHAR_T = 84;
const CHAR_Z = 90;
const DATE_LENGTH = 10;
const DATE_TIME_LENGTH = 24;

/**
 * One character's code, in text whose length has been checked.
 * @param text - The text.
 * @param at - Where.
 * @returns The code.
 */
function codeAt(text: string, at: number): number {
    return text.charCodeAt(at); // NOSONAR(S7758): only ASCII matters here, and codePointAt's undefined would need a check per character on a path run a million times
}

/**
 * Two decimal digits as a number.
 * @param text - The text.
 * @param at - Where they start.
 * @returns The number, negative when either is no digit.
 */
function twoDigits(text: string, at: number): number {
    const tens = codeAt(text, at) - CHAR_0;
    const ones = codeAt(text, at + 1) - CHAR_0;

    return tens >= 0 && tens <= 9 && ones >= 0 && ones <= 9 ? tens * 10 + ones : -1;
}

/**
 * Whether text has the dashes of `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`, the two forms a file
 * writes a million of. No number written as text has them.
 * @param text - The text.
 * @returns True for that shape.
 */
export function isDateShaped(text: string): boolean {
    return (
        (text.length === DATE_LENGTH || text.length === DATE_TIME_LENGTH) &&
        codeAt(text, 4) === CHAR_DASH &&
        codeAt(text, 7) === CHAR_DASH
    );
}

/**
 * The milliseconds into a day of the clock in `YYYY-MM-DDTHH:mm:ss.sssZ`.
 * @param text - Text of that length.
 * @returns The milliseconds, NaN when it is not exactly that form or names no time.
 */
function exactClock(text: string): number {
    const hour = twoDigits(text, 11);
    const minute = twoDigits(text, 14);
    const second = twoDigits(text, 17);
    const hundreds = codeAt(text, 20) - CHAR_0;
    const rest = twoDigits(text, 21);
    if (
        codeAt(text, 10) !== CHAR_T ||
        codeAt(text, 13) !== CHAR_COLON ||
        codeAt(text, 16) !== CHAR_COLON ||
        codeAt(text, 19) !== CHAR_DOT ||
        codeAt(text, 23) !== CHAR_Z ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59 ||
        second < 0 ||
        second > 59 ||
        hundreds < 0 ||
        hundreds > 9 ||
        rest < 0
    ) {
        return Number.NaN;
    }

    return ((hour * 60 + minute) * 60 + second) * 1000 + hundreds * 100 + rest;
}

/**
 * Text of exactly `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`, read by character. What it leaves
 * reads through {@link strictIso}, which answers the same for what it takes: years before 100, which
 * `Date.UTC` would move, are among what it leaves.
 * @param text - The text.
 * @returns Milliseconds as UTC, NaN when it is not one of the two.
 */
function exactIso(text: string): number {
    if (!isDateShaped(text)) {
        return Number.NaN;
    }

    const century = twoDigits(text, 0);
    const within = twoDigits(text, 2);
    const month = twoDigits(text, 5);
    const day = twoDigits(text, 8);
    const year = century * 100 + within;
    if (century < 1 || within < 0 || month < 1 || month > 12 || day < 1 || day > monthDays(year, month)) {
        return Number.NaN;
    }

    const clock = text.length === DATE_LENGTH ? 0 : exactClock(text);

    return civilDay(year, month, day) * MS_PER_DAY + clock;
}

/**
 * How many days a month holds, by arithmetic: {@link daysIn} makes two `Date`s.
 * @param year - The year.
 * @param month - The month, 1 to 12.
 * @returns The day count.
 */
function monthDays(year: number, month: number): number {
    if (month === 2) {
        return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
    }

    return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

/**
 * Days from 1970-01-01 to a date of the proleptic Gregorian calendar, for a positive year: the
 * civil-date count, with March first so a leap day ends its year. A quarter of `Date.UTC`'s cost.
 * @param year - The year.
 * @param month - The month, 1 to 12.
 * @param day - The day.
 * @returns The day number.
 */
function civilDay(year: number, month: number, day: number): number {
    const shifted = month > 2 ? year : year - 1;
    const era = Math.floor(shifted / 400);
    const inEra = shifted - era * 400;
    const inYear = Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) + day - 1;

    return era * 146_097 + inEra * 365 + Math.floor(inEra / 4) - Math.floor(inEra / 100) + inYear - 719_468;
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
    const tally = newUnitTally();
    for (const value of values) {
        tallyUnit(tally, typeof value === "string" && isNumericText(value) ? Number(value) : value);
        if (!tally.numeric) {
            return undefined;
        }
    }

    return unitOfTally(tally);
}

/**
 * A column name that speaks of time, as whole words: `sent_at` and `startDate` do, `friend` and
 * `candidate` do not. Run on the name with its camel case split and lowered.
 */
const TIME_NAME = /(?:^|[^a-z])(?:date|datetime|time|timestamp|year|start|end|created|sent|when|period)s?(?:$|[^a-z])/; // NOSONAR(S5843): one flat list of words between two word edges

/** A loose reading counts toward a candidate only with a four-digit year in it. */
const HAS_YEAR = /\d{4}/;

/**
 * Whether a column's name speaks of time.
 * @param name - The column's name.
 * @returns True when it does.
 */
function isTimeName(name: string): boolean {
    return TIME_NAME.test(name.replaceAll(/([a-z])([A-Z])/g, "$1 $2").toLowerCase());
}

/**
 * Whether a value is a date on its face, with no help from its column's name: a number written as
 * text is not, though `2021` is strict ISO 8601.
 * @param value - The value.
 * @returns True for a `Date` or strict ISO text.
 */
function isStrictDate(value: unknown): boolean {
    return (
        value instanceof Date ||
        (typeof value === "string" && !isNumericText(value) && readInstant(value, "ms").how === "strict")
    );
}

/**
 * How a column reads as time, judged from a sample of its non-empty values: every one is a strict
 * date, or the column is named for time and every number fits an epoch or a calendar year. Never
 * from the name alone.
 * @param name - The column's name.
 * @param samples - Its sampled values.
 * @returns True when the column looks like time.
 */
export function looksLikeTime(name: string, samples: readonly unknown[]): boolean {
    const unit = inferUnit(samples);
    if (unit !== undefined) {
        return unit !== "ordinal" && isTimeName(name);
    }

    return samples.length > 0 && samples.every(isStrictDate);
}

/** What the present values of a column have looked like so far, for {@link unitOfTally}. */
export interface UnitTally {
    count: number;
    years: number;
    seconds: number;
    millis: number;
    /** False once a value is not a finite number. */
    numeric: boolean;
}

/**
 * A tally of no values.
 * @returns It.
 */
export function newUnitTally(): UnitTally {
    return { count: 0, years: 0, seconds: 0, millis: 0, numeric: true };
}

/**
 * Count one present value, numeric text already read as its number.
 * @param tally - The tally so far.
 * @param number - The value.
 */
export function tallyUnit(tally: UnitTally, number: unknown): void {
    if (typeof number !== "number" || !Number.isFinite(number)) {
        tally.numeric = false;
        return;
    }

    tally.count++;
    tally.years += Number.isInteger(number) && number >= YEARS.min && number <= YEARS.max ? 1 : 0;
    tally.seconds += number >= 1e8 && number < 1e10 ? 1 : 0;
    tally.millis += number >= 1e11 && number < 1e13 ? 1 : 0;
}

/**
 * The unit a tally's values call for, by the rule of {@link inferUnit}.
 * @param tally - The tally.
 * @returns The unit, or undefined.
 */
export function unitOfTally(tally: UnitTally): TimeUnit | undefined {
    const { count, years, seconds, millis, numeric } = tally;
    if (!numeric || count === 0) {
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

/** What a column's values have looked like so far as a time candidate. */
export interface CandidateTally extends UnitTally {
    /** How many values are present. */
    total: number;
    /** How many of the values that are not numbers read as time. */
    parsed: number;
}

/**
 * A candidate tally of no values.
 * @returns It.
 */
export function newCandidateTally(): CandidateTally {
    return { ...newUnitTally(), total: 0, parsed: 0 };
}

/**
 * Count one value of a column, numeric text as its number.
 * @param tally - The tally so far.
 * @param value - The value.
 */
export function tallyCandidate(tally: CandidateTally, value: unknown): void {
    if (value === undefined || value === null || value === "") {
        return;
    }

    tally.total++;
    if (typeof value === "string" && !isDateShaped(value) && isNumericText(value)) {
        tallyUnit(tally, Number(value));
        return;
    }

    tallyUnit(tally, value);
    if (typeof value !== "number") {
        const { how } = readInstant(value, "ms");
        tally.parsed +=
            how === "strict" || (how === "loose" && typeof value === "string" && HAS_YEAR.test(value)) ? 1 : 0;
    }
}

/**
 * How a tallied column reads as time. A column of numbers counts whole or not at all: epochs under
 * any name, years only under a time name, and plain steps never.
 * @param tally - The column's tally.
 * @param name - The column's name.
 * @returns How many of its values read as time, and the unit of a column of numbers.
 */
export function candidateReading(
    tally: CandidateTally,
    name: string,
): { readonly parsed: number; readonly unit?: TimeUnit } {
    const unit = unitOfTally(tally);
    if (unit === undefined) {
        return { parsed: tally.parsed };
    }

    return unit !== "ordinal" && (unit !== "year" || isTimeName(name)) ? { parsed: tally.count, unit } : { parsed: 0 };
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
 * Read text as an instant, as {@link readInstant} says.
 * @param value - The text.
 * @param unit - How numbers are read.
 * @param timeZone - The zone text with no offset reads in.
 * @returns The instant (NaN when there is none) and how it was read.
 */
function readText(
    value: string,
    unit: TimeUnit,
    timeZone: string | undefined,
): { readonly at: number; readonly how: InstantReading } {
    // With the timeline off nothing names a zone: `time.parse` passes none and the window bounds'
    // zone is the timeline's, so text reads below as it did before zones.
    if (timeZone !== undefined) {
        const exact = exactIso(value);
        if (!Number.isNaN(exact)) {
            const dated = value.length === DATE_LENGTH;
            return { at: dated ? instantOfWall(exact, zoneUnder(unit, timeZone)) : exact, how: "strict" };
        }
    }

    const text = value.trim();
    const numeric = NUMERIC.test(text);
    if (numeric && unit !== "ms") {
        return { at: numberOf(Number(text), unit), how: "strict" };
    }

    const zone = zoneUnder(unit, timeZone ?? UTC_ZONE);
    const iso = strictIso(text, zone);
    if (iso !== null) {
        return { at: iso, how: "strict" };
    }

    if (numeric) {
        return { at: numberOf(Number(text), unit), how: "strict" };
    }

    const loose = timeZone === undefined ? Date.parse(text) : looseIn(text, zone);

    return Number.isNaN(loose) ? { at: Number.NaN, how: "unparsed" } : { at: loose, how: "loose" };
}

/**
 * Read one value as an instant.
 *
 * 1. A number: by the unit. 2. A `Date`: its time. 3. Text: strict ISO 8601 first (except under
 * `"s"` and `"ordinal"`, where numeric text is a number first), then numeric text by the unit,
 * then `Date.parse` as a last resort, reported as `"loose"`. Nothing parses: `"unparsed"`.
 * @param value - The value an element carries.
 * @param unit - How numbers are read.
 * @param timeZone - The zone text with no offset reads in, UTC included. Absent, strict text reads
 *     in UTC and loose text as `Date.parse` reads it.
 * @returns The instant (NaN when there is none) and how it was read.
 */
export function readInstant(
    value: unknown,
    unit: TimeUnit,
    timeZone?: string,
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

    return typeof value === "string" ? readText(value, unit, timeZone) : { at: Number.NaN, how: "unparsed" };
}

/**
 * The smallest number above a finite one.
 * @param at - The number.
 * @returns The next float up.
 */
function nextAbove(at: number): number {
    if (at === 0) {
        return Number.MIN_VALUE;
    }

    const bits = new BigInt64Array(Float64Array.of(at).buffer);
    bits[0] += at > 0 ? 1n : -1n;

    return new Float64Array(bits.buffer)[0];
}

/**
 * Where a span ends. An instant is a span ending at the next float above it, so the one test
 * `start < to && end > from` covers both; an end at or before its start reads as such an instant.
 * @param start - The span's start.
 * @param end - The end as given.
 * @returns The end.
 */
export function spanEnd(start: number, end: number): number {
    return end > start ? end : nextAbove(start);
}

/**
 * A spells value as its spells' raw bounds: a list of `{ start, end }`, `[start, end]` or bare
 * instants, whose two bounds are the same value.
 * @param value - The value.
 * @returns One `[start, end]` per spell; none for an empty value.
 */
export function spellPairs(value: unknown): readonly (readonly [unknown, unknown])[] {
    if (value === undefined || value === null || value === "") {
        return [];
    }

    return (Array.isArray(value) ? value : [value]).map((spell: unknown) => {
        if (Array.isArray(spell)) {
            return [spell[0], spell[1]] as const;
        }

        if (typeof spell === "object" && spell !== null && !(spell instanceof Date)) {
            const { start, end } = spell as { readonly start?: unknown; readonly end?: unknown };
            return [start, end] as const;
        }

        return [spell, spell] as const;
    });
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
 * @param timeZone - The zone text with no offset reads in, as {@link readInstant} takes it.
 * @returns The number, NaN when the text names no instant.
 */
export function numericBound(bound: number | string, timeZone?: string): number {
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
