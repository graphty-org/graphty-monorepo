/**
 * @file The one text matcher: how every search the element offers compares what a reader typed
 * with a value, so that the same words find the same things in every search box.
 */

/** Where a match fell, best first: the whole value, the start of a word, or anywhere. */
export type TextMatch = "whole" | "word-start" | "anywhere";

/** Combining marks, which `normalizeText` drops after decomposing. */
const MARKS = /\p{M}/gu;
/** Runs of whitespace. */
const SPACES = /\s+/gu;
/** A letter or a digit: a character that continues a word. */
const WORD = /[\p{L}\p{N}]/u;

/**
 * Text as the matcher compares it: compatibility forms and accents folded, lower case, and
 * whitespace collapsed and trimmed.
 *
 * Normalize both sides once -- the values when an index is built, the query once per call -- and
 * then call {@link matchText}.
 * @param text - Any text.
 * @returns The normalized text.
 */
export function normalizeText(text: string): string {
    return text.normalize("NFKD").replace(MARKS, "").toLowerCase().replace(SPACES, " ").trim();
}

/**
 * Whether a normalized value contains a normalized query, and where.
 * @param query - The normalized query.
 * @param value - The normalized value.
 * @returns `"whole"` when they are equal, `"word-start"` when the query starts a word of the
 *     value, `"anywhere"` for any other occurrence, and null when there is none or the query is
 *     empty.
 */
export function matchText(query: string, value: string): TextMatch | null {
    if (query === "") {
        return null;
    }

    if (query === value) {
        return "whole";
    }

    let found: TextMatch | null = null;
    for (let at = value.indexOf(query); at !== -1; at = value.indexOf(query, at + 1)) {
        if (at === 0 || !WORD.test(value[at - 1])) {
            return "word-start";
        }

        found = "anywhere";
    }

    return found;
}
