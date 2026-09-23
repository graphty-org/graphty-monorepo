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
 * An arrow at each end of every edge, each end told its own size and its own colour.
 *
 * THE TWO ENDS ARE SEPARATE CHANNELS, which is the whole point of the story: a large blue
 * triangle at the head and a small orange crossbar at the tail, on one grey line. Each property
 * is its own channel -- `edge.arrowHeadSize`, `edge.arrowTailColor` and the rest -- so any of
 * them can be bound to a value in the data as well as set outright.
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

        // TWO SIZES, read off the caps: the head is asked for at 2.5 and the tail at 0.75, and
        // an arrow's size is geometry, so the only reading of it is the mesh's own bounding box.
        const spans = scene.graph.scene.meshes
            .filter((mesh) => mesh.name.includes("arrow"))
            .map((mesh) => mesh.getBoundingInfo().boundingBox.extendSizeWorld.length())
            .sort((first, second) => second - first);

        await holds(
            spans.length > 1 && spans[0] > spans[spans.length - 1] * 2,
            `Styles/Edge Bidirectional: the head is asked for at 2.5 and the tail at 1, and the scene ` +
                `draws caps ${spans.map((span) => span.toFixed(3)).join(", ")} across`,
        );

        // AND TWO COLOURS, neither of them the line's. Counted in pixels, because a cap's colour
        // is a shader uniform: it is on neither the mesh nor its name.
        const blue = await pixelsOfColour(scene, "#2563eb");
        const orange = await pixelsOfColour(scene, "#f97316");

        // The floors are far apart because the caps are: a 2.5 head covers roughly six times the
        // canvas a 1.0 tail does, and both are drawn over twenty-nine edges laid out by a
        // physics run, so neither count is stable to better than an order of magnitude. Measured
        // on a 900x700 canvas: about 870 blue and about 120 orange.
        await holds(
            blue > 200 && orange > 30,
            `Styles/Edge Bidirectional: the two ends are asked for in blue and orange and the canvas holds ` +
                `${String(blue)} blue and ${String(orange)} orange pixels`,
        );
    },
    args: {
        setup: storySetup({
            edge: {
                "edge.arrowHead": "normal",
                "edge.arrowHeadSize": 2.5,
                "edge.arrowHeadColor": "#2563EB",
                "edge.arrowTail": "tee",
                "edge.arrowTailSize": 1,
                "edge.arrowTailColor": "#F97316",
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
