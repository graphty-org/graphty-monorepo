/**
 * Static visual styles and per-size CSS variables for compact-sized navigation
 * components.
 *
 * These are applied via the `vars` and `styles` props on the component
 * extensions in ../components/navigation.ts.
 *
 * Each `*Scale` is a CompactSizeScale: one variable set per Mantine size token,
 * with `compactSize` naming the entry that the extension's `defaultProps` size
 * resolves to. The sm entries hold the exact values this package shipped while
 * its resolvers ignored the size prop entirely, so the compact default is
 * unchanged and only the other tokens move. See ./size-scale.ts for why the
 * scale replaced a single frozen object (product owner, 2026-09-13: "sizes
 * aren't varying anymore").
 *
 * The compact (sm) baseline, unchanged:
 * - Pagination: --pagination-control-size: 24px, --pagination-control-fz: 11px
 * - Stepper: --stepper-icon-size: 24px, --stepper-fz: 11px, --stepper-spacing: 8px
 * - Burger: --burger-size: 18px, --burger-line-size: 2px
 * - Tabs: tab fontSize: 11px (via styles)
 * - NavLink: label fontSize: 11px (via styles)
 * - Anchor: fontSize: 11px (via styles)
 */

import type { CompactSizeScale } from "./size-scale";

/**
 * Per-size CSS variables for the compact Pagination.
 *
 * A pagination control is a button, so the control size and font follow
 * compactButtonScale's ramp (20/24/30/36/44 at 10/11/13/15/17px).
 */
export const compactPaginationScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--pagination-control-size": "20px", "--pagination-control-fz": "10px" },
        sm: { "--pagination-control-size": "24px", "--pagination-control-fz": "11px" },
        md: { "--pagination-control-size": "30px", "--pagination-control-fz": "13px" },
        lg: { "--pagination-control-size": "36px", "--pagination-control-fz": "15px" },
        xl: { "--pagination-control-size": "44px", "--pagination-control-fz": "17px" },
    },
};

/**
 * Per-size CSS variables for the compact Stepper.
 */
export const compactStepperScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--stepper-icon-size": "20px", "--stepper-fz": "10px", "--stepper-spacing": "6px" },
        sm: { "--stepper-icon-size": "24px", "--stepper-fz": "11px", "--stepper-spacing": "8px" },
        md: { "--stepper-icon-size": "30px", "--stepper-fz": "13px", "--stepper-spacing": "12px" },
        lg: { "--stepper-icon-size": "36px", "--stepper-fz": "15px", "--stepper-spacing": "16px" },
        xl: { "--stepper-icon-size": "44px", "--stepper-fz": "17px", "--stepper-spacing": "20px" },
    },
};

/**
 * Per-size CSS variables for the compact Burger.
 *
 * The line stays 2px through sm because a 1px rule is the first thing to
 * disappear against a panel ground; it thickens only once the glyph has the room
 * for it.
 */
export const compactBurgerScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--burger-size": "14px", "--burger-line-size": "2px" },
        sm: { "--burger-size": "18px", "--burger-line-size": "2px" },
        md: { "--burger-size": "24px", "--burger-line-size": "3px" },
        lg: { "--burger-size": "30px", "--burger-line-size": "3px" },
        xl: { "--burger-size": "38px", "--burger-line-size": "4px" },
    },
};

/**
 * Static styles for compact Anchor component.
 */
export const compactAnchorStyles = {
    root: {
        fontSize: 11,
    },
};

/**
 * Static styles for compact NavLink component.
 */
export const compactNavLinkStyles = {
    root: {
        fontSize: 11,
        minHeight: 28,
    },
    label: {
        fontSize: 11,
    },
};

/**
 * Static styles for compact Tabs component.
 */
export const compactTabsStyles = {
    tab: {
        fontSize: 11,
        padding: "6px 10px",
    },
};
