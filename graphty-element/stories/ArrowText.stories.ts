// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import {
    assertArrowCaptionsDrawn,
    assertArrowVariety,
    assertGraphLoaded,
    drawn,
    holds,
    pixelsOfColour,
} from "./assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup } from "./helpers";

const meta: Meta = {
    title: "Styles/Edge",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    parameters: {
        chromatic: {
            delay: 500,
        },
    },
    args: {
        setup: storySetup({ node: { "node.color": "#5A67D8" } }),
        nodeData: [
            { id: "A", position: { x: -3, y: 0, z: 0 } },
            { id: "B", position: { x: 3, y: 0, z: 0 } },
        ],
        edgeData: [{ src: "A", dst: "B" }],
        layout: "fixed",
        layoutConfig: {},
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * A caption at each end of an arrowed edge: "start" beside the small blue tail at A, "end"
 * beside the large red head at B.
 *
 * WHAT A CAPTION IS. An edge carries words in three places, and they are three separate things.
 * `edge.label` puts words at the MIDDLE of the line. `edge.arrowHeadText` and
 * `edge.arrowTailText` put words at the two ENDS, hanging from the cap drawn there -- what
 * Graphviz calls a headlabel and a taillabel. Each end has a second channel,
 * `edge.arrowHeadTextStyle` and `edge.arrowTailTextStyle`, carrying the whole of how those words
 * are drawn, in the same vocabulary `node.labelStyle` takes.
 *
 * Two rules are worth knowing before writing one, and both are in the channels' caveat. A
 * caption hangs from a cap, so an end whose arrow is "none" carries none -- an edge's tail has
 * no cap until a layer asks for one. And the WORDS are what switch a caption on, so a layer that
 * sets only the appearance draws nothing, exactly as `node.labelStyle` draws nothing without
 * `node.label`.
 */
export const ArrowText: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge ArrowText");

        await assertGraphLoaded(scene, { nodes: 2, edges: 1 });

        // A caption at each end, with words on it, and a cap at each end to hang one from.
        await assertArrowCaptionsDrawn(scene, ["arrowHead", "arrowTail"]);
        await assertArrowVariety(scene, 1);

        // The two caps are drawn at the two sizes the layer asks for, which is the half of this
        // story's 1.x subject that never lost its channels.
        const spans = scene.graph.scene.meshes
            .filter((mesh) => mesh.name.includes("arrow"))
            .map((mesh) => mesh.getBoundingInfo().boundingBox.extendSizeWorld.length())
            .sort((first, second) => second - first);

        await holds(
            spans.length === 2 && spans[0] > spans[1] * 2,
            `Styles/Edge ArrowText: the head is asked for at 2.5 and the tail at 0.75, and the scene draws ` +
                `caps ${spans.map((span) => span.toFixed(3)).join(", ")} across`,
        );

        const red = await pixelsOfColour(scene, "#ef4444");

        await holds(
            red > 200,
            `Styles/Edge ArrowText: the head is asked for in red and the canvas holds ${String(red)} red pixels`,
        );

        // The two captions are asked for in the two colours their style channels name, which is
        // what proves the appearance travelled and not only the words.
        const painted = scene.arrowCaptions.map((caption) => `${caption.end}:${caption.colours.join("/")}`).sort();

        await holds(
            scene.arrowCaptions.every((caption) => caption.colours.length > 0),
            `Styles/Edge ArrowText: the captions are asked for in their own colours and their canvases hold ` +
                `${painted.join(", ")}`,
        );
    },
    args: {
        setup: storySetup({
            edge: {
                "edge.arrowHead": "normal",
                "edge.arrowHeadSize": 2.5,
                "edge.arrowHeadColor": "#EF4444",
                "edge.arrowHeadText": "end",
                "edge.arrowHeadTextStyle": { sizePx: 28, color: "#B91C1C", background: "#FEE2E2", padding: 8 },
                "edge.arrowTail": "normal",
                "edge.arrowTailSize": 0.75,
                "edge.arrowTailColor": "#2563EB",
                "edge.arrowTailText": "start",
                "edge.arrowTailTextStyle": { sizePx: 28, color: "#1D4ED8", background: "#DBEAFE", padding: 8 },
                "edge.style": "solid",
                "edge.color": "darkgrey",
            },
        }),
    },
};
