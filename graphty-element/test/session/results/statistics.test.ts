import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors/GraphtyError";
import {
    analyzeColumn,
    arrayColumn,
    buildHistogram,
    canBandLogarithmically,
    computeColumnStatistics,
    DEFAULT_HISTOGRAM_BINS,
    HISTOGRAM_BIN_CAP,
    isNormalization,
    LOG_SCALE_RATIO_THRESHOLD,
    normalizeValue,
    type RankableEntry,
    rankEntries,
    suggestHistogramScale,
} from "../../../src/session/results/statistics";
import type { HistogramBin } from "../../../src/session/results/types";

/** The statistics of a plain list of numbers. */
function statisticsOf(values: readonly number[]) {
    return computeColumnStatistics(arrayColumn(values));
}

/** Rank a plain list of values, giving each one a printed id. */
function rankOf(values: readonly number[]): readonly RankableEntry[] {
    return values.map((value, index) => ({ id: `n${index}`, value }));
}

/** How many entries a set of bins accounts for. */
function binned(bins: readonly HistogramBin[]): number {
    return bins.reduce((total, bin) => total + bin.count, 0);
}

describe("computeColumnStatistics", () => {
    it("says nothing about a column that measured nothing", () => {
        // NaN rather than 0, and the summary turns it into null. A minimum of 0 over a run that
        // measured nothing is a number a reader would go looking for and never find.
        const statistics = statisticsOf([]);

        assert.strictEqual(statistics.length, 0);
        assert.strictEqual(statistics.measured, 0);
        assert.isNaN(statistics.min);
        assert.isNaN(statistics.max);
        assert.isNaN(statistics.mean);
        assert.isNaN(statistics.median);
        assert.strictEqual(statistics.tiedAtMin, 0);
        assert.strictEqual(statistics.smallestPositive, null);
    });

    it("reads one element as its own minimum, maximum, mean and median", () => {
        const statistics = statisticsOf([7]);

        assert.strictEqual(statistics.measured, 1);
        assert.strictEqual(statistics.min, 7);
        assert.strictEqual(statistics.max, 7);
        assert.strictEqual(statistics.mean, 7);
        assert.strictEqual(statistics.median, 7);
        assert.strictEqual(statistics.tiedAtMin, 1);
        assert.strictEqual(statistics.smallestPositive, 7);
    });

    it("reports every element tied at the minimum when every value is identical", () => {
        const statistics = statisticsOf([3, 3, 3, 3, 3]);

        assert.strictEqual(statistics.min, 3);
        assert.strictEqual(statistics.max, 3);
        assert.strictEqual(statistics.median, 3);
        assert.strictEqual(statistics.mean, 3);
        assert.strictEqual(statistics.tiedAtMin, 5);
    });

    it("skips elements the run had nothing to say about instead of reading them as zero", () => {
        // A fabricated zero at the bottom of a betweenness ranking is indistinguishable from a
        // genuine "on no shortest path", which is a real finding.
        const statistics = statisticsOf([4, Number.NaN, 6, Number.POSITIVE_INFINITY, 8]);

        assert.strictEqual(statistics.length, 5);
        assert.strictEqual(statistics.measured, 3);
        assert.strictEqual(statistics.min, 4);
        assert.strictEqual(statistics.max, 8);
        assert.strictEqual(statistics.mean, 6);
    });

    it("takes the lower median, so a count median is a whole number a reader can find", () => {
        // Four nodes with 1, 2, 3 and 4 links: the median reads 2, not 2.5, because no node has
        // 2.5 links.
        assert.strictEqual(statisticsOf([1, 2, 3, 4]).median, 2);
        assert.strictEqual(statisticsOf([1, 2, 3]).median, 2);
    });

    it("counts only the elements sitting exactly at the minimum", () => {
        const statistics = statisticsOf([0, 0, 0, 1, 9]);

        assert.strictEqual(statistics.tiedAtMin, 3);
        assert.strictEqual(statistics.smallestPositive, 1);
    });

    it("finds the smallest positive value past zeros and negatives", () => {
        const statistics = statisticsOf([-5, 0, 0.25, 12]);

        assert.strictEqual(statistics.min, -5);
        assert.strictEqual(statistics.smallestPositive, 0.25);
    });

    it("has no smallest positive value when nothing is above zero", () => {
        assert.strictEqual(statisticsOf([0, 0, -1]).smallestPositive, null);
    });

    it("compensates the sum, so a long column of small scores keeps its average", () => {
        // Summed naively, ten copies of 0.1 come to 0.9999999999999999 and the published average
        // is not the number every value in the column is.
        assert.strictEqual(statisticsOf(Array.from({ length: 10 }, () => 0.1)).mean, 0.1);
    });
});

describe("analyzeColumn", () => {
    it("views the column without copying it and computes its figures once", () => {
        const values = [5, 1, 9];
        const { view, statistics } = analyzeColumn(arrayColumn(values));

        assert.strictEqual(view.length, 3);
        assert.strictEqual(view.get(2), 9);
        assert.strictEqual(view.min, 1);
        assert.strictEqual(view.max, 9);
        assert.strictEqual(view.median, 5);
        assert.strictEqual(view.mean, 5);
        assert.strictEqual(statistics.tiedAtMin, 1);

        // The view reads through to the caller's storage rather than a snapshot of it.
        values[1] = 4;
        assert.strictEqual(view.get(1), 4);
    });
});

describe("rankEntries", () => {
    it("ranks nothing when nothing was measured", () => {
        assert.deepStrictEqual(rankEntries([]), []);
    });

    it("gives a single element rank 1 at the top percentile", () => {
        const ranked = rankEntries(rankOf([42]));

        assert.strictEqual(ranked.length, 1);
        assert.strictEqual(ranked[0].rank, 1);
        assert.strictEqual(ranked[0].percentile, 1);
    });

    it("lets tied elements share a rank and gives the next one the place its position implies", () => {
        const ranked = rankEntries(rankOf([10, 5, 5, 1]));

        assert.deepStrictEqual(
            ranked.map((entry) => entry.rank),
            [1, 2, 2, 4],
        );
        assert.deepStrictEqual(
            ranked.map((entry) => entry.percentile),
            [1, 0.75, 0.75, 0.25],
        );
    });

    it("puts every element at rank 1 when every value is identical", () => {
        const ranked = rankEntries(rankOf([2, 2, 2]));

        assert.deepStrictEqual(
            ranked.map((entry) => entry.rank),
            [1, 1, 1],
        );
        assert.deepStrictEqual(
            ranked.map((entry) => entry.percentile),
            [1, 1, 1],
        );
    });

    it("breaks ties by printed id, so a re-run does not reshuffle the top of the list", () => {
        const first = rankEntries([
            { id: "b", value: 1 },
            { id: "a", value: 1 },
            { id: 10, value: 1 },
            { id: 2, value: 1 },
        ]);
        const second = rankEntries([
            { id: 2, value: 1 },
            { id: "a", value: 1 },
            { id: "b", value: 1 },
            { id: 10, value: 1 },
        ]);

        assert.deepStrictEqual(
            first.map((entry) => entry.id),
            [10, 2, "a", "b"],
        );
        assert.deepStrictEqual(
            first.map((entry) => entry.id),
            second.map((entry) => entry.id),
        );
    });

    it("leaves out elements with no finite value", () => {
        const ranked = rankEntries([
            { id: "a", value: 3 },
            { id: "b", value: Number.NaN },
            { id: "c", value: 1 },
        ]);

        assert.deepStrictEqual(
            ranked.map((entry) => entry.id),
            ["a", "c"],
        );
        assert.strictEqual(ranked[1].percentile, 0.5);
    });
});

describe("normalizeValue", () => {
    it("scales by the top value under max normalisation", () => {
        const statistics = statisticsOf([2, 4, 8]);

        assert.strictEqual(normalizeValue(2, statistics, "max"), 0.25);
        assert.strictEqual(normalizeValue(8, statistics, "max"), 1);
    });

    it("scales between the bottom and the top under min-max normalisation", () => {
        const statistics = statisticsOf([2, 4, 8]);

        assert.strictEqual(normalizeValue(2, statistics, "min-max"), 0);
        assert.strictEqual(normalizeValue(8, statistics, "min-max"), 1);
        assert.strictEqual(normalizeValue(5, statistics, "min-max"), 0.5);
    });

    it("answers 0 rather than NaN when every value is identical", () => {
        // Every node having two links is an ordinary graph, not a degenerate input.
        const statistics = statisticsOf([2, 2, 2]);

        assert.strictEqual(normalizeValue(2, statistics, "min-max"), 0);
        assert.strictEqual(normalizeValue(2, statistics, "max"), 1);
    });

    it("answers 0 rather than dividing by zero when every value is zero", () => {
        const statistics = statisticsOf([0, 0]);

        assert.strictEqual(normalizeValue(0, statistics, "max"), 0);
        assert.strictEqual(normalizeValue(0, statistics, "min-max"), 0);
    });

    it("leaves the value alone when the metric declares no scaling", () => {
        assert.strictEqual(normalizeValue(7, statisticsOf([1, 7]), "none"), 7);
    });

    it("recognises the normalisations a result may declare", () => {
        assert.isTrue(isNormalization("max"));
        assert.isTrue(isNormalization("min-max"));
        assert.isTrue(isNormalization("none"));
        assert.isFalse(isNormalization("zscore"));
        assert.isFalse(isNormalization(undefined));
    });
});

describe("buildHistogram", () => {
    it("draws no bins at all for a column that measured nothing", () => {
        assert.deepStrictEqual(buildHistogram(arrayColumn([])).bins, []);
        assert.strictEqual(buildHistogram(arrayColumn([])).binning, "empty");
    });

    it("draws one bin for one element", () => {
        const {bins} = buildHistogram(arrayColumn([4]));

        assert.strictEqual(bins.length, 1);
        assert.deepStrictEqual(bins[0], { from: 4, to: 4, count: 1 });
    });

    it("draws one bin when every value is identical", () => {
        const {bins} = buildHistogram(arrayColumn([3, 3, 3, 3]));

        assert.strictEqual(bins.length, 1);
        assert.deepStrictEqual(bins[0], { from: 3, to: 3, count: 4 });
    });

    it("draws one bar per distinct value while they fit, ascending", () => {
        const {bins} = buildHistogram(arrayColumn([3, 1, 3, 2, 1, 1]), { bins: 5 });

        assert.deepStrictEqual(bins, [
            { from: 1, to: 1, count: 3 },
            { from: 2, to: 2, count: 1 },
            { from: 3, to: 3, count: 2 },
        ]);
    });

    it("bands once there are more distinct values than bins, and accounts for every element", () => {
        const values = Array.from({ length: 500 }, (_unused, index) => index);
        const {bins} = buildHistogram(arrayColumn(values), { bins: 10, integerValued: true });

        assert.isAtMost(bins.length, 10);
        assert.strictEqual(binned(bins), 500);
    });

    it("keeps whole-number band edges apart for a field that counts things", () => {
        const values = Array.from({ length: 500 }, (_unused, index) => index + 1);
        const {bins} = buildHistogram(arrayColumn(values), { bins: 10, integerValued: true });

        for (const bin of bins) {
            assert.strictEqual(bin.from, Math.round(bin.from));
            assert.strictEqual(bin.to, Math.round(bin.to));
        }

        for (let index = 1; index < bins.length; index++) {
            assert.strictEqual(bins[index].from, bins[index - 1].to + 1, "no count is named by two bands");
        }
    });

    it("cuts a continuous field into the number of bands asked for, covering the whole range", () => {
        const values = Array.from({ length: 400 }, (_unused, index) => index / 7);
        const {bins} = buildHistogram(arrayColumn(values), { bins: 8 });

        assert.strictEqual(bins.length, 8);
        assert.strictEqual(bins[0].from, 0);
        assert.strictEqual(bins[7].to, 399 / 7);
        assert.strictEqual(binned(bins), 400);
    });

    it("spreads a heavy tail across the bands on a log scale where a linear one collapses it", () => {
        // Nine hundred small values and a hundred running to ten thousand: on a linear axis the
        // first bar owns almost everything, which is the distribution a log axis exists to show.
        const values = [
            ...Array.from({ length: 900 }, (_unused, index) => 1 + index / 100),
            ...Array.from({ length: 100 }, (_unused, index) => 10 ** (1 + (index % 4)) + index / 10),
        ];
        const linear = buildHistogram(arrayColumn(values), { bins: 20, scale: "linear" }).bins;
        const log = buildHistogram(arrayColumn(values), { bins: 20, scale: "log" }).bins;

        assert.strictEqual(binned(linear), 1000);
        assert.strictEqual(binned(log), 1000);
        assert.isAbove(linear[0].count, 900);
        assert.isBelow(log[0].count, linear[0].count);
        assert.isAbove(
            log.filter((bin) => bin.count > 0).length,
            linear.filter((bin) => bin.count > 0).length,
        );
    });

    it("bands a column that lies entirely below 1 on a real log scale", () => {
        // The defect this replaces: banding on log10(value + 1) is very nearly linear below 1,
        // so normalised scores came out in one bar under a caption reading "log scale".
        const values = Array.from({ length: 600 }, (_unused, index) => 10 ** -(1 + (index % 6)) * (1 + (index % 7)));
        const {bins} = buildHistogram(arrayColumn(values), { bins: 20, scale: "log" });

        assert.strictEqual(binned(bins), 600);
        assert.isBelow(bins[0].count, 200, "no single band owns a third of a six-decade column");
        assert.isAbove(bins.filter((bin) => bin.count > 0).length, 10);
    });

    it("gives everything at or below zero a leading bin of its own on a log scale", () => {
        const values = [...Array.from({ length: 200 }, () => 0), ...Array.from({ length: 400 }, (_unused, index) => 10 ** (index % 5) + (index % 13))];
        const {bins} = buildHistogram(arrayColumn(values), { bins: 12, scale: "log" });

        assert.strictEqual(bins[0].from, 0);
        assert.strictEqual(bins[0].to, 0);
        assert.strictEqual(bins[0].count, 200);
        assert.strictEqual(binned(bins), 600);
    });

    it("lays a column with no logarithmic spread out linearly rather than refusing to draw it", () => {
        const values = Array.from({ length: 200 }, (_unused, index) => 5 + index / 1000);
        const {bins} = buildHistogram(arrayColumn(values), { bins: 10, scale: "log" });

        assert.strictEqual(binned(bins), 200);
        assert.strictEqual(bins.length, 10);
    });

    it("defaults to a readable number of bins", () => {
        const values = Array.from({ length: 5000 }, (_unused, index) => index * 1.5);
        const {bins} = buildHistogram(arrayColumn(values));

        assert.strictEqual(bins.length, DEFAULT_HISTOGRAM_BINS);
    });

    it("refuses a bin count outside the range it will draw", () => {
        const column = arrayColumn([1, 2, 3]);

        for (const bins of [0, -1, 2.5, HISTOGRAM_BIN_CAP + 1]) {
            try {
                buildHistogram(column, { bins });
                assert.fail(`${bins} bins should have been refused`);
            } catch (error) {
                assert.isTrue(isGraphtyError(error));
                assert.strictEqual(isGraphtyError(error) ? error.code : null, "E_OPTION_RANGE");
            }
        }

        assert.doesNotThrow(() => buildHistogram(column, { bins: HISTOGRAM_BIN_CAP }));
    });
});

describe("suggestHistogramScale", () => {
    it("asks for a log axis when a handful of elements own the whole range", () => {
        const values = [...Array.from({ length: 99 }, () => 1), 10 * LOG_SCALE_RATIO_THRESHOLD];

        assert.strictEqual(suggestHistogramScale(statisticsOf(values)), "log");
    });

    it("leaves an evenly spread column on a linear axis", () => {
        assert.strictEqual(suggestHistogramScale(statisticsOf([1, 2, 3, 4, 5])), "linear");
    });

    it("leaves a column where every value is identical on a linear axis", () => {
        assert.strictEqual(suggestHistogramScale(statisticsOf([4, 4, 4, 4])), "linear");
    });

    it("leaves a column that measured nothing on a linear axis", () => {
        assert.strictEqual(suggestHistogramScale(statisticsOf([])), "linear");
    });

    it("never asks for a scale the bins could not be laid out on", () => {
        // Every positive value at one magnitude: the ratio test would say log and the layout
        // could not deliver one, so the answer a caller passes straight back is linear.
        const values = [...Array.from({ length: 99 }, () => 0), 500];
        const statistics = statisticsOf(values);

        assert.strictEqual(canBandLogarithmically(statistics), false);
        assert.strictEqual(suggestHistogramScale(statistics), "linear");
    });

    it("says whether a column can go on a logarithmic axis at all", () => {
        assert.isFalse(canBandLogarithmically(statisticsOf([])));
        assert.isFalse(canBandLogarithmically(statisticsOf([0, 0, -2])));
        assert.isFalse(canBandLogarithmically(statisticsOf([7, 7, 7])));
        assert.isTrue(canBandLogarithmically(statisticsOf([1, 10, 100])));
    });
});
