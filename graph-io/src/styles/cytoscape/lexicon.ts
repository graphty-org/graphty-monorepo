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
    ["arrow", "vee"],
    ["diamond", "diamond"],
    ["circle", "circle"],
    ["t", "tee"],
    ["half_top", "half"],
    ["half_bottom", "half"],
    ["square", "square"],
    ["delta_short_1", "triangle"],
    ["delta_short_2", "triangle"],
    ["arrow_short", "vee"],
    ["diamond_short_1", "diamond"],
    ["diamond_short_2", "diamond"],
    ["open_delta", "triangle-open"],
    ["open_circle", "circle-open"],
    ["open_diamond", "diamond-open"],
    ["open_square", "other:open-square"],
    ["cross_delta", "vee"],
    ["cross_open_delta", "triangle-open"],
    ["open_half_circle", "other:open-half-circle"],
    ["half_circle", "other:half-circle"],
    ["triangle", "triangle"],
    ["triangle-tee", "tee"],
    ["triangle-cross", "vee"],
    ["triangle-backcurve", "triangle"],
    ["tee", "tee"],
    ["vee", "vee"],
    ["open-circle", "circle-open"],
    ["open-triangle", "triangle-open"],
    ["open-diamond", "diamond-open"],
    ["open-square", "other:open-square"],
    ["open-delta", "triangle-open"],
    ["half-top", "half"],
    ["half-bottom", "half"],
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

const arrow: CytoscapeValueParser = (raw, site) => {
    const s = scalarText(raw, site);
    if (s === null) {
        return null;
    }
    let key = s.trim().toLowerCase();
    if (/^\d{1,2}$/.test(key)) {
        key = LEGACY_ARROW.at(Number(key)) ?? key;
    }
    return caseless(CY_ARROWS.get(key) ?? canonEnum("arrow", s, "cytoscape", site));
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
        // a line type a border does not have is kept as other:
        return `other:${key}`;
    };
}

/** The parts of a Cytoscape font face. */
interface FontFace {
    readonly family: string;
    readonly weight: "normal" | "bold";
    readonly italic: boolean;
}

/**
 * A font face: `SansSerif,plain,12`, `Dialog.bold,bold,12`, the legacy `SansSerif-0-12` (style bits 1 bold,
 * 2 italic) or CX2's `{ FONT_FAMILY, FONT_STYLE, FONT_WEIGHT }`, whose `FONT_NAME` (the font Cytoscape desktop
 * wrote it from, which its own import restores) wins over the CSS family when present.
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
        const st = parts[1].trim().toLowerCase();
        return {
            family: parts[0].trim().replace(/\.(?:bold|italic|plain|bolditalic)$/i, ""),
            weight: st.includes("bold") ? "bold" : "normal",
            italic: st.includes("italic"),
        };
    }
    return legacyFontFace(s) ?? { family: s.trim(), weight: "normal", italic: false };
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
        family = name.trim().replace(/\.(?:bold|italic|plain|bolditalic)$/i, "");
    }
    if (family === null) {
        return null;
    }
    const weight = Object.hasOwn(o, "FONT_WEIGHT") ? String(o.FONT_WEIGHT) : "";
    const style = Object.hasOwn(o, "FONT_STYLE") ? String(o.FONT_STYLE) : "";
    return {
        family: family.trim(),
        weight: /bold/i.test(weight.slice(0, 32)) ? "bold" : "normal",
        italic: /italic/i.test(style.slice(0, 32)),
    };
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
    return { family: family.replace(/\.bold$/i, ""), weight: bold ? "bold" : "normal", italic: (bits & 2) !== 0 };
}

/** Java's logical font names, which Cytoscape desktop writes, as the CSS generic families they stand for. */
/** The family a Java logical font name is read as (`Dialog` is drawn as a sans-serif font). */
export const JAVA_FONTS: ReadonlyMap<string, string> = new Map([
    ["sansserif", "sans-serif"],
    ["dialog", "sans-serif"],
    ["default", "sans-serif"],
    ["dialoginput", "monospace"],
    ["monospaced", "monospace"],
    ["serif", "serif"],
]);

const fontFamily: CytoscapeValueParser = (raw, site) => {
    const family = fontFace(raw, site)?.family ?? null;
    return family === null ? null : (JAVA_FONTS.get(family.toLowerCase()) ?? family);
};
const fontWeight: CytoscapeValueParser = (raw, site) => fontFace(raw, site)?.weight ?? null;
const fontItalic: CytoscapeValueParser = (raw, site) => fontFace(raw, site)?.italic ?? null;

/** The node anchor of a desktop label position `C,C,c,0.00,0.00`. */
const ANCHOR: ReadonlyMap<string, string> = new Map([
    ["C", "center"],
    ["N", "top"],
    ["S", "bottom"],
    ["E", "right"],
    ["W", "left"],
    ["NE", "top-right"],
    ["NW", "top-left"],
    ["SE", "bottom-right"],
    ["SW", "bottom-left"],
    ["NONE", "center"],
]);

/** CX2's `HORIZONTAL_ANCHOR,VERTICAL_ANCHOR`, lowercase. */
const CX2_ANCHOR: ReadonlyMap<string, string> = new Map([
    ["center,center", "center"],
    ["center,top", "top"],
    ["center,bottom", "bottom"],
    ["right,center", "right"],
    ["left,center", "left"],
    ["right,top", "top-right"],
    ["left,top", "top-left"],
    ["right,bottom", "bottom-right"],
    ["left,bottom", "bottom-left"],
]);

const labelPosition: CytoscapeValueParser = (raw, site) => {
    let key: string;
    let found: string | undefined;
    if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
        const o = raw as Record<string, unknown>;
        const h = scalarText(Object.hasOwn(o, "HORIZONTAL_ANCHOR") ? o.HORIZONTAL_ANCHOR : "center", site);
        const v = scalarText(Object.hasOwn(o, "VERTICAL_ANCHOR") ? o.VERTICAL_ANCHOR : "center", site);
        if (h === null || v === null) {
            return null;
        }
        key = `${h.trim().toLowerCase()},${v.trim().toLowerCase()}`;
        found = CX2_ANCHOR.get(key);
    } else {
        const s = scalarText(raw, site);
        if (s === null) {
            return null;
        }
        key = s;
        found = ANCHOR.get(s.split(",")[0].trim().toUpperCase());
    }
    if (found === undefined) {
        noteAt(site, STYLE_ISSUE.UNKNOWN_VALUE, key);
        return null;
    }
    return found;
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
        ["labelSize", [["NODE_LABEL_FONT_SIZE", length]]],
        ["labelFont", [["NODE_LABEL_FONT_FACE", fontFamily]]],
        ["labelWeight", [["NODE_LABEL_FONT_FACE", fontWeight]]],
        ["labelItalic", [["NODE_LABEL_FONT_FACE", fontItalic]]],
        ["labelPosition", [["NODE_LABEL_POSITION", labelPosition]]],
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
        ["labelSize", [["EDGE_LABEL_FONT_SIZE", length]]],
        ["labelFont", [["EDGE_LABEL_FONT_FACE", fontFamily]]],
        ["labelWeight", [["EDGE_LABEL_FONT_FACE", fontWeight]]],
        ["labelItalic", [["EDGE_LABEL_FONT_FACE", fontItalic]]],
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
        if (typeof v === "object" && !Array.isArray(v) && !/^[A-Z_0-9]+$/.test(k)) {
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
