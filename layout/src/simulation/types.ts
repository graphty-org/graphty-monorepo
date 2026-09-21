import type { F32, GraphSnapshot, NodeId, NodeMask } from "@graphty/graph-format";

/** graph-format design 14.3 CommonLayoutOptions. */
export interface CommonLayoutOptions {
    readonly dim?: 2 | 3 | undefined;
    readonly scale?: number | undefined;
    readonly center?: ArrayLike<number> | undefined;
    readonly seed?: number | null | undefined;
}

/** Design 9.3 SimulationOptions: shared by every simulation type; the CPU simulations ignore maxInFlight. */
export interface SimulationOptions {
    /** Settle when the mean per-node displacement stays below settleThreshold * rmsRadius for settleWindow iterations (design 7.17). */
    readonly settleThreshold?: number | undefined;
    readonly settleWindow?: number | undefined;
    /** Iterations per step() call; default 1; the element passes its stepMultiplier (design 9.4 item 4). */
    readonly iterationsPerStep?: number | undefined;
    /** GPU simulations only (design 7.19); default 2. */
    readonly maxInFlight?: number | undefined;
}

/** Design 9.3 ForceAtlas2Options: the names and defaults of the positional forceatlas2Layout (design 7.14). */
export interface ForceAtlas2Options extends CommonLayoutOptions, SimulationOptions {
    readonly maxIter?: number | undefined;
    readonly jitterTolerance?: number | undefined;
    readonly scalingRatio?: number | undefined;
    readonly gravity?: number | undefined;
    readonly strongGravity?: boolean | undefined;
    readonly distributedAction?: boolean | undefined;
    readonly linlog?: boolean | undefined;
    /** A per-node mass (n values), the name of a numeric node column, the legacy id-keyed record, or null (role-`mass` column, else outDegree + 1). */
    readonly nodeMass?: F32 | string | Readonly<Record<NodeId, number>> | null | undefined;
    readonly nodeSize?: F32 | string | Readonly<Record<NodeId, number>> | null | undefined;
    /** true: the snapshot's weights; a string: a numeric edge column; false / null: unweighted. */
    readonly weight?: boolean | string | null | undefined;
    readonly dissuadeHubs?: boolean | undefined;
}

/** Design 9.3 FruchtermanReingoldOptions. */
export interface FruchtermanReingoldOptions extends CommonLayoutOptions, SimulationOptions {
    readonly k?: number | null | undefined;
    readonly iterations?: number | undefined;
    /**
     * The cooling schedule (default "linear"). "linear": the temperature falls from 0.1 to 0 over `iterations`
     * steps, so the run always lasts the whole budget. "adaptive": Yifan Hu's step control -- the temperature grows
     * by 1 / 0.9 after five consecutive iterations whose total force energy fell and shrinks by 0.9 whenever it
     * rose, so the run settles on its own, usually in a few hundred iterations whatever the graph size; `iterations`
     * is then only a cap. GPU simulations only in v1; the CPU simulation ignores it.
     */
    readonly cooling?: "linear" | "adaptive" | undefined;
    /** A node mask (the bool-column bit layout) or the name of a bool node column with role "fixed". */
    readonly fixed?: NodeMask | string | null | undefined;
}

/** Design 9.3 SpringElectricalOptions (ngraph's names and defaults, design 7.20); no CPU simulation in v1. */
export interface SpringElectricalOptions extends CommonLayoutOptions, SimulationOptions {
    readonly springLength?: number | undefined;
    /** Hooke's constant; null or absent: ngraph's 0.8 scaled down on graphs over a few hundred nodes (the GPU simulation's size rule). */
    readonly springCoefficient?: number | null | undefined;
    /** ngraph's Coulomb constant (negative repels); null or absent: ngraph's -12 scaled down the same way. */
    readonly gravity?: number | null | undefined;
    readonly dragCoefficient?: number | undefined;
    readonly timeStep?: number | undefined;
}

/** graph-format design 14.3 LayoutSimulation, verbatim: steppable layouts over the owner's stride-3 scene-unit array. */
export interface LayoutSimulation {
    /** positions: the owner's stride-3 scene-unit array, read AND written in place. */
    load(snapshot: GraphSnapshot, positions: F32): void;
    /** GPU implementations are async (the readback); CPU implementations return void. */
    step(iterations?: number): void | Promise<void>;
    readonly settled: boolean;
    /** The same bitmap layout as a bool column with role "fixed". */
    setFixed(mask: NodeMask): void;
    /** A drag during the simulation: one node's scene-unit position. */
    setPosition(index: number, x: number, y: number, z: number): void;
    dispose(): void;
}

/** Design 9.3 LayoutAccelerator: what an injected GPU implements; every method optional (only implemented ones exist). */
export interface LayoutAccelerator {
    readonly kind: string;
    forceAtlas2?(options?: ForceAtlas2Options): LayoutSimulation;
    fruchtermanReingold?(options?: FruchtermanReingoldOptions): LayoutSimulation;
    springElectrical?(options?: SpringElectricalOptions): LayoutSimulation;
    release?(s: GraphSnapshot): void;
    dispose?(): void;
}

/** Design 9.3 SimulationType; "spring" is the element's name for Fruchterman-Reingold. */
export type SimulationType = "forceatlas2" | "fruchtermanReingold" | "spring" | "spring-electrical";
