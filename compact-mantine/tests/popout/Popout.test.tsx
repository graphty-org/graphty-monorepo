import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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

describe("Popout", () => {
    it("renders trigger element", () => {
        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Test" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    });

    it("opens panel when trigger is clicked", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Test Panel" }}>
                    <Popout.Content>Panel content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        // Panel should not be visible initially
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        // Click the trigger
        await user.click(screen.getByRole("button", { name: "Open" }));

        // Panel should now be visible
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
        expect(screen.getByText("Panel content")).toBeInTheDocument();
    });

    it("closes panel when close button is clicked", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Test Panel" }}>
                    <Popout.Content>Panel content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        // Open the panel
        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Click the close button
        await user.click(screen.getByLabelText("Close panel"));

        // Panel should be closed
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });

    it("renders with specified width", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={320} header={{ variant: "title", title: "Wide Panel" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));

        await waitFor(() => {
            const panel = screen.getByRole("dialog");
            // Uses minWidth for flexible sizing - panel can expand for wider content
            expect(panel).toHaveStyle({ minWidth: "320px" });
        });
    });

    it("displays header title", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Settings" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));

        await waitFor(() => {
            expect(screen.getByText("Settings")).toBeInTheDocument();
        });
    });

    it("toggles panel on repeated trigger clicks", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Toggle</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Toggle Panel" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        const trigger = screen.getByRole("button", { name: "Toggle" });

        // Open
        await user.click(trigger);
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Close by clicking trigger again
        await user.click(trigger);
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        // Open again
        await user.click(trigger);
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
    });
});

describe("Popout accessibility", () => {
    it("panel has role=dialog and aria-modal=false", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Accessible Panel" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));

        await waitFor(() => {
            const panel = screen.getByRole("dialog");
            expect(panel).toBeInTheDocument();
            expect(panel).toHaveAttribute("aria-modal", "false");
        });
    });

    it("trigger has aria-expanded and aria-controls", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Test" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        const trigger = screen.getByRole("button", { name: "Open" });

        // Before opening - aria-expanded should be false
        expect(trigger).toHaveAttribute("aria-expanded", "false");
        expect(trigger).toHaveAttribute("aria-controls");

        // After opening - aria-expanded should be true
        await user.click(trigger);

        await waitFor(() => {
            expect(trigger).toHaveAttribute("aria-expanded", "true");
        });

        // The aria-controls should match the panel's id
        const panelId = trigger.getAttribute("aria-controls");
        const panel = screen.getByRole("dialog");
        expect(panel).toHaveAttribute("id", panelId);
    });

    it("close button has aria-label", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Test" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Close button should have aria-label
        const closeButton = screen.getByLabelText("Close panel");
        expect(closeButton).toBeInTheDocument();
    });

    it("panel has tabIndex for focus management", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Focus Test" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));

        // Wait for the panel to be visible
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Panel should have tabIndex=-1 to allow programmatic focus
        const panel = screen.getByRole("dialog");
        expect(panel).toHaveAttribute("tabIndex", "-1");
    });

    it("focus returns to trigger on close", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Focus Test" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        const trigger = screen.getByRole("button", { name: "Open" });
        await user.click(trigger);

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Close the panel
        await user.click(screen.getByLabelText("Close panel"));

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        // Focus should return to the trigger
        expect(document.activeElement).toBe(trigger);
    });

    it("panel has aria-labelledby pointing to header title", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "My Settings" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));

        await waitFor(() => {
            const panel = screen.getByRole("dialog");
            expect(panel).toHaveAttribute("aria-labelledby");
            const labelId = panel.getAttribute("aria-labelledby");
            const titleElement = document.getElementById(labelId!);
            expect(titleElement).toBeInTheDocument();
            expect(titleElement?.textContent).toBe("My Settings");
        });
    });
});

describe("Popout drag behavior", () => {
    it("does not start drag from text input", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Test" }}>
                    <Popout.Content>
                        <input type="text" data-testid="text-input" placeholder="Type here" />
                    </Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const input = screen.getByTestId("text-input");
        // User should be able to interact with the input without triggering drag
        await user.click(input);
        await user.type(input, "Hello");

        expect(input).toHaveValue("Hello");
    });

    it("does not start drag from textarea", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Test" }}>
                    <Popout.Content>
                        <textarea data-testid="textarea" placeholder="Type here" />
                    </Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const textarea = screen.getByTestId("textarea");
        await user.click(textarea);
        await user.type(textarea, "Hello World");

        expect(textarea).toHaveValue("Hello World");
    });

    it("allows button clicks without dragging", async () => {
        const user = userEvent.setup();
        const handleClick = vi.fn();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Test" }}>
                    <Popout.Content>
                        <button onClick={handleClick}>Click Me</button>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Click Me" }));

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("renders panel with drag handle area in header", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Draggable" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // The header area should be marked as a drag trigger
        const panel = screen.getByRole("dialog");
        const header = panel.querySelector("[data-drag-trigger]");
        expect(header).toBeInTheDocument();
    });

    it("resets position when panel reopens", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Reset Test" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        // Open panel
        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const panel = screen.getByRole("dialog");
        const initialLeft = panel.style.left;
        const initialTop = panel.style.top;

        // Close panel
        await user.click(screen.getByLabelText("Close panel"));
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        // Reopen panel
        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Position should be reset (same as initial)
        const reopenedPanel = screen.getByRole("dialog");
        expect(reopenedPanel.style.left).toBe(initialLeft);
        expect(reopenedPanel.style.top).toBe(initialTop);
    });
});

describe("Popout panel sizing", () => {
    it("uses minWidth for flexible sizing - panel can expand for wider content", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                    <Popout.Content>
                        {/* Content wider than specified width */}
                        <div style={{ width: 300 }}>Wide content</div>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const panel = screen.getByRole("dialog");
        // Panel uses minWidth, allowing it to expand for wider content
        expect(panel.style.minWidth).toBe("200px");
        // Panel should NOT have a fixed width that would constrain content
        expect(panel.style.width).toBe("");
    });

    it("panel expands to fit content wider than minWidth without overflow", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={100} header={{ variant: "title", title: "Test" }}>
                    <Popout.Content>
                        <div style={{ width: 250, height: 50 }} data-testid="wide-content">
                            Wide content that exceeds minWidth
                        </div>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        const panel = screen.getByRole("dialog");
        // Panel should not have horizontal overflow
        expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth);
    });
});
