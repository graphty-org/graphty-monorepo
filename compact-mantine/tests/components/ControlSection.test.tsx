import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
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

    describe("Accessibility (Issue #4)", () => {
        it("header has role='button' for screen readers", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ControlSection label="Test Section">
                        <div>Content</div>
                    </ControlSection>
                </MantineProvider>,
            );
            // The header group should have role="button" (not just the ActionIcon)
            const header = screen.getByRole("button", { name: /test section/i });
            expect(header).toBeInTheDocument();
        });

        it("header is focusable with tabIndex", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ControlSection label="Test Section">
                        <div>Content</div>
                    </ControlSection>
                </MantineProvider>,
            );
            const header = screen.getByRole("button", { name: /test section/i });
            expect(header).toHaveAttribute("tabindex", "0");
        });

        it("toggles on Enter key press", async () => {
            const user = userEvent.setup();
            render(
                <MantineProvider theme={compactTheme}>
                    <ControlSection label="Test Section" defaultOpen>
                        <div>Content</div>
                    </ControlSection>
                </MantineProvider>,
            );

            const header = screen.getByRole("button", { name: /test section/i });
            expect(screen.getByText("Content")).toBeVisible();

            // Focus and press Enter
            header.focus();
            await user.keyboard("{Enter}");

            await waitFor(() => {
                expect(screen.getByText("Content")).not.toBeVisible();
            });
        });

        it("toggles on Space key press", async () => {
            const user = userEvent.setup();
            render(
                <MantineProvider theme={compactTheme}>
                    <ControlSection label="Test Section" defaultOpen>
                        <div>Content</div>
                    </ControlSection>
                </MantineProvider>,
            );

            const header = screen.getByRole("button", { name: /test section/i });
            expect(screen.getByText("Content")).toBeVisible();

            // Focus and press Space
            header.focus();
            await user.keyboard(" ");

            await waitFor(() => {
                expect(screen.getByText("Content")).not.toBeVisible();
            });
        });

        it("has appropriate aria-expanded attribute when opened", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ControlSection label="Test Section" defaultOpen>
                        <div>Content</div>
                    </ControlSection>
                </MantineProvider>,
            );
            const header = screen.getByRole("button", { name: /test section/i });
            expect(header).toHaveAttribute("aria-expanded", "true");
        });

        it("has appropriate aria-expanded attribute when closed", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <ControlSection label="Test Section" defaultOpen={false}>
                        <div>Content</div>
                    </ControlSection>
                </MantineProvider>,
            );
            const header = screen.getByRole("button", { name: /test section/i });
            expect(header).toHaveAttribute("aria-expanded", "false");
        });

        it("can be navigated to via Tab key", async () => {
            const user = userEvent.setup();
            render(
                <MantineProvider theme={compactTheme}>
                    <button>Before</button>
                    <ControlSection label="Test Section">
                        <div>Content</div>
                    </ControlSection>
                </MantineProvider>,
            );

            // Tab to the header
            await user.tab(); // Focus "Before" button
            await user.tab(); // Focus the ControlSection header

            const header = screen.getByRole("button", { name: /test section/i });
            expect(document.activeElement).toBe(header);
        });
    });
});
