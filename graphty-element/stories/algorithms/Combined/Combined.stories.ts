import type { Graphty } from "../../../src/graphty-element";
import {
    assertAlgorithmPainted,
    assertDistinctPicture,
    assertDrawnVariety,
    assertEdgeVariety,
    assertGraphLoaded,
    drawn,
    holds,
} from "../../assertions";
import { algorithmMetaBase, type Story, storySetup, waitForGraphSettled } from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Combined",
};
export default meta;

/**
 * Size the nodes by PageRank, 1 to 5, the way these stories drew it in 1.x.
 *
 * A node metric suggests a colour and nothing else, so PageRank's size is asked for by name --
 * and asked for AFTER the suggestions, because a size and a colour are different channels and
 * neither run's colour is touched by it.
 * @param graphtyElement - The element the story drew.
 * @param story - The story's name, for the failure message.
 */
async function sizeByPageRank(graphtyElement: Graphty, story: string): Promise<void> {
    const { session } = graphtyElement;
    const run = session.runs.list().find((entry) => entry.algorithm === "pagerank" && entry.status === "succeeded");

    await holds(run !== undefined, `${story}: no PageRank run succeeded, so there is nothing to size the nodes by`);

    if (run !== undefined) {
        await session.styles.encode({ run: run.id, channel: "node.size", range: [1, 5] });
    }
}

/**
 * Two algorithms of the same shape, competing for one channel.
 *
 * A node metric suggests a colour over the nodes it measured, and both of these are node
 * metrics, so both suggest `node.color` and only the one named LAST is the picture. PageRank is
 * named last here, so what a reader is looking at is influence; Degree is underneath it, one
 * `styles.move` away from being the picture instead.
 */
export const DegreeAndPageRank: Story = {
    args: {
        setup: storySetup({
            algorithms: ["graphty:degree", "graphty:pagerank"],
        }),
        runAlgorithmsOnLoad: true,
    },
    play: async ({ canvasElement }) => {
        // A FIXED TIMER USED TO STAND HERE, and a run that had not finished inside its second
        // made applySuggestedStyles answer false and the story fail with no algorithm in the
        // picture. These two waits say what is actually being waited FOR: the data arrived and
        // the frame stopped moving, and the element has no queued work left -- which is where
        // the runs live.
        await waitForGraphSettled(canvasElement);

        const element = canvasElement.querySelector("graphty-element");
        if (!element) {
            return;
        }

        const graphtyElement = element as Graphty;
        const { graph } = graphtyElement;

        await graph.operationQueue.waitForCompletion();

        const applied = graph.applySuggestedStyles(["graphty:degree", "graphty:pagerank"]);

        await holds(
            applied,
            "Algorithms/Combined DegreeAndPageRank: applySuggestedStyles returned false for both algorithms, " +
                "so neither run had anything to paint",
        );

        const scene = await drawn(canvasElement, "Algorithms/Combined DegreeAndPageRank");

        await assertGraphLoaded(scene, { nodes: 20, edges: 29 });
        await assertAlgorithmPainted(scene, "graphty:degree", { paints: "node", atLeast: 20 });
        await assertAlgorithmPainted(scene, "graphty:pagerank", { paints: "node", atLeast: 20 });
        await assertDrawnVariety(scene, "hex", 3);
        await assertDistinctPicture(scene, "Algorithms/Combined");
    },
};

/**
 * Centrality against community: colour is the community, size is the influence.
 *
 * A community suggests a colour per group and a node metric suggests a colour along a ramp, so
 * the two compete for `node.color` and Louvain, named last, wins it. PageRank's picture is then
 * asked for on the channel nobody else is using -- node size, 1 to 5 -- which picks out the
 * influential nodes inside each community.
 */
export const CentralityVsCommunity: Story = {
    args: {
        setup: storySetup({
            algorithms: ["graphty:louvain", "graphty:pagerank"],
        }),
        runAlgorithmsOnLoad: true,
    },
    play: async ({ canvasElement }) => {
        // Waited for by name rather than by a timer: a fixed second used to stand here, and a
        // run that had not finished inside it made applySuggestedStyles answer false.
        await waitForGraphSettled(canvasElement);

        const element = canvasElement.querySelector("graphty-element");
        if (!element) {
            return;
        }

        const graphtyElement = element as Graphty;
        const { graph } = graphtyElement;

        await graph.operationQueue.waitForCompletion();

        const applied = graph.applySuggestedStyles(["graphty:pagerank", "graphty:louvain"]);

        await holds(
            applied,
            "Algorithms/Combined CentralityVsCommunity: applySuggestedStyles returned false, so neither run " +
                "had anything to paint",
        );

        await sizeByPageRank(graphtyElement, "Algorithms/Combined CentralityVsCommunity");

        const scene = await drawn(canvasElement, "Algorithms/Combined CentralityVsCommunity");

        await assertGraphLoaded(scene, { nodes: 20, edges: 29 });
        await assertAlgorithmPainted(scene, "graphty:louvain", { paints: "node", atLeast: 20 });
        await assertAlgorithmPainted(scene, "graphty:pagerank", { paints: "node", atLeast: 20 });

        // Louvain is applied last and wins the colour, so the picture holds one colour per
        // community rather than one per PageRank score.
        await assertDrawnVariety(scene, "hex", 2);
        // And PageRank, on the size channel, separates the nodes inside each community.
        await assertDrawnVariety(scene, "radius", 3);
        await assertDistinctPicture(scene, "Algorithms/Combined");
    },
};

/**
 * Four runs, and the two kinds of picture they make.
 *
 * Degree, PageRank and Louvain all suggest `node.color`, so Louvain -- named last of the three --
 * is the colour a reader sees. Dijkstra is a route rather than a measurement, so it suggests a
 * HIGHLIGHT over the nodes and edges on the path and leaves every other element exactly as the
 * layers beneath it painted them. PageRank is also asked for on node size, which no suggestion
 * writes, so influence stays visible under the community colours.
 */
export const CommunityStructureWithPath: Story = {
    args: {
        setup: storySetup({
            algorithms: ["graphty:degree", "graphty:pagerank", "graphty:louvain", "graphty:dijkstra"],
        }),
        runAlgorithmsOnLoad: true,
    },
    play: async ({ canvasElement }) => {
        // Waited for by name rather than by a timer: a fixed second used to stand here, and a
        // run that had not finished inside it made applySuggestedStyles answer false.
        await waitForGraphSettled(canvasElement);

        const element = canvasElement.querySelector("graphty-element");
        if (!element) {
            return;
        }

        const graphtyElement = element as Graphty;
        const { graph } = graphtyElement;

        await graph.operationQueue.waitForCompletion();

        // Order matters: the last algorithm named wins every channel it writes.
        const applied = graph.applySuggestedStyles([
            "graphty:degree", // Colour by degree, and then painted over twice
            "graphty:pagerank", // Colour by influence, and then painted over once
            "graphty:louvain", // Colour by community, which is the colour that survives
            "graphty:dijkstra", // Highlight the path, over the nodes and edges on it and no others
        ]);

        await holds(
            applied,
            "Algorithms/Combined CommunityStructureWithPath: applySuggestedStyles returned false for all four " +
                "algorithms, so none of them had anything to paint",
        );

        await sizeByPageRank(graphtyElement, "Algorithms/Combined CommunityStructureWithPath");

        const scene = await drawn(canvasElement, "Algorithms/Combined CommunityStructureWithPath");

        await assertGraphLoaded(scene, { nodes: 20, edges: 29 });

        for (const algorithm of ["graphty:degree", "graphty:pagerank", "graphty:louvain", "graphty:dijkstra"]) {
            await assertAlgorithmPainted(scene, algorithm);
        }

        await assertDrawnVariety(scene, "hex", 2);
        await assertDrawnVariety(scene, "radius", 3);
        await assertDistinctPicture(scene, "Algorithms/Combined");
    },
};

/**
 * Combined Edge Flow - edge color and width based on relationship strength
 * Demonstrates multi-dimensional edge styling where:
 * - Edge colour follows the value along viridis (dark purple = weak, yellow = strong)
 * - Edge width scales with the value, 0.2 to 20
 * - The arrow head takes the same colour as its line
 *
 * All three channels read the same field, `data.value`, which every edge in this dataset carries
 * with a strength from 1 to 10, read against 0 to 10 as the 1.x story read `value / 10`.
 */
export const CombinedEdgeFlow: Story = {
    args: {
        setup: storySetup({
            algorithms: [],
        }),
        runAlgorithmsOnLoad: false,
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);

        const element = canvasElement.querySelector("graphty-element");
        if (!element) {
            return;
        }

        const { session } = element as Graphty;

        await session.styles.add({
            name: "Relationship strength",
            target: "edge",
            selector: { match: "has", path: "data.value" },
            encode: {
                "edge.color": { by: "data.value", scale: "linear", palette: "viridis", domain: [0, 10] },
                "edge.width": { by: "data.value", scale: "linear", domain: [0, 10], range: [0.2, 20] },
                "edge.arrowHeadColor": { by: "data.value", scale: "linear", palette: "viridis", domain: [0, 10] },
            },
        });

        const scene = await drawn(canvasElement, "Algorithms/Combined CombinedEdgeFlow");

        await assertGraphLoaded(scene, { nodes: 20, edges: 29 });

        // No algorithm runs here: the demonstration is one layer binding two edge channels to one
        // column, so what has to be true is that the edges are DRAWN in a range of appearances.
        await assertEdgeVariety(scene, 3);
        await assertDistinctPicture(scene, "Algorithms/Combined");
    },
};
