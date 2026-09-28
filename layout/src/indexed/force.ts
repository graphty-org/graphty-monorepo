/**
 * One-shot ForceAtlas2 and Fruchterman-Reingold over a snapshot: the steppable CPU simulations run to the end of
 * their iteration budget, then the positions are rescaled.
 */

import type { F32, GraphSnapshot } from "@graphty/graph-format";

import { fromPositionColumn, type LayoutResult, rescaleInPlace } from "../positions";
import { ForceAtlas2Simulation } from "../simulation/forceatlas2";
import { FruchtermanReingoldSimulation } from "../simulation/fruchterman-reingold";
import { seedPositions } from "../simulation/seed";
import { toLayoutSnapshot } from "../simulation/snapshot";
import type { ForceAtlas2Options, FruchtermanReingoldOptions, SimulationOptions } from "../simulation/types";
import { layoutDim, startColumn } from "./start";

/**
 * An iteration count as a whole number: the ceiling of a fraction, 0 for a negative or non-finite count.
 * @param count - the option
 * @returns the iterations to run
 */
function wholeCount(count: number): number {
    return Number.isFinite(count) ? Math.max(0, Math.ceil(count)) : 0;
}

/** Options of indexed.forceAtlas2: the simulation's, without the stepping controls, plus a start. */
export interface IndexedForceAtlas2Options extends Omit<ForceAtlas2Options, keyof SimulationOptions> {
    /** Start positions, `dim` values per node in index order; a row holding NaN is drawn from the seed. */
    readonly pos?: F32 | null | undefined;
}

/** Options of indexed.fruchtermanReingold: the simulation's, without the stepping controls, plus a start. */
export interface IndexedFruchtermanReingoldOptions
    extends Omit<FruchtermanReingoldOptions, keyof SimulationOptions | "cooling"> {
    /** Start positions, `dim` values per node in index order; a row holding NaN is drawn from the seed. */
    readonly pos?: F32 | null | undefined;
}

/**
 * ForceAtlas2 run for `maxIter` iterations (default 100; a fractional count runs its ceiling, and 0, a negative or
 * a non-finite count runs none), then rescaled to `scale` (default 1) about `center` (default the origin).
 * `nodeMass` and `nodeSize` take a Float32Array, a node column name or an id-keyed record; with none, a role-`mass`
 * node column, else outDegree + 1. `weight` is true for the snapshot's weights or an edge column name.
 * @param g - the graph; a directed snapshot is laid out as its undirected copy
 * @param options - the options
 * @returns `dim` values per node
 */
export function forceAtlas2(g: GraphSnapshot, options: IndexedForceAtlas2Options = {}): LayoutResult {
    const s = toLayoutSnapshot(g);
    const dim = layoutDim(options.dim);
    const { pos, scale = 1, center, maxIter = 100, ...rest } = options;
    const column = startColumn(s, pos, dim);
    seedPositions(s, column, options.seed ?? null, dim, 1, null, "fa2");
    const iterations = wholeCount(maxIter);
    const sim = new ForceAtlas2Simulation({ ...rest, dim, maxIter: Math.max(1, iterations), settleThreshold: 0 });
    sim.load(s, column);
    if (iterations > 0) {
        sim.step(iterations);
    }
    sim.dispose();
    const positions = rescaleInPlace(fromPositionColumn(column, dim, 1, null), dim, scale, center);
    return { positions, dim, n: s.nodeCount };
}

/**
 * Fruchterman-Reingold run for `iterations` iterations (default 50; a fractional count runs its ceiling, and 0, a
 * negative or a non-finite count runs none) with the linear cooling schedule. A row of
 * `pos` holding NaN is drawn from the seed in [0, 1). Without pinned nodes the result is rescaled to `scale` about
 * `center`; with a `fixed` option or a role-`fixed` bool column it is left in the units of `pos`, so a pinned node
 * keeps exactly the coordinates it was given.
 * @param g - the graph; a directed snapshot is laid out as its undirected copy
 * @param options - the options
 * @returns `dim` values per node
 */
export function fruchtermanReingold(g: GraphSnapshot, options: IndexedFruchtermanReingoldOptions = {}): LayoutResult {
    const s = toLayoutSnapshot(g);
    const dim = layoutDim(options.dim);
    const { pos, scale = 1, center, iterations: count = 50, ...rest } = options;
    const column = startColumn(s, pos, dim);
    seedPositions(s, column, options.seed ?? null, dim, 1, null, "fr");
    const iterations = wholeCount(count);
    const sim = new FruchtermanReingoldSimulation({ ...rest, dim, iterations, settleThreshold: 0 });
    sim.load(s, column);
    if (iterations > 0) {
        sim.step(iterations);
    }
    sim.dispose();
    const positions = fromPositionColumn(column, dim, 1, null);
    const pinned = (rest.fixed ?? null) !== null || s.nodes.byRole("fixed")?.dtype === "bool";
    return { positions: pinned ? positions : rescaleInPlace(positions, dim, scale, center), dim, n: s.nodeCount };
}
