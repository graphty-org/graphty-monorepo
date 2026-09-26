import { describe, expect, it } from "vitest";

import {
    eigenvectorCentrality,
    type EigenvectorCentralityOptions,
} from "../../src/algorithms/centrality/eigenvector.js";
import { Graph } from "../../src/core/graph.js";
import { ConvergenceError } from "../../src/index.js";

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
            // Throws ConvergenceError when the default cap of 100 passes is not enough.
            const centrality = eigenvectorCentrality(build(edges), { normalized: false });

            for (const [node, value] of Object.entries(expected)) {
                expect(Math.abs((centrality[node] ?? Number.NaN) - value)).toBeLessThan(1e-4);
            }
        });
    }

    it("throws when the iteration cap is reached before the tolerance, as networkx does", () => {
        // networkx raises PowerIterationFailedConvergence here: a 30x30 grid needs far more than 20 passes.
        const graph = new Graph();
        for (let row = 0; row < 30; row++) {
            for (let col = 0; col < 30; col++) {
                if (col < 29) {
                    graph.addEdge(`${row},${col}`, `${row},${col + 1}`);
                }
                if (row < 29) {
                    graph.addEdge(`${row},${col}`, `${row + 1},${col}`);
                }
            }
        }

        let thrown: unknown;
        try {
            eigenvectorCentrality(graph, { maxIterations: 20 });
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(ConvergenceError);
        expect(thrown).toBeInstanceOf(Error);
        const error = thrown as ConvergenceError;
        expect(error.name).toBe("ConvergenceError");
        expect(error.algorithm).toBe("eigenvectorCentrality");
        expect(error.iterations).toBe(20);
        expect(error.tolerance).toBe(1e-6);
        expect(error.message).toBe(
            "eigenvectorCentrality did not converge in 20 iterations (tolerance 0.000001); raise maxIterations or tolerance",
        );
        // networkx 3.1 raises at the default max_iter=100 on this grid too, and converges within 1000.
        expect(() => eigenvectorCentrality(graph)).toThrow(ConvergenceError);
        expect(() => eigenvectorCentrality(graph, { maxIterations: 1000 })).not.toThrow();
    });

    describe("directed: mode picks which edges feed a node", () => {
        // Both cycles pass through node 2, so the graph is periodic and unshifted iteration oscillates.
        function directedFixture(): Graph {
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
            return graph;
        }

        // networkx 3.1 on G = nx.DiGraph(edges): eigenvector_centrality(G), of G.reverse(), of G.to_undirected().
        const cases: [string, EigenvectorCentralityOptions["mode"], Record<string, number>][] = [
            [
                "default (in-edges, as networkx)",
                undefined,
                { "0": 0.454202, "1": 0.360502, "2": 0.572259, "3": 0.454202, "4": 0.3605, "5": 0 },
            ],
            ["in", "in", { "0": 0.454202, "1": 0.360502, "2": 0.572259, "3": 0.454202, "4": 0.3605, "5": 0 }],
            [
                "out (networkx on the reversed graph)",
                "out",
                { "0": 0.346591, "1": 0.436678, "2": 0.55018, "3": 0.346591, "4": 0.436678, "5": 0.27509 },
            ],
            [
                "total (networkx on the undirected graph)",
                "total",
                { "0": 0.440344, "1": 0.394179, "2": 0.595813, "3": 0.365831, "4": 0.365831, "5": 0.167518 },
            ],
        ];
        for (const [label, mode, expected] of cases) {
            it(label, () => {
                const centrality = eigenvectorCentrality(directedFixture(), { normalized: false, mode });

                for (const [node, value] of Object.entries(expected)) {
                    expect(Math.abs((centrality[node] ?? Number.NaN) - value)).toBeLessThan(1e-4);
                }
            });
        }

        it("a node nothing points at scores exactly 0 by default", () => {
            // a -> b -> c -> a, and d -> a. networkx 3.1: a, b, c 0.57735 each, d 1e-6 (its start value decays).
            const graph = new Graph({ directed: true });
            graph.addEdge("a", "b");
            graph.addEdge("b", "c");
            graph.addEdge("c", "a");
            graph.addEdge("d", "a");

            const centrality = eigenvectorCentrality(graph, { normalized: false });

            expect(centrality.d).toBe(0);
            for (const node of ["a", "b", "c"]) {
                expect(centrality[node]).toBeCloseTo(0.57735, 4);
            }
        });
    });

    it("directed acyclic: the only eigenvalue is 0, so every score is 0 and nothing is iterated", () => {
        const graph = new Graph({ directed: true });
        graph.addEdge("a", "b");
        graph.addEdge("b", "c");
        graph.addEdge("a", "c");

        // Exact, not unconverged: even a cap of one pass does not throw.
        expect(eigenvectorCentrality(graph, { maxIterations: 1 })).toEqual({ a: 0, b: 0, c: 0 });
    });

    it("edgeless: every score is 0 without iterating", () => {
        const graph = new Graph();
        graph.addNode("a");
        graph.addNode("b");

        expect(eigenvectorCentrality(graph, { maxIterations: 1 })).toEqual({ a: 0, b: 0 });
    });
});
