import { Avatar, Badge, Indicator, Kbd, Pill, Text, ThemeIcon } from "@mantine/core";

import {
    compactAvatarVars,
    compactBadgeVars,
    compactIndicatorVars,
    compactKbdVars,
    compactPillVars,
    compactThemeIconVars,
} from "../styles/display";

/**
 * Theme extensions for display components with compact sizing by default.
 *
 * All sized display components default to size="sm" for a compact appearance.
 * CSS variables are applied via `vars` functions to override Mantine's defaults:
 * - Badge: --badge-height: 14px, --badge-fz: 9px
 * - Text: Uses global fontSizes from theme (no vars override)
 * - Avatar: --avatar-size: 24px
 * - ThemeIcon: --ti-size: 24px
 * - Indicator: --indicator-size: 8px
 * - Kbd: --kbd-fz: 10px
 * - Pill: --pill-height: 16px, --pill-fz: 10px
 */
export const displayComponentExtensions = {
    Text: Text.extend({
        // Text does NOT set a default size or vars - it uses the global fontSizes
        // from the theme (compactFontSizes) which are already set correctly.
        // This allows size="xs", "sm", "md", "lg", "xl" to work as expected.
    }),

    Badge: Badge.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactBadgeVars,
        }),
    }),

    Pill: Pill.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactPillVars,
        }),
    }),

    Avatar: Avatar.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactAvatarVars,
        }),
    }),

    ThemeIcon: ThemeIcon.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactThemeIconVars,
        }),
    }),

    Indicator: Indicator.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactIndicatorVars,
        }),
    }),

    Kbd: Kbd.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactKbdVars,
        }),
    }),
};
