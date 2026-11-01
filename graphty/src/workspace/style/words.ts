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
    type ShaderDescriptor,
    type ShaderInput,
    type ShaderPlace,
    type ShaderProblem,
    toColorValue,
} from "@graphty/graphty-element/catalog";
import type { Channel, LabelStyle } from "@graphty/graphty-element/schema";
import {
    type CodedFact,
    type GraphSession,
    GraphtyError,
    type GraphtyErrorCode,
    type GraphtyWarningCode,
    type ReadableValue,
} from "@graphty/graphty-element/session";

import { wordsFor } from "../analyze/words";
import { formatNumber } from "../inspector/words";
import { runName } from "../runWords";
import { formatCount } from "../settings/numberFormat";

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
    /** The section is the tab's Shaders list: its rows are the layer's shader uses, its "+" opens the gallery. */
    readonly shaders?: boolean;
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
        {
            id: "shape",
            title: "Shape",
            // Wireframe, Outline, Glow and Halo are style options of the shape, never shaders.
            channels: [
                "node.shape",
                "node.size",
                "node.wireframe",
                "node.outline",
                "node.glow",
                "node.glowStrength",
                "node.haloColor",
                "node.haloScale",
                "node.haloOpacity",
            ],
        },
        { id: "visibility", title: "Visibility", channels: ["node.visible"] },
        { id: "text", title: "Text", channels: textChannels("node") },
        { id: "fill", title: "Fill", channels: ["node.color", "node.opacity"] },
        { id: "shaders", title: "Shaders", channels: ["node.shaders"], shaders: true },
    ],
    edge: [
        { id: "visibility", title: "Visibility", channels: ["edge.visible"] },
        { id: "text", title: "Text", channels: textChannels("edge") },
        {
            id: "line",
            title: "Line",
            // Band is a line option, a flat stripe under the line, never a shader.
            channels: [
                "edge.color",
                "edge.opacity",
                "edge.width",
                "edge.style",
                "edge.patternCount",
                "edge.animationSpeed",
                "edge.curvature",
                "edge.taper",
                "edge.lift",
                "edge.bandColor",
                "edge.bandWidth",
                "edge.bandOpacity",
            ],
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
        { id: "shaders", title: "Shaders", channels: ["edge.shaders"], shaders: true },
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
        [true, "On"],
        [false, "Off"],
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
    "node.model": "Model",
    "node.modelSourceUp": "Model up axis",
    "node.modelTurn": "Model turn",
    "node.modelTint": "Use node color",
    "node.modelFit": "Model fit",
    "node.modelCenter": "Model center",
    "node.texture": "Texture",
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
    "node.meshDetail": "Mesh detail",
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
    "node.labelFitQuantum": "Round fitted size to",
    "node.labelFitImage": "Fit image pixel size",
    "node.labelFitImagePadding": "Fit image padding",
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
    "edge.bends": "Bends",
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
    "edge.animationSpeed": "Dash motion",
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
    "edge.labelFont": "Label font",
    "edge.labelWeight": "Label weight",
    "edge.labelItalic": "Label italic",
    "node.shaders": "Shaders",
    "edge.shaders": "Shaders",
    "edge.taper": "Taper",
    "edge.lift": "Lift",
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
    "node.xlabel": "Outside label",
    "node.xlabelStyle": "Outside label style",
    "node.xlabelLocation": "Outside label location",
    "node.xlabelOffsetX": "Outside label offset x",
    "node.xlabelOffsetY": "Outside label offset y",
    "edge.xlabel": "Outside label",
    "edge.xlabelStyle": "Outside label style",
    "edge.xlabelLocation": "Outside label location",
    "edge.xlabelOffsetX": "Outside label offset x",
    "edge.xlabelOffsetY": "Outside label offset y",
    "node.borderWaveAmplitude": "Border wave amplitude",
    "node.borderWavePeriod": "Border wave period",
    "node.outerBorderColor": "Outer border color",
    "node.outerBorderWidth": "Outer border width",
    "node.outerBorderOpacity": "Outer border opacity",
    "node.outerBorderStyle": "Outer border style",
    "node.outerBorderOffset": "Outer border offset",
    "node.outerBorderCount": "Outer border count",
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
    "node.chartWidth": "Chart width",
    "node.chartHeight": "Chart height",
    "node.chartOffsetX": "Chart offset x",
    "node.chartOffsetY": "Chart offset y",
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
    "node.labelTable": "Label table",
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
    "edge.arrowHeadSide": "Target end side",
    "edge.arrowHeadGap": "Target end gap",
    "edge.arrowHeadStack": "Target end stack",
    "edge.arrowHeadImage": "Target end image",
    "edge.arrowHeadTextLetterSize": "Label at target end letter size",
    "edge.arrowHeadTextFont": "Label at target end font",
    "edge.arrowHeadTextWeight": "Label at target end weight",
    "edge.arrowHeadTextOpacity": "Label at target end opacity",
    "edge.arrowHeadTextDistance": "Label at target end distance",
    "edge.arrowHeadTextRotation": "Label at target end rotation",
    "edge.arrowHeadTextOffsetX": "Label at target end offset x",
    "edge.arrowHeadTextOffsetY": "Label at target end offset y",
    "edge.arrowTailSide": "Source end side",
    "edge.arrowTailGap": "Source end gap",
    "edge.arrowTailStack": "Source end stack",
    "edge.arrowTailImage": "Source end image",
    "edge.arrowTailTextLetterSize": "Label at source end letter size",
    "edge.arrowTailTextFont": "Label at source end font",
    "edge.arrowTailTextWeight": "Label at source end weight",
    "edge.arrowTailTextOpacity": "Label at source end opacity",
    "edge.arrowTailTextDistance": "Label at source end distance",
    "edge.arrowTailTextRotation": "Label at source end rotation",
    "edge.arrowTailTextOffsetX": "Label at source end offset x",
    "edge.arrowTailTextOffsetY": "Label at source end offset y",
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
    "node.groupPadding": "Group padding",
    "node.groupPaddingRatio": "Group padding ratio",
    "node.groupPaddingOf": "Group padding of",
    "node.groupMinWidth": "Group min width",
    "node.groupMinWidthBiasLeft": "Group min width bias left",
    "node.groupMinHeight": "Group min height",
    "node.groupMinHeightBiasTop": "Group min height bias top",
    "node.groupIncludeLabels": "Group includes labels",
    "edge.sourceNodeGap": "Source node gap",
    "edge.targetNodeGap": "Target node gap",
    "edge.supportModel": "Support model",
    "edge.supportUnit": "Support unit",
    "edge.supportScale": "Support scale",
    "edge.supportSpringLength": "Support spring length",
    "edge.supportSpringConstant": "Support spring constant",
    "edge.supportRepulsion": "Support repulsion",
    "edge.supportCentralGravity": "Support central gravity",
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

/** Every code graphty-element reports about a model. */
type ModelCode = Extract<GraphtyErrorCode | GraphtyWarningCode, `E_MODEL_${string}` | `W_MODEL_${string}`>;

/**
 * A param as text, cut short.
 * @param value - the param.
 * @returns the text.
 */
function said(value: CodedFact["params"][string] | undefined): string {
    if (Array.isArray(value)) {
        return value.map(String).join(", ");
    }
    return value === undefined || value === null ? "" : String(value);
}

/**
 * A number of things as a reader reads it: "4,200,000".
 * @param value - the param.
 * @returns the text.
 */
function amount(value: CodedFact["params"][string] | undefined): string {
    return typeof value === "number" ? formatCount(value) : said(value);
}

/** What the app says for each model code. Typed over the element's codes, so a new one fails to compile here. */
const MODEL_WORDS: Readonly<Record<ModelCode, (p: CodedFact["params"]) => string>> = {
    E_MODEL_FETCH: (p) =>
        typeof p.status === "number"
            ? `Could not download ${said(p.url)} (${String(p.status)}).`
            : "The server did not answer or does not share its files with other sites. Download the model and drop it here.",
    E_MODEL_URL_BLOCKED: (p) => `This style loads a model from ${said(p.hosts)}, which is not allowed here.`,
    E_MODEL_TOO_LARGE: (p) =>
        `This model is too large: ${amount(p.found)} ${said(p.what)}, the limit is ${amount(p.limit)}. Pick a lighter one.`,
    E_MODEL_STRUCTURE: () => "The model file is damaged.",
    E_MODEL_FORMAT_UNSUPPORTED: (p) =>
        `${said(p.format).toUpperCase()} files cannot be loaded yet. Export as GLB from your 3D program.`,
    E_MODEL_FORMAT_UNKNOWN: (p) => `${said(p.fileName) || "This file"} is not a 3D model file graphty knows.`,
    E_MODEL_AMBIGUOUS: (p) => `Which one is the model? ${said(p.candidates)}. Drop just one of them.`,
    E_MODEL_MISSING_FILE: (p) =>
        `${said(p.referencedBy) || "The model"} needs ${said(p.name)}. Drop the whole folder or a .zip, or export as .glb.`,
    E_MODEL_PART_AMBIGUOUS: (p) =>
        `More than one file could be ${said(p.name)}: ${said(p.candidates)}. Drop just the one the model uses.`,
    E_MODEL_WEB_PAGE: (p) =>
        typeof p.suggested === "string"
            ? `That address is a web page, not a model. Try ${p.suggested}.`
            : "That address is a web page, not a model. Use the address of the file itself.",
    E_MODEL_PART_REQUIRED: (p) => `The model cannot be drawn without ${said(p.name)}.`,
    E_MODEL_EXTERNAL_URL: () => "This model loads parts from somewhere else, which is not allowed. Export it as .glb.",
    E_MODEL_DECODER_UNAVAILABLE: () => "This model is compressed in a way this page cannot read yet.",
    E_MODEL_PARSE: (p) => `The file is damaged or not a valid ${said(p.format).toUpperCase() || "model"}.`,
    E_MODEL_ZIP: () => "The .zip could not be opened.",
    E_MODEL_NAME_TAKEN: (p) => `A different model is already called ${said(p.id).replace(/^asset:/, "")}.`,
    E_MODEL_UNKNOWN_ASSET: () => "This style needs a model that is not here. Add the model file again.",
    E_MODEL_DIGEST_MISMATCH: () => "The model in this file is damaged.",
    W_MODEL_UP_GUESSED: () => "This model may be lying down. Use Turn upright to stand it up.",
    W_MODEL_HAS_ANIMATIONS: () => "This model has animations; they do not play yet.",
    W_MODEL_COLOR_IGNORED: () => "The model keeps its own colors. Use node color to paint it.",
    W_MODEL_HEAVY: (p) => `This model is detailed; with ${amount(p.nodes)} nodes the graph may be slow.`,
    W_MODEL_BUDGET: (p) => `The graph draws ${amount(p.triangles)} triangles and may be slow.`,
    W_MODEL_TRANSPARENT: () => "See-through parts may look wrong where models overlap.",
    W_MODEL_TEXTURES_REDUCED: () => "Some pictures on the model are drawn smaller.",
    W_MODEL_NOT_EMBEDDED: () => "This project names a model it does not carry; others may not be able to open it.",
    W_MODEL_CHANGED: (p) => `The file at ${said(p.url)} changed since this project was saved.`,
    W_MODEL_PART_SUBSTITUTED: (p) => `Used ${said(p.used)} for ${said(p.name)}.`,
    W_MODEL_PART_SKIPPED: (p) => `The model is drawn without ${said(p.name)}.`,
    W_MODEL_PART_UNUSED: (p) => `${said(p.fileName) || "A file"} is not part of this model.`,
    W_MODEL_NOT_KEPT_BY_URL: () => "This model's files came from several places, so the project carries them.",
};

/**
 * What the app says about a model, from the element's coded problem.
 * @param fact - the problem.
 * @returns one or two short sentences.
 */
export function modelWords(fact: CodedFact): string {
    const words = (MODEL_WORDS as Readonly<Record<string, ((p: CodedFact["params"]) => string) | undefined>>)[
        fact.code
    ];
    return words === undefined ? "The model could not be drawn." : words(fact.params);
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

/** Which list a shader gallery opens for: a tab's Shaders, or the graph's Background. */
export type ShaderTab = "node" | "edge" | "background";

/**
 * The words the panel shows for a place, by the tab: `paint` and `over` are both "On the node",
 * since no shader chooses between them (decisions-v2, section 1); an edge's `paint` is "On the line".
 * @param place - the element's place.
 * @param tab - the tab the use is on.
 * @returns the words.
 */
export function placeWords(place: ShaderPlace | undefined, tab: ShaderTab = "node"): string {
    switch (place) {
        case "replace":
            return "Instead of the node";
        case "around":
            return "Around";
        case "behind":
            return "Behind";
        case "along":
            return "Along the line";
        case "group":
            return "Around the group";
        case "paint":
        case "over":
        case undefined:
            return tab === "edge" ? "On the line" : "On the node";
        default:
            // OPEN UNION: a place a newer element adds is shown by its own name.
            return String(place);
    }
}

/** The gallery's origin filter: every shader, the element's own, or those added to this project. */
export const ORIGIN_FILTERS = [
    { key: "all", label: "All" },
    { key: "builtIn", label: "Built in" },
    { key: "project", label: "This project" },
] as const;

/** The place a tab's "New shader..." starts at: the tab's first place. */
export const FIRST_PLACE: Readonly<Record<ShaderTab, ShaderPlace | undefined>> = {
    node: "paint",
    edge: "paint",
    background: undefined,
};

/** The places the code dialog's Place field lists on a tab, in its order. */
export const DIALOG_PLACES: Readonly<Record<ShaderTab, readonly ShaderPlace[]>> = {
    node: ["paint", "over", "replace", "around", "behind", "group"],
    edge: ["paint", "along"],
    background: [],
};

/**
 * The dialog's words for a place: "On the node" twice would be two choices with one name, so the
 * dialog, where an author writes code for one drawing, names `over` by what it adds.
 * @param place - the place.
 * @param tab - the tab.
 * @returns the words.
 */
export function dialogPlaceWords(place: ShaderPlace, tab: ShaderTab): string {
    return place === "over" ? "On the node, over its paint" : placeWords(place, tab);
}

/**
 * The target a tab's shaders draw on: a group outline's on the Node tab is the group.
 * @param tab - the tab.
 * @param place - the place.
 * @returns the target.
 */
export function targetOfPlace(
    tab: ShaderTab,
    place: ShaderPlace | undefined,
): "node" | "edge" | "group" | "background" {
    if (tab === "background") {
        return "background";
    }
    return place === "group" ? "group" : tab;
}

/**
 * The caption of a shape row a shader hides: "Hidden: Sticker draws instead of the node".
 * @param shader - the shader's name.
 * @returns the words.
 */
export function hiddenByWords(shader: string): string {
    return `Hidden: ${shader} draws instead of the node`;
}

/** The three neutral facts a gallery tile and a settings pop-out show, as their words. */
export const SHADER_FACT_WORDS = {
    animates: "Animates",
    light: "Reacts to light",
    cost: (cost: string): string => {
        switch (cost) {
            case "light":
                return "Light to draw";
            case "medium":
                return "Medium cost to draw";
            case "heavy":
                return "Heavy: costly on a slow device";
            default:
                return `Cost: ${cost}`;
        }
    },
} as const;

/** What a tile from the tab's own style options says it is: "Shape option", "Line option". */
export const OPTION_TILE_WORDS: Readonly<Record<"node" | "edge", string>> = {
    node: "Shape option",
    edge: "Line option",
};

/** The code dialog's link to the published guide to writing a shader. */
export const PASTE_GUIDE_WORDS = "How to write one";

/** The gallery's words: its search box, the last tile, and an empty result. */
export const GALLERY_WORDS = {
    search: (tab: ShaderTab): string => (tab === "background" ? "Find background shader" : `Find ${tab} shader`),
    tiles: "Shaders",
    newShader: "New shader...",
    none: "No match",
    place: "Place",
    origin: "Origin",
    project: "This project",
    inUse: "In use",
} as const;

/**
 * What a shader row's move announces, and its handle's position: "Pearl moved to 2 of 3",
 * "Pearl is already first", "2 of 3".
 */
export const SHADER_MOVE_WORDS = {
    moved: (shader: string, at: number, count: number): string =>
        `${shader} moved to ${String(at)} of ${String(count)}`,
    end: (shader: string, first: boolean): string => `${shader} is already ${first ? "first" : "last"}`,
    position: (at: number, count: number): string => `${String(at)} of ${String(count)}`,
    up: "Move up",
    down: "Move down",
} as const;

/**
 * What Undo and Redo call a shader write, by the shader's name and the parameter's: "changing
 * Reticle spin", "adding Aura", "changing Pearl to Glass marble", "hiding Aura".
 */
export const SHADER_STEP_WORDS = {
    param: (shader: string, param: string): string => `changing ${shader} ${param.toLowerCase()}`,
    unbind: (shader: string, param: string): string => `fixing ${shader} ${param.toLowerCase()}`,
    add: (shader: string): string => `adding ${shader}`,
    swap: (from: string, to: string): string => `changing ${from} to ${to}`,
    remove: (shader: string): string => `removing ${shader}`,
    shown: (shader: string, shown: boolean): string => `${shown ? "showing" : "hiding"} ${shader}`,
    move: (shader: string): string => `moving ${shader}`,
    wireframe: (on: boolean): string => (on ? "turning wireframe on" : "turning wireframe off"),
    /** A shader the catalog no longer holds (a pasted one, deleted). */
    unknown: "a shader",
} as const;

/**
 * The words a reader may search the gallery by beside a shader's name, by preset id: glass,
 * metal, glow, bubble, 3D, shiny. Grouping and searching are the app's; the ids are the catalog's.
 */
const SHADER_ALIASES: Readonly<Record<string, readonly string[]>> = {
    glass: ["bubble", "3D"],
    "glass-marble": ["glass", "3D", "shiny"],
    "frosted-glass": ["glass", "3D"],
    pearl: ["shiny", "3D"],
    gemstone: ["shiny", "3D", "glass"],
    "disco-ball": ["shiny", "3D", "metal"],
    "liquid-metal": ["metal", "shiny", "3D"],
    "anodized-steel": ["metal", "shiny", "3D"],
    "matcap-ink": ["3D"],
    "cel-shade": ["3D"],
    halftone: ["3D"],
    lantern: ["3D"],
    "foil-shimmer": ["shiny"],
    hologram: ["shiny"],
    frost: ["glass"],
    "soap-bubble": ["bubble"],
};

/**
 * Whether a gallery search finds a shader: the start of a word of its name or of one of its
 * aliases.
 * @param descriptor - the catalog's entry.
 * @param query - the search text.
 * @returns true when it matches.
 */
export function shaderMatches(descriptor: Pick<ShaderDescriptor, "id" | "plainName">, query: string): boolean {
    return [descriptor.plainName, ...(SHADER_ALIASES[descriptor.id] ?? [])].some((name) =>
        matchesWordStart(name, query),
    );
}

/** What a shader reads from the layers beneath, as the settings pop-out's Uses row names it. */
const INPUT_WORDS: Readonly<Record<ShaderInput, string>> = {
    color: "color",
    opacity: "opacity",
    size: "size",
    shape: "shape",
    width: "width",
    selected: "selection",
    hovered: "hover",
    pinned: "pin",
    times: "changes",
    members: "group members",
    light: "light",
};

/**
 * The Uses row: what the shader reads from the layers beneath, "Color, size", or "Nothing".
 * @param reads - the catalog's `reads`.
 * @returns the words.
 */
export function usesWords(reads: readonly ShaderInput[]): string {
    const words = reads.map((input) => (INPUT_WORDS as Readonly<Record<string, string>>)[input] ?? input);
    const joined = words.length === 0 ? "nothing" : words.join(", ");
    return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/**
 * Why a gallery tile cannot be picked here, from the element's coded answer.
 * @param problem - the element's problem.
 * @returns a short reason.
 */
export function shaderProblemWords(problem: ShaderProblem): string {
    switch (problem.code) {
        case "shader.webgpu-unsupported":
            return "Not drawn with WebGPU";
        case "shader.held":
            return "Held until you run it";
        case "shader.quarantined":
            return "Turned off after a crash";
        case "shader.compile":
            return "Does not compile here";
        case "shader.guard-off":
            return "Off: the graphics card is slow";
        case "shader.unknown":
            return "Not in this project";
        default:
            return "Cannot be drawn here";
    }
}

/**
 * The item a section's "+" gives for an effect a layer beneath adds: "Aura off".
 * @param name - the effect's name.
 * @returns the words.
 */
export function effectOffWords(name: string): string {
    return `${name} off`;
}

/** The moments a clock counts from, as a bound parameter's value shows them. */
const CLOCK_WORDS: Readonly<Record<string, string>> = {
    "since.matched": "When this layer starts applying",
    "since.unmatched": "When this layer stops applying",
    "since.selected": "When selected",
    "since.deselected": "When deselected",
    "since.hovered": "When hovered",
    "since.unhovered": "When no longer hovered",
    "since.pinned": "When pinned",
    "since.unpinned": "When unpinned",
    "since.added": "When added",
    "since.changed": "When its data changes",
};

/**
 * A parameter bound to a clock, as its value reads: "Starts: When this layer starts applying, over
 * 0.3 s".
 * @param binding - the binding.
 * @param binding.by - the clock.
 * @param binding.domain - the seconds it maps.
 * @returns the words.
 */
export function clockWords(binding: { readonly by: string; readonly domain: readonly [number, number] }): string {
    const span = binding.domain[1] - binding.domain[0];
    const moment = CLOCK_WORDS[binding.by] ?? binding.by;
    return `Starts: ${moment}, over ${String(Math.round(span * 100) / 100)} s`;
}

/**
 * Where a problem in pasted shader text is: "Line 12:8", or undefined when it has no place.
 * @param problem - the element's problem.
 * @returns the words, or undefined.
 */
export function shaderPlaceWords(problem: ShaderProblem): string | undefined {
    const { line, column } = problem.params;
    if (typeof line !== "number") {
        return undefined;
    }
    return typeof column === "number" ? `Line ${String(line)}:${String(column)}` : `Line ${String(line)}`;
}

/**
 * What is wrong with pasted shader text, from the element's code: a short phrase, the parser's or
 * the driver's own message shown as data after it.
 * @param problem - the element's problem.
 * @returns the words.
 */
export function pasteProblemWords(problem: ShaderProblem): string {
    const p = problem.params;
    const said = typeof p.message === "string" && p.message !== "" ? `: ${p.message}` : "";
    switch (problem.code) {
        case "shader.header-missing":
            return "No header";
        case "shader.header-json":
            return `Header is not JSON${said}`;
        case "shader.header-key":
            return `Header key "${String(p.key)}"`;
        case "shader.target-mismatch":
            return `Written for ${String(p.found)}s`;
        case "shader.place-unsupported":
            return `Cannot draw ${placeWords(p.place as ShaderPlace).toLowerCase()}`;
        case "shader.min-size-place":
            return "Minimum size needs a place outside the node";
        case "shader.id-invalid":
            return `Bad id "${String(p.id)}"`;
        case "shader.id-taken":
            return `Id "${String(p.id)}" is taken`;
        case "shader.param-invalid":
            return `Parameter ${String(p.param)}: bad ${String(p.field)}`;
        case "shader.too-many-params":
            return `Over ${String(p.limit)} parameters`;
        case "shader.too-large":
            return "Too long";
        case "shader.too-many":
            return `Over ${String(p.limit)} shaders in this project`;
        case "shader.not-ascii":
            return "Not plain ASCII";
        case "shader.preprocessor":
            return "No # lines";
        case "shader.reserved":
            return `"${String(p.name)}" is reserved`;
        case "shader.loop-unbounded":
            return "Loop without a fixed count";
        case "shader.loop-too-long":
            return `Loop over ${String(p.limit)} steps`;
        case "shader.too-costly":
            return "Too costly";
        case "shader.too-deep":
            return "Nested too deep";
        case "shader.texture-unsupported":
            return "No textures";
        case "shader.entry-missing":
            return "No shade function";
        case "shader.entry-signature":
            // A kind's own signature ("vec4 shade(NodeInput node)"), or only the function's name.
            return String(p.expected).includes("(")
                ? `Write it as ${String(p.expected)}`
                : "shade has the wrong inputs";
        case "shader.apply-target":
            return "Not for this layer's kind";
        case "shader.compile":
            return `Does not compile${said}`;
        case "shader.over-budget":
            return "Too slow to draw";
        default:
            return shaderProblemWords(problem);
    }
}

/**
 * The name Duplicate and edit gives its copy: "Pearl copy".
 * @param name - the shader's name.
 * @returns the words.
 */
export function copyNameWords(name: string): string {
    return `${name} copy`;
}

/** Why the paste dialog's Add cannot be pressed yet. */
export const PASTE_WAIT_WORDS = { empty: "Nothing to add", checking: "Checking" } as const;

/**
 * Why Add cannot be pressed: how many problems the text has.
 * @param count - the problems.
 * @returns the words.
 */
export function pasteProblemsWord(count: number): string {
    return count === 1 ? "1 problem" : `${String(count)} problems`;
}

/**
 * How many layers use a shader, beside Delete from project: "2 layers".
 * @param count - the layers.
 * @returns the words.
 */
export function layersWord(count: number): string {
    return count === 1 ? "1 layer" : `${String(count)} layers`;
}

/** The Background row's paint types, as Figma's fill. */
export const BACKGROUND_WORDS = { color: "Color", image: "Image", shader: "Shader" } as const;

/**
 * The Background section's words: its "+" (Color, Image and Shader, one of each), the reason a
 * kind already there is disabled in its menu, each row's minus, and the caption that names the
 * color drawn when the background sets none.
 */
export const BACKGROUND_SECTION_WORDS = {
    title: "Background",
    add: "Add to background",
    present: (kind: string): string => `${kind} is already in the background`,
    remove: (kind: string): string => `Remove background ${kind.toLowerCase()}`,
    drawnIn: (word: string, hex: string): string => {
        const named = word === "" ? hex : `${word} (${hex})`;
        return `No color set: drawn in ${named}`;
    },
} as const;

/** The Quality row's choices: the reader's `shaderSettings.quality`. */
export const SHADER_QUALITY_WORDS = { auto: "Auto", low: "Low", medium: "Medium", high: "High" } as const;

/** The Motion row's choices: the reader's `shaderSettings.motion`. */
export const SHADER_MOTION_WORDS = { system: "System", on: "On", off: "Off" } as const;

/** The canvas menu's two Motion commands: the one shown is the one that changes something. */
export const MOTION_COMMAND_WORDS = { off: "Motion off", on: "Motion on" } as const;

/**
 * The graph's Values tab row when the frame guard changed the quality: the level and, after a
 * dash, what the motion and heavy shaders do when they differ from full.
 * @param quality - the element's `renderQuality`.
 * @param quality.level - its level.
 * @param quality.motion - its motion.
 * @param quality.heavy - whether heavy shaders draw.
 * @returns the words, such as "Medium" or "Low, motion paused".
 */
export function renderQualityWords(quality: {
    readonly level: "low" | "medium" | "high";
    readonly motion: string;
    readonly heavy: string;
}): string {
    const parts: string[] = [SHADER_QUALITY_WORDS[quality.level]];
    if (quality.motion === "half") {
        parts.push("motion at half speed");
    } else if (quality.motion === "paused") {
        parts.push("motion paused");
    }
    if (quality.heavy === "off") {
        parts.push("heavy shaders off");
    }
    return parts.join(", ");
}

/**
 * The load report's words for the shaders it held: "Held: Plate" or "Held: 3 shaders".
 * @param names - the held shaders' names.
 * @returns the words.
 */
export function heldShadersWords(names: readonly string[]): string {
    return names.length <= 2 ? `Held: ${names.join(", ")}` : `Held: ${String(names.length)} shaders`;
}

/**
 * How many layers use a held shader, in the Held shaders list: "Used by 2".
 * @param count - the layers and settings that name it.
 * @returns the words.
 */
export function usedByWords(count: number): string {
    return `Used by ${String(count)}`;
}

/** A group outline's Group by line: "Group by Louvain", or "Group by None" for one outline around all. */
export const GROUP_BY_WORDS = {
    title: "Group by",
    /**
     * The line under the outline.
     * @param value - what it groups by.
     * @returns the words.
     */
    line: (value: string): string => `Group by ${value}`,
    none: "None",
} as const;
