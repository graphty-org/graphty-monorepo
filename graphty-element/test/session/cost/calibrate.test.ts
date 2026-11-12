import { assert, beforeEach, describe, it, vi } from "vitest";

import { algorithmByKey } from "../../../src/catalog/algorithms";
import {
    calibrateCost,
    calibrateOnce,
    CostMeasurementLog,
    currentCalibration,
    DEFAULT_COST_RATES,
    estimateCost,
    machineFingerprint,
    resetCalibration,
} from "../../../src/session/cost";
import type { GraphStatistics } from "../../../src/session/types";

/** A graph of a stated size. */
function statistics(over: Partial<GraphStatistics> = {}): GraphStatistics {
    const nodeCount = over.nodeCount ?? 1000;

    return {
        nodeCount,
        edgeCount: 4000,
        density: 0.004,
        directedness: "directed",
        directednessSource: { by: "unsettled", statedBy: null },
        weighted: false,
        selfLoopCount: 0,
        repeatedEdgeCount: 0,
        degreeRange: [0, 40],
        meanDegree: 0,
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

beforeEach(() => {
    resetCalibration();
});

describe("calibrateCost: measuring this machine", () => {
    it("measures the three shapes of work and reports that it measured them", async () => {
        const calibration = await calibrateCost({ budgetMs: 60, machine: "test-machine" });

        assert.equal(calibration.machine, "test-machine");
        assert.isString(calibration.at);
        assert.oneOf(calibration.basis, ["probe", "defaults"]);

        if (calibration.basis === "defaults") {
            assert.deepEqual(calibration.rates, DEFAULT_COST_RATES);

            return;
        }

        for (const rate of Object.values(calibration.rates)) {
            assert.isTrue(
                Number.isFinite(rate) && rate > 0,
                "a probed rate that is not a positive number is not a rate",
            );
        }

        if (calibration.memorySpeed !== undefined) {
            assert.isTrue(
                Number.isFinite(calibration.memorySpeed) && calibration.memorySpeed > 0,
                "a memory speed that is not a positive number is not a reading",
            );
        }
    });

    it("measures memory when the budget leaves room for it", async () => {
        // A clock that advances 1 ms on every read: each timed sample then runs four repeats of
        // 131,072 increments in 4 ms, whatever the runner's speed, against the reference
        // machine's 145M increments a second.
        let clock = 0;
        const reads = vi.spyOn(performance, "now").mockImplementation(() => clock++);

        try {
            const calibration = await calibrateCost({ budgetMs: 1000, yieldNow: () => Promise.resolve() });

            assert.equal(calibration.basis, "probe");
            assert.closeTo(calibration.memorySpeed ?? Number.NaN, (4 * 131_072) / 0.004 / 145_000_000, 1e-9);
        } finally {
            reads.mockRestore();
        }
    });

    it("carries no memory speed when the budget is spent before memory is timed", async () => {
        // A clock that advances 1 ms on every read: each cost-class workload is timed in exactly
        // its third of 12 ms, leaving none for memory. The rates stand without it.
        let clock = 0;
        const reads = vi.spyOn(performance, "now").mockImplementation(() => clock++);

        try {
            const calibration = await calibrateCost({ budgetMs: 12, yieldNow: () => Promise.resolve() });

            assert.equal(calibration.basis, "probe");
            assert.isUndefined(calibration.memorySpeed);
        } finally {
            reads.mockRestore();
        }
    });

    it("reports the defaults rather than a fabricated rate when it has no time to measure", async () => {
        const calibration = await calibrateCost({ budgetMs: 0 });

        assert.equal(calibration.basis, "defaults");
        assert.deepEqual(calibration.rates, DEFAULT_COST_RATES);
    });

    it("reports the defaults for a budget that is not a usable number", async () => {
        const calibration = await calibrateCost({ budgetMs: Number.NaN });

        assert.equal(calibration.basis, "defaults");
    });

    it("hands the host its thread back between workloads", async () => {
        let yields = 0;
        await calibrateCost({
            budgetMs: 30,
            yieldNow: async () => {
                yields++;
                await Promise.resolve();
            },
        });

        // One after each of the three cost-class workloads, then four while the memory probe's
        // table is first written and three around its timed samples.
        assert.equal(yields, 10, "a probe that measures the frame must not hold it for the whole probe");
    });

    it("stays inside its budget", async () => {
        // A clock that advances 1 ms on every read, so the budget runs out after a known number
        // of reads whatever the runner's speed. Each workload gets a third of 3 ms: one start
        // read, one pass, one read that finds the share spent -- six reads for the three. That
        // leaves nothing for the memory probe, which reads no clock at all.
        let clock = 0;
        const reads = vi.spyOn(performance, "now").mockImplementation(() => clock++);

        try {
            const calibration = await calibrateCost({ budgetMs: 3 });

            assert.equal(
                reads.mock.calls.length,
                6,
                "the probe must not become the slow thing it exists to warn about",
            );
            assert.equal(calibration.basis, "defaults", "a share spent before the clock's resolution yields no rate");
        } finally {
            reads.mockRestore();
        }
    });

    it("degrades an estimate to modelled when it could not measure", async () => {
        const calibration = await calibrateCost({ budgetMs: 0 });
        const estimate = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
            calibration,
        });

        assert.equal(estimate.confidence, "modelled");
    });
});

describe("calibrateOnce: measured once, reused", () => {
    it("has nothing to report before anything measures", () => {
        assert.isUndefined(currentCalibration());
    });

    it("keeps the answer so a page with four graphs probes once", async () => {
        const first = await calibrateOnce({ budgetMs: 20, machine: "test-machine" });
        const second = await calibrateOnce({ budgetMs: 20, machine: "other-machine" });

        assert.strictEqual(second, first, "the second caller must get the first measurement, not a second probe");
        assert.strictEqual(currentCalibration(), first);
    });

    it("probes once when two callers ask at the same time", async () => {
        let probes = 0;
        const counting = async (): Promise<void> => {
            probes++;
            await Promise.resolve();
        };

        const [a, b] = await Promise.all([
            calibrateOnce({ budgetMs: 20, yieldNow: counting }),
            calibrateOnce({ budgetMs: 20, yieldNow: counting }),
        ]);

        assert.strictEqual(a, b);
        assert.equal(probes, 10, "ten yields is one probe; twenty would be two");
    });

    it("forgets on request, so a test and a changed machine both start clean", async () => {
        await calibrateOnce({ budgetMs: 20 });
        assert.isDefined(currentCalibration());

        resetCalibration();
        assert.isUndefined(currentCalibration());
    });
});

describe("machineFingerprint", () => {
    it("answers with a string on any host, measured or not", () => {
        const fingerprint = machineFingerprint();

        assert.isString(fingerprint);
        assert.isAbove(fingerprint.length, 0);
    });

    it("answers the same thing twice on the same machine", () => {
        assert.equal(machineFingerprint(), machineFingerprint());
    });
});

describe("CostMeasurementLog: what runs actually took", () => {
    it("keeps the most recent timing of each algorithm", () => {
        const log = new CostMeasurementLog();

        assert.isTrue(log.record({ algorithm: "degree", nodes: 10, edges: 20, seconds: 0.1, at: "a", machine: "m" }));
        assert.isTrue(log.record({ algorithm: "degree", nodes: 20, edges: 40, seconds: 0.2, at: "b", machine: "m" }));
        assert.isTrue(log.record({ algorithm: "pagerank", nodes: 10, edges: 20, seconds: 1, at: "c", machine: "m" }));

        assert.equal(log.size, 2);
        assert.equal(log.latest("degree")?.at, "b");
        assert.equal(log.latest("pagerank")?.seconds, 1);
        assert.isUndefined(log.latest("betweenness"));
    });

    it("drops a timing that cannot be scaled rather than storing it", () => {
        const log = new CostMeasurementLog();

        assert.isFalse(
            log.record({ algorithm: "degree", nodes: 10, edges: 20, seconds: Number.NaN, at: "a", machine: "m" }),
        );
        assert.isFalse(log.record({ algorithm: "degree", nodes: -1, edges: 20, seconds: 1, at: "a", machine: "m" }));
        assert.isFalse(
            log.record({
                algorithm: "degree",
                nodes: 10,
                edges: Number.POSITIVE_INFINITY,
                seconds: 1,
                at: "a",
                machine: "m",
            }),
        );
        assert.equal(log.size, 0);
    });

    it("freezes what it stores, so a caller cannot edit history", () => {
        const log = new CostMeasurementLog();
        log.record({ algorithm: "degree", nodes: 10, edges: 20, seconds: 0.1, at: "a", machine: "m" });

        assert.isTrue(Object.isFrozen(log.latest("degree")));
    });

    it("forgets everything on request", () => {
        const log = new CostMeasurementLog();
        log.record({ algorithm: "degree", nodes: 10, edges: 20, seconds: 0.1, at: "a", machine: "m" });
        log.clear();

        assert.equal(log.size, 0);
    });

    it("turns the next estimate of the same algorithm into a measurement", () => {
        const log = new CostMeasurementLog();
        log.record({
            algorithm: "degree",
            nodes: 500,
            edges: 2000,
            seconds: 0.01,
            at: "2026-09-19T00:00:00.000Z",
            machine: "m",
        });

        const before = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
        });
        const after = estimateCost({
            algorithm: "degree",
            descriptor: algorithmByKey("degree"),
            statistics: statistics(),
            measurements: log.entries,
        });

        assert.equal(before.confidence, "modelled");
        assert.equal(after.confidence, "measured");
        assert.closeTo(after.seconds, 0.02, 1e-12);
    });
});

describe("a slow memory reading", () => {
    /**
     * Estimate a run with the default rates and, when given, a memory speed.
     * @param key - The algorithm.
     * @param nodeCount - Nodes.
     * @param edgeCount - Edges.
     * @param memorySpeed - The memory reading, or undefined for none.
     * @returns The estimated seconds.
     */
    function secondsAt(
        key: "degree" | "louvain" | "pagerank" | "betweenness" | "eigenvector" | "label-propagation",
        nodeCount: number,
        edgeCount: number,
        memorySpeed?: number,
    ): number {
        return estimateCost({
            algorithm: key,
            descriptor: algorithmByKey(key),
            statistics: statistics({ nodeCount, edgeCount, transitivity: 0 }),
            calibration: {
                rates: DEFAULT_COST_RATES,
                at: "2026-10-11T00:00:00.000Z",
                machine: "m",
                basis: "probe",
                ...(memorySpeed === undefined ? {} : { memorySpeed }),
            },
        }).seconds;
    }

    // Rows that ran 3 to 6x slower on a runner whose memory was loaded (issue #2025): degree at
    // 800,000 nodes, Louvain on a planted partition of 100,000, PageRank at 200,000.
    const large = [
        ["degree", 800_000, 4_000_000],
        ["louvain", 100_000, 460_000],
        ["pagerank", 200_000, 1_000_000],
    ] as const;

    it("charges the runs over large graphs for it", () => {
        for (const [key, nodes, edges] of large) {
            const before = secondsAt(key, nodes, edges);
            const slower = secondsAt(key, nodes, edges, 0.25);
            const slowest = secondsAt(key, nodes, edges, 0.125);

            assert.isAbove(slower, before, `${key} must cost more on memory reading 0.25`);
            assert.isAbove(slowest, slower, `${key} must cost more again on memory reading 0.125`);
            // Every one of these working sets is past the cache, so the whole factor applies.
            assert.closeTo(slower / before, 0.5 / 0.25, 1e-9, key);
        }
    });

    it("charges nothing for memory that reads as ordinary or was not measured", () => {
        for (const [key, nodes, edges] of large) {
            const unmeasured = secondsAt(key, nodes, edges);

            assert.equal(secondsAt(key, nodes, edges, 0.5), unmeasured, key);
            assert.equal(secondsAt(key, nodes, edges, 0.85), unmeasured, key);
            assert.equal(secondsAt(key, nodes, edges, Number.NaN), unmeasured, key);
        }
    });

    it("leaves runs that stay in cache as they were", () => {
        // Betweenness on 1,200 nodes and eigenvector centrality on a 10,000-node grid both ran as
        // fast as ever on the loaded runner.
        for (const [key, nodes, edges] of [
            ["betweenness", 1_200, 4_800],
            ["eigenvector", 10_000, 19_800],
        ] as const) {
            assert.equal(secondsAt(key, nodes, edges, 0.125), secondsAt(key, nodes, edges), key);
        }
    });

    it("charges part of the factor on a working set between cache and memory", () => {
        // 8 bytes each for 120,000 nodes and edges, about 1 MB: about two of the four doublings
        // from a core's cache (256 KB) to past it (4 MB), so about half of the extra charge.
        const ratio = secondsAt("louvain", 40_000, 80_000, 0.25) / secondsAt("louvain", 40_000, 80_000);

        assert.closeTo(ratio, 1 + Math.log2((8 * 120_000) / (256 * 1024)) / 4, 1e-9);
        assert.isAbove(ratio, 1);
        assert.isBelow(ratio, 2);
    });

    it("leaves the class rates alone, which are fitted to other code", () => {
        assert.equal(
            secondsAt("label-propagation", 800_000, 4_000_000, 0.125),
            secondsAt("label-propagation", 800_000, 4_000_000),
        );
    });
});
