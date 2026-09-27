/**
 * The size gate, which is now a gate and no longer a model.
 *
 * What a run costs is graphty-element's answer and is tested in graphty-element, against
 * its own rate table, its own calibration and the timing of the last real run. Nothing
 * here asserts a number of seconds the shell worked out, because the shell works none
 * out. What is asserted is everything the shell still owns: the two limits, the verdict
 * at each band, every string a reader sees, and the two things the interface must do when
 * the element's answer carries no usable number.
 */

import type { CostEstimate, GraphSession, SessionCommand } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import {
    ASK_LIMIT_SECONDS,
    formatEstimateDuration,
    metricCost,
    type MetricCostEstimate,
    metricCostFromEstimate,
    metricCosts,
    type MetricCostVerdict,
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

/**
 * An element estimate of a run that can go ahead.
 *
 * Its `costClass` and its `basis` deliberately carry the vocabulary spec 1918-1927 keeps
 * off every surface, because that is what the estimate really looks like: the element
 * publishes the class as a field and spells the work term out in the basis line. A gate
 * that passed either of them through would be caught by the sweep below rather than by a
 * reader.
 * @param seconds - what the element says the run would take.
 * @returns the estimate.
 */
function elementEstimate(seconds: number): CostEstimate {
    return {
        seconds,
        confidence: "modelled",
        costClass: "heavy",
        blocksFrame: true,
        cancellable: false,
        available: true,
        basis: "n=20,000 m=60,000; n * m; iterative work at built-in rates; this device has not been calibrated",
    };
}

/**
 * An element estimate of a run it will not start, with the sentence it wrote to say why.
 * @param reason - the element's own sentence.
 * @returns the estimate.
 */
function refusedEstimate(reason: string): CostEstimate {
    return {
        seconds: Number.POSITIVE_INFINITY,
        confidence: "unknown",
        costClass: "heavy",
        blocksFrame: false,
        cancellable: false,
        available: false,
        reason,
        basis: `n=20,000 m=60,000; ${reason}`,
    };
}

/** A session that answers a fixed estimate per algorithm, and records what it was asked. */
interface CostingSession {
    /** The session, with only the member the gate reads. */
    readonly session: GraphSession;
    /** Every command it was handed, in order. */
    readonly asked: SessionCommand[];
}

/**
 * A session whose estimate is whatever the board says, per algorithm.
 * @param seconds - how long each named algorithm would take; an unnamed one is instant.
 * @returns the session and the commands it was asked.
 */
function sessionCosting(seconds: Readonly<Partial<Record<NodeMetricId, number>>>): CostingSession {
    const asked: SessionCommand[] = [];
    const session = {
        estimate: (command: SessionCommand): CostEstimate => {
            asked.push(command);

            return elementEstimate(seconds[command.algorithm as NodeMetricId] ?? 0);
        },
    } as unknown as GraphSession;

    return { session, asked };
}

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

/** Under the ask limit by a wide margin: every metric runs at once. */
const SMALL_SECONDS = 0.04;

/** The spec's own "Run (about 4 min)" example. */
const ASK_SECONDS = 240;

/** The spec's own "about 3 h" example. */
const WARN_SECONDS = 10800;

describe("metricCostFromEstimate", () => {
    it("lets every metric run at once below the ask limit", () => {
        for (const metric of ALL_METRICS) {
            const estimate = metricCostFromEstimate(metric, elementEstimate(SMALL_SECONDS));

            expect(estimate.metric).toBe(metric);
            expect(estimate.seconds).toBe(SMALL_SECONDS);
            expect(estimate.verdict).toBe("run");
            expect(estimate.runLabel).toBe("Run");
            expect(estimate.runTitle).toBe("Run");
            expect(estimate.confirmSentence).toBeUndefined();
            expect(estimate.warningSentence).toBeUndefined();
        }
    });

    it("asks between the two limits, stating the estimate on the button and in the dialog", () => {
        const bridges = metricCostFromEstimate("betweenness", elementEstimate(ASK_SECONDS));

        expect(bridges.verdict).toBe("ask");
        expect(bridges.runLabel).toMatch(/^Run \(about .+\)$/);
        expect(bridges.runLabel).toBe("Run (about 4 min)");
        expect(bridges.runTitle).toBe(bridges.runLabel);
        expect(bridges.confirmSentence).toBe("This will take about 4 min at this size.");
        expect(bridges.warningSentence).toBeUndefined();
    });

    it("runs at once at a hair under the ask limit and asks at exactly the limit", () => {
        expect(metricCostFromEstimate("degree", elementEstimate(ASK_LIMIT_SECONDS - 0.01)).verdict).toBe("run");
        expect(metricCostFromEstimate("degree", elementEstimate(ASK_LIMIT_SECONDS)).verdict).toBe("ask");
    });

    it("still only asks at exactly the warn limit, and warns above it", () => {
        expect(metricCostFromEstimate("betweenness", elementEstimate(WARN_LIMIT_SECONDS)).verdict).toBe("ask");
        expect(metricCostFromEstimate("betweenness", elementEstimate(WARN_LIMIT_SECONDS + 1)).verdict).toBe("warn");
    });

    it("warns above the warn limit and never offers a sample that was not taken", () => {
        const bridges = metricCostFromEstimate("betweenness", elementEstimate(WARN_SECONDS));

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
        const bands = [0, SMALL_SECONDS, ASK_SECONDS, WARN_SECONDS];

        for (const metric of ALL_METRICS) {
            for (const seconds of bands) {
                const estimate = metricCostFromEstimate(metric, elementEstimate(seconds));
                for (const text of allStrings(estimate)) {
                    for (const word of FORBIDDEN_CLASS_WORDS) {
                        expect(text.toLowerCase()).not.toContain(word);
                    }
                }
            }
        }
    });

    it("keeps Run's full text in every form -- floor item 4 (spec 4954-4956)", () => {
        const bands = [SMALL_SECONDS, ASK_SECONDS, WARN_SECONDS, Number.POSITIVE_INFINITY];

        for (const seconds of bands) {
            const estimate = metricCostFromEstimate("betweenness", elementEstimate(seconds));

            expect(estimate.runLabel.startsWith("Run")).toBe(true);
            expect(estimate.runLabel.length).toBeGreaterThanOrEqual("Run".length);
            expect(estimate.runTitle).toBe(estimate.runLabel);
        }
    });

    it("runs at once for an estimate of nothing at all", () => {
        for (const metric of ALL_METRICS) {
            const estimate = metricCostFromEstimate(metric, elementEstimate(0));

            expect(estimate.seconds).toBe(0);
            expect(estimate.verdict).toBe("run");
            expect(estimate.runLabel).toBe("Run");
        }
    });

    /**
     * The element reports a refusal rather than throwing, and the shell's whole job with
     * one is to repeat the element's sentence and start nothing. Inventing a duration
     * here is the failure this pins: an infinite estimate formats as "under a second".
     */
    it("says the element's own reason, and confirms nothing, when the run cannot happen", () => {
        const reason = "Needs a directed graph; this graph is undirected.";
        const estimate = metricCostFromEstimate("pagerank", refusedEstimate(reason));

        expect(estimate.verdict).toBe("unavailable");
        expect(estimate.warningSentence).toBe(reason);
        expect(estimate.confirmSentence).toBeUndefined();
        expect(estimate.runLabel).toBe("Run");
        expect(estimate.runTitle).toBe("Run");
        // Infinity, not a stand-in number: every "under N seconds" gate downstream has to
        // refuse this card, and a fabricated figure would be waved through.
        expect(estimate.seconds).toBe(Number.POSITIVE_INFINITY);
        for (const text of allStrings(estimate)) {
            expect(text).not.toContain("under a second");
        }
    });

    it("falls back to a sentence of its own only when the element supplied none", () => {
        const silent = { ...refusedEstimate("unused"), reason: undefined };
        const estimate = metricCostFromEstimate("degree", silent);

        expect(estimate.verdict).toBe("unavailable");
        expect(estimate.warningSentence).toBe("This cannot run on this graph.");
    });

    /**
     * A run the element allows but cannot bound. No metric this slice ships can reach it
     * today -- all three declare a bounded cost class -- but a gate with no number must
     * take the cautious branch rather than the cheap one, because the cheap branch is a
     * bare "Run" in front of work nobody can size.
     */
    it("warns in words, and states no duration, for a run whose length is not knowable", () => {
        const estimate = metricCostFromEstimate("betweenness", elementEstimate(Number.POSITIVE_INFINITY));

        expect(estimate.verdict).toBe("warn");
        expect(estimate.runLabel).toBe("Run anyway");
        expect(estimate.warningSentence).toBe(
            "How long this will take at this size is not known. Filter to a part, and run it there.",
        );
        expect(estimate.confirmSentence).toBe(estimate.warningSentence);
        for (const text of allStrings(estimate)) {
            expect(text).not.toContain("about");
            expect(text).not.toContain("under a second");
        }
    });
});

describe("metricCost", () => {
    it("asks the element what THIS run would cost, by the key the run is started under", () => {
        const costing = sessionCosting({ betweenness: ASK_SECONDS });
        const estimate = metricCost(costing.session, "betweenness");

        expect(costing.asked).toEqual([{ op: "algo.run", algorithm: "betweenness" }]);
        expect(estimate.seconds).toBe(ASK_SECONDS);
        expect(estimate.verdict).toBe("ask");
    });

    /**
     * Between mount and the element coming up there is no run to gate, so the card draws
     * the same plain Run it draws for a graph of no size. An unavailability here would
     * put a sentence under Run that the reader can do nothing about, for a state that
     * lasts a few frames; the click is refused further down, by the one place that can
     * tell a missing element from a refused run.
     */
    it("draws a plain Run while there is no element to ask", () => {
        const estimate = metricCost(null, "betweenness");

        expect(estimate.verdict).toBe("run");
        expect(estimate.runLabel).toBe("Run");
        expect(estimate.seconds).toBe(0);
    });
});

describe("metricCosts", () => {
    it("gates every metric, and agrees with the gate asked one at a time", () => {
        const seconds = { betweenness: WARN_SECONDS, degree: SMALL_SECONDS, pagerank: ASK_SECONDS };
        const costs = metricCosts(sessionCosting(seconds).session);

        for (const metric of ALL_METRICS) {
            expect(costs[metric].seconds).toBe(seconds[metric]);
            expect(costs[metric]).toEqual(metricCost(sessionCosting(seconds).session, metric));
        }

        expect(costs.degree.verdict).toBe("run");
        expect(costs.pagerank.verdict).toBe("ask");
        expect(costs.betweenness.verdict).toBe("warn");
    });

    it("is frozen, because several surfaces read it and none may edit it", () => {
        expect(Object.isFrozen(metricCosts(sessionCosting({}).session))).toBe(true);
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

/**
 * The PageRank runs that ended the shell's own cost model, held against the gate.
 *
 * These are not invented numbers. Each row is a real run of the path the element takes --
 * `PageRankAlgorithm` with `useDelta` true, so `SimpleDeltaPageRank` for every graph over
 * 100 nodes -- at 100 iterations, damping .85 and tolerance 1e-6 over a sparse random
 * graph (m = 5n) that exhausts the iteration bound rather than converging early.
 *
 * The shell used to estimate this work itself, and it charged PageRank at the DEGREE
 * pass's rate: two different pieces of work, one constant. That made the gate optimistic
 * by 3.5x at 20,000 nodes and 6.9x at 200,000, always in the direction that costs a
 * reader rather than the direction that costs them a dialog. At about 70,000 nodes the
 * shell estimated 2.10 s, so Run read a bare "Run" with no estimate and no confirm, and
 * the frame locked for 10.4 s with no progress, no cancel and no repaint. The model is
 * the element's now, and these timings are in its rate table.
 *
 * What survives here is the shell's half, and it is the half that failed: a run the
 * stopwatch says takes this long must be ASKED about before it starts. The estimate is
 * the element's input to that decision, so each row states what the element now says and
 * asserts what the reader is then shown.
 */
interface PagerankMeasurement {
    /** Nodes in the measured graph. */
    readonly nodeCount: number;
    /** Wall-clock seconds the real run took. */
    readonly measuredSeconds: number;
}

/** The measured band. Sparse, directed, 100 iterations actually used. */
const PAGERANK_MEASUREMENTS: readonly PagerankMeasurement[] = [
    { nodeCount: 2000, measuredSeconds: 0.14 },
    { nodeCount: 20000, measuredSeconds: 2.13 },
    { nodeCount: 50000, measuredSeconds: 6.89 },
    { nodeCount: 70000, measuredSeconds: 10.41 },
    { nodeCount: 100000, measuredSeconds: 16.89 },
    { nodeCount: 200000, measuredSeconds: 41.54 },
];

/**
 * run < ask < warn < unavailable, so a test can say "at least as cautious as" without a
 * branch per verdict. Nothing runs at all at the top of the ladder.
 */
const VERDICT_RANK: Readonly<Record<MetricCostVerdict, number>> = { ask: 1, run: 0, unavailable: 3, warn: 2 };

/**
 * What the gate SHOULD say about a run that really takes this long.
 * @param seconds - the measured wall-clock time.
 * @returns the verdict a perfectly calibrated estimate would produce.
 */
function truthfulVerdict(seconds: number): MetricCostVerdict {
    if (seconds > WARN_LIMIT_SECONDS) {
        return "warn";
    }

    return seconds >= ASK_LIMIT_SECONDS ? "ask" : "run";
}

describe("the gate, against the PageRank runs that closed the shell's own model", () => {
    it("never waves through a run the stopwatch says needs asking about", () => {
        for (const { measuredSeconds } of PAGERANK_MEASUREMENTS) {
            const estimate = metricCostFromEstimate("pagerank", elementEstimate(measuredSeconds));

            expect(VERDICT_RANK[estimate.verdict]).toBeGreaterThanOrEqual(VERDICT_RANK[truthfulVerdict(measuredSeconds)]);
        }
    });

    it("asks at the three sizes that used to ship a bare Run and a locked tab", () => {
        // 10.4 s, 16.9 s and 41.5 s of frozen frame, estimated at 2.10, 3.00 and 6.00 s.
        const misfires = PAGERANK_MEASUREMENTS.filter((row) => row.measuredSeconds >= ASK_LIMIT_SECONDS);

        expect(misfires).toHaveLength(3);

        for (const { measuredSeconds } of misfires) {
            const estimate = metricCostFromEstimate("pagerank", elementEstimate(measuredSeconds));

            expect(estimate.verdict).toBe("ask");
            expect(estimate.runLabel).toMatch(/^Run \(about .+\)$/);
            expect(estimate.confirmSentence).toBeDefined();
        }
    });

    it("states the estimate the reader is asked to accept", () => {
        const estimate = metricCostFromEstimate("pagerank", elementEstimate(16.89));

        expect(estimate.runLabel).toBe("Run (about 17 s)");
        expect(estimate.runTitle).toBe(estimate.runLabel);
        expect(estimate.confirmSentence).toBe("This will take about 17 s at this size.");
        expect(estimate.warningSentence).toBeUndefined();
    });

    it("spends no dialog on the smallest measured run, which finishes before one could paint", () => {
        const estimate = metricCostFromEstimate("pagerank", elementEstimate(0.14));

        expect(estimate.verdict).toBe("run");
        expect(estimate.runLabel).toBe("Run");
        expect(estimate.confirmSentence).toBeUndefined();
    });
});
