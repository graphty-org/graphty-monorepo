import { assert, describe, it } from "vitest";

import { algorithmByKey } from "../../../src/catalog/algorithms";
import type { AlgorithmDescriptor } from "../../../src/catalog/types";
import {
    ASSUMED_ITERATION_BOUND,
    type CostMeasurement,
    DEFAULT_COST_RATES,
    estimateCost,
    ITERATION_OPTION_NAME,
    type MachineCalibration,
    MEASUREMENT_EXTRAPOLATION_LIMIT,
} from "../../../src/session/cost";
import type { GraphStatistics } from "../../../src/session/types";

/** A graph of a stated size, with everything else set so nothing is accidentally refused. */
function statistics(over: Partial<GraphStatistics> = {}): GraphStatistics {
    const nodeCount = over.nodeCount ?? 1000;

    return {
        nodeCount,
        edgeCount: 4000,
        density: 0.004,
        directedness: "directed",
        weighted: false,
        selfLoopCount: 0,
        repeatedEdgeCount: 0,
        degreeRange: [0, 40],
        components: {
            count: 1,
            sizes: [nodeCount],
            largestSize: nodeCount,
            isolatedCount: 0,
            truncatedSizes: false,
            componentOf: () => 0,
        },
        ...over,
    };
}

/** A descriptor with nothing declared that would make an estimate interesting by accident. */
function descriptor(over: Partial<AlgorithmDescriptor> = {}): AlgorithmDescriptor {
    return {
        key: "acme:test",
        plainName: "Test",
        technicalName: "test",
        description: "A descriptor written for a test.",
        category: "structure",
        shape: "node-metric",
        fields: [
            {
                name: "value",
                plainName: "Value",
                technicalName: "value",
                kind: "node",
                type: "number",
                path: "results.$.value",
            },
        ],
        options: [],
        costClass: "instant",
        complexity: "O(n + m)",
        ...over,
    };
}

/** A calibration that measured this machine, or one that failed to. */
function calibration(basis: "probe" | "defaults", machine = "c8-m8"): MachineCalibration {
    return { rates: DEFAULT_COST_RATES, at: "2026-09-19T00:00:00.000Z", machine, basis };
}

/** One recorded timing. */
function measurement(over: Partial<CostMeasurement> = {}): CostMeasurement {
    return {
        algorithm: "degree",
        nodes: 500,
        edges: 2000,
        seconds: 0.01,
        at: "2026-09-19T00:00:00.000Z",
        machine: "c8-m8",
        ...over,
    };
}

/** A log in the shape the estimate reads. */
function logOf(...entries: readonly CostMeasurement[]): ReadonlyMap<string, CostMeasurement> {
    return new Map(entries.map((entry) => [entry.algorithm, entry]));
}

describe("estimateCost: the synchronous answer", () => {
    it("answers without a promise and hands back a frozen object", () => {
        const estimate = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
        });

        assert.notInstanceOf(estimate, Promise);
        assert.isTrue(Object.isFrozen(estimate), "an estimate a UI holds across a frame must not be editable");
    });

    it("multiplies the work term by the rate for a linear algorithm", () => {
        const estimate = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
        });

        assert.equal(estimate.costClass, "instant");
        assert.isTrue(estimate.available);
        assert.closeTo(estimate.seconds, 5000 / DEFAULT_COST_RATES.linearElementsPerSecond, 1e-12);
    });

    it("uses the pair term for a heavy algorithm", () => {
        const estimate = estimateCost({
            algorithm: "betweenness",
            descriptor: algorithmByKey("betweenness"),
            statistics: statistics(),
        });

        assert.equal(estimate.costClass, "heavy");
        assert.closeTo(estimate.seconds, (1000 * 4000) / DEFAULT_COST_RATES.heavyPairsPerSecond, 1e-12);
    });

    it("says in words where the number came from", () => {
        const estimate = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics({ nodeCount: 70000, edgeCount: 350000 }),
        });

        assert.include(estimate.basis, "n=70,000");
        assert.include(estimate.basis, "m=350,000");
        assert.include(estimate.basis, "n + m");
        assert.include(estimate.basis, "has not been calibrated");
    });
});

describe("estimateCost: the iteration bound comes from the algorithm's own schema", () => {
    it("reads PageRank's declared bound instead of a constant written here", () => {
        const pagerank = algorithmByKey("pagerank");
        assert.isDefined(pagerank);

        const declared = pagerank?.options.find((option) => option.name === ITERATION_OPTION_NAME);
        assert.isDefined(declared, "PageRank must publish its iteration bound, or nothing can read it");

        const estimate = estimateCost({ algorithm: "pagerank", descriptor: pagerank, statistics: statistics() });
        const bound = declared?.default as number;

        assert.closeTo(
            estimate.seconds,
            (bound * 5000) / DEFAULT_COST_RATES.iterativeElementsPerSecond,
            1e-12,
            "the estimate must be the schema's bound times the work, not a copied number",
        );
        assert.include(estimate.basis, `k=${bound}`);
    });

    it("lets a caller's parameter override the declared bound", () => {
        const pagerank = algorithmByKey("pagerank");
        const base = estimateCost({ algorithm: "pagerank", descriptor: pagerank, statistics: statistics() });
        const fewer = estimateCost({
            algorithm: "pagerank",
            descriptor: pagerank,
            params: { maxIterations: 10 },
            statistics: statistics(),
        });

        assert.isBelow(fewer.seconds, base.seconds);
        assert.include(fewer.basis, "k=10");
    });

    it("degrades to modelled when no bound is declared anywhere, however well calibrated", () => {
        const estimate = estimateCost({
            algorithm: "acme:test",
            descriptor: descriptor({ costClass: "iterative" }),
            statistics: statistics(),
            calibration: calibration("probe"),
        });

        assert.equal(estimate.confidence, "modelled", "an assumed iteration count is a guess, whatever the rate is");
        assert.include(estimate.basis, "no iteration bound is declared");
        assert.include(estimate.basis, String(ASSUMED_ITERATION_BOUND));
    });
});

describe("estimateCost: the confidence ladder", () => {
    it("reports modelled with no calibration and no timing", () => {
        const estimate = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
        });

        assert.equal(estimate.confidence, "modelled");
    });

    it("reports calibrated once this machine has been probed", () => {
        const estimate = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
            calibration: calibration("probe"),
        });

        assert.equal(estimate.confidence, "calibrated");
        assert.include(estimate.basis, "on this device");
    });

    it("stays modelled when the probe could not run", () => {
        const estimate = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
            calibration: calibration("defaults"),
        });

        assert.equal(estimate.confidence, "modelled", "a calibration that fell back to defaults measured nothing");
        assert.include(estimate.basis, "could not measure this device");
    });

    it("reports measured, and scales, when this algorithm has run here at a comparable size", () => {
        const estimate = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
            calibration: calibration("probe"),
            measurements: logOf(measurement()),
        });

        assert.equal(estimate.confidence, "measured");
        assert.closeTo(estimate.seconds, 0.02, 1e-12, "5,000 units against a 2,500-unit run that took 0.01 s");
        assert.include(estimate.basis, "measured 2026-09-19");
    });

    it("degrades when the timing has to be stretched past the band it is trusted over", () => {
        const estimate = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
            measurements: logOf(measurement({ nodes: 1, edges: 1 })),
        });

        assert.equal(estimate.confidence, "modelled");
        assert.include(estimate.basis, "extrapolated");
        assert.include(estimate.basis, `${MEASUREMENT_EXTRAPOLATION_LIMIT}x band`);
    });

    it("ignores a timing taken on another machine", () => {
        const estimate = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
            calibration: calibration("probe"),
            measurements: logOf(measurement({ machine: "somewhere-else" })),
        });

        assert.equal(estimate.confidence, "calibrated", "a timing from elsewhere is not a measurement of this machine");
        assert.notInclude(estimate.basis, "somewhere-else");
    });

    it("keeps a plugin's own cost model at modelled, calibration or not", () => {
        const estimate = estimateCost({
            algorithm: "acme:test",
            descriptor: descriptor({ cost: (n, m) => (n + m) / 1000 }),
            statistics: statistics(),
            calibration: calibration("probe"),
        });

        assert.equal(estimate.confidence, "modelled");
        assert.closeTo(estimate.seconds, 5, 1e-12);
        assert.include(estimate.basis, "declared cost model");
    });
});

describe("estimateCost: inputs that cannot support a number", () => {
    it("reports unknown for an unbounded cost class rather than inventing seconds", () => {
        const estimate = estimateCost({
            algorithm: "acme:test",
            descriptor: descriptor({ costClass: "unbounded" }),
            statistics: statistics(),
            calibration: calibration("probe"),
        });

        assert.equal(estimate.confidence, "unknown");
        assert.equal(estimate.seconds, Number.POSITIVE_INFINITY);
        assert.isTrue(estimate.available, "unbounded means unknowable, not unrunnable");
        assert.isFalse(estimate.seconds < 10, "an unbounded run must not slip through a caller's threshold");
    });

    it("reports unknown when the graph's size is not a usable number", () => {
        const estimate = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics({ nodeCount: Number.NaN }),
            calibration: calibration("probe"),
        });

        assert.equal(estimate.confidence, "unknown");
        assert.equal(estimate.seconds, Number.POSITIVE_INFINITY);
        assert.include(estimate.basis, "not known yet");
    });

    it("reports unknown and unavailable for an algorithm nothing registers", () => {
        const estimate = estimateCost({ algorithm: "acme:nope", statistics: statistics() });

        assert.equal(estimate.confidence, "unknown");
        assert.isFalse(estimate.available);
        assert.include(estimate.reason ?? "", "acme:nope");
    });
});

describe("estimateCost: whether it can run on this graph at all", () => {
    it("refuses an undirected algorithm on a directed graph, naming the requirement", () => {
        const estimate = estimateCost({
            algorithm: "kruskal",
            descriptor: algorithmByKey("kruskal"),
            statistics: statistics({ directedness: "directed" }),
        });

        assert.isFalse(estimate.available);
        assert.include(estimate.reason ?? "", "undirected");
        assert.include(estimate.basis, estimate.reason ?? "");
    });

    it("offers the same algorithm on an undirected graph", () => {
        const estimate = estimateCost({
            algorithm: "kruskal",
            descriptor: algorithmByKey("kruskal"),
            statistics: statistics({ directedness: "undirected" }),
        });

        assert.isTrue(estimate.available);
        assert.isUndefined(estimate.reason);
    });

    it("says nothing about direction for a graph whose direction nothing has settled", () => {
        const estimate = estimateCost({
            algorithm: "kruskal",
            descriptor: algorithmByKey("kruskal"),
            statistics: statistics({ directedness: "unknown", nodeCount: 0, edgeCount: 0 }),
        });

        assert.isTrue(estimate.available, "an empty graph under auto has no direction to fail");
    });

    it("refuses an algorithm that needs weights on a graph of all ones", () => {
        const estimate = estimateCost({
            algorithm: "acme:test",
            descriptor: descriptor({ requires: { weighted: true } }),
            statistics: statistics({ weighted: false }),
        });

        assert.isFalse(estimate.available);
        assert.include(estimate.reason ?? "", "weights");
    });

    it("refuses an algorithm that needs one piece on a graph in several, and counts them", () => {
        const estimate = estimateCost({
            algorithm: "acme:test",
            descriptor: descriptor({ requires: { connected: true } }),
            statistics: statistics({
                components: {
                    count: 4000,
                    sizes: [900],
                    largestSize: 900,
                    isolatedCount: 10,
                    truncatedSizes: false,
                    componentOf: () => 0,
                },
            }),
        });

        assert.isFalse(estimate.available);
        assert.include(estimate.reason ?? "", "4,000 pieces");
    });

    it("refuses an accelerator-only algorithm until one is attached", () => {
        const needsGpu = descriptor({ requires: { accelerator: true } });
        const without = estimateCost({ algorithm: "acme:test", descriptor: needsGpu, statistics: statistics() });
        const withGpu = estimateCost({
            algorithm: "acme:test",
            descriptor: needsGpu,
            statistics: statistics(),
            acceleratorAvailable: true,
        });

        assert.isFalse(without.available);
        assert.include(without.reason ?? "", "accelerator");
        assert.isTrue(withGpu.available);
    });
});

describe("estimateCost: what a UI reads off it", () => {
    it("reports a short run as not blocking the frame", () => {
        const estimate = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
        });

        assert.isBelow(estimate.seconds, 1 / 60);
        assert.isFalse(estimate.blocksFrame);
    });

    it("reports a long unchunked run as blocking the frame and not cancellable", () => {
        const estimate = estimateCost({
            algorithm: "betweenness",
            descriptor: algorithmByKey("betweenness"),
            statistics: statistics({ nodeCount: 200000, edgeCount: 1000000 }),
        });

        assert.isTrue(estimate.blocksFrame);
        assert.isFalse(estimate.cancellable, "work with no yield point cannot notice a signal");
    });

    it("reports a chunked run as cancellable and frame-safe at any size", () => {
        const estimate = estimateCost({
            algorithm: "betweenness",
            descriptor: algorithmByKey("betweenness"),
            statistics: statistics({ nodeCount: 200000, edgeCount: 1000000 }),
            chunked: true,
        });

        assert.isFalse(estimate.blocksFrame);
        assert.isTrue(estimate.cancellable);
    });
});

describe("estimateCost: scope and sampling", () => {
    it("estimates over the scope rather than the whole graph", () => {
        const whole = estimateCost({
            algorithm: "betweenness",
            descriptor: algorithmByKey("betweenness"),
            statistics: statistics({ nodeCount: 10000, edgeCount: 50000 }),
        });
        const part = estimateCost({
            algorithm: "betweenness",
            descriptor: algorithmByKey("betweenness"),
            statistics: statistics({ nodeCount: 10000, edgeCount: 50000 }),
            scope: { nodes: 1000, edges: 5000 },
        });

        assert.isBelow(part.seconds, whole.seconds);
        assert.include(part.basis, "n=1,000");
    });

    it("says when the scope's sizes were scaled rather than counted", () => {
        const estimate = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
            scope: { nodes: 500, edges: 2000, exact: false },
        });

        assert.include(estimate.basis, "scaled from the whole graph");
    });

    it("scales the work by the share of the graph a sample covers", () => {
        const exact = estimateCost({
            algorithm: "betweenness",
            descriptor: algorithmByKey("betweenness"),
            statistics: statistics({ nodeCount: 10000, edgeCount: 50000 }),
        });
        const sampled = estimateCost({
            algorithm: "betweenness",
            descriptor: algorithmByKey("betweenness"),
            statistics: statistics({ nodeCount: 10000, edgeCount: 50000 }),
            sample: 100,
        });

        assert.closeTo(sampled.seconds, exact.seconds / 100, 1e-9);
        assert.include(sampled.basis, "sampled at 100 of 10,000 nodes");
    });

    it("never scales a sample above the whole graph", () => {
        const exact = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
        });
        const oversampled = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
            sample: 10_000_000,
        });

        assert.equal(oversampled.seconds, exact.seconds);
    });
});

describe("estimateCost: the failure it exists to prevent", () => {
    it("does not report a 70,000-node betweenness run as a couple of seconds", () => {
        // The consumer's own model estimated 2.10 s for a graph of this size, showed no
        // confirmation, and then locked the frame for 10.4 s.
        const estimate = estimateCost({
            algorithm: "betweenness",
            descriptor: algorithmByKey("betweenness"),
            statistics: statistics({ nodeCount: 70000, edgeCount: 350000 }),
        });

        assert.isAbove(estimate.seconds, 10, "an n*m sweep at this size is minutes, and the number has to say so");
        assert.isTrue(estimate.blocksFrame);
    });

    it("grows with size rather than flattening, which is what a mis-fit does", () => {
        const sizes = [10000, 20000, 40000, 80000];
        const seconds = sizes.map((nodeCount) =>
            estimateCost({
                algorithm: "betweenness",
                descriptor: algorithmByKey("betweenness"),
                statistics: statistics({ nodeCount, edgeCount: nodeCount * 5 }),
            }).seconds,
        );

        for (let i = 1; i < seconds.length; i++) {
            assert.isAtLeast(seconds[i] / seconds[i - 1], 3.9, "doubling n and m must roughly quadruple an n*m sweep");
        }
    });
});
