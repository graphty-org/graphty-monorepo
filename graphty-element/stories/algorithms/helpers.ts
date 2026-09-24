// Import algorithms to trigger side-effect registration
import "../../src/algorithms";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { LayerSpec } from "../../src/catalog/types";
import type { Graphty } from "../../src/graphty-element";
import {
    assertAlgorithmPainted,
    assertDistinctPicture,
    assertDrawnVariety,
    assertEdgeVariety,
    assertGraphLoaded,
    type Drawn,
    drawn,
    holds,
} from "../assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup, waitForGraphSettled } from "../helpers";

export type Story = StoryObj<StoryArgs>;

/**
 * Base meta configuration for algorithm stories (without title)
 * Each story file should spread this and add the title property
 */
export const algorithmMetaBase: Omit<Meta, "title"> = {
    component: "graphty-element",
    // REQUIRED, not decoration. `setup` is a convention understood by exactly one function --
    // `renderFn`, which turns it into element properties and style layers -- and it is not an
    // element property. Storybook's default web-components renderer assigns every arg as a
    // property, so without this line `element.setup = {...}` lands on the element and is ignored:
    // no algorithm runs, no layer is added, and the layout runs with the element's default of
    // zero pre-steps, which is an unsettled physics layout and a different picture every frame.
    // The argument this replaced -- `styleTemplate` -- WAS a real element property, which is why
    // these stories worked before the migration with no render function at all.
    render: renderFn,
    decorators: [eventWaitingDecorator],
    parameters: {
        controls: { exclude: /^(#|_)/ },
        chromatic: {
            delay: 500, // Allow Babylon.js render frames to complete
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
            preSteps: 8000, // Extra preSteps for ngraph physics layout
        }),
    },
};

/**
 * Helper function for algorithm stories
 * Creates a story that runs an algorithm and applies its suggested styles
 *
 * `readerLayers` are the story's OWN layers, sitting beneath the algorithm's. Muting what an
 * algorithm did not select is a reader's choice and must not ship in suggestedStyles -- see
 * CLAUDE.md "### Algorithm Styles" -- so a story that wants the rest dimmed asks for it here.
 *
 * ORDER IS EVERYTHING HERE. The reader's layers are added first and the algorithm's suggestion
 * after them, because a layer later in the stack paints over a layer earlier in it -- so a story
 * that dims every edge and then runs a route algorithm shows the route over the dimmed rest,
 * which is the picture it is asking for.
 */
interface AlgorithmStoryExpectations {
    /** The nodes the story's data declares, when it is not the cat network's twenty. */
    readonly nodes?: number;
    /** The edges the story's data declares, when it is not the cat network's twenty-nine. */
    readonly edges?: number;
    /** Which drawn property the algorithm's picture varies, when it varies one. */
    readonly varies?: "hex" | "radius";
    /** How many different values of it the picture must hold. */
    readonly atLeast?: number;
    /** Which kind of element this algorithm's own layer paints: a route and a tree paint edges. */
    readonly paints?: "node" | "edge" | "either";
    /** How many of them it must paint. */
    readonly paintsAtLeast?: number;
    /** How many different edge appearances the picture must hold, for a story that dims the rest. */
    readonly edgeVariety?: number;
    /**
     * Whether this story's picture must differ from its siblings'.
     *
     * False for a pair that draws the same picture BY DEFINITION: Kruskal and Prim compute the
     * same minimum spanning tree of the same graph, so two identical pictures there is the
     * correct answer rather than two stories that have collapsed onto each other.
     */
    readonly distinct?: boolean;
    /** The reader's own layers, beneath the algorithm's. */
    readonly readerLayers?: readonly LayerSpec[];
    /**
     * Size the nodes by the run as well as colour them, over this node size range.
     *
     * A node metric suggests a colour and no size, so a story that wants both asks for it the way
     * a consumer does: `{ algorithm, style: { size: [min, max] } }` in the load-time list.
     */
    readonly size?: readonly [min: number, max: number];
}

export const createAlgorithmStory = (
    algorithmId: string,
    expectations: AlgorithmStoryExpectations | readonly LayerSpec[] = {},
): Story => {
    const asked: AlgorithmStoryExpectations = Array.isArray(expectations)
        ? { readerLayers: expectations as readonly LayerSpec[] }
        : (expectations as AlgorithmStoryExpectations);
    const { readerLayers, size } = asked;

    return {
        args: {
            setup: storySetup({
                algorithms: [size === undefined ? algorithmId : { algorithm: algorithmId, style: { size } }],
                preSteps: 8000, // Extra preSteps for ngraph physics layout
            }),
            runAlgorithmsOnLoad: true,
        },
        play: async ({ canvasElement }) => {
            // Wait for the graph to fully settle before applying algorithm styles
            await waitForGraphSettled(canvasElement);

            // Get the graphty-element
            const element = canvasElement.querySelector("graphty-element");

            await holds(element !== null, `${algorithmId}: the story rendered no <graphty-element> at all`);

            const graphtyElement = element as Graphty;
            const { graph, session } = graphtyElement;

            // The reader's layers go in first, so the algorithm's layer paints over them.
            for (const layer of readerLayers ?? []) {
                await session.styles.add(layer);
            }

            // ASSERTED, NOT DISCARDED. Graph.applySuggestedStyles returns false when no finished
            // run of this algorithm has anything per element to paint -- which is to say, when
            // this story is a picture of the element's own defaults with no algorithm in it. All
            // twenty-seven of these stories called it as a bare statement and passed either way.
            // A run started with `style: { size }` suggests its size as well as its colour, so
            // this puts both back on top of the reader's layers.
            const applied = graph.applySuggestedStyles(algorithmId);

            await holds(
                applied,
                `${algorithmId}: applySuggestedStyles returned false, so no finished run of this algorithm ` +
                    "had anything to paint and this story is a picture of the element's defaults",
            );

            const scene = await drawn(canvasElement, `Algorithms ${algorithmId}`);

            await assertGraphLoaded(scene, { nodes: asked.nodes ?? 20, edges: asked.edges ?? 29 });
            await assertAlgorithmPainted(scene, algorithmId, {
                paints: asked.paints,
                atLeast: asked.paintsAtLeast,
            });

            if (asked.varies !== undefined) {
                await assertDrawnVariety(scene, asked.varies, asked.atLeast ?? 3);
            }

            if (size !== undefined) {
                await assertSizedBy(scene, algorithmKey(algorithmId), size);
            }

            if (asked.edgeVariety !== undefined) {
                await assertEdgeVariety(scene, asked.edgeVariety);
            }

            if (asked.distinct !== false) {
                await assertDistinctPicture(scene, "Algorithms");
            }
        },
    };
};

/**
 * The catalogue key a `namespace:type` story address names, such as "hits" for "graphty:hits".
 * @param algorithmId - The story's address.
 * @returns The key `session.runs.start` takes.
 */
function algorithmKey(algorithmId: string): string {
    return algorithmId.replace(/^graphty:/, "");
}

/**
 * The nodes are drawn at a range of sizes set by one run, read off the meshes the renderer draws.
 *
 * At least four distinct sizes, the node the run ranks first drawn the largest, and the largest
 * about `max / min` times the smallest -- so a size layer the style model holds and the renderer
 * never applies fails here, and so does a size that follows some other field.
 * @param scene - What the story drew.
 * @param algorithm - The catalogue key of the run the sizes follow, such as "pagerank".
 * @param range - The node size range the story asked for.
 */
export async function assertSizedBy(
    scene: Drawn,
    algorithm: string,
    range: readonly [min: number, max: number],
): Promise<void> {
    const run = scene.session.runs
        .list()
        .find((entry) => entry.algorithm === algorithm && entry.status === "succeeded");
    const top = run?.result?.ranking("value", 1)[0];

    await holds(top !== undefined, `${scene.story}: no ${algorithm} run succeeded, so nothing sizes the nodes`);
    await assertDrawnVariety(scene, "radius", 4);

    const radii = scene.nodes.map((node) => node.radius);
    const largest = Math.max(...radii);
    const smallest = Math.min(...radii);
    const topNode = scene.nodes.find((node) => node.id === String(top?.id));

    await holds(
        topNode?.radius === largest,
        `${scene.story}: ${algorithm} ranks ${String(top?.id)} first, which is drawn at radius ` +
            `${String(topNode?.radius)} while the largest node is ${String(largest)}`,
    );
    await holds(
        largest / smallest >= 0.9 * (range[1] / range[0]),
        `${scene.story}: asked for sizes ${String(range[0])} to ${String(range[1])} and the largest node is ` +
            `only ${(largest / smallest).toFixed(2)} times the smallest`,
    );
}

// Re-export helpers for convenience
export { storySetup, waitForGraphSettled } from "../helpers";
