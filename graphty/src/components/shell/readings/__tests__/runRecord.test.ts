import { describe, expect, it } from "vitest";

import { caveatsLine, runRecordLine } from "../runRecord";

describe("runRecordLine", () => {
    it("reads the shipped cat line, naming no parameter because none moved", () => {
        expect(runRecordLine({ method: "Louvain", nonDefaultParameters: [], scope: "20 nodes" })).toBe(
            "Louvain, 20 nodes",
        );
    });

    it("names the parameters that were not defaults, between method and scope -- spec 2536", () => {
        expect(runRecordLine({ method: "MCL", nonDefaultParameters: ["granularity 2.5"], scope: "318 nodes" })).toBe(
            "MCL, granularity 2.5, 318 nodes",
        );
    });

    it("keeps several non-default parameters in the order it was given them", () => {
        expect(
            runRecordLine({
                method: "Label propagation",
                nonDefaultParameters: ["seed 42", "max iterations 200"],
                scope: "1,000,000 nodes",
            }),
        ).toBe("Label propagation, seed 42, max iterations 200, 1,000,000 nodes");
    });

    it("drops an empty scope rather than leaving a trailing comma", () => {
        expect(runRecordLine({ method: "Louvain", nonDefaultParameters: [], scope: "" })).toBe("Louvain");
    });
});

describe("caveatsLine", () => {
    it("says nothing at all for an exact, complete, unfiltered run -- spec 4795", () => {
        expect(caveatsLine({})).toBeUndefined();
    });

    it("says nothing for a run whose only flag is a filter that is off", () => {
        expect(caveatsLine({ filterActive: false })).toBeUndefined();
    });

    it("reports an approximate run", () => {
        expect(caveatsLine({ approximateSampleSize: 200 })).toBe("Approximate (sample of 200).");
    });

    it("reports a cheaper method that stopped early", () => {
        expect(caveatsLine({ fallbackMethodName: "Label propagation", partialStoppedAfterSeconds: 60 })).toBe(
            "Label propagation, stopped after 60 s (partial).",
        );
    });

    it("reports a partial run with no fallback method as its own sentence", () => {
        expect(caveatsLine({ partialStoppedAfterSeconds: 30 })).toBe("Stopped after 30 s (partial).");
    });

    it("names a fallback method that ran to completion", () => {
        expect(caveatsLine({ fallbackMethodName: "Label propagation" })).toBe("Label propagation.");
    });

    it("reports a largest-part-only run with both counts", () => {
        expect(caveatsLine({ largestPart: { nodes: 188, ofNodes: 200 } })).toBe(
            "Computed on the largest part (188 of 200 nodes).",
        );
    });

    it("reports what is drawn when only a sample is on screen", () => {
        expect(caveatsLine({ drawnSampleSize: 50000 })).toBe("Showing a sample of 50,000.");
    });

    it("reports an active filter or time window", () => {
        expect(caveatsLine({ filterActive: true })).toBe("A filter or time window is active.");
    });

    it("reproduces spec 5838's sampled-run line", () => {
        expect(caveatsLine({ approximateSampleSize: 200, largestPart: { nodes: 188, ofNodes: 200 } })).toBe(
            "Approximate (sample of 200). Computed on the largest part (188 of 200 nodes).",
        );
    });

    it("reproduces spec 5856-5858's above-threshold line, in that clause order", () => {
        expect(
            caveatsLine({
                fallbackMethodName: "Label propagation",
                partialStoppedAfterSeconds: 60,
                largestPart: { nodes: 912000, ofNodes: 1000000 },
                drawnSampleSize: 50000,
            }),
        ).toBe(
            "Label propagation, stopped after 60 s (partial). Computed on the largest part (912,000 of 1,000,000 nodes). Showing a sample of 50,000.",
        );
    });

    it("reports an iterative run that did not converge, and nothing else -- MANDATORY spec 2043-2047", () => {
        expect(caveatsLine({ notConvergedAfterIterations: 100 })).toBe("Did not converge in 100 iterations.");
    });

    it("groups the iteration count, like every other count on the line", () => {
        expect(caveatsLine({ notConvergedAfterIterations: 1000 })).toBe("Did not converge in 1,000 iterations.");
    });

    it("keeps the approximate clause ahead of the convergence clause", () => {
        expect(caveatsLine({ approximateSampleSize: 200, notConvergedAfterIterations: 100 })).toBe(
            "Approximate (sample of 200). Did not converge in 100 iterations.",
        );
    });

    it("puts the convergence clause ahead of the method clause -- what the run did, then what it covered", () => {
        expect(caveatsLine({ notConvergedAfterIterations: 100, fallbackMethodName: "Label propagation" })).toBe(
            "Did not converge in 100 iterations. Label propagation.",
        );
    });

    it("seats the convergence clause between approximate and method in the full order", () => {
        expect(
            caveatsLine({
                filterActive: true,
                drawnSampleSize: 1000,
                largestPart: { nodes: 900, ofNodes: 1000 },
                partialStoppedAfterSeconds: 5,
                fallbackMethodName: "Label propagation",
                notConvergedAfterIterations: 100,
                approximateSampleSize: 100,
            }),
        ).toBe(
            "Approximate (sample of 100). Did not converge in 100 iterations. Label propagation, stopped after 5 s (partial). Computed on the largest part (900 of 1,000 nodes). Showing a sample of 1,000. A filter or time window is active.",
        );
    });

    it("puts every clause it has in the one fixed order", () => {
        expect(
            caveatsLine({
                filterActive: true,
                drawnSampleSize: 1000,
                largestPart: { nodes: 900, ofNodes: 1000 },
                partialStoppedAfterSeconds: 5,
                fallbackMethodName: "Label propagation",
                approximateSampleSize: 100,
            }),
        ).toBe(
            "Approximate (sample of 100). Label propagation, stopped after 5 s (partial). Computed on the largest part (900 of 1,000 nodes). Showing a sample of 1,000. A filter or time window is active.",
        );
    });
});
