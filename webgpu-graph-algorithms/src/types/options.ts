/**
 * The option records of the layouts (spec 9.3, 7.14). The five layout-owned records come from `@graphty/layout` by
 * `import type` and are re-exported here, so a `ForceAtlas2Options` object the element parses is not merely
 * shaped like the one this package takes -- it IS the same declaration (W1b; the D27 mirrors are gone).
 * `ResolvedForceAtlas2Options` below is this package's own and stays local. Types only: nothing here is a runtime
 * import.
 */

import type { F32, NodeId, NodeMask } from "@graphty/graph-format";
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

/**
 * The resolved (defaults applied) Fruchterman-Reingold option record (spec 7.20, 9.3): `k` null means `1 / sqrt(n)`
 * at load; `fixed` is applied at load through ModelInputs.fixed (PD-6). Exported for src/layouts/fruchterman-reingold.ts
 * and the option tests.
 * @public
 */
export interface ResolvedFruchtermanReingoldOptions {
    readonly k: number | null;
    readonly iterations: number;
    readonly cooling: "linear" | "adaptive";
    readonly fixed: NodeMask | string | null;
    readonly dim: 2 | 3;
    readonly scale: number;
    readonly center: readonly [number, number, number];
    readonly seed: number | null;
    readonly settleThreshold: number;
    readonly settleWindow: number;
    readonly iterationsPerStep: number;
    readonly maxInFlight: number;
}

/**
 * The resolved spring-electrical option record (spec 7.20, 9.3; ngraph's names): `gravity` is the Coulomb constant
 * (negative repels), never FA2's centre gravity. `gravity` and `springCoefficient` are null when left to their
 * defaults: ngraph's constant scaled by min(1, SE_SCALE_REFERENCE_NODES / n) once n is known at load. Exported for
 * src/layouts/spring-electrical.ts and the option tests.
 * @public
 */
export interface ResolvedSpringElectricalOptions {
    readonly springLength: number;
    readonly springCoefficient: number | null;
    readonly gravity: number | null;
    readonly dragCoefficient: number;
    readonly timeStep: number;
    readonly dim: 2 | 3;
    readonly scale: number;
    readonly center: readonly [number, number, number];
    readonly seed: number | null;
    readonly settleThreshold: number;
    readonly settleWindow: number;
    readonly iterationsPerStep: number;
    readonly maxInFlight: number;
}
