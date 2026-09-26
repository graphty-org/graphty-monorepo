/**
 * Story parameter that renders a story twice, light and dark side by side.
 *
 * `.storybook/preview.tsx` reads `parameters.schemes === "both"` and draws the story in two
 * halves, each under its own nested MantineProvider with `forceColorScheme`. The toolbar's theme
 * global is ignored for these stories; contrast and direction still apply. Use it on a page's
 * `States` story: `export const States: Story = { parameters: BOTH_SCHEMES, render: ... }`.
 * Chromatic's light and dark modes set the `schemes` global to "single", so it still captures the
 * story as one real, un-nested render per scheme.
 *
 * Overlays that portal into `document.body` escape the halves, so a States story that holds an
 * overlay open renders it in place (`withinPortal={false}` or
 * `comboboxProps={{ withinPortal: false }}`).
 */
export const BOTH_SCHEMES = { schemes: "both" } as const;
