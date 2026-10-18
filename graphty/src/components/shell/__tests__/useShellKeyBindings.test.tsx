import { Tabs } from "@mantine/core";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen } from "../../../test/test-utils";
import {
    type EscapeLadderHandlers,
    isTextEntryTarget,
    type ShellKeyHandlerMap,
    useShellKeyBindings,
} from "../useShellKeyBindings";

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

/** The modifier keys `press` can hold, as `KeyboardEvent` names them and as keys. */
const MODIFIERS = [
    ["metaKey", "Meta"],
    ["ctrlKey", "Control"],
    ["shiftKey", "Shift"],
    ["altKey", "Alt"],
] as const;

/**
 * Press and release a real key (vitest's `userEvent`, which drives Playwright) on the focused
 * element, holding the modifiers `init` names.
 * @param key - the key, as `KeyboardEvent.key` names it
 * @param init - which modifiers to hold
 * @param target - what to focus first; `window` leaves focus on the page body
 * @returns the keydown the browser dispatched
 */
async function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = window): Promise<KeyboardEvent> {
    if (target instanceof HTMLElement) {
        target.focus();
    } else if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    let event: KeyboardEvent | undefined;
    const listener = (seen: KeyboardEvent): void => {
        event = seen;
    };

    window.addEventListener("keydown", listener);
    const held = MODIFIERS.filter(([flag]) => init[flag] === true).map(([, name]) => name);
    await userEvent.keyboard(
        `${held.map((name) => `{${name}>}`).join("")}{${key}}${held.map((name) => `{/${name}}`).join("")}`,
    );
    window.removeEventListener("keydown", listener);

    if (event === undefined) {
        throw new Error(`no keydown for ${key}`);
    }

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
        it("fires the handler for a matching chord", async () => {
            const onPalette = vi.fn();

            mountDispatcher({ handlers: { commandPalette: onPalette } });
            await press("k", { metaKey: true });

            expect(onPalette).toHaveBeenCalledTimes(1);
        });

        it("does not fire a handler for a chord nobody pressed", async () => {
            const onPalette = vi.fn();

            mountDispatcher({ handlers: { commandPalette: onPalette } });
            await press("k");

            expect(onPalette).not.toHaveBeenCalled();
        });

        it("stops listening when it is disabled", async () => {
            const onPalette = vi.fn();

            mountDispatcher({ handlers: { commandPalette: onPalette }, enabled: false });
            await press("k", { metaKey: true });

            expect(onPalette).not.toHaveBeenCalled();
        });

        it("stops listening when the hook unmounts", async () => {
            const onPalette = vi.fn();
            const { unmount } = mountDispatcher({ handlers: { commandPalette: onPalette } });

            unmount();
            await press("k", { metaKey: true });

            expect(onPalette).not.toHaveBeenCalled();
        });
    });

    describe("modifier normalisation", () => {
        it("accepts Cmd and Ctrl for the same binding", async () => {
            const onPalette = vi.fn();

            mountDispatcher({ handlers: { commandPalette: onPalette } });
            await press("k", { metaKey: true });
            await press("k", { ctrlKey: true });

            expect(onPalette).toHaveBeenCalledTimes(2);
        });

        it("does not fire an unmodified binding while Cmd is held", async () => {
            const onToggleMinimap = vi.fn();

            mountDispatcher({ handlers: { toggleMinimap: onToggleMinimap } });
            await press("m", { metaKey: true });

            expect(onToggleMinimap).not.toHaveBeenCalled();

            await press("m");

            expect(onToggleMinimap).toHaveBeenCalledTimes(1);
        });

        it("separates a binding from its Shift twin", async () => {
            const onTimeSlider = vi.fn();
            const onDrawer = vi.fn();

            mountDispatcher({ handlers: { toggleTimeSlider: onTimeSlider, toggleDataDrawer: onDrawer } });
            await press("T", { shiftKey: true });

            expect(onDrawer).toHaveBeenCalledTimes(1);
            expect(onTimeSlider).not.toHaveBeenCalled();
        });

        it("fires a shift-produced character even though Shift is down", async () => {
            const onShortcuts = vi.fn();

            mountDispatcher({ handlers: { keyboardShortcuts: onShortcuts } });
            await press("?", { shiftKey: true });

            expect(onShortcuts).toHaveBeenCalledTimes(1);
        });
    });

    describe("text entry", () => {
        it("recognises inputs, text areas and contenteditable regions", async () => {
            // The composed path is only populated while the event is being
            // dispatched, which is exactly when the dispatcher reads it. A real key press lands
            // on the focused element, so the searchbox is focusable, as a real one is.
            const textEntryAt = async (target: EventTarget): Promise<boolean> => {
                let seen = false;
                const listener = (event: Event): void => {
                    seen = isTextEntryTarget(event);
                };

                window.addEventListener("keydown", listener);
                await press("d", {}, target);
                window.removeEventListener("keydown", listener);

                return seen;
            };

            expect(isTextEntryTarget(new KeyboardEvent("keydown", { bubbles: true }))).toBe(false);
            expect(await textEntryAt(mountElement('<input type="text" />'))).toBe(true);
            expect(await textEntryAt(mountElement("<textarea></textarea>"))).toBe(true);
            expect(await textEntryAt(mountElement('<div contenteditable="true"><span>note</span></div>'))).toBe(true);
            expect(await textEntryAt(mountElement('<div role="searchbox" tabindex="0"></div>'))).toBe(true);
            expect(await textEntryAt(mountElement('<input type="checkbox" />'))).toBe(false);
            expect(await textEntryAt(mountElement("<button>Run</button>"))).toBe(false);
        });

        it("does not fire a binding while focus is in a text field", async () => {
            const onToggleMinimap = vi.fn();
            const input = mountElement('<input type="text" />');

            mountDispatcher({ handlers: { toggleMinimap: onToggleMinimap } });
            await press("m", {}, input);

            expect(onToggleMinimap).not.toHaveBeenCalled();
        });

        it("still fires from a control that is not text entry", async () => {
            const onToggleMinimap = vi.fn();
            const button = mountElement("<button>Run</button>");

            mountDispatcher({ handlers: { toggleMinimap: onToggleMinimap } });
            await press("m", {}, button);

            expect(onToggleMinimap).toHaveBeenCalledTimes(1);
        });

        it("leaves an arrow on a radio or a slider to that control", async () => {
            const panOrOrbit = vi.fn();
            const radio = mountElement('<input type="radio" name="mode" />');
            const slider = mountElement('<input type="range" />');

            mountDispatcher({ handlers: { panOrOrbit } });
            await press("ArrowRight", {}, radio);
            await press("ArrowUp", {}, slider);

            expect(panOrOrbit).not.toHaveBeenCalled();

            await press("m", {}, radio);
            await press("ArrowRight", {}, mountElement("<button>Run</button>"));

            expect(panOrOrbit).toHaveBeenCalledTimes(1);
        });

        it("leaves every arrow on a tab to the tab list", async () => {
            const panOrOrbit = vi.fn();
            const tab = mountElement('<button role="tab">Run</button>');

            mountDispatcher({ handlers: { panOrOrbit } });

            for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
                await press(key, {}, tab);
            }

            expect(panOrOrbit).not.toHaveBeenCalled();
        });

        it("keeps a real tab list's arrows off the canvas", async () => {
            const panOrOrbit = vi.fn();

            render(
                <Tabs defaultValue="run">
                    <Tabs.List aria-label="Analyze">
                        <Tabs.Tab value="run">Run</Tabs.Tab>
                        <Tabs.Tab value="results">Results</Tabs.Tab>
                    </Tabs.List>
                </Tabs>,
            );
            mountDispatcher({ handlers: { panOrOrbit } });

            await userEvent.click(screen.getByRole("tab", { name: "Run" }));
            // Right moves along the list; Up and Down cross it, which Mantine leaves alone.
            await userEvent.keyboard("{ArrowRight}{ArrowUp}{ArrowDown}{ArrowLeft}");

            expect(screen.getByRole("tab", { name: "Run" })).toHaveFocus();
            expect(panOrOrbit).not.toHaveBeenCalled();
        });

        it("leaves Escape to the widget while focus is in a text field", async () => {
            const closeTopmostTransient = vi.fn(() => true);
            const input = mountElement('<input type="text" />');

            mountDispatcher({ handlers: {}, escapeLadder: { closeTopmostTransient } });
            await press("Escape", {}, input);

            expect(closeTopmostTransient).not.toHaveBeenCalled();
        });
    });

    describe("the Escape ladder", () => {
        it("stops at the first rung that consumes the press", async () => {
            const cancelDragOrMarquee = vi.fn(() => true);
            const closeTopmostTransient = vi.fn(() => true);

            mountDispatcher({ handlers: {}, escapeLadder: { cancelDragOrMarquee, closeTopmostTransient } });
            await press("Escape");

            expect(cancelDragOrMarquee).toHaveBeenCalledTimes(1);
            expect(closeTopmostTransient).not.toHaveBeenCalled();
        });

        it("falls through a rung that had nothing to do", async () => {
            const cancelDragOrMarquee = vi.fn(() => false);
            /* This rung used to be `closeNarrowOverlay`, which was deleted from the ladder
               on 2026-09-14 with the narrow layout itself. Any rung between the first and
               the last proves the same fall-through. */
            const closeTopmostTransient = vi.fn(() => true);
            const clearSelection = vi.fn(() => true);

            mountDispatcher({
                handlers: {},
                escapeLadder: { cancelDragOrMarquee, closeTopmostTransient, clearSelection },
            });
            await press("Escape");

            expect(cancelDragOrMarquee).toHaveBeenCalledTimes(1);
            expect(closeTopmostTransient).toHaveBeenCalledTimes(1);
            expect(clearSelection).not.toHaveBeenCalled();
        });

        it("does nothing when every rung declines", async () => {
            const clearSelection = vi.fn(() => false);

            mountDispatcher({ handlers: {}, escapeLadder: { clearSelection } });

            // A rung that threw would surface as an error out of the real dispatch
            await expect(press("Escape")).resolves.toBeInstanceOf(KeyboardEvent);
            expect(clearSelection).toHaveBeenCalledTimes(1);
        });
    });

    describe("modal preconditions", () => {
        it("suppresses every binding but Escape while a modal is open", async () => {
            const onPalette = vi.fn();
            const closeTopmostTransient = vi.fn(() => true);

            mountDispatcher({
                handlers: { commandPalette: onPalette },
                escapeLadder: { closeTopmostTransient },
                modalOpen: true,
            });
            await press("k", { metaKey: true });
            await press("Escape");

            expect(onPalette).not.toHaveBeenCalled();
            expect(closeTopmostTransient).toHaveBeenCalledTimes(1);
        });
    });

    describe("browser defaults", () => {
        it("intercepts the default only where the table says to", async () => {
            mountDispatcher({ handlers: { commandPalette: vi.fn(), toggleMinimap: vi.fn() } });

            expect((await press("k", { metaKey: true })).defaultPrevented).toBe(true);
            expect((await press("m")).defaultPrevented).toBe(false);
        });

        it("leaves the default alone when no handler claims the action", async () => {
            mountDispatcher({ handlers: {} });

            expect((await press("k", { metaKey: true })).defaultPrevented).toBe(false);
        });
    });

    describe("held bindings", () => {
        it("calls the handler on the keydown and again on the keyup", async () => {
            const panModifier = vi.fn();

            mountDispatcher({ handlers: { panModifier } });

            await userEvent.keyboard("{ >}");
            await userEvent.keyboard("{/ }");

            expect(panModifier).toHaveBeenCalledTimes(2);
            expect(panModifier.mock.calls[0][0].type).toBe("keydown");
            expect(panModifier.mock.calls[1][0].type).toBe("keyup");
        });

        it("ignores auto-repeat on a held binding", async () => {
            const panModifier = vi.fn();

            mountDispatcher({ handlers: { panModifier } });

            // Held down: the second keydown is the browser's auto-repeat
            await userEvent.keyboard("{ >2}");

            expect(panModifier).toHaveBeenCalledTimes(1);

            await userEvent.keyboard("{/ }");
        });

        it("does not deliver a keyup to a binding that is not held", async () => {
            const onToggleMinimap = vi.fn();

            // Pressed before the bindings listen, so the release is the only event they see
            await userEvent.keyboard("{m>}");
            mountDispatcher({ handlers: { toggleMinimap: onToggleMinimap } });

            await userEvent.keyboard("{/m}");

            expect(onToggleMinimap).not.toHaveBeenCalled();
        });
    });
});
