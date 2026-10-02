import { Anchor, Burger, NavLink, Pagination, Stepper, Tabs } from "@mantine/core";

import { contrastVar } from "../contrast";
import {
    compactAnchorStyles,
    compactBurgerScale,
    compactNavLinkStyles,
    compactPaginationScale,
    compactStepperScale,
    compactTabsStyles,
} from "../styles/navigation";
import { compactVarsForSize } from "../styles/size-scale";

/**
 * Theme extensions for navigation components with compact sizing by default.
 *
 * Components with size prop default to size="sm":
 * - Anchor, Burger, Pagination, Stepper
 *
 * CSS variables are applied via `vars` functions to override Mantine's defaults.
 * At the sm default:
 * - Pagination: --pagination-control-size: 24px, --pagination-control-fz: 11px
 * - Stepper: --stepper-icon-size: 24px, --stepper-fz: 11px
 * - Burger: --burger-size: 18px
 *
 * Each resolver reads `props.size` and looks that size up in the component's
 * scale in ../styles/navigation.ts, so an explicitly sized control differs from
 * its neighbours instead of collapsing onto the compact value. Before
 * 2026-09-13 these resolvers took no arguments and returned one frozen object,
 * so xs through xl all rendered identically -- see ../styles/size-scale.ts for
 * the mechanism and the product owner's report.
 *
 * `props?.size` is read with optional chaining on purpose: the theme regression
 * suites invoke `extension.vars!()` with no arguments at all, and
 * compactVarsForSize maps an absent size onto the compact entry.
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
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactBurgerScale, props?.size),
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
        vars: (theme, props) => ({
            root: {
                ...compactVarsForSize(compactPaginationScale, props?.size),
                "--pagination-active-color": contrastVar(theme, props),
            },
        }),
    }),

    Stepper: Stepper.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (theme, props) => ({
            root: {
                ...compactVarsForSize(compactStepperScale, props?.size),
                "--stepper-icon-color": contrastVar(theme, props),
            },
        }),
    }),

    Tabs: Tabs.extend({
        // Tabs does not have a size prop, only styles for compact appearance
        styles: compactTabsStyles,
    }),
};
