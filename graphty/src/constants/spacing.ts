/**
 * Spacing constants for sidebar controls.
 * Use these values consistently across all control components.
 */
export const CONTROL_SPACING = {
    gap: {
        xs: 4, // Between related items
        sm: 8, // Between control groups
        md: 12, // Between sections
    },
} as const;

/**
 * Mantine token equivalents for spacing.
 * Use these when passing to Mantine components as gap/spacing props.
 */
export const MANTINE_SPACING = {
    controlGap: "xs", // 4px
    groupGap: "sm", // 8px
    sectionGap: "md", // 12px
} as const;
