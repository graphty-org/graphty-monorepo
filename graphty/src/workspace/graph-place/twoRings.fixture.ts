/**
 * The Graph place stories' graph: two named rings of six joined by one bridge edge, each node at a
 * fixed position so the element's `fixed` layout places them the same way every time. PageRank
 * ranks the bridge's ends highest and Louvain finds the two rings.
 */

/** One node: an id, a name to find it by, its ring, and where the fixed layout puts it. */
// A type rather than an interface, so it fits the element's record type.
type FixtureNode = {
    readonly id: string;
    readonly name: string;
    readonly ring: "east" | "west";
    readonly position: { readonly x: number; readonly y: number; readonly z: number };
};

// Six world units between neighbors, about six default node widths (a default node is one unit
// across), so every edge reads as a line rather than a gap between touching nodes.
const H = 5.196;

export const NODES: readonly FixtureNode[] = [
    { id: "n0", name: "Ada", ring: "east", position: { x: 3, y: 0, z: 0 } },
    { id: "n1", name: "Bea", ring: "east", position: { x: 6, y: -H, z: 0 } },
    { id: "n2", name: "Cy", ring: "east", position: { x: 12, y: -H, z: 0 } },
    { id: "n3", name: "Dot", ring: "east", position: { x: 15, y: 0, z: 0 } },
    { id: "n4", name: "Eve", ring: "east", position: { x: 12, y: H, z: 0 } },
    { id: "n5", name: "Flo", ring: "east", position: { x: 6, y: H, z: 0 } },
    { id: "n6", name: "Gus", ring: "west", position: { x: -3, y: 0, z: 0 } },
    { id: "n7", name: "Hal", ring: "west", position: { x: -6, y: H, z: 0 } },
    { id: "n8", name: "Ivy", ring: "west", position: { x: -12, y: H, z: 0 } },
    { id: "n9", name: "Jo", ring: "west", position: { x: -15, y: 0, z: 0 } },
    { id: "n10", name: "Kit", ring: "west", position: { x: -12, y: -H, z: 0 } },
    { id: "n11", name: "Lou", ring: "west", position: { x: -6, y: -H, z: 0 } },
];

/** Each ring closed, plus the bridge n0 -- n6. */
export const EDGES: readonly { readonly source: string; readonly target: string }[] = [
    ...[0, 6].flatMap((from) =>
        Array.from({ length: 6 }, (_, i) => ({
            source: `n${String(from + i)}`,
            target: `n${String(from + ((i + 1) % 6))}`,
        })),
    ),
    { source: "n0", target: "n6" },
];
