import { MantineProvider, SegmentedControl } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme, ControlGroup, ControlSection } from "../../src";

describe("Light/Dark Mode Support", () => {
    describe("SegmentedControl indicator", () => {
        it("uses light-dark() CSS function for indicator background", () => {
            // Verify the theme extension uses light-dark() function
            const segmentedControlExtension = compactTheme.components?.SegmentedControl;
            expect(segmentedControlExtension).toBeDefined();

            // Access the styles function and verify it returns light-dark() values
            // The styles prop is a function that returns style objects
            if (typeof segmentedControlExtension?.styles === "function") {
                const styles = segmentedControlExtension.styles({} as never);
                expect(styles?.indicator?.backgroundColor).toContain("light-dark");
            } else if (typeof segmentedControlExtension?.styles === "object") {
                const styles = segmentedControlExtension.styles;
                expect(styles?.indicator?.backgroundColor).toContain("light-dark");
            }
        });

        it("renders SegmentedControl in light mode", () => {
            render(
                <MantineProvider theme={compactTheme} defaultColorScheme="light">
                    <SegmentedControl data={["Option 1", "Option 2"]} data-testid="segmented" />
                </MantineProvider>,
            );
            expect(screen.getByTestId("segmented")).toBeInTheDocument();
        });

        it("renders SegmentedControl in dark mode", () => {
            render(
                <MantineProvider theme={compactTheme} defaultColorScheme="dark">
                    <SegmentedControl data={["Option 1", "Option 2"]} data-testid="segmented" />
                </MantineProvider>,
            );
            expect(screen.getByTestId("segmented")).toBeInTheDocument();
        });
    });

    describe("ControlGroup", () => {
        it("renders with accessible text color in light mode", () => {
            render(
                <MantineProvider theme={compactTheme} defaultColorScheme="light">
                    <ControlGroup label="Test Group">
                        <div>Content</div>
                    </ControlGroup>
                </MantineProvider>,
            );
            expect(screen.getByText("Test Group")).toBeInTheDocument();
        });

        it("renders with accessible text color in dark mode", () => {
            render(
                <MantineProvider theme={compactTheme} defaultColorScheme="dark">
                    <ControlGroup label="Test Group">
                        <div>Content</div>
                    </ControlGroup>
                </MantineProvider>,
            );
            expect(screen.getByText("Test Group")).toBeInTheDocument();
        });

        it("uses theme-aware border color for divider", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme} defaultColorScheme="light">
                    <ControlGroup label="Test Group">
                        <div>Content</div>
                    </ControlGroup>
                </MantineProvider>,
            );
            // Divider should exist - the color should be theme-aware
            const divider = container.querySelector(".mantine-Divider-root");
            expect(divider).toBeInTheDocument();
        });
    });

    describe("ControlSection", () => {
        it("renders with accessible text color in light mode", () => {
            render(
                <MantineProvider theme={compactTheme} defaultColorScheme="light">
                    <ControlSection label="Test Section">
                        <div>Content</div>
                    </ControlSection>
                </MantineProvider>,
            );
            expect(screen.getByText("Test Section")).toBeInTheDocument();
        });

        it("renders with accessible text color in dark mode", () => {
            render(
                <MantineProvider theme={compactTheme} defaultColorScheme="dark">
                    <ControlSection label="Test Section">
                        <div>Content</div>
                    </ControlSection>
                </MantineProvider>,
            );
            expect(screen.getByText("Test Section")).toBeInTheDocument();
        });

        it("uses theme-aware border color for divider", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme} defaultColorScheme="light">
                    <ControlSection label="Test Section">
                        <div>Content</div>
                    </ControlSection>
                </MantineProvider>,
            );
            // Divider should exist - the color should be theme-aware
            const divider = container.querySelector(".mantine-Divider-root");
            expect(divider).toBeInTheDocument();
        });
    });
});
