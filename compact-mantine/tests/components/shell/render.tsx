import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import React from "react";

import { compactTheme } from "../../../src";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
export function renderShell(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}
