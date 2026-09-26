/**
 * K1 of the ForceAtlas2 iteration, `fa2-stats-finalize` (spec 7.4; contract 4.5): one workgroup folds the partials
 * the previous integrate (K5) wrote into the state block -- centroid, RMS radius, layout radius (max |p - c|, the
 * exact spec 3.3 value from `partials.max.w`), bounding box, mean displacement over free nodes (0 when every node
 * is fixed), the settle counter -- increments the iteration counter and writes the K1 half of the trace record.
 * On the first iteration after load() (`FA2_FLAG_FIRST`) it folds nothing and keeps the host-written state.
 * `STATS_MODE` (P5, spec 7.20) adds the model statistic: 0 = the FA2 text, 1 = the Fruchterman-Reingold temperature
 * of this iteration into `S.temperature` and the trace's `modelScalar` -- the uniform's under the linear schedule,
 * or, with `FA2_FLAG_ADAPTIVE` set, the adaptive one: the previous iteration's force energy (K5 folds sum |F|^2 over
 * free nodes into `partials.swingTraction.x`) against `S.frEnergy` grows the temperature by 1 / FR_COOLING_STEP after
 * FR_COOLING_PATIENCE consecutive falls and shrinks it by FR_COOLING_STEP on a rise (Yifan Hu 2005, section 3.2);
 * 2 = the spring-electrical kinetic energy K5 folded into `partials.swingTraction.x` (PD-4) into `S.kineticEnergy`
 * and the trace. On the grid tier (`P.gridMax > 0`, P4-T10, PD-14) it also derives the grid frame of the next build
 * from the fold (`extent = max(min(bboxExtent * GRID_BBOX_MARGIN, extentFactor * rmsRadius), GRID_EXTENT_FLOOR)`,
 * `cellSize = extent / G`, `gridMin = centroid - extent / 2` with `cellSize` in `.w`, `invCellSize`, `eps = 0.25
 * cellSize`), copies the previous iteration's pseudo-cell count and occupancy max into the state, and resets the
 * hub counters; the exact tier writes `gridMax: 0` and binds two dummies, so the block is dead there.
 *
 * This file holds the kernel BODY only (spec 3.5, D9): no bind-group lines and no `override` lines -- the composer
 * emits them from the registry entry in src/kernels.ts (contract 3.10.1). The text is normative (contract 4.5) and
 * is the target of the K1 sabotage mutations (test/helpers/sabotage.ts, P3-T5); amend the contract before editing.
 */

/** The K1 body: entry point `stats_finalize`; calls the reduction helpers (`needs: ["subgroups"]`, contract 4.3). */
export const fa2StatsFinalizeWgsl = /* wgsl */ `// K1: folds the previous integrate's partials into the state block (spec 7.4); one workgroup
@compute @workgroup_size(WG)
fn stats_finalize(@builtin(local_invocation_id) lid: vec3<u32>) {
    let groups = (P.n + WG - 1u) / WG;
    let fold = (P.flags & FA2_FLAG_FIRST) == 0u;    // the first iteration after load() keeps the host-written state
    var sum = vec4f(0.0);
    var lo = vec4f(F32_MAX);
    var hi = vec4f(-F32_MAX);
    var disp = 0.0;
    var free = 0u;
    var ke = 0.0;
    if (fold) {
        for (var g = lid.x; g < groups; g = g + WG) {   // sequential per lane in index order: deterministic
            let q = partials[g];
            sum = sum + q.sum;
            lo = min(lo, q.min);
            hi = max(hi, q.max);
            disp = disp + q.dispFree.x;
            free = free + u32(q.dispFree.y);
            ke = ke + q.swingTraction.x;
        }
    }
    let tSum = wg_reduce_vec4(sum, lid.x, 0u);
    let tLo = wg_reduce_vec4(lo, lid.x, 1u);
    let tHi = wg_reduce_vec4(hi, lid.x, 2u);
    let tDisp = wg_reduce_f32(disp, lid.x, 0u);
    let tFree = wg_reduce_u32(free, lid.x, 0u);
    let tKe = wg_reduce_f32(ke, lid.x, 0u);
    if (lid.x == 0u) {
        if (fold) {
            let n = f32(P.n);
            let c = tSum.xyz / n;
            S.centroid = vec4f(c, 0.0);
            S.rmsRadius = sqrt(max(tSum.w, 0.0) / n);                  // RMS radius about the previous centroid (7.17)
            S.min = vec4f(tLo.xyz, 0.0);
            S.max = vec4f(tHi.xyz, 0.0);
            S.radius = sqrt(max(tHi.w, 0.0));                          // max |p - centroid| about the same previous centroid as rmsRadius (K5 puts |q|^2 in max.w)
            let meanDisp = select(tDisp / f32(tFree), 0.0, tFree == 0u);  // all-fixed: 0, never NaN (7.4)
            S.meanDisplacement = meanDisp;
            S.settledCount = select(0u, S.settledCount + 1u, meanDisp <= min(P.settleThreshold * S.rmsRadius, P.settleFloor));   // relative AND absolute (issue #97)
        }
        S.iteration = S.iteration + 1u;
        T[P.iterationIndex].meanDisplacement = S.meanDisplacement;
        T[P.iterationIndex].settledCount = S.settledCount;
        T[P.iterationIndex].iteration = S.iteration;
        if (P.gridMax > 0u) {                                      // the grid tier (7.7): the robust extent, the cell size, eps, last iteration's counts, the hub counter reset (PD-14)
            let cells = P.gridMax * P.gridMax * select(1u, P.gridMax, P.dim == 3u);
            if (fold) {
                let box = (S.max.xyz - S.min.xyz) * GRID_BBOX_MARGIN;
                var bboxExtent = max(box.x, box.y);
                if (P.dim == 3u) { bboxExtent = max(bboxExtent, box.z); }
                let extent = max(min(bboxExtent, P.extentFactor * S.rmsRadius), GRID_EXTENT_FLOOR);   // min(bbox, extentFactor x rms), floored (7.7)
                let cellSize = extent / f32(P.gridMax);
                S.gridMin = vec4f(S.centroid.xyz - vec3f(0.5 * extent), cellSize);   // gridMin.w carries cellSize
                S.invCellSize = 1.0 / cellSize;
                S.eps = 0.25 * cellSize;
            }
            var outside = 0u;                                        // the previous iteration's pseudo-cell counts, one per orthant (issue #90; 0 after load)
            for (var o = 0u; o < select(4u, 8u, P.dim == 3u); o = o + 1u) { outside = outside + cellHist[cells + o]; }
            S.outsideGrid = outside;
            S.maxCellOccupancy = atomicLoad(&hubCounters[1]);
            atomicStore(&hubCounters[0], 0u);
            atomicStore(&hubCounters[1], 0u);
        }
        if (STATS_MODE == 1u) {                                    // FR: this iteration's temperature (7.20) into the state and the trace
            if ((P.flags & FA2_FLAG_ADAPTIVE) != 0u) {                // adaptive cooling (Yifan Hu 2005 3.2): tKe is the previous iteration's sum |F|^2 over free nodes
                if (fold) {
                    var t = S.temperature;
                    if (tKe < S.frEnergy) {
                        S.frProgress = S.frProgress + 1u;
                        if (S.frProgress >= FR_COOLING_PATIENCE) { S.frProgress = 0u; t = t / FR_COOLING_STEP; }
                    } else {
                        S.frProgress = 0u;
                        t = t * FR_COOLING_STEP;
                    }
                    S.frEnergy = tKe;
                    S.temperature = t;
                }
            } else {
                S.temperature = P.temperature;
            }
            T[P.iterationIndex].modelScalar = S.temperature;
        }
        if (STATS_MODE == 2u) {                                    // spring-electrical: the kinetic energy K5 folded into partials B (PD-4); 0 on the first iteration after load()
            S.kineticEnergy = tKe;
            T[P.iterationIndex].modelScalar = tKe;
        }
    }
}`;
