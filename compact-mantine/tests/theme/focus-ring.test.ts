/**
 * Focus indicator regression tests (WCAG 2.4.7).
 *
 * The published 0.5.1 theme set `focusRing: "never"` and `--input-bd: none`,
 * which together left every input, button and icon button in the library
 * without a focus indicator. These assertions fail if either comes back.
 */
import { describe, expect, it } from "vitest";

import { compactTheme, compactThemeOverride } from "../../src/theme";
import { compactInputElementStyles, compactInputVars, compactInputVarsNoHeight } from "../../src/theme/styles/inputs";

describe("focus indicator", () => {
    describe("theme.focusRing", () => {
        it("is never set to 'never'", () => {
            // "never" resolves to `.mantine-focus-never:focus { outline: none }`
            // on every focusable Mantine control at once.
            expect(compactThemeOverride.focusRing).not.toBe("never");
            expect(compactTheme.focusRing).not.toBe("never");
        });

        it("is 'auto', so the ring is scoped to :focus-visible", () => {
            expect(compactThemeOverride.focusRing).toBe("auto");
            expect(compactTheme.focusRing).toBe("auto");
        });

        it("does not override the ring with a focusClassName", () => {
            // theme.focusClassName outranks theme.focusRing in Mantine, so an
            // empty value here is what lets focusRing decide.
            expect(compactTheme.focusClassName).toBeFalsy();
        });
    });

    describe("input border", () => {
        it("leaves --input-bd paintable", () => {
            // Mantine shows input focus by swapping --input-bd to
            // --input-bd-focus inside `border: 1px solid var(--input-bd)`.
            // The keyword `none` makes that declaration invalid, so the focus
            // border can never paint.
            expect(compactInputVars["--input-bd"]).not.toBe("none");
            expect(compactInputVarsNoHeight["--input-bd"]).not.toBe("none");
        });

        it("does not set an inline border on the input element", () => {
            // An inline border wins over Mantine's focus rule.
            expect(compactInputElementStyles).not.toHaveProperty("border");
        });

        it("lightens the focus border in dark mode (WCAG 1.4.11)", () => {
            // Mantine's default --input-bd-focus is --mantine-primary-color-filled,
            // which is shade 8 in dark: #1971c2 measures 2.66:1 on the #2a3035
            // field and 3.12:1 on the #1f2428 panel, under the 3:1 a non-text
            // indicator needs. Shade 5 measures 4.46:1 and 5.23:1.
            for (const vars of [compactInputVars, compactInputVarsNoHeight]) {
                const focus = vars["--input-bd-focus"];
                expect(focus).toBeDefined();
                expect(focus).toContain("light-dark(");
                // The consumer's own primary colour, not a hard-coded blue.
                expect(focus).toContain("--mantine-primary-color-filled");
                expect(focus).toContain("--mantine-primary-color-5");
                expect(focus).not.toMatch(/#[0-9a-f]{3,8}/i);
            }
        });
    });
});
