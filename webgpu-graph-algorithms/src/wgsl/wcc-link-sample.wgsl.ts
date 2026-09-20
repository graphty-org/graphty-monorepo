/**
 * The `wcc-link-sample` kernel body (spec 8.3): one of Afforest's sampled link rounds -- every vertex links its
 * r-th neighbour, `colIdx[rowPtr[v] + P.r]`, when it has one. `link_pair` is GAP's `Link` (gapbs/cc.cc lines
 * 40-150) transcribed for WGSL: all-u32 CAS on `comp`, which is `array<atomic<u32>>` because WGSL forbids mixing
 * atomic and plain access to one element, with a bounded retry loop (PD-5). The changed flag is the word at
 * `P.flagIndex` inside the same array (PD-4). The body is normative: a sabotage mutation is a textual edit of it,
 * so it is not restyled.
 */

/** Entry point `wcc_link_sample`; standard USE_PERM / HAS_WEIGHTS only (the body reads neither weights nor a permutation beyond the row select). */
export const wccLinkSampleWgsl = /* wgsl */ `
fn link_pair(a: u32, b: u32) {
    var p1 = atomicLoad(&comp[a]);
    var p2 = atomicLoad(&comp[b]);
    var steps = 0u;
    loop {
        if (p1 == p2) { break; }
        if (steps >= P.maxSteps) { atomicStore(&comp[P.flagIndex], 1u); break; }
        steps = steps + 1u;
        let hi = max(p1, p2);
        let lo = min(p1, p2);
        let pHigh = atomicLoad(&comp[hi]);
        if (pHigh == lo) { break; }
        if (pHigh == hi) {
            let swapped = atomicCompareExchangeWeak(&comp[hi], hi, lo);
            if (swapped.exchanged) { atomicStore(&comp[P.flagIndex], 1u); break; }
        }
        p1 = atomicLoad(&comp[atomicLoad(&comp[hi])]);
        p2 = atomicLoad(&comp[lo]);
    }
}

@compute @workgroup_size(WG)
fn wcc_link_sample(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    for (var row = first; row < P.items; row = row + P.stride) {
        let v = select(row, perm[row], USE_PERM);
        let a0 = rowPtr[v];
        let a1 = rowPtr[v + 1u];
        if (a0 + P.r < a1) {
            link_pair(v, colIdx[a0 + P.r]);
        }
    }
}
`;
