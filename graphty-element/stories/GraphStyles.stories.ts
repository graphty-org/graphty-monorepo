// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import {
    assertBackgroundColour,
    assertDistinctPicture,
    assertGraphLoaded,
    assertSkyboxDrawn,
    type Drawn,
    drawn,
} from "./assertions";
import { catSocialNetwork2FixedUrl, catSocialNetwork2Url, skyboxUrl } from "./datasets";
import {
    eventWaitingDecorator,
    renderFn,
    type StoryArgs,
    storySetup,
    waitForGraphSettled,
    waitForSkyboxLoaded,
} from "./helpers";
import { captionDecorator, renderFnSource } from "./styling/story-docs";

const DESCRIPTION = `
What the whole graph is drawn against. Set the element's \`background\` property to a color, or to a
skybox: an equirectangular photo wrapped around the scene so the graph floats inside it. Use the
controls to try another color or image URL; the Code panel shows the property.

The graph is a social network of twenty cats. For coloring nodes and edges, see
[Nodes](?path=/docs/styles-node--docs), [Edges](?path=/docs/styles-edge--docs) and
[Layers](?path=/docs/styles-layered--docs).
`;

const meta: Meta = {
    title: "Styling/Graph",
    // The component id this section had before it was retitled, so every story id (and its
    // approved screenshot) stays the same.
    id: "styles-graph",
    tags: ["autodocs"],
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator, captionDecorator],
    argTypes: {
        skybox: { control: "text", table: { category: "Background" }, name: "background.skybox" },
        background: { control: "color", table: { category: "Background" }, name: "background.color" },
    },
    parameters: {
        docs: {
            description: { component: DESCRIPTION },
            source: { transform: renderFnSource, language: "html" },
        },
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
            data: catSocialNetwork2Url,
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
    parameters: { caption: { text: "No background of your own: the element's default light gray." } },
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
            data: catSocialNetwork2FixedUrl,
        },
        layout: "fixed",
        layoutConfig: {
            dim: 3,
        },
        setup: storySetup({
            background: {
                backgroundType: "skybox",
                data: skyboxUrl,
            },
        }),
    },
    parameters: {
        caption: { text: "background: a skybox, a panoramic photo wrapped around the scene. Drag to look around." },
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
    name: "Background color",
    args: {
        setup: storySetup({
            background: { backgroundType: "color", color: "hotpink" },
            preSteps: 8000,
        }),
    },
    parameters: {
        caption: { text: 'background: { backgroundType: "color", color: "hotpink" }.' },
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
