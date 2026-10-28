/**
 * The panel's position is measured from the box it renders at, not from its declared width.
 * The boxes are stubbed (jsdom has no layout), so the measurement is exact; the drawn geometry
 * is covered with real layout in Popout.browser.test.tsx.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Popout, PopoutAnchor, PopoutManager } from "../../src/components/popout";
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
 * Positioning from the declared width let a 280px panel that rendered 337px
 * wide grow 57px over the sidebar it was anchored to and cover the row that
 * opened it.
 */
describe("Issue: Popout panel must use minWidth for flexible sizing", () => {
    it("positions a panel that grew past its width from the box it renders at", async () => {
        const user = userEvent.setup();
        const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

        // A panel whose content forces it to 337px, anchored to a sidebar
        // whose left edge is at 800.
        Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
            if (this.getAttribute("role") === "dialog") {
                return {
                    x: 0,
                    y: 0,
                    left: 0,
                    top: 0,
                    right: 337,
                    bottom: 200,
                    width: 337,
                    height: 200,
                    toJSON: () => ({}),
                } as DOMRect;
            }
            if (this.getAttribute("data-testid") === "sidebar") {
                return {
                    x: 800,
                    y: 0,
                    left: 800,
                    top: 0,
                    right: 1000,
                    bottom: 600,
                    width: 200,
                    height: 600,
                    toJSON: () => ({}),
                } as DOMRect;
            }
            return {
                x: 0,
                y: 0,
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                width: 0,
                height: 0,
                toJSON: () => ({}),
            } as DOMRect;
        };

        try {
            renderPopout(
                <PopoutAnchor>
                    <div data-testid="sidebar">
                        <Popout>
                            <Popout.Trigger>
                                <button>Open Panel</button>
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

            await user.click(screen.getByRole("button", { name: "Open Panel" }));
            await waitFor(() => {
                expect(screen.getByTestId("panel-content")).toBeInTheDocument();
            });

            const panel = screen.getByRole("dialog");
            // 800 - 337 rather than 800 - 280: the right edge of the rendered
            // box meets the sidebar instead of overlapping it by 57px.
            expect(panel.style.left).toBe("463px");
            // And the panel is still free to grow: the declared width is a
            // minimum and the panel sizes to its content above it.
            expect(panel.style.minWidth).toBe("280px");
            expect(panel.style.width).toBe("min-content");
        } finally {
            Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
        }
    });
});
