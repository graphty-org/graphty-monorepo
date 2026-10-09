/**
 * A themed Menu's keys, in a real browser: the Escape that closes it is used up there, so a page
 * shortcut on Escape skips it; and a disabled row -- focusable so it can show its reason -- never
 * takes the highlight, nor the first focus when the menu opens.
 */
import { Button, Menu } from "@mantine/core";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

function ActionsMenu(): React.JSX.Element {
    return (
        <Menu>
            <Menu.Target>
                <Button variant="default">Selection actions</Button>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item aria-disabled data-disabled closeMenuOnClick={false}>
                    Neighborhood
                </Menu.Item>
                <Menu.Item>Frame selection</Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}

const TRANSPARENT = "rgba(0, 0, 0, 0)";

describe("Menu keys", () => {
    it("marks the Escape that closes the menu, so a window-level Escape shortcut skips it", async () => {
        const seen: boolean[] = [];
        const onKey = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                seen.push(event.defaultPrevented);
            }
        };
        globalThis.addEventListener("keydown", onKey);
        try {
            await renderThemed(<ActionsMenu />);
            await userEvent.click(screen.getByRole("button", { name: "Selection actions" }));
            await screen.findByRole("menu");
            await userEvent.keyboard("{Escape}");
            await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
            // The menu is shut: the next Escape is the page's.
            await userEvent.keyboard("{Escape}");
            expect(seen).toEqual([true, false]);
        } finally {
            globalThis.removeEventListener("keydown", onKey);
        }
    });

    it("opens with the first enabled row focused and the disabled first row never highlighted", async () => {
        await renderThemed(<ActionsMenu />);
        await userEvent.click(screen.getByRole("button", { name: "Selection actions" }));
        const disabled = await screen.findByRole("menuitem", { name: "Neighborhood" });
        await waitFor(() => expect(screen.getByRole("menuitem", { name: "Frame selection" })).toHaveFocus());
        expect(getComputedStyle(disabled, "::before").backgroundColor).toBe(TRANSPARENT);
        // Focused on purpose (a click, to read its reason) or hovered, it still takes no fill.
        disabled.focus();
        await userEvent.hover(disabled);
        expect(disabled).toHaveFocus();
        expect(getComputedStyle(disabled, "::before").backgroundColor).toBe(TRANSPARENT);
    });
});
