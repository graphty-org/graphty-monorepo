import type { Edge, Graph, Node, PositionMap } from "../../types";
import { getNodesFromGraph } from "../../utils/graph";
import { _processParams } from "../../utils/params";
import { RandomNumberGenerator } from "../../utils/random";
import { rescaleLayout } from "../../utils/rescale";

/**
 * Position nodes using the ForceAtlas2 force-directed algorithm.
 * @param G - Graph
 * @param pos - Initial positions for nodes
 * @param maxIter - Maximum number of iterations
 * @param jitterTolerance - Controls tolerance for node speed adjustments
 * @param scalingRatio - Scaling of attraction and repulsion forces
 * @param gravity - Attraction to center to prevent disconnected components from drifting
 * @param distributedAction - Distributes attraction force among nodes
 * @param strongGravity - Uses a stronger gravity model
 * @param nodeMass - Dictionary mapping nodes to their masses
 * @param nodeSize - Dictionary mapping nodes to their sizes
 * @param weight - Edge attribute for weight
 * @param _dissuadeHubs - Whether to prevent hub nodes from clustering (unused)
 * @param linlog - Whether to use logarithmic attraction
 * @param seed - Random seed for initial positions
 * @param dim - Dimension of layout
 * @returns Positions dictionary keyed by node
 */
export function forceatlas2Layout(
    G: Graph,
    pos: PositionMap | null = null,
    maxIter: number = 100,
    jitterTolerance: number = 1.0,
    scalingRatio: number = 2.0,
    gravity: number = 1.0,
    distributedAction: boolean = false,
    strongGravity: boolean = false,
    nodeMass: Record<Node, number> | null = null,
    nodeSize: Record<Node, number> | null = null,
    weight: string | null = null,
    _dissuadeHubs: boolean = false,
    linlog: boolean = false,
    seed: number | null = null,
    dim: number = 2,
): PositionMap {
    const processed = _processParams(G, null, dim);
    const graph = processed.G;

    const nodes = getNodesFromGraph(graph);

    if (nodes.length === 0) {
        return {};
    }

    // Initialize random number generator
    const rng = new RandomNumberGenerator(seed ?? undefined);

    // Initialize positions if not provided
    let posArray: number[][];
    if (pos === null) {
        pos = {};
        posArray = new Array(nodes.length);
        for (let i = 0; i < nodes.length; i++) {
            posArray[i] = Array(dim)
                .fill(0)
                .map(() => (rng.rand() as number) * 2 - 1);
            pos[nodes[i]] = posArray[i];
        }
    } else if (Object.keys(pos).length === nodes.length) {
        // Use provided positions
        posArray = new Array(nodes.length);
        for (let i = 0; i < nodes.length; i++) {
            const nodePos = pos[nodes[i]];
            posArray[i] = new Array(dim);
            for (let d = 0; d < dim; d++) {
                posArray[i][d] = d < nodePos.length ? nodePos[d] : (rng.rand() as number) * 2 - 1;
            }
        }
    } else {
        // Some nodes don't have positions, initialize within the range of existing positions
        const minPos: number[] = Array(dim).fill(Number.POSITIVE_INFINITY);
        const maxPos: number[] = Array(dim).fill(Number.NEGATIVE_INFINITY);

        // Find min and max of existing positions
        for (const node in pos) {
            const nodePos = pos[node];
            for (let d = 0; d < dim; d++) {
                if (d < nodePos.length) {
                    minPos[d] = Math.min(minPos[d], nodePos[d]);
                    maxPos[d] = Math.max(maxPos[d], nodePos[d]);
                }
            }
        }

        // If min/max are still infinity for some dimensions, use default range
        for (let d = 0; d < dim; d++) {
            if (!isFinite(minPos[d]) || !isFinite(maxPos[d])) {
                minPos[d] = -1;
                maxPos[d] = 1;
            }
        }

        posArray = new Array(nodes.length);
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (pos[node]) {
                const nodePos = pos[node];
                posArray[i] = new Array(dim);
                for (let d = 0; d < dim; d++) {
                    posArray[i][d] = d < nodePos.length ? nodePos[d] : (rng.rand() as number) * 2 - 1;
                }
            } else {
                posArray[i] = Array(dim)
                    .fill(0)
                    .map((_, d) => minPos[d] + (rng.rand() as number) * (maxPos[d] - minPos[d]));
                pos[node] = posArray[i];
            }
        }
    }

    // Initialize mass and size arrays
    const mass = new Array(nodes.length).fill(0);
    const size = new Array(nodes.length).fill(0);

    // Flag to track whether to adjust for node sizes
    const adjustSizes = nodeSize !== null;

    // Set node masses and sizes
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (nodeMass && nodeMass[node]) {
            mass[i] = nodeMass[node];
        } else if (Array.isArray(graph)) {
            mass[i] = 1;
        } else {
            mass[i] = getNodeDegree(graph, node) + 1;
        }

        size[i] = nodeSize && nodeSize[node] ? nodeSize[node] : 1;
    }

    // Create adjacency matrix
    const n = nodes.length;
    const A: number[][] = Array(n)
        .fill(0)
        .map(() => Array(n).fill(0) as number[]);

    // Populate adjacency matrix with edge weights
    const edges = Array.isArray(graph) ? ([] as Edge[]) : graph.edges();
    const nodeIndices: Record<Node, number> = {};
    nodes.forEach((node, i) => {
        nodeIndices[node] = i;
    });

    for (const [source, target] of edges) {
        const i = nodeIndices[source];
        const j = nodeIndices[target];

        // Use edge weight if provided, otherwise default to 1
        let edgeWeight = 1;
        if (weight && !Array.isArray(graph) && graph.getEdgeData) {
            edgeWeight = graph.getEdgeData(source, target, weight) || 1;
        }

        A[i][j] = edgeWeight;
        A[j][i] = edgeWeight; // For undirected graphs
    }

    // Initialize force arrays
    const gravities: number[][] = Array(n)
        .fill(0)
        .map(() => Array(dim).fill(0) as number[]);
    const attraction: number[][] = Array(n)
        .fill(0)
        .map(() => Array(dim).fill(0) as number[]);
    const repulsion: number[][] = Array(n)
        .fill(0)
        .map(() => Array(dim).fill(0) as number[]);

    // Simulation parameters
    let speed = 1;
    let speedEfficiency = 1;
    const _swing = 1;
    const _traction = 1;

    // Helper function to estimate factor for force scaling
    function estimateFactor(
        nodeCount: number,
        swingValue: number,
        tractionValue: number,
        currentSpeed: number,
        currentSpeedEfficiency: number,
        jitterToleranceParam: number,
    ): [number, number] {
        let resultSpeed = currentSpeed;
        let resultSpeedEfficiency = currentSpeedEfficiency;

        // Optimal jitter parameters
        const optJitter = 0.05 * Math.sqrt(nodeCount);
        const minJitter = Math.sqrt(optJitter);
        const maxJitter = 10;
        const minSpeedEfficiency = 0.05;

        // Estimate jitter based on current state
        const other = Math.min(maxJitter, (optJitter * tractionValue) / (nodeCount * nodeCount));
        let jitter = jitterToleranceParam * Math.max(minJitter, other);

        // Adjust speed efficiency based on swing/traction ratio
        if (swingValue / tractionValue > 2.0) {
            if (resultSpeedEfficiency > minSpeedEfficiency) {
                resultSpeedEfficiency *= 0.5;
            }
            jitter = Math.max(jitter, jitterToleranceParam);
        }

        // Calculate target speed
        const targetSpeed = swingValue === 0 ? Number.POSITIVE_INFINITY : (jitter * resultSpeedEfficiency * tractionValue) / swingValue;

        // Further adjust speed efficiency
        if (swingValue > jitter * tractionValue) {
            if (resultSpeedEfficiency > minSpeedEfficiency) {
                resultSpeedEfficiency *= 0.7;
            }
        } else if (resultSpeed < 1000) {
            resultSpeedEfficiency *= 1.3;
        }

        // Limit the speed increase
        const maxRise = 0.5;
        resultSpeed = resultSpeed + Math.min(targetSpeed - resultSpeed, maxRise * resultSpeed);

        return [resultSpeed, resultSpeedEfficiency];
    }

    // Main simulation loop
    for (let iter = 0; iter < maxIter; iter++) {
        // Reset forces for this iteration
        for (let i = 0; i < n; i++) {
            for (let d = 0; d < dim; d++) {
                attraction[i][d] = 0;
                repulsion[i][d] = 0;
                gravities[i][d] = 0;
            }
        }

        // Compute pairwise differences and distances
        const diff: number[][][] = Array(n)
            .fill(0)
            .map(() =>
                Array(n)
                    .fill(0)
                    .map(() => Array(dim).fill(0) as number[]),
            );

        const distance: number[][] = Array(n)
            .fill(0)
            .map(() => Array(n).fill(0) as number[]);

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) {continue;}

                for (let d = 0; d < dim; d++) {
                    diff[i][j][d] = posArray[i][d] - posArray[j][d];
                }

                distance[i][j] = Math.sqrt(diff[i][j].reduce((sum: number, d: number) => sum + d * d, 0));
                // Prevent division by zero
                if (distance[i][j] < 0.01) {distance[i][j] = 0.01;}
            }
        }

        // Calculate attraction forces
        if (linlog) {
            // Logarithmic attraction model
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j || A[i][j] === 0) {continue;}

                    const dist = distance[i][j];
                    const factor = (-Math.log(1 + dist) / dist) * A[i][j];

                    for (let d = 0; d < dim; d++) {
                        const force = factor * diff[i][j][d];
                        attraction[i][d] += force;
                    }
                }
            }
        } else {
            // Linear attraction model
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j || A[i][j] === 0) {continue;}

                    for (let d = 0; d < dim; d++) {
                        const force = -diff[i][j][d] * A[i][j];
                        attraction[i][d] += force;
                    }
                }
            }
        }

        // Apply distributed attraction if enabled
        if (distributedAction) {
            for (let i = 0; i < n; i++) {
                for (let d = 0; d < dim; d++) {
                    attraction[i][d] /= mass[i];
                }
            }
        }

        // Calculate repulsion forces
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) {continue;}

                let dist = distance[i][j];

                // Adjust distance for node sizes if needed
                if (adjustSizes) {
                    dist -= size[i] - size[j];
                    dist = Math.max(dist, 0.01); // Prevent negative or zero distances
                }

                const distSquared = dist * dist;
                const massProduct = mass[i] * mass[j];
                const factor = (massProduct / distSquared) * scalingRatio;

                for (let d = 0; d < dim; d++) {
                    const direction = diff[i][j][d] / dist;
                    repulsion[i][d] += direction * factor;
                }
            }
        }

        // Calculate gravity forces
        // First find the center of mass
        const centerOfMass: number[] = Array(dim).fill(0);
        for (let i = 0; i < n; i++) {
            for (let d = 0; d < dim; d++) {
                centerOfMass[d] += posArray[i][d] / n;
            }
        }

        for (let i = 0; i < n; i++) {
            const posCentered = Array(dim);
            for (let d = 0; d < dim; d++) {
                posCentered[d] = posArray[i][d] - centerOfMass[d];
            }

            if (strongGravity) {
                // Strong gravity model
                for (let d = 0; d < dim; d++) {
                    gravities[i][d] = -gravity * mass[i] * posCentered[d];
                }
            } else {
                // Regular gravity model
                const dist = Math.sqrt(posCentered.reduce((sum: number, val: number) => sum + val * val, 0));

                if (dist > 0.01) {
                    for (let d = 0; d < dim; d++) {
                        const direction = posCentered[d] / dist;
                        gravities[i][d] = -gravity * mass[i] * direction;
                    }
                }
            }
        }

        // Calculate total forces and update positions
        const update = Array(n)
            .fill(0)
            .map(() => Array(dim).fill(0));
        let totalSwing = 0;
        let totalTraction = 0;

        for (let i = 0; i < n; i++) {
            for (let d = 0; d < dim; d++) {
                update[i][d] = attraction[i][d] + repulsion[i][d] + gravities[i][d];
            }

            // Calculate swing and traction for this node
            const oldPos = [...posArray[i]];
            const newPos = oldPos.map((p, d) => p + (update[i][d] as number));

            const swingVector = oldPos.map((p, d) => p - newPos[d]);
            const tractionVector = oldPos.map((p, d) => p + newPos[d]);

            const swingMagnitude = Math.sqrt(swingVector.reduce((sum: number, val: number) => sum + val * val, 0));
            const tractionMagnitude = Math.sqrt(tractionVector.reduce((sum: number, val: number) => sum + val * val, 0));

            totalSwing += mass[i] * swingMagnitude;
            totalTraction += 0.5 * mass[i] * tractionMagnitude;
        }

        // Update speed and efficiency
        [speed, speedEfficiency] = estimateFactor(
            n,
            totalSwing,
            totalTraction,
            speed,
            speedEfficiency,
            jitterTolerance,
        );

        // Apply forces to update positions
        let totalMovement = 0;

        for (let i = 0; i < n; i++) {
            let factor;

            if (adjustSizes) {
                // Calculate displacement magnitude
                const df = Math.sqrt(update[i].reduce((sum: number, val: number) => sum + val * val, 0));
                const swinging = mass[i] * df;

                // Determine scaling factor with size adjustments
                factor = (0.1 * speed) / (1 + Math.sqrt(speed * swinging));
                factor = Math.min(factor * df, 10) / df;
            } else {
                // Standard scaling factor
                const swinging = (mass[i] as number) * Math.sqrt(update[i].reduce((sum: number, val: number) => sum + val * val, 0));
                factor = speed / (1 + Math.sqrt(speed * swinging));
            }

            // Apply factor to update position
            for (let d = 0; d < dim; d++) {
                const movement = update[i][d] * factor;
                posArray[i][d] += movement;
                totalMovement += Math.abs(movement);
            }
        }

        // Check for convergence
        if (totalMovement < 1e-10) {
            break;
        }
    }

    // Create position dictionary
    const positions: PositionMap = {};
    for (let i = 0; i < n; i++) {
        positions[nodes[i]] = posArray[i];
    }

    return rescaleLayout(positions) as PositionMap;
}

// Helper function to get node degree
function getNodeDegree(graph: Graph, node: Node): number {
    return graph.edges().filter((edge: Edge) => edge[0] === node || edge[1] === node).length;
}
