import type { LayerSpec } from "../../../src/catalog/types";
import { algorithmMetaBase, CAT_NETWORK, createAlgorithmStory, documented, onLoadSource, type Story } from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Spanning trees",
    id: "algorithms-spanning-tree",
    tags: ["autodocs"],
    parameters: {
        ...algorithmMetaBase.parameters,
        docs: {
            description: {
                component:
                    `A minimum spanning tree is the cheapest set of edges that still connects every node. The ` +
                    `algorithm paints the edges in the tree; the stories add a layer of their own beneath it that ` +
                    `grays every edge, so the tree stands out. Kruskal and Prim find the same tree by different ` +
                    `methods, so they draw the same picture. Each story draws ${CAT_NETWORK}.`,
            },
        },
    },
};
export default meta;

/**
 * The reader's own layer: every edge gray, so the ones the tree kept stand out when the
 * algorithm's layer repaints them on top.
 *
 * It grays EVERY edge rather than naming the ones outside the tree, and that is deliberate: the
 * tree's own layer paints only the edges in the tree, so "the rest" is whatever still shows from
 * underneath. Naming the rest would need the id of a run that has not started when the story is
 * written.
 */
const DIM_EVERY_EDGE: LayerSpec = {
    name: "Every edge, grayed",
    target: "edge",
    selector: { match: "everything" },
    set: { "edge.color": "#999999" },
};

/** The same layer, as a consumer writes it. */
const DIM_SOURCE = [
    "    graph.session.styles.add({",
    '        name: "Every edge, grayed",',
    '        target: "edge",',
    '        selector: { match: "everything" },',
    '        set: { "edge.color": "#999999" },',
    "    });",
];

/** Kruskal: grows the tree by taking the cheapest edge that joins two separate pieces. */
export const Kruskal: Story = documented(
    createAlgorithmStory("graphty:kruskal", { readerLayers: [DIM_EVERY_EDGE], paints: "edge", edgeVariety: 2 }),
    {
        caption:
            "The edges of the minimum spanning tree are painted orange over a gray layer of the story's own. " +
            'Set algorithmsOnLoad = ["kruskal"].',
        code: onLoadSource('["kruskal"]', DIM_SOURCE),
    },
);

/** Prim: grows the tree outward from one starting node. */
export const Prim: Story = documented(
    createAlgorithmStory("graphty:prim", {
        readerLayers: [DIM_EVERY_EDGE],
        paints: "edge",
        edgeVariety: 2,
        // Kruskal and Prim find the same tree, so this story drawing the same picture as its
        // sibling is the right answer and not two stories that have collapsed onto each other.
        distinct: false,
    }),
    {
        caption:
            "The same tree as Kruskal, grown outward from one node by Prim's algorithm. " +
            'Set algorithmsOnLoad = ["prim"].',
        code: onLoadSource('["prim"]', DIM_SOURCE),
    },
);
