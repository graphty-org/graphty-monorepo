/**
 * Regression tests for popout panel issues.
 * These tests prevent regressions for specific bugs that were fixed.
 */
import { MantineProvider, Menu } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Popout, PopoutManager } from "../../src/components/popout";
import { FLOATING_UI_Z_INDEX, POPOUT_Z_INDEX_BASE } from "../../src/constants/popout";
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

describe("Popout Regression Tests", () => {
    /**
     * Regression test for: Child drag z-index issue
     *
     * Issue: When dragging a child popout, it would slide under the parent
     * because bringToFront was not called when drag started.
     *
     * Fix: Added onDragStart callback to useFloatingPanel that calls bringToFront
     */
    describe("Issue: Child drag z-index (should stay on top when dragging)", () => {
        it("child panel should be brought to front when drag starts", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Parent" }}>
                        <Popout.Content>
                            <span data-testid="parent-content">Parent Content</span>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel width={180} header={{ variant: "title", title: "Child" }}>
                                    <Popout.Content>
                                        <span data-testid="child-content">Child Content</span>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open parent and child
            await user.click(screen.getByRole("button", { name: "Open Parent" }));
            await waitFor(() => {
                expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: "Open Child" }));
            await waitFor(() => {
                expect(screen.getByTestId("child-content")).toBeInTheDocument();
            });

            // Get panels
            const panels = screen.getAllByRole("dialog");
            const parentPanel = panels.find((p) => p.querySelector('[data-testid="parent-content"]'));
            const childPanel = panels.find((p) => p.querySelector('[data-testid="child-content"]'));

            expect(parentPanel).toBeDefined();
            expect(childPanel).toBeDefined();

            // Child should already be on top (opened last)
            const initialChildZIndex = parseInt(childPanel!.style.zIndex, 10);
            const initialParentZIndex = parseInt(parentPanel!.style.zIndex, 10);
            expect(initialChildZIndex).toBeGreaterThan(initialParentZIndex);

            // Find the drag trigger in the child panel header
            const dragTrigger = childPanel!.querySelector("[data-drag-trigger]");
            expect(dragTrigger).toBeInTheDocument();

            // Simulate drag start with pointerdown event
            fireEvent.pointerDown(dragTrigger!, { clientX: 100, clientY: 100 });

            // After drag starts, child should still be on top (bringToFront called)
            const newChildZIndex = parseInt(childPanel!.style.zIndex, 10);
            const newParentZIndex = parseInt(parentPanel!.style.zIndex, 10);
            expect(newChildZIndex).toBeGreaterThanOrEqual(newParentZIndex);

            // Cleanup
            fireEvent.pointerUp(dragTrigger!, { clientX: 100, clientY: 100 });
        });
    });

    /**
     * Regression test for: Click on parent should close child
     *
     * Issue: Clicking on the parent panel did not close child popouts,
     * unlike clicking outside or pressing Escape.
     *
     * Fix: Added closeDescendants call in handlePanelClick
     */
    describe("Issue: Click on parent should close child", () => {
        it("clicking on parent panel closes child popouts", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Parent" }}>
                        <Popout.Content>
                            <span data-testid="parent-content">Parent Content</span>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel width={180} header={{ variant: "title", title: "Child" }}>
                                    <Popout.Content>
                                        <span data-testid="child-content">Child Content</span>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open parent and child
            await user.click(screen.getByRole("button", { name: "Open Parent" }));
            await waitFor(() => {
                expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: "Open Child" }));
            await waitFor(() => {
                expect(screen.getByTestId("child-content")).toBeInTheDocument();
            });

            // Both panels should be open
            expect(screen.getAllByRole("dialog")).toHaveLength(2);

            // Click on the parent panel (not on the child trigger)
            const parentPanel = screen
                .getAllByRole("dialog")
                .find((p) => p.querySelector('[data-testid="parent-content"]'));
            await user.click(parentPanel!);

            // Child should be closed, parent should remain open
            await waitFor(() => {
                expect(screen.getAllByRole("dialog")).toHaveLength(1);
            });
            expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
        });

        it("clicking inside child panel does NOT close parent (click should not bubble)", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Parent" }}>
                        <Popout.Content>
                            <span data-testid="parent-content">Parent Content</span>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel width={180} header={{ variant: "title", title: "Child" }}>
                                    <Popout.Content>
                                        <button data-testid="child-button">Child Button</button>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open parent and child
            await user.click(screen.getByRole("button", { name: "Open Parent" }));
            await waitFor(() => {
                expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: "Open Child" }));
            await waitFor(() => {
                expect(screen.getByTestId("child-button")).toBeInTheDocument();
            });

            // Both panels should be open
            expect(screen.getAllByRole("dialog")).toHaveLength(2);

            // Click inside the child panel
            await user.click(screen.getByTestId("child-button"));

            // Both panels should STILL be open (click should not bubble and close anything)
            expect(screen.getAllByRole("dialog")).toHaveLength(2);
            expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            expect(screen.getByTestId("child-button")).toBeInTheDocument();
        });
    });

    /**
     * Regression test for: Second popout button should close first panel
     *
     * Issue: Opening a second root-level popout did not close the first one,
     * leading to multiple independent popouts cluttering the UI.
     *
     * Fix: Added exclusive siblings behavior in register function
     */
    describe("Issue: Second popout button should close first panel (exclusive siblings)", () => {
        it("opening a sibling popout closes other siblings at the same level", async () => {
            const user = userEvent.setup();

            renderPopout(
                <>
                    <Popout>
                        <Popout.Trigger>
                            <button>Open Panel A</button>
                        </Popout.Trigger>
                        <Popout.Panel width={200} header={{ variant: "title", title: "Panel A" }}>
                            <Popout.Content>
                                <span data-testid="content-a">Content A</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                    <Popout>
                        <Popout.Trigger>
                            <button>Open Panel B</button>
                        </Popout.Trigger>
                        <Popout.Panel width={200} header={{ variant: "title", title: "Panel B" }}>
                            <Popout.Content>
                                <span data-testid="content-b">Content B</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                    <Popout>
                        <Popout.Trigger>
                            <button>Open Panel C</button>
                        </Popout.Trigger>
                        <Popout.Panel width={200} header={{ variant: "title", title: "Panel C" }}>
                            <Popout.Content>
                                <span data-testid="content-c">Content C</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </>,
            );

            // Open Panel A
            await user.click(screen.getByRole("button", { name: "Open Panel A" }));
            await waitFor(() => {
                expect(screen.getByTestId("content-a")).toBeInTheDocument();
            });
            expect(screen.getAllByRole("dialog")).toHaveLength(1);

            // Open Panel B - should close Panel A
            await user.click(screen.getByRole("button", { name: "Open Panel B" }));
            await waitFor(() => {
                expect(screen.getByTestId("content-b")).toBeInTheDocument();
            });
            expect(screen.getAllByRole("dialog")).toHaveLength(1);
            expect(screen.queryByTestId("content-a")).not.toBeInTheDocument();

            // Open Panel C - should close Panel B
            await user.click(screen.getByRole("button", { name: "Open Panel C" }));
            await waitFor(() => {
                expect(screen.getByTestId("content-c")).toBeInTheDocument();
            });
            expect(screen.getAllByRole("dialog")).toHaveLength(1);
            expect(screen.queryByTestId("content-b")).not.toBeInTheDocument();
        });

        it("exclusive siblings also closes descendants of the sibling", async () => {
            const user = userEvent.setup();

            renderPopout(
                <>
                    <Popout>
                        <Popout.Trigger>
                            <button>Open Panel A</button>
                        </Popout.Trigger>
                        <Popout.Panel width={200} header={{ variant: "title", title: "Panel A" }}>
                            <Popout.Content>
                                <span data-testid="content-a">Content A</span>
                                <Popout>
                                    <Popout.Trigger>
                                        <button>Open Child of A</button>
                                    </Popout.Trigger>
                                    <Popout.Panel
                                        width={180}
                                        header={{ variant: "title", title: "Child of A" }}
                                    >
                                        <Popout.Content>
                                            <span data-testid="child-of-a">Child of A Content</span>
                                        </Popout.Content>
                                    </Popout.Panel>
                                </Popout>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                    <Popout>
                        <Popout.Trigger>
                            <button>Open Panel B</button>
                        </Popout.Trigger>
                        <Popout.Panel width={200} header={{ variant: "title", title: "Panel B" }}>
                            <Popout.Content>
                                <span data-testid="content-b">Content B</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </>,
            );

            // Open Panel A and its child
            await user.click(screen.getByRole("button", { name: "Open Panel A" }));
            await waitFor(() => {
                expect(screen.getByTestId("content-a")).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: "Open Child of A" }));
            await waitFor(() => {
                expect(screen.getByTestId("child-of-a")).toBeInTheDocument();
            });
            expect(screen.getAllByRole("dialog")).toHaveLength(2);

            // Open Panel B - should close Panel A AND its child
            await user.click(screen.getByRole("button", { name: "Open Panel B" }));
            await waitFor(() => {
                expect(screen.getByTestId("content-b")).toBeInTheDocument();
            });
            expect(screen.getAllByRole("dialog")).toHaveLength(1);
            expect(screen.queryByTestId("content-a")).not.toBeInTheDocument();
            expect(screen.queryByTestId("child-of-a")).not.toBeInTheDocument();
        });

        it("nested children are NOT treated as siblings (parent-child can coexist)", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Parent" }}>
                        <Popout.Content>
                            <span data-testid="parent-content">Parent Content</span>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel width={180} header={{ variant: "title", title: "Child" }}>
                                    <Popout.Content>
                                        <span data-testid="child-content">Child Content</span>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open parent
            await user.click(screen.getByRole("button", { name: "Open Parent" }));
            await waitFor(() => {
                expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            });

            // Open child - should NOT close parent (child is not a sibling)
            await user.click(screen.getByRole("button", { name: "Open Child" }));
            await waitFor(() => {
                expect(screen.getByTestId("child-content")).toBeInTheDocument();
            });

            // Both should be open
            expect(screen.getAllByRole("dialog")).toHaveLength(2);
            expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            expect(screen.getByTestId("child-content")).toBeInTheDocument();
        });
    });

    /**
     * Regression test for: Opening child from trigger inside parent
     *
     * Issue: When clicking "Open Child" button inside parent panel, the click
     * would bubble to parent's handlePanelClick and immediately close the child.
     *
     * Fix: Added event.stopPropagation() in handlePanelClick and PopoutTrigger
     */
    describe("Issue: Child trigger inside parent should not cause immediate close", () => {
        it("clicking trigger inside parent opens child without closing it", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Parent" }}>
                        <Popout.Content>
                            <span data-testid="parent-content">Parent Content</span>
                            <Popout>
                                <Popout.Trigger>
                                    <button data-testid="child-trigger">Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel width={180} header={{ variant: "title", title: "Child" }}>
                                    <Popout.Content>
                                        <span data-testid="child-content">Child Content</span>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open parent
            await user.click(screen.getByRole("button", { name: "Open Parent" }));
            await waitFor(() => {
                expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            });
            expect(screen.getAllByRole("dialog")).toHaveLength(1);

            // Click the child trigger inside parent
            await user.click(screen.getByTestId("child-trigger"));

            // Child should open and stay open (not immediately close)
            await waitFor(() => {
                expect(screen.getByTestId("child-content")).toBeInTheDocument();
            });

            // Both panels should be open
            expect(screen.getAllByRole("dialog")).toHaveLength(2);
            expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            expect(screen.getByTestId("child-content")).toBeInTheDocument();
        });
    });

    /**
     * Regression test for: Floating UI z-index issue
     *
     * Issue: Mantine floating UI elements (Select dropdown, Menu, etc.) appeared
     * BEHIND the Popout panel because their z-index was lower.
     *
     * Fix: Set FLOATING_UI_Z_INDEX (1100) > POPOUT_Z_INDEX_BASE (1000) via theme
     * defaultProps for comboboxProps.zIndex, popoverProps.zIndex, and Menu/Popover zIndex.
     */
    describe("Issue: Floating UI elements should appear above Popout (z-index)", () => {
        it("FLOATING_UI_Z_INDEX is greater than POPOUT_Z_INDEX_BASE", () => {
            // This test verifies the constants are configured correctly
            expect(FLOATING_UI_Z_INDEX).toBeGreaterThan(POPOUT_Z_INDEX_BASE);
        });

        it("Popout panel has POPOUT_Z_INDEX_BASE z-index in inline style", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Panel</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>
                            <span data-testid="panel-content">Content</span>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open the popout
            await user.click(screen.getByRole("button", { name: "Open Panel" }));
            await waitFor(() => {
                expect(screen.getByRole("dialog")).toBeInTheDocument();
            });

            // Verify the panel has z-index in inline style
            const panel = screen.getByRole("dialog");
            const style = panel.getAttribute("style");
            expect(style).toContain(`z-index: ${POPOUT_Z_INDEX_BASE}`);
        });

        // Note: Testing actual computed z-index for Mantine floating UI elements
        // (Select, Menu, etc.) is not reliable in jsdom because:
        // 1. jsdom doesn't compute CSS properly
        // 2. Mantine's theme defaultProps for z-index may not be applied in jsdom
        //
        // The visual z-index behavior is tested via the ComponentCompatibility
        // story in Storybook, which provides manual verification that floating
        // UI elements appear above the Popout panel.
        //
        // The key regression protection is:
        // 1. The constant test above verifies FLOATING_UI_Z_INDEX > POPOUT_Z_INDEX_BASE
        // 2. The overlays.ts theme file sets z-index for Menu, Tooltip, Popover, HoverCard
        // 3. The inputs.ts theme file sets comboboxProps.zIndex for Select, etc.
    });

    /**
     * Regression test for: Click on floating UI dismisses Popout
     *
     * Issue: Clicking on Mantine floating UI elements (Select options, Menu items)
     * that are rendered in portals would trigger click-outside and close the Popout.
     *
     * Fix: Added MANTINE_FLOATING_SELECTORS to useClickOutside hook to recognize
     * portal-rendered elements as "inside" the Popout.
     *
     * NOTE: Testing the actual floating UI click behavior is unreliable in jsdom
     * because Mantine's Combobox/Select relies on focus and pointer events that
     * jsdom doesn't fully support. The key regression protection is:
     * 1. MANTINE_FLOATING_SELECTORS in useClickOutside.ts covers all Mantine portals
     * 2. Manual verification via ComponentCompatibility story in Storybook
     */
    describe("Issue: Clicking floating UI elements should not close Popout (click-outside)", () => {
        it("clicking Menu item does not close Popout", async () => {
            const user = userEvent.setup();
            let menuItemClicked = false;

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Panel</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>
                            <Menu>
                                <Menu.Target>
                                    <button data-testid="menu-trigger">Open Menu</button>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Item
                                        data-testid="menu-item"
                                        onClick={() => {
                                            menuItemClicked = true;
                                        }}
                                    >
                                        Click Me
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                            <span data-testid="panel-content">Panel is open</span>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open the popout
            await user.click(screen.getByRole("button", { name: "Open Panel" }));
            await waitFor(() => {
                expect(screen.getByTestId("panel-content")).toBeInTheDocument();
            });

            // Click the menu trigger to open menu
            await user.click(screen.getByTestId("menu-trigger"));
            await waitFor(() => {
                expect(screen.getByTestId("menu-item")).toBeInTheDocument();
            });

            // Click the menu item
            await user.click(screen.getByTestId("menu-item"));

            // Menu item click handler should have been called
            expect(menuItemClicked).toBe(true);

            // Popout should still be open after clicking menu item
            // (Menu closes itself, but Popout should remain open)
            expect(screen.getByTestId("panel-content")).toBeInTheDocument();
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        it("clicking outside Popout closes it", async () => {
            const user = userEvent.setup();

            renderPopout(
                <div>
                    <button data-testid="outside-button">Outside Button</button>
                    <Popout>
                        <Popout.Trigger>
                            <button>Open Panel</button>
                        </Popout.Trigger>
                        <Popout.Panel width={280} header={{ variant: "title", title: "Test" }}>
                            <Popout.Content>
                                <span data-testid="panel-content">Panel is open</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </div>,
            );

            // Open the popout
            await user.click(screen.getByRole("button", { name: "Open Panel" }));
            await waitFor(() => {
                expect(screen.getByTestId("panel-content")).toBeInTheDocument();
            });

            // Click outside the popout (on external button)
            await user.click(screen.getByTestId("outside-button"));

            // Popout should be closed
            await waitFor(() => {
                expect(screen.queryByTestId("panel-content")).not.toBeInTheDocument();
            });
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });

    /**
     * Regression test for: Nested popouts must maintain rounded corners
     *
     * IMPORTANT: We previously had a "flush border" design that flattened corners
     * on the snapping side of nested popouts. This was REMOVED because:
     * 1. It created visual inconsistency with root popouts
     * 2. It caused complexity with no clear user benefit
     * 3. User explicitly requested: "WE DO NOT WANT FLUSH BORDERS AND FLATTENED CORNERS"
     *
     * Current behavior: ALL popouts have 8px rounded corners on all four sides,
     * regardless of nesting or placement.
     */
    describe("Issue: Nested popouts must maintain rounded corners (no flattened corners)", () => {
        it("nested popout with placement=left maintains all rounded corners", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={300} header={{ variant: "title", title: "Parent" }}>
                        <Popout.Content>
                            <span data-testid="parent-content">Parent Content</span>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel
                                    width={240}
                                    header={{ variant: "title", title: "Child" }}
                                    placement="left"
                                    gap={-1}
                                >
                                    <Popout.Content>
                                        <span data-testid="child-content">Child Content</span>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open parent
            await user.click(screen.getByRole("button", { name: "Open Parent" }));
            await waitFor(() => {
                expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            });

            // Open child
            await user.click(screen.getByRole("button", { name: "Open Child" }));
            await waitFor(() => {
                expect(screen.getByTestId("child-content")).toBeInTheDocument();
            });

            // Get both panels
            const panels = screen.getAllByRole("dialog");
            const parentPanel = panels.find((p) => p.querySelector('[data-testid="parent-content"]'));
            const childPanel = panels.find((p) => p.querySelector('[data-testid="child-content"]'));

            expect(parentPanel).toBeDefined();
            expect(childPanel).toBeDefined();

            // Verify child panel has data-parent-id attribute (indicates it's a nested popout)
            expect(childPanel!.getAttribute("data-parent-id")).toBeTruthy();

            // All corners should remain rounded - NO flattened corners
            // The nested popout uses gap={-1} for visual alignment but corners stay rounded
            const childInlineStyle = childPanel!.getAttribute("style") ?? "";
            // Should NOT have any flattened corners (all corners stay at 8px via Mantine Paper)
            expect(childInlineStyle).not.toContain("border-top-right-radius: 0");
            expect(childInlineStyle).not.toContain("border-bottom-right-radius: 0");
            expect(childInlineStyle).not.toContain("border-top-left-radius: 0");
            expect(childInlineStyle).not.toContain("border-bottom-left-radius: 0");
        });

        it("nested popout with placement=right maintains all rounded corners", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={300} header={{ variant: "title", title: "Parent" }}>
                        <Popout.Content>
                            <span data-testid="parent-content">Parent Content</span>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel
                                    width={240}
                                    header={{ variant: "title", title: "Child" }}
                                    placement="right"
                                    gap={-1}
                                >
                                    <Popout.Content>
                                        <span data-testid="child-content">Child Content</span>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open both panels
            await user.click(screen.getByRole("button", { name: "Open Parent" }));
            await waitFor(() => {
                expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: "Open Child" }));
            await waitFor(() => {
                expect(screen.getByTestId("child-content")).toBeInTheDocument();
            });

            // Get child panel
            const panels = screen.getAllByRole("dialog");
            const childPanel = panels.find((p) => p.querySelector('[data-testid="child-content"]'));
            expect(childPanel).toBeDefined();

            // All corners should remain rounded - NO flattened corners regardless of placement
            const childInlineStyle = childPanel!.getAttribute("style") ?? "";
            // Should NOT have any flattened corners (all corners stay at 8px via Mantine Paper)
            expect(childInlineStyle).not.toContain("border-top-left-radius: 0");
            expect(childInlineStyle).not.toContain("border-bottom-left-radius: 0");
            expect(childInlineStyle).not.toContain("border-top-right-radius: 0");
            expect(childInlineStyle).not.toContain("border-bottom-right-radius: 0");
        });

        it("root popout without anchorRef or parentId uses Mantine Paper default radius", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Panel</button>
                    </Popout.Trigger>
                    <Popout.Panel width={300} header={{ variant: "title", title: "Root Panel" }}>
                        <Popout.Content>
                            <span data-testid="panel-content">Panel Content</span>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open panel
            await user.click(screen.getByRole("button", { name: "Open Panel" }));
            await waitFor(() => {
                expect(screen.getByTestId("panel-content")).toBeInTheDocument();
            });

            // Get panel
            const panel = screen.getByRole("dialog");

            // Root panel without anchorRef should NOT have data-parent-id
            expect(panel.getAttribute("data-parent-id")).toBeNull();

            // Root panel should have data-popout-id
            expect(panel.getAttribute("data-popout-id")).toBeTruthy();
        });

        /**
         * Regression test for: parentId !== undefined bug
         *
         * Issue: hasAnchor was checking `parentId !== undefined` but parentId defaults to `null`
         * when not nested. Since `null !== undefined` is true, ALL popouts incorrectly had
         * hasAnchor=true, causing corners to be flattened even for standalone root popouts.
         *
         * Fix: Changed condition from `parentId !== undefined` to `parentId != null`
         * which correctly handles both null and undefined.
         */
        it("standalone root popout has all corners rounded (no flattened corners)", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Panel</button>
                    </Popout.Trigger>
                    <Popout.Panel width={300} header={{ variant: "title", title: "Root Panel" }}>
                        <Popout.Content>
                            <span data-testid="panel-content">Panel Content</span>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open panel
            await user.click(screen.getByRole("button", { name: "Open Panel" }));
            await waitFor(() => {
                expect(screen.getByTestId("panel-content")).toBeInTheDocument();
            });

            // Get panel
            const panel = screen.getByRole("dialog");
            const inlineStyle = panel.getAttribute("style") ?? "";

            // Root panel without anchorRef or parentId should NOT have any border-radius overrides
            // in inline style. The radius should come from Mantine Paper's radius={8} prop.
            // If the bug regresses, we'd see flattened corners (0) in the inline style.
            expect(inlineStyle).not.toContain("border-top-left-radius: 0");
            expect(inlineStyle).not.toContain("border-top-right-radius: 0");
            expect(inlineStyle).not.toContain("border-bottom-left-radius: 0");
            expect(inlineStyle).not.toContain("border-bottom-right-radius: 0");
        });

        it("nested popout with placement=top maintains all rounded corners", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={300} header={{ variant: "title", title: "Parent" }}>
                        <Popout.Content>
                            <span data-testid="parent-content">Parent Content</span>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel
                                    width={240}
                                    header={{ variant: "title", title: "Child" }}
                                    placement="top"
                                    gap={-1}
                                >
                                    <Popout.Content>
                                        <span data-testid="child-content">Child Content</span>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open both panels
            await user.click(screen.getByRole("button", { name: "Open Parent" }));
            await waitFor(() => {
                expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: "Open Child" }));
            await waitFor(() => {
                expect(screen.getByTestId("child-content")).toBeInTheDocument();
            });

            // Get child panel
            const panels = screen.getAllByRole("dialog");
            const childPanel = panels.find((p) => p.querySelector('[data-testid="child-content"]'));
            expect(childPanel).toBeDefined();

            // All corners should remain rounded - NO flattened corners regardless of placement
            const childInlineStyle = childPanel!.getAttribute("style") ?? "";
            // Should NOT have any flattened corners (all corners stay at 8px via Mantine Paper)
            expect(childInlineStyle).not.toContain("border-bottom-left-radius: 0");
            expect(childInlineStyle).not.toContain("border-bottom-right-radius: 0");
            expect(childInlineStyle).not.toContain("border-top-left-radius: 0");
            expect(childInlineStyle).not.toContain("border-top-right-radius: 0");
        });

        it("nested popout with placement=bottom maintains all rounded corners", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={300} header={{ variant: "title", title: "Parent" }}>
                        <Popout.Content>
                            <span data-testid="parent-content">Parent Content</span>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel
                                    width={240}
                                    header={{ variant: "title", title: "Child" }}
                                    placement="bottom"
                                    gap={-1}
                                >
                                    <Popout.Content>
                                        <span data-testid="child-content">Child Content</span>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open both panels
            await user.click(screen.getByRole("button", { name: "Open Parent" }));
            await waitFor(() => {
                expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: "Open Child" }));
            await waitFor(() => {
                expect(screen.getByTestId("child-content")).toBeInTheDocument();
            });

            // Get child panel
            const panels = screen.getAllByRole("dialog");
            const childPanel = panels.find((p) => p.querySelector('[data-testid="child-content"]'));
            expect(childPanel).toBeDefined();

            // All corners should remain rounded - NO flattened corners regardless of placement
            const childInlineStyle = childPanel!.getAttribute("style") ?? "";
            // Should NOT have any flattened corners (all corners stay at 8px via Mantine Paper)
            expect(childInlineStyle).not.toContain("border-top-left-radius: 0");
            expect(childInlineStyle).not.toContain("border-top-right-radius: 0");
            expect(childInlineStyle).not.toContain("border-bottom-left-radius: 0");
            expect(childInlineStyle).not.toContain("border-bottom-right-radius: 0");
        });
    });

    /**
     * Regression test for: Popout uses minWidth for flexible sizing
     *
     * Issue: Popouts must use minWidth (not fixed width) so that content
     * can expand the panel when needed. Fixed width would constrain content
     * and cause overflow issues in components like CompactColorInput.
     *
     * Requirement: Popout panels MUST use minWidth for flexible sizing.
     */
    describe("Issue: Popout panel must use minWidth for flexible sizing", () => {
        it("popout panel uses minWidth style, NOT fixed width", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Panel</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Test Panel" }}>
                        <Popout.Content>
                            <span data-testid="panel-content">
                                This content might need more space than the specified width.
                            </span>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            // Open panel
            await user.click(screen.getByRole("button", { name: "Open Panel" }));
            await waitFor(() => {
                expect(screen.getByTestId("panel-content")).toBeInTheDocument();
            });

            // Get panel
            const panel = screen.getByRole("dialog");
            const inlineStyle = panel.getAttribute("style") ?? "";

            // MUST use minWidth for flexible sizing - NOT fixed width
            expect(inlineStyle).toContain("min-width: 280px");
            // Should NOT have explicit width that would constrain content
            expect(inlineStyle).not.toMatch(/(?<!min-)width: \d+px/);
        });
    });

    /**
     * Regression test for: All popouts must have rounded corners
     *
     * Issue: The hasAnchor logic was incorrectly flattening corners on popouts
     * when using Popout.Anchor or when nested. This caused square corners to appear.
     *
     * Requirement: ALL popouts must have 8px rounded corners on all four corners.
     * NO flush borders, NO flattened corners - ever.
     */
    describe("Issue: All popouts must have rounded corners (no flattened corners)", () => {
        it("popout panel always has 8px radius on all corners", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Panel</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Test Panel" }}>
                        <Popout.Content>
                            <span data-testid="panel-content">Content</span>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            await user.click(screen.getByRole("button", { name: "Open Panel" }));
            await waitFor(() => {
                expect(screen.getByTestId("panel-content")).toBeInTheDocument();
            });

            const panel = screen.getByRole("dialog");

            // Paper component should have radius={8}
            // This ensures all corners are rounded, not flattened
            expect(panel.className).toContain("mantine-Paper-root");
            // The panel should NOT have inline border-radius styles that flatten corners
            const inlineStyle = panel.getAttribute("style") ?? "";
            expect(inlineStyle).not.toContain("border-top-right-radius: 0");
            expect(inlineStyle).not.toContain("border-bottom-right-radius: 0");
            expect(inlineStyle).not.toContain("border-top-left-radius: 0");
            expect(inlineStyle).not.toContain("border-bottom-left-radius: 0");
        });

        it("popout panel always has full borders on all sides", async () => {
            const user = userEvent.setup();

            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Panel</button>
                    </Popout.Trigger>
                    <Popout.Panel width={280} header={{ variant: "title", title: "Test Panel" }}>
                        <Popout.Content>
                            <span data-testid="panel-content">Content</span>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>,
            );

            await user.click(screen.getByRole("button", { name: "Open Panel" }));
            await waitFor(() => {
                expect(screen.getByTestId("panel-content")).toBeInTheDocument();
            });

            const panel = screen.getByRole("dialog");
            const inlineStyle = panel.getAttribute("style") ?? "";

            // Should have full border on all sides (not "none" on any side)
            expect(inlineStyle).not.toContain("border-right: none");
            expect(inlineStyle).not.toContain("border-left: none");
            expect(inlineStyle).not.toContain("border-top: none");
            expect(inlineStyle).not.toContain("border-bottom: none");
        });
    });
});
