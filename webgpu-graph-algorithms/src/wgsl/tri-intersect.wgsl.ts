/**
 * The `tri-intersect` kernel body (design 8.5): one invocation per ORIENTED arc `(u, v)`; every common target `w` of
 * the oriented rows of `u` and `v` closes a triangle, found exactly once. The rows are sorted by target, so they are
 * intersected by a merge, or -- when one row is more than TRIANGLE_BINARY_SEARCH_RATIO times the other -- by a binary
 * search of each element of the shorter row in the longer. SEARCH forces a path: 0 chooses, 1 always merges, 2
 * always searches (the tier-agreement tests compare the two). `counts` gains one per triangle at `w` as it is found
 * and the arc's triangle count at `u` and `v` once at the end: u32 atomics, so the counts are exact and
 * order-independent. Body only (spec 3.5, D9); normative text.
 */
export const triIntersectWgsl = /* wgsl */ `
fn contains(lo0: u32, hi0: u32, x: u32) -> bool {                  // binary search of x in colIdx[lo0, hi0), sorted ascending
    var lo = lo0;
    var hi = hi0;
    loop {
        if (lo >= hi) { break; }
        let mid = lo + (hi - lo) / 2u;
        let y = colIdx[mid];
        if (y == x) { return true; }
        if (y < x) { lo = mid + 1u; } else { hi = mid; }
    }
    return false;
}

@compute @workgroup_size(WG)
fn tri_intersect(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let a = linear_id(wid, lid.x);
    if (a >= P.count) { return; }                                  // no barrier follows
    let u = src[a];
    let v = colIdx[a];
    let uLo = rowPtr[u];
    let uHi = rowPtr[u + 1u];
    let vLo = rowPtr[v];
    let vHi = rowPtr[v + 1u];
    let du = uHi - uLo;
    let dv = vHi - vLo;
    var search = SEARCH == 2u;
    if (SEARCH == 0u) { search = du / TRIANGLE_BINARY_SEARCH_RATIO > dv || dv / TRIANGLE_BINARY_SEARCH_RATIO > du; }
    var found = 0u;
    if (search) {
        var sLo = uLo;
        var sHi = uHi;
        var lLo = vLo;
        var lHi = vHi;
        if (du > dv) { sLo = vLo; sHi = vHi; lLo = uLo; lHi = uHi; }
        for (var k = sLo; k < sHi; k = k + 1u) {
            let w = colIdx[k];
            if (contains(lLo, lHi, w)) { atomicAdd(&counts[w], 1u); found = found + 1u; }
        }
    } else {
        var i = uLo;
        var j = vLo;
        loop {
            if (i >= uHi || j >= vHi) { break; }
            let x = colIdx[i];
            let y = colIdx[j];
            if (x == y) { atomicAdd(&counts[x], 1u); found = found + 1u; i = i + 1u; j = j + 1u; }
            else if (x < y) { i = i + 1u; }
            else { j = j + 1u; }
        }
    }
    if (found > 0u) { atomicAdd(&counts[u], found); atomicAdd(&counts[v], found); }
}
`;
