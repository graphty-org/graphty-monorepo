/**
 * Layout Helper Functions
 * =======================
 *
 * Essential utilities for graph layouts
 */
/**
 * Universal Node Grouping
 * =======================
 * Groups nodes for shell, multipartite, or custom layouts
 */
/**
 * Group nodes by various centrality measures.
 * Works for shell layout, multipartite layout, or any grouping need.
 *
 * @param graph - Input graph
 * @param method - Grouping method
 * @param numGroups - Number of groups to create
 * @returns Array of node arrays (groups)
 *
 * @example
 * // For shell layout
 * const shells = groupNodes(graph, 'degree', 3);
 * const positions = shellLayout(graph, shells);
 *
 * // For multipartite layout
 * const layers = groupNodes(graph, 'bfs', 0); // 0 = auto
 * const positions = multipartiteLayout(graph, layers);
 */
export function groupNodes(graph, method = 'degree', numGroups = 3, options = {}) {
    const nodes = graph.nodes?.() || [];
    const edges = graph.edges?.() || [];
    switch (method) {
        case 'degree':
            return groupByDegree(nodes, edges, numGroups);
        case 'bfs':
            return groupByDistance(nodes, edges, options.root);
        case 'k-core':
            return groupByKCore(nodes, edges);
        case 'community':
            return groupByCommunity(nodes, edges, numGroups);
        default:
            return [nodes]; // Single group fallback
    }
}
/**
 * Bipartite Detection & Handling
 * ==============================
 */
/**
 * Detect if graph is bipartite and find the two sets.
 *
 * @param graph - Input graph
 * @returns Bipartite sets or null if not bipartite
 *
 * @example
 * const result = detectBipartite(graph);
 * if (result) {
 *   const positions = bipartiteLayout(graph, result.setA);
 * }
 */
export function detectBipartite(graph) {
    const nodes = graph.nodes?.() || [];
    const edges = graph.edges?.() || [];
    if (nodes.length === 0)
        return { setA: [], setB: [] };
    // Build adjacency list
    const adj = new Map();
    nodes.forEach(node => adj.set(node, []));
    edges.forEach(([u, v]) => {
        adj.get(u).push(v);
        adj.get(v).push(u);
    });
    // Try to 2-color the graph
    const colors = new Map();
    for (const start of nodes) {
        if (colors.has(start))
            continue;
        const queue = [start];
        colors.set(start, 0);
        while (queue.length > 0) {
            const node = queue.shift();
            const nodeColor = colors.get(node);
            for (const neighbor of adj.get(node)) {
                if (!colors.has(neighbor)) {
                    colors.set(neighbor, 1 - nodeColor);
                    queue.push(neighbor);
                }
                else if (colors.get(neighbor) === nodeColor) {
                    return null; // Not bipartite
                }
            }
        }
    }
    // Separate into sets
    const setA = [];
    const setB = [];
    nodes.forEach(node => {
        if (colors.get(node) === 0)
            setA.push(node);
        else
            setB.push(node);
    });
    return { setA, setB };
}
/**
 * Layout Analysis & Optimization
 * ==============================
 */
/**
 * Find the best root node for tree-like layouts (BFS, hierarchical).
 *
 * @param graph - Input graph
 * @returns Best root node
 */
export function findBestRoot(graph) {
    const nodes = graph.nodes?.() || [];
    const edges = graph.edges?.() || [];
    if (nodes.length === 0)
        return null;
    // Build adjacency list
    const adj = new Map();
    nodes.forEach(node => adj.set(node, new Set()));
    edges.forEach(([u, v]) => {
        adj.get(u).add(v);
        adj.get(v).add(u);
    });
    // Find node with minimum eccentricity (center of graph)
    let bestNode = nodes[0];
    let bestEccentricity = Infinity;
    for (const start of nodes) {
        // BFS to find max distance
        const distances = new Map();
        const queue = [start];
        distances.set(start, 0);
        let maxDist = 0;
        while (queue.length > 0) {
            const node = queue.shift();
            const dist = distances.get(node);
            adj.get(node).forEach(neighbor => {
                if (!distances.has(neighbor)) {
                    distances.set(neighbor, dist + 1);
                    maxDist = Math.max(maxDist, dist + 1);
                    queue.push(neighbor);
                }
            });
        }
        if (maxDist < bestEccentricity) {
            bestEccentricity = maxDist;
            bestNode = start;
        }
    }
    return bestNode;
}
/**
 * Check if a graph is planar (can be drawn without edge crossings).
 *
 * @param graph - Input graph
 * @returns true if planar
 */
export function isPlanar(graph) {
    const n = graph.nodes?.()?.length || 0;
    const m = graph.edges?.()?.length || 0;
    // Quick check: Euler's formula
    if (n >= 3 && m > 3 * n - 6)
        return false;
    // For accurate check, would need to try planarLayout
    // This is a simplified heuristic
    return true;
}
/**
 * Auto-configure force-directed layout parameters.
 *
 * @param graph - Input graph
 * @returns Recommended parameters
 */
export function autoConfigureForce(graph) {
    const n = graph.nodes?.()?.length || 0;
    const m = graph.edges?.()?.length || 0;
    const density = n > 1 ? (2 * m) / (n * (n - 1)) : 0;
    return {
        k: Math.sqrt(1 / n), // Fruchterman-Reingold optimal distance
        iterations: n < 50 ? 500 : n < 200 ? 300 : 200,
        gravity: density < 0.1 ? 0.5 : density < 0.3 ? 1.0 : 2.0,
        scalingRatio: n < 50 ? 2.0 : n < 200 ? 5.0 : 10.0
    };
}
/**
 * Layout Quality Metrics
 * ======================
 */
/**
 * Calculate simple layout quality metrics.
 *
 * @param graph - Input graph
 * @param positions - Layout positions
 * @returns Quality metrics
 */
export function layoutQuality(graph, positions) {
    const nodes = graph.nodes?.() || [];
    const edges = graph.edges?.() || [];
    // Edge lengths
    const edgeLengths = edges.map(([u, v]) => {
        const p1 = positions[u];
        const p2 = positions[v];
        return Math.sqrt(p1.reduce((sum, val, i) => sum + (val - p2[i]) ** 2, 0));
    });
    const avgEdgeLength = edgeLengths.reduce((a, b) => a + b, 0) / edgeLengths.length || 0;
    const variance = edgeLengths.reduce((sum, len) => sum + (len - avgEdgeLength) ** 2, 0) / edgeLengths.length || 0;
    const edgeLengthStdDev = Math.sqrt(variance);
    // Minimum node distance
    let minNodeDistance = Infinity;
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const p1 = positions[nodes[i]];
            const p2 = positions[nodes[j]];
            const dist = Math.sqrt(p1.reduce((sum, val, k) => sum + (val - p2[k]) ** 2, 0));
            minNodeDistance = Math.min(minNodeDistance, dist);
        }
    }
    // Bounding box and aspect ratio
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    nodes.forEach(node => {
        const [x, y] = positions[node];
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    });
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const aspectRatio = Math.max(width, height) / Math.min(width, height);
    return {
        avgEdgeLength,
        edgeLengthStdDev,
        minNodeDistance: minNodeDistance === Infinity ? 0 : minNodeDistance,
        aspectRatio
    };
}
/**
 * Layout Utilities
 * ================
 */
/**
 * Combine multiple layouts with weights.
 *
 * @param layouts - Array of position maps
 * @param weights - Weight for each layout (default: equal)
 * @returns Combined positions
 */
export function combineLayouts(layouts, weights) {
    if (layouts.length === 0)
        return {};
    const w = weights || new Array(layouts.length).fill(1 / layouts.length);
    const result = {};
    const nodes = Object.keys(layouts[0]);
    nodes.forEach(node => {
        const dim = layouts[0][node].length;
        result[node] = new Array(dim).fill(0);
        layouts.forEach((layout, i) => {
            if (node in layout) {
                for (let d = 0; d < dim; d++) {
                    result[node][d] += layout[node][d] * w[i];
                }
            }
        });
    });
    return result;
}
/**
 * Create smooth animation frames between layouts.
 *
 * @param from - Starting positions
 * @param to - Ending positions
 * @param steps - Number of frames
 * @returns Array of position maps
 */
export function interpolateLayouts(from, to, steps = 10) {
    const frames = [];
    const nodes = Object.keys(from);
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const frame = {};
        nodes.forEach(node => {
            if (node in to) {
                frame[node] = from[node].map((val, d) => val + t * (to[node][d] - val));
            }
        });
        frames.push(frame);
    }
    return frames;
}
/**
 * Internal Helper Functions
 * =========================
 */
function groupByDegree(nodes, edges, numGroups) {
    // Calculate degrees
    const degrees = new Map();
    nodes.forEach(node => degrees.set(node, 0));
    edges.forEach(([u, v]) => {
        degrees.set(u, degrees.get(u) + 1);
        degrees.set(v, degrees.get(v) + 1);
    });
    // Sort by degree
    const sorted = nodes.slice().sort((a, b) => degrees.get(b) - degrees.get(a));
    // Distribute into groups
    const groups = new Array(numGroups).fill(null).map(() => []);
    const nodesPerGroup = Math.ceil(nodes.length / numGroups);
    sorted.forEach((node, i) => {
        const groupIdx = Math.floor(i / nodesPerGroup);
        if (groupIdx < numGroups) {
            groups[groupIdx].push(node);
        }
    });
    return groups.filter(g => g.length > 0);
}
function groupByDistance(nodes, edges, root) {
    if (nodes.length === 0)
        return [];
    const start = root || nodes[0];
    const adj = new Map();
    nodes.forEach(node => adj.set(node, []));
    edges.forEach(([u, v]) => {
        adj.get(u).push(v);
        adj.get(v).push(u);
    });
    // BFS layers
    const visited = new Set();
    const layers = [];
    let currentLayer = [start];
    visited.add(start);
    while (currentLayer.length > 0) {
        layers.push(currentLayer.slice());
        const nextLayer = [];
        currentLayer.forEach(node => {
            adj.get(node).forEach(neighbor => {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    nextLayer.push(neighbor);
                }
            });
        });
        currentLayer = nextLayer;
    }
    // Add disconnected nodes
    const unvisited = nodes.filter(n => !visited.has(n));
    if (unvisited.length > 0) {
        layers.push(unvisited);
    }
    return layers;
}
function groupByKCore(nodes, edges) {
    // Build adjacency
    const adj = new Map();
    const degree = new Map();
    nodes.forEach(node => {
        adj.set(node, new Set());
        degree.set(node, 0);
    });
    edges.forEach(([u, v]) => {
        adj.get(u).add(v);
        adj.get(v).add(u);
        degree.set(u, degree.get(u) + 1);
        degree.set(v, degree.get(v) + 1);
    });
    // k-core decomposition
    const coreNumber = new Map();
    const remaining = new Set(nodes);
    while (remaining.size > 0) {
        // Find minimum degree
        let minDegree = Infinity;
        remaining.forEach(node => {
            minDegree = Math.min(minDegree, degree.get(node));
        });
        // Remove nodes with degree <= minDegree
        const toRemove = [];
        remaining.forEach(node => {
            if (degree.get(node) <= minDegree) {
                toRemove.push(node);
            }
        });
        while (toRemove.length > 0) {
            const node = toRemove.shift();
            coreNumber.set(node, minDegree);
            remaining.delete(node);
            adj.get(node).forEach(neighbor => {
                if (remaining.has(neighbor)) {
                    degree.set(neighbor, degree.get(neighbor) - 1);
                    if (degree.get(neighbor) <= minDegree && !toRemove.includes(neighbor)) {
                        toRemove.push(neighbor);
                    }
                }
            });
        }
    }
    // Group by core number
    const groups = new Map();
    nodes.forEach(node => {
        const core = coreNumber.get(node);
        if (!groups.has(core))
            groups.set(core, []);
        groups.get(core).push(node);
    });
    // Return sorted by core number (highest first)
    return Array.from(groups.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([, nodeList]) => nodeList);
}
function groupByCommunity(nodes, edges, targetGroups) {
    // Fast community detection using label propagation
    const communities = new Map();
    const adj = new Map();
    
    // Initialize each node in its own community
    nodes.forEach((node, i) => {
        communities.set(node, i);
        adj.set(node, new Set());
    });
    
    // Build adjacency
    edges.forEach(([u, v]) => {
        adj.get(u).add(v);
        adj.get(v).add(u);
    });
    
    // Label propagation algorithm
    const maxIterations = 10; // Prevent infinite loops
    for (let iter = 0; iter < maxIterations; iter++) {
        let changed = false;
        
        // Process nodes in random order
        const shuffledNodes = nodes.slice().sort(() => Math.random() - 0.5);
        
        for (const node of shuffledNodes) {
            const neighbors = adj.get(node);
            if (neighbors.size === 0) continue;
            
            // Count community frequencies among neighbors
            const commCounts = new Map();
            neighbors.forEach(neighbor => {
                const comm = communities.get(neighbor);
                commCounts.set(comm, (commCounts.get(comm) || 0) + 1);
            });
            
            // Find most frequent community
            let maxCount = 0;
            let bestComm = communities.get(node);
            commCounts.forEach((count, comm) => {
                if (count > maxCount || (count === maxCount && comm < bestComm)) {
                    maxCount = count;
                    bestComm = comm;
                }
            });
            
            if (bestComm !== communities.get(node)) {
                communities.set(node, bestComm);
                changed = true;
            }
        }
        
        if (!changed) break;
    }
    
    // Consolidate communities
    const groups = new Map();
    communities.forEach((comm, node) => {
        if (!groups.has(comm)) groups.set(comm, []);
        groups.get(comm).push(node);
    });
    
    let result = Array.from(groups.values());
    
    // If we have too many groups, merge the smallest ones
    while (result.length > targetGroups && result.length > 1) {
        // Sort by size
        result.sort((a, b) => a.length - b.length);
        // Merge two smallest groups
        const merged = result[0].concat(result[1]);
        result = [merged, ...result.slice(2)];
    }
    
    return result;
}
//# sourceMappingURL=layout-helpers.js.map