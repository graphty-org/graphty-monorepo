import {
    assertAlgorithmPainted,
    assertDistinctPicture,
    assertDrawnVariety,
    assertGraphLoaded,
    drawn,
    holds,
} from "../../assertions";
import {
    algorithmMetaBase,
    createAlgorithmStory,
    documented,
    onLoadSource,
    page,
    type Story,
    storySetup,
    waitForGraphSettled,
} from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Connected components",
    id: "algorithms-component",
    tags: ["autodocs"],
    parameters: {
        ...algorithmMetaBase.parameters,
        docs: {
            description: {
                component:
                    "A connected component is a piece of the graph that no edge joins to any other piece. " +
                    "graphty-element colors each node by the piece it is in. For a directed graph, a strongly " +
                    "connected component is a piece in which every node can reach every other by following the " +
                    "edges' directions. When there are more pieces than the palette has colors, the smallest " +
                    'share one gray, named "other" in the legend.',
            },
        },
    },
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
 * Connected components: the separate pieces of a graph.
 * This dataset has 4 components: Tech Startup (5), Research Lab (4), Book Club (3), Hermit (1).
 */
export const ConnectedComponents: Story = {
    name: "Connected components",
    ...documented(
        {
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

                const { graph } = element;

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
        },
        {
            caption:
                "Four groups with no ties between them (a startup of 5, a research lab of 4, a book club of 3 and a " +
                'hermit); each node is colored by its group. Set algorithmsOnLoad = ["connected-components"].',
            code: page([
                "    graph.nodeData = nodes; // four groups of people with no ties between them",
                "    graph.edgeData = edges;",
                '    graph.layout = "ngraph";',
                "    graph.layoutConfig = { seed: 42 };",
                '    graph.algorithmsOnLoad = ["connected-components"];',
                "    graph.runAlgorithmsOnLoad = true;",
            ]),
        },
    ),
};

/**
 * Strongly connected components: in a directed graph, the pieces in which every node can reach
 * every other by following edge directions.
 *
 * The cat network has ten of them, more than the eight colors of the default palette, so the two
 * smallest share the gray that the legend lists as "other".
 */
export const SCC: Story = {
    name: "Strongly connected components",
    ...documented(createAlgorithmStory("graphty:scc", { paints: "node", paintsAtLeast: 20 }), {
        caption:
            "Following the friendships as one-way edges, the cats form ten groups in which everyone can reach " +
            'everyone else; each node is colored by its group. Set algorithmsOnLoad = ["scc"].',
        code: onLoadSource('["scc"]'),
    }),
};
