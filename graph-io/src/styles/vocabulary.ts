/**
 * The neutral property vocabulary at run time: which properties exist for nodes, edges and the graph, what kind of
 * value each takes, and the names of every enumeration. Readers type-check their output against it before
 * planning; a value of the wrong kind is a note, never a style.
 */

import type { StyleProperty, StyleTarget } from "./types.js";

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
    | "labelFit"
    | "labelBox";

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
        ["fillGradientCenterX", "signed"],
        ["fillGradientCenterY", "signed"],
        ["fillGradientRadius", "number"],
        ["labelSize", "number"],
        ["labelWrapWidth", "number"],
        ["labelWrapTrailingSpace", "boolean"],
        ["labelWrapSkipEndSpace", "boolean"],
        ["labelWrapEllipsis", "boolean"],
        ["labelWrapAnywhere", "boolean"],
        ["labelWrapSpaceCount", "number"],
        ["labelMaxLines", "number"],
        ["labelMaxLinesEllipsis", "boolean"],
        ["labelKeepBlankLines", "boolean"],
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
        ["labelFitQuantum", "number"],
        ["labelFitImage", "number"],
        ["labelFitImagePadding", "number"],
        ["shape", "shape"],
        ["shapePoints", "text"],
        ["shapePointsStretch", "boolean"],
        ["shapeRotation", "signed"],
        ["shapeParts", "text"],
        ["shapeLines", "text"],
        ["shapeLineWidth", "number"],
        ["shapeLineHaloColor", "color"],
        ["shapeLineHaloWidth", "number"],
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
        ["outerBorderCount", "number"],
        ["raisedBorderWidth", "number"],
        ["raisedBorderLightColor", "color"],
        ["raisedBorderDarkColor", "color"],
        ["shadowColor", "color"],
        ["shadowOpacity", "opacity"],
        ["shadowBlur", "number"],
        ["shadowOffsetX", "signed"],
        ["shadowOffsetY", "signed"],
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
        ["xlabel", "text"],
        ["xlabelOffsetX", "signed"],
        ["xlabelOffsetY", "signed"],
        ["labelFont", "text"],
        ["labelWeight", "weight"],
        ["labelItalic", "boolean"],
        ["labelPosition", "position"],
        ["labelTextAlign", "textAlign"],
        ["labelRuns", "text"],
        ["labelTable", "text"],
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
        ["labelBox", "labelBox"],
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
        ["imageAspect", "boolean"],
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
        ["stripeFrame", "text"],
        ["chartKind", "text"],
        ["chartValues", "text"],
        ["chartColors", "text"],
        ["chartMin", "signed"],
        ["chartMax", "signed"],
        ["chartHorizontal", "boolean"],
        ["chartSize", "number"],
        ["chartWidth", "number"],
        ["chartHeight", "number"],
        ["chartOffsetX", "signed"],
        ["chartOffsetY", "signed"],
        ["chartMargin", "signed"],
        ["chartGap", "number"],
        ["chartLineWidth", "number"],
        ["chartBorderColor", "color"],
        ["chartBorderWidth", "number"],
        ["chartBackgroundColor", "color"],
        ["chartBackgroundOpacity", "opacity"],
        ["groupPadding", "number"],
        ["groupPaddingRatio", "number"],
        ["groupPaddingOf", "text"],
        ["groupMinWidth", "number"],
        ["groupMinHeight", "number"],
        ["groupMinWidthBiasLeft", "number"],
        ["groupMinHeightBiasTop", "number"],
        ["groupIncludeLabels", "boolean"],
        ["cornerRadiusCap", "number"],
        ["cornerFraction", "number"],
        ["borderScreenWidth", "number"],
        ["labelScreenSize", "number"],
        ["sizeMode", "text"],
        ["labelShiftOf", "text"],
        ["labelGapOf", "text"],
        ["drawOrder", "number"],
        ["visible", "boolean"],
    ]),
    edge: new Map<string, StyleValueKind>([
        ["color", "color"],
        ["sourceArrowColor", "color"],
        ["targetArrowColor", "color"],
        ["sourceArrowFillColor", "color"],
        ["targetArrowFillColor", "color"],
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
        ["taper", "number"],
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
        ["supportScale", "text"],
        ["nodeGap", "number"],
        ["sourceNodeGap", "number"],
        ["targetNodeGap", "number"],
        ["sourcePort", "text"],
        ["targetPort", "text"],
        ["label", "text"],
        ["tooltip", "text"],
        ["xlabel", "text"],
        ["labelFont", "text"],
        ["labelWeight", "weight"],
        ["labelTextAlign", "textAlign"],
        ["labelRuns", "text"],
        ["labelItalic", "boolean"],
        ["labelWrapWidth", "number"],
        ["labelWrapEllipsis", "boolean"],
        ["labelWrapAnywhere", "boolean"],
        ["labelWrapSpaceCount", "number"],
        ["labelMaxLines", "number"],
        ["labelMaxLinesEllipsis", "boolean"],
        ["labelKeepBlankLines", "boolean"],
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
        ["labelTable", "text"],
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
        ["labelScreenSize", "number"],
        ["sourceLabelScreenSize", "number"],
        ["targetLabelScreenSize", "number"],
        ["labelShiftOf", "text"],
        ["sourceLabelWeight", "weight"],
        ["targetLabelWeight", "weight"],
        ["sourceLabelOpacity", "opacity"],
        ["targetLabelOpacity", "opacity"],
        ["dashLength", "number"],
        ["dashGap", "number"],
        ["sourceArrowExtent", "number"],
        ["targetArrowExtent", "number"],
        ["midSourceArrowExtent", "number"],
        ["midTargetArrowExtent", "number"],
        ["sourceArrowBreadth", "number"],
        ["targetArrowBreadth", "number"],
        ["midSourceArrowBreadth", "number"],
        ["midTargetArrowBreadth", "number"],
        ["sourceArrowOutlineWidth", "number"],
        ["targetArrowOutlineWidth", "number"],
        ["midSourceArrowOutlineWidth", "number"],
        ["midTargetArrowOutlineWidth", "number"],
        ["visible", "boolean"],
    ]),
    graph: new Map<string, StyleValueKind>([
        ["background", "color"],
        ["rotation", "number"],
    ]),
});

/**
 * The node shapes beyond the basic ones that a file's own shape is settled into: graphty's names for Pajek's cross,
 * house, man and woman, the rounded polygons and the barrel, rectangles rounded on one side, and the database
 * (cylinder).
 */
const GENERIC_SHAPES = [
    "cross",
    "house",
    "man",
    "woman",
    "round-triangle",
    "round-diamond",
    "round-pentagon",
    "round-hexagon",
    "round-octagon",
    "round-polygon",
    "barrel",
    "top-round-rectangle",
    "bottom-round-rectangle",
    "database",
] as const;

/** The stroke patterns beyond the basic ones that a line or border style is settled into. */
const STROKES = ["forward-slash", "backward-slash", "vertical-slash", "separate-arrow", "contiguous-arrow"] as const;

/** The line styles beyond the basic ones. */
const GENERIC_LINE_STYLES = STROKES;

/** The border styles beyond the basic ones. */
const GENERIC_BORDER_STYLES = ["zigzag", "sinewave", ...STROKES] as const;

/**
 * The arrow shapes beyond the basic ones that a file's own arrow is settled into: a half arrow drawn as one thin barb
 * on either side, a vee turned round, a half arrow on the line's other side, half circles and curves, compound and
 * crossed arrows, an open square and an open inverted triangle, a picture, the kite, the deltoid and the open vee, and
 * the stem and slash pieces of an arrow drawn in several pieces.
 */
const GENERIC_ARROWS = [
    "half-barb",
    "half-barb-flipped",
    "inverted-vee",
    "half-open-flipped",
    "half-circle",
    "open-half-circle",
    "curve",
    "triangle-tee",
    "triangle-cross",
    "circle-triangle",
    "open-box",
    "open-inverted",
    "cross-delta",
    "open-cross-delta",
    "image",
    "cross",
    "kite",
    "deltoid",
    "open-vee",
    "stem",
    "slash",
] as const;

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
            ...GENERIC_SHAPES,
        ],
    ],
    ["borderStyle", ["solid", "dashed", "dotted", "dash-dot", "double", ...GENERIC_BORDER_STYLES]],
    ["borderPosition", ["inside", "center", "outside"]],
    [
        "lineStyle",
        ["solid", "dashed", "dotted", "dash-dot", "long-dash", "double", "zigzag", "sinewave", ...GENERIC_LINE_STYLES],
    ],
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
            ...GENERIC_ARROWS,
        ],
    ],
    ["arrowSide", ["left", "right"]],
    ["weight", ["normal", "bold"]],
    ["textAlign", ["left", "center", "right"]],
    ["labelFit", ["inside", "bounds"]],
    ["labelBox", ["words", "words-at-side", "target-width"]],
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

/**
 * Whether a name is one of a target's properties: a neutral one or a `graphty:<channel>`.
 * @param target - nodes or edges
 * @param property - the name
 * @returns true for a property in `STYLE_PROPERTIES` or a `graphty:` one
 */
export function isStyleProperty(target: StyleTarget, property: string): property is StyleProperty {
    return property.startsWith("graphty:") || STYLE_PROPERTIES[target].has(property);
}
