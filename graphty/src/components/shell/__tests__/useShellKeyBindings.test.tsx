import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type EscapeLadderHandlers, isTextEntryTarget, type ShellKeyHandlerMap, useShellKeyBindings } from "../useShellKeyBindings";

interface Options {
    handlers: ShellKeyHandlerMap;
    escapeLadder?: EscapeLadderHandlers;
    modalOpen?: boolean;
    enabled?: boolean;
}

function mountDispatcher(options: Options) {
    return renderHook(() =>
        useShellKeyBindings({
            handlers: options.handlers,
            escapeLadder: options.escapeLadder,
            modalOpen: options.modalOpen,
            enabled: options.enabled,
        }),
    );
}

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = window): KeyboardEvent {
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });

    target.dispatchEvent(event);

    return event;
}

const mounted: HTMLElement[] = [];

function mountElement(html: string): HTMLElement {
    const host = document.createElement("div");

    host.innerHTML = html;

    const element = host.firstElementChild;

    if (!(element instanceof HTMLElement)) {
        throw new Error("mountElement needs one element");
    }

    document.body.appendChild(host);
    mounted.push(host);

    return element;
}

describe("useShellKeyBindings", () => {
    afterEach(() => {
        while (mounted.length > 0) {
            mounted.pop()?.remove();
        }
    });

    describe("dispatching", () => {
        it("fires the handler for a matching chord", () => {
            const onPalette = vi.fn();

            mountDispatcher({ handlers: { commandPalette: onPalette } });
            press("k", { metaKey: true });

            expect(onPalette).toHaveBeenCalledTimes(1);
        });

        it("does not fire a handler for a chord nobody pressed", () => {
            const onPalette = vi.fn();

            mountDispatcher({ handlers: { commandPalette: onPalette } });
            press("k");

            expect(onPalette).not.toHaveBeenCalled();
        });

        it("stops listening when it is disabled", () => {
            const onPalette = vi.fn();

            mountDispatcher({ handlers: { commandPalette: onPalette }, enabled: false });
            press("k", { metaKey: true });

            expect(onPalette).not.toHaveBeenCalled();
        });

        it("stops listening when the hook unmounts", () => {
            const onPalette = vi.fn();
            const { unmount } = mountDispatcher({ handlers: { commandPalette: onPalette } });

            unmount();
            press("k", { metaKey: true });

            expect(onPalette).not.toHaveBeenCalled();
        });
    });

    describe("modifier normalisation", () => {
        it("accepts Cmd and Ctrl for the same binding", () => {
            const onPalette = vi.fn();

            mountDispatcher({ handlers: { commandPalette: onPalette } });
            press("k", { metaKey: true });
            press("k", { ctrlKey: true });

            expect(onPalette).toHaveBeenCalledTimes(2);
        });

        it("does not fire an unmodified binding while Cmd is held", () => {
            const onToggleInspector = vi.fn();

            mountDispatcher({ handlers: { toggleInspector: onToggleInspector } });
            press("d", { metaKey: true });

            expect(onToggleInspector).not.toHaveBeenCalled();

            press("d");

            expect(onToggleInspector).toHaveBeenCalledTimes(1);
        });

        it("separates a binding from its Shift twin", () => {
            const onTimeSlider = vi.fn();
            const onDrawer = vi.fn();

            mountDispatcher({ handlers: { toggleTimeSlider: onTimeSlider, toggleDataDrawer: onDrawer } });
            press("T", { shiftKey: true });

            expect(onDrawer).toHaveBeenCalledTimes(1);
            expect(onTimeSlider).not.toHaveBeenCalled();
        });

        it("fires a shift-produced character even though Shift is down", () => {
            const onShortcuts = vi.fn();

            mountDispatcher({ handlers: { keyboardShortcuts: onShortcuts } });
            press("?", { shiftKey: true });

            expect(onShortcuts).toHaveBeenCalledTimes(1);
        });
    });

    describe("text entry", () => {
        it("recognises inputs, text areas and contenteditable regions", () => {
            // The composed path is only populated while the event is being
            // dispatched, which is exactly when the dispatcher reads it.
            const textEntryAt = (target: EventTarget): boolean => {
                let seen = false;
                const listener = (event: Event): void => {
                    seen = isTextEntryTarget(event);
                };

                window.addEventListener("keydown", listener);
                press("d", {}, target);
                window.removeEventListener("keydown", listener);

                return seen;
            };

            expect(isTextEntryTarget(new KeyboardEvent("keydown", { bubbles: true }))).toBe(false);
            expect(textEntryAt(mountElement('<input type="text" />'))).toBe(true);
            expect(textEntryAt(mountElement("<textarea></textarea>"))).toBe(true);
            expect(textEntryAt(mountElement('<div contenteditable="true"><span>note</span></div>'))).toBe(true);
            expect(textEntryAt(mountElement('<div role="searchbox"></div>'))).toBe(true);
            expect(textEntryAt(mountElement('<input type="checkbox" />'))).toBe(false);
            expect(textEntryAt(mountElement("<button>Run</button>"))).toBe(false);
        });

        it("does not fire a binding while focus is in a text field", () => {
            const onToggleInspector = vi.fn();
            const input = mountElement('<input type="text" />');

            mountDispatcher({ handlers: { toggleInspector: onToggleInspector } });
            press("d", {}, input);

            expect(onToggleInspector).not.toHaveBeenCalled();
        });

        it("still fires from a control that is not text entry", () => {
            const onToggleInspector = vi.fn();
            const button = mountElement("<button>Run</button>");

            mountDispatcher({ handlers: { toggleInspector: onToggleInspector } });
            press("d", {}, button);

            expect(onToggleInspector).toHaveBeenCalledTimes(1);
        });

        it("leaves Escape to the widget while focus is in a text field", () => {
            const closeTopmostTransient = vi.fn(() => true);
            const input = mountElement('<input type="text" />');

            mountDispatcher({ handlers: {}, escapeLadder: { closeTopmostTransient } });
            press("Escape", {}, input);

            expect(closeTopmostTransient).not.toHaveBeenCalled();
        });
    });

    describe("the Escape ladder", () => {
        it("stops at the first rung that consumes the press", () => {
            const cancelDragOrMarquee = vi.fn(() => true);
            const closeTopmostTransient = vi.fn(() => true);

            mountDispatcher({ handlers: {}, escapeLadder: { cancelDragOrMarquee, closeTopmostTransient } });
            press("Escape");

            expect(cancelDragOrMarquee).toHaveBeenCalledTimes(1);
            expect(closeTopmostTransient).not.toHaveBeenCalled();
        });

        it("falls through a rung that had nothing to do", () => {
            const cancelDragOrMarquee = vi.fn(() => false);
            const closeNarrowOverlay = vi.fn(() => true);
            const clearSelection = vi.fn(() => true);

            mountDispatcher({
                handlers: {},
                escapeLadder: { cancelDragOrMarquee, closeNarrowOverlay, clearSelection },
            });
            press("Escape");

            expect(cancelDragOrMarquee).toHaveBeenCalledTimes(1);
            expect(closeNarrowOverlay).toHaveBeenCalledTimes(1);
            expect(clearSelection).not.toHaveBeenCalled();
        });

        it("does nothing when every rung declines", () => {
            const clearSelection = vi.fn(() => false);

            mountDispatcher({ handlers: {}, escapeLadder: { clearSelection } });

            expect(() => press("Escape")).not.toThrow();
            expect(clearSelection).toHaveBeenCalledTimes(1);
        });
    });

    describe("modal preconditions", () => {
        it("suppresses every binding but Escape while a modal is open", () => {
            const onPalette = vi.fn();
            const closeTopmostTransient = vi.fn(() => true);

            mountDispatcher({
                handlers: { commandPalette: onPalette },
                escapeLadder: { closeTopmostTransient },
                modalOpen: true,
            });
            press("k", { metaKey: true });
            press("Escape");

            expect(onPalette).not.toHaveBeenCalled();
            expect(closeTopmostTransient).toHaveBeenCalledTimes(1);
        });
    });

    describe("browser defaults", () => {
        it("intercepts the default only where the table says to", () => {
            mountDispatcher({ handlers: { commandPalette: vi.fn(), toggleMinimap: vi.fn() } });

            expect(press("k", { metaKey: true }).defaultPrevented).toBe(true);
            expect(press("m").defaultPrevented).toBe(false);
        });

        it("leaves the default alone when no handler claims the action", () => {
            mountDispatcher({ handlers: {} });

            expect(press("k", { metaKey: true }).defaultPrevented).toBe(false);
        });
    });

    describe("held bindings", () => {
        it("calls the handler on the keydown and again on the keyup", () => {
            const panModifier = vi.fn();

            mountDispatcher({ handlers: { panModifier } });

            window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
            window.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true, cancelable: true }));

            expect(panModifier).toHaveBeenCalledTimes(2);
            expect(panModifier.mock.calls[0][0].type).toBe("keydown");
            expect(panModifier.mock.calls[1][0].type).toBe("keyup");
        });

        it("ignores auto-repeat on a held binding", () => {
            const panModifier = vi.fn();

            mountDispatcher({ handlers: { panModifier } });

            window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
            window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, repeat: true }));

            expect(panModifier).toHaveBeenCalledTimes(1);
        });

        it("does not deliver a keyup to a binding that is not held", () => {
            const onToggleInspector = vi.fn();

            mountDispatcher({ handlers: { toggleInspector: onToggleInspector } });

            window.dispatchEvent(new KeyboardEvent("keyup", { key: "d", bubbles: true }));

            expect(onToggleInspector).not.toHaveBeenCalled();
        });
    });
});
