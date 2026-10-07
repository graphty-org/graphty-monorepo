import { MantineProvider, Menu } from "@mantine/core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { ContextMenu } from "../../../src/components/overlays/ContextMenu";

/**
 * A target with a context menu, inside the compact theme.
 * @param onClick - Called when the target is clicked
 * @returns The target element
 */
function renderMenu(onClick = vi.fn()): HTMLElement {
    render(
        <MantineProvider theme={compactTheme}>
            <ContextMenu
                target={
                    <button type="button" data-testid="target" onClick={onClick}>
                        Target
                    </button>
                }
            >
                <Menu.Item>Rename</Menu.Item>
            </ContextMenu>
        </MantineProvider>,
    );
    return screen.getByTestId("target");
}

/** Every open context menu. */
function menus(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(".mantine-Menu-dropdown"));
}

/**
 * Press the target with a finger at (100, 100).
 * @param target - The element pressed
 */
function touchDown(target: HTMLElement): void {
    fireEvent.pointerDown(target, { pointerType: "touch", pointerId: 1, isPrimary: true, clientX: 100, clientY: 100 });
}

/** jsdom has no PointerEvent; this carries the three fields the hold reads. */
class TestPointerEvent extends MouseEvent {
    readonly pointerType: string;
    readonly pointerId: number;
    readonly isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerType = init.pointerType ?? "mouse";
        this.pointerId = init.pointerId ?? 1;
        this.isPrimary = init.isPrimary ?? true;
    }
}

describe("ContextMenu touch-and-hold", () => {
    beforeAll(() => {
        vi.stubGlobal("PointerEvent", TestPointerEvent);
    });

    afterAll(() => {
        vi.unstubAllGlobals();
    });

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("opens the menu when a touch is held for 500 ms", () => {
        const target = renderMenu();
        touchDown(target);
        expect(target.style.getPropertyValue("user-select")).toBe("none");
        act(() => {
            vi.advanceTimersByTime(499);
        });
        expect(menus()).toHaveLength(0);
        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(menus()).toHaveLength(1);
        // The press styles come off once the hold is decided.
        expect(target.style.getPropertyValue("user-select")).toBe("");
    });

    it("opens over a child that prevents the pointerdown's default for its own reasons", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ContextMenu
                    target={
                        <div data-testid="target">
                            <canvas data-testid="canvas" />
                        </div>
                    }
                >
                    <Menu.Item>Fit</Menu.Item>
                </ContextMenu>
            </MantineProvider>,
        );
        const canvas = screen.getByTestId("canvas");
        // A 3D engine prevents a pointerdown's default so a drag selects no page text.
        canvas.addEventListener("pointerdown", (event) => {
            event.preventDefault();
        });
        touchDown(canvas);
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(menus()).toHaveLength(1);
    });

    it("does not open when the target's own handler claims the press", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ContextMenu
                    target={
                        <div
                            data-testid="target"
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
        touchDown(screen.getByTestId("target"));
        act(() => {
            vi.advanceTimersByTime(600);
        });
        expect(menus()).toHaveLength(0);
    });

    it("opens on a right-click over a child that prevents the browser's own menu", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ContextMenu
                    target={
                        <div data-testid="target">
                            <canvas data-testid="canvas" />
                        </div>
                    }
                >
                    <Menu.Item>Fit</Menu.Item>
                </ContextMenu>
            </MantineProvider>,
        );
        const canvas = screen.getByTestId("canvas");
        canvas.addEventListener("contextmenu", (event) => {
            event.preventDefault();
        });
        fireEvent.contextMenu(canvas, { clientX: 100, clientY: 100 });
        expect(menus()).toHaveLength(1);
    });

    it("does not open when the finger moves more than 8 px first", () => {
        const target = renderMenu();
        touchDown(target);
        fireEvent.pointerMove(target, { pointerType: "touch", pointerId: 1, clientX: 120, clientY: 100 });
        act(() => {
            vi.advanceTimersByTime(600);
        });
        expect(menus()).toHaveLength(0);
    });

    it("does not open for a mouse held down", () => {
        const target = renderMenu();
        fireEvent.pointerDown(target, { pointerType: "mouse", pointerId: 1, isPrimary: true });
        act(() => {
            vi.advanceTimersByTime(600);
        });
        expect(menus()).toHaveLength(0);
    });

    it("ignores the browser's own long-press contextmenu event after the hold opened the menu", () => {
        const target = renderMenu();
        touchDown(target);
        act(() => {
            vi.advanceTimersByTime(500);
        });
        const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 100, clientY: 100 });
        act(() => {
            target.dispatchEvent(event);
        });
        expect(event.defaultPrevented).toBe(true);
        expect(menus()).toHaveLength(1);
    });

    it("swallows the click that ends the hold", () => {
        const onClick = vi.fn();
        const target = renderMenu(onClick);
        touchDown(target);
        act(() => {
            vi.advanceTimersByTime(500);
        });
        fireEvent.pointerUp(target, { pointerType: "touch", pointerId: 1 });
        // Lifting the finger cancels the compatibility mouse events that would close the menu.
        expect(fireEvent.touchEnd(target)).toBe(false);
        fireEvent.click(target);
        expect(onClick).not.toHaveBeenCalled();
        expect(menus()).toHaveLength(1);
        // A later tap is a click again.
        touchDown(target);
        fireEvent.pointerUp(target, { pointerType: "touch", pointerId: 1 });
        fireEvent.click(target);
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("still opens on a right-click", () => {
        const target = renderMenu();
        fireEvent.contextMenu(target, { clientX: 10, clientY: 10 });
        expect(menus()).toHaveLength(1);
    });
});
