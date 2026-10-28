import { assert, describe, it } from "vitest";

import { LABEL_STYLE_FIELDS } from "../../../src/catalog/label-style";
import type { Binding, EdgeLinePattern } from "../../../src/catalog/types";
import { defaultEdgeStyle } from "../../../src/config/EdgeStyle";
import { defaultNodeStyle, NodeShapes } from "../../../src/config/NodeStyle";
import {
    type ArrowValue,
    type AuthoredValue,
    CHANNEL_DESCRIPTORS,
    type ChannelDescriptor,
    channelDescriptor,
    CHANNELS,
    channelsFor,
    type ChannelValueKind,
    type ChannelValues,
    COLOR_CHANNELS,
    type ColorChannel,
    DEFAULT_GLOW_COLOR,
    DEFAULT_OUTLINE_COLOR,
    type EdgeLineValue,
    isChannel,
    modelBindingProblem,
    type NodeShapeValue,
    type PaintedValue,
    toColorValue,
} from "../../../src/session/styles/channels";

/** The channels the element publishes, in the order the table declares them. */
const DECLARED = [
    "node.color",
    "node.size",
    "node.sizeMode",
    "node.shape",
    "node.label",
    "node.labelStyle",
    "node.labelColor",
    "node.labelSize",
    "node.labelLetterSize",
    "node.labelFont",
    "node.labelWeight",
    "node.labelItalic",
    "node.labelWrapWidth",
    "node.labelWrapTrailingSpace",
    "node.labelWrapEllipsis",
    "node.labelWrapAnywhere",
    "node.labelWrapSpaceCount",
    "node.labelRunAlign",
    "node.labelMinScreenSize",
    "node.labelOnTop",
    "node.labelRotation",
    "node.labelBackground",
    "node.labelOutline",
    "node.labelOutlineWidth",
    "node.labelBorder",
    "node.labelBorderWidth",
    "node.labelOpacity",
    "node.labelBackgroundOpacity",
    "node.labelOutlineOpacity",
    "node.labelBorderOpacity",
    "node.labelPadding",
    "node.labelCornerRadius",
    "node.labelLineHeight",
    "node.labelOffsetX",
    "node.labelOffsetY",
    "node.labelShiftX",
    "node.labelShiftY",
    "node.labelDeclutter",
    "node.labelMinNodeScreenSize",
    "node.labelTextAlign",
    "node.labelLocation",
    "node.tooltip",
    "node.tooltipStyle",
    "node.opacity",
    "node.outline",
    "node.glow",
    "node.glowStrength",
    "node.halo",
    "node.haloColor",
    "node.haloScale",
    "node.haloOpacity",
    "node.wireframe",
    "node.meshDetail",
    "node.flat",
    "node.unlit",
    "node.marker",
    "node.width",
    "node.height",
    "node.depth",
    "node.planar",
    "node.zIndex",
    "node.drawOrder",
    "node.borderColor",
    "node.borderWidth",
    "node.borderScreenWidth",
    "node.borderOpacity",
    "node.borderStyle",
    "node.borderPosition",
    "node.borderWaveAmplitude",
    "node.borderWavePeriod",
    "node.outerBorderColor",
    "node.outerBorderWidth",
    "node.outerBorderOpacity",
    "node.outerBorderStyle",
    "node.outerBorderOffset",
    "node.underlayColor",
    "node.underlayOpacity",
    "node.underlayPadding",
    "node.underlayShape",
    "node.underlayCornerRadius",
    "node.overlayColor",
    "node.overlayOpacity",
    "node.overlayPadding",
    "node.overlayShape",
    "node.overlayCornerRadius",
    "node.image",
    "node.imageFallback",
    "node.imageFit",
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
    "node.glyph",
    "node.glyphFont",
    "node.glyphSize",
    "node.glyphWeight",
    "node.glyphColor",
    "node.pieColors",
    "node.pieSizes",
    "node.pieOpacities",
    "node.pieRadius",
    "node.pieHole",
    "node.pieRotation",
    "node.pieFitBox",
    "node.pieOffsetX",
    "node.pieOffsetY",
    "node.stripeColors",
    "node.stripeSizes",
    "node.stripeOpacities",
    "node.stripeDirection",
    "node.stripeSize",
    "node.chartKind",
    "node.chartValues",
    "node.chartColors",
    "node.chartMin",
    "node.chartMax",
    "node.chartHorizontal",
    "node.chartSize",
    "node.chartMargin",
    "node.chartGap",
    "node.chartLineWidth",
    "node.chartBorderColor",
    "node.chartBorderWidth",
    "node.groupPadding",
    "node.groupPaddingRatio",
    "node.groupPaddingOf",
    "node.groupMinWidth",
    "node.groupMinHeight",
    "node.groupMinWidthBiasLeft",
    "node.groupMinHeightBiasTop",
    "node.groupIncludeLabels",
    "node.cornerRadius",
    "node.exactCornerRadius",
    "node.shapePoints",
    "node.shapeStretchPoints",
    "node.shapeParts",
    "node.shapeLines",
    "node.shapeTexts",
    "node.shapeLineWidth",
    "node.labelFit",
    "node.labelPaddingX",
    "node.labelPaddingY",
    "node.labelFitSquare",
    "node.gradientColor",
    "node.gradientDirection",
    "node.gradientColors",
    "node.gradientStops",
    "node.gradientKind",
    "node.model",
    "node.modelSourceUp",
    "node.modelTurn",
    "node.modelTint",
    "node.modelFit",
    "node.modelCenter",
    "node.texture",
    "edge.color",
    "edge.width",
    "edge.minScreenWidth",
    "edge.opacity",
    "edge.bandColor",
    "edge.bandWidth",
    "edge.bandOpacity",
    "edge.outlineColor",
    "edge.outlineWidth",
    "edge.outlineOpacity",
    "edge.outlineStyle",
    "edge.underlayColor",
    "edge.underlayOpacity",
    "edge.underlayPadding",
    "edge.overlayColor",
    "edge.overlayOpacity",
    "edge.overlayPadding",
    "edge.gradientColors",
    "edge.gradientStops",
    "edge.gradientKind",
    "edge.style",
    "edge.patternCount",
    "edge.waveAmplitude",
    "edge.wavePeriod",
    "edge.curvature",
    "edge.bends",
    "edge.fanSpacing",
    "edge.fanned",
    "edge.bendCurve",
    "edge.arcRadius",
    "edge.supportModel",
    "edge.supportSpringLength",
    "edge.supportSpringConstant",
    "edge.supportRepulsion",
    "edge.supportCentralGravity",
    "edge.supportUnit",
    "edge.route",
    "edge.arcHeight",
    "edge.nodeGap",
    "edge.sourceNodeGap",
    "edge.targetNodeGap",
    "edge.sourcePort",
    "edge.targetPort",
    "edge.arrowHead",
    "edge.arrowHeadSize",
    "edge.arrowHeadWidth",
    "edge.arrowHeadSide",
    "edge.arrowHeadPosition",
    "edge.arrowHeadGap",
    "edge.arrowHeadColor",
    "edge.arrowHeadOpacity",
    "edge.arrowHeadImage",
    "edge.arrowHeadText",
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
    "edge.arrowTail",
    "edge.arrowTailSize",
    "edge.arrowTailWidth",
    "edge.arrowTailSide",
    "edge.arrowTailPosition",
    "edge.arrowTailGap",
    "edge.arrowTailColor",
    "edge.arrowTailOpacity",
    "edge.arrowTailImage",
    "edge.arrowTailText",
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
    "edge.arrowMiddleHead",
    "edge.arrowMiddleHeadSize",
    "edge.arrowMiddleHeadWidth",
    "edge.arrowMiddleHeadSide",
    "edge.arrowMiddleHeadPosition",
    "edge.arrowMiddleHeadColor",
    "edge.arrowMiddleHeadOpacity",
    "edge.arrowMiddleHeadImage",
    "edge.arrowMiddleTail",
    "edge.arrowMiddleTailSize",
    "edge.arrowMiddleTailWidth",
    "edge.arrowMiddleTailSide",
    "edge.arrowMiddleTailPosition",
    "edge.arrowMiddleTailColor",
    "edge.arrowMiddleTailOpacity",
    "edge.arrowMiddleTailImage",
    "edge.animationSpeed",
    "edge.label",
    "edge.labelStyle",
    "edge.labelTextAlign",
    "edge.labelLocation",
    "node.visible",
    "node.tooltipSize",
    "node.tooltipColor",
    "node.tooltipBackground",
    "edge.visible",
    "edge.labelSize",
    "edge.labelColor",
    "edge.labelBackground",
    "edge.arrowHeadTextBackground",
    "edge.arrowTailTextBackground",
    "edge.labelLetterSize",
    "edge.labelFont",
    "edge.labelWeight",
    "edge.labelItalic",
    "edge.labelWrapWidth",
    "edge.labelWrapTrailingSpace",
    "edge.labelWrapEllipsis",
    "edge.labelWrapAnywhere",
    "edge.labelWrapSpaceCount",
    "edge.labelRunAlign",
    "edge.labelMinScreenSize",
    "edge.labelOnTop",
    "edge.labelRotation",
    "edge.labelOutline",
    "edge.labelOutlineWidth",
    "edge.labelBorder",
    "edge.labelBorderWidth",
    "edge.labelOpacity",
    "edge.labelBackgroundOpacity",
    "edge.labelOutlineOpacity",
    "edge.labelBorderOpacity",
    "edge.labelPadding",
    "edge.labelCornerRadius",
    "edge.labelLineHeight",
    "edge.labelOffsetX",
    "edge.labelOffsetY",
    "edge.labelShiftX",
    "edge.labelShiftY",
    "node.shaders",
    "edge.shaders",
    "edge.taper",
    "edge.lift",
];

describe("the channel set", () => {
    it("is exactly the declared set, closed and in order", () => {
        assert.deepEqual([...CHANNELS], DECLARED);
    });

    it("keys every descriptor by its own name, so a table entry cannot describe another channel", () => {
        for (const channel of CHANNELS) {
            assert.strictEqual(CHANNEL_DESCRIPTORS[channel].channel, channel);
        }
    });

    it("targets whatever the name says it targets", () => {
        for (const channel of CHANNELS) {
            const expected = channel.startsWith("node.") ? "node" : "edge";
            assert.strictEqual(CHANNEL_DESCRIPTORS[channel].target, expected, channel);
        }
    });

    it("says where every channel lands in a parsed style", () => {
        for (const channel of CHANNELS) {
            assert.isNotEmpty(CHANNEL_DESCRIPTORS[channel].stylePath, channel);
        }
    });

    it("splits into one hundred and sixty-eight node channels and one hundred and forty-three edge channels", () => {
        assert.strictEqual(channelsFor("node").length, 168);
        assert.strictEqual(channelsFor("edge").length, 143);
        assert.deepEqual(
            channelsFor("edge").map((descriptor) => descriptor.channel),
            DECLARED.filter((channel) => channel.startsWith("edge.")),
        );
    });

    it("recognises a channel and refuses anything else, so a misspelling is never a silent no-op", () => {
        assert.isTrue(isChannel("node.color"));
        assert.isFalse(isChannel("node.colour"));
        assert.isFalse(isChannel("nodeColor"));
        assert.isFalse(isChannel(""));
        assert.isFalse(isChannel(7));
        assert.isFalse(isChannel(null));
        // Object.hasOwn rather than a property read, so an inherited name is not a channel.
        assert.isFalse(isChannel("toString"));
        assert.isFalse(isChannel("constructor"));
    });

    it("looks one channel up and answers undefined for a name it does not have", () => {
        assert.strictEqual(channelDescriptor("edge.width")?.plainName, "Edge Width");
        assert.isUndefined(channelDescriptor("edge.thickness"));
    });
});

describe("what the element can really draw", () => {
    it("draws every channel but the marker", () => {
        const unrenderable = CHANNELS.filter((channel) => !CHANNEL_DESCRIPTORS[channel].renderable);

        assert.deepEqual(unrenderable, ["node.marker"]);
    });

    it("says why the marker draws nothing, rather than accepting a value and dropping it", () => {
        const marker = CHANNEL_DESCRIPTORS["node.marker"];

        assert.strictEqual(marker.accepts, "nothing");
        assert.isDefined(marker.caveat);
    });

    it("records what the renderer narrows, on the channels it narrows", () => {
        // A curvature is a switch, not an amount.
        assert.isDefined(CHANNEL_DESCRIPTORS["edge.curvature"].caveat);
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.curvature"].accepts, "boolean");
        assert.isDefined(CHANNEL_DESCRIPTORS["node.outline"].caveat);
        // A glow's strength is drawn per style (one source mesh per strength), so it carries no
        // caveat: the old one said two glowing styles shared whichever strength landed last.
        assert.isUndefined(CHANNEL_DESCRIPTORS["node.glowStrength"].caveat);
        assert.isDefined(CHANNEL_DESCRIPTORS["edge.patternCount"].caveat);
    });

    it("stops saying a capability has no channel on the caveat of a neighbouring channel", () => {
        // `node.glow` used to carry "the glow's strength is not a channel", which is where a
        // missing capability was recorded until it became a waiver list a test can read. The
        // strength has a channel now, so the sentence would be false as well as misplaced.
        assert.isUndefined(CHANNEL_DESCRIPTORS["node.glow"].caveat);
    });

    it("says nothing about label fields the vocabulary no longer has", () => {
        // Both labelStyle channels carried "The renderer sizes a label to its text, so maxWidth
        // and wrap are not drawn." Those two fields were taken OFF `LabelStyle` for 2.0 rather
        // than implemented -- the renderer never read either -- so the sentence named two fields
        // a consumer cannot write, which is the same documented lie as a field with no renderer
        // pointing the other way. A caveat is published: a settings panel, a plugin or a model
        // reading the catalogue sees it.
        assert.isUndefined(CHANNEL_DESCRIPTORS["node.labelStyle"].caveat);
        assert.isUndefined(CHANNEL_DESCRIPTORS["edge.labelStyle"].caveat);
        assert.notInclude(LABEL_STYLE_FIELDS as string[], "maxWidth");
        assert.notInclude(LABEL_STYLE_FIELDS as string[], "wrap");
    });

    it("says on both tooltip channels that a tooltip is hover-only, and that an edge has none", () => {
        // Two things a consumer meets as silence otherwise. A tooltip is drawn on hover, so a
        // layer that writes one changes nothing on a graph at rest -- which looks exactly like a
        // layer that never landed. And `edge.tooltip` was published through 1.x and withdrawn in
        // 2.0, so somebody who had one needs to be told where it went by the channels that are
        // left rather than by a parse error alone.
        for (const channel of ["node.tooltip", "node.tooltipStyle"] as const) {
            const { caveat } = CHANNEL_DESCRIPTORS[channel];

            assert.isDefined(caveat, channel);
            assert.include(caveat, "hover", channel);
            assert.include(caveat, "edge.tooltip", channel);
        }

        assert.strictEqual(CHANNEL_DESCRIPTORS["node.tooltip"].stylePath, "tooltip.text");
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.tooltipStyle"].stylePath, "tooltip");
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.tooltipStyle"].accepts, "labelStyle");
        assert.isFalse(isChannel("edge.tooltip"));
    });

    it("says what a caption at the end of an arrow narrows, on all four of its channels", () => {
        // Two narrowings, and a consumer meets both by writing a layer that draws nothing: a
        // caption hangs from a cap, so an end with no arrow carries none; and the WORDS are what
        // switch one on, so an appearance written on its own asks for nothing.
        for (const channel of [
            "edge.arrowHeadText",
            "edge.arrowHeadTextStyle",
            "edge.arrowHeadTextSize",
            "edge.arrowHeadTextLetterSize",
            "edge.arrowHeadTextDistance",
            "edge.arrowTailText",
            "edge.arrowTailTextStyle",
            "edge.arrowTailTextSize",
            "edge.arrowTailTextLetterSize",
            "edge.arrowTailTextDistance",
        ] as const) {
            assert.isDefined(CHANNEL_DESCRIPTORS[channel].caveat, channel);
        }

        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowHeadText"].stylePath, "arrowHead.text.text");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowHeadTextStyle"].stylePath, "arrowHead.text");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowTailText"].stylePath, "arrowTail.text.text");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowTailTextStyle"].stylePath, "arrowTail.text");
    });

    it("takes the node shapes from the schema the mesh builder reads, not from a second list", () => {
        assert.deepEqual(CHANNEL_DESCRIPTORS["node.shape"].values, [...NodeShapes.options]);
    });

    it("offers the fifteen line patterns the edge renderer has meshes for", () => {
        const patterns = CHANNEL_DESCRIPTORS["edge.style"].values ?? [];

        assert.deepEqual(
            [...patterns],
            [
                "solid",
                "dot",
                "star",
                "box",
                "dash",
                "diamond",
                "dash-dot",
                "sinewave",
                "zigzag",
                "double",
                "forward-slash",
                "backward-slash",
                "vertical-slash",
                "separate-arrow",
                "contiguous-arrow",
            ],
        );
    });

    it("publishes the same fifteen patterns from the catalogue that the control offers", () => {
        // EdgeLinePattern used to be a second list, written out by hand in src/catalog/types.ts:
        // nine names of which seven -- "dashed", "dotted", "dash-dot-dot", "long-dash",
        // "short-dash", "double", "wave" -- had never had a mesh, while seven the renderer does
        // draw were missing from it. It is derived from the schema now, so a consumer who writes
        // a value the published type accepts gets a layer the element accepts.
        const patterns = CHANNEL_DESCRIPTORS["edge.style"].values ?? [];
        const fromTheCatalogue: EdgeLinePattern[] = [
            "solid",
            "dot",
            "star",
            "box",
            "dash",
            "diamond",
            "dash-dot",
            "sinewave",
            "zigzag",
            "double",
            "forward-slash",
            "backward-slash",
            "vertical-slash",
            "separate-arrow",
            "contiguous-arrow",
        ];

        assert.deepEqual([...patterns], fromTheCatalogue);

        for (const invented of ["dashed", "dotted", "dash-dot-dot", "long-dash", "short-dash", "wave"]) {
            assert.notInclude(patterns, invented);
        }
    });

    it("offers the same arrows at both ends", () => {
        const head = CHANNEL_DESCRIPTORS["edge.arrowHead"].values ?? [];

        assert.deepEqual(CHANNEL_DESCRIPTORS["edge.arrowTail"].values, head);
        assert.include(head, "normal");
        assert.include(head, "none");
    });

    it("offers the same size, colour and opacity at both ends, because 1.x drew them at both", () => {
        for (const property of ["Size", "Color", "Opacity"] as const) {
            const head = CHANNEL_DESCRIPTORS[`edge.arrowHead${property}`];
            const tail = CHANNEL_DESCRIPTORS[`edge.arrowTail${property}`];

            assert.strictEqual(head.accepts, tail.accepts, property);
            assert.strictEqual(head.min, tail.min, property);
            assert.strictEqual(head.max, tail.max, property);
            assert.strictEqual(head.stylePath, `arrowHead.${property.toLowerCase()}`);
            assert.strictEqual(tail.stylePath, `arrowTail.${property.toLowerCase()}`);
        }
    });

    it("bounds the numbers the renderer bounds", () => {
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.opacity"].max, 1);
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.opacity"].max, 1);
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.size"].min, 0);
        assert.isUndefined(CHANNEL_DESCRIPTORS["node.size"].max);
    });

    it("draws a glow with no strength at 1, and offers 0, which draws no glow", () => {
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.glowStrength"].default, 1);
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.glowStrength"].min, 0);
    });

    it("states the colour a switched-on outline or glow is drawn in when none is named", () => {
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.glow"].default, DEFAULT_GLOW_COLOR);
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.outline"].default, DEFAULT_OUTLINE_COLOR);
    });
});

describe("what a style editor needs to draw a row", () => {
    /** The groups each target's channels may sit in. */
    const GROUPS = { node: ["shape", "color", "effects", "text"], edge: ["line", "arrows", "text"] };

    /** The channels whose unset value draws nothing, or is decided per element, so carry no default. */
    const NO_DEFAULT = new Set([
        // Unset, a group reaches its largest member's radius past its members.
        "node.groupPadding",
        "node.groupPaddingRatio",
        "node.shapeParts",
        "node.shapeLines",
        "node.shapeTexts",
        "node.shapeLineWidth",
        "node.gradientColors",
        "node.gradientStops",
        "node.label",
        "node.labelStyle",
        "node.tooltip",
        "node.tooltipStyle",
        // Unset, a node is highlighted when it is selected and not otherwise.
        "node.halo",
        "node.marker",
        // Unset, a node's width, height and depth follow its size and its shape's proportions.
        "node.width",
        "node.height",
        "node.depth",
        // Unset, a border is as wide as `node.borderWidth` says, in the scene's units.
        "node.borderScreenWidth",
        // Unset, a node is drawn where it always was, with no order among its neighbours.
        "node.drawOrder",
        // Unset, a round-rectangle's corners are a quarter of its shorter side.
        "node.cornerRadius",
        // Unset, a polygon is drawn as its box.
        "node.shapePoints",
        // Unset, a node draws no image, pie or stripes over its face; the sizes and opacities of slices and
        // bands, and an image's width, height and pixel size, follow from the rest.
        "node.image",
        "node.imageFallback",
        "node.imageWidth",
        "node.imageHeight",
        "node.imagePixelSize",
        // Unset, a node draws no glyph; its font and size follow from the rest.
        "node.glyph",
        "node.glyphFont",
        "node.glyphSize",
        "node.pieColors",
        "node.pieSizes",
        "node.pieOpacities",
        "node.chartValues",
        "node.chartColors",
        "node.chartMin",
        "node.chartMax",
        "node.chartLineWidth",
        "node.chartBorderColor",
        "node.stripeColors",
        "node.stripeSizes",
        "node.stripeOpacities",
        // Unset, a node is the size it states rather than its label's.
        "node.labelFit",
        // Unset, a node is filled flat with its colour.
        "node.gradientColor",
        // Unset, a node draws its shape and no model.
        "node.model",
        // Unset, a node draws its own color and no picture.
        "node.texture",
        "edge.patternCount",
        // Unset, a wave is drawn within its line's width or its border's ring.
        "edge.waveAmplitude",
        "edge.wavePeriod",
        "node.borderWaveAmplitude",
        "node.borderWavePeriod",
        // Unset, an underlay's or an overlay's shape is the node's own, its corners the node's.
        "node.underlayShape",
        "node.underlayCornerRadius",
        "node.overlayShape",
        "node.overlayCornerRadius",
        // Unset, an image cap has no picture and draws nothing.
        "edge.arrowHeadImage",
        "edge.arrowTailImage",
        "edge.arrowMiddleHeadImage",
        "edge.arrowMiddleTailImage",
        // Unset, a cap is drawn whole.
        "edge.arrowHeadSide",
        "edge.arrowTailSide",
        "edge.arrowMiddleHeadSide",
        "edge.arrowMiddleTailSide",
        // Unset, an edge runs straight from node to node.
        "edge.bends",
        // Unset, a bundle's curved edges are two node radii apart.
        "edge.fanSpacing",
        // Unset, a bundle's curved edges fan apart.
        "edge.fanned",
        // Unset, a curved edge keeps the element's own bow.
        "edge.arcRadius",
        // Unset, a curved edge has no support point, and the support's numbers have nothing to place.
        "edge.supportModel",
        "edge.supportSpringLength",
        "edge.supportSpringConstant",
        "edge.supportRepulsion",
        "edge.supportCentralGravity",
        "edge.supportUnit",
        // Unset, the layout decides the route: straight but on a geographic map.
        "edge.route",
        "edge.sourcePort",
        "edge.targetPort",
        // Unset, a line is painted in its color.
        "edge.gradientColors",
        "edge.gradientStops",
        "edge.arrowHeadText",
        "edge.arrowHeadTextStyle",
        "edge.arrowHeadTextLetterSize",
        "edge.arrowHeadTextFont",
        "edge.arrowHeadTextWeight",
        "edge.arrowHeadTextOpacity",
        "edge.arrowHeadTextDistance",
        "edge.arrowHeadTextRotation",
        "edge.arrowHeadTextOffsetX",
        "edge.arrowHeadTextOffsetY",
        "edge.arrowTailText",
        "edge.arrowTailTextStyle",
        "edge.arrowTailTextLetterSize",
        "edge.arrowTailTextFont",
        "edge.arrowTailTextWeight",
        "edge.arrowTailTextOpacity",
        "edge.arrowTailTextDistance",
        "edge.arrowTailTextRotation",
        "edge.arrowTailTextOffsetX",
        "edge.arrowTailTextOffsetY",
        "edge.label",
        "edge.labelStyle",
        // A label, a caption or an edge label is drawn with no panel behind it until a style
        // asks for one; a node tooltip has a white panel by default.
        "node.labelBackground",
        "edge.labelBackground",
        "edge.arrowHeadTextBackground",
        "edge.arrowTailTextBackground",
        // A label's size and color state what an unset label is drawn with (48 per world unit,
        // black), so a style editor's line starts there; font, weight and italic do not.
        "node.labelFont",
        "node.labelWeight",
        "node.labelItalic",
        "edge.labelFont",
        "edge.labelWeight",
        "edge.labelItalic",
        // Unset, no shader parameter is set and no effect is drawn.
        "node.shaders",
        "edge.shaders",
        "node.labelLetterSize",
        "node.labelWrapWidth",
        "node.labelWrapTrailingSpace",
        "node.labelWrapEllipsis",
        "node.labelWrapAnywhere",
        "node.labelWrapSpaceCount",
        "node.labelRunAlign",
        "node.labelMinScreenSize",
        "node.labelOnTop",
        "node.labelDeclutter",
        "node.labelTextAlign",
        "node.labelLocation",
        "node.labelRotation",
        "node.labelOutline",
        "node.labelOutlineWidth",
        "node.labelBorder",
        "node.labelBorderWidth",
        "node.labelOpacity",
        "node.labelBackgroundOpacity",
        "node.labelOutlineOpacity",
        "node.labelBorderOpacity",
        "node.labelPadding",
        "node.labelCornerRadius",
        "node.labelLineHeight",
        "node.labelOffsetX",
        "node.labelOffsetY",
        "node.labelShiftX",
        "node.labelShiftY",
        "edge.labelLetterSize",
        "edge.labelTextAlign",
        "edge.labelLocation",
        "edge.labelWrapWidth",
        "edge.labelWrapTrailingSpace",
        "edge.labelWrapEllipsis",
        "edge.labelWrapAnywhere",
        "edge.labelWrapSpaceCount",
        "edge.labelRunAlign",
        "edge.labelMinScreenSize",
        "edge.labelOnTop",
        "edge.labelRotation",
        "edge.labelOutline",
        "edge.labelOutlineWidth",
        "edge.labelBorder",
        "edge.labelBorderWidth",
        "edge.labelOpacity",
        "edge.labelBackgroundOpacity",
        "edge.labelOutlineOpacity",
        "edge.labelBorderOpacity",
        "edge.labelPadding",
        "edge.labelCornerRadius",
        "edge.labelLineHeight",
        "edge.labelOffsetX",
        "edge.labelOffsetY",
        "edge.labelShiftX",
        "edge.labelShiftY",
    ]);

    /** The JavaScript type a default must have, per value kind. */
    const DEFAULT_TYPE: Partial<Record<ChannelValueKind, string>> = {
        color: "string",
        number: "number",
        boolean: "boolean",
        enum: "string",
    };

    it("gives every channel a short name and a group of its own target", () => {
        for (const channel of CHANNELS) {
            const { shortName, group, target, plainName } = CHANNEL_DESCRIPTORS[channel];

            assert.isAbove(shortName.length, 0, channel);
            assert.notInclude(shortName, target === "node" ? "Node" : "Edge", `${channel} names its target`);
            assert.isBelow(shortName.length, plainName.length + 1, `${channel} is shorter than its plain name`);
            assert.include(GROUPS[target], group, `${channel} sits in a ${target} group`);
        }
    });

    it("gives a default to every channel that draws something when unset, of the kind it accepts", () => {
        for (const channel of CHANNELS) {
            const descriptor = CHANNEL_DESCRIPTORS[channel];

            if (NO_DEFAULT.has(channel)) {
                assert.isUndefined(descriptor.default, `${channel} draws nothing unset`);
                continue;
            }

            assert.strictEqual(typeof descriptor.default, DEFAULT_TYPE[descriptor.accepts], channel);

            if (descriptor.accepts === "enum") {
                assert.include(descriptor.values ?? [], String(descriptor.default), channel);
            }

            if (descriptor.accepts === "color") {
                assert.match(String(descriptor.default), /^#[\dA-F]{6}$/, channel);
            }
        }
    });

    it("reads the defaults out of the element's default styles rather than restating them", () => {
        const nodeColor = defaultNodeStyle.texture?.color;

        assert.strictEqual(
            CHANNEL_DESCRIPTORS["node.color"].default,
            typeof nodeColor === "string" ? nodeColor.toUpperCase() : null,
            "the element's default node colour is one solid colour, written as uppercase hex",
        );
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.size"].default, defaultNodeStyle.shape?.size);
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.shape"].default, defaultNodeStyle.shape?.type);
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.width"].default, defaultEdgeStyle.line?.width);
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.style"].default, defaultEdgeStyle.line?.type);
        // The one exception: a head is drawn only on a directed graph, so the default style
        // carries none and the descriptor names the head a directed graph draws.
        assert.isUndefined(defaultEdgeStyle.arrowHead);
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowHead"].default, "normal");
        // "darkgrey", written as the hex a swatch can open on.
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.color"].default, "#A9A9A9");
    });

    it("draws an unset arrow cap in its line's colour, so that is its default", () => {
        assert.strictEqual(
            CHANNEL_DESCRIPTORS["edge.arrowHeadColor"].default,
            CHANNEL_DESCRIPTORS["edge.color"].default,
        );
        assert.strictEqual(
            CHANNEL_DESCRIPTORS["edge.arrowTailColor"].default,
            CHANNEL_DESCRIPTORS["edge.color"].default,
        );
    });

    it("says in a sentence why a channel cannot be set, exactly when it cannot", () => {
        for (const channel of CHANNELS) {
            const { renderable, unsupportedReason } = CHANNEL_DESCRIPTORS[channel];

            assert.strictEqual(unsupportedReason !== undefined, !renderable, channel);
        }

        assert.strictEqual(CHANNEL_DESCRIPTORS["node.marker"].unsupportedReason, "The element draws no marker yet");
    });
});

describe("colour channels", () => {
    it("are the thirty-four that carry a colour, and the type says the same thirty-four", () => {
        const fromTheType: readonly ColorChannel[] = [
            "node.color",
            "node.labelColor",
            "node.labelBackground",
            "node.labelOutline",
            "node.labelBorder",
            "node.outline",
            "node.glow",
            "node.haloColor",
            "node.borderColor",
            "node.outerBorderColor",
            "node.underlayColor",
            "node.overlayColor",
            "node.glyphColor",
            "node.chartBorderColor",
            "node.gradientColor",
            "edge.color",
            "edge.bandColor",
            "edge.outlineColor",
            "edge.underlayColor",
            "edge.overlayColor",
            "edge.arrowHeadColor",
            "edge.arrowHeadTextColor",
            "edge.arrowTailColor",
            "edge.arrowTailTextColor",
            "edge.arrowMiddleHeadColor",
            "edge.arrowMiddleTailColor",
            "node.tooltipColor",
            "node.tooltipBackground",
            "edge.labelColor",
            "edge.labelBackground",
            "edge.arrowHeadTextBackground",
            "edge.arrowTailTextBackground",
            "edge.labelOutline",
            "edge.labelBorder",
        ];

        assert.deepEqual([...COLOR_CHANNELS], fromTheType);
    });
});

describe("what each channel carries", () => {
    // Everything in this block is checked by the compiler as much as by the assertion. A value
    // type that drifts from the renderer stops compiling here rather than drawing the wrong
    // thing at run time.
    it("types a colour channel as a parsed colour, and lets an author write a string", () => {
        const painted: PaintedValue<"node.color"> | null = toColorValue("#ff0000");
        const authored: AuthoredValue<"node.color"> = "red";

        assert.strictEqual(painted?.hex, "#ff0000");
        assert.deepEqual(toColorValue(authored), painted);
    });

    it("types the enumerated channels as the values their schemas allow", () => {
        const shape: NodeShapeValue = "icosphere";
        const pattern: EdgeLineValue = "dash-dot";
        const arrow: ArrowValue = "vee";

        assert.include(CHANNEL_DESCRIPTORS["node.shape"].values ?? [], shape);
        assert.include(CHANNEL_DESCRIPTORS["edge.style"].values ?? [], pattern);
        assert.include(CHANNEL_DESCRIPTORS["edge.arrowHead"].values ?? [], arrow);
    });

    it("types the rest as what a repaint writes", () => {
        const style: Partial<ChannelValues> = {
            "node.size": 3,
            "node.label": "gene A",
            "node.wireframe": true,
            "node.labelStyle": { sizePx: 12, weight: "bold" },
            "edge.animationSpeed": 0.5,
            "edge.curvature": true,
        };

        assert.strictEqual(style["node.size"], 3);
        assert.isUndefined(style["node.marker"]);
    });

    it("makes the marker unwritable rather than writable and ignored", () => {
        // This line compiles only while the marker's value type is `never`, which is how a
        // channel the element cannot draw stays unreachable instead of silently doing nothing.
        const nothingFits: [PaintedValue<"node.marker">] extends [never] ? true : false = true;

        assert.isTrue(nothingFits);
    });

    it("gives every descriptor a value kind a control can be built from", () => {
        const kinds: readonly ChannelValueKind[] = CHANNELS.map((channel) => CHANNEL_DESCRIPTORS[channel].accepts);
        const drawn = (descriptor: ChannelDescriptor): boolean => descriptor.renderable;

        assert.strictEqual(kinds.filter((kind) => kind === "nothing").length, 1);
        assert.isFalse(drawn(CHANNEL_DESCRIPTORS["node.marker"]));
    });
});

describe("toColorValue", () => {
    it("reads six-digit hex and keeps the numbers beside the string", () => {
        const color = toColorValue("#ff9900");

        assert.deepEqual(color, { r: 255, g: 153, b: 0, a: 1, hex: "#ff9900" });
    });

    it("reads hex without the hash, and in either case", () => {
        assert.deepEqual(toColorValue("FF9900"), toColorValue("#ff9900"));
    });

    it("doubles three-digit shorthand the way CSS does", () => {
        assert.deepEqual(toColorValue("#f0c"), { r: 255, g: 0, b: 204, a: 1, hex: "#ff00cc" });
    });

    it("reads eight-digit hex as a colour with alpha, and writes it back the same way", () => {
        const color = toColorValue("#ff990080");

        assert.strictEqual(color?.a, 128 / 255);
        assert.strictEqual(color?.hex, "#ff990080");
    });

    it("reads four-digit shorthand with alpha", () => {
        assert.deepEqual(toColorValue("#f0c8"), { r: 255, g: 0, b: 204, a: 136 / 255, hex: "#ff00cc88" });
    });

    it("drops the alpha digits from the string form when the colour is opaque", () => {
        assert.strictEqual(toColorValue("#112233ff")?.hex, "#112233");
    });

    it("reads a CSS colour name through the element's own normaliser, so channels accept what styles accept", () => {
        assert.deepEqual(toColorValue("red"), { r: 255, g: 0, b: 0, a: 1, hex: "#ff0000" });
    });

    it("reads components that are already parsed, and clamps them", () => {
        assert.deepEqual(toColorValue({ r: -5, g: 300, b: 12.6, a: 4 }), {
            r: 0,
            g: 255,
            b: 13,
            a: 1,
            hex: "#00ff0d",
        });
    });

    it("treats a non-finite alpha as opaque rather than as a hole in the colour", () => {
        assert.strictEqual(toColorValue({ r: 1, g: 2, b: 3, a: Number.NaN })?.a, 1);
    });

    it("answers null for what is not a colour, and never throws", () => {
        // It runs inside a repaint loop with no try/catch of its own: one unreadable value must
        // not cost every later element its style.
        assert.isNull(toColorValue("not-a-colour"));
        assert.isNull(toColorValue("#12345"));
        assert.isNull(toColorValue(""));
        assert.isNull(toColorValue(null));
        assert.isNull(toColorValue(undefined));
    });
});

describe("the arrow-end channels", () => {
    // The head's and the tail's six channels come from one builder; the only intended difference
    // between the two ends is the name and the tail's "none" type default.
    it("describes the tail exactly as the head, end name and type default aside", () => {
        for (const suffix of ["", "Size", "Color", "Opacity", "Text", "TextStyle"]) {
            const { caveat: headCaveat, ...head } =
                CHANNEL_DESCRIPTORS[`edge.arrowHead${suffix}` as keyof typeof CHANNEL_DESCRIPTORS];
            const { caveat: tailCaveat, ...tail } =
                CHANNEL_DESCRIPTORS[`edge.arrowTail${suffix}` as keyof typeof CHANNEL_DESCRIPTORS];
            assert.strictEqual(tailCaveat, headCaveat, suffix);
            const asHead = JSON.parse(
                JSON.stringify(tail).replaceAll("Tail", "Head").replaceAll("tail", "head"),
            ) as typeof head;
            if (suffix === "") {
                assert.strictEqual(tail.default, "none");
                assert.deepStrictEqual({ ...asHead, default: head.default }, head);
            } else {
                assert.deepStrictEqual(asHead, head, suffix);
            }
        }
    });
});

describe("modelBindingProblem", () => {
    const at = "encode.node.model";

    it("accepts a value map of asset ids that skips unlisted categories", () => {
        assert.isNull(modelBindingProblem({ by: "data.kind", map: { a: "asset:a" }, unmapped: "skip" }, at));
        assert.isNull(modelBindingProblem({ value: "https://example.com/x.glb" }, at), "a literal is judged by origin");
    });

    it("accepts http(s) URLs among the listed values, and a value read from the data", () => {
        const url = "https://example.com/x.glb";
        const bindings: Binding[] = [
            { by: "data.kind", map: { a: url }, unmapped: "skip" },
            { by: "data.kind", map: {}, unmapped: "skip", missing: { value: url } },
            { by: "data.url", scale: "passthrough" },
            { template: ["{data.url}"] },
        ];
        for (const binding of bindings) {
            assert.isNull(modelBindingProblem(binding, at));
        }
    });

    it("refuses a listed value that is neither an asset id nor an http(s) URL", () => {
        const bindings: Binding[] = [
            { by: "data.kind", map: { a: "rack.glb" }, unmapped: "skip" },
            { by: "data.kind", map: {}, unmapped: "skip", other: { threshold: 1, value: "file:///etc/x.glb" } },
        ];
        for (const binding of bindings) {
            assert.equal(modelBindingProblem(binding, at)?.code, "E_MODEL_URL_BLOCKED");
        }
    });
});

describe("how far one step moves a number channel", () => {
    it("is given on every number channel and on no other", () => {
        for (const channel of CHANNELS) {
            const descriptor = CHANNEL_DESCRIPTORS[channel];
            assert.strictEqual(descriptor.step !== undefined, descriptor.accepts === "number", channel);
        }
    });

    it("moves an opacity by a hundredth, a count and a label size by one, a length by a tenth", () => {
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.opacity"].step, 0.01);
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.patternCount"].step, 1);
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.labelSize"].step, 1);
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.width"].step, 0.1);
    });
});

describe("which drawn part a channel adjusts", () => {
    it("names a part that is itself a channel with no part above it", () => {
        for (const channel of CHANNELS) {
            const { modifies } = CHANNEL_DESCRIPTORS[channel];
            if (modifies !== undefined) {
                assert.isTrue(isChannel(modifies), `${channel} modifies a channel`);
                assert.isUndefined(CHANNEL_DESCRIPTORS[modifies].modifies, `${modifies} is a part of its own`);
                assert.strictEqual(CHANNEL_DESCRIPTORS[modifies].target, CHANNEL_DESCRIPTORS[channel].target);
            }
        }
    });

    it("folds a band, a halo, an arrowhead and a label's look into their parts", () => {
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.bandWidth"].modifies, "edge.bandColor");
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.haloOpacity"].modifies, "node.haloColor");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowTailSize"].modifies, "edge.arrowTail");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowHeadTextColor"].modifies, "edge.arrowHeadText");
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.labelSize"].modifies, "node.label");
        assert.isUndefined(CHANNEL_DESCRIPTORS["edge.arrowHeadText"].modifies, "an end label is a part of its own");
        assert.isUndefined(CHANNEL_DESCRIPTORS["node.outline"].modifies);
    });
});
