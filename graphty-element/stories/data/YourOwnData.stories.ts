import "../../index.ts";
// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { data2Url } from "../datasets";
import { edgeData, eventWaitingDecorator, nodeData, renderFn, type StoryArgs, storySetup } from "../helpers";
import { captioned, imported, readerText } from "./data-story";

/**
 * Your own nodes and edges, handed to the element as arrays or as a JSON file.
 *
 * The meta keeps the component id `data` these stories have always had, so their ids (and their
 * approved screenshots) did not change when they moved under Data/Your own data. Data/Formats
 * shares the id; this file owns the Docs page.
 */
const meta: Meta = {
    title: "Data/Your own data",
    id: "data",
    component: "graphty-element",
    tags: ["autodocs"],
    render: renderFn,
    decorators: [eventWaitingDecorator, captioned],
    parameters: {
        controls: { exclude: /^(#|_)/ },
        chromatic: {
            delay: 500, // Allow Babylon.js render frames to complete (30 frames at 60fps)
        },
        docs: {
            description: {
                component:
                    "Give the element your nodes and edges. Set `nodeData` and `edgeData` to arrays of plain " +
                    "objects -- a node needs an `id`, an edge a `src` and a `dst` (or `source` and `target`) -- " +
                    "or point `data-source` at a JSON file and say where its nodes and edges are. Every other " +
                    "field of a record is kept, so a style layer can color or size by it. Data/Formats has one " +
                    "story for every file format the element reads.",
            },
        },
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

export const Basic: Story = {
    name: "Inline nodes and edges",
    parameters: readerText(
        "Inline nodes and edges: six nodes and six edges set as the nodeData and edgeData properties.",
        `<graphty-element id="graph"></graphty-element>
<script type="module">
    const graph = document.getElementById("graph");
    graph.nodeData = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
    graph.edgeData = [
        { src: 0, dst: 1 }, { src: 0, dst: 2 }, { src: 2, dst: 3 },
        { src: 3, dst: 0 }, { src: 3, dst: 4 }, { src: 3, dst: 5 },
    ];
</script>`,
    ),
    args: {
        nodeData,
        edgeData,
        layout: "ngraph", // Use deterministic layout for visual tests
        layoutConfig: {
            seed: 42, // Fixed seed for consistent layouts in visual tests
        },
        setup: storySetup({ preSteps: 8000 }), // Extra preSteps for data3.json (77 nodes) with ngraph
    },
    play: async ({ canvasElement }) => {
        await imported(canvasElement, "Basic", 6, 6);
    },
};

export const ModifiedJson: Story = {
    name: "JSON file with your own field names",
    parameters: readerText(
        'A JSON file whose edges are under "links" instead of "edges": edge.path in data-source-config says ' +
            "where they are. The characters of Les Miserables: 77 nodes and 254 edges.",
        `<graphty-element
    data-source="json"
    data-source-config='{"url": "miserables.json", "edge": {"path": "links"}}'
></graphty-element>`,
    ),
    args: {
        dataSource: "json",
        dataSourceConfig: {
            data: data2Url,
            edge: {
                path: "links",
            },
        },
        layout: "ngraph",
        layoutConfig: {
            seed: 42, // Fixed seed for consistent layouts in visual tests
        },
        setup: storySetup({ preSteps: 8000 }), // Extra preSteps for data2.json (80 nodes) with ngraph
    },
    play: async ({ canvasElement }) => {
        await imported(canvasElement, "ModifiedJson", 77, 254);
    },
};
