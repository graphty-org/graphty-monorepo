/**
 * The `bf-relax` kernel body (design 8.4 "Bellman-Ford"; P8-T10, the P8 plan's PD-12 / PD-22 / PD-27 / DEP-P8-E):
 * one edge-parallel relaxation round over the `edgeList()` view -- every logical edge once, in declared orientation,
 * and under `UNDIRECTED` the other direction too, because an undirected edge has ONE weight (read through its
 * forward arc, `weights[edgeToArc[e]]`, from the run's arc-indexed vector: the snapshot's column or the uploaded
 * override). `dist` is `array<atomic<u32>>` holding the f32 bit patterns (`F32_INF_BITS` = unreached, tested as the
 * pattern: `bitcast<f32>(F32_INF_BITS)` is a const-expression Tint rejects). `atomicMin` on the patterns is `min` on
 * the values for NON-NEGATIVE floats only (PD-9); with a negative distance the bit-pattern order reverses, so the
 * claim is a compare-exchange loop on the pattern: read, compute, compare as floats, try to exchange. WGSL lets
 * `atomicCompareExchangeWeak` fail spuriously, so the loop is BOUNDED (PD-12: `P.maxRetries`, the driver's
 * `MAX_RETRIES`; contention is per vertex, not global) and a lane that exhausts it sets `flags[1]`
 * (`retryExhausted`): the driver treats the round as changed and runs on, so the lost update is retried by the next
 * round, which examines every edge anyway; a bound hit in the decision round is E_VALIDATION, never a guess. A
 * successful exchange sets `flags[0]` (`changed`); the driver stops when a batch of rounds changed nothing, and a
 * change in the round after `n - 1` is the negative cycle. `P.cutoffBits` is the CPU port's `dv <= cutoff` guard
 * (`+Inf` when absent; with negative weights a negative cutoff legitimately relaxes). Grid-strided over
 * `planGridStride(edgeCount)` with `P.stride` the plan's stride; no barrier anywhere, so the loops may be per lane.
 * The whole arc array is bound (never windowed, DEP-P8-E). Body only (spec 3.5, D9); the text is normative: the
 * sabotage rows of test/helpers/sabotage.ts are textual edits of it.
 */
export const bfRelaxWgsl = /* wgsl */ `
fn relax(v: u32, nd: f32) {
    var cur = atomicLoad(&dist[v]);
    var tries = 0u;
    loop {
        if (!(nd < bitcast<f32>(cur))) { break; }                     // no improvement; +Inf is greater than every finite nd
        let r = atomicCompareExchangeWeak(&dist[v], cur, bitcast<u32>(nd));
        if (r.exchanged) { atomicStore(&flags[0], 1u); break; }        // changed
        cur = r.old_value;
        tries = tries + 1u;
        if (tries >= P.maxRetries) { atomicStore(&flags[1], 1u); break; }   // retryExhausted (PD-12)
    }
}

@compute @workgroup_size(WG)
fn bf_relax(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    let cutoff = bitcast<f32>(P.cutoffBits);
    for (var e = first; e < P.edgeCount; e = e + P.stride) {          // each logical edge once (edgeList)
        let u = edgeSrc[e];
        let v = edgeDst[e];
        let w = weights[edgeToArc[e]];                                 // the edge's weight through its forward arc
        let du = atomicLoad(&dist[u]);
        if (du != F32_INF_BITS) {                                      // unreached is tested as the bit pattern, as sssp-pred does
            let nd = bitcast<f32>(du) + w;
            if (nd <= cutoff) { relax(v, nd); }
        }
        if (UNDIRECTED) {                                              // the other direction of an undirected edge
            let dv = atomicLoad(&dist[v]);
            if (dv != F32_INF_BITS) {
                let nd = bitcast<f32>(dv) + w;
                if (nd <= cutoff) { relax(u, nd); }
            }
        }
    }
}
`;
