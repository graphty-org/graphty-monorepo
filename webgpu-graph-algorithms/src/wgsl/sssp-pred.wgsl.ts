/**
 * The `sssp-pred` kernel body (design 8.10 "SSSP predecessor pass"; P8-T6 and P8-T9, the P8 plan's PD-11 / PD-24 /
 * PD-27): the ONE post-pass over the settled distances that produces `parent` for `breadthFirstSearch` and
 * `predArc` for `sssp` and `bellmanFord`, so no claim kernel writes a predecessor and every predecessor array is a
 * function of the settled `depth` / `dist` alone (bitwise reproducible, PD-14). `MODE` (a pipeline override) picks
 * the distance type: 1 = u32 depths (`dist` is the BFS depth array, a tight arc is `depth[u] + 1 == depth[v]`, every
 * tight arc is admitted, and the chain is acyclic because depth strictly decreases along it); 0 = f32 bit patterns
 * (a tight arc is `bitcast<u32>(bitcast<f32>(dist[u]) + w) == dist[v]`, one f32 add compared as the bits PD-9
 * stores). `P.predKind` picks what is written: 0 the arc index, 1 the source node index. The winner is the SMALLEST
 * admitted value through `atomicMin` on `pred[v]`, which the driver fills with `INVALID_INDEX` first; the source
 * keeps `INVALID_INDEX` whatever attains it.
 *
 * In `MODE 0` the body runs PD-27's three roles over a `pred` buffer of `2 x hb + 64` words, `hb = roundUp(n, 64)`:
 * `pred[0, n)` the arcs, `pred[hb, hb + n)` the hop counts, `pred[2 hb]` the changed word, `pred[2 hb + 1]` the orphan
 * word. Role 0 (the roots pass, `P.mode 0` only) marks every node with a tight in-arc from a strictly smaller
 * distance as a root (`hops 0`); role 1 (a hop pass, `P.iteration` inside its batch) lowers `hops[v]` to
 * `hops[u] + 1` along every plateau arc (`P.mode 0`: equal distance) or every tight arc (`P.mode 1`: bellmanFord's
 * tight-subgraph rule) and records the pass index in the changed word when it lowered one, returning at its first
 * line when the previous pass changed nothing; role 2 (the predecessor pass) admits the smallest tight arc whose
 * source sits exactly one key step below `v` and counts a reached non-source node the key never reached as an
 * orphan (only bellmanFord can make one). `MODE 1` reads none of `P.role`, `P.mode` and `P.iteration` and never
 * touches `pred` beyond word `n - 1`. The body STRIDES over the rows (`planGridStride(n)`, `P.stride` the plan's
 * stride): a per-invocation body under that plan would leave every row above the dispatch cap at `INVALID_INDEX`,
 * silently. No barrier anywhere, so the early return is legal. Body only (spec 3.5, D9); the text is normative: the
 * sabotage rows of test/helpers/sabotage.ts are textual edits of it.
 */
export const ssspPredWgsl = /* wgsl */ `
@compute @workgroup_size(WG)
fn sssp_pred(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    let hb = ((P.n + 63u) / 64u) * 64u;                              // MODE 0 only: hops[v] is pred[hb + v]; pred[2 hb] is the changed word, pred[2 hb + 1] the orphan word (PD-27)
    if (P.role == 1u && P.iteration != 0u && atomicLoad(&pred[2u * hb]) < P.iteration) { return; }   // the previous hop pass changed nothing: converged (no barrier anywhere, so the early return is legal)
    for (var u = first; u < P.n; u = u + P.stride) {                 // grid-stride over the rows (planGridStride(n)); no barrier anywhere
        let du = dist[u];
        var unreached = false;
        if (MODE == 1u) { unreached = du == INVALID_INDEX; } else { unreached = du == F32_INF_BITS; }
        if (unreached) { continue; }
        var hu = 0u;                                                 // u's hop count (MODE 0, roles 1 and 2)
        if (MODE == 0u && P.role != 0u) {
            hu = atomicLoad(&pred[hb + u]);
            if (hu == INVALID_INDEX) {                               // the key has not reached u yet
                if (P.role == 2u && u != P.source) { atomicAdd(&pred[2u * hb + 1u], 1u); }   // an orphan: only bellmanFord can make one (P8-T10 Step 3)
                continue;
            }
        }
        let end = min(rowPtr[u + 1u], P.arcEnd);
        for (var a = max(rowPtr[u], P.arcBase); a < end; a = a + 1u) {
            let v = colIdx[a - P.arcBase];
            if (v == P.source) { continue; }                         // the source keeps INVALID_INDEX whatever attains it (a zero-weight arc could)
            let dv = dist[v];
            var tight = false;                                       // the arc explains dist[v]
            var below = false;                                       // and its source sits at a strictly smaller distance
            if (MODE == 1u) {
                tight = (du + 1u) == dv;                             // depth mode: BFS parent, one depth down
            } else {
                let w = select(1.0, weights[a - P.arcBase], HAS_WEIGHTS);
                tight = (dv != F32_INF_BITS) && (bitcast<u32>(bitcast<f32>(du) + w) == dv);   // one f32 add, compared as the bit pattern PD-9 stores; never into an unreached v (an overflowed sum is +Inf too)
                below = bitcast<f32>(du) < bitcast<f32>(dv);
            }
            if (!tight) { continue; }
            var admit = false;                                       // this arc is one key step below v
            if (MODE == 1u) {
                admit = true;
            } else if (P.role == 0u) {                               // the roots pass (the plateau rule only; bellmanFord seeds the source alone)
                if (P.mode == 0u && below) { atomicMin(&pred[hb + v], 0u); }
            } else if (P.role == 1u) {                               // a hop pass: one hop along a plateau arc (mode 0) or along any tight arc (mode 1)
                if (P.mode == 1u || du == dv) {
                    let old = atomicMin(&pred[hb + v], hu + 1u);
                    if (hu + 1u < old) { atomicMax(&pred[2u * hb], P.iteration + 1u); }   // this pass changed something
                }
            } else {                                                 // the predecessor pass: the smallest tight arc one key step below v
                let hv = atomicLoad(&pred[hb + v]);
                if (P.mode == 1u) { admit = hu + 1u == hv; } else if (hv == 0u) { admit = below; } else { admit = (du == dv) && (hu + 1u == hv); }
            }
            if (admit) { atomicMin(&pred[v], select(a, u, P.predKind == 1u)); }
        }
    }
}
`;
