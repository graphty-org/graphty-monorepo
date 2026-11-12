import { expect, waitFor } from "storybook/test";

/**
 * Waits until a story's floating parts have stopped moving: the page's web fonts have loaded,
 * no pop-out panel has a reposition queued (`data-cm-repositioning`), and the boxes of every
 * element matching `selector` (none is fine) are the same on two animation frames in a row.
 * Two still frames alone are not enough: a panel's observer can queue its move for a frame
 * whose callbacks run after this helper's, so the old box reads the same twice.
 *
 * Tooltips and pop-overs are placed by measuring their trigger after they mount. The bundled
 * Inter face loads on first use, after that, and the text beside a trigger reflows and moves it;
 * the bubble follows on a later frame. A screenshot taken in between caught a bubble one pixel
 * off, so these stories are finished only once the bubbles have settled.
 * @param root - the story's canvas element
 * @param selector - the floating elements to watch
 */
export async function waitForSettledLayout(root: HTMLElement, selector: string): Promise<void> {
    const doc = root.ownerDocument;
    await doc.fonts.ready;
    const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const boxes = (): string =>
        [...doc.querySelectorAll(selector)].map((e) => JSON.stringify(e.getBoundingClientRect())).join(";");
    let last = "";
    for (let i = 0; i < 120; i++) {
        await frame();
        const now = boxes();
        const pending = doc.querySelector("[data-cm-repositioning]") !== null;
        if (i > 0 && !pending && now === last) {
            return;
        }
        last = now;
    }
    throw new Error(`${selector} kept moving for 120 frames`);
}

/**
 * Ends a play function that leaves keyboard focus on a control: focus mounts the control's
 * tooltip, if it has one, at once (focus is a discrete event, so React commits its update before
 * the focusing call returns), and the overlay behavior holds it hidden (`data-cm-held`) for the
 * theme's open delay, so a screenshot taken inside that delay shows the tooltip or not depending
 * on how long the capture took. Wait until no tooltip is still held or not yet seen by the
 * overlay behavior, and let any tooltip settle, so every capture shows the same thing. Harmless
 * without a tooltip.
 * @param root - the story's canvas element
 */
export async function settleFocusTooltip(root: HTMLElement): Promise<void> {
    await waitFor(() =>
        expect(root.ownerDocument.querySelector(".cm-tooltip:is([data-cm-held], :not([data-cm-seen]))")).toBeNull(),
    );
    await waitForSettledLayout(root, ".mantine-Tooltip-tooltip");
}

/**
 * Waits until `check` passes, testing it once now and then once per animation frame, with no
 * deadline of its own: the test's timeout is the backstop. `check` passes when it returns
 * anything but `false` without throwing, so it can be a boolean test or a block of assertions.
 *
 * Use it for state that arrives on a later frame -- a floating-ui placement, a scroll, a measured
 * box. A `waitFor` with its 1000 ms deadline fails such a check when the main thread stalls past
 * the deadline, though the state arrives a few frames later (#2705, #2719).
 * @param check - the condition, as a boolean test or as assertions that throw until it holds
 */
export async function untilPasses(check: () => unknown): Promise<void> {
    const passes = (): boolean => {
        try {
            return check() !== false;
        } catch {
            return false;
        }
    };
    while (!passes()) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
}
