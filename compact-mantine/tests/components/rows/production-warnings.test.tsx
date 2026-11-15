import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { CompoundRow } from "../../../src/components/rows/CompoundRow";
import { ToggleRow, ToggleRowGroup } from "../../../src/components/rows/ToggleRow";

// These run in jsdom, not the browser project: they switch NODE_ENV at run time, and a browser
// build has `process.env.NODE_ENV` replaced with a constant before the test starts.

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRow(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

describe("CompoundRow", () => {
    describe("the development warnings", () => {
        it("says nothing in production, where the reader cannot act on it", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            const original = process.env.NODE_ENV;
            process.env.NODE_ENV = "production";

            try {
                renderRow(<CompoundRow label="Node opacity" segments={[{ value: "100", unit: "%" }]} />);
                expect(warn).not.toHaveBeenCalled();
            } finally {
                process.env.NODE_ENV = original;
                warn.mockRestore();
            }
        });
    });
});

describe("ToggleRowGroup", () => {
    it("stays quiet in a production build", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const previous = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";

        try {
            renderRow(
                <ToggleRowGroup>
                    <ToggleRow label="Minimap" />
                </ToggleRowGroup>,
            );

            expect(warn).not.toHaveBeenCalled();
        } finally {
            process.env.NODE_ENV = previous;
            warn.mockRestore();
        }
    });
});
