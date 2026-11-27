/**
 * @file A reader's click on a card of a workspace of cards (the selection workspace, the join workspace).
 */

import { assert } from "vitest";
import { userEvent } from "vitest/browser";

import { waitFor } from "./test-utils";

/**
 * Clicks a card on its blank space (where only the card or its header is under the pointer), which focuses it
 * as a reader's click does, so its own keys answer.
 * @param card - the card.
 */
export async function clickCardBlank(card: HTMLElement): Promise<void> {
    const box = card.getBoundingClientRect();
    const head = card.querySelector(".cm-card-head");
    let blank: { x: number; y: number } | undefined;
    for (let y = 2; y < box.height && blank === undefined; y += 3) {
        for (let x = 2; x < box.width && blank === undefined; x += 3) {
            const hit = document.elementFromPoint(box.left + x, box.top + y);
            if (hit === card || hit === head) {
                blank = { x, y };
            }
        }
    }
    assert.isDefined(blank, "the card has blank space to click");
    await userEvent.click(card, { position: blank });
    await waitFor(() => {
        assert.strictEqual(document.activeElement, card, "the click focuses the card");
    });
}
