import { ActionIcon, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme, ControlGroup } from "../../src";

describe("ControlGroup", () => {
    it("renders label", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlGroup label="Test Group">
                    <div>Content</div>
                </ControlGroup>
            </MantineProvider>,
        );
        expect(screen.getByText("Test Group")).toBeInTheDocument();
    });

    it("renders children", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlGroup label="Test Group">
                    <div>Content</div>
                </ControlGroup>
            </MantineProvider>,
        );
        expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("renders actions when provided", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ControlGroup
                    label="Test Group"
                    actions={<ActionIcon aria-label="Test Action">+</ActionIcon>}
                >
                    <div>Content</div>
                </ControlGroup>
            </MantineProvider>,
        );
        expect(screen.getByRole("button", { name: "Test Action" })).toBeInTheDocument();
    });

    it("does not render actions area when not provided", () => {
        const { container } = render(
            <MantineProvider theme={compactTheme}>
                <ControlGroup label="Test Group">
                    <div>Content</div>
                </ControlGroup>
            </MantineProvider>,
        );
        // Should only have one group (the header), not two (header + actions)
        const groups = container.querySelectorAll("[class*='mantine-Group']");
        expect(groups.length).toBe(1);
    });
});
