/**
 * @file The index of a designated time column: every row's instant, and the instants sorted with
 * the row of each.
 *
 * ONE READ. A build copies the column's raw values once; the unit, the notices and the parsing all
 * read that copy, so a million record lookups happen once however many questions the values answer.
 *
 * BUILT IN STEPS. A build is a generator that yields after each chunk of rows. The session runs one
 * to the end at once ({@link drain}) or a slice at a time ({@link inSlices}), and can switch from
 * the second to the first part way through, which is what a window needed now does.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { CodedFact } from "../shared";
import type { TimeInstants } from "../visibility/filter";
import {
    type InstantReading,
    isDateShaped,
    isNumericText,
    newUnitTally,
    readInstant,
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

/** The range a whole number reads as a year in, for the `"ordinal"` suggestion. */
const YEAR_LIKE = { min: -5000, max: 3000 } as const;

/** How many unparsed values a notice quotes. */
const MAX_EXAMPLES = 3;

/** Values one digit of the radix sort can take: four 16-bit passes cover a float's 64 bits. */
const RADIX = 65_536;

/** Which half of a float's bits comes second in memory, by this machine's byte order. */
const HIGH_WORD = new Uint32Array(Float64Array.of(1).buffer)[1] === 0 ? 0 : 1;

/** How many values builds have parsed, for a test that counts work rather than time. */
export const timeIndexCounters = { parsed: 0 };

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

/** One kind's instants: per row, and sorted with the row of each. */
export interface KindIndex extends TimeInstants {
    readonly sorted: Float64Array;
    readonly perm: Uint32Array;
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
 * @param start - The first row.
 * @returns The raw values.
 */
function* copyColumn(plan: KindPlan, start: number): IndexWork<unknown[]> {
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
    for (let from = 0; from < raw.length; from += CHUNK) {
        const to = Math.min(from + CHUNK, raw.length);
        for (let at = from; at < to; at++) {
            const value = raw[at];
            if (plain && typeof value === "number" && Number.isFinite(value)) {
                rows[start + at] = value;
                tally.whole &&= Number.isInteger(value);
                continue;
            }

            const reading =
                datesOnly && isBareNumber(value)
                    ? { at: Number.NaN, how: "unparsed" as const }
                    : readInstant(value, unit, zone);
            rows[start + at] = reading.at;
            noteReading(tally, reading.how, value);
            tally.whole &&= Number.isNaN(reading.at) || Number.isInteger(reading.at);
        }

        timeIndexCounters.parsed += to - from;
        yield;
    }
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

/**
 * Read one kind's column once and sort it.
 * @param plan - The kind.
 * @yields After each chunk.
 * @returns The index.
 */
function* buildKind(plan: KindPlan): IndexWork<KindIndex> {
    const raw = yield* copyColumn(plan, 0);
    const tally = newTally();
    yield* tallyAll(tally, raw);
    const reading = readingOf(tally, plan.unit);
    const rows = new Float64Array(plan.count);
    const parsed: ParseTally = { untimed: 0, unparsed: 0, loose: 0, whole: true, examples: [] };
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
 * @returns The index, or null when the new rows change how the whole column reads.
 */
function* mergeKind(kind: KindIndex, plan: KindPlan): IndexWork<KindIndex | null> {
    const start = kind.rows.length;
    if (plan.count === start) {
        return kind;
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
 * Build a field's index from nothing.
 * @param plan - The build.
 * @yields After each chunk.
 * @returns The index.
 */
export function* buildField(plan: FieldPlan): IndexWork<FieldIndex> {
    const node = plan.node === null ? null : yield* buildKind(plan.node);
    const edge = plan.edge === null ? null : yield* buildKind(plan.edge);

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

        if (kind.counts.unparsed > 0) {
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
    }

    return Object.freeze(notices);
}
