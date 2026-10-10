/**
 * How the gallery shows each layout, generator and dataset: the graph that makes the layout's idea visible, the
 * layout and coloring that make a generator's model or a dataset's content visible, and one line saying what to look
 * for. Every run is seeded and held on the CPU, so the pictures are the same on every machine.
 */

import { DATASETS } from "@graphty/graph-samples";
import type { Core, NodeCollection, NodeSingular } from "cytoscape";

import { GENERATOR_OPTION_NAMES } from "../src/algorithm-options.js";
import type { GeneratorName } from "../src/index.js";
import { presetWithSeed } from "./catalog.js";
import { colorByValue, elementsOf, GENERATE, markDirected, type Outcome, PALETTE } from "./demo.js";
import { colorBy, counts, placeSettled, runLayout } from "./run.js";

/**
 * Runs one graphty layout on the CPU, seeded, and waits for it.
 * @param cy - the core
 * @param layout - the name without "graphty-"
 * @param seed - the seed
 * @param extra - the layout's options
 * @returns which backend ran
 */
function place(cy: Core, layout: string, seed: number, extra: Record<string, unknown> = {}): Promise<Outcome> {
    return runLayout(cy, layout, { gpuMode: "off", seed, iterations: 0, animate: false, extra });
}

/**
 * Sizes and colors each node by its degree (or in-degree): bigger and darker red = more edges.
 * @param cy - the core
 * @param which - "degree", or "indegree" for a directed graph's incoming edges
 */
function byDegree(cy: Core, which: "degree" | "indegree" = "degree"): void {
    const degree = (n: NodeSingular): number => (which === "degree" ? n.degree(false) : n.indegree(false));
    // against the largest degree, and never less than 20: a graph with no hubs (Erdos-Renyi, degrees 1 to 9) stays
    // small and pale instead of stretching its few degree-9 nodes into dark "hubs"
    const max = Math.max(20, ...cy.nodes().map(degree));
    // a layout fits the graph to the viewport, so in a gallery thumbnail the graph is small next to its 8-unit nodes:
    // the hubs grow less there, or they cover their neighbors
    const grow = cy.height() < 400 ? 1.2 : 2.4;
    cy.batch(() => {
        cy.nodes().forEach((n) => {
            const t = degree(n) / max;
            n.data("scale", 0.6 + grow * t);
            n.data("color", `hsl(0, ${Math.round(30 + 60 * t)}%, ${Math.round(85 - 50 * t)}%)`);
        });
    });
}

/**
 * Colors the source of a flow network green and its sink red (node field `role`: 1 source, 2 sink).
 * @param cy - the core
 */
function byRole(cy: Core): void {
    cy.nodes("[role = 1]").data("color", PALETTE[4]);
    cy.nodes("[role = 2]").data("color", PALETTE[2]);
}

/**
 * Colors each node by its hop count from `root`, darker = farther, from cy.graphtyBreadthFirstSearch.
 * @param cy - the core
 * @param root - the start node's selector
 */
function byHops(cy: Core, root: string): void {
    const r = cy.elements().graphtyBreadthFirstSearch({ root });
    colorByValue(cy, (id) => r.depth(cy.getElementById(id)));
}

/**
 * Moves the nodes so their current positions (a generator's coordinates, a saved drawing, a map) span about 40 units
 * per node along the longer side, centered on the origin: in the generator's own units (a unit square) every node
 * would cover the whole drawing.
 * @param cy - the core
 * @param at - each node's position; default its current one
 */
function spread(cy: Core, at: (n: NodeSingular) => { x: number; y: number } = (n) => n.position()): void {
    const points = cy.nodes().map((n) => at(n));
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const k = (40 * Math.sqrt(points.length)) / Math.max(x1 - x0, y1 - y0, 1e-9);
    cy.nodes().positions((_n, i) => ({ x: (points[i].x - (x0 + x1) / 2) * k, y: (points[i].y - (y0 + y1) / 2) * k }));
}

/**
 * Removes every node outside the largest connected component.
 * @param cy - the core
 * @returns how many nodes were removed
 */
function keepLargestComponent(cy: Core): number {
    let main = cy.collection();
    for (const c of cy.elements().components()) {
        if (c.nodes().length > main.nodes().length) {
            main = c;
        }
    }
    const rest = cy.nodes().difference(main.nodes());
    cy.remove(rest);
    return rest.length;
}

/**
 * Each node's layer in a directed acyclic graph: the length of the longest path into it.
 * @param cy - the core
 */
function topologicalLayers(cy: Core): void {
    const layer = new Map<string, number>();
    const waiting = new Map(cy.nodes().map((n) => [n.id(), n.indegree(false)]));
    const ready = cy
        .nodes()
        .filter((n) => n.indegree(false) === 0)
        .map((n) => n.id());
    for (const id of ready) {
        layer.set(id, 0);
    }
    while (ready.length > 0) {
        const id = ready.pop() as string;
        for (const e of cy.getElementById(id).outgoers("edge")) {
            const t = e.target().id();
            layer.set(t, Math.max(layer.get(t) ?? 0, (layer.get(id) ?? 0) + 1));
            const left = (waiting.get(t) ?? 0) - 1;
            waiting.set(t, left);
            if (left === 0) {
                ready.push(t);
            }
        }
    }
    cy.batch(() => {
        cy.nodes().forEach((n) => {
            n.data("layer", layer.get(n.id()) ?? 0);
        });
    });
}

/** The graph, options, coloring and caption of one layout's tile. */
interface LayoutShowcase {
    /** Puts the graph into the empty core. */
    load(cy: Core, seed: number): Promise<void> | void;
    /** The layout's own options for this graph. */
    options?(cy: Core): Record<string, unknown>;
    /** Colors the result, after the layout ran. */
    paint?(cy: Core): void;
    /** What the picture shows. */
    caption: string;
}

/**
 * Adds one of the demo's seeded networks.
 * @param network - the generator
 * @param n - about how many nodes
 * @returns the loader
 */
const network =
    (network: keyof typeof GENERATE, n: number) =>
    (cy: Core, seed: number): void => {
        cy.add(elementsOf(GENERATE[network](n, seed)));
    };

/**
 * Adds a generated graph.
 * @param name - the generator
 * @param options - its options
 * @returns the loader
 */
const generated =
    (name: GeneratorName, options: Record<string, unknown>) =>
    async (cy: Core, seed: number): Promise<void> => {
        const seeded = GENERATOR_OPTION_NAMES[name]?.includes("seed") === true;
        await cy.graphtyGenerate(name, { ...options, ...(seeded ? { seed } : {}) } as never);
    };

/** A force layout's tile: four planted groups, which the forces pull apart. */
const groups: LayoutShowcase = {
    load: network("planted-partition", 100),
    paint: (cy) => colorBy(cy, "community"),
    caption: "100 nodes in 4 planted groups (colors): the forces pull each group together and push the groups apart.",
};

/** Every layout's tile, by layout name without "graphty-". */
export const LAYOUT_SHOWCASE: Record<string, LayoutShowcase> = {
    forceatlas2: groups,
    "fruchterman-reingold": groups,
    "spring-electrical": groups,
    random: {
        load: network("barabasi-albert", 100),
        caption:
            "Every node at a seeded random point, whatever its edges: the starting point other layouts improve on.",
    },
    circular: {
        load: network("watts-strogatz", 60),
        caption:
            "A 60-node small-world ring placed on a circle in node order: the ring's edges run around the circle, its few rewired shortcuts across it.",
    },
    spiral: {
        load: generated("path", { n: 80 }),
        caption: "An 80-node path placed along a spiral in node order, so consecutive nodes sit side by side.",
    },
    grid: {
        load: network("grid", 100),
        caption:
            "A 10 x 10 grid graph placed on grid points in node order, row by row: each node lands beside its neighbors.",
    },
    shell: {
        load: network("barabasi-albert", 100),
        options: (cy) => ({
            nlist: [
                cy.nodes().filter((n) => n.degree(false) >= 8),
                cy.nodes().filter((n) => n.degree(false) >= 4 && n.degree(false) < 8),
                cy.nodes().filter((n) => n.degree(false) < 4),
            ],
        }),
        paint: (cy) => {
            cy.nodes().forEach((n) => {
                // the hubs red, the middle shell orange, the outer shell blue
                const d = n.degree(false);
                let color = PALETTE[0];
                if (d >= 8) {
                    color = PALETTE[2];
                } else if (d >= 4) {
                    color = PALETTE[1];
                }
                n.data("color", color);
            });
        },
        caption:
            "Concentric shells given by nlist: the hubs (degree 8 or more) in the middle, degree 4 to 7 around them, the rest outside.",
    },
    bipartite: {
        load: generated("random-bipartite", { n1: 12, n2: 16, p: 0.2 }),
        options: () => ({ top: "[side = 0]" }),
        paint: (cy) => colorBy(cy, "side"),
        caption:
            "A random bipartite graph: one side per column (top: the side-0 nodes), every edge running between them.",
    },
    multipartite: {
        load: generated("random-dag", { layers: [3, 5, 6, 5, 3], p: 0.4 }),
        options: () => ({ subsets: "layer" }),
        paint: (cy) => colorBy(cy, "layer"),
        caption:
            "A 5-layer random DAG: one column per layer (subsets: the layer field), each edge running to the next column.",
    },
    bfs: {
        load: generated("grid", { rows: 7, cols: 7 }),
        options: () => ({ root: "#0" }),
        paint: (cy) => byHops(cy, "#0"),
        caption:
            "A 7 x 7 grid searched breadth-first from a corner: one column per hop count (darker = farther), holding 1, 2, ..., 7, ..., 1 nodes.",
    },
    radial: {
        load: generated("balanced-tree", { branching: 3, height: 4 }),
        options: () => ({ root: "#0" }),
        paint: (cy) => byHops(cy, "#0"),
        caption:
            "A balanced tree (3 children per node, 4 levels) in rings around its root, one ring per hop (darker = farther).",
    },
    planar: {
        load: generated("random-apollonian", { n: 20 }),
        caption:
            "A 20-node planar triangulation (a random Apollonian network) drawn with no two edges crossing; nodes sit on integer grid points.",
    },
    spectral: {
        load: network("grid", 100),
        caption:
            "A 10 x 10 grid placed by the two smallest nonzero eigenvectors of its Laplacian: the grid's rows and columns come back.",
    },
    "kamada-kawai": {
        load: network("grid", 100),
        caption:
            "A 10 x 10 grid: Kamada-Kawai makes drawn distances match hop distances, so the grid unfolds into a square mesh.",
    },
    arf: {
        ...groups,
        options: () => ({ a: 5 }),
        caption:
            "100 nodes in 4 planted groups (colors): every pair of nodes attracts, neighbors 5 times as strongly (a: 5), and close pairs repel.",
    },
};

/** How a generator's graph is laid out and colored, and what to look for. */
interface GeneratorShowcase {
    /**
     * "settle": ForceAtlas2 until settled (`fa2` holds more of its options); "own": the generator's own coordinates;
     * anything else: that graphty layout, with `options`.
     */
    layout: string;
    options?(cy: Core): Record<string, unknown>;
    /** ForceAtlas2 options for "settle". */
    fa2?: Record<string, unknown>;
    paint?(cy: Core): void;
    caption: string;
}

const settle = (caption: string, paint?: (cy: Core) => void, fa2?: Record<string, unknown>): GeneratorShowcase => ({
    layout: "settle",
    caption,
    paint,
    fa2,
});
const own = (caption: string, paint?: (cy: Core) => void): GeneratorShowcase => ({ layout: "own", caption, paint });
const community = (cy: Core): void => colorBy(cy, "community");
const side = (cy: Core): void => colorBy(cy, "side");
const fromRoot: GeneratorShowcase["options"] = () => ({ root: "#0" });

/** Every generator's picture. */
const GENERATOR_SHOWCASE: Record<GeneratorName, GeneratorShowcase> = {
    ak: settle(
        "Cherkassky and Goldberg's AK network, a hard case for maximum-flow solvers: source green, sink red, capacities as weights.",
        byRole,
    ),
    "balanced-tree": {
        layout: "radial",
        options: fromRoot,
        paint: (cy) => byHops(cy, "#0"),
        caption: "Every inner node has 3 children, 4 levels deep: drawn in rings around the root.",
    },
    "barabasi-albert": settle(
        "Preferential attachment: each new node links to 2 nodes, likelier the more links they have, so a few hubs (bigger, darker) gather most edges.",
        (cy) => byDegree(cy),
    ),
    barbell: settle("Two 8-node cliques joined by a 6-node path.", undefined),
    "bianconi-barabasi": settle(
        "Attachment by degree times fitness: fitter nodes (darker) win links even when they arrive late.",
        (cy) => colorByValue(cy, (id) => cy.getElementById(id).data("fitness") as number),
    ),
    "bipartite-configuration-model": {
        layout: "bipartite",
        options: () => ({ top: "[side = 0]" }),
        paint: side,
        caption: "Every edge joins the two sides; each left node has degree 3, each right node degree 2.",
    },
    caveman: settle("Six separate 6-node cliques (caves), none joined to another.", community, { strongGravity: true }),
    "chung-lu": settle(
        "Each node gets about its expected degree: node 0 expects 42 neighbors, most nodes 2 or 3, so a few hubs (bigger, darker) stand out.",
        (cy) => byDegree(cy),
    ),
    "circular-ladder": {
        layout: "shell",
        options: (cy) => {
            const n = cy.nodes().length / 2;
            return { nlist: [cy.nodes().filter((_x, i) => i < n), cy.nodes().filter((_x, i) => i >= n)] };
        },
        caption: "A prism: two 20-node rings joined rung by rung.",
    },
    complete: { layout: "circular", caption: "Every pair of the 12 nodes is joined." },
    "complete-bipartite": {
        layout: "bipartite",
        options: () => ({ top: "[side = 0]" }),
        paint: side,
        caption: "Each of the 6 nodes on one side is joined to each of the 8 on the other.",
    },
    "complete-multipartite": {
        layout: "multipartite",
        options: () => ({ subsets: "part" }),
        paint: (cy) => colorBy(cy, "part"),
        caption:
            "Three parts of 3, 4 and 5 nodes: every pair of nodes in different parts is joined, none within a part.",
    },
    "configuration-model": settle("A random graph in which every node has degree 3."),
    "connected-caveman": settle(
        "8 cliques of 6 (colors), each with one edge rewired to the next clique: a ring of caves.",
        community,
    ),
    cycle: { layout: "circular", caption: "A ring of 30 nodes." },
    "degree-corrected-sbm": settle(
        "Three planted blocks (colors) whose nodes have uneven expected degrees (bigger = more edges).",
        (cy) => {
            community(cy);
            const max = Math.max(...cy.nodes().map((n) => n.degree(false)));
            cy.nodes().forEach((n) => {
                n.data("scale", 0.6 + 2.4 * Math.sqrt(n.degree(false) / max));
            });
        },
    ),
    "directed-configuration-model": settle("A random directed graph in which every node has 2 edges out and 2 in."),
    "duplication-divergence": settle(
        "Grown as genes duplicate: each new node copies a node's edges and keeps each with probability 0.4, so neighborhoods repeat and hubs form.",
        (cy) => byDegree(cy),
    ),
    empty: { layout: "grid", caption: "20 nodes and no edges." },
    "erdos-renyi": settle(
        "Each pair of nodes joined with probability 0.04: degrees stay close to the average of 4, with no hubs.",
        (cy) => byDegree(cy),
    ),
    "erdos-renyi-gnm": settle(
        "Exactly 200 edges placed uniformly at random among 100 nodes: an even web with no hubs.",
        (cy) => byDegree(cy),
    ),
    "forest-fire": settle(
        "Each new node links to a random node and then 'burns' through that node's neighborhood: dense cores joined by chains.",
        (cy) => byDegree(cy, "indegree"),
    ),
    genrmf: settle(
        "Goldfarb and Grigoriadis's maximum-flow family: 4 frames (colors), each a 3 x 3 grid, linked frame to frame.",
        (cy) => colorBy(cy, "frame"),
    ),
    grid: own("A 15 x 15 lattice at the generator's own coordinates (positions: true)."),
    "grid-3d": settle("A 6 x 6 x 4 lattice: each node joined to its neighbors along three axes."),
    "grid-flow-network": own(
        "A flow network shaped like image segmentation, at its own coordinates: an 8 x 8 grid of pixels, the source (green) on the left and the sink (red) on the right, each joined to every pixel.",
        byRole,
    ),
    "hexagonal-lattice": own("A honeycomb of 6 x 8 hexagons at the generator's own coordinates (positions: true)."),
    hyperbolic: own(
        "Nodes at their points in a hyperbolic disk: hubs (bigger, darker) near the center, low-degree nodes on the rim, edges between hyperbolically close nodes.",
        (cy) => byDegree(cy),
    ),
    hypercube: settle("The 4-dimensional cube: 16 nodes, each joined to the 4 whose binary labels differ in one bit."),
    knn: own("Each of 150 random points joined to its 3 nearest neighbors, at the generator's own coordinates."),
    kronecker: settle(
        "A stochastic Kronecker graph (initiator matrix raised to the 7th power): heavily skewed degrees (bigger, darker = more edges).",
        (cy) => byDegree(cy),
    ),
    ladder: { layout: "kamada-kawai", caption: "Two 20-node rails joined rung by rung." },
    "layered-flow-network": {
        layout: "multipartite",
        options: () => ({ subsets: "layer" }),
        paint: (cy) => {
            colorBy(cy, "layer");
        },
        caption:
            "A flow network from the source (left) to the sink (right) through 3 inner layers; arcs run only to the next layer.",
    },
    lfr: settle(
        "The LFR benchmark: communities (colors) of power-law sizes and degrees, with 10% of each node's edges leaving its community.",
        community,
    ),
    lollipop: { layout: "kamada-kawai", caption: "An 8-node clique with a 10-node path hanging from it." },
    "mobius-ladder": {
        layout: "circular",
        caption: "A 40-node cycle with each node joined to the node opposite: a ladder closed with a half twist.",
    },
    named: {
        layout: "kamada-kawai",
        caption: "The Frucht graph, one of the named graphs: 12 nodes, each of degree 3.",
    },
    "newman-watts": {
        layout: "circular",
        caption: "A ring in which each node joins its 4 nearest, plus random shortcuts added across it (none removed).",
    },
    path: { layout: "kamada-kawai", caption: "A path of 30 nodes." },
    petersen: { layout: "kamada-kawai", caption: "The Petersen graph: 10 nodes, each of degree 3." },
    "planted-partition": settle(
        "4 planted groups of 30 (colors): an edge inside a group is 40 times likelier than one between groups.",
        community,
    ),
    price: settle(
        "Price's citation model: each new paper cites 2 earlier ones, likelier the more cited they are; size and color show citations received.",
        (cy) => byDegree(cy, "indegree"),
    ),
    "random-apollonian": {
        layout: "planar",
        caption:
            "Grown by splitting a random triangle into three: a planar triangulation, drawn with no edges crossing.",
    },
    "random-bipartite": {
        layout: "bipartite",
        options: () => ({ top: "[side = 0]" }),
        paint: side,
        caption: "15 + 20 nodes, each pair across the sides joined with probability 0.15; no edge within a side.",
    },
    "random-dag": {
        layout: "multipartite",
        options: () => ({ subsets: "layer", align: "horizontal" }),
        paint: (cy) => colorBy(cy, "layer"),
        caption: "A random layered DAG: one row per layer (colors); every arc points down to the next layer.",
    },
    "random-geometric": own(
        "200 random points in the unit square, joined when closer than 0.1, at the generator's own coordinates.",
    ),
    "random-order-dag": {
        layout: "multipartite",
        options: (cy) => {
            topologicalLayers(cy);
            return { subsets: "layer", align: "horizontal" };
        },
        paint: (cy) => colorBy(cy, "layer"),
        caption:
            "Nodes in a random order, each pair joined forward with probability 0.08: drawn by longest path in, every arc points down.",
    },
    "random-recursive-tree": {
        layout: "radial",
        options: fromRoot,
        paint: (cy) => byHops(cy, "#0"),
        caption: "Each new node attaches to a uniformly random earlier node: rings around the first node.",
    },
    "random-regular": settle("A random graph in which every node has exactly 3 neighbors."),
    "random-tree": settle("A uniformly random tree on 100 nodes: long branches, few hubs."),
    "ring-of-cliques": settle("8 cliques of 5 (colors), each joined to the next by one edge.", community),
    rmat: settle(
        "R-MAT: edges dropped into recursively split quadrants of the adjacency matrix, giving skewed degrees (bigger, darker = more edges).",
        (cy) => byDegree(cy),
    ),
    star: { layout: "radial", options: fromRoot, caption: "One hub joined to every other node." },
    "stochastic-block-model": settle(
        "Three blocks of 40 (colors): edges inside a block are 20 times likelier than between blocks.",
        community,
    ),
    "triangular-lattice": own("A triangular lattice of 8 x 10 at the generator's own coordinates (positions: true)."),
    "watts-strogatz": {
        layout: "circular",
        caption: "A ring in which each node joins its 4 nearest, with 10% of edges rewired into shortcuts across it.",
    },
    waxman: own(
        "Waxman's model: 200 random points, joined with a probability that falls with distance, so most edges are short.",
    ),
    wheel: { layout: "radial", options: fromRoot, caption: "A hub joined to every node of a 19-node ring." },
    "wilson-maze": own(
        "A random spanning tree of a 12 x 12 grid (Wilson's algorithm): a maze, at its grid coordinates.",
    ),
};

/**
 * Generates `name` with its gallery preset, then arranges it (see arrangeGenerated).
 * @param cy - the empty core
 * @param name - the generator
 * @param seed - the seed
 * @returns the caption and the counts
 */
export async function showGenerator(cy: Core, name: GeneratorName, seed: number): Promise<string> {
    const { directed } = await cy.graphtyGenerate(name, presetWithSeed(name, seed) as never);
    return arrangeGenerated(cy, name, seed, directed);
}

/**
 * Lays a generated graph out and colors it as GENERATOR_SHOWCASE says.
 * @param cy - the core, holding the generated graph
 * @param name - the generator
 * @param seed - the seed
 * @param directed - whether the graph is directed (drawn with arrows)
 * @returns the caption and the counts
 */
export async function arrangeGenerated(
    cy: Core,
    name: GeneratorName,
    seed: number,
    directed: boolean,
): Promise<string> {
    markDirected(cy, directed);
    const show = GENERATOR_SHOWCASE[name];
    if (show.layout === "own") {
        spread(cy);
    } else if (show.layout === "settle") {
        await placeSettled(cy, seed, show.fa2);
    } else {
        await place(cy, show.layout, seed, show.options?.(cy));
    }
    show.paint?.(cy);
    return `${show.caption}\n${counts(cy)}${directed ? ", directed" : ""}`;
}

/** Maps longitude and latitude to x and y, north up. */
const geographic = (n: NodeSingular): { x: number; y: number } => ({
    x: n.data("longitude") as number,
    y: -(n.data("latitude") as number),
});

/**
 * Lays out a bundled dataset the way it is best seen (its saved drawing, a map, a bipartite split, or ForceAtlas2
 * until settled) and colors it by its ground truth or its own values.
 * @param cy - the core, holding the dataset
 * @param name - the dataset
 * @param seed - the seed
 * @returns what the picture shows
 */
export async function showDataset(cy: Core, name: string, seed: number): Promise<string> {
    const info = DATASETS.find((d) => d.name === name);
    const all = cy.nodes().length;
    let note = "";
    switch (name) {
        case "contiguous-usa":
            spread(cy, geographic);
            cy.nodes().forEach((n) => {
                n.data("scale", 0.6 + 2 * Math.sqrt((n.data("population") as number) / 4e7));
            });
            note = "Each state at its center of population (size: population), joined to the states it borders.";
            break;
        case "openflights":
            spread(cy, geographic);
            note = "Airports at their latitude and longitude; the routes between them form a faint haze.";
            break;
        case "knuth-miles": {
            spread(cy, geographic);
            const tree = cy.elements().graphtyKruskalMST({ weight: "weight" });
            cy.edges().difference(tree.edges()).remove();
            tree.edges().data("color", PALETTE[0]);
            note = `Cities at their latitude and longitude, with the minimum spanning tree of highway mileage (${tree.edges().length} of 8,128 edges).`;
            break;
        }
        case "wikipathways-senescence-autophagy":
            spread(cy);
            colorBy(cy, "type");
            note = "The pathway as published (its saved drawing), colored by element type.";
            break;
        case "yeast-perturbation":
            spread(cy);
            colorByExpression(cy, "gal80Rexp");
            note =
                "The network as Cytoscape saved it, colored by gal80R expression: blue down, red up, gray unmeasured.";
            break;
        case "davis-southern-women":
            await place(cy, "bipartite", seed, { top: "[side = 0]" });
            colorBy(cy, "side");
            note = "18 women (one column) and the 14 social events they attended (the other).";
            break;
        case "go-slim-generic": {
            const removed = cy.nodes().filter((n) => n.degree(false) === 0);
            cy.remove(removed);
            // strong gravity keeps the small separate pieces of the hierarchy near the main one
            await placeSettled(cy, seed, { strongGravity: true });
            colorBy(cy, "namespace");
            note = `GO terms colored by namespace, linked to their parents; the ${removed.length} terms with no parent or child in the slim are left out.`;
            break;
        }
        case "stelzl-interactome": {
            const removed = keepLargestComponent(cy);
            const parts = [...(cy.elements().graphtyLouvain() as unknown as NodeCollection[])].sort(
                (a, b) => b.length - a.length,
            );
            parts.forEach((p, i) => p.data("part", i));
            // an edge inside a community pulls 10 times harder than one between communities, so each community
            // gathers in its own place instead of all of them mixing in one hairball
            cy.edges().forEach((e) => {
                e.data("pull", e.source().data("part") === e.target().data("part") ? 1 : 0.1);
            });
            await placeSettled(cy, seed, { linlog: true, weight: "pull" });
            const max = Math.max(1, ...cy.nodes().map((n) => n.degree(false)));
            cy.batch(() => {
                cy.nodes().forEach((n) => {
                    n.data("scale", 0.6 + 2.4 * Math.sqrt(n.degree(false) / max));
                });
                parts.slice(0, PALETTE.length - 1).forEach((p, i) => p.data("color", PALETTE[i]));
            });
            note = `Human proteins and their interactions in the ${PALETTE.length - 1} largest graphtyLouvain communities (colors; the rest gray), drawn with the edges inside a community pulling 10 times harder; size: number of partners. The largest connected piece: ${(all - removed).toLocaleString()} of ${all.toLocaleString()} nodes.`;
            break;
        }
        case "political-blogs":
        case "celegans-neural": {
            const removed = name === "celegans-neural" ? 0 : keepLargestComponent(cy);
            // LinLog mode separates the two camps of political-blogs; on celegans-neural it hides the hubs' spokes
            await placeSettled(cy, seed, { linlog: name === "political-blogs" });
            if (info?.groundTruth) {
                colorBy(cy, info.groundTruth);
            } else {
                byDegree(cy);
            }
            const what = {
                "political-blogs":
                    "US political blogs of 2004 colored by lean; the two camps link mostly among themselves.",
                "celegans-neural":
                    "The neurons of C. elegans and their synapses; size and color: number of connections.",
            }[name];
            note = `${what}${removed > 0 ? ` The largest connected piece: ${(all - removed).toLocaleString()} of ${all.toLocaleString()} nodes.` : ""}`;
            break;
        }
        default:
            await placeSettled(cy, seed, name === "les-miserables" ? { weight: "weight" } : {});
            colorBy(cy, info?.groundTruth ?? null);
            note = info?.groundTruth ? `${info.title}, colored by ${info.groundTruth}.` : `${info?.title ?? name}.`;
    }
    return `${note}\n${counts(cy)}`;
}

/**
 * Colors nodes by a measured value on a blue-white-red scale centered on 0, saturated at the 90th percentile of the
 * magnitudes; a node without a value stays gray.
 * @param cy - the core
 * @param field - the node field
 */
function colorByExpression(cy: Core, field: string): void {
    const values = cy
        .nodes()
        .map((n) => n.data(field) as unknown)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
        .map(Math.abs)
        .sort((a, b) => a - b);
    const top = values[Math.floor(0.9 * (values.length - 1))] || 1;
    cy.batch(() => {
        cy.nodes().forEach((n) => {
            const v = n.data(field) as unknown;
            if (typeof v !== "number" || !Number.isFinite(v)) {
                return;
            }
            const t = Math.max(-1, Math.min(1, v / top));
            n.data("color", `hsl(${t < 0 ? 215 : 0}, 70%, ${Math.round(95 - 45 * Math.abs(t))}%)`);
        });
    });
}

/**
 * Lays one layout's tile out and colors it.
 * @param cy - the core, holding the tile's graph
 * @param layout - the name without "graphty-"
 * @param seed - the seed
 * @param gpuMode - the backend control, for the simulations
 * @returns which backend ran, and the caption
 */
export async function showLayout(cy: Core, layout: string, seed: number, gpuMode: "auto" | "off"): Promise<Outcome> {
    const show = LAYOUT_SHOWCASE[layout];
    const out = await runLayout(cy, layout, {
        gpuMode,
        seed,
        iterations: 0,
        animate: false,
        extra: show.options?.(cy),
    });
    show.paint?.(cy);
    return { ...out, note: show.caption };
}
