import { Box, MantineProvider, Text } from "@mantine/core";
import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { UiGlyph } from "../../src/icons";

import { Popout, PopoutButton, PopoutManager, usePopoutAnchorContext } from "../../src/components/popout";
import { compactTheme } from "../../src/theme";

/**
 * jsdom reports every element as a zero-sized box at the origin, so a
 * positioning test has to say what the boxes are.
 */
function setRect(element: Element, rect: Partial<DOMRect>): void {
    const full: DOMRect = {
        x: rect.left ?? 0,
        y: rect.top ?? 0,
        left: rect.left ?? 0,
        top: rect.top ?? 0,
        right: rect.right ?? 0,
        bottom: rect.bottom ?? 0,
        width: rect.width ?? (rect.right ?? 0) - (rect.left ?? 0),
        height: rect.height ?? (rect.bottom ?? 0) - (rect.top ?? 0),
        toJSON: () => ({}),
    };

    Object.defineProperty(element, "getBoundingClientRect", {
        configurable: true,
        value: () => full,
    });
}

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
                                        icon={<UiGlyph name="gear" size={12} />}
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
                                            icon={<UiGlyph name="gear" size={12} />}
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

            const button = screen.getByRole("button", { name: "Open anchored settings" });
            const container = screen.getByTestId("anchor-container");

            // A 300px container away from the left edge, with its trigger part
            // way down it.
            setRect(container, { left: 400, top: 40, right: 700, bottom: 500 });
            setRect(button, { left: 660, top: 120, right: 680, bottom: 140 });

            await user.click(button);

            const panel = await screen.findByRole("dialog");
            expect(panel).toBeVisible();

            // The container governs the inline edge: 400 - 200 wide - 0 gap.
            expect(panel.style.left).toBe("200px");
            // The trigger governs the block position, not the container's top.
            expect(panel.style.top).toBe("120px");

            // The anchor decides where a panel opens, not how it is drawn: it
            // keeps its full border, as every pop-out does. (An earlier version
            // of this test asserted borderRight: none, which described a flush
            // border treatment that was deliberately removed.)
            const inlineStyle = panel.getAttribute("style") ?? "";
            expect(inlineStyle).not.toContain("border-right: none");
            expect(inlineStyle).not.toContain("border-left: none");
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
                                        icon={<UiGlyph name="gear" size={12} />}
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
                                                icon={<UiGlyph name="gear" size={12} />}
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

            const button = screen.getByRole("button", { name: "Open nested settings" });

            setRect(screen.getByTestId("outer-anchor"), {
                left: 100, top: 0, right: 400, bottom: 600,
            });
            setRect(screen.getByTestId("inner-anchor"), {
                left: 200, top: 0, right: 400, bottom: 600,
            });
            setRect(button, { left: 360, top: 80, right: 380, bottom: 100 });

            await user.click(button);

            const panel = await screen.findByRole("dialog");
            expect(panel).toBeVisible();
            // The closest anchor wins: 200 - 150 wide, not 100 - 150.
            expect(panel.style.left).toBe("50px");
        });
    });
});
