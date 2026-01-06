import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { compactTheme, ControlSection } from "../../src";

describe("ControlSection", () => {
    it("renders label", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSection label="Test Section">
                    <div>Content</div>
                </ControlSection>
            </MantineProvider>,
        );
        expect(screen.getByText("Test Section")).toBeInTheDocument();
    });

    it("shows content when defaultOpen is true", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSection label="Test" defaultOpen>
                    <div>Content</div>
                </ControlSection>
            </MantineProvider>,
        );
        expect(screen.getByText("Content")).toBeVisible();
    });

    it("hides content when defaultOpen is false", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSection label="Test" defaultOpen={false}>
                    <div>Content</div>
                </ControlSection>
            </MantineProvider>,
        );
        expect(screen.getByText("Content")).not.toBeVisible();
    });

    it("toggles on click", async () => {
        const user = userEvent.setup();
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSection label="Test" defaultOpen>
                    <div>Content</div>
                </ControlSection>
            </MantineProvider>,
        );

        expect(screen.getByText("Content")).toBeVisible();
        await user.click(screen.getByText("Test"));
        expect(screen.getByText("Content")).not.toBeVisible();
    });

    it("shows configured indicator when hasConfiguredValues is true", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSection label="Test Section" hasConfiguredValues>
                    <div>Content</div>
                </ControlSection>
            </MantineProvider>,
        );
        expect(screen.getByLabelText("Test Section has configured values")).toBeInTheDocument();
    });

    it("does not show configured indicator when hasConfiguredValues is false", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSection label="Test Section" hasConfiguredValues={false}>
                    <div>Content</div>
                </ControlSection>
            </MantineProvider>,
        );
        expect(screen.queryByLabelText("Test Section has configured values")).not.toBeInTheDocument();
    });

    it("has correct aria-label for collapse button when open", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSection label="Test Section" defaultOpen>
                    <div>Content</div>
                </ControlSection>
            </MantineProvider>,
        );
        expect(screen.getByRole("button", { name: "Collapse Test Section" })).toBeInTheDocument();
    });

    it("has correct aria-label for expand button when closed", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSection label="Test Section" defaultOpen={false}>
                    <div>Content</div>
                </ControlSection>
            </MantineProvider>,
        );
        expect(screen.getByRole("button", { name: "Expand Test Section" })).toBeInTheDocument();
    });
});
