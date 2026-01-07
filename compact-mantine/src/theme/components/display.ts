import { Badge, Pill } from "@mantine/core";

/**
 * Theme extensions for display components with "compact" size support.
 */
export const displayComponentExtensions = {
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
};
