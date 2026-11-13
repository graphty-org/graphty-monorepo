/**
 * The drag selection shield, raised by a real press on a ResizeHandle and lowered by the real
 * event that ends the drag: the browser makes the pointerup, the pointercancel and the
 * lostpointercapture.
 */
import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ResizeHandle } from "../../../src/components/chrome/ResizeHandle";
import { compactTheme } from "../../../src/theme";
import { moveBy, press, release } from "../../harness/mouse";
import { touchCancel, touchEnd, touchStart } from "../../harness/touch";

/**
 * Whether a selectstart dispatched now is cancelled.
 * @returns true when something called preventDefault on it
 */
function selectStartCancelled(): boolean {
    const event = new Event("selectstart", { bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
}

const userSelect = (): string => document.documentElement.style.userSelect;

/**
 * Render a handle and remember the pointer that pressed it.
 * @returns the handle and the id of the pointer that last pressed it
 */
function renderHandle(): { handle: HTMLElement; captured: () => number } {
    render(
        <MantineProvider theme={compactTheme}>
            {/* The handle sits on its panel's edge, so the panel needs a size. */}
            <div style={{ position: "relative", width: 240, height: 200 }}>
                <ResizeHandle min={100} max={400} />
            </div>
        </MantineProvider>,
    );
    const handle = screen.getByRole("separator");
    let pointerId = -1;
    handle.addEventListener("pointerdown", (event) => {
        ({ pointerId } = event);
    });
    return { handle, captured: () => pointerId };
}

describe("the drag selection shield (ResizeHandle)", () => {
    afterEach(async () => {
        await release();
        await touchEnd();
        cleanup();
        document.documentElement.removeAttribute("style");
    });

    it.each([
        ["pointerup", (): Promise<void> => release()],
        [
            "lostpointercapture",
            async (handle: HTMLElement, pointerId: number): Promise<void> => {
                // The button stays down and the capture is let go. The browser takes a capture
                // and lets it go at the next pointer event, so a move comes before and after.
                const lost = new Promise<void>((resolve) => {
                    handle.addEventListener("lostpointercapture", () => resolve(), { once: true });
                });
                await moveBy(1);
                handle.releasePointerCapture(pointerId);
                await moveBy(1);
                await lost;
            },
        ],
    ])("blocks text selection during a mouse drag and lifts on %s", async (_name, end) => {
        document.documentElement.style.userSelect = "text";
        expect(selectStartCancelled()).toBe(false);

        const { handle, captured } = renderHandle();
        await press(handle);
        expect(selectStartCancelled()).toBe(true);
        expect(userSelect()).toBe("none");

        await end(handle, captured());
        expect(selectStartCancelled()).toBe(false);
        expect(userSelect()).toBe("text");
    });

    it("blocks text selection during a touch drag and lifts on pointercancel", async () => {
        document.documentElement.style.userSelect = "text";
        const { handle } = renderHandle();
        await touchStart(handle);
        expect(selectStartCancelled()).toBe(true);
        expect(userSelect()).toBe("none");

        // The system takes the touch over, and the browser cancels the pointer.
        await touchCancel();
        expect(selectStartCancelled()).toBe(false);
        expect(userSelect()).toBe("text");
    });

    it("drops a selection made before the drag", async () => {
        const text = document.createElement("p");
        text.textContent = "selected";
        document.body.append(text);
        window.getSelection()?.selectAllChildren(text);
        expect(window.getSelection()?.toString()).toBe("selected");
        const { handle } = renderHandle();
        await press(handle);
        expect(window.getSelection()?.toString()).toBe("");
        text.remove();
    });
});
