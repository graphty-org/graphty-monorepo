/**
 * The `group-by-key-row` kernel body (design 8.6; the per-row group-by-key): for every listed row `v`, the arcs of
 * the row are grouped by the key of their target (`keyIn[colIdx[a]]`), the weights are summed per key, and the key
 * with the largest sum wins, ties going to the LOWEST key -- which makes the answer independent of the order the arcs
 * are visited in, and so bitwise reproducible. `bestKey[v]` gets the key (`INVALID_INDEX` for an empty row) and
 * `bestScore[v]` the summed weight.
 *
 * The sums are u32 fixed point, because WGSL has no float atomic: every weight is scaled by `2^s`, a power of two
 * chosen from the exponents of the row's largest weight and of its degree alone so that `maxWeight x degree x 2^s`
 * lies in [2^28, 2^30), and rounded to the nearest integer, halves up. No step rounds a float: the scale needs no
 * product, scaling by a power of two is exact, and so are the integer part and the fraction of the scaled weight.
 * That matters because WGSL lets `x + y` and `x * y` round to EITHER neighbour of an inexact result, so a rounded
 * step could differ between devices; as written, both tiers, every device and any CPU reference compute identical
 * integers. A weight smaller than `2^-s / 2` contributes nothing, and a negative weight counts as zero. Without
 * WEIGHTED every weight is 1.
 *
 * TIER 0: one thread per row (`rows[P.rowsBase + i]`), a pairwise scan in registers -- for short rows, and at most
 * GROUP_ROW_THREAD_LIMIT arcs, since llvmpipe stops an invocation's loops after 65,535 steps. Any other TIER: one
 * workgroup per row (`rows[P.rowsBase + g]`) over its own open-addressing region of `GROUP_HASH_LOAD_FACTOR x degree`
 * slot pairs (key, sum) starting at word `rows[P.basesBase + g]` of `hashRegion`, cleared by the workgroup itself;
 * a key is claimed by a bounded compare-exchange loop with linear probing, and a lane that exhausts its bound raises
 * `hashRegion[0]`, which the driver reads and refuses. Every barrier is reached in uniform control flow: the only
 * early return keys on the workgroup id and a uniform. Body only (spec 3.5, D9); normative text.
 */
export const groupByKeyRowWgsl = /* wgsl */ `
var<workgroup> shMax: array<f32, WG>;
var<workgroup> shKey: array<u32, WG>;
var<workgroup> shSum: array<u32, WG>;

fn weight_of(a: u32) -> f32 {
    if (WEIGHTED) { return weights[a]; }
    return 1.0;
}
fn scale_of(maxW: f32, d: u32) -> f32 {                            // 2^s, maxW x d x 2^s in [2^28, 2^30), from exponents alone
    let em = i32((bitcast<u32>(maxW) >> 23u) & 255u) - 127;
    let ed = i32(firstLeadingBit(max(d, 1u)));
    let s = clamp(28 - em - ed, -126, 126);
    return bitcast<f32>(u32(s + 127) << 23u);
}
fn inverse_of(scale: f32) -> f32 {                                 // 2^-s, exact
    let s = i32((bitcast<u32>(scale) >> 23u) & 255u) - 127;
    return bitcast<f32>(u32(127 - s) << 23u);
}
fn quantize(w: f32, scale: f32) -> u32 {                           // nearest integer, halves up; every step exact
    let x = max(w * scale, 0.0);
    let i = u32(x);
    return select(i, i + 1u, x - f32(i) >= 0.5);
}
fn better(sum: u32, key: u32, bestSum: u32, bestKey0: u32) -> bool { return sum > bestSum || (sum == bestSum && key < bestKey0); }

fn row_thread(v: u32) {
    let lo = rowPtr[v];
    let hi = rowPtr[v + 1u];
    var maxW = 0.0;
    for (var a = lo; a < hi; a = a + 1u) { maxW = max(maxW, weight_of(a)); }
    let scale = scale_of(maxW, hi - lo);
    var bk = INVALID_INDEX;
    var bs = 0u;
    for (var a = lo; a < hi; a = a + 1u) {
        let k = keyIn[colIdx[a]];
        var seen = false;
        for (var b = lo; b < a; b = b + 1u) { if (keyIn[colIdx[b]] == k) { seen = true; break; } }
        if (seen) { continue; }                                    // this key was summed at its first arc
        var sum = 0u;
        for (var b = a; b < hi; b = b + 1u) { if (keyIn[colIdx[b]] == k) { sum = sum + quantize(weight_of(b), scale); } }
        if (better(sum, k, bs, bk)) { bk = k; bs = sum; }
    }
    bestKey[v] = bk;
    bestScore[v] = f32(bs) * inverse_of(scale);
}

fn row_hash(g: u32, lid: u32) {
    let v = rows[P.rowsBase + g];
    let base = rows[P.basesBase + g];
    let lo = rowPtr[v];
    let hi = rowPtr[v + 1u];
    let cap = GROUP_HASH_LOAD_FACTOR * (hi - lo);
    var m = 0.0;
    for (var a = lo + lid; a < hi; a = a + WG) { m = max(m, weight_of(a)); }
    shMax[lid] = m;
    workgroupBarrier();
    for (var s = WG / 2u; s > 0u; s = s / 2u) {
        if (lid < s) { shMax[lid] = max(shMax[lid], shMax[lid + s]); }
        workgroupBarrier();
    }
    let scale = scale_of(shMax[0], hi - lo);
    for (var j = lid; j < cap; j = j + WG) {                       // the region is this workgroup's alone: clear it
        atomicStore(&hashRegion[base + 2u * j], INVALID_INDEX);
        atomicStore(&hashRegion[base + 2u * j + 1u], 0u);
    }
    storageBarrier();
    var exhausted = false;
    for (var a = lo + lid; a < hi; a = a + WG) {
        let k = keyIn[colIdx[a]];
        let q = quantize(weight_of(a), scale);
        var slot = lowbias32(k) % cap;
        var steps = 0u;
        loop {
            if (steps >= cap + 64u) { exhausted = true; break; }   // bounded: a spurious compare-exchange failure is legal (WGSL 17.8.5)
            steps = steps + 1u;
            let r = atomicCompareExchangeWeak(&hashRegion[base + 2u * slot], INVALID_INDEX, k);
            if (r.exchanged || r.old_value == k) { atomicAdd(&hashRegion[base + 2u * slot + 1u], q); break; }
            if (r.old_value == INVALID_INDEX) { continue; }        // a spurious failure: the same slot again
            slot = (slot + 1u) % cap;                              // linear probing
        }
    }
    if (exhausted) { atomicStore(&hashRegion[0], 1u); }
    storageBarrier();
    var bk = INVALID_INDEX;
    var bs = 0u;
    for (var j = lid; j < cap; j = j + WG) {
        let k = atomicLoad(&hashRegion[base + 2u * j]);
        if (k != INVALID_INDEX) {
            let sum = atomicLoad(&hashRegion[base + 2u * j + 1u]);
            if (better(sum, k, bs, bk)) { bk = k; bs = sum; }
        }
    }
    shKey[lid] = bk;
    shSum[lid] = bs;
    workgroupBarrier();
    for (var s = WG / 2u; s > 0u; s = s / 2u) {
        if (lid < s && better(shSum[lid + s], shKey[lid + s], shSum[lid], shKey[lid])) {
            shKey[lid] = shKey[lid + s];
            shSum[lid] = shSum[lid + s];
        }
        workgroupBarrier();
    }
    if (lid == 0u) {
        bestKey[v] = shKey[0];
        bestScore[v] = f32(shSum[0]) * inverse_of(scale);
    }
}

@compute @workgroup_size(WG)
fn group_by_key_row(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (TIER == 0u) {
        let i = linear_id(wid, lid.x);
        if (i < P.count) { row_thread(rows[P.rowsBase + i]); }
        return;                                                    // TIER is an override: uniform
    }
    let g = group_id(wid);
    if (g >= P.count) { return; }                                  // uniform: the workgroup id and a uniform
    row_hash(g, lid.x);
}
`;
