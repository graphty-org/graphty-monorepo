/**
 * What this module turns one of graphty-element's results into.
 *
 * WHAT IS TESTED HERE, AND WHAT DELIBERATELY IS NOT. The statistics themselves -- the
 * ordering, the lower median, the tie count, the binning and the choice of axis -- belong to
 * graphty-element and are tested there, against its own columns. Reimplementing any of that in
 * a fixture here would give this suite a second opinion to agree with, and a second opinion is
 * not a check. So the results below are LITERAL: fixed rankings, fixed summaries, fixed bars,
 * with no arithmetic behind them. What is asserted is the mapping -- which element field lands
 * in which panel field, which id is carried and which is printed, what a bar is worded as, and
 * the two places this module is allowed to decide something of its own.
 */

import type { Histogram, RankingEntry, ResultSummary, RunResult } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import type { ElementGraph } from "../elementBridge";
import {
    METRIC_DISTRIBUTION_MAX_BINS,
    metricDistribution,
    NODE_METRIC_DEFINITIONS,
    NODE_METRIC_IDS,
    type NodeMetricId,
    readNodeMetricResults,
    runNodeMetric,
} from "../nodeMetrics";

/** What a fixture says one run published. Every field is a literal; nothing is derived. */
interface Published {
    /** The ranking, best first, exactly as the element would have ordered it. */
    readonly ranking?: readonly RankingEntry[];
    /** Whatever the summary should say. The unset fields take harmless defaults. */
    readonly summary?: Partial<ResultSummary>;
    /** The distribution, when a test draws one. */
    readonly histogram?: Histogram;
    /** The graph-level fields, e.g. PageRank's converged and iterations. */
    readonly graph?: Readonly<Record<string, unknown>>;
}

/** A distribution of no bars, which is what an unmeasured column draws. */
const NO_DISTRIBUTION: Histogram = { bins: [], scale: "linear", suggestedScale: "linear", binning: "empty" };

/**
 * Builds the result object a run hands back, from literal fixtures.
 * @param published - what this run should say it published.
 * @returns the result, with only the members this module reads.
 */
function fakeResult(published: Published): RunResult {
    const ranking = published.ranking ?? [];
    const summary: ResultSummary = {
        count: ranking.length,
        measured: ranking.length,
        min: ranking.length > 0 ? ranking[ranking.length - 1].value : null,
        max: ranking.length > 0 ? ranking[0].value : null,
        median: ranking.length > 0 ? ranking[Math.floor((ranking.length - 1) / 2)].value : null,
        mean: null,
        tiedAtMin: 0,
        normalization: "none",
        top: [],
        caveats: {
            exact: true,
            seed: null,
            direction: "as-loaded",
            weight: null,
            precision: "f64",
            method: "exact",
            notes: [],
        },
        durationMs: 0,
        ...published.summary,
    };

    return {
        ranking: () => ranking,
        summary: () => summary,
        histogram: () => published.histogram ?? NO_DISTRIBUTION,
        graph: published.graph ?? {},
    } as unknown as RunResult;
}

/** The graph stub, plus the calls a test wants to see. */
interface Stub {
    /** The graph under test. */
    readonly graph: ElementGraph;
    /** Every algorithm key the caller started, in order. */
    readonly started: string[];
    /** The third argument of every start, so a test can see that none was passed. */
    readonly startOptions: unknown[];
}

/**
 * A graph whose session holds one finished run per metric named.
 * @param finished - what each metric's run published. A metric absent here has not run.
 * @returns the stub.
 */
function makeStub(finished: Partial<Record<NodeMetricId, Published>>): Stub {
    const started: string[] = [];
    const startOptions: unknown[] = [];
    const runs = Object.entries(finished).map(([algorithm, published]) => ({
        id: `${algorithm}_1`,
        algorithm,
        status: "succeeded",
        result: fakeResult(published),
    }));

    const session = {
        runs: {
            list: () => runs,
            start: (algorithm: string, _params?: unknown, options?: unknown) => {
                started.push(algorithm);
                startOptions.push(options);

                const existing = runs.find((run) => run.algorithm === algorithm);
                const run = existing ?? { id: `${algorithm}_1`, algorithm, status: "succeeded", result: fakeResult({}) };

                return Object.assign(Promise.resolve(run.result), { id: run.id });
            },
        },
    };

    return { graph: { getSession: () => session } as unknown as ElementGraph, started, startOptions };
}

/**
 * One ranking entry, spelled out.
 * @param id - the node id, in whatever type the data source produced.
 * @param value - the measured value.
 * @param rank - its position, best first.
 * @returns the entry.
 */
function entry(id: number | string, value: number, rank: number): RankingEntry {
    return { id, value, rank, percentile: 1 };
}

describe("NODE_METRIC_DEFINITIONS", () => {
    it("covers every metric the Suggested list offers, in the order it offers them", () => {
        expect(NODE_METRIC_IDS).toEqual(["degree", "pagerank", "betweenness"]);

        for (const metric of NODE_METRIC_IDS) {
            expect(NODE_METRIC_DEFINITIONS[metric].id).toBe(metric);
        }
    });

    it("pairs a plain name with a technical one for every metric, which spec 6.3 asks for", () => {
        for (const metric of NODE_METRIC_IDS) {
            const definition = NODE_METRIC_DEFINITIONS[metric];

            expect(definition.plainName).not.toBe("");
            expect(definition.technicalName).not.toBe("");
            expect(definition.plainName).not.toBe(definition.technicalName);
        }
    });
});

describe("readNodeMetricResults", () => {
    it("maps the element's ranking, keeping its id and printing a label beside it", () => {
        const stub = makeStub({
            degree: { ranking: [entry(2, 9, 1), entry("b", 4, 2), entry(10, 1, 3)] },
        });

        const ranking = readNodeMetricResults(stub.graph, "degree");

        expect(ranking.byValueDescending.map((reading) => reading.id)).toEqual([2, "b", 10]);
        expect(ranking.byValueDescending.map((reading) => reading.label)).toEqual(["2", "b", "10"]);
        expect(ranking.byValueDescending.map((reading) => reading.value)).toEqual([9, 4, 1]);
    });

    it("takes every statistic from the element's summary rather than from the readings", () => {
        const stub = makeStub({
            degree: {
                ranking: [entry("a", 9, 1), entry("b", 4, 2), entry("c", 1, 3)],
                // Deliberately disagreeing with the ranking above: if this module recomputed
                // anything from the readings, these numbers would not survive.
                summary: { count: 40, measured: 3, min: 0.5, max: 12, median: 7, tiedAtMin: 6 },
            },
        });

        const ranking = readNodeMetricResults(stub.graph, "degree");

        expect(ranking.nodeCount).toBe(40);
        expect(ranking.rankedCount).toBe(3);
        expect(ranking.minValue).toBe(0.5);
        expect(ranking.maxValue).toBe(12);
        expect(ranking.medianValue).toBe(7);
        expect(ranking.tiedAtMinimum).toBe(6);
    });

    it("reads nothing rather than zeros for a metric nobody has run", () => {
        const stub = makeStub({ degree: { ranking: [entry("a", 3, 1)] } });

        const ranking = readNodeMetricResults(stub.graph, "betweenness");

        expect(ranking.byValueDescending).toEqual([]);
        expect(ranking.rankedCount).toBe(0);
        expect(ranking.runId).toBeUndefined();
        expect(stub.started).toEqual([]);
    });

    it("names the run it read, so a layer and a Remove verb can point at it", () => {
        const stub = makeStub({ degree: { ranking: [entry("a", 3, 1)] } });

        expect(readNodeMetricResults(stub.graph, "degree").runId).toBe("degree_1");
    });

    /**
     * A metric published unnormalised carries no per-node share, and the bar length is this
     * panel's choice. Degree draws each bar as a share of the top node's degree, so the top
     * node is full-width and the rest are read against it.
     */
    it("draws each bar as a share of the top value for a max-normalised metric", () => {
        const stub = makeStub({
            degree: { ranking: [entry("a", 10, 1), entry("b", 5, 2), entry("c", 0, 3)] },
        });

        const ranking = readNodeMetricResults(stub.graph, "degree");

        expect(NODE_METRIC_DEFINITIONS.degree.normalisation).toBe("max");
        expect(ranking.byValueDescending.map((reading) => reading.fraction)).toEqual([1, 0.5, 0]);
    });

    /**
     * Betweenness draws between the bottom and the top instead, so the lowest bar is always
     * empty and the highest always full whatever the raw spread was. The two rules are not
     * interchangeable and the reading under the chart says which question the bars answer.
     */
    it("draws bars between the bottom and the top for a min-max metric", () => {
        const stub = makeStub({
            betweenness: { ranking: [entry("a", 8, 1), entry("b", 6, 2), entry("c", 4, 3)] },
        });

        const ranking = readNodeMetricResults(stub.graph, "betweenness");

        expect(NODE_METRIC_DEFINITIONS.betweenness.normalisation).toBe("min-max");
        expect(ranking.byValueDescending.map((reading) => reading.fraction)).toEqual([1, 0.5, 0]);
    });
});

describe("runNodeMetric", () => {
    it("starts the metric by its catalogue key and passes no parameters", async () => {
        const stub = makeStub({});

        await runNodeMetric(stub.graph, "betweenness");

        expect(stub.started).toEqual(["betweenness"]);
        expect(stub.startOptions).toEqual([undefined]);
    });

    it("reads the result the run resolved with, and names the run", async () => {
        const stub = makeStub({ pagerank: { ranking: [entry("a", 0.5, 1), entry("b", 0.25, 2)] } });

        const ranking = await runNodeMetric(stub.graph, "pagerank");

        expect(ranking.runId).toBe("pagerank_1");
        expect(ranking.byValueDescending.map((reading) => reading.value)).toEqual([0.5, 0.25]);
    });
});

/**
 * A `converged: true` is dropped and only a published `false` is carried, which is why the
 * field is typed `false`. On the delta path -- every graph over 100 nodes, at this shell's
 * defaults -- upstream returns a hard-coded `true`, so a `true` would be a constant wearing
 * the clothes of a measurement. Absence and `true` both mean "draw no caveat".
 */
describe("PageRank convergence", () => {
    it("carries a published failure to converge, with the iteration count beside it", () => {
        const stub = makeStub({
            pagerank: { ranking: [entry("a", 0.5, 1)], graph: { converged: false, iterations: 100 } },
        });

        const ranking = readNodeMetricResults(stub.graph, "pagerank");

        expect(ranking.converged).toBe(false);
        expect(ranking.iterations).toBe(100);
    });

    it("drops a published true, because on the delta path it is a constant", () => {
        const stub = makeStub({
            pagerank: { ranking: [entry("a", 0.5, 1)], graph: { converged: true, iterations: 100 } },
        });

        const ranking = readNodeMetricResults(stub.graph, "pagerank");

        expect(ranking.converged).toBeUndefined();
        expect(ranking.iterations).toBeUndefined();
    });

    it("says nothing when the run published no convergence fields at all", () => {
        const stub = makeStub({ pagerank: { ranking: [entry("a", 0.5, 1)] } });

        expect(readNodeMetricResults(stub.graph, "pagerank").converged).toBeUndefined();
    });

    it("carries no convergence claim for the other two metrics, whatever the run published", () => {
        const stub = makeStub({ degree: { ranking: [entry("a", 3, 1)], graph: { converged: false } } });

        expect(readNodeMetricResults(stub.graph, "degree").converged).toBeUndefined();
    });
});

describe("metricDistribution", () => {
    /**
     * The bars and the axis come from the element; the WORDS come from here. A bar whose
     * `from` and `to` are the same value names that value alone, because "3 to 3 links" names
     * a range that is not a range.
     */
    it("words one bar per value, with the metric's own unit", () => {
        const stub = makeStub({
            degree: {
                ranking: [entry("a", 3, 1)],
                summary: { min: 1, max: 3 },
                histogram: {
                    bins: [
                        { from: 1, to: 1, count: 2 },
                        { from: 2, to: 2, count: 2 },
                        { from: 3, to: 3, count: 3 },
                    ],
                    scale: "linear",
                    suggestedScale: "linear",
                    binning: "per-value",
                },
            },
        });

        const distribution = metricDistribution(readNodeMetricResults(stub.graph, "degree"));

        expect(distribution.bins.map((bin) => bin.label)).toEqual([
            "1 links: 2 nodes",
            "2 links: 2 nodes",
            "3 links: 3 nodes",
        ]);
        expect(distribution.axisMin).toBe("1");
        expect(distribution.axisMax).toBe("3");
        expect(distribution.caption).toBe("Most connected per node");
        expect(distribution.logX).toBe(false);
    });

    it("names a band's range when the element banded rather than drew a bar per value", () => {
        const stub = makeStub({
            degree: {
                ranking: [entry("a", 50, 1)],
                summary: { min: 1, max: 50 },
                histogram: {
                    bins: [
                        { from: 1, to: 25, count: 40 },
                        { from: 26, to: 50, count: 10 },
                    ],
                    scale: "linear",
                    suggestedScale: "linear",
                    binning: "banded",
                },
            },
        });

        const distribution = metricDistribution(readNodeMetricResults(stub.graph, "degree"));

        expect(distribution.bins.map((bin) => bin.label)).toEqual([
            "1 to 25 links: 40 nodes",
            "26 to 50 links: 10 nodes",
        ]);
    });

    /**
     * THE CAPTION READS THE SCALE THAT WAS APPLIED, never the one that was asked for. A
     * logarithmic layout needs positive values spanning more than one magnitude; a column with
     * neither is drawn linearly rather than refused, and a caption taken from the request would
     * then claim a log chart that does not exist.
     */
    it("says log scale only when the element laid the bars out logarithmically", () => {
        const banded = (scale: "linear" | "log"): Histogram => ({
            bins: [{ from: 1, to: 10, count: 5 }],
            scale,
            suggestedScale: "log",
            binning: "banded",
        });
        const logged = makeStub({ degree: { ranking: [entry("a", 10, 1)], histogram: banded("log") } });
        const flat = makeStub({ betweenness: { ranking: [entry("a", 10, 1)], histogram: banded("linear") } });

        const onLog = metricDistribution(readNodeMetricResults(logged.graph, "degree"));
        const onLinear = metricDistribution(readNodeMetricResults(flat.graph, "betweenness"));

        expect(onLog.caption).toBe("Most connected per node (log scale)");
        expect(onLog.logX).toBe(true);
        expect(onLinear.caption).toBe("Bridges per node");
        expect(onLinear.logX).toBe(false);
    });

    it("draws nothing at all for a metric that measured nothing", () => {
        const stub = makeStub({ degree: {} });

        const distribution = metricDistribution(readNodeMetricResults(stub.graph, "degree"));

        expect(distribution.bins).toEqual([]);
        expect(distribution.axisMin).toBe("0");
        expect(distribution.axisMax).toBe("0");
        expect(distribution.logX).toBe(false);
    });

    it("asks the element for no more bars than this card's chart row can draw", () => {
        const stub = makeStub({ degree: { ranking: [entry("a", 3, 1)] } });
        let asked: unknown;
        const result = {
            ranking: () => [entry("a", 3, 1)],
            summary: () => ({ count: 1, measured: 1, min: 3, max: 3, median: 3, tiedAtMin: 1 }),
            histogram: (_field: string, options: unknown) => {
                asked = options;

                return NO_DISTRIBUTION;
            },
            graph: {},
        } as unknown as RunResult;
        const graph = {
            getSession: () => ({
                runs: { list: () => [{ id: "degree_1", algorithm: "degree", status: "succeeded", result }] },
            }),
        } as unknown as ElementGraph;

        readNodeMetricResults(graph, "degree");

        expect(asked).toEqual({ bins: METRIC_DISTRIBUTION_MAX_BINS, scale: "auto" });
        expect(stub.started).toEqual([]);
    });
});
