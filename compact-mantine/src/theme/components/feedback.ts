import { Loader, Progress, RingProgress } from "@mantine/core";

/**
 * Theme extensions for feedback components with "compact" size support.
 */
export const feedbackComponentExtensions = {
    Loader: Loader.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--loader-size": "18px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    Progress: Progress.extend({
        vars: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    root: {
                        "--progress-size": "4px",
                    },
                };
            }
            return { root: {} };
        },
        styles: (_theme, props) => {
            if ((props.size as string) === "compact") {
                return {
                    label: {
                        fontSize: 9,
                    },
                };
            }
            return {};
        },
    }),

    // Note: RingProgress uses numeric size directly in SVG calculations,
    // so we can't use CSS variables. Use size={48} for compact-equivalent sizing.
    RingProgress: RingProgress.extend({
        vars: () => {
            // RingProgress doesn't support string sizes - size must be a number
            // Use size={48} in your components for compact sizing
            return { root: {} };
        },
    }),
};
