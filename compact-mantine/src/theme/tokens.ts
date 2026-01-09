/**
 * Compact token values for Mantine theme overrides.
 *
 * These values are smaller than Mantine's defaults to create a dense UI.
 * They are used as global theme token overrides so all components
 * automatically receive compact sizing without needing explicit props.
 */

/**
 * Compact font sizes - smaller than Mantine defaults.
 * sm (11px) is the primary compact size used as the default.
 */
export const compactFontSizes = {
    xs: "10px",
    sm: "11px", // Our compact default
    md: "13px",
    lg: "14px",
    xl: "16px",
};

/**
 * Compact spacing - tighter than Mantine defaults for dense layouts.
 */
export const compactSpacing = {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
};

/**
 * Compact radius - slightly smaller corner radii for compact components.
 */
export const compactRadius = {
    xs: "2px",
    sm: "4px",
    md: "6px",
    lg: "8px",
    xl: "12px",
};
