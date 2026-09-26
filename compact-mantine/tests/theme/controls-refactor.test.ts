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
            expect(vars.root["--switch-width"]).toBe("32px");
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
            expect(vars.root["--slider-size"]).toBe("8px");
            expect(vars.root["--slider-thumb-size"]).toBe("12px");
        });

        it("RangeSlider has vars function that returns slider variables", () => {
            const extension = controlComponentExtensions.RangeSlider;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--slider-size"]).toBe("8px");
            expect(vars.root["--slider-thumb-size"]).toBe("12px");
        });

        it("SegmentedControl has vars function that returns segmented control variables", () => {
            const extension = controlComponentExtensions.SegmentedControl;
            expect(extension.vars).toBeDefined();
            expect(typeof extension.vars).toBe("function");
            const vars = extension.vars!();
            expect(vars.root["--sc-font-size"]).toBe("11px");
        });
    });

    describe("look comes from static classNames, not styles", () => {
        // The Figma look lives in the stylesheet (src/theme/css/selection.css.ts),
        // keyed on the cm-* classes each extension hands Mantine; no extension
        // computes inline styles.
        const NAMES = ["Switch", "Checkbox", "Radio", "Slider", "RangeSlider", "SegmentedControl"] as const;

        it.each(NAMES)("%s uses a static classNames object with its cm-* root class", (name) => {
            const extension = controlComponentExtensions[name];
            expect(typeof extension.classNames).toBe("object");
            expect((extension.classNames as Record<string, string>).root).toMatch(/^cm-/);
            expect(extension.styles).toBeUndefined();
        });
    });
});
