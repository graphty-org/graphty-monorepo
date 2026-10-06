import { ActionIcon, ActionIconGroup, Button, CloseButton } from "@mantine/core";
import { createElement } from "react";

import { ButtonSpinner } from "../../components/buttons/ButtonSpinner";
import { CloseGlyph } from "../../components/buttons/CloseGlyph";
import {
    compactActionIconScale,
    compactActionIconVariantVars,
    compactButtonScale,
    compactButtonVariantVars,
    compactCloseButtonScale,
} from "../styles/buttons";
import { compactVarsForSize } from "../styles/size-scale";

/**
 * Theme extensions for the button family, drawn to Figma's measurements (design/figma-spec.md 4).
 *
 * Each `vars` resolver reads `props.size` (the per-size scale, see ../styles/size-scale.ts) and
 * `props.variant` / `props.color` (the Figma look for that variant, see ../styles/buttons.ts). The
 * look is written into Mantine's own color variables, so Mantine's hover rule and every
 * consumer's `vars` prop keep working; the states Mantine has no variable for are drawn by the
 * `cm-*` classes these extensions add, in ../css/buttons.css.ts.
 *
 * `props?.size` and `theme?.primaryColor` are read with optional chaining because the theme's own
 * unit tests call `extension.vars!()` with no arguments.
 *
 * - Button: default size sm (24 tall, the label inset 8px, 11/16 weight 450); loading draws
 *   Figma's 12px ring spinner. Variants: filled
 *   (primary), default (secondary), subtle (ghost), light, outline (= secondary), and the new
 *   danger, danger-outline, inverse, success; `color="red"` on filled is danger.
 * - ActionIcon: default size sm (24) and variant subtle (the ghost). `aria-expanded="true"` or
 *   `aria-pressed="true"` draws the open / on look, so PopoutButton, AdvancedButton inside a
 *   Popout trigger, and ToggleIconButton light up without a prop of their own. `light` is Figma's
 *   "highlighted" look; it no longer draws the 1px accent border older releases added.
 * - ActionIcon.Group: the joined 88 x 24 bar (4.6); subtle and default icons inside it take the
 *   joined look.
 * - CloseButton: default size sm (24 box, 10px X), Figma's ghost colors.
 */
export const buttonComponentExtensions = {
    Button: Button.extend({
        defaultProps: {
            size: "sm",
            loaderProps: { size: 16, children: createElement(ButtonSpinner) },
        },
        classNames: {
            root: "cm-button",
            inner: "cm-button-inner",
            label: "cm-button-label",
            section: "cm-button-section",
            loader: "cm-button-loader",
        },
        vars: (theme, props) => ({
            root: {
                ...compactVarsForSize(compactButtonScale, props?.size),
                ...compactButtonVariantVars(props?.variant, props?.color, theme?.primaryColor),
            },
        }),
    }),

    ActionIcon: ActionIcon.extend({
        defaultProps: {
            size: "sm",
            variant: "subtle",
        },
        classNames: {
            root: "cm-action-icon",
            icon: "cm-action-icon-icon",
            loader: "cm-action-icon-loader",
        },
        vars: (theme, props) => ({
            root: {
                ...compactVarsForSize(compactActionIconScale, props?.size),
                ...compactActionIconVariantVars(props?.variant, props?.color, theme?.primaryColor),
            },
        }),
    }),

    ActionIconGroup: ActionIconGroup.extend({
        classNames: { group: "cm-ai-group" },
    }),

    CloseButton: CloseButton.extend({
        defaultProps: {
            size: "sm",
            icon: createElement(CloseGlyph),
        },
        classNames: { root: "cm-close-button" },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactCloseButtonScale, props?.size),
        }),
    }),
};
