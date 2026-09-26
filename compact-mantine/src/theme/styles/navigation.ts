/**
 * Per-size CSS variables and class names for the navigation
 * components (Anchor, Burger, NavLink, Pagination, Stepper, Tabs), measured from the Figma editor
 * where it has them (design/figma-spec.md 4.2, 5.1, 5.9).
 *
 * Every color, state and focus ring lives in ../css/selection.css.ts, keyed on the `cm-*`
 * classes below. Each `*Scale` is a CompactSizeScale (see ./size-scale.ts): one variable set per
 * Mantine size token, with the sm entry the compact default:
 * - Pagination: 24 controls at 11px (the ghost 24 button of 4.3)
 * - Stepper: 24 icon at 11px
 * - Burger: 18 box, 1.5px lines
 */

import type { CompactSizeScale } from "./size-scale";

/**
 * Per-size CSS variables for the Pagination. A control is a ghost button, so its ramp follows
 * the button's (20 / 24 / 30 / 36 / 44).
 */
export const compactPaginationScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--pagination-control-size": "20px", "--pagination-control-fz": "9px" },
        sm: { "--pagination-control-size": "24px", "--pagination-control-fz": "11px" },
        md: { "--pagination-control-size": "30px", "--pagination-control-fz": "13px" },
        lg: { "--pagination-control-size": "36px", "--pagination-control-fz": "15px" },
        xl: { "--pagination-control-size": "44px", "--pagination-control-fz": "17px" },
    },
};

/**
 * Per-size CSS variables for the Stepper.
 */
export const compactStepperScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--stepper-icon-size": "20px", "--stepper-fz": "9px", "--stepper-spacing": "4px" },
        sm: { "--stepper-icon-size": "24px", "--stepper-fz": "11px", "--stepper-spacing": "8px" },
        md: { "--stepper-icon-size": "30px", "--stepper-fz": "13px", "--stepper-spacing": "12px" },
        lg: { "--stepper-icon-size": "36px", "--stepper-fz": "15px", "--stepper-spacing": "16px" },
        xl: { "--stepper-icon-size": "44px", "--stepper-fz": "17px", "--stepper-spacing": "20px" },
    },
};

/**
 * Per-size CSS variables for the Burger: an 18 box with 1.5px lines at sm, Figma's glyph weight;
 * the line thickens only once the glyph has room for it.
 */
export const compactBurgerScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--burger-size": "14px", "--burger-line-size": "1.5px" },
        sm: { "--burger-size": "18px", "--burger-line-size": "1.5px" },
        md: { "--burger-size": "24px", "--burger-line-size": "2px" },
        lg: { "--burger-size": "30px", "--burger-line-size": "3px" },
        xl: { "--burger-size": "38px", "--burger-line-size": "4px" },
    },
};

/** The class names the stylesheet keys on, one set per component. */
export const ANCHOR_CLASSES = { root: "cm-anchor" } as const;

export const BURGER_CLASSES = { root: "cm-burger cm-focus-outside", burger: "cm-burger-lines" } as const;

export const NAVLINK_CLASSES = {
    root: "cm-navlink",
    label: "cm-navlink-label",
    description: "cm-navlink-description",
    section: "cm-navlink-section",
    body: "cm-navlink-body",
} as const;

export const PAGINATION_CLASSES = {
    root: "cm-pagination",
    control: "cm-pagination-control cm-focus-outside",
    dots: "cm-pagination-dots",
} as const;

export const STEPPER_CLASSES = {
    root: "cm-stepper",
    step: "cm-stepper-step",
    stepIcon: "cm-stepper-icon",
    stepLabel: "cm-stepper-label",
    stepDescription: "cm-stepper-description",
    separator: "cm-stepper-separator",
} as const;

export const TABS_CLASSES = {
    root: "cm-tabs",
    list: "cm-tabs-list",
    tab: "cm-tab",
    tabLabel: "cm-tab-label",
    tabSection: "cm-tab-section",
    panel: "cm-tabs-panel",
} as const;
