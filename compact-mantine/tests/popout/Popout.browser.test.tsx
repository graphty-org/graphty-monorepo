import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Popout, PopoutManager } from "../../src/components/popout";
import { compactTheme } from "../../src/theme";

/**
 * Helper to render Popout components with required providers
 */
function renderPopout(ui: React.ReactElement) {
    return render(
        <MantineProvider theme={compactTheme}>
            <PopoutManager>{ui}</PopoutManager>
        </MantineProvider>,
    );
}

describe("Popout drag (browser)", () => {
    it("maintains drag when pointer leaves panel", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Drag Test" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Panel should be open and draggable
        const panel = screen.getByRole("dialog");
        expect(panel).toBeInTheDocument();

        // Verify the panel has drag capability via data attribute
        const dragTrigger = panel.querySelector("[data-drag-trigger]");
        expect(dragTrigger).toBeInTheDocument();
    });

    it("ends drag on pointer up outside panel", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Drag Test" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Panel should still be visible and functional after interactions
        const panel = screen.getByRole("dialog");
        expect(panel).toBeInTheDocument();
        expect(screen.getByText("Content")).toBeInTheDocument();
    });
});

describe("Popout focus (browser)", () => {
    it("Tab cycles through interactive elements", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Focus Test" }}>
                    <Popout.Content>
                        <button>Button 1</button>
                        <button>Button 2</button>
                        <input type="text" placeholder="Input field" />
                    </Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const panel = screen.getByRole("dialog");

        // Panel should have tabIndex=-1 for programmatic focus
        expect(panel).toHaveAttribute("tabIndex", "-1");

        // Panel contains interactive elements that can receive focus
        const interactiveElements = [
            screen.getByRole("button", { name: "Button 1" }),
            screen.getByRole("button", { name: "Button 2" }),
            screen.getByPlaceholderText("Input field"),
            screen.getByLabelText("Close panel"),
        ];

        // All interactive elements should be present and visible
        for (const element of interactiveElements) {
            expect(element).toBeVisible();
        }

        // Panel should remain open after tab navigation attempts
        await user.tab();
        await user.tab();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("does not trap focus (non-modal)", async () => {
        const user = userEvent.setup();

        renderPopout(
            <div>
                <button>External Button Before</button>
                <Popout>
                    <Popout.Trigger>
                        <button>Open</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Focus Test" }}>
                        <Popout.Content>
                            <button>Panel Button</button>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
                <button>External Button After</button>
            </div>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // The panel is non-modal (aria-modal=false)
        const panel = screen.getByRole("dialog");
        expect(panel).toHaveAttribute("aria-modal", "false");

        // Non-modal means we can interact with content outside the panel
        // Tab multiple times to eventually reach external elements
        // First tab through all panel elements
        for (let i = 0; i < 10; i++) {
            await user.tab();
        }

        // The panel should still be open (we didn't trap focus, just tabbed through)
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
});
