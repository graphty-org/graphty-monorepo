import { assert, describe, it } from "vitest";

import { LABEL_STYLE_DESCRIPTORS, LABEL_STYLE_FIELDS } from "../../../src/catalog/label-style";
import type { Binding, Channel, EdgeLinePattern } from "../../../src/catalog/types";
import { defaultEdgeStyle } from "../../../src/config/EdgeStyle";
import { defaultNodeStyle, NodeShapes } from "../../../src/config/NodeStyle";
import {
    type ArrowValue,
    asColorValue,
    type AuthoredValue,
    CHANNEL_DESCRIPTORS,
    channelDescriptor,
    CHANNELS,
    channelsFor,
    type ChannelValueKind,
    type ChannelValues,
    COLOR_CHANNELS,
    type ColorChannel,
    DEFAULT_GLOW_COLOR,
    type EdgeLineValue,
    isChannel,
    labelFieldOf,
    modelBindingProblem,
    type NodeShapeValue,
    type PaintedValue,
    textFieldOf,
    toColorValue,
} from "../../../src/session/styles/channels";

/** The channels the element publishes, in the order the table declares them. */
const DECLARED = [
    "node.color",
    "node.size",
    "node.sizeMode",
    "node.sizeSpace",
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
    "node.labelWrapSkipEndSpace",
    "node.labelWrapEllipsis",
    "node.labelWrapAnywhere",
    "node.labelWrapSpaceCount",
    "node.labelMaxLines",
    "node.labelMaxLinesEllipsis",
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
    "node.labelLineBox",
    "node.labelBorderAlign",
    "node.labelBorderStyle",
    "node.labelBackgroundShape",
    "node.labelImage",
    "node.labelImageWidth",
    "node.labelImageHeight",
    "node.labelImageOffsetX",
    "node.labelImageOffsetY",
    "node.labelOffsetX",
    "node.labelOffsetY",
    "node.labelShiftX",
    "node.labelShiftY",
    "node.labelShiftOf",
    "node.labelGapOf",
    "node.labelBox",
    "node.labelDeclutter",
    "node.labelMinNodeScreenSize",
    "node.labelTextAlign",
    "node.labelLocation",
    "node.tooltip",
    "node.tooltipStyle",
    "node.opacity",
    "node.glow",
    "node.glowStrength",
    "node.wireframe",
    "node.meshDetail",
    "node.flat",
    "node.unlit",
    "node.width",
    "node.height",
    "node.depth",
    "node.relativeExtents",
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
    "node.outerBorderCount",
    "node.raisedBorderWidth",
    "node.raisedBorderLightColor",
    "node.raisedBorderDarkColor",
    "node.shadowColor",
    "node.shadowOpacity",
    "node.shadowBlur",
    "node.shadowOffsetX",
    "node.shadowOffsetY",
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
    "node.stripeFrame",
    "node.chartKind",
    "node.chartValues",
    "node.chartColors",
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
    "node.chartBackgroundColor",
    "node.chartBackgroundOpacity",
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
    "node.cornerFraction",
    "node.shapePoints",
    "node.shapeStretchPoints",
    "node.shapeRotation",
    "node.shapeParts",
    "node.shapeLines",
    "node.shapeTexts",
    "node.labelTable",
    "node.pieData",
    "node.chartData",
    "node.recordData",
    "node.shapeLineWidth",
    "node.shapeLineHaloColor",
    "node.shapeLineHaloWidth",
    "node.labelFit",
    "node.labelPaddingX",
    "node.labelPaddingY",
    "node.labelFitSquare",
    "node.labelFitQuantum",
    "node.labelFitImage",
    "node.labelFitImagePadding",
    "node.imageAspect",
    "node.gradientColor",
    "node.gradientDirection",
    "node.gradientColors",
    "node.gradientStops",
    "node.gradientKind",
    "node.gradientCenterX",
    "node.gradientCenterY",
    "node.gradientRadius",
    "node.model",
    "node.modelSourceUp",
    "node.modelTurn",
    "node.modelTint",
    "node.modelAnimation",
    "node.modelAnimationSpeed",
    "node.modelAnimationOffset",
    "node.modelDoubleSided",
    "node.modelFit",
    "node.modelCenter",
    "node.texture",
    "edge.color",
    "edge.colorFrom",
    "edge.width",
    "edge.minScreenWidth",
    "edge.drawOrder",
    "edge.opacity",
    "edge.fadeEnd",
    "edge.fadeStart",
    "edge.fadeOpacity",
    "edge.blending",
    "edge.outlineColor",
    "edge.outlineWidth",
    "edge.outlineScale",
    "edge.outlineOpacity",
    "edge.outlineStyle",
    "edge.overlayColor",
    "edge.overlayOpacity",
    "edge.overlayPadding",
    "edge.gradientColors",
    "edge.gradientStops",
    "edge.gradientKind",
    "edge.strandColors",
    "edge.strandSpacing",
    "edge.style",
    "edge.patternCount",
    "edge.waveAmplitude",
    "edge.wavePeriod",
    "edge.dashLength",
    "edge.dashGap",
    "edge.dashArray",
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
    "edge.supportScale",
    "edge.route",
    "edge.bundleStrength",
    "edge.bundleIterations",
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
    "edge.arrowHeadOutlineWidth",
    "edge.arrowHeadPosition",
    "edge.arrowHeadGap",
    "edge.arrowHeadStack",
    "edge.arrowHeadColor",
    "edge.arrowHeadFillColor",
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
    "edge.arrowTailOutlineWidth",
    "edge.arrowTailPosition",
    "edge.arrowTailGap",
    "edge.arrowTailStack",
    "edge.arrowTailColor",
    "edge.arrowTailFillColor",
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
    "edge.arrowMiddleHeadOutlineWidth",
    "edge.arrowMiddleHeadPosition",
    "edge.arrowMiddleHeadColor",
    "edge.arrowMiddleHeadFillColor",
    "edge.arrowMiddleHeadOpacity",
    "edge.arrowMiddleHeadImage",
    "edge.arrowMiddleTail",
    "edge.arrowMiddleTailSize",
    "edge.arrowMiddleTailWidth",
    "edge.arrowMiddleTailSide",
    "edge.arrowMiddleTailOutlineWidth",
    "edge.arrowMiddleTailPosition",
    "edge.arrowMiddleTailColor",
    "edge.arrowMiddleTailFillColor",
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
    "edge.tooltipSize",
    "edge.tooltipColor",
    "edge.tooltipBackground",
    "edge.arrowHeadTextBackground",
    "edge.arrowTailTextBackground",
    "edge.labelLetterSize",
    "edge.labelFont",
    "edge.labelWeight",
    "edge.labelItalic",
    "edge.labelWrapWidth",
    "edge.labelWrapTrailingSpace",
    "edge.labelWrapSkipEndSpace",
    "edge.labelWrapEllipsis",
    "edge.labelWrapAnywhere",
    "edge.labelWrapSpaceCount",
    "edge.labelMaxLines",
    "edge.labelMaxLinesEllipsis",
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
    "edge.labelLineBox",
    "edge.labelBorderAlign",
    "edge.labelBorderStyle",
    "edge.labelBackgroundShape",
    "edge.labelImage",
    "edge.labelImageWidth",
    "edge.labelImageHeight",
    "edge.labelImageOffsetX",
    "edge.labelImageOffsetY",
    "edge.labelOffsetX",
    "edge.labelOffsetY",
    "edge.labelShiftX",
    "edge.labelShiftY",
    "edge.labelShiftOf",
    "edge.labelGapOf",
    "edge.labelBox",
    "node.shaders",
    "edge.shaders",
    "node.labels",
    "edge.labels",
    "edge.taper",
    "edge.taperSource",
    "edge.lift",
    "node.xlabel",
    "node.xlabelStyle",
    "node.xlabelLocation",
    "node.xlabelOffsetX",
    "node.xlabelOffsetY",
    "node.xlabelTextAlign",
    "node.xlabelColor",
    "node.xlabelFont",
    "node.xlabelWeight",
    "node.xlabelItalic",
    "edge.labelTable",
    "edge.tooltip",
    "edge.tooltipStyle",
    "edge.xlabel",
    "edge.xlabelStyle",
    "edge.xlabelLocation",
    "edge.xlabelOffsetX",
    "edge.xlabelOffsetY",
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

    it("splits into two hundred and twenty-five node channels and one hundred and ninety edge channels", () => {
        assert.strictEqual(channelsFor("node").length, 225);
        assert.strictEqual(channelsFor("edge").length, 190);
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
    it("draws every channel it publishes", () => {
        const unrenderable = CHANNELS.filter((channel) => !CHANNEL_DESCRIPTORS[channel].renderable);

        assert.deepEqual(unrenderable, []);
    });

    it("records what the renderer narrows, on the channels it narrows", () => {
        // A curvature is a switch, not an amount.
        assert.isDefined(CHANNEL_DESCRIPTORS["edge.curvature"].caveat);
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.curvature"].accepts, "boolean");
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
        // reading the catalog sees it.
        assert.isUndefined(CHANNEL_DESCRIPTORS["node.labelStyle"].caveat);
        assert.isUndefined(CHANNEL_DESCRIPTORS["edge.labelStyle"].caveat);
        assert.notInclude(LABEL_STYLE_FIELDS as string[], "maxWidth");
        assert.notInclude(LABEL_STYLE_FIELDS as string[], "wrap");
    });

    it("says on every tooltip channel that a tooltip is hover-only, for a node and an edge alike", () => {
        // A tooltip is drawn on hover, so a layer that writes one changes nothing on a graph at
        // rest -- which looks exactly like a layer that never landed.
        for (const channel of ["node.tooltip", "node.tooltipStyle", "edge.tooltip", "edge.tooltipStyle"] as const) {
            const { caveat } = CHANNEL_DESCRIPTORS[channel];

            assert.isDefined(caveat, channel);
            assert.include(caveat, "hover", channel);
        }

        for (const target of ["node", "edge"] as const) {
            assert.strictEqual(CHANNEL_DESCRIPTORS[`${target}.tooltip`].stylePath, "tooltip.text");
            assert.strictEqual(CHANNEL_DESCRIPTORS[`${target}.tooltipStyle`].stylePath, "tooltip");
            assert.strictEqual(CHANNEL_DESCRIPTORS[`${target}.tooltipStyle`].accepts, "labelStyle");
            // the same size, color and background channels as a node's tooltip
            for (const look of ["Size", "Color", "Background"] as const) {
                assert.isTrue(isChannel(`${target}.tooltip${look}`), `${target}.tooltip${look}`);
            }
        }
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

    it("states the colour a switched-on glow is drawn in when none is named", () => {
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.glow"].default, DEFAULT_GLOW_COLOR);
    });
});

describe("what a style editor needs to draw a row", () => {
    /** The groups each target's channels may sit in. */
    const GROUPS = { node: ["shape", "color", "effects", "text"], edge: ["line", "arrows", "text"] };

    /** The channels whose unset value draws nothing, or is decided per element, so carry no default. */
    const NO_DEFAULT = new Set([
        "edge.fadeEnd",
        // Unset, a group reaches its largest member's radius past its members.
        "node.groupPadding",
        "node.groupPaddingRatio",
        "node.shapeParts",
        "node.shapeLines",
        "node.shapeTexts",
        "node.labelTable",
        "edge.labelTable",
        // A data spec draws nothing unset: the lists it fills keep what the layers beneath give.
        "node.pieData",
        "node.chartData",
        "node.recordData",
        "node.shapeLineWidth",
        "node.shapeLineHaloColor",
        "node.shapeLineHaloWidth",
        "node.gradientColors",
        "node.gradientStops",
        "node.label",
        "node.labelStyle",
        "node.tooltip",
        // Unset, a node has no external label, and one that has sits at its corner or where the layout put it.
        "node.xlabel",
        "node.xlabelStyle",
        "node.xlabelOffsetX",
        "node.xlabelOffsetY",
        "node.xlabelTextAlign",
        "node.xlabelColor",
        "node.xlabelFont",
        "node.xlabelWeight",
        "node.xlabelItalic",
        // Unset, an edge has no external label, and one that has sits beside its middle or where the layout put it.
        "edge.xlabel",
        "edge.xlabelStyle",
        "edge.xlabelOffsetX",
        "edge.xlabelOffsetY",
        "node.tooltipStyle",
        // Unset, an edge has no tooltip.
        "edge.tooltip",
        "edge.tooltipStyle",
        "node.marker",
        // Unset, a node's width, height and depth follow its size and its shape's proportions.
        "node.width",
        "node.height",
        "node.depth",
        // Unset, a border is as wide as `node.borderWidth` says, in the scene's units.
        "node.borderScreenWidth",
        // Unset, a node is drawn where it always was, with no order among its neighbors.
        "node.drawOrder",
        // Unset, a line is drawn over every line with an order, in the order it always was.
        "edge.drawOrder",
        // Unset, a round-rectangle's corners are a quarter of its shorter side.
        "node.cornerRadius",
        // Unset, a polygon is drawn as its box.
        "node.shapePoints",
        // Unset, a chart's plot is as wide and as tall as `node.chartSize` says.
        "node.chartWidth",
        "node.chartHeight",
        // Unset, a node draws no image, pie or stripes over its face; the sizes and opacities of slices and
        // bands, and an image's width, height and pixel size, follow from the rest.
        "node.image",
        "node.imageFallback",
        "node.imageWidth",
        "node.imageHeight",
        "node.imagePixelSize",
        // Unset, a node draws no glyph; its size follows from the rest (its font is sans-serif).
        "node.glyph",
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
        "node.chartBackgroundColor",
        "node.stripeColors",
        "node.stripeSizes",
        "node.stripeOpacities",
        "node.stripeFrame",
        // Unset, a node is the size it states rather than its label's.
        "node.labelFit",
        // Unset, a node is filled flat with its color.
        "node.gradientColor",
        // Unset, a node draws its shape and no model.
        "node.model",
        // Unset, a model is drawn still, in its rest pose.
        "node.modelAnimation",
        // Unset, a node draws its own color and no picture.
        "node.texture",
        "edge.patternCount",
        // Unset, a wave is drawn within its line's width or its border's ring.
        "edge.waveAmplitude",
        "edge.wavePeriod",
        // Unset, a dash is three widths long and the elements spread from end to end.
        "edge.dashLength",
        "edge.dashGap",
        // Unset, a line draws its own elements.
        "edge.dashArray",
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
        // Unset, an end cap is drawn alone, with no row of caps behind it.
        "edge.arrowHeadStack",
        "edge.arrowTailStack",
        // Unset, an open cap's inside is left empty.
        "edge.arrowHeadFillColor",
        "edge.arrowTailFillColor",
        "edge.arrowMiddleHeadFillColor",
        "edge.arrowMiddleTailFillColor",
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
        // Unset, a line is one strand in its color.
        "edge.strandColors",
        "edge.arrowHeadText",
        "edge.arrowHeadTextStyle",
        "edge.arrowHeadTextLetterSize",
        "edge.arrowHeadTextFont",
        "edge.arrowHeadTextOpacity",
        "edge.arrowHeadTextDistance",
        "edge.arrowHeadTextRotation",
        "edge.arrowHeadTextOffsetX",
        "edge.arrowHeadTextOffsetY",
        "edge.arrowTailText",
        "edge.arrowTailTextStyle",
        "edge.arrowTailTextLetterSize",
        "edge.arrowTailTextFont",
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
        // black), so a style editor's line starts there; font and italic do not (weight is "normal").
        "node.labelFont",
        "node.labelItalic",
        "edge.labelFont",
        "edge.labelItalic",
        // Unset, no shader parameter is set and no effect is drawn.
        "node.shaders",
        "edge.shaders",
        // Unset, no further label is drawn.
        "node.labels",
        "edge.labels",
        "node.labelLetterSize",
        "node.labelWrapWidth",
        "node.labelWrapTrailingSpace",
        "node.labelWrapSkipEndSpace",
        "node.labelWrapEllipsis",
        "node.labelWrapAnywhere",
        "node.labelWrapSpaceCount",
        "node.labelMaxLines",
        "node.labelMaxLinesEllipsis",
        "node.labelMinScreenSize",
        "node.labelOnTop",
        "node.labelDeclutter",
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
        "node.labelImage",
        "node.labelImageWidth",
        "node.labelImageHeight",
        "node.labelImageOffsetX",
        "node.labelImageOffsetY",
        "node.labelOffsetX",
        "node.labelOffsetY",
        "node.labelShiftX",
        "node.labelShiftY",
        "edge.labelLetterSize",
        "edge.labelWrapWidth",
        "edge.labelWrapTrailingSpace",
        "edge.labelWrapSkipEndSpace",
        "edge.labelWrapEllipsis",
        "edge.labelWrapAnywhere",
        "edge.labelWrapSpaceCount",
        "edge.labelMaxLines",
        "edge.labelMaxLinesEllipsis",
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
        "edge.labelImage",
        "edge.labelImageWidth",
        "edge.labelImageHeight",
        "edge.labelImageOffsetX",
        "edge.labelImageOffsetY",
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

            // Words name a default only where one is drawn unset (a glyph's font).
            if (descriptor.accepts === "text" && descriptor.default !== undefined) {
                assert.isString(descriptor.default, channel);
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

    it("says with a code why a channel cannot be set, exactly when it cannot", () => {
        for (const channel of CHANNELS) {
            const { renderable, unsupported } = CHANNEL_DESCRIPTORS[channel];

            assert.notProperty(CHANNEL_DESCRIPTORS[channel], "unsupportedReason", channel);
            assert.strictEqual(unsupported !== undefined, !renderable, channel);
        }
    });
});

describe("colour channels", () => {
    it("are the ones that carry a colour, and the type says the same ones", () => {
        const fromTheType: readonly ColorChannel[] = [
            "node.color",
            "node.labelColor",
            "node.labelBackground",
            "node.labelOutline",
            "node.labelBorder",
            "node.glow",
            "node.borderColor",
            "node.outerBorderColor",
            "node.raisedBorderLightColor",
            "node.raisedBorderDarkColor",
            "node.shadowColor",
            "node.underlayColor",
            "node.overlayColor",
            "node.glyphColor",
            "node.chartBorderColor",
            "node.chartBackgroundColor",
            "node.shapeLineHaloColor",
            "node.gradientColor",
            "edge.color",
            "edge.outlineColor",
            "edge.overlayColor",
            "edge.arrowHeadColor",
            "edge.arrowHeadFillColor",
            "edge.arrowHeadTextColor",
            "edge.arrowTailColor",
            "edge.arrowTailFillColor",
            "edge.arrowTailTextColor",
            "edge.arrowMiddleHeadColor",
            "edge.arrowMiddleHeadFillColor",
            "edge.arrowMiddleTailColor",
            "edge.arrowMiddleTailFillColor",
            "node.tooltipColor",
            "node.tooltipBackground",
            "edge.labelColor",
            "edge.labelBackground",
            "edge.tooltipColor",
            "edge.tooltipBackground",
            "edge.arrowHeadTextBackground",
            "edge.arrowTailTextBackground",
            "edge.labelOutline",
            "edge.labelBorder",
            "node.xlabelColor",
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
    });

    it("gives every descriptor a value kind a control can be built from", () => {
        const kinds: readonly ChannelValueKind[] = CHANNELS.map((channel) => CHANNEL_DESCRIPTORS[channel].accepts);

        assert.strictEqual(kinds.filter((kind) => kind === "nothing").length, 0);
    });
});

describe("asColorValue", () => {
    it("accepts a carried colour and refuses an object whose hex is not a string", () => {
        const color = toColorValue("#ff0000");
        assert.strictEqual(asColorValue(color), color);
        assert.isNull(asColorValue({ hex: 5 }));
        assert.isNull(asColorValue("#ff0000"));
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

    it("folds an outline, an arrowhead and a label's look into their parts", () => {
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.outlineWidth"].modifies, "edge.outlineColor");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowTailSize"].modifies, "edge.arrowTail");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowHeadTextColor"].modifies, "edge.arrowHeadText");
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.labelSize"].modifies, "node.label");
        assert.isUndefined(CHANNEL_DESCRIPTORS["edge.arrowHeadText"].modifies, "an end label is a part of its own");
    });
});

describe("ChannelDescriptor.appliesWhen", () => {
    it("names an enum channel of the same target and only values it accepts", () => {
        const gated = Object.values(CHANNEL_DESCRIPTORS).filter((descriptor) => descriptor.appliesWhen !== undefined);
        assert.isAbove(gated.length, 0);
        for (const descriptor of gated) {
            const when = descriptor.appliesWhen;
            const on = when === undefined ? undefined : CHANNEL_DESCRIPTORS[when.channel];
            assert.strictEqual(on?.accepts, "enum", descriptor.channel);
            assert.strictEqual(on?.target, descriptor.target, descriptor.channel);
            for (const value of when?.values ?? []) {
                assert.include(on?.values ?? [], value, `${descriptor.channel}: ${value}`);
            }
        }
    });

    it("draws a gradient's direction only on a linear one and its center only on a radial one", () => {
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["node.gradientDirection"].appliesWhen, {
            channel: "node.gradientKind",
            values: ["linear"],
        });
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["node.gradientRadius"].appliesWhen?.values, ["radial"]);
    });

    it("draws a dash array only on a dashed, dotted or dash-dot line", () => {
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["edge.dashArray"].appliesWhen, {
            channel: "edge.style",
            values: ["dash", "dot", "dash-dot"],
        });
    });
});

describe("ChannelDescriptor.drawnWhen", () => {
    /** Whether a condition value is one a channel takes. */
    const takes = (channel: Channel, value: string): boolean => {
        const descriptor = CHANNEL_DESCRIPTORS[channel];
        if (descriptor.accepts === "boolean") {
            return value === "true" || value === "false";
        }

        return descriptor.values?.includes(value) === true;
    };

    it("starts with appliesWhen, where a channel has one", () => {
        for (const descriptor of Object.values(CHANNEL_DESCRIPTORS)) {
            if (descriptor.appliesWhen === undefined) {
                continue;
            }

            const first = descriptor.drawnWhen?.find((condition) => "channel" in condition && "values" in condition);
            assert.deepStrictEqual(first, descriptor.appliesWhen, descriptor.channel);
        }
    });

    it("names channels that exist, by values they take", () => {
        for (const descriptor of Object.values(CHANNEL_DESCRIPTORS)) {
            const all = (descriptor.drawnWhen ?? []).flatMap((condition) =>
                "anyOf" in condition ? condition.anyOf.flat() : [condition],
            );
            for (const condition of all) {
                if ("dimension" in condition) {
                    assert.include(["2d", "3d"], condition.dimension, descriptor.channel);
                    continue;
                }
                if ("arranged" in condition) {
                    assert.include(["2d", "3d"], condition.arranged, descriptor.channel);
                    continue;
                }
                if ("anyOf" in condition) {
                    assert.fail(`${descriptor.channel}: an anyOf nested in an anyOf`);
                }

                assert.isDefined(CHANNEL_DESCRIPTORS[condition.channel], `${descriptor.channel}: ${condition.channel}`);
                assert.notStrictEqual(condition.channel, descriptor.channel, `${descriptor.channel} names itself`);
                if ("values" in condition) {
                    assert.isAbove(condition.values.length, 0, descriptor.channel);
                    for (const value of condition.values) {
                        assert.isTrue(
                            takes(condition.channel, value),
                            `${descriptor.channel}: ${condition.channel} ${value}`,
                        );
                    }
                }
            }
        }
    });

    it("names label fields that exist, by values they take", () => {
        const fields = new Map(LABEL_STYLE_DESCRIPTORS.map((descriptor) => [descriptor.field, descriptor]));
        for (const descriptor of LABEL_STYLE_DESCRIPTORS) {
            for (const condition of descriptor.drawnWhen ?? []) {
                if ("dimension" in condition) {
                    continue;
                }

                const other = fields.get(condition.field);
                assert.isDefined(other, `${descriptor.field}: ${condition.field}`);
                assert.notStrictEqual(condition.field, descriptor.field);
                if ("values" in condition) {
                    for (const value of condition.values) {
                        const ok =
                            other.accepts === "boolean"
                                ? value === "true" || value === "false"
                                : other.values?.includes(value);
                        assert.isTrue(ok, `${descriptor.field}: ${condition.field} ${value}`);
                    }
                }
            }
        }
    });

    /**
     * Channels whose caveat says they are ignored somewhere, and why that is not a drawn-when
     * condition: what the sentence describes is not a value of another channel or the view.
     */
    const CAVEAT_ALLOWED: Readonly<Record<string, string>> = {
        "node.tooltip": "drawn on hover: the condition is the pointer, not a channel",
        "node.tooltipStyle": "drawn on hover: the condition is the pointer, not a channel",
        "node.tooltipSize": "drawn on hover: the condition is the pointer, not a channel",
        "node.tooltipColor": "drawn on hover: the condition is the pointer, not a channel",
        "node.tooltipBackground": "drawn on hover: the condition is the pointer, not a channel",
        "edge.tooltip": "drawn on hover: the condition is the pointer, not a channel",
        "edge.tooltipStyle": "drawn on hover: the condition is the pointer, not a channel",
        "edge.tooltipSize": "drawn on hover: the condition is the pointer, not a channel",
        "edge.tooltipColor": "drawn on hover: the condition is the pointer, not a channel",
        "edge.tooltipBackground": "drawn on hover: the condition is the pointer, not a channel",
        "node.borderColor": "turns to face the camera in 3D; drawn in both views",
        "node.borderWidth": "turns to face the camera in 3D; drawn in both views",
        "node.borderOpacity": "turns to face the camera in 3D; drawn in both views",
        "node.borderStyle": "turns to face the camera in 3D; drawn in both views",
        "node.texture": "replaces a model's base color texture; drawn on every node",
        "edge.nodeGap": "a self-loop ignores it: a fact of the edge's ends, not a channel",
        "edge.sourceNodeGap": "a self-loop ignores it: a fact of the edge's ends, not a channel",
        "edge.targetNodeGap": "a self-loop ignores it: a fact of the edge's ends, not a channel",
    };

    it("covers every caveat that says a channel is ignored somewhere", () => {
        const says = /in 2D|3D view|Solids ignore|Other shapes ignore|ignores it|changes nothing|replaces/;
        const missing = Object.values(CHANNEL_DESCRIPTORS)
            .filter((descriptor) => says.test(descriptor.caveat ?? ""))
            .filter(
                (descriptor) => descriptor.drawnWhen === undefined && CAVEAT_ALLOWED[descriptor.channel] === undefined,
            )
            .map((descriptor) => descriptor.channel);
        assert.deepStrictEqual(missing, []);
        for (const channel of Object.keys(CAVEAT_ALLOWED)) {
            assert.isUndefined(
                CHANNEL_DESCRIPTORS[channel as Channel].drawnWhen,
                `${channel} needs no allow-list entry`,
            );
        }
    });

    it("says which list items are fractions, and which are shares of the whole", () => {
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["node.pieSizes"].listItems, { min: 0, max: 1, share: true });
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["node.stripeSizes"].listItems, { min: 0, max: 1, share: true });
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["node.stripeOpacities"].listItems, { min: 0, max: 1 });
        assert.isUndefined(CHANNEL_DESCRIPTORS["node.chartValues"].listItems, "a chart's values are any numbers");
    });

    it("says which channels draw in one view only, and that an animated edge is a straight solid line", () => {
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["node.zIndex"].drawnWhen, [{ dimension: "2d" }]);
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["node.unlit"].drawnWhen, [{ dimension: "3d" }]);
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["edge.animationSpeed"].drawnWhen, [
            { channel: "edge.style", values: ["solid"] },
            { channel: "edge.curvature", values: ["false"] },
        ]);
        // a stored route (bends, ports) is drawn through its own points and wins over the support point
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["edge.supportModel"].drawnWhen, [
            { channel: "edge.curvature", values: ["true"] },
            { channel: "edge.bends", unset: true },
            { channel: "edge.sourcePort", unset: true },
            { channel: "edge.targetPort", unset: true },
        ]);
        for (const kind of ["underlay", "overlay"] as const) {
            const [view, condition] = CHANNEL_DESCRIPTORS[`node.${kind}CornerRadius`].drawnWhen ?? [];
            assert.deepStrictEqual(view, { dimension: "2d" }, "a plate is drawn in 2D only (E669)");
            assert.strictEqual(
                condition !== undefined && "channel" in condition ? condition.channel : undefined,
                `node.${kind}Shape`,
            );
            assert.deepStrictEqual(CHANNEL_DESCRIPTORS[`node.${kind}Color`].drawnWhen, [{ dimension: "2d" }]);
        }
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["edge.overlayColor"].drawnWhen, [{ dimension: "2d" }]);
        // the band beneath the line is the outline, drawn in both views (E677)
        assert.isUndefined(CHANNEL_DESCRIPTORS["edge.outlineColor"].drawnWhen);
    });
});

describe("ChannelDescriptor.needs and start", () => {
    /**
     * Whether a value is one a channel takes.
     * @param channel - The channel.
     * @param value - The value.
     * @returns True when the channel takes it.
     */
    const valid = (channel: Channel, value: unknown): boolean => {
        const descriptor = CHANNEL_DESCRIPTORS[channel];
        switch (descriptor.accepts) {
            case "color":
                return typeof value === "string" && toColorValue(value) !== null;
            case "number":
                return (
                    typeof value === "number" &&
                    (descriptor.min === undefined || value >= descriptor.min) &&
                    (descriptor.max === undefined || value <= descriptor.max)
                );
            case "boolean":
                return typeof value === "boolean";
            case "enum":
                return typeof value === "string" && descriptor.values?.includes(value) === true;
            case "text":
                return (
                    typeof value === "string" &&
                    (descriptor.listOf !== "color" || value.split(" ").every((item) => toColorValue(item) !== null))
                );
            default:
                return false;
        }
    };

    it("names partners that exist, never itself, with values they take", () => {
        for (const descriptor of Object.values(CHANNEL_DESCRIPTORS)) {
            for (const need of descriptor.needs ?? []) {
                assert.isDefined(CHANNEL_DESCRIPTORS[need.channel], `${descriptor.channel}: ${need.channel}`);
                assert.notStrictEqual(need.channel, descriptor.channel);
                assert.strictEqual(CHANNEL_DESCRIPTORS[need.channel].target, descriptor.target, descriptor.channel);
                assert.isTrue(
                    valid(need.channel, need.value),
                    `${descriptor.channel}: ${need.channel} ${String(need.value)}`,
                );
            }
        }
    });

    it("starts a channel on a value it takes, never on the value that draws nothing", () => {
        const started = Object.values(CHANNEL_DESCRIPTORS).filter((descriptor) => descriptor.start !== undefined);
        assert.isAbove(started.length, 0);
        for (const descriptor of started) {
            assert.isTrue(valid(descriptor.channel, descriptor.start), descriptor.channel);
            assert.notStrictEqual(descriptor.start, descriptor.off, descriptor.channel);
        }

        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.patternCount"].start, 10);
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.style"].start, "dash", "a pattern starts as one that shows");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.animationSpeed"].start, 1);
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.wireframe"].start, true, "a wireframe starts on");
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["node.wireframe"].needs, [
            { channel: "node.meshDetail", value: "low" },
        ]);
    });

    it("starts a ring thin and off the rim and a plate over the node translucent (ia-design 2)", () => {
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["node.outerBorderColor"].needs, [
            { channel: "node.outerBorderWidth", value: 0.2 },
            { channel: "node.outerBorderOffset", value: 0.1 },
        ]);
        assert.deepInclude(CHANNEL_DESCRIPTORS["node.overlayColor"].needs ?? [], {
            channel: "node.overlayOpacity",
            value: 0.3,
        });
    });

    it("starts a plate behind the node as a rounded card, beside what it needs, with values its partners take", () => {
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["node.underlayColor"].startsWith, [
            { channel: "node.underlayShape", value: "round-rectangle" },
        ]);
        assert.deepInclude(CHANNEL_DESCRIPTORS["node.underlayColor"].needs ?? [], {
            channel: "node.underlayPadding",
            value: 0.2,
        });
        // a plate over the node draws at padding 0, so its padding is a start, not a need
        assert.deepStrictEqual(CHANNEL_DESCRIPTORS["node.overlayColor"].startsWith, [
            { channel: "node.overlayPadding", value: 0.1 },
        ]);
        for (const descriptor of Object.values(CHANNEL_DESCRIPTORS)) {
            for (const partner of descriptor.startsWith ?? []) {
                assert.strictEqual(CHANNEL_DESCRIPTORS[partner.channel].target, descriptor.target, descriptor.channel);
                assert.isTrue(valid(partner.channel, partner.value), `${descriptor.channel}: ${partner.channel}`);
                assert.notInclude(
                    (descriptor.needs ?? []).map((need) => need.channel),
                    partner.channel,
                    "a start is not also a need",
                );
            }
        }
    });

    it("starts a new label at the default size, one node size tall, with no start value over it", () => {
        const size = LABEL_STYLE_DESCRIPTORS.find((descriptor) => descriptor.field === "size");
        assert.isUndefined(size?.start);
    });
});

describe("every sub-setting names its part", () => {
    it("is a part head, or names a head that exists and is not itself a sub-setting", () => {
        for (const descriptor of Object.values(CHANNEL_DESCRIPTORS)) {
            if (descriptor.modifies === undefined) {
                continue;
            }

            const head = CHANNEL_DESCRIPTORS[descriptor.modifies];
            assert.isDefined(head, `${descriptor.channel} names ${descriptor.modifies}`);
            assert.isUndefined(head.modifies, `${descriptor.channel}: ${descriptor.modifies} is a head`);
            assert.strictEqual(head.target, descriptor.target, descriptor.channel);
        }
    });

    it("lists the heads that have a value drawing nothing", () => {
        const heads = Object.values(CHANNEL_DESCRIPTORS)
            .filter((descriptor) => descriptor.modifies === undefined && descriptor.off !== undefined)
            .map((descriptor) => descriptor.channel)
            .sort();
        assert.deepStrictEqual(heads, ["edge.animationSpeed", "node.glow"]);
    });

    it("groups each part's settings under the channel that switches it on", () => {
        const of = (channel: Channel): Channel | undefined => CHANNEL_DESCRIPTORS[channel].modifies;
        assert.strictEqual(of("node.borderWidth"), "node.borderColor");
        assert.strictEqual(of("node.outerBorderOffset"), "node.outerBorderColor");
        assert.strictEqual(of("node.raisedBorderDarkColor"), "node.raisedBorderWidth");
        assert.strictEqual(of("node.shadowBlur"), "node.shadowColor");
        assert.strictEqual(of("node.pieHole"), "node.pieColors");
        assert.strictEqual(of("node.chartKind"), "node.chartValues");
        assert.strictEqual(of("node.modelTurn"), "node.model");
        assert.strictEqual(of("node.xlabelLocation"), "node.xlabel");
        assert.strictEqual(of("node.labelFont"), "node.label");
        assert.strictEqual(of("edge.arrowHeadGap"), "edge.arrowHead");
        assert.strictEqual(of("edge.arrowHeadTextFont"), "edge.arrowHeadText");
        assert.isUndefined(of("edge.arrowHeadText"), "a caption is a part of its own");
        assert.isUndefined(of("node.labelFit"), "fitting the node to its label sizes the node, not the label");
    });
});

describe("a channel's range", () => {
    /** Every declared max at the start of style panel round 5: a max refuses values, so none may move. */
    const MAX_SNAPSHOT: Readonly<Record<string, number>> = {
        "edge.bundleIterations": 500,
        "edge.bundleStrength": 1,
        "edge.drawOrder": 100,
        "edge.arrowHeadOpacity": 1,
        "edge.arrowHeadPosition": 1,
        "edge.arrowHeadTextOpacity": 1,
        "edge.arrowMiddleHeadOpacity": 1,
        "edge.arrowMiddleHeadPosition": 1,
        "edge.arrowMiddleTailOpacity": 1,
        "edge.arrowMiddleTailPosition": 1,
        "edge.arrowTailOpacity": 1,
        "edge.arrowTailPosition": 1,
        "edge.arrowTailTextOpacity": 1,
        "edge.fadeOpacity": 1,
        "edge.labelBackgroundOpacity": 1,
        "edge.labelBorderOpacity": 1,
        "edge.labelOpacity": 1,
        "edge.labelOutlineOpacity": 1,
        "edge.opacity": 1,
        "edge.outlineOpacity": 1,
        "edge.overlayOpacity": 1,
        "edge.taper": 4,
        "edge.taperSource": 4,
        "node.borderOpacity": 1,
        "node.chartBackgroundOpacity": 1,
        "node.chartGap": 1,
        "node.cornerFraction": 0.5,
        "node.drawOrder": 100,
        "node.glyphWeight": 1000,
        "node.gradientDirection": 360,
        "node.groupMinHeightBiasTop": 1,
        "node.groupMinWidthBiasLeft": 1,
        "node.imageOpacity": 1,
        "node.labelBackgroundOpacity": 1,
        "node.labelBorderOpacity": 1,
        "node.labelOpacity": 1,
        "node.labelOutlineOpacity": 1,
        "node.modelAnimationSpeed": 16,
        "node.modelTurn": 360,
        "node.opacity": 1,
        "node.outerBorderOpacity": 1,
        "node.overlayOpacity": 1,
        "node.pieHole": 1,
        "node.shadowOpacity": 1,
        "node.underlayOpacity": 1,
        "node.zIndex": 0,
    };

    it("keeps every declared max", () => {
        const now = Object.fromEntries(
            Object.values(CHANNEL_DESCRIPTORS)
                .filter((descriptor) => descriptor.max !== undefined)
                .map((descriptor) => [descriptor.channel, descriptor.max]),
        );
        assert.deepStrictEqual(now, MAX_SNAPSHOT);
    });

    /** Why an unbounded number channel has no top for a control, by channel. */
    const NO_TOP_REASON = (channel: string): string | undefined => {
        if (
            /(size|width|height|depth|padding|radius|gap|length|offset|spacing|blur|quantum|period|amplitude|image|paddingx|paddingy)$/i.test(
                channel,
            )
        ) {
            return "a length in scene or screen units: as large as the graph or the screen it is drawn on";
        }

        if (/(MaxLines|SpaceCount|ScreenSize|Count)$/.test(channel)) {
            return "a count or a screen threshold with no natural ceiling";
        }

        if (
            /(fadeEnd|fadeStart|arcHeight|groupPaddingRatio|supportSpringConstant|supportRepulsion|supportCentralGravity|supportUnit|AnimationOffset|minScreenWidth)$/.test(
                channel,
            )
        ) {
            return "a distance, a share or a force constant whose useful range depends on the graph";
        }

        return undefined;
    };

    it("gives each unbounded number channel a control top, or says why it has none", () => {
        const missing = Object.values(CHANNEL_DESCRIPTORS)
            .filter((descriptor) => descriptor.accepts === "number" && descriptor.min !== undefined)
            .filter((descriptor) => descriptor.max === undefined && descriptor.suggestedMax === undefined)
            .filter((descriptor) => NO_TOP_REASON(descriptor.channel) === undefined)
            .map((descriptor) => descriptor.channel);
        assert.deepStrictEqual(missing, []);
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.glowStrength"].suggestedMax, 4);
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.glowStrength"].step, 0.1);
        for (const descriptor of Object.values(CHANNEL_DESCRIPTORS)) {
            if (descriptor.suggestedMax !== undefined) {
                assert.isUndefined(descriptor.max, `${descriptor.channel}: a suggested top never sits beside a max`);
                assert.isAbove(descriptor.suggestedMax, descriptor.min ?? 0, descriptor.channel);
            }
        }
    });

    /** Enum channels with no value drawn while unset, and what unset draws instead. */
    const NO_ENUM_DEFAULT: Readonly<Record<string, string>> = {
        "node.labelDeclutter": "unset, only the graph-wide declutter hides labels",
        "node.underlayShape": "unset, the node's own shape",
        "node.overlayShape": "unset, the node's own shape",
        "node.labelFit": "unset, the node is not fitted to its label",
        "edge.supportModel": "unset, no support point",
        "edge.route": "unset, the layout chooses the route",
        "edge.arrowHeadSide": "unset, the whole cap",
        "edge.arrowTailSide": "unset, the whole cap",
        "edge.arrowMiddleHeadSide": "unset, the whole cap",
        "edge.arrowMiddleTailSide": "unset, the whole cap",
        "node.xlabelTextAlign": "unset, the label's own",
        "node.xlabelWeight": "unset, the label's own",
    };

    it("declares the value every enum channel draws while unset, or says what unset draws", () => {
        for (const descriptor of Object.values(CHANNEL_DESCRIPTORS)) {
            if (descriptor.accepts !== "enum") {
                continue;
            }

            if (NO_ENUM_DEFAULT[descriptor.channel] !== undefined) {
                assert.isUndefined(descriptor.default, `${descriptor.channel} needs no allow-list entry`);
                continue;
            }

            assert.include(descriptor.values ?? [], String(descriptor.default), descriptor.channel);
        }
    });
});

describe("textFieldOf", () => {
    /** Each text kind's channel: its field channels start with it. */
    const KINDS = [
        "node.label",
        "node.tooltip",
        "node.xlabel",
        "edge.xlabel",
        "edge.label",
        "edge.tooltip",
        "edge.arrowHeadText",
        "edge.arrowTailText",
    ] as const;

    /** Channels under a text kind's name that set no field of its style, and why. */
    const NOT_A_FIELD: Readonly<Record<string, string>> = {
        "node.labelTable": "a table of label rows, not a field",
        "edge.labelTable": "a table of label rows, not a field",
        "node.labelFit": "sizes the node to its label",
        "node.labelPaddingX": "sizes the node to its label",
        "node.labelPaddingY": "sizes the node to its label",
        "node.labelFitSquare": "sizes the node to its label",
        "node.labelFitQuantum": "sizes the node to its label",
        "node.labelFitImage": "sizes the node to its label",
        "node.labelFitImagePadding": "sizes the node to its label",
        "node.labels": "a list of labels, each with its own fields",
        "edge.labels": "a list of labels, each with its own fields",
        "edge.arrowHeadTextDistance": "where the caption sits along the edge, not a text field",
        "edge.arrowTailTextDistance": "where the caption sits along the edge, not a text field",
    };

    it("maps every field channel of all seven text kinds to its style head and a real field", () => {
        const fields = new Set<string>(LABEL_STYLE_FIELDS);
        let mapped = 0;
        for (const channel of CHANNELS) {
            const kind = KINDS.filter((each) => channel.startsWith(each)).sort((a, b) => b.length - a.length)[0];
            if (kind === undefined || channel === kind || channel === `${kind}Style` || NOT_A_FIELD[channel]) {
                continue;
            }

            const field = textFieldOf(channel);
            assert.isDefined(field, channel);
            assert.strictEqual(field?.into, `${kind}Style`, channel);
            assert.isTrue(fields.has(field?.field ?? ""), `${channel}: ${field?.field}`);
            if (kind === "node.label" || kind === "edge.label") {
                assert.deepStrictEqual(labelFieldOf(channel), field, channel);
            } else {
                // labelFieldOf answers only for the label kinds, and the external label's own look the repaint
                // paints through it: the graph-io gate leans on it.
                if (!/^node\.xlabel(Color|Font|Weight|Italic)$/.test(channel)) {
                    assert.isUndefined(labelFieldOf(channel), channel);
                }
            }
            mapped += 1;
        }
        assert.isAbove(mapped, 100);
    });
});
