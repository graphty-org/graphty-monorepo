import type { MantineColorsTuple } from "@mantine/core";

/**
 * Custom dark color palette optimized for dense UIs.
 *
 * Usage:
 * - 0-2: Light tones (text, borders in light mode)
 * - 3-5: Mid tones (secondary elements)
 * - 6-7: Dark tones (input backgrounds in dark mode)
 * - 8-9: Darkest tones (main backgrounds in dark mode)
 */
export const compactDarkColors: MantineColorsTuple = [
    "#d5d7da", // 0 - lightest (light mode text)
    "#a3a8b1", // 1
    "#7a828e", // 2 - dimmed text
    "#5f6873", // 3
    "#48525c", // 4
    "#374047", // 5
    "#2a3035", // 6 - input background
    "#1f2428", // 7
    "#161b22", // 8
    "#0d1117", // 9 - darkest (main background)
];

/**
 * Color configuration for the compact theme.
 */
export const compactColors = {
    dark: compactDarkColors,
};
