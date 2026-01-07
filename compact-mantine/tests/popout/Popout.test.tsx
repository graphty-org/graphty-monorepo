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

describe("Popout", () => {
    it("renders trigger element", () => {
        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Test" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    });

    it("opens panel when trigger is clicked", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Test Panel" }}>
                    <Popout.Content>Panel content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        // Panel should not be visible initially
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

        // Click the trigger
        await user.click(screen.getByRole("button", { name: "Open" }));

        // Panel should now be visible
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
        expect(screen.getByText("Panel content")).toBeInTheDocument();
    });

    it("closes panel when close button is clicked", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Test Panel" }}>
                    <Popout.Content>Panel content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        // Open the panel
        await user.click(screen.getByRole("button", { name: "Open" }));
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Click the close button
        await user.click(screen.getByLabelText("Close panel"));

        // Panel should be closed
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });

    it("renders with specified width", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={320} header={{ variant: "title", title: "Wide Panel" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));

        await waitFor(() => {
            const panel = screen.getByRole("dialog");
            expect(panel).toHaveStyle({ width: "320px" });
        });
    });

    it("displays header title", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Open</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Settings" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        await user.click(screen.getByRole("button", { name: "Open" }));

        await waitFor(() => {
            expect(screen.getByText("Settings")).toBeInTheDocument();
        });
    });

    it("toggles panel on repeated trigger clicks", async () => {
        const user = userEvent.setup();

        renderPopout(
            <Popout>
                <Popout.Trigger>
                    <button>Toggle</button>
                </Popout.Trigger>
                <Popout.Panel width={280} header={{ variant: "title", title: "Toggle Panel" }}>
                    <Popout.Content>Content</Popout.Content>
                </Popout.Panel>
            </Popout>,
        );

        const trigger = screen.getByRole("button", { name: "Toggle" });

        // Open
        await user.click(trigger);
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Close by clicking trigger again
        await user.click(trigger);
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        // Open again
        await user.click(trigger);
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });
    });
});
