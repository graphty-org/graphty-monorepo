// Helper file to make functions available globally for button onclick handlers
import {
    randomLayout,
    circularLayout,
    shellLayout,
    springLayout,
    fruchtermanReingoldLayout,
    spectralLayout,
    spiralLayout,
    bipartiteLayout,
    multipartiteLayout,
    bfsLayout,
    planarLayout,
    kamadaKawaiLayout,
    forceatlas2Layout,
    arfLayout,
    rescaleLayout,
    rescaleLayoutDict,
} from "../dist/layout.js";

// Make layout functions available globally
window.randomLayout = randomLayout;
window.circularLayout = circularLayout;
window.shellLayout = shellLayout;
window.springLayout = springLayout;
window.fruchtermanReingoldLayout = fruchtermanReingoldLayout;
window.spectralLayout = spectralLayout;
window.spiralLayout = spiralLayout;
window.bipartiteLayout = bipartiteLayout;
window.multipartiteLayout = multipartiteLayout;
window.bfsLayout = bfsLayout;
window.planarLayout = planarLayout;
window.kamadaKawaiLayout = kamadaKawaiLayout;
window.forceatlas2Layout = forceatlas2Layout;
window.arfLayout = arfLayout;
window.rescaleLayout = rescaleLayout;
window.rescaleLayoutDict = rescaleLayoutDict;

// Helper functions for multipartite layout
export function findBestRoot(graph) {
    // Find node with highest degree as root
    const nodes = graph.nodes();
    let bestRoot = nodes[0];
    let maxDegree = 0;

    for (const node of nodes) {
        const edges = graph.edges();
        const degree = edges.filter(([s, t]) => s === node || t === node).length;
        if (degree > maxDegree) {
            maxDegree = degree;
            bestRoot = node;
        }
    }

    return bestRoot;
}

export function groupNodes(graph, method = "bfs", numLayers = 0, options = {}) {
    const nodes = graph.nodes();
    const edges = graph.edges();

    // Build adjacency list
    const neighbors = {};
    for (const node of nodes) {
        neighbors[node] = [];
    }
    for (const [source, target] of edges) {
        neighbors[source].push(target);
        neighbors[target].push(source);
    }

    let layers = [];

    if (method === "bfs") {
        // BFS-based layering
        const root = options.root || nodes[0];
        const visited = new Set();
        let currentLayer = [root];
        visited.add(root);

        while (currentLayer.length > 0) {
            layers.push(currentLayer);
            const nextLayer = [];

            for (const node of currentLayer) {
                for (const neighbor of neighbors[node]) {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        nextLayer.push(neighbor);
                    }
                }
            }

            currentLayer = nextLayer;
        }

        // Add any unvisited nodes to the last layer
        const unvisited = nodes.filter((n) => !visited.has(n));
        if (unvisited.length > 0) {
            layers.push(unvisited);
        }
    } else if (method === "degree") {
        // Sort nodes by degree
        const nodesByDegree = nodes
            .map((node) => ({
                node,
                degree: neighbors[node].length,
            }))
            .sort((a, b) => b.degree - a.degree);

        // Split into layers
        const layerSize = Math.ceil(nodes.length / (numLayers || 3));
        for (let i = 0; i < nodesByDegree.length; i += layerSize) {
            layers.push(nodesByDegree.slice(i, i + layerSize).map((item) => item.node));
        }
    } else if (method === "community") {
        // Simple community detection: group nodes that share many neighbors
        const communities = [];
        const assigned = new Set();

        for (const node of nodes) {
            if (assigned.has(node)) continue;

            const community = [node];
            assigned.add(node);

            // Add nodes that share at least half their neighbors
            for (const other of nodes) {
                if (assigned.has(other)) continue;

                const sharedNeighbors = neighbors[node].filter((n) => neighbors[other].includes(n)).length;

                if (sharedNeighbors > Math.min(neighbors[node].length, neighbors[other].length) / 2) {
                    community.push(other);
                    assigned.add(other);
                }
            }

            communities.push(community);
        }

        // Merge small communities if needed
        while (communities.length > (numLayers || 3)) {
            // Find smallest community
            let minIdx = 0;
            let minSize = communities[0].length;
            for (let i = 1; i < communities.length; i++) {
                if (communities[i].length < minSize) {
                    minSize = communities[i].length;
                    minIdx = i;
                }
            }

            // Merge with another community
            const toMerge = communities.splice(minIdx, 1)[0];
            communities[0].push(...toMerge);
        }

        layers = communities;
    }

    return layers;
}

// Helper function for ForceAtlas2 auto-configuration
export function autoConfigureForce(graph) {
    const nodes = graph.nodes();
    const edges = graph.edges();
    const numNodes = nodes.length;
    const numEdges = edges.length;

    // Calculate average degree
    const avgDegree = numEdges > 0 ? (2 * numEdges) / numNodes : 0;

    // Calculate density
    const maxPossibleEdges = (numNodes * (numNodes - 1)) / 2;
    const density = maxPossibleEdges > 0 ? numEdges / maxPossibleEdges : 0;

    // Auto-configure parameters based on graph properties
    let iterations = 100;
    let scalingRatio = 2.0;
    let gravity = 1.0;

    // Adjust iterations based on graph size
    if (numNodes < 50) {
        iterations = 100;
    } else if (numNodes < 500) {
        iterations = 200;
    } else if (numNodes < 5000) {
        iterations = 500;
    } else {
        iterations = 1000;
    }

    // Adjust scaling ratio based on density
    if (density < 0.01) {
        // Very sparse graph - more spread
        scalingRatio = 10.0;
    } else if (density < 0.1) {
        // Sparse graph
        scalingRatio = 5.0;
    } else if (density < 0.3) {
        // Medium density
        scalingRatio = 2.0;
    } else {
        // Dense graph - less spread
        scalingRatio = 1.0;
    }

    // Adjust gravity based on graph connectivity
    if (avgDegree < 2) {
        // Low connectivity - stronger gravity to keep components together
        gravity = 2.0;
    } else if (avgDegree < 5) {
        gravity = 1.0;
    } else {
        // High connectivity - less gravity needed
        gravity = 0.5;
    }

    return {
        iterations,
        scalingRatio,
        gravity,
    };
}
