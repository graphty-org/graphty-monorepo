/**
 * The CPU Fruchterman-Reingold reference (spec 7.20, 11.4, 11.9 item 2; P5-T3 Step 1): an index-based transcription
 * of ONE FR iteration on the exact tier, mirroring the kernel sequence K1 K2 K3 K5 of contract 4.5 stage by stage so
 * inspect() can be compared per kernel -- the K1 fold of the previous integrate's partials, the attraction `d^2 / k`
 * per CSR arc (K2, LAW 1), the repulsion `k^2 / d` over every other node (K3, LAW 1, unfloored), the temperature cap
 * `min(|F|, t)` along F (K5, APPLY 1). It is a transcription of the CPU loop
 * `layout/src/simulation/fruchterman-reingold.ts:405-510` with TWO GPU differences: (1) a coincident pair takes the
 * FA2 antisymmetric kick with the law's magnitude at d = FA2_DISTANCE_FLOOR (`k^2 / 0.01`, PD-10) in place of the
 * CPU's `|| 0.1` zero force; (2) the repulsion of row i sums over j in index order (K3's tile loop), not the CPU's
 * symmetric `u < v` update -- an f64 reference is order-insensitive to 1e-15, and the f32 variant sums in the GPU's
 * order so its noise floor is the GPU's. Gravity is 0 for this model and is not evaluated.
 *
 * f64 by default. `precision: "f32"` rounds every operation with Math.fround and sums in the GPU's tile / lane order
 * (the workgroup reductions are the 4.3 tree, the K1 fold is the per-lane grid-stride loop followed by the tree).
 *
 * The temperature of iteration `it` (0-based since load) is `max(0, 0.1 - it * 0.1 / (iterations + 1))`, the value
 * the GPU's uniform slot carries (PD-5); reheat() restarts the index at floor(0.7 * iterations) (spec 7.20). Under
 * `cooling: "adaptive"` it is instead the state block's value: K5 folds `sum |F|^2` over the free rows, and the next
 * K1 divides the temperature by FR_COOLING_STEP after FR_COOLING_PATIENCE consecutive falls of that energy or
 * multiplies it by FR_COOLING_STEP on a rise (Yifan Hu 2005, section 3.2); reheat() restarts it at 0.1.
 *
 * Units: positions are LAYOUT units, stride 3 (z = 0 in 2D, as load() uploads them); fruchtermanReingoldOracle()
 * below is the scene-unit wrapper (the toScene inverse on the way in).
 */

import { type GraphSnapshot, maskTest, type NodeMask } from "@graphty/graph-format";

import {
    FA2_COINCIDENT_SQ,
    FA2_DISTANCE_FLOOR,
    FR_COOLING_PATIENCE,
    FR_COOLING_STEP,
    FR_REHEAT_FRACTION,
    FR_START_TEMPERATURE,
    WORKGROUP_SIZE,
} from "../../src/constants.js";
import type { FruchtermanReingoldTraceRecord } from "../../src/types/layout.js";
import { kickDir } from "./forceatlas2.js";

/** Options of the FR oracle. */
export interface FrOracleOptions {
    readonly precision: "f64" | "f32";
    readonly dim: 2 | 3;
    /** The optimal distance; null: 1 / sqrt(n). */
    readonly k: number | null;
    /** The cooling schedule's budget: dt = 0.1 / (iterations + 1). */
    readonly iterations: number;
    /** The schedule (default "linear"); "adaptive" is Yifan Hu's step control over the free force energy (K1 + K5). */
    readonly cooling?: "linear" | "adaptive" | undefined;
    readonly settleThreshold: number;
    readonly fixed?: NodeMask | null | undefined;
}

/** The per-iteration intermediates the GPU exposes through inspect() (spec 11.9 item 2), stride 3. */
interface FrOracleStages {
    /** K2's force. */
    readonly attraction: Float64Array;
    /** K3's addition. */
    readonly repulsion: Float64Array;
    /** attraction + repulsion (what K3 leaves in `force`). */
    readonly force: Float64Array;
    /** The applied dp (0 on a fixed row). */
    readonly displacement: Float64Array;
    /** The folded partials A / C of K5 (what the next K1 sees). */
    readonly partials: {
        readonly sum: readonly [number, number, number];
        readonly sumSq: number;
        readonly min: readonly [number, number, number];
        readonly max: readonly [number, number, number];
        readonly maxSq: number;
        readonly disp: number;
        readonly free: number;
    };
}

/** One trace record plus the K1 statistics of the same iteration. */
export interface FrOracleTraceRecord extends FruchtermanReingoldTraceRecord {
    readonly rmsRadius: number;
    /** max |p - c| about the same previous centroid as rmsRadius (what K1 writes into state.radius). */
    readonly layoutRadius: number;
    readonly centroid: readonly [number, number, number];
}

/** A rounding function: Math.fround in f32 mode, the identity in f64 mode. */
type Round = (x: number) => number;

function identity(x: number): number {
    return x;
}

/** The prelude's F32_MAX (0x1.fffffep+127): the min / max identities of the vec4 reductions (contract 4.3, 4.5). */
const F32_MAX = 3.4028234663852886e38;

type ReduceOp = "sum" | "min" | "max";

/**
 * combine_v / combine_u of contract 4.3 on one lane.
 * @param a - the left operand
 * @param b - the right operand
 * @param op - the operator
 * @param r - the rounding of the precision mode
 * @returns the combined value
 */
function combine(a: number, b: number, op: ReduceOp, r: Round): number {
    if (op === "min") {
        return Math.min(a, b);
    }
    if (op === "max") {
        return Math.max(a, b);
    }
    return r(a + b);
}

/**
 * The workgroup-form wg_reduce of contract 4.3 over WORKGROUP_SIZE lanes, in place (the fixed tree order).
 * @param lanes - exactly WORKGROUP_SIZE values (destroyed)
 * @param op - the operator
 * @param r - the rounding of the precision mode
 * @returns the workgroup total (lanes[0])
 */
function treeReduce(lanes: Float64Array, op: ReduceOp, r: Round): number {
    for (let s = WORKGROUP_SIZE / 2; s > 0; s = Math.floor(s / 2)) {
        for (let l = 0; l < s; l++) {
            lanes[l] = combine(lanes[l], lanes[l + s], op, r);
        }
    }
    return lanes[0];
}

/**
 * The per-workgroup totals of a per-node value (K5's partials A and C): node i sits in lane i % WG of group
 * floor(i / WG); lanes beyond n carry the identity.
 * @param values - one value per node (length >= n)
 * @param n - the node count
 * @param op - the operator
 * @param r - the rounding of the precision mode
 * @param laneIdentity - the value of an invalid lane
 * @returns one total per workgroup
 */
function groupTotals(values: ArrayLike<number>, n: number, op: ReduceOp, r: Round, laneIdentity: number): Float64Array {
    const groups = Math.ceil(n / WORKGROUP_SIZE);
    const totals = new Float64Array(groups);
    const lanes = new Float64Array(WORKGROUP_SIZE);
    for (let g = 0; g < groups; g++) {
        for (let l = 0; l < WORKGROUP_SIZE; l++) {
            const i = g * WORKGROUP_SIZE + l;
            lanes[l] = i < n ? values[i] : laneIdentity;
        }
        totals[g] = treeReduce(lanes, op, r);
    }
    return totals;
}

/**
 * The one-workgroup fold of K1 over the per-workgroup partials: lane l accumulates partials[l], partials[l + WG],
 * ... sequentially, then the tree.
 * @param partials - one value per workgroup
 * @param op - the operator
 * @param r - the rounding of the precision mode
 * @param laneIdentity - the lane's initial value
 * @returns the folded total
 */
function foldGroups(partials: ArrayLike<number>, op: ReduceOp, r: Round, laneIdentity: number): number {
    const lanes = new Float64Array(WORKGROUP_SIZE).fill(laneIdentity);
    for (let g = 0; g < partials.length; g++) {
        const l = g % WORKGROUP_SIZE;
        lanes[l] = combine(lanes[l], partials[g], op, r);
    }
    return treeReduce(lanes, op, r);
}

/**
 * WGSL length() of a three-vector in the precision mode (sqrt of the left-to-right sum of squares).
 * @param r - the rounding of the precision mode
 * @param x - component x
 * @param y - component y
 * @param z - component z
 * @returns the length
 */
function len3(r: Round, x: number, y: number, z: number): number {
    return r(Math.sqrt(r(r(r(x * x) + r(y * y)) + r(z * z))));
}

/** The per-workgroup partials A and C of one integrate (contract 4.5 K5), kept until the next K1 fold. */
interface GroupPartials {
    readonly sumX: Float64Array;
    readonly sumY: Float64Array;
    readonly sumZ: Float64Array;
    readonly sumW: Float64Array;
    readonly minX: Float64Array;
    readonly minY: Float64Array;
    readonly minZ: Float64Array;
    readonly maxX: Float64Array;
    readonly maxY: Float64Array;
    readonly maxZ: Float64Array;
    readonly maxW: Float64Array;
    readonly disp: Float64Array;
    readonly free: Float64Array;
    /** sum |F|^2 over free rows (what K5 folds into partials.swingTraction.x under APPLY 1). */
    readonly energy: Float64Array;
}

/** The K1 totals of a set of partials. */
interface FoldTotals {
    readonly sum: readonly [number, number, number];
    readonly sumSq: number;
    readonly min: readonly [number, number, number];
    readonly max: readonly [number, number, number];
    readonly maxSq: number;
    readonly disp: number;
    readonly free: number;
    readonly energy: number;
}

/** What K1 writes at the start of an iteration. */
interface Fold {
    readonly centroid: readonly [number, number, number];
    readonly rmsRadius: number;
    readonly layoutRadius: number;
    readonly meanDisplacement: number;
    readonly settledCount: number;
}

function emptyStages(n: number): FrOracleStages {
    return {
        attraction: new Float64Array(3 * n),
        repulsion: new Float64Array(3 * n),
        force: new Float64Array(3 * n),
        displacement: new Float64Array(3 * n),
        partials: { sum: [0, 0, 0], sumSq: 0, min: [0, 0, 0], max: [0, 0, 0], maxSq: 0, disp: 0, free: 0 },
    };
}

/**
 * The CPU Fruchterman-Reingold reference: positions in LAYOUT units (stride 3), f64 scratch (or f32 scratch summing
 * in tile order when precision is "f32").
 */
export class FruchtermanReingoldOracle {
    readonly n: number;
    readonly dim: 2 | 3;
    /** Layout-unit positions (Float64Array or Float32Array by precision). */
    readonly positions: Float64Array | Float32Array;

    private readonly rowPtr: Uint32Array;
    private readonly colIdx: Uint32Array;
    private readonly arcCount: number;
    private readonly precision: "f64" | "f32";
    private readonly round: Round;
    /** The rounded k the uniform slot carries. */
    private readonly k: number;
    private readonly iterations: number;
    private readonly dt: number;
    private readonly settleThreshold: number;
    private fixed: NodeMask | null;

    /** The temperature index of the NEXT iteration (PD-5). */
    private tempIndex = 0;
    private readonly adaptive: boolean;
    /** Adaptive cooling: the state block's temperature, the previous iteration's energy and the progress counter. */
    private adaptiveTemperature = FR_START_TEMPERATURE;
    private previousEnergy = Number.POSITIVE_INFINITY;
    private progress = 0;
    private settledCountValue = 0;
    private iterationValue = 0;
    private centroid: [number, number, number] = [0, 0, 0];
    private rmsRadius = 0;
    private radius = 0;
    private meanDisplacement = 0;
    /** The partials of the last integrate; null before the first step (K1 keeps the host-written state then). */
    private pending: GroupPartials | null = null;
    private stagesValue: FrOracleStages;
    private readonly traceRecords: FrOracleTraceRecord[] = [];

    /**
     * Builds the reference over a snapshot from layout-unit positions (stride 3; taken as given -- the caller rounds
     * to f32 when it wants the GPU's start; z is forced to 0 in 2D as load() does).
     * @param s - the undirected snapshot (both arcs of every edge present)
     * @param positions - 3 x nodeCount layout-unit coordinates
     * @param options - the precision, dim, k, iterations, settle threshold and mask
     */
    constructor(s: GraphSnapshot, positions: ArrayLike<number>, options: FrOracleOptions) {
        if (s.directed) {
            throw new Error(
                "FruchtermanReingoldOracle: the snapshot must be undirected (pass toUndirected().snapshot)",
            );
        }
        const n = s.nodeCount;
        if (positions.length !== 3 * n) {
            throw new Error(`FruchtermanReingoldOracle: positions.length ${positions.length} !== 3 x ${n}`);
        }
        if (!Number.isInteger(options.iterations) || options.iterations < 0) {
            throw new Error(`FruchtermanReingoldOracle: iterations must be an integer >= 0, got ${options.iterations}`);
        }
        this.n = n;
        this.dim = options.dim;
        this.precision = options.precision;
        const r: Round = options.precision === "f32" ? Math.fround : identity;
        this.round = r;
        this.rowPtr = s.rowPtr;
        this.colIdx = s.colIdx;
        this.arcCount = s.arcCount;
        this.positions = options.precision === "f32" ? new Float32Array(3 * n) : new Float64Array(3 * n);
        for (let i = 0; i < n; i++) {
            this.positions[3 * i] = r(positions[3 * i]);
            this.positions[3 * i + 1] = r(positions[3 * i + 1]);
            this.positions[3 * i + 2] = this.dim === 2 ? 0 : r(positions[3 * i + 2]);
        }
        const k = options.k ?? (n > 0 ? 1 / Math.sqrt(n) : 1);
        if (!(k > 0)) {
            throw new Error(`FruchtermanReingoldOracle: k must be > 0 or null, got ${String(options.k)}`);
        }
        this.k = r(k);
        this.iterations = options.iterations;
        this.adaptive = options.cooling === "adaptive";
        this.dt = FR_START_TEMPERATURE / (options.iterations + 1);
        this.settleThreshold = r(options.settleThreshold);
        if (this.settleThreshold < 0) {
            throw new Error("FruchtermanReingoldOracle: settleThreshold >= 0 required");
        }
        this.fixed = null;
        this.setFixed(options.fixed ?? null);
        this.stagesValue = emptyStages(n);
        this.writeInitialStatistics();
    }

    /** The intermediates of the LAST step(). */
    get stages(): FrOracleStages {
        return this.stagesValue;
    }

    /** The trace of every step() so far. */
    get trace(): readonly FrOracleTraceRecord[] {
        return this.traceRecords;
    }

    /** The temperature the NEXT iteration will trace: adaptive = the state block's after its K1 update (it moves at that fold), else max(0, 0.1 - index * dt), rounded as the uniform slot carries it. */
    get temperature(): number {
        return this.adaptive ? this.adaptiveTemperature : this.temperatureAt(this.tempIndex);
    }

    /** Consecutive iterations whose mean displacement was under settleThreshold x rmsRadius (spec 7.17). */
    get settledCount(): number {
        return this.settledCountValue;
    }

    /** The state's iteration counter (K1 increments it every step). */
    get iteration(): number {
        return this.iterationValue;
    }

    /**
     * Replaces the fixed mask (no implicit reheat: the parity tests call reheat() where the simulation would).
     * @param mask - the NodeMask (ceil(n / 32) words, LSB-first) or null for no fixed node
     */
    setFixed(mask: NodeMask | null): void {
        if (mask !== null && mask.length < Math.ceil(this.n / 32)) {
            throw new Error(`FruchtermanReingoldOracle: mask.length ${mask.length} < ceil(${this.n} / 32)`);
        }
        this.fixed = mask === null ? null : new Uint32Array(mask);
    }

    /** reheat() semantics of spec 7.20 / PD-5: settledCount = 0 and the temperature index becomes floor(0.7 * iterations). */
    reheat(): void {
        this.settledCountValue = 0;
        this.tempIndex = Math.floor(FR_REHEAT_FRACTION * this.iterations);
        this.adaptiveTemperature = FR_START_TEMPERATURE;
        this.previousEnergy = Number.POSITIVE_INFINITY;
        this.progress = 0;
    }

    /**
     * One iteration: K1 fold (of the previous iteration's partials), K2, K3, K5; the record's temperature is this
     * iteration's (what K1 writes into the trace under STATS_MODE 1).
     * @returns the trace record of this iteration
     */
    step(): FrOracleTraceRecord {
        const { n } = this;
        const r = this.round;
        // ---- K1: fold the previous integrate's partials (skipped on the first iteration after load, FA2_FLAG_FIRST)
        if (this.pending !== null) {
            this.fold(this.pending);
        }
        this.iterationValue += 1;
        const t = this.adaptive ? this.adaptiveTemperature : this.temperatureAt(this.tempIndex);
        this.tempIndex += 1;
        const k1: FrOracleTraceRecord = {
            temperature: t,
            meanDisplacement: this.meanDisplacement,
            settledCount: this.settledCountValue,
            rmsRadius: this.rmsRadius,
            layoutRadius: this.radius,
            centroid: [this.centroid[0], this.centroid[1], this.centroid[2]],
        };
        if (n === 0) {
            this.traceRecords.push(k1);
            return k1;
        }
        const stages = emptyStages(n);
        const { positions: pos, k } = this;
        // ---- K2 (LAW 1): attraction over the CSR row in arc order: |F| = d^2 / k toward j, unfloored (7.20)
        if (this.arcCount > 0) {
            for (let i = 0; i < n; i++) {
                let fx = 0;
                let fy = 0;
                let fz = 0;
                const px = pos[3 * i];
                const py = pos[3 * i + 1];
                const pz = pos[3 * i + 2];
                for (let a = this.rowPtr[i]; a < this.rowPtr[i + 1]; a++) {
                    const j = this.colIdx[a];
                    if (j === i) {
                        continue; // a self-loop exerts no force
                    }
                    const dx = r(pos[3 * j] - px);
                    const dy = r(pos[3 * j + 1] - py);
                    const dz = r(pos[3 * j + 2] - pz);
                    const mag = r(len3(r, dx, dy, dz) / k); // w = length(d) / frK; the linear select applies it as is
                    fx = r(fx + r(dx * mag));
                    fy = r(fy + r(dy * mag));
                    fz = r(fz + r(dz * mag));
                }
                stages.attraction[3 * i] = fx;
                stages.attraction[3 * i + 1] = fy;
                stages.attraction[3 * i + 2] = fz;
            }
        }
        // ---- K3 (LAW 1): repulsion in tile order (j ascending), |F| = k^2 / d unfloored, the coincident kick (PD-10)
        const k2 = r(k * k);
        const kickMagnitude = r(k2 / r(FA2_DISTANCE_FLOOR));
        for (let i = 0; i < n; i++) {
            const px = pos[3 * i];
            const py = pos[3 * i + 1];
            const pz = pos[3 * i + 2];
            let fx = 0;
            let fy = 0;
            let fz = 0;
            for (let j = 0; j < n; j++) {
                if (j === i) {
                    continue;
                }
                const dx = r(px - pos[3 * j]);
                const dy = r(py - pos[3 * j + 1]);
                const dz = r(pz - pos[3 * j + 2]);
                const d2 = r(r(r(dx * dx) + r(dy * dy)) + r(dz * dz));
                if (d2 < r(FA2_COINCIDENT_SQ)) {
                    const kick = kickDir(i, j, this.dim, this.precision);
                    fx = r(fx + r(kick[0] * kickMagnitude));
                    fy = r(fy + r(kick[1] * kickMagnitude));
                    fz = r(fz + r(kick[2] * kickMagnitude));
                    continue;
                }
                const scale = r(k2 / d2); // |F| = k^2 / d along d / d
                fx = r(fx + r(dx * scale));
                fy = r(fy + r(dy * scale));
                fz = r(fz + r(dz * scale));
            }
            stages.repulsion[3 * i] = fx;
            stages.repulsion[3 * i + 1] = fy;
            stages.repulsion[3 * i + 2] = fz;
            // the epilogue: fnew = attraction + f (K3 adds to K2's force; gravity is 0 for this model)
            stages.force[3 * i] = r(stages.attraction[3 * i] + fx);
            stages.force[3 * i + 1] = r(stages.attraction[3 * i + 1] + fy);
            stages.force[3 * i + 2] = r(stages.attraction[3 * i + 2] + fz);
        }
        // ---- K5 (APPLY 1): move along F by min(|F|, t); a fixed node stays; partials A and C
        const cx = this.centroid[0];
        const cy = this.centroid[1];
        const cz = this.centroid[2];
        const sumX = new Float64Array(n);
        const sumY = new Float64Array(n);
        const sumZ = new Float64Array(n);
        const sumW = new Float64Array(n);
        const disp = new Float64Array(n);
        const free = new Float64Array(n);
        const energy = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            const Fx = stages.force[3 * i];
            const Fy = stages.force[3 * i + 1];
            const Fz = stages.force[3 * i + 2];
            const fixed = this.isFixed(i);
            if (!fixed) {
                energy[i] = r(r(r(Fx * Fx) + r(Fy * Fy)) + r(Fz * Fz)); // dot(f, f)
            }
            const mag = len3(r, Fx, Fy, Fz);
            let dx = 0;
            let dy = 0;
            let dz = 0;
            if (mag > 0 && !fixed) {
                const s = r(Math.min(mag, t) / mag);
                dx = r(Fx * s);
                dy = r(Fy * s);
                dz = r(Fz * s);
            }
            if (this.dim === 2) {
                dz = 0; // 2D never integrates z (7.13)
            }
            stages.displacement[3 * i] = dx;
            stages.displacement[3 * i + 1] = dy;
            stages.displacement[3 * i + 2] = dz;
            const px = r(pos[3 * i] + dx);
            const py = r(pos[3 * i + 1] + dy);
            const pz = r(pos[3 * i + 2] + dz);
            pos[3 * i] = px;
            pos[3 * i + 1] = py;
            pos[3 * i + 2] = pz;
            const qx = r(px - cx);
            const qy = r(py - cy);
            const qz = r(pz - cz);
            sumX[i] = px;
            sumY[i] = py;
            sumZ[i] = pz;
            sumW[i] = r(r(r(qx * qx) + r(qy * qy)) + r(qz * qz)); // |p - c|^2 about the start-of-iteration centroid
            if (!fixed) {
                disp[i] = len3(r, dx, dy, dz);
                free[i] = 1;
            }
        }
        const pending: GroupPartials = {
            sumX: groupTotals(sumX, n, "sum", r, 0),
            sumY: groupTotals(sumY, n, "sum", r, 0),
            sumZ: groupTotals(sumZ, n, "sum", r, 0),
            sumW: groupTotals(sumW, n, "sum", r, 0),
            minX: groupTotals(sumX, n, "min", r, F32_MAX),
            minY: groupTotals(sumY, n, "min", r, F32_MAX),
            minZ: groupTotals(sumZ, n, "min", r, F32_MAX),
            maxX: groupTotals(sumX, n, "max", r, -F32_MAX),
            maxY: groupTotals(sumY, n, "max", r, -F32_MAX),
            maxZ: groupTotals(sumZ, n, "max", r, -F32_MAX),
            maxW: groupTotals(sumW, n, "max", r, -F32_MAX),
            disp: groupTotals(disp, n, "sum", r, 0),
            free: groupTotals(free, n, "sum", identity, 0),
            energy: groupTotals(energy, n, "sum", r, 0),
        };
        this.pending = pending;
        const folded = this.foldTotals(pending);
        this.stagesValue = {
            ...stages,
            partials: {
                sum: folded.sum,
                sumSq: folded.sumSq,
                min: folded.min,
                max: folded.max,
                maxSq: folded.maxSq,
                disp: folded.disp,
                free: folded.free,
            },
        };
        this.traceRecords.push(k1);
        return k1;
    }

    /**
     * The temperature of a temperature index: max(0, 0.1 - dt * index) in f64 (the host's arithmetic, PD-5), then
     * rounded as the uniform slot carries it.
     * @param index - the temperature index
     * @returns the temperature
     */
    private temperatureAt(index: number): number {
        return this.round(Math.max(0, FR_START_TEMPERATURE - this.dt * index));
    }

    private isFixed(i: number): boolean {
        return this.fixed !== null && maskTest(this.fixed, i);
    }

    /** load()'s CPU statistics: centroid, RMS radius and radius (max |p - centroid|) in f64, iteration 0, settledCount 0, meanDisplacement 0. */
    private writeInitialStatistics(): void {
        const { n, positions: pos } = this;
        const r = this.round;
        const c: [number, number, number] = [0, 0, 0];
        for (let i = 0; i < n; i++) {
            for (let a = 0; a < 3; a++) {
                c[a] += pos[3 * i + a];
            }
        }
        if (n === 0) {
            this.centroid = [0, 0, 0];
            this.rmsRadius = 0;
            this.radius = 0;
        } else {
            c[0] /= n;
            c[1] /= n;
            c[2] /= n;
            let sumSq = 0;
            let maxSq = 0;
            for (let i = 0; i < n; i++) {
                const qx = pos[3 * i] - c[0];
                const qy = pos[3 * i + 1] - c[1];
                const qz = pos[3 * i + 2] - c[2];
                const q2 = qx * qx + qy * qy + qz * qz;
                sumSq += q2;
                maxSq = Math.max(maxSq, q2);
            }
            this.centroid = [r(c[0]), r(c[1]), r(c[2])];
            this.rmsRadius = r(Math.sqrt(sumSq / n));
            this.radius = r(Math.sqrt(maxSq));
        }
        this.meanDisplacement = 0;
        this.settledCountValue = 0;
        this.iterationValue = 0;
    }

    private foldTotals(p: GroupPartials): FoldTotals {
        const r = this.round;
        return {
            sum: [foldGroups(p.sumX, "sum", r, 0), foldGroups(p.sumY, "sum", r, 0), foldGroups(p.sumZ, "sum", r, 0)],
            sumSq: foldGroups(p.sumW, "sum", r, 0),
            min: [
                foldGroups(p.minX, "min", r, F32_MAX),
                foldGroups(p.minY, "min", r, F32_MAX),
                foldGroups(p.minZ, "min", r, F32_MAX),
            ],
            max: [
                foldGroups(p.maxX, "max", r, -F32_MAX),
                foldGroups(p.maxY, "max", r, -F32_MAX),
                foldGroups(p.maxZ, "max", r, -F32_MAX),
            ],
            maxSq: foldGroups(p.maxW, "max", r, -F32_MAX),
            disp: foldGroups(p.disp, "sum", r, 0),
            free: foldGroups(p.free, "sum", identity, 0),
            energy: foldGroups(p.energy, "sum", r, 0),
        };
    }

    /**
     * K1's fold (contract 4.5): centroid = sum / n, rmsRadius = sqrt(sumSq / n) about the PREVIOUS centroid, radius =
     * sqrt(max |p - c|^2), meanDisplacement = disp / free (0 when every node is fixed), the settle counter continued.
     * @param t - the totals of the previous integrate's partials
     * @returns what K1 writes
     */
    private computeFold(t: FoldTotals): Fold {
        const r = this.round;
        const nf = r(this.n);
        const rmsRadius = r(Math.sqrt(r(Math.max(t.sumSq, 0) / nf)));
        const meanDisplacement = t.free === 0 ? 0 : r(t.disp / r(t.free));
        return {
            centroid: [r(t.sum[0] / nf), r(t.sum[1] / nf), r(t.sum[2] / nf)],
            rmsRadius,
            layoutRadius: r(Math.sqrt(Math.max(t.maxSq, 0))),
            meanDisplacement,
            settledCount: meanDisplacement <= r(this.settleThreshold * rmsRadius) ? this.settledCountValue + 1 : 0,
        };
    }

    private fold(p: GroupPartials): void {
        const totals = this.foldTotals(p);
        const f = this.computeFold(totals);
        this.centroid = [f.centroid[0], f.centroid[1], f.centroid[2]];
        this.rmsRadius = f.rmsRadius;
        this.radius = f.layoutRadius;
        this.meanDisplacement = f.meanDisplacement;
        this.settledCountValue = f.settledCount;
        if (this.adaptive) {
            // K1 under FA2_FLAG_ADAPTIVE: Yifan Hu's step control over the previous iteration's free force energy
            const r = this.round;
            let t = this.adaptiveTemperature;
            if (totals.energy < this.previousEnergy) {
                this.progress += 1;
                if (this.progress >= FR_COOLING_PATIENCE) {
                    this.progress = 0;
                    t = r(t / r(FR_COOLING_STEP));
                }
            } else {
                this.progress = 0;
                t = r(t * r(FR_COOLING_STEP));
            }
            this.previousEnergy = totals.energy;
            this.adaptiveTemperature = t;
        }
    }
}
