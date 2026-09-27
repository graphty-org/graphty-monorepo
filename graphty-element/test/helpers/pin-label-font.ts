/**
 * Pin the font labels are drawn in, for tests and Storybook.
 *
 * WHY. A label asks for "Verdana" by default and the element loads no font of its own, so each
 * machine substitutes whatever it has installed: Liberation Serif on the Linux dev box, a DejaVu
 * face on Chromatic. Label geometry then differs by several pixels from one host to the next, and a
 * snapshot or a pixel-reading test measures the host instead of the element (#234).
 *
 * HOW. Inter (SIL Open Font License, `test/fonts/Inter-LICENSE.txt`) is committed under
 * `test/fonts` and registered with the page under the family name "Verdana". A registered face
 * wins over an installed font of the same name, so every label that uses the default, or names
 * Verdana itself, draws with the committed file on every machine. The published default and the
 * element's source are unchanged: this only runs where a test or a story calls it.
 *
 * The file is Inter's Latin subset, and the face claims only that range, so a glyph outside it
 * falls back to the browser's default font just as it did before.
 */

import interLatin from "../fonts/inter-latin.woff2?url";

/** The family name the pinned face is registered under: the element's default label font. */
export const PINNED_LABEL_FONT_FAMILY = "Verdana";

/** Where the pinned face is loaded from. */
export const PINNED_LABEL_FONT_URL: string = interLatin;

/** The characters the committed file carries: the Latin subset Inter is published in. */
const LATIN_SUBSET =
    "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, " +
    "U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";

let pinned: Promise<void> | undefined;

/**
 * Register the pinned face and wait until it is ready to draw with.
 *
 * Idempotent: the face is registered once per page, however many setups call this.
 * @returns Resolves once `document.fonts` can draw "Verdana" with the pinned face.
 */
export function pinLabelFont(): Promise<void> {
    pinned ??= (async () => {
        // Inter is a variable font, so one file covers every weight a label style can ask for. The
        // range is the subset's own: a character outside it (an emoji, a CJK glyph) is not claimed
        // by this face, so it falls back exactly as it did before the pin instead of drawing blank.
        const face = new FontFace(PINNED_LABEL_FONT_FAMILY, `url(${PINNED_LABEL_FONT_URL})`, {
            weight: "100 900",
            unicodeRange: LATIN_SUBSET,
        });

        document.fonts.add(await face.load());
        await document.fonts.load(`48px ${PINNED_LABEL_FONT_FAMILY}`);
    })();

    return pinned;
}
