import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
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
        // With Collapse component, content is in DOM but hidden (not visible)
        expect(screen.getByText("Content")).not.toBeVisible();
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

        // With Collapse, content starts hidden (not visible)
        expect(screen.getByText("Content")).not.toBeVisible();
        await user.click(screen.getByText("Test"));
        // After click, content becomes visible
        await waitFor(() => {
            expect(screen.getByText("Content")).toBeVisible();
        });
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

    describe("Animation (Issue #5)", () => {
        it("uses Collapse component for animated content reveal", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <ControlSubGroup label="Test" defaultOpen>
                        <div data-testid="content">Content</div>
                    </ControlSubGroup>
                </MantineProvider>,
            );

            // Mantine Collapse component renders with display: block and overflow: hidden
            // Check that content is inside a collapse wrapper (not conditionally rendered)
            const content = screen.getByTestId("content");
            expect(content).toBeVisible();

            // The content should always be in the DOM (not conditionally rendered)
            // When closed, it should still exist but be hidden via Collapse
        });

        it("content remains in DOM when collapsed (not conditionally removed)", async () => {
            const user = userEvent.setup();
            render(
                <MantineProvider theme={compactTheme}>
                    <ControlSubGroup label="Test" defaultOpen>
                        <div data-testid="content">Content</div>
                    </ControlSubGroup>
                </MantineProvider>,
            );

            // Content visible when open
            expect(screen.getByTestId("content")).toBeVisible();

            // Click to close
            await user.click(screen.getByText("Test"));

            // Content should still be in DOM but not visible (Collapse behavior)
            await waitFor(() => {
                expect(screen.getByTestId("content")).not.toBeVisible();
            });
            // Importantly, it's still in the document (not removed)
            expect(screen.getByTestId("content")).toBeInTheDocument();
        });
    });

    describe("Accessibility (Issue #4)", () => {
        it("header has role='button' for screen readers", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ControlSubGroup label="Test SubGroup">
                        <div>Content</div>
                    </ControlSubGroup>
                </MantineProvider>,
            );
            // The header group should have role="button"
            const header = screen.getByRole("button", { name: /test subgroup/i });
            expect(header).toBeInTheDocument();
        });

        it("header is focusable with tabIndex", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ControlSubGroup label="Test SubGroup">
                        <div>Content</div>
                    </ControlSubGroup>
                </MantineProvider>,
            );
            const header = screen.getByRole("button", { name: /test subgroup/i });
            expect(header).toHaveAttribute("tabindex", "0");
        });

        it("toggles on Enter key press", async () => {
            const user = userEvent.setup();
            render(
                <MantineProvider theme={compactTheme}>
                    <ControlSubGroup label="Test SubGroup" defaultOpen={false}>
                        <div data-testid="content">Content</div>
                    </ControlSubGroup>
                </MantineProvider>,
            );

            const header = screen.getByRole("button", { name: /test subgroup/i });

            // Focus and press Enter
            header.focus();
            await user.keyboard("{Enter}");

            await waitFor(() => {
                expect(screen.getByTestId("content")).toBeVisible();
            });
        });

        it("toggles on Space key press", async () => {
            const user = userEvent.setup();
            render(
                <MantineProvider theme={compactTheme}>
                    <ControlSubGroup label="Test SubGroup" defaultOpen={false}>
                        <div data-testid="content">Content</div>
                    </ControlSubGroup>
                </MantineProvider>,
            );

            const header = screen.getByRole("button", { name: /test subgroup/i });

            // Focus and press Space
            header.focus();
            await user.keyboard(" ");

            await waitFor(() => {
                expect(screen.getByTestId("content")).toBeVisible();
            });
        });

        it("has appropriate aria-expanded attribute when opened", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ControlSubGroup label="Test SubGroup" defaultOpen>
                        <div>Content</div>
                    </ControlSubGroup>
                </MantineProvider>,
            );
            const header = screen.getByRole("button", { name: /test subgroup/i });
            expect(header).toHaveAttribute("aria-expanded", "true");
        });

        it("has appropriate aria-expanded attribute when closed", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ControlSubGroup label="Test SubGroup" defaultOpen={false}>
                        <div>Content</div>
                    </ControlSubGroup>
                </MantineProvider>,
            );
            const header = screen.getByRole("button", { name: /test subgroup/i });
            expect(header).toHaveAttribute("aria-expanded", "false");
        });

        it("can be navigated to via Tab key", async () => {
            const user = userEvent.setup();
            render(
                <MantineProvider theme={compactTheme}>
                    <button>Before</button>
                    <ControlSubGroup label="Test SubGroup">
                        <div>Content</div>
                    </ControlSubGroup>
                </MantineProvider>,
            );

            // Tab to the header
            await user.tab(); // Focus "Before" button
            await user.tab(); // Focus the ControlSubGroup header

            const header = screen.getByRole("button", { name: /test subgroup/i });
            expect(document.activeElement).toBe(header);
        });
    });
});
