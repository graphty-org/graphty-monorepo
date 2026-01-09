import { createTheme, DEFAULT_THEME, mergeMantineTheme } from "@mantine/core";

import { compactColors } from "./colors";
import {
    buttonComponentExtensions,
    controlComponentExtensions,
    displayComponentExtensions,
    feedbackComponentExtensions,
    inputComponentExtensions,
    navigationComponentExtensions,
    overlayComponentExtensions,
} from "./components";
import { compactFontSizes, compactRadius, compactSpacing } from "./tokens";

/**
 * Partial theme override with compact sizing for dense UIs.
 *
 * This is the raw theme override created with createTheme().
 * Use this if you need to merge with other theme overrides using mergeThemeOverrides().
 *
 * For most use cases, use `compactTheme` instead which is a full merged theme.
 */
export const compactThemeOverride = createTheme({
    colors: compactColors,
    fontSizes: compactFontSizes,
    spacing: compactSpacing,
    radius: compactRadius,
    // Disable focus ring outlines globally for a cleaner UI
    // This is appropriate for dense/professional interfaces like design tools
    focusRing: "never",
    // Spread all component extensions into the theme
    // Each extension object provides compact size support for a category of components
    components: {
        ...inputComponentExtensions,
        ...buttonComponentExtensions,
        ...controlComponentExtensions,
        ...displayComponentExtensions,
        ...feedbackComponentExtensions,
        ...navigationComponentExtensions,
        ...overlayComponentExtensions,
    },
});

/**
 * Full Mantine theme with compact sizing by default for dense UIs.
 *
 * This is a complete theme merged with DEFAULT_THEME, suitable for:
 * - Direct use with MantineProvider
 * - Merging with other themes using mergeMantineTheme()
 *
 * All components default to size="sm" automatically with compact styling:
 * - Input height: 24px
 * - Font size: 11px
 * - No borders
 * - Semantic color backgrounds
 *
 * Global token overrides:
 * - fontSizes: Smaller font sizes (xs: 10px, sm: 11px, md: 13px, lg: 14px, xl: 16px)
 * - spacing: Tighter spacing (xs: 4px, sm: 6px, md: 8px, lg: 12px, xl: 16px)
 * - radius: Compact corner radii (xs: 2px, sm: 4px, md: 6px, lg: 8px, xl: 12px)
 * @example
 * ```tsx
 * // Simple usage - direct with MantineProvider
 * import { MantineProvider } from '@mantine/core';
 * import { compactTheme } from '@graphty/compact-mantine';
 *
 * <MantineProvider theme={compactTheme}>
 *     <App />
 * </MantineProvider>
 * ```
 * @example
 * ```tsx
 * // Extending the theme with mergeMantineTheme
 * import { mergeMantineTheme, createTheme } from '@mantine/core';
 * import { compactTheme } from '@graphty/compact-mantine';
 *
 * const myTheme = mergeMantineTheme(compactTheme, createTheme({
 *     primaryColor: 'teal',
 * }));
 *
 * <MantineProvider theme={myTheme}>
 *     <App />
 * </MantineProvider>
 * ```
 */
export const compactTheme = mergeMantineTheme(DEFAULT_THEME, compactThemeOverride);

export { compactColors, compactDarkColors } from "./colors";
