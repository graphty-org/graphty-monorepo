import { useComputedColorScheme } from "@mantine/core";

/**
 * Hook to get the actual resolved color scheme.
 * Resolves "auto" to the actual light/dark value based on system preference.
 * @param fallback - Fallback color scheme when system preference cannot be determined.
 *                   Defaults to "dark" for consistency with existing behavior.
 * @returns "light" | "dark" - The resolved color scheme
 * @example
 * // Use default fallback (dark)
 * const scheme = useActualColorScheme();
 * @example
 * // Use custom fallback
 * const scheme = useActualColorScheme("light");
 */
export function useActualColorScheme(fallback: "light" | "dark" = "dark"): "light" | "dark" {
    return useComputedColorScheme(fallback);
}
