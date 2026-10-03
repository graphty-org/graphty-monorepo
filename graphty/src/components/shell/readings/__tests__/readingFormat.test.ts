import { describe, expect, it } from "vitest";

import {
    formatCount,
    formatModularity,
    formatPercent,
    formatProseCount,
    joinList,
    modularityBandPhrase,
} from "../readingFormat";

describe("readingFormat", () => {
    describe("formatCount, the exact form the Counts rows use", () => {
        it("groups with an ASCII comma", () => {
            expect(formatCount(1104)).toBe("1,104");
            expect(formatCount(1104206)).toBe("1,104,206");
        });

        it("never rounds, however large", () => {
            expect(formatCount(120418)).toBe("120,418");
            expect(formatCount(61208)).toBe("61,208");
        });

        it("leaves small counts alone", () => {
            expect(formatCount(0)).toBe("0");
            expect(formatCount(29)).toBe("29");
        });

        it("reads 0 for a value that is not a number", () => {
            expect(formatCount(Number.NaN)).toBe("0");
            expect(formatCount(Number.POSITIVE_INFINITY)).toBe("0");
        });

        it("keeps the sign of a negative value instead of hiding it as 0", () => {
            expect(formatCount(-4)).toBe("-4");
            expect(formatCount(-1104.4)).toBe("-1,104");
        });
    });

    describe("formatProseCount, spec 5853's rounding", () => {
        it("is exact below 100,000", () => {
            expect(formatProseCount(61234)).toBe("61,234");
            expect(formatProseCount(99999)).toBe("99,999");
        });

        it("rounds to three significant figures at or above 100,000", () => {
            expect(formatProseCount(120418)).toBe("120,000");
            expect(formatProseCount(100000)).toBe("100,000");
            expect(formatProseCount(1104206)).toBe("1,100,000");
        });

        it("reproduces the spec's own above-threshold prose counts", () => {
            expect(formatProseCount(612341)).toBe("612,000");
            expect(formatProseCount(388499)).toBe("388,000");
            expect(formatProseCount(41049)).toBe("41,049");
            expect(formatProseCount(10004112)).toBe("10,000,000");
        });

        it("reads 0 for a value that is not a number", () => {
            expect(formatProseCount(Number.NaN)).toBe("0");
        });
    });

    describe("formatPercent", () => {
        it("is a whole percent with no decimal", () => {
            expect(formatPercent(0.913)).toBe("91%");
            expect(formatPercent(0.92999)).toBe("93%");
            expect(formatPercent(1)).toBe("100%");
            expect(formatPercent(0)).toBe("0%");
        });

        it("reads 0% for a value that is not a number", () => {
            expect(formatPercent(Number.NaN)).toBe("0%");
        });

        it("clamps to 0..100%, as a share cannot exceed the whole", () => {
            expect(formatPercent(0.4)).toBe("40%");
            expect(formatPercent(2)).toBe("100%");
            expect(formatPercent(-0.3)).toBe("0%");
        });
    });

    describe("joinList, no serial comma", () => {
        it("joins nothing, one, two and three", () => {
            expect(joinList([])).toBe("");
            expect(joinList(["a"])).toBe("a");
            expect(joinList(["a", "b"])).toBe("a and b");
            expect(joinList(["a", "b", "c"])).toBe("a, b and c");
        });

        it("reproduces the board's own type list", () => {
            expect(joinList(["96 accounts", "48 devices", "34 phone numbers", "22 merchants"])).toBe(
                "96 accounts, 48 devices, 34 phone numbers and 22 merchants",
            );
        });
    });

    describe("formatModularity", () => {
        it("is three decimals", () => {
            expect(formatModularity(0.4471)).toBe("0.447");
            expect(formatModularity(0.447)).toBe("0.447");
            expect(formatModularity(0.5)).toBe("0.500");
        });

        it("reads 0.000 for a value that is not a number", () => {
            expect(formatModularity(Number.NaN)).toBe("0.000");
        });
    });

    describe("modularityBandPhrase, the spec's words and no paraphrase", () => {
        it("phrases all three bands graphty-element names", () => {
            const band = (id: string) => ({ id, plainName: id, description: "" });

            expect(modularityBandPhrase(band("clear"))).toBe("clearly separated");
            expect(modularityBandPhrase(band("weak"))).toBe("weakly separated; treat with caution");
            expect(modularityBandPhrase(band("barely"))).toBe("barely separated; the grouping may not be meaningful");
        });

        it("reads a band the spec does not name as the element's own plain name", () => {
            expect(modularityBandPhrase({ id: "strong", plainName: "Strongly separated", description: "" })).toBe(
                "strongly separated",
            );
        });
    });
});
