/**
 * The in-headset menu (`xr.menu`): one pressable card per item the host gave, drawn beside the
 * reader. The element draws only the host's labels and reports the pressed item's id. Reached
 * only by `import()` once a session with a menu starts.
 * @module xr/menu
 */

import { wrap, type XrCard } from "../ai/voice/XrPendingControl";
import type { XRMenuItem } from "../config/XRConfig";

export { XrCardStack } from "../ai/voice/XrPendingControl";

/** Meters to the reader's left of straight ahead, clear of the assistant's cards. */
export const MENU_SIDE = -0.55;
/** Meters above eye level of the menu's top. */
export const MENU_HEIGHT = 0.2;

/**
 * The menu's cards, top first.
 * @param items - The host's items.
 * @param select - Called with an item's id when it is pressed.
 * @returns One pressable card per item.
 */
export function menuCards(items: readonly XRMenuItem[], select: (id: string) => void): XrCard[] {
    return items.map((item) => ({
        code: item.id,
        icon: "choice",
        lines: wrap(item.label),
        act: () => {
            select(item.id);
        },
    }));
}
