/**
 * Pajek styles: each vertex's shape keyword and drawing parameters (`ic`, `bc`, `bw`, `x_fact`, `y_fact`, `lc`, `fos`)
 * and each line's `c`, `w` and `p`, read the way Pajek 6.02 draws them (parameters carried from line to line, `CARRIED`),
 * with Pajek's own defaults beneath (a #ffd9bc ellipse with a #660000 border, grey arcs with an arrow at the target,
 * teal edges). Colors are Pajek's: the dvips names and the ten Pajek adds, `GrayNN`, `RGBrrggbb`, `RGB(r,g,b)` and the
 * CMYK forms. Lengths are in PostScript points, the unit of Pajek's EPS and SVG export, where the drawing's [0,1] square
 * is [0,500] (`PAJEK_POINTS_PER_UNIT`): a vertex is Pajek's normal size 20 times its `x_fact` and `y_fact`,
 * `bw` and `fos` are points as written, an arc is `w` wide and an edge twice `w`.
 *
 * Writing: the same parameters from what graphty draws, leaving out what Pajek draws by default; a color that is a
 * dvips name is written by name, any other as `RGBrrggbb`, so colors are exact. The `graphty.styles` block, with the
 * per-element values its rules read inside it (Pajek has no other place for them), is one comment line,
 * `% graphty.styles <json>`, which Pajek skips and graph-io reads back.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { explicitWeights } from "../../common/weights.js";
import { canonColor, colorOpacity } from "../../styles/canon/color.js";
import { DVIPS_COLORS } from "../../styles/canon/color-tables.js";
import { canonEnum } from "../../styles/canon/enums.js";
import { canonNumber } from "../../styles/canon/number.js";
import { type CanonSite, noteAt } from "../../styles/canon/site.js";
import { canonText } from "../../styles/canon/text.js";
import { STYLE_ISSUE } from "../../styles/codes.js";
import { toolDefaults } from "../../styles/defaults.js";
import { StyleApproximations } from "../../styles/io/approximations.js";
import { styleBlockLosses, writeStyleBlock } from "../../styles/io/block.js";
import { elementValues, takeFromBlock } from "../../styles/io/round-trip.js";
import type { ExporterStyleInput } from "../../styles/io/writer.js";
import { StyleNotes } from "../../styles/notes.js";
import { plainCell } from "../../styles/plan/resolve.js";
import type {
    ImporterStyles,
    StyleColumn,
    StyleReadContext,
    StyleRule,
    StyleTarget,
    StyleValue,
    StyleWriteCapabilities,
} from "../../styles/types.js";
import type { LossNote } from "../../types.js";
import { graphvizFontName, postscriptFont } from "../dot/drawing.js";
import { type ValueColumns, valueColumns } from "../graphml/styles-yed.js";
import { drawLines, drawsLineLabels, drawsStraightLines, drawVertices, type PajekDraw } from "./draw.js";
import { LABEL_COLUMN, PAJEK_STYLE_COMMENT, SHAPE_COLUMN, VALUE_COLUMN } from "./syntax.js";

/**
 * What the Pajek writer holds natively: the vertex label, the vertex shape keyword (a polygon only as Pajek's diamond,
 * `shapePoints` with its `q`) and drawing parameters, the line
 * parameters, and the arrows Pajek draws on arcs. The `graphty.styles` block is a comment line the writer places itself.
 * @category Built-in formats
 */
export const PAJEK_STYLE_CAPABILITIES: StyleWriteCapabilities = Object.freeze({
    tool: "pajek",
    node: Object.freeze([
        "label",
        "fill",
        "fillOpacity",
        "opacity",
        "borderColor",
        "borderWidth",
        "shape",
        "shapePoints",
        "width",
        "height",
        "labelColor",
        "labelSize",
        "labelFont",
        "labelPosition",
        "labelOffsetX",
        "labelOffsetY",
        "labelShiftX",
    ] as const),
    edge: Object.freeze([
        "color",
        "opacity",
        "width",
        "lineStyle",
        "sourceArrow",
        "targetArrow",
        "arrowSize",
        "arrowPosition",
        "label",
        "labelColor",
        "labelSize",
        "labelFont",
    ] as const),
    block: "native",
});

/**
 * Pajek's normal vertex size, in points: what `x_fact` and `y_fact` multiply (the manual, p. 89, names `x_fact` and
 * `y_fact` "magnification" without stating the value).
 * Measured in Pajek 6.02's own SVG export (`test/fidelity/oracles/pajek-*.svg`): a vertex with no size parameter is
 * drawn 20 across, and `x_fact 1.54` 30.8, on the drawing's [0,500] square.
 */
const PAJEK_VERTEX_SIZE = 20;

/**
 * How far past its vertex size Pajek draws its man and woman figures, across and up: Pajek 6.02's SVG export draws
 * them as paths that reach beyond the vertex's own square, a man 2.5 times its size across and 6.49 times its size
 * tall, a woman (her skirt and arms wider) 3 times across and 6.48 tall (`pajek-specimen-node-shapes`, vertices 9 and
 * 10 at `x_fact 0.5`: the man's path spans x -12.51..12.51 and y -32.74..32.13, the woman's -15.02..15.02 and
 * -32.99..31.79, around a size of 10).
 */
const PAJEK_FIGURES: ReadonlyMap<string, readonly [number, number]> = new Map([
    ["other:man", [2.502, 6.487]],
    ["other:woman", [3.003, 6.478]],
]);

/**
 * The factor Pajek draws a man or a woman at along an axis whose `x_fact` or `y_fact` the line leaves unset: 0.3, not
 * the 1 of every other shape (`pajek-synth-vertices`: a man that sets neither, vertices 24, 48 and 81, is drawn 15.02
 * across, 0.3 of the 50.05 of `x_fact 1`, and 30.55 tall from his feet to his head, 0.3 of `y_fact 1`'s 101.83; a woman
 * that sets neither, vertices 9, 33 and 57, 16.30 across, 0.3 of `x_fact 1`'s 54.35).
 */
const PAJEK_FIGURE_UNSET_FACTOR = 0.3;

/**
 * Points per coordinate unit: "When Postscript picture is obtained, the square [0,1]x[0,1] is transformed to
 * [0,500]x[0,500]" (Pajek, "Pajek to EPS", http://mrvar.fdv.uni-lj.si/pajek/DrawEPS.htm).
 */
export const PAJEK_POINTS_PER_UNIT = 500;

/** The vertex parameters read as styles. */
const NODE_KEYS: readonly string[] = [
    "ic",
    "bc",
    "bw",
    "s_size",
    "x_fact",
    "y_fact",
    "phi",
    "q",
    "lc",
    "fos",
    "font",
    "lr",
    "lphi",
    "la",
];

/** The line parameters read as styles. */
const EDGE_KEYS: readonly string[] = ["c", "w", "p", "s", "ap", "l", "lc", "fos", "font"];

/**
 * What Pajek carries from one line of a section to the next. A line (arc or edge) that does not set one of these
 * parameters is drawn with the value the line before it set. A vertex line that sets no parameter and names no shape
 * is drawn exactly as the vertex line before it; a vertex line that sets any starts again from Pajek's defaults.
 * Measured in Pajek 6.02's own SVG export: `test/fidelity/oracles/pajek-kdorola.svg` (vertices 2 to 59, which set
 * nothing, drawn with vertex 1's `lr 11 lphi 285 fos 9`, and 61 on as vertex 60's `box`), `pajek-1crn.svg` (vertex 3
 * drawn as vertex 2), `pajek-synth-lines.svg` (arc 3, which sets `w 3` but no `c`, drawn in arc 2's `c Blue`), and
 * the generated `shapes-and-lines.net` (vertex 5 at the default size after vertex 4's `x_fact 8`). A line's label `l`
 * is its own; its label's color, size and font are not carried here, as they only show with a label.
 */
const CARRIED: Readonly<Record<StyleTarget, readonly string[]>> = {
    node: [SHAPE_COLUMN, ...NODE_KEYS],
    edge: ["c", "w", "p", "s", "ap"],
};

/**
 * What Pajek 6.02 carries from line to line as it reads: not the pattern `p` nor the arrowhead's place `ap`, which the
 * writer still restates (`pajek-synth-lines`: edge `3 10` after `1 8 ... p Dots` and arc `5 6 -1` after a `p Solid`
 * are drawn as if no line before set one; arcs `11 12` after `10 11 ... ap 0.5` and `18 19` after `17 18 ... ap 0.25`
 * have their arrowheads at their targets).
 */
const CARRIED_LINE: readonly string[] = CARRIED.edge.filter((key) => key !== "p" && key !== "ap");

/** The width Pajek draws an edge (undirected) at for each unit of `w`; an arc is drawn `w` wide. */
const EDGE_WIDTH_PER_W = 2;

/** The color and width Pajek draws an arc with when it sets no `c` or `w` (an edge's are the tool defaults). */
const ARC_DEFAULTS = { color: "#999999", width: 1 } as const;

/**
 * A getter that gives an element the parameters an element before it set, as Pajek reads them: for a line each
 * parameter it leaves out, for a vertex all of them when it sets none (`CARRIED`).
 * @param keys - the parameters carried
 * @param whole - true for vertices: carried only to an element that sets none, and then all together
 * @returns for each element in order, its getter
 */
function carriedParams(keys: readonly string[], whole: boolean): (get: Param) => Param {
    let last = new Map<string, unknown>();
    return (get) => {
        const own = new Map<string, unknown>();
        for (const key of keys) {
            const v = get(key);
            if (v !== null) {
                own.set(key, v);
            }
        }
        if (whole) {
            if (own.size > 0) {
                last = own;
                return get;
            }
        } else {
            for (const [key, v] of own) {
                last.set(key, v);
            }
        }
        const carried = last;
        return (key) => get(key) ?? (keys.includes(key) ? (carried.get(key) ?? null) : null);
    };
}

/** The style column marking arcs, which Pajek draws with an arrow at the target. */
const DIRECTED_KEY = "directed";

/** The properties the reader reads, per target: what a file graphty wrote can bring back from its block. */
const READ: Readonly<Record<StyleTarget, readonly string[]>> = {
    node: [
        "label",
        "shape",
        "shapePoints",
        "shapePointsStretch",
        "fill",
        "fillOpacity",
        "borderColor",
        "borderWidth",
        "width",
        "height",
        "labelColor",
        "labelSize",
        "labelFont",
        "labelPosition",
        "labelOffsetX",
        "labelOffsetY",
        "labelShiftX",
        "labelRotation",
    ],
    edge: [
        "color",
        "opacity",
        "width",
        "lineStyle",
        "arrowSize",
        "arrowPosition",
        "label",
        "labelColor",
        "labelSize",
        "labelFont",
    ],
};

/** A parameter's value on one element, or null. */
type Param = (key: string) => unknown;

/** Receives one canonical value. */
type Put = (property: string, value: StyleValue | null) => void;

/** The site of a property's value. */
type At = (property: string) => CanonSite;

/**
 * Reads a Pajek color and its alpha.
 * @param raw - the parameter's value, or null
 * @param property - the color property
 * @param opacity - its opacity property, or null
 * @param put - receives the values
 * @param at - the sites
 */
function readColor(raw: unknown, property: string, opacity: string | null, put: Put, at: At): void {
    if (raw === null) {
        return;
    }
    const c = canonColor(raw, "dvips", at(property));
    if (c === null) {
        // a name Pajek does not know, or a known one in another case (`red`), fills a vertex white and draws a line
        // black (`pajek-specimen-node-fills-borders-p3` `ic-unknown-name`, `ic-lowercase-name`); ponytail: measured
        // on names in `ic` and `c` only, so a border or label color and an unreadable RGB / CMYK form keep the default
        const unknown = UNKNOWN_COLORS.get(property);
        if (unknown !== undefined && typeof raw === "string" && /^[A-Za-z]\w*$/.test(raw.trim())) {
            put(property, unknown);
        }
        return;
    }
    put(property, c.color);
    const alpha = colorOpacity(c, null, at(property), opacity !== null);
    if (opacity !== null) {
        put(opacity, alpha);
    }
}

/** What Pajek draws for a color it cannot read, by property. */
const UNKNOWN_COLORS: ReadonlyMap<string, StyleValue> = new Map([
    ["fill", "#ffffff"],
    ["color", "#000000"],
]);

/**
 * Reads a length or factor.
 * @param raw - the parameter's value, or null
 * @param property - the property
 * @param put - receives the value
 * @param at - the sites
 */
function readNumber(raw: unknown, property: string, put: Put, at: At): void {
    if (raw !== null) {
        put(property, canonNumber(raw, at(property)));
    }
}

/**
 * One vertex's style: its label, which Pajek draws beside it, and its shape keyword and drawing parameters.
 * @param get - the vertex's parameters
 * @param put - receives the values
 * @param at - the sites
 * @param place - the vertex's place in the file's coordinates, or null when it has none
 */
function readVertex(get: Param, put: Put, at: At, place: Place | null = null): void {
    // an empty label draws nothing
    const label = get(LABEL_COLUMN);
    if (label !== null && label !== "") {
        put("label", canonText(label, at("label")));
    }
    const raw = get(SHAPE_COLUMN);
    const shape = raw === null ? null : canonEnum("shape", raw, "dvips", at("shape"));
    if (raw !== null) {
        put("shape", shape);
    }
    readColor(get("ic"), "fill", "fillOpacity", put, at);
    readColor(get("bc"), "borderColor", null, put, at);
    readNumber(get("bw"), "borderWidth", put, at);
    readSize(get, put, at, PAJEK_FIGURES.get(String(shape)));
    readOutline(get, put, shape);
    readColor(get("lc"), "labelColor", null, put, at);
    readNumber(get("fos"), "labelSize", put, at);
    readFont(get("font"), put, at);
    const empty = shape === "none";
    readLabelPosition(get, put, at, empty ? EMPTY_LABEL_SIZE : null);
    readLabelAngle(get("la"), put, at, place);
    if (empty) {
        // an `empty` vertex's label is drawn white at size 1 where the line does not say otherwise, in the place
        // `lr` and `lphi` give as any label's (`pajek-synth-vertices` `empty *`: `fos 18`, `lc Yellow`, `lr 12 lphi
        // 225` all drawn; `pajek-lin-rel4` v226 to v233)
        if (get("fos") === null) {
            put("labelSize", EMPTY_LABEL_SIZE);
        }
        if (get("lc") === null) {
            put("labelColor", "#ffffff");
        }
        // and has no size: Pajek draws its lines to its center, whatever x_fact and y_fact say (`pajek-lin-rel4`
        // v228 -> v23, `pajek-synth-vertices` 6 -> 7); a sized box stops graphty's lines short of it
        put("width", 0);
        put("height", 0);
    }
}

/**
 * The corners Pajek 6.02's SVG export draws a box, a triangle and a house with, as `shapePoints` (fractions of the half
 * width and height, y up): `pajek-specimen-node-shapes`, `shape-box`, `shape-triangle`, `shape-house`.
 */
const PAJEK_OUTLINES: ReadonlyMap<string, readonly (readonly [number, number])[]> = new Map([
    [
        "rectangle",
        [
            [-1, 1],
            [1, 1],
            [1, -1],
            [-1, -1],
        ],
    ],
    [
        "triangle",
        [
            [1, -1],
            [0, 1],
            [-1, -1],
        ],
    ],
    [
        "other:house",
        [
            [-0.7, -1],
            [0.7, -1],
            [0.7, 0.3],
            [1, 0.3],
            [1, 0.4],
            [0, 1],
            [-1, 0.4],
            [-1, 0.3],
            [-0.7, 0.3],
        ],
    ],
]);

/** A diamond's `q` where the line sets none (Pajek's shipped SHAPES.CFG). */
const PAJEK_DIAMOND_Q = 0.001;

/**
 * A vertex's outline where Pajek draws one no named shape is: a diamond is Pajek's six-cornered one, its top and bottom
 * cut `q` of its half width wide (`pajek-specimen-node-shapes`: `q 0.001` by default, `q 0.5` a hexagon, `q 1` a
 * square, `q 2` a bow tie twice as wide), and `phi` turns a box, a triangle, a house or a diamond `phi` degrees
 * counterclockwise about its center (`phi-30-box`, `phi-90-triangle`: Pajek draws the shape at its size, then turns
 * it). ponytail: the corners are fractions of the size the line gives (`x_fact`, `y_fact`); a turned shape whose width
 * and height the Draw window's Size of Vertices or vectors scale apart is turned in the wrong box. A turned ellipse,
 * man or woman is drawn unturned: an outline of corners would draw an ellipse as a polygon.
 * @param get - the vertex's parameters
 * @param put - receives the values
 * @param shape - its shape
 */
function readOutline(get: Param, put: Put, shape: StyleValue | null): void {
    const phi = numberOrNull(get("phi")) ?? 0;
    const q = numberOrNull(get("q")) ?? PAJEK_DIAMOND_Q;
    const diamond: readonly (readonly [number, number])[] = [
        [-1, 0],
        [-q, 1],
        [q, 1],
        [1, 0],
        [q, -1],
        [-q, -1],
    ];
    const corners = shape === "diamond" ? diamond : PAJEK_OUTLINES.get(String(shape));
    if (corners === undefined || (shape !== "diamond" && phi % 360 === 0)) {
        return;
    }
    // turned in the drawn box, x_fact by y_fact, and back to fractions of it
    const [w, h] = [numberOrNull(get("x_fact")) || 1, numberOrNull(get("y_fact")) || 1];
    const [c, s] = [Math.cos((phi * Math.PI) / 180), Math.sin((phi * Math.PI) / 180)];
    const round = (v: number): string => String(Number(v.toFixed(4)) + 0);
    const points = corners.map(([x, y]) => {
        const [px, py] = [x * w, y * h];
        return `${round((px * c - py * s) / w)},${round((px * s + py * c) / h)}`;
    });
    put("shape", "polygon");
    put("shapePoints", points.join(" "));
    put("shapePointsStretch", false);
}

/** The size Pajek 6.02's SVG export draws an `empty` vertex's label at when the line sets no `fos`. */
const EMPTY_LABEL_SIZE = 1;

/** A vertex's place in the file's own coordinates, 0..1 across and down. */
type Place = readonly [x: number, y: number];

/**
 * A label's `font`: Pajek writes it into its SVG export as the family, as given, so a PostScript name (`Courier-Bold`,
 * `Helvetica-Oblique`) is drawn in its family, with a generic one after it, and upright, as the pinned fonts draw it
 * (`pajek-specimen-labels` `font-courier-bold` monospace, `font-helvetica-oblique` sans-serif and upright); any other
 * name is the family as written. Pajek draws every label bold whatever the name says.
 * @param raw - the parameter's value, or null
 * @param put - receives the values
 * @param at - the sites
 */
function readFont(raw: unknown, put: Put, at: At): void {
    if (raw === null || raw === "") {
        return;
    }
    const ps = typeof raw === "string" ? postscriptFont(raw.trim()) : null;
    if (ps === null) {
        readText(raw, "labelFont", put, at);
        return;
    }
    put("labelFont", ps.family);
}

/**
 * A vertex label's angle `la` (manual p. 90), degrees counterclockwise, as a clockwise rotation: Pajek 6.02's SVG export
 * turns the label by `rotate(-la)` (`pajek-specimen-labels`, `la-30` .. `la-270`). An angle of 360 or more turns the
 * label away from the middle of the file's square, (0.5, 0.5) in its own coordinates, and then `la - 360` further
 * (`la-360` at (0.4533, 0.3706) is drawn at -109.83, the direction from the middle; `la-400` at (0.5467, 0.3706) at
 * -110.17, that direction, 70.17, and 40 more); without the vertex's place it is left unread.
 * @param raw - the parameter's value, or null
 * @param put - receives the value
 * @param at - the sites
 * @param place - the vertex's place in the file's coordinates, or null
 */
function readLabelAngle(raw: unknown, put: Put, at: At, place: Place | null): void {
    let a = raw === null ? null : canonNumber(raw, at("labelRotation"));
    if (a !== null && a >= 360) {
        a = place === null ? null : (Math.atan2(0.5 - place[1], place[0] - 0.5) * 180) / Math.PI + a - 360;
    }
    if (a !== null) {
        put("labelRotation", Number(((((360 - a) % 360) + 360) % 360).toPrecision(12)));
    }
}

/**
 * A vertex's width and height in points: the normal size times its `x_fact` and `y_fact`, each 1 when unset; a vertex
 * that sets neither is left to the default beneath. The manual (p. 89) calls `s_size` "default size", but Pajek 6.02
 * draws a vertex the same size whatever its `s_size` (`pajek-specimen-node-sizes-opacity`: `s_size` 0.5, 2 and 3 all
 * drawn 36 across at `x_fact 1.8`), so it is not read. A man or a woman is the box of the figure Pajek draws for
 * that size (`PAJEK_FIGURES`), set or not, at `PAJEK_FIGURE_UNSET_FACTOR` along an axis the line sets no factor for.
 * @param get - the vertex's parameters
 * @param put - receives the values
 * @param at - the sites
 * @param figure - a figure's width and height over its size, or undefined for another shape
 */
function readSize(get: Param, put: Put, at: At, figure?: readonly [number, number]): void {
    for (const [key, property, k] of [
        ["x_fact", "width", 0],
        ["y_fact", "height", 1],
    ] as const) {
        const f = get(key);
        if (f === null && figure === undefined) {
            continue;
        }
        const unset = figure === undefined ? 1 : PAJEK_FIGURE_UNSET_FACTOR;
        const factor = f === null ? unset : canonNumber(f, at(property));
        const over = figure?.[k] ?? 1;
        put(property, factor === null ? null : Number((PAJEK_VERTEX_SIZE * factor * over).toPrecision(15)));
    }
}

/**
 * A text parameter (a PostScript font name).
 * @param raw - the parameter's value, or null
 * @param property - the property
 * @param put - receives the value
 * @param at - the sites
 */
function readText(raw: unknown, property: string, put: Put, at: At): void {
    if (raw !== null && raw !== "") {
        put(property, canonText(raw, at(property)));
    }
}

/** The `lphi` written for each side graphty puts a label on, and the side written for each Pajek has no angle for. */
const SIDE_ANGLES: ReadonlyMap<string, number> = new Map([
    ["right", 0],
    ["top-right", 90],
    ["left", 180],
    ["bottom-right", 285],
]);
const NEAREST_SIDES: ReadonlyMap<string, string> = new Map([
    ["top", "top-right"],
    ["top-left", "top-right"],
    ["bottom", "bottom-right"],
    ["bottom-left", "bottom-right"],
]);

/**
 * A vertex's label place from Pajek's polar label parameters (manual p. 90): `lr` is the distance of the label from
 * the vertex center, 0 centering it, and `lphi` its angle in degrees counterclockwise. Pajek 6.02's SVG export starts
 * the text at that point, its baseline through it (`text-anchor` start at y = the point), so the label's left edge is
 * at the point's x (`labelShiftX` 0.5) and its middle `PAJEK_BASELINE_TO_MIDDLE` of its size above the point's y
 * (`pajek-specimen-labels` `lr-*`, `lphi-*`; every corpus label). A vertex that sets none of `lr`, `lphi` and `fos`
 * is left to the default beneath, the same place at the default size, unless its label's default size is another.
 * @param get - the vertex's parameters
 * @param put - receives the values
 * @param at - the sites
 * @param ownSize - the label's size where `fos` is unset, when it is not Pajek's default (an `empty` vertex's), or null
 */
function readLabelPosition(get: Param, put: Put, at: At, ownSize: number | null = null): void {
    const [lr, lphi, fos] = [get("lr"), get("lphi"), get("fos")];
    if (lr === null && lphi === null && fos === null && ownSize === null) {
        return;
    }
    const radius = lr === null ? PAJEK_LABEL_RADIUS : canonNumber(lr, at("labelPosition"));
    const angle = lphi === null ? PAJEK_LABEL_ANGLE : canonNumber(lphi, at("labelPosition"));
    const size = fos === null ? (ownSize ?? PAJEK_LABEL_SIZE) : canonNumber(fos, at("labelSize"));
    if (radius === null || angle === null || size === null) {
        return;
    }
    const [x, y] = labelOffset(radius, angle, size);
    put("labelPosition", "center");
    put("labelOffsetX", x);
    put("labelOffsetY", y);
    put("labelShiftX", radius === 0 ? 0 : 0.5);
}

/**
 * Where Pajek's polar label parameters put a label, from the vertex center, y down: the middle of its left edge, or
 * its middle when `lr` is 0, which centers it.
 * @param radius - `lr`
 * @param angle - `lphi`, degrees counterclockwise
 * @param size - the label's size
 * @returns the offset across and down
 */
function labelOffset(radius: number, angle: number, size: number): [number, number] {
    if (radius === 0) {
        return [0, 0];
    }
    const t = (angle * Math.PI) / 180;
    const round = (v: number): number => Number(v.toFixed(9)) + 0;
    return [round(radius * Math.cos(t)), round(-radius * Math.sin(t) - PAJEK_BASELINE_TO_MIDDLE * size)];
}

/**
 * The label radius and angle Pajek uses when a vertex sets none: 20 and 285, below and to the right of the vertex.
 * Measured in Pajek 6.02's own SVG export (`test/fidelity/oracles/pajek-football.svg`, `pajek-specimen-labels`
 * `default`: every such label starts 20 from its vertex at 285 degrees); the size is the default label size.
 */
const PAJEK_LABEL_RADIUS = 20;
const PAJEK_LABEL_ANGLE = 285;
const PAJEK_LABEL_SIZE = 15;

/**
 * How far above its baseline a label's middle is, per unit of its size: half the ascent less the descent of Arial
 * (Liberation Sans: 0.905 and 0.212), the face Pajek draws its labels in by default.
 */
const PAJEK_BASELINE_TO_MIDDLE = 0.3465;

/**
 * One line's style: its color, width and pattern. Pajek draws an edge (undirected) twice as wide as an arc of the
 * same `w`.
 * @param get - the line's parameters
 * @param put - receives the values
 * @param at - the sites
 * @param directed - whether the line is an arc
 * @param labels - whether its label is drawn (`drawsLineLabels`)
 * @param run - the line from its source's center to its target's, in drawn units, y down, or null when unplaced
 * @param loop - for a loop on a placed node, receives its control points; null for any other line
 */
function readLine(
    get: Param,
    put: Put,
    at: At,
    directed: boolean,
    labels = true,
    run: Run | null = null,
    loop: ((controls: LoopControls) => void) | null = null,
): void {
    readColor(get("c"), "color", "opacity", put, at);
    readNumber(
        get("w"),
        "width",
        (property, value) => {
            put(property, typeof value === "number" && !directed ? value * EDGE_WIDTH_PER_W : value);
        },
        at,
    );
    const p = get("p");
    if (p === "Dots") {
        put("lineStyle", pajekDash(get, directed));
    } else if (p === "Solid") {
        put("lineStyle", "solid");
    } else if (p !== null) {
        // Pajek knows Solid and Dots, case for case; any other pattern (`Dashed`, `dots`) draws a solid line
        noteAt(at("lineStyle"), STYLE_ISSUE.UNKNOWN_VALUE, typeof p === "string" ? p : JSON.stringify(p));
        put("lineStyle", "solid");
    }
    // an arrowhead is 6 x `s` long and 5 x `s` wide; `s` 1, Pajek's normal size, is 6 long (the pajek tool arrowhead)
    readNumber(get("s"), "arrowSize", put, at);
    readArrowPosition(get("ap"), put, at, run);
    // a loop is drawn as the Bezier route of a line PAJEK_POINTS_PER_UNIT long to the right, its two ends on the node
    const line = loop === null ? get : loopParam(get);
    const controls = loop === null ? null : readLoop(line, put, loop);
    if (labels) {
        readText(get("l"), "label", put, at);
        if (controls === null) {
            readLineLabelPlace(get, put, at, run);
        } else {
            readLineLabelPlace(line, put, at, [PAJEK_POINTS_PER_UNIT, 0], loopTop(controls));
        }
    }
    if (loop === null) {
        readBezier(get, put, run);
    }
    readColor(get("lc"), "labelColor", null, put, at);
    readNumber(get("fos"), "labelSize", put, at);
    readFont(get("font"), put, at);
}

/** A line from its source's center to its target's, in drawn units, y down. */
type Run = readonly [dx: number, dy: number];

/** A loop's two Bezier control points, each from its node's center in drawn units, y down. */
type LoopControls = readonly [readonly [number, number], readonly [number, number]];

/**
 * The route parameters Pajek 6.02's SVG export draws a loop with where the line sets none (`pajek-specimen-edges-lines-p2`
 * `loop` and `loop-arc`, `pajek-specimen-edge-labels` `on-loop`: a cubic from the node's center up and back, its control
 * points 74.9 out at 70 and 110 degrees up from the right).
 */
const LOOP_DEFAULTS: Readonly<Record<string, number>> = { a1: -70, k1: 0.3, a2: -70, k2: 0.3 };

/**
 * A loop's route parameters: the line's own, Pajek's loop defaults for any it leaves out.
 * @param get - the line's parameters
 * @returns the parameters with the defaults
 */
function loopParam(get: Param): Param {
    return (key) => get(key) ?? (key in LOOP_DEFAULTS ? LOOP_DEFAULTS[key] : null);
}

/**
 * A loop's route (manual p. 90: "if arc is a loop (arc to itself) bezier loop will be drawn"), as Pajek 6.02's SVG
 * export draws it: the Bezier route of a line PAJEK_POINTS_PER_UNIT long running right, both its ends on the node
 * (`a1 -130 k1 0.6 a2 -130 k2 0.6`: control points 150 out at 130 and 50 degrees up from the right, measured on
 * `pajek-specimen-edges-lines-p2` `loop-bezier`). Its bends are written once the nodes' sizes are known
 * (`layLoops`). ponytail: measured in one Draw window (1200 x 900) and one vertex size; whether Pajek scales a loop
 * with either was not measured.
 * @param get - the line's parameters, with the loop defaults
 * @param put - receives the values
 * @param loop - receives the control points
 * @returns the control points, or null when the line's parameters give none
 */
function readLoop(get: Param, put: Put, loop: (controls: LoopControls) => void): LoopControls | null {
    const run: Run = [PAJEK_POINTS_PER_UNIT, 0];
    const controls = bezierControls(get, run);
    if (controls === null) {
        return null;
    }
    const [[a1, l1], [a2, l2]] = controls;
    const L = PAJEK_POINTS_PER_UNIT;
    // along the line is right, left of it up: the second point is measured back from the line's far end, the node
    const [c1, c2]: LoopControls = [
        [a1 * L, -l1 * L],
        [(a2 - 1) * L, -l2 * L],
    ];
    loop([c1, c2]);
    put("curved", true);
    put("bendCurve", "bezier");
    // an arc's head is drawn where the loop comes back to its node's center, under the node
    // (`pajek-specimen-edges-lines-p2` `loop-arc`, `s 1 a A`: no head shows)
    put("targetArrow", "none");
    return [c1, c2];
}

/**
 * The way a loop runs at its top, where its label is drawn (`lp` 0.5): from its first control point to its second
 * (`pajek-specimen-edge-labels` `on-loop`: 179.97). ponytail: a label elsewhere on the loop (`lp`) is turned as at
 * its top.
 * @param controls - the loop's control points
 * @returns the direction, in degrees clockwise on screen
 */
function loopTop(controls: LoopControls): number {
    const [c1, c2] = controls;
    return (Math.atan2(c2[1] - c1[1], c2[0] - c1[0]) * 180) / Math.PI;
}

/**
 * Writes each loop's control points as its bends, fractions of its node's half width and half height, y up, once the
 * nodes are sized, and draws it round whatever the Draw window does to the other lines.
 * @param snapshot - the graph
 * @param loops - each loop's control points by edge
 * @param node - the node values, sized
 * @param edge - the edge values; changed in place
 */
function layLoops(
    snapshot: GraphSnapshot,
    loops: ReadonlyMap<number, LoopControls>,
    node: ValueColumns,
    edge: ValueColumns,
): void {
    const fraction = (x: number): string => String(Math.round(x * 1e4) / 1e4 || 0);
    for (const [e, controls] of loops) {
        const v = snapshot.edgeSource(e);
        const half = (property: string): number => {
            const size = node[property]?.[v];
            return (typeof size === "number" && size > 0 ? size : PAJEK_VERTEX_SIZE) / 2;
        };
        const [hw, hh] = [half("width"), half("height")];
        const column = (property: string): (StyleValue | null)[] =>
            (edge[property] ??= new Array<StyleValue | null>(snapshot.edgeCount).fill(null));
        column("bends")[e] = controls.map(([x, y]) => `${fraction(x / hw)},${fraction(-y / hh)}`).join(" ");
        // Export Line Default / Straight Lines straightens every other line; a loop is still drawn round
        // (`pajek-specimen-edges-lines-p4`)
        column("curved")[e] = true;
        column("bendCurve")[e] = "bezier";
    }
}

/**
 * Where Pajek 6.02's SVG export draws a line's label (`pajek-specimen-edge-labels`): its middle at `lp` from the
 * terminal vertex, a fraction of the line up to 1 (0.5 by default, 0.2 near the target) and a distance beyond it
 * (`lp 20` 20 from the target), moved by `lr` at `lphi` degrees counterclockwise (`lr 12 lphi 90` 12 above), its
 * baseline through that point, and turned along the line and `la` degrees counterclockwise from it (`la 45` drawn
 * rotate(-45) on a level line; `la 405` as `la 45`). graphty hangs a line's label on the line's middle, so the place is
 * an offset from there, the words' middle above the baseline in the label's own turned frame.
 * @param get - the line's parameters
 * @param put - receives the values
 * @param at - the sites
 * @param run - the line, or null when unplaced
 * @param direction - the line's direction at the label, in degrees clockwise on screen, where `run` does not give it
 * (a loop)
 */
function readLineLabelPlace(get: Param, put: Put, at: At, run: Run | null, direction?: number): void {
    const length = run === null ? 0 : Math.hypot(run[0], run[1]);
    if (run === null || length === 0) {
        return;
    }
    const n = (key: string, fallback: number, property: string): number | null => {
        const v = get(key);
        return v === null ? fallback : canonNumber(v, at(property));
    };
    const [lp, lr, lphi, la] = [
        n("lp", 0.5, "labelOffsetX"),
        n("lr", 0, "labelOffsetX"),
        n("lphi", 0, "labelOffsetX"),
        n("la", 0, "labelRotation"),
    ];
    const size = n("fos", PAJEK_LABEL_SIZE, "labelSize");
    if (lp === null || lr === null || lphi === null || la === null || size === null) {
        return;
    }
    // from the line's middle to the point lp from its target, then out by lr at lphi
    const along = 0.5 - (lp <= 1 ? lp : lp / length);
    const t = (lphi * Math.PI) / 180;
    const round = (v: number): number => Number(v.toFixed(9)) + 0;
    const turn = (((direction ?? lineDirection(get, run, along + 0.5)) - la) % 360) + 360;
    // the baseline runs through the point; the words' middle is above it in the label's own turned frame
    const up = (turn * Math.PI) / 180;
    const rise = PAJEK_BASELINE_TO_MIDDLE * size;
    put("labelPosition", "center");
    put("labelOffsetX", round(along * run[0] + lr * Math.cos(t) + rise * Math.sin(up)));
    put("labelOffsetY", round(along * run[1] - lr * Math.sin(t) - rise * Math.cos(up)));
    put("labelRotation", round(turn % 360));
}

/**
 * A line's Bezier route (manual p. 90: `a1`, `k1` at its source, `a2`, `k2` at its target), as Pajek 6.02's SVG export
 * draws it (`pajek-specimen-edges-lines-p2`, `pajek-specimen-edge-labels`): one cubic Bezier curve whose first control
 * point is `k1` / 2 of the line's length from the source, turned `a1` degrees clockwise on screen from the line, and
 * whose second is `k2` / 2 of it back from the target, turned `a2` degrees counterclockwise (`a1 40 k1 1.5 a2 -40 k2
 * 1.5` an S, `a2 40` a bow). A negative `k1` is one of Pajek's oval, circular arc or double routes, which its SVG export
 * draws straight. A loop is `readLoop`'s. ponytail: a line that sets only some of the four reads the
 * others as 0 and 1; Pajek's values for them were not measured.
 * @param get - the line's parameters
 * @param put - receives the values
 * @param run - the line, or null when unplaced
 */
function readBezier(get: Param, put: Put, run: Run | null): void {
    const controls = bezierControls(get, run);
    if (controls === null) {
        return;
    }
    const fraction = (x: number): string => String(Math.round(x * 1e4) / 1e4 || 0);
    put("curved", true);
    put("bendCurve", "bezier");
    put("bends", controls.map(([along, across]) => `${fraction(along)},${fraction(across)}`).join(" "));
}

/** How far back from its target's outline, as the file sizes it, Pajek 6.02 draws a Bezier arc's arrowhead tip. */
const PAJEK_TIP_BACK = 1.5;

/**
 * Where Pajek 6.02's SVG export ends an arc's Bezier route (`readBezier`): at its arrowhead's back, not at its target's
 * center. It places the arrowhead as on a straight arc, its tip 1.5 short of where the straight line meets the
 * target's outline, turns it `-a2` degrees about that point, and runs the curve from the source's center to the
 * arrowhead's back, its control points measured on that shorter line (`pajek-specimen-edges-lines-p2`
 * `route-bezier-opposite-arc`: the arrowhead's back at (347.02, 124.32), 6.5 back from the outline at (352, 128.5),
 * turned 40 degrees; `route-bezier-same-arc` at (571.02, 132.68), turned -40). The curve's control points are written
 * in the frame of the line between the two centers, which graphty places bends in, and the route ends at a target port
 * on the arrowhead's tip, 1.5 back from the outline along the turned arrowhead, so graphty's curve runs through the
 * same control points to where Pajek's arrowhead ends: drawn to the target's center instead, the curve bowed 0.135 of
 * its chord where Pajek's bows 0.196 (`pajek-specimen-arrows` `arrow-bezier`). ponytail: the outline is the ellipse
 * of the vertex's width and height, as the file sizes it (before the Draw window's Size of Vertices or vectors),
 * whatever its shape.
 * @param get - the line's parameters
 * @param put - receives the values
 * @param run - the line from its source's center to its target's, in drawn units, y down
 * @param target - the target vertex's width and height
 * @returns whether the arc's route ends at its arrowhead's tip (a target port)
 */
function readArcEnd(get: Param, put: Put, run: Run, target: readonly [number, number]): boolean {
    const ap = numberOrNull(get("ap")) ?? 0;
    const length = Math.hypot(run[0], run[1]);
    if (ap !== 0 || length === 0 || bezierControls(get, run) === null) {
        return false;
    }
    const [ux, uy] = [run[0] / length, run[1] / length];
    // the straight line meets the outline r from the target's center; the arrowhead's back is 1.5 + 5 s before it
    const r = 1 / Math.hypot(ux / (target[0] / 2), uy / (target[1] / 2));
    const back = PAJEK_TIP_BACK + 5 * (numberOrNull(get("s")) ?? 1);
    const turn = (-(numberOrNull(get("a2")) ?? 0) * Math.PI) / 180;
    const [c, s] = [Math.cos(turn), Math.sin(turn)];
    // the arrowhead's back, from the source's center
    const end: Run = [run[0] - r * ux - back * (ux * c - uy * s), run[1] - r * uy - back * (ux * s + uy * c)];
    const controls = bezierControls(get, end);
    if (controls === null) {
        return false;
    }
    // each control point on screen from the source's center, then along and to the left of the line to the target
    const L2 = length * length;
    const fraction = (x: number): string => String(Math.round(x * 1e4) / 1e4 || 0);
    const bends = controls.map(([along, left]) => {
        const [x, y] = [along * end[0] + left * end[1], along * end[1] - left * end[0]];
        return `${fraction((x * run[0] + y * run[1]) / L2)},${fraction((x * run[1] - y * run[0]) / L2)}`;
    });
    put("bends", bends.join(" "));
    // the tip, from the target's center: 1.5 back from the outline along the turned arrowhead; a port is a fraction of
    // the half width and half height, y up
    const tip: Run = [-r * ux - PAJEK_TIP_BACK * (ux * c - uy * s), -r * uy - PAJEK_TIP_BACK * (ux * s + uy * c)];
    put("targetPort", `${fraction(tip[0] / (target[0] / 2))},${fraction(-tip[1] / (target[1] / 2))}`);
    return true;
}

/** How far short of its target's outline, border and all, Pajek 6.02 stops an arc's arrowhead, in px. */
const PAJEK_TIP_GAP = 1;

/**
 * Where an arc's arrowhead stops: PAJEK_TIP_GAP short of its target's outline, whatever the arrowhead's size `s` (6
 * x `s` long), so a share of its length of 1 / (6 `s`) (`pajek-synth-lines`: every arc's tip 1.25 from the center
 * of a vertex 20 across with a border 0.5 wide, `s` 1 to 5; the specimen sheets' 1.5 with a border 1 wide).
 * @param get - the line's parameters
 * @param put - receives the value
 */
function readTipGap(get: Param, put: Put): void {
    const s = numberOrNull(get("s")) ?? 1;
    if (s > 0) {
        put("targetArrowGap", Number((PAJEK_TIP_GAP / (6 * s)).toPrecision(6)));
    }
}

/**
 * A line's two Bezier control points (`readBezier`), each `[along, across]` as fractions of the line from its source:
 * along it, and to its left on screen.
 * @param get - the line's parameters
 * @param run - the line, or null when unplaced
 * @returns the points, or null for a line Pajek draws straight or a loop
 */
function bezierControls(get: Param, run: Run | null): [[number, number], [number, number]] | null {
    const [a1, k1, a2, k2] = ["a1", "k1", "a2", "k2"].map((key) => numberOrNull(get(key)));
    if ((a1 === null && k1 === null && a2 === null && k2 === null) || run === null || (run[0] === 0 && run[1] === 0)) {
        return null;
    }
    const [s, t] = [k1 ?? 1, k2 ?? 1];
    if (s < 0 || t < 0) {
        return null;
    }
    const rad = Math.PI / 180;
    const [u, v] = [(a1 ?? 0) * rad, (a2 ?? 0) * rad];
    return [
        [(s / 2) * Math.cos(u), (-s / 2) * Math.sin(u)],
        [1 - (t / 2) * Math.cos(v), (-t / 2) * Math.sin(v)],
    ];
}

/**
 * A line's direction on screen, in degrees clockwise, where its label is drawn: along a straight line, or along its
 * Bezier curve (`bezierControls`) at the label's place, `along` of the way from the source.
 * @param get - the line's parameters
 * @param run - the line
 * @param along - the label's place, 0 at the source and 1 at the target
 * @returns the direction
 */
function lineDirection(get: Param, run: Run, along: number): number {
    const controls = bezierControls(get, run);
    let [dx, dy] = run;
    if (controls !== null) {
        // the cubic's tangent at `along`, in the line's own frame (along, left), then on screen
        const t = Math.min(1, Math.max(0, along));
        const p = [[0, 0], ...controls, [1, 0]];
        const d = (k: 0 | 1): number =>
            3 * (1 - t) ** 2 * (p[1][k] - p[0][k]) +
            6 * (1 - t) * t * (p[2][k] - p[1][k]) +
            3 * t ** 2 * (p[3][k] - p[2][k]);
        const [a, l] = [d(0), d(1)];
        // left of (dx, dy) on screen, y down, is (dy, -dx)
        [dx, dy] = [a * run[0] + l * run[1], a * run[1] - l * run[0]];
    }
    return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * What a line's value draws (manual 5.3 p. 90): a line of value 0 is not drawn, and a negative one is drawn as Dots
 * unless the line sets a pattern.
 * @param value - the line's value, or null
 * @param get - the line's parameters
 * @param put - receives the values
 * @param directed - whether the line is an arc
 */
function readLineValue(value: number | null, get: Param, put: Put, directed = true): void {
    if (value === 0) {
        put("visible", false);
    } else if (value !== null && value < 0 && get("p") === null) {
        // drawn as Dots are (`pajek-specimen-edges-lines` `value-negative`)
        put("lineStyle", pajekDash(get, directed));
    }
}

/** The dash and the gap of Pajek 6.02's Dots, in px whatever the line's width (`stroke-dasharray:5`). */
const PAJEK_DASH = 5;

/**
 * How a line drawn as Pajek's Dots looks: Pajek 6.02's SVG export draws it `stroke-dasharray:5`, dashes and gaps 5 px
 * long whatever the line's width, so a line 10/3 px wide or wider, its dashes no longer than one and a half widths,
 * shows dots and a thinner one dashes (`pajek-specimen-edges-lines` `p-dots` at 1.5: dashes; `pajek-synth-lines`
 * arc `12 13` at w 5 and edge `1 8` at w 3, drawn 6 wide: dots).
 * @param get - the line's parameters
 * @param directed - whether the line is an arc, drawn `w` wide (an edge twice `w`)
 * @returns the line style
 */
function pajekDash(get: Param, directed: boolean): "dashed" | "dotted" {
    const w = numberOrNull(get("w"));
    // without a `w`, Pajek's arc is 1 wide and its edge 2
    const width = (w ?? 1) * (directed ? 1 : EDGE_WIDTH_PER_W);
    return PAJEK_DASH <= 1.5 * Math.max(1, width) ? "dotted" : "dashed";
}

/**
 * A line's hooks `h1` and `h2` (manual p. 90): the points of its source's and its target's outline it runs between,
 * numbered by Pajek's shipped SHAPES.CFG for the vertex's shape. An ellipse's hook k is at k degrees counterclockwise
 * from the right (CIRC `10 1`), a box's runs round its border in 400 steps from the middle of its right side,
 * counterclockwise (CART), and a cross, which Pajek draws as an ellipse, has an ellipse's; `pajek-specimen-edges-lines-p2`:
 * `h1 90 h2 270` runs from the top of the source to the bottom of the target, `h1 1 h2 1` ends on the far side of the
 * target, `h1 1` on a box leaves at its right side. 0 (the center) and -1 (the nearest hook) are where graphty runs a
 * line anyway. ponytail: the hooks of the other shapes (a diamond's 360 polar radii, a triangle's, a figure's) are
 * not read; Pajek's box hook 100 was measured 0.22 of the half width left of the top's middle, where SHAPES.CFG puts
 * it.
 * @param get - the line's parameters
 * @param put - receives the values
 * @param source - the source vertex's shape keyword, or null
 * @param target - the target vertex's shape keyword, or null
 */
function readHooks(get: Param, put: Put, source: unknown, target: unknown): void {
    for (const [key, property, shape] of [
        ["h1", "sourcePort", source],
        ["h2", "targetPort", target],
    ] as const) {
        const hook = numberOrNull(get(key));
        const port = hook === null ? null : hookPort(shape, hook);
        if (port !== null) {
            const round = (v: number): string => String(Number(v.toFixed(4)) + 0);
            put(property, `${round(port[0])},${round(port[1])}`);
        }
    }
}

/**
 * One hook's point on its vertex (`readHooks`), as fractions of the half width and height, y up.
 * @param shape - the vertex's shape keyword, null for Pajek's default ellipse
 * @param hook - the hook's number
 * @returns the point, or null where Pajek's hook is not read
 */
function hookPort(shape: unknown, hook: number): readonly [number, number] | null {
    if (!Number.isInteger(hook) || hook < 1) {
        return null;
    }
    const keyword = typeof shape === "string" ? shape.toLowerCase() : "ellipse";
    // Pajek 6.02 draws a cross as an ellipse, with an ellipse's hooks (`h-cross-1-3`: hook 3 at 3 degrees)
    if (keyword === "ellipse" || keyword === "cross") {
        const a = (hook * Math.PI) / 180;
        return [Math.cos(a), Math.sin(a)];
    }
    if (keyword !== "box" || hook > 400) {
        return null;
    }
    // 0.02 of the half size a step: up the right side's top half, across the top, down the left, across the
    // bottom and up the right side's bottom half
    const d = hook * 0.02;
    if (hook <= 50) {
        return [1, d];
    }
    if (hook <= 150) {
        return [2 - d, 1];
    }
    if (hook <= 250) {
        return [-1, 4 - d];
    }
    return hook <= 350 ? [d - 6, -1] : [1, d - 8];
}

/**
 * A cell's number: a number as is, a numeric text parsed, anything else null.
 * @param raw - the cell
 * @returns the number, or null
 */
function numberOrNull(raw: unknown): number | null {
    if (typeof raw === "string" && raw.trim() !== "") {
        raw = Number(raw);
    }
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

/**
 * Where a line's arrowhead sits, Pajek's `ap` (manual p. 90): a fraction of the line from its end up to 1 (0.5 is the
 * middle); a value above 1 is a distance from the end in px, the arrowhead's back that far from the target's center
 * (`pajek-synth-lines` arc `3 4 ... ap 20`), read as its share of a placed line and noted on an unplaced one.
 * @param raw - the parameter's value, or null
 * @param put - receives the value
 * @param at - the sites
 * @param run - the line from its source's center to its target's, in drawn units, or null when unplaced
 */
function readArrowPosition(raw: unknown, put: Put, at: At, run: Run | null = null): void {
    if (raw === null) {
        return;
    }
    const ap = canonNumber(raw, at("arrowPosition"));
    const length = run === null ? 0 : Math.hypot(run[0], run[1]);
    if (ap !== null && ap > 1) {
        if (length > 0) {
            put("arrowPosition", Number(Math.min(1, ap / length).toPrecision(6)));
        } else {
            noteAt(at("arrowPosition"), STYLE_ISSUE.NOT_CARRIED, `ap ${String(ap)}`);
        }
        return;
    }
    // 0 is Pajek's own place for the arrow, at the line's end, which a line restates after one that moved it
    if (ap !== 0) {
        put("arrowPosition", ap);
    }
}

/**
 * A table's parameter getter for one element: the cell, or null when the table has no such column or no value.
 * @param table - the node or edge table
 * @param i - the element
 * @returns the getter
 */
function cells(table: GraphSnapshot["nodes"], i: number): Param {
    return (key) => {
        const v = table.has(key) ? plainCell(table.value(key, i)) : null;
        // a color written as numbers (`c 0.700 0.700 0.700`) is no color to Pajek 6.02: the line keeps the color it
        // carries from the line before, or Pajek's default (`pajek-1crn`, `pajek-specimen-edges-lines`
        // `c-three-fractions`). ponytail: measured on lines; vertex colors are read the same way
        return COLOR_PARAMS.has(key) && typeof v === "string" && NUMERIC_COLOR.test(v) ? null : v;
    };
}

/** The parameters that hold a color. */
const COLOR_PARAMS: ReadonlySet<string> = new Set(["ic", "bc", "lc", "c"]);

/** A color written as numbers rather than a name or an RGB / CMYK form. */
const NUMERIC_COLOR = /^[\d.]+(?: [\d.]+)*$/;

/**
 * Whether each edge is an arc (directed).
 * @param snapshot - the graph
 * @returns one flag per edge
 */
function directedEdges(snapshot: GraphSnapshot): boolean[] {
    const out = new Array<boolean>(snapshot.edgeCount).fill(snapshot.directed);
    const col = snapshot.directed ? snapshot.edges.byRole("directed") : null;
    if (col !== null) {
        for (let e = 0; e < snapshot.edgeCount; e++) {
            out[e] = plainCell(col.value(e)) !== false;
        }
    }
    return out;
}

/** The Bezier route Pajek 6.02 draws an arc on that shares its two vertices with another arc. */
const SHARED_ARC_BOW: Readonly<Record<string, number>> = { a1: 15, k1: 0.25, a2: 15, k2: 0.25 };

/**
 * The arcs Pajek 6.02 bows apart, and to which side: an arc that shares its two vertices with another arc, either way
 * round, is drawn as `a1 15 k1 0.25 a2 15 k2 0.25` (`pajek-synth-lines`: 20 -> 30 and 30 -> 20, each bowed to the
 * same side of its own way, so apart; `pajek-iliad` 14 -> 72 and 72 -> 14), and of two that run the same way the first is bowed the
 * other way, `a1 -15 a2 -15` (`pajek-iliad`: the two arcs 250 -> 123). ponytail: three or more arcs the same way
 * alternate sides, the last at `a1 15`; Pajek's drawing of them was not measured.
 * @param snapshot - the graph
 * @param directed - whether each edge is an arc
 * @returns each bowed arc's side: 1 for `a1 15 a2 15`, -1 for `a1 -15 a2 -15`
 */
function sharedArcBows(snapshot: GraphSnapshot, directed: readonly boolean[]): Map<number, 1 | -1> {
    const byPair = new Map<string, number[]>();
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const [u, v] = [snapshot.edgeSource(e), snapshot.edgeTarget(e)];
        if (directed[e] && u !== v) {
            const key = u < v ? `${String(u)} ${String(v)}` : `${String(v)} ${String(u)}`;
            byPair.set(key, [...(byPair.get(key) ?? []), e]);
        }
    }
    const out = new Map<number, 1 | -1>();
    for (const arcs of byPair.values()) {
        if (arcs.length < 2) {
            continue;
        }
        for (const e of arcs) {
            const same = arcs.filter((x) => snapshot.edgeSource(x) === snapshot.edgeSource(e));
            out.set(e, (same.length - 1 - same.indexOf(e)) % 2 === 0 ? 1 : -1);
        }
    }
    return out;
}

/**
 * A bowed arc's parameters (`sharedArcBows`): its own Bezier route when it sets one, else Pajek's bow to its side.
 * @param get - the line's parameters
 * @param side - 1 for `a1 15 a2 15`, -1 for `a1 -15 a2 -15`
 * @returns the parameters
 */
function bowedParams(get: Param, side: 1 | -1): Param {
    if (Object.keys(SHARED_ARC_BOW).some((key) => get(key) !== null)) {
        return get;
    }
    return (key) => {
        const bow = SHARED_ARC_BOW[key] as number | undefined;
        if (bow === undefined) {
            return get(key);
        }
        return key.startsWith("a") ? side * bow : bow;
    };
}

/**
 * The columns of a table that hold styles.
 * @param table - the node or edge table
 * @param keys - the style parameters of that table
 * @returns the column names present
 */
function styleColumns(table: GraphSnapshot["nodes"], keys: readonly string[]): string[] {
    return keys.filter((k) => table.has(k));
}

/**
 * The styles of a Pajek file, read the way Pajek draws them, with Pajek's own defaults beneath: a labeled #ffd9bc
 * ellipse with a #660000 border, teal edges, and grey arcs with an arrow at the target. A file graphty wrote gives back its `graphty.styles` block.
 * @param snapshot - the graph the import built
 * @param context - the work budget and the block text the import kept
 * @returns the styles
 */
export function pajekStyles(snapshot: GraphSnapshot, context: StyleReadContext): ImporterStyles {
    const notes = new StyleNotes();
    const { block, draw, voided } = keptOf(context.kept);
    const labels = drawsLineLabels(draw);
    const place = places(snapshot);
    // Pajek stretches the file's 0..1 to its Draw window one axis at a time, 500 x 500 without one
    const window = draw ?? { width: PAJEK_POINTS_PER_UNIT, height: PAJEK_POINTS_PER_UNIT };
    const loops = new Map<number, LoopControls>();
    const runOf = (e: number): Run | null => {
        const [s, t] = [place(snapshot.edgeSource(e)), place(snapshot.edgeTarget(e))];
        return s === null || t === null ? null : [(t[0] - s[0]) * window.width, (t[1] - s[1]) * window.height];
    };
    const read = (target: StyleTarget): ValueColumns => {
        const table = target === "node" ? snapshot.nodes : snapshot.edges;
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const out = valueColumns(n);
        const carry = carriedParams(target === "node" ? CARRIED.node : CARRIED_LINE, target === "node");
        for (let i = 0; i < n; i++) {
            context.budget.spend(target, 1);
            const at: At = (property) => ({ notes, target, property, element: i, budget: context.budget });
            const put: Put = (property, value) => {
                out.put(i, property, value);
            };
            const own = cells(table, i);
            const get = target === "node" && voided.has(i) ? voidedParams(own, keywords[i - 1] ?? null) : carry(own);
            if (target === "node") {
                readVertex(get, put, at, place(i));
                keywords[i] = get(SHAPE_COLUMN);
            } else {
                readEdge(i, get, put, at);
            }
        }
        return out.values;
    };
    const readEdge = (i: number, get: Param, put: Put, at: At): void => {
        // a loop on a placed node: an unplaced one is laid out by graphty, which draws its own loop, and a
        // file graphty wrote keeps its routes in its block
        const run = runOf(i);
        const loop =
            run !== null && block === null && snapshot.edgeSource(i) === snapshot.edgeTarget(i)
                ? (controls: LoopControls): void => {
                      loops.set(i, controls);
                  }
                : null;
        const bow = bows.get(i);
        const line = bow === undefined ? get : bowedParams(get, bow);
        readLine(line, put, at, directed[i], labels, run, loop);
        // an arc's arrowhead stops short of its target: at the port on its tip of a Bezier route, else by its gap (a
        // file graphty wrote keeps its gaps in its block)
        const ported = directed[i] && run !== null && readArcEnd(line, put, run, targetSize(snapshot.edgeTarget(i)));
        if (directed[i] && loop === null && !ported && block === null) {
            readTipGap(get, put);
        }
        readLineValue(lineValue(i), get, put, directed[i]);
        readHooks(get, put, keywords[snapshot.edgeSource(i)], keywords[snapshot.edgeTarget(i)]);
    };
    const directed = directedEdges(snapshot);
    // Straight Lines draws the arcs Pajek would bow apart straight, and a file graphty wrote keeps its routes in its
    // block
    const bows =
        drawsStraightLines(draw) || block !== null ? new Map<number, 1 | -1>() : sharedArcBows(snapshot, directed);
    const keywords: unknown[] = [];
    const weights = explicitWeights(snapshot);
    // the line's value: its weight, or the `value` column when the import kept the value as an attribute
    const lineValue = (e: number): number | null =>
        weights.isExplicit(e) ? weights.value(e) : numberOrNull(cells(snapshot.edges, e)(VALUE_COLUMN));
    const node = read("node");
    // a vertex's width and height as the file draws it, for where an arc's arrowhead meets it
    const targetSize = (v: number): readonly [number, number] => {
        const size = (property: string): number => {
            const s = node[property]?.[v];
            return typeof s === "number" && s > 0 ? s : PAJEK_VERTEX_SIZE;
        };
        return [size("width"), size("height")];
    };
    const edge = read("edge");
    if (draw !== null) {
        drawVertices(draw, snapshot, node);
        drawLines(draw, snapshot, node, edge);
    }
    layLoops(snapshot, loops, node, edge);
    if (block !== null) {
        exactFromBlock(snapshot, block, { node, edge }, labels);
    }
    // Pajek's defaults that are a rule: an arc has an arrow at its target and is drawn grey and thinner, an edge not
    const rules: StyleRule[] = [];
    const columns = new Map<string, StyleColumn>();
    if (directed.some(Boolean)) {
        columns.set(
            DIRECTED_KEY,
            directed.map((d) => (d ? true : null)),
        );
        rules.push({
            id: "edge.tool.arrow",
            target: "edge",
            role: "group",
            origin: "tool",
            where: { has: { style: DIRECTED_KEY } },
            set: { targetArrow: "triangle", color: ARC_DEFAULTS.color, width: ARC_DEFAULTS.width },
        });
    }
    return {
        canonical: true,
        dialect: "dvips",
        tool: "pajek",
        units: "px",
        node: { values: node },
        edge: { values: edge, rules, columns },
        notes: notes.list(),
        block,
        readFrom: {
            node: styleColumns(snapshot.nodes, [SHAPE_COLUMN, ...NODE_KEYS]),
            edge: styleColumns(snapshot.edges, EDGE_KEYS),
        },
    };
}

/**
 * Each vertex's place in the file's own coordinates, as the position column holds them.
 * @param snapshot - the graph
 * @returns a getter of a vertex's place, null when it has none
 */
function places(snapshot: GraphSnapshot): (i: number) => Place | null {
    const col = snapshot.nodes.byRole("position");
    return (i) => {
        const v: unknown = col === null || col === undefined ? null : col.value(i);
        if (v === null || typeof v !== "object" || !("length" in v)) {
            return null;
        }
        const [x, y] = v as ArrayLike<unknown> as [unknown, unknown];
        return typeof x === "number" && typeof y === "number" ? [x, y] : null;
    };
}

/**
 * What the import kept for the styles: the `graphty.styles` block, the Draw window of the `pajekDraw` option, and the
 * vertices whose line Pajek draws with none of its parameters.
 * @param kept - the kept value: the block's text, or `{ block, pajekDraw, voided }`
 * @returns the block and the draw settings, each null when absent, and the voided vertices
 */
function keptOf(kept: unknown): {
    readonly block: string | null;
    readonly draw: PajekDraw | null;
    readonly voided: ReadonlySet<number>;
} {
    if (typeof kept === "string") {
        return { block: kept, draw: null, voided: new Set() };
    }
    if (typeof kept === "object" && kept !== null) {
        const { block, pajekDraw, voided } = kept as { block?: unknown; pajekDraw?: PajekDraw; voided?: number[] };
        return {
            block: typeof block === "string" ? block : null,
            draw: pajekDraw ?? null,
            voided: new Set(voided ?? []),
        };
    }
    return { block: null, draw: null, voided: new Set() };
}

/**
 * The parameters Pajek 6.02 draws a voided vertex line with (`VOIDING_KEYS` in the importer): its label, and none of
 * its own parameters, so the vertex is Pajek's default size and colors, in the shape of the vertex line before it
 * (`pajek-specimen-node-sizes-opacity` `s-size-no-shape`, after a box: a box 20 across in #ffd9bc). ponytail: probes
 * showed the shape is not always the line before's (after `box ic Green` a voided line drew an ellipse in one file and
 * the triangle of two lines before in another); the rule Pajek follows was not found.
 * @param own - the line's own parameters
 * @param before - the shape keyword of the vertex line before it, or null
 * @returns the getter
 */
function voidedParams(own: Param, before: unknown): Param {
    return (key) => {
        if (key === LABEL_COLUMN) {
            return own(key);
        }
        return key === SHAPE_COLUMN ? before : null;
    };
}

// ============================================================ writing

/** One element's value of a property. */
type Get = (property: string) => StyleValue | null;

/** Records a value written as the nearest one Pajek has. */
type Approximate = (property: string, value: StyleValue) => void;

/** A parameter's written value. */
type Written = string | number;

/** Pajek's shape keywords for graphty's shapes; a shape not listed is written as its nearest. */
const SHAPES: ReadonlyMap<string, string> = new Map([
    ["ellipse", "ellipse"],
    ["rectangle", "box"],
    ["diamond", "diamond"],
    ["triangle", "triangle"],
    ["none", "empty"],
    ["other:cross", "cross"],
    ["other:house", "house"],
    ["other:man", "man"],
    ["other:woman", "woman"],
]);

/** The nearest Pajek shape of a shape Pajek does not have. */
const NEAREST_SHAPES: ReadonlyMap<string, string> = new Map([
    ["round-rectangle", "box"],
    ["parallelogram", "box"],
    ["trapezoid", "box"],
    ["vee", "triangle"],
]);

/** The dvips name of each color that has one: a color with a name is written by it. */
const DVIPS_NAMES: ReadonlyMap<string, string> = new Map(
    [...DVIPS_COLORS].reverse().map(([name, hex]) => [hex, name] as const),
);

/**
 * A color as Pajek writes it: its dvips name when it has one, else `RGBrrggbb`; both are exact.
 * @param color - a canonical `#rrggbb`
 * @returns the text
 */
function pajekColorText(color: string): string {
    return DVIPS_NAMES.get(color) ?? `RGB${color.slice(1).toUpperCase()}`;
}

/**
 * Notes each opacity below 1: Pajek draws every color opaque.
 * @param get - the element's values
 * @param properties - its opacity properties
 * @param approximate - records approximations
 */
function opaque(get: Get, properties: readonly string[], approximate: Approximate): void {
    for (const property of properties) {
        const v = get(property);
        if (v !== null && v !== 1) {
            approximate(property, v);
        }
    }
}

/**
 * A vertex's Pajek shape keyword: its own, else the nearest one (noted), else Pajek's ellipse.
 * @param get - the vertex's values
 * @param approximate - records approximations
 * @returns the keyword
 */
function shapeKeyword(get: Get, approximate: Approximate): string {
    const shape = get("shape");
    if (typeof shape !== "string") {
        return "ellipse";
    }
    const keyword = SHAPES.get(shape);
    if (keyword !== undefined) {
        return keyword;
    }
    if (shape === "polygon" && diamondQ(get) !== null) {
        return "diamond";
    }
    approximate("shape", shape);
    const points = get("shapePoints");
    if (shape === "polygon" && points !== null) {
        approximate("shapePoints", points);
    }
    return NEAREST_SHAPES.get(shape) ?? "ellipse";
}

/**
 * The `q` of a polygon that is Pajek's unturned diamond (`readOutline`), or null for any other.
 * @param get - the vertex's values
 * @returns the diamond's `q`, or null
 */
function diamondQ(get: Get): number | null {
    const points = get("shapePoints");
    const corners =
        typeof points === "string"
            ? points
                  .trim()
                  .split(/\s+/)
                  .map((p) => p.split(",").map(Number))
            : [];
    if (corners.length !== 6) {
        return null;
    }
    const q = corners[2][0];
    const want = [
        [-1, 0],
        [-q, 1],
        [q, 1],
        [1, 0],
        [q, -1],
        [-q, -1],
    ];
    return want.every(([x, y], k) => corners[k][0] === x && corners[k][1] === y) ? q : null;
}

/**
 * What Pajek draws by default for a property (`styles/defaults.ts`), which the writer leaves out.
 * @param target - nodes or edges
 * @param property - the property
 * @returns the default, or undefined
 */
function pajekDefault(target: StyleTarget, property: string): StyleValue | undefined {
    const values: Readonly<Record<string, { readonly value: unknown } | undefined>> | undefined =
        toolDefaults("pajek")?.[target];
    return values?.[property]?.value as StyleValue | undefined;
}

/**
 * A vertex's parameters from its values, leaving out the ellipse and the black border 1 wide Pajek draws by default;
 * the inverse of `readVertex`: `x_fact` and `y_fact` are the width and height over the normal size, the other lengths
 * points as they are.
 * @param get - the vertex's values
 * @param approximate - records approximations
 * @returns the parameters, the shape keyword under `shape`
 */
function vertexParams(get: Get, approximate: Approximate): Map<string, Written> {
    const out = new Map<string, Written>();
    opaque(get, ["fillOpacity", "opacity"], approximate);
    const keyword = shapeKeyword(get, approximate);
    if (keyword !== "ellipse") {
        out.set(SHAPE_COLUMN, keyword);
    }
    const q = diamondQ(get);
    if (q !== null && q !== PAJEK_DIAMOND_Q) {
        out.set("q", q);
    }
    vertexColorParams(get, out);
    vertexSizeParams(get, out);
    const bw = get("borderWidth");
    if (typeof bw === "number" && bw !== pajekDefault("node", "borderWidth")) {
        out.set("bw", bw);
    }
    fontParam(get, out, pajekDefault("node", "labelFont"));
    labelPositionParams(get, out, approximate);
    return out;
}

/**
 * A vertex's colors as parameters (`ic`, `bc`, `lc`), leaving out Pajek's defaults.
 * @param get - the vertex's values
 * @param out - receives the parameters
 */
function vertexColorParams(get: Get, out: Map<string, Written>): void {
    const colors = [
        ["fill", "ic"],
        ["borderColor", "bc"],
        ["labelColor", "lc"],
    ] as const;
    for (const [property, key] of colors) {
        const v = get(property);
        if (typeof v === "string" && v !== pajekDefault("node", property)) {
            out.set(key, pajekColorText(v));
        }
    }
}

/**
 * A vertex's sizes as parameters (`x_fact`, `y_fact`, `fos`), leaving out Pajek's defaults.
 * @param get - the vertex's values
 * @param out - receives the parameters
 */
function vertexSizeParams(get: Get, out: Map<string, Written>): void {
    const numbers = [
        ["width", "x_fact", PAJEK_VERTEX_SIZE],
        ["height", "y_fact", PAJEK_VERTEX_SIZE],
        ["labelSize", "fos", 1],
    ] as const;
    // a man's or a woman's box is the figure's, which reaches past the size its x_fact and y_fact give (readSize)
    const figure = PAJEK_FIGURES.get(String(get("shape")));
    // an empty vertex has no size whatever it says (readVertex): none is written
    const sized = get("shape") !== "none";
    for (const [property, key, per] of numbers) {
        const v = get(property);
        if (!sized && key !== "fos") {
            continue;
        }
        let over = 1;
        if (figure !== undefined && key !== "fos") {
            over = figure[key === "x_fact" ? 0 : 1];
        }
        if (typeof v === "number" && (over !== 1 || v !== pajekDefault("node", property))) {
            out.set(key, Number((v / (per * over)).toPrecision(15)));
        }
    }
}

/**
 * A label's `font`, the inverse of `readFont`: a PostScript family with a generic one after it is written by its
 * PostScript name (`Courier, monospace` as `Courier`), any other family as it is; Pajek draws every label bold and
 * upright, so neither the weight nor the slant is written.
 * @param get - the element's values
 * @param out - the parameters, changed in place
 * @param skip - the font left out, Pajek's default, or undefined
 */
function fontParam(get: Get, out: Map<string, Written>, skip?: StyleValue): void {
    const font = get("labelFont");
    const name = typeof font === "string" && font !== "" ? graphvizFontName(font, false, false) : null;
    if (name !== null && name !== skip) {
        out.set("font", name);
    }
}

/**
 * A label position as Pajek's polar label parameters, leaving out the default (20 from the center at 285 degrees): a
 * label centered with its left edge's middle offset from the center is `lr` and `lphi` (the inverse of
 * `readLabelPosition`), one centered on the vertex `lr 0`, and a side its angle `lphi`; a side Pajek cannot put a
 * label on is written as the nearest it can, and noted.
 * @param get - the vertex's values
 * @param out - the parameters, changed in place
 * @param approximate - records approximations
 */
function labelPositionParams(get: Get, out: Map<string, Written>, approximate: Approximate): void {
    const position = get("labelPosition");
    if (typeof position !== "string") {
        return;
    }
    if (position === "center") {
        const polar = polarOf(get);
        if (polar === null) {
            out.set("lr", 0);
        } else if (polar[0] !== PAJEK_LABEL_RADIUS || polar[1] !== PAJEK_LABEL_ANGLE) {
            out.set("lr", polar[0]);
            out.set("lphi", polar[1]);
        }
        return;
    }
    const nearest = NEAREST_SIDES.get(position);
    if (nearest !== undefined) {
        approximate("labelPosition", position);
    }
    const angle = SIDE_ANGLES.get(nearest ?? position);
    if (angle !== undefined && angle !== PAJEK_LABEL_ANGLE) {
        out.set("lphi", angle);
    }
}

/**
 * The `lr` and `lphi` that put a centered label where its offsets say (`labelOffset`, inverted), 6 places each.
 * @param get - the vertex's values
 * @returns `[lr, lphi]`, or null for a label on the vertex's center (no offset, no shift)
 */
function polarOf(get: Get): [number, number] | null {
    const [x, y, shift] = [get("labelOffsetX"), get("labelOffsetY"), get("labelShiftX")];
    if (typeof x !== "number" || typeof y !== "number" || shift !== 0.5) {
        return null;
    }
    const size = get("labelSize");
    const up = y + PAJEK_BASELINE_TO_MIDDLE * (typeof size === "number" ? size : PAJEK_LABEL_SIZE);
    const round = (v: number): number => Number(v.toFixed(6)) + 0;
    const lr = round(Math.hypot(x, up));
    return lr === 0 ? null : [lr, round(((((Math.atan2(-up, x) * 180) / Math.PI) % 360) + 360) % 360)];
}

/**
 * A line's color and width when it sets neither: an arc's, or an edge's (the tool defaults).
 * @param directed - whether the line is an arc
 * @returns the color and width
 */
function lineDefaults(directed: boolean): {
    readonly color: StyleValue | undefined;
    readonly width: StyleValue | undefined;
} {
    return directed ? ARC_DEFAULTS : { color: pajekDefault("edge", "color"), width: pajekDefault("edge", "width") };
}

/**
 * A line's parameters from its values, leaving out the solid line Pajek draws by default (grey and 1 wide for an arc,
 * teal and 2 wide for an edge; `w` is half an edge's width). Arrows are Pajek's own: an arc has one at its target and
 * an edge none, so any other arrow is noted.
 * @param get - the line's values
 * @param directed - whether the line is an arc
 * @param approximate - records approximations
 * @returns the parameters
 */
function lineParams(get: Get, directed: boolean, approximate: Approximate): Map<string, Written> {
    const out = new Map<string, Written>();
    opaque(get, ["opacity"], approximate);
    const defaults = lineDefaults(directed);
    const color = get("color");
    if (typeof color === "string" && color !== defaults.color) {
        out.set("c", pajekColorText(color));
    }
    const width = get("width");
    if (typeof width === "number" && width !== defaults.width) {
        out.set("w", directed ? width : Number((width / EDGE_WIDTH_PER_W).toPrecision(15)));
    }
    const lineStyle = get("lineStyle");
    if (typeof lineStyle === "string" && lineStyle !== "solid" && pajekDots(lineStyle, out, directed, approximate)) {
        out.set("p", "Dots");
    }
    arrowParams(get, out);
    lineLabelParams(get, out, approximate);
    const target = get("targetArrow");
    if (target !== null && target !== (directed ? "triangle" : "none")) {
        approximate("targetArrow", target);
    }
    const source = get("sourceArrow");
    if (source !== null && source !== "none") {
        approximate("sourceArrow", source);
    }
    return out;
}

/**
 * A line's arrowhead parameters: its size `s`, which also places a Bezier arc's end (`readArcEnd`), and its place `ap`.
 * @param get - the line's values
 * @param out - the parameters, changed in place
 */
function arrowParams(get: Get, out: Map<string, Written>): void {
    const arrowSize = get("arrowSize");
    if (typeof arrowSize === "number" && arrowSize !== 1) {
        out.set("s", arrowSize);
    }
    const position = get("arrowPosition");
    if (typeof position === "number" && position > 0) {
        out.set("ap", position);
    }
}

/**
 * A line's label parameters: its text `l` (a line break or a double quote written as Pajek can hold it, noted), its
 * color `lc`, size `fos` and font `font`.
 * @param get - the line's values
 * @param out - the parameters, changed in place
 * @param approximate - records approximations
 */
function lineLabelParams(get: Get, out: Map<string, Written>, approximate: Approximate): void {
    const label = get("label");
    if (typeof label === "string" && label !== "") {
        const text = pajekLabelText(label);
        if (text !== label) {
            approximate("label", label);
        }
        out.set("l", text);
    }
    const labelColor = get("labelColor");
    if (typeof labelColor === "string") {
        out.set("lc", pajekColorText(labelColor));
    }
    const labelSize = get("labelSize");
    if (typeof labelSize === "number") {
        out.set("fos", labelSize);
    }
    fontParam(get, out);
}

/**
 * Whether a line other than a solid one is written as Pajek's Dots: Pajek draws Solid and Dots only, and its Dots
 * shows dots on a wide line and dashes on a thin one (`pajekDash`); the other of the two and any other dashed kind is
 * nearest to Dots, any other line to Solid.
 * @param lineStyle - the line style
 * @param params - the line's parameters written so far, its `w` among them
 * @param directed - whether the line is an arc
 * @param approximate - records approximations
 * @returns true for Dots
 */
function pajekDots(
    lineStyle: string,
    params: ReadonlyMap<string, Written>,
    directed: boolean,
    approximate: Approximate,
): boolean {
    if (lineStyle === pajekDash((key) => params.get(key) ?? null, directed)) {
        return true;
    }
    approximate("lineStyle", lineStyle);
    return ["dashed", "dotted", "dash-dot", "long-dash"].includes(lineStyle);
}

/**
 * For a file graphty wrote: where a value read from the parameters is what the writer writes for the block's own
 * value (a hexagon written as an ellipse, a dotted line as Dots), the block's exact value is the truth, so a re-import
 * gives back the same rules; a value another program changed since stays the truth.
 * @param snapshot - the graph
 * @param text - the block's text
 * @param read - the values read, changed in place
 * @param read.node - the node values
 * @param read.edge - the edge values
 * @param labels - whether the lines' labels are drawn
 */
function exactFromBlock(
    snapshot: GraphSnapshot,
    text: string,
    read: { readonly node: ValueColumns; readonly edge: ValueColumns },
    labels: boolean,
): void {
    const notes = new StyleNotes();
    const directed = directedEdges(snapshot);
    takeFromBlock(snapshot, text, "pajek", (target) => ({
        values: read[target],
        properties: READ[target],
        writes: PAJEK_STYLE_CAPABILITIES[target],
        readBack: (i, want) => {
            const back = writtenAndReadBack(target, want, directed[i], notes, labels);
            return (property) => back.get(property) ?? null;
        },
        // a label the block places by a side clears the offsets its `lphi` reads back as
        take: (property, wanted) => wanted !== null || LABEL_PLACE.has(property) || OUTLINE.has(property),
    }));
}

/** The outline a shape written as `diamond` reads back as, which the block's own shape clears. */
const OUTLINE: ReadonlySet<string> = new Set(["shapePoints", "shapePointsStretch"]);

/** The label place properties a side written as `lphi` reads back as. */
const LABEL_PLACE: ReadonlySet<string> = new Set(["labelOffsetX", "labelOffsetY", "labelShiftX"]);

/**
 * An element's values written as the writer writes them and read back as the reader reads them.
 * @param target - nodes or edges
 * @param want - its values
 * @param directed - for a line, whether it is an arc
 * @param notes - a scratch for the notes the round trip makes
 * @param labels - whether the lines' labels are drawn
 * @returns the values read back, by property
 */
function writtenAndReadBack(
    target: StyleTarget,
    want: Get,
    directed: boolean,
    notes: StyleNotes,
    labels: boolean,
): Map<string, StyleValue> {
    const ignore: Approximate = () => undefined;
    const params = target === "node" ? vertexParams(want, ignore) : lineParams(want, directed, ignore);
    const back = new Map<string, StyleValue>();
    const label = target === "node" ? want("label") : null;
    if (typeof label === "string") {
        params.set(LABEL_COLUMN, pajekLabelText(label));
    }
    // what the writer restates so that nothing is carried to this element (`restateCarried`)
    if (target === "node" && [...params.keys()].every((key) => key === LABEL_COLUMN)) {
        params.set(SHAPE_COLUMN, "ellipse");
    }
    for (const key of target === "edge" ? CARRIED.edge : []) {
        if (!params.has(key)) {
            params.set(key, lineRestated(key, directed));
        }
    }
    const get: Param = (key) => params.get(key) ?? null;
    const put: Put = (property, value) => {
        if (value !== null) {
            back.set(property, value);
        }
    };
    const at: At = (property) => ({ notes, target, property });
    if (target === "node") {
        readVertex(get, put, at);
    } else {
        readLine(get, put, at, directed, labels);
    }
    return back;
}

/** A Pajek export with styles worked out. */
interface PajekStyledExport {
    /** The graph to write: the shape keyword and parameters written from the styles. */
    readonly snapshot: GraphSnapshot;
    /** The comment line carrying the `graphty.styles` block, without its line end. */
    readonly comment: string;
    /** W_STYLE_APPROXIMATED for every value written as the nearest one Pajek has. */
    readonly notes: readonly LossNote[];
}

/**
 * Works out a Pajek export with styles: every vertex's shape keyword and drawing parameters and every line's `c`, `w`
 * and `p` from what graphty draws, in place of every such parameter it had, and the `graphty.styles` block, with the
 * per-element values its rules read inside it, as a comment line.
 * @param snapshot - the graph handed to the exporter
 * @param input - the styles, or undefined when none are written
 * @returns the styled export, or null without styles
 */
export function pajekStyledExport(
    snapshot: GraphSnapshot,
    input: ExporterStyleInput | undefined,
): PajekStyledExport | null {
    if (input === undefined) {
        return null;
    }
    const approximated = new StyleApproximations();
    const out = snapshot.withColumns();
    const directed = directedEdges(snapshot);
    for (const target of ["node", "edge"] as const) {
        const table = target === "node" ? out.nodes : out.edges;
        const approximate: Approximate = (property, value) => {
            approximated.add(target, property, value);
        };
        const get = elementValues((t, p) => input.picture(t, p as never), target, PAJEK_STYLE_CAPABILITIES[target]);
        const n = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const params = (i: number): Map<string, Written> =>
            target === "node" ? vertexParams(get(i), approximate) : lineParams(get(i), directed[i], approximate);
        const columns = paramColumns(n, params);
        if (target === "edge") {
            keepLineLabels(snapshot, columns);
        }
        restateCarried(target, columns, directed);
        replaceParamColumns(table, target === "node" ? [SHAPE_COLUMN, ...NODE_KEYS] : EDGE_KEYS, columns);
    }
    out.nodes.set(
        LABEL_COLUMN,
        drawnLabels(input, snapshot.nodeCount, approximated),
        { dtype: "string", role: "label" },
        {
            replaceRole: true,
        },
    );
    const notes = approximated.notes("Pajek");
    const block = writeStyleBlock(input.rules, { inlineColumns: true, snapshot });
    notes.push(...styleBlockLosses(block, input.rules.styles.rules.length, "size"));
    return { snapshot: out, comment: PAJEK_STYLE_COMMENT + block, notes };
}

/**
 * Keeps each line's own label `l` where graphty draws none: Pajek draws no line label by default (`drawsLineLabels`),
 * so a label the file holds is not drawn, and writing it back keeps it for a Draw window that marks lines with labels.
 * @param snapshot - the graph handed to the exporter
 * @param columns - the written edge columns, by key, changed in place
 */
function keepLineLabels(snapshot: GraphSnapshot, columns: Map<string, (Written | null)[]>): void {
    if (!snapshot.edges.has("l")) {
        return;
    }
    const own = (e: number): unknown => plainCell(snapshot.edges.value("l", e));
    let col = columns.get("l");
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const v = own(e);
        if (typeof v === "string" && v !== "" && (col?.[e] ?? null) === null) {
            col ??= new Array<Written | null>(snapshot.edgeCount).fill(null);
            col[e] = pajekLabelText(v);
        }
    }
    if (col !== undefined) {
        columns.set("l", col);
    }
}

/**
 * Each vertex's label as graphty draws it; a vertex graphty draws without one gets an empty label, which Pajek draws
 * as nothing (with no label, Pajek writes and draws the vertex's id).
 * @param input - the styles
 * @param n - the vertex count
 * @param approximated - records approximations
 * @returns the labels
 */
function drawnLabels(input: ExporterStyleInput, n: number, approximated: StyleApproximations): string[] {
    const drawn = input.picture("node", "label");
    const out = new Array<string>(n).fill("");
    for (let i = 0; i < n; i++) {
        const v = drawn[i] ?? null;
        if (typeof v === "string") {
            out[i] = pajekLabelText(v);
            if (out[i] !== v) {
                approximated.add("node", "label", v);
            }
        }
    }
    return out;
}

/**
 * A label as Pajek can write it: a line break becomes a space and a double quote a single one, which Pajek's labels
 * cannot hold.
 * @param label - the label graphty draws
 * @returns the text written
 */
function pajekLabelText(label: string): string {
    return label.replaceAll(/\r\n|[\r\n]/g, " ").replaceAll('"', "'");
}

/**
 * Replaces every drawing parameter column of a table with the ones written from the styles.
 * @param table - the node or edge columns, changed in place
 * @param keys - every drawing parameter key of the target
 * @param columns - the written columns, by key
 */
function replaceParamColumns(
    table: ReturnType<GraphSnapshot["withColumns"]>["nodes"],
    keys: readonly string[],
    columns: Map<string, (Written | null)[]>,
): void {
    for (const key of keys) {
        if (table.has(key)) {
            table.remove(key);
        }
    }
    for (const [key, col] of columns) {
        const numeric = col.every((v) => v === null || typeof v === "number");
        table.set(key, col, { dtype: numeric ? "f64" : "string" });
    }
}

/**
 * Keeps Pajek from drawing an element with the parameters of the one before it (`CARRIED`): a line writes Pajek's own
 * default for each parameter another line writes and it leaves out, and a vertex that writes no parameter while
 * another does writes its shape, `ellipse`, which starts it again from Pajek's defaults.
 * @param target - nodes or edges
 * @param columns - the written columns, by key, changed in place
 * @param directed - for each line, whether it is an arc
 */
function restateCarried(
    target: StyleTarget,
    columns: Map<string, (Written | null)[]>,
    directed: readonly boolean[],
): void {
    if (target === "node") {
        const all = [...columns.values()];
        if (all.length === 0) {
            return;
        }
        const n = all[0].length;
        const shape = columns.get(SHAPE_COLUMN) ?? new Array<Written | null>(n).fill(null);
        for (let i = 0; i < n; i++) {
            if (all.every((col) => col[i] === null)) {
                shape[i] = "ellipse";
            }
        }
        columns.set(SHAPE_COLUMN, shape);
        return;
    }
    for (const key of CARRIED.edge) {
        const col = columns.get(key);
        if (col === undefined) {
            continue;
        }
        for (let i = 0; i < col.length; i++) {
            col[i] ??= lineRestated(key, directed[i]);
        }
    }
}

/**
 * What a line writes for a carried parameter it leaves at Pajek's default.
 * @param key - the parameter
 * @param directed - whether the line is an arc
 * @returns the value written
 */
function lineRestated(key: string, directed: boolean): Written {
    const defaults = lineDefaults(directed);
    switch (key) {
        case "c":
            return pajekColorText(String(defaults.color));
        case "w":
            return directed ? Number(defaults.width) : Number(defaults.width) / EDGE_WIDTH_PER_W;
        case "p":
            return "Solid";
        case "s":
            return 1;
        default:
            return 0;
    }
}

/**
 * Every element's parameters, as columns.
 * @param n - the element count
 * @param params - an element's parameters
 * @returns the columns, by parameter key
 */
function paramColumns(n: number, params: (i: number) => Map<string, Written>): Map<string, (Written | null)[]> {
    const columns = new Map<string, (Written | null)[]>();
    for (let i = 0; i < n; i++) {
        for (const [key, value] of params(i)) {
            let col = columns.get(key);
            if (col === undefined) {
                col = new Array<Written | null>(n).fill(null);
                columns.set(key, col);
            }
            col[i] = value;
        }
    }
    return columns;
}
