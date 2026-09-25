import "../src/data/index.ts"; // Ensure all data sources are registered
// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import { Matrix, Vector3 } from "@babylonjs/core";
import type { Meta, StoryObj } from "@storybook/web-components-vite";
import isChromatic from "chromatic/isChromatic";

import {
    assertDistinctPicture,
    assertGraphLoaded,
    assertLabelColour,
    assertLabelInkAtLeast,
    assertLabelsDrawn,
    type Drawn,
    drawn,
    holds,
} from "./assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup, waitForGraphSettled } from "./helpers";
import { drawnMargins, drawnText, labelDigest, type LabelGeometry, labelGeometry, labelMotion } from "./label-geometry";

/**
 * WHAT A STYLE LAYER CAN SAY ABOUT A LABEL.
 *
 * A layer writes two channels. `node.label` is the words -- written out, or bound to a column so
 * each node reads its own. `node.labelStyle` is everything else: the typeface and its colour, the
 * panel behind the words and its corners, borders and gradient, where the label hangs relative to
 * its node and how far away, its margins and line height and alignment, a speech-bubble pointer,
 * a badge, an outline, a shadow, an animation, depth fading, and what a number too big to show is
 * shortened to.
 *
 * ONE STORY PER SUBJECT, AND EACH ONE ASKS FOR ITS OWN. Every `play` function below reads the
 * label's own canvas and the plane it is drawn on -- where the ink sits, how far it is inset, what
 * colours are in it, where the plane hangs, whether it is moving or fading -- because a story that
 * cannot tell its subject from the default is a picture of the default.
 */

/** The twenty-cat social network every story here draws, laid out the same way each time. */
const CAT_NETWORK = {
    dataSource: "json",
    dataSourceConfig: {
        data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
    },
    layout: "ngraph",
    layoutConfig: { seed: 42 },
} as const;

/** The cats that live indoors, which is the half of the network the two-layer stories single out. */
/**
 * The font a label with the element's default style is drawn in: its default weight, 48px and
 * Verdana (src/config/RichTextStyle.ts). Stories measure text in it, so if that default changes
 * these checks fail loudly rather than measuring the wrong face.
 */
const DEFAULT_LABEL_FONT = "normal normal 48px Verdana";

const INDOOR = [
    "Princess_Fluffington",
    "Sir_Naps_A_Lot",
    "Chonky_Boy",
    "Professor_Pawsington",
    "Bella_Ballerina",
    "Butterscotch",
    "Window_Watcher_Wendy",
];

const meta: Meta = {
    title: "Styles/Label",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    argTypes: {
        labelText: { control: "text", table: { category: "Text" }, name: "node.label" },
        labelEnabled: { control: "boolean", table: { category: "Text" }, name: "node.labelStyle.enabled" },
        labelFont: { control: "text", table: { category: "Font" }, name: "node.labelStyle.font" },
        labelFontSize: {
            control: { type: "range", min: 12, max: 400, step: 4 },
            table: { category: "Font" },
            name: "node.labelStyle.sizePx",
        },
        labelFontWeight: { control: "text", table: { category: "Font" }, name: "node.labelStyle.weight" },
        labelLineHeight: {
            control: { type: "range", min: 0.5, max: 3, step: 0.1 },
            table: { category: "Font" },
            name: "node.labelStyle.lineHeight",
        },
        labelTextAlign: {
            control: "select",
            options: ["left", "center", "right"],
            table: { category: "Font" },
            name: "node.labelStyle.textAlign",
        },
        labelTextColor: { control: "color", table: { category: "Colours" }, name: "node.labelStyle.color" },
        labelBackgroundColor: {
            control: "color",
            table: { category: "Colours" },
            name: "node.labelStyle.background",
        },
        labelOutlineColor: { control: "color", table: { category: "Colours" }, name: "node.labelStyle.outline" },
        labelOutlineWidth: {
            control: { type: "range", min: 0, max: 20, step: 1 },
            table: { category: "Colours" },
            name: "node.labelStyle.outlineWidth",
        },
        labelPadding: {
            control: { type: "range", min: 0, max: 50, step: 1 },
            table: { category: "Colours" },
            name: "node.labelStyle.padding",
        },
        labelCornerRadius: {
            control: { type: "range", min: 0, max: 80, step: 1 },
            table: { category: "Panel" },
            name: "node.labelStyle.cornerRadius",
        },
        labelBorderWidth: {
            control: { type: "range", min: 0, max: 20, step: 1 },
            table: { category: "Panel" },
            name: "node.labelStyle.borderWidth",
        },
        labelBorderColor: { control: "color", table: { category: "Panel" }, name: "node.labelStyle.borderColor" },
        labelGradient: { control: "boolean", table: { category: "Panel" }, name: "node.labelStyle.gradient" },
        labelGradientType: {
            control: "select",
            options: ["linear", "radial"],
            table: { category: "Panel" },
            name: "node.labelStyle.gradientType",
        },
        labelGradientDirection: {
            control: "select",
            options: ["vertical", "horizontal", "diagonal"],
            table: { category: "Panel" },
            name: "node.labelStyle.gradientDirection",
        },
        labelLocation: {
            control: "select",
            options: [
                "top",
                "top-right",
                "top-left",
                "left",
                "center",
                "right",
                "bottom",
                "bottom-left",
                "bottom-right",
                "automatic",
            ],
            table: { category: "Placement" },
            name: "node.labelStyle.location",
        },
        labelAttachOffset: {
            control: { type: "range", min: 0, max: 6, step: 0.1 },
            table: { category: "Placement" },
            name: "node.labelStyle.attachOffset",
        },
        labelMarginTop: {
            control: { type: "range", min: 0, max: 80, step: 1 },
            table: { category: "Placement" },
            name: "node.labelStyle.marginTop",
        },
        labelMarginBottom: {
            control: { type: "range", min: 0, max: 80, step: 1 },
            table: { category: "Placement" },
            name: "node.labelStyle.marginBottom",
        },
        labelMarginLeft: {
            control: { type: "range", min: 0, max: 80, step: 1 },
            table: { category: "Placement" },
            name: "node.labelStyle.marginLeft",
        },
        labelMarginRight: {
            control: { type: "range", min: 0, max: 80, step: 1 },
            table: { category: "Placement" },
            name: "node.labelStyle.marginRight",
        },
        labelPointer: { control: "boolean", table: { category: "Pointer" }, name: "node.labelStyle.pointer" },
        labelPointerDirection: {
            control: "select",
            options: ["top", "bottom", "left", "right", "auto"],
            table: { category: "Pointer" },
            name: "node.labelStyle.pointerDirection",
        },
        labelPointerWidth: {
            control: { type: "range", min: 4, max: 80, step: 1 },
            table: { category: "Pointer" },
            name: "node.labelStyle.pointerWidth",
        },
        labelPointerHeight: {
            control: { type: "range", min: 4, max: 80, step: 1 },
            table: { category: "Pointer" },
            name: "node.labelStyle.pointerHeight",
        },
        labelShadow: { control: "boolean", table: { category: "Effects" }, name: "node.labelStyle.shadow" },
        labelShadowColor: { control: "color", table: { category: "Effects" }, name: "node.labelStyle.shadowColor" },
        labelShadowBlur: {
            control: { type: "range", min: 0, max: 40, step: 1 },
            table: { category: "Effects" },
            name: "node.labelStyle.shadowBlur",
        },
        labelShadowOffsetX: {
            control: { type: "range", min: -30, max: 30, step: 1 },
            table: { category: "Effects" },
            name: "node.labelStyle.shadowOffsetX",
        },
        labelShadowOffsetY: {
            control: { type: "range", min: -30, max: 30, step: 1 },
            table: { category: "Effects" },
            name: "node.labelStyle.shadowOffsetY",
        },
        labelAnimation: {
            control: "select",
            options: ["none", "pulse", "bounce", "shake", "glow", "fill"],
            table: { category: "Effects" },
            name: "node.labelStyle.animation",
        },
        labelAnimationSpeed: {
            control: { type: "range", min: 0.2, max: 5, step: 0.1 },
            table: { category: "Effects" },
            name: "node.labelStyle.animationSpeed",
        },
        labelDepthFade: { control: "boolean", table: { category: "Effects" }, name: "node.labelStyle.depthFade" },
        labelDepthFadeNear: {
            control: { type: "range", min: 0, max: 200, step: 1 },
            table: { category: "Effects" },
            name: "node.labelStyle.depthFadeNear",
        },
        labelDepthFadeFar: {
            control: { type: "range", min: 0, max: 400, step: 1 },
            table: { category: "Effects" },
            name: "node.labelStyle.depthFadeFar",
        },
        labelBadge: {
            control: "select",
            options: [
                "notification",
                "label",
                "label-success",
                "label-warning",
                "label-danger",
                "count",
                "icon",
                "progress",
                "dot",
            ],
            table: { category: "Badge" },
            name: "node.labelStyle.badge",
        },
        labelIcon: { control: "text", table: { category: "Badge" }, name: "node.labelStyle.icon" },
        labelSmartOverflow: {
            control: "boolean",
            table: { category: "Overflow" },
            name: "node.labelStyle.smartOverflow",
        },
        labelMaxNumber: {
            control: { type: "range", min: 1, max: 9999, step: 1 },
            table: { category: "Overflow" },
            name: "node.labelStyle.maxNumber",
        },
        labelOverflowSuffix: { control: "text", table: { category: "Overflow" }, name: "node.labelStyle.overflowSuffix" },
    },
    parameters: {
        controls: {
            include: [
                "node.label",
                "node.labelStyle.font",
                "node.labelStyle.sizePx",
                "node.labelStyle.weight",
                "node.labelStyle.color",
                "node.labelStyle.background",
                "node.labelStyle.outline",
                "node.labelStyle.padding",
            ],
        },
    },
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * Settle the story, then read the labels off the scene.
 *
 * EVERY ONE OF THESE STORIES IS ABOUT THE WORDS ON THE NODES, and before the readings below not
 * one of them asked whether any were drawn. A label is a plane parented to the node's mesh with a
 * `DynamicTexture` on it, so the two questions that matter -- is the plane there, and is there ink
 * on it -- are both answerable directly, for a fraction of a millisecond each.
 * @param canvasElement - Where the story was rendered.
 * @param story - How to name it in a failure message.
 * @returns What the story drew.
 */
const labelled = async (canvasElement: HTMLElement, story: string): Promise<Drawn> => {
    const scene = await loaded(canvasElement, story);

    await assertLabelsDrawn(scene);

    return scene;
};

/**
 * Settle the story and check the whole graph arrived, without insisting every node drew a label.
 *
 * FOR THE STORIES WHOSE SUBJECT IS A LABEL THAT IS NOT DRAWN. One of them switches labels off
 * over part of the graph, which is the thing `assertLabelsDrawn` exists to forbid everywhere else.
 * @param canvasElement - Where the story was rendered.
 * @param story - How to name it in a failure message.
 * @returns What the story drew.
 */
const loaded = async (canvasElement: HTMLElement, story: string): Promise<Drawn> => {
    await waitForGraphSettled(canvasElement);

    const scene = await drawn(canvasElement, `Styles/Label ${story}`);

    await assertGraphLoaded(scene, { nodes: 20, edges: 29 });

    return scene;
};

export const Default: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "Default");

        // Each node reads its own name, so no two labels cover the same number of pixels by
        // accident -- and a label that fell back to one shared string would show up as one.
        const inks = new Set(scene.nodes.map((node) => node.labelInk));

        await holds(
            inks.size > 1,
            `Styles/Label Default: every one of the twenty labels is bound to its own node's id and all twenty ` +
                `cover exactly ${String(scene.nodes[0].labelInk)} pixels, so they are all drawing the same string`,
        );

        await assertLabelColour(scene, "#000000", "text");
        await assertDistinctPicture(scene, "Styles/Label");
    },
};

/**
 * Switching a label off without taking its words away.
 *
 * The layer underneath gives every cat its name. The layer on top says `enabled: false` for the
 * cats that live indoors, and nothing else -- so their text is still resolved and still sitting in
 * the style model, and no plane is built for it.
 */
export const Enabled: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
            layers: [
                {
                    name: "Indoor cats keep their names to themselves",
                    target: "node",
                    selector: { match: "expression", where: "data.indoor_outdoor == 'indoor'" },
                    set: { "node.labelStyle": { enabled: false } },
                },
            ],
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.enabled"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await loaded(canvasElement, "Enabled");
        const labels = labelGeometry(scene);
        const hidden = labels.filter((label) => !label.drawn).map((label) => label.id);
        const shown = labels.filter((label) => label.drawn).map((label) => label.id);

        await holds(
            shown.length === 13,
            `Styles/Label Enabled: thirteen cats live somewhere other than indoors and should be wearing their ` +
                `names; ${String(shown.length)} labels are drawn`,
        );

        await holds(
            hidden.slice().sort().join(",") === INDOOR.slice().sort().join(","),
            `Styles/Label Enabled: the layer switches labels off for the seven indoor cats and the seven with no ` +
                `label drawn are [${hidden.join(", ")}]`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

export const TextPath: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            nodeEncode: { "node.label": { by: "data.group", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.label"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "TextPath");

        // Bound to `data.group`, which the cat network carries as the numbers 1 to 8, so the
        // labels are short and there are far fewer distinct ones than there are nodes.
        const inks = new Set(scene.nodes.map((node) => node.labelInk));

        await holds(
            inks.size <= 8,
            `Styles/Label TextPath: the labels are bound to data.group, which holds eight values, and the ` +
                `twenty labels cover ${String(inks.size)} different amounts of ink -- so they are not reading ` +
                "that column",
        );

        await assertDistinctPicture(scene, "Styles/Label");
    },
};

export const StaticText: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.label": "Static Label" },
        }),
    },
    parameters: {
        controls: {
            include: ["node.label"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "StaticText");

        // One string written out rather than bound, so every label is the same label.
        const inks = new Set(scene.nodes.map((node) => node.labelInk));

        await holds(
            inks.size === 1,
            `Styles/Label StaticText: every node is given the same words and the twenty labels cover ` +
                `${String(inks.size)} different amounts of ink`,
        );

        await assertDistinctPicture(scene, "Styles/Label");
    },
};

export const FontType: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.labelStyle": { font: "'JetBrains Mono', monospace" } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.font"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "FontType");

        await assertLabelColour(scene, "#000000", "text");
        await assertDistinctPicture(scene, "Styles/Label");
    },
};

export const FontSize: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2-fixed-positions-actual-engine.json",
        },
        setup: storySetup({
            node: { "node.labelStyle": { sizePx: 96 } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
            preSteps: 0, // Fixed layout doesn't need preSteps since positions are pre-calculated
        }),
        layout: "fixed",
        layoutConfig: {
            dim: 3,
        },
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.sizePx"],
        },
        chromatic: {
            // Using event-based waiting via play function instead of delay
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.3, // Reduced threshold since we wait for actual settling
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "FontSize");

        // Ninety-six point lettering covers far more of the label's own canvas than the
        // element's own forty-eight does.
        await assertLabelInkAtLeast(scene, 1500);
        await assertDistinctPicture(scene, "Styles/Label");
    },
};

export const FontWeight: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.labelStyle": { weight: "bold" } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.weight"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "FontWeight");

        // Bold letters are thicker letters, which is more ink on the same canvas.
        await assertLabelInkAtLeast(scene, 600);
        await assertDistinctPicture(scene, "Styles/Label");
    },
};

export const TextColor: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.labelStyle": { color: "#6366F1" } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.color"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "TextColor");

        await assertLabelColour(scene, "#6366F1", "text");
        await assertDistinctPicture(scene, "Styles/Label");
    },
};

export const BackgroundColor: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.labelStyle": { background: "#10B981" } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.background"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "BackgroundColor");

        await assertLabelColour(scene, "#10B981", "panel behind the words");
        await assertDistinctPicture(scene, "Styles/Label");
    },
};

/**
 * Rounding the corners of the panel behind the words.
 *
 * The panel fills the label's whole canvas, so a square one reaches into all four corners of it
 * and a rounded one reaches into none -- which is what the reading below asks.
 */
export const CornerRadius: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.labelStyle": { background: "#DCDCDC", cornerRadius: 24 } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.cornerRadius", "node.labelStyle.background"],
        },
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.25,
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "CornerRadius");
        const square = labelGeometry(scene).filter(
            (label) =>
                label.corners.topLeft || label.corners.topRight || label.corners.bottomLeft || label.corners.bottomRight,
        );

        await holds(
            square.length === 0,
            `Styles/Label CornerRadius: the panel is asked for a 24px corner radius, and on ` +
                `${String(square.length)} labels the canvas is still painted right into a corner -- ` +
                `[${square.map((label) => label.id).join(", ")}]`,
        );

        await assertLabelColour(scene, "#DCDCDC", "panel behind the words");
        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * Hanging the label somewhere other than above its node.
 *
 * The plane is parented to the node's own mesh, so where it sits is `mesh.position` on the plane
 * and needs no camera or layout arithmetic to read.
 */
export const Location: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.labelStyle": { location: "bottom" } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.location"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "Location");
        const above = labelGeometry(scene).filter((label) => label.offset[1] >= 0);

        await holds(
            above.length === 0,
            `Styles/Label Location: the layer hangs every label BELOW its node and ${String(above.length)} of ` +
                `them are still sitting at or above it -- ${above
                    .map((label) => `${label.id} at y=${label.offset[1].toFixed(2)}`)
                    .join(", ")}`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * The empty space between the words and the edge of the panel behind them.
 *
 * READ AS THE TEXT'S OWN BOX, not the panel's. The panel is opaque from corner to corner whatever
 * the margins are, so the question is how far the black letters are inset inside it.
 *
 * READ IN THE CANVAS'S OWN PIXELS, not the texture's. How far down the texture the letters start
 * depends on the typeface, and the typeface depends on the machine: with these margins the ink
 * starts 22-26px down locally and 19px down on Chromatic. Normalised by the font's own glyph
 * height, the margin reads back as roughly the pixels asked for on every font tried.
 */
export const Margin: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: {
                "node.labelStyle": {
                    background: "#DCDCDC",
                    color: "#000000",
                    marginTop: 40,
                    marginBottom: 40,
                    marginLeft: 40,
                    marginRight: 40,
                },
            },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: [
                "node.labelStyle.marginTop",
                "node.labelStyle.marginBottom",
                "node.labelStyle.marginLeft",
                "node.labelStyle.marginRight",
                "node.labelStyle.background",
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "Margin");
        // The story leaves the typeface to the element, which draws 48px Verdana on a 1.2 line
        // height. Verdana is rarely installed, so what is actually drawn is whatever the browser
        // falls back to -- which `drawnMargins` asks the same browser about.
        //
        // The mean of the top and bottom margin read back per label, in canvas pixels, across six
        // fonts (Liberation Serif, Liberation Sans, Liberation Mono, DejaVu Serif, DejaVu Sans
        // Mono, Z003): 9.2-12.2 with ten-pixel margins, 4.6-6.7 with the element's default of
        // five, and -0.6-1.7 with none. These forty-pixel margins read 40-45 here. A floor of 20
        // sits far from both the default and the value asked for.
        const tight = labelGeometry(scene, "#000000")
            .map((label) => {
                const margin = drawnMargins(label, label.id, DEFAULT_LABEL_FONT, 48 * 1.2);

                return { id: label.id, ...margin, mean: (margin.top + margin.bottom) / 2 };
            })
            .filter((label) => label.mean < 20);

        await holds(
            tight.length === 0,
            `Styles/Label Margin: forty pixels of margin are asked for on all four sides, and on ` +
                `${String(tight.length)} labels the space above and below the words is no wider than ` +
                `the element's default of five -- ` +
                `${tight
                    .map(
                        (label) =>
                            `${label.id} has ${label.top.toFixed(1)}px above and ${label.bottom.toFixed(1)}px below`,
                    )
                    .join("; ")}`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * How far from its node the label hangs.
 *
 * The element's own default lifts a label half a unit clear of the node's bounding box. Three
 * units puts it well out in front of the graph, which is what the plane's own position says.
 */
export const AttachOffset: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.labelStyle": { attachOffset: 3 } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.attachOffset"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "AttachOffset");
        const close = labelGeometry(scene).filter((label) => label.offset[1] < 3);

        await holds(
            close.length === 0,
            `Styles/Label AttachOffset: every label is asked to hang three units clear of its node and ` +
                `${String(close.length)} are closer than that -- ${close
                    .map((label) => `${label.id} at y=${label.offset[1].toFixed(2)}`)
                    .join(", ")}`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * How far apart the lines of a multi-line label sit.
 *
 * MEASURED AS THE BLANK BANDS BETWEEN THEM. Three lines pushed apart by a line height of two and
 * a half leave wide empty rows between the words; the element's own 1.2 leaves almost none.
 */
export const LineHeight: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.label": "Line 1\nLine 2\nLine 3", "node.labelStyle": { lineHeight: 2.5 } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.lineHeight"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "LineHeight");
        const crowded = labelGeometry(scene).filter((label) => label.blankRows < 0.4);

        await holds(
            crowded.length === 0,
            `Styles/Label LineHeight: three lines at a line height of 2.5 should leave most of the label blank ` +
                `between them, and on ${String(crowded.length)} labels the lines are still crowded together -- ` +
                `${crowded.map((label) => `${label.id} is ${(label.blankRows * 100).toFixed(0)}% blank`).join(", ")}`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * An outline around the letters, and how thick it is drawn.
 */
export const TextOutline: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.labelStyle": { outline: "#FF0000", outlineWidth: 8 } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.outline", "node.labelStyle.outlineWidth"],
        },
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.25,
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "TextOutline");

        await assertLabelColour(scene, "#FF0000", "outline around the letters");

        // Eight pixels of outline around every letter is a great deal more red than the one-pixel
        // default draws, so the red is most of the ink rather than a hairline on the edge of it.
        //
        // AS A SHARE OF EACH LABEL'S OWN TEXTURE, and NOT because of the canvas: a label is drawn
        // on a texture sized by its text, so these twenty cats' names sit on 256x128, 512x128 and
        // 1024x128 canvases of their own and read the same at every viewport and in vitest, to
        // the pixel. The share is what makes the reading mean anything. A raw count says nothing
        // next to a texture whose area varies four-fold from one label to the next, and the count
        // of 400 this replaces was low enough to pass a story named for an eight-pixel outline
        // while the element drew a ONE-pixel one: the lowest label reads 11,451 red pixels as
        // asked, 2,523 with outlineWidth ignored and 4,685 at outlineWidth 2, so all three clear
        // 400 comfortably and the assertion never noticed.
        //
        // Read as a share, the same three are 33.3%-37.0% of the label's own texture as asked,
        // 7.58%-9.21% with the width ignored and 14.26%-17.15% at 2. A floor of 20% is 1.67x
        // under the true reading and catches both breaks -- 2.6x and 1.4x clear of them.
        const coverage = (label: LabelGeometry): number => {
            const texture = label.texture.width * label.texture.height;

            // A label with no texture is a label that is not drawn, which is a failure and not a
            // division by zero.
            return texture === 0 ? 0 : label.pixels / texture;
        };

        const thin = labelGeometry(scene, "#FF0000").filter((label) => coverage(label) < 0.2);

        await holds(
            thin.length === 0,
            `Styles/Label TextOutline: the outline is asked for at eight pixels wide and on ` +
                `${String(thin.length)} labels it covers barely any of the label -- ` +
                `${thin
                    .map(
                        (label) =>
                            `${label.id} has ${String(label.pixels)} red pixels, ` +
                            `${(coverage(label) * 100).toFixed(1)}% of its ` +
                            `${String(label.texture.width)}x${String(label.texture.height)} texture`,
                    )
                    .join(", ")}`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * A hard red shadow thrown down and to the right of black letters, on a white panel.
 *
 * RED SO THAT IT CAN BE SEEN. The 1.x story threw a soft, half-transparent black shadow three
 * pixels down, which on black letters reads as a slightly heavier weight: in a side-by-side of two
 * renderings nobody can say whether a shadow is there at all. An unblurred red copy of every
 * letter eight pixels down and to the right is unmistakable, and its colour belongs to nothing
 * else on the label, so it can be counted.
 *
 * COUNTED AS A SHARE OF THE LETTERS' OWN INK, so the reading does not depend on the font. The
 * story leaves the typeface to the element (Verdana, which few machines have), and a heavier
 * fallback font draws both more black and more red, so red over black stays put: the part of each
 * letter's copy that the letter itself does not cover, roughly half to most of it at eight pixels.
 */
export const TextShadow: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: {
                "node.labelStyle": {
                    background: "#FFFFFF",
                    color: "#000000",
                    shadow: true,
                    shadowColor: "#FF3B30",
                    shadowBlur: 0,
                    shadowOffsetX: 8,
                    shadowOffsetY: 8,
                },
            },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: [
                "node.labelStyle.shadow",
                "node.labelStyle.shadowColor",
                "node.labelStyle.shadowBlur",
                "node.labelStyle.shadowOffsetX",
                "node.labelStyle.shadowOffsetY",
                "node.labelStyle.background",
            ],
        },
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.25,
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "TextShadow");
        const black = new Map(labelGeometry(scene, "#000000").map((label) => [label.id, label.pixels]));

        // Red pixels per black one, measured per label across eight faces standing in for Verdana
        // (Liberation Serif, Sans and Mono, DejaVu Serif, Sans Mono and Sans Bold, Z003 and the
        // browser's own fallback): 0.47-0.86 as drawn, the low end from the bold face, whose thick
        // strokes hide more of their own shadow. With the shadow switched off, or thrown at no
        // offset so the letters cover it, there is no red at all. A floor of 0.25 is 1.9x under
        // the lowest reading. It does not try to catch a shadow thrown too short: at a quarter of
        // the offset the readings run 0.10-0.46 depending on the face, which overlaps.
        const shadowed = (label: LabelGeometry): number => label.pixels / Math.max(1, black.get(label.id) ?? 0);
        const bare = labelGeometry(scene, "#FF3B30").filter((label) => shadowed(label) < 0.25);

        await holds(
            bare.length === 0,
            `Styles/Label TextShadow: a red shadow is asked for under every label, and on ` +
                `${String(bare.length)} labels there is little or no red beside the black letters -- ` +
                `${bare
                    .map(
                        (label) =>
                            `${label.id} has ${String(label.pixels)} red pixels to ` +
                            `${String(black.get(label.id) ?? 0)} black`,
                    )
                    .join(", ")}`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * A border drawn around the panel behind the words.
 */
export const Border: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.labelStyle": { background: "rgba(255, 255, 255, 0.9)", borderWidth: 2, borderColor: "#6366F1" } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.borderWidth", "node.labelStyle.borderColor", "node.labelStyle.background"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "Border");

        await assertLabelColour(scene, "#6366F1", "border around the panel");

        // A border is a FRAME: indigo that reaches all four edges of the label's texture while
        // covering only a thin strip of it. Measured, the two-pixel border covers 5.4%-6.9% of each
        // texture and touches every edge; with no border there is no indigo at all, and an indigo
        // panel would cover nearly all of it. The floor and ceiling are 1.8x and 2.9x clear.
        const unframed = labelGeometry(scene, "#6366F1").filter((label) => {
            const share = label.pixels / Math.max(1, label.texture.width * label.texture.height);
            const edges = [label.inset.top, label.inset.bottom, label.inset.left, label.inset.right];

            return share < 0.03 || share > 0.2 || edges.some((inset) => inset > 0);
        });

        await holds(
            unframed.length === 0,
            `Styles/Label Border: a two-pixel indigo border is asked for and on ${String(unframed.length)} labels ` +
                `the indigo is not a thin frame round the edge -- ` +
                `${unframed
                    .map(
                        (label) =>
                            `${label.id} has ${String(label.pixels)} indigo pixels on its ` +
                            `${String(label.texture.width)}x${String(label.texture.height)} texture, inset ` +
                            `${[label.inset.top, label.inset.right, label.inset.bottom, label.inset.left]
                                .map((inset) => inset.toFixed(3))
                                .join("/")}`,
                    )
                    .join("; ")}`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * Filling the panel with a gradient rather than one flat colour.
 *
 * READ AS THE TWO ENDS OF IT. A strip down the left of the canvas and a strip down the right
 * average out to two different colours when a horizontal gradient is drawn, and to the same
 * colour when a flat fill is.
 */
export const BackgroundGradient: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: {
                "node.labelStyle": {
                    gradient: true,
                    gradientType: "linear",
                    gradientDirection: "horizontal",
                    gradientColors: ["#6366F1", "#10B981"],
                },
            },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: [
                "node.labelStyle.gradient",
                "node.labelStyle.gradientType",
                "node.labelStyle.gradientDirection",
            ],
        },
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.25,
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "BackgroundGradient");
        const channel = (hex: string, at: number): number => Number.parseInt(hex.slice(at, at + 2), 16);
        const flat = labelGeometry(scene).filter((label) => {
            const bluer = channel(label.sides.left, 5) - channel(label.sides.right, 5);
            const greener = channel(label.sides.right, 3) - channel(label.sides.left, 3);

            return bluer < 40 || greener < 40;
        });

        await holds(
            flat.length === 0,
            `Styles/Label BackgroundGradient: the panel is asked to run from indigo on the left to green on the ` +
                `right, and on ${String(flat.length)} labels the two sides are the same colour -- ` +
                `${flat.map((label) => `${label.id} ${label.sides.left} to ${label.sides.right}`).join("; ")}`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * A speech-bubble pointer coming out of the panel.
 *
 * READ AS THE SHAPE OF THE CANVAS. A plain panel is a rectangle: ink runs the full width of it at
 * the top, in the middle and at the bottom. A pointer is drawn in a band added underneath, and it
 * tapers to a point -- so the bottom of the canvas is a short run in the middle of an empty row.
 */
export const Pointer: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: {
                "node.labelStyle": {
                    background: "#DCDCDC",
                    pointer: true,
                    pointerDirection: "bottom",
                    pointerWidth: 40,
                    pointerHeight: 40,
                    location: "top",
                    attachOffset: 1.5,
                },
            },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: [
                "node.labelStyle.pointer",
                "node.labelStyle.pointerDirection",
                "node.labelStyle.pointerWidth",
                "node.labelStyle.pointerHeight",
                "node.labelStyle.background",
                "node.labelStyle.location",
            ],
        },
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.25,
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "Pointer");
        const square = labelGeometry(scene).filter((label) => label.spread.bottom > label.spread.middle * 0.6);

        await holds(
            square.length === 0,
            `Styles/Label Pointer: a pointer is asked for under every label and on ${String(square.length)} of ` +
                `them the bottom of the canvas is as wide as the middle, which is a plain rectangle -- ` +
                `${square
                    .map(
                        (label) =>
                            `${label.id} runs ${(label.spread.bottom * 100).toFixed(0)}% wide at the bottom and ` +
                            `${(label.spread.middle * 100).toFixed(0)}% in the middle`,
                    )
                    .join("; ")}`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * A label that moves.
 *
 * TWO READINGS A FEW FRAMES APART, because one reading of an animated label is a still label at
 * some scale, which is indistinguishable from a label that never moved. Under Chromatic the
 * animation is switched off, so that a per-story baseline is a picture of one thing rather than of
 * whatever the pulse happened to be doing -- and the reading below asks for stillness instead.
 */
export const Animation: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: {
                "node.labelStyle": {
                    animation: isChromatic() ? "none" : "pulse",
                    animationSpeed: 2,
                    background: "#FF3B30",
                    color: "#FFFFFF",
                },
            },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.animation", "node.labelStyle.animationSpeed", "node.labelStyle.background"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "Animation");
        const moved = await labelMotion(scene);

        if (isChromatic()) {
            await holds(
                moved.scale === 0,
                `Styles/Label Animation: the animation is switched off for the baseline and a label still ` +
                    `changed scale by ${moved.scale.toFixed(4)} while it was being watched`,
            );
        } else {
            await holds(
                moved.scale > 0.01,
                `Styles/Label Animation: every label is asked to pulse and the largest change in scale over ` +
                    `four hundred milliseconds was ${moved.scale.toFixed(4)}`,
            );
        }

        await assertLabelColour(scene, "#FF3B30", "panel behind the words");
        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * A badge drawn in place of a plain label.
 *
 * A badge brings a whole appearance with it -- the notification badge is a red pill with white
 * lettering -- and anything the layer writes beside it still wins, which is how the pulse that
 * badge normally carries is switched off here.
 */
export const Badge: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.labelStyle": { badge: "notification", animation: "none" } },
            nodeEncode: { "node.label": { by: "data.group", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.badge"],
        },
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.5,
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "Badge");

        await assertLabelColour(scene, "#FF3B30", "notification badge");
        await assertLabelColour(scene, "#FFFFFF", "lettering on the notification badge");

        const labels = labelGeometry(scene);

        // A notification badge is a pill, so the canvas is empty in all four corners -- and it is
        // sized to a circle whatever the words are, so the canvas is square.
        const square = labels.filter(
            (label) =>
                label.corners.topLeft || label.corners.topRight || label.corners.bottomLeft || label.corners.bottomRight,
        );

        await holds(
            square.length === 0,
            `Styles/Label Badge: a notification badge is drawn as a pill and on ${String(square.length)} labels ` +
                `the canvas is painted into a square corner -- [${square.map((label) => label.id).join(", ")}]`,
        );

        const oblong = labels.filter((label) => label.texture.width !== label.texture.height);

        await holds(
            oblong.length === 0,
            `Styles/Label Badge: a badge is sized to a circle around its own text, and ${String(oblong.length)} ` +
                `labels are drawn on an oblong canvas -- ${oblong
                    .map((label) => `${label.id} is ${String(label.texture.width)}x${String(label.texture.height)}`)
                    .join(", ")}`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * Shortening a number too big to show.
 *
 * Every cat is given a count of 1500 in an ordinary label, drawn with the element's default label
 * style, and smart overflow draws each one as `1k`.
 */
export const SmartOverflow: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.label": "1500", "node.labelStyle": { smartOverflow: true } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.smartOverflow", "node.label"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "SmartOverflow");
        // READ AS INK, IN THE FONT THIS BROWSER DREW. Each label's ink is matched against `1k` and
        // `1500` measured with this browser's own fallback for the element's default font, so the
        // check does not depend on which font a machine happens to have (see drawnText).
        const wrong = labelGeometry(scene)
            .map((label) => ({ label, read: drawnText(label, ["1k", "1500"], DEFAULT_LABEL_FONT, 10) }))
            .filter(({ read }) => read.best !== "1k");

        await holds(
            wrong.length === 0,
            `Styles/Label SmartOverflow: every label asks for 1500 with smart overflow on and should read 1k; ` +
                `${String(wrong.length)} read otherwise -- ${ 
                wrong
                    .map(({ label, read }) => `${label.id} reads ${read.best || "nothing"} ${JSON.stringify(read.errors)}`)
                    .join("; ")}`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * How big a number has to be before it is shortened.
 *
 * Every cat is given a count of 150 in an ordinary label. The indoor cats will show any number up
 * to 999, so they draw all three digits; the rest stop at 99 and draw `99+`.
 */
export const MaxNumber: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.label": "150", "node.labelStyle": { smartOverflow: true, maxNumber: 99 } },
            layers: [
                {
                    name: "Indoor cats count all the way to 999",
                    target: "node",
                    selector: { match: "expression", where: "data.indoor_outdoor == 'indoor'" },
                    set: { "node.labelStyle": { smartOverflow: true, maxNumber: 999 } },
                },
            ],
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.maxNumber", "node.label", "node.labelStyle.smartOverflow"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "MaxNumber");
        const labels = labelGeometry(scene);
        const whole = new Set(labels.filter((label) => INDOOR.includes(label.id)).map((label) => label.pixels));
        const capped = new Set(labels.filter((label) => !INDOOR.includes(label.id)).map((label) => label.pixels));

        await holds(
            whole.size === 1 && capped.size === 1,
            `Styles/Label MaxNumber: each half of the graph draws one string, so each should cover one amount ` +
                `of ink; the seven drew ${String(whole.size)} and the thirteen drew ${String(capped.size)}`,
        );

        await holds(
            [...whole][0] !== [...capped][0],
            `Styles/Label MaxNumber: a cap of 99 shortens 150 and a cap of 999 does not, and both halves drew ` +
                `${String([...whole][0])} pixels of ink`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * What is drawn after a number that has been shortened.
 *
 * Both halves of the graph stop counting at 99. The indoor cats finish with a single `+` and the
 * rest with `++`, so the only difference on screen is the one extra glyph.
 */
export const OverflowSuffix: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: {
                "node.label": "150",
                "node.labelStyle": { smartOverflow: true, maxNumber: 99, overflowSuffix: "++" },
            },
            layers: [
                {
                    name: "Indoor cats finish with a single plus",
                    target: "node",
                    selector: { match: "expression", where: "data.indoor_outdoor == 'indoor'" },
                    set: { "node.labelStyle": { smartOverflow: true, maxNumber: 99, overflowSuffix: "+" } },
                },
            ],
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.overflowSuffix", "node.labelStyle.maxNumber", "node.label"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "OverflowSuffix");
        const labels = labelGeometry(scene);
        const onePlus = Math.max(...labels.filter((label) => INDOOR.includes(label.id)).map((label) => label.ink.width));
        const twoPlus = Math.min(...labels.filter((label) => !INDOOR.includes(label.id)).map((label) => label.ink.width));

        await holds(
            twoPlus > onePlus,
            `Styles/Label OverflowSuffix: "99++" carries one more glyph than "99+" and should be the wider of ` +
                `the two; the single-plus labels are ${String(onePlus)}px wide and the double ${String(twoPlus)}px`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * Lining the lines of a multi-line label up against each other.
 *
 * READ AT THE TOP OF THE CANVAS. The first line here is one character long and the last is many,
 * so a left-aligned label starts that first line hard against its margin while a centred one
 * pushes it most of the way across.
 */
export const TextAlign: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.label": "I\nam\naligned to the left", "node.labelStyle": { textAlign: "left" } },
        }),
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.textAlign"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "TextAlign");
        const centred = labelGeometry(scene).filter((label) => label.band.top.from > 0.2);

        await holds(
            centred.length === 0,
            `Styles/Label TextAlign: the lines are asked to line up on the left and on ${String(centred.length)} ` +
                `labels the first line still starts well into the canvas -- ${centred
                    .map((label) => `${label.id} starts at ${(label.band.top.from * 100).toFixed(0)}%`)
                    .join(", ")}`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

/**
 * Labels that fade out with distance.
 *
 * The plane's own material carries the fade, so the reading is its alpha: with the near and far
 * distances straddling the graph, the labels nearest the camera are drawn solid and the ones
 * furthest away are drawn faint.
 */
export const DepthFade: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.labelStyle": { depthFade: true, depthFadeNear: 10, depthFadeFar: 200 } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
    },
    parameters: {
        controls: {
            include: [
                "node.labelStyle.depthFade",
                "node.labelStyle.depthFadeNear",
                "node.labelStyle.depthFadeFar",
            ],
        },
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.3,
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "DepthFade");
        const alphas = labelGeometry(scene).map((label) => label.alpha);
        const faintest = Math.min(...alphas);
        const strongest = Math.max(...alphas);

        await holds(
            faintest < 0.95,
            `Styles/Label DepthFade: the labels are asked to fade between ten and two hundred units from the ` +
                `camera ` +
                `and the faintest of the twenty is still drawn at ${faintest.toFixed(3)}`,
        );

        await holds(
            strongest - faintest > 0.05,
            `Styles/Label DepthFade: the cats are spread through the scene, so the near ones should be drawn ` +
                `more solidly than the far ones; every label is at ${faintest.toFixed(3)}`,
        );

        await assertDistinctPicture(scene, "Styles/Label", labelDigest(scene));
    },
};

export const EmojiLabels: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.label": "🚀💫🌈✨", "node.labelStyle": { sizePx: 32 } },
        }),
    },
    parameters: {
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.25,
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "EmojiLabels");

        // WHAT THIS CAN AND CANNOT CHECK. The four glyphs are the same four on every node, so
        // every label must cover the same amount of canvas, and covering none of it is a label
        // that drew nothing -- which is the failure worth catching. It cannot check that they are
        // drawn IN COLOUR: the headless Chromium this lane runs in has no colour-emoji font
        // installed, so the glyphs come back as one near-black ink, and asserting otherwise would
        // be asserting a property of the test machine.
        await assertLabelInkAtLeast(scene, 200);

        const inks = new Set(scene.nodes.map((node) => node.labelInk));

        await holds(
            inks.size === 1,
            `Styles/Label EmojiLabels: every node draws the same four glyphs and the labels cover ` +
                `${String(inks.size)} different amounts of ink`,
        );

        await assertDistinctPicture(scene, "Styles/Label");
    },
};

export const UnicodeText: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.label": "こんにちは\nПривет\nمرحبا", "node.labelStyle": { sizePx: 96 } },
        }),
    },
    parameters: {
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.25,
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "UnicodeText");

        // Three scripts on three lines at 96px. A font that drew none of them, or drew three rows
        // of tofu, is the failure this is for: tofu boxes cover far less of the canvas than
        // filled glyphs do.
        await assertLabelInkAtLeast(scene, 2000);
        await assertDistinctPicture(scene, "Styles/Label");
    },
};

/**
 * Labels that would land on top of each other are not all drawn, when the element is asked.
 *
 * Every cat is labelled at 128px, so several labels' words cross on screen. With the element's
 * `labels.declutter` behaviour turned on, it keeps the label of the better-connected node (then
 * the node id, so the choice is stable) and hides any label whose words would cover the words of
 * one already kept. Nothing about the style changes: a hidden label is still built, and comes
 * back when its node moves clear. Every other story leaves the behaviour at its default, off.
 */
export const Declutter: Story = {
    args: {
        ...CAT_NETWORK,
        setup: storySetup({
            node: { "node.labelStyle": { sizePx: 128 } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
            declutterLabels: true,
        }),
    },
    play: async ({ canvasElement }) => {
        const scene = await labelled(canvasElement, "Declutter");
        const { graph } = scene;
        const camera = graph.scene.activeCamera;
        const engine = graph.scene.getEngine();

        await holds(camera !== null, "Styles/Label Declutter: the scene has no camera");
        if (camera === null) {
            return;
        }

        const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        const shown: { id: string; left: number; right: number; top: number; bottom: number }[] = [];
        let hidden = 0;

        for (const node of graph.getNodes()) {
            const plane = node.label?.labelMesh;
            if (!plane || plane.isDisposed() || !plane.isEnabled()) {
                continue;
            }

            if (!plane.isVisible) {
                hidden++;
                continue;
            }

            const xs: number[] = [];
            const ys: number[] = [];
            for (const corner of plane.getBoundingInfo().boundingBox.vectorsWorld) {
                const p = Vector3.Project(corner, Matrix.Identity(), graph.scene.getTransformMatrix(), viewport);
                xs.push(p.x);
                ys.push(p.y);
            }

            // The words, not the padded plane: two planes may overlap in their margins while the
            // words drawn on them do not, and it is the words the pass keeps apart.
            const left = Math.min(...xs);
            const top = Math.min(...ys);
            const width = Math.max(...xs) - left;
            const height = Math.max(...ys) - top;
            const words = node.label?.textBounds ?? { left: 0, right: 1, top: 0, bottom: 1 };
            shown.push({
                id: String(node.id),
                left: left + words.left * width,
                right: left + words.right * width,
                top: top + words.top * height,
                bottom: top + words.bottom * height,
            });
        }

        const crossing = shown.flatMap((a, i) =>
            shown
                .slice(i + 1)
                .filter((b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top)
                .map((b) => `${a.id} / ${b.id}`),
        );

        await holds(crossing.length === 0, `Styles/Label Declutter: the words of drawn labels overlap: ${crossing.join(", ")}`);
        await holds(hidden > 0, "Styles/Label Declutter: 128-pixel labels on twenty cats hid none");
        await holds(shown.length > 1, `Styles/Label Declutter: only ${String(shown.length)} label is drawn`);
        await assertDistinctPicture(scene, "Styles/Label");
    },
};
