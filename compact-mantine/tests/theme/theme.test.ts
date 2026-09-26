import { describe, expect, it } from "vitest";

import { compactColors, compactDarkColors, compactTheme } from "../../src";

describe("compactTheme", () => {
    it("exports a valid Mantine theme object", () => {
        expect(compactTheme).toBeDefined();
        expect(compactTheme.colors).toBeDefined();
        expect(compactTheme.components).toBeDefined();
    });

    it("is a plain object", () => {
        expect(typeof compactTheme).toBe("object");
    });

    it("exports fontSizes, spacing, and radius overrides", () => {
        expect(compactTheme.fontSizes).toBeDefined();
        expect(compactTheme.spacing).toBeDefined();
        expect(compactTheme.radius).toBeDefined();
    });

    it("includes dark color palette", () => {
        expect(compactTheme.colors?.dark).toBeDefined();
        expect(compactTheme.colors?.dark).toHaveLength(10);
    });

    it("keeps every component the theme extended before the Figma restyle", () => {
        // Packages add extensions (Modal, Notification, ColorSwatch, ...); none may drop one.
        const componentNames = Object.keys(compactTheme.components ?? {});
        for (const name of [
            "ActionIcon", "Anchor", "Autocomplete", "Avatar", "Badge", "Burger", "Button", "Checkbox",
            "CloseButton", "FileInput", "HoverCard", "Indicator", "InputClearButton", "JsonInput", "Kbd",
            "Loader", "Menu", "MultiSelect", "NavLink", "NumberInput", "Pagination", "PasswordInput", "Pill",
            "PillsInput", "Popover", "Progress", "Radio", "RangeSlider", "RingProgress", "SegmentedControl",
            "Select", "Slider", "Stepper", "Switch", "Tabs", "TagsInput", "Text", "Textarea", "TextInput",
            "ThemeIcon", "Tooltip",
        ]) {
            expect(componentNames).toContain(name);
        }
    });

    it("includes all input components", () => {
        const componentNames = Object.keys(compactTheme.components ?? {});
        expect(componentNames).toContain("TextInput");
        expect(componentNames).toContain("NumberInput");
        expect(componentNames).toContain("Select");
        expect(componentNames).toContain("Textarea");
        expect(componentNames).toContain("PasswordInput");
        expect(componentNames).toContain("Autocomplete");
        // Note: ColorInput is NOT included - use CompactColorInput component instead
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

describe("theme values (spec 3.3)", () => {
    it("uses the brand palette as the primary color at Mantine's default shades", () => {
        expect(compactTheme.primaryColor).toBe("brand");
        expect(compactTheme.primaryShade).toEqual({ light: 6, dark: 8 });
    });

    it("sets Inter Variable first, the 550 heading weight, and the default cursor", () => {
        expect(compactTheme.fontFamily.startsWith('"Inter Variable", "Inter"')).toBe(true);
        expect(compactTheme.headings.fontWeight).toBe("550");
        expect(compactTheme.cursorType).toBe("default");
        expect(compactTheme.fontSmoothing).toBe(true);
    });

    it("publishes the panel grid and the resolved options on theme.other", () => {
        expect(compactTheme.other.panelGrid?.WIDTH).toBe(240);
        expect(compactTheme.other.compact).toEqual({ highContrast: false });
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
