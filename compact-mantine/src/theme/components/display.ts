import { Avatar, Badge, Card, Indicator, Kbd, Pill, Text, ThemeIcon } from "@mantine/core";

import {
    compactAvatarScale,
    compactBadgeScale,
    compactIndicatorScale,
    compactKbdScale,
    compactPillScale,
    compactThemeIconScale,
} from "../styles/display";
import { compactVarsForSize } from "../styles/size-scale";
import { CM_TYPE } from "../tokens";

/** Badge colors per variant when no `color` is given (spec 11.6). */
const BADGE_TOKENS: Record<string, Record<string, string>> = {
    outline: { "--badge-bg": "transparent", "--badge-color": "var(--cm-text)" },
    filled: { "--badge-bg": "var(--cm-bg-brand)", "--badge-color": "var(--cm-text-onbrand)" },
    light: { "--badge-bg": "var(--cm-bg-selected)", "--badge-color": "var(--cm-text-brand)" },
};

/** The Text sizes that are a Figma type role: sm is body, xs is caption (spec 2.3). */
const TEXT_ROLE_VARS: Record<string, Record<string, string>> = {
    sm: { "--cm-text-fw": String(CM_TYPE.body.fontWeight), "--cm-text-ls": CM_TYPE.body.letterSpacing },
    xs: { "--cm-text-fw": String(CM_TYPE.caption.fontWeight), "--cm-text-ls": CM_TYPE.caption.letterSpacing },
};

/** ThemeIcon colors per variant when no `color` is given (spec 11.10). */
const THEME_ICON_TOKENS: Record<string, Record<string, string>> = {
    filled: { "--ti-bg": "var(--cm-bg-brand)", "--ti-color": "var(--cm-text-onbrand)" },
    light: { "--ti-bg": "var(--cm-bg-selected)", "--ti-color": "var(--cm-icon-brand)" },
};

/**
 * Theme extensions for the display components, measured from Figma (design/figma-spec.md
 * 11.6-11.10). Sizes come from the scales in ../styles/display.ts, keyed by the `size` prop;
 * colors come from the `--cm-*` tokens whenever the caller gives no `color`, so an explicit
 * `color="red"` still gets Mantine's palette. The state rules (the badge's outline, the dot's
 * ring, the avatar ring in a group, the key cap) are in ../css/shell.css.ts.
 *
 * `props?.size` is read with optional chaining because the theme suites call `vars!()` with no
 * arguments; compactVarsForSize maps an absent size onto the compact entry.
 */
export const displayComponentExtensions = {
    // Text reads the theme's fontSizes / lineHeights (9/14, 11/16, 13/22, 15/25, 24/32). At sm and
    // xs it also takes the body and caption roles' 450 weight and letter-spacing (the rule is in
    // ../css/shell.css.ts); Mantine's own Text is weight normal.
    Text: Text.extend({
        classNames: { root: "cm-text" },
        vars: (_theme, props) => ({ root: TEXT_ROLE_VARS[String(props?.size)] ?? {} }),
    }),

    Badge: Badge.extend({
        defaultProps: { size: "sm", variant: "outline" },
        classNames: { root: "cm-badge" },
        vars: (_theme, props) => ({
            root: {
                ...compactVarsForSize(compactBadgeScale, props?.size),
                ...(props?.radius === undefined ? { "--badge-radius": "5px" } : {}),
                ...(props?.color ? {} : { ...BADGE_TOKENS[props?.variant ?? "outline"], "--badge-bd": "0 solid transparent" }),
            },
        }),
    }),

    Pill: Pill.extend({
        defaultProps: { size: "sm" },
        classNames: { root: "cm-pill" },
        vars: (_theme, props) => ({
            root: {
                ...compactVarsForSize(compactPillScale, props?.size),
                ...(props?.radius === undefined ? { "--pill-radius": "5px" } : {}),
            },
        }),
    }),

    Avatar: Avatar.extend({
        defaultProps: { size: "sm", variant: "filled" },
        classNames: { root: "cm-avatar", placeholder: "cm-avatar-placeholder" },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactAvatarScale, props?.size),
        }),
    }),

    // A 2px ring around each avatar and a 21px step (hm/header-right-default #39, #49).
    AvatarGroup: Avatar.Group.extend({
        defaultProps: { spacing: "7px" },
    }),

    ThemeIcon: ThemeIcon.extend({
        defaultProps: { size: "sm" },
        classNames: { root: "cm-theme-icon" },
        vars: (_theme, props) => ({
            root: {
                ...compactVarsForSize(compactThemeIconScale, props?.size),
                ...(props?.radius === undefined ? { "--ti-radius": "5px" } : {}),
                ...(props?.color ? {} : (THEME_ICON_TOKENS[props?.variant ?? "filled"] ?? {})),
            },
        }),
    }),

    Indicator: Indicator.extend({
        defaultProps: { size: "sm", withBorder: true },
        classNames: { indicator: "cm-indicator" },
        vars: (_theme, props) => ({
            root: {
                ...compactVarsForSize(compactIndicatorScale, props?.size),
                ...(props?.radius === undefined ? { "--indicator-radius": "100%" } : {}),
                ...(props?.color ? {} : { "--indicator-color": "var(--cm-bg-brand)" }),
            },
        }),
    }),

    // Figma's library card (C55; ls/panel-assets #114): padding 8, a transparent 1px edge,
    // radius 5, no fill, no shadow. `radius="lg"` (13) is the promo card. A card rendered as a link or button
    // hovers and rings (../css/shell.css.ts).
    Card: Card.extend({
        defaultProps: { padding: 8, radius: "sm", withBorder: true },
        classNames: { root: "cm-card" },
    }),

    Kbd: Kbd.extend({
        defaultProps: { size: "sm" },
        classNames: { root: "cm-kbd" },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactKbdScale, props?.size),
        }),
    }),
};
