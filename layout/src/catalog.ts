/**
 * The machine-readable catalog of this package's layouts: how to run each one (a one-shot function, a steppable
 * simulation, or both), what graph it accepts, whether it reads edge weights, which options it cannot do without,
 * and whether an accelerator can run it or must. An integration registers from `LAYOUTS` instead of keeping its
 * own table, so a new layout reaches it on upgrade.
 *
 * A one-shot layout is called as `fn(snapshot, options)` and returns a `LayoutResult`. A simulation is created with
 * `createSimulation(simulation, options, accelerator)` and stepped.
 */

import {
    arf,
    bfs,
    bipartite,
    circular,
    forceAtlas2,
    fruchtermanReingold,
    grid,
    kamadaKawai,
    multipartite,
    planar,
    radial,
    random,
    shell,
    spectral,
    spiral,
} from "./indexed";
import type { LayoutResult } from "./positions";
import type { LayoutAccelerator, SimulationType } from "./simulation/types";

/**
 * Whether a layout reads the snapshot's edge weights (an unweighted snapshot reads as every weight 1).
 * - "never": weights make no difference.
 * - "by-default": it reads them unless the options say `weight: false`.
 * - "on-request": it ignores them unless the options say `weight: true` (or name a weight column).
 */
export type LayoutWeightUse = "never" | "by-default" | "on-request";

/** The layout methods of `LayoutAccelerator`. */
export type LayoutAcceleratorMethod = Exclude<keyof LayoutAccelerator, "kind" | "release" | "dispose">;

/** One layout of the catalog. */
export interface LayoutEntry {
    /** The one-shot function's export name (for a simulation-only layout, its accelerator method's name). */
    readonly name: string;
    /** The one-shot function, `fn(snapshot, options)`; null for a layout that only runs as a simulation. */
    readonly fn: ((...args: never[]) => LayoutResult) | null;
    /** The `createSimulation` type that runs this layout step by step; null for a one-shot-only layout. */
    readonly simulation: SimulationType | null;
    /** The graphs it accepts: every layout here takes directed and undirected snapshots alike. */
    readonly direction: "any" | "directed" | "undirected";
    readonly weights: LayoutWeightUse;
    /** Options it throws without, or that name a column the snapshot must hold under their default. */
    readonly requiredOptions: readonly string[];
    /** The `LayoutAccelerator` method that can run the simulation; null when it runs only on the CPU. */
    readonly accelerator: LayoutAcceleratorMethod | null;
    /** True when there is no CPU implementation: `createSimulation` throws unless the accelerator implements it. */
    readonly requiresAccelerator: boolean;
}

const ONE_SHOT = {
    simulation: null,
    direction: "any",
    weights: "never",
    requiredOptions: [],
    accelerator: null,
    requiresAccelerator: false,
} as const;

/**
 * Every layout of `@graphty/layout`, keyed by name.
 * @example
 * ```ts
 * import { LAYOUTS } from "@graphty/layout";
 *
 * const oneShot = Object.values(LAYOUTS).filter((l) => l.fn !== null && l.requiredOptions.length === 0);
 * ```
 */
export const LAYOUTS = {
    random: { name: "random", fn: random, ...ONE_SHOT },
    circular: { name: "circular", fn: circular, ...ONE_SHOT },
    spiral: { name: "spiral", fn: spiral, ...ONE_SHOT },
    grid: { name: "grid", fn: grid, ...ONE_SHOT },
    shell: { name: "shell", fn: shell, ...ONE_SHOT },
    spectral: { name: "spectral", fn: spectral, ...ONE_SHOT },
    planar: { name: "planar", fn: planar, ...ONE_SHOT },
    arf: { name: "arf", fn: arf, ...ONE_SHOT },
    bfs: { name: "bfs", fn: bfs, ...ONE_SHOT },
    radial: { name: "radial", fn: radial, ...ONE_SHOT },
    bipartite: { name: "bipartite", fn: bipartite, ...ONE_SHOT },
    multipartite: { name: "multipartite", fn: multipartite, ...ONE_SHOT, requiredOptions: ["subsets"] },
    kamadaKawai: { name: "kamadaKawai", fn: kamadaKawai, ...ONE_SHOT, weights: "by-default" },
    forceAtlas2: {
        name: "forceAtlas2",
        fn: forceAtlas2,
        ...ONE_SHOT,
        simulation: "forceatlas2",
        weights: "on-request",
        accelerator: "forceAtlas2",
    },
    fruchtermanReingold: {
        name: "fruchtermanReingold",
        fn: fruchtermanReingold,
        ...ONE_SHOT,
        simulation: "fruchtermanReingold",
        accelerator: "fruchtermanReingold",
    },
    springElectrical: {
        name: "springElectrical",
        fn: null,
        ...ONE_SHOT,
        simulation: "spring-electrical",
        accelerator: "springElectrical",
        requiresAccelerator: true,
    },
} as const satisfies Readonly<Record<string, LayoutEntry>>;

/** The name of a layout in `LAYOUTS`. */
export type LayoutName = keyof typeof LAYOUTS;
