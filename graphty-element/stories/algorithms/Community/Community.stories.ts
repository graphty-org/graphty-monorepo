import type { Graphty } from "../../../src/graphty-element";
import { assertGraphLoaded, drawn, holds } from "../../assertions";
import { algorithmMetaBase, createAlgorithmStory, type Story, storySetup, waitForGraphSettled } from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Community",
};
export default meta;

/**
 * Louvain - categorical colors by detected community
 * Uses the default categorical palette, Okabe-Ito, for community membership
 */
export const Louvain: Story = createAlgorithmStory("graphty:louvain", { varies: "hex", atLeast: 2 });

/**
 * Girvan-Newman - community detection via edge betweenness removal
 * Draws with the default categorical palette, Okabe-Ito, like every community story here
 */
export const GirvanNewman: Story = createAlgorithmStory("graphty:girvan-newman", { varies: "hex", atLeast: 2 });

/**
 * Leiden - improved community detection (guarantees connected communities)
 * Draws with the default categorical palette, Okabe-Ito, like every community story here
 */
export const Leiden: Story = createAlgorithmStory("graphty:leiden", { varies: "hex", atLeast: 2 });

/**
 * Label Propagation - fast community detection via label spreading
 * Draws with the default categorical palette, Okabe-Ito, like every community story here
 */
export const LabelPropagation: Story = createAlgorithmStory("graphty:label-propagation", { varies: "hex", atLeast: 2 });

/**
 * Eleven separate cliques, so Louvain finds exactly eleven communities. The eight largest have 5
 * or 6 nodes and the three smallest 3, 2 and 2, so which three fold into "other" has one answer.
 *
 * 49 nodes, and that is deliberate: `@graphty/algorithms`' optimised Louvain returns every node
 * as its own community on graphs of more than about 50 nodes, which would make this a picture of
 * that defect rather than of the overflow policy.
 */
const CLIQUE_SIZES = [6, 6, 5, 5, 5, 5, 5, 5, 3, 2, 2];
const SMALLEST_CLIQUES = ["q10", "q8", "q9"];
const cliqueNodes = CLIQUE_SIZES.flatMap((size, clique) =>
    Array.from({ length: size }, (_, at) => ({ id: `q${String(clique)}-${String(at)}` })),
);
const cliqueEdges = CLIQUE_SIZES.flatMap((size, clique) =>
    Array.from({ length: size }, (_, from) =>
        Array.from({ length: size - from - 1 }, (__, step) => ({
            src: `q${String(clique)}-${String(from)}`,
            dst: `q${String(clique)}-${String(from + step + 1)}`,
        })),
    ).flat(),
);

/** The colour an overflowing group encoding paints every group past the palette. */
const OTHER_GREY = "#505050";

/**
 * More communities than the default palette has colours.
 *
 * Louvain finds eleven communities and Okabe-Ito has eight colours. The default overflow policy,
 * "other", keeps the palette's eight colours for the eight largest communities and paints the
 * three smallest one dark grey, which the legend names "other: 3 groups".
 */
export const LouvainMoreCommunitiesThanColours: Story = {
    args: {
        dataSource: undefined,
        nodeData: cliqueNodes,
        edgeData: cliqueEdges,
        setup: storySetup({ preSteps: 8000 }),
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);

        const element = canvasElement.querySelector("graphty-element");

        await holds(element !== null, "LouvainMoreCommunitiesThanColours: no <graphty-element> rendered");

        const graphtyElement = element as Graphty;
        const { session } = graphtyElement;

        // Started here rather than on load: inline data arrives as nodes and then edges, and a run
        // started on load can see the nodes before the edges.
        const run = session.runs.start("louvain", {}, { style: false });

        await run;
        await session.styles.encode({ run: run.id, channel: "node.color" });

        const scene = await drawn(canvasElement, "Algorithms/Community LouvainMoreCommunitiesThanColours");

        await assertGraphLoaded(scene, { nodes: cliqueNodes.length, edges: cliqueEdges.length });

        const colours = new Set(scene.nodes.map((node) => node.hex?.toLowerCase()));
        const greyed = new Set(
            scene.nodes.filter((node) => node.hex?.toLowerCase() === OTHER_GREY).map((node) => node.id.split("-")[0]),
        );

        await holds(
            colours.size === 9 && colours.has(OTHER_GREY),
            `expected the 8 palette colours plus the grey, drew ${[...colours].join(", ")}`,
        );
        await holds(
            [...greyed].sort().join(",") === SMALLEST_CLIQUES.join(","),
            `expected the grey on exactly the three smallest communities, drew it on ${[...greyed].join(", ")}`,
        );

        const block = session.styles.legend().find((entry) => entry.channel === "node.color");
        const last = block?.swatches[block.swatches.length - 1];

        await holds(last?.label === "other: 3 groups", `the legend's last row reads "${String(last?.label)}"`);
    },
};
