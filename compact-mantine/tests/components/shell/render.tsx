import { MantineProvider, type MantineThemeOverride } from "@mantine/core";
import { render } from "@testing-library/react";
import React from "react";

import { compactTheme } from "../../../src";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @param theme - The theme, when not the compact theme itself
 * @returns The testing-library render result
 */
export function renderShell(
    ui: React.ReactElement,
    theme: MantineThemeOverride = compactTheme,
): ReturnType<typeof render> {
    return render(<MantineProvider theme={theme}>{ui}</MantineProvider>);
}
