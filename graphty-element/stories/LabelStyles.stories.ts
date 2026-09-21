import "../src/data/index.ts"; // Ensure all data sources are registered

import type { Meta, StoryObj } from "@storybook/web-components-vite";
import isChromatic from "chromatic/isChromatic";

import { Graphty } from "../src/graphty-element";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup, waitForGraphSettled } from "./helpers";

/**
 * WHAT A STYLE LAYER CAN SAY ABOUT A LABEL, AND WHAT IT CANNOT.
 *
 * A layer writes two channels: `node.label`, the words -- written out, or bound to a column so
 * each node reads its own -- and `node.labelStyle`, which has seven fields: the font, its size,
 * its weight, the text colour, a background colour, an outline colour and a padding. That is the
 * whole vocabulary.
 *
 * THE RENDERER STILL DRAWS A GREAT DEAL MORE, AND NOTHING CAN ASK IT TO. Where a label sits
 * relative to its node, its margins and attach offset, its corner radius and border, a pointer
 * or a badge, a text shadow, a background gradient, line height, text alignment, an animation,
 * depth fading, and the overflow rules (`smartOverflow`, `maxNumber`, `overflowSuffix`) are all
 * still drawn by `RichTextLabel` -- and every one of them was reachable only through the 1.x
 * style template, which is gone. The stories that demonstrated them are gone with it, because a
 * story that cannot ask for the thing it is about is a picture of the default.
 */

const meta: Meta = {
    title: "Styles/Label",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    argTypes: {
        labelText: { control: "text", table: { category: "Text" }, name: "node.label" },
        labelFont: { control: "text", table: { category: "Font" }, name: "node.labelStyle.font" },
        labelFontSize: {
            control: { type: "range", min: 12, max: 400, step: 4 },
            table: { category: "Font" },
            name: "node.labelStyle.sizePx",
        },
        labelFontWeight: { control: "text", table: { category: "Font" }, name: "node.labelStyle.weight" },
        labelTextColor: { control: "color", table: { category: "Colours" }, name: "node.labelStyle.color" },
        labelBackgroundColor: {
            control: "color",
            table: { category: "Colours" },
            name: "node.labelStyle.background",
        },
        labelOutlineColor: { control: "color", table: { category: "Colours" }, name: "node.labelStyle.outline" },
        labelPadding: {
            control: { type: "range", min: 0, max: 50, step: 1 },
            table: { category: "Colours" },
            name: "node.labelStyle.padding",
        },
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
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        setup: storySetup({
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
        layout: "ngraph",
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        setup: storySetup({
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
        layout: "ngraph",
        layoutConfig: {
            seed: 42,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
    },
};

export const TextPath: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        setup: storySetup({
            nodeEncode: { "node.label": { by: "data.group", scale: "passthrough" } },
        }),
        layout: "ngraph",
        layoutConfig: {
            seed: 42,
        },
    },
    parameters: {
        controls: {
            include: ["node.label"],
        },
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
    },
};

export const StaticText: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        setup: storySetup({
            node: { "node.label": "Static Label" },
        }),
        layout: "ngraph",
        layoutConfig: {
            seed: 42,
        },
    },
    parameters: {
        controls: {
            include: ["node.label"],
        },
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
    },
};

export const FontType: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        setup: storySetup({
            node: { "node.labelStyle": { font: "'JetBrains Mono', monospace" } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
        layout: "ngraph",
        layoutConfig: {
            seed: 42,
        },
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.font"],
        },
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
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
        // Wait for the graph to fully settle before taking the screenshot
        await waitForGraphSettled(canvasElement);
    },
};

export const FontWeight: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        setup: storySetup({
            node: { "node.labelStyle": { weight: "bold" } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
        layout: "ngraph",
        layoutConfig: {
            seed: 42,
        },
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.weight"],
        },
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
    },
};

export const TextColor: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        setup: storySetup({
            node: { "node.labelStyle": { color: "#6366F1" } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
        layout: "ngraph",
        layoutConfig: {
            seed: 42,
        },
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.color"],
        },
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
    },
};

export const BackgroundColor: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        setup: storySetup({
            node: { "node.labelStyle": { background: "#10B981" } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
        layout: "ngraph",
        layoutConfig: {
            seed: 42,
        },
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.background"],
        },
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
    },
};

/**
 * An outline around the letters.
 *
 * WHAT THIS NO LONGER DEMONSTRATES: the outline's width, and switching it off while keeping its
 * colour. `node.labelStyle.outline` is a colour, and writing one is what switches the outline
 * on; the renderer draws it at one fixed width that nothing can ask it to change.
 */
export const TextOutline: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        setup: storySetup({
            node: { "node.labelStyle": { outline: "#FF0000" } },
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
        }),
        layout: "ngraph",
        layoutConfig: {
            seed: 42,
        },
    },
    parameters: {
        controls: {
            include: ["node.labelStyle.outline"],
        },
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.25,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
    },
};

export const EmojiLabels: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        setup: storySetup({
            node: { "node.label": "🚀💫🌈✨", "node.labelStyle": { sizePx: 32 } },
        }),
        layout: "ngraph",
        layoutConfig: {
            seed: 42,
        },
    },
    parameters: {
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.25,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
    },
};

export const UnicodeText: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        setup: storySetup({
            node: { "node.label": "こんにちは\nПривет\nمرحبا", "node.labelStyle": { sizePx: 96 } },
        }),
        layout: "ngraph",
        layoutConfig: {
            seed: 42,
        },
    },
    parameters: {
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.25,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
    },
};
