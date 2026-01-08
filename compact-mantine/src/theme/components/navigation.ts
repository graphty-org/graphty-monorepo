import { Anchor, Burger, NavLink, Pagination, Stepper, Tabs } from "@mantine/core";

/**
 * Theme extensions for navigation components with "compact" size support.
 *
 * Note: NavLink and Tabs do not have a `size` prop, so we use styles with
 * custom data attributes instead of vars. Components should use data-compact
 * attribute to trigger compact styles: <NavLink data-compact />
 */
export const navigationComponentExtensions = {
    // Anchor uses --text-fz since it inherits from Text component
    Anchor: Anchor.extend({
        styles: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        fontSize: 11,
                    },
                };
            }
            return {};
        },
    }),

    Burger: Burger.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--burger-size": "18px",
                        "--burger-line-size": "2px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    // NavLink uses styles since it doesn't have a size prop and requires
    // a 'children' CSS variable. Apply styles based on custom variant prop.
    NavLink: NavLink.extend({
        styles: (_theme, props) => {
            // Check for compact variant
            if ((props.variant as string) === "compact") {
                return {
                    root: {
                        fontSize: 11,
                        minHeight: 28,
                    },
                    label: {
                        fontSize: 11,
                    },
                };
            }
            return {};
        },
    }),

    Pagination: Pagination.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--pagination-control-size": "24px",
                        "--pagination-control-fz": "11px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    Stepper: Stepper.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--stepper-icon-size": "24px",
                        "--stepper-fz": "11px",
                        "--stepper-spacing": "8px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    // Tabs uses styles since it doesn't have a size prop and the CSS vars
    // for tabs are limited to --tabs-color and --tabs-radius.
    // Apply styles based on custom variant prop.
    Tabs: Tabs.extend({
        styles: (_theme, props) => {
            // Check for compact variant
            if ((props.variant as string) === "compact") {
                return {
                    tab: {
                        fontSize: 11,
                        padding: "6px 10px",
                    },
                };
            }
            return {};
        },
    }),
};
