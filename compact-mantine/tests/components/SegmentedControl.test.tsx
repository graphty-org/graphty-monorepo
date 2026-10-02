import { Input, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";
import { SegmentedControl } from "../../src/components/SegmentedControl";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderInTheme(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

describe("SegmentedControl", () => {
    it("takes its name and description from the Input.Wrapper around it", () => {
        renderInTheme(
            <Input.Wrapper label="Mode" description="How the graph is drawn">
                <SegmentedControl data={["a", "b"]} />
            </Input.Wrapper>,
        );

        expect(
            screen.getByRole("radiogroup", { name: "Mode", description: "How the graph is drawn" }),
        ).toBeInTheDocument();
    });

    it("lets the caller's own aria attributes win", () => {
        renderInTheme(
            <>
                <span id="own-name">Own name</span>
                <Input.Wrapper label="Mode">
                    <SegmentedControl data={["a", "b"]} aria-labelledby="own-name" />
                </Input.Wrapper>
            </>,
        );

        expect(screen.getByRole("radiogroup", { name: "Own name" })).toBeInTheDocument();
    });

    it("renders without a wrapper", () => {
        renderInTheme(<SegmentedControl data={["a", "b"]} aria-label="Bare" />);

        expect(screen.getByRole("radiogroup", { name: "Bare" })).toBeInTheDocument();
        expect(screen.getAllByRole("radio")).toHaveLength(2);
    });
});
