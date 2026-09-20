/**
 * The `wcc-link-edges` kernel body (spec 8.3): the each-edge-once link round of Afforest, correct for directed and
 * undirected input alike because `edgeList()` yields every logical edge once in declared orientation (design 10.1).
 * `link_pair` is the same GAP `Link` transcription as wcc-link-sample (each module is composed alone, so the helper
 * is copied, not shared): all-u32 CAS on `comp`, an `array<atomic<u32>>` because WGSL forbids mixing atomic and
 * plain access to one element, with a bounded retry loop (PD-5) and the changed flag at `P.flagIndex` inside the
 * same array (PD-4). The `P.giant` guard is GAP's "skip the vertices already in the giant component" and is a pure
 * optimisation -- linking two vertices already in one component is a no-op. The body is normative: a sabotage
 * mutation is a textual edit of it, so it is not restyled.
 */

/** Entry point `wcc_link_edges`; no overrides. */
export const wccLinkEdgesWgsl = /* wgsl */ `
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
fn wcc_link_edges(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    let first = linear_id(wid, lid.x);
    for (var e = first; e < P.items; e = e + P.stride) {
        let u = edgeSrc[e];
        let v = edgeDst[e];
        if (u == v) { continue; }
        if (atomicLoad(&comp[u]) == P.giant && atomicLoad(&comp[v]) == P.giant) { continue; }
        link_pair(u, v);
    }
}
`;
