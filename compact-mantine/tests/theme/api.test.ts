import { Checkbox, MantineProvider, type MantineThemeComponent } from "@mantine/core";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { compactColors, compactTheme } from "../../src";
import {
    compactGlobalCss,
    compactThemeOverride,
    createCompactTheme,
    ensureCompactStyles,
} from "../../src/theme";

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

describe("createCompactTheme (spec 3.1)", () => {
    it("compactThemeOverride is createCompactTheme() and compactTheme merges it", () => {
        expect(compactThemeOverride.other).toEqual(createCompactTheme().other);
        expect(compactTheme.primaryColor).toBe(compactThemeOverride.primaryColor);
    });

    it("publishes the resolved option on theme.other.compact", () => {
        expect(createCompactTheme().other?.compact).toEqual({ highContrast: false });
        expect(createCompactTheme({ highContrast: true }).other?.compact).toEqual({ highContrast: true });
    });

    it("keeps every extension's own vars result", () => {
        const button = compactTheme.components.Button as MantineThemeComponent;
        const result = button.vars?.(compactTheme, { size: "sm" } as never, {} as never) as Record<string, unknown>;
        expect(result.root).toBeDefined();
    });

    it("gives an extension with no vars resolver one that returns nothing", () => {
        const withoutVars = Object.values(compactTheme.components).find(
            (c) => (c as MantineThemeComponent).vars?.(compactTheme, {} as never, {} as never) === undefined,
        );
        expect(withoutVars).toBeUndefined();
    });
});

describe("style injection (spec 3.2)", () => {
    afterEach(() => {
        document.head.querySelectorAll("style[data-compact-mantine]").forEach((s) => s.remove());
        ensureCompactStyles();
    });

    it("the first themed render injects one stylesheet and marks the contrast mode", () => {
        document.head.querySelectorAll("style[data-compact-mantine]").forEach((s) => s.remove());
        document.documentElement.removeAttribute("data-cm-contrast");
        render(
            createElement(
                MantineProvider,
                { theme: createCompactTheme({ highContrast: true }) },
                createElement(Checkbox, { label: "One" }),
                createElement(Checkbox, { label: "Two" }),
            ),
        );
        expect(document.head.querySelectorAll("style[data-compact-mantine]")).toHaveLength(1);
        expect(document.documentElement.getAttribute("data-cm-contrast")).toBe("high");
    });

    it("a Figma-default theme sets the mode back to figma", () => {
        render(createElement(MantineProvider, { theme: compactTheme }, createElement(Checkbox, { label: "One" })));
        expect(document.documentElement.getAttribute("data-cm-contrast")).toBe("figma");
    });

    it("ensureCompactStyles is idempotent", () => {
        ensureCompactStyles();
        ensureCompactStyles();
        expect(document.head.querySelectorAll("style[data-compact-mantine]")).toHaveLength(1);
        expect(document.head.querySelector("style[data-compact-mantine]")?.textContent).toBe(compactGlobalCss());
    });
});
