import {
    createTheme,
    DEFAULT_THEME,
    type MantineTheme,
    type MantineThemeComponent,
    type MantineThemeComponents,
    type MantineThemeOverride,
    mergeMantineTheme,
} from "@mantine/core";

import { PANEL_GRID } from "../constants/panel";
import { compactColors } from "./colors";
import { componentExtensions } from "./components";
import { type CompactThemeOptions, ensureCompactStyles } from "./global-styles";
import {
    CM_FONT_FAMILY,
    CM_FONT_FAMILY_MONO,
    compactFontSizes,
    compactLineHeights,
    compactRadius,
    compactShadows,
    compactSpacing,
} from "./tokens";

declare module "@mantine/core" {
    /**
     * The values this package puts on `theme.other`.
     *
     * Everything here is optional: a consumer who writes their own
     * `createTheme({ other: {...} })` is not required to carry them, and reading
     * them is therefore a narrowed read.
     */
    interface MantineThemeOther {
        /**
         * The pixel grid every panel row is measured against (the 240px panel, the 88px
         * field, the 24px trailing slot), published so a consumer reads the geometry from
         * the theme instead of retyping it.
         */
        panelGrid?: typeof PANEL_GRID;
        /** The options this theme was created with, resolved. */
        compact?: { highContrast: boolean };
    }
}

/**
 * Wrap every extension's `vars` resolver so that the first themed component to render injects
 * the stylesheet and sets the contrast mode. Mantine calls `vars` on every render, so the
 * injection is one cheap check after the first call.
 * @param components - the component extensions
 * @param options - the resolved theme options
 * @returns the same extensions with wrapped resolvers
 */
function withStyleInjection(
    components: MantineThemeComponents,
    options: Required<CompactThemeOptions>,
): MantineThemeComponents {
    const wrapped: MantineThemeComponents = {};
    for (const [name, extension] of Object.entries(components)) {
        const { vars } = extension;
        wrapped[name] = {
            ...extension,
            vars: (...args: Parameters<NonNullable<MantineThemeComponent["vars"]>>) => {
                ensureCompactStyles(options);
                return vars ? vars(...args) : {};
            },
        };
    }
    return wrapped;
}

/**
 * Create the compact theme: Figma's editor look in both colour schemes, or with
 * `highContrast: true` the WCAG 2.2 AA token set (design/figma-spec.md 2.9).
 *
 * Light and dark are Mantine's own colour scheme (`defaultColorScheme`, `forceColorScheme`,
 * `useMantineColorScheme`); one theme object serves both.
 * @param options - `highContrast` switches on the AA tokens
 * @returns a theme override for `MantineProvider`
 * @example
 * ```tsx
 * <MantineProvider theme={createCompactTheme({ highContrast: true })}>
 *     <App />
 * </MantineProvider>
 * ```
 */
export function createCompactTheme(options: CompactThemeOptions = {}): MantineThemeOverride {
    const resolved = { highContrast: options.highContrast ?? false };
    // Inject the stylesheet now, so a page whose only compact styling is a `var(--cm-*)` on a
    // plain Box has its tokens before any themed component renders. The vars wrapper below
    // re-injects if the sheet is removed and re-asserts the contrast mode of the theme in use.
    ensureCompactStyles(resolved);
    return createTheme({
        colors: compactColors,
        primaryColor: "brand",
        primaryShade: { light: 6, dark: 8 },
        white: "#ffffff",
        black: "#000000",
        fontFamily: CM_FONT_FAMILY,
        fontFamilyMonospace: CM_FONT_FAMILY_MONO,
        headings: { fontFamily: CM_FONT_FAMILY, fontWeight: "550" },
        fontSizes: compactFontSizes,
        lineHeights: compactLineHeights,
        spacing: compactSpacing,
        radius: compactRadius,
        defaultRadius: "sm",
        shadows: compactShadows,
        fontSmoothing: true,
        cursorType: "default",
        // The ring is this package's own 1px one (the cm-focus-* classes, spec 2.7); Mantine's
        // 2px ring would draw over it.
        focusRing: "never",
        // Figma's controls do not move when pressed.
        activeClassName: "",
        other: {
            panelGrid: PANEL_GRID,
            compact: resolved,
        },
        components: withStyleInjection(componentExtensions, resolved),
    });
}

/**
 * The compact theme override at Figma defaults: `createCompactTheme()`.
 *
 * Use this to merge with other overrides (`mergeThemeOverrides`); for most uses pass
 * `compactTheme` to `MantineProvider` instead.
 */
export const compactThemeOverride = createCompactTheme();

/**
 * The full Mantine theme at Figma defaults, merged with DEFAULT_THEME.
 * @example
 * ```tsx
 * import { MantineProvider } from '@mantine/core';
 * import { compactTheme } from '@graphty/compact-mantine';
 *
 * <MantineProvider theme={compactTheme}>
 *     <App />
 * </MantineProvider>
 * ```
 */
export const compactTheme: MantineTheme = mergeMantineTheme(DEFAULT_THEME, compactThemeOverride);

export { compactBrandColors, compactColors, compactDarkColors } from "./colors";
export { compactGlobalCss, type CompactThemeOptions, ensureCompactStyles } from "./global-styles";
