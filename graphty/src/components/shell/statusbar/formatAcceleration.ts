/**
 * The words the acceleration chip draws, and nothing else.
 *
 * graphty-element decides whether a GPU is in use and says so in one plain, frozen
 * document -- a state, the backend that attached, what the hardware called itself, and a
 * sentence saying why there is none. This module turns that document into the two strings
 * the status bar shows: the chip's label and the chip's tooltip. It asks no question of
 * the machine, keeps no state, and is the twin of `formatCounts.ts` -- a pure function
 * over a fact the element already published.
 *
 * `probing` draws NOTHING. The element publishes it while the adapter request is still in
 * flight, and a chip that says "off" for thirty milliseconds and then "on" reads as a
 * fault rather than as a machine waking up.
 */

import type { AccelerationStatus } from "@graphty/graphty-element/session";

/**
 * How every one of the chip's labels begins, so a story, a board and a record quote one
 * string rather than three spellings of it.
 * @public
 */
export const ACCELERATION_CHIP_PREFIX = "GPU acceleration";

/** What an attached accelerator means for the reader, appended to the hardware's own name. */
const ACTIVE_SENTENCE = "Layouts and algorithms with a GPU path run on it.";

/** Where the reader turns acceleration off, which is the whole explanation when they did. */
const OFF_SENTENCE = "Switched off in Settings > Performance.";

/** What the tooltip says when the element reported neither a sentence nor a code. */
const NO_ACCELERATOR_SENTENCE = "No accelerator is available.";

/**
 * The chip's two strings and its ink, or nothing when the element has not finished looking.
 * @public
 */
export interface AccelerationChipText {
    /** The chip's text, e.g. `GPU acceleration: on (nvidia ampere)`. */
    readonly label: string;
    /** The chip's tooltip: the hardware and what it does, or why there is none. */
    readonly title: string;
    /** Whether an accelerator is attached, which decides the dot's ink. */
    readonly active: boolean;
}

/**
 * Turns the element's acceleration document into the chip's words.
 * @param status - Where acceleration stands, as graphty-element published it.
 * @returns The chip's label, tooltip and ink, or `null` while the element is still probing.
 * @public
 */
export function formatAcceleration(status: AccelerationStatus): AccelerationChipText | null {
    if (status.state === "probing") {
        return null;
    }

    if (status.state === "active" || status.state === "idle") {
        /* The vendor and the family are what a reader recognises ("nvidia ampere"); the
           device string, where the backend reported one, is the longer form and belongs in
           the tooltip beside what it buys them. A backend that described neither still gets
           a chip -- it IS accelerating, it just has nothing to call itself. */
        const hardware = [status.vendor, status.architecture].filter((part) => part !== undefined).join(" ");
        const described = status.device ?? status.backend;

        return {
            label: hardware === "" ? `${ACCELERATION_CHIP_PREFIX}: on` : `${ACCELERATION_CHIP_PREFIX}: on (${hardware})`,
            title: described === undefined ? ACTIVE_SENTENCE : `${described}. ${ACTIVE_SENTENCE}`,
            active: true,
        };
    }

    return {
        label: `${ACCELERATION_CHIP_PREFIX}: off`,
        /* `off` is the reader's own choice and needs no diagnosis. Everything else is the
           machine's answer, and the element publishes it as a sentence first and a code
           second; the fixed sentence is what is left when a backend declined with neither. */
        title: status.state === "off" ? OFF_SENTENCE : (status.reason ?? status.code ?? NO_ACCELERATOR_SENTENCE),
        active: false,
    };
}
