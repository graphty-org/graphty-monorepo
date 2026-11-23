import axe from "axe-core";

/**
 * The axe-core check Storybook's Accessibility panel runs (addon-a11y), as one list of findings
 * for an `expect(...).toEqual([])`. Shared by tests/a11y/stories-axe.browser.test.tsx and the
 * all-stories harness (tests/stories/play.storybook.test.tsx).
 *
 * Rules switched off, and why:
 * - `region` everywhere, as addon-a11y does: a story is a fragment of a page, not a page with
 *   landmarks.
 * - `color-contrast` under the default (exact Figma) token set: Figma's secondary and
 *   placeholder text fall short of AA by design, and `createCompactTheme({ highContrast: true })`
 *   is the AA set (stories/introduction/Accessibility.mdx, "Contrast: exact Figma, or AA").
 * @param contrast - the story's contrast global: "figma" (the default) or "high"
 * @param off - further rules to switch off for this story, each with its reason at the caller
 * @returns one line per violation: rule, impact, help, and the selectors of the failing nodes
 */
export async function axeFindings(contrast: "figma" | "high", off: readonly string[] = []): Promise<string[]> {
    const disabled = ["region", ...off, ...(contrast === "figma" ? ["color-contrast"] : [])];
    axe.reset();
    const result = await axe.run(document.body, {
        rules: Object.fromEntries(disabled.map((id) => [id, { enabled: false }])),
    });
    return result.violations.map(
        (v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `    ${n.target.join(" ")}`).join("\n")}`,
    );
}

/**
 * Rules switched off by design, by story title: `scrollable-region-focusable` for Menu. A long menu
 * scrolls, and its rows are out of the Tab order by design (WAI-ARIA menu pattern: one Tab stop,
 * the arrow keys move between rows and scroll each into view). axe exempts a combobox's listbox
 * for the same reason, not a menu.
 */
export const OFF_BY_DESIGN: Record<string, string[]> = {
    "Components/Overlays/Menu": ["scrollable-region-focusable"],
};

/**
 * Known violations not fixed yet, by story id, each with its tracking issue. Shrink-only: remove a
 * line when its cause is fixed, never add one to pass a new story.
 */
export const AXE_EXCEPTIONS: Record<string, { rules: string[]; issue: number }> = {};
