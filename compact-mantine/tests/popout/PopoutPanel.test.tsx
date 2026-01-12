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

describe("PopoutPanel", () => {
    describe("useEffect dependencies (Issue #8)", () => {
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
    });
});
