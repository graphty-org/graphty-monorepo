/**
 * The neutral property vocabulary at run time: which properties exist for nodes, edges and the graph, what kind of
 * value each takes, and the names of every enumeration. Readers type-check their output against it before
 * planning; a value of the wrong kind is a note, never a style.
 */

import type { StyleTarget } from "./types.js";

/**
 * The kinds of style value: a canonical `#rrggbb` color, a number (lengths and factors at least 0), an opacity
 * (0..1), a text, a boolean, or a value of one of the enumerations in `STYLE_ENUMS`.
 * @category Styles
 */
export type StyleValueKind =
    | "color"
    | "number"
    | "opacity"
    | "text"
    | "boolean"
    | "shape"
    | "borderStyle"
    | "borderPosition"
    | "lineStyle"
    | "arrow"
    | "weight"
    | "position"
    | "labelFit";

/**
 * The value kind of every neutral property, per target.
 * @category Styles
 */
export const STYLE_PROPERTIES: {
    /** Node properties. */
    readonly node: ReadonlyMap<string, StyleValueKind>;
    /** Edge properties. */
    readonly edge: ReadonlyMap<string, StyleValueKind>;
    /** Graph properties. */
    readonly graph: ReadonlyMap<string, StyleValueKind>;
} = Object.freeze({
    node: new Map<string, StyleValueKind>([
        ["fill", "color"],
        ["fillGradient", "color"],
        ["borderColor", "color"],
        ["labelColor", "color"],
        ["fillOpacity", "opacity"],
        ["opacity", "opacity"],
        ["borderOpacity", "opacity"],
        ["width", "number"],
        ["height", "number"],
        ["borderWidth", "number"],
        ["cornerRadius", "number"],
        ["fillGradientAngle", "number"],
        ["labelSize", "number"],
        ["labelWrapWidth", "number"],
        ["labelWrapTrailingSpace", "boolean"],
        ["labelFit", "labelFit"],
        ["labelPaddingX", "number"],
        ["labelPaddingY", "number"],
        ["labelFitSquare", "boolean"],
        ["shape", "shape"],
        ["shapePoints", "text"],
        ["borderStyle", "borderStyle"],
        ["borderPosition", "borderPosition"],
        ["label", "text"],
        ["tooltip", "text"],
        ["labelFont", "text"],
        ["labelWeight", "weight"],
        ["labelItalic", "boolean"],
        ["labelPosition", "position"],
        ["labelMinScreenSize", "number"],
        ["labelAvoidOverlap", "boolean"],
        ["labelOnTop", "boolean"],
        ["labelRotation", "number"],
        ["image", "text"],
        ["visible", "boolean"],
    ]),
    edge: new Map<string, StyleValueKind>([
        ["color", "color"],
        ["sourceArrowColor", "color"],
        ["targetArrowColor", "color"],
        ["labelColor", "color"],
        ["opacity", "opacity"],
        ["width", "number"],
        ["labelSize", "number"],
        ["arrowSize", "number"],
        ["sourceArrowSize", "number"],
        ["sourceArrowLength", "number"],
        ["targetArrowLength", "number"],
        ["sourceArrowWidth", "number"],
        ["targetArrowWidth", "number"],
        ["arrowPosition", "number"],
        ["lineStyle", "lineStyle"],
        ["sourceArrow", "arrow"],
        ["targetArrow", "arrow"],
        ["curved", "boolean"],
        ["bends", "text"],
        ["fanSpacing", "number"],
        ["fanned", "boolean"],
        ["sourcePort", "text"],
        ["targetPort", "text"],
        ["label", "text"],
        ["tooltip", "text"],
        ["labelFont", "text"],
        ["labelWeight", "weight"],
        ["labelItalic", "boolean"],
        ["sourceLabel", "text"],
        ["targetLabel", "text"],
        ["labelMinScreenSize", "number"],
        ["labelOnTop", "boolean"],
        ["visible", "boolean"],
    ]),
    graph: new Map<string, StyleValueKind>([["background", "color"]]),
});

/**
 * The values of each enumeration kind. A value outside the list is valid only as `other:<raw>` (where the
 * enumeration is open: shapes, border and line styles, arrows).
 * @category Styles
 */
export const STYLE_ENUMS: ReadonlyMap<StyleValueKind, readonly string[]> = new Map<StyleValueKind, readonly string[]>([
    [
        "shape",
        [
            "ellipse",
            "rectangle",
            "round-rectangle",
            "triangle",
            "diamond",
            "pentagon",
            "hexagon",
            "octagon",
            "parallelogram",
            "trapezoid",
            "star",
            "vee",
            "polygon",
            "none",
        ],
    ],
    ["borderStyle", ["solid", "dashed", "dotted", "dash-dot", "double"]],
    ["borderPosition", ["inside", "center", "outside"]],
    ["lineStyle", ["solid", "dashed", "dotted", "dash-dot", "long-dash", "double", "zigzag", "sinewave"]],
    [
        "arrow",
        [
            "none",
            "triangle",
            "triangle-open",
            "vee",
            "tee",
            "diamond",
            "diamond-open",
            "circle",
            "circle-open",
            "square",
            "crow",
            "half",
            "inverted",
        ],
    ],
    ["weight", ["normal", "bold"]],
    ["labelFit", ["inside", "bounds"]],
    [
        "position",
        [
            "center",
            "top",
            "bottom",
            "left",
            "right",
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "inside-top",
            "inside-bottom",
            "inside-left",
            "inside-right",
            "inside-top-left",
            "inside-top-right",
            "inside-bottom-left",
            "inside-bottom-right",
        ],
    ],
]);

/** The enumerations that keep unknown spellings as `other:<raw>`. */
const OPEN_ENUMS: ReadonlySet<StyleValueKind> = new Set<StyleValueKind>(["shape", "borderStyle", "lineStyle", "arrow"]);

/**
 * Whether a value is a canonical value of a property. A `graphty:<channel>` property takes any string, number or
 * boolean; an unknown property takes nothing.
 * @param target - nodes, edges or the graph
 * @param property - the property name
 * @param value - the value to check
 * @returns true when the value has the property's kind and canonical spelling
 * @category Styles
 */
export function isStyleValue(target: StyleTarget | "graph", property: string, value: unknown): boolean {
    if (target !== "graph" && property.startsWith("graphty:")) {
        return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    }
    const kind = STYLE_PROPERTIES[target].get(property);
    switch (kind) {
        case undefined:
            return false;
        case "color":
            return typeof value === "string" && /^#[0-9a-f]{6}$/.test(value);
        case "number":
            return typeof value === "number" && Number.isFinite(value) && value >= 0;
        case "opacity":
            return typeof value === "number" && value >= 0 && value <= 1;
        case "text":
            return typeof value === "string";
        case "boolean":
            return typeof value === "boolean";
        default:
            return (
                typeof value === "string" &&
                ((STYLE_ENUMS.get(kind)?.includes(value) ?? false) ||
                    (OPEN_ENUMS.has(kind) && value.startsWith("other:") && value.length > "other:".length))
            );
    }
}
