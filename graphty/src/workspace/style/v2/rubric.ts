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
import type { Channel, ChannelValue } from "@graphty/graphty-element/catalog";

import type { GLYPHS } from "../../glyphs";

/**
 * A rubric rule (design section 6) a line's control follows. Colors, numbers and booleans take
 * theirs from the channel (R1, R5, R7); an enum line names its rule; `field` draws today's field
 * (a list, an asset, a text source, a value bound to data).
 */
export type Rule =
    | "R1"
    | "R2"
    | "R5"
    | "R5b"
    | "R7"
    | "R7t"
    | "R8"
    | "R8f"
    | "R9"
    | "R10"
    | "R13"
    | "R14"
    | "R15"
    | "R16"
    | "R17"
    | "XY"
    | "field";

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
    /** R6 sides on a pair: one number writes both until its Separate sides line (R7) splits them. */
    readonly sides?: boolean;
    /** Channels standing for the same quantity in another unit: the line edits whichever is set. */
    readonly units?: readonly Channel[];
    /** A Unit line (R8): each unit's name and the channel holding the value in that unit. */
    readonly unit?: readonly (readonly [string, Channel])[];
    /** A number's Unit segments drawn beside it on its own line in a pop-over, in place of a Unit line of their own. */
    readonly unitBeside?: readonly (readonly [string, Channel])[];
    /** A number's named presets (R5b), where the element names none for its channel. */
    readonly presets?: readonly { readonly id: string; readonly plainName: string }[];
    /**
     * A value list over several channels (a Finish's Shading: Smooth, Flat or Unlit over `node.flat` and
     * `node.unlit`): each choice's name and what it writes; the choice shown is the one whose values the row holds.
     */
    readonly choices?: readonly LineChoice[];
    /** An angle's zero on its dial (R18), where it is not at the top: a gradient's direction runs from the left. */
    readonly zeroAt?: "right";
    /** An advanced setting: drawn only in its pop-over, never as a line under the row, even when set. */
    readonly advanced?: true;
}

/** One choice of a line's value list over several channels. */
interface LineChoice {
    readonly name: string;
    readonly writes: Readonly<Partial<Record<Channel, ChannelValue>>>;
}

/**
 * One group of a thing's settings (design "Input rules"): an entry of the "..." menu in its pop-over's header, opening
 * its own pop-over beside it, at most 6 rows; a group of one line joins the main lines instead.
 */
export interface SubGroup {
    readonly name: string;
    readonly lines: readonly LineSpec[];
    /** The menu heading it is listed under, in a menu of more than 6 groups. */
    readonly heading?: string;
}

/** One thing's rubric. */
export interface ThingRubric {
    /** Its row's main control, when it is not today's field (Visibility's Shown / Hidden). */
    readonly row?: LineSpec;
    /** Channels its row's main control edits besides the main one (a gradient bar's stops): no line of their own. */
    readonly rowOwns?: readonly Channel[];
    /** At most two lines under its row, shown from the moment it is added. */
    readonly common?: readonly LineSpec[];
    /**
     * Its pop-over's tab strip, its first row (design "Input rules"): a one-of whose choices show different settings,
     * drawn as grouped buttons with no name; its row's main control when that is the same value (a route).
     */
    readonly strip?: LineSpec;
    /** Its pop-over's main lines, always shown. */
    readonly main: readonly LineSpec[];
    /** Its groups of settings, in "..." menu order. */
    readonly groups?: readonly SubGroup[];
}

/** An option's display name and glyph, where the element's own name is not what the panel shows. */
export interface OptionName {
    readonly name: string;
    readonly glyph?: keyof typeof GLYPHS;
    /** Draw the word beside the glyph: an icon alone would not say which way it means (stripes' Rows / Columns). */
    readonly worded?: true;
    /** A word option's hover tooltip, where its short word needs more words. */
    readonly tip?: string;
}

/**
 * The option-name table: every option of every R8 line, by channel and value id. A line whose
 * options all have a glyph draws icon segments (design 6, "Pictured"), else words. The widths test
 * checks that its ids are the element's values and that each line fits where it sits.
 */
export const OPTION_NAMES: Partial<Readonly<Record<Channel, Readonly<Record<string, OptionName>>>>> = {
    "node.chartKind": {
        bar: { name: "Bar", glyph: "chartBar" },
        "stacked-bar": { name: "Stacked", glyph: "chartStackedBar" },
        line: { name: "Line", glyph: "chartLine" },
        box: { name: "Box", glyph: "chartBox" },
        cells: { name: "Cells", glyph: "chartCells" },
    },
    "node.borderPosition": {
        inside: { name: "Inside", glyph: "borderInside" },
        center: { name: "Center", glyph: "borderCenter" },
        outside: { name: "Outside", glyph: "borderOutside" },
    },
    // Bands one under another are rows, side by side columns: Down / Right read backwards (stripes design 3.1).
    "node.stripeDirection": {
        down: { name: "Rows", glyph: "stripesDown", worded: true },
        right: { name: "Columns", glyph: "stripesRight", worded: true },
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
    "node.sizeSpace": {
        scene: { name: "Graph" },
        pivot: { name: "Focus", tip: "Sized as at the point the camera turns around" },
        screen: { name: "Screen" },
    },
    "node.sizeMode": { scale: { name: "Scale" }, diameter: { name: "Diameter" }, uniform: { name: "Uniform" } },
    "node.modelFit": { contain: { name: "Contain" }, stretch: { name: "Stretch" } },
    // Short words so four fit the line: the model's own colors, tinted, its plain parts painted, or all painted.
    "node.modelTint": {
        false: { name: "Off" },
        true: { name: "Tint" },
        untextured: { name: "Plain" },
        replace: { name: "All" },
    },
    "node.modelCenter": { bounds: { name: "Bounds" }, origin: { name: "Origin" } },
    "node.modelDoubleSided": { file: { name: "File" }, true: { name: "On" }, false: { name: "Off" } },
    // "": the option drawn while nothing is set, which picking unsets (design "Input rules": no empty line).
    "node.labelFit": { inside: { name: "Inside" }, bounds: { name: "Bounds" }, "": { name: "Off" } },
    "node.imageFit": {
        contain: { name: "Inside" },
        cover: { name: "Cover" },
        fill: { name: "Fill" },
        none: { name: "None" },
    },
    // Pictured, with their words as tooltips: the row's name column leaves the words too little room.
    "node.visible": { true: { name: "Shown", glyph: "show" }, false: { name: "Hidden", glyph: "hide" } },
    "node.wireframe": { true: { name: "On" }, false: { name: "Off" } },
    "edge.gradientKind": {
        linear: { name: "Linear", glyph: "gradientLinear" },
        radial: { name: "Radial", glyph: "gradientRadial" },
        none: { name: "None", glyph: "gradientNone" },
    },
    "edge.supportScale": { unit: { name: "Unit" }, drawing: { name: "Drawing" } },
    "edge.colorFrom": { none: { name: "Own" }, source: { name: "Source" }, target: { name: "Target" } },
    "edge.bendCurve": {
        corners: { name: "Corners", glyph: "bendCorners" },
        midpoints: { name: "Midpoints", glyph: "bendMidpoints" },
        "midpoints-headroom": { name: "Midpoints, head room", glyph: "bendMidpointsHeadroom" },
        bezier: { name: "Bezier", glyph: "bendBezier" },
        arc: { name: "Arc", glyph: "routeArc" },
    },
    "edge.visible": { true: { name: "Shown", glyph: "show" }, false: { name: "Hidden", glyph: "hide" } },
    ...Object.fromEntries(
        (["arrowHead", "arrowTail", "arrowMiddleHead", "arrowMiddleTail"] as const).map((end) => [
            `edge.${end}Side`,
            {
                left: { name: "Left", glyph: "sideLeft" },
                right: { name: "Right", glyph: "sideRight" },
                "": { name: "Both", glyph: "sideBoth" },
            },
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
const FIT_TO_LABEL: readonly Channel[] = [
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
        // "W / H", so the pop-over names no second "Size" under its main value.
        { channel: "node.width", name: "W / H", pair: "node.height", letters: ["W", "H"] },
    ],
    groups: [
        {
            name: "Extents",
            lines: [
                { channel: "node.sizeMode", name: "Mode", rule: "R8f" },
                { channel: "node.depth" },
                { channel: "node.relativeExtents" },
                { channel: "node.planar" },
            ],
        },
        {
            name: "Fit to label",
            lines: [
                { channel: "node.labelFit", name: "Fit", rule: "R8f" },
                {
                    channel: "node.labelPaddingX",
                    name: "Padding",
                    pair: "node.labelPaddingY",
                    letters: ["X", "Y"],
                    sides: true,
                },
                { channel: "node.labelFitSquare" },
                { channel: "node.labelFitQuantum" },
            ],
        },
        {
            // Fitting to a picture's own size is rarer: its two lines are a group of their own, so Fit to label
            // stays within six lines with its padding's sides apart (owner's input rules, 2026-11-23).
            name: "Fit image",
            lines: [{ channel: "node.labelFitImage" }, { channel: "node.labelFitImagePadding" }],
        },
    ],
};

/** A Finish's Shading (ia-design 2): Smooth, Flat or Unlit, each writing both of its channels. */
const SHADING: readonly LineChoice[] = [
    { name: "Smooth", writes: { "node.flat": false, "node.unlit": false } },
    { name: "Flat", writes: { "node.flat": true, "node.unlit": false } },
    { name: "Unlit", writes: { "node.flat": false, "node.unlit": true } },
];

/**
 * The Shape row while a shader draws in the shapes' place (design 7.1, "replace shader"): its
 * parameters stay the Shaders section's row's; the pop-over holds its Rotation.
 */
export const SHAPE_REPLACE_RUBRIC: ThingRubric = {
    main: [{ channel: "node.shapeRotation", name: "Rotation" }],
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
        main: [{ channel: "node.shapeRotation", name: "Rotation" }],
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
                ],
            },
            {
                name: "Inner lines",
                lines: [
                    { channel: "node.shapeLines", name: "Inner lines", rule: "R15" },
                    { channel: "node.shapeLineWidth", name: "Inner line width" },
                    { channel: "node.shapeLineHaloColor", name: "Inner line backing" },
                    { channel: "node.shapeLineHaloWidth", name: "Inner line backing width" },
                ],
            },
        ],
    },
    "shape:node.model": {
        main: [
            // The shape drawn while the model loads or if it fails. Not a second path: a shape picked in the row's
            // drop-down replaces the model, this line sets the shape under it (owner, 2026-11-25). Advanced: never a
            // line under the row (owner, 2026-11-27).
            { channel: "node.shape", name: "Fallback shape", rule: "R10", advanced: true },
            // Four choices: grouped buttons (owner's input rules: fewer than six options).
            { channel: "node.modelTint", name: "Tint", rule: "R8f" },
            { channel: "node.modelFit", name: "Fit", rule: "R8f" },
            { channel: "node.modelCenter", name: "Center", rule: "R8" },
        ],
        groups: [
            {
                name: "Orient",
                lines: [
                    { channel: "node.shapeRotation", name: "Rotation" },
                    { channel: "node.modelSourceUp", name: "Up", rule: "R9" },
                    { channel: "node.modelTurn", name: "Turn" },
                    { channel: "node.modelDoubleSided", name: "Double sided", rule: "R8f" },
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
        ],
    },
    fill: { main: [] },
    // Shading only, no settings (ia-design 2): a value list like the Shape, Pattern and Visible rows'.
    finish: { row: { channel: "node.flat", name: "Shading", rule: "R8", choices: SHADING }, main: [] },
    "fill:node.gradientColors": {
        // The row's gradient bar edits the colors and their stops: one home for both (design 2.6).
        // ...and its Linear or Radial is the Fill's tab strip (MemberMenu.tsx).
        rowOwns: ["node.gradientStops", "node.gradientKind"],
        // Each line appears for the gradient kind that draws it.
        main: [
            { channel: "node.gradientDirection", name: "Direction", zeroAt: "right" },
            { channel: "node.gradientCenterX", name: "Center", pair: "node.gradientCenterY", letters: ["X", "Y"] },
            { channel: "node.gradientRadius", name: "Radius" },
            { channel: "node.opacity", name: "Opacity" },
        ],
    },
    image: {
        // The row picks the picture (compact-mantine's ImagePicker), in whichever place the layer holds it.
        row: { channel: "node.image", name: "Image", rule: "R16", units: ["node.texture"] },
        // On node places the picture on the node, Wrapped wraps it over the 3D surface: the value moves between the two.
        strip: {
            channel: "node.image",
            name: null,
            rule: "R8",
            unit: [
                ["On node", "node.image"],
                ["Wrapped", "node.texture"],
            ],
        },
        common: [{ channel: "node.imageOpacity", name: "Opacity" }],
        main: [
            { channel: "node.imageFit", name: "Fit", rule: "R8f" },
            { channel: "node.imageFallback", name: "Fallback", rule: "R16" },
        ],
        groups: [
            {
                name: "Picture size",
                lines: [
                    {
                        channel: "node.imageWidth",
                        name: "Size",
                        pair: "node.imageHeight",
                        letters: ["W", "H"],
                    },
                    // A modifier is a checkbox line of its own (design 2.6, E674), never a toggle beside a line.
                    { channel: "node.imageAspect", name: "Node takes picture shape" },
                    { channel: "node.imagePixelSize", name: "Pixel size" },
                    { channel: "node.imageAutoSize", name: "Auto size", rule: "R8f" },
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
        main: [{ channel: "node.pieHole", name: "Hole" }],
        groups: [
            {
                name: "Disc",
                lines: [
                    { channel: "node.pieRadius", name: "Radius" },
                    { channel: "node.pieRotation", name: "Rotation" },
                    { channel: "node.pieFitBox" },
                    { channel: "node.pieOffsetX", name: "Offset", pair: "node.pieOffsetY", letters: ["X", "Y"] },
                ],
            },
        ],
    },
    stripes: {
        // The stripe list (colors, shares, opacities) is the list editor's (stripes design 3.1, `colorItems.tsx`).
        rowOwns: ["node.stripeColors", "node.stripeSizes", "node.stripeOpacities"],
        main: [{ channel: "node.stripeDirection", name: "Direction", rule: "R8" }],
        // Scale and the band frame are rarer than the list: the Stripe area group (stripes design 5). Scale, never
        // "Size": "Share" is a band's width.
        groups: [
            {
                name: "Stripe area",
                lines: [
                    { channel: "node.stripeSize", name: "Scale" },
                    { channel: "node.stripeFrame", name: "Band frame", rule: "R17" },
                ],
            },
        ],
    },
    chart: {
        // Five kinds as grouped icon buttons (140 px): the row holds the data picker, so the Kind is the pop-over's
        // first line in both modes (tmp/entries-first/spec.md 2.3), where a full-width line has room.
        row: { channel: "node.chartKind", name: "Kind", rule: "R8f" },
        rowOwns: ["node.chartValues", "node.chartColors"],
        main: [{ channel: "node.chartLineWidth", name: "Line width" }],
        groups: [
            {
                name: "Axis",
                lines: [
                    { channel: "node.chartMin", name: "Range", pair: "node.chartMax" },
                    { channel: "node.chartHorizontal" },
                ],
            },
            {
                name: "Border",
                lines: [
                    { channel: "node.chartBorderColor", name: "Border" },
                    { channel: "node.chartBorderWidth", name: "Border width" },
                ],
            },
            {
                name: "Background",
                lines: [
                    { channel: "node.chartBackgroundColor", name: "Background" },
                    { channel: "node.chartBackgroundOpacity", name: "Background opacity" },
                ],
            },
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
        ],
    },
    border: {
        // Width and its unit on one line, so a wave's line keeps the pop-over 6 rows tall.
        common: [
            { channel: "node.borderWidth", name: "Width", units: ["node.borderScreenWidth"], unitBeside: BORDER_UNIT },
        ],
        main: [
            { channel: "node.borderOpacity", name: "Opacity" },
            { channel: "node.borderStyle", name: "Style", rule: "R10" },
            { channel: "node.borderPosition", name: "Position", rule: "R8" },
            // Drawn for a zigzag or sine wave border only: it appears for them.
            { channel: "node.borderWaveAmplitude", name: "Wave", pair: "node.borderWavePeriod" },
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
    visibility: { row: { channel: "node.visible", name: "Visibility", rule: "R8" }, main: [] },
    // On or Off on the row; the low mesh detail it writes is the row's (graphty-element's need).
    wireframe: {
        row: { channel: "node.wireframe", name: "Wireframe", rule: "R8" },
        rowOwns: ["node.meshDetail"],
        main: [],
    },
    // The Label row's Glyph kind (kindGroups.ts).
    "label:node.glyph": {
        common: [
            { channel: "node.glyphSize", name: "Size" },
            { channel: "node.glyphColor", name: "Color" },
        ],
        // The font and one Weight line (Regular, Bold or any weight) in Letters, so the pop-over stays 6 lines tall
        // under its tabs: a Bold toggle as well would be a second path to the weight (owner, 2026-11-27, #10380).
        main: [],
        groups: [
            {
                name: "Letters",
                lines: [
                    { channel: "node.glyphFont", name: "Font", rule: "R13" },
                    // A drop-down of named weights or a typed number, as a label's Weight (R5b): graphty-element
                    // names no values for this number channel, so the panel names the CSS weights.
                    {
                        channel: "node.glyphWeight",
                        name: "Weight",
                        rule: "R5b",
                        presets: [
                            { id: "100", plainName: "Thin" },
                            { id: "200", plainName: "Extra light" },
                            { id: "300", plainName: "Light" },
                            { id: "400", plainName: "Regular" },
                            { id: "500", plainName: "Medium" },
                            { id: "600", plainName: "Semi bold" },
                            { id: "700", plainName: "Bold" },
                            { id: "800", plainName: "Extra bold" },
                            { id: "900", plainName: "Black" },
                        ],
                    },
                ],
            },
        ],
    },
    record: {
        // The fields are the list editor's (R15, `ItemList.tsx`), under Main.
        rowOwns: ["node.shapeTexts"],
        main: [{ channel: "node.labelTable", name: "Table", rule: "field" }],
        // graphty-element draws a record's words, its table's and its fields', in the node's label letters: the
        // Text group edits those. Size is the letters' own height (`letterSize`), which a table shrunk to fit its
        // node scales with it; a screen size would not follow the node.
        groups: [
            {
                name: "Text",
                lines: [
                    { channel: "node.labelColor", name: "Color" },
                    { channel: "node.labelLetterSize", name: "Size" },
                    { channel: "node.labelFont", name: "Font", rule: "R13" },
                ],
            },
        ],
    },
};

/**
 * An edge line's groups (design 7.2): its shape, and its blending and fade. `edge.opacity` draws only while Blending is
 * on, so a gradient's or strands' opacity sits with it; a solid line's is its color's "%".
 * @param opacity - whether the line's own opacity is a line here.
 * @returns the groups.
 */
function lineGroups(opacity: boolean): readonly SubGroup[] {
    return [
        {
            name: "Shape",
            lines: [
                { channel: "edge.taper", name: "Taper" },
                { channel: "edge.taperSource", name: "Source taper" },
                { channel: "edge.minScreenWidth", name: "Min width" },
                // Lift draws only in 3D: dimmed in 2D from graphty-element's view fact, like every one-view line.
                { channel: "edge.lift", name: "Lift" },
            ],
        },
        {
            name: "Blend and fade",
            lines: [
                { channel: "edge.blending" },
                ...(opacity ? [{ channel: "edge.opacity", name: "Opacity" } as const] : []),
                { channel: "edge.fadeStart", name: "Fade", pair: "edge.fadeEnd" },
                { channel: "edge.fadeOpacity", name: "Fade opacity" },
            ],
        },
    ];
}

/** Every channel of an edge's Pattern row (ia-design 2: it leaves the Line pop-over, so "dashed" shows in "+"). */
export const PATTERN_CHANNELS: readonly Channel[] = [
    "edge.style",
    "edge.patternCount",
    "edge.dashLength",
    "edge.dashGap",
    "edge.waveAmplitude",
    "edge.wavePeriod",
    "edge.dashArray",
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
            // Named, not a bare swatch: an open cap's pop-over draws its Fill color too.
            { channel: at("Color"), name: "Cap color" },
        ],
        // The Outline appears for an open cap, the Image for the image cap.
        main: [
            { channel: at("FillColor"), name: "Fill" },
            { channel: at("OutlineWidth"), name: "Outline" },
            { channel: at("Image"), name: "Image", rule: "R16" },
        ],
        groups: [
            {
                name: "Cap",
                lines: [
                    { channel: at("Width"), name: "Width" },
                    { channel: at("Opacity"), name: "Opacity" },
                    { channel: at("Side"), name: "Side", rule: "R8" },
                    { channel: at("Position"), name: "Position" },
                    ...(middle
                        ? []
                        : [
                              { channel: at("Gap"), name: "Gap" },
                              { channel: at("Stack"), name: "Stack", rule: "R15" as const },
                          ]),
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
        // A solid line's color may come from an end node's, in place of its own (graphty-element's `edge.colorFrom`).
        main: [{ channel: "edge.colorFrom", name: "Color from", rule: "R8f" }],
        groups: lineGroups(false),
    },
    "line:edge.gradientColors": {
        common: [{ channel: "edge.width", name: "Width" }],
        rowOwns: ["edge.gradientStops"],
        main: [{ channel: "edge.gradientKind", name: "Kind", rule: "R8" }],
        groups: lineGroups(true),
    },
    // Strands: the row is their colors (`lists.ts`), the pop-over their spacing.
    "line:edge.strandColors": {
        common: [{ channel: "edge.width", name: "Width" }],
        rowOwns: ["edge.strandColors"],
        main: [{ channel: "edge.strandSpacing", name: "Spacing" }],
        groups: lineGroups(true),
    },
    // The row is the sectioned pattern list; its settings the count, and dashes and waves (ia-design 2).
    pattern: {
        row: { channel: "edge.style", name: "Pattern", rule: "R10" },
        // Each line appears for the patterns that draw it.
        main: [
            { channel: "edge.patternCount", name: "Count" },
            { channel: "edge.dashLength", name: "Dash", pair: "edge.dashGap" },
            // Several dash lengths, dashes and gaps alternating ("8 1 2 1"), in place of Dash and Gap.
            { channel: "edge.dashArray", name: "Custom", rule: "R14" },
            { channel: "edge.waveAmplitude", name: "Wave", pair: "edge.wavePeriod" },
        ],
    },
    // The Outline item's rows (kindGroups.ts, C7), by the kind's color: color and Width, then Opacity (ia-design 2).
    "outline:edge.outlineColor": {
        // Scale is the line's widths across (the starting Selected row draws its casing with it), Width past that
        common: [
            { channel: "edge.outlineWidth", name: "Width" },
            { channel: "edge.outlineScale", name: "Scale" },
        ],
        main: [
            { channel: "edge.outlineOpacity", name: "Opacity" },
            { channel: "edge.outlineStyle", name: "Style", rule: "R10" },
        ],
    },
    "outline:edge.overlayColor": {
        // half the band's width either side of the line's middle, whatever the line's width
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
        // Not tabs: Arc and Great circle draw the same lines (owner, 2026-11-24: tabs only where each choice shows
        // different settings). Each line appears for the routes that draw it.
        common: [{ channel: "edge.curvature", name: "Curve" }],
        main: [
            { channel: "edge.arcRadius", name: "Radius" },
            { channel: "edge.arcHeight", name: "Height" },
            { channel: "edge.bundleStrength", name: "Strength" },
            { channel: "edge.bundleIterations", name: "Iterations" },
        ],
        groups: [
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
                    { channel: "edge.bendCurve", name: "Curve", rule: "R8f" },
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
        main: [
            { channel: "edge.supportSpringLength", name: "Spring", pair: "edge.supportSpringConstant" },
            { channel: "edge.supportRepulsion", name: "Forces", pair: "edge.supportCentralGravity" },
            { channel: "edge.supportScale", name: "Scale", rule: "R8" },
            { channel: "edge.supportUnit", name: "Unit size" },
        ],
    },
    visibility: { row: { channel: "edge.visible", name: "Visibility", rule: "R8" }, main: [] },
    // An edge Record is its label table (design 4.2), its rows the list editor's (R15, `ItemList.tsx`).
    record: { rowOwns: ["edge.labelTable"], main: [] },
    // The speed is the row's; the pop-over holds its line, which varies by data, as every main value's does.
    animation: { row: { channel: "edge.animationSpeed", name: "Speed" }, main: [] },
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
 * Every channel a line edits: its own, its pair's, its other units' and its choices'.
 * @param line - the line.
 * @returns the channels.
 */
export function lineChannels(line: LineSpec): readonly Channel[] {
    return [
        line.channel,
        ...(line.pair === undefined ? [] : [line.pair]),
        ...(line.units ?? []),
        ...(line.unit?.map(([, channel]) => channel) ?? []),
        ...(line.choices ?? []).flatMap((choice) => Object.keys(choice.writes) as Channel[]),
    ].filter((channel, at, all) => all.indexOf(channel) === at);
}

/**
 * Every line of a rubric: its row's, its common, main and grouped lines.
 * @param rubric - the rubric.
 * @returns the lines.
 */
export function rubricLines(rubric: ThingRubric): readonly LineSpec[] {
    return [
        ...(rubric.rowOwns ?? []).map((channel): LineSpec => ({ channel })),
        ...(rubric.row === undefined ? [] : [rubric.row]),
        ...(rubric.strip === undefined ? [] : [rubric.strip]),
        ...(rubric.common ?? []),
        ...rubric.main,
        ...(rubric.groups ?? []).flatMap((group) => group.lines),
    ];
}

/**
 * Every channel a rubric's lines edit.
 * @param rubric - the rubric.
 * @returns the channels, once each.
 */
export function rubricChannels(rubric: ThingRubric): readonly Channel[] {
    return [...new Set(rubricLines(rubric).flatMap((line) => lineChannels(line)))];
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
    table: Readonly<Record<string, Readonly<Partial<Record<string, OptionName>>> | undefined>> = OPTION_NAMES,
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

/**
 * The group of settings a line sits in, in either side's rubric: a sidebar line opens it (a band frame opens Stripe
 * area, stripes design 2).
 * @param channel - the line's channel.
 * @returns the group, or undefined when the line is in none.
 */
export function groupOfLine(channel: Channel): SubGroup | undefined {
    return [...Object.values(NODE_RUBRIC), ...Object.values(EDGE_RUBRIC)]
        .flatMap((rubric) => rubric.groups ?? [])
        .find((group) => group.lines.some((line) => line.channel === channel));
}
