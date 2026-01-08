import { Anchor, Burger, NavLink, Pagination, Stepper, Tabs } from "@mantine/core";

/**
 * Theme extensions for navigation components with "compact" size support.
 */
export const navigationComponentExtensions = {
    Anchor: Anchor.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--anchor-fz": "11px",
                    },
                };
            }
            return { root: {} };
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

    NavLink: NavLink.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--nl-fz": "11px",
                        "--nl-height": "28px",
                    },
                };
            }
            return { root: {} };
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

    Tabs: Tabs.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--tabs-tab-fz": "11px",
                        "--tabs-tab-padding": "6px 10px",
                    },
                };
            }
            return { root: {} };
        },
    }),
};
