import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

describe("Compact Token System", () => {
    describe("fontSizes", () => {
        it("overrides fontSizes with compact values", () => {
            expect(compactTheme.fontSizes?.sm).toBe("11px");
            expect(compactTheme.fontSizes?.xs).toBe("10px");
        });

        it("includes all standard size keys", () => {
            expect(compactTheme.fontSizes?.xs).toBeDefined();
            expect(compactTheme.fontSizes?.sm).toBeDefined();
            expect(compactTheme.fontSizes?.md).toBeDefined();
            expect(compactTheme.fontSizes?.lg).toBeDefined();
            expect(compactTheme.fontSizes?.xl).toBeDefined();
        });

        it("has correct values for all font sizes", () => {
            expect(compactTheme.fontSizes?.xs).toBe("10px");
            expect(compactTheme.fontSizes?.sm).toBe("11px");
            expect(compactTheme.fontSizes?.md).toBe("13px");
            expect(compactTheme.fontSizes?.lg).toBe("14px");
            expect(compactTheme.fontSizes?.xl).toBe("16px");
        });
    });

    describe("spacing", () => {
        it("overrides spacing with tighter values", () => {
            expect(compactTheme.spacing?.xs).toBe("4px");
            expect(compactTheme.spacing?.sm).toBe("6px");
        });

        it("includes all standard size keys", () => {
            expect(compactTheme.spacing?.xs).toBeDefined();
            expect(compactTheme.spacing?.sm).toBeDefined();
            expect(compactTheme.spacing?.md).toBeDefined();
            expect(compactTheme.spacing?.lg).toBeDefined();
            expect(compactTheme.spacing?.xl).toBeDefined();
        });

        it("has correct values for all spacing", () => {
            expect(compactTheme.spacing?.xs).toBe("4px");
            expect(compactTheme.spacing?.sm).toBe("6px");
            expect(compactTheme.spacing?.md).toBe("8px");
            expect(compactTheme.spacing?.lg).toBe("12px");
            expect(compactTheme.spacing?.xl).toBe("16px");
        });
    });

    describe("radius", () => {
        it("overrides radius with compact values", () => {
            expect(compactTheme.radius?.sm).toBe("4px");
        });

        it("includes all standard size keys", () => {
            expect(compactTheme.radius?.xs).toBeDefined();
            expect(compactTheme.radius?.sm).toBeDefined();
            expect(compactTheme.radius?.md).toBeDefined();
            expect(compactTheme.radius?.lg).toBeDefined();
            expect(compactTheme.radius?.xl).toBeDefined();
        });

        it("has correct values for all radius", () => {
            expect(compactTheme.radius?.xs).toBe("2px");
            expect(compactTheme.radius?.sm).toBe("4px");
            expect(compactTheme.radius?.md).toBe("6px");
            expect(compactTheme.radius?.lg).toBe("8px");
            expect(compactTheme.radius?.xl).toBe("12px");
        });
    });
});
