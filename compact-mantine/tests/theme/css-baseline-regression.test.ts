/**
 * Global token regression: the Mantine scales the theme sets (design/figma-spec.md 2.3-2.5).
 *
 * Per-component assertions that used to live here moved to each package's own suites and its
 * tests/figma/<package>.browser.test.tsx, so restyling a component never breaks this file.
 */
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";
import { compactFontSizes, compactRadius, compactSpacing } from "../../src/theme/tokens";

describe("Global Token Regression - fontSizes", () => {
    it("xs is 9px", () => {
        expect(compactFontSizes.xs).toBe("9px");
    });

    it("sm is 11px (compact default)", () => {
        expect(compactFontSizes.sm).toBe("11px");
    });

    it("md is 13px", () => {
        expect(compactFontSizes.md).toBe("13px");
    });

    it("lg is 15px", () => {
        expect(compactFontSizes.lg).toBe("15px");
    });

    it("xl is 24px", () => {
        expect(compactFontSizes.xl).toBe("24px");
    });

    it("theme fontSizes matches compactFontSizes", () => {
        expect(compactTheme.fontSizes).toEqual(compactFontSizes);
    });
});

describe("Global Token Regression - spacing", () => {
    it("xs is 4px", () => {
        expect(compactSpacing.xs).toBe("4px");
    });

    it("sm is 8px", () => {
        expect(compactSpacing.sm).toBe("8px");
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

    it("sm is 5px", () => {
        expect(compactRadius.sm).toBe("5px");
    });

    it("md is 5px", () => {
        expect(compactRadius.md).toBe("5px");
    });

    it("lg is 13px", () => {
        expect(compactRadius.lg).toBe("13px");
    });

    it("xl is 13px", () => {
        expect(compactRadius.xl).toBe("13px");
    });

    it("theme radius matches compactRadius", () => {
        expect(compactTheme.radius).toEqual(compactRadius);
    });
});

// ============================================================================
// INPUT COMPONENTS CSS VARIABLE REGRESSION
// Baseline values from css-baseline-new capture
// ============================================================================
