/**
 * Standard modal styles for consistent theming across all modals.
 * Uses semantic CSS variables that work in both light and dark modes.
 */
export const standardModalStyles = {
    header: {
        backgroundColor: "var(--mantine-color-body)",
        borderBottom: "1px solid var(--mantine-color-default-border)",
    },
    body: {
        backgroundColor: "var(--mantine-color-body)",
        padding: "var(--mantine-spacing-md)",
    },
    content: {
        backgroundColor: "var(--mantine-color-body)",
    },
    title: {
        fontWeight: 500,
    },
} as const;
