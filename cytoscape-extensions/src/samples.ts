/**
 * `@graphty/cytoscape-extensions/samples`: the seeded generators and the sample datasets of @graphty/graph-samples
 * as Cytoscape elements. cy.graphtyGenerate() and cy.graphtyDataset() load this module on their first call, and
 * each bundled dataset is a module of its own, loaded only when it is asked for.
 */

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { DATASET_NAMES, fetchDataset, type FetchDatasetOptions, type SampleGraph } from "@graphty/graph-samples";
import * as g from "@graphty/graph-samples/generators";
import type { ElementDefinition } from "cytoscape";

import { GENERATOR_OPTION_NAMES } from "./algorithm-options.js";
import { flipY, snapshotToElements } from "./elements.js";

/**
 * Every generator by its name: the graph-samples function name in kebab case without "Graph". Each takes that
 * function's options; the random ones take `seed` (default 0) and give the same graph for the same options on
 * every platform.
 */
export const GENERATORS = {
    ak: g.akGraph,
    "balanced-tree": g.balancedTreeGraph,
    "barabasi-albert": g.barabasiAlbertGraph,
    barbell: g.barbellGraph,
    "bianconi-barabasi": g.bianconiBarabasiGraph,
    "bipartite-configuration-model": g.bipartiteConfigurationModelGraph,
    caveman: g.cavemanGraph,
    "chung-lu": g.chungLuGraph,
    "circular-ladder": g.circularLadderGraph,
    complete: g.completeGraph,
    "complete-bipartite": g.completeBipartiteGraph,
    "complete-multipartite": g.completeMultipartiteGraph,
    "configuration-model": g.configurationModelGraph,
    "connected-caveman": g.connectedCavemanGraph,
    cycle: g.cycleGraph,
    "degree-corrected-sbm": g.degreeCorrectedSbmGraph,
    "directed-configuration-model": g.directedConfigurationModelGraph,
    "duplication-divergence": g.duplicationDivergenceGraph,
    empty: g.emptyGraph,
    "erdos-renyi": g.erdosRenyiGraph,
    "erdos-renyi-gnm": g.erdosRenyiGnmGraph,
    "forest-fire": g.forestFireGraph,
    genrmf: g.genrmfGraph,
    grid: g.gridGraph,
    "grid-3d": g.grid3dGraph,
    "grid-flow-network": g.gridFlowNetwork,
    "hexagonal-lattice": g.hexagonalLatticeGraph,
    hyperbolic: g.hyperbolicGraph,
    hypercube: g.hypercubeGraph,
    knn: g.knnGraph,
    kronecker: g.kroneckerGraph,
    ladder: g.ladderGraph,
    "layered-flow-network": g.layeredFlowNetwork,
    lfr: g.lfrGraph,
    lollipop: g.lollipopGraph,
    "mobius-ladder": g.mobiusLadderGraph,
    named: (o: { name: g.NamedGraphName } & g.WeightOptions) => {
        // checked here: graph-samples' own error points at a list this package's readers cannot see
        if (!(g.NAMED_GRAPH_NAMES as readonly string[]).includes(o.name)) {
            throw unknownName("named graph", o.name, g.NAMED_GRAPH_NAMES);
        }
        return g.namedGraph(o.name, o);
    },
    "newman-watts": g.newmanWattsGraph,
    path: g.pathGraph,
    petersen: g.petersenGraph,
    "planted-partition": g.plantedPartitionGraph,
    price: g.priceGraph,
    "random-apollonian": g.randomApollonianGraph,
    "random-bipartite": g.randomBipartiteGraph,
    "random-dag": g.randomDagGraph,
    "random-geometric": g.randomGeometricGraph,
    "random-order-dag": g.randomOrderDagGraph,
    "random-recursive-tree": g.randomRecursiveTreeGraph,
    "random-regular": g.randomRegularGraph,
    "random-tree": g.randomTreeGraph,
    "ring-of-cliques": g.ringOfCliquesGraph,
    rmat: g.rmatGraph,
    star: g.starGraph,
    "stochastic-block-model": g.stochasticBlockModelGraph,
    "triangular-lattice": g.triangularLatticeGraph,
    "watts-strogatz": g.wattsStrogatzGraph,
    waxman: g.waxmanGraph,
    wheel: g.wheelGraph,
    "wilson-maze": g.wilsonMazeGraph,
} as const;

/** A generator name. */
export type GeneratorName = keyof typeof GENERATORS;

/** The graphs the "named" generator knows, for `graphtyGenerate("named", { name })`. */
export { NAMED_GRAPH_NAMES } from "@graphty/graph-samples/generators";

/** The options of a generator. */
export type GeneratorOptions<N extends GeneratorName> = Parameters<(typeof GENERATORS)[N]>[0];

// One static specifier per dataset, so a bundler splits each into a chunk of its own.
const BUNDLED: Record<string, () => Promise<SampleGraph>> = {
    karate: () => import("@graphty/graph-samples/datasets/karate").then((m) => m.karate()),
    "florentine-families": () =>
        import("@graphty/graph-samples/datasets/florentine-families").then((m) => m.florentineFamilies()),
    "davis-southern-women": () =>
        import("@graphty/graph-samples/datasets/davis-southern-women").then((m) => m.davisSouthernWomen()),
    "les-miserables": () => import("@graphty/graph-samples/datasets/les-miserables").then((m) => m.lesMiserables()),
    football: () => import("@graphty/graph-samples/datasets/football").then((m) => m.football()),
    "political-books": () => import("@graphty/graph-samples/datasets/political-books").then((m) => m.politicalBooks()),
    dolphins: () => import("@graphty/graph-samples/datasets/dolphins").then((m) => m.dolphins()),
    "contiguous-usa": () => import("@graphty/graph-samples/datasets/contiguous-usa").then((m) => m.contiguousUsa()),
    "knuth-miles": () => import("@graphty/graph-samples/datasets/knuth-miles").then((m) => m.knuthMiles()),
    "celegans-neural": () => import("@graphty/graph-samples/datasets/celegans-neural").then((m) => m.celegansNeural()),
    "political-blogs": () => import("@graphty/graph-samples/datasets/political-blogs").then((m) => m.politicalBlogs()),
    openflights: () => import("@graphty/graph-samples/datasets/openflights").then((m) => m.openflights()),
    "yeast-perturbation": () =>
        import("@graphty/graph-samples/datasets/yeast-perturbation").then((m) => m.yeastPerturbation()),
    "stelzl-interactome": () =>
        import("@graphty/graph-samples/datasets/stelzl-interactome").then((m) => m.stelzlInteractome()),
    "wikipathways-senescence-autophagy": () =>
        import("@graphty/graph-samples/datasets/wikipathways-senescence-autophagy").then((m) =>
            m.wikipathwaysSenescenceAutophagy(),
        ),
    "go-slim-generic": () => import("@graphty/graph-samples/datasets/go-slim-generic").then((m) => m.goSlimGeneric()),
};

/** The datasets that ship inside @graphty/graph-samples; the hosted ones (graph-samples' DATASETS) are fetched. */
export const BUNDLED_DATASET_NAMES: readonly string[] = Object.keys(BUNDLED);

/**
 * The number of single-character edits that turn one string into the other.
 * @param a - one string
 * @param b - the other
 * @returns the Levenshtein distance
 */
function editDistance(a: string, b: string): number {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        for (let j = 1; j <= b.length; j++) {
            row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = row;
    }
    return prev[b.length];
}

/**
 * The error for an unknown name, naming the closest known one when one is close and listing them all.
 * @param kind - what the name names ("dataset", "generator", "named graph")
 * @param name - the unknown name
 * @param names - the known names
 * @returns a RangeError
 */
function unknownName(kind: string, name: string, names: readonly string[]): RangeError {
    let best = "";
    let bestDistance = Infinity;
    for (const known of names) {
        const d = editDistance(name, known);
        if (d < bestDistance) {
            best = known;
            bestDistance = d;
        }
    }
    const hint = bestDistance <= Math.max(2, name.length / 3) ? ` (did you mean ${JSON.stringify(best)}?)` : "";
    return new RangeError(`unknown ${kind} ${JSON.stringify(name)}${hint}; the ${kind}s are ${names.join(", ")}`);
}

/** A generated graph or a dataset as Cytoscape element definitions. */
export interface SampleElements {
    /** The nodes, then the edges. Node ids are the dataset's names, or "0", "1", ... for a generated graph. */
    readonly elements: ElementDefinition[];
    /** Whether the graph is directed: pass it as `directed` to the algorithms. */
    readonly directed: boolean;
}

/**
 * The elements of a graph-samples graph.
 * @param graph - the graph
 * @returns the elements and the direction
 */
function fromSample(graph: SampleGraph | GraphSnapshot): SampleElements {
    const snapshot = "src" in graph ? fromEdgeArrays(graph) : graph;
    return { elements: snapshotToElements(snapshot), directed: snapshot.directed };
}

/**
 * A generated graph with its coordinate columns `x` and `y` (the lattices with `positions: true`, and the geometric
 * generators) as one position column, so they become node positions; `z` stays a data field.
 * @param graph - the generated graph
 * @returns the graph, its x and y as a position
 */
function withPosition(graph: SampleGraph): SampleGraph {
    const { x, y, ...rest } = graph.nodeColumns ?? {};
    if (!ArrayBuffer.isView(x) || !ArrayBuffer.isView(y)) {
        return graph;
    }
    const xs = x as unknown as ArrayLike<number>;
    const ys = y as unknown as ArrayLike<number>;
    const xy = new Float64Array(2 * graph.nodeCount);
    for (let i = 0; i < graph.nodeCount; i++) {
        xy[2 * i] = xs[i];
        xy[2 * i + 1] = ys[i];
    }
    return {
        ...graph,
        nodeColumns: { ...rest, position: { data: xy, decl: { dtype: "f64", components: 2, role: "position" } } },
    };
}

/**
 * Generates a graph. Ground-truth columns (`community`, `side`, `layer`, ...) become node data fields; weights
 * become `data.weight`; coordinates (`x` and `y`) become node positions. Edge k gets the id "e<k>", so the same
 * options and seed give the same element ids as well as the same graph.
 * @param name - the generator
 * @param options - the generator's options
 * @returns the elements and the direction
 * @throws RangeError for an unknown generator name, or an option the generator does not take
 */
export function generateElements<N extends GeneratorName>(name: N, options: GeneratorOptions<N>): SampleElements {
    const make = (GENERATORS as Record<string, ((o: unknown) => SampleGraph) | undefined>)[name];
    if (make === undefined) {
        throw unknownName("generator", name, Object.keys(GENERATORS));
    }
    // a misspelled option (seeed, position) would otherwise run with the default and give a plausible graph
    const known = GENERATOR_OPTION_NAMES[name] ?? [];
    for (const [k, v] of Object.entries((options as object | undefined) ?? {})) {
        if (v !== undefined && !known.includes(k)) {
            throw new RangeError(
                `generator ${JSON.stringify(name)}: unknown option ${k}; the options are ${known.join(", ")}`,
            );
        }
    }
    const r = fromSample(withPosition(make(options)));
    let k = 0;
    for (const el of r.elements) {
        // node ids are "0", "1", ..., so "e<k>" never collides with one
        if (el.group === "edges") {
            el.data.id = `e${String(k++)}`;
        }
    }
    return r;
}

/**
 * Loads a sample dataset: a bundled one from its own module, any other from graphty.app (see graph-samples'
 * `DATASETS` for the list, with each one's source, citation and license). A drawn dataset's saved `x` and `y` become
 * node positions, placed where Cytoscape drew them.
 * @param name - the dataset name, e.g. "karate"
 * @param options - for a hosted dataset: the base URL and fetch implementation; for any dataset, an abort signal
 * @returns the elements and the direction
 * @throws the signal's reason (an AbortError) when it is aborted before the dataset is decoded
 * @throws RangeError for a name that is not a known dataset, unless `baseUrl` is given
 */
export async function datasetElements(name: string, options: FetchDatasetOptions = {}): Promise<SampleElements> {
    // checked here too, not only by fetch: a bundled dataset is not fetched, and a custom fetch may ignore the signal
    options.signal?.throwIfAborted();
    const load = BUNDLED[name];
    // only graphty.app's own list is checked: a custom baseUrl may serve any name
    if (load === undefined && options.baseUrl === undefined && !DATASET_NAMES.includes(name)) {
        throw unknownName("dataset", name, DATASET_NAMES);
    }
    const graph = load === undefined ? await fetchDataset(name, options) : await load();
    options.signal?.throwIfAborted();
    const r = fromSample(graph);
    // a drawn dataset's saved x and y (y growing upward) become the position Cytoscape drew (y growing downward)
    for (const el of r.elements) {
        const { x, y } = el.data;
        if (typeof x === "number" && typeof y === "number") {
            el.position = { x, y: flipY(y) };
            delete el.data.x;
            delete el.data.y;
        }
    }
    return r;
}
