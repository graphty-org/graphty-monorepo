/**
 * Core graph type definitions
 */

export type Node = string | number;

export type Edge = [Node, Node];

export type Graph = {
    nodes: () => Node[];
    edges: () => Edge[];
    getEdgeData?: (source: Node, target: Node, attr: string) => any;
};
