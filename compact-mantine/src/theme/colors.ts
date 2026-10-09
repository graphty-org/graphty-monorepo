import { DEFAULT_THEME, type MantineColorsTuple } from "@mantine/core";

/**
 * Mantine's `dark` ramp, re-pointed at Figma's neutral grays (spec 3.3), so an unthemed Mantine
 * surface in the dark scheme matches the panels around it.
 *
 * - 0: text (#fff)
 * - 2: Mantine's dimmed text (#a3a3a3): the darkest gray that reads at 4.5:1 (WCAG 1.4.3) on
 *   the panel, a field and a menu; Figma's #8c8c8c measured 4.15:1 on the panel
 * - 5: hover (#444)
 * - 6: default field (#383838)
 * - 7: body / panel (#2c2c2c)
 * - 8: menus and tooltips (#1e1e1e)
 */
export const compactDarkColors: MantineColorsTuple = [
    "#ffffff",
    "#b3b3b3",
    "#a3a3a3",
    "#757575",
    "#444444",
    "#444444",
    "#383838",
    "#2c2c2c",
    "#1e1e1e",
    "#111111",
];

/**
 * Mantine's `gray` ramp with shade 6 darkened. Mantine draws its dimmed text in the light scheme
 * with gray-6, and Mantine's #868e96 measures 3.32:1 on white; #6e6e6e reads at 4.5:1 (WCAG
 * 1.4.3) on white, a field (#f5f5f5) and gray-0 (#f8f9fa).
 */
const compactGrayColors: MantineColorsTuple = [
    "#f8f9fa",
    "#f1f3f5",
    "#e9ecef",
    "#dee2e6",
    "#ced4da",
    "#adb5bd",
    "#6e6e6e",
    "#495057",
    "#343a40",
    "#212529",
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
 * Color configuration for the compact theme: every Mantine color, the neutral `dark` ramp, the
 * `gray` ramp and the `brand` accent.
 */
export const compactColors = {
    ...DEFAULT_THEME.colors,
    gray: compactGrayColors,
    dark: compactDarkColors,
    brand: compactBrandColors,
};
