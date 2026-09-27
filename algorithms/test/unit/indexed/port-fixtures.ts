/**
 * The graphs every indexed port is compared against its legacy counterpart on. One list, shared by
 * the four equivalence suites, so "the ports agree" means the same thing in each of them.
 *
 * Every graph is a legacy `Graph`, because the legacy side needs one and `toSnapshot` gives the
 * ported side the snapshot. None carries a self-loop or a parallel edge: those are where the legacy
 * conventions and the snapshot's diverge on purpose (a self-loop counts once in the legacy weighted
 * degree and twice in the snapshot's, following NetworkX), and each port's own suite pins its
 * behaviour there directly.
 */

import { Graph } from "../../../src/core/graph.js";

interface Fixture {
    readonly name: string;
    readonly graph: Graph;
}

/** A linear congruential generator, so a "random" fixture is the same graph on every run. */
function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function gnm(nodeCount: number, edgeCount: number, directed: boolean, seed: number, weighted = false): Graph {
    const g = new Graph({ directed });
    for (let i = 0; i < nodeCount; i++) {
        g.addNode(`n${i}`);
    }
    const random = seeded(seed);
    let added = 0;
    let guard = 0;
    while (added < edgeCount && guard < edgeCount * 1000) {
        guard++;
        const u = `n${Math.floor(random() * nodeCount)}`;
        const v = `n${Math.floor(random() * nodeCount)}`;
        const weight = weighted ? 1 + Math.floor(random() * 4) : 1;
        if (u === v || g.hasEdge(u, v) || (!directed && g.hasEdge(v, u))) {
            continue;
        }
        g.addEdge(u, v, weight);
        added++;
    }
    return g;
}

function cliques(size: number, count: number, joinWithEdges: boolean): Graph {
    const g = new Graph({ directed: false });
    for (let c = 0; c < count; c++) {
        for (let i = 0; i < size; i++) {
            for (let j = i + 1; j < size; j++) {
                g.addEdge(`c${c}_${i}`, `c${c}_${j}`);
            }
        }
    }
    if (joinWithEdges) {
        for (let c = 1; c < count; c++) {
            g.addEdge(`c${c - 1}_0`, `c${c}_0`);
        }
    }
    return g;
}

function path(length: number): Graph {
    const g = new Graph({ directed: false });
    for (let i = 1; i < length; i++) {
        g.addEdge(`p${i - 1}`, `p${i}`);
    }
    return g;
}

function twoTrianglesAndAnIsolatedNode(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    g.addEdge("c", "a");
    g.addEdge("d", "e");
    g.addEdge("e", "f");
    g.addEdge("f", "d");
    g.addNode("z");
    return g;
}

function weightedStar(): Graph {
    const g = new Graph({ directed: false });
    for (let i = 1; i <= 5; i++) {
        g.addEdge("hub", `leaf${i}`, i);
    }
    g.addEdge("leaf1", "leaf2", 7);
    return g;
}

function directedChorded(): Graph {
    const g = new Graph({ directed: true });
    for (let i = 0; i < 8; i++) {
        g.addEdge(`d${i}`, `d${(i + 1) % 8}`);
    }
    g.addEdge("d0", "d4");
    g.addEdge("d5", "d1");
    g.addNode("sink");
    g.addEdge("d3", "sink");
    return g;
}

function hubAndLeaves(): Graph {
    const g = new Graph({ directed: true });
    for (let i = 0; i < 5; i++) {
        g.addEdge("h", `a${i}`);
        g.addEdge(`b${i}`, "h");
    }
    return g;
}

/**
 * Zachary's karate club, the graph every community-detection paper reports a number for. Edge list
 * as `networkx.karate_club_graph()` gives it, the same one
 * `test/unit/eigenvector-networkx-parity.test.ts` carries.
 */
const KARATE =
    "0-1 0-2 0-3 0-4 0-5 0-6 0-7 0-8 0-10 0-11 0-12 0-13 0-17 0-19 0-21 0-31 1-2 1-3 1-7 1-13 1-17 1-19 1-21 " +
    "1-30 2-3 2-7 2-8 2-9 2-13 2-27 2-28 2-32 3-7 3-12 3-13 4-6 4-10 5-6 5-10 5-16 6-16 8-30 8-32 8-33 9-33 " +
    "13-33 14-32 14-33 15-32 15-33 18-32 18-33 19-33 20-32 20-33 22-32 22-33 23-25 23-27 23-29 23-32 23-33 " +
    "24-25 24-27 24-31 25-31 26-29 26-33 27-33 28-31 28-33 29-32 29-33 30-32 30-33 31-32 31-33 32-33";

function karate(): Graph {
    const g = new Graph({ directed: false });
    for (const pair of KARATE.split(" ")) {
        const [u, v] = pair.split("-");
        g.addEdge(u, v);
    }
    return g;
}

/** Undirected fixtures: what k-core and Louvain are compared on. */
export function undirectedFixtures(): Fixture[] {
    return [
        { name: "two triangles and an isolated node", graph: twoTrianglesAndAnIsolatedNode() },
        { name: "path of six", graph: path(6) },
        { name: "three four-cliques in a chain", graph: cliques(4, 3, true) },
        { name: "two five-cliques, disconnected", graph: cliques(5, 2, false) },
        { name: "weighted star with one rim edge", graph: weightedStar() },
        { name: "random 40 nodes, 120 edges", graph: gnm(40, 120, false, 12345) },
        { name: "random 80 nodes, 320 weighted edges", graph: gnm(80, 320, false, 6789, true) },
        { name: "Zachary's karate club", graph: karate() },
    ];
}

/** Directed fixtures: what Katz and HITS are compared on, alongside the undirected list. */
export function directedFixtures(): Fixture[] {
    return [
        { name: "directed eight-cycle with two chords and a sink", graph: directedChorded() },
        { name: "one hub, five targets and five sources", graph: hubAndLeaves() },
        { name: "random directed 40 nodes, 160 edges", graph: gnm(40, 160, true, 24680) },
        { name: "random directed 90 nodes, 400 weighted edges", graph: gnm(90, 400, true, 1357, true) },
    ];
}
