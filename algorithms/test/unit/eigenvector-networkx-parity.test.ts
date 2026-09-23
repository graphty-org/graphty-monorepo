import { describe, expect, it } from "vitest";

import { eigenvectorCentrality, eigenvectorCentralityRun } from "../../src/algorithms/centrality/eigenvector.js";
import { Graph } from "../../src/core/graph.js";

/*
 * Expected values from networkx 3.1, python3:
 *
 *   import networkx as nx
 *   nx.eigenvector_centrality(G)   # defaults: max_iter=100, tol=1e-6, weight=None
 *
 * with G = nx.path_graph(10), nx.star_graph(7), nx.convert_node_labels_to_integers(nx.grid_2d_graph(4, 4)),
 * nx.balanced_tree(2, 2), nx.cycle_graph(6), nx.karate_club_graph(), and the small weighted graph below.
 * networkx scales the eigenvector to unit Euclidean length, which is what this package returns with
 * `normalized: false`, so the values compare directly.
 *
 * Every graph but the karate club and the weighted one is bipartite: its adjacency spectrum holds
 * +lambda and -lambda, which plain power iteration cannot separate.
 */
const FIXTURES: Record<string, { edges: [string, string, number?][]; expected: Record<string, number> }> = {
    path10: {
        edges: [
            ["0", "1"],
            ["1", "2"],
            ["2", "3"],
            ["3", "4"],
            ["4", "5"],
            ["5", "6"],
            ["6", "7"],
            ["7", "8"],
            ["8", "9"],
        ],
        expected: {
            "0": 0.12013458,
            "1": 0.23053448,
            "2": 0.32225514,
            "3": 0.38786712,
            "4": 0.42205718,
            "5": 0.42205718,
            "6": 0.38786712,
            "7": 0.32225514,
            "8": 0.23053448,
            "9": 0.12013458,
        },
    },
    star8: {
        edges: [
            ["0", "1"],
            ["0", "2"],
            ["0", "3"],
            ["0", "4"],
            ["0", "5"],
            ["0", "6"],
            ["0", "7"],
        ],
        expected: {
            "0": 0.70710721,
            "1": 0.26726108,
            "2": 0.26726108,
            "3": 0.26726108,
            "4": 0.26726108,
            "5": 0.26726108,
            "6": 0.26726108,
            "7": 0.26726108,
        },
    },
    grid4x4: {
        edges: [
            ["0", "4"],
            ["0", "1"],
            ["1", "5"],
            ["1", "2"],
            ["2", "6"],
            ["2", "3"],
            ["3", "7"],
            ["4", "8"],
            ["4", "5"],
            ["5", "9"],
            ["5", "6"],
            ["6", "10"],
            ["6", "7"],
            ["7", "11"],
            ["8", "12"],
            ["8", "9"],
            ["9", "13"],
            ["9", "10"],
            ["10", "14"],
            ["10", "11"],
            ["11", "15"],
            ["12", "13"],
            ["13", "14"],
            ["14", "15"],
        ],
        expected: {
            "0": 0.13819724,
            "1": 0.22360712,
            "2": 0.22360712,
            "3": 0.13819724,
            "4": 0.22360712,
            "5": 0.36180276,
            "6": 0.36180276,
            "7": 0.22360712,
            "8": 0.22360712,
            "9": 0.36180276,
            "10": 0.36180276,
            "11": 0.22360712,
            "12": 0.13819724,
            "13": 0.22360712,
            "14": 0.22360712,
            "15": 0.13819724,
        },
    },
    tree: {
        edges: [
            ["0", "1"],
            ["0", "2"],
            ["1", "3"],
            ["1", "4"],
            ["2", "5"],
            ["2", "6"],
        ],
        expected: {
            "0": 0.49999981,
            "1": 0.49999981,
            "2": 0.49999981,
            "3": 0.25000028,
            "4": 0.25000028,
            "5": 0.25000028,
            "6": 0.25000028,
        },
    },
    cycle6: {
        edges: [
            ["0", "1"],
            ["0", "5"],
            ["1", "2"],
            ["2", "3"],
            ["3", "4"],
            ["4", "5"],
        ],
        expected: {
            "0": 0.40824829,
            "1": 0.40824829,
            "2": 0.40824829,
            "3": 0.40824829,
            "4": 0.40824829,
            "5": 0.40824829,
        },
    },
    karate: {
        edges: [
            ["0", "1"],
            ["0", "2"],
            ["0", "3"],
            ["0", "4"],
            ["0", "5"],
            ["0", "6"],
            ["0", "7"],
            ["0", "8"],
            ["0", "10"],
            ["0", "11"],
            ["0", "12"],
            ["0", "13"],
            ["0", "17"],
            ["0", "19"],
            ["0", "21"],
            ["0", "31"],
            ["1", "2"],
            ["1", "3"],
            ["1", "7"],
            ["1", "13"],
            ["1", "17"],
            ["1", "19"],
            ["1", "21"],
            ["1", "30"],
            ["2", "3"],
            ["2", "7"],
            ["2", "8"],
            ["2", "9"],
            ["2", "13"],
            ["2", "27"],
            ["2", "28"],
            ["2", "32"],
            ["3", "7"],
            ["3", "12"],
            ["3", "13"],
            ["4", "6"],
            ["4", "10"],
            ["5", "6"],
            ["5", "10"],
            ["5", "16"],
            ["6", "16"],
            ["8", "30"],
            ["8", "32"],
            ["8", "33"],
            ["9", "33"],
            ["13", "33"],
            ["14", "32"],
            ["14", "33"],
            ["15", "32"],
            ["15", "33"],
            ["18", "32"],
            ["18", "33"],
            ["19", "33"],
            ["20", "32"],
            ["20", "33"],
            ["22", "32"],
            ["22", "33"],
            ["23", "25"],
            ["23", "27"],
            ["23", "29"],
            ["23", "32"],
            ["23", "33"],
            ["24", "25"],
            ["24", "27"],
            ["24", "31"],
            ["25", "31"],
            ["26", "29"],
            ["26", "33"],
            ["27", "33"],
            ["28", "31"],
            ["28", "33"],
            ["29", "32"],
            ["29", "33"],
            ["30", "32"],
            ["30", "33"],
            ["31", "32"],
            ["31", "33"],
            ["32", "33"],
        ],
        expected: {
            "0": 0.35548349,
            "1": 0.26595387,
            "2": 0.31718939,
            "3": 0.21117408,
            "4": 0.07596646,
            "5": 0.07948058,
            "6": 0.07948058,
            "7": 0.17095511,
            "8": 0.22740509,
            "9": 0.10267519,
            "10": 0.07596646,
            "11": 0.05285417,
            "12": 0.08425192,
            "13": 0.2264697,
            "14": 0.10140628,
            "15": 0.10140628,
            "16": 0.02363479,
            "17": 0.09239676,
            "18": 0.10140628,
            "19": 0.14791134,
            "20": 0.10140628,
            "21": 0.09239676,
            "22": 0.10140628,
            "23": 0.15012329,
            "24": 0.05705374,
            "25": 0.0592082,
            "26": 0.07558192,
            "27": 0.13347933,
            "28": 0.13107926,
            "29": 0.13496529,
            "30": 0.17476028,
            "31": 0.19103627,
            "32": 0.30865105,
            "33": 0.37337121,
        },
    },
    // Edge weights are not read by this package, as networkx's default `weight=None` does not read them.
    weighted: {
        edges: [
            ["0", "1", 5],
            ["1", "2", 0.5],
            ["2", "3", 2],
            ["3", "0", 1],
            ["0", "2", 3],
            ["3", "4", 4],
        ],
        expected: { "0": 0.53707676, "1": 0.40669315, "2": 0.53707676, "3": 0.47475035, "4": 0.17974951 },
    },
};

function build(edges: [string, string, number?][]): Graph {
    const graph = new Graph();
    for (const [source, target, weight] of edges) {
        graph.addEdge(source, target, weight);
    }
    return graph;
}

describe("eigenvector centrality matches networkx", () => {
    for (const [name, { edges, expected }] of Object.entries(FIXTURES)) {
        it(`${name}: converges within the default cap to the networkx vector`, () => {
            const run = eigenvectorCentralityRun(build(edges), { normalized: false });

            expect(run.converged).toBe(true);
            expect(run.iterations).toBeLessThanOrEqual(100);
            for (const [node, value] of Object.entries(expected)) {
                expect(Math.abs((run.centrality[node] ?? Number.NaN) - value)).toBeLessThan(1e-4);
            }
            // The public function returns the same scores.
            expect(eigenvectorCentrality(build(edges), { normalized: false })).toEqual(run.centrality);
        });
    }

    it("reports a run stopped by the iteration cap as not converged", () => {
        const run = eigenvectorCentralityRun(build(FIXTURES.karate.edges), { maxIterations: 2 });

        expect(run.converged).toBe(false);
        expect(run.iterations).toBe(2);
    });

    it("directed: a node is fed by its out-neighbours, so it matches networkx on the reversed graph", () => {
        // networkx 3.1: nx.eigenvector_centrality(nx.DiGraph(edges).reverse()); networkx itself uses in-edges.
        // Both cycles pass through node 2, so the graph is periodic and unshifted iteration oscillates.
        const graph = new Graph({ directed: true });
        for (const [source, target] of [
            [0, 1],
            [1, 2],
            [2, 0],
            [2, 3],
            [3, 4],
            [4, 2],
            [5, 0],
        ]) {
            graph.addEdge(String(source), String(target));
        }
        const expected = { "0": 0.346591, "1": 0.436678, "2": 0.55018, "3": 0.346591, "4": 0.436678, "5": 0.27509 };

        const run = eigenvectorCentralityRun(graph, { normalized: false });

        expect(run.converged).toBe(true);
        for (const [node, value] of Object.entries(expected)) {
            expect(Math.abs((run.centrality[node] ?? Number.NaN) - value)).toBeLessThan(1e-4);
        }
    });

    it("directed acyclic: the only eigenvalue is 0, so every score is 0", () => {
        const graph = new Graph({ directed: true });
        graph.addEdge("a", "b");
        graph.addEdge("b", "c");
        graph.addEdge("a", "c");

        expect(eigenvectorCentralityRun(graph)).toEqual({
            centrality: { a: 0, b: 0, c: 0 },
            iterations: 0,
            converged: true,
        });
    });
});
