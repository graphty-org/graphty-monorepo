/**
 * The steppable CPU Fruchterman-Reingold simulation (design 9.3 `FruchtermanReingoldSimulation`, the element's
 * "spring" type): the loop body of `layout/src/layouts/force-directed/fruchterman-reingold.ts:70-151` made
 * index-based over a graph-format snapshot (design 7.20), stepped in batches over the owner's stride-3 scene-unit
 * array (design 7.18 / 7.19), with the settle rule of design 7.17 and the pin / drag semantics of design 7.12.
 *
 * The formulas are the legacy loop's, unchanged: `k = 1 / sqrt(n)` unless given, where a k of 0 or NaN counts as
 * not given (the loop's `if (!k)`, line 76-78) and a negative or infinite k is rejected; the temperature
 * starts at the CONSTANT `t = 0.1` (line 81) and drops by `dt = 0.1 / (iterations + 1)` per iteration (lines 83,
 * 154); the repulsion `k * k / d` between every pair (lines 94-115) and the attraction `d * d / k` per edge
 * (lines 118-134) along `delta / d` with the `|| 0.1` exact-zero guard (lines 103, 123); every free node moves
 * along its displacement by `min(|disp|, t)` (lines 137-151). The attraction runs over the CSR arcs (both arcs of
 * an undirected edge, each moving its own row: the same two contributions the edge loop makes), the repulsion over
 * every unordered pair; every accumulator is f64 and nothing is allocated per pair. The output is never rescaled
 * (design 7.20 "output"): positions are written back in scene units as `layout * scale + center`.
 *
 * Temperature and reheat (design 7.20 / 7.19 `onReheat`): the iteration counter IS the temperature index, so
 * `reheat()` sets it to `floor(0.7 * iterations)` (a drag or an unpin gets a small temperature and the remaining 30%
 * of the budget) and `load()` to 0 (a full run); the temperature can never go negative because the budget
 * `iterationsDone >= iterations` stops the run first.
 */

import { type F32, type GraphSnapshot, maskTest, type NodeMask, type U32 } from "@graphty/graph-format";

import { FA2_DEFAULTS } from "./constants";
import { seedPositions } from "./seed";
import type { FruchtermanReingoldOptions, LayoutSimulation } from "./types";

/** The legacy loop's starting temperature (fruchterman-reingold.ts line 81; design 7.20). */
const FR_START_TEMPERATURE = 0.1;
/** The legacy loop's default iteration count (fruchterman-reingold.ts line 29). */
const FR_DEFAULT_ITERATIONS = 50;
/** The `|| 0.1` exact-zero distance guard (fruchterman-reingold.ts lines 103, 123). */
const FR_ZERO_DISTANCE = 0.1;
/** The reheat point of design 7.20: the iteration index a reheat restarts at, as a fraction of the budget. */
const FR_REHEAT_FRACTION = 0.7;

/**
 * The three center components of a CommonLayoutOptions.center (missing components are 0).
 * @param center - the caller's center, or undefined
 * @returns [x, y, z]; RangeError when a component is not finite
 */
function resolveCenter(center: ArrayLike<number> | undefined): [number, number, number] {
    const out: [number, number, number] = [0, 0, 0];
    if (center === undefined) {
        return out;
    }
    for (let axis = 0; axis < 3 && axis < center.length; axis++) {
        const v = center[axis];
        if (!Number.isFinite(v)) {
            throw new RangeError(`center[${axis}] is not finite`);
        }
        out[axis] = v;
    }
    return out;
}

/**
 * Validates an option that must be a finite number within [lo, hi].
 * @param name - the option name, for the message
 * @param value - the value
 * @param lo - the inclusive lower bound
 * @param hi - the inclusive upper bound
 * @param integer - whether the value must be an integer
 * @returns the value
 */
function checkNumber(name: string, value: number, lo: number, hi: number, integer: boolean): number {
    if (!Number.isFinite(value) || value < lo || value > hi || (integer && !Number.isInteger(value))) {
        throw new RangeError(
            `FruchtermanReingoldSimulation: ${name} must be ${integer ? "an integer" : "a finite number"} in [${lo}, ${hi}], got ${value}`,
        );
    }
    return value;
}

/**
 * The steppable Fruchterman-Reingold layout over the owner's stride-3 scene-unit array (design 9.3): `load()`
 * takes a snapshot and the array (NaN rows are seeded in [0, 1) layout units, design 7.20), `step(k)` runs up
 * to k iterations of the legacy loop body and writes every free node back in scene units, `settled` follows
 * design 7.17, `setFixed` / `setPosition` / `reheat` follow design 7.12 and D8. `maxInFlight` is ignored (a CPU
 * simulation is synchronous).
 */
export class FruchtermanReingoldSimulation implements LayoutSimulation {
    private readonly dim: 2 | 3;
    private readonly scale: number;
    private readonly center: readonly [number, number, number];
    private readonly seed: number | null;
    private readonly kOption: number | null;
    private readonly iterations: number;
    private readonly settleThreshold: number;
    private readonly settleWindow: number;
    private readonly iterationsPerStep: number;
    private readonly fixedOption: NodeMask | string | null;

    private state: "created" | "loaded" | "disposed" = "created";
    private n = 0;
    private rowPtr: U32 = new Uint32Array(1);
    private colIdx: U32 = new Uint32Array(0);
    /** The owner's stride-3 scene-unit array. */
    private owner: F32 = new Float32Array(0);
    /** The internal stride-3 layout-unit positions, f64 (z is 0 in 2D). */
    private positions: Float64Array = new Float64Array(0);
    /** The per-iteration displacement scratch, stride 3, f64. */
    private displacement: Float64Array = new Float64Array(0);
    /** The pinned nodes (NodeMask words), or null when none is pinned. */
    private fixed: U32 | null = null;

    /** The optimal distance k of this load (the option, else 1 / sqrt(n); 0 and NaN count as no option). */
    private k = 0;
    /** The temperature drop per iteration, 0.1 / (iterations + 1). */
    private dt = 0;
    /** The current temperature. */
    private t = FR_START_TEMPERATURE;

    private iterationsDoneValue = 0;
    private settledCountValue = 0;
    private settledValue = false;
    /** The centroid of the last integrate (layout units), the reference of the next iteration's rmsRadius. */
    private centroid: [number, number, number] = [0, 0, 0];
    private rmsRadiusValue = 0;
    private meanDisplacementValue = 0;

    /**
     * Stores the resolved options; nothing is allocated until load().
     * @param options - design 9.3 FruchtermanReingoldOptions (every field optional)
     */
    constructor(options: FruchtermanReingoldOptions = {}) {
        const dim = options.dim ?? FA2_DEFAULTS.dim;
        if (dim !== 2 && dim !== 3) {
            throw new RangeError(`FruchtermanReingoldSimulation: dim must be 2 or 3, got ${String(dim)}`);
        }
        this.dim = dim;
        const scale = options.scale ?? FA2_DEFAULTS.scale;
        if (!Number.isFinite(scale) || scale <= 0) {
            throw new RangeError(`FruchtermanReingoldSimulation: scale must be a finite number > 0, got ${scale}`);
        }
        this.scale = scale;
        this.center = resolveCenter(options.center);
        this.seed = options.seed ?? null;
        // k: null, 0 and NaN mean the auto default 1 / sqrt(n) (the legacy loop's `if (!k)` at line 76, kept for
        // parity); a negative or an infinite k is rejected, which the legacy loop did not do
        const k = options.k ?? null;
        if (k === null || Number.isNaN(k) || k === 0) {
            this.kOption = null;
        } else {
            if (!Number.isFinite(k) || k < 0) {
                throw new RangeError(
                    `FruchtermanReingoldSimulation: k must be null, 0 or a finite number > 0, got ${k}`,
                );
            }
            this.kOption = k;
        }
        this.iterations = checkNumber(
            "iterations",
            options.iterations ?? FR_DEFAULT_ITERATIONS,
            0,
            Number.MAX_SAFE_INTEGER,
            true,
        );
        this.settleThreshold = checkNumber(
            "settleThreshold",
            options.settleThreshold ?? FA2_DEFAULTS.settleThreshold,
            0,
            Number.POSITIVE_INFINITY,
            false,
        );
        this.settleWindow = checkNumber(
            "settleWindow",
            options.settleWindow ?? FA2_DEFAULTS.settleWindow,
            1,
            Number.MAX_SAFE_INTEGER,
            true,
        );
        this.iterationsPerStep = checkNumber(
            "iterationsPerStep",
            options.iterationsPerStep ?? FA2_DEFAULTS.iterationsPerStep,
            1,
            Number.MAX_SAFE_INTEGER,
            true,
        );
        this.fixedOption = options.fixed ?? null;
    }

    /**
     * The settle flag of design 7.17.
     * @returns true at the iteration budget or after settleWindow quiet iterations; true for an empty graph
     */
    get settled(): boolean {
        return this.settledValue;
    }

    /**
     * The iteration index, which is also the temperature index.
     * @returns the iterations run since load(), or since the last reheat() plus its 70% restart point
     */
    get iterationsDone(): number {
        return this.iterationsDoneValue;
    }

    /**
     * The settle counter of design 7.17.
     * @returns the consecutive iterations whose mean free-node displacement was <= settleThreshold * rmsRadius
     */
    get settledCount(): number {
        return this.settledCountValue;
    }

    /**
     * The last iteration's movement.
     * @returns the mean displacement of the free nodes in layout units (0 before the first iteration)
     */
    get meanDisplacement(): number {
        return this.meanDisplacementValue;
    }

    /**
     * The settle normaliser of design 7.17.
     * @returns the RMS radius about the centroid in layout units after the last iteration
     */
    get rmsRadius(): number {
        return this.rmsRadiusValue;
    }

    /**
     * The cooling schedule's current value.
     * @returns the temperature in layout units per iteration
     */
    get temperature(): number {
        return this.t;
    }

    /**
     * Binds a snapshot and the owner's array (design 7.19 load): validates (undirected, `3 * nodeCount` entries),
     * seeds the NaN rows in [0, 1) layout units with the LCG (design 7.20 "initial positions"), converts the
     * scene array into the internal layout-unit array `(v - center) / scale` (z forced to 0 in 2D), resolves k and
     * the temperature schedule, applies the `fixed` option (a mask, a bool node column by name, or the role-`fixed`
     * bool column when the option is null; pins set by setFixed survive a same-size reload without an option and are
     * cleared when n changes, design 7.12), resets the settle statistics and restarts at iteration 0.
     * @param snapshot - an undirected snapshot
     * @param positions - the owner's stride-3 scene-unit array, length 3 * nodeCount, read and written in place
     */
    load(snapshot: GraphSnapshot, positions: F32): void {
        this.assertNotDisposed();
        if (snapshot.directed) {
            throw new Error(
                "FruchtermanReingoldSimulation: the snapshot must be undirected (pass toUndirected().snapshot)",
            );
        }
        const n = snapshot.nodeCount;
        if (positions.length !== 3 * n) {
            throw new RangeError(
                `FruchtermanReingoldSimulation: positions has ${positions.length} entries, expected ${3 * n}`,
            );
        }
        const fixed = this.resolveFixed(snapshot, n);
        if (n !== this.n) {
            this.positions = new Float64Array(3 * n);
            this.displacement = new Float64Array(3 * n);
        }
        this.n = n;
        this.rowPtr = snapshot.rowPtr;
        this.colIdx = snapshot.colIdx;
        this.owner = positions;
        this.fixed = fixed;

        seedPositions(snapshot, positions, this.seed, this.dim, this.scale, this.center, "fr");
        const pos = this.positions;
        const [cx, cy, cz] = this.center;
        const { scale } = this;
        for (let i = 0; i < n; i++) {
            pos[3 * i] = (positions[3 * i] - cx) / scale;
            pos[3 * i + 1] = (positions[3 * i + 1] - cy) / scale;
            pos[3 * i + 2] = this.dim === 2 ? 0 : (positions[3 * i + 2] - cz) / scale;
        }

        // Optimal distance between nodes (line 76-78) and the cooling schedule (lines 81-83)
        this.k = this.kOption ?? 1.0 / Math.sqrt(n);
        this.dt = FR_START_TEMPERATURE / (this.iterations + 1);
        this.t = FR_START_TEMPERATURE;

        this.writeInitialStatistics();
        this.iterationsDoneValue = 0;
        this.settledCountValue = 0;
        this.state = "loaded";
        this.settledValue = n === 0 || this.computeSettled();
    }

    /**
     * Runs up to `iterations` iterations of the legacy loop body (design 7.19 step): throws before load() and after
     * dispose(); returns at once when settled; stops early when the budget or the settle window is reached, so the
     * simulation never runs an iteration while settled; then writes every FREE node back to the owner's array in
     * scene units (fixed rows are never written: their scene value is the owner's).
     * @param iterations - the batch size k (default options.iterationsPerStep, default 1)
     */
    step(iterations: number = this.iterationsPerStep): void {
        this.assertNotDisposed();
        if (this.state !== "loaded") {
            throw new Error("FruchtermanReingoldSimulation: not loaded");
        }
        if (!Number.isInteger(iterations) || iterations < 1) {
            throw new RangeError(`FruchtermanReingoldSimulation: step(${iterations}): an integer >= 1 is required`);
        }
        if (this.settledValue) {
            return;
        }
        let ran = 0;
        while (ran < iterations && !this.settledValue) {
            this.iterate();
            ran++;
            this.iterationsDoneValue++;
            this.settledValue = this.computeSettled();
        }
        this.writeBack();
    }

    /**
     * Replaces the pinned set (design 7.12): the mask needs ceil(n / 32) words; the bits are copied; the
     * simulation reheats only when a bit went 1 -> 0 (an unpin); adding pins never reheats.
     * @param mask - the NodeMask (LSB-first words, the bool-column layout)
     */
    setFixed(mask: NodeMask): void {
        this.assertLoaded();
        const { n } = this;
        const words = Math.ceil(n / 32);
        if (mask.length < words) {
            throw new RangeError(
                `FruchtermanReingoldSimulation: setFixed: the mask has ${mask.length} words, ${words} needed for ${n} nodes`,
            );
        }
        let unpinned = false;
        const previous = this.fixed;
        if (previous !== null) {
            for (let i = 0; i < n && !unpinned; i++) {
                if (maskTest(previous, i) && !maskTest(mask, i)) {
                    unpinned = true;
                }
            }
        }
        this.fixed = new Uint32Array(mask.subarray(0, words));
        if (unpinned) {
            this.reheat();
        }
    }

    /**
     * A drag (design 7.12): writes the scene position into the owner's array at once and into the internal layout
     * position `(v - center) / scale` (z forced to 0 in 2D), then reheat().
     * @param index - the node index (< n)
     * @param x - scene x
     * @param y - scene y
     * @param z - scene z (ignored by the layout in 2D)
     */
    setPosition(index: number, x: number, y: number, z: number): void {
        this.assertLoaded();
        const { n } = this;
        if (!Number.isInteger(index) || index < 0 || index >= n) {
            throw new RangeError(`FruchtermanReingoldSimulation: setPosition(${index}): index out of range [0, ${n})`);
        }
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
            throw new RangeError("FruchtermanReingoldSimulation: setPosition: coordinates must be finite");
        }
        const { owner, positions: pos, scale } = this;
        const [cx, cy, cz] = this.center;
        owner[3 * index] = x;
        owner[3 * index + 1] = y;
        owner[3 * index + 2] = z;
        pos[3 * index] = (x - cx) / scale;
        pos[3 * index + 1] = (y - cy) / scale;
        pos[3 * index + 2] = this.dim === 2 ? 0 : (z - cz) / scale;
        this.reheat();
    }

    /**
     * Reheats (D8, design 7.20): the settle window restarts and the iteration index becomes
     * `floor(0.7 * iterations)`, so the run continues at a small temperature for the remaining 30% of the budget.
     * Nothing else changes. Allowed before load().
     */
    reheat(): void {
        this.assertNotDisposed();
        this.iterationsDoneValue = Math.floor(FR_REHEAT_FRACTION * this.iterations);
        this.settledCountValue = 0;
        this.t = FR_START_TEMPERATURE - this.dt * this.iterationsDoneValue;
        if (this.state === "loaded") {
            this.settledValue = this.n === 0 || this.computeSettled();
        }
    }

    /** Releases the scratch arrays; every later call but dispose() throws. */
    dispose(): void {
        this.state = "disposed";
        this.n = 0;
        this.positions = new Float64Array(0);
        this.displacement = new Float64Array(0);
        this.owner = new Float32Array(0);
        this.rowPtr = new Uint32Array(1);
        this.colIdx = new Uint32Array(0);
        this.fixed = null;
    }

    // ---------------------------------------------------------------- the loop body

    /**
     * One iteration of the legacy loop (fruchterman-reingold.ts lines 86-155) plus the settle fold of design 7.17.
     */
    private iterate(): void {
        const { n, k, t, positions: pos, displacement: disp, rowPtr, colIdx, fixed } = this;
        // Calculate repulsive forces (lines 88-91): the displacement starts at 0
        disp.fill(0);

        // Repulsive forces between nodes (lines 94-115): every unordered pair, k^2 / d along delta / d
        for (let u = 0; u < n; u++) {
            const ux = pos[3 * u];
            const uy = pos[3 * u + 1];
            const uz = pos[3 * u + 2];
            for (let v = u + 1; v < n; v++) {
                // Difference vector (line 100)
                const dx = ux - pos[3 * v];
                const dy = uy - pos[3 * v + 1];
                const dz = uz - pos[3 * v + 2];
                // Distance (line 103): an exact 0 becomes 0.1, otherwise unclamped
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || FR_ZERO_DISTANCE;
                // Force (line 106)
                const force = (k * k) / distance;
                // Add force to displacement (lines 109-113)
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;
                const fz = (dz / distance) * force;
                disp[3 * u] += fx;
                disp[3 * u + 1] += fy;
                disp[3 * u + 2] += fz;
                disp[3 * v] -= fx;
                disp[3 * v + 1] -= fy;
                disp[3 * v + 2] -= fz;
            }
        }

        // Attractive forces between connected nodes (lines 118-134): per arc, d^2 / k toward the neighbour; the
        // two arcs of an undirected edge are the edge loop's two contributions (source -= and target +=)
        for (let u = 0; u < n; u++) {
            const ux = pos[3 * u];
            const uy = pos[3 * u + 1];
            const uz = pos[3 * u + 2];
            for (let a = rowPtr[u]; a < rowPtr[u + 1]; a++) {
                const v = colIdx[a];
                // Difference vector (line 120)
                const dx = ux - pos[3 * v];
                const dy = uy - pos[3 * v + 1];
                const dz = uz - pos[3 * v + 2];
                // Distance (line 123)
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || FR_ZERO_DISTANCE;
                // Force (line 126)
                const force = (distance * distance) / k;
                // Add force to displacement (lines 129-133), this row's side only
                disp[3 * u] -= (dx / distance) * force;
                disp[3 * u + 1] -= (dy / distance) * force;
                disp[3 * u + 2] -= (dz / distance) * force;
            }
        }

        // Update positions (lines 137-151): every free node moves along its displacement by min(|disp|, t); the
        // settle fold of design 7.17 rides along: sum of positions (the next centroid), sum |p - c|^2 about the
        // start-of-iteration centroid (the RMS radius), sum of the free nodes' displacement magnitudes
        const [cx, cy, cz] = this.centroid;
        let sumX = 0;
        let sumY = 0;
        let sumZ = 0;
        let sumSq = 0;
        let moved = 0;
        let free = 0;
        for (let i = 0; i < n; i++) {
            if (fixed === null || !maskTest(fixed, i)) {
                const mx = disp[3 * i];
                const my = disp[3 * i + 1];
                const mz = disp[3 * i + 2];
                // Calculate displacement magnitude (line 141)
                const magnitude = Math.sqrt(mx * mx + my * my + mz * mz);
                // Limit maximum displacement by temperature (line 144)
                const limitedMagnitude = Math.min(magnitude, t);
                // Update position (lines 147-150)
                if (magnitude !== 0) {
                    pos[3 * i] += (mx / magnitude) * limitedMagnitude;
                    pos[3 * i + 1] += (my / magnitude) * limitedMagnitude;
                    pos[3 * i + 2] += (mz / magnitude) * limitedMagnitude;
                }
                moved += limitedMagnitude;
                free++;
            }
            const px = pos[3 * i];
            const py = pos[3 * i + 1];
            const pz = pos[3 * i + 2];
            sumX += px;
            sumY += py;
            sumZ += pz;
            const qx = px - cx;
            const qy = py - cy;
            const qz = pz - cz;
            sumSq += qx * qx + qy * qy + qz * qz;
        }

        // Cool temperature (line 154)
        this.t -= this.dt;

        // The K1 fold (design 7.17): centroid, RMS radius about the previous centroid, mean free-node displacement
        // (0 when every node is fixed, never NaN), the settle counter
        this.centroid = [sumX / n, sumY / n, sumZ / n];
        this.rmsRadiusValue = Math.sqrt(Math.max(sumSq, 0) / n);
        this.meanDisplacementValue = free === 0 ? 0 : moved / free;
        this.settledCountValue =
            this.meanDisplacementValue <= this.settleThreshold * this.rmsRadiusValue ? this.settledCountValue + 1 : 0;
    }

    /** Writes every free node's layout position back to the owner's array as `layout * scale + center`. */
    private writeBack(): void {
        const { n, owner, positions: pos, scale, fixed } = this;
        const [cx, cy, cz] = this.center;
        for (let i = 0; i < n; i++) {
            if (fixed !== null && maskTest(fixed, i)) {
                continue;
            }
            owner[3 * i] = pos[3 * i] * scale + cx;
            owner[3 * i + 1] = pos[3 * i + 1] * scale + cy;
            owner[3 * i + 2] = pos[3 * i + 2] * scale + cz;
        }
    }

    /**
     * load()'s statistics: the centroid and the RMS radius of the loaded positions, meanDisplacement 0.
     */
    private writeInitialStatistics(): void {
        const { n, positions: pos } = this;
        if (n === 0) {
            this.centroid = [0, 0, 0];
            this.rmsRadiusValue = 0;
            this.meanDisplacementValue = 0;
            return;
        }
        let cx = 0;
        let cy = 0;
        let cz = 0;
        for (let i = 0; i < n; i++) {
            cx += pos[3 * i];
            cy += pos[3 * i + 1];
            cz += pos[3 * i + 2];
        }
        cx /= n;
        cy /= n;
        cz /= n;
        let sumSq = 0;
        for (let i = 0; i < n; i++) {
            const qx = pos[3 * i] - cx;
            const qy = pos[3 * i + 1] - cy;
            const qz = pos[3 * i + 2] - cz;
            sumSq += qx * qx + qy * qy + qz * qz;
        }
        this.centroid = [cx, cy, cz];
        this.rmsRadiusValue = Math.sqrt(sumSq / n);
        this.meanDisplacementValue = 0;
    }

    /**
     * The settle rule of design 7.17.
     * @returns true at the iteration budget or after settleWindow quiet iterations
     */
    private computeSettled(): boolean {
        return this.iterationsDoneValue >= this.iterations || this.settledCountValue >= this.settleWindow;
    }

    /**
     * The pinned set a load() starts with: the option's mask (copied, validated against n), the named bool node
     * column's words, the role-`fixed` bool column when the option is null, else the previous pins when n is
     * unchanged and none when it changed (design 7.12).
     * @param snapshot - the snapshot being loaded
     * @param n - its node count
     * @returns the mask words, or null for no pinned node
     */
    private resolveFixed(snapshot: GraphSnapshot, n: number): U32 | null {
        const words = Math.ceil(n / 32);
        const spec = this.fixedOption;
        if (typeof spec === "string") {
            const column = snapshot.nodes.get(spec);
            if (column === null) {
                throw new RangeError(
                    `FruchtermanReingoldSimulation: fixed names node column "${spec}", which the snapshot does not hold`,
                );
            }
            if (column.dtype !== "bool") {
                throw new TypeError(
                    `FruchtermanReingoldSimulation: fixed names node column "${spec}", which is ${column.dtype}, not bool`,
                );
            }
            return new Uint32Array(column.data.subarray(0, words));
        }
        if (spec !== null) {
            if (spec.length < words) {
                throw new RangeError(
                    `FruchtermanReingoldSimulation: the fixed mask has ${spec.length} words, ${words} needed for ${n} nodes`,
                );
            }
            return new Uint32Array(spec.subarray(0, words));
        }
        const byRole = snapshot.nodes.byRole("fixed");
        if (byRole !== null && byRole.dtype === "bool") {
            return new Uint32Array(byRole.data.subarray(0, words));
        }
        return n === this.n ? this.fixed : null;
    }

    private assertNotDisposed(): void {
        if (this.state === "disposed") {
            throw new Error("FruchtermanReingoldSimulation: disposed");
        }
    }

    private assertLoaded(): void {
        this.assertNotDisposed();
        if (this.state !== "loaded") {
            throw new Error("FruchtermanReingoldSimulation: not loaded");
        }
    }
}
