/**
 * ContextMenu opened by a touch held still, in a real browser: lifting the finger that opened
 * the menu must not choose the row it lifts over.
 */
import { MantineProvider, Menu } from "@mantine/core";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { ContextMenu } from "../../../src/components/overlays/ContextMenu";

/**
 * Send one touch pointer event to an element at its center.
 * @param element - the element
 * @param type - pointerdown, pointerup
 */
function touch(element: Element, type: string): void {
    const r = element.getBoundingClientRect();
    element.dispatchEvent(
        new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerType: "touch",
            pointerId: 3,
            isPrimary: true,
            clientX: r.left + r.width / 2,
            clientY: r.top + r.height / 2,
        }),
    );
}

afterEach(cleanup);

describe("ContextMenu touch hold", () => {
    it("opens on a held touch, and the lift that ends the press chooses nothing", async () => {
        const onRename = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <ContextMenu
                    target={
                        <button type="button" data-testid="target" style={{ width: 200, height: 100 }}>
                            Target
                        </button>
                    }
                >
                    <Menu.Item onClick={onRename}>Rename</Menu.Item>
                </ContextMenu>
            </MantineProvider>,
        );
        touch(screen.getByTestId("target"), "pointerdown");
        const item = await waitFor(() => screen.getByRole("menuitem", { name: "Rename" }), { timeout: 1500 });

        // The finger lifts over the row: its pointerup and the click after it are the press's.
        touch(item, "pointerup");
        item.click();
        expect(onRename).not.toHaveBeenCalled();
        expect(screen.getByRole("menu")).toBeTruthy();

        // A fresh tap on the row chooses it.
        touch(item, "pointerdown");
        touch(item, "pointerup");
        item.click();
        expect(onRename).toHaveBeenCalledTimes(1);
    });
});
