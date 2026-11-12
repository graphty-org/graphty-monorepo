import { describe, expect, it } from "vitest";

import { compareValues } from "../../../src/components/DataTable/values";

const collator = new Intl.Collator("en");

describe("compareValues", () => {
    it("puts rows with no value first, and ties them with each other", () => {
        expect(compareValues(null, 1, collator)).toBe(-1);
        expect(compareValues(1, undefined, collator)).toBe(1);
        expect(compareValues(Number.NaN, null, collator)).toBe(0);
        expect(compareValues(new Date(Number.NaN), "a", collator)).toBe(-1);
    });

    it("compares numbers as numbers", () => {
        expect(compareValues(9, 10, collator)).toBeLessThan(0);
        expect(compareValues(10, 9, collator)).toBeGreaterThan(0);
        expect(compareValues(3, 3, collator)).toBe(0);
    });

    it("puts false before true", () => {
        expect(compareValues(false, true, collator)).toBe(-1);
        expect(compareValues(true, false, collator)).toBe(1);
        expect(compareValues(true, true, collator)).toBe(0);
        expect(compareValues(false, false, collator)).toBe(0);
    });

    it("compares dates as instants", () => {
        expect(compareValues(new Date(1000), new Date(2000), collator)).toBe(-1000);
        expect(compareValues(new Date(2000), new Date(2000), collator)).toBe(0);
    });

    it("compares everything else as text through the collator", () => {
        expect(compareValues("b", "a", collator)).toBeGreaterThan(0);
        expect(compareValues("a", "b", collator)).toBeLessThan(0);
        // Mixed kinds fall through to text: "10" sorts before "9" as text
        expect(compareValues(10, "9", collator)).toBeLessThan(0);
        expect(compareValues(true, 1, collator)).toBe(collator.compare("true", "1"));
    });
});
