/**
 * Layout
 * ======
 *
 * Node positioning algorithms for graph drawing in TypeScript.
 *
 * For `randomLayout()` the possible resulting shape
 * is a square of side [0, scale] (default: [0, 1])
 * Changing `center` shifts the layout by that amount.
 *
 * For the other layout routines, the extent is
 * [center - scale, center + scale] (default: [-1, 1]).
 *
 * Ported from NetworkX Python library.
 */
type Node = string | number;
type Edge = [Node, Node];
type Graph = {
    nodes?: () => Node[];
    edges?: () => Edge[];
    getEdgeData?: (source: Node, target: Node, attr: string) => any;
} | Node[];
type Position = number[];
type PositionMap = Record<Node, Position>;
/**
 * Position nodes uniformly at random in the unit square.
 *
 * @param G - Graph or list of nodes
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @param seed - Random seed for reproducible layouts
 * @returns Positions dictionary keyed by node
 */
declare function randomLayout(G: Graph, center?: number[] | null, dim?: number, seed?: number | null): PositionMap;
/**
 * Position nodes on a circle.
 *
 * @param G - Graph or list of nodes
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout (currently only supports dim=2)
 * @returns Positions dictionary keyed by node
 */
declare function circularLayout(G: Graph, scale?: number, center?: number[] | null, dim?: number): PositionMap;
/**
 * Position nodes in concentric circles.
 *
 * @param G - Graph or list of nodes
 * @param nlist - List of node lists for each shell
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout (currently only supports dim=2)
 * @returns Positions dictionary keyed by node
 */
declare function shellLayout(G: Graph, nlist?: Node[][] | null, scale?: number, center?: number[] | null, dim?: number): PositionMap;
/**
 * Position nodes using Fruchterman-Reingold force-directed algorithm.
 *
 * @param {Object} G - Graph or list of nodes
 * @param {number} k - Optimal distance between nodes
 * @param {Object} pos - Initial positions for nodes
 * @param {Array} fixed - Nodes to keep fixed at initial position
 * @param {number} iterations - Maximum number of iterations
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} dim - Dimension of layout
 * @param {number} seed - Random seed for initial positions
 * @returns {Object} Positions dictionary keyed by node
 */
declare function springLayout(G: Graph, k?: number | null, pos?: PositionMap | null, fixed?: Node[] | null, iterations?: number, scale?: number, center?: number[] | null, dim?: number, seed?: number | null): PositionMap;
/**
 * Position nodes using Fruchterman-Reingold force-directed algorithm.
 *
 * @param {Object} G - Graph or list of nodes
 * @param {number} k - Optimal distance between nodes
 * @param {Object} pos - Initial positions for nodes
 * @param {Array} fixed - Nodes to keep fixed at initial position
 * @param {number} iterations - Maximum number of iterations
 * @param {number} scale - Scale factor for positions
 * @param {Array|null} center - Coordinate pair around which to center the layout
 * @param {number} dim - Dimension of layout
 * @param {number} seed - Random seed for initial positions
 * @returns {Object} Positions dictionary keyed by node
 */
declare function fruchtermanReingoldLayout(G: Graph, k?: number | null, pos?: PositionMap | null, fixed?: Node[] | null, iterations?: number, scale?: number, center?: number[] | null, dim?: number, seed?: number | null): PositionMap;
/**
 * Position nodes in a spectral layout using eigenvectors of the graph Laplacian.
 *
 * @param G - Graph
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @returns Positions dictionary keyed by node
 */
declare function spectralLayout(G: Graph, scale?: number, center?: number[] | null, dim?: number): PositionMap;
/**
 * Position nodes in a spiral layout.
 *
 * @param G - Graph or list of nodes
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @param resolution - Controls the spacing between spiral elements
 * @param equidistant - Whether to place nodes equidistant from each other
 * @returns Positions dictionary keyed by node
 */
declare function spiralLayout(G: Graph, scale?: number, center?: number[] | null, dim?: number, resolution?: number, equidistant?: boolean): PositionMap;
/**
 * Rescale node positions to fit in the specified scale and center.
 *
 * @param pos - Dictionary or array of positions
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @returns Rescaled positions dictionary
 */
declare function rescaleLayout(pos: PositionMap | number[][], scale?: number, center?: number[]): PositionMap | number[][];
/**
 * Position nodes in two straight lines (bipartite layout).
 *
 * @param G - Graph or list of nodes
 * @param nodes - Nodes in one node set of the graph
 * @param align - The alignment of nodes: 'vertical' or 'horizontal'
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param aspectRatio - The ratio of the width to the height of the layout
 * @returns Positions dictionary keyed by node
 */
declare function bipartiteLayout(G: Graph, nodes?: Node[] | null, align?: 'vertical' | 'horizontal', scale?: number, center?: number[] | null, aspectRatio?: number): PositionMap;
/**
 * Position nodes in layers of straight lines (multipartite layout).
 *
 * @param G - Graph or list of nodes
 * @param subsetKey - Object mapping layers to node sets, or node attribute name
 * @param align - The alignment of nodes: 'vertical' or 'horizontal'
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @returns Positions dictionary keyed by node
 */
declare function multipartiteLayout(G: Graph, subsetKey?: Record<number | string, Node | Node[]> | string, align?: 'vertical' | 'horizontal', scale?: number, center?: number[] | null): PositionMap;
/**
 * Position nodes according to breadth-first search algorithm.
 *
 * @param G - Graph
 * @param start - Starting node for bfs
 * @param align - The alignment of layers: 'vertical' or 'horizontal'
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @returns Positions dictionary keyed by node
 */
declare function bfsLayout(G: Graph, start: Node, align?: 'vertical' | 'horizontal', scale?: number, center?: number[] | null): PositionMap;
/**
 * Position nodes without edge intersections (planar layout).
 *
 * @param G - Graph
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout (must be 2)
 * @returns Positions dictionary keyed by node
 */
declare function planarLayout(G: Graph, scale?: number, center?: number[] | null, dim?: number): PositionMap;
type DistanceMap = Record<Node, Record<Node, number>>;
/**
 * Position nodes using Kamada-Kawai path-length cost-function.
 *
 * @param G - NetworkX graph or list of nodes
 * @param dist - A two-level dictionary of optimal distances between nodes
 * @param pos - Initial positions for nodes
 * @param weight - The edge attribute used for edge weights
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @returns Positions dictionary keyed by node
 */
declare function kamadaKawaiLayout(G: Graph, dist?: DistanceMap | null, pos?: PositionMap | null, weight?: string, scale?: number, center?: number[] | null, dim?: number): PositionMap;
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
declare function forceatlas2Layout(G: Graph, pos?: PositionMap | null, maxIter?: number, jitterTolerance?: number, scalingRatio?: number, gravity?: number, distributedAction?: boolean, strongGravity?: boolean, nodeMass?: Record<Node, number> | null, nodeSize?: Record<Node, number> | null, weight?: string | null, dissuadeHubs?: boolean, linlog?: boolean, seed?: number | null, dim?: number): PositionMap;
/**
 * Layout algorithm with attractive and repulsive forces (ARF).
 *
 * @param G - Graph
 * @param pos - Initial positions for nodes
 * @param scaling - Scale factor for positions
 * @param a - Strength of springs between connected nodes (should be > 1)
 * @param maxIter - Maximum number of iterations
 * @param seed - Random seed for initial positions
 * @returns Positions dictionary keyed by node
 */
declare function arfLayout(G: Graph, pos?: PositionMap | null, scaling?: number, a?: number, maxIter?: number, seed?: number | null): PositionMap;
/**
 * Return a dictionary of scaled positions keyed by node.
 *
 * @param pos - Dictionary of positions keyed by node
 * @param scale - Scale factor for positions
 * @returns Dictionary of scaled positions
 */
declare function rescaleLayoutDict(pos: PositionMap, scale?: number): PositionMap;
export { randomLayout, circularLayout, shellLayout, springLayout, fruchtermanReingoldLayout, spectralLayout, spiralLayout, bipartiteLayout, multipartiteLayout, bfsLayout, planarLayout, kamadaKawaiLayout, forceatlas2Layout, arfLayout, rescaleLayout, rescaleLayoutDict };
