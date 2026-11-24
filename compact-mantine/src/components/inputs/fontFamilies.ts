/**
 * The font families FontPicker offers: the CSS generic families, a list of common installed
 * families narrowed to the ones this browser can draw, and the families installed on this computer
 * (the Local Font Access API, where the browser has it). Nothing here is stored: the measures and
 * the local query are kept for the page's lifetime only.
 */

/** The CSS generic families, always offered: every browser draws them. */
export const GENERIC_FAMILIES: readonly string[] = [
    "sans-serif",
    "serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-sans-serif",
    "ui-serif",
    "ui-monospace",
    "ui-rounded",
    "math",
    "emoji",
];

/** Families commonly installed on Windows, macOS and Linux; only the ones this browser draws are offered. */
export const COMMON_FAMILIES: readonly string[] = [
    "Arial",
    "Helvetica",
    "Helvetica Neue",
    "Verdana",
    "Tahoma",
    "Trebuchet MS",
    "Segoe UI",
    "Roboto",
    "Ubuntu",
    "Cantarell",
    "Noto Sans",
    "Open Sans",
    "Liberation Sans",
    "DejaVu Sans",
    "Times New Roman",
    "Georgia",
    "Garamond",
    "Palatino",
    "Book Antiqua",
    "Cambria",
    "Liberation Serif",
    "DejaVu Serif",
    "Courier New",
    "Lucida Console",
    "Consolas",
    "Menlo",
    "Monaco",
    "Liberation Mono",
    "DejaVu Sans Mono",
    "Comic Sans MS",
    "Impact",
];

const GENERIC = new Set(GENERIC_FAMILIES);

/** The file endings a font upload takes. */
export const FONT_FORMATS = ["ttf", "otf", "woff", "woff2"] as const;

/** One of the font file formats an upload takes. */
export type FontFormat = (typeof FONT_FORMATS)[number];

/**
 * A family as a CSS `font-family` value: a generic keyword as it is, any other name quoted, so a
 * name with spaces or digits, or one that spells a keyword, names that family.
 * @param family - the family name
 * @returns the CSS value
 */
export function quoteFamily(family: string): string {
    if (GENERIC.has(family)) {
        return family;
    }
    // A JSON string escapes a quote and a backslash as a CSS string does.
    return JSON.stringify(family);
}

/**
 * The first family of a `font-family` value, unquoted ("Verdana, sans-serif" is "Verdana").
 * @param value - a single family or a stack
 * @returns the first family, or "" for an empty value
 */
export function firstFamily(value: string): string {
    // ponytail: splits on the first comma; a quoted family name holding a comma is cut there.
    const head = value.split(",")[0].trim();
    return head.replace(/^(["'])(.*)\1$/, "$2");
}

/**
 * The format a font file is in, by its ending.
 * @param name - the file name
 * @returns the format, or undefined when the ending is not a font's
 */
export function fontFormatOf(name: string): FontFormat | undefined {
    const ending = /\.([^.]+)$/.exec(name)?.[1].toLowerCase();
    return FONT_FORMATS.find((format) => format === ending);
}

/**
 * A font file's name without its ending ("Outfit-Bold.woff2" is "Outfit-Bold").
 * @param name - the file name
 * @returns the stem
 */
export function fileStem(name: string): string {
    return name.replace(/\.[^.]+$/, "");
}

/** The sample measured to tell a face from its fallback. */
const SAMPLE = "mmmmmmmmmmlli1WQ@#";

/** Whether each family measured so far can be drawn. */
const drawable = new Map<string, boolean>();

let measureContext: CanvasRenderingContext2D | null | undefined;

/**
 * Whether this browser draws a family. `document.fonts.check()` answers true for a family that
 * does not exist, so the family is measured on a canvas against each of two generic fallbacks:
 * a family the browser lacks measures exactly as its fallback.
 * @param family - the family name
 * @returns whether it is drawn in a face of its own (or one the system substitutes)
 */
export function canDraw(family: string): boolean {
    const known = drawable.get(family);
    if (known !== undefined) {
        return known;
    }
    measureContext ??= document.createElement("canvas").getContext("2d");
    const context = measureContext;
    if (context === null) {
        return true;
    }
    const drawn = ["monospace", "serif"].some((fallback) => {
        context.font = `72px ${fallback}`;
        const alone = context.measureText(SAMPLE).width;
        context.font = `72px ${quoteFamily(family)}, ${fallback}`;
        return context.measureText(SAMPLE).width !== alone;
    });
    drawable.set(family, drawn);
    return drawn;
}

/** The part of the Local Font Access API FontPicker uses. */
interface LocalFontWindow {
    queryLocalFonts?: () => Promise<readonly { readonly family: string }[]>;
}

/**
 * Whether the browser offers the fonts installed on this computer (Chromium's Local Font Access
 * API; Firefox and Safari do not).
 * @returns whether `window.queryLocalFonts` exists
 */
export function localFontsSupported(): boolean {
    return "queryLocalFonts" in globalThis;
}

/**
 * Whether the reader has already let this page read the installed fonts, so they can be listed
 * without asking.
 * @returns true when the `local-fonts` permission is granted
 */
export async function localFontsGranted(): Promise<boolean> {
    try {
        const status = await navigator.permissions.query({ name: "local-fonts" as PermissionName });
        return status.state === "granted";
    } catch {
        // A browser that does not know the permission name.
        return false;
    }
}

let localQuery: Promise<readonly string[] | null> | undefined;

/**
 * The families installed on this computer, asked for once per page: a second picker gets the same
 * answer and the browser asks the reader once. Call it from a click (the API wants a user
 * gesture) unless `localFontsGranted()` said yes.
 * @returns the unique family names, or null when the reader or the browser refused
 */
export function queryLocalFamilies(): Promise<readonly string[] | null> {
    const query = (globalThis as LocalFontWindow).queryLocalFonts?.bind(globalThis);
    localQuery ??=
        query === undefined
            ? Promise.resolve(null)
            : query().then(
                  (fonts) => [...new Set(fonts.map((font) => font.family))],
                  () => null,
              );
    return localQuery;
}

/**
 * The answer `queryLocalFamilies` gave, when it has been asked.
 * @returns the pending or settled query, or undefined before the first ask
 */
export function askedLocalFamilies(): Promise<readonly string[] | null> | undefined {
    return localQuery;
}
