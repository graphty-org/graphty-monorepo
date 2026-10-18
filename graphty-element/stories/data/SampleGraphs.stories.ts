import "../../index.ts";
// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../../src/graphty-element";

import { DATASETS, type ElementData, fetchDataset, type SampleGraph, toElementData } from "@graphty/graph-samples";
import {
    barabasiAlbertGraph,
    plantedPartitionGraph,
    randomTreeGraph,
    wattsStrogatzGraph,
} from "@graphty/graph-samples/generators";
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { sampleDatasetUrls } from "../datasets";
import { eventWaitingDecorator, renderFn, storySetup, waitForGraphSettled } from "../helpers";
import { captioned, imported, readerText } from "./data-story";

/** The generators the Generated graph story offers, each called with the story's size and seed. */
const GENERATORS = {
    "barabasi-albert": (n: number, seed: number) => barabasiAlbertGraph({ n, m: 2, seed }),
    "watts-strogatz": (n: number, seed: number) => wattsStrogatzGraph({ n, k: 4, beta: 0.1, seed }),
    "random-tree": (n: number, seed: number) => randomTreeGraph({ n, seed }),
    "planted-partition": (n: number, seed: number) =>
        plantedPartitionGraph({ groups: 4, groupSize: Math.ceil(n / 4), pIn: 0.3, pOut: 0.01, seed }),
} satisfies Record<string, (n: number, seed: number) => SampleGraph>;

type GeneratorName = keyof typeof GENERATORS;

/** The call each generator is shown with in its caption and in the Code panel. */
const GENERATOR_CALLS: Record<GeneratorName, string> = {
    "barabasi-albert": "barabasiAlbertGraph({ n, m: 2, seed })",
    "watts-strogatz": "wattsStrogatzGraph({ n, k: 4, beta: 0.1, seed })",
    "random-tree": "randomTreeGraph({ n, seed })",
    "planted-partition": "plantedPartitionGraph({ groups: 4, groupSize: n / 4, pIn: 0.3, pOut: 0.01, seed })",
};

interface SampleArgs {
    generator: GeneratorName;
    nodes: number;
    seed: number;
    dataset: string;
}

/**
 * Draws one graph with the seeded layout every story here uses.
 * @param data - The node and edge records.
 * @param context - The story's context, handed on to the shared render function.
 * @returns The element.
 */
function draw(data: ElementData, context: Parameters<typeof renderFn>[1]): Element {
    return renderFn(
        {
            nodeData: data.nodes,
            edgeData: data.edges,
            layout: "ngraph",
            layoutConfig: { seed: 42 },
            setup: storySetup({ preSteps: 8000 }),
        },
        // Only the records above reach the element: the story's own controls are read here.
        { ...context, argTypes: {} },
    );
}

/**
 * Downloads a dataset the way a consumer would, answered from the copy this Storybook serves.
 * @param name - The dataset's name.
 * @returns Its node and edge records.
 */
async function loadDataset(name: string): Promise<ElementData> {
    const url = sampleDatasetUrls[name];
    const snapshot = await fetchDataset(name, { fetch: () => fetch(url) });

    return toElementData(snapshot);
}

/**
 * The caption of a dataset: what it is, its size, and where it came from.
 * @param name - The dataset's name.
 * @returns The caption.
 */
function datasetCaption(name: string): string {
    const meta = DATASETS.find((dataset) => dataset.name === name);

    if (meta === undefined) {
        return name;
    }

    return `${meta.title} ("${name}" in graph-samples): ${meta.nodes} nodes and ${meta.edges} edges. ${meta.license}`;
}

const meta: Meta<SampleArgs> = {
    title: "Data/Sample graphs",
    component: "graphty-element",
    tags: ["autodocs"],
    decorators: [eventWaitingDecorator, captioned],
    args: {
        generator: "barabasi-albert",
        nodes: 60,
        seed: 42,
        dataset: "karate",
    },
    argTypes: {
        generator: { control: "select", options: Object.keys(GENERATORS) },
        nodes: { control: { type: "range", min: 10, max: 300, step: 10 } },
        seed: { control: "number" },
        dataset: { control: "select", options: Object.keys(sampleDatasetUrls) },
    },
    parameters: {
        docs: {
            description: {
                component:
                    "Graphs to try things on, from `@graphty/graph-samples`: seeded generators that build the same " +
                    "graph on every machine, and classic real-world networks downloaded from graphty.app. " +
                    "`toElementData` turns either into the `nodeData` and `edgeData` the element takes.",
            },
        },
    },
};
export default meta;

type Story = StoryObj<SampleArgs>;

export const Generated: Story = {
    name: "Generated graph",
    argTypes: { dataset: { table: { disable: true } } },
    render: (args, context) => draw(toElementData(GENERATORS[args.generator](args.nodes, args.seed)), context),
    parameters: readerText(
        (args) =>
            `A generated graph: ${GENERATOR_CALLS[args.generator as GeneratorName]} with n = ${String(args.nodes)} ` +
            `and seed = ${String(args.seed)}, from @graphty/graph-samples/generators. The same seed gives the same graph everywhere.`,
        `<graphty-element id="graph"></graphty-element>
<script type="module">
    import { toElementData } from "@graphty/graph-samples";
    import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";

    const { nodes, edges } = toElementData(barabasiAlbertGraph({ n: 60, m: 2, seed: 42 }));
    const graph = document.getElementById("graph");
    graph.nodeData = nodes;
    graph.edgeData = edges;
</script>`,
    ),
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
    },
};

export const Dataset: Story = {
    name: "Real-world dataset",
    argTypes: {
        generator: { table: { disable: true } },
        nodes: { table: { disable: true } },
        seed: { table: { disable: true } },
    },
    loaders: [async ({ args }) => ({ data: await loadDataset(args.dataset) })],
    render: (_args, context) => draw(context.loaded.data as ElementData, context),
    parameters: readerText(
        (args) => datasetCaption(args.dataset as string),
        `<graphty-element id="graph"></graphty-element>
<script type="module">
    import { fetchDataset, toElementData } from "@graphty/graph-samples";

    // Downloads Zachary's karate club from graphty.app.
    const { nodes, edges } = toElementData(await fetchDataset("karate"));
    const graph = document.getElementById("graph");
    graph.nodeData = nodes;
    graph.edgeData = edges;
</script>`,
    ),
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
    },
};

/** Regression: the karate club arrives whole -- every member and every friendship. */
export const DatasetCounts: Story = {
    ...Dataset,
    name: "Dataset arrives whole",
    tags: ["regression", "!dev", "!autodocs"],
    args: { dataset: "karate" },
    play: async ({ canvasElement }) => {
        await imported(canvasElement, "Sample graphs karate", 34, 78);
    },
};
