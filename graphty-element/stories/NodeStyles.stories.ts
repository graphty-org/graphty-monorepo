// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import {
    assertDistinctPicture,
    assertDrawnColour,
    assertDrawnOpacity,
    assertDrawnShape,
    assertGraphLoaded,
    assertLabelsDrawn,
    assertNoLabelsDrawn,
    assertShapeVariety,
    assertWireframes,
    type Drawn,
    drawn,
    holds,
} from "./assertions";
import {
    eventWaitingDecorator,
    nodeShapes,
    renderFn,
    type StoryArgs,
    storySetup,
    waitForGraphSettled,
} from "./helpers";

const meta: Meta = {
    title: "Styles/Node",
    component: "graphty-element",
    // XXX: https://github.com/storybookjs/storybook/issues/23343
    render: renderFn,
    decorators: [eventWaitingDecorator],
    argTypes: {
        nodeColor: { control: "color", table: { category: "Colour" }, name: "node.color" },
        nodeShape: { control: "select", options: nodeShapes, table: { category: "Shape" }, name: "node.shape" },
        nodeSize: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Shape" },
            name: "node.size",
        },
        nodeWireframe: { control: "boolean", table: { category: "Effect" }, name: "node.wireframe" },
        nodeLabel: { control: "text", table: { category: "Label" }, name: "node.label" },
        nodeOpacity: {
            control: { type: "range", min: 0.1, max: 1, step: 0.1 },
            table: { category: "Colour" },
            name: "node.opacity",
        },
    },
    parameters: {
        // controls: {exclude: /^(#|_)/},
        controls: {
            include: ["node.color", "node.shape", "node.size", "node.wireframe", "node.label"],
        },
        chromatic: {
            delay: 500, // Allow Babylon.js render frames to complete (30 frames at 60fps)
        },
    },
    args: {
        setup: storySetup({
            preSteps: 8000, // Extra preSteps for ngraph physics layout
        }),
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        layout: "ngraph",
        layoutConfig: {
            seed: 42, // Fixed seed for consistent layouts in visual tests
        },
    },
};
export default meta;

/**
 * Wait for the story to settle and read what it drew.
 *
 * The cat social network is twenty nodes and twenty-nine edges, and it is fetched over the
 * network at render time, so the count is also the check that the fetch arrived.
 */
const settled = async (canvasElement: HTMLElement, story: string): Promise<Drawn> => {
    await waitForGraphSettled(canvasElement);

    const scene = await drawn(canvasElement, `Styles/Node ${story}`);

    await assertGraphLoaded(scene, { nodes: 20, edges: 29 });

    return scene;
};

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Default");

        // The element's own appearance, with no layer of the story's own: one shape, one size,
        // one colour, and no label anywhere.
        await assertDrawnColour(scene, "#6366f1");
        await assertDrawnShape(scene, Object.fromEntries(scene.nodes.map((node) => [node.id, "icosphere"])));
        await assertNoLabelsDrawn(scene);
        await assertDistinctPicture(scene, "Styles/Node");
    },
};

export const Color: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Color");

        await assertDrawnColour(scene, "#ff0000");
        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        setup: storySetup({
            node: { "node.color": "red" },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.color"],
        },
    },
};

export const Shape: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Shape");

        await assertDrawnShape(scene, Object.fromEntries(scene.nodes.map((node) => [node.id, "box"])));
        await assertShapeVariety(scene, 1);
        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        setup: storySetup({
            node: { "node.shape": "box" },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.shape"],
        },
    },
};

export const Size: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Size");

        // Size is baked into the source mesh rather than written to mesh.scaling, so the reading
        // that says a node got bigger is its drawn bounding box. The element's default icosphere
        // is 0.75 across at size 1, so size 3 is 2.25.
        const wrong = scene.nodes.filter((node) => Math.abs(node.radius - 2.25) > 0.01).map((node) => node.id);

        await holds(
            wrong.length === 0,
            `Styles/Node Size: this story asks for size 3 and ${String(wrong.length)} nodes are drawn at a ` +
                `different size -- first is ${String(scene.nodes[0].radius)}`,
        );

        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        setup: storySetup({ node: { "node.size": 3 }, preSteps: 8000 }),
    },
    parameters: {
        controls: {
            include: ["node.size"],
        },
    },
};

export const Wireframe: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Wireframe");

        await assertWireframes(
            scene,
            scene.nodes.map((node) => node.id),
        );
        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        setup: storySetup({
            node: { "node.wireframe": true },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.wireframe"],
        },
    },
};

/**
 * A label on every node, reading each node's own id.
 *
 * `label: {enabled: true}` used to switch labels on and leave the words to the renderer's
 * default. A layer says what a label SAYS: writing `node.label` is what switches one on, and
 * binding it to a column is how the words come from the data.
 */
export const Label: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Label");

        await assertLabelsDrawn(scene);
        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        setup: storySetup({
            nodeEncode: { "node.label": { by: "data.id", scale: "passthrough" } },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.label"],
        },
    },
};

export const Opacity: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Opacity");

        await assertDrawnColour(scene, "#0000ff");
        await assertDrawnOpacity(scene, Object.fromEntries(scene.nodes.map((node) => [node.id, 0.5])));
        await assertDistinctPicture(scene, "Styles/Node");
    },
    args: {
        setup: storySetup({
            node: { "node.color": "#0000FF", "node.opacity": 0.5 },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["node.color", "node.opacity"],
        },
    },
};
