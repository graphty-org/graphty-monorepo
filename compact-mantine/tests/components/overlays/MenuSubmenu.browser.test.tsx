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
 * An open menu: New, the submenu row "Open recent" (-> "Alpha", "Beta"), the submenu row "Export"
 * (-> "PNG") and Close.
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
                <Menu.Sub>
                    <Menu.Sub.Target>
                        <Menu.Sub.Item>Export</Menu.Sub.Item>
                    </Menu.Sub.Target>
                    <Menu.Sub.Dropdown>
                        <Menu.Item>PNG</Menu.Item>
                    </Menu.Sub.Dropdown>
                </Menu.Sub>
                <Menu.Item>Close</Menu.Item>
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

/** The DevTools protocol session of the test's browser. */
function devtools(): { send: (method: string, params?: Record<string, unknown>) => Promise<unknown> } {
    return cdp() as unknown as { send: (method: string, params?: Record<string, unknown>) => Promise<unknown> };
}

/**
 * A point in the test page, in the coordinates of the browser window the protocol drives.
 * @param x - page x
 * @param y - page y
 * @returns the window point
 */
function windowPoint(x: number, y: number): { x: number; y: number } {
    const frame = window.frameElement;
    if (frame === null) {
        return { x, y };
    }
    const box = frame.getBoundingClientRect();
    const scale = box.width / window.innerWidth;
    return { x: box.left + frame.clientLeft * scale + x * scale, y: box.top + frame.clientTop * scale + y * scale };
}

/** Where the real mouse is, in page coordinates. */
let mouseAt = { x: 0, y: 0 };

/**
 * Move the real mouse in 2px steps, as a hand does, so it passes over everything on the way
 * (the gap between two menus included).
 * @param x - page x to end at
 * @param y - page y to end at
 */
async function mouseTo(x: number, y: number): Promise<void> {
    const steps = Math.max(1, Math.ceil(Math.hypot(x - mouseAt.x, y - mouseAt.y) / 2));
    const from = mouseAt;
    for (let i = 1; i <= steps; i++) {
        mouseAt = { x: from.x + ((x - from.x) * i) / steps, y: from.y + ((y - from.y) * i) / steps };
        await devtools().send("Input.dispatchMouseEvent", { type: "mouseMoved", ...windowPoint(mouseAt.x, mouseAt.y) });
    }
}

/**
 * Jump the real mouse to an element's center (the first move of a gesture).
 * @param element - where it lands
 */
async function mouseOnto(element: Element): Promise<void> {
    const rect = element.getBoundingClientRect();
    mouseAt = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    await devtools().send("Input.dispatchMouseEvent", { type: "mouseMoved", ...windowPoint(mouseAt.x, mouseAt.y) });
}

/** Click the real mouse where it is. */
async function mouseClick(): Promise<void> {
    const at = windowPoint(mouseAt.x, mouseAt.y);
    await devtools().send("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...at });
    await devtools().send("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...at });
}

/**
 * The open submenu of a row.
 * @param name - the submenu row's label
 * @returns its dropdown
 */
async function submenuOf(name: string): Promise<HTMLElement> {
    return waitFor(() => {
        const id = row(name)?.getAttribute("aria-controls");
        const dropdown = id ? document.getElementById(id) : null;
        expect(dropdown).not.toBeNull();
        return dropdown as HTMLElement;
    });
}

/**
 * Tap an element with one finger, through the DevTools protocol: a touch, with no hover first.
 * @param element - what the finger lands on
 */
async function tap(element: Element): Promise<void> {
    const rect = element.getBoundingClientRect();
    const { x, y } = windowPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const session = devtools();
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

describe("Menu.Sub under the real mouse (issue 4631)", () => {
    it("stays open while the mouse crosses the gap onto it, and runs the row clicked there", async () => {
        const onAlpha = vi.fn();
        await renderMenu(onAlpha);
        await mouseOnto(row("Open recent") as HTMLElement);
        const alpha = (await submenuOf("Open recent")).querySelector("[data-menu-item]") as HTMLElement;
        const target = alpha.getBoundingClientRect();
        // straight across, level with the row, through the 4px between the two menus
        await mouseTo(target.left + 12, mouseAt.y);
        await mouseClick();
        expect(onAlpha).toHaveBeenCalledOnce();
    });

    it("stays open when the mouse leaves both menus for empty space", async () => {
        const onAlpha = vi.fn();
        await renderMenu(onAlpha);
        await mouseOnto(row("Open recent") as HTMLElement);
        const sub = (await submenuOf("Open recent")).getBoundingClientRect();
        await mouseTo(sub.left + 12, mouseAt.y);
        await mouseTo(sub.right + 40, mouseAt.y);
        // back onto Alpha: still there to click
        await mouseTo(sub.left + 12, mouseAt.y);
        await mouseClick();
        expect(onAlpha).toHaveBeenCalledOnce();
    });

    it("closes at once when the mouse moves onto another row of the parent menu", async () => {
        await renderMenu();
        await mouseOnto(row("Open recent") as HTMLElement);
        const sub = (await submenuOf("Open recent")).getBoundingClientRect();
        await mouseTo(sub.left + 12, mouseAt.y);
        // out past the submenu's bottom, then back left onto Close in the parent
        const close = (row("Close") as HTMLElement).getBoundingClientRect();
        await mouseTo(sub.right + 20, close.top + close.height / 2);
        await mouseTo(close.left + 20, close.top + close.height / 2);
        await waitFor(() => {
            expect(expanded("Open recent")).toBe(false);
        });
        expect(expanded("File")).toBe(true);
    });

    it("moving onto another submenu row swaps the submenus", async () => {
        await renderMenu();
        await mouseOnto(row("Open recent") as HTMLElement);
        await submenuOf("Open recent");
        await mouseOnto(row("Export") as HTMLElement);
        await submenuOf("Export");
        await waitFor(() => {
            expect(expanded("Open recent")).toBe(false);
        });
        expect(row("Alpha")).toBeNull();
    });
});
