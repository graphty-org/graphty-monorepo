// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { assertArrowCapsDrawn, assertGraphLoaded, drawn, holds, pixelsOfColour } from "./assertions";
import { arrowTypes, eventWaitingDecorator, renderFn, type StoryArgs, storySetup } from "./helpers";

const meta: Meta = {
    title: "Styles/Edge",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    argTypes: {
        arrowHead: { control: "select", options: arrowTypes, table: { category: "Head" }, name: "edge.arrowHead" },
        arrowHeadSize: {
            control: { type: "range", min: 0.1, max: 5, step: 0.1 },
            table: { category: "Head" },
            name: "edge.arrowHeadSize",
        },
        arrowHeadColor: { control: "color", table: { category: "Head" }, name: "edge.arrowHeadColor" },
        arrowTail: { control: "select", options: arrowTypes, table: { category: "Tail" }, name: "edge.arrowTail" },
        arrowTailSize: {
            control: { type: "range", min: 0.1, max: 5, step: 0.1 },
            table: { category: "Tail" },
            name: "edge.arrowTailSize",
        },
        arrowTailColor: { control: "color", table: { category: "Tail" }, name: "edge.arrowTailColor" },
        edgeColor: { control: "color", table: { category: "Line" }, name: "edge.color" },
    },
    args: {
        setup: storySetup({}),
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        layout: "ngraph",
        layoutConfig: { seed: 42 },
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * An arrow at each end of every edge, each end told its own colour.
 *
 * THE TWO ENDS ARE SEPARATE CHANNELS, which is the whole point of the story: a red triangle at
 * the head and a blue crossbar at the tail, on one grey line. Each property is its own channel --
 * `edge.arrowHeadColor`, `edge.arrowTailSize` and the rest -- so any of them can be bound to a
 * value in the data as well as set outright. Both caps are left at the default size, as they were
 * in 1.x; the size channels are here as controls.
 *
 * This is also where the colour defect was visible before the channels existed. The element's own
 * defaults pinned the HEAD to grey and never mentioned the tail, so an edge painted any colour at
 * all was drawn with a cap that followed the line at one end and a grey one at the other.
 */
export const Bidirectional: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge Bidirectional");

        await assertGraphLoaded(scene, { nodes: 20, edges: 29 });

        // A cap at each end of every edge, and they are two DIFFERENT caps: a filled triangle at
        // the head and a crossbar at the tail.
        await assertArrowCapsDrawn(scene, ["filled-triangle-arrow", "filled-tee-arrow"]);

        // AND TWO COLOURS, neither of them the line's. Counted in pixels, because a cap's colour
        // is a shader uniform: it is on neither the mesh nor its name.
        const red = await pixelsOfColour(scene, "#ff0000");
        const blue = await pixelsOfColour(scene, "#0000ff");

        // Both caps are drawn over twenty-nine edges laid out by a physics run, so neither count
        // is stable to better than a factor of a few. Measured on a 900x700 canvas: 196-228 red
        // and 384 blue; with the two colours left out, none of either. The floors are over 3x
        // under both readings.
        await holds(
            red > 60 && blue > 100,
            `Styles/Edge Bidirectional: the two ends are asked for in red and blue and the canvas holds ` +
                `${String(red)} red and ${String(blue)} blue pixels`,
        );
    },
    args: {
        setup: storySetup({
            edge: {
                "edge.arrowHead": "normal",
                "edge.arrowHeadColor": "#FF0000",
                "edge.arrowTail": "tee",
                "edge.arrowTailColor": "#0000FF",
                "edge.color": "darkgrey",
            },
        }),
    },
    parameters: {
        controls: {
            include: [
                "edge.arrowHead",
                "edge.arrowHeadSize",
                "edge.arrowHeadColor",
                "edge.arrowTail",
                "edge.arrowTailSize",
                "edge.arrowTailColor",
                "edge.color",
            ],
        },
    },
};
