import { rem } from "@mantine/core";

/**
 * Mantine spacing values for consistent component spacing.
 */
export const MANTINE_SPACING = {
    xs: rem(4),
    sm: rem(8),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
};

/**
 * Compact theme sizing constants.
 * These values represent the standard sizing used throughout the compact theme
 * for consistent component dimensions. Use these when creating custom components
 * that need to match the compact theme's sizing.
 * @example
 * ```tsx
 * import { COMPACT_SIZING } from '@graphty/compact-mantine';
 *
 * const MyComponent = () => (
 *   <div style={{ height: COMPACT_SIZING.HEIGHT, fontSize: COMPACT_SIZING.FONT_SIZE }}>
 *     Custom compact component
 *   </div>
 * );
 * ```
 */
export const COMPACT_SIZING = {
    /** Standard compact component height (inputs, buttons, icons) in pixels */
    HEIGHT: 24,
    /** Standard compact font size in pixels */
    FONT_SIZE: 11,
    /** Standard padding for control elements in pixels */
    CONTROL_PADDING: 8,
    /** Gap between items in sections/lists in pixels */
    SECTION_GAP: 4,
} as const;
