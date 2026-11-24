/**
 * A string as space-led lower-case words, so a word-start match is a substring test.
 * @param text - the text
 * @returns " word word"
 */
function words(text: string): string {
    return ` ${(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).join(" ")}`;
}

/**
 * Whether a typed search finds a name, the way the package's pickers search: each typed word
 * starts a word of the name, in order ("mono" finds "ui-monospace", "node i" finds "Node id").
 * An empty search finds everything.
 * @param text - a name, or another word it is found by
 * @param typed - the search text
 * @returns true when it matches
 */
export function matchesWordStart(text: string, typed: string): boolean {
    return words(text).includes(words(typed.trim()).trimEnd());
}
