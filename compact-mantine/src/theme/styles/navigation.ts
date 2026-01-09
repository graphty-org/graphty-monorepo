/**
 * Static visual styles and CSS variables for compact-sized navigation components.
 *
 * These are applied via the `vars` and `styles` props on component extensions,
 * providing compact sizing with consistent dimensions.
 *
 * CSS Variables (from baseline):
 * - Pagination: --pagination-control-size: 24px, --pagination-control-fz: 11px
 * - Stepper: --stepper-icon-size: 24px, --stepper-fz: 11px
 * - Burger: --burger-size: 18px
 * - Tabs: tab fontSize: 11px, tab height: 22px (via styles)
 * - NavLink: label fontSize: 11px (via styles)
 * - Anchor: fontSize: 11px (via styles)
 */

/**
 * CSS variables for compact Pagination component.
 */
export const compactPaginationVars = {
    "--pagination-control-size": "24px",
    "--pagination-control-fz": "11px",
} as const;

/**
 * CSS variables for compact Stepper component.
 */
export const compactStepperVars = {
    "--stepper-icon-size": "24px",
    "--stepper-fz": "11px",
    "--stepper-spacing": "8px",
} as const;

/**
 * CSS variables for compact Burger component.
 */
export const compactBurgerVars = {
    "--burger-size": "18px",
    "--burger-line-size": "2px",
} as const;

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
