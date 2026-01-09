import { Anchor, Burger, NavLink, Pagination, Stepper, Tabs } from "@mantine/core";

import {
    compactAnchorStyles,
    compactBurgerVars,
    compactNavLinkStyles,
    compactPaginationVars,
    compactStepperVars,
    compactTabsStyles,
} from "../styles/navigation";

/**
 * Theme extensions for navigation components with compact sizing by default.
 *
 * Components with size prop default to size="sm":
 * - Anchor, Burger, Pagination, Stepper
 *
 * CSS variables are applied via `vars` functions to override Mantine's defaults:
 * - Pagination: --pagination-control-size: 24px, --pagination-control-fz: 11px
 * - Stepper: --stepper-icon-size: 24px, --stepper-fz: 11px
 * - Burger: --burger-size: 18px
 *
 * Static styles are applied for components that don't have a size prop:
 * - Tabs: tab fontSize 11px, padding "6px 10px"
 * - NavLink: label fontSize 11px, minHeight 28px
 * - Anchor: fontSize 11px (in addition to size="sm")
 */
export const navigationComponentExtensions = {
    Anchor: Anchor.extend({
        defaultProps: {
            size: "sm",
        },
        styles: compactAnchorStyles,
    }),

    Burger: Burger.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactBurgerVars,
        }),
    }),

    NavLink: NavLink.extend({
        // NavLink does not have a size prop, only styles for compact appearance
        styles: compactNavLinkStyles,
    }),

    Pagination: Pagination.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactPaginationVars,
        }),
    }),

    Stepper: Stepper.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactStepperVars,
        }),
    }),

    Tabs: Tabs.extend({
        // Tabs does not have a size prop, only styles for compact appearance
        styles: compactTabsStyles,
    }),
};
