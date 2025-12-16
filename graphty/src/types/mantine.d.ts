import "@mantine/core";

declare module "@mantine/core" {
    // Extend MantineSizes to include "compact" for input-like components
    export interface MantineSizes {
        compact: string;
    }

    // Override Badge size prop to include "compact"
    export interface BadgeProps {
        size?: "xs" | "sm" | "md" | "lg" | "xl" | "compact";
    }

    // Override Pill size prop to include "compact"
    export interface PillProps {
        size?: "xs" | "sm" | "md" | "lg" | "xl" | "compact";
    }
}
