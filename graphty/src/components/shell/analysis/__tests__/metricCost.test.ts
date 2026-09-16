import { describe, expect, it } from "vitest";

import {
    ASK_LIMIT_SECONDS,
    BETWEENNESS_PAIRS_PER_SECOND,
    estimateMetricCost,
    estimateMetricSeconds,
    estimateSecondsByMetric,
    formatEstimateDuration,
    LINEAR_ELEMENTS_PER_SECOND,
    type MetricCostEstimate,
    type MetricCostVerdict,
    PAGERANK_ELEMENTS_PER_SECOND,
    PAGERANK_ITERATION_BOUND,
    WARN_LIMIT_SECONDS,
} from "../metricCost";
import { type NodeMetricId } from "../nodeMetrics";

/** The three metrics this slice ships, in the order the Suggested list draws them. */
const ALL_METRICS: readonly NodeMetricId[] = ["degree", "betweenness", "pagerank"];

/**
 * The six cost class names spec 1918-1927 forbids the interface from ever printing.
 * Engineering reference only: "No class name ever appears in the interface."
 */
const FORBIDDEN_CLASS_WORDS: readonly string[] = ["instant", "iterative", "heavy", "sampled", "cubic", "unbounded"];

/** A graph small enough that every metric finishes before the reader lets go of the mouse. */
const SMALL = { nodeCount: 200, edgeCount: 600 };

/** n * m / 5,000,000 = 240 s, which is the spec's own "Run (about 4 min)" example. */
const ASK_SIZE = { nodeCount: 20000, edgeCount: 60000 };

/** n * m / 5,000,000 = 10,000 s, which is the spec's own "about 3 h" example. */
const WARN_SIZE = { nodeCount: 100000, edgeCount: 500000 };

/**
 * Every string one estimate exposes, so a test can sweep all of them at once.
 * @param estimate - the estimate to flatten.
 * @returns the label, the title and both sentences, with absent sentences dropped.
 */
function allStrings(estimate: MetricCostEstimate): string[] {
    return [estimate.runLabel, estimate.runTitle, estimate.confirmSentence, estimate.warningSentence].filter(
        (value): value is string => typeof value === "string",
    );
}

describe("estimateMetricCost", () => {
    it("lets every metric run at once on a small graph", () => {
        for (const metric of ALL_METRICS) {
            const estimate = estimateMetricCost({ metric, ...SMALL });

            expect(estimate.verdict).toBe("run");
            expect(estimate.runLabel).toBe("Run");
            expect(estimate.runTitle).toBe("Run");
            expect(estimate.confirmSentence).toBeUndefined();
            expect(estimate.warningSentence).toBeUndefined();
        }
    });

    it("asks for betweenness between the two limits while degree still runs at once", () => {
        const bridges = estimateMetricCost({ metric: "betweenness", ...ASK_SIZE });

        expect(bridges.seconds).toBeGreaterThanOrEqual(ASK_LIMIT_SECONDS);
        expect(bridges.seconds).toBeLessThanOrEqual(WARN_LIMIT_SECONDS);
        expect(bridges.verdict).toBe("ask");
        expect(bridges.runLabel).toMatch(/^Run \(about .+\)$/);
        expect(bridges.runLabel).toBe("Run (about 4 min)");
        expect(bridges.runTitle).toBe(bridges.runLabel);
        expect(bridges.confirmSentence).toBe("This will take about 4 min at this size.");
        expect(bridges.warningSentence).toBeUndefined();

        const degree = estimateMetricCost({ metric: "degree", ...ASK_SIZE });

        expect(degree.verdict).toBe("run");
        expect(degree.runLabel).toBe("Run");
    });

    it("warns above the warn limit and never offers a sample that was not taken", () => {
        const bridges = estimateMetricCost({ metric: "betweenness", ...WARN_SIZE });

        expect(bridges.seconds).toBeGreaterThan(WARN_LIMIT_SECONDS);
        expect(bridges.verdict).toBe("warn");
        expect(bridges.runLabel.startsWith("Run anyway (")).toBe(true);
        expect(bridges.runLabel).toBe("Run anyway (about 3 h)");
        expect(bridges.warningSentence).toBe("About 3 h at this size. Filter to a part, and run it there.");
        // The card and the dialog say ONE thing (spec 2043-2047).
        expect(bridges.confirmSentence).toBe(bridges.warningSentence);

        expect(bridges.warningSentence ?? "").toContain("Filter to a part");
        for (const text of allStrings(bridges)) {
            expect(text.toLowerCase()).not.toContain("sampled version");
            expect(text.toLowerCase()).not.toContain("sampled");
            expect(text.toLowerCase()).not.toContain("sample");
        }
    });

    it("never prints a cost class name, at any size, for any metric (spec 1918-1927)", () => {
        const sizes = [SMALL, ASK_SIZE, WARN_SIZE, { nodeCount: 0, edgeCount: 0 }];

        for (const metric of ALL_METRICS) {
            for (const size of sizes) {
                const estimate = estimateMetricCost({ metric, ...size });
                for (const text of allStrings(estimate)) {
                    for (const word of FORBIDDEN_CLASS_WORDS) {
                        expect(text.toLowerCase()).not.toContain(word);
                    }
                }
            }
        }
    });

    it("keeps Run's full text in every form -- floor item 4 (spec 4954-4956)", () => {
        for (const size of [SMALL, ASK_SIZE, WARN_SIZE]) {
            const estimate = estimateMetricCost({ metric: "betweenness", ...size });

            expect(estimate.runLabel.startsWith("Run")).toBe(true);
            expect(estimate.runLabel.length).toBeGreaterThanOrEqual("Run".length);
            expect(estimate.runTitle).toBe(estimate.runLabel);
        }
    });

    it("returns 0 seconds and runs at once for non-finite, negative and zero sizes", () => {
        const broken = [
            { nodeCount: Number.NaN, edgeCount: Number.NaN },
            { nodeCount: Number.POSITIVE_INFINITY, edgeCount: Number.POSITIVE_INFINITY },
            { nodeCount: -100, edgeCount: -400 },
            { nodeCount: 0, edgeCount: 0 },
            { nodeCount: Number.POSITIVE_INFINITY, edgeCount: 0 },
        ];

        for (const metric of ALL_METRICS) {
            for (const size of broken) {
                const estimate = estimateMetricCost({ metric, ...size });

                expect(estimate.seconds).toBe(0);
                expect(Number.isFinite(estimate.seconds)).toBe(true);
                expect(estimate.verdict).toBe("run");
                expect(estimate.runLabel).toBe("Run");
            }
        }
    });
});

describe("estimateMetricSeconds", () => {
    it("costs PageRank strictly above degree on the same graph", () => {
        const size = { nodeCount: 40000, edgeCount: 120000 };
        const degree = estimateMetricSeconds({ metric: "degree", ...size });
        const pagerank = estimateMetricSeconds({ metric: "pagerank", ...size });

        expect(pagerank).toBeGreaterThan(degree);
    });

    it("grows betweenness with the PRODUCT of nodes and edges, not their sum", () => {
        // Same sum (2,000 elements), very different products (1,000,000 vs 190,000).
        const square = { nodeCount: 1000, edgeCount: 1000 };
        const lopsided = { nodeCount: 1900, edgeCount: 100 };

        expect(estimateMetricSeconds({ metric: "degree", ...square })).toBe(
            estimateMetricSeconds({ metric: "degree", ...lopsided }),
        );
        expect(estimateMetricSeconds({ metric: "betweenness", ...square })).toBeGreaterThan(
            estimateMetricSeconds({ metric: "betweenness", ...lopsided }),
        );

        // And doubling both sizes quadruples betweenness while degree only doubles.
        const base = estimateMetricSeconds({ metric: "betweenness", ...square });
        const doubled = estimateMetricSeconds({ metric: "betweenness", nodeCount: 2000, edgeCount: 2000 });

        expect(doubled).toBeCloseTo(base * 4, 10);
    });
});

describe("formatEstimateDuration", () => {
    it("says the spec's own shapes at each boundary", () => {
        expect(formatEstimateDuration(0.4)).toBe("under a second");
        expect(formatEstimateDuration(4)).toBe("about 4 s");
        expect(formatEstimateDuration(240)).toBe("about 4 min");
        expect(formatEstimateDuration(10800)).toBe("about 3 h");
    });

    it("groups large hour counts and never prints a bare NaN", () => {
        expect(formatEstimateDuration(4000 * 3600)).toBe("about 4,000 h");
        expect(formatEstimateDuration(Number.NaN)).toBe("under a second");
        expect(formatEstimateDuration(-5)).toBe("under a second");
    });
});

describe("estimateSecondsByMetric", () => {
    it("agrees with estimateMetricSeconds for every metric", () => {
        const size = { nodeCount: 12000, edgeCount: 44000 };
        const record = estimateSecondsByMetric(size);

        for (const metric of ALL_METRICS) {
            expect(Number.isFinite(record[metric])).toBe(true);
            expect(record[metric]).toBe(estimateMetricSeconds({ metric, ...size }));
        }
    });

    it("is frozen, because several surfaces read it and none may edit it", () => {
        expect(Object.isFrozen(estimateSecondsByMetric({ nodeCount: 10, edgeCount: 10 }))).toBe(true);
    });
});

/**
 * The PageRank row's calibration, pinned against a stopwatch.
 *
 * These are not invented sizes. Each row is a real run of the path the element actually
 * takes -- `PageRankAlgorithm` with `useDelta` true, so `SimpleDeltaPageRank` for every
 * graph over 100 nodes -- at 100 iterations, damping .85 and tolerance 1e-6 over a sparse
 * random graph (m = 5n) that exhausts the iteration bound rather than converging early.
 *
 * The row used to divide by LINEAR_ELEMENTS_PER_SECOND, the DEGREE pass's rate, which
 * made it optimistic by 3.5x to 6.9x across this band: at 100,000 nodes it promised 3 s,
 * drew a bare "Run" with no confirm, and froze the frame for 16.9 s. The module doc
 * records the whole defect. What follows is the guard, because the only test that touched
 * PageRank before asserted "pagerank > degree", which the broken row satisfied too.
 *
 * A future re-fit -- the per-device probe of spec 2043, or a faster delta implementation
 * -- is expected to move these numbers. It may not move them in the optimistic direction
 * past the truth: that is what {@link MAX_OPTIMISM} exists to catch.
 */
interface PagerankMeasurement {
    /** Nodes in the measured graph. */
    readonly nodeCount: number;
    /** Edges in the measured graph, as the reader would have imported them. */
    readonly edgeCount: number;
    /** Wall-clock seconds the real run took. */
    readonly measuredSeconds: number;
}

/** The measured band. Sparse, directed, 100 iterations actually used. */
const PAGERANK_MEASUREMENTS: readonly PagerankMeasurement[] = [
    { nodeCount: 2000, edgeCount: 10000, measuredSeconds: 0.14 },
    { nodeCount: 20000, edgeCount: 100000, measuredSeconds: 2.13 },
    { nodeCount: 50000, edgeCount: 250000, measuredSeconds: 6.89 },
    { nodeCount: 70000, edgeCount: 350000, measuredSeconds: 10.41 },
    { nodeCount: 100000, edgeCount: 500000, measuredSeconds: 16.89 },
    { nodeCount: 200000, edgeCount: 1000000, measuredSeconds: 41.54 },
];

/**
 * How far under the stopwatch the model may sit. Rounding the measured floor of
 * 2.9M elements/s up to a round 3M leaves the largest measured size about 4% optimistic,
 * and nothing wider than that is a fallback erring toward asking.
 */
const MAX_OPTIMISM = 0.95;

/**
 * How far over the stopwatch the model may sit. Caution is the allowed direction, but a
 * model that quoted minutes for a two-second run would teach the reader to click through
 * every confirm, which is the failure the gate's own doc names.
 */
const MAX_PESSIMISM = 4;

/** run < ask < warn, so a test can say "at least as cautious as" without three branches. */
const VERDICT_RANK: Readonly<Record<MetricCostVerdict, number>> = { ask: 1, run: 0, warn: 2 };

/**
 * What the gate SHOULD say about a run that really takes this long.
 * @param seconds - the measured wall-clock time.
 * @returns the verdict a perfectly calibrated model would return.
 */
function truthfulVerdict(seconds: number): MetricCostVerdict {
    if (seconds > WARN_LIMIT_SECONDS) {
        return "warn";
    }

    return seconds >= ASK_LIMIT_SECONDS ? "ask" : "run";
}

describe("the PageRank cost row, against measured runs", () => {
    it("charges PageRank at its own rate, not the degree pass's", () => {
        expect(PAGERANK_ELEMENTS_PER_SECOND).toBe(3000000);
        // The defect was these two being one constant. They are different work.
        expect(PAGERANK_ELEMENTS_PER_SECOND).toBeLessThan(LINEAR_ELEMENTS_PER_SECOND);

        const size = { nodeCount: 100000, edgeCount: 500000 };

        expect(estimateMetricSeconds({ metric: "pagerank", ...size })).toBeCloseTo(
            (PAGERANK_ITERATION_BOUND * (size.nodeCount + size.edgeCount)) / PAGERANK_ELEMENTS_PER_SECOND,
            10,
        );
    });

    it("is never more optimistic than the stopwatch, at any measured size", () => {
        for (const { nodeCount, edgeCount, measuredSeconds } of PAGERANK_MEASUREMENTS) {
            const seconds = estimateMetricSeconds({ metric: "pagerank", nodeCount, edgeCount });
            const ratio = seconds / measuredSeconds;

            expect(ratio).toBeGreaterThanOrEqual(MAX_OPTIMISM);
            expect(ratio).toBeLessThanOrEqual(MAX_PESSIMISM);
        }
    });

    it("never waves through a run the stopwatch says needs asking about", () => {
        for (const { nodeCount, edgeCount, measuredSeconds } of PAGERANK_MEASUREMENTS) {
            const estimate = estimateMetricCost({ metric: "pagerank", nodeCount, edgeCount });

            expect(VERDICT_RANK[estimate.verdict]).toBeGreaterThanOrEqual(VERDICT_RANK[truthfulVerdict(measuredSeconds)]);
        }
    });

    it("asks at the three sizes that used to ship a bare Run and a locked tab", () => {
        // 10.4 s, 16.9 s and 41.5 s of frozen frame, estimated at 2.10, 3.00 and 6.00 s.
        const misfires = PAGERANK_MEASUREMENTS.filter((row) => row.measuredSeconds >= ASK_LIMIT_SECONDS);

        expect(misfires).toHaveLength(3);

        for (const { nodeCount, edgeCount } of misfires) {
            const estimate = estimateMetricCost({ metric: "pagerank", nodeCount, edgeCount });

            expect(estimate.verdict).toBe("ask");
            expect(estimate.runLabel).toMatch(/^Run \(about .+\)$/);
            expect(estimate.confirmSentence).toBeDefined();

            // And the old rate would have said none of that.
            const oldSeconds = (PAGERANK_ITERATION_BOUND * (nodeCount + edgeCount)) / LINEAR_ELEMENTS_PER_SECOND;

            expect(oldSeconds).toBeLessThan(ASK_LIMIT_SECONDS);
        }
    });

    it("states the estimate the reader is asked to accept", () => {
        const estimate = estimateMetricCost({ metric: "pagerank", nodeCount: 100000, edgeCount: 500000 });

        expect(estimate.runLabel).toBe("Run (about 20 s)");
        expect(estimate.runTitle).toBe(estimate.runLabel);
        expect(estimate.confirmSentence).toBe("This will take about 20 s at this size.");
        expect(estimate.warningSentence).toBeUndefined();
    });

    it("leaves the betweenness row alone -- it was measured at 0.6-1.1x and is already cautious", () => {
        const size = { nodeCount: 2000, edgeCount: 8000 };

        expect(estimateMetricSeconds({ metric: "betweenness", ...size })).toBeCloseTo(
            (size.nodeCount * size.edgeCount) / BETWEENNESS_PAIRS_PER_SECOND,
            10,
        );
        expect(BETWEENNESS_PAIRS_PER_SECOND).toBe(5000000);
    });
});
