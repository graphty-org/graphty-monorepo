/**
 * A tooltip that keyboard focus opened stays open when its styles are recomputed (an accessibility
 * audit, a theme switch) while its trigger keeps focus. The recompute starts the tooltip's mount
 * animation again; overlayBehavior.ts decides only a mount, so the open tooltip is not held (hidden)
 * for another open delay.
 */
import { Tooltip } from "@mantine/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { installOverlayBehavior } from "../../../src/components/overlays/overlayBehavior";
import { TOOLTIP_OPEN_DELAY } from "../../../src/theme/styles/overlays";
import { computed, renderThemed, resetHarness } from "../../harness/measure";

afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await resetHarness();
});

/**
 * Resolve with the tooltip showing `text` when its mount animation starts.
 * @param text - the tooltip's label
 * @returns the tooltip element
 */
function tooltipMount(text: string): Promise<HTMLElement> {
    installOverlayBehavior();
    return new Promise((resolve) => {
        const seen = (event: AnimationEvent): void => {
            const el = event.target;
            if (el instanceof HTMLElement && el.classList.contains("cm-tooltip") && el.textContent === text) {
                document.removeEventListener("animationstart", seen);
                resolve(el);
            }
        };
        document.addEventListener("animationstart", seen);
    });
}

const isVisible = (el: Element): boolean => el.isConnected && computed(el).visibility === "visible";

describe("a focus-opened tooltip whose styles are recomputed", () => {
    it("stays open: the restarted mount animation does not hold it again", async () => {
        const { getByRole } = await renderThemed(
            <div style={{ display: "flex", gap: 8, padding: 40 }}>
                <button type="button">1</button>
                <Tooltip label="Two">
                    <button type="button">2</button>
                </Tooltip>
            </div>,
        );
        await commands.mouseAway();
        // Cold: no warm hand-off window from an earlier tooltip on overlayBehavior.ts's clock.
        const realNow = performance.now.bind(performance);
        vi.spyOn(performance, "now").mockImplementation(() => realNow() + 10_000);
        // The hold runs on setTimeout; a fake one steps it exactly.
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        getByRole("button", { name: "1" }).focus();
        const mounted = tooltipMount("Two");
        await userEvent.keyboard("{Tab}");
        const tip = await mounted;
        expect(tip.hasAttribute("data-cm-held")).toBe(true);
        vi.advanceTimersByTime(TOOLTIP_OPEN_DELAY);
        await vi.waitFor(() => {
            expect(isVisible(tip)).toBe(true);
        });

        // A style recompute on the open tooltip starts its mount animation again. This listener is added
        // after overlayBehavior.ts's, on the same document, so it hears the event after the decision ran.
        const restarted = new Promise<void>((resolve) => {
            const heard = (event: AnimationEvent): void => {
                if (event.target === tip) {
                    document.removeEventListener("animationstart", heard);
                    resolve();
                }
            };
            document.addEventListener("animationstart", heard);
        });
        tip.style.animation = "none";
        void tip.offsetWidth;
        tip.style.animation = "";
        await restarted;

        expect(getByRole("button", { name: "2" })).toHaveFocus();
        expect(tip.hasAttribute("data-cm-held")).toBe(false);
        expect(isVisible(tip)).toBe(true);
    });
});
