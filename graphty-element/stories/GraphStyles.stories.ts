// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import {
    assertBackgroundColour,
    assertDistinctPicture,
    assertDrawnColour,
    assertGraphLoaded,
    assertLayerPainted,
    assertSkyboxDrawn,
    type Drawn,
    drawn,
} from "./assertions";
import {
    eventWaitingDecorator,
    renderFn,
    type StoryArgs,
    storySetup,
    waitForGraphSettled,
    waitForSkyboxLoaded,
} from "./helpers";

const meta: Meta = {
    title: "Styles/Graph",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    argTypes: {
        skybox: { control: "text", table: { category: "Background" }, name: "background.skybox" },
        background: { control: "color", table: { category: "Background" }, name: "background.color" },
    },
    parameters: {
        // controls: {exclude: /^(#|_)/},
        controls: {
            include: ["background.skybox", "background.color"],
        },
        chromatic: {
            delay: 500, // Allow Babylon.js render frames to complete (30 frames at 60fps)
        },
    },
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2.json",
        },
        layout: "ngraph",
        layoutConfig: {
            seed: 42, // Fixed seed for consistent layouts in visual tests
        },
        setup: storySetup({
            preSteps: 8000, // Extra preSteps for more stable physics layouts
        }),
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * Settle the story and read what it drew. Every story here is the cat network: twenty nodes,
 * twenty-nine edges, fetched over the network at render time.
 * @param canvasElement - Where the story was rendered.
 * @param story - How to name it in a failure message.
 * @returns What the story drew.
 */
const settled = async (canvasElement: HTMLElement, story: string): Promise<Drawn> => {
    await waitForGraphSettled(canvasElement);

    const scene = await drawn(canvasElement, `Styles/Graph ${story}`);

    await assertGraphLoaded(scene, { nodes: 20, edges: 29 });

    return scene;
};

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Default");

        // No background of the story's own, so the element's own is what is behind the graph.
        await assertBackgroundColour(scene, "#f5f5f5");
        await assertDistinctPicture(scene, "Styles/Graph");
    },
};

export const Skybox: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/cat-social-network-2-fixed-positions-actual-engine.json",
        },
        layout: "fixed",
        layoutConfig: {
            dim: 3,
        },
        setup: storySetup({
            background: {
                backgroundType: "skybox",
                data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/rolling_hills_equirectangular_skybox.png",
            },
        }),
    },
    parameters: {
        controls: {
            include: ["background.skybox"],
        },
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.3,
        },
    },
    play: async ({ canvasElement }) => {
        // Wait for the skybox to fully load before taking the screenshot
        await waitForSkyboxLoaded(canvasElement);

        const scene = await settled(canvasElement, "Skybox");

        await assertSkyboxDrawn(scene);
        await assertDistinctPicture(scene, "Styles/Graph");
    },
};

export const BackgroundColor: Story = {
    args: {
        setup: storySetup({
            background: { backgroundType: "color", color: "hotpink" },
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: ["background.color"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "BackgroundColor");

        await assertBackgroundColour(scene, "#ff69b4");
        await assertDistinctPicture(scene, "Styles/Graph");
    },
};

/**
 * Three layers, each colouring the nodes one of its own selector matches.
 *
 * SELECTED BY AN ATTRIBUTE, NOT BY A PREFIX OF THE ID. The element's selector language admits no
 * functions at all -- it is a declared subset of JMESPath, refused at its edge rather than
 * narrowed in silence -- so `starts_with(id, 'Mlle')`, which these three layers used to say, is
 * rejected by name with the offset it went wrong at. Equality against a field the data already
 * carries says the same thing and costs one column read per node.
 */
export const Layers: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "Indoor cats are black",
                    target: "node",
                    selector: { match: "expression", where: "data.indoor_outdoor == 'indoor'" },
                    set: { "node.color": "black" },
                },
                {
                    name: "Outdoor cats are yellow",
                    target: "node",
                    selector: { match: "expression", where: "data.indoor_outdoor == 'outdoor'" },
                    set: { "node.color": "yellow" },
                },
                {
                    name: "Strays are red",
                    target: "node",
                    selector: { match: "expression", where: "data.indoor_outdoor == 'stray'" },
                    set: { "node.color": "red" },
                },
            ],
            preSteps: 8000,
        }),
    },
    parameters: {
        controls: {
            include: [],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await settled(canvasElement, "Layers");

        // The cat network carries `indoor_outdoor` on every node: seven indoor, five outdoor,
        // four strays, and four -- a clinic, a human, a kitten and a working cat -- that none of
        // the three layers names and that are deliberately left to the element's own colour.
        await assertLayerPainted(scene, "Indoor cats are black", { nodes: 7 });
        await assertLayerPainted(scene, "Outdoor cats are yellow", { nodes: 5 });
        await assertLayerPainted(scene, "Strays are red", { nodes: 4 });

        const untouched = scene.nodes.filter((node) => node.hex === "#6366f1");

        await assertDrawnColour(
            scene,
            Object.fromEntries(untouched.map((node) => [node.id, "#6366f1"])),
        );
        await assertDistinctPicture(scene, "Styles/Graph");
    },
};
