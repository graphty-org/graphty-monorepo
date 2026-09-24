import "../index.ts";
import "../src/layout/index.ts"; // Ensure all layouts are registered
import "../src/data/index.ts"; // Ensure all data sources are registered

import type { Meta, StoryObj } from "@storybook/web-components-vite";
import isChromatic from "chromatic/isChromatic";

import { Graphty } from "../src/graphty-element";
import {
    assertDistinctPicture,
    assertGraphLoaded,
    assertHeavyEdgesShorter,
    assertLayoutPlaced,
    assertNodesOnACircle,
    type Drawn,
    drawn,
    holds,
} from "./assertions";
import { eventWaitingDecorator, renderFn, storySetup, waitForGraphSettled } from "./helpers";

/**
 * Settle a layout story and read where its nodes ended up.
 *
 * WHAT TWENTY LAYOUT STORIES USED TO ASSERT ABOUT POSITION: nothing at all. A layout that placed
 * three of seventy-seven nodes, or stacked every node on the origin, or never ran, rendered a
 * picture and passed. Positions are read off the MESHES rather than out of the element's
 * coordinate array, because a layout that wrote coordinates the renderer never applied is one of
 * the ways this goes wrong.
 * @param canvasElement - Where the story was rendered.
 * @param story - How to name it in a failure message.
 * @param dim - Whether the story promises a flat picture.
 * @returns What the story drew.
 */
const placed = async (canvasElement: HTMLElement, story: string, dim: 2 | 3 = 3): Promise<Drawn> => {
    await waitForGraphSettled(canvasElement);

    const scene = await drawn(canvasElement, story);

    // data3.json, which every story in this file loads over the network at render time.
    await assertGraphLoaded(scene, { nodes: 77, edges: 254 });
    await assertLayoutPlaced(scene, { dim });

    return scene;
};

const meta: Meta = {
    title: "Layout/3D",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    argTypes: {
        // D3 layout controls
        d3AlphaMin: {
            control: { type: "range", min: 0.001, max: 0.5, step: 0.001 },
            table: { category: "D3 Layout" },
            name: "layoutConfig.alphaMin",
        },
        d3AlphaTarget: {
            control: { type: "range", min: 0, max: 1, step: 0.01 },
            table: { category: "D3 Layout" },
            name: "layoutConfig.alphaTarget",
        },
        d3AlphaDecay: {
            control: { type: "range", min: 0.001, max: 0.1, step: 0.001 },
            table: { category: "D3 Layout" },
            name: "layoutConfig.alphaDecay",
        },
        d3VelocityDecay: {
            control: { type: "range", min: 0.1, max: 0.9, step: 0.1 },
            table: { category: "D3 Layout" },
            name: "layoutConfig.velocityDecay",
        },

        // Spring layout controls
        springK: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Spring Layout" },
            name: "layoutConfig.k",
        },
        springIterations: {
            control: { type: "range", min: 10, max: 200, step: 10 },
            table: { category: "Spring Layout" },
            name: "layoutConfig.iterations",
        },
        springScale: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Spring Layout" },
            name: "layoutConfig.scale",
        },
        springSeed: {
            control: { type: "number" },
            table: { category: "Spring Layout" },
            name: "layoutConfig.seed",
        },

        // Random layout controls
        randomSeed: {
            control: { type: "number" },
            table: { category: "Random Layout" },
            name: "layoutConfig.seed",
        },

        // Kamada-Kawai layout controls
        kamadaScale: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Kamada-Kawai Layout" },
            name: "layoutConfig.scale",
        },
        kamadaWeighted: {
            control: { type: "boolean" },
            table: { category: "Kamada-Kawai Layout" },
            name: "layoutConfig.weighted",
        },

        // Circular layout controls
        circularScale: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Circular Layout" },
            name: "layoutConfig.scale",
        },

        // ForceAtlas2 layout controls
        fa2MaxIter: {
            control: { type: "range", min: 10, max: 1000, step: 10 },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.maxIter",
        },
        fa2JitterTolerance: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.jitterTolerance",
        },
        fa2ScalingRatio: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.scalingRatio",
        },
        fa2Gravity: {
            control: { type: "range", min: 0, max: 10, step: 0.1 },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.gravity",
        },
        fa2DistributedAction: {
            control: { type: "boolean" },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.distributedAction",
        },
        fa2StrongGravity: {
            control: { type: "boolean" },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.strongGravity",
        },
        fa2DissuadeHubs: {
            control: { type: "boolean" },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.dissuadeHubs",
        },
        fa2Linlog: {
            control: { type: "boolean" },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.linlog",
        },
        fa2Weighted: {
            control: { type: "boolean" },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.weighted",
        },
        fa2Seed: {
            control: { type: "number" },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.seed",
        },

        // NGraph layout controls
        ngraphSeed: {
            control: { type: "number" },
            table: { category: "NGraph Layout" },
            name: "layoutConfig.seed",
        },
        ngraphSpringLength: {
            control: { type: "range", min: 10, max: 100, step: 5 },
            table: { category: "NGraph Layout" },
            name: "layoutConfig.springLength",
        },
        ngraphSpringCoefficient: {
            control: { type: "range", min: 0.0001, max: 0.01, step: 0.0001 },
            table: { category: "NGraph Layout" },
            name: "layoutConfig.springCoefficient",
        },
        ngraphGravity: {
            control: { type: "range", min: -10, max: 10, step: 0.1 },
            table: { category: "NGraph Layout" },
            name: "layoutConfig.gravity",
        },
        ngraphTheta: {
            control: { type: "range", min: 0.1, max: 1, step: 0.1 },
            table: { category: "NGraph Layout" },
            name: "layoutConfig.theta",
        },
        ngraphDragCoefficient: {
            control: { type: "range", min: 0.001, max: 0.1, step: 0.001 },
            table: { category: "NGraph Layout" },
            name: "layoutConfig.dragCoefficient",
        },
        ngraphTimeStep: {
            control: { type: "range", min: 1, max: 50, step: 1 },
            table: { category: "NGraph Layout" },
            name: "layoutConfig.timeStep",
        },
    },
    parameters: {
        controls: { exclude: /^(#|_)/ },
        chromatic: {
            // Using event-based waiting via play function instead of delay
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.3, // Reduced threshold since we wait for actual settling
        },
    },
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/data3.json",
        },
    },
};
export default meta;

type Story = StoryObj<Graphty & Record<string, unknown>>;

export const ngraph: Story = {
    args: {
        layout: "ngraph",
        layoutConfig: {
            seed: 42, // Fixed seed for consistent layouts in visual tests (same as other working ngraph stories)
        },
        setup: storySetup({
            viewMode: "3d",
            // Physics-based layouts need preSteps for visual stability
            // Use constant value like other working ngraph stories (NodeStyles, GraphStyles)
            preSteps: 8000,
        }),
        // Individual parameter args for controls
        ngraphSeed: 42,
        // ngraphSpringLength: 30,
        // ngraphSpringCoefficient: 0.0008,
        // ngraphGravity: -1.2,
        // ngraphTheta: 0.8,
        // ngraphDragCoefficient: 0.02,
        // ngraphTimeStep: 20,
    },
    parameters: {
        controls: {
            include: [
                "layoutConfig.seed",
                "layoutConfig.springLength",
                "layoutConfig.springCoefficient",
                "layoutConfig.gravity",
                "layoutConfig.theta",
                "layoutConfig.dragCoefficient",
                "layoutConfig.timeStep",
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Layout/3D ngraph");

        await assertDistinctPicture(scene, "Layout/3D");
    },
};

export const D3: Story = {
    args: {
        setup: storySetup({
            viewMode: "3d",
            // D3 physics-based layout needs preSteps for Chromatic
            preSteps: isChromatic() ? 15000 : 200,
        }),
        layout: "d3",
        layoutConfig: {
            alphaMin: 0.1,
            alphaTarget: 0,
            alphaDecay: 0.0228,
            velocityDecay: 0.4,
        },
        d3AlphaMin: 0.1,
        d3AlphaTarget: 0,
        d3AlphaDecay: 0.0228,
        d3VelocityDecay: 0.4,
    },
    parameters: {
        controls: {
            include: [
                "layoutConfig.alphaMin",
                "layoutConfig.alphaTarget",
                "layoutConfig.alphaDecay",
                "layoutConfig.velocityDecay",
            ],
        },
        chromatic: {
            diffIncludeAntiAliasing: true,
            diffThreshold: 0.8, // Increased tolerance for D3 physics-based layout
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Layout/3D D3");

        await assertDistinctPicture(scene, "Layout/3D");
    },
};

export const Circular: Story = {
    args: {
        dataSource: "json", // Add data source
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/data3.json",
        },
        setup: storySetup({ viewMode: "3d" }),
        layout: "circular",
        layoutConfig: {
            dim: 3,
            scale: 1,
        },
        circularScale: 1,
    },
    parameters: {
        controls: {
            include: ["layoutConfig.scale"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Layout/3D Circular");

        await assertNodesOnACircle(scene);
        await assertDistinctPicture(scene, "Layout/3D");
    },
};

export const Random: Story = {
    args: {
        setup: storySetup({ viewMode: "3d" }),
        layout: "random",
        layoutConfig: { dim: 3 },
        randomSeed: 12,
    },
    parameters: {
        controls: {
            include: ["layoutConfig.seed"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Layout/3D Random");

        await assertDistinctPicture(scene, "Layout/3D");
    },
};

export const Spring: Story = {
    args: {
        /*
         * `preSteps` MATCHES `springIterations` BELOW, because Spring is a live simulation and
         * this story asks it for 50 iterations. A simulation computes one iteration per RENDERED
         * frame by default, so without this the iterations below are frames, and how long the
         * arrangement takes to arrive is a question about the browser's frame rate rather than
         * about the graph. `preSteps` runs them before the first frame is drawn, off the frame
         * clock entirely, and the picture is the same either way: Fruchterman-Reingold is
         * deterministic under `seed` and stops at `iterations` whichever clock ran it.
         */
        setup: storySetup({ viewMode: "3d", preSteps: 50 }),
        layout: "spring",
        layoutConfig: { dim: 3 },
        springK: 1,
        springIterations: 50,
        springScale: 1,
        springSeed: 12,
    },
    parameters: {
        controls: {
            include: ["layoutConfig.k", "layoutConfig.iterations", "layoutConfig.scale", "layoutConfig.seed"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Layout/3D Spring");

        await assertDistinctPicture(scene, "Layout/3D");
    },
};

/**
 * Kamada-Kawai ignoring edge weights: every edge is one hop. The layout weighs edges by default,
 * so this story turns it off; KamadaKawaiWeighted shows the weighted picture.
 */
export const KamadaKawai: Story = {
    args: {
        dataSource: "json", // Add data source
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/data3.json",
        },
        setup: storySetup({ viewMode: "3d" }),
        layout: "kamada-kawai",
        layoutConfig: {
            dim: 3,
            scale: 1,
            weighted: false,
        },
        kamadaScale: 1,
        kamadaWeighted: false,
    },
    parameters: {
        controls: {
            include: ["layoutConfig.scale", "layoutConfig.weighted"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Layout/3D KamadaKawai");

        await assertDistinctPicture(scene, "Layout/3D");
    },
};

/**
 * ForceAtlas2 ignoring edge weights: every edge pulls equally hard. The layout weighs edges by
 * default, so this story turns it off; ForceAtlas2Weighted shows the weighted picture.
 */
export const ForceAtlas2: Story = {
    args: {
        dataSource: "json", // Add data source
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/data3.json",
        },
        /*
         * `preSteps` MATCHES `maxIter` BELOW, because ForceAtlas2 is a live simulation and this
         * story asks it for 500 iterations. A simulation computes `behavior.layout.stepMultiplier`
         * iterations per RENDERED frame -- one, by default -- so without this the 500 iterations
         * below are 500 frames, and how long that takes is a question about the display rather
         * than about the graph: measured at 33 frames a second in the Storybook test browser, the
         * arrangement needs 15.1 seconds, and the wait for a final frame gives up at 15. `preSteps`
         * is the element's own answer, and it runs those iterations before the first frame is
         * drawn, off the frame clock entirely. The picture is the same either way -- ForceAtlas2 is
         * deterministic under `seed` and the simulation stops at `maxIter` whichever clock ran it --
         * so this is the arrangement the story always asserted, reached the way Chromatic already
         * reached it. ForceAtlas2Weighted spreads these args and inherits it.
         */
        setup: storySetup({ viewMode: "3d", preSteps: 500 }),
        layout: "forceatlas2",
        layoutConfig: {
            dim: 3,
            maxIter: 500,
            jitterTolerance: 1.0,
            scalingRatio: 2.0,
            gravity: 1.0,
            distributedAction: false,
            strongGravity: false,
            dissuadeHubs: false,
            linlog: false,
            weighted: false,
            seed: 42,
        },
        // Individual parameter args for controls
        fa2MaxIter: 500,
        fa2JitterTolerance: 1.0,
        fa2ScalingRatio: 2.0,
        fa2Gravity: 1.0,
        fa2DistributedAction: false,
        fa2StrongGravity: false,
        fa2DissuadeHubs: false,
        fa2Linlog: false,
        fa2Weighted: false,
        fa2Seed: 42,
    },
    parameters: {
        controls: {
            include: [
                "layoutConfig.maxIter",
                "layoutConfig.jitterTolerance",
                "layoutConfig.scalingRatio",
                "layoutConfig.gravity",
                "layoutConfig.distributedAction",
                "layoutConfig.strongGravity",
                "layoutConfig.dissuadeHubs",
                "layoutConfig.linlog",
                "layoutConfig.weighted",
                "layoutConfig.seed",
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Layout/3D ForceAtlas2");

        await assertDistinctPicture(scene, "Layout/3D");
    },
};

/**
 * Kamada-Kawai laid out by the dataset's edge weights.
 *
 * Kamada-Kawai places every pair of nodes at their shortest-path distance. Weighted, an edge's
 * length in that distance is `1 / weight`, so a heavy edge counts as a short hop and draws
 * shorter than a light one. The weight is the `value` column of the Les Miserables data (how
 * many scenes two characters share). `weighted` is the layout's default; it is named here so the
 * story shows the switch a consumer turns, next to the unweighted KamadaKawai story above.
 */
export const KamadaKawaiWeighted: Story = {
    args: {
        ...KamadaKawai.args,
        layoutConfig: { dim: 3, scale: 1, weighted: true },
        kamadaWeighted: true,
    },
    parameters: KamadaKawai.parameters,
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Layout/3D KamadaKawaiWeighted");

        await assertHeavyEdgesShorter(scene, "value");
        await assertDistinctPicture(scene, "Layout/3D");
    },
};

/**
 * ForceAtlas2 laid out by the dataset's edge weights.
 *
 * Weighted, the spring pulling an edge's two ends together is multiplied by the edge's weight,
 * so heavily weighted pairs are drawn closer together than lightly weighted ones. The weight is
 * the `value` column of the Les Miserables data (how many scenes two characters share).
 * `weighted` is the layout's default; it is named here so the story shows the switch a consumer
 * turns, next to the unweighted ForceAtlas2 story above.
 */
export const ForceAtlas2Weighted: Story = {
    args: {
        ...ForceAtlas2.args,
        layoutConfig: { ...(ForceAtlas2.args?.layoutConfig as Record<string, unknown>), weighted: true },
        fa2Weighted: true,
    },
    parameters: ForceAtlas2.parameters,
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Layout/3D ForceAtlas2Weighted");

        await assertHeavyEdgesShorter(scene, "value");
        await assertDistinctPicture(scene, "Layout/3D");
    },
};

export const Fixed: Story = {
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/data3-fixed-positions.json",
        },
        layout: "fixed",
        layoutConfig: {
            dim: 3,
        },
        setup: storySetup({
            viewMode: "3d",
            preSteps: 0, // Fixed layout doesn't need preSteps since positions are pre-calculated
        }),
    },
    parameters: {
        controls: {
            include: [], // No controls for fixed layout
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Layout/3D Fixed");

        // The coordinates come out of the file rather than out of a layout, so the element must
        // report every one of them as having arrived with the data. That is the reading that
        // separates "the file placed these nodes" from "a layout placed them one frame later".
        await holds(
            scene.session.seededNodeCount === scene.nodeCount,
            `Layout/3D Fixed: the file carries a position for every node and the element reports ` +
                `${String(scene.session.seededNodeCount)} of ${String(scene.nodeCount)} arrived with one`,
        );

        await assertDistinctPicture(scene, "Layout/3D");
    },
};
