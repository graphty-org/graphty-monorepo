/**
 * The `mst-link` kernel body (design 8.5; the P11 plan's P11-T4): one vertex per invocation after `mst-best`'s two
 * passes. A component root `c` whose `bestEdge` exists hooks itself onto the component at the edge's other end and
 * records the edge in `treeEdge[c]`. Under the total edge order two components can only choose each other through
 * the SAME edge, so the one cycle possible is a two-cycle; the LOWER root of it keeps its label and only the higher
 * one hooks and records, so the edge is recorded once. Only a root writes its own `comp` word, so a concurrent reader
 * sees either the root or the root's new parent, both inside the component the round merges; `comp` is atomic
 * because WGSL forbids mixing atomic and plain access to one element. Every root hooks at most once in a run (it is
 * no longer a root afterwards), so `treeEdge` ends holding each forest edge exactly once, at the root that chose it.
 * The edges recorded are added to `counters[P.counterIndex]` with one atomic per workgroup; a round that records
 * none ends the run. Body only (spec 3.5, D9); normative text: a sabotage mutation is a textual edit of it.
 */
export const mstLinkWgsl = /* wgsl */ `
var<workgroup> added: atomic<u32>;

@compute @workgroup_size(WG)
fn mst_link(@builtin(workgroup_id) wid: vec3<u32>, @builtin(local_invocation_id) lid: vec3<u32>) {
    if (lid.x == 0u) { atomicStore(&added, 0u); }
    workgroupBarrier();
    let c = linear_id(wid, lid.x);
    if (c < P.count) {
        let e = bestEdge[c];
        if (e != INVALID_INDEX) {
            let a = atomicLoad(&comp[edgeSrc[e]]);
            let b = atomicLoad(&comp[edgeDst[e]]);
            let other = select(a, b, a == c);
            let keep = bestEdge[other] == e && c <= other;           // the lower root of a two-cycle stays
            if (!keep) { atomicStore(&comp[c], other); }
            if (!keep) { treeEdge[c] = e; atomicAdd(&added, 1u); }
        }
    }
    workgroupBarrier();                                            // every lane, unconditionally
    if (lid.x == 0u) {
        let k = atomicLoad(&added);
        if (k > 0u) { atomicAdd(&counters[P.counterIndex], k); }  // one atomic per workgroup
    }
}
`;
