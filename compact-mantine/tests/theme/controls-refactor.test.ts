import { describe, expect, it } from "vitest";

import { controlComponentExtensions } from "../../src/theme/components/controls";

/**
 * Tests for the refactored control components.
 * These tests verify that control components use defaultProps for compact sizing
 * instead of conditional logic.
 */
describe("Control Component Extensions (Refactored)", () => {
    describe("defaultProps", () => {
        it("Switch defaults to size sm", () => {
            const extension = controlComponentExtensions.Switch;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("Checkbox defaults to size sm", () => {
            const extension = controlComponentExtensions.Checkbox;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("Slider defaults to size sm", () => {
            const extension = controlComponentExtensions.Slider;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("Radio defaults to size sm", () => {
            const extension = controlComponentExtensions.Radio;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("SegmentedControl defaults to size sm", () => {
            const extension = controlComponentExtensions.SegmentedControl;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("RangeSlider defaults to size sm", () => {
            const extension = controlComponentExtensions.RangeSlider;
            expect(extension.defaultProps?.size).toBe("sm");
        });

        it("all control components default to size sm", () => {
            const controlComponents = [
                "Switch",
                "Checkbox",
                "Slider",
                "Radio",
                "SegmentedControl",
                "RangeSlider",
            ] as const;

            for (const name of controlComponents) {
                const ext =
                    controlComponentExtensions[
                        name as keyof typeof controlComponentExtensions
                    ];
                expect(ext.defaultProps?.size, `${name} should default to sm`).toBe(
                    "sm",
                );
            }
        });
    });

    describe("CSS variables via vars", () => {
        it("Switch has vars function that returns switch variables", () => {
            const extension = controlComponentExtensions.Switch;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--switch-height"]).toBe("16px");
            expect(vars.root["--switch-width"]).toBe("28px");
        });

        it("Checkbox has vars function that returns checkbox variables", () => {
            const extension = controlComponentExtensions.Checkbox;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--checkbox-size"]).toBe("16px");
        });

        it("Radio has vars function that returns radio variables", () => {
            const extension = controlComponentExtensions.Radio;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--radio-size"]).toBe("16px");
        });

        it("Slider has vars function that returns slider variables", () => {
            const extension = controlComponentExtensions.Slider;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--slider-size"]).toBe("4px");
            expect(vars.root["--slider-thumb-size"]).toBe("12px");
        });

        it("RangeSlider has vars function that returns slider variables", () => {
            const extension = controlComponentExtensions.RangeSlider;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--slider-size"]).toBe("4px");
            expect(vars.root["--slider-thumb-size"]).toBe("12px");
        });

        it("SegmentedControl has vars function that returns segmented control variables", () => {
            const extension = controlComponentExtensions.SegmentedControl;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--sc-font-size"]).toBe("10px");
        });
    });

    describe("styles are static", () => {
        it("Switch uses static styles (not function)", () => {
            const extension = controlComponentExtensions.Switch;
            expect(typeof extension.styles).toBe("object");
        });

        it("Checkbox uses static styles (not function)", () => {
            const extension = controlComponentExtensions.Checkbox;
            expect(typeof extension.styles).toBe("object");
        });

        it("Radio uses static styles (not function)", () => {
            const extension = controlComponentExtensions.Radio;
            expect(typeof extension.styles).toBe("object");
        });

        it("Slider uses static styles (not function)", () => {
            const extension = controlComponentExtensions.Slider;
            expect(typeof extension.styles).toBe("object");
        });

        it("RangeSlider uses static styles (not function)", () => {
            const extension = controlComponentExtensions.RangeSlider;
            expect(typeof extension.styles).toBe("object");
        });
    });
});
