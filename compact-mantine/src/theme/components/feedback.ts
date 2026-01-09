import { Loader, Progress, RingProgress } from "@mantine/core";

import {
    compactLoaderVars,
    compactProgressStyles,
    compactProgressVars,
} from "../styles/feedback";

/**
 * Theme extensions for feedback components with compact sizing by default.
 *
 * All feedback components with a size prop default to size="sm" for a compact appearance.
 * CSS variables are applied via `vars` functions to override Mantine's defaults:
 * - Loader: --loader-size: 18px
 * - Progress: --progress-size: 4px
 * - RingProgress: Uses numeric size prop (recommended: size={48} for compact)
 */
export const feedbackComponentExtensions = {
    Loader: Loader.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactLoaderVars,
        }),
    }),

    Progress: Progress.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactProgressVars,
        }),
        styles: compactProgressStyles,
    }),

    // Note: RingProgress uses numeric size directly in SVG calculations,
    // so we can't use CSS variables or string size prop.
    // Use size={48} in components for compact-equivalent sizing.
    RingProgress: RingProgress.extend({
        // No defaultProps - RingProgress requires numeric size
        // Use size={48} in your components for compact sizing
    }),
};
