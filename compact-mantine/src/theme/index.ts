import { createTheme, DEFAULT_THEME, mergeMantineTheme } from "@mantine/core";

import { PANEL_GRID } from "../constants/panel";
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

declare module "@mantine/core" {
    /**
     * The values this package puts on `theme.other`.
     *
     * Everything here is optional: a consumer who writes their own
     * `createTheme({ other: {...} })` is not required to carry the panel grid,
     * and reading `theme.other.panelGrid` is therefore a narrowed read.
     */
    interface MantineThemeOther {
        /**
         * The pixel grid every panel row is measured against, so a consumer
         * theming this library can read the geometry -- the 280px width, the
         * 224px body span, the 108px field, the 24px trailing slot -- from the
         * theme instead of retyping it.
         */
        panelGrid?: typeof PANEL_GRID;
    }
}

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
    // Keyboard focus is always visible; pointer focus is not. `auto` resolves to
    // Mantine's `:focus-visible` rule, so a mouse click on a control leaves the
    // dense surface unmarked while Tab paints a 2px ring -- WCAG 2.4.7 without
    // giving up the design-tool look. Do not set this to "never": that resolves
    // to `outline: none` on every control in the library at once.
    focusRing: "auto",
    // The panel grid, published on the theme so a consumer theming this
    // library reads the geometry rather than retyping it. It is the same
    // object as the exported PANEL_GRID constant.
    other: {
        panelGrid: PANEL_GRID,
    },
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
 * - Borderless at rest, with a visible focus indicator on keyboard focus
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
