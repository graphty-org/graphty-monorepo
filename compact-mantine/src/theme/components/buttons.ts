import { ActionIcon, Button, CloseButton } from "@mantine/core";

import {
    compactActionIconVars,
    compactButtonVars,
    compactCloseButtonVars,
} from "../styles/buttons";

/**
 * Theme extensions for button components with compact sizing by default.
 *
 * All button components default to size="sm" for a compact appearance.
 * CSS variables are applied via `vars` functions to override Mantine's defaults:
 * - Button: --button-height: 24px, --button-fz: 11px
 * - ActionIcon: --ai-size: 24px
 * - CloseButton: --cb-size: 16px, --cb-icon-size: 12px
 */
export const buttonComponentExtensions = {
    Button: Button.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactButtonVars,
        }),
    }),

    ActionIcon: ActionIcon.extend({
        defaultProps: {
            size: "sm",
            variant: "subtle",
        },
        vars: () => ({
            root: compactActionIconVars,
        }),
    }),

    CloseButton: CloseButton.extend({
        defaultProps: {
            size: "xs",
        },
        vars: () => ({
            root: compactCloseButtonVars,
        }),
    }),
};
