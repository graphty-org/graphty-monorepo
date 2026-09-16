import { describe, expect, it } from "vitest";

import { LEGEND_EMPTY_REASON, legendAvailable } from "../legendAvailability";

describe("legendAvailability", () => {
    describe("legendAvailable", () => {
        it("refuses a graph with nothing encoded, which is the state straight after a load", () => {
            expect(legendAvailable(0)).toBe(false);
        });

        it("allows the legend once a run has painted one channel", () => {
            expect(legendAvailable(1)).toBe(true);
        });

        it("allows it for more than one channel", () => {
            expect(legendAvailable(2)).toBe(true);
            expect(legendAvailable(5)).toBe(true);
        });

        it("refuses a count that is not a real measurement rather than promising a legend", () => {
            // A caller that has not measured its channels yet must be told "not
            // available": the defect this module closes was three controls reporting
            // "on" for a legend that could not exist.
            expect(legendAvailable(-1)).toBe(false);
            expect(legendAvailable(Number.NaN)).toBe(false);
        });
    });

    describe("LEGEND_EMPTY_REASON", () => {
        it("is the one sentence every legend control prints", () => {
            expect(LEGEND_EMPTY_REASON).toBe("Nothing is encoded yet");
        });

        it("carries no trailing full stop, because floor item 4 appends it after the control's own", () => {
            // "Show legend (L). Nothing is encoded yet" -- a stop here would end that
            // title with two.
            expect(LEGEND_EMPTY_REASON.endsWith(".")).toBe(false);
        });

        it("is ASCII only", () => {
            expect(/^[\x20-\x7E]+$/.test(LEGEND_EMPTY_REASON)).toBe(true);
        });
    });
});
