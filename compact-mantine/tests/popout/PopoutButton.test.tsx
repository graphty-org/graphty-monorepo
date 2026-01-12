import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "lucide-react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, Popout, PopoutButton, PopoutManager } from "../../src";

/**
 * Test wrapper that includes all required providers.
 */
function renderWithProviders(ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <MantineProvider theme={compactTheme}>
            <PopoutManager>{ui}</PopoutManager>
        </MantineProvider>,
    );
}

describe("PopoutButton", () => {
    describe("rendering", () => {
        it("renders with the provided icon", () => {
            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<Settings data-testid="icon" />} aria-label="Test" />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            expect(screen.getByRole("button", { name: "Test" })).toBeInTheDocument();
            expect(screen.getByTestId("icon")).toBeInTheDocument();
        });

        it("renders with default size xs", () => {
            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<Settings />} aria-label="Test" />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            const button = screen.getByRole("button", { name: "Test" });
            expect(button).toHaveAttribute("data-size", "xs");
        });

        it("renders with custom size", () => {
            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<Settings />} aria-label="Test" size="md" />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            const button = screen.getByRole("button", { name: "Test" });
            expect(button).toHaveAttribute("data-size", "md");
        });
    });

    describe("highlight state", () => {
        it("uses subtle variant when popout is closed", () => {
            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<Settings />} aria-label="Test" />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            const button = screen.getByRole("button", { name: "Test" });
            expect(button).toHaveAttribute("data-variant", "subtle");
        });

        it("uses light variant when popout is open", async () => {
            const user = userEvent.setup();

            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<Settings />} aria-label="Test" />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            const button = screen.getByRole("button", { name: "Test" });

            // Open popout
            await user.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute("data-variant", "light");
            });
        });

        it("returns to subtle variant when popout is closed via close button", async () => {
            const user = userEvent.setup();

            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<Settings />} aria-label="Test" />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            const button = screen.getByRole("button", { name: "Test" });

            // Open popout
            await user.click(button);
            await waitFor(() => {
                expect(button).toHaveAttribute("data-variant", "light");
            });

            // Close via close button
            await user.click(screen.getByLabelText("Close panel"));

            await waitFor(() => {
                expect(button).toHaveAttribute("data-variant", "subtle");
            });
        });

        it("returns to subtle variant when popout is closed via Escape", async () => {
            const user = userEvent.setup();

            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<Settings />} aria-label="Test" />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            const button = screen.getByRole("button", { name: "Test" });

            // Open popout
            await user.click(button);
            await waitFor(() => {
                expect(button).toHaveAttribute("data-variant", "light");
            });

            // Close via Escape
            await user.keyboard("{Escape}");

            await waitFor(() => {
                expect(button).toHaveAttribute("data-variant", "subtle");
            });
        });

        it("returns to subtle variant when popout is closed via toggle", async () => {
            const user = userEvent.setup();

            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<Settings />} aria-label="Test" />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            const button = screen.getByRole("button", { name: "Test" });

            // Open popout
            await user.click(button);
            await waitFor(() => {
                expect(button).toHaveAttribute("data-variant", "light");
            });

            // Close via clicking trigger again (toggle)
            await user.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute("data-variant", "subtle");
            });
        });
    });

    describe("ARIA attributes", () => {
        it("has aria-expanded=false when popout is closed", () => {
            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<Settings />} aria-label="Test" />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            const button = screen.getByRole("button", { name: "Test" });
            expect(button).toHaveAttribute("aria-expanded", "false");
        });

        it("has aria-expanded=true when popout is open", async () => {
            const user = userEvent.setup();

            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<Settings />} aria-label="Test" />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            const button = screen.getByRole("button", { name: "Test" });
            await user.click(button);

            await waitFor(() => {
                expect(button).toHaveAttribute("aria-expanded", "true");
            });
        });

        it("has aria-haspopup=dialog", () => {
            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<Settings />} aria-label="Test" />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            const button = screen.getByRole("button", { name: "Test" });
            expect(button).toHaveAttribute("aria-haspopup", "dialog");
        });

        it("has aria-controls pointing to panel id", async () => {
            const user = userEvent.setup();

            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<Settings />} aria-label="Test" />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            const button = screen.getByRole("button", { name: "Test" });
            await user.click(button);

            const panel = await screen.findByRole("dialog");
            expect(button).toHaveAttribute("aria-controls", panel.id);
        });
    });

    describe("multiple buttons", () => {
        it("only one button is highlighted at a time (exclusive siblings)", async () => {
            const user = userEvent.setup();

            renderWithProviders(
                <>
                    <Popout>
                        <Popout.Trigger>
                            <PopoutButton icon={<Settings />} aria-label="Button A" />
                        </Popout.Trigger>
                        <Popout.Panel width={200} header={{ variant: "title", title: "A" }}>
                            <Popout.Content>Content A</Popout.Content>
                        </Popout.Panel>
                    </Popout>
                    <Popout>
                        <Popout.Trigger>
                            <PopoutButton icon={<Settings />} aria-label="Button B" />
                        </Popout.Trigger>
                        <Popout.Panel width={200} header={{ variant: "title", title: "B" }}>
                            <Popout.Content>Content B</Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </>,
            );

            const buttonA = screen.getByRole("button", { name: "Button A" });
            const buttonB = screen.getByRole("button", { name: "Button B" });

            // Both start as subtle
            expect(buttonA).toHaveAttribute("data-variant", "subtle");
            expect(buttonB).toHaveAttribute("data-variant", "subtle");

            // Open A
            await user.click(buttonA);
            await waitFor(() => {
                expect(buttonA).toHaveAttribute("data-variant", "light");
            });
            expect(buttonB).toHaveAttribute("data-variant", "subtle");

            // Open B - should close A
            await user.click(buttonB);
            await waitFor(() => {
                expect(buttonB).toHaveAttribute("data-variant", "light");
            });
            await waitFor(() => {
                expect(buttonA).toHaveAttribute("data-variant", "subtle");
            });
        });
    });

    describe("event handling", () => {
        it("calls original onClick if provided", async () => {
            const user = userEvent.setup();
            const onClick = vi.fn();

            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<Settings />} aria-label="Test" onClick={onClick} />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            const button = screen.getByRole("button", { name: "Test" });
            await user.click(button);

            expect(onClick).toHaveBeenCalledTimes(1);
        });
    });

    describe("ref forwarding", () => {
        it("note: ref is managed by PopoutTrigger for positioning, not forwarded to consumer", () => {
            // PopoutTrigger uses cloneElement and sets its own ref (triggerRef) for positioning.
            // This means any ref passed to PopoutButton will be overwritten by PopoutTrigger.
            // This is expected behavior - the trigger needs to track its ref for panel positioning.
            const ref = React.createRef<HTMLButtonElement>();

            renderWithProviders(
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton ref={ref} icon={<Settings />} aria-label="Test" />
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>Content</Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // The ref is null because PopoutTrigger overwrites it with triggerRef
            // This is expected behavior - use PopoutTrigger's internal ref for positioning
            expect(ref.current).toBeNull();
            // But the button element is still rendered and accessible
            expect(screen.getByRole("button", { name: "Test" })).toBeInTheDocument();
        });
    });
});
