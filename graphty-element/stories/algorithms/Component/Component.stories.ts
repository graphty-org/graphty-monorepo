import type { Graphty } from "../../../src/graphty-element";
import {
    assertAlgorithmPainted,
    assertDistinctPicture,
    assertDrawnVariety,
    assertGraphLoaded,
    drawn,
    holds,
} from "../../assertions";
import { algorithmMetaBase, createAlgorithmStory, type Story, storySetup, waitForGraphSettled } from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Component",
};
export default meta;

// Disconnected components data: 4 separate island communities
const disconnectedComponentsData = {
    nodes: [
        // Component 1: Tech Startup (5 nodes - tight cluster)
        { id: "startup_ceo", label: "CEO", group: "startup" },
        { id: "startup_cto", label: "CTO", group: "startup" },
        { id: "startup_dev1", label: "Dev 1", group: "startup" },
        { id: "startup_dev2", label: "Dev 2", group: "startup" },
        { id: "startup_designer", label: "Designer", group: "startup" },
        // Component 2: Research Lab (4 nodes)
        { id: "lab_professor", label: "Professor", group: "lab" },
        { id: "lab_postdoc", label: "Postdoc", group: "lab" },
        { id: "lab_grad1", label: "Grad Student 1", group: "lab" },
        { id: "lab_grad2", label: "Grad Student 2", group: "lab" },
        // Component 3: Book Club (3 nodes - small group)
        { id: "book_alice", label: "Alice", group: "bookclub" },
        { id: "book_bob", label: "Bob", group: "bookclub" },
        { id: "book_carol", label: "Carol", group: "bookclub" },
        // Component 4: Isolated Hermit (1 node - singleton)
        { id: "hermit", label: "Hermit", group: "hermit" },
    ],
    edges: [
        // Component 1: Tech Startup (dense connections)
        { src: "startup_ceo", dst: "startup_cto" },
        { src: "startup_ceo", dst: "startup_designer" },
        { src: "startup_cto", dst: "startup_dev1" },
        { src: "startup_cto", dst: "startup_dev2" },
        { src: "startup_dev1", dst: "startup_dev2" },
        { src: "startup_designer", dst: "startup_dev1" },
        // Component 2: Research Lab (hierarchical)
        { src: "lab_professor", dst: "lab_postdoc" },
        { src: "lab_professor", dst: "lab_grad1" },
        { src: "lab_postdoc", dst: "lab_grad1" },
        { src: "lab_postdoc", dst: "lab_grad2" },
        // Component 3: Book Club (triangle)
        { src: "book_alice", dst: "book_bob" },
        { src: "book_bob", dst: "book_carol" },
        { src: "book_carol", dst: "book_alice" },
        // Component 4: Hermit has no edges (isolated node)
    ],
};

/**
 * Connected Components - identifies disconnected graph parts
 * Colors nodes by component ID using IBM Carbon design system colors
 * This dataset has 4 components: Tech Startup (5), Research Lab (4), Book Club (3), Hermit (1)
 */
export const ConnectedComponents: Story = {
    args: {
        dataSource: undefined,
        dataSourceConfig: undefined,
        nodeData: disconnectedComponentsData.nodes,
        edgeData: disconnectedComponentsData.edges,
        layout: "ngraph",
        layoutConfig: {
            seed: 42,
        },
        setup: storySetup({
            algorithms: ["graphty:connected-components"],
        }),
        runAlgorithmsOnLoad: true,
    },
    play: async ({ canvasElement }) => {
        // Wait for the graph to load and settle
        await waitForGraphSettled(canvasElement);

        // Get the graphty-element
        const element = canvasElement.querySelector("graphty-element");
        if (!element) {
            return;
        }

        const graphtyElement = element as Graphty;
        const { graph } = graphtyElement;

        // Run the algorithm explicitly (runAlgorithmsOnLoad may not trigger for all data sources)
        await graph.runAlgorithmsFromTemplate();

        // Apply suggested styles from the algorithm
        const applied = graph.applySuggestedStyles("graphty:connected-components");

        await holds(
            applied,
            "Algorithms/Component ConnectedComponents: applySuggestedStyles returned false, so no finished run " +
                "had anything to paint and this is a picture of the element's defaults",
        );

        const scene = await drawn(canvasElement, "Algorithms/Component ConnectedComponents");

        await assertGraphLoaded(scene, { nodes: 13, edges: 13 });
        await assertAlgorithmPainted(scene, "graphty:connected-components", { paints: "node", atLeast: 13 });

        // The fixture is built as four islands -- five, four, three and a hermit -- and the
        // session counts them independently of the algorithm, so the picture is held to the
        // element's own arithmetic rather than to a number written down here.
        const { components } = scene.session.data.statistics();

        await holds(
            components.count === 4,
            `Algorithms/Component ConnectedComponents: the fixture is four separate islands and the session ` +
                `counts ${String(components.count)}`,
        );

        await assertDrawnVariety(scene, "hex", 4);
        await assertDistinctPicture(scene, "Algorithms/Component");
    },
};

/**
 * Strongly Connected Components - for directed graphs
 * In a directed graph, an SCC is where every node can reach every other node
 *
 * This fixture has ten of them, which is more than any of the element's categorical palettes can
 * name -- the largest holds nine colours -- so the element falls back to a continuous palette
 * sampled once per piece rather than wrapping two pieces onto one colour. Every other community
 * story here is under that ceiling and keeps the eight-colour default.
 */
export const SCC: Story = createAlgorithmStory("graphty:scc", { paints: "node", paintsAtLeast: 20 });
