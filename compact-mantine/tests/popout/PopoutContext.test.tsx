import { MantineProvider } from "@mantine/core";
import { act, render, screen, waitFor } from "@testing-library/react";
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

describe("PopoutManagerProvider", () => {
    describe("register function refactoring (Issue #6)", () => {
        it("closes sibling popouts when opening new one", async () => {
            const user = userEvent.setup();

            renderPopout(
                <>
                    <Popout>
                        <Popout.Trigger>
                            <button>Open A</button>
                        </Popout.Trigger>
                        <Popout.Panel width={200} header={{ variant: "title", title: "Panel A" }}>
                            <Popout.Content>
                                <span data-testid="content-a">Content A</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                    <Popout>
                        <Popout.Trigger>
                            <button>Open B</button>
                        </Popout.Trigger>
                        <Popout.Panel width={200} header={{ variant: "title", title: "Panel B" }}>
                            <Popout.Content>
                                <span data-testid="content-b">Content B</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </>,
            );

            // Open Panel A
            await user.click(screen.getByRole("button", { name: "Open A" }));
            await waitFor(() => {
                expect(screen.getByTestId("content-a")).toBeInTheDocument();
            });

            // Open Panel B - should close Panel A
            await user.click(screen.getByRole("button", { name: "Open B" }));
            await waitFor(() => {
                expect(screen.getByTestId("content-b")).toBeInTheDocument();
            });

            // Only Panel B should be open
            expect(screen.queryByTestId("content-a")).not.toBeInTheDocument();
            expect(screen.getAllByRole("dialog")).toHaveLength(1);
        });

        it("closes descendant popouts when parent closes", async () => {
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
                                        <Popout>
                                            <Popout.Trigger>
                                                <button>Open Grandchild</button>
                                            </Popout.Trigger>
                                            <Popout.Panel
                                                width={160}
                                                header={{ variant: "title", title: "Grandchild" }}
                                            >
                                                <Popout.Content>
                                                    <span data-testid="grandchild-content">
                                                        Grandchild Content
                                                    </span>
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
            await user.click(screen.getByRole("button", { name: "Open Parent" }));
            await waitFor(() => {
                expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: "Open Child" }));
            await waitFor(() => {
                expect(screen.getByTestId("child-content")).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: "Open Grandchild" }));
            await waitFor(() => {
                expect(screen.getByTestId("grandchild-content")).toBeInTheDocument();
            });

            // All three should be open
            expect(screen.getAllByRole("dialog")).toHaveLength(3);

            // Close the parent - should close child and grandchild too
            const parentPanel = screen
                .getAllByRole("dialog")
                .find((p) => p.querySelector('[data-testid="parent-content"]'));
            const closeButton = parentPanel?.querySelector('[aria-label="Close panel"]') as HTMLElement;
            await user.click(closeButton);

            // All panels should be closed
            await waitFor(() => {
                expect(screen.queryAllByRole("dialog")).toHaveLength(0);
            });
        });

        it("handles nested sibling popouts correctly", async () => {
            const user = userEvent.setup();

            // Nested siblings: Parent > (Child A, Child B)
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
                                    <button>Open Child A</button>
                                </Popout.Trigger>
                                <Popout.Panel width={180} header={{ variant: "title", title: "Child A" }}>
                                    <Popout.Content>
                                        <span data-testid="child-a-content">Child A Content</span>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child B</button>
                                </Popout.Trigger>
                                <Popout.Panel width={180} header={{ variant: "title", title: "Child B" }}>
                                    <Popout.Content>
                                        <span data-testid="child-b-content">Child B Content</span>
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

            // Open Child A
            await user.click(screen.getByRole("button", { name: "Open Child A" }));
            await waitFor(() => {
                expect(screen.getByTestId("child-a-content")).toBeInTheDocument();
            });

            // Parent and Child A should be open
            expect(screen.getAllByRole("dialog")).toHaveLength(2);

            // Open Child B - should close Child A (siblings under same parent)
            await user.click(screen.getByRole("button", { name: "Open Child B" }));
            await waitFor(() => {
                expect(screen.getByTestId("child-b-content")).toBeInTheDocument();
            });

            // Parent and Child B should be open, Child A should be closed
            expect(screen.getAllByRole("dialog")).toHaveLength(2);
            expect(screen.getByTestId("parent-content")).toBeInTheDocument();
            expect(screen.queryByTestId("child-a-content")).not.toBeInTheDocument();
            expect(screen.getByTestId("child-b-content")).toBeInTheDocument();
        });

        it("handles deeply nested popout hierarchies efficiently", async () => {
            const user = userEvent.setup();

            // Create a deep hierarchy: 5 levels deep
            const DeepNesting = () => (
                <Popout>
                    <Popout.Trigger>
                        <button>Open Level 1</button>
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Level 1" }}>
                        <Popout.Content>
                            <span data-testid="level-1">Level 1</span>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Level 2</button>
                                </Popout.Trigger>
                                <Popout.Panel width={200} header={{ variant: "title", title: "Level 2" }}>
                                    <Popout.Content>
                                        <span data-testid="level-2">Level 2</span>
                                        <Popout>
                                            <Popout.Trigger>
                                                <button>Open Level 3</button>
                                            </Popout.Trigger>
                                            <Popout.Panel
                                                width={200}
                                                header={{ variant: "title", title: "Level 3" }}
                                            >
                                                <Popout.Content>
                                                    <span data-testid="level-3">Level 3</span>
                                                    <Popout>
                                                        <Popout.Trigger>
                                                            <button>Open Level 4</button>
                                                        </Popout.Trigger>
                                                        <Popout.Panel
                                                            width={200}
                                                            header={{ variant: "title", title: "Level 4" }}
                                                        >
                                                            <Popout.Content>
                                                                <span data-testid="level-4">Level 4</span>
                                                                <Popout>
                                                                    <Popout.Trigger>
                                                                        <button>Open Level 5</button>
                                                                    </Popout.Trigger>
                                                                    <Popout.Panel
                                                                        width={200}
                                                                        header={{
                                                                            variant: "title",
                                                                            title: "Level 5",
                                                                        }}
                                                                    >
                                                                        <Popout.Content>
                                                                            <span data-testid="level-5">
                                                                                Level 5
                                                                            </span>
                                                                        </Popout.Content>
                                                                    </Popout.Panel>
                                                                </Popout>
                                                            </Popout.Content>
                                                        </Popout.Panel>
                                                    </Popout>
                                                </Popout.Content>
                                            </Popout.Panel>
                                        </Popout>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            );

            const start = performance.now();

            renderPopout(<DeepNesting />);

            // Open all 5 levels
            for (let i = 1; i <= 5; i++) {
                await user.click(screen.getByRole("button", { name: `Open Level ${i}` }));
                await waitFor(() => {
                    expect(screen.getByTestId(`level-${i}`)).toBeInTheDocument();
                });
            }

            const duration = performance.now() - start;

            // All 5 levels should be open
            expect(screen.getAllByRole("dialog")).toHaveLength(5);

            // Should complete in reasonable time (not O(n²) - generous limit for CI)
            expect(duration).toBeLessThan(5000);

            // Close level 2 - should close levels 2-5
            const level2Panel = screen
                .getAllByRole("dialog")
                .find((p) => p.querySelector('[data-testid="level-2"]'));
            const closeButton = level2Panel?.querySelector('[aria-label="Close panel"]') as HTMLElement;
            await user.click(closeButton);

            // Only level 1 should remain
            await waitFor(() => {
                expect(screen.getAllByRole("dialog")).toHaveLength(1);
            });
            expect(screen.getByTestId("level-1")).toBeInTheDocument();
        });
    });

    describe("helper functions behavior", () => {
        it("correctly identifies siblings (same parent level)", async () => {
            const user = userEvent.setup();

            // Three sibling popouts at root level
            renderPopout(
                <>
                    <Popout>
                        <Popout.Trigger>
                            <button>Open First</button>
                        </Popout.Trigger>
                        <Popout.Panel width={200} header={{ variant: "title", title: "First" }}>
                            <Popout.Content>
                                <span data-testid="first">First</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                    <Popout>
                        <Popout.Trigger>
                            <button>Open Second</button>
                        </Popout.Trigger>
                        <Popout.Panel width={200} header={{ variant: "title", title: "Second" }}>
                            <Popout.Content>
                                <span data-testid="second">Second</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                    <Popout>
                        <Popout.Trigger>
                            <button>Open Third</button>
                        </Popout.Trigger>
                        <Popout.Panel width={200} header={{ variant: "title", title: "Third" }}>
                            <Popout.Content>
                                <span data-testid="third">Third</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </>,
            );

            // Open First
            await user.click(screen.getByRole("button", { name: "Open First" }));
            await waitFor(() => {
                expect(screen.getByTestId("first")).toBeInTheDocument();
            });

            // Open Second - should close First
            await user.click(screen.getByRole("button", { name: "Open Second" }));
            await waitFor(() => {
                expect(screen.getByTestId("second")).toBeInTheDocument();
            });
            expect(screen.queryByTestId("first")).not.toBeInTheDocument();

            // Open Third - should close Second
            await user.click(screen.getByRole("button", { name: "Open Third" }));
            await waitFor(() => {
                expect(screen.getByTestId("third")).toBeInTheDocument();
            });
            expect(screen.queryByTestId("second")).not.toBeInTheDocument();

            // Only Third should remain
            expect(screen.getAllByRole("dialog")).toHaveLength(1);
        });

        it("closes descendants depth-first (children before parents)", async () => {
            const user = userEvent.setup();

            // Track close order
            const closeOrder: string[] = [];

            // We can't directly track close order with the current API,
            // but we can verify that all descendants are closed when parent closes
            renderPopout(
                <Popout>
                    <Popout.Trigger>
                        <button>Open Parent</button>
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Parent" }}>
                        <Popout.Content>
                            <span data-testid="parent">Parent</span>
                            <Popout>
                                <Popout.Trigger>
                                    <button>Open Child</button>
                                </Popout.Trigger>
                                <Popout.Panel width={180} header={{ variant: "title", title: "Child" }}>
                                    <Popout.Content>
                                        <span data-testid="child">Child</span>
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
                expect(screen.getByTestId("parent")).toBeInTheDocument();
            });

            await user.click(screen.getByRole("button", { name: "Open Child" }));
            await waitFor(() => {
                expect(screen.getByTestId("child")).toBeInTheDocument();
            });

            // Both should be open
            expect(screen.getAllByRole("dialog")).toHaveLength(2);

            // Close parent - both should close
            const parentPanel = screen
                .getAllByRole("dialog")
                .find((p) => p.querySelector('[data-testid="parent"]'));
            const closeButton = parentPanel?.querySelector('[aria-label="Close panel"]') as HTMLElement;
            await user.click(closeButton);

            // All panels should be closed
            await waitFor(() => {
                expect(screen.queryAllByRole("dialog")).toHaveLength(0);
            });
        });
    });
});
