/**
 * The focus ring is this package's own 1px ring (design/figma-spec.md 2.7), not Mantine's 2px one.
 *
 * `focusRing: "never"` turns Mantine's ring off; the `cm-focus-*` classes in the stylesheet draw
 * ours. tests/theme/focus-ring.browser.test.tsx proves in Chromium that every themed focusable
 * control still shows a ring on keyboard focus, so "never" cannot leave one with none.
 */
import { describe, expect, it } from "vitest";

import { compactTheme, compactThemeOverride } from "../../src/theme";
import { compactGlobalCss } from "../../src/theme/global-styles";

describe("focus ring", () => {
    it("switches Mantine's own ring off", () => {
        expect(compactThemeOverride.focusRing).toBe("never");
        expect(compactTheme.focusRing).toBe("never");
        expect(compactTheme.focusClassName).toBeFalsy();
    });

    it("draws every ring variant 1px in the selected-border token", () => {
        const css = compactGlobalCss();
        for (const [cls, offset] of [
            ["cm-focus-outside", "1px"],
            ["cm-focus-flush", "0"],
            ["cm-focus-inside", "-1px"],
            ["cm-focus-inside-2", "-2px"],
        ]) {
            expect(css).toContain(
                `.${cls}:focus-visible { outline: 1px solid var(--cm-border-selected); outline-offset: ${offset}; }`,
            );
        }
    });

    it("reserves the ring's slot at rest so focus never shifts layout", () => {
        expect(compactGlobalCss()).toMatch(/\.cm-focus-outside, [^{]*\{\s+outline: 1px solid transparent;/);
    });

    it("drops Mantine's pressed nudge: Figma's controls do not move", () => {
        expect(compactTheme.activeClassName).toBe("");
    });
});
