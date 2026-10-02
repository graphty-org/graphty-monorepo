/**
 * @file Note ids and times. An id is `note_` plus a ULID: 48 bits of the time in milliseconds
 * and 80 random bits, in Crockford's base 32. Random ids need no register of removed ids: undo
 * restores the same id, and nothing else ever makes it again. Within one millisecond the random
 * part counts up, so ids minted in order sort in order.
 */

import type { NoteId } from "./types";

/** Crockford's base 32. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** The last id's time and random part, as 16 base-32 digits, for counting up within a millisecond. */
let last: { time: number; random: number[] } = { time: -1, random: [] };

/**
 * Mint a note id.
 * @param now - The time to stamp, in milliseconds since the epoch.
 * @returns `note_` plus a 26-character ULID.
 */
export function mintNoteId(now: number = Date.now()): NoteId {
    let random: number[];
    if (now === last.time) {
        random = [...last.random];
        // Count up; ponytail: wraps silently after 2^80 ids in one millisecond.
        for (let at = random.length - 1; at >= 0; at--) {
            random[at] = (random[at] + 1) % 32;
            if (random[at] !== 0) {
                break;
            }
        }
    } else {
        random = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte % 32);
    }

    last = { time: now, random };
    let time = "";
    for (let rest = now, i = 0; i < 10; i++, rest = Math.floor(rest / 32)) {
        time = ALPHABET[rest % 32] + time;
    }

    return `note_${time}${random.map((digit) => ALPHABET[digit]).join("")}`;
}

/**
 * A note time.
 * @param now - The time, in milliseconds since the epoch.
 * @returns It as `Date.prototype.toISOString()` writes it: UTC, with milliseconds.
 */
export function noteTime(now: number = Date.now()): string {
    return new Date(now).toISOString();
}
