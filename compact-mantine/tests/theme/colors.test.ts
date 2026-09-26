import { describe, expect, it } from "vitest";

import { compactBrandColors, compactColors, compactDarkColors } from "../../src/theme/colors";

describe("compactDarkColors (spec 3.3)", () => {
    it("is Figma's neutral ramp, not the old blue-grey one", () => {
        expect(compactDarkColors).toEqual([
            "#ffffff",
            "#b3b3b3",
            "#8c8c8c",
            "#757575",
            "#444444",
            "#444444",
            "#383838",
            "#2c2c2c",
            "#1e1e1e",
            "#111111",
        ]);
    });

    it("puts the panel at dark-7, the field at dark-6 and the hover at dark-5", () => {
        expect(compactDarkColors[7]).toBe("#2c2c2c");
        expect(compactDarkColors[6]).toBe("#383838");
        expect(compactDarkColors[5]).toBe("#444444");
    });

    it("exports as compactColors.dark", () => {
        expect(compactColors.dark).toBe(compactDarkColors);
    });
});

describe("compactBrandColors (spec 3.3)", () => {
    it("lands Mantine's filled and hover shades on Figma's accent", () => {
        expect(compactBrandColors[6]).toBe("#0d99ff");
        expect(compactBrandColors[7]).toBe("#007be5");
        expect(compactBrandColors[8]).toBe("#0c8ce9");
        expect(compactBrandColors[9]).toBe("#0a6dc2");
        expect(compactBrandColors[4]).toBe("#7cc4f8");
        expect(compactBrandColors[0]).toBe("#e5f4ff");
    });

    it("has ten valid hex shades and exports as compactColors.brand", () => {
        expect(compactBrandColors).toHaveLength(10);
        for (const shade of compactBrandColors) {
            expect(shade).toMatch(/^#[0-9a-f]{6}$/);
        }
        expect(compactColors.brand).toBe(compactBrandColors);
    });
});
