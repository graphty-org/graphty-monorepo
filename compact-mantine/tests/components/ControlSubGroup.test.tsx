import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { compactTheme, ControlSubGroup } from "../../src";

describe("ControlSubGroup", () => {
    it("renders label", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSubGroup label="Test SubGroup">
                    <div>Content</div>
                </ControlSubGroup>
            </MantineProvider>,
        );
        expect(screen.getByText("Test SubGroup")).toBeInTheDocument();
    });

    it("hides content by default (defaultOpen=false)", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSubGroup label="Test">
                    <div>Content</div>
                </ControlSubGroup>
            </MantineProvider>,
        );
        expect(screen.queryByText("Content")).not.toBeInTheDocument();
    });

    it("shows content when defaultOpen is true", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSubGroup label="Test" defaultOpen>
                    <div>Content</div>
                </ControlSubGroup>
            </MantineProvider>,
        );
        expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("toggles on click", async () => {
        const user = userEvent.setup();
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSubGroup label="Test">
                    <div>Content</div>
                </ControlSubGroup>
            </MantineProvider>,
        );

        expect(screen.queryByText("Content")).not.toBeInTheDocument();
        await user.click(screen.getByText("Test"));
        expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("has correct aria-label for expand button when closed", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSubGroup label="Test SubGroup">
                    <div>Content</div>
                </ControlSubGroup>
            </MantineProvider>,
        );
        expect(screen.getByRole("button", { name: "Expand Test SubGroup" })).toBeInTheDocument();
    });

    it("has correct aria-label for collapse button when open", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlSubGroup label="Test SubGroup" defaultOpen>
                    <div>Content</div>
                </ControlSubGroup>
            </MantineProvider>,
        );
        expect(screen.getByRole("button", { name: "Collapse Test SubGroup" })).toBeInTheDocument();
    });
});
