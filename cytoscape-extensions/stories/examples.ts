/**
 * The graphs the algorithm gallery runs on when its group's network would not show what an algorithm does: a strong
 * component needs cycles, a matching needs two sides, a flow needs capacities, a component count needs more than
 * one piece. Each example is small, seeded or hand-built, and laid out so the result can be read.
 */

import cytoscape, { type Collection, type Core, type ElementDefinition, type LayoutOptions } from "cytoscape";

import { elementsOf, GENERATE, type Outcome, SIZES } from "./demo.js";

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
    /** Runs the algorithm and paints the result itself, for a picture the shared painter cannot draw. */
    run?(cy: Core): Promise<Outcome>;
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
 * The cycle check on each half of the cycle example, each half colored by its own result: green for no cycle, red
 * for a cycle.
 * @param cy - the core
 * @returns the outcome
 */
async function cycleCheck(cy: Core): Promise<Outcome> {
    await Promise.resolve();
    const left = cy.$(".L").graphtyHasCycle({ directed: true });
    const right = cy.$(".R").graphtyHasCycle({ directed: true });
    const color = (has: boolean): string => (has ? "#e15759" : "#59a14f");
    cy.$("node.L").data("color", color(left));
    cy.$("node.R").data("color", color(right));
    const says = (has: boolean): string => (has ? "has a cycle (red)" : "has no cycle (green)");
    return {
        ran: "cpu",
        detail: "no GPU implementation of this algorithm",
        note: `left: ${says(left)}; right, the same graph with one arc added (the curved one): ${says(right)}`,
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
