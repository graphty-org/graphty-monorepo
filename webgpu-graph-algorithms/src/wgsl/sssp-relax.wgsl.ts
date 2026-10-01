/**
 * The `sssp-relax` kernel body (design 8.4 "Davidson's near-far", 8.10 "SSSP near-far relax"; P8-T9, the P8 plan's
 * PD-9 / PD-20 / PD-22 / DEP-P8-E): one round of the near-far shortest-path loop. `dist` is `array<atomic<u32>>`
 * holding the IEEE-754 bit patterns of the f32 distances (`F32_INF_BITS` = unreached), and `atomicMin` on the
 * patterns IS `min` on the values, because for non-negative floats the unsigned bit order is the value order
 * (`+0` is `0x00000000`, every sum of non-negatives under round-to-nearest is `+0` or positive, never `-0`), which
 * the driver's host scan of the weight vector guarantees -- the whole trick, and it needs no float atomic (PD-9).
 * Every candidate is ONE f32 add, `dist[u] + w`, so the settled value is the minimum of a fixed set of f32
 * numbers: order-independent, bitwise reproducible, and bitwise equal to the f32 Dijkstra oracle.
 *
 * Two roles over one body, chosen by `P.role`. Role 0 (the near round) reads the deduped near pile `queueIn`
 * (`counters[0]` entries, at most `P.n`), relaxes every arc of every entry's WHOLE row (never windowed, DEP-P8-E),
 * skips a candidate above `P.cutoffBits` (the CPU port's `dv <= cutoff` guard as `nd > cutoff`), and when its
 * `atomicMin` improved `v` -- this lane alone observed a larger old value, so this lane alone owns the append --
 * appends `v` to the raw near half of `queueOut` (word 0, count word 1) when `nd` is below the threshold
 * (`counters[22]`), else to the raw far half (word `P.edgeCapacity`, count word 21). Role 1 (the pass-through,
 * PD-20) re-buckets the deduped far pile (`counters[20]` entries): an entry whose settled distance fell below the
 * PREVIOUS threshold (`counters[4]`) was appended to near at that improvement and relaxed there, so it is dropped;
 * the rest go back to near or far against the threshold the boundary just raised. The count words are unclamped
 * (the write is guarded by the capacity; `frontier-finalize` role 2 detects a pile above it). The appends are per
 * improving relaxation, one atomic each: inside a per-lane arc loop no workgroup aggregation is possible without the
 * uniform-strip structure of `bfs-fused`, and Davidson's kernel appends per thread too. Grid-strided under a direct
 * dispatch of `planGridStride(n)`: `P.stride` is the plan's, a deduped pile of at most `n` entries is covered in a
 * few trips per lane and `i + stride` never wraps (`U32_MAX` would); the block's `path` word (5 a near round, 6 a
 * far one) makes the other role's dispatch a no-op. No barrier anywhere: the loops may
 * be per lane. Body only (spec 3.5, D9); the text is normative: the sabotage rows of test/helpers/sabotage.ts are
 * textual edits of it.
 */
export const ssspRelaxWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn sssp_relax(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    let mine = select(5u, 6u, P.role == 1u);                           // the path word role 2 wrote: 5 a near round, 6 a far pass-through
    let chosen = atomicLoad(&counters[24]) == mine;                    // the other role's dispatch of the round is a no-op
    let count = select(0u, min(atomicLoad(&counters[select(0u, 20u, P.role == 1u)]), P.n), chosen);   // the deduped near or far pile
    let threshold = bitcast<f32>(atomicLoad(&counters[22]));
    let cutoff = bitcast<f32>(P.cutoffBits);
    for (var i = first; i < count; i = i + P.stride) {                // no barrier anywhere: the loops may be per lane
        let u = queueIn[i];
        let du = bitcast<f32>(atomicLoad(&dist[u]));
        if (P.role == 1u) {                                            // the pass-through (PD-20): re-bucket a far entry
            if (du < bitcast<f32>(atomicLoad(&counters[4]))) { continue; }   // below the previous threshold: relaxed in an earlier bucket
            if (du < threshold) {
                let q = atomicAdd(&counters[1], 1u);
                if (q < P.edgeCapacity) { queueOut[q] = u; }
            } else {
                let q = atomicAdd(&counters[21], 1u);
                if (q < P.edgeCapacity) { queueOut[P.edgeCapacity + q] = u; }
            }
            continue;
        }
        let end = rowPtr[u + 1u];
        for (var a = rowPtr[u]; a < end; a = a + 1u) {                 // the whole row: never windowed (DEP-P8-E)
            let v = colIdx[a];
            let nd = du + select(1.0, weights[a], HAS_WEIGHTS);         // ONE f32 add (PD-9)
            if (nd > cutoff) { continue; }                             // SsspOptions.cutoff: the CPU port's dv <= cutoff
            let bits = bitcast<u32>(nd);
            let old = atomicMin(&dist[v], bits);                       // exact on non-negative floats
            if (bits < old) {                                          // this lane improved v, so it owns the append
                if (nd < threshold) {
                    let q = atomicAdd(&counters[1], 1u);
                    if (q < P.edgeCapacity) { queueOut[q] = v; }
                } else {
                    let q = atomicAdd(&counters[21], 1u);
                    if (q < P.edgeCapacity) { queueOut[P.edgeCapacity + q] = v; }
                }
            }
        }
    }
}
`;
