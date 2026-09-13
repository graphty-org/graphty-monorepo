import { Loader, Progress, RingProgress } from "@mantine/core";

import {
    compactLoaderScale,
    compactProgressScale,
    compactProgressStyles,
} from "../styles/feedback";
import { compactVarsForSize } from "../styles/size-scale";

/**
 * Theme extensions for feedback components with compact sizing by default.
 *
 * Loader and Progress default to size="sm", which both scales in
 * ../styles/feedback.ts answer with the compact values this package has always
 * shipped. Each `vars` resolver reads `props.size` and looks that size up in the
 * component's scale, so an explicitly sized loader or bar differs from its
 * neighbours instead of collapsing onto the compact value. Before 2026-09-13
 * these resolvers took no arguments and returned one frozen object, so xs
 * through xl all rendered identically -- see ../styles/size-scale.ts for the
 * mechanism and the product owner's report.
 *
 * `props?.size` is read with optional chaining on purpose: the theme regression
 * suites invoke `extension.vars!()` with no arguments at all, and
 * compactVarsForSize maps an absent size onto the compact entry.
 *
 * The compact (size="sm") values:
 * - Loader: --loader-size: 18px
 * - Progress: --progress-size: 4px
 * - RingProgress: uses a numeric size prop (recommended: size={48} for compact)
 */
export const feedbackComponentExtensions = {
    Loader: Loader.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactLoaderScale, props?.size),
        }),
    }),

    Progress: Progress.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactProgressScale, props?.size),
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
