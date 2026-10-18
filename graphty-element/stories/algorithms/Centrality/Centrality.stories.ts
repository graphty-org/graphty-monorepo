import {
    algorithmMetaBase,
    CAT_NETWORK,
    createAlgorithmStory,
    documented,
    onLoadSource,
    type Story,
    type StoryDoc,
} from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Centrality",
    id: "algorithms-centrality",
    tags: ["autodocs"],
    parameters: {
        ...algorithmMetaBase.parameters,
        docs: {
            description: {
                component:
                    `Centrality measures how important each node is. Name one in \`algorithmsOnLoad\`, turn on ` +
                    `\`runAlgorithmsOnLoad\`, and graphty-element runs it when the data has loaded and colors every ` +
                    `node by its score: light orange for the lowest, dark brown for the highest. Every centrality ` +
                    `draws the same way, so the stories differ only in what they measure. Ask for ` +
                    `\`style: { size: [min, max] }\` to size the nodes by the score as well, as PageRank and HITS do ` +
                    `here. Each story draws ${CAT_NETWORK}.`,
            },
        },
    },
};
export default meta;

/**
 * The caption and code for a centrality that only colors.
 * @param key - The algorithm's catalog key.
 * @param what - What the score measures, as the end of a sentence.
 * @returns Its documentation.
 */
function colorOnly(key: string, what: string): StoryDoc {
    return {
        caption: `Each node is colored by its ${what}; darker means higher. Set algorithmsOnLoad = ["${key}"].`,
        code: onLoadSource(`["${key}"]`),
    };
}

/** Degree centrality: how many connections each node has. */
export const Degree: Story = documented(
    createAlgorithmStory("graphty:degree", { varies: "hex", atLeast: 3 }),
    colorOnly("degree", "degree, the number of friendships it has"),
);

/** PageRank: importance from being linked to by important nodes, drawn as color and size. */
export const PageRank: Story = {
    name: "PageRank",
    ...documented(createAlgorithmStory("graphty:pagerank", { varies: "hex", atLeast: 3, size: [1, 5] }), {
        caption:
            "Each node is colored and sized by its PageRank: the most influential cat is the largest and darkest. " +
            'Set algorithmsOnLoad = [{ algorithm: "pagerank", style: { size: [1, 5] } }].',
        code: onLoadSource('[{ algorithm: "pagerank", style: { size: [1, 5] } }]'),
    }),
};

/** Betweenness: how often a node lies on the shortest route between two others. */
export const Betweenness: Story = documented(
    createAlgorithmStory("graphty:betweenness", { varies: "hex", atLeast: 3 }),
    colorOnly("betweenness", "betweenness, how often it sits on the shortest route between two other cats"),
);

/** Closeness: how near a node is, on average, to every other node. */
export const Closeness: Story = documented(
    createAlgorithmStory("graphty:closeness", { varies: "hex", atLeast: 3 }),
    colorOnly("closeness", "closeness, how few steps it takes on average to reach every other cat"),
);

/** Eigenvector: influence from being connected to well-connected nodes. */
export const Eigenvector: Story = documented(
    createAlgorithmStory("graphty:eigenvector", { varies: "hex", atLeast: 3 }),
    colorOnly("eigenvector", "eigenvector centrality, how well connected its friends are"),
);

/** HITS: hub and authority scores, drawn as color and size by the combined score. */
export const HITS: Story = documented(
    createAlgorithmStory("graphty:hits", { varies: "hex", atLeast: 3, size: [1, 4] }),
    {
        caption:
            "Each node is colored and sized by its HITS score (hubs and authorities combined); larger and darker " +
            'means more important. Set algorithmsOnLoad = [{ algorithm: "hits", style: { size: [1, 4] } }].',
        code: onLoadSource('[{ algorithm: "hits", style: { size: [1, 4] } }]'),
    },
);

/** Katz: influence counted over every path, with longer paths counting less. */
export const Katz: Story = documented(
    createAlgorithmStory("graphty:katz", { varies: "hex", atLeast: 3 }),
    colorOnly("katz", "Katz centrality, which counts every path to it and weighs longer paths less"),
);
