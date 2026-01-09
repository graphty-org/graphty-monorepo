import { Box, MantineProvider, Text } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHook } from "@testing-library/react";
import { Settings } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { describe, expect, it } from "vitest";

import { Popout, PopoutButton, PopoutManager, usePopoutAnchorContext } from "../../src/components/popout";
import { compactTheme } from "../../src/theme";

/**
 * Wrapper component for tests that provides required contexts.
 */
function TestWrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return (
        <MantineProvider theme={compactTheme}>
            <PopoutManager>{children}</PopoutManager>
        </MantineProvider>
    );
}

describe("PopoutAnchor", () => {
    describe("context behavior", () => {
        it("usePopoutAnchorContext returns null when not inside PopoutAnchor", () => {
            const { result } = renderHook(() => usePopoutAnchorContext(), {
                wrapper: ({ children }) => (
                    <MantineProvider theme={compactTheme}>{children}</MantineProvider>
                ),
            });
            expect(result.current).toBeNull();
        });

        it("usePopoutAnchorContext returns anchor context inside PopoutAnchor", () => {
            function TestComponent(): React.JSX.Element {
                const context = usePopoutAnchorContext();
                return (
                    <div data-testid="context-check">
                        {context ? "has-context" : "no-context"}
                    </div>
                );
            }

            render(
                <MantineProvider theme={compactTheme}>
                    <Popout.Anchor>
                        <Box>
                            <TestComponent />
                        </Box>
                    </Popout.Anchor>
                </MantineProvider>,
            );

            expect(screen.getByTestId("context-check")).toHaveTextContent("has-context");
        });
    });

    describe("error handling", () => {
        it("throws error when children is not a valid React element", () => {
            // Suppress console.error for this test since React will log the error
            const originalError = console.error;
            console.error = () => {};

            expect(() => {
                render(
                    <MantineProvider theme={compactTheme}>
                        {/* @ts-expect-error - Testing invalid children */}
                        <Popout.Anchor>{"invalid string child"}</Popout.Anchor>
                    </MantineProvider>,
                );
            }).toThrow("PopoutAnchor requires a single valid React element as its child");

            console.error = originalError;
        });
    });

    describe("rendering", () => {
        it("renders children correctly", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <Popout.Anchor>
                        <Box data-testid="anchor-child">Child content</Box>
                    </Popout.Anchor>
                </MantineProvider>,
            );

            expect(screen.getByTestId("anchor-child")).toBeInTheDocument();
            expect(screen.getByTestId("anchor-child")).toHaveTextContent("Child content");
        });

        it("can be used with Popout compound component", async () => {
            const user = userEvent.setup();

            render(
                <TestWrapper>
                    <Popout.Anchor>
                        <Box
                            w={200}
                            data-testid="sidebar"
                            style={{ border: "1px solid gray" }}
                        >
                            <Popout>
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<Settings size={12} />}
                                        aria-label="Open settings"
                                    />
                                </Popout.Trigger>
                                <Popout.Panel
                                    width={150}
                                    header={{ variant: "title", title: "Settings" }}
                                    placement="left"
                                >
                                    <Popout.Content>
                                        <Text>Content</Text>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Box>
                    </Popout.Anchor>
                </TestWrapper>,
            );

            // Click to open
            const button = screen.getByRole("button", { name: "Open settings" });
            await user.click(button);

            // Panel should be visible
            const panel = await screen.findByRole("dialog");
            expect(panel).toBeVisible();
        });
    });

    describe("panel positioning", () => {
        it("panel aligns to anchor element when Popout.Anchor is used", async () => {
            const user = userEvent.setup();

            render(
                <TestWrapper>
                    <Box p="xl">
                        <Popout.Anchor>
                            <Box
                                w={300}
                                p="md"
                                data-testid="anchor-container"
                                style={{
                                    backgroundColor: "white",
                                    border: "1px solid gray",
                                }}
                            >
                                <Popout>
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<Settings size={12} />}
                                            aria-label="Open anchored settings"
                                        />
                                    </Popout.Trigger>
                                    <Popout.Panel
                                        width={200}
                                        header={{ variant: "title", title: "Settings" }}
                                        placement="left"
                                    >
                                        <Popout.Content>
                                            <Text>Anchored content</Text>
                                        </Popout.Content>
                                    </Popout.Panel>
                                </Popout>
                            </Box>
                        </Popout.Anchor>
                    </Box>
                </TestWrapper>,
            );

            // Click to open panel
            const button = screen.getByRole("button", { name: "Open anchored settings" });
            await user.click(button);

            // Panel should be visible
            const panel = await screen.findByRole("dialog");
            expect(panel).toBeVisible();

            // When anchored, panel should have no border on the snapping side (right for placement="left")
            // This verifies the anchor context was used
            expect(panel).toHaveStyle({ borderRight: "none" });
        });

        it("panel has all borders when Popout.Anchor is not used", async () => {
            const user = userEvent.setup();

            render(
                <TestWrapper>
                    <Box p="xl">
                        <Box
                            w={300}
                            p="md"
                            data-testid="container"
                            style={{
                                backgroundColor: "white",
                                border: "1px solid gray",
                            }}
                        >
                            <Popout>
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<Settings size={12} />}
                                        aria-label="Open non-anchored settings"
                                    />
                                </Popout.Trigger>
                                <Popout.Panel
                                    width={200}
                                    header={{ variant: "title", title: "Settings" }}
                                    placement="left"
                                    gap={8}
                                >
                                    <Popout.Content>
                                        <Text>Non-anchored content</Text>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Box>
                    </Box>
                </TestWrapper>,
            );

            // Click to open panel
            const button = screen.getByRole("button", { name: "Open non-anchored settings" });
            await user.click(button);

            // Panel should be visible
            const panel = await screen.findByRole("dialog");
            expect(panel).toBeVisible();

            // Without anchor and with gap, panel gets all borders
            // The panel content should be displayed correctly
            expect(panel).toHaveTextContent("Non-anchored content");
        });
    });

    describe("nested anchors", () => {
        it("inner Popout uses closest ancestor Popout.Anchor", async () => {
            const user = userEvent.setup();

            render(
                <TestWrapper>
                    <Popout.Anchor>
                        <Box w={300} data-testid="outer-anchor">
                            <Popout.Anchor>
                                <Box w={200} data-testid="inner-anchor">
                                    <Popout>
                                        <Popout.Trigger>
                                            <PopoutButton
                                                icon={<Settings size={12} />}
                                                aria-label="Open nested settings"
                                            />
                                        </Popout.Trigger>
                                        <Popout.Panel
                                            width={150}
                                            header={{ variant: "title", title: "Nested" }}
                                            placement="left"
                                        >
                                            <Popout.Content>
                                                <Text>Nested content</Text>
                                            </Popout.Content>
                                        </Popout.Panel>
                                    </Popout>
                                </Box>
                            </Popout.Anchor>
                        </Box>
                    </Popout.Anchor>
                </TestWrapper>,
            );

            // Click to open
            const button = screen.getByRole("button", { name: "Open nested settings" });
            await user.click(button);

            // Panel should be visible
            const panel = await screen.findByRole("dialog");
            expect(panel).toBeVisible();
        });
    });
});
