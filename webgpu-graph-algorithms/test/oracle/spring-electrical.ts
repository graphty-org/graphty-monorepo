/**
 * The CPU spring-electrical reference (spec 7.20 "the preset"; 11.4; P5-T5 Step 2): an index-based transcription of
 * ngraph.forcelayout 3.3.1's physics -- Coulomb repulsion `coulomb m_i m_j / r^3 (p_j - p_i)` over every pair
 * (lib/codeGenerators/generateQuadTree.js:131-132 with theta 0), Hooke springs `k_s (r - L) / r (p_j - p_i)` per CSR arc
 * (generateCreateSpringForce.js:33-40: the two arcs of an undirected edge are ngraph's `body1 +=` / `body2 -=`),
 * drag `F -= drag v` (generateCreateDragForce.js:18), the semi-implicit Euler step `v += (dt / m) F; |v| <= 1;
 * p += dt v` with pinned bodies skipped (generateIntegrator.js:21-41) and the mass `1 + degree / 3`
 * (index.js:391-395) -- mirroring the GPU's K1 K2 K3 K5 sequence stage by stage so inspect() can be compared per
 * kernel. Checked against ngraph itself in test/oracle/spring-electrical-ngraph.test.ts.
 *
 * Two GPU differences, stated here: the coincident kick of PD-10 (the FA2 antisymmetric unit direction times the
 * Coulomb magnitude at d = FA2_DISTANCE_FLOOR, where ngraph jitters with its RNG) and the spring length floored at
 * FA2_DISTANCE_FLOOR as K2 does (ngraph jitters a zero length). The parity fixtures contain no coincident pair.
 *
 * f64 by default. `precision: "f32"` rounds every operation with Math.fround and sums in the GPU's tile / lane
 * order (K3 walks j ascending, the workgroup reductions are the contract 4.3 tree, the K1 fold is the per-lane
 * grid-stride loop followed by the tree), the tight leg of the trace test.
 *
 * Units: positions are LAYOUT units, stride 3 (z = 0 in 2D, as load() uploads them). `kineticEnergy` of a record is
 * THIS iteration's (after its integrate); the GPU's trace record and S.kineticEnergy lag it by one iteration (PD-4:
 * the first record after load() is 0 and record i is the oracle's i - 1).
 */

import { type F32, type GraphSnapshot, maskTest, type NodeMask } from "@graphty/graph-format";

import { FA2_COINCIDENT_SQ, FA2_DISTANCE_FLOOR, FA2_DISTANCE_FLOOR_SQ, WORKGROUP_SIZE } from "../../src/constants.js";
import type { SpringElectricalTraceRecord } from "../../src/types/layout.js";
import { kickDir } from "./forceatlas2.js";

/** Options of the oracle: ngraph's names (as SpringElectricalOptions), the precision, the dimension and the mask. */
export interface SeOracleOptions {
    readonly precision: "f64" | "f32";
    readonly dim: 2 | 3;
    readonly springLength: number;
    readonly springCoefficient: number;
    /** ngraph's Coulomb constant (negative repels): written into Fa2Params.coulomb by the model (PD-12). */
    readonly gravity: number;
    readonly dragCoefficient: number;
    readonly timeStep: number;
    readonly settleThreshold: number;
    readonly fixed?: NodeMask | null | undefined;
}

/** The per-iteration intermediates the GPU exposes through inspect() (spec 11.9 item 2), stride 3. @public the type of SpringElectricalOracle.stages, for the P5-T4 parity helpers */
export interface SeOracleStages {
    /** K2's force: the springs only. */
    readonly attraction: Float64Array;
    /** K3's addition: the Coulomb repulsion. */
    readonly repulsion: Float64Array;
    /** attraction + repulsion: what K3 leaves in `force` (the drag enters K5, not the force buffer). */
    readonly force: Float64Array;
    /** The velocity after this iteration's update (the `velocity` buffer K5 stored; a pinned row keeps its value). */
    readonly velocity: Float64Array;
    /** The applied dp = dt v (0 on a fixed row and on z in 2D). */
    readonly displacement: Float64Array;
    readonly partials: {
        readonly sum: readonly [number, number, number];
        readonly sumSq: number;
        readonly min: readonly [number, number, number];
        readonly max: readonly [number, number, number];
        readonly maxSq: number;
        readonly disp: number;
        readonly free: number;
        /** 0.5 sum m |v|^2 over the free rows (partials B under APPLY 2, PD-4). */
        readonly kineticEnergy: number;
    };
}

/** One trace record plus the K1 statistics of the same iteration; `kineticEnergy` is THIS iteration's (file header). @public the element type of SpringElectricalOracle.trace, for the P5-T4 parity helpers */
export interface SeOracleTraceRecord extends SpringElectricalTraceRecord {
    readonly rmsRadius: number;
    readonly layoutRadius: number;
    readonly centroid: readonly [number, number, number];
}

/** What K1 writes at the start of an iteration (the fold of the previous integrate's partials). */
interface Fold {
    readonly centroid: readonly [number, number, number];
    readonly rmsRadius: number;
    readonly layoutRadius: number;
    readonly meanDisplacement: number;
    readonly settledCount: number;
}

/** A rounding function: Math.fround in f32 mode, the identity in f64 mode. */
type Round = (x: number) => number;

function identity(x: number): number {
    return x;
}

/** The prelude's F32_MAX: the min / max identities of the vec4 reductions (contract 4.3, 4.5). */
const F32_MAX = 3.4028234663852886e38;

type ReduceOp = "sum" | "min" | "max";

function combine(a: number, b: number, op: ReduceOp, r: Round): number {
    if (op === "min") {
        return Math.min(a, b);
    }
    if (op === "max") {
        return Math.max(a, b);
    }
    return r(a + b);
}

/** The workgroup-form wg_reduce of contract 4.3 over WORKGROUP_SIZE lanes, in place (the fixed tree order). */
function treeReduce(lanes: Float64Array, op: ReduceOp, r: Round): number {
    for (let s = WORKGROUP_SIZE / 2; s > 0; s = Math.floor(s / 2)) {
        for (let l = 0; l < s; l++) {
            lanes[l] = combine(lanes[l], lanes[l + s], op, r);
        }
    }
    return lanes[0];
}

/** One total per workgroup of n per-node values (a lane past n carries the identity), as K5's reductions produce them. */
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

/** K1's one-workgroup fold: lane l accumulates partials[l], partials[l + WG], ... sequentially, then the tree. */
function foldGroups(partials: ArrayLike<number>, op: ReduceOp, r: Round, laneIdentity: number): number {
    const lanes = new Float64Array(WORKGROUP_SIZE).fill(laneIdentity);
    for (let g = 0; g < partials.length; g++) {
        const l = g % WORKGROUP_SIZE;
        lanes[l] = combine(lanes[l], partials[g], op, r);
    }
    return treeReduce(lanes, op, r);
}

/** WGSL length() of a three-vector in the precision mode. */
function len3(r: Round, x: number, y: number, z: number): number {
    return r(Math.sqrt(r(r(r(x * x) + r(y * y)) + r(z * z))));
}

/** The per-workgroup partials of one integrate (what K5 leaves for the next K1). */
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
    readonly ke: Float64Array;
}

function emptyStages(n: number): SeOracleStages {
    return {
        attraction: new Float64Array(3 * n),
        repulsion: new Float64Array(3 * n),
        force: new Float64Array(3 * n),
        velocity: new Float64Array(3 * n),
        displacement: new Float64Array(3 * n),
        partials: {
            sum: [0, 0, 0],
            sumSq: 0,
            min: [0, 0, 0],
            max: [0, 0, 0],
            maxSq: 0,
            disp: 0,
            free: 0,
            kineticEnergy: 0,
        },
    };
}

/**
 * The mass vector of the preset: 1 + degree / 3 (ngraph index.js:391-395; the undirected snapshot's outDegree is the
 * degree), in f64 (ngraph's) or rounded to f32 (what the GPU carries in pos.w).
 * @param s - the snapshot
 * @param precision - "f64" keeps ngraph's exact value; "f32" rounds as the model's Float32Array does
 * @returns n masses
 */
function springElectricalMass(s: GraphSnapshot, precision: "f64" | "f32"): Float64Array {
    const r: Round = precision === "f32" ? Math.fround : identity;
    const degree = s.outDegree();
    const mass = new Float64Array(s.nodeCount);
    for (let i = 0; i < s.nodeCount; i++) {
        mass[i] = r(1 + degree[i] / 3);
    }
    return mass;
}

/**
 * The CPU spring-electrical reference: positions in LAYOUT units (stride 3), f64 scratch (or f32 scratch summing in
 * tile order when precision is "f32").
 */
export class SpringElectricalOracle {
    readonly n: number;
    readonly dim: 2 | 3;
    /** Layout-unit positions (Float64Array or Float32Array by precision). */
    readonly positions: Float64Array | Float32Array;

    private readonly rowPtr: Uint32Array;
    private readonly colIdx: Uint32Array;
    private readonly mass: Float64Array;
    private readonly round: Round;
    private readonly precision: "f64" | "f32";
    private readonly springLength: number;
    private readonly springCoefficient: number;
    private readonly coulomb: number;
    private readonly drag: number;
    private readonly dt: number;
    private readonly settleThreshold: number;
    private fixed: NodeMask | null = null;
    private readonly velocity: Float64Array;

    private settledCountValue = 0;
    private iterationValue = 0;
    private centroid: [number, number, number] = [0, 0, 0];
    private rmsRadius = 0;
    private radius = 0;
    private meanDisplacement = 0;
    private kineticEnergyValue = 0;
    /** The partials of the last integrate; null before the first step (K1 keeps the host-written state then). */
    private pending: GroupPartials | null = null;
    private stagesValue: SeOracleStages;
    private readonly traceRecords: SeOracleTraceRecord[] = [];

    /**
     * Builds the reference over a snapshot from layout-unit positions (stride 3; taken as given -- the caller rounds
     * to f32 when it wants the GPU's start; z is forced to 0 in 2D as load() does). Every velocity starts at 0.
     * @param s - the undirected snapshot (both arcs of every edge present)
     * @param positions - 3 x nodeCount layout-unit coordinates
     * @param options - the precision, the dimension and ngraph's five constants
     */
    constructor(s: GraphSnapshot, positions: ArrayLike<number>, options: SeOracleOptions) {
        if (s.directed) {
            throw new Error("SpringElectricalOracle: the snapshot must be undirected (pass toUndirected().snapshot)");
        }
        const n = s.nodeCount;
        if (positions.length !== 3 * n) {
            throw new Error(`SpringElectricalOracle: positions.length ${positions.length} !== 3 x ${n}`);
        }
        this.n = n;
        this.dim = options.dim;
        this.precision = options.precision;
        const r: Round = options.precision === "f32" ? Math.fround : identity;
        this.round = r;
        this.rowPtr = s.rowPtr;
        this.colIdx = s.colIdx;
        this.positions = options.precision === "f32" ? new Float32Array(3 * n) : new Float64Array(3 * n);
        for (let i = 0; i < n; i++) {
            this.positions[3 * i] = r(positions[3 * i]);
            this.positions[3 * i + 1] = r(positions[3 * i + 1]);
            this.positions[3 * i + 2] = this.dim === 2 ? 0 : r(positions[3 * i + 2]);
        }
        this.mass = springElectricalMass(s, options.precision);
        this.velocity = new Float64Array(3 * n);
        this.springLength = r(options.springLength);
        this.springCoefficient = r(options.springCoefficient);
        this.coulomb = r(options.gravity);
        this.drag = r(options.dragCoefficient);
        this.dt = r(options.timeStep);
        this.settleThreshold = r(options.settleThreshold);
        if (
            !(this.springLength > 0) ||
            !(this.springCoefficient > 0) ||
            !(this.drag >= 0) ||
            !(this.dt > 0) ||
            !Number.isFinite(this.coulomb) ||
            !(this.settleThreshold >= 0)
        ) {
            throw new Error(
                "SpringElectricalOracle: springLength > 0, springCoefficient > 0, dragCoefficient >= 0, timeStep > 0, finite gravity, settleThreshold >= 0 required",
            );
        }
        this.setFixed(options.fixed ?? null);
        this.stagesValue = emptyStages(n);
        this.writeInitialStatistics();
    }

    /** Consecutive iterations whose mean displacement was under settleThreshold x rmsRadius (spec 7.17). */
    get settledCount(): number {
        return this.settledCountValue;
    }

    /** The state's iteration counter (K1 increments it every step). */
    get iteration(): number {
        return this.iterationValue;
    }

    /** The intermediates of the LAST step(). */
    get stages(): SeOracleStages {
        return this.stagesValue;
    }

    /** The trace of every step() so far. */
    get trace(): readonly SeOracleTraceRecord[] {
        return this.traceRecords;
    }

    /** The statistics of the LAST step() (kineticEnergy is that iteration's; 0 before the first step). */
    get stats(): { readonly kineticEnergy: number; readonly meanDisplacement: number; readonly settledCount: number } {
        return {
            kineticEnergy: this.kineticEnergyValue,
            meanDisplacement: this.meanDisplacement,
            settledCount: this.settledCountValue,
        };
    }

    /**
     * Replaces the fixed mask (no implicit reheat: the parity tests call reheat() where the simulation would).
     * @param mask - the NodeMask (ceil(n / 32) words, LSB-first) or null for no fixed node
     */
    setFixed(mask: NodeMask | null): void {
        if (mask !== null && mask.length < Math.ceil(this.n / 32)) {
            throw new Error(`SpringElectricalOracle: mask.length ${mask.length} < ceil(${this.n} / 32)`);
        }
        this.fixed = mask === null ? null : new Uint32Array(mask);
    }

    /**
     * Writes one node's layout-unit position (z forced to 0 in 2D); the velocity and the pending partials are
     * untouched, exactly as the simulation's setPosition leaves the device (7.12; the velocity is never reset).
     * @param index - the node index
     * @param x - layout x
     * @param y - layout y
     * @param z - layout z
     */
    setPosition(index: number, x: number, y: number, z: number): void {
        if (!Number.isInteger(index) || index < 0 || index >= this.n) {
            throw new Error(`SpringElectricalOracle: index ${index} out of range`);
        }
        const r = this.round;
        this.positions[3 * index] = r(x);
        this.positions[3 * index + 1] = r(y);
        this.positions[3 * index + 2] = this.dim === 2 ? 0 : r(z);
    }

    /** reheat() semantics (D8; the model's onReheat is empty): settledCount = 0, the velocities carry on. */
    reheat(): void {
        this.settledCountValue = 0;
    }

    /**
     * One iteration: K1 fold (from the previous stages), K2 (springs), K3 (Coulomb), K5 (drag, Euler, clamp);
     * returns the trace record with THIS iteration's kinetic energy.
     * @returns the trace record of this iteration
     */
    step(): SeOracleTraceRecord {
        const { n } = this;
        const r = this.round;
        // ---- K1: fold the previous integrate's partials (skipped on the first iteration after load, FA2_FLAG_FIRST)
        if (this.pending !== null) {
            this.fold(this.pending);
        }
        this.iterationValue += 1;
        const k1 = {
            meanDisplacement: this.meanDisplacement,
            settledCount: this.settledCountValue,
            rmsRadius: this.rmsRadius,
            layoutRadius: this.radius,
            centroid: [this.centroid[0], this.centroid[1], this.centroid[2]] as const,
        };
        if (n === 0) {
            const empty: SeOracleTraceRecord = { kineticEnergy: 0, ...k1 };
            this.traceRecords.push(empty);
            return empty;
        }
        const stages = emptyStages(n);
        const { positions: pos, mass } = this;
        // ---- K2 (LAW 2): the Hooke spring of every CSR arc toward j, length floored at FA2_DISTANCE_FLOOR
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
                const len = Math.max(len3(r, dx, dy, dz), r(FA2_DISTANCE_FLOOR));
                const w = r(r(this.springCoefficient * r(len - this.springLength)) / len); // k_s (r - L) / r
                fx = r(fx + r(dx * w));
                fy = r(fy + r(dy * w));
                fz = r(fz + r(dz * w));
            }
            stages.attraction[3 * i] = fx;
            stages.attraction[3 * i + 1] = fy;
            stages.attraction[3 * i + 2] = fz;
        }
        // ---- K3 (LAW 2): Coulomb over every pair in tile order (j ascending), then force += (the FA2 gravity is 0)
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
                const dx = r(px - pos[3 * j]);
                const dy = r(py - pos[3 * j + 1]);
                const dz = r(pz - pos[3 * j + 2]);
                const d2 = r(r(r(dx * dx) + r(dy * dy)) + r(dz * dz));
                if (d2 < r(FA2_COINCIDENT_SQ)) {
                    // coincident: the antisymmetric unit kick with the Coulomb magnitude at d = 0.01 (PD-10)
                    const kick = kickDir(i, j, this.dim, this.precision);
                    const magnitude = r(r(r(-this.coulomb * mi) * mj) / r(FA2_DISTANCE_FLOOR_SQ));
                    fx = r(fx + r(kick[0] * magnitude));
                    fy = r(fy + r(kick[1] * magnitude));
                    fz = r(fz + r(kick[2] * magnitude));
                    continue;
                }
                // |F| = -g m_i m_j / d^2 along (p_i - p_j) / d: g < 0 repels (generateQuadTree.js:131-132)
                const scale = r(r(r(-this.coulomb * mi) * mj) / r(d2 * r(Math.sqrt(d2))));
                fx = r(fx + r(dx * scale));
                fy = r(fy + r(dy * scale));
                fz = r(fz + r(dz * scale));
            }
            stages.repulsion[3 * i] = fx;
            stages.repulsion[3 * i + 1] = fy;
            stages.repulsion[3 * i + 2] = fz;
            stages.force[3 * i] = r(stages.attraction[3 * i] + fx);
            stages.force[3 * i + 1] = r(stages.attraction[3 * i + 1] + fy);
            stages.force[3 * i + 2] = r(stages.attraction[3 * i + 2] + fz);
        }
        // ---- K5 (APPLY 2): drag, v += (dt / m) F, the unit speed clamp, p += dt v; a pinned row keeps v and p
        const cx = this.centroid[0];
        const cy = this.centroid[1];
        const cz = this.centroid[2];
        const sumX = new Float64Array(n);
        const sumY = new Float64Array(n);
        const sumZ = new Float64Array(n);
        const sumW = new Float64Array(n);
        const disp = new Float64Array(n);
        const free = new Float64Array(n);
        const ke = new Float64Array(n);
        const v = this.velocity;
        for (let i = 0; i < n; i++) {
            const fixed = this.isFixed(i);
            const mi = mass[i];
            let vx = v[3 * i];
            let vy = v[3 * i + 1];
            let vz = v[3 * i + 2];
            // fd = F - drag v (generateCreateDragForce.js:18); v += (dt / m) fd (generateIntegrator.js:27-29)
            const coeff = r(this.dt / mi);
            vx = r(vx + r(coeff * r(stages.force[3 * i] - r(this.drag * vx))));
            vy = r(vy + r(coeff * r(stages.force[3 * i + 1] - r(this.drag * vy))));
            vz = r(vz + r(coeff * r(stages.force[3 * i + 2] - r(this.drag * vz))));
            const speed = len3(r, vx, vy, vz);
            if (speed > 1) {
                vx = r(vx / speed); // the unit speed clamp (generateIntegrator.js:33-37)
                vy = r(vy / speed);
                vz = r(vz / speed);
            }
            if (this.dim === 2) {
                vz = 0;
            }
            let dx = 0;
            let dy = 0;
            let dz = 0;
            if (!fixed) {
                v[3 * i] = vx;
                v[3 * i + 1] = vy;
                v[3 * i + 2] = vz;
                dx = r(this.dt * vx);
                dy = r(this.dt * vy);
                dz = this.dim === 2 ? 0 : r(this.dt * vz);
                ke[i] = r(r(r(0.5) * mi) * r(r(r(vx * vx) + r(vy * vy)) + r(vz * vz)));
            }
            stages.velocity[3 * i] = v[3 * i];
            stages.velocity[3 * i + 1] = v[3 * i + 1];
            stages.velocity[3 * i + 2] = v[3 * i + 2];
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
            ke: groupTotals(ke, n, "sum", r, 0),
        };
        this.pending = pending;
        const kineticEnergy = foldGroups(pending.ke, "sum", r, 0);
        this.kineticEnergyValue = kineticEnergy;
        this.stagesValue = {
            ...stages,
            partials: {
                sum: [
                    foldGroups(pending.sumX, "sum", r, 0),
                    foldGroups(pending.sumY, "sum", r, 0),
                    foldGroups(pending.sumZ, "sum", r, 0),
                ],
                sumSq: foldGroups(pending.sumW, "sum", r, 0),
                min: [
                    foldGroups(pending.minX, "min", r, F32_MAX),
                    foldGroups(pending.minY, "min", r, F32_MAX),
                    foldGroups(pending.minZ, "min", r, F32_MAX),
                ],
                max: [
                    foldGroups(pending.maxX, "max", r, -F32_MAX),
                    foldGroups(pending.maxY, "max", r, -F32_MAX),
                    foldGroups(pending.maxZ, "max", r, -F32_MAX),
                ],
                maxSq: foldGroups(pending.maxW, "max", r, -F32_MAX),
                disp: foldGroups(pending.disp, "sum", r, 0),
                free: foldGroups(pending.free, "sum", identity, 0),
                kineticEnergy,
            },
        };
        const record: SeOracleTraceRecord = { kineticEnergy, ...k1 };
        this.traceRecords.push(record);
        return record;
    }

    private isFixed(i: number): boolean {
        return this.fixed !== null && maskTest(this.fixed, i);
    }

    /** load()'s CPU statistics: centroid, RMS radius and radius in f64, iteration 0, settledCount 0, meanDisplacement 0. */
    private writeInitialStatistics(): void {
        const { n, positions: pos } = this;
        const r = this.round;
        const c: [number, number, number] = [0, 0, 0];
        for (let i = 0; i < n; i++) {
            c[0] += pos[3 * i];
            c[1] += pos[3 * i + 1];
            c[2] += pos[3 * i + 2];
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
        this.kineticEnergyValue = 0;
    }

    /** K1's fold applied to the state (contract 4.5): centroid, rmsRadius and radius about the previous centroid, the mean free displacement, the settle counter. */
    private fold(p: GroupPartials): void {
        const r = this.round;
        const nf = r(this.n);
        const sumSq = foldGroups(p.sumW, "sum", r, 0);
        const disp = foldGroups(p.disp, "sum", r, 0);
        const free = foldGroups(p.free, "sum", identity, 0);
        const rmsRadius = r(Math.sqrt(r(Math.max(sumSq, 0) / nf)));
        const meanDisplacement = free === 0 ? 0 : r(disp / r(free)); // all-fixed: 0, never NaN (7.4)
        const f: Fold = {
            centroid: [
                r(foldGroups(p.sumX, "sum", r, 0) / nf),
                r(foldGroups(p.sumY, "sum", r, 0) / nf),
                r(foldGroups(p.sumZ, "sum", r, 0) / nf),
            ],
            rmsRadius,
            layoutRadius: r(Math.sqrt(Math.max(foldGroups(p.maxW, "max", r, -F32_MAX), 0))),
            meanDisplacement,
            settledCount: meanDisplacement <= r(this.settleThreshold * rmsRadius) ? this.settledCountValue + 1 : 0,
        };
        this.centroid = [f.centroid[0], f.centroid[1], f.centroid[2]];
        this.rmsRadius = f.rmsRadius;
        this.radius = f.layoutRadius;
        this.meanDisplacement = f.meanDisplacement;
        this.settledCountValue = f.settledCount;
    }
}

/**
 * Runs the reference for `iterations` steps from SCENE-unit positions (the toScene inverse on the way in, toScene on
 * the way out), the shape the layout-level comparisons use.
 * @param s - the snapshot
 * @param scenePositions - 3 x nodeCount scene-unit coordinates (read only)
 * @param options - the oracle options plus the scene scale / centre
 * @param iterations - steps to run
 * @returns the oracle (its positions in layout units), the trace and the final SCENE-unit positions; exported for the
 *   P5-T4 layout-level suites (se-distributional.test.ts)
 * @public
 */
export function springElectricalOracle(
    s: GraphSnapshot,
    scenePositions: F32,
    options: SeOracleOptions & { readonly scale?: number | undefined; readonly center?: readonly number[] | undefined },
    iterations: number,
): { readonly oracle: SpringElectricalOracle; readonly trace: SeOracleTraceRecord[]; readonly scene: Float64Array } {
    const n = s.nodeCount;
    const scale = options.scale ?? 1;
    const cx = options.center?.[0] ?? 0;
    const cy = options.center?.[1] ?? 0;
    const cz = options.center?.[2] ?? 0;
    const layout = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
        layout[3 * i] = (scenePositions[3 * i] - cx) / scale;
        layout[3 * i + 1] = (scenePositions[3 * i + 1] - cy) / scale;
        layout[3 * i + 2] = options.dim === 2 ? 0 : (scenePositions[3 * i + 2] - cz) / scale;
    }
    const oracle = new SpringElectricalOracle(s, layout, options);
    const trace: SeOracleTraceRecord[] = [];
    for (let k = 0; k < iterations; k++) {
        trace.push(oracle.step());
    }
    const scene = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
        scene[3 * i] = oracle.positions[3 * i] * scale + cx;
        scene[3 * i + 1] = oracle.positions[3 * i + 1] * scale + cy;
        scene[3 * i + 2] = options.dim === 2 ? cz : oracle.positions[3 * i + 2] * scale + cz;
    }
    return { oracle, trace, scene };
}
