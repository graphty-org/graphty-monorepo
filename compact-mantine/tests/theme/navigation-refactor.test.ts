import { describe, expect, it } from "vitest";

import { navigationComponentExtensions } from "../../src/theme/components/navigation";

/**
 * Tests for the refactored navigation components.
 * These tests verify that navigation components use defaultProps for compact sizing
 * instead of conditional logic.
 */
describe("Navigation Component Extensions (Refactored)", () => {
    describe("defaultProps", () => {
        it("Tabs does not have size prop (uses styles only)", () => {
            const extension = navigationComponentExtensions.Tabs;
            // Tabs does not have a size prop in Mantine
            expect(extension.defaultProps?.size).toBeUndefined();
        });

        it("NavLink does not have size prop (uses styles only)", () => {
            const extension = navigationComponentExtensions.NavLink;
            // NavLink does not have a size prop in Mantine
            expect(extension.defaultProps?.size).toBeUndefined();
        });

        it("Pagination defaults to size sm", () => {
            const extension = navigationComponentExtensions.Pagination;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("Stepper defaults to size sm", () => {
            const extension = navigationComponentExtensions.Stepper;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("Anchor defaults to size sm", () => {
            const extension = navigationComponentExtensions.Anchor;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("Burger defaults to size sm", () => {
            const extension = navigationComponentExtensions.Burger;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("components with size prop default to size sm", () => {
            // Only these components have a size prop in Mantine
            const sizedComponents = [
                "Pagination",
                "Stepper",
                "Anchor",
                "Burger",
            ] as const;

            for (const name of sizedComponents) {
                const ext =
                    navigationComponentExtensions[
                        name as keyof typeof navigationComponentExtensions
                    ];
                expect(ext.defaultProps?.size, `${name} should default to sm`).toBe(
                    "sm",
                );
            }
        });

        it("Tabs and NavLink use styles only (no size prop)", () => {
            // These components don't have a size prop in Mantine
            expect(navigationComponentExtensions.Tabs.defaultProps?.size).toBeUndefined();
            expect(navigationComponentExtensions.NavLink.defaultProps?.size).toBeUndefined();
        });
    });

    describe("CSS variables via vars", () => {
        it("Pagination has vars function that returns pagination variables", () => {
            const extension = navigationComponentExtensions.Pagination;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--pagination-control-size"]).toBe("24px");
            expect(vars.root["--pagination-control-fz"]).toBe("11px");
        });

        it("Stepper has vars function that returns stepper variables", () => {
            const extension = navigationComponentExtensions.Stepper;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--stepper-icon-size"]).toBe("24px");
            expect(vars.root["--stepper-fz"]).toBe("11px");
        });

        it("Burger has vars function that returns burger variables", () => {
            const extension = navigationComponentExtensions.Burger;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--burger-size"]).toBe("18px");
        });
    });

    describe("look comes from static classNames, not styles", () => {
        const NAMES = ["Anchor", "Burger", "NavLink", "Pagination", "Stepper", "Tabs"] as const;

        it.each(NAMES)("%s uses a static classNames object with its cm-* root class", (name) => {
            const extension = navigationComponentExtensions[name];
            expect(typeof extension.classNames).toBe("object");
            expect((extension.classNames as Record<string, string>).root).toMatch(/^cm-/);
            expect(extension.styles).toBeUndefined();
        });
    });

    describe("pill tabs (design/figma-spec.md 5.1)", () => {
        it("Tabs default to Figma's pills, with automatic activation and wrapping arrows", () => {
            const { defaultProps } = navigationComponentExtensions.Tabs;
            expect(defaultProps?.variant).toBe("pills");
            expect(defaultProps?.activateTabWithKeyboard).toBe(true);
            expect(defaultProps?.loop).toBe(true);
        });

        it("Tabs.Tab activates on mouse-down and reserves its bold label width", () => {
            const { defaultProps } = navigationComponentExtensions.TabsTab;
            expect(typeof defaultProps?.onMouseDown).toBe("function");
            expect(typeof defaultProps?.onClickCapture).toBe("function");
            expect(typeof defaultProps?.renderRoot).toBe("function");
        });
    });
});
