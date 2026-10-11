// Matching a heard word against a vocabulary (design section 9.8): exact, then edit distance
// (fastest-levenshtein), then sound (double-metaphone), so "colour" finds color, "page rank" finds
// PageRank and "strossi" finds Strozzi. Pure: no Babylon, no DOM.

import { doubleMetaphone } from "double-metaphone";
import { distance } from "fastest-levenshtein";

/** One thing a slot can hold, with the ways it may be said. */
export interface VocabEntry {
    /** What the command gets: a result id, a node index, a verb. */
    id: string;
    /** What the chip shows. */
    label: string;
    /** Spoken forms, lowercase; the label is always one. */
    spoken: string[];
}

/** A vocabulary entry with how well it matched. */
export interface Candidate {
    entry: VocabEntry;
    score: number;
}

/** A sound match counts as this much (below an exact match, above most spelling slips). */
const SOUND = 0.85;

/**
 * Lowercase, and drop everything but letters, digits and the decimal point.
 * @param s - the text
 * @returns the squashed text ("Page Rank" becomes "pagerank")
 */
export const squash = (s: string): string => s.toLowerCase().replaceAll(/[^a-z0-9.]/g, "");

/**
 * How alike a heard text and a spoken form are, 0 to 1.
 * @param heard - what the recognizer gave
 * @param spoken - one spoken form of an entry
 * @returns 1 for the same text, 0.85 for the same sound, else one minus the relative edit distance
 */
export function similarity(heard: string, spoken: string): number {
    const a = squash(heard);
    const b = squash(spoken);
    if (!a || !b) {
        return 0;
    }
    if (a === b) {
        return 1;
    }
    const spelled = 1 - distance(a, b) / Math.max(a.length, b.length);
    // Sound codes of very short words collide too often ("by" and "bee") to mean anything.
    if (a.length < 4 || b.length < 4 || /\d/.test(a + b)) {
        return spelled;
    }
    const [a1, a2] = doubleMetaphone(a);
    const [b1, b2] = doubleMetaphone(b);
    const sounds = a1 !== "" && (a1 === b1 || a1 === b2 || (a2 !== "" && a2 === b1));
    return sounds ? Math.max(spelled, SOUND) : spelled;
}

/**
 * Rank a vocabulary against what was heard, best first.
 * @param heard - what the recognizer gave
 * @param vocab - the slot's vocabulary
 * @returns every entry with its best score over its spoken forms, best first
 */
export function rank(heard: string, vocab: readonly VocabEntry[]): Candidate[] {
    return vocab
        .map((entry) => ({ entry, score: Math.max(...entry.spoken.map((s) => similarity(heard, s))) }))
        .sort((x, y) => y.score - x.score);
}
