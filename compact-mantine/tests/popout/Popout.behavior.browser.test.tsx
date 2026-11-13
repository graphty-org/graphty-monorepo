import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { Popout, PopoutManager } from "../../src/components/popout";
import { compactTheme } from "../../src/theme";
import { drag, moveBy, press, release } from "../harness/mouse";

// A panel opens to the left of its trigger, so the triggers sit well in from the left edge of a
// window wide enough for that, the way a sidebar holds them; at the window's edge the panel is
// pushed back over its own trigger and a reader could not press it again.
beforeAll(async () => {
    await page.viewport(1024, 768);
});

/**
 * Helper to render Popout components with required providers
 */
function renderPopout(ui: React.ReactElement) {
    return render(
        <MantineProvider theme={compactTheme}>
            <PopoutManager>
                <div style={{ marginInlineStart: 600 }}>{ui}</div>
            </PopoutManager>
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

/**
 * Where the panel is: its left and top style, in pixels.
 * @param panel - the pop-out panel
 * @returns the panel's left and top
 */
function placeOf(panel: HTMLElement): { left: number; top: number } {
    return { left: parseFloat(panel.style.left), top: parseFloat(panel.style.top) };
}

describe("Popout drag behavior", () => {
    /**
     * Open a panel whose header holds an action button, and return it with its header.
     * @returns the open panel, its drag handle and the action's click handler
     */
    async function openDraggable(): Promise<{
        panel: HTMLElement;
        header: HTMLElement;
        onAction: ReturnType<typeof vi.fn>;
    }> {
        const user = userEvent.setup();
        const onAction = vi.fn();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel
                    width={280}
                    header={{ variant: "title", title: "Test" }}
                    actions={[{ id: "reset", icon: <span>R</span>, label: "Reset", onClick: onAction }]}
                >
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        const panel = await screen.findByRole("dialog");
        const header = panel.querySelector<HTMLElement>("[data-drag-trigger]");
        expect(header).not.toBeNull();
        return { panel, header: header!, onAction };
    }

    /**
     * Drag the bare header by an offset and wait until the panel lands there. Run after a press
     * that must not have moved the panel: if it had, the panel lands that much further on.
     * @param panel - the open panel
     * @param header - its drag handle
     * @param from - where the panel was before the press under test
     */
    async function expectHeaderDragFrom(
        panel: HTMLElement,
        header: HTMLElement,
        from: { left: number; top: number },
    ): Promise<void> {
        await drag(header, { x: 40, y: 8 }, { x: -50, y: 20 });
        await waitFor(() => {
            expect(placeOf(panel)).toEqual({ left: from.left - 50, top: from.top + 20 });
        });
    }

    it("moves when its header is dragged", async () => {
        const { panel, header } = await openDraggable();
        const opened = placeOf(panel);

        await expectHeaderDragFrom(panel, header, opened);
    });

    it("does not start a drag from a button in its header", async () => {
        const { panel, header, onAction } = await openDraggable();
        const opened = placeOf(panel);
        const action = screen.getByRole("button", { name: "Reset" });

        // Press on the button and move well past the drag threshold.
        await press(action);
        await moveBy(-60, 30);
        await release();

        await expectHeaderDragFrom(panel, header, opened);

        // And a press and release in place is the button's click.
        await press(action);
        await release();
        await waitFor(() => {
            expect(onAction).toHaveBeenCalledTimes(1);
        });
    });

    // The header draws only buttons, so a field is put into it by hand to reach the guard's
    // other branches.
    it.each(["input", "textarea", "select"] as const)(
        "does not start a drag from a <%s> in its header",
        async (tag) => {
            const { panel, header } = await openDraggable();
            const opened = placeOf(panel);
            const field = document.createElement(tag);
            field.style.width = "60px";
            header.prepend(field);

            await press(field);
            await moveBy(-60, 30);
            await release();
            // Out of the way of the bare header's drag.
            field.remove();

            await expectHeaderDragFrom(panel, header, opened);
        },
    );

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
        const panel = await screen.findByRole("dialog");
        const initial = placeOf(panel);

        // Drag it somewhere else
        await expectHeaderDragFrom(panel, panel.querySelector<HTMLElement>("[data-drag-trigger]")!, initial);

        // Close panel
        await user.click(screen.getByLabelText("Close panel"));
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        // Reopen panel
        await user.click(screen.getByRole("button", { name: "Open" }));
        const reopened = await screen.findByRole("dialog");

        // Position is reset to where it first opened, not where it was dragged
        expect(placeOf(reopened)).toEqual(initial);
    });
});
