import { describe, expect, it } from "vitest";

import { buttonComponentExtensions } from "../../src/theme/components/buttons";

/**
 * Tests for the refactored button components.
 * These tests verify that button components use defaultProps for compact sizing
 * instead of conditional logic.
 */
describe("Button Component Extensions (Refactored)", () => {
    describe("defaultProps", () => {
        it("Button defaults to size sm", () => {
            const extension = buttonComponentExtensions.Button;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("ActionIcon defaults to size sm", () => {
            const extension = buttonComponentExtensions.ActionIcon;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("ActionIcon defaults to variant subtle", () => {
            const extension = buttonComponentExtensions.ActionIcon;
            expect(extension.defaultProps?.variant).toBe("subtle");
        });

        it("CloseButton defaults to size xs", () => {
            const extension = buttonComponentExtensions.CloseButton;
            expect(extension.defaultProps?.size).toBe("xs");
        });
    });

    describe("CSS variables via vars", () => {
        it("Button has vars function that returns button variables", () => {
            const extension = buttonComponentExtensions.Button;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--button-height"]).toBe("24px");
            expect(vars.root["--button-fz"]).toBe("11px");
        });

        it("ActionIcon has vars function that returns action icon variables", () => {
            const extension = buttonComponentExtensions.ActionIcon;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--ai-size"]).toBe("24px");
        });

        it("CloseButton has vars function that returns close button variables", () => {
            const extension = buttonComponentExtensions.CloseButton;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--cb-size"]).toBe("16px");
            expect(vars.root["--cb-icon-size"]).toBe("12px");
        });
    });
});
