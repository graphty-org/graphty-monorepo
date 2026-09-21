import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { Graphty } from "../src/graphty-element";
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

// Common play function for all stories
const waitForSettle = async ({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> => {
    await waitForGraphSettled(canvasElement);
};

export const Default: Story = {
    play: waitForSettle,
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
        await waitForGraphSettled(canvasElement);
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
    play: waitForSettle,
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
    play: waitForSettle,
};
