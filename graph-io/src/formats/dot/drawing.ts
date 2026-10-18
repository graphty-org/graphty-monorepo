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
interface GraphvizFont {
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
    const lower = trimmed.toLowerCase();
    for (const [base, [family, generic]] of POSTSCRIPT_FAMILIES) {
        if (lower === base || lower.startsWith(`${base}-`)) {
            const style = POSTSCRIPT_STYLES.get(lower.slice(base.length + 1));
            if (style !== undefined) {
                return { family: `${family}, ${generic}`, bold: style[0], italic: style[1] };
            }
        }
    }
    const last = trimmed.split(",").at(-1)?.trim().toLowerCase() ?? "";
    return { family: GENERIC_FAMILIES.has(last) ? trimmed : `${trimmed}, sans-serif`, bold: false, italic: false };
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

/**
 * The outlines of Graphviz's boxes with a decoration of their own (`round_corners`, `shapes.c`): their corners as
 * fractions of the half width and half height (y up), as `dot -Tjson` draws them at the default 0.75 by 0.5 inch.
 * Graphviz fits the label inside them exactly, as inside a box.
 */
// ponytail: corners taken at the default size, so the decoration grows with the node; Graphviz keeps it a fixed
// number of points (port round_corners to have it exact at every size)
export const GRAPHVIZ_DECORATED_BOXES: ReadonlyMap<string, readonly (readonly [number, number])[]> = new Map([
    [
        "box3d",
        [
            [1, 1],
            [-0.8519, 1],
            [-1, 0.7778],
            [-1, -1],
            [0.8519, -1],
            [1, -0.7778],
        ],
    ],
    [
        "tab",
        [
            [1, 1],
            [-0.5556, 1],
            [-0.5556, 1.2222],
            [-1, 1.2222],
            [-1, -1],
            [1, -1],
        ],
    ],
    [
        "folder",
        [
            [1, 1],
            [0.8889, 1.2222],
            [0.1111, 1.2222],
            [0, 1],
            [-1, 1],
            [-1, -1],
            [1, -1],
        ],
    ],
    [
        "component",
        [
            [1, 1],
            [-1, 1],
            [-1, 0.7778],
            [-1.1481, 0.7778],
            [-1.1481, 0.5556],
            [-1, 0.5556],
            [-1, -0.5556],
            [-1.1481, -0.5556],
            [-1.1481, -0.7778],
            [-1, -0.7778],
            [-1, -1],
            [1, -1],
        ],
    ],
    [
        "note",
        [
            [0.7778, 1],
            [-1, 1],
            [-1, -1],
            [1, -1],
            [1, 0.6667],
        ],
    ],
    [
        "cds",
        [
            [0.5556, 0.6667],
            [-1, 0.6667],
            [-1, -0.6667],
            [0.5556, -0.6667],
            [1, 0],
        ],
    ],
    [
        "larrow",
        [
            [1, 0.6667],
            [-0.3333, 0.6667],
            [-0.3333, 1],
            [-1, 0],
            [-0.3333, -1],
            [-0.3333, -0.6667],
            [1, -0.6667],
        ],
    ],
    [
        "rarrow",
        [
            [0.3333, 0.6667],
            [-1, 0.6667],
            [-1, -0.6667],
            [0.3333, -0.6667],
            [0.3333, -1],
            [1, 0],
            [0.3333, 1],
        ],
    ],
    [
        "lpromoter",
        [
            [1, 0.6667],
            [-0.3333, 0.6667],
            [-0.3333, 1],
            [-1, 0],
            [-0.3333, -1],
            [-0.3333, -0.6667],
            [0.3333, -0.6667],
            [0.3333, -1],
            [1, -1],
        ],
    ],
    [
        "rpromoter",
        [
            [0.3333, 0.6667],
            [-1, 0.6667],
            [-1, -1],
            [-0.3333, -1],
            [-0.3333, -0.6667],
            [0.3333, -0.6667],
            [0.3333, -1],
            [1, 0],
            [0.3333, 1],
        ],
    ],
]);
