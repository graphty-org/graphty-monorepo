/**
 * Canonical enumeration values: each dialect's spellings matched against an alias table without regard to case,
 * spaces or underscores. An unknown value of an open enumeration (shapes, border and line styles, arrows) is kept as
 * `other:<raw>` and noted; an unknown value of a closed one (weights, positions, label fits) gives no value and is noted.
 */

import { STYLE_ISSUE } from "../codes.js";
import type { StyleDialect } from "../types.js";
import { type CanonSite, noteAt, scalarText } from "./site.js";

/**
 * The enumerations a style value can belong to.
 * @category Styles
 */
export type StyleEnumKind =
    | "shape"
    | "borderStyle"
    | "borderPosition"
    | "lineStyle"
    | "arrow"
    | "arrowSide"
    | "weight"
    | "position"
    | "labelFit"
    | "textAlign";

type Aliases = Readonly<Record<string, readonly string[]>>;

const SHAPES: Aliases = {
    ellipse: [
        "ellipse",
        "oval",
        "circle",
        "disc",
        "disk",
        "point",
        "doublecircle",
        "mcircle",
        "dot",
        "sphere",
        "circular",
    ],
    rectangle: [
        "rectangle",
        "rect",
        "box",
        "square",
        "plaintext",
        "plain",
        "record",
        "msquare",
        "box3d",
        "rectangle3d",
        "component",
        "tab",
        "folder",
        "note",
        "underline",
    ],
    "round-rectangle": [
        "round-rectangle",
        "roundrectangle",
        "roundrect",
        "rounded",
        "roundedrectangle",
        "round-rect",
        "mrecord",
        "round-tag",
        "bottom-round-rectangle",
        "bottomroundrectangle",
    ],
    triangle: ["triangle", "invtriangle", "round-triangle", "tag"],
    diamond: ["diamond", "rhombus", "mdiamond", "round-diamond"],
    pentagon: ["pentagon", "round-pentagon"],
    hexagon: [
        "hexagon",
        "hexagon2",
        "round-hexagon",
        "concave-hexagon",
        "concavehexagon",
        "septagon",
        "heptagon",
        "round-heptagon",
    ],
    // a cut rectangle is a rectangle with its four corners cut off: eight sides
    octagon: [
        "octagon",
        "doubleoctagon",
        "tripleoctagon",
        "round-octagon",
        "octagon2",
        "cut-rectangle",
        "cutrectangle",
    ],
    parallelogram: ["parallelogram", "parallelogram2", "rhomboid", "right-rhomboid", "fat-arrow", "fatarrow"],
    trapezoid: ["trapezoid", "trapezoid2", "invtrapezoid", "trapezium", "round-trapezoid"],
    star: ["star", "star5", "star6", "star8", "polygon"],
    vee: ["vee", "v"],
    none: ["none", "empty", "invis"],
};

const BORDER_STYLES: Aliases = {
    solid: ["solid", "line"],
    dashed: ["dashed", "dash", "equal-dash"],
    dotted: ["dotted", "dot", "dots"],
    "dash-dot": ["dash-dot", "dashdot", "dashed-dotted"],
    double: ["double", "parallel-lines"],
};

const LINE_STYLES: Aliases = {
    solid: ["solid", "line", "continuous", "separate-arrow"],
    dashed: ["dashed", "dash", "dashed-line", "equal-dash"],
    dotted: ["dotted", "dot", "dots", "dotted-line"],
    "dash-dot": ["dash-dot", "dashdot", "dashed-dotted", "dash-dot-dot"],
    "long-dash": ["long-dash", "longdash"],
    double: ["double", "parallel", "parallel-lines"],
    zigzag: ["zigzag"],
    sinewave: ["sinewave", "sine-wave"],
};

const ARROWS: Aliases = {
    none: ["none", "no-arrow", "noarrow", "0"],
    triangle: [
        "triangle",
        "normal",
        "delta",
        "standard",
        "arrow",
        "triangle-backcurve",
        "white-delta-inverted",
        "simple",
        "short",
        "plain",
        "convex",
        "a",
    ],
    "triangle-open": ["triangle-open", "onormal", "empty", "white-delta", "transparent-circle-inverted", "open-delta"],
    vee: ["vee", "open", "chevron", "concave", "triangle-cross", "b"],
    tee: ["tee", "t", "t-shape", "half-bottom", "half-top", "bar"],
    diamond: ["diamond", "white-diamond-inverted"],
    "diamond-open": ["diamond-open", "odiamond", "white-diamond", "ediamond", "open-diamond"],
    circle: ["circle", "dot", "transparent-circle", "white-circle-inverted"],
    "circle-open": ["circle-open", "odot", "white-circle", "open-circle"],
    square: ["square", "box", "skewed-dash"],
    // An X-shaped "cross" (yEd, yFiles) is not a crow's foot: it stays other:cross.
    crow: ["crow", "crows-foot", "crows-foot-many"],
    half: ["half", "half-top-arrow", "half-open", "lnormal", "rnormal", "halfopen"],
    inverted: ["inverted", "inv", "inverted-triangle", "inv-triangle"],
};

const WEIGHTS: Aliases = {
    normal: ["normal", "regular", "plain", "lighter", "100", "200", "300", "400", "500"],
    bold: ["bold", "bolder", "600", "700", "800", "900"],
};

const POSITIONS: Aliases = {
    center: ["center", "centre", "middle", "c"],
    top: ["top", "north", "t"],
    bottom: ["bottom", "south", "b"],
    left: ["left", "west", "l"],
    right: ["right", "east", "r"],
    "top-left": ["top-left", "north-west", "northwest"],
    "top-right": ["top-right", "north-east", "northeast"],
    "bottom-left": ["bottom-left", "south-west", "southwest"],
    "bottom-right": ["bottom-right", "south-east", "southeast"],
    "inside-top": ["inside-top"],
    "inside-bottom": ["inside-bottom"],
    "inside-left": ["inside-left"],
    "inside-right": ["inside-right"],
    "inside-top-left": ["inside-top-left"],
    "inside-top-right": ["inside-top-right"],
    "inside-bottom-left": ["inside-bottom-left"],
    "inside-bottom-right": ["inside-bottom-right"],
};

const BORDER_POSITIONS: Aliases = {
    inside: ["inside"],
    center: ["center", "centre", "middle"],
    outside: ["outside"],
};

const ARROW_SIDES: Aliases = {
    left: ["left"],
    right: ["right"],
};

const TEXT_ALIGNS: Aliases = {
    left: ["left", "start"],
    center: ["center", "centre", "middle"],
    right: ["right", "end"],
};

const LABEL_FITS: Aliases = {
    inside: ["inside"],
    bounds: ["bounds"],
};

/** vis-network draws these spellings differently from the common reading. */
const VIS: Partial<Record<StyleEnumKind, Aliases>> = {
    shape: {
        "round-rectangle": ["box"],
        ellipse: ["dot"],
        triangle: ["triangledown"],
        none: ["text"],
    },
    // curve and inv_curve: an arc at the end, bulging toward the node and away from it
    arrow: { inverted: ["inv-triangle"], square: ["box"], "other:curve": ["curve"], "other:inv-curve": ["inv-curve"] },
};

/**
 * Cytoscape.js's compound arrows (https://js.cytoscape.org/#style/edge-arrow): a triangle with a bar behind it, with a
 * thin bar across the line behind it, a dot with a triangle behind it and its short chevron each keep their own name;
 * its triangle-backcurve is a triangle whose back is hollowed out, which is how a vee is drawn.
 */
const CYJS: Partial<Record<StyleEnumKind, Aliases>> = {
    arrow: {
        "other:triangle-tee": ["triangle-tee"],
        "other:triangle-cross": ["triangle-cross"],
        "other:circle-triangle": ["circle-triangle"],
        // a vee two thirds as long as its triangle (0.2 of the arrow width against 0.3)
        "other:chevron": ["chevron"],
        vee: ["triangle-backcurve"],
    },
};

/**
 * Graphviz's curve and icurve (lib/common/arrows.c arrow_type_curve): a stem to the tip with an arc across it, bulging
 * toward the tip and, inverted, away from it -- vis-network's curve and inv_curve.
 */
const GRAPHVIZ: Partial<Record<StyleEnumKind, Aliases>> = {
    arrow: { "other:curve": ["curve"], "other:inv-curve": ["icurve"] },
};

/**
 * yEd's (yFiles for Java's) STANDARD arrow is "a triangle with impressed bottom side", a notched arrow; its DELTA is the
 * plain triangle (https://docs.yworks.com/yfiles/doc/api/y/view/Arrow.html).
 */
const YED: Partial<Record<StyleEnumKind, Aliases>> = {
    arrow: { vee: ["standard"] },
};

/** Per-dialect overrides; a dialect not listed reads the common table alone. */
const OVERRIDES: ReadonlyMap<string, Partial<Record<StyleEnumKind, Aliases>>> = new Map([
    ["vis", VIS],
    ["graphviz", GRAPHVIZ],
    ["cytoscape-js", CYJS],
    ["yed", YED],
]);

const OPEN: ReadonlySet<StyleEnumKind> = new Set<StyleEnumKind>(["shape", "borderStyle", "lineStyle", "arrow"]);

/**
 * Builds an alias lookup.
 * @param aliases - canonical value to spellings
 * @returns spelling to canonical value
 */
function lookup(aliases: Aliases): ReadonlyMap<string, string> {
    const map = new Map<string, string>();
    for (const [value, spellings] of Object.entries(aliases)) {
        for (const spelling of spellings) {
            map.set(spelling, value);
        }
    }
    return map;
}

const COMMON: ReadonlyMap<StyleEnumKind, ReadonlyMap<string, string>> = new Map([
    ["shape", lookup(SHAPES)],
    ["borderStyle", lookup(BORDER_STYLES)],
    ["lineStyle", lookup(LINE_STYLES)],
    ["arrow", lookup(ARROWS)],
    ["arrowSide", lookup(ARROW_SIDES)],
    ["weight", lookup(WEIGHTS)],
    ["position", lookup(POSITIONS)],
    ["labelFit", lookup(LABEL_FITS)],
    ["borderPosition", lookup(BORDER_POSITIONS)],
    ["textAlign", lookup(TEXT_ALIGNS)],
]);

const DIALECT: ReadonlyMap<string, ReadonlyMap<StyleEnumKind, ReadonlyMap<string, string>>> = new Map(
    Array.from(OVERRIDES, ([dialect, kinds]) => [
        dialect,
        new Map(Object.entries(kinds).map(([kind, aliases]) => [kind as StyleEnumKind, lookup(aliases)])),
    ]),
);

/**
 * A canonical enumeration value: the dialect's spelling matched without regard to case, with spaces and underscores
 * read as hyphens (Cytoscape's `ROUND_RECTANGLE` is `round-rectangle`). An unknown value is `other:<raw>` for an
 * open enumeration and null for a closed one, noted as `W_STYLE_UNKNOWN_VALUE` either way.
 * @param kind - the enumeration
 * @param raw - the file's value
 * @param dialect - the file's dialect
 * @param site - where it was read
 * @returns the canonical value, or null
 * @category Styles
 */
export function canonEnum(kind: StyleEnumKind, raw: unknown, dialect: StyleDialect, site: CanonSite): string | null {
    const text = scalarText(raw, site);
    if (text === null) {
        return null;
    }
    const trimmed = text.trim();
    const key = trimmed.toLowerCase().replaceAll(/[\s_]+/g, "-");
    const value = DIALECT.get(dialect)?.get(kind)?.get(key) ?? COMMON.get(kind)?.get(key);
    if (value !== undefined) {
        return value;
    }
    noteAt(site, STYLE_ISSUE.UNKNOWN_VALUE, trimmed);
    return OPEN.has(kind) ? `other:${trimmed}` : null;
}
