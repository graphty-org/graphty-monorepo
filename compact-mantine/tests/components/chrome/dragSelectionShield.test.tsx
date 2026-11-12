import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResizeHandle } from "../../../src/components/chrome/ResizeHandle";
import { compactTheme } from "../../../src/theme";

// jsdom has no PointerEvent (a pointer event would carry no button) and no pointer capture.
if (!("PointerEvent" in window)) {
    class PointerEventPolyfill extends MouseEvent {
        readonly pointerId: number;
        constructor(type: string, init: PointerEventInit = {}) {
            super(type, init);
            this.pointerId = init.pointerId ?? 0;
        }
    }
    Object.assign(window, { PointerEvent: PointerEventPolyfill });
}
Object.assign(HTMLElement.prototype, {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => true),
});

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

describe("the drag selection shield (ResizeHandle)", () => {
    afterEach(() => {
        document.documentElement.removeAttribute("style");
    });

    const press = (): HTMLElement => {
        render(
            <MantineProvider theme={compactTheme}>
                <ResizeHandle min={100} max={400} />
            </MantineProvider>,
        );
        const handle = screen.getByRole("separator");
        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 100 });
        return handle;
    };

    it.each([
        ["pointerup", (el: HTMLElement) => fireEvent.pointerUp(el, { pointerId: 1 })],
        ["pointercancel", (el: HTMLElement) => fireEvent.pointerCancel(el, { pointerId: 1 })],
        ["lostpointercapture", (el: HTMLElement) => fireEvent.lostPointerCapture(el, { pointerId: 1 })],
    ])("blocks text selection during a drag and lifts on %s", (_name, end) => {
        document.documentElement.style.userSelect = "text";
        expect(selectStartCancelled()).toBe(false);

        const handle = press();
        expect(selectStartCancelled()).toBe(true);
        expect(userSelect()).toBe("none");

        end(handle);
        expect(selectStartCancelled()).toBe(false);
        expect(userSelect()).toBe("text");
    });

    it("drops a selection made before the drag", () => {
        const text = document.createElement("p");
        text.textContent = "selected";
        document.body.append(text);
        window.getSelection()?.selectAllChildren(text);
        expect(window.getSelection()?.toString()).toBe("selected");
        press();
        expect(window.getSelection()?.toString()).toBe("");
        text.remove();
    });
});
