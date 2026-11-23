import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { allSimplePaths, SIMPLE_PATHS_DEFAULT_MAX_PATHS, type SimplePathsOptions } from "../../../src/index.js";

/** The edges each test snapshot was built from, by edge index, to check a path's edges against its nodes. */
const declared = new WeakMap<GraphSnapshot, readonly (readonly [number, number])[]>();

function graph(directed: boolean, nodeCount: number, edges: readonly (readonly [number, number])[]): GraphSnapshot {
    const s = fromEdgeArrays(
        {
            directed,
            nodeCount,
            src: Uint32Array.from(edges, ([u]) => u),
            dst: Uint32Array.from(edges, ([, v]) => v),
        },
        { checksum: true },
    );
    declared.set(s, edges);
    return s;
}

/** Every pair of `n` nodes: the complete graph. */
function complete(n: number): [number, number][] {
    const edges: [number, number][] = [];
    for (let u = 0; u < n; u++) {
        for (let v = u + 1; v < n; v++) {
            edges.push([u, v]);
        }
    }
    return edges;
}

/** A 3 x 3 grid, node 3i + j at row i and column j, as networkx's grid_2d_graph(3, 3) relabeled. */
function grid3(): [number, number][] {
    const edges: [number, number][] = [];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (j < 2) {
                edges.push([3 * i + j, 3 * i + j + 1]);
            }
            if (i < 2) {
                edges.push([3 * i + j, 3 * (i + 1) + j]);
            }
        }
    }
    return edges;
}

const DIGRAPH: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 0],
    [1, 3],
    [3, 2],
    [2, 4],
    [0, 4],
    [4, 1],
];

/** The paths as sorted lists of node indices, with each path's edges checked against its nodes. */
function sortedPaths(s: GraphSnapshot, source: number, target: number, options?: SimplePathsOptions): number[][] {
    const result = allSimplePaths(s, source, target, options);
    s.validate({ checksum: true });
    result.paths.forEach((path, k) => {
        const edges = result.edges[k];
        expect(edges.length).toBe(path.length - 1);
        edges.forEach((edge, i) => {
            const ends = [...(declared.get(s)?.[edge] ?? [])].sort();
            expect(ends).toEqual([path[i], path[i + 1]].sort());
        });
    });
    return result.paths.map((path) => Array.from(path)).sort((a, b) => String(a).localeCompare(String(b)));
}

/*
 * Expected paths from networkx 2.8.8, python3:
 *
 *   sorted(list(p) for p in nx.all_simple_paths(G, source, target, cutoff=cutoff))
 *
 * with G = nx.complete_graph(5), nx.convert_node_labels_to_integers(nx.grid_2d_graph(3, 3)) and the DiGraph DIGRAPH.
 */
const sortExpected = (paths: number[][]): number[][] => [...paths].sort((a, b) => String(a).localeCompare(String(b)));

describe("allSimplePaths", () => {
    it("finds every simple path of the complete graph K5, as networkx", () => {
        expect(sortedPaths(graph(false, 5, complete(5)), 0, 4)).toEqual(
            sortExpected([
                [0, 1, 2, 3, 4],
                [0, 1, 2, 4],
                [0, 1, 3, 2, 4],
                [0, 1, 3, 4],
                [0, 1, 4],
                [0, 2, 1, 3, 4],
                [0, 2, 1, 4],
                [0, 2, 3, 1, 4],
                [0, 2, 3, 4],
                [0, 2, 4],
                [0, 3, 1, 2, 4],
                [0, 3, 1, 4],
                [0, 3, 2, 1, 4],
                [0, 3, 2, 4],
                [0, 3, 4],
                [0, 4],
            ]),
        );
    });

    it("keeps only paths of at most maxLength edges, as networkx's cutoff", () => {
        expect(sortedPaths(graph(false, 5, complete(5)), 0, 4, { maxLength: 2 })).toEqual(
            sortExpected([
                [0, 1, 4],
                [0, 2, 4],
                [0, 3, 4],
                [0, 4],
            ]),
        );
        expect(sortedPaths(graph(false, 9, grid3()), 0, 8, { maxLength: 4 })).toEqual(
            sortExpected([
                [0, 1, 2, 5, 8],
                [0, 1, 4, 5, 8],
                [0, 1, 4, 7, 8],
                [0, 3, 4, 5, 8],
                [0, 3, 4, 7, 8],
                [0, 3, 6, 7, 8],
            ]),
        );
    });

    it("finds the twelve corner-to-corner paths of a 3 x 3 grid, as networkx", () => {
        expect(sortedPaths(graph(false, 9, grid3()), 0, 8)).toEqual(
            sortExpected([
                [0, 1, 2, 5, 4, 3, 6, 7, 8],
                [0, 1, 2, 5, 4, 7, 8],
                [0, 1, 2, 5, 8],
                [0, 1, 4, 3, 6, 7, 8],
                [0, 1, 4, 5, 8],
                [0, 1, 4, 7, 8],
                [0, 3, 4, 1, 2, 5, 8],
                [0, 3, 4, 5, 8],
                [0, 3, 4, 7, 8],
                [0, 3, 6, 7, 4, 1, 2, 5, 8],
                [0, 3, 6, 7, 4, 5, 8],
                [0, 3, 6, 7, 8],
            ]),
        );
    });

    it("follows edge direction on a directed graph, as networkx", () => {
        const s = graph(true, 5, DIGRAPH);
        expect(sortedPaths(s, 0, 2)).toEqual(
            sortExpected([
                [0, 1, 2],
                [0, 1, 3, 2],
                [0, 4, 1, 2],
                [0, 4, 1, 3, 2],
            ]),
        );
        expect(sortedPaths(s, 2, 1)).toEqual(
            sortExpected([
                [2, 0, 1],
                [2, 0, 4, 1],
                [2, 4, 1],
            ]),
        );
    });

    it("returns nothing, and stops on no cap, between two pieces or from a node to itself", () => {
        const s = graph(false, 4, [
            [0, 1],
            [2, 3],
        ]);
        expect(allSimplePaths(s, 0, 3)).toMatchObject({ paths: [], stoppedBy: null });
        expect(allSimplePaths(s, 0, 0)).toMatchObject({ paths: [], stoppedBy: null });
    });

    it("gives parallel edges one path, not one per edge", () => {
        const s = graph(false, 3, [
            [0, 1],
            [0, 1],
            [1, 2],
        ]);
        expect(sortedPaths(s, 0, 2)).toEqual([[0, 1, 2]]);
    });

    it("stops at maxPaths and says so, but not when exactly maxPaths paths exist", () => {
        const s = graph(false, 5, complete(5));
        const capped = allSimplePaths(s, 0, 4, { maxPaths: 5 });
        expect(capped.paths).toHaveLength(5);
        expect(capped.stoppedBy).toBe("maxPaths");

        const exact = allSimplePaths(s, 0, 4, { maxPaths: 16 });
        expect(exact.paths).toHaveLength(16);
        expect(exact.stoppedBy).toBeNull();
    });

    it("stops at maxSteps and says so", () => {
        const s = graph(false, 5, complete(5));
        const result = allSimplePaths(s, 0, 4, { maxSteps: 3 });
        expect(result.stoppedBy).toBe("maxSteps");
        expect(result.paths.length).toBeLessThan(16);
    });

    it("bounds a dense graph by its default caps", () => {
        const s = graph(false, 14, complete(14));
        const result = allSimplePaths(s, 0, 13);
        expect(result.paths).toHaveLength(SIMPLE_PATHS_DEFAULT_MAX_PATHS);
        expect(result.stoppedBy).toBe("maxPaths");
    });

    it("refuses a bad cap and a node outside the graph", () => {
        const s = graph(false, 2, [[0, 1]]);
        expect(() => allSimplePaths(s, 0, 1, { maxPaths: -1 })).toThrow(
            expect.objectContaining({ code: "E_BAD_OPTION" }),
        );
        expect(() => allSimplePaths(s, 0, 1, { maxLength: 1.5 })).toThrow(
            expect.objectContaining({ code: "E_BAD_OPTION" }),
        );
        expect(() => allSimplePaths(s, 0, 5)).toThrow(expect.objectContaining({ code: "E_BAD_NODE" }));
    });
});
