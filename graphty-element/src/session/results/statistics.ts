/**
 * @file The numeric work a result does once, so that no consumer does it again.
 *
 * Every function here answers a question a reader asks of a column of numbers: what is the
 * range, who is at the top, how are the values spread out, and how far through the pack does one
 * element sit. They are gathered in one module because they are the same arithmetic whatever
 * produced the column -- a centrality score, a community size, a path position -- and because
 * the places they are easy to get wrong are the same every time.
 *
 * Those places are worth naming, since each one cost a consumer a bug:
 *
 * - **Every value identical.** Naive min-max normalisation divides by zero and naive log banding
 *   asks for the logarithm of a zero-width range. Both are ordinary results: a graph where every
 *   node has two edges is not a degenerate input.
 * - **Values spanning orders of magnitude.** That is the case log banding exists for, and it is
 *   the case a shifted transform silently ruins: banding on `log10(value + 1)` is very nearly
 *   linear for a column that lies below 1, such as normalised PageRank, so a chart captioned
 *   "log scale" comes out linear with every node in the first bar. The transform here is
 *   `log10(value)` over the positive part of the domain, with zeros and negatives in a leading
 *   bin of their own.
 * - **Nothing measured at all.** An empty column has no minimum, and the honest answer is NaN
 *   here and null in a summary -- never 0, which is a value a reader will go looking for.
 *
 * Nothing in this module reaches Babylon.js, Lit or the DOM: it is arithmetic over numbers,
 * published from the Node-safe `./session` entry point.
 */

import type { NodeId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type {
    Histogram,
    HistogramBin,
    HistogramOptions,
    Normalization,
    NumericColumnView,
    RankingEntry,
    TopRanking,
} from "./types";

// ---------------------------------------------------------------------------------------------
// The bounds
// ---------------------------------------------------------------------------------------------

/**
 * How many bins a histogram is cut into when the caller does not say.
 *
 * Twenty is the number a distribution row can actually draw: past it the bars are thinner than
 * the gaps between them, and a reader counting bars loses track.
 */
export const DEFAULT_HISTOGRAM_BINS = 20;

/**
 * The most bins any histogram produces, however many the caller asks for.
 *
 * The cap is not politeness. A histogram is reachable from an agent tool call and from a console,
 * and a request for a million bins over a graph of a thousand nodes would allocate a million
 * mostly-empty rows to describe a thousand numbers.
 */
export const HISTOGRAM_BIN_CAP = 100;

/**
 * The ratio of the highest value to the middle one above which a linear axis hides the data.
 *
 * Above it a handful of elements own the whole range and every other element lands in the first
 * bar, which is the distribution a log axis exists to show. {@link suggestHistogramScale} applies
 * the test; nothing applies it on a caller's behalf.
 */
export const LOG_SCALE_RATIO_THRESHOLD = 100;

/** What a histogram of a column that measured nothing carries. */
const NO_BINS: readonly HistogramBin[] = Object.freeze([]);

/** The ways a metric's values are scaled before they are published. */
const NORMALIZATIONS: readonly Normalization[] = Object.freeze(["max", "min-max", "none"]);

/**
 * Tell whether a value is one of the normalisations a result may declare.
 * @param value - The value to test.
 * @returns True when the value is a member of {@link NORMALIZATIONS}.
 */
export function isNormalization(value: unknown): value is Normalization {
    return typeof value === "string" && (NORMALIZATIONS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------------------------
// A column, and what can be said about one
// ---------------------------------------------------------------------------------------------

/**
 * A numeric column, read by position and never copied.
 *
 * This is the whole interface the arithmetic needs, which is what lets a result hand over its
 * own storage rather than building an array of numbers for every question asked of it.
 */
export interface NumericColumnSource {
    /** How many entries the column has, measured and unmeasured alike. */
    readonly length: number;
    /**
     * One entry, by position.
     * @param index - The position, from 0 to `length - 1`.
     * @returns The value, or NaN where the element carries none.
     */
    get(index: number): number;
}

/**
 * Read an array as a column.
 * @param values - The values, in the order the column publishes them.
 * @returns A source over the array, which is not copied.
 */
export function arrayColumn(values: ArrayLike<number>): NumericColumnSource {
    return {
        length: values.length,
        get: (index: number): number => values[index],
    };
}

/**
 * What one column adds up to.
 *
 * `measured` counts the entries carrying a finite number, and every other figure is computed over
 * those alone: an element the run had nothing to say about is not a zero.
 */
interface ColumnStatistics {
    /** How many entries the column has, measured and unmeasured alike. */
    readonly length: number;
    /** How many of them carry a finite number. */
    readonly measured: number;
    /** The lowest measured value, or NaN when nothing was measured. */
    readonly min: number;
    /** The highest measured value, or NaN when nothing was measured. */
    readonly max: number;
    /** The average measured value, or NaN when nothing was measured. */
    readonly mean: number;
    /** The middle measured value, or NaN when nothing was measured. */
    readonly median: number;
    /**
     * How many measured entries sit exactly at {@link ColumnStatistics.min}.
     *
     * This is the number that says whether a colour ramp is about to paint most of the graph one
     * colour, which is a thing a reader needs to be told rather than left to notice.
     */
    readonly tiedAtMin: number;
    /**
     * The lowest measured value above zero, or null when there is none.
     *
     * A log axis starts here rather than at a fabricated floor, so its first band names a value
     * the reader can find in their own data.
     */
    readonly smallestPositive: number | null;
}

/** A column and everything computed from it in the one pass that read it. */
export interface AnalyzedColumn {
    /** The view a consumer reads, with the statistics already on it. */
    readonly view: NumericColumnView;
    /** The fuller statistics, including the two figures the view does not publish. */
    readonly statistics: ColumnStatistics;
}

/** The statistics of a column that measured nothing. */
const EMPTY_STATISTICS: Omit<ColumnStatistics, "length"> = Object.freeze({
    measured: 0,
    min: Number.NaN,
    max: Number.NaN,
    mean: Number.NaN,
    median: Number.NaN,
    tiedAtMin: 0,
    smallestPositive: null,
});

/**
 * Reduce a column to the figures every reader of it needs.
 *
 * The median is the LOWER median -- the entry at `floor((measured - 1) / 2)` of the ascending
 * values, rather than the average of the two middle ones on an even count. That is deliberate: a
 * median degree is then always a whole number the reader can go and find in their own data, where
 * "3.5 links" names a node that does not exist.
 *
 * The sum is compensated, because a column of a million small scores summed naively drifts far
 * enough from the true mean to move a published average.
 * @param column - The column to read.
 * @returns What the column adds up to.
 */
export function computeColumnStatistics(column: NumericColumnSource): ColumnStatistics {
    const { length } = column;
    const finite = new Float64Array(length);
    let measured = 0;

    for (let index = 0; index < length; index++) {
        const value = column.get(index);
        if (Number.isFinite(value)) {
            finite[measured] = value;
            measured++;
        }
    }

    if (measured === 0) {
        return { length, ...EMPTY_STATISTICS };
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let smallestPositive = Number.POSITIVE_INFINITY;
    let sum = 0;
    let compensation = 0;

    for (let index = 0; index < measured; index++) {
        const value = finite[index];
        if (value < min) {
            min = value;
        }

        if (value > max) {
            max = value;
        }

        if (value > 0 && value < smallestPositive) {
            smallestPositive = value;
        }

        const adjusted = value - compensation;
        const total = sum + adjusted;
        compensation = total - sum - adjusted;
        sum = total;
    }

    const tiedAtMin = countEqual(finite, measured, min);
    const median = selectAscending(finite, measured, Math.floor((measured - 1) / 2));

    return {
        length,
        measured,
        min,
        max,
        mean: sum / measured,
        median,
        tiedAtMin,
        smallestPositive: Number.isFinite(smallestPositive) ? smallestPositive : null,
    };
}

/**
 * Find the value at one position of the ascending order of some finite numbers, without sorting.
 *
 * A quickselect: Hoare partitions around a median-of-three pivot, keeping only the side that
 * holds the position, so it reads each value a constant number of times on average. Ties split
 * evenly between the two sides, so a column of one repeated value is no worse than any other.
 * The answer is the value a numeric sort would put there, down to the sign of a zero: a sort
 * orders -0 before 0, and a comparison cannot tell them apart, so a zero answer is settled by
 * counting the values that sort before it.
 * @param values - The numbers, all finite, in their first `count` entries. They are reordered.
 * @param count - How many entries are in play.
 * @param position - The position wanted, from 0 to `count - 1`.
 * @returns The value at that position of the ascending order.
 */
function selectAscending(values: Float64Array, count: number, position: number): number {
    let left = 0;
    let right = count - 1;
    // Median-of-three falls to quadratic only on inputs built to defeat it. Past this many rounds
    // the rest is sorted, which bounds the worst case at a sort's cost; ordinary data never gets here.
    let rounds = 4 * Math.ceil(Math.log2(count + 1)) + 8;

    while (right > left) {
        if (rounds-- === 0) {
            values.subarray(left, right + 1).sort();
            break;
        }

        const [high, low] = partition(values, left, right);
        if (position <= high) {
            right = high;
        } else if (position >= low) {
            left = low;
        } else {
            break;
        }
    }

    const value = values[position];

    return value === 0 ? signedZeroAt(values, count, position) : value;
}

/**
 * Split a range around a median-of-three pivot, Hoare's way.
 * @param values - The array.
 * @param left - The first entry of the range.
 * @param right - The last entry of the range.
 * @returns `[high, low]`: afterwards `[left, high]` holds values no greater than the pivot,
 * `[low, right]` values no less, and every entry strictly between the two equals the pivot.
 */
function partition(values: Float64Array, left: number, right: number): [number, number] {
    const middle = (left + right) >>> 1;
    orderPair(values, left, middle);
    orderPair(values, middle, right);
    orderPair(values, left, middle);
    const pivot = values[middle];

    let low = left;
    let high = right;
    while (low <= high) {
        while (values[low] < pivot) {
            low++;
        }

        while (values[high] > pivot) {
            high--;
        }

        if (low <= high) {
            const swap = values[low];
            values[low] = values[high];
            values[high] = swap;
            low++;
            high--;
        }
    }

    return [high, low];
}

/**
 * Tell which zero a numeric sort would put at a position known to hold a zero.
 *
 * A sort puts every negative value first, then every -0, then every 0.
 * @param values - The numbers, in their first `count` entries, in any order.
 * @param count - How many entries are in play.
 * @param position - The position, whose value is a zero.
 * @returns -0 or 0.
 */
function signedZeroAt(values: Float64Array, count: number, position: number): number {
    let beforeZero = 0;
    for (let index = 0; index < count; index++) {
        const entry = values[index];
        if (entry < 0 || Object.is(entry, -0)) {
            beforeZero++;
        }
    }

    return position < beforeZero ? -0 : 0;
}

/**
 * Count the entries equal to a value.
 * @param values - The numbers, in their first `count` entries.
 * @param count - How many entries are in play.
 * @param target - The value to count.
 * @returns How many of the entries equal it (-0 and 0 count as equal).
 */
function countEqual(values: Float64Array, count: number, target: number): number {
    let equal = 0;
    for (let index = 0; index < count; index++) {
        if (values[index] === target) {
            equal++;
        }
    }

    return equal;
}

/**
 * Put two entries of an array in ascending order.
 * @param values - The array.
 * @param first - The entry that should hold the smaller value.
 * @param second - The entry that should hold the larger value.
 */
function orderPair(values: Float64Array, first: number, second: number): void {
    if (values[first] > values[second]) {
        const swap = values[first];
        values[first] = values[second];
        values[second] = swap;
    }
}

/**
 * Build the view a consumer reads, computing its statistics in the one pass that reads the data.
 *
 * The view holds no copy of the column: `get` reads straight through to whatever the result
 * stores, and the four figures on it were computed once rather than on every access.
 * @param column - The column to view.
 * @returns The view and the fuller statistics behind it.
 */
export function analyzeColumn(column: NumericColumnSource): AnalyzedColumn {
    const statistics = computeColumnStatistics(column);
    const view: NumericColumnView = Object.freeze({
        length: column.length,
        get: (index: number): number => column.get(index),
        min: statistics.min,
        max: statistics.max,
        mean: statistics.mean,
        median: statistics.median,
    });

    return { view, statistics };
}

// ---------------------------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------------------------

/**
 * Scale one value the way a metric declares its values are scaled.
 *
 * The two rules are not interchangeable, and which one a metric uses is the metric's own fact:
 * max normalisation answers "what share of the top element's score is this", min-max answers
 * "where does this sit between the bottom and the top". A zero denominator yields 0 rather than
 * NaN, because every element being equal is an ordinary result rather than an error.
 * @param value - The raw value.
 * @param statistics - The column the value came from.
 * @param normalization - The rule the metric declares.
 * @returns The scaled value, which is the raw value when the rule is "none".
 */
export function normalizeValue(value: number, statistics: ColumnStatistics, normalization: Normalization): number {
    if (normalization === "none") {
        return value;
    }

    if (normalization === "max") {
        return statistics.max > 0 ? value / statistics.max : 0;
    }

    const range = statistics.max - statistics.min;

    return range > 0 ? (value - statistics.min) / range : 0;
}

// ---------------------------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------------------------

/** One element and the value it is ranked on. */
export interface RankableEntry {
    /** The element's id, kept exactly as the graph holds it. */
    readonly id: NodeId;
    /** The value to rank on. An entry whose value is not finite is not ranked at all. */
    readonly value: number;
}

/**
 * Order elements best first and give each one its place.
 *
 * Two decisions, both of which a consumer noticed the absence of:
 *
 * **Ties share a rank.** Two nodes with the same betweenness are third equal, not third and
 * fourth: an arbitrary tie-break published as a rank reads as a measured difference. The next
 * distinct value takes the rank its position implies, so ranks run 1, 2, 2, 4.
 *
 * **Order is stable.** Within a tie the entries come back in printed-id order, so a re-run does
 * not reshuffle the top three under the reader's cursor. Numeric ids therefore tie-break as
 * "1", "10", "2", which is arbitrary but identical every time.
 *
 * The percentile is the share of measured elements this one ranks at or above, which follows
 * from the rank: `(measured - rank + 1) / measured`. The top element is at 1, and when every
 * element is equal every element is at 1, because every element does rank at or above all of
 * them.
 * @param entries - The elements to rank, in any order.
 * @returns The ranking, best first. Entries with no finite value are left out.
 */
export function rankEntries(entries: readonly RankableEntry[]): readonly RankingEntry[] {
    const valueAt = (position: number): number => entries[position].value;
    const idAt = (position: number): NodeId => entries[position].id;
    const order = rankOrder(entries.length, valueAt, idAt);

    return rankedPrefix(order, order.length, valueAt, idAt);
}

/**
 * The order {@link rankEntries} ranks in, as positions: best first, ties in printed-id order,
 * elements with no finite value left out. Four bytes per ranked element, so a result can keep one
 * per field instead of an object per element.
 * @param length - How many positions there are.
 * @param valueAt - The value at a position.
 * @param idAt - The id at a position.
 * @returns The ranked positions, best first.
 */
export function rankOrder(
    length: number,
    valueAt: (position: number) => number,
    idAt: (position: number) => NodeId,
): Uint32Array {
    const positions: number[] = [];
    for (let position = 0; position < length; position++) {
        if (Number.isFinite(valueAt(position))) {
            positions.push(position);
        }
    }

    // Printed once per element rather than once per comparison.
    const labels: string[] = [];
    for (const position of positions) {
        labels[position] = String(idAt(position));
    }

    positions.sort((left, right) => {
        const a = valueAt(left);
        const b = valueAt(right);
        if (a !== b) {
            return b - a;
        }

        const leftLabel = labels[left];
        const rightLabel = labels[right];
        if (leftLabel === rightLabel) {
            return 0;
        }

        return leftLabel < rightLabel ? -1 : 1;
    });

    return Uint32Array.from(positions);
}

/**
 * The first entries of a ranking, built from its order. Ties share a rank: the next distinct
 * value takes the rank its place implies, so ranks run 1, 2, 2, 4.
 * @param order - The ranked positions, from {@link rankOrder}.
 * @param count - How many entries to build, at most `order.length`.
 * @param valueAt - The value at a position.
 * @param idAt - The id at a position.
 * @returns The entries, best first, frozen.
 */
export function rankedPrefix(
    order: Uint32Array,
    count: number,
    valueAt: (position: number) => number,
    idAt: (position: number) => NodeId,
): readonly RankingEntry[] {
    const measured = order.length;
    const result: RankingEntry[] = [];
    let rank = 0;
    let previous = Number.NaN;

    for (let index = 0; index < Math.min(count, measured); index++) {
        const value = valueAt(order[index]);
        if (value !== previous) {
            rank = index + 1;
            previous = value;
        }

        result.push(
            Object.freeze({ id: idAt(order[index]), value, rank, percentile: (measured - rank + 1) / measured }),
        );
    }

    return Object.freeze(result);
}

/**
 * The top `n` of a ranking, cut only between tie groups. See {@link TopRanking} for the policy.
 * @param ranking - The ranking, best first, with tied entries sharing a rank.
 * @param n - The most entries the top may hold, a whole number.
 * @returns The entries taken, and the group that did not fit when one did not.
 */
export function topOfRanking(ranking: readonly RankingEntry[], n: number): TopRanking {
    let taken = Math.min(n, ranking.length);

    // Walk the cut back while it falls inside a tie group: taking one of the group means taking
    // all of it, and all of it is more than n.
    while (taken > 0 && taken < ranking.length && ranking[taken].rank === ranking[taken - 1].rank) {
        taken--;
    }

    if (taken === ranking.length || taken === n) {
        return Object.freeze({
            entries: ranking.slice(0, taken),
            leftOut: null,
            reason: null,
            threshold: taken < ranking.length ? ranking[taken].value : null,
        });
    }

    const { value } = ranking[taken];
    let end = taken;
    while (end < ranking.length && ranking[end].value === value) {
        end++;
    }

    const count = end - taken;
    const reason =
        `${String(count)} tie at ${String(value)}, and taking them would make ${String(taken + count)}, ` +
        `more than the ${String(n)} asked for, so ${taken === 0 ? "none are" : `only the top ${String(taken)} are`} taken.`;

    return Object.freeze({
        entries: ranking.slice(0, taken),
        leftOut: Object.freeze({ value, count }),
        reason,
        threshold: value,
    });
}

// ---------------------------------------------------------------------------------------------
// Distribution
// ---------------------------------------------------------------------------------------------

/** How one histogram is cut, including the one thing the caller never has to say. */
interface HistogramRequest extends HistogramOptions {
    /**
     * Whether the field counts things rather than measuring them.
     *
     * The result reads this off the field's own descriptor, so a caller never passes it: a count
     * gets whole-number band edges, so that a band reads "2 to 5" and the next one starts at 6
     * with no value named by two bands.
     */
    readonly integerValued?: boolean;
}

/**
 * Tell whether a column can go on a logarithmic axis at all.
 *
 * Ask before captioning a chart "log scale": a column with no positive values, or whose positive
 * values all sit at one magnitude, has no logarithmic layout, and {@link buildHistogram} lays it
 * out linearly rather than refusing to draw it. A caption derived from the request instead of
 * from this answer is how a linear chart ends up labelled logarithmic.
 * @param statistics - The column's statistics.
 * @returns True when a logarithmic layout would really be applied.
 */
export function canBandLogarithmically(statistics: ColumnStatistics): boolean {
    const { smallestPositive } = statistics;
    if (statistics.measured === 0 || !(statistics.max > 0) || smallestPositive === null) {
        return false;
    }

    const positiveLow = statistics.min > 0 ? statistics.min : smallestPositive;

    return Math.log10(statistics.max) > Math.log10(positiveLow);
}

/**
 * Say whether a column's spread wants a logarithmic axis.
 *
 * This is a recommendation, and it is applied only when a caller asks for it by name:
 * {@link HistogramOptions.scale} `"auto"` takes it, `"linear"` and `"log"` do not. Which axis to
 * draw is the reader's choice, and a chart that changed scale without being asked would be
 * claiming a shape nobody chose -- so "auto" is the asking, and the histogram reports which
 * scale it ended up on either way.
 *
 * The test is the highest value over the middle one, with a middle above zero so that the ratio
 * means something, and the answer is "linear" whenever a logarithmic layout could not be applied
 * anyway -- so a caller that passes this straight back always gets the scale it was told.
 * @param statistics - The column's statistics.
 * @returns "log" when a linear axis would collapse the column into its first bar, else "linear".
 */
export function suggestHistogramScale(statistics: ColumnStatistics): "linear" | "log" {
    if (statistics.measured === 0 || !(statistics.median > 0)) {
        return "linear";
    }

    if (statistics.max / statistics.median <= LOG_SCALE_RATIO_THRESHOLD) {
        return "linear";
    }

    return canBandLogarithmically(statistics) ? "log" : "linear";
}

/** How a banded distribution places a value and how wide each band is. */
interface BandPlan {
    /** How many bands there are. */
    readonly binCount: number;
    /**
     * Which band a value falls in.
     * @param value - The value to place.
     * @returns The band index.
     */
    indexOf(value: number): number;
    /**
     * The lowest and highest value a band holds.
     * @param index - The band index.
     * @returns The band's two edges.
     */
    rangeOf(index: number): readonly [number, number];
}

/**
 * Lay out equal-width bands over the measured range.
 * @param min - The lowest measured value.
 * @param max - The highest measured value.
 * @param binCount - How many bands to aim for.
 * @param integerValued - Whether the field counts things.
 * @returns The band plan.
 */
function linearBandPlan(min: number, max: number, binCount: number, integerValued: boolean): BandPlan {
    if (!(max > min)) {
        return { binCount: 1, indexOf: (): number => 0, rangeOf: (): readonly [number, number] => [min, max] };
    }

    if (integerValued) {
        const span = max - min + 1;
        const width = Math.ceil(span / Math.min(span, binCount));
        const bands = Math.ceil(span / width);

        return {
            binCount: bands,
            indexOf: (value: number): number => Math.min(Math.floor((value - min) / width), bands - 1),
            rangeOf: (index: number): readonly [number, number] => {
                const from = min + index * width;

                return [from, Math.min(from + width - 1, max)];
            },
        };
    }

    const width = (max - min) / binCount;

    return {
        binCount,
        indexOf: (value: number): number => Math.min(Math.floor((value - min) / width), binCount - 1),
        rangeOf: (index: number): readonly [number, number] => [
            min + index * width,
            index === binCount - 1 ? max : min + (index + 1) * width,
        ],
    };
}

/**
 * Lay out bands that are equal-width in the base-10 logarithm of the value.
 *
 * The transform is `log10(value)` over the positive part of the domain and nothing else. Banding
 * on `log10(value + 1)` looks like the same thing and is not: for a column that lies below 1 --
 * normalised PageRank is the everyday case -- the shift makes the transform very nearly linear,
 * so the bands come out evenly spaced in the raw value, almost every element lands in the first
 * bar, and the chart above the caption "log scale" is a linear chart.
 *
 * Zero cannot go on a logarithmic axis at all, and folding zeros into the first positive band
 * would overstate that band the same way the shift did, so everything at or below zero gets a
 * leading bin of its own and the remaining bands cover the positive range.
 * @param min - The lowest measured value, which may be zero or negative.
 * @param max - The highest measured value.
 * @param smallestPositive - The lowest measured value above zero, or null when there is none.
 * @param binCount - How many bands to aim for, the leading bin included.
 * @param integerValued - Whether the field counts things.
 * @returns The band plan, or null when the column cannot go on a logarithmic axis at all.
 */
function logBandPlan(
    min: number,
    max: number,
    smallestPositive: number | null,
    binCount: number,
    integerValued: boolean,
): BandPlan | null {
    const leadingBins = min > 0 ? 0 : 1;
    const positiveLow = leadingBins === 0 ? min : smallestPositive;
    if (!(max > 0) || positiveLow === null || !(positiveLow > 0)) {
        return null;
    }

    const low = Math.log10(positiveLow);
    const high = Math.log10(max);
    if (!(high > low)) {
        return null;
    }

    const bands = binCount - leadingBins;
    if (bands < 1) {
        return null;
    }

    const width = (high - low) / bands;

    return {
        binCount,
        indexOf: (value: number): number => {
            if (!(value > 0)) {
                return 0;
            }

            const band = Math.floor((Math.log10(value) - low) / width);

            return leadingBins + Math.min(Math.max(band, 0), bands - 1);
        },
        rangeOf: (index: number): readonly [number, number] => {
            if (index < leadingBins) {
                return [min, 0];
            }

            const band = index - leadingBins;
            const rawFrom = band === 0 ? positiveLow : 10 ** (low + band * width);
            const rawTo = band === bands - 1 ? max : 10 ** (low + (band + 1) * width);
            if (!integerValued) {
                return [rawFrom, rawTo];
            }

            const from = band === 0 ? positiveLow : Math.ceil(rawFrom);

            return [from, band === bands - 1 ? max : Math.max(from, Math.ceil(rawTo) - 1)];
        },
    };
}

/**
 * Settle how many bins a request asks for.
 * @param bins - What the caller asked for, or undefined.
 * @returns The bin count to use.
 * @throws A GraphtyError coded E_OPTION_RANGE when the request is outside the permitted range.
 */
export function resolveBinCount(bins: number | undefined): number {
    if (bins === undefined) {
        return DEFAULT_HISTOGRAM_BINS;
    }

    if (!Number.isInteger(bins) || bins < 1 || bins > HISTOGRAM_BIN_CAP) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            source: "run",
            message: `A histogram takes between 1 and ${HISTOGRAM_BIN_CAP} bins; ${String(bins)} was asked for.`,
            details: { option: "bins", value: bins, min: 1, max: HISTOGRAM_BIN_CAP },
        });
    }

    return bins;
}

/**
 * Count how many entries carry each distinct value, giving up once there are too many to draw.
 * @param column - The column to walk.
 * @param limit - How many distinct values are still worth one bar each.
 * @returns The counts by value, or null once the column has more distinct values than the limit.
 */
function countDistinct(column: NumericColumnSource, limit: number): Map<number, number> | null {
    const counts = new Map<number, number>();

    for (let index = 0; index < column.length; index++) {
        const value = column.get(index);
        if (!Number.isFinite(value)) {
            continue;
        }

        const seen = counts.get(value);
        if (seen === undefined) {
            if (counts.size >= limit) {
                return null;
            }

            counts.set(value, 1);
            continue;
        }

        counts.set(value, seen + 1);
    }

    return counts;
}

/**
 * Whether a column that fits one bar per value should be drawn that way.
 *
 * A count, a whole-number field, a single value, or values that repeat (each one carried by two
 * or more elements on average) read as values. A continuous measure on a small graph -- PageRank
 * over 12 nodes -- has as many values as elements, and one bar of height 1 per value shows no
 * shape at all, so it is banded instead.
 * @param distinct - The counts by value.
 * @param integerValued - Whether the field counts things.
 * @returns True to draw one bar per value.
 */
function readsAsValues(distinct: Map<number, number>, integerValued: boolean): boolean {
    if (integerValued || distinct.size === 1) {
        return true;
    }

    let measured = 0;
    let whole = true;
    for (const [value, count] of distinct) {
        measured += count;
        whole &&= Number.isInteger(value);
    }

    return whole || distinct.size * 2 <= measured;
}

/**
 * Cut a column into bins.
 *
 * Three layouts, chosen in this order:
 *
 * 1. **Nothing measured** produces no bins at all. A chart with no data must not claim a range.
 * 2. **Few enough distinct values that read as values** (a count, whole numbers, or values that
 *    repeat) produces one bin per value, ascending, with `from` equal to `to`. That is the
 *    readable shape for a count metric and it is exact -- no banding runs, so the bins are on no
 *    scale but their own. A continuous measure with one element per value is banded instead.
 * 3. **Otherwise, bands**, linear or logarithmic as `scale` says.
 *
 * What the two edges mean: `from` is the lowest value the bin holds and is always inclusive. `to`
 * is the highest value BELOW the next bin, so it is exclusive for a continuous field except in
 * the last bin, where it is the measured maximum. For a field that counts things the edges are
 * whole numbers and both are inclusive, so a band reads "2 to 5" and the next one starts at 6 --
 * an exclusive upper edge would name a count the band does not hold. A bin whose `from` equals
 * its `to` holds exactly that one value.
 * @param column - The column to cut.
 * @param options - How many bins, which scale, and whether the field counts things.
 * @returns The bins, in ascending order.
 * @throws A GraphtyError coded E_OPTION_RANGE when `bins` is outside the permitted range.
 */
export function buildHistogram(column: NumericColumnSource, options?: HistogramRequest): Histogram {
    const binCount = resolveBinCount(options?.bins);
    const integerValued = options?.integerValued ?? false;
    const statistics = computeColumnStatistics(column);
    const suggestedScale = suggestHistogramScale(statistics);
    const distinct = countDistinct(column, binCount);

    if (distinct !== null) {
        if (distinct.size === 0) {
            return Object.freeze({
                bins: NO_BINS,
                // Nothing was measured, so nothing is on any axis. Reported as linear rather
                // than as the request, because "log scale" over an empty chart is the same false
                // caption this whole return type exists to prevent.
                scale: "linear",
                suggestedScale: "linear",
                binning: "empty",
            });
        }
    }

    if (distinct !== null && readsAsValues(distinct, integerValued)) {
        const bins = [...distinct.entries()]
            .sort((left, right) => left[0] - right[0])
            .map(([value, count]) => Object.freeze({ from: value, to: value, count }));

        return Object.freeze({
            bins: Object.freeze(bins),
            // One bar per distinct value has no bands to space, so neither axis was applied to
            // it. Saying "linear" here is what stops a caption claiming a logarithmic layout of
            // a chart that has none.
            scale: "linear",
            suggestedScale,
            binning: "per-value",
        });
    }

    const wantsLog = options?.scale === "log" || (options?.scale === "auto" && suggestedScale === "log");
    const plan = wantsLog
        ? logBandPlan(statistics.min, statistics.max, statistics.smallestPositive, binCount, integerValued)
        : null;
    const applied = plan ?? linearBandPlan(statistics.min, statistics.max, binCount, integerValued);
    const counts = new Array<number>(applied.binCount).fill(0);

    for (let index = 0; index < column.length; index++) {
        const value = column.get(index);
        if (Number.isFinite(value)) {
            counts[applied.indexOf(value)] += 1;
        }
    }

    return Object.freeze({
        bins: Object.freeze(
            counts.map((count, index) => {
                const [from, to] = applied.rangeOf(index);

                return Object.freeze({ from, to, count });
            }),
        ),
        // `plan` is null exactly when a logarithmic layout was asked for and could not be built,
        // which is the case a caption must not get wrong.
        scale: plan === null ? "linear" : "log",
        suggestedScale,
        binning: "banded",
    });
}
