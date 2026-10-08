/**
 * @file The deprecated English fields the element still fills, read in one place.
 *
 * A run's `label`, a caveat's `notes` and `partialReason`, and a band's `plainName` are deprecated
 * in favor of neutral facts (issue #866) and removed in the next major. Until then the element
 * keeps them current, which means reading the English it already wrote: extending a run's notes
 * with one more sentence, naming a layer after its run. Those reads happen here and nowhere else,
 * so the next major deletes this file and the compiler names every caller left to change.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

/**
 * A run's English label.
 * @param run - A run, its record, or a view of one.
 * @param run.label - The label.
 * @returns The label.
 */
export function englishRunLabel(run: { readonly label: string }): string {
    return run.label;
}

/**
 * The English sentences a run's caveats carry.
 * @param caveats - The caveats.
 * @param caveats.notes - The sentences.
 * @returns The sentences.
 */
export function englishNotes(caveats: { readonly notes: readonly string[] }): readonly string[] {
    return caveats.notes;
}

/**
 * The English sentence saying why a run stopped early, when its caveats carry one.
 * @param caveats - The caveats, or part of them.
 * @param caveats.partialReason - The sentence.
 * @returns The sentence, or undefined.
 */
export function englishPartialReason(caveats: { readonly partialReason?: string }): string | undefined {
    return caveats.partialReason;
}

/**
 * A band's English name.
 * @param band - The band.
 * @param band.plainName - The name.
 * @returns The name.
 */
export function englishBandName(band: { readonly plainName: string }): string {
    return band.plainName;
}
