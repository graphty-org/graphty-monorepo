/**
 * Tests for package exports to verify:
 * 1. Expected exports are present
 * 2. Unused exports have been removed
 * 3. API surface is clean and intentional
 */
import { describe, it, expect } from "vitest";
import * as mainExports from "../src/index";
import * as themeExports from "../src/theme";
import * as constantsExports from "../src/constants";
import * as utilsExports from "../src/utils";

describe("Package exports", () => {
    describe("Main exports (src/index.ts)", () => {
        it("exports compactTheme", () => {
            expect(mainExports.compactTheme).toBeDefined();
        });

        it("exports compactThemeOverride", () => {
            expect(mainExports.compactThemeOverride).toBeDefined();
        });

        it("exports compactColors", () => {
            expect(mainExports.compactColors).toBeDefined();
        });

        it("exports compactDarkColors", () => {
            expect(mainExports.compactDarkColors).toBeDefined();
        });

        it("exports VERSION", () => {
            expect(mainExports.VERSION).toBeDefined();
            expect(typeof mainExports.VERSION).toBe("string");
        });

        describe("Component exports", () => {
            it("exports CompactColorInput", () => {
                expect(mainExports.CompactColorInput).toBeDefined();
            });

            it("exports ControlGroup", () => {
                expect(mainExports.ControlGroup).toBeDefined();
            });

            it("exports ControlSection", () => {
                expect(mainExports.ControlSection).toBeDefined();
            });

            it("exports ControlSubGroup", () => {
                expect(mainExports.ControlSubGroup).toBeDefined();
            });

            it("exports GradientEditor", () => {
                expect(mainExports.GradientEditor).toBeDefined();
            });

            it("exports Popout components", () => {
                expect(mainExports.Popout).toBeDefined();
                expect(mainExports.PopoutButton).toBeDefined();
                expect(mainExports.PopoutManager).toBeDefined();
            });

            it("exports StatRow", () => {
                expect(mainExports.StatRow).toBeDefined();
            });

            it("exports StyleNumberInput", () => {
                expect(mainExports.StyleNumberInput).toBeDefined();
            });

            it("exports StyleSelect", () => {
                expect(mainExports.StyleSelect).toBeDefined();
            });

            it("exports ToggleWithContent", () => {
                expect(mainExports.ToggleWithContent).toBeDefined();
            });
        });

        describe("Hook exports", () => {
            it("exports useActualColorScheme", () => {
                expect(mainExports.useActualColorScheme).toBeDefined();
            });
        });

        describe("Constant exports", () => {
            it("exports POPOUT_Z_INDEX_BASE", () => {
                expect(mainExports.POPOUT_Z_INDEX_BASE).toBeDefined();
                expect(mainExports.POPOUT_Z_INDEX_BASE).toBe(1000);
            });

            it("exports POPOUT_GAP", () => {
                expect(mainExports.POPOUT_GAP).toBeDefined();
            });

            it("exports POPOUT_NESTED_GAP", () => {
                expect(mainExports.POPOUT_NESTED_GAP).toBeDefined();
            });

            it("exports SWATCH_COLORS_HEXA", () => {
                expect(mainExports.SWATCH_COLORS_HEXA).toBeDefined();
                expect(Array.isArray(mainExports.SWATCH_COLORS_HEXA)).toBe(true);
            });

            it("exports DEFAULT_GRADIENT_STOP_COLOR", () => {
                expect(mainExports.DEFAULT_GRADIENT_STOP_COLOR).toBeDefined();
            });

            it("exports MANTINE_SPACING", () => {
                expect(mainExports.MANTINE_SPACING).toBeDefined();
            });

            it("exports COMPACT_SIZING constants", () => {
                expect(mainExports.COMPACT_SIZING).toBeDefined();
                expect(mainExports.COMPACT_SIZING.HEIGHT).toBe(24);
                expect(mainExports.COMPACT_SIZING.FONT_SIZE).toBe(11);
                expect(mainExports.COMPACT_SIZING.CONTROL_PADDING).toBe(8);
                expect(mainExports.COMPACT_SIZING.SECTION_GAP).toBe(4);
            });

            it("does NOT export unused SWATCH_COLORS (non-HEXA)", () => {
                // SWATCH_COLORS without HEXA suffix is unused internally
                // Only SWATCH_COLORS_HEXA is actually used by CompactColorInput
                expect((mainExports as Record<string, unknown>).SWATCH_COLORS).toBeUndefined();
            });
        });

        describe("Utility exports", () => {
            it("exports color utility functions", () => {
                expect(mainExports.createColorStop).toBeDefined();
                expect(mainExports.createDefaultGradientStops).toBeDefined();
                expect(mainExports.isValidHex).toBeDefined();
                expect(mainExports.parseHexaColor).toBeDefined();
                expect(mainExports.toHexaColor).toBeDefined();
                expect(mainExports.opacityToAlphaHex).toBeDefined();
                expect(mainExports.parseAlphaFromHexa).toBeDefined();
            });

            it("exports color utility constants", () => {
                expect(mainExports.MAX_ALPHA_HEX).toBeDefined();
                expect(mainExports.MAX_OPACITY_PERCENT).toBeDefined();
            });

            it("does NOT export internal merge utilities from main index", () => {
                // mergeExtensions utilities are internal implementation details
                // They should only be exported from utils for advanced users
                expect((mainExports as Record<string, unknown>).mergeExtensions).toBeUndefined();
                expect((mainExports as Record<string, unknown>).mergeExtensions3).toBeUndefined();
                expect((mainExports as Record<string, unknown>).mergeExtensions4).toBeUndefined();
                expect((mainExports as Record<string, unknown>).mergeExtensions7).toBeUndefined();
            });
        });

        describe("Unused utilities should NOT be exported", () => {
            it("does NOT export compactTextVars", () => {
                // compactTextVars is defined but never used
                expect((mainExports as Record<string, unknown>).compactTextVars).toBeUndefined();
            });

            it("does NOT export compactInputVarsFn", () => {
                // compactInputVarsFn is defined but never used
                expect((mainExports as Record<string, unknown>).compactInputVarsFn).toBeUndefined();
            });

            it("does NOT export compactInputVarsNoHeightFn", () => {
                // compactInputVarsNoHeightFn is defined but never used
                expect((mainExports as Record<string, unknown>).compactInputVarsNoHeightFn).toBeUndefined();
            });
        });
    });

    describe("Theme exports (src/theme/index.ts)", () => {
        it("exports compactTheme", () => {
            expect(themeExports.compactTheme).toBeDefined();
        });

        it("exports compactThemeOverride", () => {
            expect(themeExports.compactThemeOverride).toBeDefined();
        });

        it("exports compactColors", () => {
            expect(themeExports.compactColors).toBeDefined();
        });

        it("exports compactDarkColors", () => {
            expect(themeExports.compactDarkColors).toBeDefined();
        });

        it("compactTheme has components configured", () => {
            expect(themeExports.compactTheme.components).toBeDefined();
            expect(Object.keys(themeExports.compactTheme.components ?? {}).length).toBeGreaterThan(0);
        });
    });

    describe("Constants exports (src/constants/index.ts)", () => {
        it("exports DEFAULT_GRADIENT_STOP_COLOR", () => {
            expect(constantsExports.DEFAULT_GRADIENT_STOP_COLOR).toBeDefined();
        });

        it("exports SWATCH_COLORS_HEXA", () => {
            expect(constantsExports.SWATCH_COLORS_HEXA).toBeDefined();
        });

        it("exports popout constants", () => {
            expect(constantsExports.POPOUT_Z_INDEX_BASE).toBeDefined();
            expect(constantsExports.POPOUT_GAP).toBeDefined();
            expect(constantsExports.POPOUT_NESTED_GAP).toBeDefined();
        });

        it("exports MANTINE_SPACING", () => {
            expect(constantsExports.MANTINE_SPACING).toBeDefined();
        });

        it("exports COMPACT_SIZING", () => {
            expect(constantsExports.COMPACT_SIZING).toBeDefined();
        });

        it("does NOT export unused SWATCH_COLORS", () => {
            expect((constantsExports as Record<string, unknown>).SWATCH_COLORS).toBeUndefined();
        });

        it("does NOT export FLOATING_UI_Z_INDEX from constants index (internal use only)", () => {
            // FLOATING_UI_Z_INDEX is used internally by theme but not exposed in public API
            expect((constantsExports as Record<string, unknown>).FLOATING_UI_Z_INDEX).toBeUndefined();
        });
    });

    describe("Utils exports (src/utils/index.ts)", () => {
        it("exports color stop utilities", () => {
            expect(utilsExports.createColorStop).toBeDefined();
            expect(utilsExports.createDefaultGradientStops).toBeDefined();
        });

        it("exports color utilities", () => {
            expect(utilsExports.isValidHex).toBeDefined();
            expect(utilsExports.parseHexaColor).toBeDefined();
            expect(utilsExports.toHexaColor).toBeDefined();
            expect(utilsExports.opacityToAlphaHex).toBeDefined();
            expect(utilsExports.parseAlphaFromHexa).toBeDefined();
            expect(utilsExports.MAX_ALPHA_HEX).toBeDefined();
            expect(utilsExports.MAX_OPACITY_PERCENT).toBeDefined();
        });

        it("exports mergeExtensions utilities for advanced users", () => {
            // These are available from utils for advanced theme composition
            expect(utilsExports.mergeExtensions).toBeDefined();
            expect(utilsExports.mergeExtensions3).toBeDefined();
            expect(utilsExports.mergeExtensions4).toBeDefined();
        });
    });
});
