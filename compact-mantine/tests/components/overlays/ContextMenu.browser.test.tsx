/**
 * ContextMenu opened by a touch held still, driven by a real finger and a real mouse through the
 * DevTools protocol: the browser makes the pointer and touch events, the implicit capture and the
 * click after a lift, as a touch screen does.
 */
import { MantineProvider, Menu } from "@mantine/core";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { compactTheme } from "../../../src";
import { ContextMenu } from "../../../src/components/overlays/ContextMenu";
import { press, release } from "../../harness/mouse";
import { tap, touchEnd, touchMoveBy, touchStart } from "../../harness/touch";

/**
 * A target with a context menu, inside the compact theme.
 * @param onClick - Called when the target is clicked
 * @param onRename - Called when the menu's row is chosen
 * @returns The target element
 */
function renderMenu(onClick = vi.fn(), onRename = vi.fn()): HTMLElement {
    render(
        <MantineProvider theme={compactTheme}>
            <ContextMenu
                target={
                    <button type="button" data-testid="target" onClick={onClick} style={{ width: 200, height: 100 }}>
                        Target
                    </button>
                }
            >
                <Menu.Item onClick={onRename}>Rename</Menu.Item>
            </ContextMenu>
        </MantineProvider>,
    );
    return screen.getByTestId("target");
}

/**
 * A target holding a canvas that prevents the pointerdown's and contextmenu's defaults for its own
 * reasons, as a 3D engine does so a drag selects no page text.
 * @returns The canvas
 */
function renderCanvasMenu(): HTMLElement {
    render(
        <MantineProvider theme={compactTheme}>
            <ContextMenu
                target={
                    <div data-testid="target">
                        <canvas data-testid="canvas" width={200} height={100} />
                    </div>
                }
            >
                <Menu.Item>Fit</Menu.Item>
            </ContextMenu>
        </MantineProvider>,
    );
    const canvas = screen.getByTestId("canvas");
    canvas.addEventListener("pointerdown", (event) => {
        event.preventDefault();
    });
    canvas.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });
    return canvas;
}

/** Every open context menu. */
function menus(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(".mantine-Menu-dropdown"));
}

/**
 * Step the fake clock, rendering what the timers it fires changed.
 * @param ms - how far
 */
function advance(ms: number): void {
    act(() => {
        vi.advanceTimersByTime(ms);
    });
}

/**
 * Send real input and render everything it changed before going on, so a check that something
 * did not happen sees the page after the input.
 * @param input - the input to send
 */
async function settled(input: () => Promise<void>): Promise<void> {
    await act(input);
}

describe("ContextMenu touch-and-hold", () => {
    // The hold runs on setTimeout, which only the test moves, so a hold is stepped to the
    // millisecond however long the input takes to arrive. The menu's other timers are steps of
    // the same clock; nothing here waits on them.
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    });

    afterEach(async () => {
        await touchEnd();
        await release();
        cleanup();
        vi.useRealTimers();
    });

    it("opens the menu when a touch is held for 500 ms", async () => {
        const target = renderMenu();
        await touchStart(target);
        expect(target.style.getPropertyValue("user-select")).toBe("none");
        advance(499);
        expect(menus()).toHaveLength(0);
        advance(1);
        expect(menus()).toHaveLength(1);
        // The press styles come off once the hold is decided.
        expect(target.style.getPropertyValue("user-select")).toBe("");
    });

    it("opens over a child that prevents the pointerdown's default for its own reasons", async () => {
        const canvas = renderCanvasMenu();
        await touchStart(canvas);
        advance(500);
        expect(menus()).toHaveLength(1);
    });

    it("does not open when the target's own handler claims the press", async () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ContextMenu
                    target={
                        <div
                            data-testid="target"
                            style={{ width: 200, height: 100 }}
                            onPointerDown={(event) => {
                                event.preventDefault();
                            }}
                        />
                    }
                >
                    <Menu.Item>Fit</Menu.Item>
                </ContextMenu>
            </MantineProvider>,
        );
        await touchStart(screen.getByTestId("target"));
        advance(600);
        expect(menus()).toHaveLength(0);
    });

    it("opens on a right-click over a child that prevents the browser's own menu", async () => {
        const canvas = renderCanvasMenu();
        await settled(() => userEvent.click(canvas, { button: "right" }));
        expect(menus()).toHaveLength(1);
    });

    it("does not open when the finger moves more than 8 px first", async () => {
        const target = renderMenu();
        await touchStart(target);
        await settled(() => touchMoveBy(20, 0));
        advance(600);
        expect(menus()).toHaveLength(0);
    });

    it("does not open for a mouse held down", async () => {
        const target = renderMenu();
        await press(target);
        advance(600);
        expect(menus()).toHaveLength(0);
    });

    it("still opens on a right-click", async () => {
        const target = renderMenu();
        await settled(() => userEvent.click(target, { button: "right" }));
        expect(menus()).toHaveLength(1);
    });

    it("ignores the browser's own long-press contextmenu event after the hold opened the menu", async () => {
        const target = renderMenu();
        await touchStart(target);
        advance(500);
        expect(menus()).toHaveLength(1);
        // A browser on a phone (Android Chrome) fires its own contextmenu for the same long press.
        // Desktop Chromium makes none from a touch, so this one event stands in for it.
        const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 100, clientY: 100 });
        act(() => {
            target.dispatchEvent(event);
        });
        expect(event.defaultPrevented).toBe(true);
        expect(menus()).toHaveLength(1);
    });

    it("swallows the click that ends the hold", async () => {
        const onClick = vi.fn();
        const target = renderMenu(onClick);
        await touchStart(target);
        advance(500);
        expect(menus()).toHaveLength(1);
        // Lifting the finger sends no click, and none of the compatibility mouse events that
        // would close the menu as a press outside it.
        await settled(touchEnd);
        expect(onClick).not.toHaveBeenCalled();
        expect(menus()).toHaveLength(1);
        // A later tap is a click again.
        await settled(() => tap(target));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("the lift that ends the press chooses nothing, and a fresh tap on the row chooses it", async () => {
        const onRename = vi.fn();
        const target = renderMenu(vi.fn(), onRename);
        await touchStart(target);
        advance(500);
        const item = screen.getByRole("menuitem", { name: "Rename" });

        // The menu opens just right of and above the finger. Once it has settled there, the finger
        // slides onto its row, less than the 8px that would make the hold a drag, and lifts there.
        const [x, y] = center(target);
        await vi.waitFor(() => {
            expect(item.contains(document.elementFromPoint(x + 5, y + 5))).toBe(true);
        });
        await settled(() => touchMoveBy(5, 5));
        await settled(touchEnd);
        expect(onRename).not.toHaveBeenCalled();
        expect(menus()).toHaveLength(1);

        await settled(() => tap(item));
        expect(onRename).toHaveBeenCalledTimes(1);
    });
});

/**
 * The center of an element.
 * @param element - the element
 * @returns the point's x and y
 */
function center(element: Element): [number, number] {
    const box = element.getBoundingClientRect();
    return [box.left + box.width / 2, box.top + box.height / 2];
}
