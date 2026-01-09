import { describe, expect, it } from "vitest";

import { compactColors, compactTheme } from "../../src";

describe("Public API", () => {
    it("exports compactTheme", () => {
        expect(compactTheme).toBeDefined();
    });

    it("exports compactColors", () => {
        expect(compactColors).toBeDefined();
    });

    it("compactTheme can be spread for customization", () => {
        const custom = {
            ...compactTheme,
            primaryColor: "teal",
        };
        expect(custom.primaryColor).toBe("teal");
        expect(custom.fontSizes).toEqual(compactTheme.fontSizes);
    });

    it("compactTheme includes all core properties for merging", () => {
        expect(compactTheme.colors).toBeDefined();
        expect(compactTheme.fontSizes).toBeDefined();
        expect(compactTheme.spacing).toBeDefined();
        expect(compactTheme.radius).toBeDefined();
        expect(compactTheme.components).toBeDefined();
    });

    it("compactColors can be used independently", () => {
        expect(compactColors.dark).toBeDefined();
        expect(Array.isArray(compactColors.dark)).toBe(true);
        expect(compactColors.dark).toHaveLength(10);
    });

    it("allows creating nested theme with compact regions", () => {
        const nestedTheme = {
            ...compactTheme,
            other: {
                nestedContext: true,
            },
        };
        expect(nestedTheme.other?.nestedContext).toBe(true);
        expect(nestedTheme.components).toEqual(compactTheme.components);
    });

    it("component extensions are mergeable", () => {
        const customComponents = {
            ...compactTheme.components,
            CustomWidget: {
                defaultProps: { size: "sm" },
            },
        };
        expect(customComponents.TextInput).toEqual(compactTheme.components?.TextInput);
        expect(customComponents.CustomWidget).toBeDefined();
    });
});
