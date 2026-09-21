import type { LayerSpec } from "../../../src/catalog/types";
import { algorithmMetaBase, createAlgorithmStory, type Story } from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Spanning Tree",
};
export default meta;

/**
 * The reader's own layer: every edge grey, so that the ones the tree kept stand out when the
 * algorithm's layer repaints them on top.
 *
 * It greys EVERY edge rather than naming the ones outside the tree, and that is deliberate. The
 * tree's own layer paints only the edges in the tree -- an edge it left out is not its to touch
 * -- so "the rest" is whatever is still showing from underneath, which is what a layer beneath is
 * for. Naming the rest would need the id of a run that has not started when the story is written.
 */
const DIM_EVERY_EDGE: LayerSpec = {
    name: "Reader - dim every edge",
    target: "edge",
    selector: { match: "everything" },
    set: { "edge.color": "#999999" },
};

/**
 * Kruskal's MST - highlights minimum spanning tree edges
 * MST edges are highlighted; every other edge is left grey by the reader's layer beneath
 */
export const Kruskal: Story = createAlgorithmStory("graphty:kruskal", [DIM_EVERY_EDGE]);

/**
 * Prim's MST - highlights minimum spanning tree edges
 * Same visualization as Kruskal but uses Prim's algorithm
 * (grows tree from a starting node instead of sorting edges)
 */
export const Prim: Story = createAlgorithmStory("graphty:prim", [DIM_EVERY_EDGE]);
