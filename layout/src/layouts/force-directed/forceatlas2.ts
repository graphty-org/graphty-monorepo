import type { Graph, Node, Edge, PositionMap } from '../../types';
import { getNodesFromGraph, getEdgesFromGraph } from '../../utils/graph';
import { _processParams } from '../../utils/params';
import { rescaleLayout } from '../../utils/rescale';
import { RandomNumberGenerator } from '../../utils/random';

/**
 * Position nodes using the ForceAtlas2 force-directed algorithm.
 * 
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
 * @param dissuadeHubs - Whether to prevent hub nodes from clustering
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
  dissuadeHubs: boolean = false,
  linlog: boolean = false,
  seed: number | null = null,
  dim: number = 2
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
      posArray[i] = Array(dim).fill(0).map(() => rng.rand() as number * 2 - 1);
      pos[nodes[i]] = posArray[i];
    }
  } else if (Object.keys(pos).length === nodes.length) {
    // Use provided positions
    posArray = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      posArray[i] = [...pos[nodes[i]]];
    }
  } else {
    // Some nodes don't have positions, initialize within the range of existing positions
    let minPos = Array(dim).fill(Number.POSITIVE_INFINITY);
    let maxPos = Array(dim).fill(Number.NEGATIVE_INFINITY);

    // Find min and max of existing positions
    for (const node in pos) {
      for (let d = 0; d < dim; d++) {
        minPos[d] = Math.min(minPos[d], pos[node][d]);
        maxPos[d] = Math.max(maxPos[d], pos[node][d]);
      }
    }

    posArray = new Array(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (pos[node]) {
        posArray[i] = [...pos[node]];
      } else {
        posArray[i] = Array(dim).fill(0).map((_, d) =>
          minPos[d] + (rng.rand() as number) * (maxPos[d] - minPos[d])
        );
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
    mass[i] = nodeMass && nodeMass[node] ?
      nodeMass[node] :
      (Array.isArray(graph) ? 1 : getNodeDegree(graph, node) + 1);

    size[i] = nodeSize && nodeSize[node] ? nodeSize[node] : 1;
  }

  // Create adjacency matrix
  const n = nodes.length;
  const A = Array(n).fill(0).map(() => Array(n).fill(0));

  // Populate adjacency matrix with edge weights
  const edges = Array.isArray(graph) ? [] as Edge[] : graph.edges();
  const nodeIndices: Record<Node, number> = {};
  nodes.forEach((node, i) => { nodeIndices[node] = i; });

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
  const gravities = Array(n).fill(0).map(() => Array(dim).fill(0));
  const attraction = Array(n).fill(0).map(() => Array(dim).fill(0));
  const repulsion = Array(n).fill(0).map(() => Array(dim).fill(0));

  // Simulation parameters
  let speed = 1;
  let speedEfficiency = 1;
  let swing = 1;
  let traction = 1;

  // Helper function to estimate factor for force scaling
  function estimateFactor(
    n: number,
    swing: number,
    traction: number,
    speed: number,
    speedEfficiency: number,
    jitterTolerance: number
  ): [number, number] {
    // Optimal jitter parameters
    const optJitter = 0.05 * Math.sqrt(n);
    const minJitter = Math.sqrt(optJitter);
    const maxJitter = 10;
    const minSpeedEfficiency = 0.05;

    // Estimate jitter based on current state
    const other = Math.min(maxJitter, optJitter * traction / (n * n));
    let jitter = jitterTolerance * Math.max(minJitter, other);

    // Adjust speed efficiency based on swing/traction ratio
    if (swing / traction > 2.0) {
      if (speedEfficiency > minSpeedEfficiency) {
        speedEfficiency *= 0.5;
      }
      jitter = Math.max(jitter, jitterTolerance);
    }

    // Calculate target speed
    let targetSpeed = swing === 0 ?
      Number.POSITIVE_INFINITY :
      jitter * speedEfficiency * traction / swing;

    // Further adjust speed efficiency
    if (swing > jitter * traction) {
      if (speedEfficiency > minSpeedEfficiency) {
        speedEfficiency *= 0.7;
      }
    } else if (speed < 1000) {
      speedEfficiency *= 1.3;
    }

    // Limit the speed increase
    const maxRise = 0.5;
    speed = speed + Math.min(targetSpeed - speed, maxRise * speed);

    return [speed, speedEfficiency];
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
    const diff = Array(n).fill(0).map(() =>
      Array(n).fill(0).map(() => Array(dim).fill(0))
    );

    const distance = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;

        for (let d = 0; d < dim; d++) {
          diff[i][j][d] = posArray[i][d] - posArray[j][d];
        }

        distance[i][j] = Math.sqrt(diff[i][j].reduce((sum, d) => sum + d * d, 0));
        // Prevent division by zero
        if (distance[i][j] < 0.01) distance[i][j] = 0.01;
      }
    }

    // Calculate attraction forces
    if (linlog) {
      // Logarithmic attraction model
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j || A[i][j] === 0) continue;

          const dist = distance[i][j];
          const factor = -Math.log(1 + dist) / dist * A[i][j];

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
          if (i === j || A[i][j] === 0) continue;

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
        if (i === j) continue;

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
    const centerOfMass = Array(dim).fill(0);
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
        const dist = Math.sqrt(posCentered.reduce((sum, val) => sum + val * val, 0));

        if (dist > 0.01) {
          for (let d = 0; d < dim; d++) {
            const direction = posCentered[d] / dist;
            gravities[i][d] = -gravity * mass[i] * direction;
          }
        }
      }
    }

    // Calculate total forces and update positions
    const update = Array(n).fill(0).map(() => Array(dim).fill(0));
    let totalSwing = 0;
    let totalTraction = 0;

    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dim; d++) {
        update[i][d] = attraction[i][d] + repulsion[i][d] + gravities[i][d];
      }

      // Calculate swing and traction for this node
      const oldPos = [...posArray[i]];
      const newPos = oldPos.map((p, d) => p + update[i][d]);

      const swingVector = oldPos.map((p, d) => p - newPos[d]);
      const tractionVector = oldPos.map((p, d) => p + newPos[d]);

      const swingMagnitude = Math.sqrt(swingVector.reduce((sum, val) => sum + val * val, 0));
      const tractionMagnitude = Math.sqrt(tractionVector.reduce((sum, val) => sum + val * val, 0));

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
      jitterTolerance
    );

    // Apply forces to update positions
    let totalMovement = 0;

    for (let i = 0; i < n; i++) {
      let factor;

      if (adjustSizes) {
        // Calculate displacement magnitude
        const df = Math.sqrt(update[i].reduce((sum, val) => sum + val * val, 0));
        const swinging = mass[i] * df;

        // Determine scaling factor with size adjustments
        factor = 0.1 * speed / (1 + Math.sqrt(speed * swinging));
        factor = Math.min(factor * df, 10) / df;
      } else {
        // Standard scaling factor
        const swinging = mass[i] * Math.sqrt(update[i].reduce((sum, val) => sum + val * val, 0));
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
  return graph.edges().filter((edge: Edge) =>
    edge[0] === node || edge[1] === node
  ).length;
}