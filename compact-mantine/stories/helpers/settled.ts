import { TOOLTIP_OPEN_DELAY } from "../../src/theme/styles/overlays";

/**
 * Waits until a story's floating parts have stopped moving: the page's web fonts have loaded,
 * and the boxes of every element matching `selector` (none is fine) are the same on two
 * animation frames in a row.
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
        if (i > 0 && now === last) {
            return;
        }
        last = now;
    }
    throw new Error(`${selector} kept moving for 120 frames`);
}

/**
 * Ends a play function that leaves keyboard focus on a control: focus opens the control's
 * tooltip, if it has one, only after the theme's open delay, so a screenshot taken inside that
 * delay shows the tooltip or not depending on how long the capture took. Wait the delay out and
 * let any tooltip settle, so every capture shows the same thing. Harmless without a tooltip.
 * @param root - the story's canvas element
 */
export async function settleFocusTooltip(root: HTMLElement): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, TOOLTIP_OPEN_DELAY + 100));
    await waitForSettledLayout(root, ".mantine-Tooltip-tooltip");
}
