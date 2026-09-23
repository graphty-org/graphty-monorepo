/**
 * `@graphty/graph-samples/generators`: every graph generator. Each returns a {@link SampleGraph}
 * (typed arrays that `fromEdgeArrays` of @graphty/graph-format loads directly). The random ones
 * take an optional `seed` (default 0) and produce the same graph for the same options on every platform and
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
    circularLadderGraph,
    completeBipartiteGraph,
    completeGraph,
    completeMultipartiteGraph,
    connectedCavemanGraph,
    cycleGraph,
    emptyGraph,
    hypercubeGraph,
    ladderGraph,
    lollipopGraph,
    mobiusLadderGraph,
    pathGraph,
    petersenGraph,
    ringOfCliquesGraph,
    starGraph,
    wheelGraph,
} from "./classic.js";
export {
    bipartiteConfigurationModelGraph,
    type BipartiteConfigurationModelOptions,
    chungLuGraph,
    type ChungLuOptions,
    configurationModelGraph,
    type ConfigurationModelOptions,
    degreeCorrectedSbmGraph,
    type DegreeCorrectedSbmOptions,
    directedConfigurationModelGraph,
    type DirectedConfigurationModelOptions,
    type EdgePolicy,
    powerLawDegreeSequence,
    type PowerLawDegreeSequenceOptions,
    randomRegularGraph,
    type RandomRegularOptions,
} from "./degree-sequence.js";
export {
    kroneckerGraph,
    type KroneckerOptions,
    priceGraph,
    type PriceOptions,
    randomOrderDagGraph,
    type RandomOrderDagOptions,
    rmatGraph,
    type RmatOptions,
} from "./directed.js";
export {
    erdosRenyiGnmGraph,
    type ErdosRenyiGnmOptions,
    erdosRenyiGraph,
    type ErdosRenyiOptions,
} from "./erdos-renyi.js";
export {
    akGraph,
    type AkOptions,
    type FlowNetwork,
    genrmfGraph,
    type GenrmfOptions,
    gridFlowNetwork,
    type GridFlowOptions,
    layeredFlowNetwork,
    type LayeredFlowOptions,
} from "./flow.js";
export {
    knnGraph,
    type KnnOptions,
    randomGeometricGraph,
    type RandomGeometricOptions,
    waxmanGraph,
    type WaxmanOptions,
} from "./geometric.js";
export {
    bianconiBarabasiGraph,
    type BianconiBarabasiOptions,
    duplicationDivergenceGraph,
    type DuplicationDivergenceOptions,
    forestFireGraph,
    type ForestFireOptions,
    newmanWattsGraph,
    type NewmanWattsOptions,
    randomApollonianGraph,
    type RandomApollonianOptions,
    randomRecursiveTreeGraph,
    type RandomRecursiveTreeOptions,
    wilsonMazeGraph,
    type WilsonMazeOptions,
} from "./growth.js";
export { hyperbolicGraph, type HyperbolicOptions } from "./hyperbolic.js";
export {
    grid3dGraph,
    type Grid3dOptions,
    gridGraph,
    type GridOptions,
    hexagonalLatticeGraph,
    type PlanarLatticeOptions,
    triangularLatticeGraph,
} from "./lattices.js";
export { lfrGraph, type LfrOptions } from "./lfr.js";
export { NAMED_GRAPH_NAMES, namedGraph, type NamedGraphName } from "./named.js";
export {
    barabasiAlbertGraph,
    type BarabasiAlbertOptions,
    wattsStrogatzGraph,
    type WattsStrogatzOptions,
} from "./preferential-attachment.js";
export { randomDagGraph, type RandomDagOptions, randomTreeGraph, type RandomTreeOptions } from "./trees-and-dags.js";
export {
    addPathologicalEdges,
    EDGE_CASE_NAMES,
    edgeCaseGraph,
    type EdgeCaseName,
    type PathologicalEdgeOptions,
    randomMultigraph,
    type RandomMultigraphOptions,
} from "./variants.js";
export { type ColumnCombine, type WeightOptions, type WeightSpec, withWeights } from "./weights.js";
