import { ActionIcon, MantineProvider, Tooltip } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { Popout, PopoutManager } from "../../src/components/popout";
import { compactTheme } from "../../src/theme";

/**
 * A pop-out holding one icon button with a tooltip, as a field's Reset is.
 */
function renderWithTooltip(): void {
    render(
        <MantineProvider theme={compactTheme}>
            <PopoutManager>
                <Popout>
                    <Popout.Trigger>
                        <button type="button">Open</button>
                    </Popout.Trigger>
                    <Popout.Panel width={240} header={{ variant: "title", title: "Settings" }}>
                        <Popout.Content>
                            <Tooltip label="Reset size">
                                <ActionIcon aria-label="Reset size">R</ActionIcon>
                            </Tooltip>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </PopoutManager>
        </MantineProvider>,
    );
}

describe("Escape in a pop-out (browser)", () => {
    it("closes the pop-out from a control whose tooltip is open: the tooltip does not use the Escape up", async () => {
        const user = userEvent.setup();
        renderWithTooltip();
        await user.click(screen.getByRole("button", { name: "Open" }));
        const reset = await screen.findByRole("button", { name: "Reset size" });
        // Reach it from the keyboard: the tooltip opens for focus a key moved, and the click that
        // opened the pop-out was a pointer, so focus a script put there would not open it.
        for (let presses = 0; presses < 5 && document.activeElement !== reset; presses++) {
            await user.tab();
        }
        expect(reset).toHaveFocus();
        // Mantine names the tooltip on its trigger while it is open.
        await waitFor(() => {
            expect(reset.getAttribute("aria-describedby")).toBeTruthy();
        });
        await user.keyboard("{Escape}");
        await waitFor(() => {
            expect(screen.queryByRole("dialog", { name: "Settings" })).toBeNull();
        });
    });
});
