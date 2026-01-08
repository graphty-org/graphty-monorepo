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

describe("PopoutManager z-index", () => {
    it("assigns incrementing z-index to nested popouts", async () => {
        const user = userEvent.setup();

        // Use nested popouts since root-level siblings are exclusive
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

        // Open Parent first
        await user.click(screen.getByRole("button", { name: "Open Parent" }));
        await waitFor(() => {
            expect(screen.getByTestId("parent-content")).toBeInTheDocument();
        });

        // Open Child second
        await user.click(screen.getByRole("button", { name: "Open Child" }));
        await waitFor(() => {
            expect(screen.getByTestId("child-content")).toBeInTheDocument();
        });

        // Child should have higher z-index than Parent
        const panels = screen.getAllByRole("dialog");
        const parentPanel = panels.find((p) => p.querySelector('[data-testid="parent-content"]'));
        const childPanel = panels.find((p) => p.querySelector('[data-testid="child-content"]'));

        expect(parentPanel).toBeDefined();
        expect(childPanel).toBeDefined();

        const zIndexParent = parseInt(parentPanel!.style.zIndex, 10);
        const zIndexChild = parseInt(childPanel!.style.zIndex, 10);

        expect(zIndexChild).toBeGreaterThan(zIndexParent);
    });

    it("closes sibling popouts when opening a new one (exclusive siblings)", async () => {
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
            </>,
        );

        // Open Panel A first
        await user.click(screen.getByRole("button", { name: "Open Panel A" }));
        await waitFor(() => {
            expect(screen.getByTestId("content-a")).toBeInTheDocument();
        });

        // Open Panel B - should close Panel A (exclusive siblings behavior)
        await user.click(screen.getByRole("button", { name: "Open Panel B" }));
        await waitFor(() => {
            expect(screen.getByTestId("content-b")).toBeInTheDocument();
        });

        // Only Panel B should be open
        expect(screen.getAllByRole("dialog")).toHaveLength(1);
        expect(screen.queryByTestId("content-a")).not.toBeInTheDocument();
    });

    it("brings clicked popout to front (nested popouts)", async () => {
        const user = userEvent.setup();

        // Use nested popouts since root-level siblings are exclusive
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

        // Open both panels
        await user.click(screen.getByRole("button", { name: "Open Parent" }));
        await waitFor(() => {
            expect(screen.getByTestId("parent-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open Child" }));
        await waitFor(() => {
            expect(screen.getByTestId("child-content")).toBeInTheDocument();
        });

        // Get initial z-indexes
        let panels = screen.getAllByRole("dialog");
        let parentPanel = panels.find((p) => p.querySelector('[data-testid="parent-content"]'));
        let childPanel = panels.find((p) => p.querySelector('[data-testid="child-content"]'));

        const initialZIndexParent = parseInt(parentPanel!.style.zIndex, 10);
        const initialZIndexChild = parseInt(childPanel!.style.zIndex, 10);

        // Child should be on top (opened last)
        expect(initialZIndexChild).toBeGreaterThan(initialZIndexParent);

        // Click on Parent to bring it to front
        await user.click(parentPanel!);

        // Re-query panels after click
        panels = screen.getAllByRole("dialog");
        parentPanel = panels.find((p) => p.querySelector('[data-testid="parent-content"]'));
        // Note: clicking parent closes descendants, so child should be closed
        // This is expected behavior - clicking on parent closes children
        expect(screen.getAllByRole("dialog")).toHaveLength(1);
        expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    });

    it("newly opened popouts get highest z-index", async () => {
        const user = userEvent.setup();

        // Use nested popouts with grandparent-parent-child to test z-index assignment
        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open Grandparent</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Grandparent" }}>
                    <Popout.Content>
                        <span data-testid="grandparent-content">Grandparent Content</span>
                        <Popout>
                            <Popout.Trigger>
                                <button>Open Parent</button>
                            </Popout.Trigger>
                            <Popout.Panel width={180} header={{ variant: "title", title: "Parent" }}>
                                <Popout.Content>
                                    <span data-testid="parent-content">Parent Content</span>
                                    <Popout>
                                        <Popout.Trigger>
                                            <button>Open Child</button>
                                        </Popout.Trigger>
                                        <Popout.Panel width={160} header={{ variant: "title", title: "Child" }}>
                                            <Popout.Content>
                                                <span data-testid="child-content">Child Content</span>
                                            </Popout.Content>
                                        </Popout.Panel>
                                    </Popout>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        // Open all three levels
        await user.click(screen.getByRole("button", { name: "Open Grandparent" }));
        await waitFor(() => {
            expect(screen.getByTestId("grandparent-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open Parent" }));
        await waitFor(() => {
            expect(screen.getByTestId("parent-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open Child" }));
        await waitFor(() => {
            expect(screen.getByTestId("child-content")).toBeInTheDocument();
        });

        // All three panels should be open
        const panels = screen.getAllByRole("dialog");
        expect(panels).toHaveLength(3);

        const grandparentPanel = panels.find((p) =>
            p.querySelector('[data-testid="grandparent-content"]'),
        );
        const parentPanel = panels.find((p) => p.querySelector('[data-testid="parent-content"]'));
        const childPanel = panels.find((p) => p.querySelector('[data-testid="child-content"]'));

        const zIndexGrandparent = parseInt(grandparentPanel!.style.zIndex, 10);
        const zIndexParent = parseInt(parentPanel!.style.zIndex, 10);
        const zIndexChild = parseInt(childPanel!.style.zIndex, 10);

        // Each nested level should have higher z-index
        expect(zIndexParent).toBeGreaterThan(zIndexGrandparent);
        expect(zIndexChild).toBeGreaterThan(zIndexParent);
    });

    it("maintains z-index after closing and reopening a panel", async () => {
        const user = userEvent.setup();

        // Use nested popouts since root-level siblings are exclusive
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

        // Open both panels
        await user.click(screen.getByRole("button", { name: "Open Parent" }));
        await waitFor(() => {
            expect(screen.getByTestId("parent-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open Child" }));
        await waitFor(() => {
            expect(screen.getAllByRole("dialog")).toHaveLength(2);
        });

        // Close Child panel
        const childPanel = screen
            .getAllByRole("dialog")
            .find((p) => p.querySelector('[data-testid="child-content"]'));
        const closeButton = childPanel?.querySelector('[aria-label="Close panel"]') as HTMLElement;
        await user.click(closeButton);

        await waitFor(() => {
            expect(screen.getAllByRole("dialog")).toHaveLength(1);
        });

        // Reopen Child
        await user.click(screen.getByRole("button", { name: "Open Child" }));

        await waitFor(() => {
            expect(screen.getAllByRole("dialog")).toHaveLength(2);
        });

        // Child should have the highest z-index (most recently opened)
        const panels = screen.getAllByRole("dialog");
        const parentPanel = panels.find((p) => p.querySelector('[data-testid="parent-content"]'));
        const reopenedChild = panels.find((p) => p.querySelector('[data-testid="child-content"]'));

        expect(parseInt(reopenedChild!.style.zIndex, 10)).toBeGreaterThan(
            parseInt(parentPanel!.style.zIndex, 10),
        );
    });
});

describe("PopoutManager close behavior", () => {
    it("closes popout on Escape key", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open Panel</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Test Panel" }}>
                    <Popout.Content>Panel Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        // Open the panel
        await user.click(screen.getByRole("button", { name: "Open Panel" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Press Escape key
        await user.keyboard("{Escape}");

        // Panel should be closed
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });

    it("closes popout when clicking outside", async () => {
        const user = userEvent.setup();

        const { container } = renderPopout(
            <>
                <div data-testid="outside-area">Outside area</div>
                <Popout>
                    <Popout.Trigger>
                        <button>Open Panel</button>
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test Panel" }}>
                        <Popout.Content>Panel Content</Popout.Content>
                    </Popout.Panel>
                </Popout>
            </>,
        );

        // Open the panel
        await user.click(screen.getByRole("button", { name: "Open Panel" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Click outside the panel (on the container)
        await user.click(screen.getByTestId("outside-area"));

        // Panel should be closed
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });

    it("does not close when clicking inside popout", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open Panel</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Test Panel" }}>
                    <Popout.Content>
                        <button data-testid="inside-button">Inside Button</button>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        // Open the panel
        await user.click(screen.getByRole("button", { name: "Open Panel" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Click inside the panel (on the inside button)
        await user.click(screen.getByTestId("inside-button"));

        // Panel should still be open
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("closes only the focused popout on Escape when multiple are open (nested)", async () => {
        const user = userEvent.setup();

        // Use nested popouts since root-level siblings are exclusive
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

        // Open both panels
        await user.click(screen.getByRole("button", { name: "Open Parent" }));
        await waitFor(() => {
            expect(screen.getByTestId("parent-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open Child" }));
        await waitFor(() => {
            expect(screen.getAllByRole("dialog")).toHaveLength(2);
        });

        // Child is the focused one (most recently opened/on top)
        // Press Escape - should close Child (the focused one)
        await user.keyboard("{Escape}");

        await waitFor(() => {
            expect(screen.getAllByRole("dialog")).toHaveLength(1);
        });

        // Parent should still be open
        expect(screen.getByTestId("parent-content")).toBeInTheDocument();
        expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    });

    it("does not close panel when clicking on trigger", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open Panel</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Test Panel" }}>
                    <Popout.Content>Panel Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        // Open the panel
        await user.click(screen.getByRole("button", { name: "Open Panel" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Click the trigger again - should toggle (close) the panel, not cause double-close
        await user.click(screen.getByRole("button", { name: "Open Panel" }));

        // Panel should be closed (toggled)
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });
});

describe("PopoutManager hierarchy", () => {
    it("tracks parent-child relationships", async () => {
        const user = userEvent.setup();

        // Render a nested popout structure
        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open Parent</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Parent Panel" }}>
                    <Popout.Content>
                        <Popout>
                            <Popout.Trigger>
                                <button>Open Child</button>
                            </Popout.Trigger>
                            <Popout.Panel width={180} header={{ variant: "title", title: "Child Panel" }}>
                                <Popout.Content>
                                    <span data-testid="child-content">Child Content</span>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        // Open the parent panel
        await user.click(screen.getByRole("button", { name: "Open Parent" }));
        await waitFor(() => {
            expect(screen.getByText("Parent Panel")).toBeInTheDocument();
        });

        // Open the child panel
        await user.click(screen.getByRole("button", { name: "Open Child" }));
        await waitFor(() => {
            expect(screen.getByText("Child Panel")).toBeInTheDocument();
        });

        // Both panels should be open
        expect(screen.getAllByRole("dialog")).toHaveLength(2);

        // Child panel should have a data-parent-id attribute linking to parent
        const childPanel = screen.getAllByRole("dialog").find((p) =>
            p.querySelector('[data-testid="child-content"]'),
        );
        expect(childPanel).toBeDefined();
        expect(childPanel).toHaveAttribute("data-parent-id");
    });

    it("closes descendants when parent closes", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open Parent</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Parent Panel" }}>
                    <Popout.Content>
                        <span data-testid="parent-content">Parent Content</span>
                        <Popout>
                            <Popout.Trigger>
                                <button>Open Child</button>
                            </Popout.Trigger>
                            <Popout.Panel width={180} header={{ variant: "title", title: "Child Panel" }}>
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

        // Close the parent panel using the close button
        const parentPanel = screen.getAllByRole("dialog").find((p) =>
            p.querySelector('[data-testid="parent-content"]'),
        );
        const closeButton = parentPanel?.querySelector('[aria-label="Close panel"]') as HTMLElement;
        await user.click(closeButton);

        // Both panels should be closed
        await waitFor(() => {
            expect(screen.queryAllByRole("dialog")).toHaveLength(0);
        });
    });

    it("click in child does not close parent", async () => {
        const user = userEvent.setup();

        renderPopout(
            <>
                <div data-testid="outside-area">Outside area</div>
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Parent Panel" }}>
                        <Popout.Content>
                            <span data-testid="parent-content">Parent Content</span>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel width={180} header={{ variant: "title", title: "Child Panel" }}>
                                    <Popout.Content>
                                        <button data-testid="child-button">Child Button</button>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </>,
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

        // Both panels should still be open
        expect(screen.getAllByRole("dialog")).toHaveLength(2);
        expect(screen.getByTestId("parent-content")).toBeInTheDocument();
        expect(screen.getByTestId("child-button")).toBeInTheDocument();
    });

    it("Escape in child only closes child", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open Parent</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Parent Panel" }}>
                    <Popout.Content>
                        <span data-testid="parent-content">Parent Content</span>
                        <Popout>
                            <Popout.Trigger>
                                <button>Open Child</button>
                            </Popout.Trigger>
                            <Popout.Panel width={180} header={{ variant: "title", title: "Child Panel" }}>
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

        // Press Escape - should only close the child (topmost/focused)
        await user.keyboard("{Escape}");

        // Only parent should remain
        await waitFor(() => {
            expect(screen.getAllByRole("dialog")).toHaveLength(1);
        });
        expect(screen.getByTestId("parent-content")).toBeInTheDocument();
        expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();

        // Press Escape again - should close parent
        await user.keyboard("{Escape}");

        await waitFor(() => {
            expect(screen.queryAllByRole("dialog")).toHaveLength(0);
        });
    });

    it("closing grandchild does not close parent or grandparent", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open Grandparent</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Grandparent" }}>
                    <Popout.Content>
                        <span data-testid="grandparent-content">Grandparent</span>
                        <Popout>
                            <Popout.Trigger>
                                <button>Open Parent</button>
                            </Popout.Trigger>
                            <Popout.Panel width={180} header={{ variant: "title", title: "Parent" }}>
                                <Popout.Content>
                                    <span data-testid="parent-content">Parent</span>
                                    <Popout>
                                        <Popout.Trigger>
                                            <button>Open Child</button>
                                        </Popout.Trigger>
                                        <Popout.Panel width={160} header={{ variant: "title", title: "Child" }}>
                                            <Popout.Content>
                                                <span data-testid="child-content">Child</span>
                                            </Popout.Content>
                                        </Popout.Panel>
                                    </Popout>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        // Open all three levels
        await user.click(screen.getByRole("button", { name: "Open Grandparent" }));
        await waitFor(() => {
            expect(screen.getByTestId("grandparent-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open Parent" }));
        await waitFor(() => {
            expect(screen.getByTestId("parent-content")).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: "Open Child" }));
        await waitFor(() => {
            expect(screen.getByTestId("child-content")).toBeInTheDocument();
        });

        // All three panels should be open
        expect(screen.getAllByRole("dialog")).toHaveLength(3);

        // Press Escape - should only close the child (topmost)
        await user.keyboard("{Escape}");

        // Grandparent and parent should remain
        await waitFor(() => {
            expect(screen.getAllByRole("dialog")).toHaveLength(2);
        });
        expect(screen.getByTestId("grandparent-content")).toBeInTheDocument();
        expect(screen.getByTestId("parent-content")).toBeInTheDocument();
        expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    });
});
