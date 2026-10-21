/**
 * Color utility constants and functions for converting between
 * opacity percentages (0-100) and hex alpha values (00-FF).
 */

/** Maximum value for hex alpha channel (0xFF = 255) */
export const MAX_ALPHA_HEX = 255;

/** Maximum opacity percentage value */
export const MAX_OPACITY_PERCENT = 100;

/**
 * Converts a hex alpha string (00-FF) to an opacity percentage (0-100).
 * @param alphaHex - Two-character hex string representing alpha (00-FF)
 * @returns Opacity as a percentage from 0 to 100
 * @example
 * parseAlphaFromHexa("FF") // returns 100
 * parseAlphaFromHexa("80") // returns ~50
 * parseAlphaFromHexa("00") // returns 0
 */
export function parseAlphaFromHexa(alphaHex: string): number {
    return Math.round((Number.parseInt(alphaHex, 16) / MAX_ALPHA_HEX) * MAX_OPACITY_PERCENT);
}

/**
 * Converts an opacity percentage (0-100) to a hex alpha string (00-ff).
 * @param opacity - Opacity as a percentage from 0 to 100
 * @returns Two-character lowercase hex string representing alpha
 * @example
 * opacityToAlphaHex(100) // returns "ff"
 * opacityToAlphaHex(50)  // returns "80"
 * opacityToAlphaHex(0)   // returns "00"
 */
export function opacityToAlphaHex(opacity: number): string {
    return Math.round((opacity / MAX_OPACITY_PERCENT) * MAX_ALPHA_HEX)
        .toString(16)
        .padStart(2, "0");
}

/**
 * Parse HEXA color string (#RRGGBBAA) and extract RGB and opacity.
 * @param hexa - Color string in hex or hexa format
 * @returns Object with hex color and opacity percentage
 */
export function parseHexaColor(hexa: string): { hex: string; opacity: number } {
    // Normalize to 8-character HEXA
    let normalized = hexa.replace("#", "");

    if (normalized.length === 3) {
        normalized = `${normalized
            .split("")
            .map((c) => c + c)
            .join("")}ff`;
    } else if (normalized.length === 4) {
        normalized = normalized
            .split("")
            .map((c) => c + c)
            .join("");
    } else if (normalized.length === 6) {
        normalized = `${normalized}ff`;
    }

    const hex = `#${normalized.slice(0, 6)}`;
    const alphaHex = normalized.slice(6, 8);
    const opacity = parseAlphaFromHexa(alphaHex);

    return { hex, opacity };
}

/**
 * Convert RGB hex and opacity to HEXA format.
 * @param hex - Color in hex format (#RRGGBB)
 * @param opacity - Opacity percentage (0-100)
 * @returns Color in HEXA format (#RRGGBBAA)
 */
export function toHexaColor(hex: string, opacity: number): string {
    const normalized = hex.replace("#", "");
    const alpha = opacityToAlphaHex(opacity);
    return `#${normalized}${alpha}`;
}

/**
 * Check if a color string is valid hex format.
 * @param color - Color string to validate
 * @returns true if valid hex format (3, 4, 6, or 8 characters with optional #)
 */
export function isValidHex(color: string): boolean {
    return /^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(color);
}

/**
 * The lowest channel value (0-255) at which Figma rings a swatch so that it
 * stays visible on a white surface. Measured on the picker's document swatches:
 * #E6E6E6, #F5F5F5, #FFFFE5 and #EBEBF7 carry the ring; #D9D9D9 and #D9E5FF do not.
 */
const LIGHT_CHANNEL_FLOOR = 0xe0;

/**
 * Expand a 3-, 4-, 6- or 8-digit hex color into `#RRGGBBAA`, upper case.
 * @param color - a hex color, with or without `#`
 * @returns the 8-digit form, or `undefined` when the text is not a hex color
 */
export function normalizeHexa(color: string): string | undefined {
    if (!isValidHex(color)) {
        return undefined;
    }
    let digits = color.replace("#", "");
    if (digits.length <= 4) {
        digits = digits.replace(/./g, "$&$&");
    }
    if (digits.length === 6) {
        digits += "ff";
    }
    return `#${digits.toUpperCase()}`;
}

/**
 * Whether a color is light enough to need the swatch ring Figma draws on
 * near-white colors (every channel at or above 0xE0).
 * @param color - a hex color
 * @returns true for near-white colors
 */
export function isLightColor(color: string): boolean {
    const hexa = normalizeHexa(color);
    if (hexa === undefined) {
        return false;
    }
    return [1, 3, 5].every((i) => Number.parseInt(hexa.slice(i, i + 2), 16) >= LIGHT_CHANNEL_FLOOR);
}

/**
 * The color a fraction of the way between two hex colors, channel by channel.
 * Used when a click on a gradient bar adds a stop between two others.
 * @param from - the color at 0
 * @param to - the color at 1
 * @param t - how far along, 0 to 1
 * @returns `#RRGGBB`, upper case
 */
export function mixHex(from: string, to: string, t: number): string {
    const a = normalizeHexa(from) ?? "#000000FF";
    const b = normalizeHexa(to) ?? "#000000FF";
    const channel = (i: number): string => {
        const x = Number.parseInt(a.slice(i, i + 2), 16);
        const y = Number.parseInt(b.slice(i, i + 2), 16);
        return Math.round(x + (y - x) * t)
            .toString(16)
            .padStart(2, "0");
    };
    return `#${channel(1)}${channel(3)}${channel(5)}`.toUpperCase();
}

/**
 * The CSS color keywords, written as words a reader says ("dark green" for `darkgreen`), with the
 * color each names. Where two keywords name one color the table keeps one: "cyan" (not "aqua"),
 * "magenta" (not "fuchsia") and "gray" (not "grey").
 */
const CSS_COLOR_WORDS =
    "alice blue F0F8FF,antique white FAEBD7,aquamarine 7FFFD4,azure F0FFFF,beige F5F5DC,bisque FFE4C4," +
    "black 000000,blanched almond FFEBCD,blue 0000FF,blue violet 8A2BE2,brown A52A2A,burlywood DEB887," +
    "cadet blue 5F9EA0,chartreuse 7FFF00,chocolate D2691E,coral FF7F50,cornflower blue 6495ED," +
    "cornsilk FFF8DC,crimson DC143C,cyan 00FFFF,dark blue 00008B,dark cyan 008B8B,dark goldenrod B8860B," +
    "dark gray A9A9A9,dark green 006400,dark khaki BDB76B,dark magenta 8B008B,dark olive green 556B2F," +
    "dark orange FF8C00,dark orchid 9932CC,dark red 8B0000,dark salmon E9967A,dark sea green 8FBC8F," +
    "dark slate blue 483D8B,dark slate gray 2F4F4F,dark turquoise 00CED1,dark violet 9400D3," +
    "deep pink FF1493,deep sky blue 00BFFF,dim gray 696969,dodger blue 1E90FF,firebrick B22222," +
    "floral white FFFAF0,forest green 228B22,gainsboro DCDCDC,ghost white F8F8FF,gold FFD700," +
    "goldenrod DAA520,gray 808080,green 008000,green yellow ADFF2F,honeydew F0FFF0,hot pink FF69B4," +
    "indian red CD5C5C,indigo 4B0082,ivory FFFFF0,khaki F0E68C,lavender E6E6FA,lavender blush FFF0F5," +
    "lawn green 7CFC00,lemon chiffon FFFACD,light blue ADD8E6,light coral F08080,light cyan E0FFFF," +
    "light goldenrod yellow FAFAD2,light gray D3D3D3,light green 90EE90,light pink FFB6C1," +
    "light salmon FFA07A,light sea green 20B2AA,light sky blue 87CEFA,light slate gray 778899," +
    "light steel blue B0C4DE,light yellow FFFFE0,lime 00FF00,lime green 32CD32,linen FAF0E6," +
    "magenta FF00FF,maroon 800000,medium aquamarine 66CDAA,medium blue 0000CD,medium orchid BA55D3," +
    "medium purple 9370DB,medium sea green 3CB371,medium slate blue 7B68EE,medium spring green 00FA9A," +
    "medium turquoise 48D1CC,medium violet red C71585,midnight blue 191970,mint cream F5FFFA," +
    "misty rose FFE4E1,moccasin FFE4B5,navajo white FFDEAD,navy 000080,old lace FDF5E6,olive 808000," +
    "olive drab 6B8E23,orange FFA500,orange red FF4500,orchid DA70D6,pale goldenrod EEE8AA," +
    "pale green 98FB98,pale turquoise AFEEEE,pale violet red DB7093,papaya whip FFEFD5,peach puff FFDAB9," +
    "peru CD853F,pink FFC0CB,plum DDA0DD,powder blue B0E0E6,purple 800080,rebecca purple 663399," +
    "red FF0000,rosy brown BC8F8F,royal blue 4169E1,saddle brown 8B4513,salmon FA8072,sandy brown F4A460," +
    "sea green 2E8B57,seashell FFF5EE,sienna A0522D,silver C0C0C0,sky blue 87CEEB,slate blue 6A5ACD," +
    "slate gray 708090,snow FFFAFA,spring green 00FF7F,steel blue 4682B4,tan D2B48C,teal 008080," +
    "thistle D8BFD8,tomato FF6347,turquoise 40E0D0,violet EE82EE,wheat F5DEB3,white FFFFFF," +
    "white smoke F5F5F5,yellow FFFF00,yellow green 9ACD32";

/** The keyword words above by `#RRGGBB`, for {@link colorWord}. */
const CSS_COLOR_WORD_BY_HEX: ReadonlyMap<string, string> = new Map(
    CSS_COLOR_WORDS.split(",").map((entry) => {
        const at = entry.lastIndexOf(" ");
        return [`#${entry.slice(at + 1)}`, entry.slice(0, at)] as const;
    }),
);

/**
 * Hue bands, by the hue each ends at, and their names. Green runs to 170 so a bluish green (the
 * Okabe-Ito 009E73) reads green; indigo (235-260), violet and purple are bands of their own, so a
 * blue-violet such as 6366F1 is not "blue" and 800080's hue is "purple", not "pink".
 */
const HUES: readonly (readonly [number, string])[] = [
    [15, "red"],
    [45, "orange"],
    [70, "yellow"],
    [170, "green"],
    [195, "teal"],
    [235, "blue"],
    [260, "indigo"],
    [280, "violet"],
    [320, "purple"],
    [350, "pink"],
    [360, "red"],
];

/**
 * The word for a color with next to no hue, by its lightness.
 * @param light - the lightness, 0 to 1
 * @returns black, white, or a gray
 */
function grayWord(light: number): string {
    if (light < 0.1) {
        return "black";
    }
    if (light > 0.94) {
        return "white";
    }
    if (light < 0.4) {
        return "dark gray";
    }
    return light > 0.75 ? "light gray" : "gray";
}

/**
 * A color's hue in sixths of the color wheel, 0 to 6.
 * @param r - red, 0 to 1
 * @param g - green, 0 to 1
 * @param b - blue, 0 to 1
 * @param max - the largest of the three
 * @param chroma - the largest less the smallest, above 0
 * @returns the hue
 */
function hueSextant(r: number, g: number, b: number, max: number, chroma: number): number {
    if (max === r) {
        return ((g - b) / chroma + 6) % 6;
    }
    if (max === g) {
        return (b - r) / chroma + 2;
    }
    return (r - g) / chroma + 4;
}

/**
 * A color as a reader says it, in English: the CSS keyword, in words, when the color is exactly
 * one ("purple" for 800080, "dark green" for 006400), else its hue band with "dark" or "light"
 * ("orange", "dark indigo", "light gray"). For spoken names and tooltips beside a hex code, never
 * in place of one.
 * @param color - a hex color, 3 to 8 digits, with or without `#`
 * @returns the color's word, or "" when the text is not a hex color
 */
export function colorWord(color: string): string {
    const hexa = normalizeHexa(color);
    if (hexa === undefined) {
        return "";
    }
    const keyword = CSS_COLOR_WORD_BY_HEX.get(hexa.slice(0, 7));
    if (keyword !== undefined) {
        return keyword;
    }
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hexa.slice(i, i + 2), 16) / MAX_ALPHA_HEX);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const light = (max + min) / 2;
    const chroma = max - min;
    if (chroma < 0.1) {
        return grayWord(light);
    }
    const hue = hueSextant(r, g, b, max, chroma);
    const name = HUES.find(([end]) => hue * 60 < end)?.[1] ?? "red";
    if ((name === "orange" || name === "yellow") && light < 0.35) {
        return "brown";
    }
    if (light < 0.3) {
        return `dark ${name}`;
    }
    return light > 0.75 ? `light ${name}` : name;
}
