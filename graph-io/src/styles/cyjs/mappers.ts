/**
 * Cytoscape.js's property values: the properties graph-io carries, how Cytoscape.js 3.34 parses each value
 * (`style.parse`), the `data()` and `mapData()` mappers and how they evaluate per element, and the neutral value
 * each parsed value is drawn as.
 *
 * What Cytoscape.js does and this module repeats:
 * - a number property takes `px`, `em` or no unit; a value with any other suffix is read with `parseFloat`, so
 *   `width: 50%` draws 50 pixels wide. Unitless properties (opacities, `arrow-scale`) are read with `parseFloat`.
 * - a color is a name, `#rgb`, `#rrggbb`, `rgb()`, `rgba()`, `hsl()` or `hsla()` with Cytoscape.js's own limits; its
 *   alpha is never drawn (the opacity properties are).
 * - `mapData(field, a, b, x, y)` maps a numeric field linearly from [a, b] to [x, y], clamped at the ends; a reversed
 *   range runs backwards, a zero range gives x, equal x and y make it the constant x. A color is interpolated per
 *   channel and rounded.
 * - a mapper that fails for an element (no field, a value the property refuses, a non-number for `mapData`) resets the
 *   property to its Cytoscape.js default, whatever the rules beneath say.
 */

import { CSS_COLORS } from "../canon/color-tables.js";
import { canonEnum } from "../canon/enums.js";
import { num6 } from "../canon/number.js";
import type { CanonSite } from "../canon/site.js";
import { STYLE_ISSUE } from "../codes.js";
import type { StyleTarget, StyleValue } from "../types.js";

/** How Cytoscape.js types a property's value. */
export type CyjsValueType =
    "color" | "zeroOne" | "size" | "nodeSize" | "positive" | "text" | "fontFamily" | "fontWeight" | "enum";

/** One property graph-io carries: the neutral property it sets (or a part it combines) and how it is parsed. */
export interface CyjsPropertySpec {
    /**
     * The neutral property, or `_valign`, `_halign`, `_visibility`, `_display`, `_sourceArrowFill`, `_targetArrowFill`
     * for the parts combined afterward.
     */
    readonly property: string;
    /** The value type. */
    readonly type: CyjsValueType;
    /** The allowed values of an enumeration. */
    readonly enums?: readonly (string | number)[];
}

const NODE_SHAPES = [
    "rectangle",
    "roundrectangle",
    "round-rectangle",
    "cutrectangle",
    "cut-rectangle",
    "bottomroundrectangle",
    "bottom-round-rectangle",
    "barrel",
    "ellipse",
    "triangle",
    "round-triangle",
    "square",
    "pentagon",
    "round-pentagon",
    "hexagon",
    "round-hexagon",
    "concavehexagon",
    "concave-hexagon",
    "heptagon",
    "round-heptagon",
    "octagon",
    "round-octagon",
    "tag",
    "round-tag",
    "star",
    "diamond",
    "round-diamond",
    "vee",
    "rhomboid",
    "right-rhomboid",
    "polygon",
];
const ARROWS = [
    "tee",
    "triangle",
    "triangle-tee",
    "circle-triangle",
    "triangle-cross",
    "triangle-backcurve",
    "vee",
    "square",
    "circle",
    "diamond",
    "chevron",
    "none",
];
const FONT_WEIGHTS: readonly (string | number)[] = [
    "normal",
    "bold",
    "bolder",
    "lighter",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "800",
    "900",
    100,
    200,
    300,
    400,
    500,
    600,
    700,
    800,
    900,
];
const CURVES = [
    "bezier",
    "unbundled-bezier",
    "haystack",
    "segments",
    "straight",
    "straight-triangle",
    "taxi",
    "round-segments",
    "round-taxi",
];
const STRAIGHT: ReadonlySet<string> = new Set(["haystack", "straight", "straight-triangle"]);

const LABEL: [string, CyjsPropertySpec][] = [
    ["label", { property: "label", type: "text" }],
    ["color", { property: "labelColor", type: "color" }],
    ["font-size", { property: "labelSize", type: "size" }],
    ["font-family", { property: "labelFont", type: "fontFamily" }],
    ["font-weight", { property: "labelWeight", type: "fontWeight" }],
    ["font-style", { property: "labelItalic", type: "enum", enums: ["italic", "normal", "oblique"] }],
    ["visibility", { property: "_visibility", type: "enum", enums: ["hidden", "visible"] }],
    ["display", { property: "_display", type: "enum", enums: ["element", "none"] }],
    ["opacity", { property: "opacity", type: "zeroOne" }],
];

/** The node properties graph-io carries, by Cytoscape.js name. */
export const CYJS_NODE_PROPERTIES: ReadonlyMap<string, CyjsPropertySpec> = new Map<string, CyjsPropertySpec>([
    ["background-color", { property: "fill", type: "color" }],
    ["background-opacity", { property: "fillOpacity", type: "zeroOne" }],
    ["border-color", { property: "borderColor", type: "color" }],
    ["border-width", { property: "borderWidth", type: "size" }],
    ["border-style", { property: "borderStyle", type: "enum", enums: ["solid", "dotted", "dashed", "double"] }],
    ["shape", { property: "shape", type: "enum", enums: NODE_SHAPES }],
    ["width", { property: "width", type: "nodeSize" }],
    ["height", { property: "height", type: "nodeSize" }],
    [
        "text-valign",
        { property: "_valign", type: "enum", enums: ["top", "top-inside", "center", "bottom", "bottom-inside"] },
    ],
    [
        "text-halign",
        { property: "_halign", type: "enum", enums: ["left", "left-inside", "center", "right", "right-inside"] },
    ],
    ...LABEL,
]);

/** The edge properties graph-io carries, by Cytoscape.js name. */
export const CYJS_EDGE_PROPERTIES: ReadonlyMap<string, CyjsPropertySpec> = new Map<string, CyjsPropertySpec>([
    ["line-color", { property: "color", type: "color" }],
    ["width", { property: "width", type: "nodeSize" }],
    ["line-style", { property: "lineStyle", type: "enum", enums: ["solid", "dotted", "dashed"] }],
    ["target-arrow-shape", { property: "targetArrow", type: "enum", enums: ARROWS }],
    ["source-arrow-shape", { property: "sourceArrow", type: "enum", enums: ARROWS }],
    ["target-arrow-color", { property: "targetArrowColor", type: "color" }],
    ["source-arrow-color", { property: "sourceArrowColor", type: "color" }],
    ["target-arrow-fill", { property: "_targetArrowFill", type: "enum", enums: ["filled", "hollow"] }],
    ["source-arrow-fill", { property: "_sourceArrowFill", type: "enum", enums: ["filled", "hollow"] }],
    ["curve-style", { property: "curved", type: "enum", enums: CURVES }],
    ["arrow-scale", { property: "arrowSize", type: "positive" }],
    ["source-label", { property: "sourceLabel", type: "text" }],
    ["target-label", { property: "targetLabel", type: "text" }],
    ...LABEL,
]);

/**
 * The carried properties of a target.
 * @param target - nodes or edges
 * @returns Cytoscape.js name to its spec
 */
export function cyjsProperties(target: StyleTarget): ReadonlyMap<string, CyjsPropertySpec> {
    return target === "node" ? CYJS_NODE_PROPERTIES : CYJS_EDGE_PROPERTIES;
}

/**
 * A property name in Cytoscape.js's dash form, aliases resolved (`backgroundColor` and `content` are read as
 * `background-color` and `label`).
 * @param name - the name as written
 * @returns the dash-form name
 */
export function cyjsPropertyName(name: string): string {
    const dashed = name.replaceAll(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    return dashed === "content" ? "label" : dashed;
}

/** A parsed value, ready to draw. */
export type CyjsFlat =
    | {
          /** A color. */
          readonly kind: "color";
          /** Red, green, blue (0..255, possibly NaN for a malformed hex digit Cytoscape.js accepts). */
          readonly rgb: readonly [number, number, number];
          /** `rgb(r,g,b)`, as Cytoscape.js writes it. */
          readonly str: string;
      }
    | {
          /** A number. */
          readonly kind: "number";
          /** The number in its unit. */
          readonly value: number;
          /** `px`, `em`, or null for a value read with `parseFloat` past an unknown suffix. */
          readonly units: "px" | "em" | null;
          /** As Cytoscape.js writes it. */
          readonly str: string;
      }
    | {
          /** An enumeration value or a text. */
          readonly kind: "word";
          /** The value. */
          readonly value: string | number;
          /** As Cytoscape.js writes it. */
          readonly str: string;
      };

/** A parsed property value: a flat value or a mapper. */
export type CyjsParsed =
    | CyjsFlat
    | {
          /** `data(field)`. */
          readonly kind: "data";
          /** The field, a dotted path. */
          readonly field: string;
      }
    | {
          /** `mapData(field, fieldMin, fieldMax, valueMin, valueMax)`. */
          readonly kind: "mapData";
          /** The field, a dotted path. */
          readonly field: string;
          /** The start of the input range. */
          readonly fieldMin: number;
          /** The end of the input range. */
          readonly fieldMax: number;
          /** The value at the start. */
          readonly min: CyjsFlat;
          /** The value at the end. */
          readonly max: CyjsFlat;
      }
    | {
          /** A function, from a live core's stylesheet. */
          readonly kind: "fn";
      };

/** Where a value is parsed: a stylesheet rule, an element's own `style` (a bypass), or a mapper's per-element value. */
type CyjsParseMode = "rule" | "bypass" | "flat";

/** Thrown by Cytoscape.js itself: a color given as a number makes its parser call `toLowerCase` on a number. */
export const CYJS_THROWS = "throws";

const NUM = String.raw`[-+]?(?:(?:\d+|\d*\.\d+)(?:[Ee][+-]?\d+)?)`;
const NUMBER_UNITS = new RegExp(`^(${NUM})(px|em)?$`);
const NUMBER_ONLY = new RegExp(String.raw`^\s*${NUM}\s*$`);
const RGBA = new RegExp(
    String.raw`^rgb[a]?\((${NUM}[%]?)\s*,\s*(${NUM}[%]?)\s*,\s*(${NUM}[%]?)(?:\s*,\s*(${NUM}))?\)$`,
);
const HSLA = new RegExp(String.raw`^hsl[a]?\((${NUM})\s*,\s*(${NUM}[%])\s*,\s*(${NUM}[%])(?:\s*,\s*(${NUM}))?\)$`);
const MAP_ARG = new RegExp(
    String.raw`^(?:${NUM}|\w+|rgb[a]?\((?:${NUM}[%]?)\s*,\s*(?:${NUM}[%]?)\s*,\s*(?:${NUM}[%]?)(?:\s*,\s*(?:${NUM}))?\)` +
        String.raw`|hsl[a]?\((?:${NUM})\s*,\s*(?:${NUM}[%])\s*,\s*(?:${NUM}[%])(?:\s*,\s*(?:${NUM}))?\)` +
        String.raw`|\#[0-9a-fA-F]{3}|\#[0-9a-fA-F]{6})$`,
);
const FIELD = /^[\w.]+$/;
const WORD_FONT = /^[\w\- "]$/;

/**
 * Cytoscape.js's color names: the CSS names without `rebeccapurple`, plus `transparent` (black with no alpha).
 * @param name - the lowercased name
 * @returns `#rrggbb`, or undefined
 */
function namedColor(name: string): string | undefined {
    if (name === "transparent") {
        return "#000000";
    }
    return name === "rebeccapurple" ? undefined : CSS_COLORS.get(name);
}

/**
 * A color as Cytoscape.js reads it (`color2tuple`).
 * @param value - the trimmed text
 * @returns red, green and blue, or null when Cytoscape.js refuses it
 */
function colorTuple(value: string): [number, number, number] | null {
    const named = namedColor(value.toLowerCase());
    if (named !== undefined) {
        return [
            Number.parseInt(named.slice(1, 3), 16),
            Number.parseInt(named.slice(3, 5), 16),
            Number.parseInt(named.slice(5, 7), 16),
        ];
    }
    if ((value.length === 4 || value.length === 7) && value.startsWith("#")) {
        const short = value.length === 4;
        const pair = (k: number): number =>
            Number.parseInt(short ? value[k] + value[k] : value.slice(2 * k - 1, 2 * k + 1), 16);
        return [pair(1), pair(2), pair(3)];
    }
    const m = RGBA.exec(value);
    return m === null ? hslTuple(value) : rgbaTuple(m);
}

/**
 * `rgb()` and `rgba()` as Cytoscape.js reads them: channels all numbers or all percentages, within 0..255, and an
 * alpha within 0..1.
 * @param m - the match of the pattern
 * @returns red, green and blue, or null
 */
function rgbaTuple(m: RegExpExecArray): [number, number, number] | null {
    const pct = [1, 2, 3].map((k) => m[k].endsWith("%"));
    if (pct.some(Boolean) && !pct.every(Boolean)) {
        return null;
    }
    const channels = [1, 2, 3].map((k) => {
        const c = Number.parseFloat(m[k]);
        return pct[k - 1] ? (c / 100) * 255 : c;
    });
    if (channels.some((c) => c < 0 || c > 255)) {
        return null;
    }
    const alpha = m.at(4);
    if (alpha !== undefined && (Number.parseFloat(alpha) < 0 || Number.parseFloat(alpha) > 1)) {
        return null;
    }
    return [Math.floor(channels[0]), Math.floor(channels[1]), Math.floor(channels[2])];
}

/**
 * `hsl()` and `hsla()` as Cytoscape.js reads them.
 * @param value - the trimmed text
 * @returns red, green and blue, or null
 */
function hslTuple(value: string): [number, number, number] | null {
    const m = HSLA.exec(value);
    if (m === null) {
        return null;
    }
    let h = Number.parseInt(m[1], 10);
    if (h < 0) {
        h = (360 - ((-1 * h) % 360)) % 360;
    } else if (h > 360) {
        h = h % 360;
    }
    h /= 360;
    const s = Number.parseFloat(m[2]);
    const l = Number.parseFloat(m[3]);
    if (s < 0 || s > 100 || l < 0 || l > 100) {
        return null;
    }
    const alpha = m.at(4);
    if (alpha !== undefined && (Number.parseFloat(alpha) < 0 || Number.parseFloat(alpha) > 1)) {
        return null;
    }
    const sn = s / 100;
    const ln = l / 100;
    if (sn === 0) {
        const g = Math.round(ln * 255);
        return [g, g, g];
    }
    const hue = (p: number, q: number, t0: number): number => {
        let t = t0;
        if (t < 0) {
            t += 1;
        }
        if (t > 1) {
            t -= 1;
        }
        if (t < 1 / 6) {
            return p + (q - p) * 6 * t;
        }
        if (t < 1 / 2) {
            return q;
        }
        if (t < 2 / 3) {
            return p + (q - p) * (2 / 3 - t) * 6;
        }
        return p;
    };
    const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
    const p = 2 * ln - q;
    return [
        Math.round(255 * hue(p, q, h + 1 / 3)),
        Math.round(255 * hue(p, q, h)),
        Math.round(255 * hue(p, q, h - 1 / 3)),
    ];
}

/**
 * Whether a value matches Cytoscape.js's font family pattern `^([\w- "]+(?:\s*,\s*[\w- "]+)*)$`, checked part by
 * part in one pass instead of with the backtracking pattern: items of word characters, `-`, space and `"`, joined
 * by commas with any whitespace around them.
 * @param value - the text
 * @returns true when Cytoscape.js accepts it
 */
export function isFontFamily(value: string): boolean {
    const parts = value.split(",");
    if (parts.length === 1) {
        return parts[0].length > 0 && allOf(parts[0], isFontChar);
    }
    return (
        firstFontPart(parts[0]) &&
        lastFontPart(parts.at(-1) ?? "") &&
        parts.slice(1, -1).every((part) => middleFontPart(part))
    );
}

/**
 * Whether a character may be part of a font family item: a word character, `-`, space or `"`.
 * @param c - the character
 * @returns true when it may
 */
function isFontChar(c: string): boolean {
    return WORD_FONT.test(c);
}

/**
 * Whether a character is whitespace.
 * @param c - the character
 * @returns true for whitespace
 */
function isSpace(c: string): boolean {
    return /\s/.test(c);
}

/**
 * Whether every character of a text passes a test.
 * @param text - the text
 * @param test - the test
 * @returns true when all do (and for an empty text)
 */
function allOf(text: string, test: (c: string) => boolean): boolean {
    return Array.from(text).every(test);
}

/**
 * The part before the first comma: an item, then whitespace before the comma.
 * @param part - the part
 * @returns true when it is one
 */
function firstFontPart(part: string): boolean {
    let a = 0;
    while (a < part.length && isFontChar(part[a])) {
        a++;
    }
    return a > 0 && allOf(part.slice(a), isSpace);
}

/**
 * The part after the last comma: whitespace after the comma, then an item to the end.
 * @param part - the part
 * @returns true when it is one
 */
function lastFontPart(part: string): boolean {
    let b = part.length;
    while (b > 0 && isFontChar(part[b - 1])) {
        b--;
    }
    return b < part.length && allOf(part.slice(0, b), isSpace);
}

/**
 * A part between two commas: whitespace, an item, whitespace; a part of whitespace only holds an item when one of its
 * characters is a space.
 * @param part - the part
 * @returns true when it is one
 */
function middleFontPart(part: string): boolean {
    let a = 0;
    let b = part.length;
    while (a < b && isSpace(part[a])) {
        a++;
    }
    while (b > a && isSpace(part[b - 1])) {
        b--;
    }
    return a === b ? part.includes(" ") : allOf(part.slice(a, b), isFontChar);
}

/** A flat value parsed: the value, null when Cytoscape.js refuses it, or `CYJS_THROWS` where Cytoscape.js throws. */
type FlatParse = CyjsFlat | null | typeof CYJS_THROWS;

/**
 * Parses a flat value (no mappers) the way Cytoscape.js does.
 * @param spec - the property
 * @param raw - the value
 * @param rendered - the value is one Cytoscape.js reported (`ele.style(name)`), where every enumeration is text
 * @returns the parsed value, null when Cytoscape.js refuses it, or `CYJS_THROWS` where Cytoscape.js itself throws
 */
function parseFlat(spec: CyjsPropertySpec, raw: unknown, rendered = false): FlatParse {
    const value: unknown = typeof raw === "string" ? raw.trim() : raw;
    switch (spec.type) {
        case "color":
            return parseColorValue(value);
        case "zeroOne":
        case "positive": {
            const x = Number.parseFloat(String(value));
            const ok = spec.type === "zeroOne" ? x >= 0 && x <= 1 : x > 0;
            return ok ? { kind: "number", value: x, units: null, str: String(x) } : null;
        }
        case "size":
        case "nodeSize":
            return parseSizeValue(spec, value, raw);
        case "text":
            return { kind: "word", value: String(value), str: String(value) };
        case "fontFamily": {
            const text = String(value);
            return isFontFamily(text) ? { kind: "word", value: text, str: text } : null;
        }
        case "fontWeight":
        case "enum": {
            const enums = spec.type === "fontWeight" ? FONT_WEIGHTS : (spec.enums ?? []);
            const e = enums.find((x) => x === value || (rendered && String(x) === value));
            return e === undefined ? null : { kind: "word", value: e, str: String(e) };
        }
        default:
            return null;
    }
}

/**
 * A color as Cytoscape.js reads it: an `[r, g, b]` array as it is, else text.
 * @param value - the value, trimmed
 * @returns the color, null when refused, or `CYJS_THROWS` for a value that is neither
 */
function parseColorValue(value: unknown): FlatParse {
    if (Array.isArray(value)) {
        const [r, g, b] = value as unknown[];
        const t: [number, number, number] = [Number(r), Number(g), Number(b)];
        return { kind: "color", rgb: t, str: `rgb(${t[0]},${t[1]},${t[2]})` };
    }
    if (typeof value !== "string") {
        return CYJS_THROWS;
    }
    const t = colorTuple(value);
    return t === null ? null : { kind: "color", rgb: t, str: `rgb(${t[0]},${t[1]},${t[2]})` };
}

/**
 * A size as Cytoscape.js reads it: a non-negative number in `px` or `em`, a number read past an unknown suffix, and
 * a node size of `label`.
 * @param spec - the property
 * @param value - the value, trimmed
 * @param raw - the value as given
 * @returns the size, or null when refused
 */
function parseSizeValue(spec: CyjsPropertySpec, value: unknown, raw: unknown): CyjsFlat | null {
    let units: "px" | "em" | null = "px";
    let text: unknown = value;
    if (typeof value === "string") {
        const m = NUMBER_UNITS.exec(value);
        if (m === null) {
            units = null;
        } else {
            text = m[1];
            units = m.at(2) === "em" ? "em" : "px";
        }
    }
    const x = Number.parseFloat(String(text));
    if (Number.isNaN(x)) {
        return spec.type === "nodeSize" && raw === "label" ? { kind: "word", value: "label", str: "label" } : null;
    }
    return x < 0 ? null : { kind: "number", value: x, units, str: `${String(x)}${units ?? ""}` };
}

/**
 * Splits the arguments of `mapData(...)` at the commas outside parentheses.
 * @param inner - the text between the outer parentheses
 * @returns the arguments
 */
function splitArgs(inner: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < inner.length; i++) {
        const c = inner[i];
        if (c === "(") {
            depth++;
        } else if (c === ")") {
            depth--;
        } else if (c === "," && depth === 0) {
            out.push(inner.slice(start, i));
            start = i + 1;
        }
    }
    out.push(inner.slice(start));
    return out;
}

/**
 * The text between the parentheses of `name(...)`, found by position: the name, optional whitespace, `(`, and a
 * last character `)`.
 * @param value - the trimmed value
 * @param name - `data` or `mapData`
 * @returns the inner text, or null
 */
function callArgs(value: string, name: string): string | null {
    if (!value.startsWith(name) || !value.endsWith(")")) {
        return null;
    }
    let i = name.length;
    while (i < value.length && /\s/.test(value[i])) {
        i++;
    }
    return value[i] === "(" ? value.slice(i + 1, -1) : null;
}

/**
 * Parses a property value the way Cytoscape.js does: a mapper in a rule, else a flat value.
 * @param spec - the property
 * @param raw - the value as given
 * @param mode - a stylesheet rule, an element bypass, or a mapper's per-element value
 * @returns the parsed value, null when Cytoscape.js refuses it, or `CYJS_THROWS`
 */
export function parseCyjsValue(
    spec: CyjsPropertySpec,
    raw: unknown,
    mode: CyjsParseMode,
): CyjsParsed | null | typeof CYJS_THROWS {
    if (raw === undefined) {
        return null;
    }
    if (typeof raw === "function") {
        return mode === "flat" ? null : { kind: "fn" };
    }
    const value = typeof raw === "string" ? raw.trim() : raw;
    if (mode !== "flat" && typeof value === "string" && value.length >= 7 && value[1] === "a") {
        const mapper = parseMapper(spec, value, mode);
        if (mapper !== undefined) {
            return mapper;
        }
    }
    return parseFlat(spec, raw);
}

/**
 * A `data()` or `mapData()` value.
 * @param spec - the property
 * @param value - the trimmed value
 * @param mode - a rule or a bypass
 * @returns the mapper, null when it is refused (or its constant), or undefined when the value is not a mapper
 */
function parseMapper(spec: CyjsPropertySpec, value: string, mode: CyjsParseMode): CyjsParsed | null | undefined {
    if (value.startsWith("d")) {
        const field = callArgs(value, "data")?.trim();
        if (field === undefined || !FIELD.test(field)) {
            return undefined;
        }
        return mode === "bypass" ? null : { kind: "data", field };
    }
    if (!value.startsWith("m") || value.length < 10) {
        return undefined;
    }
    return parseMapData(spec, value, mode);
}

/**
 * A `mapData()` value.
 * @param spec - the property
 * @param value - the trimmed value, starting with `m`
 * @param mode - a rule or a bypass
 * @returns the mapper, null when it is refused (or its constant), or undefined when the value is not a mapper
 */
function parseMapData(spec: CyjsPropertySpec, value: string, mode: CyjsParseMode): CyjsParsed | null | undefined {
    const inner = callArgs(value, "mapData");
    if (inner === null) {
        return undefined;
    }
    const args = splitArgs(inner);
    if (!isMapDataArgs(args)) {
        return undefined;
    }
    if (mode === "bypass") {
        return null;
    }
    const numeric =
        spec.type === "zeroOne" || spec.type === "positive" || spec.type === "size" || spec.type === "nodeSize";
    if (spec.type !== "color" && !numeric) {
        return null;
    }
    const min = parseFlat(spec, args[3].trim());
    const max = parseFlat(spec, args[4].trim());
    if (min === null || max === null || min === CYJS_THROWS || max === CYJS_THROWS) {
        return null;
    }
    if (min.str === max.str || (min.kind === "number" && max.kind === "number" && pfValue(min) === pfValue(max))) {
        const constant = parseFlat(spec, min.str);
        return constant === CYJS_THROWS ? null : constant;
    }
    return {
        kind: "mapData",
        field: args[0].trim(),
        fieldMin: Number.parseFloat(args[1]),
        fieldMax: Number.parseFloat(args[2]),
        min,
        max,
    };
}

/**
 * Whether `mapData`'s arguments have Cytoscape.js's shape: a field, two numbers and two values.
 * @param args - the arguments
 * @returns true when they do
 */
function isMapDataArgs(args: readonly string[]): boolean {
    return (
        args.length === 5 &&
        /^[\w.]+\s*$/.test(args[0]) &&
        NUMBER_ONLY.test(args[1]) &&
        NUMBER_ONLY.test(args[2]) &&
        MAP_ARG.test(args[3].trim()) &&
        MAP_ARG.test(args[4].replace(/^\s+/, ""))
    );
}

/**
 * A number's value in pixels as Cytoscape.js normalizes it in a headless core (an `em` is 1 pixel there).
 * @param v - the number
 * @returns the normalized value
 */
function pfValue(v: CyjsFlat & { kind: "number" }): number {
    return v.value;
}

/**
 * A field of an element's data as a mapper reads it: the dotted path walked while each step is truthy.
 * @param data - the element's data object
 * @param field - the field
 * @returns the value
 */
function mapperField(data: unknown, field: string): unknown {
    let v: unknown = data;
    for (const step of field.split(".")) {
        if (!v) {
            break;
        }
        v = (v as Record<string, unknown>)[step];
    }
    return v;
}

/**
 * Evaluates a mapper for one element the way Cytoscape.js applies it.
 * @param spec - the property
 * @param m - the mapper
 * @param data - the element's data object
 * @returns the flat value, null when the mapper fails (the property resets to its default), or `CYJS_THROWS`
 */
export function applyCyjsMapper(
    spec: CyjsPropertySpec,
    m: CyjsParsed & { kind: "data" | "mapData" },
    data: unknown,
): FlatParse {
    const v = mapperField(data, m.field);
    if (v === null || v === undefined) {
        return null;
    }
    if (m.kind === "data") {
        return parseFlat(spec, v);
    }
    if (typeof v !== "number" || Number.isNaN(v)) {
        return null;
    }
    const width = m.fieldMax - m.fieldMin;
    const p = Math.min(1, Math.max(0, width === 0 ? 0 : (v - m.fieldMin) / width));
    const { min, max } = m;
    if (min.kind === "color" && max.kind === "color") {
        const c = [0, 1, 2].map((k) => Math.round(min.rgb[k] + (max.rgb[k] - min.rgb[k]) * p)) as [
            number,
            number,
            number,
        ];
        return { kind: "color", rgb: c, str: `rgb(${c[0]}, ${c[1]}, ${c[2]})` };
    }
    if (min.kind === "number" && max.kind === "number") {
        return parseFlat(spec, min.value + (max.value - min.value) * p);
    }
    return null;
}

/**
 * The neutral value a flat value is drawn as, for one property. A value Cytoscape.js draws from the page (an `em`
 * size, a node sized to its label) cannot be evaluated: it is noted and undefined is returned.
 * @param spec - the property
 * @param v - the flat value
 * @param site - where it was read
 * @returns the neutral value (for the combined parts, the Cytoscape.js word), or undefined
 */
export function cyjsNeutral(spec: CyjsPropertySpec, v: CyjsFlat, site: CanonSite): StyleValue | undefined {
    switch (v.kind) {
        case "color": {
            if (v.rgb.some((c) => !Number.isFinite(c) || c < 0 || c > 255)) {
                site.notes.add(STYLE_ISSUE.BAD_VALUE, site.target, site.property, {
                    sample: v.str,
                    element: site.element,
                });
                return undefined;
            }
            return `#${v.rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
        }
        case "number":
            if (v.units === "em") {
                site.notes.add(STYLE_ISSUE.BAD_VALUE, site.target, site.property, {
                    sample: v.str,
                    element: site.element,
                });
                return undefined;
            }
            return num6(v.value);
        default:
            break;
    }
    const word = v.value;
    switch (spec.property) {
        case "width":
        case "height":
            site.notes.add(STYLE_ISSUE.BAD_VALUE, site.target, site.property, { sample: v.str, element: site.element });
            return undefined;
        case "label":
        case "sourceLabel":
        case "targetLabel":
        case "labelFont":
            return String(word);
        case "labelItalic":
            return word === "italic" || word === "oblique";
        case "curved":
            return !STRAIGHT.has(String(word));
        case "shape":
            return canonEnum("shape", String(word), "cytoscape-js", site) ?? undefined;
        case "borderStyle":
            return canonEnum("borderStyle", String(word), "cytoscape-js", site) ?? undefined;
        case "lineStyle":
            return canonEnum("lineStyle", String(word), "cytoscape-js", site) ?? undefined;
        case "sourceArrow":
        case "targetArrow":
            return canonEnum("arrow", String(word), "cytoscape-js", site) ?? undefined;
        case "labelWeight":
            return canonEnum("weight", String(word), "cytoscape-js", site) ?? undefined;
        default:
            return word;
    }
}

/**
 * What a value a Cytoscape.js core reports for an element (`ele.style(name)`, always text) is drawn as.
 * @param target - nodes or edges
 * @param name - the Cytoscape.js property name
 * @param str - the reported value
 * @param site - where it was read
 * @returns the neutral value (for the combined parts, the Cytoscape.js word), null when the property is not carried
 * or the value does not parse, or undefined when it cannot be evaluated (noted)
 */
export function cyjsRendered(
    target: StyleTarget,
    name: string,
    str: unknown,
    site: CanonSite,
): StyleValue | null | undefined {
    const spec = cyjsProperties(target).get(cyjsPropertyName(name));
    if (spec === undefined || typeof str !== "string") {
        return null;
    }
    const v = parseFlat(spec, str, true);
    if (v === null || v === CYJS_THROWS) {
        return null;
    }
    return cyjsNeutral(spec, v, site);
}
