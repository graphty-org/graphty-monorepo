import { ActionIcon, Button, CloseButton } from "@mantine/core";

import {
    compactActionIconScale,
    compactButtonScale,
    compactCloseButtonScale,
} from "../styles/buttons";
import { compactVarsForSize } from "../styles/size-scale";

/**
 * Theme extensions for button components with compact sizing by default.
 *
 * Button and ActionIcon default to size="sm" and CloseButton to size="xs", the
 * tokens their scales in ../styles/buttons.ts mark as compact. Each `vars`
 * resolver reads `props.size` and looks that size up in the component's scale,
 * so an explicitly sized button differs from its neighbours instead of
 * collapsing onto the compact value. Before 2026-09-13 these resolvers took no
 * arguments and returned one frozen object, so xs through xl all rendered
 * identically -- see ../styles/size-scale.ts for the mechanism and the product
 * owner's report.
 *
 * `props?.size` is read with optional chaining on purpose: the theme regression
 * suites invoke `extension.vars!()` with no arguments at all, and
 * compactVarsForSize maps an absent size onto the compact entry.
 *
 * The compact values:
 * - Button (sm): --button-height: 24px, --button-fz: 11px
 * - ActionIcon (sm): --ai-size: 24px
 * - CloseButton (xs): --cb-size: 16px, --cb-icon-size: 12px
 *
 * ActionIcon's `variant: "subtle"` default is the compact chrome's resting
 * treatment -- an icon button in a dense panel carries no ground until it is
 * hovered. It changes what an OMITTED variant means (stock Mantine reads an
 * omitted variant as "filled"), so a call site that wants a filled icon has to
 * say `variant="filled"`; the theme touches only --ai-size and leaves Mantine's
 * --ai-bg / --ai-color / --ai-hover derivation intact, so that renders filled in
 * its colour at the compact size.
 */
export const buttonComponentExtensions = {
    Button: Button.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactButtonScale, props?.size),
        }),
    }),

    ActionIcon: ActionIcon.extend({
        defaultProps: {
            size: "sm",
            variant: "subtle",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactActionIconScale, props?.size),
        }),
    }),

    CloseButton: CloseButton.extend({
        defaultProps: {
            size: "xs",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactCloseButtonScale, props?.size),
        }),
    }),
};
