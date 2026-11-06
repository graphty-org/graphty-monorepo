/**
 * @file The index of a designated time column: every row's instant, and the instants sorted with
 * the row of each. A kind with an end or spells holds spans: each timed row is one or more
 * `[start, end)` stretches, sorted once by start and once by end. An instant is a span ending at the
 * next float above it, which is why a kind of instants needs nothing more: its starts and ends are
 * the same arrays.
 *
 * ONE READ. A build copies the column's raw values once; the unit, the notices and the parsing all
 * read that copy, so a million record lookups happen once however many questions the values answer.
 *
 * BUILT IN STEPS. A build is a generator that yields after each chunk of work. The session runs one
 * to the end at once ({@link drain}) or a slice at a time ({@link inSlices}), and can switch from
 * the second to the first part way through, which is what a window needed now does.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { CodedFact } from "../shared";
import type { TimeInstants, TimeSpans } from "../visibility/filter";
import {
    type InstantReading,
    isDateShaped,
    isNumericText,
    newUnitTally,
    readInstant,
    spanEnd,
    spellPairs,
    tallyUnit,
    type TimeUnit,
    unitOfTally,
    type UnitTally,
} from "./parse";
import type { TimeCounts, TimeNoticeCode } from "./TimeApi";

/** Above this many rows a build gives the thread back as it goes; below, it runs at once. */
export const SLICED_ROWS = 50_000;

/** How long one slice of a build may hold the thread, as a filter pass's does. */
const SLICE_MS = 8;

/** How many rows a build works through between looks at the clock. */
const CHUNK = 16_384;

/**
 * What parsing a row that is not a plain number costs, in plain rows: text in a named zone or in a
 * loose form runs 100 times slower, so a chunk of it would hold the thread past a frame.
 */
const SLOW_ROW = 64;

/** The range a whole number reads as a year in, for the `"ordinal"` suggestion. */
const YEAR_LIKE = { min: -5000, max: 3000 } as const;

/** How many unparsed values a notice quotes. */
const MAX_EXAMPLES = 3;

/** Values one digit of the radix sort can take: four 16-bit passes cover a float's 64 bits. */
const RADIX = 65_536;

/** Which half of a float's bits comes second in memory, by this machine's byte order. */
const HIGH_WORD = new Uint32Array(Float64Array.of(1).buffer)[1] === 0 ? 0 : 1;

/** How many values builds have parsed, for a test that counts work rather than time. */
export const timeIndexCounters = { parsed: 0, binned: 0 };

/** A build or a part of one: yields where it can be paused. */
export type IndexWork<T> = Generator<undefined, T, undefined>;

/** The sort's keys in their current order: a float's bits as two words, and the row of each. */
interface RadixKeys {
    readonly low: Uint32Array;
    readonly high: Uint32Array;
    readonly order: Uint32Array;
}

/** What a column's values have looked like so far: what a later row can change the reading of. */
interface ColumnTally extends UnitTally {
    /** Text that is not a number. */
    text: number;
    /** Numbers, and text that is only a number. */
    bare: number;
    /** Real numbers, for the suspect unit. */
    plain: number;
    secondsLike: number;
    yearLike: number;
    fourDigit: number;
}

/** What parsing a column has found so far. */
interface ParseTally {
    untimed: number;
    unparsed: number;
    loose: number;
    /** Whether every instant is a whole number. */
    whole: boolean;
    readonly examples: string[];
}

/** One kind's time: per row, and sorted with the row of each. */
export interface KindIndex extends TimeInstants {
    /** Where each span starts, ascending; for a kind of instants, the instants. */
    readonly sorted: Float64Array;
    /** The row of each. */
    readonly perm: Uint32Array;
    /** Where each span ends, ascending; a kind of instants has `sorted` here. */
    readonly sortedEnd: Float64Array;
    /** The row of each; a kind of instants has `perm` here. */
    readonly endPerm: Uint32Array;
    /** The spans row by row; null for a kind of instants. */
    readonly spans: IndexedSpans | null;
    readonly counts: TimeCounts;
    readonly loose: number;
    readonly examples: readonly string[];
    /** What every number in the column looks like, when the unit reads them as milliseconds. */
    readonly suspect: "s" | "year" | "ordinal" | null;
    /** How the kind's numbers are read. */
    readonly unit: TimeUnit;
    /** Whether a stray number in the column counts as unparsed, in a column mostly of date text. */
    readonly datesOnly: boolean;
    /** Whether every instant is a whole number. */
    readonly whole: boolean;
    readonly tally: Readonly<ColumnTally>;
}

/** A kind's spans, with what only the index's readers ask of them. */
interface IndexedSpans extends TimeSpans {
    /** The first and the last finite bound. */
    readonly bounds: readonly [number, number];
    /** What each column held that did not read as time. */
    readonly notices: readonly CodedFact<TimeNoticeCode>[];
}

/** The index of the designated field over one snapshot. */
export interface FieldIndex {
    readonly key: string;
    /** The part of the key that is the data: an index for another reading of it still fits it. */
    readonly data: string;
    /** The part of the key that is the designation. */
    readonly reading: string;
    /** The write mark it was built at; see `TimeSources.rewrites`. */
    readonly rewrites: string;
    readonly path: string;
    readonly unit: TimeUnit;
    /** The unit each kind's values called for, when the designation gave none and they are numbers. */
    readonly inferred: { readonly node?: TimeUnit; readonly edge?: TimeUnit };
    readonly node: KindIndex | null;
    readonly edge: KindIndex | null;
    /** Whether every instant is a whole number, so an ordinal bin is never narrower than one. */
    readonly whole: boolean;
}

/** One kind of a build: where its values come from and how they read. */
export interface KindPlan {
    readonly count: number;
    readonly read: (row: number) => unknown;
    /** The unit the designation gave; absent, the values decide, then `"ms"`. */
    readonly unit: TimeUnit | undefined;
    /** The zone text with no offset reads in; absent, text reads as it does with the timeline off. */
    readonly zone: string | undefined;
    /** The kind's end column, as a column and how it reads. */
    readonly end?: SpanColumn;
    /** The kind's spells column. */
    readonly spells?: SpanColumn;
}

/** A column a kind's spans read beside its start. */
export interface SpanColumn {
    readonly column: string;
    readonly read: (row: number) => unknown;
}

/** A build: the kinds it reads and what it is keyed on. */
export interface FieldPlan extends Pick<FieldIndex, "key" | "data" | "reading" | "rewrites" | "path"> {
    readonly node: KindPlan | null;
    readonly edge: KindPlan | null;
}

/**
 * Run work to its end.
 * @param work - The work, possibly part done.
 * @returns What it returned.
 */
export function drain<T>(work: IndexWork<T>): T {
    let step = work.next();
    while (step.done !== true) {
        step = work.next();
    }

    return step.value;
}

/**
 * Run work a slice at a time, giving the event loop a turn each time a slice has held the thread
 * long enough, as a macrotask: a microtask would starve the frame the slices exist to let through.
 * @param work - The work.
 * @param dropped - Asked after each turn: whether the work is no longer wanted, or was run to its end
 *     by someone else.
 * @returns What it returned, or null when it was dropped.
 */
export async function inSlices<T>(work: IndexWork<T>, dropped: () => boolean): Promise<T | null> {
    let deadline = performance.now() + SLICE_MS;
    for (;;) {
        const step = work.next();
        if (step.done === true) {
            return step.value;
        }

        if (performance.now() >= deadline) {
            await new Promise<void>((resume) => {
                setTimeout(resume, 0);
            });
            if (dropped()) {
                return null;
            }

            deadline = performance.now() + SLICE_MS;
        }
    }
}

/**
 * Sort rows by their instants. A least-significant-digit radix sort over the float's bits, four
 * 16-bit passes, so stable: equal instants keep the order of `ids`. Bits sort as numbers once a
 * negative float's are all flipped (a bigger magnitude is a smaller number, or every date before
 * 1970 sorts backwards) and a positive one's sign is set. A digit every key shares costs no pass.
 * @param rows - Each row's instant.
 * @param ids - The rows to sort; none of them NaN.
 * @yields After each chunk.
 * @returns The rows, ascending.
 */
export function* radixArgsort(rows: Float64Array, ids: Uint32Array): IndexWork<Uint32Array> {
    const keys: RadixKeys = {
        low: new Uint32Array(ids.length),
        high: new Uint32Array(ids.length),
        order: ids.slice(),
    };
    const spare: RadixKeys = {
        low: new Uint32Array(ids.length),
        high: new Uint32Array(ids.length),
        order: new Uint32Array(ids.length),
    };
    const counts = yield* radixKeysOf(rows, ids, keys);
    let from = keys;
    let into = spare;
    for (let pass = 0; pass < 4; pass++) {
        const places = counts.subarray(pass * RADIX, (pass + 1) * RADIX);
        const digits = pass < 2 ? from.low : from.high;
        const shift = (pass & 1) * 16;
        if (ids.length > 0 && places[(digits[0] >>> shift) & 0xffff] !== ids.length) {
            yield* radixPass(pass, places, from, into);
            // What the pass left unmoved no later pass reads.
            [from, into] = [into, from];
        }
    }

    return from.order;
}

/**
 * Turn instants into sortable bits, and count each pass's digits.
 * @param rows - Each row's instant.
 * @param ids - The rows to sort.
 * @param keys - Where the bits go.
 * @returns The four passes' digit counts, one after another.
 */
function* radixKeysOf(rows: Float64Array, ids: Uint32Array, keys: RadixKeys): IndexWork<Uint32Array> {
    const float = new Float64Array(1);
    const words = new Uint32Array(float.buffer);
    const counts = new Uint32Array(4 * RADIX);
    const { low, high } = keys;
    for (let from = 0; from < ids.length; from += CHUNK) {
        const to = Math.min(from + CHUNK, ids.length);
        for (let at = from; at < to; at++) {
            // Adding 0 makes -0 the 0 it equals.
            float[0] = rows[ids[at]] + 0;
            const negative = words[HIGH_WORD] >>> 31 === 1;
            const lowBits = negative ? ~words[1 - HIGH_WORD] >>> 0 : words[1 - HIGH_WORD];
            const highBits = negative ? ~words[HIGH_WORD] >>> 0 : (words[HIGH_WORD] | 0x80000000) >>> 0;
            low[at] = lowBits;
            high[at] = highBits;
            counts[lowBits & 0xffff]++;
            counts[RADIX + (lowBits >>> 16)]++;
            counts[2 * RADIX + (highBits & 0xffff)]++;
            counts[3 * RADIX + (highBits >>> 16)]++;
        }

        yield;
    }

    return counts;
}

/**
 * One pass of the sort: move every key to its digit's next place. A key's low bits move only on the
 * first pass and its high bits not on the last, since nothing after reads them.
 * @param pass - Which digit, lowest first.
 * @param places - The digit's counts; becomes its places.
 * @param from - The keys.
 * @param into - Where they go.
 */
function* radixPass(pass: number, places: Uint32Array, from: RadixKeys, into: RadixKeys): IndexWork<void> {
    let place = 0;
    for (let digit = 0; digit < RADIX; digit++) {
        const held = places[digit];
        places[digit] = place;
        place += held;
    }

    yield;
    const digits = pass < 2 ? from.low : from.high;
    const shift = (pass & 1) * 16;
    const size = digits.length;
    for (let start = 0; start < size; start += CHUNK) {
        const end = Math.min(start + CHUNK, size);
        for (let at = start; at < end; at++) {
            const target = places[(digits[at] >>> shift) & 0xffff]++;
            into.order[target] = from.order[at];
            if (pass === 0) {
                into.low[target] = from.low[at];
            }

            if (pass < 3) {
                into.high[target] = from.high[at];
            }
        }

        yield;
    }
}

/**
 * A tally of no values.
 * @returns It.
 */
function newTally(): ColumnTally {
    return { ...newUnitTally(), text: 0, bare: 0, plain: 0, secondsLike: 0, yearLike: 0, fourDigit: 0 };
}

/**
 * Count a real number.
 * @param tally - The tally so far.
 * @param value - The number.
 */
function tallyNumber(tally: ColumnTally, value: number): void {
    if (Number.isFinite(value)) {
        const whole = Number.isInteger(value);
        tally.bare++;
        tally.plain++;
        tally.secondsLike += value >= 1e8 && value < 1e10 ? 1 : 0;
        tally.yearLike += whole && value >= YEAR_LIKE.min && value <= YEAR_LIKE.max ? 1 : 0;
        tally.fourDigit += whole && value >= 1000 && value <= 2999 ? 1 : 0;
    }

    tallyUnit(tally, value);
}

/**
 * Count text.
 * @param tally - The tally so far.
 * @param value - The text.
 */
function tallyText(tally: ColumnTally, value: string): void {
    if (isDateShaped(value)) {
        tally.numeric = false;
        tally.text++;
    } else if (isNumericText(value)) {
        tally.bare++;
        tallyUnit(tally, Number(value));
    } else {
        tally.numeric = false;
        tally.text += value.trim() === "" ? 0 : 1;
    }
}

/**
 * Count one raw value.
 * @param tally - The tally so far.
 * @param value - The value.
 */
function tallyValue(tally: ColumnTally, value: unknown): void {
    if (typeof value === "number") {
        tallyNumber(tally, value);
    } else if (typeof value === "string") {
        if (value !== "") {
            tallyText(tally, value);
        }
    } else if (value !== undefined && value !== null) {
        tally.numeric = false;
    }
}

/**
 * Copy the rows of a column, from a row on: the one read of the records.
 * @param plan - The kind.
 * @param plan.count - How many rows.
 * @param plan.read - Reads one.
 * @param start - The first row.
 * @returns The raw values.
 */
function* copyColumn(plan: Pick<KindPlan, "count" | "read">, start: number): IndexWork<unknown[]> {
    const raw = new Array<unknown>(plan.count - start);
    for (let from = start; from < plan.count; from += CHUNK) {
        const to = Math.min(from + CHUNK, plan.count);
        for (let row = from; row < to; row++) {
            raw[row - start] = plan.read(row);
        }

        yield;
    }

    return raw;
}

/**
 * Add raw values to a tally.
 * @param tally - The tally so far.
 * @param raw - The values.
 */
function* tallyAll(tally: ColumnTally, raw: readonly unknown[]): IndexWork<void> {
    for (let from = 0; from < raw.length; from += CHUNK) {
        const to = Math.min(from + CHUNK, raw.length);
        for (let at = from; at < to; at++) {
            tallyValue(tally, raw[at]);
        }

        yield;
    }
}

/**
 * How a tally's column reads.
 * @param tally - The tally.
 * @param given - The unit the designation gave.
 * @returns The unit, and whether a number in it is a stray value rather than an epoch: in a column
 *     of date text (a "1.10"), more of its values are text that is not a number than are numbers.
 */
function readingOf(
    tally: ColumnTally,
    given: TimeUnit | undefined,
): { readonly unit: TimeUnit; readonly datesOnly: boolean } {
    const unit = given ?? unitOfTally(tally) ?? "ms";

    return { unit, datesOnly: unit === "ms" && tally.text > tally.bare };
}

/**
 * Keep what one reading says.
 * @param tally - The tally so far.
 * @param how - How the value was read.
 * @param value - The value.
 */
function noteReading(tally: ParseTally, how: InstantReading, value: unknown): void {
    if (how === "missing") {
        tally.untimed++;
    } else if (how === "unparsed") {
        tally.unparsed++;
        if (tally.examples.length < MAX_EXAMPLES) {
            tally.examples.push(String(value));
        }
    } else if (how === "loose") {
        tally.loose++;
    }
}

/**
 * Whether a value is a number, or text that is only a number.
 * @param value - The value.
 * @returns True for a bare number.
 */
function isBareNumber(value: unknown): boolean {
    return (
        (typeof value === "number" && Number.isFinite(value)) ||
        (typeof value === "string" && !isDateShaped(value) && isNumericText(value))
    );
}

/**
 * The earliest and latest instant a designation reads from a column.
 * @param raw - Every value of the column.
 * @param zone - The zone text with no offset reads in.
 * @param given - The unit it reads in; left out, the values say.
 * @returns The span, or undefined when the column reads as plain steps or holds no instant.
 */
export function columnSpan(
    raw: readonly unknown[],
    zone: string,
    given?: TimeUnit,
): { readonly from: number; readonly to: number } | undefined {
    const tally = newTally();
    for (const value of raw) {
        tallyValue(tally, value);
    }

    const { unit, datesOnly } = readingOf(tally, given);
    if (unit === "ordinal") {
        return undefined;
    }

    let from = Infinity;
    let to = -Infinity;
    for (const value of raw) {
        const { at } = datesOnly && isBareNumber(value) ? { at: Number.NaN } : readInstant(value, unit, zone);
        if (!Number.isNaN(at)) {
            from = Math.min(from, at);
            to = Math.max(to, at);
        }
    }

    return from > to ? undefined : { from, to };
}

/**
 * Parse raw values into the rows from `start` on.
 * @param rows - Each row's instant.
 * @param start - The first row.
 * @param raw - The values.
 * @param reading - How they read.
 * @param reading.unit - How numbers are read.
 * @param reading.datesOnly - Whether a number counts as unparsed.
 * @param zone - The zone text with no offset reads in.
 * @param tally - What parsing has found so far.
 */
function* parseInto(
    rows: Float64Array,
    start: number,
    raw: readonly unknown[],
    { unit, datesOnly }: { readonly unit: TimeUnit; readonly datesOnly: boolean },
    zone: string | undefined,
    tally: ParseTally,
): IndexWork<void> {
    // A finite number under these units is its own instant.
    const plain = !datesOnly && (unit === "ms" || unit === "ordinal");
    let spent = 0;
    let counted = 0;
    for (let at = 0; at < raw.length; at++) {
        const value = raw[at];
        if (plain && typeof value === "number" && Number.isFinite(value)) {
            rows[start + at] = value;
            tally.whole &&= Number.isInteger(value);
            spent++;
        } else {
            const reading =
                datesOnly && isBareNumber(value)
                    ? { at: Number.NaN, how: "unparsed" as const }
                    : readInstant(value, unit, zone);
            rows[start + at] = reading.at;
            noteReading(tally, reading.how, value);
            tally.whole &&= Number.isNaN(reading.at) || Number.isInteger(reading.at);
            spent += SLOW_ROW;
        }

        if (spent >= CHUNK) {
            timeIndexCounters.parsed += at + 1 - counted;
            counted = at + 1;
            spent = 0;
            yield;
        }
    }

    timeIndexCounters.parsed += raw.length - counted;
    yield;
}

/**
 * The rows from one on that hold an instant.
 * @param rows - Each row's instant.
 * @param start - The first row.
 * @param timed - How many of them do.
 * @returns The rows, ascending.
 */
function timedRows(rows: Float64Array, start: number, timed: number): Uint32Array {
    const ids = new Uint32Array(timed);
    let next = 0;
    for (let row = start; row < rows.length; row++) {
        if (!Number.isNaN(rows[row])) {
            ids[next++] = row;
        }
    }

    return ids;
}

/**
 * Each sorted row's instant.
 * @param rows - Each row's instant.
 * @param perm - The sorted rows.
 * @returns The instants.
 */
function* gather(rows: Float64Array, perm: Uint32Array): IndexWork<Float64Array> {
    const sorted = new Float64Array(perm.length);
    for (let from = 0; from < perm.length; from += CHUNK) {
        const to = Math.min(from + CHUNK, perm.length);
        for (let at = from; at < to; at++) {
            sorted[at] = rows[perm[at]];
        }

        yield;
    }

    return sorted;
}

/**
 * What every number in a column looks like, when its unit reads them as milliseconds.
 * @param tally - The column's tally.
 * @param unit - The unit.
 * @returns The suggestion, or null.
 */
function suspectOf(tally: ColumnTally, unit: TimeUnit): KindIndex["suspect"] {
    if (unit !== "ms" || tally.plain === 0) {
        return null;
    }

    if (tally.secondsLike === tally.plain) {
        return "s";
    }

    if (tally.yearLike === tally.plain) {
        return tally.fourDigit === tally.plain ? "year" : "ordinal";
    }

    return null;
}

/**
 * One kind's index from its parts.
 * @param parts - The instants, sorted and not, and how the column read.
 * @param parts.rows - Each row's instant.
 * @param parts.sorted - The instants, ascending.
 * @param parts.perm - The row of each.
 * @param parts.parsed - What parsing found.
 * @param parts.tally - What the values looked like.
 * @param parts.reading - How they read.
 * @param parts.reading.unit - How numbers are read.
 * @param parts.reading.datesOnly - Whether a number counts as unparsed.
 * @returns The index.
 */
function kindOf(parts: {
    readonly rows: Float64Array;
    readonly sorted: Float64Array;
    readonly perm: Uint32Array;
    readonly parsed: ParseTally;
    readonly tally: ColumnTally;
    readonly reading: { readonly unit: TimeUnit; readonly datesOnly: boolean };
}): KindIndex {
    const { rows, sorted, perm, parsed, tally, reading } = parts;
    const { untimed, unparsed } = parsed;
    const timed = perm.length;

    return {
        rows,
        timed,
        sorted,
        perm,
        sortedEnd: sorted,
        endPerm: perm,
        spans: null,
        counts: Object.freeze({ timed, untimed, unparsed }),
        loose: parsed.loose,
        examples: Object.freeze([...parsed.examples]),
        suspect: suspectOf(tally, reading.unit),
        unit: reading.unit,
        datesOnly: reading.datesOnly,
        whole: parsed.whole,
        tally,
    };
}

/** Spans a build has found so far, row by row. */
interface SpanList {
    readonly starts: Float64Array;
    readonly ends: Float64Array;
    /** The row of each span. */
    readonly owner: Uint32Array;
    /** Where each row's spans start; one more entry than rows. */
    readonly first: Uint32Array;
    size: number;
    low: number;
    high: number;
}

/**
 * Add one span: a missing start is open when an end is present, a missing end always is.
 * @param list - The spans so far.
 * @param row - Its row.
 * @param start - The start, or NaN.
 * @param end - The end, or NaN.
 */
function addSpan(list: SpanList, row: number, start: number, end: number): void {
    const from = Number.isNaN(start) ? Number.NEGATIVE_INFINITY : start;
    const to = spanEnd(from, Number.isNaN(end) ? Number.POSITIVE_INFINITY : end);
    list.starts[list.size] = from;
    list.ends[list.size] = to;
    list.owner[list.size++] = row;
    const last = Number.isFinite(end) && end > from ? end : from;
    // An open start reaches below its end: the tick before it, so a window from the extent holds it.
    list.low = Math.min(list.low, Number.isFinite(from) ? from : end - 1);
    list.high = Math.max(list.high, last);
}

/** The raw bounds of every row's spells, one list, and where each row's start. */
interface RawSpells {
    readonly bounds: unknown[];
    readonly first: Uint32Array;
}

/**
 * Flatten a spells column.
 * @param raw - Each row's value.
 * @returns Its bounds, two to a spell.
 */
function* flatSpells(raw: readonly unknown[]): IndexWork<RawSpells> {
    const bounds: unknown[] = [];
    const first = new Uint32Array(raw.length + 1);
    for (let row = 0; row < raw.length; row++) {
        for (const [start, end] of spellPairs(raw[row])) {
            bounds.push(start, end);
        }

        first[row + 1] = bounds.length / 2;
        if (row % CHUNK === 0) {
            yield;
        }
    }

    return { bounds, first };
}

/**
 * Add a row's spells, each one holding at least one bound.
 * @param list - The spans.
 * @param row - The row.
 * @param spells - Every spell's two bounds.
 * @param from - The row's first spell.
 * @param to - Past the row's last spell.
 */
function addSpells(list: SpanList, row: number, spells: Float64Array, from: number, to: number): void {
    for (let at = from; at < to; at++) {
        const start = spells[2 * at];
        const end = spells[2 * at + 1];
        if (!Number.isNaN(start) || !Number.isNaN(end)) {
            addSpan(list, row, start, end);
        }
    }
}

/**
 * Add a row's one span from its start and end: an instant for a kind with no end column, else the
 * span when either bound is known.
 * @param list - The spans.
 * @param row - The row.
 * @param start - The row's start.
 * @param ends - Each row's end, or null for a kind with no end column.
 */
function addRowSpan(list: SpanList, row: number, start: number, ends: Float64Array | null): void {
    if (ends === null) {
        if (!Number.isNaN(start)) {
            addSpan(list, row, start, start);
        }
    } else if (!Number.isNaN(start) || !Number.isNaN(ends[row])) {
        addSpan(list, row, start, ends[row]);
    }
}

/**
 * The spans of each row, by the first rule that applies: spells, else no bound and no time, else an
 * instant for a kind with no end column, else one span.
 * @param count - How many rows.
 * @param columns - What the rows hold.
 * @param columns.rows - Each row's start.
 * @param columns.ends - Each row's end, or null for a kind with no end column.
 * @param columns.spells - Every spell's two bounds, or null.
 * @param columns.spellFirst - Where each row's spells start.
 * @returns The spans, and how many rows hold none.
 */
function* rowSpans(
    count: number,
    columns: {
        readonly rows: Float64Array;
        readonly ends: Float64Array | null;
        readonly spells: Float64Array | null;
        readonly spellFirst: Uint32Array | null;
    },
): IndexWork<SpanList> {
    const { rows, ends, spells, spellFirst } = columns;
    const room = count + (spells?.length ?? 0) / 2;
    const list: SpanList = {
        starts: new Float64Array(room),
        ends: new Float64Array(room),
        owner: new Uint32Array(room),
        first: new Uint32Array(count + 1),
        size: 0,
        low: Number.POSITIVE_INFINITY,
        high: Number.NEGATIVE_INFINITY,
    };
    for (let row = 0; row < count; row++) {
        const spellAt = spellFirst?.[row] ?? 0;
        const spellEnd = spellFirst?.[row + 1] ?? 0;
        if (spells !== null && spellEnd > spellAt) {
            addSpells(list, row, spells, spellAt, spellEnd);
        } else {
            addRowSpan(list, row, rows[row], ends);
        }

        list.first[row + 1] = list.size;
        if (row % CHUNK === 0) {
            yield;
        }
    }

    return list;
}

/**
 * Whether a row holds any value at all, for a row with no spans: one holding only values that do
 * not read as time is unparsed, not untimed.
 * @param raws - The columns' raw values.
 * @param row - The row.
 * @returns True when one of them holds a value.
 */
function holdsValue(raws: readonly (readonly unknown[] | null)[], row: number): boolean {
    return raws.some((raw) => {
        const value = raw?.[row];
        return value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0);
    });
}

/**
 * Parse a whole column into a new array.
 * @param raw - The raw values.
 * @param reading - How to read them.
 * @param reading.unit - Their unit.
 * @param reading.datesOnly - Whether they hold dates alone.
 * @param zone - The zone a value with none is read in.
 * @param tally - What parsing finds.
 * @yields After each chunk.
 * @returns The instants.
 */
function* parseColumn(
    raw: readonly unknown[],
    reading: { readonly unit: TimeUnit; readonly datesOnly: boolean },
    zone: string | undefined,
    tally: ParseTally,
): IndexWork<Float64Array> {
    const out = new Float64Array(raw.length);
    yield* parseInto(out, 0, raw, reading, zone, tally);
    return out;
}

/**
 * Count the rows holding a span, and the rows holding none whose values do not read as time.
 * @param first - Where each row's spans start.
 * @param count - How many rows.
 * @param raws - The columns' raw values.
 * @returns Both counts.
 */
function countRows(
    first: Uint32Array,
    count: number,
    raws: readonly (readonly unknown[] | null)[],
): { readonly timed: number; readonly unparsed: number } {
    let timed = 0;
    let unparsed = 0;
    for (let row = 0; row < count; row++) {
        if (first[row] !== first[row + 1]) {
            timed++;
        } else if (holdsValue(raws, row)) {
            unparsed++;
        }
    }

    return { timed, unparsed };
}

/**
 * Sort spans by one of their bounds.
 * @param list - The spans.
 * @param bound - That bound, per span.
 * @yields After each chunk.
 * @returns The bounds ascending, and the row of each.
 */
function* sortSpans(
    list: SpanList,
    bound: Float64Array,
): IndexWork<{ readonly sorted: Float64Array; readonly perm: Uint32Array }> {
    const ids = new Uint32Array(list.size);
    for (let at = 0; at < ids.length; at++) {
        ids[at] = at;
    }

    const order = yield* radixArgsort(bound, ids);
    const sorted = yield* gather(bound, order);
    for (let at = 0; at < order.length; at++) {
        order[at] = list.owner[order[at]];
    }

    return { sorted, perm: order };
}

/**
 * A new tally of parsing.
 * @returns It.
 */
function newParseTally(): ParseTally {
    return { untimed: 0, unparsed: 0, loose: 0, whole: true, examples: [] };
}

/**
 * The notice for one column of a kind of spans.
 * @param column - The column, when the kind has one.
 * @param tally - What parsing it found.
 * @returns The notice, if any value failed.
 */
function spanNotice(column: string | undefined, tally: ParseTally): CodedFact<TimeNoticeCode>[] {
    return column === undefined || tally.unparsed === 0
        ? []
        : [{ code: "time.unparsed", params: { path: column, count: tally.unparsed, examples: tally.examples } }];
}

/**
 * Read a kind with an end or spells: each column once, then its spans, sorted both ways. Its unit
 * comes from every value it holds, so a column of spells alone reads as a start column does.
 * @param plan - The kind.
 * @param path - The start column.
 * @yields After each chunk.
 * @returns The index.
 */
function* buildSpans(plan: KindPlan, path: string): IndexWork<KindIndex> {
    const { count, zone } = plan;
    const raw = yield* copyColumn(plan, 0);
    const rawEnds = plan.end === undefined ? null : yield* copyColumn({ count, read: plan.end.read }, 0);
    const rawSpells = plan.spells === undefined ? null : yield* copyColumn({ count, read: plan.spells.read }, 0);
    const flat = rawSpells === null ? null : yield* flatSpells(rawSpells);
    const tally = newTally();
    yield* tallyAll(tally, raw);
    yield* tallyAll(tally, rawEnds ?? []);
    yield* tallyAll(tally, flat?.bounds ?? []);
    const reading = readingOf(tally, plan.unit);
    const parsed = newParseTally();
    const endParsed = newParseTally();
    const spellParsed = newParseTally();
    const rows = yield* parseColumn(raw, reading, zone, parsed);
    const ends = rawEnds === null ? null : yield* parseColumn(rawEnds, reading, zone, endParsed);
    const spells = flat === null ? null : yield* parseColumn(flat.bounds, reading, zone, spellParsed);

    const list = yield* rowSpans(count, { rows, ends, spells, spellFirst: flat?.first ?? null });
    const starts = list.starts.subarray(0, list.size);
    const stops = list.ends.subarray(0, list.size);
    const byStart = yield* sortSpans(list, starts);
    const byEnd = yield* sortSpans(list, stops);
    const { timed, unparsed } = countRows(list.first, count, [raw, rawEnds, rawSpells]);

    const whole = parsed.whole && endParsed.whole && spellParsed.whole;
    const kind = kindOf({
        rows,
        sorted: byStart.sorted,
        perm: byStart.perm,
        parsed: { ...parsed, whole, untimed: count - timed - unparsed, unparsed },
        tally,
        reading,
    });

    return {
        ...kind,
        timed,
        counts: Object.freeze({ ...kind.counts, timed }),
        sortedEnd: byEnd.sorted,
        endPerm: byEnd.perm,
        spans: {
            starts,
            ends: stops,
            first: list.first,
            ...(plan.end === undefined ? {} : { end: `data.${plan.end.column}` }),
            ...(plan.spells === undefined ? {} : { spells: `data.${plan.spells.column}` }),
            bounds: [list.low, list.high],
            notices: [
                ...spanNotice(path, parsed),
                ...spanNotice(plan.end?.column, endParsed),
                ...spanNotice(plan.spells?.column, spellParsed),
            ],
        },
    };
}

/**
 * Read one kind's column once and sort it.
 * @param plan - The kind.
 * @param path - The column.
 * @yields After each chunk.
 * @returns The index.
 */
function* buildKind(plan: KindPlan, path: string): IndexWork<KindIndex> {
    if (plan.end !== undefined || plan.spells !== undefined) {
        return yield* buildSpans(plan, path);
    }

    const raw = yield* copyColumn(plan, 0);
    const tally = newTally();
    yield* tallyAll(tally, raw);
    const reading = readingOf(tally, plan.unit);
    const rows = new Float64Array(plan.count);
    const parsed = newParseTally();
    yield* parseInto(rows, 0, raw, reading, plan.zone, parsed);
    const ids = timedRows(rows, 0, plan.count - parsed.untimed - parsed.unparsed);
    yield;
    const perm = yield* radixArgsort(rows, ids);
    const sorted = yield* gather(rows, perm);

    return kindOf({ rows, sorted, perm, parsed, tally, reading });
}

/**
 * Two runs of sorted rows as one, the older first among equals: a new row is below every old one,
 * so a fresh sort would put them in the same order.
 * @param kind - The index so far.
 * @param rows - Each row's instant.
 * @param added - The new rows, sorted.
 * @returns The rows and their instants, ascending.
 */
function* mergeSorted(
    kind: KindIndex,
    rows: Float64Array,
    added: Uint32Array,
): IndexWork<{ readonly perm: Uint32Array; readonly sorted: Float64Array }> {
    const total = kind.perm.length + added.length;
    const perm = new Uint32Array(total);
    const sorted = new Float64Array(total);
    let old = 0;
    let fresh = 0;
    for (let from = 0; from < total; from += CHUNK) {
        const to = Math.min(from + CHUNK, total);
        for (let at = from; at < to; at++) {
            const takeOld =
                fresh === added.length || (old < kind.perm.length && kind.sorted[old] <= rows[added[fresh]]);
            const row = takeOld ? kind.perm[old] : added[fresh];
            perm[at] = row;
            sorted[at] = takeOld ? kind.sorted[old++] : rows[added[fresh++]];
        }

        yield;
    }

    return { perm, sorted };
}

/**
 * Bring one kind's index up to its column by reading only the rows added since.
 * @param kind - The index so far.
 * @param plan - The kind now.
 * @yields After each chunk.
 * @returns The index, or null when the new rows change how the whole column reads, or the kind
 *     holds spans, which a build reads whole.
 */
function* mergeKind(kind: KindIndex, plan: KindPlan): IndexWork<KindIndex | null> {
    const start = kind.rows.length;
    if (plan.count === start) {
        return kind;
    }

    // ponytail: spans rebuild on an append; merge them as instants merge if streamed interval data needs it.
    if (kind.spans !== null) {
        return null;
    }

    const raw = yield* copyColumn(plan, start);
    const tally = { ...kind.tally };
    yield* tallyAll(tally, raw);
    const reading = readingOf(tally, plan.unit);
    if (reading.unit !== kind.unit || reading.datesOnly !== kind.datesOnly) {
        return null;
    }

    const rows = new Float64Array(plan.count);
    rows.set(kind.rows);
    const { untimed, unparsed } = kind.counts;
    const parsed: ParseTally = {
        untimed,
        unparsed,
        loose: kind.loose,
        whole: kind.whole,
        examples: [...kind.examples],
    };
    yield* parseInto(rows, start, raw, reading, plan.zone, parsed);
    const added = timedRows(rows, start, plan.count - parsed.untimed - parsed.unparsed - kind.timed);
    const order = yield* radixArgsort(rows, added);
    const { perm, sorted } = yield* mergeSorted(kind, rows, order);

    return kindOf({ rows, sorted, perm, parsed, tally, reading });
}

/**
 * A field's index from its kinds' indexes.
 * @param plan - What was built.
 * @param node - The node index.
 * @param edge - The edge index.
 * @returns The index.
 */
function fieldOf(plan: FieldPlan, node: KindIndex | null, edge: KindIndex | null): FieldIndex {
    const { key, data, reading, rewrites, path } = plan;
    const inferredOf = (kind: KindIndex | null, given: KindPlan | null): TimeUnit | undefined =>
        given?.unit === undefined && kind !== null ? unitOfTally(kind.tally) : undefined;

    return {
        key,
        data,
        reading,
        rewrites,
        path,
        unit: edge?.unit ?? node?.unit ?? "ms",
        inferred: {
            ...(plan.node === null ? {} : { node: inferredOf(node, plan.node) }),
            ...(plan.edge === null ? {} : { edge: inferredOf(edge, plan.edge) }),
        },
        node,
        edge,
        whole: (node?.whole ?? true) && (edge?.whole ?? true),
    };
}

/**
 * The first sorted position at or after a value.
 * @param sorted - Ascending values.
 * @param at - The value.
 * @returns The position, `sorted.length` when every value is below.
 */
export function lowerBound(sorted: ArrayLike<number>, at: number): number {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (sorted[mid] < at) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    return lo;
}

/**
 * The first sorted position past a value.
 * @param sorted - Ascending values.
 * @param at - The value.
 * @returns The position, `sorted.length` when no value is above.
 */
function upperBound(sorted: ArrayLike<number>, at: number): number {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (sorted[mid] <= at) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    return lo;
}

/**
 * How many spans have ended by a window starting at a value: those whose end is not above it.
 * Instants hold their own values as ends, each really the next float up, so one at the value has
 * not ended.
 * @param index - The kind.
 * @param index.sorted - Where spans start.
 * @param index.sortedEnd - Where they end.
 * @param from - The value.
 * @returns The position in `sortedEnd`.
 */
export function endedBy(
    { sorted, sortedEnd }: { readonly sorted: Float64Array; readonly sortedEnd: Float64Array },
    from: number,
): number {
    return sortedEnd === sorted ? lowerBound(sorted, from) : upperBound(sortedEnd, from);
}

/**
 * How many spans of a kind each bin overlaps, counting only some rows: the kept starts before a
 * bin's end, less the kept ends by its start.
 * @param index - The kind's index.
 * @param bounds - The bins' edges, ascending.
 * @param keep - One byte per row.
 * @returns The counts, one per bin.
 */
function keptSpans(index: BinnedKind, bounds: readonly number[], keep: Uint8Array): number[] {
    const { sorted, perm, endPerm } = index;
    const counts = new Array<number>(bounds.length - 1).fill(0);
    let started = 0;
    let ended = 0;
    let startAt = 0;
    let endAt = 0;
    for (let bin = 0; bin < counts.length; bin++) {
        for (const stop = endedBy(index, bounds[bin]); endAt < stop; endAt++) {
            ended += keep[endPerm[endAt]];
        }

        for (const stop = lowerBound(sorted, bounds[bin + 1]); startAt < stop; startAt++) {
            started += keep[perm[startAt]];
        }

        counts[bin] = started - ended;
    }

    timeIndexCounters.binned += startAt + endAt;

    return counts;
}

/** What a histogram reads of a kind. */
type BinnedKind = Pick<KindIndex, "sorted" | "perm" | "sortedEnd" | "endPerm">;

/**
 * How many rows of a kind fall in each bin: of a kind of spans, how many spans overlap it.
 * @param index - The kind's index.
 * @param bounds - The bins' edges, ascending.
 * @param keep - One byte per row, `1` for a row that counts; null to count them all.
 * @returns The counts, one per bin.
 */
export function countBins(index: BinnedKind, bounds: readonly number[], keep: Uint8Array | null): number[] {
    const { sorted, perm, sortedEnd } = index;
    if (sortedEnd !== sorted) {
        return keep === null
            ? Array.from(
                  { length: bounds.length - 1 },
                  (_, bin) => lowerBound(sorted, bounds[bin + 1]) - endedBy(index, bounds[bin]),
              )
            : keptSpans(index, bounds, keep);
    }

    const counts = new Array<number>(bounds.length - 1).fill(0);
    let start = lowerBound(sorted, bounds[0]);
    for (let bin = 0; bin < counts.length; bin++) {
        const end = lowerBound(sorted, bounds[bin + 1]);
        if (keep === null) {
            counts[bin] = end - start;
        } else {
            let count = 0;
            for (let at = start; at < end; at++) {
                count += keep[perm[at]];
            }

            counts[bin] = count;
            timeIndexCounters.binned += end - start;
        }

        start = end;
    }

    return counts;
}

/**
 * Build a field's index from nothing.
 * @param plan - The build.
 * @yields After each chunk.
 * @returns The index.
 */
export function* buildField(plan: FieldPlan): IndexWork<FieldIndex> {
    const node = plan.node === null ? null : yield* buildKind(plan.node, plan.path);
    const edge = plan.edge === null ? null : yield* buildKind(plan.edge, plan.path);

    return fieldOf(plan, node, edge);
}

/**
 * Bring a field's index up to date when all that changed is rows added at the end: O(n), reading
 * and parsing only the new rows.
 * @param built - The index so far.
 * @param plan - The field now, the same reading of the same column.
 * @yields After each chunk.
 * @returns The index, or null when the new rows change how a whole column reads.
 */
export function* mergeField(built: FieldIndex, plan: FieldPlan): IndexWork<FieldIndex | null> {
    const node = built.node === null || plan.node === null ? null : yield* mergeKind(built.node, plan.node);
    const edge = built.edge === null || plan.edge === null ? null : yield* mergeKind(built.edge, plan.edge);
    if ((plan.node !== null && node === null) || (plan.edge !== null && edge === null)) {
        return null;
    }

    return fieldOf(plan, node, edge);
}

/**
 * A kind's first and last finite bounds.
 * @param kind - The kind.
 * @returns Them; null when no row is timed.
 */
export function kindBounds(kind: KindIndex): readonly [number, number] | null {
    if (kind.sorted.length === 0) {
        return null;
    }

    return kind.spans?.bounds ?? [kind.sorted[0], kind.sorted[kind.sorted.length - 1]]; // NOSONAR(S7755): noUncheckedIndexedAccess is off, so [length - 1] keeps the element type that .at() widens to undefined
}

/**
 * The first and last bounds of a row: of all its spans, open ones infinite.
 * @param kind - The kind.
 * @param row - The row.
 * @returns Them; null for a row with no time.
 */
export function rowBounds(kind: KindIndex, row: number): readonly [number, number] | null {
    const { spans, rows } = kind;
    if (spans === null) {
        return Number.isNaN(rows[row]) ? null : [rows[row], rows[row]];
    }

    const { starts, ends, first } = spans;
    let from = Number.POSITIVE_INFINITY;
    let last = Number.NEGATIVE_INFINITY;
    for (let at = first[row]; at < first[row + 1]; at++) {
        from = Math.min(from, starts[at]);
        // An instant's end is one float past it: its own bound is its start.
        last = Math.max(last, ends[at] === spanEnd(starts[at], starts[at]) ? starts[at] : ends[at]);
    }

    return first[row] === first[row + 1] ? null : [from, last];
}

/**
 * The notices one designated field's values call for.
 * @param built - The index.
 * @returns The notices.
 */
export function noticesOf(built: FieldIndex | null): readonly CodedFact<TimeNoticeCode>[] {
    const notices: CodedFact<TimeNoticeCode>[] = [];
    for (const kind of [built?.node, built?.edge]) {
        if (kind === null || kind === undefined || built === null) {
            continue;
        }

        if (kind.spans === null && kind.counts.unparsed > 0) {
            notices.push({
                code: "time.unparsed",
                params: { path: built.path, count: kind.counts.unparsed, examples: kind.examples },
            });
        }

        if (kind.loose > 0) {
            notices.push({ code: "time.parsed-loosely", params: { path: built.path, count: kind.loose } });
        }

        if (kind.suspect !== null) {
            notices.push({ code: "time.unit-suspect", params: { path: built.path, suggested: kind.suspect } });
        }

        notices.push(...(kind.spans?.notices ?? []));
    }

    return Object.freeze(notices);
}
