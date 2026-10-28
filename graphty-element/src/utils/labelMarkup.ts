/**
 * @file Label markup's one escape.
 *
 * Label text reads tags such as `<bold>` and `<color='red'>`. `<lt>` draws a literal `<`, so
 * text that must never be read as markup -- a value substituted into a template -- writes every
 * `<` as `<lt>`, and no tag can start inside it.
 */

/**
 * Make text draw as written when it is placed inside label markup.
 * @param text - The text.
 * @returns The text with every `<` written as `<lt>`.
 */
export function escapeLabelMarkup(text: string): string {
    return text.replaceAll("<", "<lt>");
}
