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
import { compactVariantColorResolver } from "./contrast";
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
    // The default accent passes WCAG AA in both schemes. Stock Mantine fills
    // blue-6 (light) and blue-8 (dark) with white text: 3.56:1 for the text in
    // the light scheme, and 2.11:1 for the fill on the raised surface in the
    // dark one. No single blue shade carries white text at 4.5:1 and still
    // stands 3:1 off the dark panel, so the dark scheme uses a lighter fill
    // with dark text on it:
    //   light, blue-8 #1971c2, white text 5.02:1, fill 3.86:1 or more on panel,
    //     field and raised surface;
    //   dark, blue-5 #339af0, black text 7.02:1, fill 3.53:1 or more.
    // autoContrast picks the text colour from the fill's luminance, so a
    // consumer's own primaryColor still gets readable text.
    // tests/constants/panel.test.ts measures every ratio above and fails if
    // either moves.
    primaryShade: { light: 8, dark: 5 },
    autoContrast: true,
    // Black text on fills brighter than this luminance, white below it.
    // 0.18 is where the two meet: black and white both measure about 4.56:1
    // on a fill of luminance 0.18, so whichever is picked clears 4.5:1 on any
    // fill. Mantine's default, 0.3, puts white text on fills up to 0.3, which
    // measures as low as 3:1 (a consumer colour whose shade 5 sits just under
    // 0.3, for example).
    luminanceThreshold: 0.18,
    // Mantine's autoContrast judges text colour from the light-scheme shade
    // only, which would put white text on the dark scheme's blue-5 (2.99:1).
    // The resolver below, and the contrastVar / switchTrackColor calls in the
    // component extensions, choose the text per scheme; see ./contrast.ts.
    // tests/theme/accent-contrast.browser.test.tsx measures the painted result.
    variantColorResolver: compactVariantColorResolver,
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
