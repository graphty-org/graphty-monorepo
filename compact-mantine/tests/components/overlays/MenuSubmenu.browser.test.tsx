/**
 * A submenu row (Menu.Sub.Item) under a tap, a click and Enter, in a real browser: it opens its
 * submenu, keeps the menu open and puts focus on the submenu's first row, rather than running as
 * an action and closing the menu. A touch screen has no hover, so a tap is the only way in.
 */
import { Menu } from "@mantine/core";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";

import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

/**
 * An open menu with one plain row and one submenu row ("Open recent" -> "Alpha", "Beta").
 * @param onAlpha - called when the submenu's first row runs
 */
async function renderMenu(onAlpha = vi.fn()): Promise<void> {
    await renderThemed(
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
        </Menu>,
    );
    await screen.findByRole("menuitem", { name: "Open recent" });
}

/**
 * A row by its label.
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

/**
 * Tap an element with one finger, through the DevTools protocol: a touch, with no hover first.
 * @param element - what the finger lands on
 */
async function tap(element: Element): Promise<void> {
    const rect = element.getBoundingClientRect();
    let x = rect.left + rect.width / 2;
    let y = rect.top + rect.height / 2;
    const frame = window.frameElement;
    if (frame !== null) {
        const box = frame.getBoundingClientRect();
        const scale = box.width / window.innerWidth;
        x = box.left + frame.clientLeft * scale + x * scale;
        y = box.top + frame.clientTop * scale + y * scale;
    }
    const session = cdp() as unknown as {
        send: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
    };
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

describe("Menu.Sub.Item on a tap, a click and Enter", () => {
    it("opens the submenu on a tap, keeps the menu open and focuses the first row", async () => {
        await renderMenu();
        await tap(row("Open recent") as HTMLElement);
        await waitFor(() => {
            expect(document.activeElement).toBe(row("Alpha"));
        });
        expect(expanded("File")).toBe(true);
        expect(expanded("Open recent")).toBe(true);
    });

    it("opens the submenu on a click, keeps the menu open and focuses the first row", async () => {
        await renderMenu();
        await userEvent.click(row("Open recent") as HTMLElement);
        await waitFor(() => {
            expect(document.activeElement).toBe(row("Alpha"));
        });
        expect(expanded("File")).toBe(true);
        expect(expanded("Open recent")).toBe(true);
    });

    it("keeps the submenu open on a second click", async () => {
        await renderMenu();
        const sub = row("Open recent") as HTMLElement;
        await userEvent.click(sub);
        await waitFor(() => {
            expect(expanded("Open recent")).toBe(true);
        });
        await userEvent.click(sub);
        expect(expanded("File")).toBe(true);
        expect(expanded("Open recent")).toBe(true);
        expect(row("Alpha")).not.toBeNull();
    });

    it("runs a submenu row on click and closes the menu", async () => {
        const onAlpha = vi.fn();
        await renderMenu(onAlpha);
        await userEvent.click(row("Open recent") as HTMLElement);
        await userEvent.click(await screen.findByRole("menuitem", { name: "Alpha" }));
        expect(onAlpha).toHaveBeenCalledOnce();
        await waitFor(() => {
            expect(expanded("File")).toBe(false);
        });
        expect(row("New")).toBeNull();
    });

    it("opens on Enter with the first row focused", async () => {
        await renderMenu();
        const sub = row("Open recent") as HTMLElement;
        sub.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            expect(document.activeElement).toBe(row("Alpha"));
        });
        expect(expanded("File")).toBe(true);
    });
});
