import { MantineProvider, Menu } from "@mantine/core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";

/**
 * An open menu with one plain row and one submenu row ("Open recent" -> "Alpha", "Beta").
 * @param onAlpha - called when the submenu's first row runs
 */
function renderMenu(onAlpha = vi.fn()): void {
    render(
        <MantineProvider theme={compactTheme}>
            <Menu defaultOpened>
                <Menu.Target>
                    <button type="button">File</button>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item>New</Menu.Item>
                    <Menu.Sub>
                        <Menu.Sub.Target>
                            <Menu.Sub.Item>Open recent</Menu.Sub.Item>
                        </Menu.Sub.Target>
                        <Menu.Sub.Dropdown>
                            <Menu.Item onClick={onAlpha}>Alpha</Menu.Item>
                            <Menu.Item>Beta</Menu.Item>
                        </Menu.Sub.Dropdown>
                    </Menu.Sub>
                </Menu.Dropdown>
            </Menu>
        </MantineProvider>,
    );
}

/**
 * A row by its label. jsdom has no layout, so floating-ui's hide middleware leaves every dropdown
 * display: none; whether a menu is open is read from its trigger's aria-expanded instead.
 * @param name - the row's label
 * @returns the row, or null when its dropdown is not mounted
 */
function row(name: string): HTMLElement | null {
    return screen.queryByRole("menuitem", { name, hidden: true });
}

/**
 * Whether the dropdown a trigger controls is open.
 * @param name - the trigger's label
 * @returns its aria-expanded
 */
function expanded(name: string): boolean {
    return (
        screen
            .getByRole(name === "File" ? "button" : "menuitem", { name, hidden: true })
            .getAttribute("aria-expanded") === "true"
    );
}

/** Let Mantine's 16 ms focus timer run. */
async function settle(): Promise<void> {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
    });
}

describe("Menu.Sub.Item on a click (a tap: no hover)", () => {
    afterEach(cleanup);

    it("opens the submenu, keeps the menu open and focuses the first row", async () => {
        renderMenu();
        fireEvent.click(row("Open recent") as HTMLElement);
        await settle();
        expect(expanded("File")).toBe(true);
        expect(expanded("Open recent")).toBe(true);
        expect(document.activeElement).toBe(row("Alpha"));
    });

    it("keeps the submenu open on a second click", async () => {
        renderMenu();
        const sub = row("Open recent") as HTMLElement;
        fireEvent.click(sub);
        await settle();
        fireEvent.click(sub);
        await settle();
        expect(expanded("File")).toBe(true);
        expect(expanded("Open recent")).toBe(true);
        expect(row("Alpha")).not.toBeNull();
    });

    it("runs a submenu row on click and closes the menu", async () => {
        const onAlpha = vi.fn();
        renderMenu(onAlpha);
        fireEvent.click(row("Open recent") as HTMLElement);
        await settle();
        fireEvent.click(row("Alpha") as HTMLElement);
        await settle();
        expect(onAlpha).toHaveBeenCalledOnce();
        expect(expanded("File")).toBe(false);
        expect(row("New")).toBeNull();
    });

    it("opens on Enter with the first row focused", async () => {
        renderMenu();
        const sub = row("Open recent") as HTMLElement;
        sub.focus();
        // A button turns Enter into a click; jsdom does not, so send both as a browser would.
        fireEvent.keyDown(sub, { key: "Enter" });
        fireEvent.click(sub);
        await settle();
        expect(document.activeElement).toBe(row("Alpha"));
        expect(expanded("File")).toBe(true);
    });
});
