/**
 * @file Ids no other message, call or page load gives.
 */

/**
 * An id no other message, conversation or page load gives: a prefix and 128 random bits. A
 * message's id is stamped on its steps' provenance, so it must stay unique across reloads.
 * @param prefix - What kind of id it is.
 * @returns The id.
 */
export function uniqueId(prefix: string): string {
    // getRandomValues, unlike randomUUID, is there on a page served over plain http too.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return prefix + Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
