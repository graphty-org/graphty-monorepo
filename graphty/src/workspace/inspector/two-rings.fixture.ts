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

/** Where each node sits, in scene units: the two rings side by side, the bridge between them. */
export const TWO_RINGS_POSITIONS = [
    { id: "n0", x: -2.4, y: 0 },
    { id: "n1", x: -4.4, y: 3.464 },
    { id: "n2", x: -8.4, y: 3.464 },
    { id: "n3", x: -10.4, y: 0 },
    { id: "n4", x: -8.4, y: -3.464 },
    { id: "n5", x: -4.4, y: -3.464 },
    { id: "n6", x: 2.4, y: 0 },
    { id: "n7", x: 4.4, y: -3.464 },
    { id: "n8", x: 8.4, y: -3.464 },
    { id: "n9", x: 10.4, y: 0 },
    { id: "n10", x: 8.4, y: 3.464 },
    { id: "n11", x: 4.4, y: 3.464 },
];
