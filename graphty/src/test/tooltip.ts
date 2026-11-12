/**
 * Reads a control's tooltip as a pointer reader sees it: the pointer rests on the control, the
 * tooltip opens, and its words are read without the key it shows (a `<kbd>`), since the rule is
 * that a tooltip and the control's accessible name say the same words (decided.md, "Names and
 * looks"; a shortcut may be added).
 */

import { vi } from "vitest";
import { userEvent } from "vitest/browser";

import { act, waitFor } from "./test-utils";

/**
 * compact-mantine's cold tooltip delay (design/figma-spec.md 8.3), stepped on a fake clock: a
 * control with no tooltip then fails at once, where waiting for one would wait forever.
 */
const OPEN_DELAY = 1000;

/**
 * The words of the tooltip open on screen, without any key it shows.
 * @returns the words, or undefined while no tooltip is open.
 */
function openTooltip(): string | undefined {
    const shown = [...document.querySelectorAll<HTMLElement>('[role="tooltip"]')].filter(
        (tip) => tip.getBoundingClientRect().width > 0 && getComputedStyle(tip).visibility !== "hidden",
    );
    const tip = shown.at(-1);
    if (tip === undefined) {
        return undefined;
    }
    const copy = tip.cloneNode(true) as HTMLElement;
    for (const key of copy.querySelectorAll("kbd")) {
        key.remove();
    }
    return copy.textContent.replace(/\s+/g, " ").trim();
}

/**
 * Rests the pointer on a control and reads its tooltip, then moves the pointer away and waits for
 * the tooltip to close, so the next read never meets this one (a tooltip stays a moment after the
 * pointer leaves).
 * @param control - the control.
 * @returns the tooltip's words, without the key it shows.
 */
export async function tooltipOf(control: Element): Promise<string> {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
        await userEvent.hover(control);
        // Inside act, so the render the delay starts is committed, effects and all, when it returns.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(OPEN_DELAY);
        });
    } finally {
        vi.useRealTimers();
    }
    // The delay has passed, so a tooltip is mounted now or never: none fails at once.
    if (document.querySelector('[role="tooltip"]') === null) {
        throw new Error(`no tooltip on ${control.getAttribute("aria-label") ?? control.textContent}`);
    }
    // Mounted, it shows once compact-mantine has seen its mount (an animationstart).
    const words = await waitFor(() => {
        const found = openTooltip();
        if (found === undefined) {
            throw new Error("the tooltip is not shown yet");
        }
        return found;
    });
    await userEvent.unhover(control);
    await waitFor(() => {
        if (openTooltip() !== undefined) {
            throw new Error("the tooltip is still open");
        }
    });
    return words;
}
