import { useMantineTheme } from "@mantine/core";
import { useInsertionEffect } from "react";

import { ensureCompactStyles } from "./global-styles";

/**
 * Inject the package stylesheet before a component that draws with `cm-*` classes paints.
 *
 * The theme injects it when it is created and again from every themed Mantine component's `vars`
 * resolver, but the rows, the chrome, the tree and the DataTable draw on plain elements, so a
 * page made only of them (after a test removed the sheet, say) could otherwise have no CSS. The
 * call is idempotent, and it does nothing outside the compact theme (no `theme.other.compact`),
 * so it never flips another theme's contrast mode.
 */
export function useCompactStyles(): void {
    const options = useMantineTheme().other.compact;
    const inTheme = options !== undefined;
    const highContrast = options?.highContrast ?? false;
    useInsertionEffect(() => {
        if (inTheme) {
            ensureCompactStyles({ highContrast });
        }
    }, [inTheme, highContrast]);
}
