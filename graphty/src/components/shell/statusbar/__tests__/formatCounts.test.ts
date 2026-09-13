import { describe, expect, it } from "vitest";

import {
    formatCount,
    formatCountPair,
    formatCountsTitle,
    formatExactCount,
    formatExactCountPair,
    formatSampleLine,
} from "../formatCounts";

describe("formatCounts", () => {
    describe("thousands separators up to 99,999", () => {
        it("writes small counts unchanged", () => {
            expect(formatCount(0)).toBe("0");
            expect(formatCount(20)).toBe("20");
            expect(formatCount(612)).toBe("612");
        });

        it("separates thousands", () => {
            expect(formatCount(1200)).toBe("1,200");
            expect(formatCount(12400)).toBe("12,400");
            expect(formatCount(48000)).toBe("48,000");
            expect(formatCount(51000)).toBe("51,000");
        });

        it("keeps separators at the top of the band", () => {
            expect(formatCount(99999)).toBe("99,999");
        });
    });

    describe("compact form above 99,999", () => {
        it("switches to the k scale one past the band", () => {
            expect(formatCount(100000)).toBe("100k");
        });

        it("writes the drawn k-scale counts", () => {
            expect(formatCount(120418)).toBe("120k");
            expect(formatCount(312000)).toBe("312k");
            expect(formatCount(500000)).toBe("500k");
        });

        it("writes one decimal place on the M scale", () => {
            expect(formatCount(1000000)).toBe("1.0M");
            expect(formatCount(1104206)).toBe("1.1M");
            expect(formatCount(3100000)).toBe("3.1M");
        });

        it("drops the decimal once the leading value is two digits", () => {
            expect(formatCount(10000000)).toBe("10M");
            expect(formatCount(120000000)).toBe("120M");
        });

        it("rounds up into the M scale rather than writing 1000k", () => {
            expect(formatCount(999600)).toBe("1.0M");
        });
    });

    describe("exact values", () => {
        it("keeps separators at every magnitude", () => {
            expect(formatExactCount(120418)).toBe("120,418");
            expect(formatExactCount(1104206)).toBe("1,104,206");
        });

        it("reads anything unusable as zero", () => {
            expect(formatExactCount(Number.NaN)).toBe("0");
            expect(formatExactCount(-4)).toBe("0");
        });
    });

    describe("the N-of-N collapse", () => {
        it("reads as a plain number when shown, loaded and total are equal", () => {
            expect(formatCountPair({ shown: 20, loaded: 20, total: 20 }, "nodes")).toBe("20 nodes");
            expect(formatCountPair({ shown: 120418, loaded: 120418, total: 120418 }, "nodes")).toBe("120k nodes");
        });

        it("returns to the N-of-N form the moment a filter makes them differ", () => {
            expect(formatCountPair({ shown: 120, loaded: 200, total: 200 }, "nodes")).toBe("120 of 200 nodes");
        });

        it("returns to the N-of-N form when a cap makes shown and total differ", () => {
            expect(formatCountPair({ shown: 500000, loaded: 1104206, total: 1104206 }, "edges")).toBe(
                "500k of 1.1M edges",
            );
        });

        it("draws both halves live at once, as ExplorerLargeGraph does", () => {
            const nodes = formatCountPair({ shown: 120418, loaded: 120418, total: 120418 }, "nodes");
            const edges = formatCountPair({ shown: 500000, loaded: 1104206, total: 1104206 }, "edges");

            expect(`${nodes} ${edges}`).toBe("120k nodes 500k of 1.1M edges");
        });
    });

    describe("the tooltip", () => {
        it("names what the smaller number is when the halves differ", () => {
            expect(formatExactCountPair({ shown: 500000, loaded: 1104206, total: 1104206 }, "edges")).toBe(
                "500,000 of 1,104,206 edges drawn",
            );
        });

        it("writes the collapsed half as a bare noun", () => {
            expect(formatExactCountPair({ shown: 120418, loaded: 120418, total: 120418 }, "nodes")).toBe(
                "120,418 nodes",
            );
        });

        it("builds the drawn counts tooltip", () => {
            expect(
                formatCountsTitle(
                    { shown: 120418, loaded: 120418, total: 120418 },
                    { shown: 500000, loaded: 1104206, total: 1104206 },
                ),
            ).toBe("120,418 nodes. 500,000 of 1,104,206 edges drawn");
        });
    });

    describe("the sample line", () => {
        it("writes the subset state's line in exact values", () => {
            expect(formatSampleLine(50000, 1000000)).toBe("Sample: 50,000 of 1,000,000");
        });
    });
});
