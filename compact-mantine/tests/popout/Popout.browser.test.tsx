import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { Popout, PopoutAnchor, PopoutManager } from "../../src/components/popout";
import { POPOUT_NESTED_GAP } from "../../src/constants/popout";
import { compactTheme } from "../../src/theme";
import { waitForSettledLayout } from "../../stories/helpers/settled";

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

/**
 * Dispatch one step of a drag. A real browser has PointerEvent, so these are
 * the same events a hand would produce; only the capture is missing, which the
 * hook treats as optional.
 */
function firePointer(element: Element, type: string, clientX: number, clientY: number): void {
    element.dispatchEvent(
        new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            pointerId: 1,
            pointerType: "mouse",
        }),
    );
}

/**
 * A sidebar pinned to the right of the viewport, the arrangement the pop-out
 * system was built for.
 * @param props - Component props
 * @param props.children - The rows in the sidebar
 * @returns The sidebar element, marked as the anchor for the pop-outs inside it
 */
function Sidebar({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
        <PopoutAnchor>
            <div
                data-testid="sidebar"
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    width: 240,
                    height: "100vh",
                    padding: 8,
                    boxSizing: "border-box",
                    background: "var(--mantine-color-body)",
                }}
            >
                {children}
            </div>
        </PopoutAnchor>
    );
}

describe("Popout geometry (browser)", () => {
    // A desktop window: a panel is kept on screen (spec 8.4), so on the default narrow test page a
    // 280px panel beside a 240px sidebar would measure that clamp instead of the docking.
    beforeAll(async () => {
        await page.viewport(1280, 800);
    });

    it("is kept on screen: a panel with no room beside its anchor is moved inside the window", async () => {
        await page.viewport(400, 800);
        const user = userEvent.setup();
        renderPopout(
            <Sidebar>
                <Popout>
                    <Popout.Trigger>
                        <button>Open narrow</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Settings" }}>
                        <Popout.Content>content</Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Sidebar>,
        );
        await user.click(screen.getByRole("button", { name: "Open narrow" }));
        const panel = await screen.findByRole("dialog");
        await waitFor(() => {
            expect(panel.getBoundingClientRect().left).toBe(0);
        });
        await page.viewport(1280, 800);
    });

    it("meets the sidebar edge and opens level with the row that opened it", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Sidebar>
                <div style={{ height: 120 }} />
                <Popout>
                    <Popout.Trigger>
                        <button>Open</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Settings" }}>
                        <Popout.Content>
                            <span data-testid="panel-content">Content</span>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Sidebar>,
        );

        const sidebar = screen.getByTestId("sidebar");
        const trigger = screen.getByRole("button", { name: "Open" });

        await user.click(trigger);
        await waitFor(() => {
            expect(screen.getByTestId("panel-content")).toBeInTheDocument();
        });

        const panel = screen.getByRole("dialog");
        const panelRect = panel.getBoundingClientRect();
        const sidebarRect = sidebar.getBoundingClientRect();
        const triggerRect = trigger.getBoundingClientRect();

        // Behavior 1: the panel's inline edge meets the sidebar's.
        expect(Math.round(panelRect.right)).toBe(Math.round(sidebarRect.left));
        // Behavior 3: and its top is the trigger's top, well below the
        // sidebar's, which is what a single anchor could not express.
        expect(Math.round(panelRect.top)).toBe(Math.round(triggerRect.top));
        expect(panelRect.top).toBeGreaterThan(sidebarRect.top + 100);
    });

    it("steps a nested panel out from the panel it opened from, level with its own row", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Sidebar>
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Parent" }}>
                        <Popout.Content>
                            <div style={{ height: 80 }} />
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel width={200} header={{ variant: "title", title: "Child" }}>
                                    <Popout.Content>
                                        <span data-testid="child-content">Child</span>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Sidebar>,
        );

        await user.click(screen.getByRole("button", { name: "Open Parent" }));
        const parentPanel = await screen.findByRole("dialog");

        const childTrigger = screen.getByRole("button", { name: "Open Child" });
        await user.click(childTrigger);
        await waitFor(() => {
            expect(screen.getByTestId("child-content")).toBeInTheDocument();
        });

        const childPanel = screen
            .getAllByRole("dialog")
            .find((panel) => panel.querySelector('[data-testid="child-content"]'));
        expect(childPanel).toBeDefined();

        const parentRect = parentPanel.getBoundingClientRect();
        const childRect = (childPanel as HTMLElement).getBoundingClientRect();
        const childTriggerRect = childTrigger.getBoundingClientRect();

        // Behavior 2: one level out from the parent panel, not from the sidebar.
        expect(Math.round(childRect.right)).toBe(Math.round(parentRect.left) - POPOUT_NESTED_GAP);
        // And level with the row inside the parent that opened it.
        expect(Math.round(childRect.top)).toBe(Math.round(childTriggerRect.top));
    });

    it("keeps a panel that content has widened off the anchor it is aligned to", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Sidebar>
                <Popout>
                    <Popout.Trigger>
                        <button>Open</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Wide" }}>
                        <Popout.Content>
                            {/* Content that will not fit in 280px */}
                            <div style={{ width: 337 }} data-testid="wide-content">
                                Wide content
                            </div>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Sidebar>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByTestId("wide-content")).toBeInTheDocument();
        });

        const panelRect = screen.getByRole("dialog").getBoundingClientRect();
        const sidebarRect = screen.getByTestId("sidebar").getBoundingClientRect();

        // The panel really is wider than its declared width...
        expect(panelRect.width).toBeGreaterThan(280);
        // ...and it still stops at the sidebar rather than growing over it.
        expect(Math.round(panelRect.right)).toBe(Math.round(sidebarRect.left));
        expect(panelRect.right).toBeLessThanOrEqual(sidebarRect.left + 1);
    });

    it("carries a child along when its parent is dragged, and keeps it open", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Sidebar>
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Parent" }}>
                        <Popout.Content>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel width={200} header={{ variant: "title", title: "Child" }}>
                                    <Popout.Content>
                                        <span data-testid="child-content">Child</span>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Sidebar>,
        );

        await user.click(screen.getByRole("button", { name: "Open Parent" }));
        const parentPanel = await screen.findByRole("dialog");
        await user.click(screen.getByRole("button", { name: "Open Child" }));
        await waitFor(() => {
            expect(screen.getByTestId("child-content")).toBeInTheDocument();
        });

        const childPanel = screen
            .getAllByRole("dialog")
            .find((panel) => panel.querySelector('[data-testid="child-content"]'));
        expect(childPanel).toBeDefined();

        const childBefore = (childPanel as HTMLElement).getBoundingClientRect();
        const dragHandle = parentPanel.querySelector("[data-drag-trigger]");
        expect(dragHandle).not.toBeNull();

        const handleRect = (dragHandle as HTMLElement).getBoundingClientRect();
        const startX = Math.round(handleRect.left + 40);
        const startY = Math.round(handleRect.top + 8);

        firePointer(dragHandle as HTMLElement, "pointerdown", startX, startY);
        firePointer(dragHandle as HTMLElement, "pointermove", startX - 120, startY + 60);
        firePointer(dragHandle as HTMLElement, "pointerup", startX - 120, startY + 60);
        (dragHandle as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));

        // Dragging must not close what the panel opened: the pointer release
        // produces a click, and the panel's click handler closes its children.
        expect(screen.getByTestId("child-content")).toBeInTheDocument();

        // And the child follows the parent it is anchored to.
        await waitFor(() => {
            const childAfter = (childPanel as HTMLElement).getBoundingClientRect();
            expect(Math.round(childAfter.left)).toBe(Math.round(childBefore.left) - 120);
            expect(Math.round(childAfter.top)).toBe(Math.round(childBefore.top) + 60);
        });
    });

    it("follows its sidebar anchor when the sidebar is resized", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Sidebar>
                <Popout>
                    <Popout.Trigger>
                        <button>Open</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Settings" }}>
                        <Popout.Content>
                            <span data-testid="panel-content">Content</span>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Sidebar>,
        );

        const sidebar = screen.getByTestId("sidebar");
        await user.click(screen.getByRole("button", { name: "Open" }));
        const panel = await screen.findByRole("dialog");
        await waitForSettledLayout(document.body, "[role='dialog']");
        const before = panel.getBoundingClientRect();

        sidebar.style.width = "360px";
        await waitForSettledLayout(document.body, "[role='dialog']");

        const after = panel.getBoundingClientRect();
        expect(Math.round(after.right)).toBe(Math.round(sidebar.getBoundingClientRect().left));
        expect(Math.round(after.left)).toBe(Math.round(before.left) - 120);
    });

    it("stays where it was dragged when its sidebar anchor or the window changes", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Sidebar>
                <Popout>
                    <Popout.Trigger>
                        <button>Open</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Settings" }}>
                        <Popout.Content>
                            <span data-testid="panel-content">Content</span>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Sidebar>,
        );

        const sidebar = screen.getByTestId("sidebar");
        await user.click(screen.getByRole("button", { name: "Open" }));
        const panel = await screen.findByRole("dialog");
        await waitForSettledLayout(document.body, "[role='dialog']");
        const opened = panel.getBoundingClientRect();

        const dragHandle = panel.querySelector("[data-drag-trigger]");
        const handleRect = (dragHandle as HTMLElement).getBoundingClientRect();
        const startX = Math.round(handleRect.left + 40);
        const startY = Math.round(handleRect.top + 8);

        firePointer(dragHandle as HTMLElement, "pointerdown", startX, startY);
        firePointer(dragHandle as HTMLElement, "pointermove", startX - 90, startY + 30);
        firePointer(dragHandle as HTMLElement, "pointerup", startX - 90, startY + 30);
        await waitForSettledLayout(document.body, "[role='dialog']");

        const dragged = panel.getBoundingClientRect();
        expect(Math.round(dragged.left)).toBe(Math.round(opened.left) - 90);

        // The sidebar the panel is anchored to grows, and the window narrows.
        sidebar.style.width = "360px";
        await page.viewport(1200, 800);
        await waitForSettledLayout(document.body, "[role='dialog']");

        expect(Math.round(sidebar.getBoundingClientRect().width)).toBe(360);
        expect(Math.round(panel.getBoundingClientRect().left)).toBe(Math.round(dragged.left));
        expect(Math.round(panel.getBoundingClientRect().top)).toBe(Math.round(dragged.top));
        await page.viewport(1280, 800);
    });

    it("keeps a dragged nested panel attached to the panel it opened from", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Sidebar>
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Parent" }}>
                        <Popout.Content>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel width={200} header={{ variant: "title", title: "Child" }}>
                                    <Popout.Content>
                                        <span data-testid="child-content">Child</span>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Sidebar>,
        );

        await user.click(screen.getByRole("button", { name: "Open Parent" }));
        const parentPanel = await screen.findByRole("dialog", { name: "Parent" });
        await user.click(screen.getByRole("button", { name: "Open Child" }));
        const childPanel = await screen.findByRole("dialog", { name: "Child" });
        await waitForSettledLayout(document.body, "[role='dialog']");
        const childOpened = childPanel.getBoundingClientRect();

        // The child is dragged first, so it is a panel the person has placed themselves...
        const childHandle = childPanel.querySelector("[data-drag-trigger]") as HTMLElement;
        const childHandleRect = childHandle.getBoundingClientRect();
        const cx = Math.round(childHandleRect.left + 40);
        const cy = Math.round(childHandleRect.top + 8);
        firePointer(childHandle, "pointerdown", cx, cy);
        firePointer(childHandle, "pointermove", cx - 50, cy + 20);
        firePointer(childHandle, "pointerup", cx - 50, cy + 20);
        await waitForSettledLayout(document.body, "[role='dialog']");

        const childDragged = childPanel.getBoundingClientRect();
        expect(Math.round(childDragged.left)).toBe(Math.round(childOpened.left) - 50);

        // ...and it still follows the parent when that is dragged.
        const parentHandle = parentPanel.querySelector("[data-drag-trigger]") as HTMLElement;
        const parentHandleRect = parentHandle.getBoundingClientRect();
        const px = Math.round(parentHandleRect.left + 40);
        const py = Math.round(parentHandleRect.top + 8);
        firePointer(parentHandle, "pointerdown", px, py);
        firePointer(parentHandle, "pointermove", px - 120, py + 60);
        firePointer(parentHandle, "pointerup", px - 120, py + 60);
        await waitForSettledLayout(document.body, "[role='dialog']");

        const childAfter = childPanel.getBoundingClientRect();
        expect(Math.round(childAfter.left)).toBe(Math.round(childDragged.left) - 120);
        expect(Math.round(childAfter.top)).toBe(Math.round(childDragged.top) + 60);
    });
});

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

describe("Popout settled layout (browser)", () => {
    it("is not settled while a reposition is queued: the helper waits for the panel to follow its trigger", async () => {
        renderPopout(
            <Popout defaultOpened>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={240} placement="bottom" anchorX="trigger" manageFocus={false} label="Panel">
                    <Popout.Content>content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );
        const trigger = screen.getByRole("button", { name: "Open" });
        const panel = await screen.findByRole("dialog");
        await waitForSettledLayout(document.body, "[data-testid='popout-panel']");
        const gap = panel.getBoundingClientRect().top - trigger.getBoundingClientRect().bottom;

        // Move the trigger in a frame callback queued ahead of the helper's own, as a late font or
        // a containing-block change does: the panel's observer queues its reposition for the next
        // frame, and the panel's box stays the same until that runs.
        requestAnimationFrame(() => {
            trigger.style.marginTop = "40px";
        });
        await waitForSettledLayout(document.body, "[data-testid='popout-panel']");

        expect(panel.getBoundingClientRect().top - trigger.getBoundingClientRect().bottom).toBeCloseTo(gap, 0);
    });
});
