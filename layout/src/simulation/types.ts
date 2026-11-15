import type { F32, GraphSnapshot, NodeId, NodeMask, U32 } from "@graphty/graph-format";

/** graph-format design 14.3 CommonLayoutOptions. */
export interface CommonLayoutOptions {
    readonly dim?: 2 | 3 | undefined;
    readonly scale?: number | undefined;
    readonly center?: ArrayLike<number> | undefined;
    readonly seed?: number | null | undefined;
}

/** Design 9.3 SimulationOptions: shared by every simulation type; the CPU simulations ignore maxInFlight. */
export interface SimulationOptions {
    /**
     * Settle when the mean per-node displacement stays below settleThreshold * rmsRadius for settleWindow iterations
     * (design 7.17). Default 0.001.
     */
    readonly settleThreshold?: number | undefined;
    /** How many quiet iterations in a row (see `settleThreshold`) count as settled. Default 10. */
    readonly settleWindow?: number | undefined;
    /** Iterations per step() call; default 1; the element passes its stepMultiplier (design 9.4 item 4). */
    readonly iterationsPerStep?: number | undefined;
    /** GPU simulations only (design 7.19); default 2. */
    readonly maxInFlight?: number | undefined;
}

/** Design 9.3 ForceAtlas2Options: the names and defaults of the positional forceatlas2Layout (design 7.14). */
export interface ForceAtlas2Options extends CommonLayoutOptions, SimulationOptions {
    /** Iteration cap; default 100. The run also ends once it settles (see `settleThreshold`). */
    readonly maxIter?: number | undefined;
    /** How much swinging a node may show before its speed is cut; higher is faster and less precise. Default 1. */
    readonly jitterTolerance?: number | undefined;
    /** Strength of the repulsion between every pair of nodes; higher spreads the graph out. Default 2. */
    readonly scalingRatio?: number | undefined;
    /** Pull toward the centre, which keeps disconnected parts from drifting apart. Default 1. */
    readonly gravity?: number | undefined;
    /** Gravity that grows with the distance from the centre instead of staying constant. Default false. */
    readonly strongGravity?: boolean | undefined;
    /** Divide each node's attraction by its mass, so well-connected nodes move less. Default false. */
    readonly distributedAction?: boolean | undefined;
    /** Logarithmic attraction (LinLog mode), which draws clusters tighter. Default false. */
    readonly linlog?: boolean | undefined;
    /** A per-node mass (n values), the name of a numeric node column, the legacy id-keyed record, or null (role-`mass` column, else outDegree + 1). */
    readonly nodeMass?: F32 | string | Readonly<Record<NodeId, number>> | null | undefined;
    /**
     * Prevent overlapping (Gephi's "Adjust Sizes"): each node's radius (n values, the name of a numeric node column, or
     * the legacy id-keyed record), in the units of the positions (scene units for a simulation). Distances are then
     * measured between outlines: overlapping nodes push each other apart hard, touching ones neither attract nor
     * repel, and each move is capped so the layout stays calm. The Barnes-Hut approximation of far nodes still treats
     * them as points. null or absent: nodes are points. The GPU simulation refuses a nodeSize.
     */
    readonly nodeSize?: F32 | string | Readonly<Record<NodeId, number>> | null | undefined;
    /** true: the snapshot's weights; a string: a numeric edge column; false / null: unweighted. */
    readonly weight?: boolean | string | null | undefined;
    /**
     * Dissuade hubs: divide each node's attraction by its degree + 1, so hubs are pushed to the edge of the drawing
     * and the nodes around them hold the centre. Applies on top of `distributedAction`. Default false. The GPU
     * simulation honors it too.
     */
    readonly dissuadeHubs?: boolean | undefined;
    /**
     * Approximate the repulsion with a Barnes-Hut tree, as Gephi does: a group of nodes far enough away repels as one
     * body at its centre of mass. Each iteration then costs O(n log n) instead of O(n^2), so graphs of thousands of
     * nodes settle in a fraction of the time, with a slightly different drawing. The CPU simulation reads it; a
     * GPU simulation computes every pair. Default false.
     */
    readonly barnesHutOptimize?: boolean | undefined;
    /**
     * The Barnes-Hut opening angle: a group repels as one body when its width over its distance is below it. Lower
     * is closer to every pair and slower; Gephi uses 1.2 too. Read only with `barnesHutOptimize`. Default 1.2.
     */
    readonly barnesHutTheta?: number | undefined;
}

/** Design 9.3 FruchtermanReingoldOptions. */
export interface FruchtermanReingoldOptions extends CommonLayoutOptions, SimulationOptions {
    /** The ideal distance between neighbours; null or absent: `1 / sqrt(n)` of the unit square. */
    readonly k?: number | null | undefined;
    /** Iteration budget; default 50. */
    readonly iterations?: number | undefined;
    /**
     * The cooling schedule (default "linear"). "linear": the temperature falls from 0.1 to 0 over `iterations`
     * steps, so the run always lasts the whole budget. "adaptive": Yifan Hu's step control -- the temperature grows
     * by 1 / 0.9 after five consecutive iterations whose total force energy fell and shrinks by 0.9 whenever it
     * rose (or stayed equal), so the run settles on its own, usually in a few hundred iterations whatever the graph
     * size; `iterations` is then only a cap, 10,000 when not given, and reheat() restarts the controller at 0.1. The
     * CPU and the GPU simulations run the same rule with the same constants.
     */
    readonly cooling?: "linear" | "adaptive" | undefined;
    /** A node mask (the bool-column bit layout) or the name of a bool node column with role "fixed". */
    readonly fixed?: NodeMask | string | null | undefined;
}

/** Design 9.3 SpringElectricalOptions (ngraph's names and defaults, design 7.20); no CPU simulation in v1. */
export interface SpringElectricalOptions extends CommonLayoutOptions, SimulationOptions {
    /** Iteration cap; null or absent: no cap, the run ends only once it settles (see `settleThreshold`). With a cap the run ends at whichever comes first. */
    readonly maxIter?: number | null | undefined;
    /** The rest length of every edge's spring; default 10. */
    readonly springLength?: number | undefined;
    /** Hooke's constant; null or absent: ngraph's 0.8 scaled down on graphs over a few hundred nodes (the GPU simulation's size rule). */
    readonly springCoefficient?: number | null | undefined;
    /** ngraph's Coulomb constant (negative repels); null or absent: ngraph's -12 scaled down the same way. */
    readonly gravity?: number | null | undefined;
    /** Friction: the share of its velocity a node loses each iteration; default 0.9. */
    readonly dragCoefficient?: number | undefined;
    /** Integration step; larger moves faster and less stably. Default 0.5. */
    readonly timeStep?: number | undefined;
}

/** What `LayoutSimulation.setClusters` pulls together. */
export interface ClusterOptions {
    /** One community number per row, each below the node count, or `NO_CLUSTER` for a row in none. */
    readonly communities: U32;
    /**
     * How hard a node is pulled toward its community's centroid: 1 is the pull of one more edge, per unit of the node's
     * mass, tying it there. Default 1.
     */
    readonly strength?: number | undefined;
}

/**
 * What `LayoutSimulation.setCollision` keeps apart: every two nodes end up at least the sum of their radii from each
 * other, as with d3's `forceCollide`.
 */
export interface CollisionOptions {
    /** One radius per node, >= 0, in the units of the owner's position array. Add half a wanted gap to each. */
    readonly radii: F32;
    /** What every radius is multiplied by; for an owner whose units change as the arrangement grows. Default 1. */
    readonly scale?: number | undefined;
    /** In a 3D simulation, compare and push across x and y only, so nodes do not cover each other from the front. Default false. */
    readonly flat?: boolean | undefined;
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
    /**
     * Takes rows out of the forces, in the same bitmap layout: an inert row never moves and exerts no force on any
     * other row -- no repulsion and no pull along its edges -- and it is left out of the centroid, the spread and every
     * count the simulation keeps, so the rest lay out as if it were absent. For a node the owner places itself, such
     * as a group drawn round its members. Call it after load(); a same-size reload keeps it, a new node count clears it. The mask is copied; an all-zero mask makes every row live again. Optional, so an
     * accelerator written before it still type-checks; every simulation in this package and in
     * `@graphty/webgpu-graph-algorithms` implements it.
     */
    setInert?(mask: NodeMask): void;
    /**
     * Pulls each community toward its own mass-weighted centroid, on top of the forces, until called with null. Call it
     * after load(); a same-size reload keeps it, a new node count clears it. Copied; never reheats. Optional, so an
     * accelerator written before it still type-checks; every simulation in this package and in
     * `@graphty/webgpu-graph-algorithms` implements it.
     */
    setClusters?(clusters: ClusterOptions | null): void;
    /**
     * Keeps nodes from overlapping (see {@link CollisionOptions}), or stops doing so with null, the default. Call it
     * after load(); a same-size reload keeps it, a new node count clears it. The values are copied, so a changed
     * radius or scale takes effect by calling it again, which does not reheat. A collision moves nodes after the
     * forces of every iteration and does not count toward `settled`. Optional, so an accelerator written before it
     * still type-checks; every simulation in this package and in `@graphty/webgpu-graph-algorithms` implements it.
     */
    setCollision?(collision: CollisionOptions | null): void;
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
