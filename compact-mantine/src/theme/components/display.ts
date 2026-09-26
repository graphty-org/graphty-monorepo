import { Avatar, Badge, Indicator, Kbd, Pill, Text, ThemeIcon } from "@mantine/core";

import { contrastVar } from "../contrast";
import {
    compactAvatarScale,
    compactBadgeScale,
    compactIndicatorScale,
    compactKbdScale,
    compactPillScale,
    compactThemeIconScale,
} from "../styles/display";
import { compactVarsForSize } from "../styles/size-scale";

/**
 * Theme extensions for display components with compact sizing by default.
 *
 * All sized display components default to size="sm", which every scale in
 * ../styles/display.ts answers with the compact values this package has always
 * shipped. Each `vars` resolver reads `props.size` and looks that size up in the
 * component's scale, so an explicitly sized badge, avatar or pill differs from
 * its neighbours instead of collapsing onto the compact value. Before 2026-09-13
 * these resolvers took no arguments and returned one frozen object, so xs
 * through xl all rendered identically -- see ../styles/size-scale.ts for the
 * mechanism and the product owner's report.
 *
 * `props?.size` is read with optional chaining on purpose: the theme regression
 * suites invoke `extension.vars!()` with no arguments at all, and
 * compactVarsForSize maps an absent size onto the compact entry.
 *
 * The compact (size="sm") values:
 * - Badge: --badge-height: 14px, --badge-fz: 9px
 * - Text: uses the theme's global compactFontSizes (no vars override)
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
        vars: (theme, props) => ({
            root: {
                ...compactVarsForSize(compactBadgeScale, props?.size),
                // With neither color nor variant, Mantine leaves the text to its
                // stylesheet, which hard-codes white; see ../contrast.ts.
                "--badge-color":
                    props?.color === undefined && props?.variant === undefined
                        ? contrastVar(theme, props)
                        : undefined,
            },
        }),
    }),

    Pill: Pill.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactPillScale, props?.size),
        }),
    }),

    Avatar: Avatar.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactAvatarScale, props?.size),
        }),
    }),

    ThemeIcon: ThemeIcon.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (theme, props) => ({
            root: {
                ...compactVarsForSize(compactThemeIconScale, props?.size),
                // With neither color nor variant, Mantine leaves the text to its
                // stylesheet, which hard-codes white; see ../contrast.ts.
                "--ti-color":
                    props?.color === undefined && props?.variant === undefined
                        ? contrastVar(theme, props)
                        : undefined,
            },
        }),
    }),

    Indicator: Indicator.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (theme, props) => ({
            root: {
                ...compactVarsForSize(compactIndicatorScale, props?.size),
                "--indicator-text-color": contrastVar(theme, props),
            },
        }),
    }),

    Kbd: Kbd.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactKbdScale, props?.size),
        }),
    }),
};
