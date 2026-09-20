/**
 * createAccelerator (spec 3.3, 9; contract 3.14): the injectable object that satisfies the CPU packages'
 * AlgorithmAccelerator and LayoutAccelerator interfaces (spec 9.2, 9.3). Both are the REAL declarations,
 * `LayoutAccelerator` from `@graphty/layout` (W1b, layout half) and `AlgorithmAccelerator` from
 * `@graphty/algorithms` (W1b, algorithms half), `import type`d by src/types/accelerator.ts, so the object built
 * here is checked against the CPU packages' own contracts. It carries P3's `forceAtlas2`, `release` and `dispose`,
 * P5's `fruchtermanReingold` and `springElectrical` (the two other layout members of spec 9.3, landed together once
 * both models were green, P5 PD-19) and P7's seven algorithm members (spec 8.2, 8.3; M8b-T8, PD-14) and nothing
 * else: the CPU-side dispatchers (`accelerated()`, `createSimulation()`) test `acc.betweennessCentrality !== undefined`
 * / `acc.fruchtermanReingold !== undefined` and route to the CPU when the member is absent (spec 2.4 row "method
 * missing"), so a method the GPU does not implement must not exist here -- never a throwing stub. The remaining
 * algorithm members arrive one per shipped algorithm from P8.
 */

import { type F32, type F64, type GraphSnapshot } from "@graphty/graph-format";

import { connectedComponents } from "./algorithms/components.js";
import { pageRank, personalizedPageRank } from "./algorithms/pagerank.js";
import { eigenvectorCentrality, hits, katzCentrality } from "./algorithms/spectral.js";
import { type GpuContext } from "./context.js";
import { createForceAtlas2 } from "./layouts/forceatlas2.js";
import { createFruchtermanReingold } from "./layouts/fruchterman-reingold.js";
import { createSpringElectrical } from "./layouts/spring-electrical.js";
import { type AcceleratorOptions, type GpuAccelerator } from "./types/accelerator.js";
import {
    type ComponentsOptions,
    type EigenvectorOptions,
    type GpuHitsResult,
    type GpuLabelResult,
    type GpuPageRankResult,
    type GpuScoresResult,
    type HitsOptions,
    type KatzOptions,
    type PageRankOptions,
} from "./types/algorithms.js";
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

/** The `algorithms` record of AcceleratorOptions (spec 3.3), named for the copy helpers. */
type AlgorithmDefaults = NonNullable<AcceleratorOptions["algorithms"]>;

/** The `algorithms.betweenness` record of AcceleratorOptions (spec 3.3: the `k` / `sources` defaults until A2). */
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
 * The frozen deep copy of the accelerator options (spec 3.3 GpuAccelerator.options: "the tuning defaults given
 * to createAccelerator; frozen"; contract 3.14): the record, its `layout` tuning, its `algorithms` record, the
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
 * Spec 3.3 createAccelerator, verbatim: the object implementing AlgorithmAccelerator & LayoutAccelerator
 * structurally; P3's forceAtlas2, release and dispose, P5's fruchtermanReingold and springElectrical (the same
 * `{ ...o, ...options.layout }` shape as forceAtlas2) plus P7's seven algorithm members, each a delegation to
 * its algorithm with `ctx.assertReady()` first. The accelerator's algorithm defaults are not consulted by any of
 * them: only `betweenness` has any, and it belongs to P9. One per call (the app creates one and injects
 * it, spec 2.4); `kind` is "webgpu"; `options` is a frozen deep copy; `forceAtlas2(o)` is
 * `createForceAtlas2(ctx, { ...o, ...options.layout })`, so the GPU tuning given here wins over anything the
 * CPU-typed option object carries (spec 3.3: tuning never comes from the caller of the accelerator method);
 * `release(s)` is `ctx.release(s)`; `dispose()` is `ctx.dispose()`.
 * @param ctx - the context every simulation the accelerator creates runs on
 * @param options - GPU-only defaults inherited by every simulation (`layout`) and, from P9, the algorithm defaults
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
        ctx,
        options: frozen,
        /**
         * The ForceAtlas2 simulation with this accelerator's layout tuning (spec 3.3; contract 3.14).
         * @param o - the CPU option type (spec 9.3 ForceAtlas2Options); GPU tuning keys come from `options.layout`
         * @returns a fresh simulation in state "created"
         */
        forceAtlas2(o?: ForceAtlas2Options): GpuLayoutSimulation<ForceAtlas2Options, ForceAtlas2Stats> {
            ctx.assertReady();
            return createForceAtlas2(ctx, { ...o, ...frozen.layout });
        },
        /**
         * The Fruchterman-Reingold simulation with this accelerator's layout tuning (spec 3.3, 7.20; P5).
         * @param o - the CPU option type (spec 9.3 FruchtermanReingoldOptions); GPU tuning keys come from `options.layout`
         * @returns a fresh simulation in state "created"
         */
        fruchtermanReingold(
            o?: FruchtermanReingoldOptions,
        ): GpuLayoutSimulation<FruchtermanReingoldOptions, FruchtermanReingoldStats> {
            ctx.assertReady();
            return createFruchtermanReingold(ctx, { ...o, ...frozen.layout });
        },
        /**
         * The spring-electrical preset with this accelerator's layout tuning (spec 3.3, 7.20; P5).
         * @param o - the CPU option type (spec 9.3 SpringElectricalOptions, ngraph's names)
         * @returns a fresh simulation in state "created"
         */
        springElectrical(o?: SpringElectricalOptions): GpuLayoutSimulation<SpringElectricalOptions, SpringElectricalStats> {
            ctx.assertReady();
            return createSpringElectrical(ctx, { ...o, ...frozen.layout });
        },
        /**
         * PageRank on the device (spec 8.2; contract 3.14).
         * @param gs - the snapshot
         * @param o - the CPU option record (spec 9.2 PageRankOptions)
         * @returns the f32 scores with `precision: "f32"` (spec 9.7)
         */
        async pageRank(gs: GraphSnapshot, o?: PageRankOptions): Promise<GpuPageRankResult> {
            ctx.assertReady();
            return await pageRank(ctx, gs, o);
        },
        /**
         * Personalized PageRank on the device (spec 8.2; contract 3.14). The mirror admits an f64 personalization
         * (spec 9.2 `F32 | F64`); the kernel reads f32, so an f64 vector is narrowed on the host first.
         * @param gs - the snapshot
         * @param personalization - one finite non-negative mass per node, not all zero
         * @param o - the CPU option record (spec 9.2 PageRankOptions)
         * @returns the f32 scores with `precision: "f32"` (spec 9.7)
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
         * HITS hubs and authorities on the device (spec 8.2; contract 3.14).
         * @param gs - the snapshot
         * @param o - the CPU option record (spec 9.2 HitsOptions)
         * @returns hubs and authorities with `precision: "f32"` (spec 9.7)
         */
        async hits(gs: GraphSnapshot, o?: HitsOptions): Promise<GpuHitsResult> {
            ctx.assertReady();
            return await hits(ctx, gs, o);
        },
        /**
         * Eigenvector centrality on the device (spec 8.2; contract 3.14).
         * @param gs - the snapshot
         * @param o - the CPU option record (spec 9.2 EigenvectorOptions)
         * @returns the f32 scores with `precision: "f32"` (spec 9.7)
         */
        async eigenvectorCentrality(gs: GraphSnapshot, o?: EigenvectorOptions): Promise<GpuScoresResult> {
            ctx.assertReady();
            return await eigenvectorCentrality(ctx, gs, o);
        },
        /**
         * Katz centrality on the device (spec 8.2; contract 3.14).
         * @param gs - the snapshot
         * @param o - the CPU option record (spec 9.2 KatzOptions)
         * @returns the f32 scores with `precision: "f32"` (spec 9.7)
         */
        async katzCentrality(gs: GraphSnapshot, o?: KatzOptions): Promise<GpuScoresResult> {
            ctx.assertReady();
            return await katzCentrality(ctx, gs, o);
        },
        /**
         * Weakly connected components on the device (spec 8.3; contract 3.14): WCC semantics on directed input.
         * @param gs - the snapshot
         * @param o - `renumber` (default true); the mirror passes none
         * @returns the labels, the count and groups() (spec 9.7 LabelResultLike)
         */
        async connectedComponents(gs: GraphSnapshot, o?: ComponentsOptions): Promise<GpuLabelResult> {
            ctx.assertReady();
            return await connectedComponents(ctx, gs, o);
        },
        /**
         * The same algorithm as `connectedComponents` under the mirror's other name (spec 3.3, 9.2).
         * @param gs - the snapshot
         * @param o - `renumber` (default true); the mirror passes none
         * @returns the labels, the count and groups() (spec 9.7 LabelResultLike)
         */
        async weaklyConnectedComponents(gs: GraphSnapshot, o?: ComponentsOptions): Promise<GpuLabelResult> {
            ctx.assertReady();
            return await connectedComponents(ctx, gs, o);
        },
        /**
         * Destroys every device buffer recorded for the snapshot (spec 4.5); delegates to ctx.release.
         * @param s - the snapshot the app is done with
         */
        release(s: GraphSnapshot): void {
            ctx.release(s);
        },
        /**
         * Disposes the context (spec 2.8); delegates to ctx.dispose, idempotent.
         */
        dispose(): void {
            ctx.dispose();
        },
    };
}
