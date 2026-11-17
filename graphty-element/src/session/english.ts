/**
 * @file The deprecated English fields the element still fills, read in one place.
 *
 * A result root's `label` and a band's `plainName` are deprecated in favor of neutral facts
 * (issue #866). Those reads happen here and nowhere else, so removing the fields deletes this
 * file and the compiler names every caller left to change.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

/**
 * A result root's English label.
 * @param run - The root.
 * @param run.label - The label.
 * @returns The label.
 */
export function englishRunLabel(run: { readonly label: string }): string {
    return run.label;
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
