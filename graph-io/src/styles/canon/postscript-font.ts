/**
 * PostScript font names (`lib/common/ps_font_equiv.h` in Graphviz): the family, weight and slant a name such as
 * `Helvetica-Bold` draws, and the name that draws a family. Graphviz and Pajek both name fonts this way.
 */

/** A family a CSS font list falls back to. */
export const GENERIC_FAMILIES: ReadonlySet<string> = new Set([
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
]);

/** The PostScript font families Graphviz knows, by the name before the dash, lowercase: the family and its generic. */
const POSTSCRIPT_FAMILIES: ReadonlyMap<string, readonly [string, string]> = new Map([
    ["avantgarde", ["URW Gothic", "sans-serif"]],
    ["bookman", ["URW Bookman", "serif"]],
    ["courier", ["Courier", "monospace"]],
    ["helvetica", ["Helvetica", "sans-serif"]],
    ["helvetica-narrow", ["Helvetica", "sans-serif"]],
    ["newcenturyschlbk", ["Century Schoolbook", "serif"]],
    ["palatino", ["Palatino", "serif"]],
    ["symbol", ["Symbol", "fantasy"]],
    ["times", ["Times", "serif"]],
    ["zapfchancery", ["URW Chancery", "serif"]],
    ["zapfdingbats", ["Dingbats", "fantasy"]],
]);

/** The weight and slant suffixes of the PostScript names, lowercase. */
const POSTSCRIPT_STYLES: ReadonlyMap<string, readonly [bold: boolean, italic: boolean]> = new Map([
    ["", [false, false]],
    ["roman", [false, false]],
    ["book", [false, false]],
    ["light", [false, false]],
    ["bold", [true, false]],
    ["demi", [true, false]],
    ["italic", [false, true]],
    ["oblique", [false, true]],
    ["bookoblique", [false, true]],
    ["lightitalic", [false, true]],
    ["mediumitalic", [false, true]],
    ["bolditalic", [true, true]],
    ["boldoblique", [true, true]],
    ["demiitalic", [true, true]],
    ["demioblique", [true, true]],
]);

/** A font as graphty draws it: a CSS family list, and whether it is bold and italic. */
export interface GraphvizFont {
    /** The families, the last a generic one. */
    readonly family: string;
    /** Whether the face is bold. */
    readonly bold: boolean;
    /** Whether the face is italic or oblique. */
    readonly italic: boolean;
}

/**
 * The font a PostScript font name such as `Helvetica-Bold` or `Times-Italic` (any case) names: its family with a
 * generic one after it, its weight and its slant (`lib/common/ps_font_equiv.h`). Pajek writes its `font` into its SVG
 * export as given, which the pinned fonts resolve the same way.
 * @param name - the name, trimmed
 * @returns the font, or null for a name that is not a PostScript font name
 */
export function postscriptFont(name: string): GraphvizFont | null {
    const lower = name.toLowerCase();
    for (const [base, [family, generic]] of POSTSCRIPT_FAMILIES) {
        if (lower === base || lower.startsWith(`${base}-`)) {
            const style = POSTSCRIPT_STYLES.get(lower.slice(base.length + 1));
            if (style !== undefined) {
                return { family: `${family}, ${generic}`, bold: style[0], italic: style[1] };
            }
        }
    }
    return null;
}

/** How each PostScript family is spelled, with the suffixes of its upright, bold and slanted faces. */
const POSTSCRIPT_NAMES: readonly { family: string; name: string; plain: string; bold: string; slant: string }[] = [
    { family: "URW Gothic", name: "AvantGarde", plain: "Book", bold: "Demi", slant: "Oblique" },
    { family: "URW Bookman", name: "Bookman", plain: "Light", bold: "Demi", slant: "Italic" },
    { family: "Courier", name: "Courier", plain: "", bold: "Bold", slant: "Oblique" },
    { family: "Helvetica", name: "Helvetica", plain: "", bold: "Bold", slant: "Oblique" },
    { family: "Century Schoolbook", name: "NewCenturySchlbk", plain: "Roman", bold: "Bold", slant: "Italic" },
    { family: "Palatino", name: "Palatino", plain: "Roman", bold: "Bold", slant: "Italic" },
    { family: "Times", name: "Times", plain: "Roman", bold: "Bold", slant: "Italic" },
];

/**
 * The `fontname` that draws a font in Graphviz: a PostScript name for a family Graphviz knows by one, the family
 * alone when the list only adds a generic fallback (which Graphviz falls back to anyway), else the list as it is.
 * @param family - the CSS family list
 * @param bold - whether it is bold
 * @param italic - whether it is italic
 * @returns the name
 */
export function graphvizFontName(family: string, bold: boolean, italic: boolean): string {
    const parts = family.split(",").map((p) => p.trim());
    if (parts.length !== 2 || !GENERIC_FAMILIES.has(parts[1].toLowerCase())) {
        return family;
    }
    const ps = POSTSCRIPT_NAMES.find((p) => p.family.toLowerCase() === parts[0].toLowerCase());
    if (ps === undefined) {
        return parts[0];
    }
    const slant = italic ? ps.slant : "";
    const suffix = bold ? `${ps.bold}${slant}` : slant || ps.plain;
    return suffix === "" ? ps.name : `${ps.name}-${suffix}`;
}
