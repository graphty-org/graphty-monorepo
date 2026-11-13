/**
 * The Style panel by part of the drawing: which section, item and tier each of graphty-element's
 * style channels sits in. Sections are the parts a reader can point at (a node's Shape, Fill,
 * Border, Text, ...; an edge's Line, Ends, Text, ...). Every channel the element publishes has
 * exactly one home here or a reason it is not offered (`__tests__/parts.test.ts`), so a channel the
 * element adds cannot go missing from the panel unnoticed.
 *
 * Tiers: a `main` channel is drawn in an open section and offered by its "+"; a `tail` channel is
 * drawn once a layer sets it, and otherwise reached from the section's settings page and Find a
 * setting; a `quiet` channel is never a row in the section, even when set (every file load writes
 * them), and is reached only from the settings page and Find a setting. A text item's field
 * channels sit on named pages of its settings page.
 */

import type { Channel } from "@graphty/graphty-element/catalog";

/** How a channel shows in its section. */
export type Tier = "main" | "tail" | "quiet";

/** One thing inside a part a reader names: a fill's gradient, a node's border rings. */
export interface PartItem {
    /** Its id, unique within its part. */
    readonly id: string;
    /** What the panel calls it. */
    readonly name: string;
    /** Its channels drawn by default. */
    readonly main?: readonly Channel[];
    /** Its channels drawn once set. */
    readonly tail?: readonly Channel[];
    /** Its channels never drawn as a row of the section. */
    readonly quiet?: readonly Channel[];
    /** Its settings page's channels, by page name, for a text item. */
    readonly pages?: Readonly<Record<string, readonly Channel[]>>;
}

/** One part of the drawing: one section of the panel. */
export interface PartSpec {
    /** Its id, unique within its kind. */
    readonly id: string;
    /** The section's title. */
    readonly title: string;
    /** Whether the section is a list: one row per item a layer sets (a fill's paints, the effects). */
    readonly list?: boolean;
    /** Its items, in order. */
    readonly items: readonly PartItem[];
    /** Whether its items' main channels draw together: once one is set, the others show too. */
    readonly together?: boolean;
}

/** The sections of each kind, in the order the panel draws them. */
export const PARTS: Readonly<Record<"node" | "edge", readonly PartSpec[]>> = {
    node: [
        {
            id: "shape",
            title: "Shape",
            items: [
                {
                    id: "shape",
                    name: "Shape",
                    main: ["node.shape", "node.size", "node.width", "node.height", "node.cornerRadius"],
                    tail: [
                        "node.depth",
                        "node.relativeExtents",
                        "node.planar",
                        "node.exactCornerRadius",
                        "node.cornerFraction",
                        "node.shapePoints",
                        "node.shapeStretchPoints",
                        "node.shapeRotation",
                        "node.shapeParts",
                        "node.wireframe",
                        "node.unlit",
                    ],
                    quiet: ["node.sizeMode"],
                },
                {
                    id: "model",
                    name: "Model",
                    tail: [
                        "node.model",
                        "node.modelSourceUp",
                        "node.modelTurn",
                        "node.modelTint",
                        "node.modelFit",
                        "node.modelCenter",
                    ],
                },
            ],
        },
        {
            id: "fill",
            title: "Fill",
            list: true,
            items: [
                { id: "solid", name: "Solid", main: ["node.color", "node.opacity"] },
                {
                    id: "gradient",
                    name: "Gradient",
                    main: ["node.gradientKind", "node.gradientColors", "node.gradientStops", "node.gradientDirection"],
                    tail: ["node.gradientColor", "node.gradientCenterX", "node.gradientCenterY", "node.gradientRadius"],
                },
                {
                    id: "image",
                    name: "Image",
                    main: ["node.image", "node.imageFit"],
                    tail: [
                        "node.imageFallback",
                        "node.imageWidth",
                        "node.imageHeight",
                        "node.imagePixelSize",
                        "node.imagePositionX",
                        "node.imagePositionY",
                        "node.imageOffsetX",
                        "node.imageOffsetY",
                        "node.imageRepeat",
                        "node.imageClip",
                        "node.imageSmoothing",
                        "node.imageAutoSize",
                        "node.imageOpacity",
                    ],
                },
                { id: "picture", name: "Picture", main: ["node.texture"] },
                {
                    id: "pie",
                    name: "Pie",
                    main: ["node.pieColors", "node.pieSizes"],
                    tail: [
                        "node.pieOpacities",
                        "node.pieRadius",
                        "node.pieHole",
                        "node.pieRotation",
                        "node.pieFitBox",
                        "node.pieOffsetX",
                        "node.pieOffsetY",
                    ],
                },
                {
                    id: "stripes",
                    name: "Stripes",
                    main: ["node.stripeColors", "node.stripeSizes"],
                    tail: ["node.stripeOpacities", "node.stripeDirection", "node.stripeSize", "node.stripeFrame"],
                },
                {
                    id: "chart",
                    name: "Chart",
                    main: ["node.chartKind", "node.chartValues", "node.chartColors"],
                    tail: [
                        "node.chartMin",
                        "node.chartMax",
                        "node.chartHorizontal",
                        "node.chartSize",
                        "node.chartWidth",
                        "node.chartHeight",
                        "node.chartOffsetX",
                        "node.chartOffsetY",
                        "node.chartMargin",
                        "node.chartGap",
                        "node.chartLineWidth",
                        "node.chartBorderColor",
                        "node.chartBorderWidth",
                    ],
                },
            ],
        },
        {
            id: "border",
            title: "Border",
            items: [
                {
                    id: "border",
                    name: "Border",
                    main: ["node.borderColor", "node.borderOpacity", "node.borderWidth", "node.borderStyle"],
                    tail: [
                        "node.borderPosition",
                        "node.borderScreenWidth",
                        "node.borderWaveAmplitude",
                        "node.borderWavePeriod",
                    ],
                },
                {
                    id: "rings",
                    name: "Rings",
                    tail: [
                        "node.outerBorderCount",
                        "node.outerBorderColor",
                        "node.outerBorderWidth",
                        "node.outerBorderOpacity",
                        "node.outerBorderStyle",
                        "node.outerBorderOffset",
                    ],
                },
                {
                    id: "raised",
                    name: "Raised edge",
                    tail: ["node.raisedBorderWidth", "node.raisedBorderLightColor", "node.raisedBorderDarkColor"],
                },
                { id: "outline", name: "Outline", tail: ["node.outline"] },
                {
                    id: "innerLines",
                    name: "Inner lines",
                    tail: [
                        "node.shapeLines",
                        "node.shapeLineWidth",
                        "node.shapeLineHaloColor",
                        "node.shapeLineHaloWidth",
                    ],
                },
            ],
        },
        {
            id: "text",
            title: "Text",
            items: [
                {
                    id: "label",
                    name: "Label",
                    main: ["node.label", "node.labelSize", "node.labelFont", "node.labelLocation"],
                    tail: [
                        "node.labelStyle",
                        "node.labelDeclutter",
                        "node.labelMinNodeScreenSize",
                        "node.labelFit",
                        "node.labelPaddingX",
                        "node.labelPaddingY",
                        "node.labelFitSquare",
                        "node.labelFitQuantum",
                        "node.labelFitImage",
                        "node.labelFitImagePadding",
                    ],
                    pages: {
                        Type: [
                            "node.labelWeight",
                            "node.labelItalic",
                            "node.labelLetterSize",
                            "node.labelLineHeight",
                            "node.labelTextAlign",
                            "node.labelRunAlign",
                            "node.labelOpacity",
                            "node.labelColor",
                            "node.labelOutline",
                            "node.labelOutlineWidth",
                            "node.labelOutlineOpacity",
                        ],
                        Box: [
                            "node.labelBackground",
                            "node.labelBackgroundOpacity",
                            "node.labelBorder",
                            "node.labelBorderWidth",
                            "node.labelBorderOpacity",
                            "node.labelCornerRadius",
                            "node.labelPadding",
                            "node.labelBox",
                        ],
                        Place: [
                            "node.labelOffsetX",
                            "node.labelOffsetY",
                            "node.labelShiftX",
                            "node.labelShiftY",
                            "node.labelShiftOf",
                            "node.labelGapOf",
                            "node.labelRotation",
                            "node.labelOnTop",
                        ],
                        Wrap: [
                            "node.labelWrapWidth",
                            "node.labelWrapTrailingSpace",
                            "node.labelWrapEllipsis",
                            "node.labelWrapAnywhere",
                            "node.labelWrapSpaceCount",
                        ],
                        View: ["node.labelMinScreenSize"],
                    },
                },
                {
                    id: "tooltip",
                    name: "Tooltip",
                    main: ["node.tooltip"],
                    tail: ["node.tooltipStyle", "node.tooltipSize", "node.tooltipColor", "node.tooltipBackground"],
                },
                {
                    id: "xlabel",
                    name: "External label",
                    main: ["node.xlabel"],
                    tail: ["node.xlabelStyle", "node.xlabelLocation", "node.xlabelOffsetX", "node.xlabelOffsetY"],
                },
                {
                    id: "glyph",
                    name: "Glyph",
                    main: ["node.glyph"],
                    tail: ["node.glyphFont", "node.glyphSize", "node.glyphWeight", "node.glyphColor"],
                },
                { id: "record", name: "Record", tail: ["node.shapeTexts", "node.labelTable"] },
            ],
        },
        {
            id: "effects",
            title: "Effects",
            list: true,
            items: [
                {
                    id: "shadow",
                    name: "Drop shadow",
                    main: [
                        "node.shadowColor",
                        "node.shadowOpacity",
                        "node.shadowBlur",
                        "node.shadowOffsetX",
                        "node.shadowOffsetY",
                    ],
                },
                { id: "glow", name: "Glow", main: ["node.glow", "node.glowStrength"] },
                {
                    id: "halo",
                    name: "Halo",
                    main: ["node.halo", "node.haloColor", "node.haloScale", "node.haloOpacity"],
                },
                {
                    id: "underlay",
                    name: "Underlay",
                    main: [
                        "node.underlayColor",
                        "node.underlayOpacity",
                        "node.underlayPadding",
                        "node.underlayShape",
                        "node.underlayCornerRadius",
                    ],
                },
                {
                    id: "overlay",
                    name: "Overlay",
                    main: [
                        "node.overlayColor",
                        "node.overlayOpacity",
                        "node.overlayPadding",
                        "node.overlayShape",
                        "node.overlayCornerRadius",
                    ],
                },
            ],
        },
        {
            id: "order",
            title: "Order and groups",
            items: [
                { id: "order", name: "Order", tail: ["node.zIndex"], quiet: ["node.drawOrder"] },
                {
                    id: "group",
                    name: "Group",
                    tail: [
                        "node.groupPadding",
                        "node.groupPaddingRatio",
                        "node.groupPaddingOf",
                        "node.groupMinWidth",
                        "node.groupMinHeight",
                        "node.groupMinWidthBiasLeft",
                        "node.groupMinHeightBiasTop",
                        "node.groupIncludeLabels",
                    ],
                },
            ],
        },
        { id: "visibility", title: "Visibility", items: [{ id: "visible", name: "Show", main: ["node.visible"] }] },
        { id: "shaders", title: "Shaders", items: [{ id: "shaders", name: "Shaders", main: ["node.shaders"] }] },
    ],
    edge: [
        {
            id: "line",
            title: "Line",
            items: [
                {
                    id: "line",
                    name: "Line",
                    main: ["edge.color", "edge.opacity", "edge.width", "edge.style"],
                    tail: [
                        "edge.minScreenWidth",
                        "edge.patternCount",
                        "edge.animationSpeed",
                        "edge.waveAmplitude",
                        "edge.wavePeriod",
                        "edge.dashLength",
                        "edge.dashGap",
                        "edge.taper",
                        "edge.lift",
                        "edge.fadeStart",
                        "edge.fadeEnd",
                        "edge.fadeOpacity",
                        "edge.blending",
                    ],
                },
                {
                    id: "gradient",
                    name: "Gradient",
                    tail: ["edge.gradientKind", "edge.gradientColors", "edge.gradientStops"],
                },
                { id: "band", name: "Band", tail: ["edge.bandColor", "edge.bandWidth", "edge.bandOpacity"] },
                {
                    id: "outline",
                    name: "Outline",
                    tail: ["edge.outlineColor", "edge.outlineWidth", "edge.outlineOpacity", "edge.outlineStyle"],
                },
            ],
        },
        {
            id: "ends",
            title: "Ends",
            together: true,
            items: [
                {
                    id: "target",
                    name: "Target end",
                    main: ["edge.arrowHead", "edge.arrowHeadSize"],
                    tail: [
                        "edge.arrowHeadWidth",
                        "edge.arrowHeadSide",
                        "edge.arrowHeadOutlineWidth",
                        "edge.arrowHeadPosition",
                        "edge.arrowHeadColor",
                        "edge.arrowHeadOpacity",
                        "edge.arrowHeadImage",
                        "edge.arrowHeadGap",
                        "edge.arrowHeadStack",
                    ],
                },
                {
                    id: "source",
                    name: "Source end",
                    main: ["edge.arrowTail", "edge.arrowTailSize"],
                    tail: [
                        "edge.arrowTailWidth",
                        "edge.arrowTailSide",
                        "edge.arrowTailOutlineWidth",
                        "edge.arrowTailPosition",
                        "edge.arrowTailColor",
                        "edge.arrowTailOpacity",
                        "edge.arrowTailImage",
                        "edge.arrowTailGap",
                        "edge.arrowTailStack",
                    ],
                },
                {
                    id: "middleTarget",
                    name: "Middle target end",
                    tail: [
                        "edge.arrowMiddleHead",
                        "edge.arrowMiddleHeadSize",
                        "edge.arrowMiddleHeadWidth",
                        "edge.arrowMiddleHeadSide",
                        "edge.arrowMiddleHeadOutlineWidth",
                        "edge.arrowMiddleHeadPosition",
                        "edge.arrowMiddleHeadColor",
                        "edge.arrowMiddleHeadOpacity",
                        "edge.arrowMiddleHeadImage",
                    ],
                },
                {
                    id: "middleSource",
                    name: "Middle source end",
                    tail: [
                        "edge.arrowMiddleTail",
                        "edge.arrowMiddleTailSize",
                        "edge.arrowMiddleTailWidth",
                        "edge.arrowMiddleTailSide",
                        "edge.arrowMiddleTailOutlineWidth",
                        "edge.arrowMiddleTailPosition",
                        "edge.arrowMiddleTailColor",
                        "edge.arrowMiddleTailOpacity",
                        "edge.arrowMiddleTailImage",
                    ],
                },
            ],
        },
        {
            id: "text",
            title: "Text",
            items: [
                {
                    id: "label",
                    name: "Label",
                    main: ["edge.label", "edge.labelSize", "edge.labelFont"],
                    tail: ["edge.labelStyle", "edge.labelTable"],
                    pages: {
                        Type: [
                            "edge.labelWeight",
                            "edge.labelItalic",
                            "edge.labelLetterSize",
                            "edge.labelLineHeight",
                            "edge.labelTextAlign",
                            "edge.labelRunAlign",
                            "edge.labelOpacity",
                            "edge.labelColor",
                            "edge.labelOutline",
                            "edge.labelOutlineWidth",
                            "edge.labelOutlineOpacity",
                        ],
                        Box: [
                            "edge.labelBackground",
                            "edge.labelBackgroundOpacity",
                            "edge.labelBorder",
                            "edge.labelBorderWidth",
                            "edge.labelBorderOpacity",
                            "edge.labelCornerRadius",
                            "edge.labelPadding",
                            "edge.labelBox",
                        ],
                        Place: [
                            "edge.labelLocation",
                            "edge.labelOffsetX",
                            "edge.labelOffsetY",
                            "edge.labelShiftX",
                            "edge.labelShiftY",
                            "edge.labelShiftOf",
                            "edge.labelGapOf",
                            "edge.labelRotation",
                            "edge.labelOnTop",
                        ],
                        Wrap: [
                            "edge.labelWrapWidth",
                            "edge.labelWrapTrailingSpace",
                            "edge.labelWrapEllipsis",
                            "edge.labelWrapAnywhere",
                            "edge.labelWrapSpaceCount",
                        ],
                        View: ["edge.labelMinScreenSize"],
                    },
                },
                {
                    id: "targetCaption",
                    name: "Target caption",
                    main: ["edge.arrowHeadText"],
                    tail: [
                        "edge.arrowHeadTextStyle",
                        "edge.arrowHeadTextSize",
                        "edge.arrowHeadTextLetterSize",
                        "edge.arrowHeadTextFont",
                        "edge.arrowHeadTextColor",
                        "edge.arrowHeadTextWeight",
                        "edge.arrowHeadTextOpacity",
                        "edge.arrowHeadTextDistance",
                        "edge.arrowHeadTextRotation",
                        "edge.arrowHeadTextOffsetX",
                        "edge.arrowHeadTextOffsetY",
                        "edge.arrowHeadTextBackground",
                    ],
                },
                {
                    id: "sourceCaption",
                    name: "Source caption",
                    main: ["edge.arrowTailText"],
                    tail: [
                        "edge.arrowTailTextStyle",
                        "edge.arrowTailTextSize",
                        "edge.arrowTailTextLetterSize",
                        "edge.arrowTailTextFont",
                        "edge.arrowTailTextColor",
                        "edge.arrowTailTextWeight",
                        "edge.arrowTailTextOpacity",
                        "edge.arrowTailTextDistance",
                        "edge.arrowTailTextRotation",
                        "edge.arrowTailTextOffsetX",
                        "edge.arrowTailTextOffsetY",
                        "edge.arrowTailTextBackground",
                    ],
                },
                {
                    id: "xlabel",
                    name: "External label",
                    main: ["edge.xlabel"],
                    tail: ["edge.xlabelStyle", "edge.xlabelLocation", "edge.xlabelOffsetX", "edge.xlabelOffsetY"],
                },
            ],
        },
        {
            id: "route",
            title: "Route",
            items: [
                {
                    id: "route",
                    name: "Route",
                    main: ["edge.curvature"],
                    tail: [
                        "edge.route",
                        "edge.arcHeight",
                        "edge.bends",
                        "edge.bendCurve",
                        "edge.sourcePort",
                        "edge.targetPort",
                        "edge.fanned",
                        "edge.fanSpacing",
                        "edge.arcRadius",
                        "edge.nodeGap",
                        "edge.sourceNodeGap",
                        "edge.targetNodeGap",
                    ],
                },
                {
                    id: "support",
                    name: "Bundling",
                    tail: [
                        "edge.supportModel",
                        "edge.supportSpringLength",
                        "edge.supportSpringConstant",
                        "edge.supportRepulsion",
                        "edge.supportCentralGravity",
                        "edge.supportUnit",
                        "edge.supportScale",
                    ],
                },
            ],
        },
        {
            id: "effects",
            title: "Effects",
            list: true,
            items: [
                {
                    id: "underlay",
                    name: "Underlay",
                    main: ["edge.underlayColor", "edge.underlayOpacity", "edge.underlayPadding"],
                },
                {
                    id: "overlay",
                    name: "Overlay",
                    main: ["edge.overlayColor", "edge.overlayOpacity", "edge.overlayPadding"],
                },
            ],
        },
        { id: "visibility", title: "Visibility", items: [{ id: "visible", name: "Show", main: ["edge.visible"] }] },
        { id: "shaders", title: "Shaders", items: [{ id: "shaders", name: "Shaders", main: ["edge.shaders"] }] },
    ],
};

/** The channels the panel offers nowhere, and why. */
export const NOT_OFFERED: Readonly<Partial<Record<Channel, string>>> = {
    "node.meshDetail": "written by the Wireframe row with the wireframe",
    "node.flat": "nothing draws it; the graph's flat lighting gives the look",
    "node.marker": "graphty-element refuses it",
};

/** Row words that replace a channel's short name where the short name does not read as a word label. */
export const PART_WORDS: Readonly<Partial<Record<Channel, string>>> = {
    "node.outerBorderCount": "Ring count",
    "node.drawOrder": "Draw order",
    "node.zIndex": "Stacking",
    "node.cornerRadius": "Corner",
    "node.underlayCornerRadius": "Corner",
    "node.overlayCornerRadius": "Corner",
    "edge.arrowHead": "Target",
    "edge.arrowHeadSize": "Size",
    "edge.arrowTail": "Source",
    "edge.arrowTailSize": "Size",
};

/** Where one channel sits in the panel. */
export interface PartHome {
    /** Nodes or edges. */
    readonly side: "node" | "edge";
    /** The part's id. */
    readonly part: string;
    /** The item's id. */
    readonly item: string;
    /** How it shows. */
    readonly tier: Tier;
    /** The settings page it sits on, for a text item's field channel. */
    readonly page?: string;
}

/** Every home, by channel, built once. */
const HOMES: ReadonlyMap<Channel, PartHome> = new Map(
    (["node", "edge"] as const).flatMap((side) =>
        PARTS[side].flatMap((part) =>
            part.items.flatMap((item) => [
                ...(["main", "tail", "quiet"] as const).flatMap((tier) =>
                    (item[tier] ?? []).map((channel): [Channel, PartHome] => [
                        channel,
                        { side, part: part.id, item: item.id, tier },
                    ]),
                ),
                ...Object.entries(item.pages ?? {}).flatMap(([page, channels]) =>
                    channels.map((channel): [Channel, PartHome] => [
                        channel,
                        { side, part: part.id, item: item.id, tier: "tail", page },
                    ]),
                ),
            ]),
        ),
    ),
);

/**
 * Where a channel sits in the panel, or why the panel does not offer it.
 * @param channel - any channel graphty-element publishes.
 * @returns its home, or the reason; undefined for a channel the map does not know.
 */
export function homeOf(channel: Channel): PartHome | { readonly notOffered: string } | undefined {
    const home = HOMES.get(channel);
    if (home !== undefined) {
        return home;
    }
    const reason = NOT_OFFERED[channel];
    return reason === undefined ? undefined : { notOffered: reason };
}

/**
 * Every channel of one part, in the order its items list them (main, tail, quiet, then pages).
 * @param part - the part.
 * @returns the channels.
 */
export function partChannels(part: PartSpec): readonly Channel[] {
    return part.items.flatMap(itemChannels);
}

/**
 * Every channel of one item, main first.
 * @param item - the item.
 * @returns the channels.
 */
export function itemChannels(item: PartItem): readonly Channel[] {
    return [
        ...(item.main ?? []),
        ...(item.tail ?? []),
        ...(item.quiet ?? []),
        ...Object.values(item.pages ?? {}).flat(),
    ];
}
