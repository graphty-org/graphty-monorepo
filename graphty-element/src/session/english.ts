/**
 * @file The deprecated English fields the element still fills, read in one place.
 *
 * A band's `plainName` is deprecated in favor of neutral facts (issue #866). That read happens
 * here and nowhere else, so removing the field deletes this file and the compiler names every
 * caller left to change.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

/**
 * A band's English name.
 * @param band - The band.
 * @param band.plainName - The name.
 * @returns The name.
 */
export function englishBandName(band: { readonly plainName: string }): string {
    return band.plainName;
}
