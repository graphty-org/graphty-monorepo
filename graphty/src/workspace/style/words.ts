/**
 * The Style tab's presentation: which sections it draws, in what order, what each line and
 * refusal is called. graphty-element publishes the channels as neutral facts (`channelsFor`,
 * each with its `group`); arranging and naming them is the app's (CLAUDE.md, "graphty-element is
 * neutral about presentation"; the owner dropped `catalog.channelGroups` on 2026-10-03).
 */

import { type AlignmentMatrixValue, colorWord } from "@graphty/compact-mantine";
import {
    type ChannelDescriptor,
    EDGE_ARROW_DESCRIPTORS,
    EDGE_LINE_DESCRIPTORS,
    type GlyphDescriptor,
    type KNOWN_PALETTE_IDS,
    NODE_SHAPE_DESCRIPTORS,
    toColorValue,
} from "@graphty/graphty-element/catalog";
import type { Channel, LabelStyle } from "@graphty/graphty-element/schema";
import {
    type CodedFact,
    type GraphSession,
    GraphtyError,
    type GraphtyErrorCode,
    type ReadableValue,
} from "@graphty/graphty-element/session";

import { wordsFor } from "../analyze/words";
import { formatNumber } from "../inspector/words";
import { runName } from "../runWords";

/** Where a label sits, as the element names it. */
type LabelLocation = NonNullable<LabelStyle["location"]>;

/** Nodes or edges: the two groups of the Style tab. */
type Kind = "node" | "edge";

/**
 * One section of a group (the owner's style panel design, 2026-10-13): its title, and the
 * properties it holds in the order its "+" menu lists them. A section the layer does not write is
 * its dimmed title and "+"; one it writes lists only the properties the layer sets.
 */
export interface SectionSpec {
    /** Stable id, used in test ids. */
    readonly id: string;
    /** The heading word. */
    readonly title: string;
    /** Its properties, in menu order. */
    readonly channels: readonly Channel[];
}

/**
 * One kind of text a Text list entry draws: its words, its look, and the look's three channels a
 * value can vary (size, text color, background). A label, a node's tooltip and an edge's two end
 * captions are the same entry, each on its own channels (tier3 design, section 2.3).
 */
export interface TextKindSpec {
    /** Stable id. */
    readonly id: string;
    /** Its name in the "+" menu and on its entry's controls ("Label", "Tooltip"). */
    readonly name: string;
    readonly words: Channel;
    readonly style: Channel;
    readonly size: Channel;
    readonly color: Channel;
    readonly background: Channel;
}

/**
 * A text kind on its channels, named the element's way: `<base>`, `<base>Style`, `<base>Size`,
 * `<base>Color`, `<base>Background`.
 * @param id - stable id.
 * @param name - its name.
 * @param base - its words channel.
 * @returns the kind.
 */
function textKind(id: string, name: string, base: Channel): TextKindSpec {
    const at = (suffix: string): Channel => `${base}${suffix}` as Channel;
    return {
        id,
        name,
        words: base,
        style: at("Style"),
        size: at("Size"),
        color: at("Color"),
        background: at("Background"),
    };
}

/** The kinds of text each group's Text list adds, in its "+" menu's order. */
export const TEXT_KINDS: Readonly<Record<Kind, readonly TextKindSpec[]>> = {
    node: [textKind("label", "Label", "node.label"), textKind("tooltip", "Tooltip", "node.tooltip")],
    edge: [
        textKind("label", "Label", "edge.label"),
        textKind("head", "Label at target end", "edge.arrowHeadText"),
        textKind("tail", "Label at source end", "edge.arrowTailText"),
    ],
};

/**
 * Every channel of a group's text kinds.
 * @param kind - nodes or edges.
 * @returns the channels.
 */
function textChannels(kind: Kind): Channel[] {
    return TEXT_KINDS[kind].flatMap((t) => [t.words, t.style, t.size, t.color, t.background]);
}

/**
 * Each group's sections, in their fixed order. Every property sits under the kind graphty-element
 * draws it on and the section it belongs to; the Text section's entries are label entries.
 */
export const SECTIONS: Readonly<Record<Kind, readonly SectionSpec[]>> = {
    node: [
        { id: "shape", title: "Shape", channels: ["node.shape", "node.size"] },
        { id: "visibility", title: "Visibility", channels: ["node.visible"] },
        { id: "text", title: "Text", channels: textChannels("node") },
        { id: "fill", title: "Fill", channels: ["node.color", "node.opacity"] },
        {
            id: "effects",
            title: "Effects",
            channels: [
                "node.outline",
                "node.glow",
                "node.glowStrength",
                "node.haloColor",
                "node.haloScale",
                "node.haloOpacity",
            ],
        },
        { id: "rendering", title: "Rendering", channels: ["node.wireframe"] },
    ],
    edge: [
        { id: "visibility", title: "Visibility", channels: ["edge.visible"] },
        { id: "text", title: "Text", channels: textChannels("edge") },
        {
            id: "line",
            title: "Line",
            channels: ["edge.color", "edge.opacity", "edge.width", "edge.style", "edge.patternCount", "edge.curvature"],
        },
        {
            id: "ends",
            title: "Arrowheads",
            channels: [
                "edge.arrowHead",
                "edge.arrowHeadSize",
                "edge.arrowHeadColor",
                "edge.arrowHeadOpacity",
                "edge.arrowTail",
                "edge.arrowTailSize",
                "edge.arrowTailColor",
                "edge.arrowTailOpacity",
            ],
        },
        {
            id: "effects",
            title: "Effects",
            channels: ["edge.animationSpeed", "edge.bandColor", "edge.bandWidth", "edge.bandOpacity"],
        },
    ],
};

/**
 * The opacity a color field carries in its opacity box: Fill's and Line's. Opacity has one source,
 * the opacity channel, so the color stays six digits and a row that set Opacity keeps it.
 */
export const OPACITY_OF: Partial<Readonly<Record<Channel, Channel>>> = {
    "node.color": "node.opacity",
    "edge.color": "edge.opacity",
};

/**
 * The two words of each yes-or-no property, in the order its select lists them. Empty means not
 * set, as in every other field, so a yes-or-no property is a select and never a switch.
 */
export const TWO_WORDS: Partial<Readonly<Record<Channel, readonly (readonly [boolean, string])[]>>> = {
    "node.wireframe": [
        [false, "Solid"],
        [true, "Wireframe"],
    ],
    "node.visible": [
        [true, "Shown"],
        [false, "Hidden"],
    ],
    "edge.visible": [
        [true, "Shown"],
        [false, "Hidden"],
    ],
    "edge.curvature": [
        [false, "Straight"],
        [true, "Curved"],
    ],
};

/**
 * A field's full name, kind first: "Node size", "Edge head".
 * @param channel - the element's channel id.
 * @returns the words.
 */
export function fieldName(channel: Channel): string {
    const kind = channel.startsWith("node.") ? "Node" : "Edge";
    return `${kind} ${channelWord(channel).toLowerCase()}`;
}

/**
 * Joins names as a reader lists them: "A", "A and B", "A, B and C".
 * @param names - the names.
 * @returns the words.
 */
export function listWords(names: readonly string[]): string {
    return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
}

/** How a number a layer writes meets what lies beneath: its field's prefix and its menu word. */
export const COMBINE_WORDS = {
    replace: { prefix: undefined, word: "Replace" },
    multiply: { prefix: "x", word: "Multiply" },
    add: { prefix: "+", word: "Add" },
} as const;

/**
 * Whether a field draws the vary glyph: its channel takes a binding (tier3 design, decision 1.12).
 * Every color, number, choice and text channel the element draws does; a yes-or-no property does
 * not ("on for these values" is a Which elements rule), nor a channel the element does not draw.
 * @param descriptor - the element's channel descriptor.
 * @returns true when the field can vary by a value.
 */
export function takesBinding(descriptor: ChannelDescriptor): boolean {
    return (
        descriptor.renderable &&
        (descriptor.accepts === "color" ||
            descriptor.accepts === "number" ||
            descriptor.accepts === "enum" ||
            descriptor.accepts === "text")
    );
}

/**
 * The bind icon's tooltip, its accessible name and the title of the list it opens: one name.
 * @param descriptor - the channel.
 * @returns "Node color by attribute", "Edge width by attribute", ...
 */
export function bindLabel(descriptor: ChannelDescriptor): string {
    return `${fieldName(descriptor.channel)} by attribute`;
}

/**
 * What each property is called on its line, in its menus and in its notices. The element names
 * its channels by id only as far as the app is concerned; the words are the app's. Typed over the
 * element's whole `Channel` union, so a channel the element adds fails the typecheck until it has
 * a word here.
 */
const CHANNEL_WORDS: Readonly<Record<Channel, string>> = {
    "node.color": "Color",
    "node.size": "Size",
    "node.sizeMode": "Size mode",
    "node.shape": "Shape",
    "node.label": "Label",
    "node.labelStyle": "Label style",
    "node.labelColor": "Label color",
    "node.labelSize": "Label size",
    "node.labelFont": "Label font",
    "node.labelWeight": "Label weight",
    "node.labelItalic": "Label italic",
    "node.labelWrapWidth": "Label wrap width",
    "node.labelLetterSize": "Label letter size",
    "node.labelWrapTrailingSpace": "Label wraps with a trailing space",
    "node.labelMinScreenSize": "Label smallest size on screen",
    "node.labelOnTop": "Label drawn on top",
    "node.labelDeclutter": "Label overlap order",
    "node.labelRotation": "Label rotation",
    "node.tooltip": "Tooltip",
    "node.tooltipStyle": "Tooltip style",
    "node.opacity": "Opacity",
    "node.outline": "Outline",
    "node.glow": "Glow",
    "node.glowStrength": "Glow strength",
    "node.halo": "Halo",
    "node.haloScale": "Halo size",
    "node.wireframe": "Wireframe",
    "node.flat": "Flat shading",
    "node.unlit": "Unlit",
    "node.marker": "Marker",
    "node.haloColor": "Halo",
    "node.haloOpacity": "Halo opacity",
    "node.visible": "Show",
    "node.labelBackground": "Label background",
    "node.tooltipSize": "Tooltip size",
    "node.tooltipColor": "Tooltip color",
    "node.tooltipBackground": "Tooltip background",
    "node.width": "Width",
    "node.height": "Height",
    "node.depth": "Depth",
    "node.planar": "Planar",
    "node.zIndex": "Z-index",
    "node.drawOrder": "Draw order",
    "node.borderColor": "Border color",
    "node.borderWidth": "Border width",
    "node.borderScreenWidth": "Border width on screen",
    "node.borderOpacity": "Border opacity",
    "node.borderStyle": "Border style",
    "node.borderPosition": "Border position",
    "node.shapePoints": "Polygon points",
    "node.gradientColor": "Gradient color",
    "node.gradientDirection": "Gradient direction",
    "node.cornerRadius": "Corner radius",
    "node.labelFit": "Fit to label",
    "node.labelPaddingX": "Label padding across",
    "node.labelPaddingY": "Label padding down",
    "node.labelFitSquare": "Keep square when fitted",
    "edge.color": "Color",
    "edge.width": "Width",
    "edge.opacity": "Opacity",
    "edge.bandColor": "Band",
    "edge.bandWidth": "Band width",
    "edge.bandOpacity": "Band opacity",
    "edge.visible": "Show",
    "edge.style": "Pattern",
    "edge.patternCount": "Pattern count",
    "edge.curvature": "Curved",
    "edge.fanSpacing": "Fan spacing",
    "edge.fanned": "Fanned",
    "edge.sourcePort": "Source port",
    "edge.targetPort": "Target port",
    "edge.arrowHead": "Target end",
    "edge.arrowHeadSize": "Target end size",
    "edge.arrowHeadWidth": "Target end width",
    "edge.arrowHeadPosition": "Target end position",
    "edge.arrowHeadColor": "Target end color",
    "edge.arrowHeadOpacity": "Target end opacity",
    "edge.arrowHeadText": "Label at target end",
    "edge.arrowHeadTextStyle": "Label at target end style",
    "edge.arrowTail": "Source end",
    "edge.arrowTailSize": "Source end size",
    "edge.arrowTailWidth": "Source end width",
    "edge.arrowTailPosition": "Source end position",
    "edge.arrowTailColor": "Source end color",
    "edge.arrowTailOpacity": "Source end opacity",
    "edge.arrowTailText": "Label at source end",
    "edge.arrowTailTextStyle": "Label at source end style",
    "edge.animationSpeed": "Motion",
    "edge.label": "Label",
    "edge.labelStyle": "Label style",
    "edge.labelSize": "Label size",
    "edge.labelColor": "Label color",
    "edge.labelBackground": "Label background",
    "edge.arrowHeadTextSize": "Label at target end size",
    "edge.arrowHeadTextColor": "Label at target end color",
    "edge.arrowHeadTextBackground": "Label at target end background",
    "edge.arrowTailTextSize": "Label at source end size",
    "edge.arrowTailTextColor": "Label at source end color",
    "edge.arrowTailTextBackground": "Label at source end background",
    "edge.bends": "Bends",
    "edge.labelFont": "Label font",
    "edge.labelWeight": "Label weight",
    "edge.labelItalic": "Label italic",
    "edge.labelWrapWidth": "Label wrap width",
    "edge.labelLetterSize": "Label letter size",
    "edge.labelWrapTrailingSpace": "Label wraps with a trailing space",
    "edge.labelMinScreenSize": "Label smallest size on screen",
    "edge.labelOnTop": "Label drawn on top",
    "edge.labelRotation": "Label rotation",
    "node.labelWrapEllipsis": "Label wrap ellipsis",
    "node.labelWrapAnywhere": "Label wrap anywhere",
    "node.labelWrapSpaceCount": "Label wrap space count",
    "node.labelRunAlign": "Label run align",
    "node.labelOutline": "Label outline",
    "node.labelOutlineWidth": "Label outline width",
    "node.labelBorder": "Label border",
    "node.labelBorderWidth": "Label border width",
    "node.labelOpacity": "Label opacity",
    "node.labelBackgroundOpacity": "Label background opacity",
    "node.labelOutlineOpacity": "Label outline opacity",
    "node.labelBorderOpacity": "Label border opacity",
    "node.labelPadding": "Label padding",
    "node.labelCornerRadius": "Label corner radius",
    "node.labelLineHeight": "Label line height",
    "node.labelOffsetX": "Label offset x",
    "node.labelOffsetY": "Label offset y",
    "node.labelShiftX": "Label shift x",
    "node.labelShiftY": "Label shift y",
    "node.labelMinNodeScreenSize": "Label min node screen size",
    "node.labelTextAlign": "Label text align",
    "node.labelLocation": "Label location",
    "node.borderWaveAmplitude": "Border wave amplitude",
    "node.borderWavePeriod": "Border wave period",
    "node.outerBorderColor": "Outer border color",
    "node.outerBorderWidth": "Outer border width",
    "node.outerBorderOpacity": "Outer border opacity",
    "node.outerBorderStyle": "Outer border style",
    "node.outerBorderOffset": "Outer border offset",
    "node.underlayColor": "Underlay color",
    "node.underlayOpacity": "Underlay opacity",
    "node.underlayPadding": "Underlay padding",
    "node.underlayShape": "Underlay shape",
    "node.underlayCornerRadius": "Underlay corner radius",
    "node.overlayColor": "Overlay color",
    "node.overlayOpacity": "Overlay opacity",
    "node.overlayPadding": "Overlay padding",
    "node.overlayShape": "Overlay shape",
    "node.overlayCornerRadius": "Overlay corner radius",
    "node.image": "Image",
    "node.imageFallback": "Image fallback",
    "node.imageFit": "Image fit",
    "node.imageWidth": "Image width",
    "node.imageHeight": "Image height",
    "node.imagePixelSize": "Image pixel size",
    "node.imagePositionX": "Image position x",
    "node.imagePositionY": "Image position y",
    "node.imageOffsetX": "Image offset x",
    "node.imageOffsetY": "Image offset y",
    "node.imageRepeat": "Image repeat",
    "node.imageClip": "Image clip",
    "node.imageSmoothing": "Image smoothing",
    "node.imageAutoSize": "Image auto size",
    "node.imageOpacity": "Image opacity",
    "node.glyph": "Glyph",
    "node.glyphFont": "Glyph font",
    "node.glyphSize": "Glyph size",
    "node.glyphWeight": "Glyph weight",
    "node.glyphColor": "Glyph color",
    "node.pieColors": "Pie colors",
    "node.pieSizes": "Pie sizes",
    "node.pieOpacities": "Pie opacities",
    "node.pieRadius": "Pie radius",
    "node.pieHole": "Pie hole",
    "node.pieRotation": "Pie rotation",
    "node.pieFitBox": "Pie fit box",
    "node.pieOffsetX": "Pie offset x",
    "node.pieOffsetY": "Pie offset y",
    "node.stripeColors": "Stripe colors",
    "node.stripeSizes": "Stripe sizes",
    "node.stripeOpacities": "Stripe opacities",
    "node.stripeDirection": "Stripe direction",
    "node.stripeSize": "Stripe size",
    "node.chartKind": "Chart kind",
    "node.chartValues": "Chart values",
    "node.chartColors": "Chart colors",
    "node.chartMin": "Chart min",
    "node.chartMax": "Chart max",
    "node.chartHorizontal": "Chart horizontal",
    "node.chartSize": "Chart size",
    "node.chartMargin": "Chart margin",
    "node.chartGap": "Chart gap",
    "node.chartLineWidth": "Chart line width",
    "node.chartBorderColor": "Chart border color",
    "node.chartBorderWidth": "Chart border width",
    "node.exactCornerRadius": "Exact corner radius",
    "node.shapeStretchPoints": "Polygon stretch",
    "node.shapeParts": "Shape parts",
    "node.shapeLines": "Shape lines",
    "node.shapeTexts": "Shape texts",
    "node.shapeLineWidth": "Shape line width",
    "node.gradientColors": "Gradient colors",
    "node.gradientStops": "Gradient stops",
    "node.gradientKind": "Gradient kind",
    "edge.minScreenWidth": "Min screen width",
    "edge.outlineColor": "Outline color",
    "edge.outlineWidth": "Outline width",
    "edge.outlineOpacity": "Outline opacity",
    "edge.outlineStyle": "Outline pattern",
    "edge.underlayColor": "Underlay color",
    "edge.underlayOpacity": "Underlay opacity",
    "edge.underlayPadding": "Underlay padding",
    "edge.overlayColor": "Overlay color",
    "edge.overlayOpacity": "Overlay opacity",
    "edge.overlayPadding": "Overlay padding",
    "edge.gradientColors": "Gradient colors",
    "edge.gradientStops": "Gradient stops",
    "edge.gradientKind": "Gradient kind",
    "edge.waveAmplitude": "Wave amplitude",
    "edge.wavePeriod": "Wave period",
    "edge.bendCurve": "Bend curve",
    "edge.arcRadius": "Arc radius",
    "edge.route": "Route",
    "edge.arcHeight": "Arc height",
    "edge.nodeGap": "Node gap",
    "edge.arrowHeadSide": "Arrow head side",
    "edge.arrowHeadGap": "Arrow head gap",
    "edge.arrowHeadImage": "Arrow head image",
    "edge.arrowHeadTextLetterSize": "Arrow head caption letter size",
    "edge.arrowHeadTextFont": "Arrow head caption font",
    "edge.arrowHeadTextWeight": "Arrow head caption weight",
    "edge.arrowHeadTextOpacity": "Arrow head caption opacity",
    "edge.arrowHeadTextDistance": "Arrow head caption distance",
    "edge.arrowHeadTextRotation": "Arrow head caption rotation",
    "edge.arrowHeadTextOffsetX": "Arrow head caption offset x",
    "edge.arrowHeadTextOffsetY": "Arrow head caption offset y",
    "edge.arrowTailSide": "Arrow tail side",
    "edge.arrowTailGap": "Arrow tail gap",
    "edge.arrowTailImage": "Arrow tail image",
    "edge.arrowTailTextLetterSize": "Arrow tail caption letter size",
    "edge.arrowTailTextFont": "Arrow tail caption font",
    "edge.arrowTailTextWeight": "Arrow tail caption weight",
    "edge.arrowTailTextOpacity": "Arrow tail caption opacity",
    "edge.arrowTailTextDistance": "Arrow tail caption distance",
    "edge.arrowTailTextRotation": "Arrow tail caption rotation",
    "edge.arrowTailTextOffsetX": "Arrow tail caption offset x",
    "edge.arrowTailTextOffsetY": "Arrow tail caption offset y",
    "edge.arrowMiddleHead": "Arrow middle head",
    "edge.arrowMiddleHeadSize": "Arrow middle head size",
    "edge.arrowMiddleHeadWidth": "Arrow middle head width",
    "edge.arrowMiddleHeadSide": "Arrow middle head side",
    "edge.arrowMiddleHeadPosition": "Arrow middle head position",
    "edge.arrowMiddleHeadColor": "Arrow middle head color",
    "edge.arrowMiddleHeadOpacity": "Arrow middle head opacity",
    "edge.arrowMiddleHeadImage": "Arrow middle head image",
    "edge.arrowMiddleTail": "Arrow middle tail",
    "edge.arrowMiddleTailSize": "Arrow middle tail size",
    "edge.arrowMiddleTailWidth": "Arrow middle tail width",
    "edge.arrowMiddleTailSide": "Arrow middle tail side",
    "edge.arrowMiddleTailPosition": "Arrow middle tail position",
    "edge.arrowMiddleTailColor": "Arrow middle tail color",
    "edge.arrowMiddleTailOpacity": "Arrow middle tail opacity",
    "edge.arrowMiddleTailImage": "Arrow middle tail image",
    "edge.labelTextAlign": "Label text align",
    "edge.labelLocation": "Label location",
    "edge.labelWrapEllipsis": "Label wrap ellipsis",
    "edge.labelWrapAnywhere": "Label wrap anywhere",
    "edge.labelWrapSpaceCount": "Label wrap space count",
    "edge.labelRunAlign": "Label run align",
    "edge.labelOutline": "Label outline",
    "edge.labelOutlineWidth": "Label outline width",
    "edge.labelBorder": "Label border",
    "edge.labelBorderWidth": "Label border width",
    "edge.labelOpacity": "Label opacity",
    "edge.labelBackgroundOpacity": "Label background opacity",
    "edge.labelOutlineOpacity": "Label outline opacity",
    "edge.labelBorderOpacity": "Label border opacity",
    "edge.labelPadding": "Label padding",
    "edge.labelCornerRadius": "Label corner radius",
    "edge.labelLineHeight": "Label line height",
    "edge.labelOffsetX": "Label offset x",
    "edge.labelOffsetY": "Label offset y",
    "edge.labelShiftX": "Label shift x",
    "edge.labelShiftY": "Label shift y",
};

/**
 * Whether a number is an opacity, shown and typed as a percent (0 to 100) though the element takes
 * 0 to 1, as every color field's opacity reads.
 * @param descriptor - the channel.
 * @returns true for an opacity.
 */
export function isPercent(descriptor: ChannelDescriptor): boolean {
    return descriptor.accepts === "number" && descriptor.max === 1 && descriptor.channel.endsWith("pacity");
}

/**
 * A property's name on its line.
 * @param channel - the element's channel id.
 * @returns "Color", "Shape", ...
 */
export function channelWord(channel: Channel): string {
    return CHANNEL_WORDS[channel];
}

/**
 * A property named with its kind, for words that stand away from its line (the history, a
 * notice): "node color", "edge width", so an edge color is never read as a node's.
 * @param channel - the element's channel id.
 * @returns "node color", "edge pattern", ...
 */
export function channelPhrase(channel: Channel): string {
    const name = fieldName(channel);
    return name.charAt(0).toLowerCase() + name.slice(1);
}

/** A palette's name, by the id the element publishes. Typed over the element's known ids. */
const PALETTE_WORDS: Readonly<Record<(typeof KNOWN_PALETTE_IDS)[number], string>> = {
    viridis: "Purple to yellow",
    ylorbr: "Orange to brown",
    plasma: "Blue to yellow",
    inferno: "Black to yellow",
    blues: "Shades of blue",
    greens: "Shades of green",
    oranges: "Shades of orange",
    "okabe-ito": "Eight distinct colors",
    "tol-vibrant": "Seven bright colors",
    "tol-muted": "Nine soft colors",
    pastel: "Eight pale colors",
    carbon: "Five strong colors",
    kelly: "Nineteen contrasting colors",
    "purple-green": "Purple to green",
    "blue-orange": "Blue to orange",
    "red-blue": "Red to blue",
    "blue-highlight": "Blue highlight",
    "green-highlight": "Green highlight",
    "orange-highlight": "Orange highlight",
};

/**
 * A palette's name. A palette a document brings that the app has no word for is named from its id.
 * @param id - the palette's id.
 * @returns the words.
 */
export function paletteWord(id: string): string {
    return (PALETTE_WORDS as Readonly<Record<string, string>>)[id] ?? enumWords(id);
}

/**
 * A readable value's name and the heading it is listed under, the same in the vary picker and the
 * rule editor: the catalog plainName, under "Data" for a column or under the run's name for a
 * run's field. A measurement's main value goes by the algorithm's name, as the reader picked it
 * ("Closeness", not the catalog's "Reach"). A run's field that does not say whose it is gets the
 * run's main value after it; one that does ("Community size", "Incoming connections") keeps its
 * own name. A rank reads "Closeness rank (1 = highest)" and a percentile "Closeness percentile".
 * @param session - the element's session.
 * @param value - the element's entry.
 * @returns the name and its heading.
 */
export function readableName(session: GraphSession, value: ReadableValue): { name: string; group: string } {
    const run = value.runId === undefined ? undefined : session.runs.get(value.runId);
    if (run === undefined) {
        return { name: value.plainName, group: "Data" };
    }
    const primary = session.results.path(run.id);
    const field = run.fields.find((f) => session.results.path(run.id, f.name) === primary)?.plainName;
    const descriptor = session.catalog.algorithms().find((each) => each.key === run.algorithm);
    // A measure or a grouping is named after its method, as the style tree names its row: "Louvain",
    // never the field's "Community".
    const measured =
        descriptor !== undefined &&
        (run.shape === "node-metric" ||
            run.shape === "edge-metric" ||
            run.shape === "community" ||
            run.shape === "layered-grouping");
    const main = measured ? wordsFor(descriptor).name : field;
    const group = runName(session, run);
    // The main value, or the main value read at an edge's end, which carries the same catalog name.
    if (value.path === primary || value.plainName === field) {
        return { name: main ?? value.plainName, group };
    }
    // A rank and a percentile are named the same way everywhere they are offered.
    const of = main ?? field ?? value.plainName;
    if (value.path.endsWith(".rank")) {
        return { name: `${of} rank (1 = highest)`, group };
    }
    if (value.path.endsWith(".percentile")) {
        return { name: `${of} percentile`, group };
    }
    const own = main === undefined || field === undefined || value.plainName.includes(field);
    return { name: own ? value.plainName : `${value.plainName} of ${main}`, group };
}

/**
 * A run's group's rank, the number the key names it by: 1 for the largest.
 * @param session - the element's session.
 * @param path - the value's path, such as `results.louvain.community`.
 * @param value - one of its values.
 * @returns the rank, or undefined for a value that is not a run's ranked group.
 */
export function groupRank(session: GraphSession, path: string, value: unknown): number | undefined {
    const run = session.runs.list().find((each) => session.results.path(each.id) === path);
    return run?.result?.summary().groups?.find((g) => String(g.group) === String(value))?.rank;
}

/**
 * What one value of a value is called, as the key calls it: the name the reader gave it (the
 * element's value label), else a run's group by its rank ("Group 3"), else the value as it is.
 * @param session - the element's session.
 * @param path - the value's path.
 * @param value - one of its values.
 * @returns "Group 3", or the value in words.
 */
export function valueName(session: GraphSession, path: string, value: unknown): string {
    const named = session.data.valueLabels(path).get(String(value));
    if (named !== undefined) {
        return named;
    }
    const rank = groupRank(session, path, value);
    return rank === undefined ? String(value) : `Group ${String(rank)}`;
}

/**
 * A shape id as a reader reads it: "icosphere" -> "Icosphere", "tetrahedron-flat" -> "Tetrahedron flat".
 * @param value - an enum value the element publishes.
 * @returns the words.
 */
export function enumWords(value: string): string {
    const spaced = value
        .replaceAll(/[-_]/g, " ")
        .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
        .toLowerCase();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Why an attribute cannot go on a property, in words, from the element's coded refusal.
 * @param refusal - the refusal.
 * @returns one short reason.
 */
export function refusalWords(refusal: CodedFact): string {
    // A column of free text (every value its own) is text, whatever it measures as.
    if (refusal.params.valueKind === "text") {
        return "Holds text, not groups or amounts";
    }
    if (refusal.code === "E_CAP_EXCEEDED") {
        return `More than ${String(refusal.params.limit)} different values`;
    }
    if (refusal.code === "E_UNSUPPORTED") {
        switch (refusal.params.measurement) {
            case "categorical":
                return "Holds groups, not amounts";
            case "quantitative":
                return "Holds amounts, not groups";
            case "ordinal":
                return "Holds an order, not amounts";
            case "time":
                return "Holds times";
            case null:
                return "Has no values";
            default:
                break;
        }
    }
    return "Cannot be drawn here";
}

/** The label positions a line can take, as the alignment grid's cells. */
const LOCATION_BY_CELL: Readonly<Record<AlignmentMatrixValue, LabelLocation>> = {
    "top-left": "top-left",
    "top-center": "top",
    "top-right": "top-right",
    "middle-left": "left",
    "middle-center": "center",
    "middle-right": "right",
    "bottom-left": "bottom-left",
    "bottom-center": "bottom",
    "bottom-right": "bottom-right",
};

/**
 * The element's label location for an alignment grid cell.
 * @param cell - the grid cell.
 * @returns the location.
 */
export function locationOfCell(cell: AlignmentMatrixValue): LabelLocation {
    return LOCATION_BY_CELL[cell];
}

/**
 * The alignment grid cell for a label location.
 * @param location - the element's location, or undefined for its default (above).
 * @returns the cell.
 */
export function cellOfLocation(location: LabelLocation | undefined): AlignmentMatrixValue {
    const cells = Object.keys(LOCATION_BY_CELL) as AlignmentMatrixValue[];
    return cells.find((cell) => LOCATION_BY_CELL[cell] === location) ?? "top-center";
}

/** A position's word on the label line. */
const POSITION_WORDS: Readonly<Record<LabelLocation, string>> = {
    top: "Above",
    "top-left": "Above left",
    "top-right": "Above right",
    left: "Left",
    center: "Center",
    right: "Right",
    bottom: "Below",
    "bottom-left": "Below left",
    "bottom-right": "Below right",
    "inside-top": "Inside top",
    "inside-bottom": "Inside bottom",
    "inside-left": "Inside left",
    "inside-right": "Inside right",
    "inside-top-left": "Inside top left",
    "inside-top-right": "Inside top right",
    "inside-bottom-left": "Inside bottom left",
    "inside-bottom-right": "Inside bottom right",
    automatic: "Automatic",
};

/**
 * The word a label line starts with.
 * @param location - the element's location, or undefined for its default.
 * @returns "Above", "Below", ...
 */
export function positionWord(location: LabelLocation | undefined): string {
    return POSITION_WORDS[location ?? "top"];
}

/**
 * The label line's statement, from the element's label counts (round 8: every count is computed
 * from live state). The hidden part is said only while the overlap rule is on (Show all labels off).
 * @param counts - the element's `nodeLabelCounts`.
 * @param counts.labeled - nodes whose label has text.
 * @param counts.hiddenByOverlap - of those, labels the overlap rule hid.
 * @param declutter - whether the overlap rule is on.
 * @returns "77 labels, 64 hidden", or "77 labels".
 */
export function labelStatement(
    counts: { readonly labeled: number; readonly hiddenByOverlap: number },
    declutter: boolean,
): string {
    const labels = `${String(counts.labeled)} ${counts.labeled === 1 ? "label" : "labels"}`;
    return declutter ? `${labels}, ${String(counts.hiddenByOverlap)} hidden` : labels;
}

/**
 * Whether an item's name matches a search: the start of any word (tier1-design.md section 2.8,
 * "the field list").
 * @param name - the item's name.
 * @param query - the search text.
 * @returns true when it matches.
 */
export function matchesWordStart(name: string, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (q === "") {
        return true;
    }
    return (
        name
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .some((word) => word.startsWith(q)) || name.toLowerCase().startsWith(q)
    );
}

/** Compares names as a reader counts: GAL2 before GAL10. */
export const NATURAL = new Intl.Collator(undefined, { numeric: true });

/**
 * A search's matches with the names that start with the typed text first, then the rest, each part
 * in the order it came in: "on" lists on_record before donations.
 * @param items - the matches, in list order.
 * @param nameOf - an item's name as the reader sees it.
 * @param query - the search text.
 * @returns the matches, reordered; a blank search keeps the order.
 */
export function prefixFirst<T>(items: readonly T[], nameOf: (item: T) => string, query: string): T[] {
    const q = query.trim().toLowerCase();
    if (q === "") {
        return [...items];
    }
    // Array.prototype.sort is stable, so each part keeps its order.
    const rank = (item: T): number => (nameOf(item).toLowerCase().startsWith(q) ? 0 : 1);
    return [...items].sort((a, b) => rank(a) - rank(b));
}

/**
 * An attribute's name as the reader knows it, from its literal column key.
 * @param session - the element's session.
 * @param path - the column key, such as `"data.name"`, or `"id"`.
 * @returns its plain name, else the key.
 */
export function attributeName(session: GraphSession, path: string): string {
    if (path === "id") {
        return "Node id";
    }
    return session.data.attributes().find((a) => a.path === path)?.plainName ?? path;
}

/** The pictures of each glyph-grid property, from graphty-element's catalog. */
export const GLYPH_TABLES: Partial<Readonly<Record<Channel, readonly GlyphDescriptor[]>>> = {
    "node.shape": NODE_SHAPE_DESCRIPTORS,
    "edge.arrowHead": EDGE_ARROW_DESCRIPTORS,
    "edge.arrowTail": EDGE_ARROW_DESCRIPTORS,
    "edge.style": EDGE_LINE_DESCRIPTORS,
};

/**
 * A color as the paint field edits it: `#RRGGBB`.
 * @param value - a color the element reports or a layer holds.
 * @returns the hex, or null when it is not a color.
 */
export function hexOf(value: unknown): string | null {
    const color =
        typeof value === "string" || (typeof value === "object" && value !== null && "r" in value)
            ? toColorValue(value as Parameters<typeof toColorValue>[0])
            : null;
    return color === null ? null : color.hex.slice(0, 7).toUpperCase();
}

/**
 * A value as a reader hears it: a color's name, a shape's name, a yes-or-no
 * property's word, a number as itself.
 * @param descriptor - the channel.
 * @param value - the value.
 * @returns the words.
 */
export function valueWords(descriptor: ChannelDescriptor, value: unknown): string {
    if (isPercent(descriptor) && typeof value === "number") {
        return `${String(Math.round(value * 100))} %`;
    }
    if (descriptor.accepts === "color") {
        const hex = hexOf(value);
        return hex === null ? String(value) : colorName(hex);
    }
    const two = TWO_WORDS[descriptor.channel];
    if (two !== undefined && typeof value === "boolean") {
        return two.find(([v]) => v === value)?.[1] ?? String(value);
    }
    if (typeof value === "string" && descriptor.accepts === "enum") {
        return GLYPH_TABLES[descriptor.channel]?.find((g) => g.id === value)?.plainName ?? enumWords(value);
    }
    return typeof value === "number" || typeof value === "string" ? String(value) : JSON.stringify(value);
}

/**
 * A color as a reader says it, for spoken names and Clear's words: "orange", "dark green",
 * "light gray". The field itself shows the hex. The color field's own words (compact-mantine's
 * `colorWord`), so a swatch's tooltip and a field's name say the same word.
 * @param hex - `#RRGGBB`.
 * @returns the name.
 */
export function colorName(hex: string): string {
    return colorWord(hex);
}

/** A scale's name in words; the element publishes the ids. */
export const SCALE_WORDS: Readonly<Record<string, string>> = {
    linear: "Linear",
    log: "Logarithmic",
    neglog10: "Negative logarithmic",
    sqrt: "Square root",
    pow: "Power",
    bins: "Equal bins",
    quantile: "Equal counts",
    ordinal: "One color per value",
    passthrough: "As written",
};

/** The element's reasons for refusing a style edit, in the app's words, by error code. */
const REFUSAL_WORDS: Partial<Readonly<Record<GraphtyErrorCode, string>>> = {
    E_LOCKED: "its layer is locked",
    E_PROTECTED: "that layer is drawn by graphty itself; add a layer above it instead",
    E_OPTION_RANGE: "that value is outside what the property accepts",
    E_BAD_LAYER: "a layer cannot hold that value",
    E_UNKNOWN_CHANNEL: "this kind of element has no such property",
    E_UNKNOWN_PALETTE: "that palette is not known",
    E_UNKNOWN_SCALE: "that scale is not known",
    E_UNKNOWN_ATTRIBUTE: "the value it reads is not in the data",
    E_BAD_SELECTOR: "the layer's rule does not read right",
    E_SELECTOR_EMPTY: "the layer's rule names nothing",
    E_UNSCOPED_RUN_ENCODING: "the result covers only part of the graph; narrow the layer to what it measured",
    E_UNKNOWN_LAYER: "the layer is gone",
    E_HELD_BY_TRANSACTION: "another change is still being made; try again",
};

/**
 * A failure notice that carries the element's reason: "Pattern could not be changed: its layer
 * is locked." The reason is read from the GraphtyError's code, never from its English message.
 * @param what - the thing, such as "Pattern" or "The text".
 * @param verb - what failed, such as "changed" or "added".
 * @param error - what the element threw.
 * @returns the words.
 */
export function failureWords(what: string, verb: string, error: unknown): string {
    const reason = error instanceof GraphtyError ? REFUSAL_WORDS[error.code] : undefined;
    return reason === undefined ? `${what} could not be ${verb}.` : `${what} could not be ${verb}: ${reason}.`;
}

/** The control a value of one property is edited with: one per kind of property. */
export type ValueFieldKind = "color" | "number" | "choice" | "text";

/**
 * The control a per-value field draws for a property: a color chit, a number, a shape, pattern or
 * arrow glyph grid (or a yes-or-no select), or words. Every per-value and per-group control of the
 * Style tab draws its field through `ValueField`, so none offers fewer kinds of property than
 * the property row it hangs from (`coverage.ts`, PER_VALUE_CONTROLS).
 * @param descriptor - the property.
 * @returns the kind, or null for a property the Style tab does not draw.
 */
export function valueFieldKind(descriptor: ChannelDescriptor): ValueFieldKind | null {
    if (!descriptor.renderable) {
        return null;
    }
    switch (descriptor.accepts) {
        case "color":
            return "color";
        case "number":
            return "number";
        case "enum":
        case "boolean":
            return "choice";
        case "text":
            return "text";
        default:
            return null;
    }
}

/**
 * Where the source's name goes when several layers each hold their own value: Layer set off in
 * guillemets, so it reads as "from each layer" and never as a data column named "layer".
 */
export const LAYER_TOKEN = "\u00ABLayer\u00BB";

/** The Layer token as a screen reader says it: what it stands for, never its marks. */
export const LAYER_SPOKEN = "each layer's own value";

/**
 * The title of a binding popover: "Color by Louvain", or "Color from each layer" with no source (the same
 * property word, so one layer's popover and several layers' differ only in the source).
 * @param channel - the bound property.
 * @param source - what it reads, in words; none when each layer gives its own value.
 * @returns the title.
 */
export function bindingTitle(channel: ChannelDescriptor["channel"], source?: string): string {
    return source === undefined ? `${channelWord(channel)} from each layer` : `${channelWord(channel)} by ${source}`;
}

/** The search box of every list of attributes: the Vary by picker, the label picker and Add a condition. */
export const FIND_ATTRIBUTE = "Find an attribute";

/**
 * One fact about a value, from the element's list (never its values): the range of a number, the
 * count of groups, else how many elements have a value.
 * @param value - the element's entry.
 * @returns the fact, or undefined when there is nothing to say.
 */
export function valueFact(value: ReadableValue): string | undefined {
    if (value.range !== undefined) {
        return `${formatNumber(value.range.min)} to ${formatNumber(value.range.max)}`;
    }
    if (value.valueCount !== undefined) {
        return value.valueCount === 1 ? "1 value" : `${formatNumber(value.valueCount)} values`;
    }
    if (value.completeness < 1) {
        return `${String(Math.floor(value.completeness * 100))}% have a value`;
    }
    return undefined;
}

/**
 * A selection's row named by how many it holds: "8 nodes", "3 nodes, 2 edges".
 * @param nodes - how many nodes.
 * @param edges - how many edges.
 * @returns the name.
 */
export function countName(nodes: number, edges: number): string {
    const count = (n: number, word: string): string[] => (n === 0 ? [] : [`${String(n)} ${word}${n === 1 ? "" : "s"}`]);
    return [...count(nodes, "node"), ...count(edges, "edge")].join(", ");
}

/**
 * What a selection's first edit made. A layer named by its count is not named again beside the
 * same count: "Made a layer for the 8 selected nodes", but "Made layer v09 for 1 node".
 * @param name - the layer's name.
 * @param nodes - how many nodes are selected.
 * @param edges - how many edges are selected.
 * @returns the notice.
 */
export function madeWords(name: string, nodes: number, edges: number): string {
    if (name !== countName(nodes, edges)) {
        return `Made layer ${name} for ${pickedCount(nodes, edges)}`;
    }
    return `Made a layer for ${selectedWords(nodes, edges)}`;
}

/**
 * The selection as a phrase: "the 8 selected nodes", "the selected edge", "the 3 selected nodes
 * and 2 edges".
 * @param nodes - how many nodes are selected.
 * @param edges - how many edges are selected.
 * @returns the words.
 */
export function selectedWords(nodes: number, edges: number): string {
    const [first, ...rest] = pickedCount(nodes, edges).split(" and ");
    const [n, word] = first.split(" ");
    const selected = n === "1" ? `selected ${word}` : `${n} selected ${word}`;
    return `the ${[selected, ...rest].join(" and ")}`;
}

/**
 * "1 node", "24 nodes and 3 edges".
 * @param nodes - how many nodes.
 * @param edges - how many edges.
 * @returns the words.
 */
function pickedCount(nodes: number, edges: number): string {
    const count = (n: number, word: string): string[] => (n === 0 ? [] : [`${String(n)} ${word}${n === 1 ? "" : "s"}`]);
    return [...count(nodes, "node"), ...count(edges, "edge")].join(" and ");
}

/**
 * What a line just added on a selection with no layer yet says: the value shown is not set, and
 * the first one picked makes the layer.
 * @param property - the line's name, as drawn ("Size").
 * @returns the words.
 */
export function firstValueWords(property: string): string {
    return `Not set yet: the first ${property.toLowerCase()} you pick makes the layer`;
}

/**
 * What a selection's Style tab says before its layer exists: the first style set makes it.
 * @param nodes - how many nodes are selected.
 * @param edges - how many edges are selected.
 * @returns the words.
 */
export function firstStyleWords(nodes: number, edges: number): string {
    return `The first style you set makes a layer for ${selectedWords(nodes, edges)}.`;
}
