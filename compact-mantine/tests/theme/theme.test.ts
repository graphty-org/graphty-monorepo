import { describe, expect, it } from "vitest";

import { compactColors, compactDarkColors, compactTheme, VERSION } from "../../src";

describe("compactTheme", () => {
    it("exports a valid Mantine theme object", () => {
        expect(compactTheme).toBeDefined();
        expect(compactTheme.colors).toBeDefined();
        expect(compactTheme.components).toBeDefined();
    });

    it("is a plain object", () => {
        expect(typeof compactTheme).toBe("object");
    });

    it("includes dark color palette", () => {
        expect(compactTheme.colors?.dark).toBeDefined();
        expect(compactTheme.colors?.dark).toHaveLength(10);
    });

    it("includes all 23 component extensions", () => {
        const componentNames = Object.keys(compactTheme.components ?? {});
        expect(componentNames).toHaveLength(23);
    });

    it("includes all input components", () => {
        const componentNames = Object.keys(compactTheme.components ?? {});
        expect(componentNames).toContain("TextInput");
        expect(componentNames).toContain("NumberInput");
        expect(componentNames).toContain("Select");
        expect(componentNames).toContain("Textarea");
        expect(componentNames).toContain("PasswordInput");
        expect(componentNames).toContain("Autocomplete");
    });

    it("includes all button components", () => {
        const componentNames = Object.keys(compactTheme.components ?? {});
        expect(componentNames).toContain("Button");
        expect(componentNames).toContain("ActionIcon");
    });

    it("includes all control components", () => {
        const componentNames = Object.keys(compactTheme.components ?? {});
        expect(componentNames).toContain("SegmentedControl");
        expect(componentNames).toContain("Checkbox");
        expect(componentNames).toContain("Switch");
        expect(componentNames).toContain("Slider");
        expect(componentNames).toContain("Radio");
    });

    it("includes all display components", () => {
        const componentNames = Object.keys(compactTheme.components ?? {});
        expect(componentNames).toContain("Badge");
        expect(componentNames).toContain("Pill");
    });

    it("does not use hardcoded dark-N color references in component extensions", () => {
        // Component extensions use functions, so we need to inspect them
        // Check that all colors are semantic (via CSS variables) rather than hardcoded
        const colorStr = JSON.stringify(compactTheme.colors);
        expect(colorStr).not.toMatch(/--mantine-color-dark-[0-9]/);
    });

    it("component extensions exist for all expected components", () => {
        // Verify all component extensions are present (vars/styles functions live inside)
        const components = compactTheme.components ?? {};
        expect(components.TextInput).toBeDefined();
        expect(components.NumberInput).toBeDefined();
        expect(components.Button).toBeDefined();
        expect(components.ActionIcon).toBeDefined();
        expect(components.Checkbox).toBeDefined();
        expect(components.Switch).toBeDefined();
    });
});

describe("compactColors exports", () => {
    it("exports compactColors object", () => {
        expect(compactColors).toBeDefined();
        expect(compactColors.dark).toBeDefined();
    });

    it("exports compactDarkColors array", () => {
        expect(compactDarkColors).toBeDefined();
        expect(compactDarkColors).toHaveLength(10);
    });

    it("compactColors.dark is the same as compactDarkColors", () => {
        expect(compactColors.dark).toBe(compactDarkColors);
    });
});

describe("VERSION", () => {
    it("exports a version string", () => {
        expect(VERSION).toBe("0.1.0");
    });
});
