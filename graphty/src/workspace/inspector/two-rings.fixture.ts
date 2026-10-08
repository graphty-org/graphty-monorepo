/**
 * The inspector stories' graph: two rings of six joined by one bridge, each node labeled and on a
 * team, each edge weighted, with every node's place written out so the element's `fixed` layout
 * draws it the same way every time and no layout runs. PageRank ranks the bridge's ends highest
 * and Louvain finds the two rings.
 */

export const TWO_RINGS_NODES = Array.from({ length: 12 }, (_, i) => ({
    id: `n${String(i)}`,
    label: `Node ${String(i)}`,
    team: i < 6 ? "north" : "south",
}));

const ring = (from: number): { source: string; target: string; weight: number }[] =>
    Array.from({ length: 6 }, (_, i) => ({
        source: `n${String(from + i)}`,
        target: `n${String(from + ((i + 1) % 6))}`,
        weight: i + 1,
    }));

export const TWO_RINGS_EDGES = [...ring(0), ...ring(6), { source: "n0", target: "n6", weight: 9 }];

/**
 * Where each node sits, in scene units: the two rings side by side, the bridge between them. Ring
 * neighbors are six units apart, about six default node widths (a default node is one unit across),
 * so every edge reads as a line rather than a gap between touching nodes.
 */
export const TWO_RINGS_POSITIONS = [
    { id: "n0", x: -3.6, y: 0 },
    { id: "n1", x: -6.6, y: 5.196 },
    { id: "n2", x: -12.6, y: 5.196 },
    { id: "n3", x: -15.6, y: 0 },
    { id: "n4", x: -12.6, y: -5.196 },
    { id: "n5", x: -6.6, y: -5.196 },
    { id: "n6", x: 3.6, y: 0 },
    { id: "n7", x: 6.6, y: -5.196 },
    { id: "n8", x: 12.6, y: -5.196 },
    { id: "n9", x: 15.6, y: 0 },
    { id: "n10", x: 12.6, y: 5.196 },
    { id: "n11", x: 6.6, y: 5.196 },
];
