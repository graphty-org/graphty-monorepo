import { describe, expect, it } from "vitest";

import { compactColors, compactDarkColors } from "../../src/theme/colors";

describe("compactColors", () => {
    it("exports dark color palette with 10 shades", () => {
        expect(compactDarkColors).toHaveLength(10);
    });

    it("has lightest shade at index 0", () => {
        expect(compactDarkColors[0]).toBe("#d5d7da");
    });

    it("has darkest shade at index 9", () => {
        expect(compactDarkColors[9]).toBe("#0d1117");
    });

    it("exports as compactColors.dark", () => {
        expect(compactColors.dark).toBe(compactDarkColors);
    });

    it("all shades are valid hex colors", () => {
        const hexPattern = /^#[0-9a-fA-F]{6}$/;
        compactDarkColors.forEach((color) => {
            expect(color).toMatch(hexPattern);
        });
    });
});
