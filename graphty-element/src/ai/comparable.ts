/**
 * An utterance as replies and choices are compared: case, punctuation and spacing ignored.
 * @param text - The utterance.
 * @returns Its comparable form.
 */
export function comparable(text: string): string {
    return text
        .toLowerCase()
        .replaceAll(/[\p{P}\p{S}]/gu, "")
        .replaceAll(/\s+/g, " ")
        .trim();
}
