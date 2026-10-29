/**
 * The neutral property vocabulary at run time: which properties exist for nodes, edges and the graph, what kind of
 * value each takes, and the names of every enumeration. Readers type-check their output against it before
 * planning; a value of the wrong kind is a note, never a style.
 */

import type { StyleTarget } from "./types.js";

/**
 * The kinds of style value: a canonical `#rrggbb` color, a number (lengths and factors at least 0), a signed number
 * (an offset, negative too), an opacity
 * (0..1), a text, a boolean, or a value of one of the enumerations in `STYLE_ENUMS`.
 * @category Styles
 */
export type StyleValueKind =
    | "color"
    | "number"
    | "signed"
    | "opacity"
    | "text"
    | "boolean"
    | "shape"
    | "borderStyle"
    | "borderPosition"
    | "lineStyle"
    | "arrow"
    | "arrowSide"
    | "weight"
    | "textAlign"
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
        ["fillGradientColors", "text"],
        ["fillGradientStops", "text"],
        ["fillGradientKind", "text"],
        ["labelSize", "number"],
        ["labelWrapWidth", "number"],
        ["labelWrapTrailingSpace", "boolean"],
        ["labelWrapEllipsis", "boolean"],
        ["labelWrapAnywhere", "boolean"],
        ["labelWrapSpaceCount", "number"],
        ["labelRunAlign", "text"],
        ["labelOffsetX", "signed"],
        ["labelOffsetY", "signed"],
        ["labelShiftX", "signed"],
        ["labelShiftY", "signed"],
        ["labelOpacity", "opacity"],
        ["labelBackgroundOpacity", "opacity"],
        ["labelFit", "labelFit"],
        ["labelPaddingX", "number"],
        ["labelPaddingY", "number"],
        ["labelFitSquare", "boolean"],
        ["shape", "shape"],
        ["shapePoints", "text"],
        ["shapePointsStretch", "boolean"],
        ["shapeParts", "text"],
        ["shapeLines", "text"],
        ["shapeLineWidth", "number"],
        ["shapeTexts", "text"],
        ["borderStyle", "borderStyle"],
        ["borderPosition", "borderPosition"],
        ["borderWaveAmplitude", "number"],
        ["borderWavePeriod", "number"],
        ["outerBorderColor", "color"],
        ["outerBorderWidth", "number"],
        ["outerBorderOpacity", "opacity"],
        ["outerBorderStyle", "borderStyle"],
        ["outerBorderOffset", "number"],
        ["underlayColor", "color"],
        ["underlayOpacity", "opacity"],
        ["underlayPadding", "number"],
        ["underlayShape", "shape"],
        ["underlayCornerRadius", "number"],
        ["overlayColor", "color"],
        ["overlayOpacity", "opacity"],
        ["overlayPadding", "number"],
        ["overlayShape", "shape"],
        ["overlayCornerRadius", "number"],
        ["label", "text"],
        ["tooltip", "text"],
        ["labelFont", "text"],
        ["labelWeight", "weight"],
        ["labelItalic", "boolean"],
        ["labelPosition", "position"],
        ["labelTextAlign", "textAlign"],
        ["labelRuns", "text"],
        ["labelMinScreenSize", "number"],
        ["labelAvoidOverlap", "boolean"],
        ["labelMinNodeScreenSize", "number"],
        ["labelGridCellSize", "number"],
        ["labelOnTop", "boolean"],
        ["labelRotation", "number"],
        ["labelBackground", "color"],
        ["labelOutlineColor", "color"],
        ["labelOutlineWidth", "number"],
        ["labelBorderColor", "color"],
        ["labelBorderWidth", "number"],
        ["labelOutlineOpacity", "opacity"],
        ["labelBorderOpacity", "opacity"],
        ["labelPadding", "number"],
        ["labelCornerRadius", "number"],
        ["labelLineHeight", "number"],
        ["image", "text"],
        ["imageFit", "text"],
        ["imageFallback", "text"],
        ["imageWidth", "number"],
        ["imageHeight", "number"],
        ["imagePositionX", "number"],
        ["imagePositionY", "number"],
        ["imageOffsetX", "signed"],
        ["imageOffsetY", "signed"],
        ["imageRepeat", "text"],
        ["imageClip", "text"],
        ["imageSmoothing", "boolean"],
        ["imageAutoSize", "text"],
        ["imageOpacity", "opacity"],
        ["glyph", "text"],
        ["glyphFont", "text"],
        ["glyphSize", "number"],
        ["glyphWeight", "weight"],
        ["glyphColor", "color"],
        ["pieColors", "text"],
        ["pieSizes", "text"],
        ["pieOpacities", "text"],
        ["pieRadius", "number"],
        ["pieHole", "number"],
        ["pieRotation", "number"],
        ["pieFitBox", "boolean"],
        ["pieOffsetX", "signed"],
        ["pieOffsetY", "signed"],
        ["stripeColors", "text"],
        ["stripeSizes", "text"],
        ["stripeOpacities", "text"],
        ["stripeDirection", "text"],
        ["stripeSize", "number"],
        ["chartKind", "text"],
        ["chartValues", "text"],
        ["chartColors", "text"],
        ["chartMin", "signed"],
        ["chartMax", "signed"],
        ["chartHorizontal", "boolean"],
        ["chartSize", "number"],
        ["chartMargin", "signed"],
        ["chartGap", "number"],
        ["chartLineWidth", "number"],
        ["chartBorderColor", "color"],
        ["chartBorderWidth", "number"],
        ["groupPadding", "number"],
        ["groupPaddingRatio", "number"],
        ["groupPaddingOf", "text"],
        ["groupMinWidth", "number"],
        ["groupMinHeight", "number"],
        ["groupMinWidthBiasLeft", "number"],
        ["groupMinHeightBiasTop", "number"],
        ["groupIncludeLabels", "boolean"],
        ["visible", "boolean"],
    ]),
    edge: new Map<string, StyleValueKind>([
        ["color", "color"],
        ["sourceArrowColor", "color"],
        ["targetArrowColor", "color"],
        ["labelColor", "color"],
        ["opacity", "opacity"],
        ["width", "number"],
        ["minScreenWidth", "number"],
        ["outlineWidth", "number"],
        ["outlineColor", "color"],
        ["outlineOpacity", "opacity"],
        ["outlineStyle", "lineStyle"],
        ["underlayColor", "color"],
        ["underlayOpacity", "opacity"],
        ["underlayPadding", "number"],
        ["overlayColor", "color"],
        ["overlayOpacity", "opacity"],
        ["overlayPadding", "number"],
        ["gradientColors", "text"],
        ["gradientStops", "text"],
        ["gradientKind", "text"],
        ["labelSize", "number"],
        ["arrowSize", "number"],
        ["sourceArrowSize", "number"],
        ["sourceArrowLength", "number"],
        ["targetArrowLength", "number"],
        ["sourceArrowWidth", "number"],
        ["targetArrowWidth", "number"],
        ["sourceArrowGap", "number"],
        ["targetArrowGap", "number"],
        ["sourceArrowSide", "arrowSide"],
        ["targetArrowSide", "arrowSide"],
        ["sourceArrowParts", "text"],
        ["targetArrowParts", "text"],
        ["arrowPosition", "number"],
        ["lineStyle", "lineStyle"],
        ["waveAmplitude", "number"],
        ["wavePeriod", "number"],
        ["sourceArrow", "arrow"],
        ["targetArrow", "arrow"],
        ["midTargetArrow", "arrow"],
        ["midSourceArrow", "arrow"],
        ["midTargetArrowColor", "color"],
        ["midSourceArrowColor", "color"],
        ["targetArrowImage", "text"],
        ["sourceArrowImage", "text"],
        ["midTargetArrowImage", "text"],
        ["targetArrowImageWidth", "number"],
        ["targetArrowImageHeight", "number"],
        ["sourceArrowImageWidth", "number"],
        ["sourceArrowImageHeight", "number"],
        ["midTargetArrowImageWidth", "number"],
        ["midTargetArrowImageHeight", "number"],
        ["curved", "boolean"],
        ["bends", "text"],
        ["fanSpacing", "number"],
        ["fanned", "boolean"],
        ["bendCurve", "text"],
        ["arcRadius", "number"],
        ["supportModel", "text"],
        ["supportSpringLength", "number"],
        ["supportSpringConstant", "number"],
        ["supportRepulsion", "number"],
        ["supportCentralGravity", "number"],
        ["nodeGap", "number"],
        ["sourceNodeGap", "number"],
        ["targetNodeGap", "number"],
        ["sourcePort", "text"],
        ["targetPort", "text"],
        ["label", "text"],
        ["tooltip", "text"],
        ["labelFont", "text"],
        ["labelWeight", "weight"],
        ["labelTextAlign", "textAlign"],
        ["labelRuns", "text"],
        ["labelItalic", "boolean"],
        ["labelWrapWidth", "number"],
        ["labelWrapEllipsis", "boolean"],
        ["labelWrapAnywhere", "boolean"],
        ["labelWrapSpaceCount", "number"],
        ["labelRunAlign", "text"],
        ["labelPosition", "position"],
        ["labelRotation", "number"],
        ["labelOffsetX", "signed"],
        ["labelOffsetY", "signed"],
        ["labelShiftX", "signed"],
        ["labelShiftY", "signed"],
        ["labelOpacity", "opacity"],
        ["labelBackgroundOpacity", "opacity"],
        ["labelBackground", "color"],
        ["labelOutlineColor", "color"],
        ["labelOutlineWidth", "number"],
        ["labelBorderColor", "color"],
        ["labelBorderWidth", "number"],
        ["labelOutlineOpacity", "opacity"],
        ["labelBorderOpacity", "opacity"],
        ["labelPadding", "number"],
        ["labelCornerRadius", "number"],
        ["labelLineHeight", "number"],
        ["sourceLabel", "text"],
        ["targetLabel", "text"],
        ["sourceLabelOffset", "number"],
        ["targetLabelOffset", "number"],
        ["sourceLabelOffsetX", "signed"],
        ["sourceLabelOffsetY", "signed"],
        ["targetLabelOffsetX", "signed"],
        ["targetLabelOffsetY", "signed"],
        ["sourceLabelRotation", "number"],
        ["targetLabelRotation", "number"],
        ["sourceLabelSize", "number"],
        ["targetLabelSize", "number"],
        ["sourceLabelColor", "color"],
        ["targetLabelColor", "color"],
        ["sourceLabelFont", "text"],
        ["targetLabelFont", "text"],
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
    ["arrowSide", ["left", "right"]],
    ["weight", ["normal", "bold"]],
    ["textAlign", ["left", "center", "right"]],
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
        case "signed":
            return typeof value === "number" && Number.isFinite(value);
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
