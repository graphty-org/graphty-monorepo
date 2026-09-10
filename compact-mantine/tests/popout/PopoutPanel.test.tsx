import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Popout, PopoutAnchor, PopoutManager } from "../../src/components/popout";
import { POPOUT_NESTED_GAP } from "../../src/constants/popout";
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

/**
 * jsdom reports every element as a zero-sized box at the origin, so a
 * positioning test has to say what the boxes are. This replaces one element's
 * measurement with a fixed rectangle.
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

const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

afterEach(() => {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    vi.restoreAllMocks();
});

describe("PopoutPanel positioning", () => {
    it("panel position is calculated based on anchor element", async () => {
        const user = userEvent.setup();

        renderPopout(
            <div style={{ padding: 200 }}>
                <PopoutAnchor>
                    <div style={{ position: "absolute", left: 100, top: 100, width: 200 }}>
                        <Popout>
                            <Popout.Trigger>
                                <button>Open</button>
                            </Popout.Trigger>
                            <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                                <Popout.Content>
                                    <span data-testid="panel-content">Content</span>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </div>
                </PopoutAnchor>
            </div>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByTestId("panel-content")).toBeInTheDocument();
        });

        // Panel should have position styles set
        const panel = screen.getByRole("dialog");
        expect(panel.style.position).toBe("fixed");
        expect(panel.style.left).toBeDefined();
        expect(panel.style.top).toBeDefined();
    });

    it("panel without anchor uses trigger for positioning", async () => {
        const user = userEvent.setup();

        renderPopout(
            <div style={{ padding: 200 }}>
                <Popout>
                    <Popout.Trigger>
                        <button style={{ position: "absolute", left: 100, top: 100 }}>Open</button>
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                        <Popout.Content>
                            <span data-testid="panel-content">Content</span>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </div>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByTestId("panel-content")).toBeInTheDocument();
        });

        // Panel should have position styles set
        const panel = screen.getByRole("dialog");
        expect(panel.style.position).toBe("fixed");
        expect(panel.style.left).toBeDefined();
        expect(panel.style.top).toBeDefined();
    });

    it("takes its inline edge from the container anchor and its top from the trigger", async () => {
        const user = userEvent.setup();

        renderPopout(
            <PopoutAnchor>
                <div data-testid="sidebar">
                    <Popout>
                        <Popout.Trigger>
                            <button>Open</button>
                        </Popout.Trigger>
                        <Popout.Panel width={280} header={{ variant: "title", title: "Test" }}>
                            <Popout.Content>
                                <span data-testid="panel-content">Content</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </div>
            </PopoutAnchor>,
        );

        // A 200px sidebar down the right of a 1000px viewport, with the trigger
        // 200px down it.
        setRect(screen.getByTestId("sidebar"), { left: 800, top: 0, right: 1000, bottom: 600 });
        setRect(screen.getByRole("button", { name: "Open" }), {
            left: 960, top: 200, right: 980, bottom: 220,
        });

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByTestId("panel-content")).toBeInTheDocument();
        });

        const panel = screen.getByRole("dialog");
        // Inline edge: against the sidebar, not the button.
        expect(panel.style.left).toBe("520px");
        // Block position: level with the button, not with the top of the sidebar.
        expect(panel.style.top).toBe("200px");
    });

    it("lines a nested panel up with the panel it opened from, not with the container anchor", async () => {
        const user = userEvent.setup();

        renderPopout(
            <PopoutAnchor>
                <div data-testid="sidebar">
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
                                    <Popout.Panel
                                        width={200}
                                        header={{ variant: "title", title: "Child" }}
                                    >
                                        <Popout.Content>
                                            <span data-testid="child-content">Child</span>
                                        </Popout.Content>
                                    </Popout.Panel>
                                </Popout>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </div>
            </PopoutAnchor>,
        );

        setRect(screen.getByTestId("sidebar"), { left: 800, top: 0, right: 1000, bottom: 600 });
        setRect(screen.getByRole("button", { name: "Open Parent" }), {
            left: 960, top: 100, right: 980, bottom: 120,
        });

        await user.click(screen.getByRole("button", { name: "Open Parent" }));
        const parentPanel = await screen.findByRole("dialog");
        expect(parentPanel.style.left).toBe("520px");

        // The parent panel's own box, which the child must line up with.
        setRect(parentPanel, { left: 520, top: 100, right: 800, bottom: 400 });
        setRect(screen.getByRole("button", { name: "Open Child" }), {
            left: 540, top: 260, right: 700, bottom: 280,
        });

        await user.click(screen.getByRole("button", { name: "Open Child" }));
        await waitFor(() => {
            expect(screen.getByTestId("child-content")).toBeInTheDocument();
        });

        const childPanel = screen
            .getAllByRole("dialog")
            .find((panel) => panel.querySelector('[data-testid="child-content"]'));
        expect(childPanel).toBeDefined();

        // Stepped out from the parent panel by the nested gap: 520 - 200 - 4.
        expect(childPanel?.style.left).toBe(`${520 - 200 - POPOUT_NESTED_GAP}px`);
        // And level with the row inside the parent that opened it.
        expect(childPanel?.style.top).toBe("260px");
    });

    it("positions the panel from the box it renders at, not from the width it asked for", async () => {
        const user = userEvent.setup();

        // A panel whose content forces it wider than its declared width. Before
        // this was measured, `left` came from the declared width and the extra
        // width grew over the anchor, covering the row that opened it.
        Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
            if (this.getAttribute("role") === "dialog") {
                return {
                    x: 0, y: 0, left: 0, top: 0, right: 337, bottom: 200, width: 337, height: 200,
                    toJSON: () => ({}),
                } as DOMRect;
            }
            return {
                x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0,
                toJSON: () => ({}),
            } as DOMRect;
        };

        renderPopout(
            <PopoutAnchor>
                <div data-testid="sidebar">
                    <Popout>
                        <Popout.Trigger>
                            <button>Open</button>
                        </Popout.Trigger>
                        <Popout.Panel width={280} header={{ variant: "title", title: "Wide" }}>
                            <Popout.Content>
                                <span data-testid="panel-content">Content</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </div>
            </PopoutAnchor>,
        );

        setRect(screen.getByTestId("sidebar"), { left: 800, top: 0, right: 1000, bottom: 600 });

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByTestId("panel-content")).toBeInTheDocument();
        });

        const panel = screen.getByRole("dialog");
        // 800 - 337, not 800 - 280: the panel's right edge still meets the
        // sidebar rather than overlapping it by the 57px it grew.
        expect(panel.style.left).toBe("463px");
        // The declared width stays a minimum, so content can still widen it.
        expect(panel.style.minWidth).toBe("280px");
    });

    it("comes back at the anchor's new place after being closed and reopened", async () => {
        const user = userEvent.setup();

        renderPopout(
            <PopoutAnchor>
                <div data-testid="sidebar">
                    <Popout>
                        <Popout.Trigger>
                            <button>Open</button>
                        </Popout.Trigger>
                        <Popout.Panel width={280} header={{ variant: "title", title: "Test" }}>
                            <Popout.Content>
                                <span data-testid="panel-content">Content</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </div>
            </PopoutAnchor>,
        );

        const sidebar = screen.getByTestId("sidebar");
        setRect(sidebar, { left: 800, top: 0, right: 1000, bottom: 600 });

        await user.click(screen.getByRole("button", { name: "Open" }));
        expect((await screen.findByRole("dialog")).style.left).toBe("520px");

        await user.click(screen.getByLabelText("Close panel"));
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        // The sidebar moves while the panel is closed, as it would if the
        // window were resized.
        setRect(sidebar, { left: 600, top: 0, right: 800, bottom: 600 });

        await user.click(screen.getByRole("button", { name: "Open" }));
        const reopened = await screen.findByRole("dialog");
        // Reopens measured against where the sidebar is now. The stale position
        // from last time is cleared on close rather than painted for a frame.
        expect(reopened.style.left).toBe("320px");
    });
});

describe("PopoutPanel focus", () => {
    it("does not take focus when a closed pop-out is rendered", async () => {
        renderPopout(
            <div>
                <button data-testid="elsewhere">Elsewhere</button>
                <Popout>
                    <Popout.Trigger>
                        <button>Open A</button>
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "A" }}>
                        <Popout.Content>A</Popout.Content>
                    </Popout.Panel>
                </Popout>
                <Popout>
                    <Popout.Trigger>
                        <button>Open B</button>
                    </Popout.Trigger>
                    <Popout.Panel width={200} header={{ variant: "title", title: "B" }}>
                        <Popout.Content>B</Popout.Content>
                    </Popout.Panel>
                </Popout>
            </div>,
        );

        const elsewhere = screen.getByTestId("elsewhere");
        elsewhere.focus();
        expect(document.activeElement).toBe(elsewhere);

        // Every closed panel used to focus its own trigger on first render, so
        // the last pop-out on the page stole the focus from whatever had it.
        await waitFor(() => {
            expect(document.activeElement).toBe(elsewhere);
        });
    });

    it("leaves focus alone when manageFocus is off", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={200} label="Explanation" manageFocus={false}>
                    <span data-testid="panel-content">Content</span>
                </Popout.Panel>
            </Popout>,
        );

        const trigger = screen.getByRole("button", { name: "Open" });
        await user.click(trigger);
        await waitFor(() => {
            expect(screen.getByTestId("panel-content")).toBeInTheDocument();
        });

        expect(document.activeElement).toBe(trigger);
    });

    it("does not suppress the focus indicator", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        const panel = await screen.findByRole("dialog");

        // The theme draws the library's only focus indicator; the panel must
        // not set outline: none over the top of it.
        expect(panel.style.outline).toBe("");
    });
});

describe("PopoutPanel without a header", () => {
    it("takes its accessible name from the label prop", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={200} label="About resolution">
                    <span data-testid="panel-content">An explanation</span>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));

        const panel = await screen.findByRole("dialog", { name: "About resolution" });
        expect(panel).toBeInTheDocument();
        // No header means no title bar, so no close button and nothing to drag.
        expect(screen.queryByLabelText("Close panel")).not.toBeInTheDocument();
        expect(panel.querySelector("[data-drag-trigger]")).toBeNull();
    });
});

describe("Popout controlled mode", () => {
    it("opens and closes from the consumer's own state", async () => {
        const user = userEvent.setup();

        function Controlled(): React.JSX.Element {
            const [opened, setOpened] = useState(false);
            return (
                <div>
                    <button
                        data-testid="external-open"
                        onClick={() => {
                            setOpened(true);
                        }}
                    >
                        Open from outside
                    </button>
                    <button
                        data-testid="external-close"
                        onClick={() => {
                            setOpened(false);
                        }}
                    >
                        Close from outside
                    </button>
                    <Popout opened={opened} onOpenChange={setOpened}>
                        <Popout.Trigger>
                            <button>Open</button>
                        </Popout.Trigger>
                        <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                            <Popout.Content>
                                <span data-testid="panel-content">Content</span>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </div>
            );
        }

        renderPopout(<Controlled />);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        await user.click(screen.getByTestId("external-open"));
        await waitFor(() => {
            expect(screen.getByTestId("panel-content")).toBeInTheDocument();
        });

        await user.click(screen.getByTestId("external-close"));
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });

    it("reports every open and close through onOpenChange", async () => {
        const user = userEvent.setup();
        const onOpenChange = vi.fn();

        renderPopout(
            <Popout onOpenChange={onOpenChange}>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
        // Read the recorded arguments rather than matching on them: the second
        // one is a React event, and a failed deep match on it would try to
        // serialise half the DOM.
        expect(onOpenChange.mock.calls.at(-1)?.[0]).toBe(true);
        expect(onOpenChange.mock.calls.at(-1)?.[1]).toBeDefined();

        await user.keyboard("{Escape}");
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
        // Closing from the Escape key carries no event, so the handler is
        // called with the new state alone.
        expect(onOpenChange.mock.calls.at(-1)?.[0]).toBe(false);
        expect(onOpenChange.mock.calls.at(-1)).toHaveLength(1);
    });

    it("starts open when defaultOpened is set, and still closes on its own", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout defaultOpened>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                    <Popout.Content>
                        <span data-testid="panel-content">Content</span>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await waitFor(() => {
            expect(screen.getByTestId("panel-content")).toBeInTheDocument();
        });

        await user.click(screen.getByLabelText("Close panel"));
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });

    it("stays open when a controlled consumer ignores the close", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout opened onOpenChange={() => undefined}>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={200} header={{ variant: "title", title: "Test" }}>
                    <Popout.Content>
                        <span data-testid="panel-content">Content</span>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await waitFor(() => {
            expect(screen.getByTestId("panel-content")).toBeInTheDocument();
        });

        await user.keyboard("{Escape}");

        // The consumer owns the state: nothing closes behind their back.
        expect(screen.getByTestId("panel-content")).toBeInTheDocument();
    });
});
