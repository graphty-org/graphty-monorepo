import { DEFAULT_THEME, type MantineColorsTuple } from "@mantine/core";

/**
 * Mantine's `dark` ramp, re-pointed at Figma's neutral grays (spec 3.3), so an unthemed Mantine
 * surface in the dark scheme matches the panels around it.
 *
 * - 0: text (#fff)
 * - 2: Mantine's dimmed text (#8c8c8c); the AA option points dimmed text at its secondary ink
 * - 5: hover (#444)
 * - 6: default field (#383838)
 * - 7: body / panel (#2c2c2c)
 * - 8: menus and tooltips (#1e1e1e)
 */
export const compactDarkColors: MantineColorsTuple = [
    "#ffffff",
    "#b3b3b3",
    "#8c8c8c",
    "#757575",
    "#444444",
    "#444444",
    "#383838",
    "#2c2c2c",
    "#1e1e1e",
    "#111111",
];

/**
 * The accent palette, the theme's `primaryColor` (spec 3.3). Mantine reads shade 6 filled and
 * 7 hover in light (#0d99ff / #007be5), 8 / 9 in dark (#0c8ce9 / #0a6dc2), and shade 4 as the
 * dark-scheme anchor color (#7cc4f8, Figma's dark brand text).
 */
export const compactBrandColors: MantineColorsTuple = [
    "#e5f4ff",
    "#bde3ff",
    "#80caff",
    "#4db5ff",
    "#7cc4f8",
    "#30a8ff",
    "#0d99ff",
    "#007be5",
    "#0c8ce9",
    "#0a6dc2",
];

/**
 * The graphty brand lime, the `primaryColor` of `createCompactTheme({ accent: "graphty" })`, for
 * the Mantine components that read the primary palette directly: 0 the lime-50 tint, 6 the mark
 * green #97c800 (the light fill), 7 the olive #588300 (light text), 8 the bright lime #c4f23a
 * (the dark fill). The `--cm-*` accent tokens take their values from CM_GRAPHTY_ACCENT.
 */
export const compactGraphtyColors: MantineColorsTuple = [
    "#f1fbd3",
    "#e2f7a8",
    "#d3f47c",
    "#c9ef5a",
    "#c4f23a",
    "#aedf10",
    "#97c800",
    "#588300",
    "#c4f23a",
    "#aedf10",
];

/**
 * Color configuration for the compact theme: every Mantine color, the neutral `dark` ramp, the
 * the `brand` accent and the `graphty` accent.
 */
export const compactColors = {
    ...DEFAULT_THEME.colors,
    dark: compactDarkColors,
    brand: compactBrandColors,
    graphty: compactGraphtyColors,
};
