/**
 * @file The one text matcher: how every search the element offers compares what a reader typed
 * with a value, so that the same words find the same things in every search box.
 */

import type { TextMatchMode } from "../catalog/types";
import { GraphtyError } from "../errors";

/** Where a match fell, best first: the whole value, the start of a word, or anywhere. */
type TextMatch = "whole" | "word-start" | "anywhere";

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
    return text.normalize("NFKD").replaceAll(MARKS, "").toLowerCase().replaceAll(SPACES, " ").trim();
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

/**
 * The one test of a value against typed text, for a mode: what a selection's text search and a
 * rule's `text` leaf both run, so a search and the rule it becomes never disagree.
 * @param text - What was typed.
 * @param mode - How to compare it: contains (`substring`), equals (`exact`), starts with, ends
 *     with, or a regular expression (`regex`).
 * @param fold - How both sides are folded before comparing, or null to compare them as given. A
 *     `regex` ignores case whenever `fold` is not null.
 * @returns The test of one value, as text.
 * @throws A `GraphtyError` coded `E_BAD_COMMAND` for a regular expression that does not parse.
 */
export function textMatcher(
    text: string,
    mode: TextMatchMode,
    fold: ((value: string) => string) | null,
): (value: string) => boolean {
    if (mode === "regex") {
        const pattern = compilePattern(text, fold === null ? "" : "i");
        return (value) => pattern.test(value);
    }

    const same = fold ?? ((value: string): string => value);
    const wanted = same(text);
    switch (mode) {
        case "exact":
            return (value) => same(value) === wanted;
        case "starts-with":
            return (value) => same(value).startsWith(wanted);
        case "ends-with":
            return (value) => same(value).endsWith(wanted);
        default:
            return (value) => same(value).includes(wanted);
    }
}

/**
 * Compile a typed regular expression, refusing one that does not parse.
 * @param text - The pattern.
 * @param flags - The flags.
 * @returns The expression.
 * @throws A `GraphtyError` coded `E_BAD_COMMAND` naming the parse error.
 */
export function compilePattern(text: string, flags = ""): RegExp {
    try {
        return new RegExp(text, flags);
    } catch (error) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `"${text}" is not a regular expression: ${error instanceof Error ? error.message : String(error)}`,
            source: "run",
            details: { text, mode: "regex" },
            cause: error,
        });
    }
}
