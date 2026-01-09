import { describe, expect, it } from "vitest";

import {
    compactDropdownStyles,
    compactInputElementStyles,
    compactInputStyles,
    compactInputStylesNoHeight,
    compactInputVars,
    compactInputVarsNoHeight,
    compactLabelStyles,
    compactMultiValueStyles,
} from "../../src/theme/styles/inputs";
import { inputComponentExtensions } from "../../src/theme/components/inputs";
import { buttonComponentExtensions } from "../../src/theme/components/buttons";
import { controlComponentExtensions } from "../../src/theme/components/controls";
import { displayComponentExtensions } from "../../src/theme/components/display";
import { feedbackComponentExtensions } from "../../src/theme/components/feedback";
import { navigationComponentExtensions } from "../../src/theme/components/navigation";
import { overlayComponentExtensions } from "../../src/theme/components/overlays";
import { FLOATING_UI_Z_INDEX } from "../../src/constants/popout";

/**
 * CSS Variable Regression Tests
 *
 * These tests ensure that CSS variables are correctly applied to maintain
 * the compact styling. CSS variables are now set via `vars` functions,
 * not static `styles` objects.
 *
 * Key CSS variables:
 * - --input-size: 24px (input height)
 * - --input-fz: 11px (font size)
 * - --input-bg: var(--mantine-color-default) (semantic background)
 * - --input-bd: none (no border)
 */
describe("CSS Variable Regression Tests", () => {
    describe("compactInputVars", () => {
        it("has correct input height", () => {
            expect(compactInputVars["--input-size"]).toBe("24px");
        });

        it("has correct font size", () => {
            expect(compactInputVars["--input-fz"]).toBe("11px");
        });

        it("has semantic background color", () => {
            expect(compactInputVars["--input-bg"]).toBe("var(--mantine-color-default)");
        });

        it("has no border", () => {
            expect(compactInputVars["--input-bd"]).toBe("none");
        });
    });

    describe("compactInputVarsNoHeight", () => {
        it("does NOT have input height (for variable height inputs)", () => {
            expect(compactInputVarsNoHeight).not.toHaveProperty("--input-size");
        });

        it("has correct font size", () => {
            expect(compactInputVarsNoHeight["--input-fz"]).toBe("11px");
        });

        it("has semantic background color", () => {
            expect(compactInputVarsNoHeight["--input-bg"]).toBe("var(--mantine-color-default)");
        });

        it("has no border", () => {
            expect(compactInputVarsNoHeight["--input-bd"]).toBe("none");
        });
    });

    describe("compactLabelStyles", () => {
        it("has correct font size", () => {
            expect(compactLabelStyles.fontSize).toBe(11);
        });

        it("has dimmed color", () => {
            expect(compactLabelStyles.color).toBe("var(--mantine-color-dimmed)");
        });

        it("has correct margin bottom", () => {
            expect(compactLabelStyles.marginBottom).toBe(1);
        });

        it("has correct line height", () => {
            expect(compactLabelStyles.lineHeight).toBe(1.2);
        });
    });

    describe("compactInputElementStyles", () => {
        it("has correct padding", () => {
            expect(compactInputElementStyles.paddingLeft).toBe(8);
            expect(compactInputElementStyles.paddingRight).toBe(8);
        });

        it("has no border", () => {
            expect(compactInputElementStyles.border).toBe("none");
        });

        it("has semantic background", () => {
            expect(compactInputElementStyles.backgroundColor).toBe("var(--mantine-color-default)");
        });
    });

    describe("compactInputStyles", () => {
        it("label has correct font size", () => {
            expect(compactInputStyles.label.fontSize).toBe(11);
        });

        it("label has dimmed color", () => {
            expect(compactInputStyles.label.color).toBe("var(--mantine-color-dimmed)");
        });

        it("input has correct padding", () => {
            expect(compactInputStyles.input.paddingLeft).toBe(8);
            expect(compactInputStyles.input.paddingRight).toBe(8);
        });

        it("input has no border", () => {
            expect(compactInputStyles.input.border).toBe("none");
        });
    });

    describe("compactInputStylesNoHeight", () => {
        it("has same label styles as compactInputStyles", () => {
            expect(compactInputStylesNoHeight.label).toEqual(compactInputStyles.label);
        });

        it("has same input styles as compactInputStyles", () => {
            expect(compactInputStylesNoHeight.input).toEqual(compactInputStyles.input);
        });
    });

    describe("compactDropdownStyles", () => {
        it("dropdown has correct padding", () => {
            expect(compactDropdownStyles.dropdown.padding).toBe(4);
        });

        it("dropdown has no border", () => {
            expect(compactDropdownStyles.dropdown.border).toBe("none");
        });

        it("option has correct font size", () => {
            expect(compactDropdownStyles.option.fontSize).toBe(11);
        });

        it("option has correct padding", () => {
            expect(compactDropdownStyles.option.padding).toBe("4px 8px");
        });
    });

    describe("compactMultiValueStyles", () => {
        it("input has min height of 24px", () => {
            expect(compactMultiValueStyles.input.minHeight).toBe(24);
        });

        it("input has auto height", () => {
            expect(compactMultiValueStyles.input.height).toBe("auto");
        });

        it("pillsList has correct gap", () => {
            expect(compactMultiValueStyles.pillsList.columnGap).toBe(4);
            expect(compactMultiValueStyles.pillsList.rowGap).toBe(2);
        });
    });

    describe("Component vars functions", () => {
        /**
         * CSS variables are now set via vars functions, not styles.
         * These tests verify that calling vars() returns the correct CSS variables.
         */

        describe("TextInput", () => {
            it("vars function returns wrapper with CSS variables", () => {
                const vars = inputComponentExtensions.TextInput.vars!();
                expect(vars.wrapper).toHaveProperty("--input-size", "24px");
                expect(vars.wrapper).toHaveProperty("--input-fz", "11px");
            });
        });

        describe("NumberInput", () => {
            it("vars function returns wrapper with CSS variables", () => {
                const vars = inputComponentExtensions.NumberInput.vars!();
                expect(vars.wrapper).toHaveProperty("--input-size", "24px");
                expect(vars.wrapper).toHaveProperty("--input-fz", "11px");
            });

            it("vars function returns right section width variable", () => {
                const vars = inputComponentExtensions.NumberInput.vars!();
                expect(vars.wrapper).toHaveProperty("--input-right-section-width", "24px");
            });

            it("vars function returns chevron size variable", () => {
                const vars = inputComponentExtensions.NumberInput.vars!();
                expect(vars.controls).toHaveProperty("--ni-chevron-size", "10px");
            });
        });

        describe("Select", () => {
            it("vars function returns wrapper with CSS variables", () => {
                const vars = inputComponentExtensions.Select.vars!();
                expect(vars.wrapper).toHaveProperty("--input-size", "24px");
            });
        });

        describe("Textarea", () => {
            it("vars function returns wrapper WITHOUT fixed height", () => {
                const vars = inputComponentExtensions.Textarea.vars!();
                expect(vars.wrapper).not.toHaveProperty("--input-size");
                expect(vars.wrapper).toHaveProperty("--input-fz", "11px");
            });
        });

        describe("PasswordInput", () => {
            it("vars function returns wrapper with CSS variables", () => {
                const vars = inputComponentExtensions.PasswordInput.vars!();
                expect(vars.wrapper).toHaveProperty("--input-size", "24px");
            });

            it("has innerInput padding in styles", () => {
                const styles = inputComponentExtensions.PasswordInput.styles as Record<string, unknown>;
                expect(styles.innerInput).toHaveProperty("paddingLeft", 8);
                expect(styles.innerInput).toHaveProperty("paddingRight", 8);
            });
        });

        describe("Autocomplete", () => {
            it("vars function returns wrapper with CSS variables", () => {
                const vars = inputComponentExtensions.Autocomplete.vars!();
                expect(vars.wrapper).toHaveProperty("--input-size", "24px");
            });
        });

        describe("MultiSelect", () => {
            it("vars function returns wrapper with CSS variables", () => {
                const vars = inputComponentExtensions.MultiSelect.vars!();
                expect(vars.wrapper).toHaveProperty("--input-size", "24px");
            });

            it("vars function returns chevron size variable", () => {
                const vars = inputComponentExtensions.MultiSelect.vars!();
                expect(vars.wrapper).toHaveProperty("--combobox-chevron-size", "12px");
            });
        });

        describe("TagsInput", () => {
            it("vars function returns wrapper WITHOUT fixed height", () => {
                const vars = inputComponentExtensions.TagsInput.vars!();
                expect(vars.wrapper).not.toHaveProperty("--input-size");
                expect(vars.wrapper).toHaveProperty("--input-fz", "11px");
            });
        });

        describe("PillsInput", () => {
            it("vars function returns wrapper WITHOUT fixed height", () => {
                const vars = inputComponentExtensions.PillsInput.vars!();
                expect(vars.wrapper).not.toHaveProperty("--input-size");
                expect(vars.wrapper).toHaveProperty("--input-fz", "11px");
            });
        });

        describe("FileInput", () => {
            it("vars function returns wrapper with CSS variables", () => {
                const vars = inputComponentExtensions.FileInput.vars!();
                expect(vars.wrapper).toHaveProperty("--input-size", "24px");
            });
        });

        describe("JsonInput", () => {
            it("vars function returns wrapper WITHOUT fixed height", () => {
                const vars = inputComponentExtensions.JsonInput.vars!();
                expect(vars.wrapper).not.toHaveProperty("--input-size");
                expect(vars.wrapper).toHaveProperty("--input-fz", "11px");
            });
        });

        describe("InputClearButton", () => {
            it("vars function returns root with size variables", () => {
                const vars = inputComponentExtensions.InputClearButton.vars!();
                expect(vars.root).toHaveProperty("--cb-size", "16px");
                expect(vars.root).toHaveProperty("--cb-icon-size", "12px");
            });
        });
    });
});

/**
 * Button Component CSS Variable Regression Tests
 *
 * Button components use defaultProps with size="sm" and unconditional vars functions.
 * Expected CSS variables (always applied):
 * - Button: --button-height: 24px, --button-fz: 11px, --button-padding-x: 8px
 * - ActionIcon: --ai-size: 24px
 * - CloseButton: --cb-size: 16px, --cb-icon-size: 12px
 */
describe("Button Component CSS Variable Regression Tests", () => {
    describe("Button vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = buttonComponentExtensions.Button.vars!();
            expect(vars.root).toHaveProperty("--button-height", "24px");
            expect(vars.root).toHaveProperty("--button-fz", "11px");
            expect(vars.root).toHaveProperty("--button-padding-x", "8px");
        });

        it("has defaultProps size='sm'", () => {
            expect(buttonComponentExtensions.Button.defaultProps).toHaveProperty("size", "sm");
        });
    });

    describe("ActionIcon vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = buttonComponentExtensions.ActionIcon.vars!();
            expect(vars.root).toHaveProperty("--ai-size", "24px");
        });

        it("has defaultProps size='sm' and variant='subtle'", () => {
            expect(buttonComponentExtensions.ActionIcon.defaultProps).toHaveProperty("size", "sm");
            expect(buttonComponentExtensions.ActionIcon.defaultProps).toHaveProperty("variant", "subtle");
        });
    });

    describe("CloseButton", () => {
        it("has defaultProps size='xs'", () => {
            expect(buttonComponentExtensions.CloseButton.defaultProps).toHaveProperty("size", "xs");
        });

        it("vars function returns compact CSS variables unconditionally", () => {
            const vars = buttonComponentExtensions.CloseButton.vars!();
            expect(vars.root).toHaveProperty("--cb-size", "16px");
            expect(vars.root).toHaveProperty("--cb-icon-size", "12px");
        });
    });
});

/**
 * Control Component CSS Variable Regression Tests
 *
 * Control components use defaultProps with size="sm" and unconditional vars functions.
 * Expected CSS variables (always applied):
 * - Switch: --switch-height: 16px, --switch-width: 28px, --switch-thumb-size: 12px
 * - Checkbox: --checkbox-size: 16px
 * - Radio: --radio-size: 16px, --radio-icon-size: 6px
 * - Slider: --slider-size: 4px, --slider-thumb-size: 12px
 * - RangeSlider: --slider-size: 4px, --slider-thumb-size: 12px
 * - SegmentedControl: --sc-font-size: 10px, --sc-padding: 4px 8px
 */
describe("Control Component CSS Variable Regression Tests", () => {
    describe("Switch vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = controlComponentExtensions.Switch.vars!();
            expect(vars.root).toHaveProperty("--switch-height", "16px");
            expect(vars.root).toHaveProperty("--switch-width", "28px");
            expect(vars.root).toHaveProperty("--switch-thumb-size", "12px");
            expect(vars.root).toHaveProperty("--switch-track-label-padding", "2px");
        });

        it("has defaultProps size='sm'", () => {
            expect(controlComponentExtensions.Switch.defaultProps).toHaveProperty("size", "sm");
        });

        it("uses static styles with label fontSize 11", () => {
            const styles = controlComponentExtensions.Switch.styles as Record<string, unknown>;
            expect(styles.label).toHaveProperty("fontSize", 11);
        });
    });

    describe("Checkbox vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = controlComponentExtensions.Checkbox.vars!();
            expect(vars.root).toHaveProperty("--checkbox-size", "16px");
        });

        it("has defaultProps size='sm'", () => {
            expect(controlComponentExtensions.Checkbox.defaultProps).toHaveProperty("size", "sm");
        });

        it("uses static styles with label fontSize 11", () => {
            const styles = controlComponentExtensions.Checkbox.styles as Record<string, unknown>;
            expect(styles.label).toHaveProperty("fontSize", 11);
        });
    });

    describe("Radio vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = controlComponentExtensions.Radio.vars!();
            expect(vars.root).toHaveProperty("--radio-size", "16px");
            expect(vars.root).toHaveProperty("--radio-icon-size", "6px");
        });

        it("has defaultProps size='sm'", () => {
            expect(controlComponentExtensions.Radio.defaultProps).toHaveProperty("size", "sm");
        });

        it("uses static styles with label fontSize 11", () => {
            const styles = controlComponentExtensions.Radio.styles as Record<string, unknown>;
            expect(styles.label).toHaveProperty("fontSize", 11);
        });
    });

    describe("Slider vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = controlComponentExtensions.Slider.vars!();
            expect(vars.root).toHaveProperty("--slider-size", "4px");
            expect(vars.root).toHaveProperty("--slider-thumb-size", "12px");
        });

        it("has defaultProps size='sm'", () => {
            expect(controlComponentExtensions.Slider.defaultProps).toHaveProperty("size", "sm");
        });

        it("uses static styles with markLabel fontSize 10", () => {
            const styles = controlComponentExtensions.Slider.styles as Record<string, unknown>;
            expect(styles.markLabel).toHaveProperty("fontSize", 10);
            expect(styles.markLabel).toHaveProperty("marginTop", 2);
        });
    });

    describe("RangeSlider vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = controlComponentExtensions.RangeSlider.vars!();
            expect(vars.root).toHaveProperty("--slider-size", "4px");
            expect(vars.root).toHaveProperty("--slider-thumb-size", "12px");
        });

        it("has defaultProps size='sm'", () => {
            expect(controlComponentExtensions.RangeSlider.defaultProps).toHaveProperty("size", "sm");
        });

        it("uses static styles with markLabel fontSize 10", () => {
            const styles = controlComponentExtensions.RangeSlider.styles as Record<string, unknown>;
            expect(styles.markLabel).toHaveProperty("fontSize", 10);
            expect(styles.markLabel).toHaveProperty("marginTop", 2);
        });
    });

    describe("SegmentedControl vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = controlComponentExtensions.SegmentedControl.vars!();
            expect(vars.root).toHaveProperty("--sc-font-size", "10px");
            expect(vars.root).toHaveProperty("--sc-padding", "4px 8px");
        });

        it("has defaultProps size='sm'", () => {
            expect(controlComponentExtensions.SegmentedControl.defaultProps).toHaveProperty("size", "sm");
        });
    });
});

/**
 * Display Component CSS Variable Regression Tests
 *
 * Display components use defaultProps with size="sm" and unconditional vars functions.
 * Expected CSS variables (always applied):
 * - Text: --text-fz: 11px, --text-lh: 1.2 (no default size, uses vars for styling)
 * - Badge: --badge-height: 14px, --badge-fz: 9px, --badge-padding-x: 4px
 * - Pill: --pill-height: 16px, --pill-fz: 10px
 * - Avatar: --avatar-size: 24px
 * - ThemeIcon: --ti-size: 24px
 * - Indicator: --indicator-size: 8px
 * - Kbd: --kbd-fz: 10px, --kbd-padding: 2px 4px
 */
describe("Display Component CSS Variable Regression Tests", () => {
    describe("Text extension", () => {
        it("does NOT have vars (uses global fontSizes from theme)", () => {
            // Text uses the theme's global fontSizes (compactFontSizes) instead of
            // component-level vars. This allows size="xs", "sm", "md", etc. to work correctly.
            expect(displayComponentExtensions.Text.vars).toBeUndefined();
        });

        it("does not have defaultProps size (uses global fontSizes)", () => {
            expect(displayComponentExtensions.Text.defaultProps?.size).toBeUndefined();
        });
    });

    describe("Badge vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = displayComponentExtensions.Badge.vars!();
            expect(vars.root).toHaveProperty("--badge-height", "14px");
            expect(vars.root).toHaveProperty("--badge-fz", "9px");
            expect(vars.root).toHaveProperty("--badge-padding-x", "4px");
        });

        it("has defaultProps size='sm'", () => {
            expect(displayComponentExtensions.Badge.defaultProps).toHaveProperty("size", "sm");
        });
    });

    describe("Pill vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = displayComponentExtensions.Pill.vars!();
            expect(vars.root).toHaveProperty("--pill-height", "16px");
            expect(vars.root).toHaveProperty("--pill-fz", "10px");
        });

        it("has defaultProps size='sm'", () => {
            expect(displayComponentExtensions.Pill.defaultProps).toHaveProperty("size", "sm");
        });
    });

    describe("Avatar vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = displayComponentExtensions.Avatar.vars!();
            expect(vars.root).toHaveProperty("--avatar-size", "24px");
        });

        it("has defaultProps size='sm'", () => {
            expect(displayComponentExtensions.Avatar.defaultProps).toHaveProperty("size", "sm");
        });
    });

    describe("ThemeIcon vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = displayComponentExtensions.ThemeIcon.vars!();
            expect(vars.root).toHaveProperty("--ti-size", "24px");
        });

        it("has defaultProps size='sm'", () => {
            expect(displayComponentExtensions.ThemeIcon.defaultProps).toHaveProperty("size", "sm");
        });
    });

    describe("Indicator vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = displayComponentExtensions.Indicator.vars!();
            expect(vars.root).toHaveProperty("--indicator-size", "8px");
        });

        it("has defaultProps size='sm'", () => {
            expect(displayComponentExtensions.Indicator.defaultProps).toHaveProperty("size", "sm");
        });
    });

    describe("Kbd vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = displayComponentExtensions.Kbd.vars!();
            expect(vars.root).toHaveProperty("--kbd-fz", "10px");
            expect(vars.root).toHaveProperty("--kbd-padding", "2px 4px");
        });

        it("has defaultProps size='sm'", () => {
            expect(displayComponentExtensions.Kbd.defaultProps).toHaveProperty("size", "sm");
        });
    });
});

/**
 * Feedback Component CSS Variable Regression Tests
 *
 * Feedback components use defaultProps with size="sm" and unconditional vars/styles.
 * Expected CSS variables (always applied):
 * - Loader: --loader-size: 18px
 * - Progress: --progress-size: 4px
 * - RingProgress: No CSS vars (uses numeric size prop)
 */
describe("Feedback Component CSS Variable Regression Tests", () => {
    describe("Loader vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = feedbackComponentExtensions.Loader.vars!();
            expect(vars.root).toHaveProperty("--loader-size", "18px");
        });

        it("has defaultProps size='sm'", () => {
            expect(feedbackComponentExtensions.Loader.defaultProps).toHaveProperty("size", "sm");
        });
    });

    describe("Progress vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = feedbackComponentExtensions.Progress.vars!();
            expect(vars.root).toHaveProperty("--progress-size", "4px");
        });

        it("has defaultProps size='sm'", () => {
            expect(feedbackComponentExtensions.Progress.defaultProps).toHaveProperty("size", "sm");
        });

        it("styles object has label fontSize 9", () => {
            const styles = feedbackComponentExtensions.Progress.styles as Record<
                string,
                Record<string, unknown>
            >;
            expect(styles.label.fontSize).toBe(9);
        });
    });

    describe("RingProgress", () => {
        it("does not have vars function (RingProgress uses numeric size prop)", () => {
            // RingProgress requires numeric size prop, so no vars override
            expect(feedbackComponentExtensions.RingProgress.vars).toBeUndefined();
        });

        it("does not have defaultProps size (requires numeric size)", () => {
            expect(feedbackComponentExtensions.RingProgress.defaultProps?.size).toBeUndefined();
        });
    });
});

/**
 * Navigation Component CSS Variable Regression Tests
 *
 * Navigation components use defaultProps with size="sm" and unconditional vars/styles.
 * Expected CSS variables (always applied):
 * - Burger: --burger-size: 18px, --burger-line-size: 2px
 * - Pagination: --pagination-control-size: 24px, --pagination-control-fz: 11px
 * - Stepper: --stepper-icon-size: 24px, --stepper-fz: 11px, --stepper-spacing: 8px
 * - Anchor, NavLink, Tabs: Use static styles (not functions) with fontSize: 11
 */
describe("Navigation Component CSS Variable Regression Tests", () => {
    describe("Burger vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = navigationComponentExtensions.Burger.vars!();
            expect(vars.root).toHaveProperty("--burger-size", "18px");
            expect(vars.root).toHaveProperty("--burger-line-size", "2px");
        });

        it("has defaultProps size='sm'", () => {
            expect(navigationComponentExtensions.Burger.defaultProps).toHaveProperty("size", "sm");
        });
    });

    describe("Pagination vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = navigationComponentExtensions.Pagination.vars!();
            expect(vars.root).toHaveProperty("--pagination-control-size", "24px");
            expect(vars.root).toHaveProperty("--pagination-control-fz", "11px");
        });

        it("has defaultProps size='sm'", () => {
            expect(navigationComponentExtensions.Pagination.defaultProps).toHaveProperty("size", "sm");
        });
    });

    describe("Stepper vars function", () => {
        it("returns compact CSS variables unconditionally", () => {
            const vars = navigationComponentExtensions.Stepper.vars!();
            expect(vars.root).toHaveProperty("--stepper-icon-size", "24px");
            expect(vars.root).toHaveProperty("--stepper-fz", "11px");
            expect(vars.root).toHaveProperty("--stepper-spacing", "8px");
        });

        it("has defaultProps size='sm'", () => {
            expect(navigationComponentExtensions.Stepper.defaultProps).toHaveProperty("size", "sm");
        });
    });

    describe("Anchor static styles", () => {
        it("uses static styles (not function)", () => {
            expect(typeof navigationComponentExtensions.Anchor.styles).toBe("object");
        });

        it("has compact styles with fontSize 11", () => {
            const styles = navigationComponentExtensions.Anchor.styles as Record<string, unknown>;
            expect(styles.root).toHaveProperty("fontSize", 11);
        });

        it("has defaultProps size='sm'", () => {
            expect(navigationComponentExtensions.Anchor.defaultProps).toHaveProperty("size", "sm");
        });
    });

    describe("NavLink static styles", () => {
        it("uses static styles (not function)", () => {
            expect(typeof navigationComponentExtensions.NavLink.styles).toBe("object");
        });

        it("has compact styles with fontSize 11 and minHeight 28", () => {
            const styles = navigationComponentExtensions.NavLink.styles as Record<string, unknown>;
            expect(styles.root).toHaveProperty("fontSize", 11);
            expect(styles.root).toHaveProperty("minHeight", 28);
            expect(styles.label).toHaveProperty("fontSize", 11);
        });

        it("does not have defaultProps size (uses styles only)", () => {
            // NavLink does not have a size prop in Mantine
            expect(navigationComponentExtensions.NavLink.defaultProps?.size).toBeUndefined();
        });
    });

    describe("Tabs static styles", () => {
        it("uses static styles (not function)", () => {
            expect(typeof navigationComponentExtensions.Tabs.styles).toBe("object");
        });

        it("has compact styles with tab fontSize 11 and padding", () => {
            const styles = navigationComponentExtensions.Tabs.styles as Record<string, unknown>;
            expect(styles.tab).toHaveProperty("fontSize", 11);
            expect(styles.tab).toHaveProperty("padding", "6px 10px");
        });

        it("does not have defaultProps size (uses styles only)", () => {
            // Tabs does not have a size prop in Mantine
            expect(navigationComponentExtensions.Tabs.defaultProps?.size).toBeUndefined();
        });
    });
});

/**
 * Overlay Component CSS Variable Regression Tests
 *
 * Overlay components set elevated z-index via defaultProps.
 * Expected default props:
 * - Menu, Tooltip, Popover, HoverCard: zIndex: FLOATING_UI_Z_INDEX
 */
describe("Overlay Component CSS Variable Regression Tests", () => {
    describe("Menu defaultProps", () => {
        it("has elevated z-index", () => {
            expect(overlayComponentExtensions.Menu?.defaultProps).toHaveProperty("zIndex", FLOATING_UI_Z_INDEX);
        });
    });

    describe("Tooltip defaultProps", () => {
        it("has elevated z-index", () => {
            expect(overlayComponentExtensions.Tooltip?.defaultProps).toHaveProperty("zIndex", FLOATING_UI_Z_INDEX);
        });
    });

    describe("Popover defaultProps", () => {
        it("has elevated z-index", () => {
            expect(overlayComponentExtensions.Popover?.defaultProps).toHaveProperty("zIndex", FLOATING_UI_Z_INDEX);
        });
    });

    describe("HoverCard defaultProps", () => {
        it("has elevated z-index", () => {
            expect(overlayComponentExtensions.HoverCard?.defaultProps).toHaveProperty("zIndex", FLOATING_UI_Z_INDEX);
        });
    });
});
