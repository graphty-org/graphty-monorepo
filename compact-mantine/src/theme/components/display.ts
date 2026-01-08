import { Avatar, Badge, Indicator, Kbd, Pill, Text, ThemeIcon } from "@mantine/core";

/**
 * Theme extensions for display components with "compact" size support.
 */
export const displayComponentExtensions = {
    Text: Text.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--text-fz": "11px",
                        "--text-lh": "1.2",
                    },
                };
            }
            return { root: {} };
        },
    }),

    Badge: Badge.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--badge-height": "14px",
                        "--badge-fz": "9px",
                        "--badge-padding-x": "4px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    Pill: Pill.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--pill-height": "16px",
                        "--pill-fz": "10px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    Avatar: Avatar.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--avatar-size": "24px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    ThemeIcon: ThemeIcon.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--ti-size": "24px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    Indicator: Indicator.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--indicator-size": "8px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    Kbd: Kbd.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--kbd-fz": "10px",
                        "--kbd-padding": "2px 4px",
                    },
                };
            }
            return { root: {} };
        },
    }),
};
