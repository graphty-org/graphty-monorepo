/**
 * The panel's position is measured from the box it renders at, not from its declared width.
 * The sidebar and the panel are laid out for real: the sidebar is a fixed 200px strip whose left
 * edge is at 800, and the panel's content is wider than its declared width.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

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
        await page.viewport(1024, 768);

        renderPopout(
            <PopoutAnchor>
                <div data-testid="sidebar" style={{ position: "fixed", left: 800, top: 0, width: 200, height: 600 }}>
                    <Popout>
                        <Popout.Trigger>
                            <button>Open Panel</button>
                        </Popout.Trigger>
                        <Popout.Panel width={280} header={{ variant: "title", title: "Wide" }}>
                            <Popout.Content>
                                <span data-testid="panel-content" style={{ display: "inline-block", width: 400 }}>
                                    Content
                                </span>
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
        // 800 less the rendered width rather than 800 - 280: the right edge
        // of the rendered box meets the sidebar instead of overlapping it.
        const rendered = panel.getBoundingClientRect().width;
        expect(rendered).toBeGreaterThan(280);
        expect(panel.style.left).toBe(`${800 - rendered}px`);
        // And the panel is still free to grow: the declared width is a
        // minimum and the panel sizes to its content above it.
        expect(panel.style.minWidth).toBe("280px");
        expect(panel.style.width).toBe("min-content");
    });
});
