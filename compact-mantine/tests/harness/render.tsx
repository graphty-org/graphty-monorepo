/**
 * Plain testing-library renders inside the compact theme, for tests that need neither the
 * measuring harness's fonts and styles nor its color scheme (those use `renderThemed`).
 */
import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import type React from "react";

import { compactTheme } from "../../src";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
export function renderCompact(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render inside the compact theme with the text direction reversed, the way a consumer of an
 * Arabic or Hebrew interface consumes it.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
export function renderRtl(ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <MantineProvider theme={compactTheme}>{ui}</MantineProvider>
        </DirectionProvider>,
    );
}
