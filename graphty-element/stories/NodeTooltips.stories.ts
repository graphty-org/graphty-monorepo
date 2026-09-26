/**
 * The words a node shows when the pointer rests on it.
 *
 * `node.tooltip` has been published as a paintable channel and documented as "the words to show
 * on hover" since before there were channels, and until now nothing drew one: the painter
 * resolved the words, `styles.explain()` reported them, and no frame ever carried them. These
 * stories are the first picture of the capability.
 *
 * A tooltip is HOVER-ONLY, which is the whole difference between it and a label. So each story
 * moves the pointer onto a node in its play function -- and a reader opening the story can do the
 * same with a mouse.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { LayerSpec } from "../src/catalog/types";
// Importing the module is what defines the <graphty-element> custom element, so this line is
// load-bearing even though only the type is named.
import { type Graphty } from "../src/graphty-element";
import { assertGraphLoaded, type Drawn, drawn, holds } from "./assertions";
import { eventWaitingDecorator, setLayoutPreSteps, waitForGraphSettled } from "./helpers";

/** Four cities, each with something worth saying about it. */
const NODES = [
    { id: "london", note: "London -- 8.9m people" },
    { id: "paris", note: "Paris -- 2.1m people" },
    { id: "berlin", note: "Berlin -- 3.7m people" },
    { id: "madrid", note: "Madrid -- 3.3m people" },
];

/** The routes between them. */
const EDGES = [
    { src: "london", dst: "paris" },
    { src: "paris", dst: "berlin" },
    { src: "paris", dst: "madrid" },
];

/** The node each story hovers. */
const HOVERED = "paris";

/** How long to leave for the tooltip to be built and drawn. */
const SETTLE_MS = 400;

/**
 * How wide a tooltip drawn at the element's defaults is, in world units, plus a margin.
 *
 * Measured on this fixture: the default block draws "Paris -- 2.1m people" about 2.4 units
 * across, and the 64-pixel type `InItsOwnColours` asks for draws it about twice that. The number
 * is a floor a default cannot reach rather than a pixel count to match, so it survives a font
 * the browser substitutes.
 */
const BIG_TOOLTIP_WIDTH = 4;

/** What a story's args carry. */
interface TooltipArgs {
    /** The layers this story adds, beyond the element's own. */
    layers?: readonly LayerSpec[];
}

/**
 * Build the element for one of these stories.
 * @param args - What the story asked for.
 * @returns The element.
 */
function render(args: TooltipArgs): Element {
    const element = document.createElement("graphty-element") as Graphty;

    setLayoutPreSteps(element, 2000);

    for (const layer of args.layers ?? []) {
        void element.session.styles.add(layer);
    }

    element.nodeData = NODES;
    element.edgeData = EDGES;
    element.layout = "ngraph";
    element.layoutConfig = { seed: 42 };

    return element;
}

const meta: Meta = {
    title: "Styles/Node Tooltip",
    component: "graphty-element",
    render: render as Meta["render"],
    decorators: [eventWaitingDecorator],
    parameters: {
        chromatic: { delay: 800 },
    },
    args: {
        layers: [
            {
                name: "a tooltip on every node",
                selector: { match: "everything" },
                encode: { "node.tooltip": { by: "data.note", scale: "passthrough" } },
            },
        ],
    },
};
export default meta;

type Story = StoryObj<TooltipArgs>;

/**
 * Settle the story and read back what it drew.
 * @param canvasElement - Where the story rendered.
 * @param story - The story's name, for the failure message.
 * @returns The scene.
 */
async function settled(canvasElement: HTMLElement, story: string): Promise<Drawn> {
    await waitForGraphSettled(canvasElement);

    const scene = await drawn(canvasElement, `Styles/Node Tooltip ${story}`);
    await assertGraphLoaded(scene, { nodes: 4, edges: 3 });

    return scene;
}

/**
 * Move the real pointer onto a node and let the scene react.
 *
 * `button: -1` is not decoration. A real pointermove carries no button; a `PointerEvent` built by
 * hand defaults to 0, which is the LEFT button, and Babylon's input manager reads that as a
 * press. A hand-built move therefore starts a drag, and a node being dragged stops reporting
 * hover -- so without this the pointer arrives and nothing happens.
 * @param scene - The scene to point at.
 * @param id - The node to hover.
 */
async function hover(scene: Drawn, id: string): Promise<void> {
    const { graph } = scene;
    const node = graph.getNode(id);

    await holds(node !== undefined, `${scene.story}: the fixture has no node called "${id}"`);

    const camera = graph.scene.activeCamera;

    await holds(camera !== null, `${scene.story}: the graph has rendered but has no active camera`);

    const at = Vector3.Project(
        (node as NonNullable<typeof node>).mesh.absolutePosition,
        Matrix.Identity(),
        graph.scene.getTransformMatrix(),
        (camera as NonNullable<typeof camera>).viewport.toGlobal(
            graph.engine.getRenderWidth(),
            graph.engine.getRenderHeight(),
        ),
    );

    const box = graph.canvas.getBoundingClientRect();

    graph.canvas.dispatchEvent(
        new PointerEvent("pointermove", {
            clientX: box.left + Math.round(at.x),
            clientY: box.top + Math.round(at.y),
            bubbles: true,
            pointerId: 1,
            pointerType: "mouse",
            button: -1,
        }),
    );

    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
}

/**
 * Assert what the hovered node's tooltip is drawing.
 * @param scene - The scene to read.
 * @param id - The node that should have one.
 * @param words - What it should say.
 */
async function assertTooltip(scene: Drawn, id: string, words: string): Promise<void> {
    const node = scene.graph.getNode(id);
    const mesh = node?.tooltip?.labelMesh;

    await holds(
        mesh !== undefined && mesh !== null && !mesh.isDisposed(),
        `${scene.story}: the pointer is over "${id}" and no tooltip is drawn`,
    );
    await holds(
        node?.tooltipText === words,
        `${scene.story}: the tooltip says "${String(node?.tooltipText)}", not "${words}"`,
    );
}

/** No tooltip until the pointer arrives, and one as soon as it does. */
export const OnHover: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "OnHover");
        const node = scene.graph.getNode(HOVERED);

        await holds(
            node?.tooltip === undefined,
            "Styles/Node Tooltip OnHover: a tooltip was drawn before anything was hovered",
        );

        await hover(scene, HOVERED);
        await assertTooltip(scene, HOVERED, "Paris -- 2.1m people");
    },
};

/** The pointer leaves, and the words go with it. */
export const GoneWhenThePointerLeaves: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "GoneWhenThePointerLeaves");

        await hover(scene, HOVERED);
        await assertTooltip(scene, HOVERED, "Paris -- 2.1m people");

        const box = scene.graph.canvas.getBoundingClientRect();
        scene.graph.canvas.dispatchEvent(
            new PointerEvent("pointermove", {
                clientX: box.left + 2,
                clientY: box.top + 2,
                bubbles: true,
                pointerId: 1,
                pointerType: "mouse",
                button: -1,
            }),
        );
        await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

        await holds(
            scene.graph.getNode(HOVERED)?.tooltip === undefined,
            "Styles/Node Tooltip GoneWhenThePointerLeaves: the pointer left and the tooltip stayed",
        );
    },
};

/** A tooltip on one node only, because a layer's selector says so. */
export const OnOneNodeOnly: Story = {
    args: {
        layers: [
            {
                name: "one node's tooltip",
                selector: { match: "ids", nodes: ["london"] },
                set: { "node.tooltip": "the only one with a tooltip" },
            },
        ],
    },
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "OnOneNodeOnly");

        await hover(scene, HOVERED);
        await holds(
            scene.graph.getNode(HOVERED)?.tooltip === undefined,
            "Styles/Node Tooltip OnOneNodeOnly: a node the layer did not name drew a tooltip",
        );

        // Last, so the snapshot taken when play ends shows the one tooltip this story is about.
        await hover(scene, "london");
        await assertTooltip(scene, "london", "the only one with a tooltip");
    },
};

/**
 * The same tooltip, in the reader's own colours rather than the element's.
 *
 * `node.tooltip` carries the WORDS and `node.tooltipStyle` carries the look, on exactly the terms
 * `node.labelStyle` sits beside `node.label`. Until 2.0 only the first of those existed: the
 * renderer read the whole rich-text block behind a tooltip -- the typeface, the panel, the
 * colours, the margins -- and a consumer had no way to write any of it, so every tooltip in every
 * graph was drawn in the element's defaults.
 *
 * Writing the look alone asks for nothing: the words are what switch a tooltip on.
 */
export const InItsOwnColours: Story = {
    args: {
        layers: [
            {
                name: "a tooltip on every node",
                selector: { match: "everything" },
                encode: { "node.tooltip": { by: "data.note", scale: "passthrough" } },
            },
            {
                name: "in the reader's own colours",
                selector: { match: "everything" },
                set: {
                    "node.tooltipStyle": {
                        font: "Georgia",
                        sizePx: 64,
                        color: "#FFFFFF",
                        background: "#10B981",
                        cornerRadius: 24,
                        borderWidth: 4,
                        borderColor: "#064E3B",
                    },
                },
            },
        ],
    },
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "InItsOwnColours");

        await hover(scene, HOVERED);
        await assertTooltip(scene, HOVERED, "Paris -- 2.1m people");

        // The picture is the point of the story, and the picture is what a default looks exactly
        // like: a tooltip built from the element's own block and one built from this layer both
        // produce a mesh. So the assertion is the SIZE of the plane the words are drawn on, which
        // 64-pixel type moves and a default cannot reach.
        const mesh = scene.graph.getNode(HOVERED)?.tooltip?.labelMesh;

        await holds(
            mesh !== undefined && mesh !== null,
            "Styles/Node Tooltip InItsOwnColours: the pointer is over the node and no tooltip is drawn",
        );

        const plane = mesh as NonNullable<typeof mesh>;
        plane.computeWorldMatrix(true);
        const width = plane.getBoundingInfo().boundingBox.extendSizeWorld.x * 2;

        await holds(
            width > BIG_TOOLTIP_WIDTH,
            `Styles/Node Tooltip InItsOwnColours: the tooltip is ${width.toFixed(2)} wide, which ` +
                "is the size the element's defaults draw. The type size this layer asked for " +
                "never reached the canvas the tooltip is drawn on.",
        );
    },
};
