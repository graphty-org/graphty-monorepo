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

    describe("styles are static", () => {
        it("Anchor uses static styles (not function)", () => {
            const extension = navigationComponentExtensions.Anchor;
            expect(typeof extension.styles).toBe("object");
        });

        it("NavLink uses static styles (not function)", () => {
            const extension = navigationComponentExtensions.NavLink;
            expect(typeof extension.styles).toBe("object");
        });

        it("Tabs uses static styles (not function)", () => {
            const extension = navigationComponentExtensions.Tabs;
            expect(typeof extension.styles).toBe("object");
        });
    });
});
