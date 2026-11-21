/**
 * Style panel v2's control rubric and option-name table (design/ui/style-panel-v2/design.md,
 * sections 6 and 7): for each node and edge thing, the common lines under its row, its settings pop-over's
 * Main lines and the sub-groups its "+" adds, and for each line which control it draws. Keyed by
 * graphty-element channel ids; what a channel accepts, its limits and its own value names are
 * read from the element's descriptors and `channelValues`. The app's part is only presentation:
 * where a setting sits, what it is called, and the display name or glyph of an option where the
 * element's own name is not what the panel shows (a unit "Graph", an icon segment).
 */

import type { CompactMantineLabels } from "@graphty/compact-mantine";
import type { Channel } from "@graphty/graphty-element/catalog";

import type { GLYPHS } from "../../glyphs";

/**
 * A rubric rule (design section 6) a line's control follows. Colors, numbers and booleans take
 * theirs from the channel (R1, R5, R7); an enum line names its rule; `field` draws today's field
 * (a list, an asset, a text source, a value bound to data).
 */
export type Rule =
    "R1" | "R2" | "R5" | "R5b" | "R7" | "R8" | "R8f" | "R9" | "R10" | "R13" | "R14" | "R15" | "R17" | "XY" | "field";

/** One line of the panel or a pop-over. */
export interface LineSpec {
    /** The channel it edits (the first of a pair). */
    readonly channel: Channel;
    /** Its name, when not the element's short name for the channel; null draws no name column. */
    readonly name?: string | null;
    /** Its rule, where the channel's kind does not settle it (every enum names one). */
    readonly rule?: Rule;
    /** The second number of a pair (X | Y, W | H, near | far): two fields on one line. */
    readonly pair?: Channel;
    /** The letters in a pair's two fields' glyph slots. */
    readonly letters?: readonly [string, string];
    /** R6 sides on a pair: one number writes both until the sides toggle splits them. */
    readonly sides?: boolean;
    /** Channels standing for the same quantity in another unit: the line edits whichever is set. */
    readonly units?: readonly Channel[];
    /** A Unit line (R8): each unit's name and the channel holding the value in that unit. */
    readonly unit?: readonly (readonly [string, Channel])[];
    /** A boolean modifying the line, drawn as a toggle in its modifier slot (R6). */
    readonly toggle?: Channel;
    /** The toggle's glyph, when not a lock (italic beside a font weight). */
    readonly toggleGlyph?: keyof typeof GLYPHS;
    /** A number's named presets (R5b), where the element names none for its channel. */
    readonly presets?: readonly { readonly id: string; readonly plainName: string }[];
}

/** One named sub-group of a pop-over, added from its "+". */
export interface SubGroup {
    readonly name: string;
    readonly lines: readonly LineSpec[];
}

/** One thing's rubric. */
export interface ThingRubric {
    /** Its row's main control, when it is not today's field (Visibility's Shown / Hidden). */
    readonly row?: LineSpec;
    /** Channels its row's main control edits besides the main one (a gradient bar's stops): no line of their own. */
    readonly rowOwns?: readonly Channel[];
    /** At most two lines under its row, shown from the moment it is added. */
    readonly common?: readonly LineSpec[];
    /** Its pop-over's Main lines, always shown. */
    readonly main: readonly LineSpec[];
    /** Its pop-over's other sub-groups, in "+" menu order. */
    readonly groups?: readonly SubGroup[];
}

/** An option's display name and glyph, where the element's own name is not what the panel shows. */
export interface OptionName {
    readonly name: string;
    readonly glyph?: keyof typeof GLYPHS;
}

/**
 * The option-name table: every option of every R8 line, by channel and value id. A line whose
 * options all have a glyph draws icon segments (design 6, "Pictured"), else words. The widths test
 * checks that its ids are the element's values and that each line fits where it sits.
 */
export const OPTION_NAMES: Partial<Readonly<Record<Channel, Readonly<Record<string, OptionName>>>>> = {
    "node.borderPosition": {
        inside: { name: "Inside", glyph: "borderInside" },
        center: { name: "Center", glyph: "borderCenter" },
        outside: { name: "Outside", glyph: "borderOutside" },
    },
    "node.stripeDirection": {
        down: { name: "Down", glyph: "stripesDown" },
        right: { name: "Right", glyph: "stripesRight" },
    },
    "node.imageRepeat": {
        "no-repeat": { name: "None", glyph: "repeatNone" },
        repeat: { name: "Both", glyph: "repeatBoth" },
        "repeat-x": { name: "Across", glyph: "repeatAcross" },
        "repeat-y": { name: "Down", glyph: "repeatDown" },
    },
    "node.imageClip": { node: { name: "Node" }, none: { name: "None" } },
    "node.imageAutoSize": { proportional: { name: "Proportional" }, natural: { name: "Natural" } },
    "node.gradientKind": {
        linear: { name: "Linear", glyph: "gradientLinear" },
        radial: { name: "Radial", glyph: "gradientRadial" },
    },
    "node.sizeSpace": { scene: { name: "Graph" }, pivot: { name: "Pivot" }, screen: { name: "Screen" } },
    "node.sizeMode": { scale: { name: "Scale" }, diameter: { name: "Diameter" }, uniform: { name: "Uniform" } },
    "node.modelFit": { contain: { name: "Contain" }, stretch: { name: "Stretch" } },
    "node.modelCenter": { bounds: { name: "Bounds" }, origin: { name: "Origin" } },
    "node.modelDoubleSided": { file: { name: "File" }, true: { name: "On" }, false: { name: "Off" } },
    "node.labelFit": { inside: { name: "Inside" }, bounds: { name: "Bounds" } },
    "node.visible": { true: { name: "Shown" }, false: { name: "Hidden" } },
    "edge.gradientKind": {
        linear: { name: "Linear", glyph: "gradientLinear" },
        radial: { name: "Radial", glyph: "gradientRadial" },
        none: { name: "None", glyph: "gradientNone" },
    },
    "edge.supportScale": { unit: { name: "Unit" }, drawing: { name: "Drawing" } },
    "edge.visible": { true: { name: "Shown" }, false: { name: "Hidden" } },
    ...Object.fromEntries(
        (["arrowHead", "arrowTail", "arrowMiddleHead", "arrowMiddleTail"] as const).map((end) => [
            `edge.${end}Side`,
            { left: { name: "Left", glyph: "sideLeft" }, right: { name: "Right", glyph: "sideRight" } },
        ]),
    ),
};

/**
 * The app's glyph of each value of an R10 list the element pictures none of (design 6, "R10
 * lucide"), by channel and value id.
 */
export const VALUE_GLYPHS: Partial<Readonly<Record<Channel, Readonly<Record<string, keyof typeof GLYPHS>>>>> = {
    "edge.route": {
        straight: "routeStraight",
        arc: "routeArc",
        "great-circle": "routeGreatCircle",
        bundled: "routeBundled",
    },
    "edge.bendCurve": { corners: "bendCorners", midpoints: "bendMidpoints", bezier: "bendBezier", arc: "routeArc" },
    "node.chartKind": {
        bar: "chartBar",
        "stacked-bar": "chartStackedBar",
        line: "chartLine",
        box: "chartBox",
        cells: "chartCells",
    },
};

/** A Unit line's options for a stroke width: in graph units, or in screen pixels. */
const BORDER_UNIT: readonly (readonly [string, Channel])[] = [
    ["Graph", "node.borderWidth"],
    ["Screen", "node.borderScreenWidth"],
];

/** Fit to label: sizes the node to its label, so it sits in the Size pop-over (ia-design 2). */
export const FIT_TO_LABEL: readonly Channel[] = [
    "node.labelFit",
    "node.labelPaddingX",
    "node.labelPaddingY",
    "node.labelFitSquare",
    "node.labelFitQuantum",
    "node.labelFitImage",
    "node.labelFitImagePadding",
];

/** Every channel of the Size row (ia-design 2: Size is its own row, so "size by degree" needs no Shape, E189). */
export const SIZE_CHANNELS: readonly Channel[] = [
    "node.size",
    "node.sizeSpace",
    "node.sizeMode",
    "node.width",
    "node.height",
    "node.depth",
    "node.relativeExtents",
    "node.planar",
    ...FIT_TO_LABEL,
];

/** The Size row: its settings are the size's unit, mode and extents, and Fit to label (ia-design 2). */
const SIZE_RUBRIC: ThingRubric = {
    main: [
        { channel: "node.sizeSpace", name: "Unit", rule: "R8f" },
        { channel: "node.sizeMode", rule: "R8f" },
        { channel: "node.width", name: "Size", pair: "node.height", letters: ["W", "H"] },
        { channel: "node.depth" },
        { channel: "node.relativeExtents" },
        { channel: "node.planar" },
    ],
    groups: [
        {
            name: "Fit to label",
            lines: [
                { channel: "node.labelFit", name: "Fit", rule: "R8" },
                {
                    channel: "node.labelPaddingX",
                    name: "Padding",
                    pair: "node.labelPaddingY",
                    letters: ["X", "Y"],
                    sides: true,
                },
                { channel: "node.labelFitSquare" },
                { channel: "node.labelFitQuantum" },
                { channel: "node.labelFitImage" },
                { channel: "node.labelFitImagePadding" },
            ],
        },
    ],
};

/** Every Shape member's sub-groups: thing-wide (design 5). */
const SHAPE_GROUPS: readonly SubGroup[] = [
    {
        name: "Finish",
        lines: [{ channel: "node.wireframe" }, { channel: "node.flat" }, { channel: "node.unlit" }],
    },
];

/**
 * The Shape row while a shader draws in the shapes' place (design 7.1, "replace shader"): its
 * parameters stay the Shaders section's row's; the pop-over holds every Shape member's sub-groups.
 */
export const SHAPE_REPLACE_RUBRIC: ThingRubric = {
    main: [{ channel: "node.shapeRotation", name: "Rotation" }],
    groups: SHAPE_GROUPS,
};

/**
 * A backdrop behind or in front of a node (Underlay, Overlay).
 * @param of - which.
 * @returns its rubric.
 */
function backdrop(of: "underlay" | "overlay"): ThingRubric {
    return {
        main: [
            { channel: `node.${of}Shape`, name: "Shape", rule: "R10" },
            { channel: `node.${of}Padding`, name: "Padding" },
            { channel: `node.${of}CornerRadius`, name: "Corners" },
            { channel: `node.${of}Opacity`, name: "Opacity" },
        ],
    };
}

/**
 * Each node thing's rubric (design 7.1), by thing id, or `id:channel` for a family member whose
 * row's main channel is that channel (a model in the Shape row, a gradient in the Fill row). A
 * label, external label and tooltip edit their label style field by field (`labelRubric.ts`).
 */
export const NODE_RUBRIC: Readonly<Record<string, ThingRubric>> = {
    size: SIZE_RUBRIC,
    shape: {
        main: [
            { channel: "node.shapeRotation", name: "Rotation" },
            { channel: "node.meshDetail", name: "Detail", rule: "R5b" },
        ],
        groups: [
            {
                name: "Corners",
                lines: [
                    { channel: "node.cornerRadius", name: "Radius" },
                    { channel: "node.exactCornerRadius" },
                    { channel: "node.cornerFraction", name: "Fraction" },
                ],
            },
            // The pieces graph-io writes for a shape drawn from coordinates (ia-design 2, Shape).
            {
                name: "Custom shape",
                lines: [
                    { channel: "node.shapePoints", name: "Points", rule: "R15" },
                    { channel: "node.shapeStretchPoints" },
                    { channel: "node.shapeParts", name: "Extra pieces", rule: "R15" },
                    { channel: "node.shapeLines", name: "Inner lines", rule: "R15" },
                    { channel: "node.shapeLineWidth", name: "Inner line width" },
                    { channel: "node.shapeLineHaloColor", name: "Inner line backing" },
                    { channel: "node.shapeLineHaloWidth", name: "Inner line backing width" },
                ],
            },
            ...SHAPE_GROUPS,
        ],
    },
    "shape:node.model": {
        main: [
            { channel: "node.shape", name: "Fallback shape", rule: "R10" },
            { channel: "node.modelTint", name: "Tint", rule: "R9" },
            { channel: "node.modelFit", name: null, rule: "R8f" },
            { channel: "node.modelCenter", name: "Center", rule: "R8" },
            { channel: "node.shapeRotation", name: "Rotation" },
        ],
        groups: [
            {
                name: "Orient",
                lines: [
                    { channel: "node.modelSourceUp", name: "Up", rule: "R9" },
                    { channel: "node.modelTurn", name: "Turn" },
                    { channel: "node.modelDoubleSided", name: null, rule: "R8f" },
                ],
            },
            {
                name: "Animation",
                lines: [
                    { channel: "node.modelAnimation", name: "Clip", rule: "field" },
                    {
                        channel: "node.modelAnimationSpeed",
                        name: "Play",
                        pair: "node.modelAnimationOffset",
                    },
                ],
            },
            ...SHAPE_GROUPS,
        ],
    },
    fill: { main: [] },
    "fill:node.gradientColors": {
        // The row's gradient bar edits the colors and their stops: one home for both (design 2.6).
        rowOwns: ["node.gradientStops"],
        main: [
            { channel: "node.gradientKind", name: "Kind", rule: "R8" },
            { channel: "node.gradientDirection", name: "Direction" },
            { channel: "node.gradientCenterX", name: "Center", pair: "node.gradientCenterY", letters: ["X", "Y"] },
            { channel: "node.gradientRadius", name: "Radius" },
            // The end color of a gradient that names no colors of its own (from the fill color into this).
            { channel: "node.gradientColor", name: "End" },
            { channel: "node.opacity", name: "Opacity" },
        ],
    },
    "fill:node.texture": { main: [{ channel: "node.opacity", name: "Opacity" }] },
    image: {
        common: [{ channel: "node.imageOpacity", name: "Opacity" }],
        main: [
            { channel: "node.imageFit", name: "Fit", rule: "R9" },
            { channel: "node.imageFallback", name: "Fallback", rule: "field" },
        ],
        groups: [
            {
                name: "Size",
                lines: [
                    {
                        channel: "node.imageWidth",
                        name: "Size",
                        pair: "node.imageHeight",
                        letters: ["W", "H"],
                        toggle: "node.imageAspect",
                    },
                    { channel: "node.imagePixelSize", name: "Pixel size" },
                    { channel: "node.imageAutoSize", name: null, rule: "R8f" },
                ],
            },
            {
                name: "Place",
                lines: [
                    {
                        channel: "node.imagePositionX",
                        name: "Position",
                        pair: "node.imagePositionY",
                        letters: ["X", "Y"],
                    },
                    { channel: "node.imageOffsetX", name: "Offset", pair: "node.imageOffsetY", letters: ["X", "Y"] },
                ],
            },
            {
                name: "Tiling",
                lines: [
                    { channel: "node.imageRepeat", name: "Repeat", rule: "R8" },
                    { channel: "node.imageClip", name: "Clip", rule: "R8" },
                    { channel: "node.imageSmoothing" },
                ],
            },
        ],
    },
    pie: {
        // The slices' colors, shares and opacities are the list editor's (R15, `colorItems.tsx`).
        rowOwns: ["node.pieSizes", "node.pieOpacities"],
        main: [],
        groups: [
            {
                name: "Disc",
                lines: [
                    { channel: "node.pieHole", name: "Hole" },
                    { channel: "node.pieRadius", name: "Radius" },
                    { channel: "node.pieRotation", name: "Rotation" },
                    { channel: "node.pieFitBox" },
                    { channel: "node.pieOffsetX", name: "Offset", pair: "node.pieOffsetY", letters: ["X", "Y"] },
                ],
            },
        ],
    },
    stripes: {
        rowOwns: ["node.stripeSizes", "node.stripeOpacities"],
        main: [
            { channel: "node.stripeDirection", name: "Direction", rule: "R8" },
            { channel: "node.stripeSize", name: "Size" },
        ],
        groups: [{ name: "Frame", lines: [{ channel: "node.stripeFrame", name: "Frame", rule: "R17" }] }],
    },
    chart: {
        row: { channel: "node.chartKind", name: "Chart", rule: "R10" },
        rowOwns: ["node.chartValues", "node.chartColors"],
        main: [{ channel: "node.chartMin", name: "Range", pair: "node.chartMax" }, { channel: "node.chartHorizontal" }],
        groups: [
            {
                name: "Box",
                lines: [
                    { channel: "node.chartSize", name: "Size" },
                    { channel: "node.chartWidth", name: "Box", pair: "node.chartHeight", letters: ["W", "H"] },
                    { channel: "node.chartOffsetX", name: "Offset", pair: "node.chartOffsetY", letters: ["X", "Y"] },
                    { channel: "node.chartMargin", name: "Margin" },
                    { channel: "node.chartGap", name: "Gap" },
                ],
            },
            {
                name: "Strokes",
                lines: [
                    { channel: "node.chartLineWidth", name: "Line width" },
                    { channel: "node.chartBorderColor", name: null },
                    { channel: "node.chartBorderWidth", name: "Border" },
                    { channel: "node.chartBackgroundColor", name: null },
                    { channel: "node.chartBackgroundOpacity", name: "Background" },
                ],
            },
        ],
    },
    border: {
        common: [{ channel: "node.borderWidth", name: "Width", units: ["node.borderScreenWidth"] }],
        main: [
            { channel: "node.borderWidth", name: "Unit", unit: BORDER_UNIT },
            { channel: "node.borderOpacity", name: "Opacity" },
            { channel: "node.borderStyle", name: "Style", rule: "R10" },
            { channel: "node.borderPosition", name: "Position", rule: "R8" },
        ],
        groups: [
            {
                name: "Waves",
                lines: [
                    {
                        channel: "node.borderWaveAmplitude",
                        name: "Wave",
                        pair: "node.borderWavePeriod",
                    },
                ],
            },
        ],
    },
    // A ring: a stroke standing off the node's edge, outside any border (ia-design 2).
    rings: {
        common: [{ channel: "node.outerBorderWidth", name: "Width" }],
        main: [
            { channel: "node.outerBorderOpacity", name: "Opacity" },
            { channel: "node.outerBorderStyle", name: "Style", rule: "R10" },
            { channel: "node.outerBorderOffset", name: "Offset" },
            { channel: "node.outerBorderCount", name: "Count" },
        ],
    },
    raised: {
        main: [
            { channel: "node.raisedBorderLightColor", name: "Light" },
            { channel: "node.raisedBorderDarkColor", name: "Dark" },
        ],
    },
    shadow: {
        main: [
            { channel: "node.shadowOpacity", name: "Opacity" },
            { channel: "node.shadowBlur", name: "Blur" },
            { channel: "node.shadowOffsetX", name: "Offset", pair: "node.shadowOffsetY", letters: ["X", "Y"] },
        ],
    },
    glow: { main: [{ channel: "node.glowStrength", name: "Strength" }] },
    // The Plate item's rows (kindGroups.ts, C2), by the kind's color.
    "plate:node.underlayColor": backdrop("underlay"),
    "plate:node.overlayColor": backdrop("overlay"),
    visibility: { row: { channel: "node.visible", name: null, rule: "R8" }, main: [] },
    // The Label row's Glyph kind (kindGroups.ts).
    "label:node.glyph": {
        common: [{ channel: "node.glyphColor", name: "Color" }],
        main: [
            { channel: "node.glyphSize", name: "Size" },
            { channel: "node.glyphFont", name: "Font", rule: "R13" },
            {
                channel: "node.glyphWeight",
                name: "Weight",
                rule: "R5b",
                presets: [
                    { id: "400", plainName: "Regular" },
                    { id: "700", plainName: "Bold" },
                ],
            },
        ],
    },
    record: {
        // The fields are the list editor's (R15, `ItemList.tsx`), under Main.
        rowOwns: ["node.shapeTexts"],
        main: [],
        groups: [{ name: "Table", lines: [{ channel: "node.labelTable", name: "Table", rule: "field" }] }],
    },
};

/**
 * An edge line's lines after its color or stops: thing-wide across Solid and Gradient (design 5).
 * Solid's opacity is its color field's; a gradient's is a line of its own.
 */
const LINE_MAIN: readonly LineSpec[] = [
    { channel: "edge.taper", name: "Taper" },
    { channel: "edge.minScreenWidth", name: "Min width" },
    { channel: "edge.blending" },
    // Lift draws only in 3D: dimmed in 2D from graphty-element's view fact, like every one-view line.
    { channel: "edge.lift", name: "Lift" },
];

/** An edge line's sub-groups (design 7.2). */
const LINE_GROUPS: readonly SubGroup[] = [
    {
        name: "Fade",
        lines: [
            { channel: "edge.fadeStart", name: "Fade", pair: "edge.fadeEnd" },
            { channel: "edge.fadeOpacity", name: "Opacity" },
        ],
    },
];

/** Every channel of an edge's Pattern row (ia-design 2: it leaves the Line pop-over, so "dashed" shows in "+"). */
export const PATTERN_CHANNELS: readonly Channel[] = [
    "edge.style",
    "edge.patternCount",
    "edge.dashLength",
    "edge.dashGap",
    "edge.waveAmplitude",
    "edge.wavePeriod",
];

/** An edge end's channels' stem. */
type EdgeEnd = "arrowHead" | "arrowTail" | "arrowMiddleHead" | "arrowMiddleTail";

/**
 * An edge end (Target, Source, Middle target, Middle source): its arrowhead on the row, Size under
 * it; a middle end has no gap, stack or caption.
 * @param end - which end.
 * @returns its rubric.
 */
function edgeEnd(end: EdgeEnd): ThingRubric {
    const at = (suffix: string): Channel => `edge.${end}${suffix}` as Channel;
    const middle = end === "arrowMiddleHead" || end === "arrowMiddleTail";
    return {
        // Arrow color varies in more files than arrow size, so both are lines under the row (ia-design 2).
        common: [
            { channel: at("Size"), name: "Size" },
            { channel: at("Color"), name: "Color" },
        ],
        main: [
            { channel: at("Width"), name: "Width" },
            { channel: at("Opacity"), name: "Opacity" },
            { channel: at("Side"), name: "Side", rule: "R8" },
        ],
        groups: [
            {
                name: "Open caps",
                lines: [
                    { channel: at("OutlineWidth"), name: "Outline" },
                    { channel: at("FillColor"), name: null },
                ],
            },
            {
                name: "Place",
                lines: [
                    { channel: at("Position"), name: "Position" },
                    ...(middle ? [] : [{ channel: at("Gap"), name: "Gap" }]),
                ],
            },
            {
                name: middle ? "Picture" : "Stack",
                lines: [
                    ...(middle ? [] : [{ channel: at("Stack"), name: "Stack", rule: "R15" as const }]),
                    { channel: at("Image"), name: "Image", rule: "field" },
                ],
            },
        ],
    };
}

/**
 * Each edge thing's rubric (design 7.2), keyed as `NODE_RUBRIC` is. A label, an external label and
 * a caption edit their label style field by field (`labelRubric.ts`); a Record is today's label
 * table field.
 */
export const EDGE_RUBRIC: Readonly<Record<string, ThingRubric>> = {
    line: {
        common: [{ channel: "edge.width", name: "Width" }],
        main: LINE_MAIN,
        groups: LINE_GROUPS,
    },
    "line:edge.gradientColors": {
        common: [{ channel: "edge.width", name: "Width" }],
        rowOwns: ["edge.gradientStops"],
        main: [
            { channel: "edge.gradientKind", name: "Kind", rule: "R8" },
            { channel: "edge.opacity", name: "Opacity" },
            ...LINE_MAIN,
        ],
        groups: LINE_GROUPS,
    },
    // The row is the sectioned pattern list; its settings the count, and dashes and waves (ia-design 2).
    pattern: {
        row: { channel: "edge.style", name: "Pattern", rule: "R10" },
        main: [{ channel: "edge.patternCount", name: "Count" }],
        groups: [
            { name: "Dashes", lines: [{ channel: "edge.dashLength", name: "Dash", pair: "edge.dashGap" }] },
            { name: "Wave", lines: [{ channel: "edge.waveAmplitude", name: "Wave", pair: "edge.wavePeriod" }] },
        ],
    },
    // The Outline item's rows (kindGroups.ts, C7), by the kind's color: color and Width, then Opacity (ia-design 2).
    "outline:edge.outlineColor": {
        common: [{ channel: "edge.outlineWidth", name: "Width" }],
        main: [
            { channel: "edge.outlineOpacity", name: "Opacity" },
            { channel: "edge.outlineStyle", name: "Style", rule: "R10" },
        ],
    },
    "outline:edge.overlayColor": {
        common: [{ channel: "edge.overlayPadding", name: "Width" }],
        main: [{ channel: "edge.overlayOpacity", name: "Opacity" }],
    },
    // The Arrow item's rows (kindGroups.ts, C6), by the kind's arrowhead.
    "arrow:edge.arrowHead": edgeEnd("arrowHead"),
    "arrow:edge.arrowTail": edgeEnd("arrowTail"),
    "arrow:edge.arrowMiddleHead": edgeEnd("arrowMiddleHead"),
    "arrow:edge.arrowMiddleTail": edgeEnd("arrowMiddleTail"),
    // The route is a value list like Shape's and Pattern's, each route with its icon, and Curve its line (ia-design 2).
    route: {
        row: { channel: "edge.route", name: "Route", rule: "R10" },
        common: [{ channel: "edge.curvature", name: "Curve" }],
        main: [
            { channel: "edge.arcRadius", name: "Radius" },
            { channel: "edge.arcHeight", name: "Height" },
        ],
        groups: [
            {
                name: "Bundling",
                lines: [
                    { channel: "edge.bundleStrength", name: "Strength" },
                    { channel: "edge.bundleIterations", name: "Iterations" },
                ],
            },
            {
                name: "Parallel edges",
                lines: [
                    { channel: "edge.fanned", name: "Fanned" },
                    { channel: "edge.fanSpacing", name: "Spacing" },
                ],
            },
            {
                name: "Bends",
                lines: [
                    { channel: "edge.bends", name: "Bends", rule: "R15" },
                    { channel: "edge.bendCurve", name: "Curve", rule: "R10" },
                ],
            },
            {
                name: "Gaps",
                lines: [
                    { channel: "edge.nodeGap", name: "Gap" },
                    { channel: "edge.sourceNodeGap", name: "Ends", pair: "edge.targetNodeGap" },
                ],
            },
            {
                name: "Ports",
                lines: [
                    { channel: "edge.sourcePort", name: "Source", rule: "XY" },
                    { channel: "edge.targetPort", name: "Target", rule: "XY" },
                ],
            },
        ],
    },
    bundling: {
        row: { channel: "edge.supportModel", name: "Force curves", rule: "R9" },
        main: [],
        groups: [
            {
                name: "Springs",
                lines: [
                    {
                        channel: "edge.supportSpringLength",
                        name: "Spring",
                        pair: "edge.supportSpringConstant",
                    },
                    {
                        channel: "edge.supportRepulsion",
                        name: "Forces",
                        pair: "edge.supportCentralGravity",
                    },
                ],
            },
            {
                name: "Curve",
                lines: [
                    { channel: "edge.supportUnit", name: "Unit size" },
                    { channel: "edge.supportScale", name: "Scale", rule: "R8" },
                ],
            },
        ],
    },
    visibility: { row: { channel: "edge.visible", name: null, rule: "R8" }, main: [] },
    // An edge Record is its label table (design 4.2), its rows the list editor's (R15, `ItemList.tsx`).
    record: { rowOwns: ["edge.labelTable"], main: [] },
};

/**
 * A thing's rubric for the member its row shows.
 * @param side - nodes or edges.
 * @param thing - the thing's id.
 * @param main - the channel its row's main control edits.
 * @returns the rubric, or undefined for a thing with none (text, an edge's Record).
 */
export function rubricOf(side: "node" | "edge", thing: string, main: Channel): ThingRubric | undefined {
    const rubrics = side === "edge" ? EDGE_RUBRIC : NODE_RUBRIC;
    return rubrics[`${thing}:${main}`] ?? rubrics[thing];
}

/**
 * Every channel a line edits: its own, its pair's, its other units' and its toggle's.
 * @param line - the line.
 * @returns the channels.
 */
export function lineChannels(line: LineSpec): readonly Channel[] {
    return [
        line.channel,
        ...(line.pair === undefined ? [] : [line.pair]),
        ...(line.units ?? []),
        ...(line.unit?.map(([, channel]) => channel) ?? []),
        ...(line.toggle === undefined ? [] : [line.toggle]),
    ];
}

/**
 * Every channel a rubric's lines edit.
 * @param rubric - the rubric.
 * @returns the channels, once each.
 */
export function rubricChannels(rubric: ThingRubric): readonly Channel[] {
    const lines: LineSpec[] = [
        ...(rubric.rowOwns ?? []).map((channel): LineSpec => ({ channel })),
        ...(rubric.row === undefined ? [] : [rubric.row]),
        ...(rubric.common ?? []),
        ...rubric.main,
        ...(rubric.groups ?? []).flatMap((group) => group.lines),
    ];
    return [...new Set(lines.flatMap((line) => lineChannels(line)))];
}

/** The width of a line's control slot, by where it sits (design 2.2). */
export const LINE_WIDTHS = { panelNamed: 96, panelFull: 176, popoverNamed: 120, popoverFull: 200 } as const;

/**
 * The width a segment line needs (design 6): 28 px an icon, else 7 px a letter plus 16, at least 40.
 * @param options - its options.
 * @returns the width.
 */
export function segmentsWidth(options: readonly OptionName[]): number {
    const pictured = isPictured(options);
    const words = (option: OptionName): number => Math.max(40, option.name.length * 7 + 16);
    return options.reduce((sum, option) => sum + (pictured && option.glyph !== undefined ? 28 : words(option)), 0);
}

/**
 * Whether a segment line draws icons (design 6, "Pictured"): every option has a glyph, or every
 * one but a last "Auto", which stays a word.
 * @param options - its options.
 * @returns true when it draws icons.
 */
export function isPictured(options: readonly OptionName[]): boolean {
    const last = options.at(-1);
    const icons = last?.glyph === undefined && last?.name === "Auto" ? options.slice(0, -1) : options;
    return icons.length > 0 && icons.every((option) => option.glyph !== undefined);
}

/**
 * A segment line's options, in the element's order.
 * @param line - the line.
 * @param values - the element's value ids for its channel.
 * @param table - the option-name table, keyed by the line's channel (or label style field).
 * @returns each option's value and name, or undefined where the table names none.
 */
export function segmentOptions(
    line: Pick<LineSpec, "unit"> & { readonly channel: string },
    values: readonly string[],
    table: Readonly<Record<string, Readonly<Record<string, OptionName>> | undefined>> = OPTION_NAMES,
): readonly (OptionName & { readonly value: string })[] | undefined {
    if (line.unit !== undefined) {
        return line.unit.map(([name, channel]) => ({ value: channel, name }));
    }
    const names = table[line.channel];
    if (names === undefined) {
        return undefined;
    }
    const options = values.map((value) => (names[value] === undefined ? undefined : { value, ...names[value] }));
    return options.every((option) => option !== undefined) ? options : undefined;
}

/** A setting's line in a thing's rubric, and the pop-over sub-group that holds it, if any. */
interface FoundLine {
    readonly line: LineSpec;
    readonly group?: string;
}

/**
 * Where a channel sits in the rubrics: the line that edits it, for Find a setting.
 * @param side - nodes or edges.
 * @param channel - the channel.
 * @returns its line, the one naming it first winning over one it is only a pair, unit or toggle of.
 */
export function lineFor(side: "node" | "edge", channel: Channel): FoundLine | undefined {
    const found = Object.values(side === "edge" ? EDGE_RUBRIC : NODE_RUBRIC).flatMap((rubric) => [
        ...[...(rubric.row === undefined ? [] : [rubric.row]), ...(rubric.common ?? []), ...rubric.main].map(
            (line): FoundLine => ({ line }),
        ),
        ...(rubric.groups ?? []).flatMap((group) =>
            group.lines.map((line): FoundLine => ({ line, group: group.name })),
        ),
    ]);
    return (
        found.find(({ line }) => line.channel === channel) ??
        found.find(({ line }) => lineChannels(line).includes(channel))
    );
}

/**
 * compact-mantine's words v2 replaces: a set color field says its name and color only, never
 * "set here" (issue #8739: the panel never says where a value comes from).
 */
export const V2_LABELS: Partial<CompactMantineLabels> = { fieldSet: "" };
