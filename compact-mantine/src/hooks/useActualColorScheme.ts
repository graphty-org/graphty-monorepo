import { useComputedColorScheme } from "@mantine/core";

/**
 * Hook to get the actual resolved color scheme.
 * Resolves "auto" to the actual light/dark value based on system preference.
 * @returns "light" | "dark"
 */
export function useActualColorScheme(): "light" | "dark" {
    return useComputedColorScheme("dark");
}
