/**
 * `@graphty/graph-samples/generators`: every graph generator. Each returns a {@link SampleGraph}
 * (typed arrays that `fromEdgeArrays` of @graphty/graph-format loads directly). The random ones
 * take a required `seed` and produce the same graph for the same options on every platform and
 * every version of this package.
 */

export { type SampleGraph } from "../types.js";
export { randomBipartiteGraph, type RandomBipartiteOptions } from "./bipartite.js";
export {
    plantedPartitionGraph,
    type PlantedPartitionOptions,
    stochasticBlockModelGraph,
    type StochasticBlockModelOptions,
} from "./block-model.js";
export {
    balancedTreeGraph,
    barbellGraph,
    cavemanGraph,
    completeBipartiteGraph,
    completeGraph,
    connectedCavemanGraph,
    cycleGraph,
    grid3dGraph,
    gridGraph,
    hypercubeGraph,
    ladderGraph,
    lollipopGraph,
    pathGraph,
    petersenGraph,
    starGraph,
    wheelGraph,
} from "./classic.js";
export {
    erdosRenyiGnmGraph,
    type ErdosRenyiGnmOptions,
    erdosRenyiGraph,
    type ErdosRenyiOptions,
} from "./erdos-renyi.js";
export {
    barabasiAlbertGraph,
    type BarabasiAlbertOptions,
    wattsStrogatzGraph,
    type WattsStrogatzOptions,
} from "./preferential-attachment.js";
export { randomDagGraph, type RandomDagOptions, randomTreeGraph, type RandomTreeOptions } from "./trees-and-dags.js";
