import { describe, expect, it } from "vitest";

import { displayComponentExtensions } from "../../src/theme/components/display";

/**
 * Tests for the refactored display components.
 * These tests verify that display components use defaultProps for compact sizing
 * instead of conditional logic.
 */
describe("Display Component Extensions (Refactored)", () => {
    describe("defaultProps", () => {
        it("Badge defaults to size sm", () => {
            const extension = displayComponentExtensions.Badge;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("Text does not set default size (uses inherited fontSize)", () => {
            const extension = displayComponentExtensions.Text;
            // Text inherits from global fontSizes, no default needed
            expect(extension.defaultProps?.size).toBeUndefined();
        });

        it("Avatar defaults to size sm", () => {
            const extension = displayComponentExtensions.Avatar;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("ThemeIcon defaults to size sm", () => {
            const extension = displayComponentExtensions.ThemeIcon;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("Indicator defaults to size sm", () => {
            const extension = displayComponentExtensions.Indicator;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("Kbd defaults to size sm", () => {
            const extension = displayComponentExtensions.Kbd;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("Pill defaults to size sm", () => {
            const extension = displayComponentExtensions.Pill;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("all sized display components default to size sm", () => {
            const sizedComponents = [
                "Badge",
                "Avatar",
                "ThemeIcon",
                "Indicator",
                "Kbd",
                "Pill",
            ] as const;

            for (const name of sizedComponents) {
                const ext =
                    displayComponentExtensions[
                        name as keyof typeof displayComponentExtensions
                    ];
                expect(ext.defaultProps?.size, `${name} should default to sm`).toBe(
                    "sm",
                );
            }
        });
    });

    describe("CSS variables via vars", () => {
        it("Badge has vars function that returns badge variables", () => {
            const extension = displayComponentExtensions.Badge;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--badge-height"]).toBe("14px");
            expect(vars.root["--badge-fz"]).toBe("9px");
        });

        it("Text does NOT have vars (uses global fontSizes from theme)", () => {
            const extension = displayComponentExtensions.Text;
            // Text uses the theme's global fontSizes (compactFontSizes) instead of
            // component-level vars. This allows size="xs", "sm", "md", etc. to work.
            expect(extension.vars).toBeUndefined();
        });

        it("Avatar has vars function that returns avatar variables", () => {
            const extension = displayComponentExtensions.Avatar;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--avatar-size"]).toBe("24px");
        });

        it("ThemeIcon has vars function that returns theme icon variables", () => {
            const extension = displayComponentExtensions.ThemeIcon;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--ti-size"]).toBe("24px");
        });

        it("Indicator has vars function that returns indicator variables", () => {
            const extension = displayComponentExtensions.Indicator;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--indicator-size"]).toBe("8px");
        });

        it("Kbd has vars function that returns kbd variables", () => {
            const extension = displayComponentExtensions.Kbd;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--kbd-fz"]).toBe("10px");
        });

        it("Pill has vars function that returns pill variables", () => {
            const extension = displayComponentExtensions.Pill;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--pill-height"]).toBe("16px");
            expect(vars.root["--pill-fz"]).toBe("10px");
        });
    });
});
