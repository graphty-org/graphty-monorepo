/**
 * Core graph type definitions
 */

/** A node id of a layout 1.x graph object. */
export type Node = string | number;

/** An edge of a layout 1.x graph object: its two node ids. */
export type Edge = [Node, Node];

/** The layout 1.x graph object: what `toLayoutSnapshot` accepts besides a snapshot or a node list. */
export type Graph = {
    /** Every node id. */
    nodes: () => Node[];
    /** Every edge. */
    edges: () => Edge[];
    /** The numeric attribute `attr` of an edge, such as its weight; undefined when the edge has none. */
    getEdgeData?: (source: Node, target: Node, attr: string) => number | undefined;
};
