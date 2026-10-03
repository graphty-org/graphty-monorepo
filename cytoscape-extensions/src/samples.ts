/**
 * `@graphty/cytoscape-extensions/samples`: the seeded generators and the sample datasets of @graphty/graph-samples
 * as Cytoscape elements. cy.graphtyGenerate() and cy.graphtyDataset() load this module on their first call, and
 * each bundled dataset is a module of its own, loaded only when it is asked for.
 */

import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { fetchDataset, type FetchDatasetOptions, type SampleGraph } from "@graphty/graph-samples";
import * as g from "@graphty/graph-samples/generators";
import type { ElementDefinition } from "cytoscape";

import { snapshotToElements } from "./elements.js";

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
    named: (o: { name: g.NamedGraphName } & g.WeightOptions) => g.namedGraph(o.name, o),
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
};

/** The datasets that ship inside @graphty/graph-samples; any other name is fetched from graphty.app. */
export const BUNDLED_DATASET_NAMES: readonly string[] = Object.keys(BUNDLED);

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
 * Generates a graph. Ground-truth columns (`community`, `side`, `layer`, ...) become node data fields; weights
 * become `data.weight`.
 * @param name - the generator
 * @param options - the generator's options
 * @returns the elements and the direction
 * @throws RangeError for an unknown generator name
 */
export function generateElements<N extends GeneratorName>(name: N, options: GeneratorOptions<N>): SampleElements {
    const make = (GENERATORS as Record<string, ((o: unknown) => SampleGraph) | undefined>)[name];
    if (make === undefined) {
        throw new RangeError(`unknown generator ${JSON.stringify(name)}; the names are in GENERATORS`);
    }
    return fromSample(make(options));
}

/**
 * Loads a sample dataset: a bundled one from its own module, any other from graphty.app (see graph-samples'
 * `DATASETS` for the list, with each one's source, citation and license).
 * @param name - the dataset name, e.g. "karate"
 * @param options - for a hosted dataset: the base URL, fetch implementation and abort signal
 * @returns the elements and the direction
 */
export async function datasetElements(name: string, options: FetchDatasetOptions = {}): Promise<SampleElements> {
    const load = BUNDLED[name];
    return fromSample(load === undefined ? await fetchDataset(name, options) : await load());
}
