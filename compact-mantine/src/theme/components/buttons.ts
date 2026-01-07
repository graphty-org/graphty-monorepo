import { ActionIcon, Button, CloseButton } from "@mantine/core";

/**
 * Theme extensions for button components with "compact" size support.
 */
export const buttonComponentExtensions = {
    Button: Button.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--button-height": "24px",
                        "--button-fz": "11px",
                        "--button-padding-x": "8px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    ActionIcon: ActionIcon.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--ai-size": "24px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    CloseButton: CloseButton.extend({
        defaultProps: {
            size: "compact",
        },
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--cb-size": "16px",
                        "--cb-icon-size": "12px",
                    },
                };
            }
            return { root: {} };
        },
    }),
};
