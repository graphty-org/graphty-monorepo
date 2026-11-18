/**
 * createAccelerator: the injectable object that satisfies the CPU packages'
 * AlgorithmAccelerator and LayoutAccelerator interfaces. Both are the REAL declarations,
 * `LayoutAccelerator` from `@graphty/layout` and `AlgorithmAccelerator` from
 * `@graphty/algorithms`, `import type`d by src/types/accelerator.ts, so the object built
 * here is checked against the CPU packages' own contracts. It carries `forceAtlas2`, `release` and `dispose`,
 * `fruchtermanReingold` and `springElectrical`, the seven scoring and component members, the four
 * traversal members (`breadthFirstSearch`, `sssp`, `bellmanFord`, `closenessCentrality`, each taking the seam's own
 * option type), the two betweenness members, `allPairsShortestPath`, `triangleCount` and `labelPropagation`, Boruvka's `minimumSpanningTree`, and nothing else: the CPU-side dispatchers
 * (`accelerated()`, `createSimulation()`) test `acc.betweennessCentrality !== undefined` /
 * `acc.fruchtermanReingold !== undefined` and route to the CPU when the member is absent, so a method the GPU does
 * not implement must not exist here -- never a throwing stub.
 */

import { type F32, type F64, type GraphSnapshot } from "@graphty/graph-format";

import { allPairsShortestPath } from "./algorithms/all-pairs.js";
import { bellmanFord } from "./algorithms/bellman-ford.js";
import { betweennessCentrality, edgeBetweennessCentrality } from "./algorithms/betweenness.js";
import { breadthFirstSearch } from "./algorithms/bfs.js";
import { closenessCentrality } from "./algorithms/closeness.js";
import { connectedComponents } from "./algorithms/components.js";
import { labelPropagation } from "./algorithms/label-propagation.js";
import { minimumSpanningTree } from "./algorithms/mst.js";
import { pageRank, personalizedPageRank } from "./algorithms/pagerank.js";
import { eigenvectorCentrality, hits, katzCentrality } from "./algorithms/spectral.js";
import { sssp } from "./algorithms/sssp.js";
import { triangleCount } from "./algorithms/triangles.js";
import { type GpuContext } from "./context.js";
import { WebGpuGraphError } from "./errors.js";
import { createForceAtlas2 } from "./layouts/forceatlas2.js";
import { createFruchtermanReingold } from "./layouts/fruchterman-reingold.js";
import { createSpringElectrical } from "./layouts/spring-electrical.js";
import {
    type AcceleratorOptions,
    type BetweennessAcceleratorOptions,
    type BfsOptions,
    type ClosenessAcceleratorOptions,
    type GpuAccelerator,
    type HitsOptionsLike,
    type MstOptions,
    type SsspOptions,
} from "./types/accelerator.js";
import {
    type ComponentsOptions,
    type EigenvectorOptions,
    type GpuClosenessResult,
    type GpuHitsResult,
    type GpuLabelResult,
    type GpuPageRankResult,
    type GpuScoresResult,
    type HitsOptions,
    type KatzOptions,
    type PageRankOptions,
} from "./types/algorithms.js";
import { type GpuApspResult } from "./types/all-pairs.js";
import { type GpuBetweennessResult, type GpuEdgeScoresResult } from "./types/betweenness.js";
import {
    type ForceAtlas2Stats,
    type FruchtermanReingoldStats,
    type GpuLayoutSimulation,
    type GpuLayoutTuning,
    type SpringElectricalStats,
} from "./types/layout.js";
import {
    type ForceAtlas2Options,
    type FruchtermanReingoldOptions,
    type SpringElectricalOptions,
} from "./types/options.js";
import { type GpuMstResult, type GpuTriangleResult } from "./types/structure.js";
import { type GpuBellmanFordResult, type GpuBfsResult, type GpuSsspResult } from "./types/traversal.js";

/** The `algorithms` record of AcceleratorOptions, named for the copy helpers. */
type AlgorithmDefaults = NonNullable<AcceleratorOptions["algorithms"]>;

/** The `algorithms.betweenness` record of AcceleratorOptions: the `k` / `sources` defaults a betweenness call uses when it names neither. */
type BetweennessDefaults = NonNullable<AlgorithmDefaults["betweenness"]>;

/**
 * Frozen copy of the betweenness defaults; `sources` is copied into a fresh frozen array so a later mutation of
 * the caller's list is never seen by the accelerator.
 * @param defaults - the caller's record
 * @returns the frozen copy
 */
function copyBetweenness(defaults: BetweennessDefaults): BetweennessDefaults {
    const copy: { k?: number | undefined; sources?: readonly number[] | undefined } = { ...defaults };
    if (defaults.sources !== undefined) {
        copy.sources = Object.freeze([...defaults.sources]);
    }
    return Object.freeze(copy);
}

/**
 * A betweenness call's options with the accelerator's `algorithms.betweenness` defaults applied: the defaults supply
 * `sources` / `k` only when the call names neither, so a call's own sampling always wins whole. The defaults serve
 * graphs of every size, so they are fitted to this one: a default `sources` list keeps only the indices below
 * `nodeCount` (and then wins over a default `k`), and a default `k` of `nodeCount` or more runs every vertex.
 * @param defaults - the frozen defaults, if any
 * @param options - the call's options
 * @param nodeCount - the snapshot's vertex count
 * @returns the options the driver runs with
 */
function withBetweennessDefaults(
    defaults: BetweennessDefaults | undefined,
    options: BetweennessAcceleratorOptions | undefined,
    nodeCount: number,
): BetweennessAcceleratorOptions | undefined {
    if (defaults === undefined || options?.sources !== undefined || options?.k !== undefined) {
        return options;
    }
    if (defaults.sources !== undefined) {
        return { ...options, sources: defaults.sources.filter((v) => v < nodeCount) };
    }
    return { ...options, k: defaults.k !== undefined && defaults.k < nodeCount ? defaults.k : undefined };
}

/**
 * Frozen copy of the algorithms record, one level deeper for `betweenness`.
 * @param algorithms - the caller's record
 * @returns the frozen copy
 */
function copyAlgorithms(algorithms: AlgorithmDefaults): AlgorithmDefaults {
    const copy: { betweenness?: BetweennessDefaults | undefined } = { ...algorithms };
    if (algorithms.betweenness !== undefined) {
        copy.betweenness = copyBetweenness(algorithms.betweenness);
    }
    return Object.freeze(copy);
}

/**
 * The frozen deep copy of the accelerator options (GpuAccelerator.options: "the tuning defaults given
 * to createAccelerator; frozen"): the record, its `layout` tuning, its `algorithms` record, the
 * `betweenness` record and the `sources` list are each fresh frozen objects, so neither the caller's later edits
 * nor a consumer's writes can change what the accelerator's simulations inherit.
 * @param options - the caller's options, or undefined
 * @returns the frozen copy (an empty frozen record when nothing was given)
 */
function freezeOptions(options: AcceleratorOptions | undefined): Readonly<AcceleratorOptions> {
    if (options === undefined) {
        return Object.freeze({});
    }
    const copy: { layout?: GpuLayoutTuning | undefined; algorithms?: AlgorithmDefaults | undefined } = { ...options };
    if (options.layout !== undefined) {
        copy.layout = Object.freeze({ ...options.layout });
    }
    if (options.algorithms !== undefined) {
        copy.algorithms = copyAlgorithms(options.algorithms);
    }
    return Object.freeze(copy);
}

/**
 * The object implementing AlgorithmAccelerator & LayoutAccelerator structurally: forceAtlas2, release and
 * dispose, fruchtermanReingold and springElectrical (the same `{ ...o, ...options.layout }` shape as forceAtlas2),
 * the seven scoring and component members, the four traversal
 * members and the two betweenness members, each a delegation to its algorithm with `ctx.assertReady()` first. Only
 * the betweenness members consult the accelerator's algorithm defaults (`algorithms.betweenness` supplies `sources` /
 * `k` when a call names neither). One per call (the app creates one and injects
 * it); `kind` is "webgpu"; `options` is a frozen deep copy; `forceAtlas2(o)` is
 * `createForceAtlas2(ctx, { ...o, ...options.layout })`, so the GPU tuning given here wins over anything the
 * CPU-typed option object carries (tuning never comes from the caller of the accelerator method);
 * `release(s)` is `ctx.release(s)`; `dispose()` is `ctx.dispose()`.
 * @param ctx - the context every simulation the accelerator creates runs on
 * @param options - GPU-only defaults inherited by every simulation (`layout`) and the algorithm defaults (`algorithms`)
 * @returns the injectable accelerator
 * @throws E_DISPOSED / E_DEVICE_LOST from `ctx.assertReady()` (here and inside every creating member); `forceAtlas2()`
 *   also throws what createForceAtlas2 throws (E_UNSUPPORTED for `nodeSize`, E_INVALID_ARGUMENT for a bad range), and
 *   `fruchtermanReingold()` / `springElectrical()` what their factories throw (E_INVALID_ARGUMENT for a bad range)
 */
export function createAccelerator(ctx: GpuContext, options?: AcceleratorOptions): GpuAccelerator {
    ctx.assertReady();
    const frozen = freezeOptions(options);
    return {
        kind: "webgpu",
        harmonicCloseness: true,
        ctx,
        options: frozen,
        /**
         * The ForceAtlas2 simulation with this accelerator's layout tuning.
         * @param o - the CPU option type (ForceAtlas2Options); GPU tuning keys come from `options.layout`
         * @returns a fresh simulation in state "created"
         */
        forceAtlas2(o?: ForceAtlas2Options): GpuLayoutSimulation<ForceAtlas2Options, ForceAtlas2Stats> {
            ctx.assertReady();
            return createForceAtlas2(ctx, { ...o, ...frozen.layout });
        },
        /**
         * The Fruchterman-Reingold simulation with this accelerator's layout tuning.
         * @param o - the CPU option type (FruchtermanReingoldOptions); GPU tuning keys come from `options.layout`
         * @returns a fresh simulation in state "created"
         */
        fruchtermanReingold(
            o?: FruchtermanReingoldOptions,
        ): GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats> {
            ctx.assertReady();
            return createFruchtermanReingold(ctx, { ...o, ...frozen.layout });
        },
        /**
         * The spring-electrical preset with this accelerator's layout tuning.
         * @param o - the CPU option type (SpringElectricalOptions, ngraph's names)
         * @returns a fresh simulation in state "created"
         */
        springElectrical(
            o?: SpringElectricalOptions,
        ): GpuLayoutSimulation<SpringElectricalOptions, SpringElectricalStats> {
            ctx.assertReady();
            return createSpringElectrical(ctx, { ...o, ...frozen.layout });
        },
        /**
         * PageRank on the device.
         * @param gs - the snapshot
         * @param o - the CPU option record (PageRankOptions)
         * @returns the f32 scores with `precision: "f32"`
         */
        async pageRank(gs: GraphSnapshot, o?: PageRankOptions): Promise<GpuPageRankResult> {
            ctx.assertReady();
            return await pageRank(ctx, gs, o);
        },
        /**
         * Personalized PageRank on the device. The mirror admits an f64 personalization
         * (`F32 | F64`); the kernel reads f32, so an f64 vector is narrowed on the host first.
         * @param gs - the snapshot
         * @param personalization - one finite non-negative mass per node, not all zero
         * @param o - the CPU option record (PageRankOptions)
         * @returns the f32 scores with `precision: "f32"`
         */
        async personalizedPageRank(
            gs: GraphSnapshot,
            personalization: F32 | F64,
            o?: PageRankOptions,
        ): Promise<GpuPageRankResult> {
            ctx.assertReady();
            const mass = personalization instanceof Float32Array ? personalization : Float32Array.from(personalization);
            return await personalizedPageRank(ctx, gs, mass, o);
        },
        /**
         * HITS hubs and authorities on the device.
         * @param gs - the snapshot
         * @param o - the CPU option record (HitsOptions)
         * @returns hubs and authorities with `precision: "f32"`
         */
        async hits(gs: GraphSnapshot, o?: HitsOptions): Promise<GpuHitsResult> {
            ctx.assertReady();
            return await hits(ctx, gs, o);
        },
        /**
         * Eigenvector centrality on the device.
         * @param gs - the snapshot
         * @param o - the CPU option record (EigenvectorOptions)
         * @returns the f32 scores with `precision: "f32"`
         */
        async eigenvectorCentrality(gs: GraphSnapshot, o?: EigenvectorOptions): Promise<GpuScoresResult> {
            ctx.assertReady();
            return await eigenvectorCentrality(ctx, gs, o);
        },
        /**
         * Katz centrality on the device.
         * @param gs - the snapshot
         * @param o - the CPU option record (KatzOptions)
         * @returns the f32 scores with `precision: "f32"`
         */
        async katzCentrality(gs: GraphSnapshot, o?: KatzOptions): Promise<GpuScoresResult> {
            ctx.assertReady();
            return await katzCentrality(ctx, gs, o);
        },
        /**
         * Weakly connected components on the device: WCC semantics on directed input.
         * @param gs - the snapshot
         * @param o - `renumber` (default true); the mirror passes none
         * @returns the labels, the count and groups() (LabelResultLike)
         */
        async connectedComponents(gs: GraphSnapshot, o?: ComponentsOptions): Promise<GpuLabelResult> {
            ctx.assertReady();
            return await connectedComponents(ctx, gs, o);
        },
        /**
         * The same algorithm as `connectedComponents` under the mirror's other name.
         * @param gs - the snapshot
         * @param o - `renumber` (default true); the mirror passes none
         * @returns the labels, the count and groups() (LabelResultLike)
         */
        async weaklyConnectedComponents(gs: GraphSnapshot, o?: ComponentsOptions): Promise<GpuLabelResult> {
            ctx.assertReady();
            return await connectedComponents(ctx, gs, o);
        },
        /**
         * Breadth-first search on the device. The result is bitwise reproducible.
         * @param gs - the snapshot
         * @param source - the source node index
         * @param o - the seam's `BfsOptions` (`maxDepth`)
         * @returns depth, parent, the level-grouped order, visitedCount, levels and switches
         */
        async breadthFirstSearch(gs: GraphSnapshot, source: number, o?: BfsOptions): Promise<GpuBfsResult> {
            ctx.assertReady();
            return await breadthFirstSearch(ctx, gs, source, o);
        },
        /**
         * Single-source shortest paths on the device: the near-far queue over f32 distances, or the
         * breadth-first route when every weight is one.
         * @param gs - the snapshot
         * @param source - the source node index
         * @param o - the seam's `SsspOptions` (`cutoff`, `weights`)
         * @returns dist, predArc and reachedCount
         */
        async sssp(gs: GraphSnapshot, source: number, o?: SsspOptions): Promise<GpuSsspResult> {
            ctx.assertReady();
            return await sssp(ctx, gs, source, o);
        },
        /**
         * Bellman-Ford on the device with negative-cycle detection.
         * @param gs - the snapshot
         * @param source - the source node index
         * @param o - the seam's `SsspOptions` (`cutoff`, `weights`)
         * @returns dist, predArc, reachedCount and hasNegativeCycle
         */
        async bellmanFord(gs: GraphSnapshot, source: number, o?: SsspOptions): Promise<GpuBellmanFordResult> {
            ctx.assertReady();
            return await bellmanFord(ctx, gs, source, o);
        },
        /**
         * Betweenness centrality on the device: exact, or sampled through `sources` / `k` (the call's own,
         * else the accelerator's `algorithms.betweenness` defaults), the unscaled sum over the sources run.
         * `endpoints: true` is refused.
         * @param gs - the snapshot
         * @param o - the seam's `BetweennessAcceleratorOptions`
         * @returns the f32 scores with `sourcesUsed` and `sigmaOverflow`
         */
        async betweennessCentrality(
            gs: GraphSnapshot,
            o?: BetweennessAcceleratorOptions,
        ): Promise<GpuBetweennessResult> {
            ctx.assertReady();
            return await betweennessCentrality(
                ctx,
                gs,
                withBetweennessDefaults(frozen.algorithms?.betweenness, o, gs.nodeCount),
            );
        },
        /**
         * Edge betweenness on the device: one score per edge, arcs summed and halved when undirected; sampling
         * and defaults as `betweennessCentrality`.
         * @param gs - the snapshot
         * @param o - the seam's `BetweennessAcceleratorOptions`
         * @returns the f32 per-edge scores with `sourcesUsed` and `sigmaOverflow`
         */
        async edgeBetweennessCentrality(
            gs: GraphSnapshot,
            o?: BetweennessAcceleratorOptions,
        ): Promise<GpuEdgeScoresResult> {
            ctx.assertReady();
            return await edgeBetweennessCentrality(
                ctx,
                gs,
                withBetweennessDefaults(frozen.algorithms?.betweenness, o, gs.nodeCount),
            );
        },
        /**
         * Closeness centrality on the device: the all-pairs sweep with a row sum on small and
         * weighted graphs, the bit-parallel multi-source search otherwise, one `sssp` per source for a weighted graph
         * above the all-pairs ceiling. `maxIterations` / `tolerance` are refused when defined.
         * @param gs - the snapshot
         * @param o - `weighted`, `harmonic` (exact runs), and a sampled run's `sources` (undirected snapshots only)
         * @returns the f32 scores with `precision: "f32"` and `sourcesUsed`
         */
        async closenessCentrality(gs: GraphSnapshot, o?: ClosenessAcceleratorOptions): Promise<GpuClosenessResult> {
            ctx.assertReady();
            return await closenessCentrality(ctx, gs, o);
        },
        /**
         * All-pairs shortest paths on the device: blocked Floyd-Warshall, `E_TOO_LARGE` above the device's
         * storage-binding ceiling. The seam passes `SsspOptions`; neither of its keys has an all-pairs meaning, so a
         * defined `cutoff` (it would change what `+Infinity` means) or `weights` (a per-arc override is a different
         * matrix from the snapshot's resident column) is `E_UNSUPPORTED { option }`, never silently dropped.
         * @param gs - the snapshot
         * @param o - the seam's `SsspOptions`; both keys refused when defined
         * @returns the row-major `n x n` distances and `n`
         */
        async allPairsShortestPath(gs: GraphSnapshot, o?: SsspOptions): Promise<GpuApspResult> {
            ctx.assertReady();
            for (const key of ["cutoff", "weights"] as const) {
                if (o?.[key] !== undefined) {
                    throw new WebGpuGraphError("E_UNSUPPORTED", `allPairsShortestPath: ${key} is not supported`, {
                        option: key,
                        hint: "all-pairs shortest paths runs over the snapshot's own weights with no cutoff",
                    });
                }
            }
            return await allPairsShortestPath(ctx, gs);
        },
        /**
         * Triangle counting with the clustering coefficient and the transitivity.
         * @param gs - the snapshot
         * @returns perNode, total, coefficient and transitivity
         */
        async triangleCount(gs: GraphSnapshot): Promise<GpuTriangleResult> {
            ctx.assertReady();
            return await triangleCount(ctx, gs);
        },
        /**
         * Label propagation: `maxIterations` and `weighted` are honoured, `tolerance` is refused when
         * defined (a label propagation stops at a fixed point, not below a tolerance).
         * @param gs - the snapshot
         * @param o - the seam's placeholder `HitsOptionsLike`
         * @returns the labels dense in first-seen order, the community count and groups()
         */
        async labelPropagation(gs: GraphSnapshot, o?: HitsOptionsLike): Promise<GpuLabelResult> {
            ctx.assertReady();
            if (o?.tolerance !== undefined) {
                throw new WebGpuGraphError("E_UNSUPPORTED", "labelPropagation: tolerance has no meaning here", {
                    option: "tolerance",
                    hint: "label propagation stops at a fixed point or after maxIterations passes",
                });
            }
            return await labelPropagation(ctx, gs, { maxIterations: o?.maxIterations, weighted: o?.weighted });
        },
        /**
         * Boruvka's minimum spanning forest: the forest of the total edge order (weight, then
         * edge index), which is the one `kruskalMST` accepts. The seam's per-arc `weights` override is refused when
         * defined: the forest runs over the snapshot's own edge weights.
         * @param gs - the snapshot
         * @param o - the seam's `MstOptions`; `weights` refused when defined
         * @returns the forest's logical edge indices and its f64 total weight
         */
        async minimumSpanningTree(gs: GraphSnapshot, o?: MstOptions): Promise<GpuMstResult> {
            ctx.assertReady();
            if (o?.weights !== undefined) {
                throw new WebGpuGraphError("E_UNSUPPORTED", "minimumSpanningTree: weights is not supported", {
                    option: "weights",
                    hint: "the spanning forest runs over the snapshot's own edge weights",
                });
            }
            return await minimumSpanningTree(ctx, gs);
        },
        /**
         * Destroys every device buffer recorded for the snapshot; delegates to ctx.release.
         * @param s - the snapshot the app is done with
         */
        release(s: GraphSnapshot): void {
            ctx.release(s);
        },
        /**
         * Disposes the context; delegates to ctx.dispose, idempotent.
         */
        dispose(): void {
            ctx.dispose();
        },
    };
}
