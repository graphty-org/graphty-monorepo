// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { assertArrowCaptionsDrawn, assertArrowVariety, assertGraphLoaded, drawn, holds } from "./assertions";
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
 * Words in all three places an edge carries them: "start label" beside the cap at A, "end label"
 * beside the cap at B, and "edge label" above the middle of the line. All three are 14px black
 * on no background, and both caps are the element's own size in the line's darkgrey.
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

        const caps = scene.graph.scene.meshes.filter((mesh) => mesh.name.includes("arrow")).length;

        await holds(caps === 2, `Styles/Edge ArrowText: both ends carry a cap and the scene draws ${String(caps)}`);

        // The third place: the edge's own label at the middle of the line. It is a plane of the
        // same class as the two captions, so it is what is left once the captions are counted.
        const [edge] = scene.graph.getDataManager().edges.values();
        const middle = scene.edgeLabelPlanes - scene.arrowCaptions.length;

        await holds(
            middle === 1 && edge.label?.labelMesh?.isEnabled() === true,
            `Styles/Edge ArrowText: the edge is asked for a label at its middle and the scene holds ` +
                `${String(middle)} edge label planes beside its ${String(scene.arrowCaptions.length)} captions`,
        );

        // The captions are asked for in black, which is what proves their style channels
        // travelled and not only their words. The background is transparent, so the letters are
        // the only ink and black is the colour most of it is drawn in.
        const painted = scene.arrowCaptions.map((caption) => `${caption.end}:${caption.colours.join("/")}`).sort();
        const black = (hex: string | undefined): boolean =>
            hex !== undefined && [1, 3, 5].every((at) => Number.parseInt(hex.slice(at, at + 2), 16) < 0x30);

        await holds(
            scene.arrowCaptions.every((caption) => black(caption.colours[0])),
            `Styles/Edge ArrowText: the captions are asked for in black and their canvases hold ` +
                `${painted.join(", ")}`,
        );
    },
    args: {
        setup: storySetup({
            edge: {
                "edge.arrowHead": "normal",
                "edge.arrowHeadText": "end label",
                "edge.arrowHeadTextStyle": { sizePx: 14, color: "#000000", background: "transparent", attachOffset: 1 },
                "edge.arrowTail": "normal",
                "edge.arrowTailText": "start label",
                "edge.arrowTailTextStyle": { sizePx: 14, color: "#000000", background: "transparent", attachOffset: 1 },
                "edge.label": "edge label",
                "edge.labelStyle": {
                    sizePx: 14,
                    color: "#000000",
                    background: "transparent",
                    location: "top",
                    attachOffset: 0.5,
                },
                "edge.style": "solid",
                "edge.color": "darkgrey",
            },
        }),
    },
};
