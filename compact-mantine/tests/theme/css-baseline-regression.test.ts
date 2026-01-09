/**
 * CSS Baseline Regression Tests
 *
 * These tests verify that CSS values remain consistent with the captured baseline.
 * Based on the comprehensive CSS baseline capture from tmp/css-baseline-new/.
 *
 * Key principles:
 * 1. Global tokens (fontSizes, spacing, radius) must maintain exact values
 * 2. Component CSS variables must be set correctly
 * 3. Component dimensions must match expected compact sizes
 * 4. Text API uses global fontSizes, not component-specific vars
 */
import { describe, expect, it } from "vitest";

import { compactFontSizes, compactRadius, compactSpacing } from "../../src/theme/tokens";
import { compactTheme } from "../../src";
import { buttonComponentExtensions } from "../../src/theme/components/buttons";
import { controlComponentExtensions } from "../../src/theme/components/controls";
import { displayComponentExtensions } from "../../src/theme/components/display";
import { feedbackComponentExtensions } from "../../src/theme/components/feedback";
import { inputComponentExtensions } from "../../src/theme/components/inputs";
import { navigationComponentExtensions } from "../../src/theme/components/navigation";
import { compactMultiValueStyles } from "../../src/theme/styles/inputs";

// ============================================================================
// GLOBAL TOKENS REGRESSION
// These values must NEVER change without careful consideration as they affect
// ALL components in the theme.
// ============================================================================
describe("Global Token Regression - fontSizes", () => {
    it("xs is 10px (baseline)", () => {
        expect(compactFontSizes.xs).toBe("10px");
    });

    it("sm is 11px (compact default)", () => {
        expect(compactFontSizes.sm).toBe("11px");
    });

    it("md is 13px", () => {
        expect(compactFontSizes.md).toBe("13px");
    });

    it("lg is 14px", () => {
        expect(compactFontSizes.lg).toBe("14px");
    });

    it("xl is 16px", () => {
        expect(compactFontSizes.xl).toBe("16px");
    });

    it("theme fontSizes matches compactFontSizes", () => {
        expect(compactTheme.fontSizes).toEqual(compactFontSizes);
    });
});

describe("Global Token Regression - spacing", () => {
    it("xs is 4px", () => {
        expect(compactSpacing.xs).toBe("4px");
    });

    it("sm is 6px", () => {
        expect(compactSpacing.sm).toBe("6px");
    });

    it("md is 8px", () => {
        expect(compactSpacing.md).toBe("8px");
    });

    it("lg is 12px", () => {
        expect(compactSpacing.lg).toBe("12px");
    });

    it("xl is 16px", () => {
        expect(compactSpacing.xl).toBe("16px");
    });

    it("theme spacing matches compactSpacing", () => {
        expect(compactTheme.spacing).toEqual(compactSpacing);
    });
});

describe("Global Token Regression - radius", () => {
    it("xs is 2px", () => {
        expect(compactRadius.xs).toBe("2px");
    });

    it("sm is 4px", () => {
        expect(compactRadius.sm).toBe("4px");
    });

    it("md is 6px", () => {
        expect(compactRadius.md).toBe("6px");
    });

    it("lg is 8px", () => {
        expect(compactRadius.lg).toBe("8px");
    });

    it("xl is 12px", () => {
        expect(compactRadius.xl).toBe("12px");
    });

    it("theme radius matches compactRadius", () => {
        expect(compactTheme.radius).toEqual(compactRadius);
    });
});

// ============================================================================
// INPUT COMPONENTS CSS VARIABLE REGRESSION
// Baseline values from css-baseline-new capture
// ============================================================================
describe("Input Component CSS Variable Baseline Regression", () => {
    describe("TextInput baseline", () => {
        it("--input-height is 24px", () => {
            const vars = inputComponentExtensions.TextInput.vars!();
            expect(vars.wrapper["--input-height"]).toBe("24px");
        });

        it("--input-size is 24px", () => {
            const vars = inputComponentExtensions.TextInput.vars!();
            expect(vars.wrapper["--input-size"]).toBe("24px");
        });

        it("--input-fz is 11px", () => {
            const vars = inputComponentExtensions.TextInput.vars!();
            expect(vars.wrapper["--input-fz"]).toBe("11px");
        });
    });

    describe("NumberInput baseline", () => {
        it("--input-height is 24px", () => {
            const vars = inputComponentExtensions.NumberInput.vars!();
            expect(vars.wrapper["--input-height"]).toBe("24px");
        });

        it("--input-right-section-width is 24px", () => {
            const vars = inputComponentExtensions.NumberInput.vars!();
            expect(vars.wrapper["--input-right-section-width"]).toBe("24px");
        });

        it("--ni-chevron-size is 10px", () => {
            const vars = inputComponentExtensions.NumberInput.vars!();
            expect(vars.controls["--ni-chevron-size"]).toBe("10px");
        });
    });

    describe("Select baseline", () => {
        it("--input-height is 24px", () => {
            const vars = inputComponentExtensions.Select.vars!();
            expect(vars.wrapper["--input-height"]).toBe("24px");
        });
    });

    describe("Textarea baseline - NO fixed height", () => {
        it("does NOT have --input-height (flexible height)", () => {
            const vars = inputComponentExtensions.Textarea.vars!();
            expect(vars.wrapper).not.toHaveProperty("--input-height");
        });

        it("--input-fz is 11px", () => {
            const vars = inputComponentExtensions.Textarea.vars!();
            expect(vars.wrapper["--input-fz"]).toBe("11px");
        });
    });

    describe("PasswordInput baseline", () => {
        it("--input-height is 24px", () => {
            const vars = inputComponentExtensions.PasswordInput.vars!();
            expect(vars.wrapper["--input-height"]).toBe("24px");
        });
    });

    describe("MultiSelect baseline", () => {
        it("--input-height is 24px", () => {
            const vars = inputComponentExtensions.MultiSelect.vars!();
            expect(vars.wrapper["--input-height"]).toBe("24px");
        });

        it("--combobox-chevron-size is 12px", () => {
            const vars = inputComponentExtensions.MultiSelect.vars!();
            expect(vars.wrapper["--combobox-chevron-size"]).toBe("12px");
        });
    });

    describe("TagsInput baseline - NO fixed height", () => {
        it("does NOT have --input-height (flexible height)", () => {
            const vars = inputComponentExtensions.TagsInput.vars!();
            expect(vars.wrapper).not.toHaveProperty("--input-height");
        });
    });

    describe("PillsInput baseline - NO fixed height", () => {
        it("does NOT have --input-height (flexible height)", () => {
            const vars = inputComponentExtensions.PillsInput.vars!();
            expect(vars.wrapper).not.toHaveProperty("--input-height");
        });
    });

    describe("JsonInput baseline - NO fixed height", () => {
        it("does NOT have --input-height (flexible height)", () => {
            const vars = inputComponentExtensions.JsonInput.vars!();
            expect(vars.wrapper).not.toHaveProperty("--input-height");
        });
    });
});

// ============================================================================
// BUTTON COMPONENTS CSS VARIABLE REGRESSION
// Baseline values from css-baseline-new capture
// ============================================================================
describe("Button Component CSS Variable Baseline Regression", () => {
    describe("Button baseline", () => {
        it("--button-height is 24px", () => {
            const vars = buttonComponentExtensions.Button.vars!();
            expect(vars.root["--button-height"]).toBe("24px");
        });

        it("--button-fz is 11px", () => {
            const vars = buttonComponentExtensions.Button.vars!();
            expect(vars.root["--button-fz"]).toBe("11px");
        });

        it("--button-padding-x is 8px", () => {
            const vars = buttonComponentExtensions.Button.vars!();
            expect(vars.root["--button-padding-x"]).toBe("8px");
        });
    });

    describe("ActionIcon baseline", () => {
        it("--ai-size is 24px", () => {
            const vars = buttonComponentExtensions.ActionIcon.vars!();
            expect(vars.root["--ai-size"]).toBe("24px");
        });
    });

    describe("CloseButton baseline", () => {
        it("--cb-size is 16px", () => {
            const vars = buttonComponentExtensions.CloseButton.vars!();
            expect(vars.root["--cb-size"]).toBe("16px");
        });

        it("--cb-icon-size is 12px", () => {
            const vars = buttonComponentExtensions.CloseButton.vars!();
            expect(vars.root["--cb-icon-size"]).toBe("12px");
        });
    });
});

// ============================================================================
// CONTROL COMPONENTS CSS VARIABLE REGRESSION
// Baseline values from css-baseline-new capture
// ============================================================================
describe("Control Component CSS Variable Baseline Regression", () => {
    describe("Checkbox baseline", () => {
        it("--checkbox-size is 16px", () => {
            const vars = controlComponentExtensions.Checkbox.vars!();
            expect(vars.root["--checkbox-size"]).toBe("16px");
        });
    });

    describe("Radio baseline", () => {
        it("--radio-size is 16px", () => {
            const vars = controlComponentExtensions.Radio.vars!();
            expect(vars.root["--radio-size"]).toBe("16px");
        });

        it("--radio-icon-size is 6px", () => {
            const vars = controlComponentExtensions.Radio.vars!();
            expect(vars.root["--radio-icon-size"]).toBe("6px");
        });
    });

    describe("Switch baseline", () => {
        it("--switch-height is 16px", () => {
            const vars = controlComponentExtensions.Switch.vars!();
            expect(vars.root["--switch-height"]).toBe("16px");
        });

        it("--switch-width is 28px", () => {
            const vars = controlComponentExtensions.Switch.vars!();
            expect(vars.root["--switch-width"]).toBe("28px");
        });

        it("--switch-thumb-size is 12px", () => {
            const vars = controlComponentExtensions.Switch.vars!();
            expect(vars.root["--switch-thumb-size"]).toBe("12px");
        });
    });

    describe("Slider baseline", () => {
        it("--slider-size is 4px", () => {
            const vars = controlComponentExtensions.Slider.vars!();
            expect(vars.root["--slider-size"]).toBe("4px");
        });

        it("--slider-thumb-size is 12px", () => {
            const vars = controlComponentExtensions.Slider.vars!();
            expect(vars.root["--slider-thumb-size"]).toBe("12px");
        });
    });

    describe("RangeSlider baseline", () => {
        it("--slider-size is 4px", () => {
            const vars = controlComponentExtensions.RangeSlider.vars!();
            expect(vars.root["--slider-size"]).toBe("4px");
        });

        it("--slider-thumb-size is 12px", () => {
            const vars = controlComponentExtensions.RangeSlider.vars!();
            expect(vars.root["--slider-thumb-size"]).toBe("12px");
        });
    });

    describe("SegmentedControl baseline", () => {
        it("--sc-font-size is 10px", () => {
            const vars = controlComponentExtensions.SegmentedControl.vars!();
            expect(vars.root["--sc-font-size"]).toBe("10px");
        });

        it("--sc-padding is 4px 8px", () => {
            const vars = controlComponentExtensions.SegmentedControl.vars!();
            expect(vars.root["--sc-padding"]).toBe("4px 8px");
        });
    });
});

// ============================================================================
// DISPLAY COMPONENTS CSS VARIABLE REGRESSION
// Baseline values from css-baseline-new capture
// ============================================================================
describe("Display Component CSS Variable Baseline Regression", () => {
    describe("Badge baseline", () => {
        it("--badge-height is 14px", () => {
            const vars = displayComponentExtensions.Badge.vars!();
            expect(vars.root["--badge-height"]).toBe("14px");
        });

        it("--badge-fz is 9px", () => {
            const vars = displayComponentExtensions.Badge.vars!();
            expect(vars.root["--badge-fz"]).toBe("9px");
        });

        it("--badge-padding-x is 4px", () => {
            const vars = displayComponentExtensions.Badge.vars!();
            expect(vars.root["--badge-padding-x"]).toBe("4px");
        });
    });

    describe("Pill baseline", () => {
        it("--pill-height is 16px", () => {
            const vars = displayComponentExtensions.Pill.vars!();
            expect(vars.root["--pill-height"]).toBe("16px");
        });

        it("--pill-fz is 10px", () => {
            const vars = displayComponentExtensions.Pill.vars!();
            expect(vars.root["--pill-fz"]).toBe("10px");
        });
    });

    describe("Avatar baseline", () => {
        it("--avatar-size is 24px", () => {
            const vars = displayComponentExtensions.Avatar.vars!();
            expect(vars.root["--avatar-size"]).toBe("24px");
        });
    });

    describe("ThemeIcon baseline", () => {
        it("--ti-size is 24px", () => {
            const vars = displayComponentExtensions.ThemeIcon.vars!();
            expect(vars.root["--ti-size"]).toBe("24px");
        });
    });

    describe("Indicator baseline", () => {
        it("--indicator-size is 8px", () => {
            const vars = displayComponentExtensions.Indicator.vars!();
            expect(vars.root["--indicator-size"]).toBe("8px");
        });
    });

    describe("Kbd baseline", () => {
        it("--kbd-fz is 10px", () => {
            const vars = displayComponentExtensions.Kbd.vars!();
            expect(vars.root["--kbd-fz"]).toBe("10px");
        });

        it("--kbd-padding is 2px 4px", () => {
            const vars = displayComponentExtensions.Kbd.vars!();
            expect(vars.root["--kbd-padding"]).toBe("2px 4px");
        });
    });

    /**
     * REGRESSION TEST: Text component API change
     *
     * Text component intentionally does NOT set its own vars.
     * It relies on global fontSizes from the theme (compactFontSizes).
     * This allows size="xs", "sm", "md", etc. to use the correct compact values.
     *
     * OLD BEHAVIOR (REMOVED): Text.vars returned { root: { "--text-fz": "11px", "--text-lh": "1.2" } }
     * NEW BEHAVIOR: Text uses global theme fontSizes, no component-specific vars
     *
     * This is an intentional API change to:
     * 1. Allow standard size prop values to work correctly
     * 2. Rely on centralized global token definitions
     * 3. Avoid conflicts between component vars and theme tokens
     */
    describe("Text baseline - uses global fontSizes (NO component vars)", () => {
        it("does NOT have vars function (relies on global fontSizes)", () => {
            expect(displayComponentExtensions.Text.vars).toBeUndefined();
        });

        it("does NOT have default size (uses whatever size is passed)", () => {
            expect(displayComponentExtensions.Text.defaultProps?.size).toBeUndefined();
        });

        it("global theme has correct fontSizes for Text to use", () => {
            // Text with size="sm" should render at 11px (from compactFontSizes.sm)
            expect(compactTheme.fontSizes?.sm).toBe("11px");
            // Text with size="xs" should render at 10px
            expect(compactTheme.fontSizes?.xs).toBe("10px");
        });
    });
});

// ============================================================================
// FEEDBACK COMPONENTS CSS VARIABLE REGRESSION
// Baseline values from css-baseline-new capture
// ============================================================================
describe("Feedback Component CSS Variable Baseline Regression", () => {
    describe("Loader baseline", () => {
        it("--loader-size is 18px", () => {
            const vars = feedbackComponentExtensions.Loader.vars!();
            expect(vars.root["--loader-size"]).toBe("18px");
        });
    });

    describe("Progress baseline", () => {
        it("--progress-size is 4px", () => {
            const vars = feedbackComponentExtensions.Progress.vars!();
            expect(vars.root["--progress-size"]).toBe("4px");
        });
    });

    describe("RingProgress baseline - no vars (uses numeric size)", () => {
        it("does NOT have vars function", () => {
            expect(feedbackComponentExtensions.RingProgress.vars).toBeUndefined();
        });
    });
});

// ============================================================================
// NAVIGATION COMPONENTS CSS VARIABLE REGRESSION
// Baseline values from css-baseline-new capture
// ============================================================================
describe("Navigation Component CSS Variable Baseline Regression", () => {
    describe("Burger baseline", () => {
        it("--burger-size is 18px", () => {
            const vars = navigationComponentExtensions.Burger.vars!();
            expect(vars.root["--burger-size"]).toBe("18px");
        });

        it("--burger-line-size is 2px", () => {
            const vars = navigationComponentExtensions.Burger.vars!();
            expect(vars.root["--burger-line-size"]).toBe("2px");
        });
    });

    describe("Pagination baseline", () => {
        it("--pagination-control-size is 24px", () => {
            const vars = navigationComponentExtensions.Pagination.vars!();
            expect(vars.root["--pagination-control-size"]).toBe("24px");
        });

        it("--pagination-control-fz is 11px", () => {
            const vars = navigationComponentExtensions.Pagination.vars!();
            expect(vars.root["--pagination-control-fz"]).toBe("11px");
        });
    });

    describe("Stepper baseline", () => {
        it("--stepper-icon-size is 24px", () => {
            const vars = navigationComponentExtensions.Stepper.vars!();
            expect(vars.root["--stepper-icon-size"]).toBe("24px");
        });

        it("--stepper-fz is 11px", () => {
            const vars = navigationComponentExtensions.Stepper.vars!();
            expect(vars.root["--stepper-fz"]).toBe("11px");
        });

        it("--stepper-spacing is 8px", () => {
            const vars = navigationComponentExtensions.Stepper.vars!();
            expect(vars.root["--stepper-spacing"]).toBe("8px");
        });
    });

    describe("Anchor baseline - static styles", () => {
        it("has root.fontSize of 11", () => {
            const styles = navigationComponentExtensions.Anchor.styles as Record<string, unknown>;
            expect((styles.root as Record<string, unknown>).fontSize).toBe(11);
        });
    });

    describe("NavLink baseline - static styles", () => {
        it("has root.fontSize of 11", () => {
            const styles = navigationComponentExtensions.NavLink.styles as Record<string, unknown>;
            expect((styles.root as Record<string, unknown>).fontSize).toBe(11);
        });

        it("has root.minHeight of 28", () => {
            const styles = navigationComponentExtensions.NavLink.styles as Record<string, unknown>;
            expect((styles.root as Record<string, unknown>).minHeight).toBe(28);
        });
    });

    describe("Tabs baseline - static styles", () => {
        it("has tab.fontSize of 11", () => {
            const styles = navigationComponentExtensions.Tabs.styles as Record<string, unknown>;
            expect((styles.tab as Record<string, unknown>).fontSize).toBe(11);
        });

        it("has tab.padding of '6px 10px'", () => {
            const styles = navigationComponentExtensions.Tabs.styles as Record<string, unknown>;
            expect((styles.tab as Record<string, unknown>).padding).toBe("6px 10px");
        });
    });
});

// ============================================================================
// SPECIFIC REGRESSION TESTS FOR KNOWN ISSUES
// ============================================================================
describe("Known Issue Regression Tests", () => {
    /**
     * REGRESSION TEST: Pill text alignment in MultiSelect
     *
     * Issue: Pills in MultiSelect had text cut off at bottom (e.g., letter 'g' clipped)
     * Root cause: Extra paddingTop/paddingBottom on pills reduced available height for text
     * Fix: compactMultiValueStyles.pill only sets margin, NOT padding
     */
    describe("Pill text alignment in MultiSelect", () => {
        it("compactMultiValueStyles.pill only has margin, NOT padding", () => {
            // Pill should only have margin set
            expect(compactMultiValueStyles.pill).toEqual({ margin: 0 });

            // Explicitly verify no padding properties
            expect(compactMultiValueStyles.pill).not.toHaveProperty("paddingTop");
            expect(compactMultiValueStyles.pill).not.toHaveProperty("paddingBottom");
            expect(compactMultiValueStyles.pill).not.toHaveProperty("padding");
        });

        it("MultiSelect input container has paddingTop and paddingBottom of 4px", () => {
            // The input container has padding, but pills inside don't
            expect(compactMultiValueStyles.input.paddingTop).toBe(4);
            expect(compactMultiValueStyles.input.paddingBottom).toBe(4);
        });
    });

    /**
     * REGRESSION TEST: Variable-height inputs don't have fixed height
     *
     * Issue: Textarea, TagsInput, PillsInput, JsonInput need flexible height
     * Fix: These use compactInputVarsNoHeight which doesn't set --input-height
     */
    describe("Variable-height inputs flexibility", () => {
        it("Textarea wrapper vars don't have --input-height", () => {
            const vars = inputComponentExtensions.Textarea.vars!();
            expect(Object.keys(vars.wrapper)).not.toContain("--input-height");
            expect(Object.keys(vars.wrapper)).not.toContain("--input-size");
        });

        it("TagsInput wrapper vars don't have --input-height", () => {
            const vars = inputComponentExtensions.TagsInput.vars!();
            expect(Object.keys(vars.wrapper)).not.toContain("--input-height");
            expect(Object.keys(vars.wrapper)).not.toContain("--input-size");
        });

        it("PillsInput wrapper vars don't have --input-height", () => {
            const vars = inputComponentExtensions.PillsInput.vars!();
            expect(Object.keys(vars.wrapper)).not.toContain("--input-height");
            expect(Object.keys(vars.wrapper)).not.toContain("--input-size");
        });

        it("JsonInput wrapper vars don't have --input-height", () => {
            const vars = inputComponentExtensions.JsonInput.vars!();
            expect(Object.keys(vars.wrapper)).not.toContain("--input-height");
            expect(Object.keys(vars.wrapper)).not.toContain("--input-size");
        });
    });

    /**
     * REGRESSION TEST: Default props consistency
     *
     * All themed components should have consistent default size props
     */
    describe("Default props consistency", () => {
        const componentsWithSizeSmDefault = [
            ["TextInput", inputComponentExtensions.TextInput],
            ["NumberInput", inputComponentExtensions.NumberInput],
            ["Select", inputComponentExtensions.Select],
            ["Textarea", inputComponentExtensions.Textarea],
            ["PasswordInput", inputComponentExtensions.PasswordInput],
            ["Autocomplete", inputComponentExtensions.Autocomplete],
            ["MultiSelect", inputComponentExtensions.MultiSelect],
            ["TagsInput", inputComponentExtensions.TagsInput],
            ["PillsInput", inputComponentExtensions.PillsInput],
            ["FileInput", inputComponentExtensions.FileInput],
            ["JsonInput", inputComponentExtensions.JsonInput],
            ["Button", buttonComponentExtensions.Button],
            ["ActionIcon", buttonComponentExtensions.ActionIcon],
            ["Checkbox", controlComponentExtensions.Checkbox],
            ["Radio", controlComponentExtensions.Radio],
            ["Switch", controlComponentExtensions.Switch],
            ["Slider", controlComponentExtensions.Slider],
            ["RangeSlider", controlComponentExtensions.RangeSlider],
            ["SegmentedControl", controlComponentExtensions.SegmentedControl],
            ["Badge", displayComponentExtensions.Badge],
            ["Pill", displayComponentExtensions.Pill],
            ["Avatar", displayComponentExtensions.Avatar],
            ["ThemeIcon", displayComponentExtensions.ThemeIcon],
            ["Indicator", displayComponentExtensions.Indicator],
            ["Kbd", displayComponentExtensions.Kbd],
            ["Loader", feedbackComponentExtensions.Loader],
            ["Progress", feedbackComponentExtensions.Progress],
            ["Burger", navigationComponentExtensions.Burger],
            ["Pagination", navigationComponentExtensions.Pagination],
            ["Stepper", navigationComponentExtensions.Stepper],
            ["Anchor", navigationComponentExtensions.Anchor],
        ] as const;

        componentsWithSizeSmDefault.forEach(([name, extension]) => {
            it(`${name} has defaultProps.size = 'sm'`, () => {
                expect(extension.defaultProps).toHaveProperty("size", "sm");
            });
        });

        // CloseButton uses xs
        it("CloseButton has defaultProps.size = 'xs'", () => {
            expect(buttonComponentExtensions.CloseButton.defaultProps).toHaveProperty("size", "xs");
        });

        // InputClearButton uses xs
        it("InputClearButton has defaultProps.size = 'xs'", () => {
            expect(inputComponentExtensions.InputClearButton.defaultProps).toHaveProperty("size", "xs");
        });
    });
});
