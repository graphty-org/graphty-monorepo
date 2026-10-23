/**
 * `generateGraph(name, params)`: run any generator of the catalogue by name, with its catalogue
 * parameters. The simple path over the generator functions: a parameter left out takes its
 * catalogue default, and the generators that take whole sequences (degrees, block sizes, layer
 * widths) take the few numbers the catalogue lists and build the sequence from them.
 */

import { type SampleGraph } from "../types.js";
import { randomBipartiteGraph } from "./bipartite.js";
import { plantedPartitionGraph, stochasticBlockModelGraph } from "./block-model.js";
import { GENERATOR_CATALOG, type GeneratorParamDescriptor } from "./catalog.js";
import {
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
import {
    bipartiteConfigurationModelGraph,
    chungLuGraph,
    configurationModelGraph,
    degreeCorrectedSbmGraph,
    directedConfigurationModelGraph,
    powerLawDegreeSequence,
    randomRegularGraph,
} from "./degree-sequence.js";
import { kroneckerGraph, priceGraph, randomOrderDagGraph, rmatGraph } from "./directed.js";
import { erdosRenyiGnmGraph, erdosRenyiGraph } from "./erdos-renyi.js";
import { akGraph, genrmfGraph, gridFlowNetwork, layeredFlowNetwork } from "./flow.js";
import { knnGraph, randomGeometricGraph, waxmanGraph } from "./geometric.js";
import {
    bianconiBarabasiGraph,
    duplicationDivergenceGraph,
    forestFireGraph,
    newmanWattsGraph,
    randomApollonianGraph,
    randomRecursiveTreeGraph,
    wilsonMazeGraph,
} from "./growth.js";
import { hyperbolicGraph } from "./hyperbolic.js";
import { grid3dGraph, gridGraph, hexagonalLatticeGraph, triangularLatticeGraph } from "./lattices.js";
import { lfrGraph } from "./lfr.js";
import { namedGraph, type NamedGraphName } from "./named.js";
import { barabasiAlbertGraph, wattsStrogatzGraph } from "./preferential-attachment.js";
import { randomDagGraph, randomTreeGraph } from "./trees-and-dags.js";

/** A generator's parameters by name, as `generateGraph` takes them. */
export type GeneratorParams = Readonly<Record<string, number | boolean | string>>;

/** The parameters, read by type. */
interface Read {
    readonly n: (name: string) => number;
    readonly b: (name: string) => boolean;
    readonly s: (name: string) => string;
}

/**
 * `count` copies of `value`.
 * @param count - the length
 * @param value - the value
 * @returns the array
 */
function fill(count: number, value: number): number[] {
    return Array.from({ length: count }, () => value);
}

/**
 * A power-law degree sequence from the catalogue's three numbers.
 * @param p - the parameters
 * @param n - the sequence length
 * @returns the degrees
 */
function powerLaw(p: Read, n: number): Uint32Array {
    return powerLawDegreeSequence({
        n,
        exponent: p.n("exponent"),
        minDegree: p.n("minDegree"),
        maxDegree: p.n("maxDegree"),
        seed: p.n("seed"),
    });
}

/** Each catalogue generator's call, by name. */
const BUILD: Readonly<Record<string, (p: Read) => SampleGraph>> = {
    ak: (p) => akGraph({ k: p.n("k") }),
    "balanced-tree": (p) => balancedTreeGraph({ branching: p.n("branching"), height: p.n("height") }),
    "barabasi-albert": (p) =>
        barabasiAlbertGraph({ n: p.n("n"), m: p.n("m"), triadProbability: p.n("triadProbability"), seed: p.n("seed") }),
    barbell: (p) => barbellGraph({ cliqueSize: p.n("cliqueSize"), pathLength: p.n("pathLength") }),
    "bianconi-barabasi": (p) => bianconiBarabasiGraph({ n: p.n("n"), m: p.n("m"), seed: p.n("seed") }),
    "bipartite-configuration-model": (p) => {
        const right = p.n("right");
        const total = p.n("left") * p.n("degree");
        return bipartiteConfigurationModelGraph({
            leftDegrees: fill(p.n("left"), p.n("degree")),
            // the same total spread as evenly as it goes over the right side
            rightDegrees: Array.from(
                { length: right },
                (_, i) => Math.floor(total / right) + (i < total % right ? 1 : 0),
            ),
            seed: p.n("seed"),
        });
    },
    caveman: (p) => cavemanGraph({ cliques: p.n("cliques"), size: p.n("size") }),
    "chung-lu": (p) => chungLuGraph({ expectedDegrees: powerLaw(p, p.n("n")), seed: p.n("seed") }),
    "circular-ladder": (p) => circularLadderGraph({ n: p.n("n") }),
    complete: (p) => completeGraph({ n: p.n("n") }),
    "complete-bipartite": (p) => completeBipartiteGraph({ a: p.n("a"), b: p.n("b") }),
    "complete-multipartite": (p) => completeMultipartiteGraph({ sizes: fill(p.n("parts"), p.n("partSize")) }),
    "configuration-model": (p) => configurationModelGraph({ degrees: powerLaw(p, p.n("n")), seed: p.n("seed") }),
    "connected-caveman": (p) => connectedCavemanGraph({ cliques: p.n("cliques"), size: p.n("size") }),
    cycle: (p) => cycleGraph({ n: p.n("n") }),
    "degree-corrected-sbm": (p) =>
        degreeCorrectedSbmGraph({
            sizes: fill(p.n("blocks"), p.n("blockSize")),
            expectedDegrees: powerLaw(p, p.n("blocks") * p.n("blockSize")),
            mixing: p.n("mixing"),
            seed: p.n("seed"),
        }),
    "directed-configuration-model": (p) =>
        directedConfigurationModelGraph({
            outDegrees: fill(p.n("n"), p.n("degree")),
            inDegrees: fill(p.n("n"), p.n("degree")),
            seed: p.n("seed"),
        }),
    "duplication-divergence": (p) =>
        duplicationDivergenceGraph({ n: p.n("n"), retention: p.n("retention"), seed: p.n("seed") }),
    empty: (p) => emptyGraph({ n: p.n("n") }),
    "erdos-renyi": (p) => erdosRenyiGraph({ n: p.n("n"), p: p.n("p"), directed: p.b("directed"), seed: p.n("seed") }),
    "erdos-renyi-gnm": (p) => erdosRenyiGnmGraph({ n: p.n("n"), m: p.n("m"), seed: p.n("seed") }),
    "forest-fire": (p) =>
        forestFireGraph({ n: p.n("n"), forward: p.n("forward"), backward: p.n("backward"), seed: p.n("seed") }),
    genrmf: (p) => genrmfGraph({ a: p.n("a"), b: p.n("b"), c1: p.n("c1"), c2: p.n("c2"), seed: p.n("seed") }),
    grid: (p) =>
        gridGraph({ rows: p.n("rows"), cols: p.n("cols"), periodic: p.b("periodic"), diagonals: p.b("diagonals") }),
    "grid-3d": (p) =>
        grid3dGraph({
            rows: p.n("rows"),
            cols: p.n("cols"),
            layers: p.n("layers"),
            periodic: p.b("periodic"),
            diagonals: p.b("diagonals"),
        }),
    "grid-flow-network": (p) =>
        gridFlowNetwork({
            rows: p.n("rows"),
            cols: p.n("cols"),
            minCapacity: p.n("minCapacity"),
            maxCapacity: p.n("maxCapacity"),
            seed: p.n("seed"),
        }),
    "hexagonal-lattice": (p) => hexagonalLatticeGraph({ rows: p.n("rows"), cols: p.n("cols") }),
    hyperbolic: (p) =>
        hyperbolicGraph({
            n: p.n("n"),
            averageDegree: p.n("averageDegree"),
            exponent: p.n("exponent"),
            temperature: p.n("temperature"),
            seed: p.n("seed"),
        }),
    hypercube: (p) => hypercubeGraph({ dimension: p.n("dimension") }),
    knn: (p) => knnGraph({ n: p.n("n"), k: p.n("k"), directed: p.b("directed"), seed: p.n("seed") }),
    kronecker: (p) =>
        kroneckerGraph({
            // a core-periphery initiator, the usual choice for a web-like graph
            initiator: [
                [0.9, 0.5],
                [0.5, 0.1],
            ],
            power: p.n("power"),
            selfLoops: "erase",
            multiEdges: "erase",
            seed: p.n("seed"),
        }),
    ladder: (p) => ladderGraph({ n: p.n("n") }),
    "layered-flow-network": (p) =>
        layeredFlowNetwork({
            layers: fill(p.n("layers"), p.n("width")),
            p: p.n("p"),
            minCapacity: p.n("minCapacity"),
            maxCapacity: p.n("maxCapacity"),
            seed: p.n("seed"),
        }),
    lfr: (p) =>
        lfrGraph({
            n: p.n("n"),
            minDegree: p.n("minDegree"),
            maxDegree: p.n("maxDegree"),
            degreeExponent: p.n("degreeExponent"),
            minCommunity: p.n("minCommunity"),
            maxCommunity: p.n("maxCommunity"),
            communityExponent: p.n("communityExponent"),
            mixing: p.n("mixing"),
            seed: p.n("seed"),
        }),
    lollipop: (p) => lollipopGraph({ cliqueSize: p.n("cliqueSize"), pathLength: p.n("pathLength") }),
    "mobius-ladder": (p) => mobiusLadderGraph({ n: p.n("n") }),
    named: (p) => namedGraph(p.s("name") as NamedGraphName),
    "newman-watts": (p) => newmanWattsGraph({ n: p.n("n"), k: p.n("k"), p: p.n("p"), seed: p.n("seed") }),
    path: (p) => pathGraph({ n: p.n("n") }),
    petersen: () => petersenGraph(),
    "planted-partition": (p) =>
        plantedPartitionGraph({
            groups: p.n("groups"),
            groupSize: p.n("groupSize"),
            pIn: p.n("pIn"),
            pOut: p.n("pOut"),
            seed: p.n("seed"),
        }),
    price: (p) =>
        priceGraph({
            n: p.n("n"),
            citations: p.n("citations"),
            attractiveness: p.n("attractiveness"),
            seed: p.n("seed"),
        }),
    "random-apollonian": (p) => randomApollonianGraph({ n: p.n("n"), seed: p.n("seed") }),
    "random-bipartite": (p) => randomBipartiteGraph({ n1: p.n("n1"), n2: p.n("n2"), p: p.n("p"), seed: p.n("seed") }),
    "random-dag": (p) => randomDagGraph({ layers: fill(p.n("layers"), p.n("width")), p: p.n("p"), seed: p.n("seed") }),
    "random-geometric": (p) =>
        randomGeometricGraph({ n: p.n("n"), radius: p.n("radius"), periodic: p.b("periodic"), seed: p.n("seed") }),
    "random-order-dag": (p) => randomOrderDagGraph({ n: p.n("n"), p: p.n("p"), seed: p.n("seed") }),
    "random-recursive-tree": (p) => randomRecursiveTreeGraph({ n: p.n("n"), seed: p.n("seed") }),
    "random-regular": (p) => randomRegularGraph({ n: p.n("n"), d: p.n("d"), seed: p.n("seed") }),
    "random-tree": (p) => randomTreeGraph({ n: p.n("n"), seed: p.n("seed") }),
    "ring-of-cliques": (p) => ringOfCliquesGraph({ cliques: p.n("cliques"), size: p.n("size") }),
    rmat: (p) =>
        rmatGraph({
            scale: p.n("scale"),
            edgeFactor: p.n("edgeFactor"),
            selfLoops: "erase",
            multiEdges: "erase",
            seed: p.n("seed"),
        }),
    star: (p) => starGraph({ n: p.n("n") }),
    "stochastic-block-model": (p) => {
        const blocks = p.n("blocks");
        return stochasticBlockModelGraph({
            sizes: fill(blocks, p.n("blockSize")),
            probabilities: Array.from({ length: blocks }, (_, i) =>
                Array.from({ length: blocks }, (_, j) => (i === j ? p.n("pIn") : p.n("pOut"))),
            ),
            seed: p.n("seed"),
        });
    },
    "triangular-lattice": (p) => triangularLatticeGraph({ rows: p.n("rows"), cols: p.n("cols") }),
    "watts-strogatz": (p) => wattsStrogatzGraph({ n: p.n("n"), k: p.n("k"), beta: p.n("beta"), seed: p.n("seed") }),
    waxman: (p) => waxmanGraph({ n: p.n("n"), alpha: p.n("alpha"), beta: p.n("beta"), seed: p.n("seed") }),
    wheel: (p) => wheelGraph({ n: p.n("n") }),
    "wilson-maze": (p) => wilsonMazeGraph({ rows: p.n("rows"), cols: p.n("cols"), seed: p.n("seed") }),
};

/**
 * Whether a value is one a catalogue parameter takes.
 * @param param - the parameter
 * @param value - the value
 * @returns true when it is
 */
function accepts(param: GeneratorParamDescriptor, value: unknown): boolean {
    if (param.type === "boolean") {
        return typeof value === "boolean";
    }
    if (param.type === "choice") {
        return typeof value === "string" && (param.choices ?? []).includes(value);
    }
    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        (param.type === "number" || Number.isInteger(value)) &&
        value >= (param.min ?? -Infinity) &&
        value <= (param.max ?? Infinity)
    );
}

/**
 * What a catalogue parameter takes, for an error message.
 * @param param - the parameter
 * @returns the words
 */
function expected(param: GeneratorParamDescriptor): string {
    if (param.type === "boolean") {
        return "true or false";
    }
    if (param.type === "choice") {
        return `one of ${(param.choices ?? []).join(", ")}`;
    }
    const kind = param.type === "integer" ? "an integer" : "a number";
    return `${kind} in [${String(param.min ?? "-Infinity")}, ${String(param.max ?? "Infinity")}]`;
}

/**
 * Generate a graph by its catalogue name (`GENERATOR_CATALOG` of `@graphty/graph-samples`). Every
 * parameter left out takes its catalogue default, so `generateGraph("erdos-renyi")` is a readable
 * graph of 100 nodes; the same name and parameters give the same graph on every platform.
 * @param name - the generator's catalogue name, e.g. "barabasi-albert"
 * @param params - its parameters by catalogue name
 * @returns the graph
 * @throws RangeError for an unknown generator, an unknown parameter, a value of the wrong type or
 *   outside the catalogue's range, or a combination the generator refuses
 */
export function generateGraph(name: string, params: GeneratorParams = {}): SampleGraph {
    const descriptor = GENERATOR_CATALOG.find((each) => each.name === name);
    const build = BUILD[name] as ((p: Read) => SampleGraph) | undefined;
    if (descriptor === undefined || build === undefined) {
        throw new RangeError(
            `unknown generator ${JSON.stringify(name)}; the generators are ${GENERATOR_CATALOG.map((g) => g.name).join(", ")}`,
        );
    }
    const values: Record<string, number | boolean | string> = {};
    for (const param of descriptor.params) {
        values[param.name] = param.default;
    }
    for (const [key, value] of Object.entries(params)) {
        const param = descriptor.params.find((each) => each.name === key);
        if (param === undefined) {
            const known = descriptor.params.map((each) => each.name).join(", ") || "none";
            throw new RangeError(
                `generator ${JSON.stringify(name)}: unknown parameter ${key}; the parameters are ${known}`,
            );
        }
        if (!accepts(param, value)) {
            throw new RangeError(
                `generator ${JSON.stringify(name)}: ${key} must be ${expected(param)}, not ${JSON.stringify(value)}`,
            );
        }
        values[key] = value;
    }
    return build({
        n: (key) => values[key] as number,
        b: (key) => values[key] as boolean,
        s: (key) => values[key] as string,
    });
}
