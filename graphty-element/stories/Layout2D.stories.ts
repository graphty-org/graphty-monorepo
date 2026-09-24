import "../index.ts";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { Graphty } from "../src/graphty-element";
import {
    assertDistinctPicture,
    assertGraphLoaded,
    assertHeavyEdgesShorter,
    assertLayoutPlaced,
    assertNodeBands,
    assertNodesOnACircle,
    assertViewMode,
    type Drawn,
    drawn,
} from "./assertions";
import { eventWaitingDecorator, renderFn, storySetup, waitForGraphSettled } from "./helpers";

/**
 * Settle a 2D layout story and read where its nodes ended up.
 *
 * TWO THINGS EVERY ONE OF THESE TWELVE PROMISES AND NONE OF THEM ASSERTED. That all of its nodes
 * are placed somewhere real and no two are stacked on one another -- a layout that never ran
 * draws a picture and used to pass -- and that the picture is FLAT, which is the whole of what
 * makes it a 2D layout rather than a 3D one.
 * @param canvasElement - Where the story was rendered.
 * @param story - How to name it in a failure message.
 * @param counts - What the story's own data declares.
 * @returns What the story drew.
 */
const placed = async (
    canvasElement: HTMLElement,
    story: string,
    counts: { nodes: number; edges: number } = { nodes: 77, edges: 254 },
): Promise<Drawn> => {
    await waitForGraphSettled(canvasElement);

    const scene = await drawn(canvasElement, `Layout/2D ${story}`);

    await assertGraphLoaded(scene, counts);
    await assertLayoutPlaced(scene, { dim: 2 });
    await assertViewMode(scene, "2d");

    return scene;
};

const meta: Meta = {
    title: "Layout/2D",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    argTypes: {
        // Spring layout controls
        springK: { control: { type: "number" }, table: { category: "Spring Layout" }, name: "layoutConfig.k" },
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

        // Circular layout controls
        circularScale: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Circular Layout" },
            name: "layoutConfig.scale",
        },

        // Shell layout controls
        shellScale: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Shell Layout" },
            name: "layoutConfig.scale",
        },

        // Random layout controls
        randomSeed: {
            control: { type: "number" },
            table: { category: "Random Layout" },
            name: "layoutConfig.seed",
        },

        // Spiral layout controls
        spiralScale: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Spiral Layout" },
            name: "layoutConfig.scale",
        },
        spiralResolution: {
            control: { type: "range", min: 0.1, max: 1, step: 0.05 },
            table: { category: "Spiral Layout" },
            name: "layoutConfig.resolution",
        },
        spiralEquidistant: {
            control: { type: "boolean" },
            table: { category: "Spiral Layout" },
            name: "layoutConfig.equidistant",
        },

        // Planar layout controls
        planarScale: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Planar Layout" },
            name: "layoutConfig.scale",
        },

        // Kamada-Kawai layout controls
        kamadaScale: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Kamada-Kawai Layout" },
            name: "layoutConfig.scale",
        },

        // ForceAtlas2 layout controls
        fa2MaxIter: {
            control: { type: "range", min: 10, max: 500, step: 10 },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.maxIter",
        },
        fa2ScalingRatio: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.scalingRatio",
        },
        fa2Gravity: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.gravity",
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
        fa2LinLog: {
            control: { type: "boolean" },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.linlog",
        },
        fa2Seed: {
            control: { type: "number" },
            table: { category: "ForceAtlas2 Layout" },
            name: "layoutConfig.seed",
        },

        // Arf layout controls
        arfScaling: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Arf Layout" },
            name: "layoutConfig.scaling",
        },
        arfMaxIter: {
            control: { type: "range", min: 100, max: 5000, step: 100 },
            table: { category: "Arf Layout" },
            name: "layoutConfig.maxIter",
        },
        arfSeed: { control: { type: "number" }, table: { category: "Arf Layout" }, name: "layoutConfig.seed" },

        // Bfs layout controls
        bfsAlign: {
            control: { type: "select", options: ["vertical", "horizontal"] },
            table: { category: "Bfs Layout" },
            name: "layoutConfig.align",
        },
        bfsScale: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Bfs Layout" },
            name: "layoutConfig.scale",
        },

        // Bipartite layout controls
        bipartiteAlign: {
            control: { type: "select", options: ["vertical", "horizontal"] },
            table: { category: "Bipartite Layout" },
            name: "layoutConfig.align",
        },
        bipartiteScale: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Bipartite Layout" },
            name: "layoutConfig.scale",
        },
        bipartiteAspectRatio: {
            control: { type: "range", min: 0.5, max: 2, step: 0.1 },
            table: { category: "Bipartite Layout" },
            name: "layoutConfig.aspectRatio",
        },

        // Multipartite layout controls
        multipartiteAlign: {
            control: { type: "select", options: ["vertical", "horizontal"] },
            table: { category: "Multipartite Layout" },
            name: "layoutConfig.align",
        },
        multipartiteScale: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Multipartite Layout" },
            name: "layoutConfig.scale",
        },
    },
    parameters: {
        controls: { exclude: /^(#|_)/ },
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

export const Spiral: Story = {
    args: {
        setup: storySetup({ viewMode: "2d" }),
        layout: "spiral",
        spiralScale: 1,
        spiralResolution: 0.35,
        spiralEquidistant: true,
    },
    parameters: {
        controls: {
            include: ["layoutConfig.scale", "layoutConfig.resolution", "layoutConfig.equidistant"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Spiral");

        await assertDistinctPicture(scene, "Layout/2D");
    },
};

export const Circular: Story = {
    args: {
        setup: storySetup({ viewMode: "2d" }),
        layout: "circular",
        layoutConfig: { dim: 2 },
        circularScale: 1,
    },
    parameters: {
        controls: {
            include: ["layoutConfig.scale"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Circular");

        await assertNodesOnACircle(scene);
        await assertDistinctPicture(scene, "Layout/2D");
    },
};

export const Shell: Story = {
    args: {
        setup: storySetup({ viewMode: "2d" }),
        layout: "shell",
        layoutConfig: {
            nlist: [
                [0], // Core - 1 node at center
                [1, 2, 3, 4, 5], // Frameworks - 5 nodes
                [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], // Tools - 15 nodes
                [
                    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45,
                    46, 47, 48, 49, 50,
                ], // Applications - 30 nodes
                [
                    51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75,
                    76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
                    101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119,
                ], // Services - 69 nodes
            ],
            scale: 3,
        },
        shellScale: 1,
        dataSource: "json",
        dataSourceConfig: {
            data: "https://raw.githubusercontent.com/graphty-org/graphty-element/refs/heads/master/test/helpers/data5.json",
        },
    },
    parameters: {
        controls: {
            include: ["layoutConfig.scale", "layoutConfig.nlist"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Shell", { nodes: 120, edges: 151 });

        // Five shells, named in the story's own nlist: one node at the centre, then 5, 15, 30 and
        // 69 around it. Five shells is five distinct distances from the centre.
        const centre = scene.nodes
            .reduce((sum, node) => [sum[0] + node.position[0], sum[1] + node.position[1]], [0, 0])
            .map((total) => total / scene.nodes.length);
        const radii = scene.nodes
            .map((node) => Math.hypot(node.position[0] - centre[0], node.position[1] - centre[1]))
            .sort((left, right) => left - right);
        let shells = 1;

        for (let index = 1; index < radii.length; index++) {
            if (radii[index] - radii[index - 1] > 0.5) {
                shells++;
            }
        }

        await assertNodeBands(scene, 2, 1);
        await assertDistinctPicture(scene, "Layout/2D", `shells=${String(shells)}`);
    },
};

export const Random: Story = {
    args: {
        setup: storySetup({ viewMode: "2d" }),
        layout: "random",
        layoutConfig: { dim: 2 },
        randomSeed: 12,
    },
    parameters: {
        controls: {
            include: ["layoutConfig.seed"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Random");

        await assertDistinctPicture(scene, "Layout/2D");
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
        setup: storySetup({ viewMode: "2d", preSteps: 50 }),
        layout: "spring",
        layoutConfig: { dim: 2 },
        springK: null,
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
        const scene = await placed(canvasElement, "Spring");

        await assertDistinctPicture(scene, "Layout/2D");
    },
};

export const Planar: Story = {
    args: {
        dataSource: undefined,
        nodeData: [
            { id: 0 },
            { id: 1 },
            { id: 2 },
            { id: 3 },
            { id: 4 },
            { id: 5 },
            { id: 6 },
            { id: 7 },
            { id: 8 },
            { id: 9 },
        ],
        edgeData: [
            { src: 0, dst: 1 },
            { src: 1, dst: 2 },
            { src: 2, dst: 0 },
            { src: 3, dst: 2 },
            { src: 3, dst: 1 },
            { src: 3, dst: 0 },
            { src: 4, dst: 3 },
            { src: 4, dst: 2 },
            { src: 4, dst: 1 },
            { src: 5, dst: 4 },
            { src: 5, dst: 3 },
            { src: 5, dst: 2 },
            { src: 6, dst: 5 },
            { src: 6, dst: 4 },
            { src: 6, dst: 3 },
            { src: 7, dst: 6 },
            { src: 7, dst: 5 },
            { src: 7, dst: 4 },
            { src: 8, dst: 7 },
            { src: 8, dst: 6 },
            { src: 8, dst: 5 },
            { src: 9, dst: 8 },
            { src: 9, dst: 7 },
            { src: 9, dst: 6 },
        ],
        setup: storySetup({ viewMode: "2d" }),
        layout: "planar",
        layoutConfig: { seed: 42 },
        planarScale: 1,
    },
    parameters: {
        controls: {
            include: ["layoutConfig.scale"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Planar", { nodes: 10, edges: 24 });

        await assertDistinctPicture(scene, "Layout/2D");
    },
};

/**
 * Kamada-Kawai ignoring edge weights: every edge is one hop. The layout weighs edges by default,
 * so this story turns it off; KamadaKawaiWeighted shows the weighted picture.
 */
export const KamadaKawai: Story = {
    args: {
        setup: storySetup({ viewMode: "2d" }),
        layout: "kamada-kawai",
        layoutConfig: { dim: 2, weighted: false },
        kamadaScale: 1,
    },
    parameters: {
        controls: {
            include: ["layoutConfig.scale"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "KamadaKawai");

        await assertDistinctPicture(scene, "Layout/2D");
    },
};

/**
 * ForceAtlas2 ignoring edge weights: every edge pulls equally hard. The layout weighs edges by
 * default, so this story turns it off; ForceAtlas2Weighted shows the weighted picture.
 */
export const ForceAtlas2: Story = {
    args: {
        /*
         * `preSteps` MATCHES `fa2MaxIter` BELOW, because ForceAtlas2 is a live simulation and this
         * story asks it for 100 iterations. A simulation computes one iteration per RENDERED frame
         * by default, so without this those iterations are frames, and how long the arrangement
         * takes to arrive is a question about the browser's frame rate rather than about the
         * graph. `preSteps` runs them before the first frame is drawn, off the frame clock
         * entirely; the picture is the same either way, because ForceAtlas2 is deterministic under
         * `seed` and stops at `maxIter` whichever clock ran it.
         */
        setup: storySetup({ viewMode: "2d", preSteps: 100 }),
        layout: "forceatlas2",
        // Named outright, the way Circular, Random, Spring and Kamada-Kawai name it. The element
        // does derive a layout's dimensionality from `viewMode` -- `LayoutManager.setLayout`
        // merges `{ dim: 2 }` in when the view is 2D -- but it derives it at the moment the
        // engine is BUILT, and this story assigns `viewMode` and `layout` in the same turn. Which
        // of the two has landed first is not something a story should be betting on, and the one
        // story in this file that bets on it is the one that draws a graph with depth in it.
        layoutConfig: { dim: 2, weighted: false },
        fa2MaxIter: 100,
        fa2ScalingRatio: 2.0,
        fa2Gravity: 1.0,
        fa2StrongGravity: false,
        fa2DissuadeHubs: false,
        fa2LinLog: false,
        fa2Seed: 12,
    },
    parameters: {
        controls: {
            include: [
                "layoutConfig.maxIter",
                "layoutConfig.scalingRatio",
                "layoutConfig.gravity",
                "layoutConfig.strongGravity",
                "layoutConfig.dissuadeHubs",
                "layoutConfig.linlog",
                "layoutConfig.seed",
            ],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "ForceAtlas2");

        await assertDistinctPicture(scene, "Layout/2D");
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
    args: { ...KamadaKawai.args, layoutConfig: { dim: 2, weighted: true } },
    parameters: KamadaKawai.parameters,
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "KamadaKawaiWeighted");

        await assertHeavyEdgesShorter(scene, "value");
        await assertDistinctPicture(scene, "Layout/2D");
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
    args: { ...ForceAtlas2.args, layoutConfig: { dim: 2, weighted: true } },
    parameters: ForceAtlas2.parameters,
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "ForceAtlas2Weighted");

        await assertHeavyEdgesShorter(scene, "value");
        await assertDistinctPicture(scene, "Layout/2D");
    },
};

export const Arf: Story = {
    args: {
        setup: storySetup({ viewMode: "2d" }),
        layout: "arf",
        arfScaling: 1,
        arfMaxIter: 1000,
        arfSeed: 12,
    },
    parameters: {
        controls: {
            include: ["layoutConfig.scaling", "layoutConfig.maxIter", "layoutConfig.seed"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Arf");

        await assertDistinctPicture(scene, "Layout/2D");
    },
};

export const Bfs: Story = {
    args: {
        dataSource: undefined,
        nodeData: [
            { id: 0 },
            { id: 1 },
            { id: 2 },
            { id: 3 },
            { id: 4 },
            { id: 5 },
            { id: 6 },
            { id: 7 },
            { id: 8 },
            { id: 9 },
            { id: 10 },
            { id: 11 },
            { id: 12 },
            { id: 13 },
            { id: 14 },
            { id: 15 },
            { id: 16 },
            { id: 17 },
            { id: 18 },
            { id: 19 },
        ],
        edgeData: [
            { src: 0, dst: 1 },
            { src: 0, dst: 2 },
            { src: 0, dst: 3 },
            { src: 2, dst: 4 },
            { src: 0, dst: 5 },
            { src: 3, dst: 6 },
            { src: 5, dst: 7 },
            { src: 5, dst: 8 },
            { src: 4, dst: 9 },
            { src: 8, dst: 10 },
            { src: 3, dst: 11 },
            { src: 4, dst: 12 },
            { src: 8, dst: 13 },
            { src: 1, dst: 14 },
            { src: 13, dst: 15 },
            { src: 11, dst: 16 },
            { src: 3, dst: 17 },
            { src: 8, dst: 18 },
            { src: 0, dst: 19 },
        ],
        setup: storySetup({ viewMode: "2d" }),
        layout: "bfs",
        layoutConfig: { start: 0 },
        bfsAlign: "vertical",
        bfsScale: 1,
    },
    parameters: {
        controls: {
            include: ["layoutConfig.align", "layoutConfig.scale"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Bfs", { nodes: 20, edges: 19 });

        // A breadth-first layout draws one COLUMN per level from the starting node, so the nodes
        // stand in bands rather than anywhere flat and distinct would satisfy. The bands run
        // along x, not y: `bfsLayout` hands its layers to `multipartiteLayout`, whose default
        // alignment -- "vertical", meaning each layer is drawn as a vertical line -- puts the
        // layer index on x and spreads the layer's members along y. Bipartite and Multipartite
        // below read the same axis for the same reason. Five bands because this data is five
        // levels deep from node 0: {0}, {1,2,3,5,19}, {14,4,6,11,17,7,8}, {9,12,16,10,13,18},
        // {15}.
        await assertNodeBands(scene, 0, 5);
        await assertDistinctPicture(scene, "Layout/2D");
    },
};

export const Bipartite: Story = {
    args: {
        dataSource: undefined,
        nodeData: [
            { id: "A0" },
            { id: "A1" },
            { id: "A2" },
            { id: "A3" },
            { id: "A4" },
            { id: "A5" },
            { id: "A6" },
            { id: "A7" },
            { id: "A8" },
            { id: "A9" },
            { id: "B0" },
            { id: "B1" },
            { id: "B2" },
            { id: "B3" },
            { id: "B4" },
            { id: "B5" },
            { id: "B6" },
            { id: "B7" },
            { id: "B8" },
            { id: "B9" },
        ],
        edgeData: [
            { src: "A3", dst: "B5" },
            { src: "A5", dst: "B4" },
            { src: "A4", dst: "B5" },
            { src: "A9", dst: "B5" },
            { src: "A5", dst: "B7" },
            { src: "A5", dst: "B6" },
            { src: "A4", dst: "B9" },
            { src: "A8", dst: "B6" },
            { src: "A5", dst: "B8" },
            { src: "A3", dst: "B0" },
            { src: "A2", dst: "B5" },
            { src: "A7", dst: "B0" },
            { src: "A2", dst: "B7" },
            { src: "A4", dst: "B3" },
            { src: "A7", dst: "B6" },
            { src: "A6", dst: "B2" },
            { src: "A5", dst: "B5" },
            { src: "A0", dst: "B5" },
            { src: "A7", dst: "B8" },
            { src: "A4", dst: "B1" },
            { src: "A6", dst: "B9" },
            { src: "A0", dst: "B0" },
            { src: "A0", dst: "B6" },
            { src: "A2", dst: "B2" },
            { src: "A8", dst: "B5" },
            { src: "A2", dst: "B1" },
            { src: "A7", dst: "B1" },
            { src: "A1", dst: "B4" },
            { src: "A2", dst: "B6" },
            { src: "A5", dst: "B3" },
            { src: "A1", dst: "B5" },
            { src: "A6", dst: "B7" },
            { src: "A4", dst: "B4" },
            { src: "A2", dst: "B4" },
            { src: "A6", dst: "B5" },
            { src: "A7", dst: "B2" },
            { src: "A9", dst: "B6" },
            { src: "A9", dst: "B9" },
            { src: "A1", dst: "B7" },
            { src: "A7", dst: "B5" },
            { src: "A4", dst: "B7" },
            { src: "A8", dst: "B3" },
            { src: "A8", dst: "B4" },
            { src: "A9", dst: "B3" },
            { src: "A6", dst: "B3" },
            { src: "A0", dst: "B1" },
            { src: "A3", dst: "B2" },
            { src: "A8", dst: "B2" },
            { src: "A4", dst: "B2" },
        ],
        setup: storySetup({ viewMode: "2d" }),
        layout: "bipartite",
        layoutConfig: { nodes: ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"] },
        bipartiteAlign: "vertical",
        bipartiteScale: 1,
        bipartiteAspectRatio: 1.33,
    },
    parameters: {
        controls: {
            include: ["layoutConfig.align", "layoutConfig.scale", "layoutConfig.aspectRatio"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Bipartite", { nodes: 20, edges: 49 });

        // Two partitions, named in the story's own layoutConfig, drawn as two columns.
        await assertNodeBands(scene, 0, 2);
        await assertDistinctPicture(scene, "Layout/2D");
    },
};

export const Multipartite: Story = {
    args: {
        dataSource: undefined,
        nodeData: [
            { id: "L0N0" },
            { id: "L0N1" },
            { id: "L0N2" },
            { id: "L0N3" },
            { id: "L0N4" },
            { id: "L1N0" },
            { id: "L1N1" },
            { id: "L1N2" },
            { id: "L1N3" },
            { id: "L1N4" },
            { id: "L2N0" },
            { id: "L2N1" },
            { id: "L2N2" },
            { id: "L2N3" },
            { id: "L2N4" },
            { id: "L3N0" },
            { id: "L3N1" },
            { id: "L3N2" },
            { id: "L3N3" },
            { id: "L3N4" },
        ],
        edgeData: [
            { src: "L0N0", dst: "L1N1" },
            { src: "L0N0", dst: "L1N2" },
            { src: "L0N0", dst: "L1N3" },
            { src: "L0N1", dst: "L1N0" },
            { src: "L0N1", dst: "L1N2" },
            { src: "L0N1", dst: "L1N3" },
            { src: "L0N1", dst: "L1N4" },
            { src: "L0N2", dst: "L1N1" },
            { src: "L0N2", dst: "L1N2" },
            { src: "L0N3", dst: "L1N2" },
            { src: "L0N3", dst: "L1N3" },
            { src: "L0N4", dst: "L1N3" },
            { src: "L1N0", dst: "L2N2" },
            { src: "L1N1", dst: "L2N3" },
            { src: "L1N2", dst: "L2N2" },
            { src: "L1N2", dst: "L2N4" },
            { src: "L1N3", dst: "L2N1" },
            { src: "L1N4", dst: "L2N1" },
            { src: "L1N4", dst: "L2N3" },
            { src: "L2N0", dst: "L3N3" },
            { src: "L2N0", dst: "L3N4" },
            { src: "L2N1", dst: "L3N0" },
            { src: "L2N1", dst: "L3N1" },
            { src: "L2N1", dst: "L3N2" },
            { src: "L2N1", dst: "L3N4" },
            { src: "L2N2", dst: "L3N0" },
            { src: "L2N2", dst: "L3N1" },
            { src: "L2N2", dst: "L3N2" },
            { src: "L2N2", dst: "L3N3" },
            { src: "L2N2", dst: "L3N4" },
            { src: "L2N3", dst: "L3N0" },
            { src: "L2N3", dst: "L3N3" },
            { src: "L2N4", dst: "L3N0" },
            { src: "L2N4", dst: "L3N1" },
            { src: "L2N4", dst: "L3N3" },
        ],
        setup: storySetup({ viewMode: "2d" }),
        layout: "multipartite",
        layoutConfig: {
            subsetKey: {
                layer0: ["L0N0", "L0N1", "L0N2", "L0N3", "L0N4"],
                layer1: ["L1N0", "L1N1", "L1N2", "L1N3", "L1N4"],
                layer2: ["L2N0", "L2N1", "L2N2", "L2N3", "L2N4"],
                layer3: ["L3N0", "L3N1", "L3N2", "L3N3", "L3N4"],
            },
        },
        multipartiteAlign: "vertical",
        multipartiteScale: 1,
    },
    parameters: {
        controls: {
            include: ["layoutConfig.align", "layoutConfig.scale"],
        },
    },
    play: async ({ canvasElement }) => {
        const scene = await placed(canvasElement, "Multipartite", { nodes: 20, edges: 35 });

        // Four named layers, drawn as four columns.
        await assertNodeBands(scene, 0, 4);
        await assertDistinctPicture(scene, "Layout/2D");
    },
};
