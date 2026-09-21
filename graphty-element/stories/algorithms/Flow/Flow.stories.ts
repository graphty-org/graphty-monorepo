import type { Graphty } from "../../../src/graphty-element";
import { algorithmMetaBase, createAlgorithmStory, type Story, templateCreator } from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Flow",
};
export default meta;

// Bipartite graph data: Job candidates ↔ Job positions
const bipartiteJobMatchingData = {
    nodes: [
        // Left partition: Job Candidates
        { id: "alice", label: "Alice", partition: "candidate" },
        { id: "bob", label: "Bob", partition: "candidate" },
        { id: "carol", label: "Carol", partition: "candidate" },
        { id: "dave", label: "Dave", partition: "candidate" },
        { id: "eve", label: "Eve", partition: "candidate" },
        { id: "frank", label: "Frank", partition: "candidate" },
        { id: "grace", label: "Grace", partition: "candidate" },
        // Right partition: Job Openings
        { id: "senior_dev", label: "Senior Dev", partition: "job" },
        { id: "ux_designer", label: "UX Designer", partition: "job" },
        { id: "backend", label: "Backend Eng", partition: "job" },
        { id: "data_sci", label: "Data Scientist", partition: "job" },
        { id: "tech_lead", label: "Tech Lead", partition: "job" },
        { id: "frontend", label: "Frontend Eng", partition: "job" },
        { id: "security", label: "Security Eng", partition: "job" },
    ],
    edges: [
        // Alice: experienced, qualifies for multiple roles
        { src: "alice", dst: "senior_dev" },
        { src: "alice", dst: "backend" },
        { src: "alice", dst: "frontend" },
        // Bob: UX specialist
        { src: "bob", dst: "ux_designer" },
        // Carol: backend focus
        { src: "carol", dst: "backend" },
        { src: "carol", dst: "senior_dev" },
        // Dave: data specialist
        { src: "dave", dst: "data_sci" },
        // Eve: management
        { src: "eve", dst: "tech_lead" },
        // Frank: frontend focus
        { src: "frank", dst: "frontend" },
        // Grace: security/systems
        { src: "grace", dst: "backend" },
        { src: "grace", dst: "security" },
        { src: "grace", dst: "senior_dev" },
    ],
};

// Directed flow network: a municipal water supply. Capacities are megalitres/day.
//
// The cat social network the other stories use is undirected and has no capacities, so
// max flow across it is 0 -- every edge renders blues(0), which is #f7fbff and invisible.
// This network is built to demonstrate the algorithm instead:
//   - max flow is 26, and the flow assignment is unique
//   - the bottleneck is the three plant -> city mains, which all saturate
//   - the reservoir -> pump mains keep spare capacity, so utilisation varies
//   - every edge carries between 4 and 9, so no edge lands on blues(0) and disappears
const waterSupplyNetworkData = {
    nodes: [
        { id: "reservoir", label: "Reservoir", tier: "source" },
        { id: "pump_north", label: "North Pump", tier: "pump" },
        { id: "pump_central", label: "Central Pump", tier: "pump" },
        { id: "pump_south", label: "South Pump", tier: "pump" },
        { id: "plant_east", label: "East Plant", tier: "plant" },
        { id: "plant_west", label: "West Plant", tier: "plant" },
        { id: "plant_hill", label: "Hilltop Plant", tier: "plant" },
        { id: "city", label: "City", tier: "sink" },
    ],
    edges: [
        // reservoir -> pumps: sized above demand, so these run below capacity
        { src: "reservoir", dst: "pump_north", capacity: 11 },
        { src: "reservoir", dst: "pump_central", capacity: 10 },
        { src: "reservoir", dst: "pump_south", capacity: 12 },
        // pumps -> plants: each plant's intake exactly matches its outflow main
        { src: "pump_north", dst: "plant_east", capacity: 5 },
        { src: "pump_north", dst: "plant_west", capacity: 4 },
        { src: "pump_central", dst: "plant_east", capacity: 4 },
        { src: "pump_central", dst: "plant_hill", capacity: 4 },
        { src: "pump_south", dst: "plant_west", capacity: 5 },
        { src: "pump_south", dst: "plant_hill", capacity: 4 },
        // plants -> city: the min cut, 9 + 9 + 8 = 26
        { src: "plant_east", dst: "city", capacity: 9 },
        { src: "plant_west", dst: "city", capacity: 9 },
        { src: "plant_hill", dst: "city", capacity: 8 },
    ],
};

/**
 * Bipartite Matching - maximum matching in bipartite graphs
 * Demonstrates job candidate ↔ job position matching
 * Matched edges are highlighted in purple (thick)
 * Left partition (candidates) are blue, right partition (jobs) are red
 * Non-matched edges are dimmed gray
 */
export const BipartiteMatching: Story = {
    args: {
        dataSource: undefined,
        nodeData: bipartiteJobMatchingData.nodes,
        edgeData: bipartiteJobMatchingData.edges,
        styleTemplate: templateCreator({
            graph: {
                viewMode: "2d",
                layout: "bipartite",
                layoutOptions: {
                    nodes: ["alice", "bob", "carol", "dave", "eve", "frank", "grace"],
                    align: "horizontal",
                    aspectRatio: 1.5,
                },
            },
            algorithms: ["graphty:bipartite-matching"],
            layers: [
                {
                    edge: {
                        selector: 'algorithmResults.graphty."bipartite-matching".inMatching == `false`',
                        style: { enabled: true, line: { color: "#CCCCCC", opacity: 0.3 } },
                    },
                    metadata: { name: "Reader - dim non-matched edges" },
                },
            ],
        }),
        runAlgorithmsOnLoad: true,
    },
    play: async ({ canvasElement }) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const element = canvasElement.querySelector("graphty-element");
        if (!element) {
            return;
        }

        const graphtyElement = element as Graphty;
        const { graph } = graphtyElement;
        const dm = graph.getDataManager();
        const layoutManager = graph.getLayoutManager();

        // Run the algorithm explicitly (runAlgorithmsOnLoad may not trigger for all data sources)
        await graph.runAlgorithmsFromTemplate();

        // Store current positions before style application (applyStylesToExistingNodes resets them)
        const savedPositions = new Map<string, { x: number; y: number; z: number }>();
        for (const [id, node] of dm.nodes) {
            savedPositions.set(String(id), {
                x: node.mesh.position.x,
                y: node.mesh.position.y,
                z: node.mesh.position.z,
            });
        }

        // Apply suggested styles
        graph.applySuggestedStyles("graphty:bipartite-matching");

        // Apply styles to existing elements (this will reset positions - bug)
        dm.applyStylesToExistingNodes();
        dm.applyStylesToExistingEdges();

        // Restore positions after style application
        for (const [id, node] of dm.nodes) {
            const savedPos = savedPositions.get(String(id));
            if (savedPos) {
                node.mesh.position.x = savedPos.x;
                node.mesh.position.y = savedPos.y;
                node.mesh.position.z = savedPos.z;
            }
        }

        // Update edge geometry to reflect new node positions
        for (const edge of layoutManager.edges) {
            edge.update();
        }
    },
};

/**
 * Max Flow - network flow visualization on a water supply network
 * Edge width is proportional to the flow carried, and colour intensity with it
 * (light -> dark blue), so the saturated plant -> city mains read darkest and widest
 * Source node (Reservoir) is orange, sink node (City) is sky blue
 * Max flow is 26 megalitres/day; the three plant -> city mains are the bottleneck
 */
export const MaxFlow: Story = {
    args: {
        dataSource: undefined,
        nodeData: waterSupplyNetworkData.nodes,
        edgeData: waterSupplyNetworkData.edges,
        styleTemplate: templateCreator({
            // the node names carry the demonstration, so show them
            nodeStyle: { label: { enabled: true, textPath: "label" } },
            graph: {
                viewMode: "2d",
                layout: "multipartite",
                layoutOptions: {
                    subsetKey: {
                        "0": ["reservoir"],
                        "1": ["pump_north", "pump_central", "pump_south"],
                        "2": ["plant_east", "plant_west", "plant_hill"],
                        "3": ["city"],
                    },
                    align: "vertical",
                },
            },
            algorithms: ["graphty:max-flow"],
        }),
        runAlgorithmsOnLoad: true,
    },
    play: async ({ canvasElement }) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const element = canvasElement.querySelector("graphty-element");
        if (!element) {
            return;
        }

        const { graph } = element as Graphty;

        // Name the endpoints. The algorithm otherwise defaults to the first and last node in
        // insertion order, which is only ever the right pair by accident.
        await graph.runAlgorithm("graphty", "max-flow", {
            algorithmOptions: { source: "reservoir", sink: "city" },
            applySuggestedStyles: true,
        });

        const dm = graph.getDataManager();
        dm.applyStylesToExistingNodes();
        dm.applyStylesToExistingEdges();
    },
};

/**
 * Min Cut - minimum cut visualization
 * Cut edges are highlighted in orange
 * Partition 1 nodes are blue, partition 2 nodes are red
 * Non-cut edges are dimmed
 */
export const MinCut: Story = createAlgorithmStory("graphty:min-cut", [
    /*
     * The reader's own layer, beneath the algorithm's: every edge pale, so the ones the cut
     * chose stand out when the algorithm's layer repaints them on top. It greys EVERY edge
     * rather than naming the ones outside the cut, because an edge the cut left out is not the
     * cut's to paint, and naming "the rest" would need the id of a run that has not started when
     * this story is written.
     */
    {
        name: "Reader - dim every edge",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#CCCCCC" },
    },
]);
