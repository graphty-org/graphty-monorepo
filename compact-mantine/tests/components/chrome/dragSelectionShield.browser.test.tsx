/**
 * The drag selection shield, raised by a real press on a ResizeHandle and lowered by the real
 * event that ends the drag: the browser makes the pointerup, the pointercancel, the
 * lostpointercapture and the selectstart the shield cancels.
 */
import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { ResizeHandle } from "../../../src/components/chrome/ResizeHandle";
import { compactTheme } from "../../../src/theme";
import { moveBy, press, release } from "../../harness/mouse";
import { touchCancel, touchEnd, touchStart } from "../../harness/touch";

/**
 * Whether the browser's own selectstart is canceled now. Select all (Control+A) is a real key
 * press that makes one whatever the pointer is doing, so it probes the shield during a mouse drag
 * too, when the held button cannot start a text selection of its own.
 * @returns true when something called preventDefault on it
 */
async function selectStartCancelled(): Promise<boolean> {
    const seen: boolean[] = [];
    // On the window in the bubble phase: after the shield's capture listener on the document.
    const record = (event: Event): void => {
        seen.push(event.defaultPrevented);
    };
    globalThis.addEventListener("selectstart", record);
    await userEvent.keyboard("{Control>}a{/Control}");
    globalThis.removeEventListener("selectstart", record);
    window.getSelection()?.removeAllRanges();
    expect(seen).toHaveLength(1);
    return seen[0];
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
        expect(await selectStartCancelled()).toBe(false);

        const { handle, captured } = renderHandle();
        await press(handle);
        expect(await selectStartCancelled()).toBe(true);
        expect(userSelect()).toBe("none");

        await end(handle, captured());
        expect(await selectStartCancelled()).toBe(false);
        expect(userSelect()).toBe("text");
    });

    it("blocks text selection during a touch drag and lifts on pointercancel", async () => {
        document.documentElement.style.userSelect = "text";
        const { handle } = renderHandle();
        await touchStart(handle);
        expect(await selectStartCancelled()).toBe(true);
        expect(userSelect()).toBe("none");

        // The system takes the touch over, and the browser cancels the pointer. A touchcancel
        // cannot be canceled, so the browser acknowledges it without waiting for the page: the
        // protocol call can return before the page has dispatched the pointercancel.
        const cancelled = new Promise<void>((resolve) => {
            globalThis.addEventListener("pointercancel", () => resolve(), { capture: true, once: true });
        });
        await touchCancel();
        await cancelled;
        expect(await selectStartCancelled()).toBe(false);
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
