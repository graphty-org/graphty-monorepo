/**
 * The graphs the algorithm gallery runs on when its group's network would not show what an algorithm does: a strong
 * component needs cycles, a matching needs two sides, a flow needs capacities, a component count needs more than
 * one piece. Each example is small, seeded or hand-built, and laid out so the result can be read.
 */

import cytoscape, {
    type Collection,
    type Core,
    type EdgeCollection,
    type ElementDefinition,
    type LayoutOptions,
} from "cytoscape";

import { ASYNC_ALGORITHM_NAMES, type Backend, type SearchResult } from "../src/index.js";
import { colorByValue, elementsOf, GENERATE, NO_GPU, type Outcome, PALETTE, SIZES } from "./demo.js";
import { paintPaths, type Paths, plainReason, runAlgorithm } from "./run.js";

const SEED = 42;

interface Example {
    /** What the graph is, for the line above the tile. */
    graph: string;
    /** Run the algorithm with `directed: true` (arrows drawn) or false; default: the group's setting. */
    directed?: boolean;
    /** Puts the graph into the empty core; default: the group's network. */
    load?(cy: Core): Promise<void> | void;
    /** Places the nodes; default: ForceAtlas2. */
    place?(cy: Core): Promise<void>;
    /**
     * Runs the algorithm and paints the result itself, for a picture the shared painter cannot draw; `gpuMode` and
     * `extra` are the tile's backend and options controls.
     */
    run?(cy: Core, settings: { gpuMode: "auto" | "off" | "require"; extra: Record<string, unknown> }): Promise<Outcome>;
}

/**
 * Runs a layout on part of the core and waits for it.
 * @param eles - what to lay out
 * @param options - the layout options
 * @returns when it stopped
 */
function layOut(eles: Collection | Core, options: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
        const l = eles.layout({ animate: false, ...options } as unknown as LayoutOptions);
        l.one("layouterror", (_e: unknown, err: Error) => reject(err));
        l.one("layoutstop", () => resolve());
        l.run();
    });
}

/**
 * A directed graph from an arc list: node ids as given, each arc "<source>-<target>".
 * @param nodes - the node ids
 * @param arcs - the arcs
 * @param classes - classes for every element
 * @returns the elements
 */
function digraph(nodes: string[], arcs: [string, string][], classes = ""): ElementDefinition[] {
    return [
        ...nodes.map((id): ElementDefinition => ({ group: "nodes", data: { id }, classes })),
        ...arcs.map(([s, t]): ElementDefinition => ({
            group: "edges",
            data: { id: `${s}-${t}`, source: s, target: t },
            classes,
        })),
    ];
}

/**
 * Four rings of 3, 4, 5 and 4 nodes joined by one-way arcs, and four nodes on no ring: 8 strongly connected
 * components. With `pieces`, also a zig-zag path and a separate ring, so it has 3 weakly connected components.
 * @param pieces - add the two separate pieces
 * @returns the elements
 */
function rings(pieces: boolean): ElementDefinition[] {
    const nodes: string[] = [];
    const arcs: [string, string][] = [];
    for (const [ring, k] of [
        ["A", 3],
        ["B", 4],
        ["C", 5],
        ["D", 4],
    ] as const) {
        for (let i = 0; i < k; i++) {
            nodes.push(`${ring}${i}`);
            arcs.push([`${ring}${i}`, `${ring}${(i + 1) % k}`]);
        }
    }
    nodes.push("s1", "s2", "s3", "s4");
    arcs.push(["A0", "B0"], ["A1", "s1"], ["s1", "C0"], ["B2", "C2"], ["B3", "D0"], ["C3", "s2"], ["D2", "s3"]);
    arcs.push(["s3", "s4"]);
    if (pieces) {
        nodes.push("p1", "p2", "p3", "p4", "p5", "q1", "q2", "q3");
        arcs.push(["p1", "p2"], ["p3", "p2"], ["p3", "p4"], ["p5", "p4"], ["q1", "q2"], ["q2", "q3"], ["q3", "q1"]);
    }
    return digraph(nodes, arcs);
}

const kamadaKawai = (cy: Core): Promise<void> => layOut(cy, { name: "graphty-kamada-kawai" });

/**
 * Scales the positions so the median distance from a node to its nearest neighbor is 30: a layout fitted to the
 * window spreads a small graph so far that its nodes look like dots.
 * @param cy - the core
 */
export function spread(cy: Core): void {
    const p = cy.nodes().map((n) => n.position());
    const nearest = p.map((a, i) =>
        Math.min(...p.map((b, j) => (i === j ? Infinity : Math.hypot(a.x - b.x, a.y - b.y)))),
    );
    nearest.sort((a, b) => a - b);
    const median = nearest[Math.floor(nearest.length / 2)];
    if (Number.isFinite(median) && median > 0) {
        const k = 30 / median;
        cy.nodes().positions((n) => ({ x: n.position().x * k, y: n.position().y * k }));
    }
}

/**
 * Lays out each connected piece on its own with Kamada-Kawai and sets the pieces side by side, largest first, in
 * rows: one layout of the whole graph pushes separate pieces far apart.
 * @param cy - the core
 */
async function piecesSideBySide(cy: Core): Promise<void> {
    const pieces = cy
        .elements()
        .components()
        .sort((a, b) => b.nodes().length - a.nodes().length);
    const width = (n: number): number => 60 * Math.sqrt(n);
    const row = 1.6 * Math.sqrt(pieces.reduce((a, c) => a + (width(c.nodes().length) + 60) ** 2, 0));
    let x = 0;
    let y = 0;
    let tallest = 0;
    for (const piece of pieces) {
        if (piece.nodes().length > 1) {
            await layOut(piece, { name: "graphty-kamada-kawai" });
        }
        const bb = piece.nodes().boundingBox();
        const k = width(piece.nodes().length) / Math.max(1, bb.w, bb.h);
        if (x > 0 && x + bb.w * k > row) {
            x = 0;
            y += tallest + 60;
            tallest = 0;
        }
        const [x0, y0] = [x, y];
        piece
            .nodes()
            .positions((n) => ({ x: x0 + (n.position().x - bb.x1) * k, y: y0 + (n.position().y - bb.y1) * k }));
        x += bb.w * k + 60;
        tallest = Math.max(tallest, bb.h * k);
    }
}

/**
 * Two copies of a generated graph: class "first" as generated, class "second" with its nodes renumbered, drawn
 * differently (Kamada-Kawai on the left, a circle on the right) so the two do not look alike.
 * @param name - the generator
 * @param options - its options
 * @returns the example's load and place
 */
function twoCopies(name: "petersen" | "hypercube", options: Record<string, unknown>): Pick<Example, "load" | "place"> {
    return {
        load: async (cy) => {
            const tmp = cytoscape({ headless: true });
            await tmp.graphtyGenerate(name, options as never);
            const n = tmp.nodes().length;
            // a fixed renumbering: node i of the first copy is node (7i + 3) mod n of the second
            const renumber = (id: string): string => `b${(7 * Number(id) + 3) % n}`;
            const copy = (prefix: string, rename: (id: string) => string, classes: string): ElementDefinition[] => [
                ...tmp
                    .nodes()
                    .map((v): ElementDefinition => ({ group: "nodes", data: { id: rename(v.id()) }, classes })),
                ...tmp.edges().map((e, i): ElementDefinition => ({
                    group: "edges",
                    data: { id: `${prefix}e${i}`, source: rename(e.source().id()), target: rename(e.target().id()) },
                    classes,
                })),
            ];
            tmp.destroy();
            cy.add([...copy("a", (id) => `a${id}`, "first"), ...copy("b", renumber, "second")]);
        },
        place: async (cy) => {
            await layOut(cy.$(".first"), { name: "graphty-kamada-kawai" });
            await layOut(cy.$(".second"), { name: "graphty-circular" });
            const a = cy.$(".first").boundingBox();
            const b = cy.$(".second").boundingBox();
            // the two side by side, the second scaled to the first's height
            const k = a.h / Math.max(1, b.h);
            cy.$(".second")
                .nodes()
                .positions((v) => {
                    const p = v.position();
                    return { x: a.x2 + 0.6 * a.w + (p.x - b.x1) * k, y: a.y1 + (p.y - b.y1) * k };
                });
        },
    };
}

/** The ten nodes of the cycle example, in columns: a..j, every arc from a column to the next. */
const DAG_ARCS: [string, string][] = [
    ["a", "c"],
    ["a", "d"],
    ["b", "d"],
    ["b", "e"],
    ["c", "f"],
    ["d", "f"],
    ["d", "g"],
    ["e", "h"],
    ["f", "i"],
    ["g", "i"],
    ["g", "j"],
    ["h", "j"],
];
const COLUMN: Record<string, [number, number]> = {
    a: [0, 0.5],
    b: [0, 1.5],
    c: [1, 0],
    d: [1, 1],
    e: [1, 2],
    f: [2, 0],
    g: [2, 1],
    h: [2, 2],
    i: [3, 0.5],
    j: [3, 1.5],
};

/**
 * The cycle example: on the left a DAG, on the right the same DAG with one arc added backwards, j -> b.
 * @returns the example
 */
function cycleExample(): Example {
    const names = Object.keys(COLUMN);
    const side = (prefix: string, extra: [string, string][]): ElementDefinition[] =>
        digraph(
            names.map((x) => prefix + x),
            [...DAG_ARCS, ...extra].map(([s, t]) => [prefix + s, prefix + t]),
            `directed ${prefix}`,
        );
    return {
        graph: "a 10-node DAG, and the same DAG with one arc added backwards",
        directed: true,
        load: (cy) => {
            cy.add([...side("L", []), ...side("R", [["j", "b"]])]);
        },
        place: async (cy) => {
            await Promise.resolve();
            cy.nodes().positions((v) => {
                const [col, row] = COLUMN[v.id().slice(1)];
                return { x: col * 60 + (v.id().startsWith("R") ? 300 : 0), y: row * 60 };
            });
            // the added arc curves back over the columns it skips
            cy.$("#Rj-Rb").data("color", "#e15759");
            cy.$("#Rj-Rb").style({
                "curve-style": "unbundled-bezier",
                "control-point-distances": -90,
                "control-point-weights": 0.5,
            });
        },
        run: cycleCheck,
    };
}

/**
 * The cycle check on each half of the cycle example. The left half has no cycle and is drawn green. On the right,
 * every node and arc that lies on a cycle is red: the strongly connected components of more than one node, which
 * hold exactly the nodes and arcs on some cycle (here two cycles, both closed by the added arc j -> b).
 * @param cy - the core
 * @returns the outcome
 */
async function cycleCheck(cy: Core): Promise<Outcome> {
    await Promise.resolve();
    const left = cy.$(".L").graphtyHasCycle({ directed: true });
    const right = cy.$(".R").graphtyHasCycle({ directed: true });
    if (!left) {
        cy.$("node.L").data("color", "#59a14f");
    }
    const loops = cy
        .$(".R")
        .graphtyStronglyConnectedComponents({ directed: true })
        .filter((part) => part.length > 1);
    for (const part of loops) {
        part.data("color", "#e15759");
        part.edgesTo(part).data("color", "#e15759");
    }
    const says = (has: boolean): string => (has ? "has a cycle" : "has no cycle");
    return {
        ran: "cpu",
        detail: NO_GPU,
        note: `left: ${says(left)} (green); right, the same graph with one arc added (the curved one): ${says(right)}, its nodes and arcs on a cycle in red`,
    };
}

/** How each search walks, for the line above the tile. */
const WALKS: Record<string, string> = {
    breadthFirstSearch: "breadth-first",
    directionOptimizedBfs: "breadth-first (direction-optimized)",
    depthFirstSearch: "depth-first",
};

/** A weighted arc: source, target, weight. */
type Arc = [string, string, number];

/**
 * Left: a graph with a negative arc and no negative cycle. Dijkstra from s settles a at 2 before it reaches b, never
 * looks at a again, and so gives t 5 (s -> a -> t); the shortest path is s -> b -> a -> t, of length 3.
 */
const NEGATIVE_ARC: Arc[] = [
    ["s", "a", 2],
    ["s", "b", 4],
    ["b", "a", -4],
    ["a", "t", 3],
    ["b", "c", 2],
    ["c", "t", 4],
];
/** Right: the cycle x -> y -> z -> x weighs 1 - 3 + 1 = -1. */
const NEGATIVE_CYCLE: Arc[] = [
    ["r", "x", 2],
    ["x", "y", 1],
    ["y", "z", -3],
    ["z", "x", 1],
    ["z", "w", 1],
];
const NEGATIVE_PLACES: Record<string, [number, number]> = {
    Ls: [0, 1],
    La: [1, 0],
    Lb: [1, 2],
    Lt: [3, 1],
    Lc: [2, 2],
    Rr: [0, 1],
    Rx: [1, 1],
    Ry: [2, 0],
    Rz: [2, 2],
    Rw: [3, 2],
};

/**
 * One half of the Bellman-Ford example: each node and arc of `arcs` with `prefix` on its id and class, the node's
 * name and the arc's weight as labels.
 * @param prefix - "L" or "R"
 * @param arcs - the arcs
 * @returns the elements
 */
function weighted(prefix: string, arcs: Arc[]): ElementDefinition[] {
    const names = [...new Set(arcs.flatMap(([s, t]) => [s, t]))];
    const classes = `directed ${prefix}`;
    return [
        ...names.map((x): ElementDefinition => ({ group: "nodes", data: { id: prefix + x, tag: x }, classes })),
        ...arcs.map(([s, t, w]): ElementDefinition => ({
            group: "edges",
            data: { id: `${prefix}${s}-${t}`, source: prefix + s, target: prefix + t, weight: w, tag: String(w) },
            classes,
        })),
    ];
}

/**
 * Bellman-Ford's reason to exist, negative weights, on two small directed graphs: one with a negative arc where
 * Dijkstra goes wrong, and one with a negative cycle, which it detects.
 * @returns the example
 */
function negativeWeights(): Example {
    return {
        graph: "two hand-built directed graphs, weights on the arcs: a negative arc (left) and a negative cycle (right)",
        directed: true,
        load: (cy) => {
            cy.add([...weighted("L", NEGATIVE_ARC), ...weighted("R", NEGATIVE_CYCLE)]);
        },
        place: async (cy) => {
            await Promise.resolve();
            cy.nodes().positions((v) => {
                const [col, row] = NEGATIVE_PLACES[v.id()];
                return { x: col * 60 + (v.id().startsWith("R") ? 300 : 0), y: row * 60 };
            });
        },
        run: async (cy, { gpuMode, extra }) => {
            const run = (prefix: string, root: string): Promise<Paths & { backend: Backend }> =>
                cy.$(`.${prefix}`).graphtyBellmanFordAsync({
                    root: `#${prefix}${root}`,
                    directed: true,
                    weight: "weight",
                    gpu: gpuMode,
                    ...extra,
                });
            const left = await run("L", "s");
            const right = await run("R", "r");
            paintPaths(cy.$(".L"), left, cy.$("#Ls"), cy.$("#Lt"));
            paintPaths(cy.$(".R"), right, cy.$("#Rr"));
            // the cycle Bellman-Ford detected, in red (the result says only that there is one)
            if (right.hasNegativeWeightCycle === true) {
                cy.$("#Rx-y, #Ry-z, #Rz-x").data("color", "#e15759");
            }
            const path = left
                .pathTo(cy.$("#Lt"))
                .nodes()
                .map((n) => n.data("tag") as string)
                .join(" -> ");
            const b = left.backend;
            return {
                ran: b.ran,
                detail: b.ran === "gpu" ? b.device : plainReason(b.reason),
                note: [
                    `Left, from s: the shortest-path tree in blue, the path to t in red: ${path}, length ${left.distanceTo(cy.$("#Lt"))}, through the -4 arc. Dijkstra would settle a at 2 before reaching b, never revisit it, and give t 5 by s -> a -> t; graphtyDijkstra refuses negative weights for that reason.`,
                    `Right, from r: the cycle x -> y -> z -> x (red) weighs 1 - 3 + 1 = -1, and Bellman-Ford reports hasNegativeWeightCycle: ${String(right.hasNegativeWeightCycle)}: each time round shortens a path again, so no shortest path through it exists.`,
                ].join("\n"),
            };
        },
    };
}

/** The examples, by algorithm name without "graphty". */
export const EXAMPLES: Partial<Record<string, Example>> = {
    // Centrality
    hits: {
        graph: "barabasi-albert, 100 nodes, seed 42, each edge directed from the newer node to the older",
        directed: true,
    },
    kCoreDecomposition: {
        graph: 'Zachary\'s karate club (cy.graphtyDataset("karate"))',
        load: async (cy) => {
            await cy.graphtyDataset("karate");
        },
        place: kamadaKawai,
    },
    triangleCount: {
        graph: "planted-partition, 4 groups of 25 nodes, seed 42",
        load: (cy) => {
            cy.add(elementsOf(GENERATE["planted-partition"](SIZES.small, SEED)));
        },
    },

    // Traversal
    breadthFirstSearch: traversal("breadthFirstSearch"),
    directionOptimizedBfs: traversal("directionOptimizedBfs"),
    depthFirstSearch: traversal("depthFirstSearch"),

    // Paths and trees
    dijkstra: roads("dijkstra"),
    bellmanFord: negativeWeights(),
    bidirectionalDijkstra: roads("bidirectionalDijkstra"),
    aStar: roads("aStar"),
    allPairsShortestPath: roads("allPairsShortestPath"),
    kruskalMST: spanning("kruskalMST"),
    primMST: spanning("primMST"),

    // Communities
    labelPropagation: denser(),
    labelPropagationSynchronous: denser(),
    connectedComponents: {
        graph: "stochastic-block-model, blocks of 35, 25, 20, 12 and 8 nodes with no edges between blocks, seed 42",
        load: async (cy) => {
            const sizes = [35, 25, 20, 12, 8];
            const probabilities = sizes.map((_, i) => sizes.map((__, j) => (i === j ? 0.3 : 0)));
            await cy.graphtyGenerate("stochastic-block-model", { sizes, probabilities, seed: SEED });
        },
        place: piecesSideBySide,
    },

    // Structure
    weaklyConnectedComponents: {
        graph: "a directed graph of 28 nodes in three separate pieces",
        directed: true,
        load: (cy) => {
            cy.add(rings(true));
        },
        place: piecesSideBySide,
    },
    stronglyConnectedComponents: {
        graph: "four directed rings joined by one-way arcs, and four nodes on no ring",
        directed: true,
        load: (cy) => {
            cy.add(rings(false));
        },
        place: kamadaKawai,
    },
    condensation: {
        graph: "four directed rings joined by one-way arcs, and four nodes on no ring",
        directed: true,
        load: (cy) => {
            cy.add(rings(false));
        },
        place: kamadaKawai,
    },
    hasCycle: cycleExample(),
    topologicalSort: {
        graph: "random-dag, layers of 3, 4, 4 and 3 nodes, p 0.45, seed 42",
        directed: true,
        load: async (cy) => {
            await cy.graphtyGenerate("random-dag", { layers: [3, 4, 4, 3], p: 0.45, seed: SEED });
        },
        place: kamadaKawai,
    },
    isBipartite: {
        graph: "grid, 6 by 6",
        directed: false,
        load: async (cy) => {
            await cy.graphtyGenerate("grid", { rows: 6, cols: 6, positions: true });
        },
        place: async () => {
            // the generator's own grid positions
        },
    },
    maximumBipartiteMatching: matchingExample(),
    greedyBipartiteMatching: matchingExample(),
    isGraphIsomorphic: {
        graph: "the Petersen graph, and a renumbered copy drawn as a circle",
        directed: false,
        ...twoCopies("petersen", {}),
    },
    findAllIsomorphisms: {
        graph: "the 3-cube, and a renumbered copy drawn as a circle",
        directed: false,
        ...twoCopies("hypercube", { dimension: 3 }),
    },

    // Flows and cuts
    maxFlow: {
        graph: "layered-flow-network, layers of 1, 6, 8, 6 and 1 nodes, p 0.5, seed 42; capacities in data.weight",
        directed: true,
        load: async (cy) => {
            await cy.graphtyGenerate("layered-flow-network", { layers: [1, 6, 8, 6, 1], p: 0.5, seed: SEED });
        },
        place: async (cy) => {
            const layers = [...new Set(cy.nodes().map((n) => n.data("layer") as number))].sort((a, b) => a - b);
            await layOut(cy, {
                name: "graphty-multipartite",
                subsets: layers.map((k) => cy.nodes(`[layer = ${k}]`)),
                align: "vertical",
            });
        },
    },
    minSTCut: {
        graph: "grid-flow-network, 8 by 8, seed 42; capacities in data.weight",
        directed: true,
        load: async (cy) => {
            await cy.graphtyGenerate("grid-flow-network", { rows: 8, cols: 8, seed: SEED });
        },
        place: async () => {
            // the generator's own grid positions
        },
    },
    stoerWagner: twoGroups(),
    kargerMinCut: twoGroups(),
};

/**
 * A bipartite graph of 15 and 15 nodes, drawn as two rows.
 * @returns the example
 */
function matchingExample(): Example {
    return {
        graph: "random-bipartite, 15 and 15 nodes, p 0.25, seed 7",
        directed: false,
        load: async (cy) => {
            await cy.graphtyGenerate("random-bipartite", { n1: 15, n2: 15, p: 0.25, seed: 7 });
        },
        place: async (cy) => {
            await layOut(cy, { name: "graphty-bipartite", top: cy.nodes("[side = 0]"), align: "horizontal" });
            // the two rows a third of their width apart, not the height of the window
            const width = cy.nodes().boundingBox().w;
            cy.nodes().positions((n) => ({ x: n.position().x, y: n.data("side") === 0 ? 0 : width / 3 }));
        },
    };
}

/**
 * Two dense groups of 25 nodes joined by three edges: the smallest cut separates them.
 * @returns the example
 */
function twoGroups(): Example {
    return {
        graph: "planted-partition, 2 groups of 25 nodes, pIn 0.4, pOut 0.004, seed 42",
        load: async (cy) => {
            await cy.graphtyGenerate("planted-partition", {
                groups: 2,
                groupSize: 25,
                pIn: 0.4,
                pOut: 0.004,
                seed: SEED,
            });
        },
    };
}

/**
 * Four groups with about 10 neighbors inside each: label propagation, which settles on whatever label most
 * neighbors hold, splits the group network's sparser groups (about 6 neighbors inside) into pieces.
 * @returns the example
 */
function denser(): Example {
    return {
        graph: "planted-partition, 4 groups of 25 nodes, pIn 0.4, pOut 0.005, seed 42",
        load: async (cy) => {
            await cy.graphtyGenerate("planted-partition", {
                groups: 4,
                groupSize: 25,
                pIn: 0.4,
                pOut: 0.005,
                seed: SEED,
            });
        },
    };
}

/**
 * 80 random points joined when close, each edge weighted by its length, at the points' own positions: a shortest
 * distance or a spanning tree reads like one on a map. Only the largest connected piece is kept, so every node is
 * reachable from the first.
 * @param algorithm - the algorithm, run with weight: "weight"
 * @returns the example
 */
function roads(algorithm: string): Example {
    return {
        graph: "random-geometric, 80 points, radius 0.2, seed 42, each edge weighted by its length",
        directed: false,
        load: async (cy) => {
            await cy.graphtyGenerate("random-geometric", {
                n: 80,
                radius: 0.2,
                seed: SEED,
                weights: { kind: "euclidean" },
            });
            const main = cy
                .elements()
                .components()
                .reduce((a, c) => (c.nodes().length > a.nodes().length ? c : a));
            cy.remove(cy.nodes().difference(main.nodes()));
        },
        place: async () => {
            // the generator's own positions
        },
        run: (cy, { gpuMode, extra }) =>
            runAlgorithm(cy, algorithm, { gpuMode, directed: false, extra: { weight: "weight", ...extra } }),
    };
}

/**
 * Zachary's karate club twice, side by side and drawn alike, both searched from the instructor (node 0): on the left
 * by `algorithm`, on the right by the other kind of search (depth-first beside a breadth-first one, breadth-first
 * beside the depth-first one). Each node is numbered and colored by when its search reached it (darker = later), and
 * the search tree's edges are blue: the breadth-first tree is a wide bush three edges deep, the depth-first one a
 * long winding chain.
 * @param algorithm - the search, without "graphty"
 * @returns the example
 */
function traversal(algorithm: string): Example {
    const other = algorithm === "depthFirstSearch" ? "breadthFirstSearch" : "depthFirstSearch";
    return {
        graph: `Zachary's karate club twice, both searched from the instructor (node 0): left ${WALKS[algorithm]}, right ${WALKS[other]}`,
        directed: false,
        load: async (cy) => {
            const tmp = cytoscape({ headless: true });
            await tmp.graphtyDataset("karate");
            const copy = (side: string): ElementDefinition[] =>
                tmp.elements().map((e): ElementDefinition => {
                    const data = { ...e.data(), id: side + e.id() } as Record<string, unknown>;
                    if (e.isEdge()) {
                        data.source = side + e.source().id();
                        data.target = side + e.target().id();
                    }
                    return { group: e.isNode() ? "nodes" : "edges", data: data as never, classes: side };
                });
            tmp.destroy();
            cy.add([...copy("L"), ...copy("R")]);
        },
        place: async (cy) => {
            await layOut(cy.$(".L"), { name: "graphty-kamada-kawai" });
            const bb = cy.$(".L").boundingBox();
            cy.$("node.R").positions((n) => {
                const p = cy.getElementById(`L${n.id().slice(1)}`).position();
                return { x: p.x + 1.3 * bb.w, y: p.y };
            });
        },
        run: async (cy, { gpuMode, extra }) => {
            const left = await search(cy, "L", algorithm, gpuMode, extra);
            await search(cy, "R", other, "off", {});
            const b = left.backend;
            const note = `left: ${WALKS[algorithm]}, right: ${WALKS[other]}; each node numbered and colored by when its search reached it (darker = later), the search tree in blue`;
            if (!b) {
                return { ran: "cpu", detail: NO_GPU, note };
            }
            return { ran: b.ran, detail: b.ran === "gpu" ? b.device : plainReason(b.reason), note };
        },
    };
}

/**
 * Runs one search on one copy from its node 0 (its `...Async` method when it has one, so it can go to the GPU),
 * numbers and colors the nodes by visit order, and draws the search tree in blue.
 * @param cy - the core
 * @param side - the copy's class, "L" or "R"
 * @param algorithm - the search, without "graphty"
 * @param gpuMode - the backend control
 * @param extra - more options
 * @returns the result
 */
async function search(
    cy: Core,
    side: "L" | "R",
    algorithm: string,
    gpuMode: "auto" | "off" | "require",
    extra: Record<string, unknown>,
): Promise<SearchResult & { backend?: Backend }> {
    const method = `graphty${algorithm.charAt(0).toUpperCase()}${algorithm.slice(1)}`;
    const nodes = cy.$(`node.${side}`);
    const root = cy.getElementById(`${side}0`);
    const options = { root, ...extra };
    const fns = cy.$(`.${side}`) as unknown as Record<string, (o: Record<string, unknown>) => unknown>;
    let r: unknown;
    if (ASYNC_ALGORITHM_NAMES.includes(`${method}Async`)) {
        r = await fns[`${method}Async`]({ ...options, gpu: gpuMode });
    } else if (gpuMode === "require") {
        throw new Error(`${method} has no GPU implementation; pick auto or cpu`);
    } else {
        r = fns[method](options);
    }
    const result = r as SearchResult & { backend?: Backend };
    const order = new Map(result.path.nodes().map((n, i) => [n.id(), i]));
    colorByValue(cy, (id) => order.get(id), nodes);
    cy.batch(() => {
        nodes.forEach((n) => {
            n.data("tag", String(order.get(n.id()) ?? ""));
        });
        root.data("mark", true);
        result.path.edges().data("color", PALETTE[0]);
    });
    return result;
}

/**
 * A minimum spanning tree on the roads example, each tree edge colored and numbered by the step its algorithm adds it
 * (pale = early, dark red = late). Kruskal takes the shortest remaining edge anywhere that joins two separate trees,
 * so its early edges are scattered over the map as a forest that merges; Prim grows one tree from the first node
 * (blue), always by the shortest edge leaving it, so its steps darken outward. The steps follow each algorithm's
 * documented rule over the tree's own edges, which gives the same order as over the whole graph.
 * @param algorithm - "kruskalMST" or "primMST"
 * @returns the example
 */
function spanning(algorithm: "kruskalMST" | "primMST"): Example {
    const road = roads(algorithm);
    return {
        ...road,
        run: async (cy, settings) => {
            const out = await (road.run as NonNullable<Example["run"]>)(cy, settings);
            const tree = cy.edges("[color]");
            const step = algorithm === "kruskalMST" ? kruskalSteps(tree) : primSteps(cy, tree);
            colorByValue(cy, (id) => step.get(id), cy.$("edge[color]"));
            tree.forEach((e) => {
                e.data("label", String((step.get(e.id()) ?? 0) + 1));
            });
            tree.addClass("step");
            const start = cy.nodes()[0];
            if (algorithm === "primMST") {
                start.data({ mark: true, color: PALETTE[0] });
            }
            const how =
                algorithm === "kruskalMST"
                    ? "Kruskal adds the shortest remaining edge anywhere that joins two separate trees, so its first edges are scattered over the map and merge into one tree"
                    : "Prim grows one tree from the blue node, always by the shortest edge leaving it, so its steps darken outward";
            return {
                ...out,
                // the shared painter's "the tree in red" no longer holds: the tree is colored by step
                note: `${(out.note ?? "").replace("the tree in red, ", "")}\nEach tree edge numbered and colored by the step it was added (pale = early, dark red = late). ${how}. Kruskal and Prim end with the same tree: every edge has a different length, so there is only one minimum spanning tree.`,
            };
        },
    };
}

/**
 * Kruskal's steps: it accepts the tree's edges shortest first.
 * @param tree - the tree's edges
 * @returns each edge's step, by id
 */
function kruskalSteps(tree: EdgeCollection): Map<string, number> {
    const sorted = tree.toArray().sort((a, b) => (a.data("weight") as number) - (b.data("weight") as number));
    return new Map(sorted.map((e, i) => [e.id(), i]));
}

/**
 * Prim's steps from the first node: the shortest tree edge leaving the tree so far, each step.
 * @param cy - the core
 * @param tree - the tree's edges
 * @returns each edge's step, by id
 */
function primSteps(cy: Core, tree: EdgeCollection): Map<string, number> {
    const inTree = new Set([cy.nodes()[0].id()]);
    const step = new Map<string, number>();
    while (step.size < tree.length) {
        const next = tree
            .filter((e) => !step.has(e.id()) && inTree.has(e.source().id()) !== inTree.has(e.target().id()))
            .min((e) => e.data("weight") as number).ele;
        step.set(next.id(), step.size);
        inTree.add(next.source().id()).add(next.target().id());
    }
    return step;
}
