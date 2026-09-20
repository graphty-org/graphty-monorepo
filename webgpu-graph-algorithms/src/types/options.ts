/**
 * The option records of the layouts (spec 9.3, 7.14). The five layout-owned records come from `@graphty/layout` by
 * `import type` and are re-exported here, so a `ForceAtlas2Options` object the element parses is not merely
 * shaped like the one this package takes -- it IS the same declaration (W1b; the D27 mirrors are gone).
 * `ResolvedForceAtlas2Options` below is this package's own and stays local. Types only: nothing here is a runtime
 * import.
 */

import type { F32, NodeId } from "@graphty/graph-format";
import type {
    CommonLayoutOptions,
    ForceAtlas2Options,
    FruchtermanReingoldOptions,
    SimulationOptions,
    SpringElectricalOptions,
} from "@graphty/layout";

// The five layout-owned option records are @graphty/layout's declarations, re-exported so src/index.ts's barrel
// and the option type tests keep resolving them from here (W1b, Task M5b-T2).
export type {
    CommonLayoutOptions,
    ForceAtlas2Options,
    FruchtermanReingoldOptions,
    SimulationOptions,
    SpringElectricalOptions,
};

/**
 * The resolved (defaults applied) ForceAtlas2 option record the simulation keeps; every field present.
 * Exported: consumed by src/layouts/forceatlas2.ts (P3-T2, resolveForceAtlas2Options) and the option tests.
 * @public
 */
export interface ResolvedForceAtlas2Options {
    readonly maxIter: number;
    readonly jitterTolerance: number;
    readonly scalingRatio: number;
    readonly gravity: number;
    readonly strongGravity: boolean;
    readonly distributedAction: boolean;
    readonly linlog: boolean;
    readonly nodeMass: F32 | string | Readonly<Record<NodeId, number>> | null;
    readonly nodeSize: F32 | string | Readonly<Record<NodeId, number>> | null;
    readonly weight: boolean | string | null;
    readonly dissuadeHubs: boolean;
    readonly dim: 2 | 3;
    readonly scale: number;
    readonly center: readonly [number, number, number];
    readonly seed: number | null;
    readonly settleThreshold: number;
    readonly settleWindow: number;
    readonly iterationsPerStep: number;
    readonly maxInFlight: number;
}
