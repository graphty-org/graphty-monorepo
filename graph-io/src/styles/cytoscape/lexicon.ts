/**
 * Cytoscape desktop's visual lexicon (CX, CX2, sessions, XGMML): which visual properties set each neutral
 * property, and how each value is read. Cytoscape states opacities two ways (`NODE_TRANSPARENCY` 0..255 in the
 * desktop and CX version 1, `NODE_BACKGROUND_OPACITY` 0..1 in CX2); both are read here.
 */

import { canonColor } from "../canon/color.js";
import { canonEnum } from "../canon/enums.js";
import { canonBoolean, canonNumber, canonOpacity, num6 } from "../canon/number.js";
import { type CanonSite, noteAt, scalarText } from "../canon/site.js";
import { canonText } from "../canon/text.js";
import { STYLE_ISSUE } from "../codes.js";
import type { StyleNotes } from "../notes.js";
import type { StyleTarget, StyleValue } from "../types.js";
import { isStyleValue } from "../vocabulary.js";

/**
 * Reads one raw Cytoscape value as a neutral property's canonical value, noting a problem at the site.
 * @category Styles
 */
export type CytoscapeValueParser = (raw: unknown, site: CanonSite) => StyleValue | null;

// A color; its alpha is dropped (Cytoscape keeps opacity in separate properties).
const color: CytoscapeValueParser = (raw, site) => canonColor(raw, "cytoscape", site)?.color ?? null;

// Cytoscape desktop's 0..255 transparency.
const opacity255: CytoscapeValueParser = (raw, site) => {
    const v = canonNumber(raw, site);
    if (v === null) {
        return null;
    }
    if (v > 255) {
        noteAt(site, STYLE_ISSUE.BAD_VALUE, String(raw));
        return null;
    }
    return num6(Math.round(v) / 255);
};

// CX2's 0..1 opacity.
const opacity01: CytoscapeValueParser = (raw, site) => canonOpacity(raw, "css", site);
const length: CytoscapeValueParser = (raw, site) => canonNumber(raw, site);
// An arrow size as the neutral factor: Cytoscape's normal arrow is size 6 (default_vizmap.xml).
export const arrowSizeParser: CytoscapeValueParser = (raw, site) => {
    const v = canonNumber(raw, site);
    return v === null ? null : num6(v / 6);
};

// Degrees, clockwise on screen as Cytoscape turns a label, folded into 0..360.
// ponytail: a continuous mapping across 0 (from -30 to 30) folds to 330..30 and interpolates the long way round;
// keep the sign when a file needs it.
const rotation: CytoscapeValueParser = (raw, site) => {
    const v = typeof raw === "number" ? raw : Number(scalarText(raw, site)?.trim() ?? Number.NaN);
    if (!Number.isFinite(v)) {
        noteAt(site, STYLE_ISSUE.BAD_VALUE, String(raw));
        return null;
    }
    return num6(((v % 360) + 360) % 360);
};

// Cytoscape desktop holds a font size as a whole number, so every value read for one is drawn rounded.
const fontSize: CytoscapeValueParser = (raw, site) => {
    const v = canonNumber(raw, site);
    return v === null ? null : Math.round(v);
};
const text: CytoscapeValueParser = (raw, site) => canonText(raw, site);
const bool: CytoscapeValueParser = (raw, site) => canonBoolean(raw, site);

// CX2's `element` / `none`, or a boolean.
const visibility: CytoscapeValueParser = (raw, site) => {
    if (typeof raw === "string") {
        const t = raw.trim().toLowerCase();
        if (t === "element" || t === "visible") {
            return true;
        }
        if (t === "none" || t === "hidden") {
            return false;
        }
    }
    return canonBoolean(raw, site);
};

/** Cytoscape spellings the common shape table does not hold. */
const CY_SHAPES: ReadonlyMap<string, string> = new Map([["rounded_rectangle", "round-rectangle"]]);

/**
 * Cytoscape reads its enumeration names whatever their case, so a name it does not know is kept lowercase and
 * hyphenated, the form of the names it knows: `Bogus` and the `BOGUS` a writer spells it as read the same.
 * @param v - a canonical value
 * @returns the value, an `other:` one in that form
 */
const caseless = (v: StyleValue | null): StyleValue | null =>
    typeof v === "string" && v.startsWith("other:") ? `other:${v.slice(6).toLowerCase().replaceAll("_", "-")}` : v;

const shape: CytoscapeValueParser = (raw, site) => {
    const s = scalarText(raw, site);
    if (s === null) {
        return null;
    }
    return caseless(CY_SHAPES.get(s.trim().toLowerCase()) ?? canonEnum("shape", s, "cytoscape", site));
};

/** Cytoscape's arrow names, desktop (`DELTA`) and CX2 (`triangle`), lowercase. */
const CY_ARROWS: ReadonlyMap<string, string> = new Map([
    ["none", "none"],
    ["delta", "triangle"],
    // a filled delta with a shallow notch in its back, as long and wide as DELTA (Cytoscape 3.10.5 SVG export)
    ["arrow", "triangle"],
    ["diamond", "diamond"],
    ["circle", "circle"],
    ["t", "tee"],
    ["half_top", "half"],
    // the half arrow on the line's other side from HALF_TOP's
    ["half_bottom", "other:half-bottom"],
    ["square", "square"],
    ["delta_short_1", "triangle"],
    ["delta_short_2", "triangle"],
    // a short arrow whose notch is too shallow to show: drawn as the triangle it reads as
    ["arrow_short", "triangle"],
    ["diamond_short_1", "diamond"],
    ["diamond_short_2", "diamond"],
    ["open_delta", "triangle-open"],
    ["open_circle", "circle-open"],
    ["open_diamond", "diamond-open"],
    ["open_square", "other:open-square"],
    // a delta with a bar across the line behind it
    ["cross_delta", "other:cross-delta"],
    ["cross_open_delta", "other:cross-open-delta"],
    ["open_half_circle", "other:open-half-circle"],
    ["half_circle", "other:half-circle"],
    ["triangle", "triangle"],
    ["triangle-tee", "tee"],
    // CX2's spelling of CROSS_DELTA
    ["triangle-cross", "other:cross-delta"],
    ["triangle-backcurve", "triangle"],
    ["tee", "tee"],
    ["vee", "vee"],
    ["open-circle", "circle-open"],
    ["open-triangle", "triangle-open"],
    ["open-diamond", "diamond-open"],
    ["open-square", "other:open-square"],
    ["open-delta", "triangle-open"],
    ["half-top", "half"],
    ["half-bottom", "other:half-bottom"],
]);

/**
 * How much longer and wider than the neutral shape it is read as each Cytoscape arrow is drawn: the short deltas and
 * diamonds, the short arrow and the crossed deltas (a bar behind the delta), from the unit glyphs Cytoscape 3.10.5's
 * SVG export draws (a DELTA is 2 long and 1 wide, DELTA_SHORT_1 1 by 1, ARROW_SHORT 1.2 by 0.8, CROSS_DELTA 3 by 1.5).
 * Every other arrow is drawn in its shape's own proportions.
 */
const CY_ARROW_PROPORTIONS: ReadonlyMap<string, { readonly length: number; readonly width: number }> = new Map([
    ["delta_short_1", { length: 0.5, width: 1 }],
    ["delta_short_2", { length: 0.25, width: 1 }],
    ["arrow_short", { length: 0.6, width: 0.8 }],
    ["diamond_short_1", { length: 0.5, width: 1 }],
    ["diamond_short_2", { length: 0.25, width: 1 }],
    ["cross_delta", { length: 1.5, width: 1.5 }],
    ["cross_open_delta", { length: 1.5, width: 1.5 }],
    ["triangle-cross", { length: 1.5, width: 1.5 }],
]);

/**
 * How far from its node Cytoscape draws each arrow that stands off the node's outline, as a multiple of the arrow's
 * own length along its line, from the unit glyphs Cytoscape 3.10.5's SVG export draws back from the outline: T's bar
 * from 0.8 to 1 (4 of its 0.2), a half circle from 0.5 to 1, HALF_TOP's barb from 0.3 to 1.435, a square from 0.25
 * to 1.25. Every other arrow touches the outline.
 */
const CY_ARROW_GAPS: ReadonlyMap<string, number> = new Map([
    ["t", 4],
    ["tee", 4],
    ["half_circle", 1],
    ["open_half_circle", 1],
    ["half_top", 0.3 / 1.135],
    ["half_bottom", 0.3 / 1.135],
    ["half-top", 0.3 / 1.135],
    ["half-bottom", 0.3 / 1.135],
    ["square", 0.25],
    ["open_square", 0.25],
    ["open-square", 0.25],
]);

/** Cytoscape 2.x numbered arrow codes. */
const LEGACY_ARROW: readonly string[] = [
    "none",
    "delta",
    "delta",
    "delta",
    "arrow",
    "arrow",
    "arrow",
    "diamond",
    "diamond",
    "diamond",
    "circle",
    "circle",
    "circle",
    "t",
    "t",
    "t",
    "half_top",
    "half_bottom",
];

/**
 * A Cytoscape arrow name, lowercase, with a 2.x numbered code read as its name.
 * @param s - the raw name
 * @returns the key
 */
function arrowKey(s: string): string {
    const key = s.trim().toLowerCase();
    return /^\d{1,2}$/.test(key) ? (LEGACY_ARROW.at(Number(key)) ?? key) : key;
}

const arrow: CytoscapeValueParser = (raw, site) => {
    const s = scalarText(raw, site);
    if (s === null) {
        return null;
    }
    return caseless(CY_ARROWS.get(arrowKey(s)) ?? canonEnum("arrow", s, "cytoscape", site));
};

/**
 * The parser of an arrow's length or width as a fraction of its neutral shape's, from the arrow's name: 1 for every
 * arrow Cytoscape draws in its shape's proportions, so a bypass over a short default draws the full shape again.
 * @param side - which proportion
 * @returns the parser; null for a name it does not know (the shape's parser notes it)
 */
export function arrowProportion(side: "length" | "width"): CytoscapeValueParser {
    return (raw, site) => {
        const s = scalarText(raw, site);
        if (s === null) {
            return null;
        }
        const key = arrowKey(s);
        return CY_ARROW_PROPORTIONS.get(key)?.[side] ?? (CY_ARROWS.has(key) ? 1 : null);
    };
}

/**
 * The parser of how far an arrow stands off its node, as a multiple of its own length (`CY_ARROW_GAPS`), from the
 * arrow's name: 0 for an arrow that touches the node.
 * @param raw - the arrow's name
 * @param site - where it was read
 * @returns the gap; null for a name it does not know (the shape's parser notes it)
 */
export const arrowGap: CytoscapeValueParser = (raw, site) => {
    const s = scalarText(raw, site);
    if (s === null) {
        return null;
    }
    const key = arrowKey(s);
    return CY_ARROW_GAPS.get(key) ?? (CY_ARROWS.has(key) ? 0 : null);
};

/** Cytoscape's line types, lowercase. */
const CY_LINES: ReadonlyMap<string, string> = new Map([
    ["solid", "solid"],
    ["dot", "dotted"],
    ["dots", "dotted"],
    ["equal_dash", "dashed"],
    ["long_dash", "dashed"],
    ["dash_dot", "dash-dot"],
    ["sinewave", "sinewave"],
    ["zigzag", "zigzag"],
    ["parallel_lines", "double"],
    ["marquee_dash", "dashed"],
    ["marquee_equal", "dashed"],
    ["marquee_dash_dot", "dash-dot"],
    ["backward_slash", "other:backward-slash"],
    ["forward_slash", "other:forward-slash"],
    ["vertical_slash", "other:vertical-slash"],
    ["separate_arrow", "other:separate-arrow"],
    ["contiguous_arrow", "other:contiguous-arrow"],
    ["double", "double"],
]);

/**
 * A line type read for an edge line or a node border.
 * @param kind - which enumeration the value belongs to
 * @returns the parser
 */
function lineOf(kind: "lineStyle" | "borderStyle"): CytoscapeValueParser {
    return (raw, site) => {
        const s = scalarText(raw, site);
        if (s === null) {
            return null;
        }
        const key = s.trim().toLowerCase();
        let v: string | null;
        if (/^line_\d{1,3}$/.test(key)) {
            v = "solid";
        } else if (/^dashed_\d{1,3}$/.test(key)) {
            v = "dashed";
        } else {
            v = CY_LINES.get(key) ?? canonEnum(kind, s, "cytoscape", site);
        }
        if (v === null || isStyleValue("node", kind, v) || kind === "lineStyle") {
            return v;
        }
        // a line type a border does not have is kept as other:, spelled as the line type's own (other:forward-slash)
        return v.startsWith("other:") ? v : `other:${v}`;
    };
}

/** The parts of a Cytoscape font face. */
interface FontFace {
    readonly family: string;
    readonly weight: "normal" | "bold";
    readonly italic: boolean;
}

/**
 * A Java font name's own style: `Dialog.bolditalic` is the bold italic face of `Dialog`, and Java draws it bold and
 * italic whatever style the rest of the face states (`Dialog.bolditalic,plain,12` is drawn bold italic).
 * @param name - the font name
 * @returns the family without the suffix, and whether the suffix makes it bold or italic
 */
function javaFace(name: string): FontFace {
    const m = /\.(bold|italic|plain|bolditalic)$/i.exec(name);
    const suffix = m?.[1].toLowerCase() ?? "";
    return {
        family: m === null ? name : name.slice(0, m.index),
        weight: suffix.includes("bold") ? "bold" : "normal",
        italic: suffix.includes("italic"),
    };
}

/**
 * A face whose family may carry a Java style suffix, its suffix's style added to the stated one.
 * @param family - the family as written
 * @param bold - whether the face states bold
 * @param italic - whether the face states italic
 * @returns the face
 */
function withSuffix(family: string, bold: boolean, italic: boolean): FontFace {
    const own = javaFace(family.trim());
    return {
        family: own.family,
        weight: bold || own.weight === "bold" ? "bold" : "normal",
        italic: italic || own.italic,
    };
}

/**
 * A font face: `SansSerif,plain,12`, `Dialog.bold,bold,12`, the legacy `SansSerif-0-12` (style bits 1 bold,
 * 2 italic) or CX2's `{ FONT_FAMILY, FONT_STYLE, FONT_WEIGHT }`, whose `FONT_NAME` (the font Cytoscape desktop
 * wrote it from, which its own import restores) wins over the CSS family when present. A Java style suffix on the
 * name (`SansSerif.bold`) is drawn as well.
 * @param raw - the value
 * @param site - where it was read
 * @returns the face, or null
 */
function fontFace(raw: unknown, site: CanonSite): FontFace | null {
    if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
        return cx2FontFace(raw as Record<string, unknown>, site);
    }
    const s = scalarText(raw, site);
    if (s === null) {
        return null;
    }
    const parts = s.split(",");
    if (parts.length >= 2) {
        // desktop takes the face from the name alone (`FontVisualProperty.parseSerializableString`): its style word is
        // what it writes, not what it reads, so a passthrough of `Serif,bold,12` is drawn plain (Cytoscape 3.10.5's
        // SVG of specimen-mappings-bypass-p19, passthrough-font-face) and `SansSerif.bold,bold,10` bold by its suffix
        return withSuffix(parts[0], false, false);
    }
    return legacyFontFace(s) ?? withSuffix(s, false, false);
}

/**
 * CX2's font face object.
 * @param o - the object
 * @param site - where it was read
 * @returns the face, or null without a family
 */
function cx2FontFace(o: Record<string, unknown>, site: CanonSite): FontFace | null {
    const name = Object.hasOwn(o, "FONT_NAME") ? scalarText(o.FONT_NAME, site) : null;
    let family = Object.hasOwn(o, "FONT_FAMILY") ? scalarText(o.FONT_FAMILY, site) : null;
    if (name !== null && name.trim() !== "") {
        family = name;
    }
    if (family === null) {
        return null;
    }
    const weight = Object.hasOwn(o, "FONT_WEIGHT") ? String(o.FONT_WEIGHT) : "";
    const style = Object.hasOwn(o, "FONT_STYLE") ? String(o.FONT_STYLE) : "";
    return withSuffix(family, /bold/i.test(weight.slice(0, 32)), /italic/i.test(style.slice(0, 32)));
}

/**
 * The legacy `Family-style-size` face: the last two dash parts are numbers, the style's bits 1 bold and 2 italic.
 * @param s - the value
 * @returns the face, or null when it is not one
 */
function legacyFontFace(s: string): FontFace | null {
    const dash = s.split("-");
    const numeric = (t: string | undefined): boolean => /^\d+(?:\.\d+)?$/.test(t ?? "");
    if (dash.length < 3 || !numeric(dash.at(-1)) || !numeric(dash.at(-2))) {
        return null;
    }
    const bits = Math.trunc(Number(dash.at(-2)));
    let family = dash.slice(0, -2).join("-");
    let bold = (bits & 1) !== 0;
    if (/-bold$/i.test(family)) {
        family = family.slice(0, -"-bold".length);
        bold = true;
    }
    return withSuffix(family, bold, (bits & 2) !== 0);
}

/**
 * The faces Java draws its logical fonts in on Linux, where the oracles were drawn (the JDK's fontconfig maps
 * SansSerif and Dialog to DejaVu Sans), each before the CSS generic family it stands for. A label wraps by its width
 * in that face: a browser's own sans-serif (Liberation Sans) is 14 percent narrower, so its lines break later.
 */
export const JAVA_SANS = "DejaVu Sans, sans-serif";
export const JAVA_SERIF = "DejaVu Serif, serif";
export const JAVA_MONO = "DejaVu Sans Mono, monospace";

/** The family a Java logical font name is read as (`Dialog` is drawn as a sans-serif font). */
const JAVA_FONTS: ReadonlyMap<string, string> = new Map([
    // CX2's CSS generic families too: Cytoscape desktop hands them to Java, which draws them as these
    ["sans-serif", JAVA_SANS],
    ["monospace", JAVA_MONO],
    ["sansserif", JAVA_SANS],
    ["dialog", JAVA_SANS],
    ["default", JAVA_SANS],
    ["dialoginput", JAVA_MONO],
    ["monospaced", JAVA_MONO],
    ["serif", JAVA_SERIF],
]);

const fontFamily: CytoscapeValueParser = (raw, site) => {
    const family = fontFace(raw, site)?.family ?? null;
    return family === null ? null : javaFamily(family);
};

/** The CSS generic families. */
const CSS_GENERIC: ReadonlySet<string> = new Set([
    "sans-serif",
    "serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
]);

/**
 * A Java font name as the CSS family Cytoscape draws it with: a logical name as its generic family, and any other
 * with Dialog's face after it, because Java draws a font it does not have as Dialog
 * (`Calibri-Bold` on a machine without Calibri is drawn in Dialog's face and measured so when a label wraps).
 * @param family - the Java font name, without its style suffix
 * @returns the CSS family
 */
export function javaFamily(family: string): string {
    const logical = JAVA_FONTS.get(family.toLowerCase());
    if (logical !== undefined) {
        return logical;
    }
    // a CSS generic family or family list (CX2 writes them) already says what stands in for a missing font
    return family.includes(",") || CSS_GENERIC.has(family.toLowerCase()) ? family : `${family}, ${JAVA_SANS}`;
}
const fontWeight: CytoscapeValueParser = (raw, site) => fontFace(raw, site)?.weight ?? null;
const fontItalic: CytoscapeValueParser = (raw, site) => fontFace(raw, site)?.italic ?? null;

/** A desktop anchor letter as a point of a box, x right and y down, each -1, 0 or 1. */
const ANCHOR: ReadonlyMap<string, readonly [number, number]> = new Map([
    ["C", [0, 0]],
    ["N", [0, -1]],
    ["S", [0, 1]],
    ["E", [1, 0]],
    ["W", [-1, 0]],
    ["NE", [1, -1]],
    ["NW", [-1, -1]],
    ["SE", [1, 1]],
    ["SW", [-1, 1]],
    ["NONE", [0, 0]],
]);

/** CX2's anchor and align words as a point of a box on one axis. */
const CX2_SIDE: ReadonlyMap<string, number> = new Map([
    ["center", 0],
    ["left", -1],
    ["right", 1],
    ["top", -1],
    ["bottom", 1],
]);

/** A label justification as the neutral text alignment. */
const JUSTIFY: ReadonlyMap<string, string> = new Map([
    ["l", "left"],
    ["left", "left"],
    ["c", "center"],
    ["center", "center"],
    ["r", "right"],
    ["right", "right"],
]);

/**
 * A Cytoscape label position, read whole: the point of the node (or the edge's middle) `node` and the point of the
 * label's box `label` it is pinned to, each `[x, y]` with x right and y down as -1, 0 or 1, the justification of its
 * lines, and the offset `[x, y]` in px, y down.
 * @category Styles
 */
export interface CytoscapeLabelPlace {
    readonly node: readonly [number, number];
    readonly label: readonly [number, number];
    readonly justify: string;
    readonly offset: readonly [number, number];
}

/**
 * The anchors of CX2's edge label position `{ EDGE_ANCHOR, LABEL_ANCHOR, ... }`, each a desktop anchor letter, as
 * `[edge x, edge y, label x, label y]`; undefined where a letter is not one.
 * @param o - the position
 * @param site - where a bad value is noted
 * @returns the four sides
 */
function cx2EdgeAnchors(o: Record<string, unknown>, site: CanonSite): (number | undefined)[] {
    const letter = (key: string): readonly [number, number] | undefined =>
        ANCHOR.get((scalarText(Object.hasOwn(o, key) ? o[key] : "C", site) ?? "").trim().toUpperCase());
    return [
        ...(letter("EDGE_ANCHOR") ?? [undefined, undefined]),
        ...(letter("LABEL_ANCHOR") ?? [undefined, undefined]),
    ];
}

/**
 * Reads a label position: desktop's `C,C,c,0.00,0.00` (node anchor, label anchor, justification, x and y offsets)
 * or CX2's `{ HORIZONTAL_ANCHOR, VERTICAL_ANCHOR, HORIZONTAL_ALIGN, VERTICAL_ALIGN, JUSTIFICATION, MARGIN_X,
 * MARGIN_Y }` (for an edge's label `{ EDGE_ANCHOR, LABEL_ANCHOR, JUSTIFICATION, MARGIN_X, MARGIN_Y }`, the anchors
 * as desktop's letters).
 * @param raw - the value
 * @param site - where a bad value is noted
 * @returns the place, or null
 * @category Styles
 */
export function cytoscapeLabelPlace(raw: unknown, site: CanonSite): CytoscapeLabelPlace | null {
    if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
        const o = raw as Record<string, unknown>;
        const word = (key: string): string => {
            const v = Object.hasOwn(o, key) ? scalarText(o[key], site) : null;
            return (v ?? "center").trim().toLowerCase();
        };
        const num = (key: string): number => {
            const v = Object.hasOwn(o, key) ? Number(o[key]) : 0;
            return Number.isFinite(v) ? v : 0;
        };
        const sides = Object.hasOwn(o, "EDGE_ANCHOR")
            ? cx2EdgeAnchors(o, site)
            : ["HORIZONTAL_ANCHOR", "VERTICAL_ANCHOR", "HORIZONTAL_ALIGN", "VERTICAL_ALIGN"].map((k) =>
                  CX2_SIDE.get(word(k)),
              );
        if (sides.includes(undefined)) {
            noteAt(site, STYLE_ISSUE.UNKNOWN_VALUE, JSON.stringify(raw).slice(0, 64));
            return null;
        }
        const [nx, ny, lx, ly] = sides as number[];
        return {
            node: [nx, ny],
            label: [lx, ly],
            justify: JUSTIFY.get(word("JUSTIFICATION")) ?? "center",
            offset: [num("MARGIN_X"), num("MARGIN_Y")],
        };
    }
    const s = scalarText(raw, site);
    if (s === null) {
        return null;
    }
    const parts = s.split(",").map((p) => p.trim());
    const node = ANCHOR.get(parts[0].toUpperCase());
    // a position naming only the node's anchor pins the label's opposite point there, as Cytoscape 2.x did
    const label = parts.length > 1 ? ANCHOR.get(parts[1].toUpperCase()) : node?.map((v) => -v);
    if (node === undefined || label === undefined) {
        noteAt(site, STYLE_ISSUE.UNKNOWN_VALUE, s);
        return null;
    }
    const at = (i: number): number => {
        const v = Number(parts[i] ?? 0);
        return Number.isFinite(v) ? v : 0;
    };
    return {
        node,
        label: [label[0], label[1]],
        justify: JUSTIFY.get((parts[2] ?? "c").toLowerCase()) ?? "center",
        offset: [at(3), at(4)],
    };
}

/** The neutral position of a label inside its node against each side, by `[x, y]` of the side, y down. */
const INSIDE: ReadonlyMap<string, string> = new Map([
    ["0,0", "center"],
    ["0,-1", "inside-top"],
    ["0,1", "inside-bottom"],
    ["-1,0", "inside-left"],
    ["1,0", "inside-right"],
    ["-1,-1", "inside-top-left"],
    ["1,-1", "inside-top-right"],
    ["-1,1", "inside-bottom-left"],
    ["1,1", "inside-bottom-right"],
]);

/**
 * The neutral `labelPosition` a Cytoscape label position starts from: where the label's point is the node's own
 * point on both axes (its center, or inside against a side or a corner), that position; anywhere else `center`,
 * with the rest said by `labelOffsetX`/`Y` and `labelShiftX`/`Y` (see `cytoscapeLabelMove()`).
 * @param place - the label position
 * @returns the neutral position
 * @category Styles
 */
export function cytoscapeLabelBase(place: CytoscapeLabelPlace): string {
    const inside = place.node[0] === place.label[0] && place.node[1] === place.label[1];
    return inside ? (INSIDE.get(`${place.node[0]},${place.node[1]}`) ?? "center") : "center";
}

/**
 * How far a Cytoscape label is moved from its `cytoscapeLabelBase()` position: the offset in px (y down), with the
 * node's anchor point added when the base is `center` and the anchors differ, and the shift by the label's own
 * size that pins the label's anchor point there.
 * @param place - the label position
 * @param width - the node's width (0 for an edge's middle)
 * @param height - the node's height (0 for an edge's middle)
 * @returns the offset and the shift, each `[x, y]`
 * @category Styles
 */
export function cytoscapeLabelMove(
    place: CytoscapeLabelPlace,
    width: number,
    height: number,
): { readonly offset: readonly [number, number]; readonly shift: readonly [number, number] } {
    if (
        cytoscapeLabelBase(place) !== "center" ||
        (place.node[0] === 0 && place.node[1] === 0 && place.label[0] === 0 && place.label[1] === 0)
    ) {
        return { offset: place.offset, shift: [0, 0] };
    }
    return {
        offset: [(place.node[0] * width) / 2 + place.offset[0], (place.node[1] * height) / 2 + place.offset[1]],
        shift: [halfBack(place.label[0]), halfBack(place.label[1])],
    };
}

/**
 * How far a label is shifted, as a fraction of its own size, to pin its point `side` (-1, 0 or 1) where its middle was.
 * @param side - the label's point on one axis
 * @returns the shift (0, never -0, for the middle)
 * @category Styles
 */
export function halfBack(side: number): number {
    return side === 0 ? 0 : -side / 2;
}

const labelPosition: CytoscapeValueParser = (raw, site) => {
    const place = cytoscapeLabelPlace(raw, site);
    return place === null ? null : cytoscapeLabelBase(place);
};

/**
 * The visual properties that set each neutral property, in the order Cytoscape prefers them: the first one a style
 * or any bypass mentions is the one read. Cytoscape draws a node's fill from `NODE_FILL_COLOR`; `NODE_PAINT` is its
 * parent and only counts when the child is absent everywhere.
 * @category Styles
 */
export const CYTOSCAPE_LEXICON: Readonly<
    Record<StyleTarget, ReadonlyMap<string, readonly (readonly [vp: string, parse: CytoscapeValueParser])[]>>
> = Object.freeze({
    node: new Map<string, readonly (readonly [string, CytoscapeValueParser])[]>([
        [
            "fill",
            [
                ["NODE_FILL_COLOR", color],
                ["NODE_BACKGROUND_COLOR", color],
                ["NODE_PAINT", color],
            ],
        ],
        [
            "fillOpacity",
            [
                ["NODE_TRANSPARENCY", opacity255],
                ["NODE_BACKGROUND_OPACITY", opacity01],
            ],
        ],
        [
            "borderColor",
            [
                ["NODE_BORDER_PAINT", color],
                ["NODE_BORDER_COLOR", color],
            ],
        ],
        [
            "borderOpacity",
            [
                ["NODE_BORDER_TRANSPARENCY", opacity255],
                ["NODE_BORDER_OPACITY", opacity01],
            ],
        ],
        ["borderWidth", [["NODE_BORDER_WIDTH", length]]],
        [
            "borderStyle",
            [
                ["NODE_BORDER_STROKE", lineOf("borderStyle")],
                ["NODE_BORDER_LINE_TYPE", lineOf("borderStyle")],
                ["NODE_BORDER_STYLE", lineOf("borderStyle")],
            ],
        ],
        ["shape", [["NODE_SHAPE", shape]]],
        ["width", [["NODE_WIDTH", length]]],
        ["height", [["NODE_HEIGHT", length]]],
        ["label", [["NODE_LABEL", text]]],
        ["labelColor", [["NODE_LABEL_COLOR", color]]],
        ["labelSize", [["NODE_LABEL_FONT_SIZE", fontSize]]],
        [
            "labelWrapWidth",
            [
                ["NODE_LABEL_WIDTH", length],
                ["NODE_LABEL_MAX_WIDTH", length],
            ],
        ],
        ["labelFont", [["NODE_LABEL_FONT_FACE", fontFamily]]],
        ["labelWeight", [["NODE_LABEL_FONT_FACE", fontWeight]]],
        ["labelItalic", [["NODE_LABEL_FONT_FACE", fontItalic]]],
        ["labelPosition", [["NODE_LABEL_POSITION", labelPosition]]],
        ["labelRotation", [["NODE_LABEL_ROTATION", rotation]]],
        [
            "labelOpacity",
            [
                ["NODE_LABEL_TRANSPARENCY", opacity255],
                ["NODE_LABEL_OPACITY", opacity01],
            ],
        ],
        ["tooltip", [["NODE_TOOLTIP", text]]],
        [
            "visible",
            [
                ["NODE_VISIBLE", bool],
                ["NODE_VISIBILITY", visibility],
            ],
        ],
    ]),
    edge: new Map<string, readonly (readonly [string, CytoscapeValueParser])[]>([
        [
            "color",
            [
                ["EDGE_STROKE_UNSELECTED_PAINT", color],
                ["EDGE_LINE_COLOR", color],
                ["EDGE_UNSELECTED_PAINT", color],
                ["EDGE_PAINT", color],
            ],
        ],
        [
            "opacity",
            [
                ["EDGE_TRANSPARENCY", opacity255],
                ["EDGE_OPACITY", opacity01],
            ],
        ],
        ["width", [["EDGE_WIDTH", length]]],
        [
            "lineStyle",
            [
                ["EDGE_LINE_TYPE", lineOf("lineStyle")],
                ["EDGE_LINE_STYLE", lineOf("lineStyle")],
            ],
        ],
        ["sourceArrow", [["EDGE_SOURCE_ARROW_SHAPE", arrow]]],
        ["targetArrow", [["EDGE_TARGET_ARROW_SHAPE", arrow]]],
        // One neutral size for both ends: the target's, else the source's.
        [
            "arrowSize",
            [
                ["EDGE_TARGET_ARROW_SIZE", arrowSizeParser],
                ["EDGE_SOURCE_ARROW_SIZE", arrowSizeParser],
            ],
        ],
        [
            "sourceArrowColor",
            [
                ["EDGE_SOURCE_ARROW_UNSELECTED_PAINT", color],
                ["EDGE_SOURCE_ARROW_COLOR", color],
            ],
        ],
        [
            "targetArrowColor",
            [
                ["EDGE_TARGET_ARROW_UNSELECTED_PAINT", color],
                ["EDGE_TARGET_ARROW_COLOR", color],
            ],
        ],
        ["curved", [["EDGE_CURVED", bool]]],
        ["label", [["EDGE_LABEL", text]]],
        ["labelColor", [["EDGE_LABEL_COLOR", color]]],
        ["labelSize", [["EDGE_LABEL_FONT_SIZE", fontSize]]],
        ["labelFont", [["EDGE_LABEL_FONT_FACE", fontFamily]]],
        ["labelWeight", [["EDGE_LABEL_FONT_FACE", fontWeight]]],
        ["labelItalic", [["EDGE_LABEL_FONT_FACE", fontItalic]]],
        [
            "labelWrapWidth",
            [
                ["EDGE_LABEL_WIDTH", length],
                ["EDGE_LABEL_MAX_WIDTH", length],
            ],
        ],
        ["labelRotation", [["EDGE_LABEL_ROTATION", rotation]]],
        [
            "labelOpacity",
            [
                ["EDGE_LABEL_TRANSPARENCY", opacity255],
                ["EDGE_LABEL_OPACITY", opacity01],
            ],
        ],
        ["tooltip", [["EDGE_TOOLTIP", text]]],
        [
            "visible",
            [
                ["EDGE_VISIBLE", bool],
                ["EDGE_VISIBILITY", visibility],
            ],
        ],
    ]),
});

/** A node's size when `nodeSizeLocked` makes `NODE_SIZE` drive width and height. */
export const NODE_SIZE_VP = "NODE_SIZE";

/** The parser of node sizes, for `NODE_SIZE`. */
export const sizeParser: CytoscapeValueParser = length;

/** The parser of colors, for the network background and `arrowColorMatchesEdge`. */
export const colorParser: CytoscapeValueParser = color;

/**
 * The parser of 0..255 transparencies (desktop) and 0..1 opacities (CX2), by visual property.
 * @param vp - the visual property (`*_TRANSPARENCY` or `*_OPACITY`)
 * @returns its parser
 */
export const opacityParser = (vp: string): CytoscapeValueParser => (vp.endsWith("_OPACITY") ? opacity01 : opacity255);

/** Every visual property the lexicon reads. */
const KNOWN_VPS: ReadonlySet<string> = new Set([
    NODE_SIZE_VP,
    ...Object.values(CYTOSCAPE_LEXICON).flatMap((byProp) =>
        Array.from(byProp.values()).flatMap((list) => list.map(([vp]) => vp)),
    ),
]);

/** Geometry, selection state and paint that is not a style: dropped without a note. */
const IGNORED_VP =
    /^(?:NODE|EDGE|NETWORK)_[XYZ]_LOCATION$|_SELECTED|SELECTION|^NETWORK_(?!BACKGROUND)|_DEPTH$|^COMPOUND_|EDGE_BEND|EDGE_CONTROL_POINTS|NODE_NESTED_NETWORK|_Z_ORDER$|EDGE_STACKING|_LABEL_WIDTH$|_HEIGHT$|_WIDTH$/;

/**
 * Whether a visual property is one no neutral property carries and that is worth a note.
 * @param vp - the visual property
 * @returns true when it is neither read nor ignored
 */
export function isUncarriedVp(vp: string): boolean {
    return !KNOWN_VPS.has(vp) && !IGNORED_VP.test(vp);
}

/** Cytoscape's old identifiers (2.x XGMML graphics attributes and session properties), lowercase. */
const IDENTIFIERS: Readonly<Record<StyleTarget, ReadonlyMap<string, string>>> = {
    node: new Map([
        ["fill", "NODE_FILL_COLOR"],
        ["w", "NODE_WIDTH"],
        ["h", "NODE_HEIGHT"],
        ["size", "NODE_SIZE"],
        ["type", "NODE_SHAPE"],
        ["outline", "NODE_BORDER_PAINT"],
        ["width", "NODE_BORDER_WIDTH"],
        ["borderlinetype", "NODE_BORDER_LINE_TYPE"],
        ["nodelabelfont", "NODE_LABEL_FONT_FACE"],
        ["nodetransparency", "NODE_TRANSPARENCY_01"],
        ["nodelabelposition", "NODE_LABEL_POSITION"],
        ["nodefillcolor", "NODE_FILL_COLOR"],
        ["nodesize", "NODE_SIZE"],
        ["nodewidth", "NODE_WIDTH"],
        ["nodehight", "NODE_HEIGHT"],
        ["nodeheight", "NODE_HEIGHT"],
        ["nodeopacity", "NODE_TRANSPARENCY"],
        ["nodebordercolor", "NODE_BORDER_PAINT"],
        ["nodelinewidth", "NODE_BORDER_WIDTH"],
        ["nodelinestyle", "NODE_BORDER_LINE_TYPE"],
        ["nodeshape", "NODE_SHAPE"],
        ["nodefont", "NODE_LABEL_FONT_FACE"],
        ["nodefontsize", "NODE_LABEL_FONT_SIZE"],
        ["nodelabel", "NODE_LABEL"],
        ["nodelabelcolor", "NODE_LABEL_COLOR"],
        ["nodetooltip", "NODE_TOOLTIP"],
    ]),
    edge: new Map([
        ["width", "EDGE_WIDTH"],
        ["fill", "EDGE_STROKE_UNSELECTED_PAINT"],
        ["edgelinetype", "EDGE_LINE_TYPE"],
        ["edgelabelfont", "EDGE_LABEL_FONT_FACE"],
        ["sourcearrowcolor", "EDGE_SOURCE_ARROW_UNSELECTED_PAINT"],
        ["targetarrowcolor", "EDGE_TARGET_ARROW_UNSELECTED_PAINT"],
        ["edgesourcearrowcolor", "EDGE_SOURCE_ARROW_UNSELECTED_PAINT"],
        ["edgetargetarrowcolor", "EDGE_TARGET_ARROW_UNSELECTED_PAINT"],
        ["edgelinewidth", "EDGE_WIDTH"],
        ["edgecolor", "EDGE_STROKE_UNSELECTED_PAINT"],
        ["edgelinestyle", "EDGE_LINE_TYPE"],
        ["edgeopacity", "EDGE_TRANSPARENCY"],
        ["sourcearrow", "EDGE_SOURCE_ARROW_SHAPE"],
        ["targetarrow", "EDGE_TARGET_ARROW_SHAPE"],
        ["edgesourcearrowshape", "EDGE_SOURCE_ARROW_SHAPE"],
        ["edgetargetarrowshape", "EDGE_TARGET_ARROW_SHAPE"],
        ["edgelabel", "EDGE_LABEL"],
        ["edgefont", "EDGE_LABEL_FONT_FACE"],
        ["edgelabelcolor", "EDGE_LABEL_COLOR"],
        ["edgefontsize", "EDGE_LABEL_FONT_SIZE"],
        ["edgetooltip", "EDGE_TOOLTIP"],
        ["curved", "EDGE_CURVED_LEGACY"],
        ["edgecurved", "EDGE_CURVED"],
        ["edgebend", "EDGE_BEND"],
    ]),
};

/** Objects nested deeper than this inside one element's graphics are not read. */
const MAX_VP_DEPTH = 8;
const VP_NAME = /^[A-Z][A-Z_0-9]+$/;

/**
 * One graphics key as a visual property: its name (`?<key>` for one with none) and its value, a legacy encoding
 * converted.
 * @param target - nodes or edges
 * @param k - the key
 * @param v - its value
 * @returns the name and the value
 */
function visualProperty(target: StyleTarget, k: string, v: unknown): [string, unknown] {
    const name = VP_NAME.test(k) ? k : IDENTIFIERS[target].get(k.toLowerCase().replace(/^cy:/, ""));
    if (name === undefined) {
        return [`?${k}`, v];
    }
    if (name === "NODE_TRANSPARENCY_01") {
        let f = Number.NaN;
        if (typeof v === "number") {
            f = v;
        } else if (typeof v === "string") {
            f = Number(v.trim());
        }
        return ["NODE_TRANSPARENCY", Number.isFinite(f) ? Math.round(f * 255) : null];
    }
    if (name === "EDGE_CURVED_LEGACY") {
        return ["EDGE_CURVED", typeof v === "string" && v.toUpperCase() === "CURVED_LINES"];
    }
    return [name, v];
}

/**
 * Normalizes the keys of one object of an element's graphics; a nested object is pushed onto the stack.
 * @param target - nodes or edges
 * @param top - the object and its depth
 * @param stack - the objects still to walk
 * @param out - visual property name to raw value, added to
 * @returns how many nested objects were too deep to walk
 */
function normalizeObject(
    target: StyleTarget,
    top: [Record<string, unknown>, number],
    stack: [Record<string, unknown>, number][],
    out: Map<string, unknown>,
): number {
    const [obj, depth] = top;
    let deep = 0;
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (k === "lockedVisualProperties" || v === null || v === undefined) {
            continue;
        }
        // a 2.x edgeBend of one handle is a record: kept whole, as its handles
        if (typeof v === "object" && !Array.isArray(v) && !/^[A-Z_0-9]+$/.test(k) && k.toLowerCase() !== "edgebend") {
            if (depth + 1 > MAX_VP_DEPTH) {
                deep++;
            } else {
                stack.push([v as Record<string, unknown>, depth + 1]);
            }
            continue;
        }
        const [name, value] = visualProperty(target, k, v);
        // visual-property-named keys come first in 3.x graphics and win
        if (!out.has(name)) {
            out.set(name, value);
        }
    }
    return deep;
}

/**
 * One element's raw visual properties, normalized: Cytoscape's old identifiers renamed to visual property names and
 * the legacy encodings converted (`nodeTransparency` 0..1 to `NODE_TRANSPARENCY` 0..255, `curved` to
 * `EDGE_CURVED`). Nested objects (`cytoscapeNodeGraphicsAttributes` and the like) are walked with an explicit stack
 * and a depth limit, never by recursion on the file's nesting. A key with no visual property name is kept as
 * `?<key>`, so a caller can note it.
 * @param target - nodes or edges
 * @param raw - the element's graphics object
 * @param notes - where a too-deep nesting is noted
 * @returns visual property name to raw value
 * @category Styles
 */
export function normalizeVisualProperties(target: StyleTarget, raw: unknown, notes?: StyleNotes): Map<string, unknown> {
    if (raw === null || typeof raw !== "object") {
        return new Map();
    }
    const out = new Map<string, unknown>();
    const stack: [Record<string, unknown>, number][] = [[raw as Record<string, unknown>, 0]];
    let deep = 0;
    for (let top = stack.pop(); top !== undefined; top = stack.pop()) {
        deep += normalizeObject(target, top, stack, out);
    }
    if (deep > 0) {
        notes?.add(STYLE_ISSUE.NESTING, target, "graphics", { sample: `deeper than ${MAX_VP_DEPTH}`, count: deep });
    }
    return out;
}

/**
 * The step a continuous mapping's value is rounded to for the integer visual properties Cytoscape desktop rounds an
 * interpolated value of (cytoscape-api BasicVisualLexicon: the font sizes and the 0..255 transparencies; the latter
 * read as opacities, so 1/255).
 */
const INTEGER_VP_STEPS: ReadonlyMap<string, number> = new Map([
    ["NODE_LABEL_FONT_SIZE", 1],
    ["EDGE_LABEL_FONT_SIZE", 1],
    ["NODE_TRANSPARENCY", 1 / 255],
    ["EDGE_TRANSPARENCY", 1 / 255],
]);

/**
 * The step Cytoscape rounds an interpolated value of a visual property to.
 * @param vp - the visual property
 * @returns the step, or undefined for a property that holds fractions
 */
export function vpStep(vp: string): number | undefined {
    return INTEGER_VP_STEPS.get(vp);
}
