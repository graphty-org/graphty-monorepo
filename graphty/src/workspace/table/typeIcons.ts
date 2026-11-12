import { GLYPHS } from "../glyphs";

/** The type icon for each of graphty-element's attribute types: the table headers and the server preview. */
export const TYPE_ICONS: Readonly<Record<string, (typeof GLYPHS)[keyof typeof GLYPHS]>> = {
    string: GLYPHS.text,
    number: GLYPHS.number,
    integer: GLYPHS.number,
    boolean: GLYPHS.toggle,
    time: GLYPHS.time,
    category: GLYPHS.tags,
    mixed: GLYPHS.mixed,
};
