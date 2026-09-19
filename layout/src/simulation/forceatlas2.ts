/**
 * The steppable CPU ForceAtlas2 of the layout seam (design 9.3 `ForceAtlas2Simulation`; graph-format design 14.3
 * `LayoutSimulation`): a PORT of the GPU package's f64 reference, webgpu-graph-algorithms/test/oracle/forceatlas2.ts
 * (the SPEC of this class, design 11.3 / the P3 row; it stays in the GPU package, D-16). The formulas, the K1-K5
 * stage order, `estimateFactor`, `kickDir` and the settle rule are the oracle's line for line, so a reviewer can diff
 * the two files by formula: every formula line keeps the oracle's citation (`7.2 row ...` / `layout.py line ...`).
 * What changes is the shell around them:
 *
 * - `load(snapshot, positions)` takes the owner's stride-3 SCENE-unit Float32Array and converts it into the internal
 *   f64 LAYOUT-unit array `(v - center[a]) / scale` (z forced to 0 in 2D); `step()` writes every FREE node back as
 *   `layout * scale + center[a]` (z = center.z in 2D, design 7.13 / 7.18); a fixed row is never written, its scene
 *   value is the owner's (design 7.12).
 * - f64 scratch always, f32 output through the owner's Float32Array itself (graph-format design 14.3): the oracle's
 *   `precision: "f32"` mode and its `round` wrapper are dropped, so where the oracle writes `r(a + b)` this file
 *   writes `a + b`; the fold order over FA2_FOLD_LANES lanes is kept so the two f64 transcriptions sum identically.
 * - the trace, the per-kernel stages, `resync`, `peekFold`, the bounding box and the layout radius (the GPU's
 *   inspect() and grid-tier instrumentation) are dropped.
 * - the settle rule of design 7.17 (`settled = iterationsDone >= maxIter || settledCount >= settleWindow`), the
 *   pin / drag / reheat semantics of design 7.12 and D8, and `dispose()`.
 *
 * `compat` (D5): `"paper"` (the default) is the published algorithm as Gephi implements it -- centroid gravity, the
 * force-based swing / traction `m |F(t) - F(t-1)|` over free nodes, fresh global sums each iteration; `"networkx"`
 * reproduces NetworkX 3.4.2 `forceatlas2_layout` -- origin gravity, the position-mixed per-node swing / traction,
 * the global sums accumulated across iterations from 1 (test/simulation/forceatlas2.test.ts checks it against the
 * NetworkX fixtures the GPU package pins). `nodeSize` (adjustSizes, deferred: design 7.14, Q-25), `dissuadeHubs`
 * (ignored exactly like the legacy CPU), `seed` (the caller seeds the array with seedPositions) and `maxInFlight`
 * (GPU only) are accepted and unused.
 *
 * The u32 hash of the coincident kick (kickDir) re-implements the GPU prelude's lowbias32 / pair_hash / hash_dir with
 * JavaScript's 32-bit operators on HASH WORDS and node indices below 2^32.
 */

import { type F32, type GraphSnapshot, maskTest, type NodeId, type NodeMask } from "@graphty/graph-format";

import {
    FA2_COINCIDENT_SQ,
    FA2_DEFAULTS,
    FA2_DISTANCE_FLOOR,
    FA2_DISTANCE_FLOOR_SQ,
    FA2_FOLD_LANES,
} from "./constants";
import { resolveNodeVector, resolveWeights } from "./inputs";
import type { ForceAtlas2Options, LayoutSimulation } from "./types";

/** The constructor's options: the FA2 options of design 9.3 plus the force-law mode of D5. */
type ForceAtlas2SimulationOptions = ForceAtlas2Options & { readonly compat?: "paper" | "networkx" | undefined };

/** The options after FA2_DEFAULTS and validation (design 7.14). */
interface ResolvedOptions {
    readonly maxIter: number;
    readonly jitterTolerance: number;
    readonly scalingRatio: number;
    readonly gravity: number;
    readonly strongGravity: boolean;
    readonly distributedAction: boolean;
    readonly linlog: boolean;
    readonly nodeMass: F32 | string | Readonly<Record<NodeId, number>> | null;
    readonly weight: boolean | string | null;
    readonly dim: 2 | 3;
    readonly scale: number;
    readonly center: readonly [number, number, number];
    readonly settleThreshold: number;
    readonly settleWindow: number;
    readonly iterationsPerStep: number;
    readonly compat: "paper" | "networkx";
}

/** The per-load scratch of one iteration (allocated by load(), released by dispose()). */
interface Scratch {
    /** K2's per-node attraction, stride 3. */
    readonly attraction: Float64Array;
    /** K3's total force F(t), stride 3. */
    readonly force: Float64Array;
    /** K3's per-node swing. */
    readonly swing: Float64Array;
    /** K3's per-node traction. */
    readonly traction: Float64Array;
    /** K5's per-node partials A: the position sums and |p - c|^2. */
    readonly sumX: Float64Array;
    readonly sumY: Float64Array;
    readonly sumZ: Float64Array;
    readonly sumW: Float64Array;
    /** K5's per-node partials C: the free displacement and the free count. */
    readonly disp: Float64Array;
    readonly free: Float64Array;
}

/** The per-workgroup partials A and C of one integrate (contract 4.5 K5), kept until the next K1 fold. */
interface GroupPartials {
    readonly sumX: Float64Array;
    readonly sumY: Float64Array;
    readonly sumZ: Float64Array;
    readonly sumW: Float64Array;
    readonly disp: Float64Array;
    readonly free: Float64Array;
}

/** The K1 totals of a set of partials (foldTotals): the folded sums, sum of squares, displacement and free count. */
interface FoldTotals {
    readonly sum: readonly [number, number, number];
    readonly sumSq: number;
    readonly disp: number;
    readonly free: number;
}

/**
 * Validates a numeric option.
 * @param name - the option name
 * @param value - the caller's value or undefined
 * @param fallback - the default
 * @param ok - the range predicate
 * @param expected - the range in words
 * @returns the value to use
 */
function pickNumber(
    name: string,
    value: number | undefined,
    fallback: number,
    ok: (v: number) => boolean,
    expected: string,
): number {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== "number" || !ok(value)) {
        throw new RangeError(`ForceAtlas2Simulation: ${name} must be ${expected}, got ${String(value)}`);
    }
    return value;
}

/**
 * Validates a boolean option.
 * @param name - the option name
 * @param value - the caller's value or undefined
 * @param fallback - the default
 * @returns the value to use
 */
function pickBoolean(name: string, value: boolean | undefined, fallback: boolean): boolean {
    if (value === undefined) {
        return fallback;
    }
    if (typeof value !== "boolean") {
        throw new TypeError(`ForceAtlas2Simulation: ${name} must be a boolean, got ${String(value)}`);
    }
    return value;
}

/**
 * The three finite components of a CommonLayoutOptions.center (missing components are 0).
 * @param center - the caller's center or undefined
 * @returns [x, y, z]
 */
function pickCenter(center: ArrayLike<number> | undefined): readonly [number, number, number] {
    const out: [number, number, number] = [0, 0, 0];
    if (center === undefined) {
        return out;
    }
    if (center.length > 3) {
        throw new RangeError(`ForceAtlas2Simulation: center has ${center.length} components, at most 3 expected`);
    }
    for (let axis = 0; axis < center.length; axis++) {
        const v = center[axis];
        if (typeof v !== "number" || !Number.isFinite(v)) {
            throw new RangeError(`ForceAtlas2Simulation: center[${axis}] is not finite`);
        }
        out[axis] = v;
    }
    return out;
}

/**
 * A positive integer predicate.
 * @param v - the value
 * @returns true for an integer >= 1
 */
function isPositiveInteger(v: number): boolean {
    return Number.isInteger(v) && v >= 1;
}

/**
 * Applies FA2_DEFAULTS and validates the ranges of design 7.14.
 * @param options - the caller's options
 * @returns the resolved record
 */
function resolveOptions(options: ForceAtlas2SimulationOptions | undefined): ResolvedOptions {
    const o: ForceAtlas2SimulationOptions = options ?? {};
    const dim = o.dim ?? FA2_DEFAULTS.dim;
    if (dim !== 2 && dim !== 3) {
        throw new RangeError(`ForceAtlas2Simulation: dim must be 2 or 3, got ${String(dim)}`);
    }
    const compat = o.compat ?? "paper";
    if (compat !== "paper" && compat !== "networkx") {
        throw new RangeError(`ForceAtlas2Simulation: compat must be "paper" or "networkx", got ${String(compat)}`);
    }
    return {
        maxIter: pickNumber("maxIter", o.maxIter, FA2_DEFAULTS.maxIter, isPositiveInteger, "an integer >= 1"),
        jitterTolerance: pickNumber(
            "jitterTolerance",
            o.jitterTolerance,
            FA2_DEFAULTS.jitterTolerance,
            (v) => v > 0,
            "> 0",
        ),
        scalingRatio: pickNumber("scalingRatio", o.scalingRatio, FA2_DEFAULTS.scalingRatio, (v) => v > 0, "> 0"),
        gravity: pickNumber("gravity", o.gravity, FA2_DEFAULTS.gravity, (v) => v >= 0, ">= 0"),
        strongGravity: pickBoolean("strongGravity", o.strongGravity, FA2_DEFAULTS.strongGravity),
        distributedAction: pickBoolean("distributedAction", o.distributedAction, FA2_DEFAULTS.distributedAction),
        linlog: pickBoolean("linlog", o.linlog, FA2_DEFAULTS.linlog),
        nodeMass: o.nodeMass ?? null,
        weight: o.weight ?? null,
        dim,
        scale: pickNumber(
            "scale",
            o.scale,
            FA2_DEFAULTS.scale,
            (v) => Number.isFinite(v) && v > 0,
            "a finite number > 0",
        ),
        center: pickCenter(o.center),
        settleThreshold: pickNumber(
            "settleThreshold",
            o.settleThreshold,
            FA2_DEFAULTS.settleThreshold,
            (v) => v >= 0,
            ">= 0",
        ),
        settleWindow: pickNumber(
            "settleWindow",
            o.settleWindow,
            FA2_DEFAULTS.settleWindow,
            isPositiveInteger,
            "an integer >= 1",
        ),
        iterationsPerStep: pickNumber(
            "iterationsPerStep",
            o.iterationsPerStep,
            FA2_DEFAULTS.iterationsPerStep,
            isPositiveInteger,
            "an integer >= 1",
        ),
        compat,
    };
}

/**
 * The scratch arrays of one iteration for n nodes.
 * @param n - the node count
 * @returns zeroed scratch
 */
function allocateScratch(n: number): Scratch {
    return {
        attraction: new Float64Array(3 * n),
        force: new Float64Array(3 * n),
        swing: new Float64Array(n),
        traction: new Float64Array(n),
        sumX: new Float64Array(n),
        sumY: new Float64Array(n),
        sumZ: new Float64Array(n),
        sumW: new Float64Array(n),
        disp: new Float64Array(n),
        free: new Float64Array(n),
    };
}

// ============================================================ the fold order (contract 4.3 / 4.5, sums only)

/**
 * The workgroup-form wg_reduce of contract 4.3 over FA2_FOLD_LANES lanes, in place: lanes[l] = lanes[l] +
 * lanes[l + s] for s = WG / 2, WG / 4, ..., 1 (the fixed tree order both f64 transcriptions sum in).
 * @param lanes - exactly FA2_FOLD_LANES values (destroyed)
 * @returns the workgroup total (lanes[0])
 */
function treeReduce(lanes: Float64Array): number {
    for (let s = FA2_FOLD_LANES / 2; s > 0; s = Math.floor(s / 2)) {
        for (let l = 0; l < s; l++) {
            lanes[l] = lanes[l] + lanes[l + s];
        }
    }
    return lanes[0];
}

/**
 * The per-workgroup sums of a per-node value (K3's swing / traction epilogue, K5's partials A and C): node i sits
 * in lane i % WG of group floor(i / WG); lanes beyond n carry 0, exactly as the invalid lanes of 4.5 do.
 * @param values - one value per node (length >= n)
 * @param n - the node count
 * @returns one total per workgroup (ceil(n / WG) entries)
 */
function groupTotals(values: ArrayLike<number>, n: number): Float64Array {
    const groups = Math.ceil(n / FA2_FOLD_LANES);
    const totals = new Float64Array(groups);
    const lanes = new Float64Array(FA2_FOLD_LANES);
    for (let g = 0; g < groups; g++) {
        for (let l = 0; l < FA2_FOLD_LANES; l++) {
            const i = g * FA2_FOLD_LANES + l;
            lanes[l] = i < n ? values[i] : 0;
        }
        totals[g] = treeReduce(lanes);
    }
    return totals;
}

/**
 * The one-workgroup fold of K1 and K4 over the per-workgroup partials: lane l accumulates partials[l],
 * partials[l + WG], ... sequentially (the `for (g = lid; g < groups; g += WG)` loop of 4.5), then the tree.
 * @param partials - one value per workgroup
 * @returns the folded total
 */
function foldGroups(partials: ArrayLike<number>): number {
    const lanes = new Float64Array(FA2_FOLD_LANES);
    for (let g = 0; g < partials.length; g++) {
        const l = g % FA2_FOLD_LANES;
        lanes[l] = lanes[l] + partials[g];
    }
    return treeReduce(lanes);
}

/**
 * WGSL length() of a three-vector (sqrt of the left-to-right sum of squares).
 * @param x - component x
 * @param y - component y
 * @param z - component z
 * @returns the length
 */
function len3(x: number, y: number, z: number): number {
    return Math.sqrt(x * x + y * y + z * z);
}

// ============================================================ the coincident kick (contract 4.1)

/**
 * Wellons' lowbias32 integer hash of the prelude (contract 4.1), on u32 words.
 * @param x0 - the input word
 * @returns the hashed word in [0, 2^32)
 */
function lowbias32(x0: number): number {
    let x = x0 >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    x = Math.imul(x, 0x7feb352d) >>> 0;
    x = (x ^ (x >>> 15)) >>> 0;
    x = Math.imul(x, 0x846ca68b) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    return x;
}

/**
 * pair_hash of the prelude: lowbias32((min(i, j) * 0x9E3779B9) ^ max(i, j)), symmetric in (i, j).
 * @param i - one node index
 * @param j - the other node index
 * @returns the pair's hash word
 */
function pairHash(i: number, j: number): number {
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    return lowbias32(((Math.imul(lo, 0x9e3779b9) >>> 0) ^ hi) >>> 0);
}

/**
 * hash_unit of the prelude: the top 24 bits of a word as a value in [0, 1), exact in f32 and f64.
 * @param h - a hash word
 * @returns the unit value
 */
function hashUnit(h: number): number {
    return (h >>> 8) * (1 / 16777216);
}

/**
 * kick_dir of the prelude (contract 4.1): the deterministic unit direction of the coincident kick of design 7.2,
 * antisymmetric (kickDir(i, j) = -kickDir(j, i)); z = 0 in 2D.
 * @param i - the node receiving the kick
 * @param j - the coincident node
 * @param dim - 2 or 3
 * @returns the unit direction as [x, y, z]
 */
function kickDir(i: number, j: number, dim: 2 | 3): readonly [number, number, number] {
    const h = pairHash(i, j);
    const phi = 6.283185307179586 * hashUnit(h);
    let d: [number, number, number];
    if (dim === 2) {
        d = [Math.cos(phi), Math.sin(phi), 0];
    } else {
        const z = 2 * hashUnit(lowbias32((h ^ 0x5bd1e995) >>> 0)) - 1;
        const rr = Math.sqrt(Math.max(0, 1 - z * z));
        d = [rr * Math.cos(phi), rr * Math.sin(phi), z];
    }
    return i > j ? [-d[0], -d[1], -d[2]] : d;
}

// ============================================================ the speed controller (K4)

/** What estimateFactor returns: the new controller state. */
interface EstimateFactorResult {
    readonly speed: number;
    readonly speedEfficiency: number;
}

/**
 * estimateFactor, line for line (design 7.2 row "estimateFactor", 7.10; networkx 3.4.2 layout.py lines 1387-1420;
 * K4 of contract 4.5): the conditional `eff *= 0.5` / `*= 0.7` form that skips at or below the 0.05 floor, the
 * 1e30 target when swing is 0 (the same min() outcome as NetworkX's +inf), the 0.5 x speed maximum rise; the
 * halving predicate in the exact form `swing > 2 tr` of CONTRACT DECISION K4-1 (the same truth value as the port's
 * `swing / traction > 2`, decided identically on every device).
 * @param n - the node count
 * @param swing - the global swing (accumulated in networkx mode)
 * @param traction - the global traction
 * @param speed - the current speed
 * @param speedEfficiency - the current speed efficiency
 * @param jitterTolerance - the jitterTolerance option
 * @returns the new speed and efficiency
 */
function estimateFactor(
    n: number,
    swing: number,
    traction: number,
    speed: number,
    speedEfficiency: number,
    jitterTolerance: number,
): EstimateFactorResult {
    const nf = n;
    const jt = jitterTolerance;
    const optJitter = 0.05 * Math.sqrt(nf);
    const minJitter = Math.sqrt(optJitter);
    const maxJitter = 10;
    const tr = Math.max(traction, 1e-30); // guards the division only (7.10)
    const other = Math.min(maxJitter, (optJitter * traction) / (nf * nf));
    let jitter = jt * Math.max(minJitter, other);
    let eff = speedEfficiency;
    if (swing > 2 * tr) {
        // swing / traction > 2 in its exact form (contract 4.5 CONTRACT DECISION K4-1: at iteration 0 the traction
        // is exactly half the swing, and a device's f32 division may round x / (x / 2) above 2; 2 x never does)
        if (eff > 0.05) {
            eff = eff * 0.5; // the CPU's conditional multiply (7.2)
        }
        jitter = Math.max(jitter, jt);
    }
    const targetSpeed = swing === 0 ? 1e30 : (jitter * eff * traction) / swing;
    if (swing > jitter * traction) {
        if (eff > 0.05) {
            eff = eff * 0.7;
        }
    } else if (speed < 1000) {
        eff = eff * 1.3;
    }
    const newSpeed = speed + Math.min(targetSpeed - speed, 0.5 * speed);
    return { speed: newSpeed, speedEfficiency: eff };
}

// ============================================================ the simulation

/**
 * The steppable CPU ForceAtlas2 (design 9.3): `load()` a snapshot and the owner's scene-unit array, `step()` it in
 * place until `settled`, pin with `setFixed()`, drag with `setPosition()`. Synchronous; f64 scratch, f32 output.
 */
export class ForceAtlas2Simulation implements LayoutSimulation {
    private readonly options: ResolvedOptions;
    private readonly dim: 2 | 3;
    private readonly swingMode: 0 | 1;
    /** 0 centroid, 1 origin (from compat: paper -> 0, networkx -> 1; design 7.2 row "Gravity centre"). */
    private readonly gravityCenter: 0 | 1;

    private state: "created" | "loaded" | "disposed" = "created";
    private n = 0;
    private rowPtr: Uint32Array = new Uint32Array(1);
    private colIdx: Uint32Array = new Uint32Array(0);
    private weights: Float64Array | null = null;
    private mass: Float64Array = new Float64Array(0);
    /** The owner's stride-3 scene-unit array (empty until load()). */
    private owner: F32 = new Float32Array(0);
    /** Layout-unit positions, stride 3 (z = 0 in 2D). */
    private positions: Float64Array = new Float64Array(0);
    /** F(t-1), stride 3 (the paper-mode swing reference). */
    private oldForce: Float64Array = new Float64Array(0);
    private fixed: NodeMask | null = null;
    private scratch: Scratch = allocateScratch(0);

    private speedValue = 1;
    private speedEfficiencyValue = 1;
    private swingValue = 1;
    private tractionValue = 1;
    private settledCountValue = 0;
    private iterationsDoneValue = 0;
    private centroid: [number, number, number] = [0, 0, 0];
    /** The partials of the last integrate; null before the first iteration after load (K1 keeps load()'s state then). */
    private pending: GroupPartials | null = null;

    /**
     * Resolves the options (FA2_DEFAULTS applied, ranges validated: design 7.14) without touching a graph.
     * @param options - the FA2 options of design 9.3 plus `compat` ("paper" by default, D5)
     */
    constructor(options?: ForceAtlas2SimulationOptions) {
        this.options = resolveOptions(options);
        this.dim = this.options.dim;
        this.swingMode = this.options.compat === "networkx" ? 1 : 0;
        this.gravityCenter = this.options.compat === "networkx" ? 1 : 0;
    }

    /**
     * `iterationsDone >= maxIter || settledCount >= settleWindow` once loaded (design 7.17); an empty graph is settled
     * at once; false before load() and after dispose().
     * @returns whether step() would do nothing
     */
    get settled(): boolean {
        if (this.state !== "loaded") {
            return false;
        }
        return (
            this.n === 0 ||
            this.iterationsDoneValue >= this.options.maxIter ||
            this.settledCountValue >= this.options.settleWindow
        );
    }

    /**
     * Iterations run since load() or the last reheat() (the budget of design 7.17).
     * @returns the count
     */
    get iterationsDone(): number {
        return this.iterationsDoneValue;
    }

    /**
     * Takes the snapshot and the owner's array (design 7.19 load): validates, resolves the mass (a role-`mass`
     * column, else outDegree + 1: design 7.14, D28) and the weights, converts the scene-unit rows into the f64
     * layout-unit array `(v - center) / scale` (z forced to 0 in 2D), resets the speed controller (speed =
     * speedEfficiency = swing = traction = 1: the one place that does, D8), clears the fixed mask when n changed
     * (design 7.12), and reheats.
     * @param snapshot - an undirected snapshot (both arcs of every edge present)
     * @param positions - the owner's stride-3 scene-unit array, length 3 x nodeCount, read AND written in place
     */
    load(snapshot: GraphSnapshot, positions: F32): void {
        this.assertNotDisposed();
        if (snapshot.directed) {
            throw new Error("ForceAtlas2Simulation: the snapshot must be undirected (pass toUndirected().snapshot)");
        }
        const n = snapshot.nodeCount;
        if (positions.length !== 3 * n) {
            throw new Error(`ForceAtlas2Simulation: positions.length ${positions.length} !== 3 x ${n}`);
        }
        // the inputs are resolved BEFORE any state is touched, so a bad option leaves the previous load intact
        const degree = snapshot.outDegree();
        const massSource = resolveNodeVector(this.options.nodeMass, snapshot, (i) => degree[i] + 1);
        const weightSource = resolveWeights(this.options.weight, snapshot);
        const mass = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            mass[i] = massSource[i];
            if (!(mass[i] > 0)) {
                throw new Error(`ForceAtlas2Simulation: mass[${i}] must be positive`);
            }
        }
        // resolveWeights returns arcCount values (the snapshot's arc array or an edge column expanded to arcs)
        const weights = weightSource === null ? null : Float64Array.from(weightSource);
        if (n !== this.n) {
            this.fixed = null;
        }
        this.n = n;
        this.rowPtr = snapshot.rowPtr;
        this.colIdx = snapshot.colIdx;
        this.mass = mass;
        this.weights = weights;
        this.owner = positions;
        const { scale } = this.options;
        const [cx, cy, cz] = this.options.center;
        const layout = new Float64Array(3 * n);
        for (let i = 0; i < n; i++) {
            layout[3 * i] = (positions[3 * i] - cx) / scale;
            layout[3 * i + 1] = (positions[3 * i + 1] - cy) / scale;
            layout[3 * i + 2] = this.dim === 2 ? 0 : (positions[3 * i + 2] - cz) / scale;
        }
        this.positions = layout;
        this.oldForce = new Float64Array(3 * n);
        this.scratch = allocateScratch(n);
        this.speedValue = 1;
        this.speedEfficiencyValue = 1;
        this.swingValue = 1;
        this.tractionValue = 1;
        this.pending = null;
        this.writeInitialStatistics();
        this.state = "loaded";
        this.reheat();
    }

    /**
     * Runs up to `iterations` iterations (design 7.19 step): returns at once when settled, stops early when the
     * budget or the settle window is reached mid-batch, then writes every FREE node's scene position back into the
     * owner's array (`layout * scale + center`, z = center.z in 2D).
     * @param iterations - k (default options.iterationsPerStep, default 1)
     */
    step(iterations: number = this.options.iterationsPerStep): void {
        if (this.state === "disposed") {
            throw new Error("ForceAtlas2Simulation: disposed");
        }
        if (this.state === "created") {
            throw new Error("ForceAtlas2Simulation: not loaded (call load() first)");
        }
        if (!isPositiveInteger(iterations)) {
            throw new RangeError(
                `ForceAtlas2Simulation: iterations must be an integer >= 1, got ${String(iterations)}`,
            );
        }
        if (this.settled) {
            return;
        }
        let k = 0;
        while (k < iterations && !this.settled) {
            this.iterate();
            this.iterationsDoneValue += 1;
            k += 1;
        }
        this.writeBack();
    }

    /**
     * Copies the mask words (design 7.12): the mask must hold ceil(n / 32) words; reheat() iff some bit below n went
     * 1 -> 0 (an unpin); adding pins never reheats.
     * @param mask - the NodeMask (LSB-first words, the bool-column bit layout)
     */
    setFixed(mask: NodeMask): void {
        this.assertLoaded();
        const { n } = this;
        const words = Math.ceil(n / 32);
        if (mask.length < words) {
            throw new RangeError(
                `ForceAtlas2Simulation: setFixed: the mask has ${mask.length} words, ${words} needed for ${n} nodes`,
            );
        }
        let unpinned = false;
        const previous = this.fixed;
        if (previous !== null) {
            for (let w = 0; w < words && !unpinned; w++) {
                if (previous[w] === mask[w]) {
                    continue;
                }
                const last = Math.min(n, w * 32 + 32);
                for (let i = w * 32; i < last; i++) {
                    if (maskTest(previous, i) && !maskTest(mask, i)) {
                        unpinned = true;
                        break;
                    }
                }
            }
        }
        const copy = new Uint32Array(words);
        copy.set(mask.subarray(0, words));
        this.fixed = copy;
        if (unpinned) {
            this.reheat();
        }
    }

    /**
     * A drag (design 7.12): writes the three scene-unit floats into the owner's array at once, converts them into
     * the layout-unit position (z forced to 0 in 2D), then reheat() -- the settle window and the iteration budget
     * only; the speed controller keeps its state (D8).
     * @param index - the node index (< n)
     * @param x - scene x
     * @param y - scene y
     * @param z - scene z (not integrated in 2D)
     */
    setPosition(index: number, x: number, y: number, z: number): void {
        this.assertLoaded();
        const { n, owner } = this;
        if (!Number.isInteger(index) || index < 0 || index >= n) {
            throw new RangeError(`ForceAtlas2Simulation: setPosition(${index}): index out of range [0, ${n})`);
        }
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
            throw new RangeError("ForceAtlas2Simulation: setPosition: coordinates must be finite");
        }
        owner[3 * index] = x;
        owner[3 * index + 1] = y;
        owner[3 * index + 2] = z;
        const { scale } = this.options;
        const [cx, cy, cz] = this.options.center;
        // from the owner's f32 values, exactly as load() reads them
        this.positions[3 * index] = (owner[3 * index] - cx) / scale;
        this.positions[3 * index + 1] = (owner[3 * index + 1] - cy) / scale;
        this.positions[3 * index + 2] = this.dim === 2 ? 0 : (owner[3 * index + 2] - cz) / scale;
        this.reheat();
    }

    /** reheat() of D8: iterationsDone = 0, settledCount = 0 (and, in networkx mode, swing = traction = 1 as the oracle has it). */
    reheat(): void {
        this.assertNotDisposed();
        this.iterationsDoneValue = 0;
        this.settledCountValue = 0;
        if (this.swingMode === 1) {
            this.swingValue = 1;
            this.tractionValue = 1;
        }
    }

    /** Releases the scratch arrays and ends stepping; idempotent. */
    dispose(): void {
        this.state = "disposed";
        this.owner = new Float32Array(0);
        this.scratch = allocateScratch(0);
        this.pending = null;
        this.positions = new Float64Array(0);
        this.oldForce = new Float64Array(0);
        this.mass = new Float64Array(0);
        this.weights = null;
        this.rowPtr = new Uint32Array(1);
        this.colIdx = new Uint32Array(0);
        this.fixed = null;
        this.n = 0;
    }

    // ---------------------------------------------------------------- private

    private assertNotDisposed(): void {
        if (this.state === "disposed") {
            throw new Error("ForceAtlas2Simulation: disposed");
        }
    }

    private assertLoaded(): void {
        this.assertNotDisposed();
        if (this.state !== "loaded") {
            throw new Error("ForceAtlas2Simulation: not loaded (call load() first)");
        }
    }

    /**
     * mask_bit of the prelude over the fixed mask.
     * @param i - the node index
     * @returns true when the node is fixed
     */
    private isFixed(i: number): boolean {
        return this.fixed !== null && maskTest(this.fixed, i);
    }

    /** The scene-unit write-back of the free rows (design 7.13 / 7.18: `layout * scale + center`, z = center.z in 2D). */
    private writeBack(): void {
        const { n, owner, positions: pos } = this;
        const { scale } = this.options;
        const [cx, cy, cz] = this.options.center;
        for (let i = 0; i < n; i++) {
            if (this.isFixed(i)) {
                continue; // a fixed row's scene value is the owner's
            }
            owner[3 * i] = pos[3 * i] * scale + cx;
            owner[3 * i + 1] = pos[3 * i + 1] * scale + cy;
            owner[3 * i + 2] = this.dim === 2 ? cz : pos[3 * i + 2] * scale + cz; // 2D writes z = center.z (7.13)
        }
    }

    /**
     * load()'s CPU statistics (contract 3.13 ForceSimulation.load): the centroid in f64 (the paper-mode gravity
     * centre and the |p - c|^2 reference of the first iteration), settledCount 0.
     */
    private writeInitialStatistics(): void {
        const { n, positions: pos } = this;
        const c: [number, number, number] = [0, 0, 0];
        for (let i = 0; i < n; i++) {
            for (let a = 0; a < 3; a++) {
                c[a] += pos[3 * i + a];
            }
        }
        if (n === 0) {
            this.centroid = [0, 0, 0];
        } else {
            this.centroid = [c[0] / n, c[1] / n, c[2] / n];
        }
        this.settledCountValue = 0;
    }

    /**
     * The K1 totals of a set of partials (the same fold K1 performs).
     * @param p - the per-workgroup partials
     * @returns the folded totals
     */
    private foldTotals(p: GroupPartials): FoldTotals {
        return {
            sum: [foldGroups(p.sumX), foldGroups(p.sumY), foldGroups(p.sumZ)],
            sumSq: foldGroups(p.sumW),
            disp: foldGroups(p.disp),
            free: foldGroups(p.free),
        };
    }

    /**
     * K1's fold applied to the state (contract 4.5): centroid = sum / n, rmsRadius = sqrt(sumSq / n) about the
     * PREVIOUS centroid, meanDisplacement = disp / free (0 when every node is fixed), the settle counter continued
     * from the current one (design 7.17).
     * @param p - the previous integrate's partials
     */
    private fold(p: GroupPartials): void {
        const t = this.foldTotals(p);
        const nf = this.n;
        const rmsRadius = Math.sqrt(Math.max(t.sumSq, 0) / nf);
        const meanDisplacement = t.free === 0 ? 0 : t.disp / t.free; // all-fixed: 0, never NaN (7.4)
        this.centroid = [t.sum[0] / nf, t.sum[1] / nf, t.sum[2] / nf];
        this.settledCountValue =
            meanDisplacement <= this.options.settleThreshold * rmsRadius ? this.settledCountValue + 1 : 0;
    }

    /** One iteration: K1 fold (from the previous integrate), K2, K3 + epilogue, K4, K5 (the oracle's step() body). */
    private iterate(): void {
        const { n, scratch } = this;
        // ---- K1: fold the previous integrate's partials (skipped on the first iteration after load, FA2_FLAG_FIRST)
        if (this.pending !== null) {
            this.fold(this.pending);
        }
        const { positions: pos, mass, rowPtr, colIdx, weights, oldForce } = this;
        const { scalingRatio, gravity, linlog, distributedAction: distributed, strongGravity } = this.options;
        const { attraction, force, swing, traction, sumX, sumY, sumZ, sumW, disp, free } = scratch;
        // ---- K2: attraction over the CSR row, in arc order (design 7.5; 7.2 rows "Attraction", "Distributed action")
        for (let i = 0; i < n; i++) {
            let fx = 0;
            let fy = 0;
            let fz = 0;
            const px = pos[3 * i];
            const py = pos[3 * i + 1];
            const pz = pos[3 * i + 2];
            for (let a = rowPtr[i]; a < rowPtr[i + 1]; a++) {
                const j = colIdx[a];
                if (j === i) {
                    continue; // a self-loop exerts no force
                }
                const w = weights === null ? 1 : weights[a];
                const dx = pos[3 * j] - px;
                const dy = pos[3 * j + 1] - py;
                const dz = pos[3 * j + 2] - pz;
                let mag = w;
                if (linlog) {
                    const len = Math.max(len3(dx, dy, dz), FA2_DISTANCE_FLOOR);
                    mag = (w * Math.log(1 + len)) / len; // |F| = w log(1 + d) (7.2 row "Attraction (linlog)")
                }
                fx = fx + dx * mag;
                fy = fy + dy * mag;
                fz = fz + dz * mag;
            }
            if (distributed) {
                fx = fx / mass[i];
                fy = fy / mass[i];
                fz = fz / mass[i];
            }
            attraction[3 * i] = fx;
            attraction[3 * i + 1] = fy;
            attraction[3 * i + 2] = fz;
        }
        // ---- K3: all-pairs repulsion in tile order (j ascending), gravity, force +=, swing / traction per node
        swing.fill(0);
        traction.fill(0);
        const cx = this.centroid[0];
        const cy = this.centroid[1];
        const cz = this.centroid[2];
        for (let i = 0; i < n; i++) {
            const px = pos[3 * i];
            const py = pos[3 * i + 1];
            const pz = pos[3 * i + 2];
            const mi = mass[i];
            let fx = 0;
            let fy = 0;
            let fz = 0;
            for (let j = 0; j < n; j++) {
                if (j === i) {
                    continue;
                }
                const mj = mass[j];
                const dx = px - pos[3 * j];
                const dy = py - pos[3 * j + 1];
                const dz = pz - pos[3 * j + 2];
                let d2 = dx * dx + dy * dy + dz * dz;
                if (d2 < FA2_COINCIDENT_SQ) {
                    // coincident: antisymmetric unit kick of magnitude k m_i m_j / 0.01 (7.2 row "Coincident nodes")
                    const kick = kickDir(i, j, this.dim);
                    const magnitude = (scalingRatio * mi * mj) / FA2_DISTANCE_FLOOR;
                    fx = fx + kick[0] * magnitude;
                    fy = fy + kick[1] * magnitude;
                    fz = fz + kick[2] * magnitude;
                    continue;
                }
                d2 = Math.max(d2, FA2_DISTANCE_FLOOR_SQ); // d >= 0.01 (7.2 row "Distance floor")
                const k = scalingRatio * mi * mj;
                const scale = k / d2; // |F| = k m_i m_j / d along d / d (7.2 row "Repulsion")
                fx = fx + dx * scale;
                fy = fy + dy * scale;
                fz = fz + dz * scale;
            }
            // gravity (design 7.9; 7.2 rows "Gravity centre", "Gravity law"; networkx: origin, layout.py 1466-1471)
            let gx = 0;
            let gy = 0;
            let gz = 0;
            const qx = this.gravityCenter === 0 ? px - cx : px;
            const qy = this.gravityCenter === 0 ? py - cy : py;
            const qz = this.gravityCenter === 0 ? pz - cz : pz;
            const gm = -gravity * mi;
            if (strongGravity) {
                gx = gm * qx;
                gy = gm * qy;
                gz = gm * qz;
            } else {
                const d = len3(qx, qy, qz);
                if (d > FA2_DISTANCE_FLOOR) {
                    gx = (gm * qx) / d;
                    gy = (gm * qy) / d;
                    gz = (gm * qz) / d;
                }
            }
            // the epilogue: f = repulsion + gravity; fnew = attraction + f (K3 adds to K2's force)
            fx = fx + gx;
            fy = fy + gy;
            fz = fz + gz;
            const Fx = attraction[3 * i] + fx;
            const Fy = attraction[3 * i + 1] + fy;
            const Fz = attraction[3 * i + 2] + fz;
            force[3 * i] = Fx;
            force[3 * i + 1] = Fy;
            force[3 * i + 2] = Fz;
            const ox = oldForce[3 * i];
            const oy = oldForce[3 * i + 1];
            const oz = oldForce[3 * i + 2];
            if (this.swingMode === 1) {
                // NetworkX: positions and forces mixed, every node (layout.py 1479-1480)
                swing[i] = mi * len3(px - Fx, py - Fy, pz - Fz);
                traction[i] = 0.5 * mi * len3(px + Fx, py + Fy, pz + Fz);
            } else if (!this.isFixed(i)) {
                // paper: m |F(t) - F(t-1)|, 0.5 m |F(t) + F(t-1)| over FREE nodes (Gephi ForceAtlas2.java 283-293)
                swing[i] = mi * len3(Fx - ox, Fy - oy, Fz - oz);
                traction[i] = 0.5 * mi * len3(Fx + ox, Fy + oy, Fz + oz);
            }
        }
        // ---- K4: fold partials B, accumulate in networkx mode, estimateFactor
        const freshSwing = foldGroups(groupTotals(swing, n));
        const freshTraction = foldGroups(groupTotals(traction, n));
        let globalSwing = freshSwing;
        let globalTraction = freshTraction;
        if (this.swingMode === 1) {
            globalSwing = this.swingValue + freshSwing; // NetworkX accumulates across iterations from 1
            globalTraction = this.tractionValue + freshTraction;
        }
        const est = estimateFactor(
            n,
            globalSwing,
            globalTraction,
            this.speedValue,
            this.speedEfficiencyValue,
            this.options.jitterTolerance,
        );
        this.speedValue = est.speed;
        this.speedEfficiencyValue = est.speedEfficiency;
        this.swingValue = globalSwing;
        this.tractionValue = globalTraction;
        // ---- K5: integrate (design 7.11; 7.2 row "Local speed / apply"; networkx layout.py 1497-1501)
        const speed = this.speedValue;
        disp.fill(0);
        free.fill(0);
        for (let i = 0; i < n; i++) {
            const Fx = force[3 * i];
            const Fy = force[3 * i + 1];
            const Fz = force[3 * i + 2];
            const mi = mass[i];
            let swingI = mi * len3(Fx, Fy, Fz); // SWING_MODE 1: NetworkX's local swinging m |F| (layout.py 1497)
            if (this.swingMode === 0) {
                swingI = mi * len3(Fx - oldForce[3 * i], Fy - oldForce[3 * i + 1], Fz - oldForce[3 * i + 2]);
            }
            const factor = speed / (1 + Math.sqrt(speed * swingI));
            const fixed = this.isFixed(i);
            const dx = fixed ? 0 : Fx * factor; // no clamp on dp (D25)
            const dy = fixed ? 0 : Fy * factor;
            let dz = fixed ? 0 : Fz * factor;
            if (this.dim === 2) {
                dz = 0; // 2D never integrates z (7.13)
            }
            const px = pos[3 * i] + dx;
            const py = pos[3 * i + 1] + dy;
            const pz = pos[3 * i + 2] + dz;
            pos[3 * i] = px;
            pos[3 * i + 1] = py;
            pos[3 * i + 2] = pz;
            if (this.swingMode === 0) {
                oldForce[3 * i] = Fx; // fixed nodes too, so a later unpin sees no stale swing (7.11)
                oldForce[3 * i + 1] = Fy;
                oldForce[3 * i + 2] = Fz;
            }
            const qx = px - cx;
            const qy = py - cy;
            const qz = pz - cz;
            sumX[i] = px;
            sumY[i] = py;
            sumZ[i] = pz;
            sumW[i] = qx * qx + qy * qy + qz * qz; // |p - c|^2 about the start-of-iteration centroid
            if (!fixed) {
                disp[i] = len3(dx, dy, dz);
                free[i] = 1;
            }
        }
        this.pending = {
            sumX: groupTotals(sumX, n),
            sumY: groupTotals(sumY, n),
            sumZ: groupTotals(sumZ, n),
            sumW: groupTotals(sumW, n),
            disp: groupTotals(disp, n),
            free: groupTotals(free, n),
        };
    }
}
