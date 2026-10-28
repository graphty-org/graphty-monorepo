/**
 * Where focus goes when a themed Menu closes, in a real browser: a dialog opened from a row keeps
 * the focus it took, and gives it back to the menu's button when it closes; Escape returns focus
 * to the button.
 */
import { Button, Menu, Modal, Tooltip } from "@mantine/core";
import { screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

function MenuWithDialog({ tooltip = false }: Readonly<{ tooltip?: boolean }>): React.JSX.Element {
    const [opened, setOpened] = useState(false);
    const button = <Button variant="default">Main menu</Button>;
    return (
        <>
            <Menu>
                <Menu.Target>{tooltip ? <Tooltip label="Open, save, export">{button}</Tooltip> : button}</Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item>Undo</Menu.Item>
                    <Menu.Item
                        onClick={() => {
                            setOpened(true);
                        }}
                    >
                        Export...
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
            <Modal
                opened={opened}
                onClose={() => {
                    setOpened(false);
                }}
                title="Export"
            >
                <Button
                    variant="default"
                    onClick={() => {
                        setOpened(false);
                    }}
                >
                    Cancel
                </Button>
            </Modal>
        </>
    );
}

/** Wait past Mantine's 10 ms focus return, so a late refocus would have happened. */
async function settle(): Promise<void> {
    // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
    await new Promise((resolve) => setTimeout(resolve, 100));
}

describe("Menu focus return", () => {
    it.each([
        ["", false],
        [" (button inside a Tooltip)", true],
    ])("a dialog opened from a row keeps focus, and Cancel gives it back to the menu button%s", async (_, tooltip) => {
        await renderThemed(<MenuWithDialog tooltip={tooltip} />);
        const trigger = screen.getByRole("button", { name: "Main menu" });
        trigger.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => expect(screen.getByRole("menuitem", { name: "Undo" })).toHaveFocus());
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => expect(screen.getByRole("menuitem", { name: "Export..." })).toHaveFocus());
        await userEvent.keyboard("{Enter}");
        const dialog = await screen.findByRole("dialog");
        await settle();
        expect(dialog.contains(document.activeElement)).toBe(true);

        screen.getByRole("button", { name: "Cancel" }).click();
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        await settle();
        expect(trigger).toHaveFocus();
    });

    it("Escape on the open menu returns focus to the menu button", async () => {
        await renderThemed(<MenuWithDialog />);
        const trigger = screen.getByRole("button", { name: "Main menu" });
        trigger.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => expect(screen.getByRole("menuitem", { name: "Undo" })).toHaveFocus());
        await userEvent.keyboard("{Escape}");
        await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
        await settle();
        expect(trigger).toHaveFocus();
    });
});
