/**
 * Two parts of how Graphviz draws a node that its attributes alone do not say: the font a `fontname` picks, and the
 * corners of a `shape=polygon` node.
 *
 * - Fonts (`lib/common/ps_font_equiv.h`): a PostScript name such as `Helvetica-Bold` or `Times-Italic` (any case)
 *   is that family at that weight and slant, drawn by a generic family when the machine lacks it. Any other name
 *   goes to fontconfig as it is, which draws a family it does not have in its default, sans-serif face.
 * - Polygons (`poly_init`, `lib/common/shapes.c`): `sides` corners of a regular polygon, widened by `distortion`
 *   toward the top or the bottom, sheared by `skew` and turned by `orientation` degrees, then stretched to the
 *   node's box. Corners that reach past the box after the turn make the node larger.
 */

/** A family a CSS font list falls back to. */
const GENERIC_FAMILIES: ReadonlySet<string> = new Set([
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
    readonly bold: boolean;
    readonly italic: boolean;
}

/**
 * The font a Graphviz `fontname` draws.
 * @param name - the `fontname` value
 * @returns the families, weight and slant
 */
export function graphvizFont(name: string): GraphvizFont {
    const trimmed = name.trim();
    // a fontconfig pattern (`DejaVu Sans:bold`) is written into the SVG as it is, a family no viewer has, so the
    // drawing falls back to the viewer's default face
    if (trimmed.includes(":")) {
        return { family: "Times, serif", bold: false, italic: false };
    }
    const ps = postscriptFont(trimmed);
    if (ps !== null) {
        return ps;
    }
    const last = trimmed.split(",").at(-1)?.trim().toLowerCase() ?? "";
    return { family: GENERIC_FAMILIES.has(last) ? trimmed : `${trimmed}, sans-serif`, bold: false, italic: false };
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

/** A `shape=polygon` node's form: Graphviz's polygon attributes. */
interface GraphvizPolygon {
    readonly sides: number;
    readonly distortion: number;
    readonly skew: number;
    /** Degrees, counter-clockwise. */
    readonly orientation: number;
}

/**
 * The corners of a Graphviz polygon as fractions of the half width and half height of the box Graphviz fits it to
 * (y up): a regular polygon's corners lie on the box's ellipse, and a distorted, skewed or turned one may reach past
 * the box, which Graphviz then grows to hold it.
 * @param polygon - the polygon's attributes
 * @returns the corners, in Graphviz's order
 */
export function graphvizPolygonCorners(polygon: GraphvizPolygon): [number, number][] {
    const { sides, distortion, skew, orientation } = polygon;
    const sector = (2 * Math.PI) / sides;
    const sideLength = Math.sin(sector / 2);
    const skewDist = Math.hypot(Math.abs(distortion) + Math.abs(skew), 1);
    const gDistortion = (distortion * Math.SQRT2) / Math.cos(sector / 2);
    const gSkew = skew / 2;
    let angle = (sector - Math.PI) / 2;
    let rx = 0.5 * Math.cos(angle);
    let ry = 0.5 * Math.sin(angle);
    angle += (Math.PI - sector) / 2;
    const corners: [number, number][] = [];
    for (let i = 0; i < sides; i++) {
        angle += sector;
        rx += sideLength * Math.cos(angle);
        ry += sideLength * Math.sin(angle);
        const px = rx * (skewDist + ry * gDistortion) + ry * gSkew;
        const alpha = (orientation * Math.PI) / 180 + Math.atan2(ry, px);
        const r = Math.hypot(px, ry);
        // Graphviz's corners are fractions of the box's whole width; twice that is a fraction of the half width
        corners.push([2 * r * Math.cos(alpha), 2 * r * Math.sin(alpha)]);
    }
    return corners;
}

/**
 * Whether a polygon is drawn as a plain box: four sides, no distortion or skew, turned by a multiple of 90 degrees
 * (Graphviz then fits the label exactly, with no ellipse around it).
 * @param polygon - the polygon's attributes
 * @returns true for a box
 */
export function isGraphvizBox(polygon: GraphvizPolygon): boolean {
    return (
        polygon.sides === 4 &&
        Math.abs(polygon.orientation % 90) < 0.5 &&
        polygon.distortion === 0 &&
        polygon.skew === 0
    );
}

/** Graphviz's built-in shapes that are polygons of their own sides, distortion, skew and orientation (`shapes.c`). */
export const GRAPHVIZ_POLYGON_SHAPES: ReadonlyMap<string, GraphvizPolygon> = new Map(
    (
        [
            ["triangle", 3, 0, 0, 0],
            ["invtriangle", 3, 0, 0, 180],
            ["trapezium", 4, -0.4, 0, 0],
            ["invtrapezium", 4, -0.4, 0, 180],
            ["parallelogram", 4, 0, 0.6, 0],
            ["house", 5, -0.64, 0, 0],
            ["invhouse", 5, -0.64, 0, 180],
            ["pentagon", 5, 0, 0, 0],
            ["septagon", 7, 0, 0, 0],
            // a distorted ellipse is drawn as a polygon of 120 sides
            ["egg", 120, -0.3, 0, 0],
        ] as const
    ).map(([name, sides, distortion, skew, orientation]) => [name, { sides, distortion, skew, orientation }]),
);

/** A point in points, relative to a node's center, y up. */
type GlyphPoint = readonly [number, number];

/**
 * A Graphviz shape drawn as pieces of its own (`round_corners`, lib/common/shapes.c): its outline, further closed
 * pieces beside it, and open lines, every point in points relative to the node's center, y up.
 */
interface GraphvizGlyph {
    /** The outline the node's fill and border follow. */
    readonly outline: readonly GlyphPoint[];
    /** Further closed pieces, filled and outlined as the outline is (an `assembly`'s second bar). */
    readonly parts: readonly (readonly GlyphPoint[])[];
    /** Open lines in the pen's color (a `promoter`'s baseline, a `box3d`'s edges); one ending where it starts is closed. */
    readonly lines: readonly (readonly GlyphPoint[])[];
    /** Whether the outline is filled with no line round it (an `underline`, whose line is its lines alone). */
    readonly unstroked?: boolean;
    /** How far out from the outline a ring round it is drawn, line to line (an `insulator`'s open square). */
    readonly ring?: number;
}

/**
 * A synthetic-biology shape's baseline across the node's middle.
 * @param W - half the node's width
 * @returns the line
 */
const baseline = (W: number): GlyphPoint[] => [
    [-W, 0],
    [W, 0],
];

/** The bow tie of a ribosome or protease site (shapes.c's `RIBOSITE`, `PROTEASESITE`), 6 by 6 points. */
const BOW_TIE: readonly GlyphPoint[] = [
    [3, 6],
    [3, 7.5],
    [1.5, 9],
    [3, 10.5],
    [3, 12],
    [1.5, 12],
    [0, 10.5],
    [-1.5, 12],
    [-3, 12],
    [-3, 10.5],
    [-1.5, 9],
    [-3, 7.5],
    [-3, 6],
    [-1.5, 6],
    [0, 7.5],
    [1.5, 6],
];

/** The octagon of an RNA or protein stability element (shapes.c's `RNASTAB`, `PROTEINSTAB`), 6 by 6 points. */
const OCTAGON: readonly GlyphPoint[] = [
    [1.5, 6],
    [3, 7.5],
    [3, 10.5],
    [1.5, 12],
    [-1.5, 12],
    [-3, 10.5],
    [-3, 7.5],
    [-1.5, 6],
];

/** A stem drawn as two short dashes from the baseline up to a glyph 6 points above it. */
const DASHED_STEM: readonly GlyphPoint[][] = [
    [
        [0, 0],
        [0, 1.5],
    ],
    [
        [0, 3],
        [0, 4.5],
    ],
];

/**
 * A bar 6 points tall.
 * @param x0 - its left
 * @param x1 - its right
 * @param y - its bottom
 * @returns its corners
 */
const bar = (x0: number, x1: number, y: number): GlyphPoint[] => [
    [x0, y],
    [x1, y],
    [x1, y + 6],
    [x0, y + 6],
];

// Each shape's pieces at a node W by H points from its center (half its width and height). Graphviz draws the
// decorations a fixed number of points across whatever the node's size, and the synthetic-biology glyphs on a
// baseline through the node's middle, most of them a fixed size (measured with Graphviz 14.1.2's `neato -n2 -Tsvg`
// at 36 x 36, 72 x 36, 36 x 72 and 108 x 54 points).
const GLYPHS: ReadonlyMap<string, (W: number, H: number) => GraphvizGlyph> = new Map<
    string,
    (W: number, H: number) => GraphvizGlyph
>([
    [
        "box3d",
        (W, H) => ({
            outline: [
                [W, H],
                [-W + 4, H],
                [-W, H - 4],
                [-W, -H],
                [W - 4, -H],
                [W, -H + 4],
            ],
            parts: [],
            lines: [
                [
                    [W - 4, H - 4],
                    [-W, H - 4],
                ],
                [
                    [W - 4, H - 4],
                    [W - 4, -H],
                ],
                [
                    [W - 4, H - 4],
                    [W, H],
                ],
            ],
        }),
    ],
    [
        "tab",
        (W, H) => ({
            outline: [
                [W, H],
                [-W + 12, H],
                [-W + 12, H + 4],
                [-W, H + 4],
                [-W, -H],
                [W, -H],
            ],
            parts: [],
            lines: [
                [
                    [-W, H],
                    [-W + 12, H],
                ],
            ],
        }),
    ],
    [
        "folder",
        (W, H) => ({
            outline: [
                [W, H],
                [W - 3, H + 4],
                [W - 24, H + 4],
                [W - 27, H],
                [-W, H],
                [-W, -H],
                [W, -H],
            ],
            parts: [],
            lines: [],
        }),
    ],
    [
        "component",
        (W, H) => ({
            outline: [
                [W, H],
                [-W, H],
                [-W, H - 4],
                [-W - 4, H - 4],
                [-W - 4, H - 8],
                [-W, H - 8],
                [-W, -H + 8],
                [-W - 4, -H + 8],
                [-W - 4, -H + 4],
                [-W, -H + 4],
                [-W, -H],
                [W, -H],
            ],
            parts: [],
            lines: [
                [
                    [-W, H - 4],
                    [-W + 4, H - 4],
                    [-W + 4, H - 8],
                    [-W, H - 8],
                ],
                [
                    [-W, -H + 8],
                    [-W + 4, -H + 8],
                    [-W + 4, -H + 4],
                    [-W, -H + 4],
                ],
            ],
        }),
    ],
    [
        "note",
        (W, H) => ({
            outline: [
                [W - 6, H],
                [-W, H],
                [-W, -H],
                [W, -H],
                [W, H - 6],
            ],
            parts: [],
            lines: [
                [
                    [W - 6, H],
                    [W - 6, H - 6],
                ],
                [
                    [W, H - 6],
                    [W - 6, H - 6],
                ],
            ],
        }),
    ],
    [
        "underline",
        (W, H) => ({
            outline: [
                [W, H],
                [-W, H],
                [-W, -H],
                [W, -H],
            ],
            parts: [],
            lines: [
                [
                    [-W, -H],
                    [W, -H],
                ],
            ],
            unstroked: true,
        }),
    ],
    [
        "cds",
        (W, H) => ({
            outline: [
                [W - 12, H - 6],
                [-W, H - 6],
                [-W, -H + 6],
                [W - 12, -H + 6],
                [W, 0],
            ],
            parts: [],
            lines: [],
        }),
    ],
    [
        "larrow",
        (W, H) => ({
            outline: [
                [W, H - 6],
                [-W + 18, H - 6],
                [-W + 18, H],
                [-W, 0],
                [-W + 18, -H],
                [-W + 18, -H + 6],
                [W, -H + 6],
            ],
            parts: [],
            lines: [],
        }),
    ],
    [
        "rarrow",
        (W, H) => ({
            outline: [
                [W - 18, H - 6],
                [-W, H - 6],
                [-W, -H + 6],
                [W - 18, -H + 6],
                [W - 18, -H],
                [W, 0],
                [W - 18, H],
            ],
            parts: [],
            lines: [],
        }),
    ],
    [
        "lpromoter",
        (W, H) => ({
            outline: [
                [W, H - 6],
                [-W + 18, H - 6],
                [-W + 18, H],
                [-W, 0],
                [-W + 18, -H],
                [-W + 18, -H + 6],
                [W - 18, -H + 6],
                [W - 18, -H],
                [W, -H],
            ],
            parts: [],
            lines: [],
        }),
    ],
    [
        "rpromoter",
        (W, H) => ({
            outline: [
                [W - 18, H - 6],
                [-W, H - 6],
                [-W, -H],
                [-W + 18, -H],
                [-W + 18, -H + 6],
                [W - 18, -H + 6],
                [W - 18, -H],
                [W, 0],
                [W - 18, H],
            ],
            parts: [],
            lines: [],
        }),
    ],
    [
        "promoter",
        (W) => ({
            outline: [
                [W / 4, 18],
                [-W / 2, 18],
                [-W / 2, 0],
                [-W / 2 + 6, 0],
                [-W / 2 + 6, 12],
                [W / 4, 12],
                [W / 4, 9],
                [W / 4 + 12, 15],
                [W / 4, 21],
            ],
            parts: [],
            lines: [baseline(W)],
        }),
    ],
    [
        "terminator",
        (W) => ({
            outline: [
                [3, 0],
                [3, 6],
                [9, 6],
                [9, 12],
                [-9, 12],
                [-9, 6],
                [-3, 6],
                [-3, 0],
            ],
            parts: [],
            lines: [baseline(W)],
        }),
    ],
    [
        "utr",
        (W) => ({
            outline: [
                [9, 0],
                [9, 3],
                [3, 9],
                [-3, 9],
                [-9, 3],
                [-9, 0],
            ],
            parts: [],
            lines: [baseline(W)],
        }),
    ],
    [
        "primersite",
        (W) => ({
            outline: [
                [12, 3],
                [0, 15],
                [0, 9],
                [-W / 2, 9],
                [-W / 2, 3],
            ],
            parts: [],
            lines: [baseline(W)],
        }),
    ],
    [
        "restrictionsite",
        (W) => {
            const [a, b] = [W / 4, W / 4 + 6];
            return {
                outline: [
                    [b, 3],
                    [-a, 3],
                    [-a, 9],
                    [-b, 9],
                    [-b, -3],
                    [a, -3],
                    [a, -9],
                    [b, -9],
                ],
                parts: [],
                lines: [
                    [
                        [-W, 0],
                        [-b, 0],
                    ],
                    [
                        [b, 0],
                        [W, 0],
                    ],
                ],
            };
        },
    ],
    [
        "fivepoverhang",
        (W) => ({
            outline: bar(-W, -W + 24, 1.5),
            parts: [bar(-W + 12, -W + 24, -7.5)],
            lines: [
                [
                    [-W + 24, 0],
                    [W, 0],
                ],
            ],
        }),
    ],
    [
        "threepoverhang",
        (W) => ({
            outline: bar(W - 24, W, 1.5),
            parts: [bar(W - 24, W - 12, -7.5)],
            lines: [
                [
                    [-W, 0],
                    [W - 24, 0],
                ],
            ],
        }),
    ],
    [
        "noverhang",
        (W) => ({
            outline: bar(-13.5, -1.5, 1.5),
            parts: [bar(-13.5, -1.5, -7.5), bar(1.5, 13.5, -7.5), bar(1.5, 13.5, 1.5)],
            lines: [
                [
                    [13.5, 0],
                    [W, 0],
                ],
                [
                    [-13.5, 0],
                    [-W, 0],
                ],
            ],
        }),
    ],
    [
        "assembly",
        (W) => ({
            outline: bar(-12, 12, 1.5),
            parts: [bar(-12, 12, -7.5)],
            lines: [
                [
                    [12, 0],
                    [W, 0],
                ],
                [
                    [-W, 0],
                    [-12, 0],
                ],
            ],
        }),
    ],
    [
        "signature",
        (W, H) => ({
            outline: [
                [W, H - 6],
                [-W, H - 6],
                [-W, -H + 6],
                [W, -H + 6],
            ],
            parts: [],
            lines: [
                [
                    [-W + 3, 1.5],
                    [-W + 6, -1.5],
                ],
                [
                    [-W + 3, -1.5],
                    [-W + 6, 1.5],
                ],
                [
                    [-W + 3, -H + 9],
                    [W - 3, -H + 9],
                ],
            ],
        }),
    ],
    [
        "insulator",
        (W) => ({
            outline: [
                [6, 6],
                [6, -6],
                [-6, -6],
                [-6, 6],
            ],
            parts: [],
            // the square 3 points round it is a ring
            ring: 3,
            lines: [
                [
                    [9, 0],
                    [W, 0],
                ],
                [
                    [-W, 0],
                    [-9, 0],
                ],
            ],
        }),
    ],
    ["ribosite", (W) => ({ outline: BOW_TIE, parts: [], lines: [...DASHED_STEM, baseline(W)] })],
    ["rnastab", (W) => ({ outline: OCTAGON, parts: [], lines: [...DASHED_STEM, baseline(W)] })],
    [
        "proteasesite",
        (W) => ({
            outline: BOW_TIE,
            parts: [],
            lines: [
                [
                    [0, 7.5],
                    [0, 0],
                ],
                baseline(W),
            ],
        }),
    ],
    [
        "proteinstab",
        (W) => ({
            outline: OCTAGON,
            parts: [],
            lines: [
                [
                    [0, 6],
                    [0, 0],
                ],
                baseline(W),
            ],
        }),
    ],
]);

/** The shapes Graphviz draws as pieces of their own (`GLYPHS`). */
export const GRAPHVIZ_GLYPH_SHAPES: ReadonlySet<string> = new Set(GLYPHS.keys());

/** The shapes among them that are boxes with a decoration, which Graphviz fits the label inside exactly, as a box. */
export const GRAPHVIZ_DECORATED_BOXES: ReadonlySet<string> = new Set([
    "box3d",
    "tab",
    "folder",
    "component",
    "note",
    "underline",
    "cds",
    "larrow",
    "rarrow",
    "lpromoter",
    "rpromoter",
]);

/** Graphviz's default node size in points, 0.75 by 0.5 inch, for a node that states none. */
const DEFAULT_SIZE = [54, 36] as const;

/**
 * The pieces Graphviz draws a shape as at a size, or null for a shape it draws otherwise.
 * @param shape - the shape name, lowercase
 * @param width - the node's width in points, or null for Graphviz's default
 * @param height - its height in points, or null for the default
 * @returns the pieces
 */
export function graphvizGlyph(shape: string, width: number | null, height: number | null): GraphvizGlyph | null {
    const glyph = GLYPHS.get(shape);
    const w = width !== null && width > 0 ? width : DEFAULT_SIZE[0];
    const h = height !== null && height > 0 ? height : DEFAULT_SIZE[1];
    return glyph === undefined ? null : glyph(w / 2, h / 2);
}
