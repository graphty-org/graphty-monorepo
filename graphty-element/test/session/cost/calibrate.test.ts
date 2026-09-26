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
            assert.isTrue(Number.isFinite(rate) && rate > 0, "a probed rate that is not a positive number is not a rate");
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

        assert.equal(yields, 3, "a probe that measures the frame must not hold it for the whole probe");
    });

    it("stays inside its budget", async () => {
        // A clock that advances 1 ms on every read, so the budget runs out after a known number
        // of reads whatever the runner's speed. Each workload gets a third of 3 ms: one start
        // read, one pass, one read that finds the share spent -- six reads for the three.
        let clock = 0;
        const reads = vi.spyOn(performance, "now").mockImplementation(() => clock++);

        try {
            const calibration = await calibrateCost({ budgetMs: 3 });

            assert.equal(reads.mock.calls.length, 6, "the probe must not become the slow thing it exists to warn about");
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
        assert.equal(probes, 3, "three yields is one probe; six would be two");
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

        assert.isFalse(log.record({ algorithm: "degree", nodes: 10, edges: 20, seconds: Number.NaN, at: "a", machine: "m" }));
        assert.isFalse(log.record({ algorithm: "degree", nodes: -1, edges: 20, seconds: 1, at: "a", machine: "m" }));
        assert.isFalse(
            log.record({ algorithm: "degree", nodes: 10, edges: Number.POSITIVE_INFINITY, seconds: 1, at: "a", machine: "m" }),
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
